'use client';

import React, { Suspense, useRef, useState, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraMode } from './CinemaCameraController';
import { OVERVIEW_CAMERA } from '@/lib/roomLayout';
import { CinemaScene } from './CinemaScene';
import { CinemaScreenOverlay, CinemaScreenOverlayHandle } from './CinemaScreenOverlay';
import { CinemaHUD, ViewerInfo } from './CinemaHUD';
import { TicketModal } from './TicketModal';
import { SeatMapModal } from './SeatMapModal';
import { AddVideoModal } from './AddVideoModal';
import { RoomListModal } from './RoomListModal';
import { useSocketSync } from '@/hooks/useSocketSync';
import { YouTubePlayerControls } from '@/types/youtube';
import { SeatData, UserProfile, DEFAULT_SHIRT_COLOR } from '@/types/cinema';
import { buildSeatData, getSeatKind, SEAT_KIND_LABEL } from '@/lib/seatLayout';

interface CinemaCanvasProps {
  initialVideoId?: string;
}

class CinemaErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || 'Lỗi dựng hình 3D' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Cinema 3D Scene Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#07090e] p-4 text-white font-sans text-center">
          <p className="text-sm font-bold text-amber-300">Đang phục hồi màn chiếu 3D rạp phim...</p>
          {this.state.errorMessage && (
            <p className="mt-1 text-xs text-red-400 font-mono max-w-md break-words opacity-75">
              {this.state.errorMessage}
            </p>
          )}
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            className="mt-3 rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-black hover:bg-lime-300 transition"
          >
            Tải lại màn chiếu
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CinemaCanvas({
  initialVideoId = 'Sx5lJtEs56A', // Default to Rạp 01 movie (Tình Xưa Xa Rồi - Ngọc Lan)
}: CinemaCanvasProps) {
  // Phòng chiếu hiện tại (mặc định Rạp 01 hoặc lấy từ URL ?room=cinema-01)
  const [roomId, setRoomId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('room');
      return param || 'cinema-01';
    }
    return 'cinema-01';
  });
  const [isRoomListModalOpen, setIsRoomListModalOpen] = useState(false);

  const [videoId, setVideoId] = useState(initialVideoId);
  const [videoTitle, setVideoTitle] = useState('Tình Xưa Xa Rồi - Tiếng Hát Ngọc Lan');
  // Người dùng chưa có ghế cho tới khi hoàn tất Bước 3 (chọn ghế) của luồng onboarding
  const [selectedSeat, setSelectedSeat] = useState<SeatData | null>(null);
  const [isDimmed] = useState(false);

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>({
    nickname: '',
    gender: 'Nam',
    shirtColor: DEFAULT_SHIRT_COLOR,
    seatId: null,
    coins: 0,
  });

  // Modals state — mở sẵn Thẻ vé (Bước 1) khi vào trang
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(true);
  const [ticketMode, setTicketMode] = useState<'onboarding' | 'wardrobe'>('onboarding');
  const [isSeatMapModalOpen, setIsSeatMapModalOpen] = useState(false);
  const [isSeatMapOnboarding, setIsSeatMapOnboarding] = useState(false);
  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState(false);

  const screenRef = useRef<CinemaScreenOverlayHandle | null>(null);

  // Synchronize CSS3D transforms directly from Three.js scene to CinemaScreenOverlay DOM
  const handleScreenTransform = useCallback(
    (
      outerTransform: string,
      innerTransform: string,
      perspective: string,
      isVisible: boolean
    ) => {
      screenRef.current?.updateTransform(outerTransform, innerTransform, perspective, isVisible);
    },
    []
  );
  // Mặc định: góc cao bao quát từ phía sau. Chọn ghế trong 3D / nút ghế → góc nhìn ngôi thứ nhất.
  const [cameraMode, setCameraMode] = useState<CameraMode>('overview');
  const [cameraResetKey, setCameraResetKey] = useState(0);
  const [, setPlayerControls] = useState<YouTubePlayerControls | null>(null);
  const [volume, setVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);

  // 1. Real-time WebSocket room synchronization hook
  const handleVideoChange = useCallback((vidId: string, title?: string) => {
    setVideoId(vidId);
    if (title) setVideoTitle(title);
  }, []);

  const {
    isConnected,
    socketId,
    roomState,
    users,
    queue,
    isHost,
    activeBubbles,
    addBubble,
    chatHistory,
    availableRooms,
    switchRoom,
    createRoom,
    sendPlay,
    sendPause,
    sendSeek,
    sendChangeVideo,
    sendRequestVideo,
    sendAdminManageQueue,
    claimAdmin,
    sendSelectSeat,
    sendLeaveSeat,
    sendChat,
  } = useSocketSync({
    roomId,
    screenRef,
    nickname: userProfile.nickname,
    onVideoChange: handleVideoChange,
  });

  const handleSelectRoom = useCallback(
    (newRoomId: string) => {
      setRoomId(newRoomId);
      setSelectedSeat(null);
      switchRoom(newRoomId);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('room', newRoomId);
        window.history.replaceState({}, '', url.toString());
      }
    },
    [switchRoom]
  );

  // Calculate real-time occupied seats map from connected users
  const occupiedSeats = useMemo(() => {
    const map: Record<string, { nickname: string; shirtColor: string }> = {};
    users.forEach((u) => {
      if (u.seatId && u.socketId !== socketId) {
        map[u.seatId] = {
          nickname: u.nickname,
          shirtColor: u.avatarColor || '#93c5fd',
        };
      }
    });
    return map;
  }, [users, socketId]);

  const occupiedUserSeatIds = useMemo(
    () =>
      users
        .filter((u) => u.seatId && u.socketId !== socketId)
        .map((u) => u.seatId as string),
    [users, socketId]
  );

  // Audience list for viewers popup in CinemaHUD - real connected users only
  const viewersList: ViewerInfo[] = useMemo(() => {
    const list: ViewerInfo[] = [
      {
        id: socketId || 'local-me',
        nickname: userProfile.nickname || 'Bạn',
        seatId: selectedSeat?.id ?? userProfile.seatId,
        color: userProfile.shirtColor,
        isMe: true,
      },
    ];

    users.forEach((u) => {
      if (u.socketId !== socketId) {
        list.push({
          id: u.socketId,
          nickname: u.nickname,
          seatId: u.seatId || null,
          color: u.avatarColor || '#93c5fd',
          isMe: false,
        });
      }
    });

    return list;
  }, [users, socketId, userProfile.nickname, userProfile.seatId, userProfile.shirtColor, selectedSeat?.id]);

  const seatedCount = useMemo(() => {
    const othersSeated = users.filter((u) => u.seatId && u.socketId !== socketId).length;
    return othersSeated + (selectedSeat?.id ? 1 : 0);
  }, [users, socketId, selectedSeat?.id]);

  const realOnlineCount = Math.max(1, users.length);

  const handlePlayerReady = useCallback((controls: YouTubePlayerControls) => {
    setPlayerControls(controls);
  }, []);

  const applySeat = useCallback(
    (seat: SeatData) => {
      setSelectedSeat(seat);
      setUserProfile((prev) => ({ ...prev, seatId: seat.id }));
      sendSelectSeat(seat.id);

      const seatKind = seat.type || getSeatKind(seat.id);
      const label = SEAT_KIND_LABEL[seatKind] || 'Ghế đơn';
      addBubble(
        {
          id: `seat-${seat.id}-${Date.now()}`,
          socketId: socketId || 'local',
          nickname: userProfile.nickname || 'Bạn',
          seatId: seat.id,
          avatarColor: userProfile.shirtColor,
          message: `Đã chọn ${seat.id} · ${label}`,
          createdAt: Date.now(),
        },
        5000
      );
    },
    [sendSelectSeat, addBubble, socketId, userProfile.nickname, userProfile.shirtColor]
  );

  /** Click ghế ngay trong cảnh 3D → camera trượt vào góc nhìn ngôi thứ nhất. */
  const handleSelectSeat = useCallback(
    (seat: SeatData) => {
      applySeat(seat);
      setCameraMode('seat');
    },
    [applySeat]
  );

  /** Chọn ghế từ sơ đồ 2D: giữ góc bao quát (trừ khi đang ngồi chế độ ghế). */
  const handleSelectSeatById = useCallback(
    (seatId: string) => {
      const seat = buildSeatData(seatId);
      if (!seat) return;
      applySeat(seat);
      setCameraMode((m) => (m === 'seat' ? 'seat' : 'overview'));
    },
    [applySeat]
  );

  const handleLeaveSeat = useCallback(() => {
    setSelectedSeat(null);
    sendLeaveSeat();
  }, [sendLeaveSeat]);

  const handleTogglePlay = useCallback(() => {
    const isCurrentlyPlaying = roomState?.status !== 'paused';
    if (isCurrentlyPlaying) {
      sendPause();
      screenRef.current?.pause();
    } else {
      sendPlay();
      screenRef.current?.play();
      screenRef.current?.getPlayer()?.unMute();
    }
  }, [roomState?.status, sendPause, sendPlay]);

  const handleAddVideo = useCallback(
    (newVidId: string, title?: string) => {
      setVideoId(newVidId);
      const displayTitle = title || `YouTube Video (${newVidId})`;
      setVideoTitle(displayTitle);
      sendChangeVideo(newVidId, displayTitle);
      screenRef.current?.loadVideoById(newVidId);
      screenRef.current?.play();
      screenRef.current?.getPlayer()?.unMute();
    },
    [sendChangeVideo]
  );

  const handleRequestVideo = useCallback(
    (newVidId: string, title?: string) => {
      sendRequestVideo(newVidId, title);
    },
    [sendRequestVideo]
  );

  /** Bước 2 xong: lưu nhân vật. Nếu đang onboarding thì chuyển sang Bước 3 (chọn ghế). */
  const handleProfileUpdate = useCallback(
    (profile: UserProfile) => {
      setUserProfile((prev) => ({ ...profile, seatId: prev.seatId, coins: prev.coins }));
      setIsTicketModalOpen(false);
      if (ticketMode === 'onboarding') {
        setIsSeatMapOnboarding(true);
        setIsSeatMapModalOpen(true);
      }
    },
    [ticketMode]
  );

  const openWardrobe = useCallback(() => {
    setTicketMode('wardrobe');
    setIsTicketModalOpen(true);
  }, []);

  const openSeatMap = useCallback(() => {
    setIsSeatMapOnboarding(false);
    setIsSeatMapModalOpen(true);
  }, []);

  const handleCameraPreset = useCallback(
    (preset: 'chair' | 'monitor' | 'audience' | 'overview') => {
      if (preset === 'chair') {
        if (selectedSeat) {
          setCameraMode('seat');
          setCameraResetKey((k) => k + 1);
        } else {
          openSeatMap();
        }
      } else if (preset === 'monitor') {
        setCameraMode('screen');
        setCameraResetKey((k) => k + 1);
      } else if (preset === 'audience') {
        setCameraMode('audience');
        setCameraResetKey((k) => k + 1);
      } else {
        setCameraMode('overview');
        setCameraResetKey((k) => k + 1);
      }
    },
    [selectedSeat, openSeatMap]
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#07090e] select-none font-sans">
      {/* 2D Overlay HUD (Top bar, bottom bar, right vertical dock) */}
      <CinemaHUD
        screenRef={screenRef}
        videoKey={videoId}
        videoTitle={roomState?.videoTitle || videoTitle}
        suggester={roomState?.users?.find((u) => u.isAdmin)?.nickname || (isHost ? 'Admin' : 'Phòng chiếu')}
        isPlaying={roomState?.status !== 'paused'}
        onTogglePlay={handleTogglePlay}
        onSeek={sendSeek}
        onlineCount={realOnlineCount}
        seatedCount={seatedCount}
        totalSeats={100}
        initialVotes={roomState?.skipVotes?.length || 0}
        isAdmin={isHost}
        queueCount={queue.length}
        nickname={userProfile.nickname || (isHost ? 'Admin' : 'Bạn')}
        seatId={selectedSeat?.id ?? userProfile.seatId}
        shirtColor={userProfile.shirtColor}
        volume={volume}
        isMuted={isMuted}
        onToggleMute={() => {
          if (isMuted) {
            screenRef.current?.getPlayer()?.unMute();
            setIsMuted(false);
          } else {
            screenRef.current?.getPlayer()?.mute();
            setIsMuted(true);
          }
        }}
        onVolumeChange={(val) => {
          setVolume(val);
          screenRef.current?.setVolume(val);
        }}
        chatHistory={chatHistory}
        onSendChat={(msg) => sendChat(msg, selectedSeat?.id || userProfile.seatId)}
        onSendReaction={(emoji) => sendChat(emoji, selectedSeat?.id || userProfile.seatId)}
        viewers={viewersList}
        cameraMode={cameraMode}
        roomName={roomState?.name || (roomId === 'cinema-01' ? 'Rạp 01 · IMAX Star' : `Rạp ${roomId}`)}
        onOpenRoomList={() => setIsRoomListModalOpen(true)}
        onSetCameraPreset={handleCameraPreset}
        onOpenSeatMap={openSeatMap}
        onOpenAddVideo={() => setIsAddVideoModalOpen(true)}
        onOpenProfile={openWardrobe}
        onTogglePrivateRoom={() => setIsRoomListModalOpen(true)}
      />

      {/* 4. Native React 19 YouTube IMAX Screen DOM Overlay (Zero createRoot, zero crash) */}
      <CinemaScreenOverlay
        ref={screenRef}
        videoId={videoId}
        isPlaying={roomState?.status !== 'paused'}
        onReady={handlePlayerReady}
        onTogglePlay={handleTogglePlay}
      />

      {/* 5. Three.js WeTube Ciné 3D Scene */}
      <CinemaErrorBoundary>
        <Canvas
          camera={{ position: OVERVIEW_CAMERA.position, fov: OVERVIEW_CAMERA.fov, near: 0.1, far: 220 }}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            alpha: false,
          }}
          dpr={[1, 1.5]}
          className="w-full h-full"
        >
          <Suspense fallback={null}>
            <CinemaScene
              selectedSeat={selectedSeat}
              occupiedSeats={occupiedSeats}
              users={users}
              activeBubbles={activeBubbles}
              currentSocketId={socketId}
              currentUserNickname={userProfile.nickname}
              currentUserShirtColor={userProfile.shirtColor}
              isDimmed={isDimmed}
              isPlaying={roomState?.status !== 'paused'}
              cameraMode={cameraMode}
              cameraResetKey={cameraResetKey}
              onSelectSeat={handleSelectSeat}
              onScreenTransform={handleScreenTransform}
            />
          </Suspense>
        </Canvas>
      </CinemaErrorBoundary>

      {/* 6. Onboarding 3 bước: Vé vào rạp → Tạo nhân vật → Chọn ghế */}
      {isTicketModalOpen && (
        <TicketModal
          isOpen={isTicketModalOpen}
          mode={ticketMode}
          onClose={() => setIsTicketModalOpen(false)}
          onComplete={handleProfileUpdate}
          initialNickname={userProfile.nickname}
          initialGender={userProfile.gender}
          initialColor={userProfile.shirtColor}
        />
      )}

      {/* Bước 3 — Sơ đồ ghế 100 chỗ */}
      <SeatMapModal
        isOpen={isSeatMapModalOpen}
        isOnboarding={isSeatMapOnboarding}
        onClose={() => setIsSeatMapModalOpen(false)}
        selectedSeatId={selectedSeat?.id ?? null}
        onSelectSeatId={handleSelectSeatById}
        occupiedSeatIds={occupiedUserSeatIds}
      />

      {/* Add Video / Request Video Modal */}
      <AddVideoModal
        isOpen={isAddVideoModalOpen}
        onClose={() => setIsAddVideoModalOpen(false)}
        isAdmin={isHost}
        queue={queue}
        onAddVideo={handleAddVideo}
        onRequestVideo={handleRequestVideo}
        onManageQueue={sendAdminManageQueue}
      />

      {/* Danh Sách Rạp Chiếu Phim Theo Thứ Tự (Rạp 01, Rạp 02, Rạp 03...) */}
      <RoomListModal
        isOpen={isRoomListModalOpen}
        currentRoomId={roomId}
        rooms={availableRooms}
        onClose={() => setIsRoomListModalOpen(false)}
        onSelectRoom={handleSelectRoom}
        onCreateRoom={createRoom}
      />
    </div>
  );
}
