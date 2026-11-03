'use client';

import React, { useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { ScreenMesh } from './ScreenMesh';
import { WeTubeSeatGrid } from './WeTubeSeatGrid';
import { WeTubeStage } from './WeTubeStage';
import { CinemaRoom } from './CinemaRoom';
import { CinemaCameraController, CameraMode } from './CinemaCameraController';
import { RoomUser, ChatMessage } from '@/types/socket';
import { SeatData, DEFAULT_SHIRT_COLOR } from '@/types/cinema';
import { OVERVIEW_CAMERA, SCREEN } from '@/lib/roomLayout';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CinemaSceneProps {
  videoId?: string;
  selectedSeat?: SeatData | null;
  occupiedSeats?: Record<string, { nickname: string; shirtColor: string }>;
  users?: RoomUser[];
  activeBubbles?: ChatMessage[];
  currentSocketId?: string | null;
  currentUserNickname?: string;
  currentUserShirtColor?: string;
  isDimmed?: boolean;
  isPlaying?: boolean;
  cameraMode?: CameraMode;
  cameraResetKey?: number;
  onSelectSeat?: (seat: SeatData) => void;
  onScreenTransform?: (
    outerTransform: string,
    innerTransform: string,
    perspective: string,
    isVisible: boolean
  ) => void;
}

export function CinemaScene({
  selectedSeat = null,
  occupiedSeats = {},
  activeBubbles = [],
  currentSocketId,
  currentUserNickname = 'Bạn',
  currentUserShirtColor = DEFAULT_SHIRT_COLOR,
  isDimmed = false,
  isPlaying = true,
  cameraMode = 'overview',
  cameraResetKey = 0,
  onSelectSeat = () => {},
  onScreenTransform,
}: CinemaSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <>
      <color attach="background" args={['#05070b']} />
      <fog attach="fog" args={['#05070b', 65, 120]} />

      {/* Camera: mặc định góc cao bao quát từ phía sau; giới hạn do CinemaCameraController áp dụng */}
      <OrbitControls
        ref={controlsRef}
        target={OVERVIEW_CAMERA.target}
        enableDamping
        dampingFactor={0.07}
      />
      <CinemaCameraController
        mode={cameraMode}
        selectedSeat={selectedSeat}
        controlsRef={controlsRef}
        resetKey={cameraResetKey}
      />

      {/* ── Hệ thống ánh sáng ấm áp, sáng sủa chuẩn xác theo Screenshot 2 ── */}
      {/* 1. Ánh sáng môi trường tự nhiên (Ambient Fill) giúp thấy rõ toàn bộ rạp và ghế */}
      <ambientLight color="#ffffff" intensity={isDimmed ? 1.0 : 1.9} />

      {/* 2. Ánh sáng bán cầu (Hemisphere: Vòm trời sáng dịu - Đất phản xạ ấm) */}
      <hemisphereLight
        args={['#f8fafc', '#2c394b', isDimmed ? 0.9 : 1.75]}
      />

      {/* 3. Đèn chính chiếu rọi từ trên cao phía sau khán phòng (Key Light) */}
      <directionalLight
        position={[0, 26, 16]}
        color="#fff6ed"
        intensity={isDimmed ? 1.3 : 2.5}
      />

      {/* 4. Đèn rọi trần phủ đều toàn bộ các hàng ghế khán giả (Audience Hall Downlights) */}
      <pointLight
        position={[0, 14, 2]}
        color="#ffeacc"
        intensity={isDimmed ? 25 : 60}
        distance={38}
        decay={1.6}
      />
      <pointLight
        position={[0, 15, 11]}
        color="#ffeacc"
        intensity={isDimmed ? 25 : 60}
        distance={38}
        decay={1.6}
      />
      <pointLight
        position={[0, 15, -3]}
        color="#ffeacc"
        intensity={isDimmed ? 22 : 50}
        distance={35}
        decay={1.6}
      />

      {/* Kiến trúc phòng: sàn bậc thang, tường LED, nan tiêu âm */}
      <CinemaRoom />

      {/* Sân khấu: loa cột, disco ball, 3 bục biểu diễn */}
      <WeTubeStage screenZ={SCREEN.z} />

      {/* 100 ghế (10 hàng) + avatar chibi */}
      <WeTubeSeatGrid
        selectedSeatId={selectedSeat?.id || null}
        occupiedSeats={occupiedSeats}
        currentUserNickname={currentUserNickname}
        currentUserShirtColor={currentUserShirtColor}
        activeBubbles={activeBubbles}
        currentSocketId={currentSocketId}
        onSelectSeat={onSelectSeat}
      />

      {/* Màn chiếu IMAX 3D Rig (Frame + Glow + Transform Sync) */}
      <ScreenMesh
        width={SCREEN.width}
        height={SCREEN.height}
        position={[0, SCREEN.y, SCREEN.z]}
        isDimmed={isDimmed}
        isPlaying={isPlaying}
        onScreenTransform={onScreenTransform}
      />
    </>
  );
}
