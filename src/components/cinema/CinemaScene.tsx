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
      <fog attach="fog" args={['#05070b', 55, 110]} />

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

      {/* Ánh sáng: nền xanh đen nhẹ + ánh sáng từ trên để thấy rõ khán giả */}
      <ambientLight color="#1b2433" intensity={isDimmed ? 0.5 : 1.1} />
      <hemisphereLight args={['#33425a', '#0a0d12', isDimmed ? 0.5 : 1.15]} />
      <directionalLight position={[0, 22, 16]} color="#c4d2ff" intensity={isDimmed ? 0.45 : 1.0} />
      {/* Ánh sáng dịu phủ lên khu vực sân khấu và các hàng ghế đầu */}
      <pointLight
        position={[0, 14, -2]}
        color="#dfe8ff"
        intensity={isDimmed ? 30 : 70}
        distance={45}
        decay={1.8}
      />

      {/* Kiến trúc phòng: sàn bậc thang, tường LED, màn viền neon */}
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
