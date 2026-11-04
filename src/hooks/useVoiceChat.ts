'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, RoomUser } from '@/types/socket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

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
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speakingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(false);

  // Gắn hoặc thay thế audio track một cách an toàn (tránh lỗi duplicate sender/addTrack)
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
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (err) {
          console.warn(`[VoiceChat] Error adding queued candidate from ${peerId}:`, err);
        }
      }
      pendingCandidatesRef.current.delete(peerId);
    }
  }, []);

  // Dọn dẹp một peer connection và thẻ audio tương ứng
  const cleanupPeer = useCallback((peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      try {
        pc.close();
      } catch {
        // ignore
      }
      peerConnectionsRef.current.delete(peerId);
    }
    pendingCandidatesRef.current.delete(peerId);

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
          audio.style.display = 'none';
          audio.setAttribute('data-peer-id', peerId);
          document.body.appendChild(audio);
          remoteAudiosRef.current.set(peerId, audio);
        }

        audio.srcObject = remoteStream;
        audio.volume = 1.0;
        audio.play().catch((err) => {
          console.warn(`[VoiceChat] Autoplay play() rejected for ${peerId}:`, err);
        });
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

  // Tắt hẳn mic và thu hồi các track
  const turnOffMic = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Mute transmission on all active peer connections
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
        analyser.smoothingTimeConstant = 0.3;
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
          const isLoud = avg > 12; // Ngưỡng nói chuyện chuẩn xác, nhạy và tự nhiên

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
            speakingTimerRef.current = setTimeout(() => {
              isSpeakingRef.current = false;
              setIsSpeaking(false);
              speakingTimerRef.current = null;
              if (socket?.connected) {
                socket.emit('user-mic-status', { isMicOn: true, isSpeaking: false });
              }
            }, 400);
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      setIsMicOn(true);
      onToast?.('🎙️ Micro đã BẬT - Cả khán phòng có thể nghe bạn nói!');

      // Gửi trạng thái bật mic lên server
      if (socket?.connected) {
        socket.emit('user-mic-status', { isMicOn: true, isSpeaking: false });
      }

      // Khởi động đo âm lượng để hiển thị icon đang nói
      startAudioMeter(stream);

      // Gắn track vào tất cả peer connection và khởi tạo offer nếu chưa kết nối
      activeUsers.forEach(async (peer) => {
        if (!peer.socketId || peer.socketId === socketId) return;
        try {
          const pc = getOrCreatePeerConnection(peer.socketId);
          attachLocalStreamToPC(pc, stream);

          if (pc.signalingState === 'stable' && pc.connectionState !== 'connected') {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket?.emit('webrtc-offer', { to: peer.socketId, offer });
          }
        } catch (err) {
          console.warn(`[VoiceChat] Error initiating offer to ${peer.nickname}:`, err);
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
    getOrCreatePeerConnection,
    attachLocalStreamToPC,
  ]);

  // Tự động kết nối với những người dùng mới vào phòng (Mesh Link Setup)
  useEffect(() => {
    if (!socket || !socketId) return;

    activeUsers.forEach(async (peer) => {
      if (!peer.socketId || peer.socketId === socketId) return;

      // Deterministic initiator rule (tránh xung đột hai bên cùng gửi offer đồng thời)
      const isInitiator = socketId < peer.socketId;
      const pc = peerConnectionsRef.current.get(peer.socketId);

      // Nếu chưa có kết nối và là initiator, tạo kết nối và gửi offer ban đầu
      if (!pc && isInitiator) {
        try {
          const newPc = getOrCreatePeerConnection(peer.socketId);
          if (localStreamRef.current) {
            attachLocalStreamToPC(newPc, localStreamRef.current);
          }
          const offer = await newPc.createOffer();
          await newPc.setLocalDescription(offer);
          socket.emit('webrtc-offer', { to: peer.socketId, offer });
        } catch (err) {
          console.warn(`[VoiceChat] Error linking with new peer ${peer.nickname}:`, err);
        }
      }
    });
  }, [activeUsers, socket, socketId, getOrCreatePeerConnection, attachLocalStreamToPC]);

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

  // Lắng nghe WebRTC Signaling (Offers, Answers, Candidates)
  useEffect(() => {
    if (!socket) return;

    const handleOffer = async ({
      from,
      offer,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      try {
        const pc = getOrCreatePeerConnection(from);

        // Xử lý glare: nếu đang trong trạng thái chờ offer từ local
        const isPolite = socketId ? socketId < from : false;
        if (pc.signalingState !== 'stable') {
          if (!isPolite) {
            console.log(`[VoiceChat] Glare detected, ignoring offer from ${from}`);
            return;
          }
          await pc.setLocalDescription({ type: 'rollback' });
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingCandidates(from, pc);

        if (localStreamRef.current) {
          attachLocalStreamToPC(pc, localStreamRef.current);
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', { to: from, answer });
      } catch (err) {
        console.warn(`[VoiceChat] Error handling offer from ${from}:`, err);
      }
    };

    const handleAnswer = async ({
      from,
      answer,
    }: {
      from: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      try {
        const pc = peerConnectionsRef.current.get(from);
        if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await flushPendingCandidates(from, pc);
        }
      } catch (err) {
        console.warn(`[VoiceChat] Error handling answer from ${from}:`, err);
      }
    };

    const handleCandidate = async ({
      from,
      candidate,
    }: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      try {
        const pc = peerConnectionsRef.current.get(from);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          // Lưu vào hàng đợi nếu remote description chưa sẵn sàng
          const list = pendingCandidatesRef.current.get(from) || [];
          list.push(candidate);
          pendingCandidatesRef.current.set(from, list);
        }
      } catch (err) {
        console.warn(`[VoiceChat] Error adding ICE candidate from ${from}:`, err);
      }
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
    getOrCreatePeerConnection,
    flushPendingCandidates,
    attachLocalStreamToPC,
  ]);

  // Tự động phát lại audio nếu trình duyệt từng chặn autoplay trước khi có user gesture
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

    window.addEventListener('click', resumeAudioOnGesture);
    window.addEventListener('keydown', resumeAudioOnGesture);
    return () => {
      window.removeEventListener('click', resumeAudioOnGesture);
      window.removeEventListener('keydown', resumeAudioOnGesture);
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
