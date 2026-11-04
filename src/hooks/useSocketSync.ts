'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  RoomState,
  RoomUser,
  RoomSummary,
  ChatMessage,
  VideoSyncPayload,
  VideoRequestItem,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@/types/socket';
import { ScreenMeshHandle } from '@/components/cinema/ScreenMesh';

const ADMIN_TOKEN_KEY = 'wetube-cine:admin-token';
const CHAT_HISTORY_KEY = 'wetube-cine:chat-history';
const SESSION_ID_KEY = 'wetube-cine:session-id';

function getClientSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      sid = 'sid_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      sessionStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
  } catch {
    return 'sid_fallback_' + Date.now();
  }
}

interface UseSocketSyncOptions {
  serverUrl?: string;
  roomId?: string;
  nickname?: string;
  avatarColor?: string;
  gender?: 'Nam' | 'Nữ';
  screenRef: React.RefObject<ScreenMeshHandle | null>;
  onVideoChange?: (videoId: string, title?: string) => void;
  onRoomStateChange?: (state: RoomState) => void;
}

export function useSocketSync({
  serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
  roomId = 'cinema-main',
  nickname,
  avatarColor,
  gender,
  screenRef,
  onVideoChange,
  onRoomStateChange,
}: UseSocketSyncOptions) {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const [socketInstance, setSocketInstance] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(false);
  const [isDimmed, setIsDimmed] = useState<boolean>(true);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [queue, setQueue] = useState<VideoRequestItem[]>([]);
  const [availableRooms, setAvailableRooms] = useState<RoomSummary[]>([]);

  // 3D Chat bubbles active during their 5-second lifetime
  const [activeBubbles, setActiveBubbles] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CHAT_HISTORY_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed.slice(-50);
        }
      } catch { }
    }
    return [];
  });

  // Current user is Admin ONLY if room host matches socketId or users array marks them admin
  const isHost = Boolean(
    socketId &&
    (roomState?.hostId === socketId ||
      users.find((u) => u.socketId === socketId)?.isAdmin)
  );

  // Current user is permitted to control video if Admin OR granted by Admin
  const currentUser = users.find((u) => u.socketId === socketId);
  const canControl = Boolean(isHost || currentUser?.isAdmin || currentUser?.canControl);
  const isChatMuted = Boolean(currentUser?.isChatMuted);
  const isMicMuted = Boolean(currentUser?.isMicMuted);

  // Flag to avoid feedback loops from local user actions
  const isPerformingLocalAction = useRef(false);
  const currentVideoIdRef = useRef<string | null>(null);
  const hasInitializedVideoRef = useRef(false);
  const lastDriftCorrectionRef = useRef(0);

  // Stable references for callbacks to avoid re-connecting WebSocket on every render
  const onVideoChangeRef = useRef(onVideoChange);
  onVideoChangeRef.current = onVideoChange;

  const onRoomStateChangeRef = useRef(onRoomStateChange);
  onRoomStateChangeRef.current = onRoomStateChange;

  const nicknameRef = useRef(nickname);
  nicknameRef.current = nickname;

  const avatarColorRef = useRef(avatarColor);
  avatarColorRef.current = avatarColor;

  const genderRef = useRef(gender);
  genderRef.current = gender;

  /**
   * Helper to synchronize video timestamp and playback state with drift compensation (< 0.5s)
   */
  const applyVideoSync = useCallback(
    (
      timestamp: number,
      updatedAt: number,
      status: 'playing' | 'paused',
      senderId?: string
    ) => {
      if (!screenRef.current) return;

      const player = screenRef.current;
      const now = Date.now();

      // Compensate for elapsed time since the server timestamp update
      const elapsedSeconds = status === 'playing' ? Math.max(0, (now - updatedAt) / 1000) : 0;
      const expectedTime = Math.max(0, timestamp + elapsedSeconds);

      const currentTime = player.getCurrentTime();
      const isSender = Boolean(senderId && socketRef.current && senderId === socketRef.current.id);
      if (isSender) return;

      if (status === 'paused') {
        player.pause();
        if (Math.abs(currentTime - timestamp) > 1.2) {
          player.seekTo(timestamp);
          setTimeout(() => {
            player.pause();
          }, 150);
        }
      } else {
        const drift = Math.abs(currentTime - expectedTime);
        // Only seek if currentTime is 0 (newly loading) or drift is noticeable (> 1.2s)
        if (currentTime === 0 || drift > 1.2) {
          console.log(
            `[useSocketSync] Aligning drift (${drift.toFixed(2)}s). Seeking to ${expectedTime.toFixed(2)}s`
          );
          player.seekTo(expectedTime);
        }
        player.play();
      }
    },
    [screenRef]
  );

  const applyVideoSyncRef = useRef(applyVideoSync);
  applyVideoSyncRef.current = applyVideoSync;

  useEffect(() => {
    // 1. Initialize Socket.io client with persistent reconnection
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000,
    });

    socketRef.current = socket;
    setSocketInstance(socket);

    socket.on('connect', () => {
      console.log(`[useSocketSync] Connected to sync server: ${socket.id}`);
      setIsConnected(true);
      setSocketId(socket.id || null);

      // Join cinema room immediately upon connection (gửi kèm profile, seatId & adminToken nếu đã có)
      let activeNick = nicknameRef.current;
      let activeColor = avatarColorRef.current;
      let activeGender = genderRef.current;
      let activeSeatId: string | null = null;
      try {
        const saved = localStorage.getItem('wetube-cine:profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!activeNick && parsed.nickname) activeNick = parsed.nickname;
          if (!activeColor && parsed.shirtColor) activeColor = parsed.shirtColor;
          if (!activeGender && parsed.gender) activeGender = parsed.gender;
          if (parsed.seatId) activeSeatId = parsed.seatId;
        }
      } catch { }

      if (!activeNick && typeof window !== 'undefined') {
        activeNick = localStorage.getItem('cinema_nickname') || undefined;
      }

      let savedAdminToken: string | undefined;
      try {
        savedAdminToken = localStorage.getItem(ADMIN_TOKEN_KEY) || undefined;
      } catch { }

      const clientSessionId = getClientSessionId();

      socket.emit('join-room', {
        roomId,
        nickname: activeNick,
        avatarColor: activeColor,
        gender: activeGender,
        seatId: activeSeatId,
        adminToken: savedAdminToken,
        sessionId: clientSessionId,
      });
    });

    socket.on('disconnect', () => {
      console.log('[useSocketSync] Disconnected from server');
      setIsConnected(false);
      setSocketId(null);
    });

    // 2. Receive initial room state on connection or room switch
    socket.on('room-state', (state: RoomState) => {
      console.log('[useSocketSync] Received full room state:', state);
      setRoomState(state);
      setUsers(state.users);
      if (typeof state.showSubtitles === 'boolean') {
        setShowSubtitles(state.showSubtitles);
      }
      if (typeof state.isDimmed === 'boolean') {
        setIsDimmed(state.isDimmed);
      }
      if (state.queue) setQueue(state.queue);
      if (Array.isArray(state.chatHistory) && state.chatHistory.length > 0) {
        setChatHistory((prev) => {
          const map = new Map<string, ChatMessage>();
          prev.forEach((m) => map.set(m.id, m));
          state.chatHistory?.forEach((m) => map.set(m.id, m));
          const merged = Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt).slice(-60);
          try {
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(merged));
          } catch { }
          return merged;
        });
      }
      onRoomStateChangeRef.current?.(state);

      // Only load new video and initial time sync on initial load or when video ID actually changes!
      const isInitial = !hasInitializedVideoRef.current;
      if (state.videoId && (state.videoId !== currentVideoIdRef.current || isInitial)) {
        hasInitializedVideoRef.current = true;
        currentVideoIdRef.current = state.videoId;
        onVideoChangeRef.current?.(state.videoId, state.videoTitle);
        screenRef.current?.loadVideoById(state.videoId, state.timestamp);

        // Apply initial time sync with drift compensation ONLY on first load or video change
        setTimeout(() => {
          applyVideoSyncRef.current?.(state.timestamp, state.updatedAt, state.status);
        }, 800);
      }
    });

    // 2.1 Receive rooms list summary
    socket.on('rooms-list', (list: RoomSummary[]) => {
      setAvailableRooms(list);
    });

    // 3. Listen for sync-play event
    socket.on('sync-play', (payload: VideoSyncPayload) => {
      setRoomState((prev) => (prev ? { ...prev, status: 'playing', timestamp: payload.timestamp, updatedAt: payload.updatedAt } : null));
      const isSender = Boolean(payload.senderId && socketRef.current && payload.senderId === socketRef.current.id);
      if (isSender) return;

      const now = Date.now();
      const elapsed = Math.max(0, (now - payload.updatedAt) / 1000);
      const targetTime = Math.max(0, payload.timestamp + elapsed);
      const cur = screenRef.current?.getCurrentTime() ?? 0;
      if (cur === 0 || Math.abs(cur - targetTime) > 2.0) {
        screenRef.current?.seekTo(targetTime);
      }
      screenRef.current?.play();
    });

    // 4. Listen for sync-pause event
    socket.on('sync-pause', (payload: VideoSyncPayload) => {
      setRoomState((prev) => (prev ? { ...prev, status: 'paused', timestamp: payload.timestamp, updatedAt: payload.updatedAt } : null));
      const isSender = Boolean(payload.senderId && socketRef.current && payload.senderId === socketRef.current.id);
      if (isSender) return;

      console.log(`[useSocketSync] sync-pause from ${payload.senderId}: pausing at ${payload.timestamp.toFixed(2)}s`);
      // 1. Immediately pause local player
      screenRef.current?.pause();

      // 2. Align timestamp if drift is noticeable
      const cur = screenRef.current?.getCurrentTime() ?? 0;
      if (Math.abs(cur - payload.timestamp) > 2.0) {
        screenRef.current?.seekTo(payload.timestamp);
      }
    });

    // 5. Listen for sync-seek event
    socket.on('sync-seek', (payload: VideoSyncPayload) => {
      setRoomState((prev) => (prev ? { ...prev, timestamp: payload.timestamp, updatedAt: payload.updatedAt, status: payload.status } : null));
      const isSender = Boolean(payload.senderId && socketRef.current && payload.senderId === socketRef.current.id);
      if (isSender) return;

      const now = Date.now();
      const elapsedSeconds = payload.status === 'playing' ? Math.max(0, (now - payload.updatedAt) / 1000) : 0;
      const targetTime = Math.max(0, payload.timestamp + elapsedSeconds);
      console.log(`[useSocketSync] sync-seek from ${payload.senderId}: seeking to ${targetTime.toFixed(2)}s`);
      screenRef.current?.seekTo(targetTime);
      if (payload.status === 'playing') {
        screenRef.current?.play();
      } else {
        screenRef.current?.pause();
      }
    });

    // 6. Listen for sync-video event (video source changed)
    socket.on('sync-video', (payload) => {
      currentVideoIdRef.current = payload.videoId;
      onVideoChangeRef.current?.(payload.videoId, payload.videoTitle);
      screenRef.current?.loadVideoById(payload.videoId, 0);
    });

    // 6.05 Đồng bộ bật/tắt phụ đề video từ phòng chiếu
    socket.on('sync-subtitles', (payload) => {
      console.log(`[useSocketSync] sync-subtitles from server: ${payload.showSubtitles ? 'ON' : 'OFF'}`);
      setShowSubtitles(payload.showSubtitles);
      setRoomState((prev) => (prev ? { ...prev, showSubtitles: payload.showSubtitles } : null));
    });

    // 6.06 Đồng bộ bật/tắt đèn khán phòng từ server
    socket.on('sync-dimmed', (payload) => {
      console.log(`[useSocketSync] sync-dimmed from server: ${payload.isDimmed ? 'TẮT ĐÈN (Dimmed)' : 'BẬT ĐÈN (Bright)'}`);
      setIsDimmed(payload.isDimmed);
      setRoomState((prev) => (prev ? { ...prev, isDimmed: payload.isDimmed } : null));
    });

    // 6.1 Listen for video requests queue updates
    socket.on('queue-updated', (newQueue: VideoRequestItem[]) => {
      setQueue(newQueue);
    });

    // 6.2 Error message from server
    socket.on('error-message', ({ message }) => {
      alert(`⚠️ ${message}`);
    });

    // 7. Listen for real-time user updates (seats & join/leave)
    socket.on('users-updated', (updatedUsers: RoomUser[]) => {
      setUsers(updatedUsers);
    });

    socket.on('user-joined', (newUser: RoomUser) => {
      setUsers((prev) => {
        const filtered = prev.filter(
          (u) =>
            u.socketId !== newUser.socketId &&
            (!newUser.sessionId || u.sessionId !== newUser.sessionId)
        );
        return [...filtered, newUser];
      });
    });

    socket.on('user-left', ({ socketId: leftSocketId }) => {
      setUsers((prev) => prev.filter((u) => u.socketId !== leftSocketId));
    });

    // 8. Listen for incoming 3D chat messages (Phase 5)
    socket.on('chat-message', (msg: ChatMessage) => {
      setChatHistory((prev) => {
        const next = [...prev.slice(-59), msg];
        try {
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(next));
        } catch { }
        return next;
      });

      // Add to active 3D floating bubbles
      setActiveBubbles((prev) => [...prev, msg]);

      // Auto-expire and remove bubble after 5000ms (5 seconds)
      setTimeout(() => {
        setActiveBubbles((prev) => prev.filter((b) => b.id !== msg.id));
      }, 5000);
    });

    // Khi user chuyển tab rồi quay lại, tự động reconnect nếu socket bị ngủ
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!socket.connected) {
          console.log('[useSocketSync] Tab visible, reconnecting socket...');
          socket.connect();
        } else {
          socket.emit('get-rooms');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.disconnect();
      socketRef.current = null;
      setSocketInstance(null);
    };
  }, [serverUrl, roomId]);

  // Update profile without reconnecting if nickname or avatarColor changes
  useEffect(() => {
    if (socketRef.current && isConnected && (nickname || avatarColor)) {
      socketRef.current.emit('user-update-profile', {
        nickname: nickname || 'Bạn',
        avatarColor: avatarColor || '#3b82f6',
        gender: gender || 'Nam',
      });
    }
  }, [nickname, avatarColor, gender, isConnected]);

  // Periodic drift check (mỗi 12 giây với cooldown 20s) đảm bảo video phát mượt mà liên tục, không bị micro-seek giật hình
  useEffect(() => {
    const driftCheckInterval = setInterval(() => {
      if (!isConnected || !roomState || roomState.status !== 'playing' || !screenRef.current) {
        return;
      }
      if (isPerformingLocalAction.current) return;

      const elapsed = (Date.now() - roomState.updatedAt) / 1000;
      const expectedTime = roomState.timestamp + elapsed;
      const actualTime = screenRef.current.getCurrentTime();

      if (actualTime > 0) {
        const drift = Math.abs(actualTime - expectedTime);
        // Ngưỡng 4.5s và cooldown 20s để triệt tiêu hoàn toàn hiện tượng micro-seek giật lặp lại
        if (drift > 4.5 && Date.now() - lastDriftCorrectionRef.current > 20000) {
          lastDriftCorrectionRef.current = Date.now();
          console.log(
            `[useSocketSync] Periodic drift correction: ${drift.toFixed(2)}s drift. Seeking to ${expectedTime.toFixed(2)}s`
          );
          screenRef.current.seekTo(expectedTime);
        }
      }
    }, 12000);

    return () => clearInterval(driftCheckInterval);
  }, [isConnected, roomState, screenRef]);

  // -------------------------------------------------------------
  // Emitters to broadcast local user actions to the room
  // -------------------------------------------------------------

  const sendPlay = useCallback(
    (currentTime?: number) => {
      if (!canControl) {
        console.warn('[useSocketSync] Permission denied: user cannot control video.');
        return;
      }
      isPerformingLocalAction.current = true;
      const ts = currentTime ?? screenRef.current?.getCurrentTime() ?? 0;
      // 1. Instant local play (0ms delay)
      screenRef.current?.play();
      setRoomState((prev) => (prev ? { ...prev, status: 'playing', timestamp: ts, updatedAt: Date.now() } : null));

      // 2. Broadcast to room
      if (socketRef.current) {
        socketRef.current.emit('user-play', { timestamp: ts });
      }
      setTimeout(() => {
        isPerformingLocalAction.current = false;
      }, 1000);
    },
    [screenRef, canControl]
  );

  const sendPause = useCallback(
    (currentTime?: number) => {
      if (!canControl) {
        console.warn('[useSocketSync] Permission denied: user cannot control video.');
        return;
      }
      isPerformingLocalAction.current = true;
      const ts = currentTime ?? screenRef.current?.getCurrentTime() ?? 0;
      // 1. Instant local pause (0ms delay)
      screenRef.current?.pause();
      setRoomState((prev) => (prev ? { ...prev, status: 'paused', timestamp: ts, updatedAt: Date.now() } : null));

      // 2. Broadcast to room
      if (socketRef.current) {
        socketRef.current.emit('user-pause', { timestamp: ts });
      }
      setTimeout(() => {
        isPerformingLocalAction.current = false;
      }, 1000);
    },
    [screenRef, canControl]
  );

  const sendSeek = useCallback(
    (seekTime: number) => {
      if (!canControl) {
        console.warn('[useSocketSync] Permission denied: user cannot control video.');
        return;
      }
      isPerformingLocalAction.current = true;
      const targetTime = Math.max(0, seekTime);
      // 1. Instant local seek (0ms delay)
      screenRef.current?.seekTo(targetTime);
      setRoomState((prev) => (prev ? { ...prev, timestamp: targetTime, updatedAt: Date.now() } : null));

      // 2. Broadcast to room
      if (socketRef.current) {
        socketRef.current.emit('user-seek', { timestamp: targetTime });
      }
      setTimeout(() => {
        isPerformingLocalAction.current = false;
      }, 1200);
    },
    [screenRef, canControl]
  );

  const adminToggleControl = useCallback((targetSocketId: string, allowed: boolean) => {
    if (!socketRef.current) return;
    socketRef.current.emit('admin-toggle-control', { targetSocketId, canControl: allowed });
  }, []);

  const adminToggleChatMute = useCallback((targetSocketId: string, isMuted?: boolean) => {
    if (!socketRef.current) return;
    socketRef.current.emit('admin-toggle-chat-mute', { targetSocketId, isMuted });
  }, []);

  const adminToggleMicMute = useCallback((targetSocketId: string, isMuted?: boolean) => {
    if (!socketRef.current) return;
    socketRef.current.emit('admin-toggle-mic-mute', { targetSocketId, isMuted });
  }, []);

  const sendToggleSubtitles = useCallback(
    (explicitVal?: boolean) => {
      if (!canControl) {
        console.warn('[useSocketSync] Permission denied: user cannot toggle subtitles.');
        return;
      }
      const nextVal = typeof explicitVal === 'boolean' ? explicitVal : !showSubtitles;
      setShowSubtitles(nextVal);
      setRoomState((prev) => (prev ? { ...prev, showSubtitles: nextVal } : null));
      if (socketRef.current) {
        socketRef.current.emit('user-toggle-subtitles', { showSubtitles: nextVal });
      }
    },
    [canControl, showSubtitles]
  );

  const sendToggleDimmed = useCallback(
    (explicitVal?: boolean) => {
      const nextVal = typeof explicitVal === 'boolean' ? explicitVal : !isDimmed;
      setIsDimmed(nextVal);
      setRoomState((prev) => (prev ? { ...prev, isDimmed: nextVal } : null));
      if (socketRef.current) {
        socketRef.current.emit('user-toggle-dimmed', { isDimmed: nextVal });
      }
    },
    [isDimmed]
  );

  const sendChangeVideo = useCallback((videoId: string, videoTitle?: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('user-change-video', { videoId, videoTitle });
  }, []);

  const sendRequestVideo = useCallback((videoId: string, videoTitle?: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('request-video', { videoId, videoTitle });
  }, []);

  const sendAdminManageQueue = useCallback(
    (action: 'play' | 'remove', requestId?: string, videoId?: string, videoTitle?: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit('admin-manage-queue', { action, requestId, videoId, videoTitle });
    },
    []
  );

  const adminLogin = useCallback(
    (username: string, password: string): Promise<{ ok: boolean; message?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          return resolve({ ok: false, message: 'Chưa kết nối tới máy chủ.' });
        }
        socketRef.current.emit('admin-login', { username, password }, (res) => {
          if (res?.ok && res.token) {
            try {
              localStorage.setItem(ADMIN_TOKEN_KEY, res.token);
            } catch { }
          }
          resolve(res || { ok: false });
        });
      });
    },
    []
  );

  const adminLogout = useCallback(() => {
    let token: string | undefined;
    try {
      token = localStorage.getItem(ADMIN_TOKEN_KEY) || undefined;
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch { }
    if (socketRef.current) {
      socketRef.current.emit('admin-logout', { adminToken: token });
    }
  }, []);

  const claimAdmin = useCallback((key?: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('claim-admin', { key });
  }, []);

  const switchRoom = useCallback((newRoomId: string) => {
    if (!socketRef.current || !newRoomId) return;
    const activeNick =
      nicknameRef.current ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('cinema_nickname') || undefined
        : undefined);
    let savedAdminToken: string | undefined;
    try {
      savedAdminToken = localStorage.getItem(ADMIN_TOKEN_KEY) || undefined;
    } catch { }
    socketRef.current.emit('switch-room', {
      newRoomId,
      nickname: activeNick,
      adminToken: savedAdminToken,
      sessionId: getClientSessionId(),
    });
  }, []);

  const createRoom = useCallback((newRoomId: string, name: string) => {
    if (!socketRef.current || !newRoomId) return;
    socketRef.current.emit('create-room', { roomId: newRoomId, name });
  }, []);

  const sendSelectSeat = useCallback(
    (seatId: string, customNick?: string, customColor?: string, customGender?: 'Nam' | 'Nữ') => {
      if (!socketRef.current) return;
      socketRef.current.emit('user-select-seat', {
        seatId,
        nickname: customNick || nicknameRef.current,
        avatarColor: customColor || avatarColorRef.current,
        gender: customGender || genderRef.current,
      });
    },
    []
  );

  const sendUpdateProfile = useCallback(
    (newNickname: string, newAvatarColor?: string, newGender?: 'Nam' | 'Nữ') => {
      if (!socketRef.current) return;
      socketRef.current.emit('user-update-profile', {
        nickname: newNickname,
        avatarColor: newAvatarColor || avatarColorRef.current,
        gender: newGender || genderRef.current,
      });
    },
    []
  );

  const sendLeaveSeat = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('user-leave-seat');
  }, []);

  // Send real-time chat message (Phase 5)
  const sendChat = useCallback((message: string, currentSeatId?: string | null) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    if (isChatMuted) {
      alert('Bạn đã bị Quản trị viên cấm chat trong phòng này!');
      return;
    }

    if (socketRef.current && isConnected) {
      socketRef.current.emit('user-chat', { message: trimmed });
    } else {
      // Local fallback if offline
      const localMsg: ChatMessage = {
        id: `local-msg-${Date.now()}`,
        socketId: 'local',
        nickname: 'Tôi (Local)',
        seatId: currentSeatId || null,
        avatarColor: '#3b82f6',
        message: trimmed,
        createdAt: Date.now(),
      };
      setChatHistory((prev) => [...prev, localMsg]);
      setActiveBubbles((prev) => [...prev, localMsg]);
      setTimeout(() => {
        setActiveBubbles((prev) => prev.filter((b) => b.id !== localMsg.id));
      }, 5000);
    }
  }, [isConnected, isChatMuted]);

  /** Helper to trigger a 5-second 3D floating bubble over a seat */
  const addBubble = useCallback((bubble: ChatMessage, durationMs = 5000) => {
    setActiveBubbles((prev) => [...prev, bubble]);
    setTimeout(() => {
      setActiveBubbles((prev) => prev.filter((b) => b.id !== bubble.id));
    }, durationMs);
  }, []);

  return {
    socket: socketInstance,
    isConnected,
    socketId,
    roomState,
    users,
    queue,
    isHost,
    isAdmin: isHost,
    canControl,
    showSubtitles,
    sendToggleSubtitles,
    isDimmed,
    sendToggleDimmed,
    isChatMuted,
    isMicMuted,
    adminToggleControl,
    adminToggleChatMute,
    adminToggleMicMute,
    adminLogin,
    adminLogout,
    activeBubbles,
    addBubble,
    chatHistory,
    sendPlay,
    sendPause,
    sendSeek,
    sendChangeVideo,
    sendRequestVideo,
    sendAdminManageQueue,
    claimAdmin,
    availableRooms,
    switchRoom,
    createRoom,
    sendSelectSeat,
    sendLeaveSeat,
    sendUpdateProfile,
    sendChat,
  };
}
