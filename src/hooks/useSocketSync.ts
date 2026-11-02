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

  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [queue, setQueue] = useState<VideoRequestItem[]>([]);
  const [availableRooms, setAvailableRooms] = useState<RoomSummary[]>([]);

  // 3D Chat bubbles active during their 5-second lifetime
  const [activeBubbles, setActiveBubbles] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Current user is Admin ONLY if room host matches socketId or users array marks them admin
  const isHost = Boolean(
    socketId &&
      (roomState?.hostId === socketId ||
        users.find((u) => u.socketId === socketId)?.isAdmin)
  );

  // Flag to avoid feedback loops from local user actions
  const isPerformingLocalAction = useRef(false);

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
      const expectedTime = timestamp + elapsedSeconds;

      const currentTime = player.getCurrentTime();
      const isSender = Boolean(senderId && socketRef.current && senderId === socketRef.current.id);
      if (isSender) return;

      // Only seek if video is already playing or buffered, and drift is significant (> 3.5s)
      if (currentTime > 0) {
        const drift = Math.abs(currentTime - expectedTime);
        if (drift > 3.5) {
          console.log(
            `[useSocketSync] Aligning drift (${drift.toFixed(2)}s). Seeking to ${expectedTime.toFixed(2)}s`
          );
          player.seekTo(expectedTime);
        }
      }

      // Synchronize play/pause status
      if (status === 'playing') {
        player.play();
      } else {
        player.pause();
      }
    },
    [screenRef]
  );

  const applyVideoSyncRef = useRef(applyVideoSync);
  applyVideoSyncRef.current = applyVideoSync;

  useEffect(() => {
    // 1. Initialize Socket.io client
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`[useSocketSync] Connected to sync server: ${socket.id}`);
      setIsConnected(true);
      setSocketId(socket.id || null);

      // Join cinema room immediately upon connection (gửi kèm profile & adminToken nếu đã có)
      let activeNick = nicknameRef.current;
      let activeColor = avatarColorRef.current;
      let activeGender = genderRef.current;
      try {
        const saved = localStorage.getItem('wetube-cine:profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!activeNick && parsed.nickname) activeNick = parsed.nickname;
          if (!activeColor && parsed.shirtColor) activeColor = parsed.shirtColor;
          if (!activeGender && parsed.gender) activeGender = parsed.gender;
        }
      } catch {}

      if (!activeNick && typeof window !== 'undefined') {
        activeNick = localStorage.getItem('cinema_nickname') || undefined;
      }

      let savedAdminToken: string | undefined;
      try {
        savedAdminToken = localStorage.getItem(ADMIN_TOKEN_KEY) || undefined;
      } catch {}

      socket.emit('join-room', {
        roomId,
        nickname: activeNick,
        avatarColor: activeColor,
        gender: activeGender,
        adminToken: savedAdminToken,
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
      if (state.queue) setQueue(state.queue);
      onRoomStateChangeRef.current?.(state);

      // Sync video ID and title and immediately load it on the screen!
      if (state.videoId) {
        onVideoChangeRef.current?.(state.videoId, state.videoTitle);
        screenRef.current?.loadVideoById(state.videoId, state.timestamp);
      }

      // Apply initial time sync with drift compensation
      setTimeout(() => {
        applyVideoSyncRef.current?.(state.timestamp, state.updatedAt, state.status);
      }, 500);
    });

    // 2.1 Receive rooms list summary
    socket.on('rooms-list', (list: RoomSummary[]) => {
      setAvailableRooms(list);
    });

    // 3. Listen for sync-play event
    socket.on('sync-play', (payload: VideoSyncPayload) => {
      setRoomState((prev) => (prev ? { ...prev, status: 'playing', timestamp: payload.timestamp, updatedAt: payload.updatedAt } : null));
      applyVideoSyncRef.current?.(payload.timestamp, payload.updatedAt, 'playing', payload.senderId);
    });

    // 4. Listen for sync-pause event
    socket.on('sync-pause', (payload: VideoSyncPayload) => {
      setRoomState((prev) => (prev ? { ...prev, status: 'paused', timestamp: payload.timestamp, updatedAt: payload.updatedAt } : null));
      applyVideoSyncRef.current?.(payload.timestamp, payload.updatedAt, 'paused', payload.senderId);
    });

    // 5. Listen for sync-seek event
    socket.on('sync-seek', (payload: VideoSyncPayload) => {
      setRoomState((prev) => (prev ? { ...prev, timestamp: payload.timestamp, updatedAt: payload.updatedAt } : null));
      applyVideoSyncRef.current?.(payload.timestamp, payload.updatedAt, payload.status, payload.senderId);
    });

    // 6. Listen for sync-video event (video source changed)
    socket.on('sync-video', (payload) => {
      onVideoChangeRef.current?.(payload.videoId, payload.videoTitle);
      screenRef.current?.loadVideoById(payload.videoId, 0);
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

    // 8. Listen for incoming 3D chat messages (Phase 5)
    socket.on('chat-message', (msg: ChatMessage) => {
      setChatHistory((prev) => [...prev.slice(-49), msg]);

      // Add to active 3D floating bubbles
      setActiveBubbles((prev) => [...prev, msg]);

      // Auto-expire and remove bubble after 5000ms (5 seconds)
      setTimeout(() => {
        setActiveBubbles((prev) => prev.filter((b) => b.id !== msg.id));
      }, 5000);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
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

  // Periodic drift check (every 10 seconds) to prevent subtle micro-drift while playing
  useEffect(() => {
    const driftCheckInterval = setInterval(() => {
      if (!isConnected || !roomState || roomState.status !== 'playing' || !screenRef.current) {
        return;
      }
      if (isPerformingLocalAction.current) return;

      const elapsed = (Date.now() - roomState.updatedAt) / 1000;
      const expectedTime = roomState.timestamp + elapsed;
      const actualTime = screenRef.current.getCurrentTime();

      // Only check drift if the video is actually playing and reporting time > 0, and drift is significant (> 3.5s)
      if (actualTime > 0) {
        const drift = Math.abs(actualTime - expectedTime);
        if (drift > 3.5) {
          console.log(`[useSocketSync] Periodic drift correction: ${drift.toFixed(2)}s drift`);
          screenRef.current.seekTo(expectedTime);
        }
      }
    }, 10000);

    return () => clearInterval(driftCheckInterval);
  }, [isConnected, roomState, screenRef]);

  // -------------------------------------------------------------
  // Emitters to broadcast local user actions to the room
  // -------------------------------------------------------------

  const sendPlay = useCallback(
    (currentTime?: number) => {
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
      }, 800);
    },
    [screenRef]
  );

  const sendPause = useCallback(
    (currentTime?: number) => {
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
      }, 800);
    },
    [screenRef]
  );

  const sendSeek = useCallback(
    (seekTime: number) => {
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
      }, 800);
    },
    [screenRef]
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
            } catch {}
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
    } catch {}
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
    } catch {}
    socketRef.current.emit('switch-room', {
      newRoomId,
      nickname: activeNick,
      adminToken: savedAdminToken,
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
  }, [isConnected]);

  /** Helper to trigger a 5-second 3D floating bubble over a seat */
  const addBubble = useCallback((bubble: ChatMessage, durationMs = 5000) => {
    setActiveBubbles((prev) => [...prev, bubble]);
    setTimeout(() => {
      setActiveBubbles((prev) => prev.filter((b) => b.id !== bubble.id));
    }, durationMs);
  }, []);

  return {
    isConnected,
    socketId,
    roomState,
    users,
    queue,
    isHost,
    isAdmin: isHost,
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
