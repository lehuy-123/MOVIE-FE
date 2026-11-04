'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, RoomUser } from '@/types/socket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    { urls: ['stun:stun.cloudflare.com:3478'] },
    { urls: ['stun:global.stun.twilio.com:3478'] },
    // Free OpenRelay TURN servers cho phép WebRTC vượt qua Symmetric NAT, tường lửa và mạng di động 4G/5G khi deploy Vercel
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 4,
};

/**
 * Tối ưu hoá SDP của Opus để giọng nói truyền đi liên tục 100%,
 * tắt usedtx để không bao giờ bị ngắt hay nuốt các chữ cuối câu.
 */
function optimizeOpusSdp(sdp: string): string {
  if (!sdp) return sdp;
  return sdp.replace(/a=fmtp:(\d+)(?:[^\r\n]*)/g, (line, pt) => {
    if (line.includes('minptime') || line.includes('useinbandfec') || sdp.includes(`a=rtpmap:${pt} opus/48000`)) {
      let params = line.slice(`a=fmtp:${pt} `.length);
      // Tắt DTX (Discontinuous Transmission): truyền âm thanh liên tục không ngắt quãng
      params = params.replace(/usedtx=[01]/g, '').replace(/;;+/g, ';');
      if (!params.includes('usedtx=0')) {
        params += ';usedtx=0';
      }
      if (!params.includes('useinbandfec=1')) {
        params += ';useinbandfec=1';
      }
      if (!params.includes('cbr=1')) {
        params += ';cbr=1';
      }
      if (!params.includes('maxaveragebitrate=')) {
        params += ';maxaveragebitrate=64000';
      }
      return `a=fmtp:${pt} ${params.replace(/^;|;$/g, '')}`;
    }
    return line;
  });
}

interface UseVoiceChatProps {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  socketId: string | null;
  activeUsers: RoomUser[];
  isMicMutedByAdmin?: boolean;
  onToast?: (msg: string) => void;
}

