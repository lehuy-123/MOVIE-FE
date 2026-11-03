'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, RoomUser } from '@/types/socket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
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
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speakingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(false);

  // Dọn dẹp một peer connection
  const cleanupPeer = useCallback((peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    const audio = remoteAudiosRef.current.get(peerId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
      remoteAudiosRef.current.delete(peerId);
    }
  }, []);

  // Tắt hẳn mic và dọn dẹp các track local
  const turnOffMic = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

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
  }, [socket]);

  // Tạo hoặc lấy RTCPeerConnection với peer
  const getOrCreatePeerConnection = useCallback(
    (peerId: string) => {
      let pc = peerConnectionsRef.current.get(peerId);
      if (pc && pc.connectionState !== 'closed' && pc.connectionState !== 'failed') {
        return pc;
      }

      pc = new RTCPeerConnection(ICE_SERVERS);

      // Thêm local audio tracks nếu đang bật mic
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc?.addTrack(track, localStreamRef.current!);
        });
      }

      // Xử lý ICE Candidate
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
        const [remoteStream] = event.streams;
        if (!remoteStream) return;

        let audio = remoteAudiosRef.current.get(peerId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          // Safari & Chrome autoplay requirement
          audio.volume = 1.0;
          remoteAudiosRef.current.set(peerId, audio);
        }
        audio.srcObject = remoteStream;
        audio.play().catch(() => {
          // Trình duyệt có thể chặn autoplay nếu chưa có user gesture
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc?.connectionState === 'disconnected' || pc?.connectionState === 'failed') {
          cleanupPeer(peerId);
        }
      };

      peerConnectionsRef.current.set(peerId, pc);
      return pc;
    },
    [socket, cleanupPeer]
  );

  // Bắt đầu theo dõi cường độ âm thanh để phát hiện khi nói (Speaking Level Meter)
  const startAudioMeter = useCallback(
    (stream: MediaStream) => {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (!analyserRef.current || !localStreamRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const isLoud = average > 14; // Ngưỡng nói chuyện nhạy và tự nhiên

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
            }, 450);
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

      // Gửi offer WebRTC đến tất cả khán giả khác trong phòng
      activeUsers.forEach(async (peer) => {
        if (!peer.socketId || peer.socketId === socketId) return;
        try {
          const pc = getOrCreatePeerConnection(peer.socketId);
          // Gắn track vào peer connection
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('webrtc-offer', { to: peer.socketId, offer });
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
  ]);

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
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
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
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
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
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
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
  }, [socket, getOrCreatePeerConnection]);

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
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      remoteAudiosRef.current.forEach((audio) => {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
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