export function useVoiceChat({
  socket,
  socketId,
  activeUsers,
  isMicMutedByAdmin = false,
  onToast,
}: UseVoiceChatProps) {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const peerActionQueuesRef = useRef<Map<string, Promise<void>>>(new Map());
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speakingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(false);

  // Hàng đợi tuần tự (FIFO) cho mỗi peer để tránh xung đột async race condition khi xử lý offer/answer
  const enqueuePeerAction = useCallback((peerId: string, action: () => Promise<void>) => {
    const currentQueue = peerActionQueuesRef.current.get(peerId) || Promise.resolve();
    const nextQueue = currentQueue
      .then(async () => {
        await action();
      })
      .catch((err) => {
        console.warn(`[VoiceChat] Error in peer queue action for ${peerId}:`, err);
      });
    peerActionQueuesRef.current.set(peerId, nextQueue);
    return nextQueue;
  }, []);

  // Gắn hoặc thay thế audio track an toàn qua replaceTrack (tránh renegotiation gián đoạn âm thanh)
  const attachLocalStreamToPC = useCallback((pc: RTCPeerConnection, stream: MediaStream | null) => {
    if (!pc || pc.connectionState === 'closed') return;
    const audioTrack = stream?.getAudioTracks()[0] || null;
    const senders = pc.getSenders();
    const audioSender = senders.find((s) => s.track?.kind === 'audio' || s.track === null);

    if (audioSender) {
      audioSender.replaceTrack(audioTrack).catch((err) => {
        console.warn('[VoiceChat] replaceTrack error:', err);
      });
    } else if (audioTrack && stream) {
      try {
        pc.addTrack(audioTrack, stream);
      } catch (err) {
        console.warn('[VoiceChat] addTrack error:', err);
      }
    }
  }, []);

  // Xử lý các ICE Candidate đang chờ trong hàng đợi khi remote description đã sẵn sàng
  const flushPendingCandidates = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const queue = pendingCandidatesRef.current.get(peerId);
    if (queue && queue.length > 0) {
      for (const cand of queue) {
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
        } catch (err) {
          console.warn(`[VoiceChat] Error adding queued candidate from ${peerId}:`, err);
        }
      }
      pendingCandidatesRef.current.delete(peerId);
    }
  }, []);

  // Dọn dẹp một peer connection và thẻ audio tương ứng
  const cleanupPeer = useCallback((peerId: string) => {
    makingOfferRef.current.delete(peerId);
    peerActionQueuesRef.current.delete(peerId);
    pendingCandidatesRef.current.delete(peerId);

    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      try {
        pc.close();
      } catch {
        // ignore
      }
      peerConnectionsRef.current.delete(peerId);
    }

    const audio = remoteAudiosRef.current.get(peerId);
    if (audio) {
      try {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      } catch {
        // ignore
      }
      remoteAudiosRef.current.delete(peerId);
    }
  }, []);

  // Tạo hoặc lấy RTCPeerConnection với peer
  const getOrCreatePeerConnection = useCallback(
    (peerId: string) => {
      let pc = peerConnectionsRef.current.get(peerId);
      if (pc && pc.connectionState !== 'closed' && pc.connectionState !== 'failed') {
        return pc;
      }

      pc = new RTCPeerConnection(ICE_SERVERS);

      // Thêm audio transceiver 2 chiều (sendrecv)
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      } catch {
        // fallback
      }

      // Nếu đang có local stream từ trước, gắn ngay vào sender
      if (localStreamRef.current) {
        attachLocalStreamToPC(pc, localStreamRef.current);
      }

      // Xử lý ICE Candidate phát sinh từ local
      pc.onicecandidate = (event) => {
        if (event.candidate && socket?.connected) {
          socket.emit('webrtc-ice-candidate', {
            to: peerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Xử lý khi nhận remote audio track từ người khác trong rạp
      pc.ontrack = (event) => {
        console.log(`[VoiceChat] 🔊 Received remote audio track from ${peerId}`);
        const remoteStream =
          event.streams && event.streams[0]
            ? event.streams[0]
            : new MediaStream([event.track]);

        let audio = remoteAudiosRef.current.get(peerId);
        if (!audio) {
          audio = document.createElement('audio');
          audio.autoplay = true;
          audio.setAttribute('playsinline', 'true');
          audio.setAttribute('webkit-playsinline', 'true');
          audio.style.position = 'fixed';
          audio.style.top = '-9999px';
          audio.style.left = '-9999px';
          audio.style.width = '1px';
          audio.style.height = '1px';
          audio.style.opacity = '0';
          audio.style.pointerEvents = 'none';
          audio.setAttribute('data-peer-id', peerId);
          document.body.appendChild(audio);
          remoteAudiosRef.current.set(peerId, audio);
        }

        // Chỉ gán lại nếu stream khác để không làm gián đoạn buffer audio đang phát
        if (audio.srcObject !== remoteStream) {
          audio.srcObject = remoteStream;
        }
        audio.volume = 1.0;
        audio.muted = false;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Sẽ tự động resume khi người dùng click hoặc chạm màn hình
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[VoiceChat] PC state with ${peerId}: ${pc?.connectionState}`);
        if (pc?.connectionState === 'failed') {
          cleanupPeer(peerId);
        }
      };

      peerConnectionsRef.current.set(peerId, pc);
      return pc;
    },
    [socket, cleanupPeer, attachLocalStreamToPC]
  );

  // Tạo offer gửi đến peer một cách an toàn
  const initiateOffer = useCallback(
    async (peerId: string) => {
      await enqueuePeerAction(peerId, async () => {
        const pc = getOrCreatePeerConnection(peerId);
        if (pc.signalingState !== 'stable') return;

        try {
          makingOfferRef.current.set(peerId, true);
          if (localStreamRef.current) {
            attachLocalStreamToPC(pc, localStreamRef.current);
          }
          const offer = await pc.createOffer();
          const enhancedOffer: RTCSessionDescriptionInit = {
            type: offer.type,
            sdp: optimizeOpusSdp(offer.sdp || ''),
          };
          await pc.setLocalDescription(enhancedOffer);
          socket?.emit('webrtc-offer', { to: peerId, offer: pc.localDescription || enhancedOffer });
        } catch (err) {
          console.warn(`[VoiceChat] Error initiating offer to ${peerId}:`, err);
        } finally {
          makingOfferRef.current.set(peerId, false);
        }
      });
    },
    [enqueuePeerAction, getOrCreatePeerConnection, attachLocalStreamToPC, socket]
  );

  // Tắt hẳn mic và thu hồi các track
  const turnOffMic = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Mute transmission on all active peer connections seamlessly using replaceTrack(null)
    peerConnectionsRef.current.forEach((pc) => {
      attachLocalStreamToPC(pc, null);
    });

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (speakingTimerRef.current) {
      clearTimeout(speakingTimerRef.current);
      speakingTimerRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }

    setIsMicOn(false);
    setIsSpeaking(false);
    isSpeakingRef.current = false;

    if (socket?.connected) {
      socket.emit('user-mic-status', { isMicOn: false, isSpeaking: false });
    }
  }, [socket, attachLocalStreamToPC]);

  // Bắt đầu theo dõi cường độ âm thanh để phát hiện khi nói (Speaking Level Meter)
  const startAudioMeter = useCallback(
    (stream: MediaStream) => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioContextClass();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.25;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (!analyserRef.current || !localStreamRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);

          // Phân tích dải tần số giọng nói con người (bins 2 đến 45: ~150Hz đến ~3800Hz)
          let voiceEnergy = 0;
          const maxBin = Math.min(dataArray.length, 45);
          for (let i = 2; i < maxBin; i++) {
            voiceEnergy += dataArray[i];
          }
          const avg = voiceEnergy / (maxBin - 2);
          // Ngưỡng nhạy (> 8) để bắt trọn cả những chữ cuối nói nhỏ hoặc thì thầm
          const isLoud = avg > 8;

          if (isLoud) {
            if (!isSpeakingRef.current) {
              isSpeakingRef.current = true;
              setIsSpeaking(true);
              if (socket?.connected) {
                socket.emit('user-mic-status', { isMicOn: true, isSpeaking: true });
              }
            }
            if (speakingTimerRef.current) {
              clearTimeout(speakingTimerRef.current);
              speakingTimerRef.current = null;
            }
          } else if (isSpeakingRef.current && !speakingTimerRef.current) {
            // Giữ trạng thái nói 1200ms để không bị ngắt quãng giữa các từ hay cuối câu
            speakingTimerRef.current = setTimeout(() => {
              isSpeakingRef.current = false;
              setIsSpeaking(false);
              speakingTimerRef.current = null;
              if (socket?.connected) {
                socket.emit('user-mic-status', { isMicOn: true, isSpeaking: false });
              }
            }, 1200);
          }

          animationFrameRef.current = requestAnimationFrame(checkVolume);
        };

        checkVolume();
      } catch (err) {
        console.warn('[VoiceChat] Audio Meter error:', err);
      }
    },
    [socket]
  );

  // Bật/Tắt Microphone
  const toggleMic = useCallback(async () => {
    if (isMicMutedByAdmin) {
      onToast?.('🚫 Bạn đã bị Quản trị viên cấm micro trong phòng này!');
      return;
    }

    if (isMicOn) {
      turnOffMic();
      onToast?.('🎙️ Đã tắt micro');
      return;
    }

    try {
      setMicError(null);
      // TẮT noiseSuppression của trình duyệt để không bị thuật toán cắt mất đuôi câu khi âm lượng giảm ở chữ cuối
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000,
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      localStreamRef.current = stream;
      setIsMicOn(true);
      onToast?.('🎙️ Micro đã BẬT - Cả khán phòng có thể nghe bạn nói!');

      // Gửi trạng thái bật mic lên server
      if (socket?.connected) {
        socket.emit('user-mic-status', { isMicOn: true, isSpeaking: false });
      }

      // Khởi động đo âm lượng để hiển thị icon đang nói
      startAudioMeter(stream);

      // Gắn track vào tất cả peer connection đã có hoặc tạo mới nếu chưa có
      activeUsers.forEach((peer) => {
        if (!peer.socketId || peer.socketId === socketId) return;
        const pc = peerConnectionsRef.current.get(peer.socketId);
        if (pc) {
          attachLocalStreamToPC(pc, stream);
        } else {
          initiateOffer(peer.socketId);
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể truy cập microphone!';
      setMicError(msg);
      onToast?.('⚠️ Không thể bật micro! Vui lòng cấp quyền micro cho trình duyệt.');
      turnOffMic();
    }
  }, [
    isMicMutedByAdmin,
    isMicOn,
    turnOffMic,
    onToast,
    socket,
    startAudioMeter,
    activeUsers,
    socketId,
    initiateOffer,
    attachLocalStreamToPC,
  ]);

  // Tự động kết nối với những người dùng mới vào phòng (Mesh Link Setup)
  useEffect(() => {
    if (!socket || !socketId) return;

    activeUsers.forEach((peer) => {
      if (!peer.socketId || peer.socketId === socketId) return;

      const isInitiator = socketId < peer.socketId;
      const pc = peerConnectionsRef.current.get(peer.socketId);

      // Nếu chưa có kết nối và là initiator, tạo kết nối và gửi offer ban đầu
      if (!pc && isInitiator) {
        initiateOffer(peer.socketId);
      }
    });
  }, [activeUsers, socket, socketId, initiateOffer]);

  // Lắng nghe sự kiện cấm mic từ Admin
  useEffect(() => {
    if (!socket) return;

    const handleAdminMutedMic = ({ isMuted }: { isMuted: boolean }) => {
      if (isMuted) {
        turnOffMic();
        onToast?.('🔇 Quản trị viên đã cấm micro của bạn!');
      } else {
        onToast?.('🎙️ Quản trị viên đã mở lại quyền sử dụng micro cho bạn.');
      }
    };

    socket.on('admin-muted-mic', handleAdminMutedMic);
    return () => {
      socket.off('admin-muted-mic', handleAdminMutedMic);
    };
  }, [socket, turnOffMic, onToast]);

  // Tự động tắt mic nếu bị cấm
  useEffect(() => {
    if (isMicMutedByAdmin && isMicOn) {
      turnOffMic();
    }
  }, [isMicMutedByAdmin, isMicOn, turnOffMic]);

  // Lắng nghe WebRTC Signaling (Offers, Answers, Candidates) với cơ chế Perfect Negotiation & Queue
  useEffect(() => {
    if (!socket) return;

    const handleOffer = async ({
      from,
      offer,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      enqueuePeerAction(from, async () => {
        try {
          const pc = getOrCreatePeerConnection(from);
          const isPolite = socketId ? socketId < from : false;
          const isMakingOffer = Boolean(makingOfferRef.current.get(from));
          const offerCollision = offer.type === 'offer' && (isMakingOffer || pc.signalingState !== 'stable');

          if (offerCollision) {
            if (!isPolite) {
              console.log(`[VoiceChat] Impolite peer ignoring colliding offer from ${from}`);
              return;
            }
            try {
              await pc.setLocalDescription({ type: 'rollback' });
            } catch (err) {
              console.warn(`[VoiceChat] Rollback notice for ${from}:`, err);
            }
          }

          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          await flushPendingCandidates(from, pc);

          if (localStreamRef.current) {
            attachLocalStreamToPC(pc, localStreamRef.current);
          }

          // Kiểm tra chặt chẽ signalingState trước khi gọi setLocalDescription(answer)
          if (pc.signalingState === 'have-remote-offer') {
            const answer = await pc.createAnswer();
            const enhancedAnswer: RTCSessionDescriptionInit = {
              type: answer.type,
              sdp: optimizeOpusSdp(answer.sdp || ''),
            };
            await pc.setLocalDescription(enhancedAnswer);
            socket.emit('webrtc-answer', { to: from, answer: pc.localDescription || enhancedAnswer });
          } else {
            console.warn(`[VoiceChat] Skipped answer creation for ${from}: state is ${pc.signalingState}`);
          }
        } catch (err) {
          console.warn(`[VoiceChat] Error handling offer from ${from}:`, err);
        }
      });
    };

    const handleAnswer = async ({
      from,
      answer,
    }: {
      from: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      enqueuePeerAction(from, async () => {
        try {
          const pc = peerConnectionsRef.current.get(from);
          if (pc && pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            await flushPendingCandidates(from, pc);
          }
        } catch (err) {
          console.warn(`[VoiceChat] Error handling answer from ${from}:`, err);
        }
      });
    };

    const handleCandidate = async ({
      from,
      candidate,
    }: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      enqueuePeerAction(from, async () => {
        try {
          const pc = peerConnectionsRef.current.get(from);
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            const list = pendingCandidatesRef.current.get(from) || [];
            list.push(candidate);
            pendingCandidatesRef.current.set(from, list);
          }
        } catch (err) {
          console.warn(`[VoiceChat] Error adding ICE candidate from ${from}:`, err);
        }
      });
    };

    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleCandidate);

    return () => {
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice-candidate', handleCandidate);
    };
  }, [
    socket,
    socketId,
    enqueuePeerAction,
    getOrCreatePeerConnection,
    flushPendingCandidates,
    attachLocalStreamToPC,
  ]);

  // Tự động phát lại audio nếu trình duyệt (đặc biệt mobile iOS Safari / Android Chrome) chặn autoplay trước khi có user gesture
  useEffect(() => {
    const resumeAudioOnGesture = () => {
      remoteAudiosRef.current.forEach((audio) => {
        if (audio.paused && audio.srcObject) {
          audio.play().catch(() => {});
        }
      });
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    };

    const gestureEvents = ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'] as const;
    gestureEvents.forEach((ev) => window.addEventListener(ev, resumeAudioOnGesture, { passive: true }));
    return () => {
      gestureEvents.forEach((ev) => window.removeEventListener(ev, resumeAudioOnGesture));
    };
  }, []);

  // Tự động dọn dẹp peer connections của người dùng đã rời phòng
  useEffect(() => {
    const currentPeerIds = new Set(activeUsers.map((u) => u.socketId));
    peerConnectionsRef.current.forEach((_, peerId) => {
      if (!currentPeerIds.has(peerId)) {
        cleanupPeer(peerId);
      }
    });
  }, [activeUsers, cleanupPeer]);

  // Dọn dẹp toàn bộ khi unmount
  useEffect(() => {
    return () => {
      turnOffMic();
      peerConnectionsRef.current.forEach((pc) => {
        try {
          pc.close();
        } catch {
          // ignore
        }
      });
      peerConnectionsRef.current.clear();
      pendingCandidatesRef.current.clear();
      peerActionQueuesRef.current.clear();
      makingOfferRef.current.clear();

      remoteAudiosRef.current.forEach((audio) => {
        try {
          audio.pause();
          audio.srcObject = null;
          audio.remove();
        } catch {
          // ignore
        }
      });
      remoteAudiosRef.current.clear();
    };
  }, [turnOffMic]);

  return {
    isMicOn,
    isSpeaking,
    micError,
    toggleMic,
    turnOffMic,
  };
}
