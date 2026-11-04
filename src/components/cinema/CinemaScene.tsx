'use client';

import React, { useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { ScreenMesh } from './ScreenMesh';
import { WeTubeSeatGrid, OccupiedSeatInfo } from './WeTubeSeatGrid';
import { WeTubeStage } from './WeTubeStage';
import { CinemaRoom } from './CinemaRoom';
import { AudienceCeilingDownlights } from './AudienceCeilingDownlights';
import { CinemaCameraController, CameraMode } from './CinemaCameraController';
import { RoomUser, ChatMessage } from '@/types/socket';
import { SeatData, DEFAULT_SHIRT_COLOR } from '@/types/cinema';
import { OVERVIEW_CAMERA, SCREEN } from '@/lib/roomLayout';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CinemaSceneProps {
  videoId?: string;
  selectedSeat?: SeatData | null;
  occupiedSeats?: Record<string, OccupiedSeatInfo>;
  users?: RoomUser[];
  activeBubbles?: ChatMessage[];
  currentSocketId?: string | null;
  currentUserNickname?: string;
  currentUserShirtColor?: string;
  currentUserIsAdmin?: boolean;
  currentUserIsMicOn?: boolean;
  currentUserIsSpeaking?: boolean;
  currentUserIsMicMuted?: boolean;
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
  currentUserIsAdmin = false,
  currentUserIsMicOn = false,
  currentUserIsSpeaking = false,
  currentUserIsMicMuted = false,
  isDimmed = true,
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

      {/* Camera: chỉ cho phép xoay khi nhấn giữ chuột trái; không cho chuột phải, con lăn hay trackpad vô tình làm dịch chuyển góc nhìn */}
      <OrbitControls
        ref={controlsRef}
        target={OVERVIEW_CAMERA.target}
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.85}
        enableZoom={false}
        enablePan={false}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: -1 as any,
          RIGHT: -1 as any,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: -1 as any,
        }}
      />
      <CinemaCameraController
        mode={cameraMode}
        selectedSeat={selectedSeat}
        controlsRef={controlsRef}
        resetKey={cameraResetKey}
      />

      {/* ── Hệ thống ánh sáng điện ảnh: Hạ tông tối vừa vặn khi TẮT ĐÈN theo yêu cầu ── */}
      {/* 1. Ánh sáng môi trường (Ambient Fill): Hạ tối êm dịu, không bị chói sáng */}
      <ambientLight
        color="#ffffff"
        intensity={isDimmed ? 0.38 : 1.25}
      />

      {/* 2. Ánh sáng phản xạ bán cầu (Hemisphere): Tông trầm dịu mát */}
      <hemisphereLight
        args={[
          isDimmed ? '#243242' : '#f8fafc',
          isDimmed ? '#0f1722' : '#2c394b',
          isDimmed ? 0.32 : 1.2,
        ]}
      />

      {/* 3. Đèn chính chiếu rọi từ trên cao (Giữ vệt sáng ấm tự nhiên từ buồng máy chiếu) */}
      <directionalLight
        position={[0, 26, 20]}
        color="#fff6ed"
        intensity={isDimmed ? 0.18 : 2.0}
      />

      {/* 4. Đèn rọi khán phòng trước (Front Auditorium Twilight Fill - dịu nhẹ vừa đủ thấy hàng ghế) */}
      <pointLight
        position={[0, 11, 6]}
        color="#fed7aa"
        intensity={isDimmed ? 14 : 45}
        distance={35}
        decay={1.8}
      />

      {/* 5. Đèn rọi khán phòng sau (Rear Auditorium Fill - Dịu nhẹ, không làm lóa lưng ghế) */}
      <pointLight
        position={[0, 13, 18]}
        color="#fde68a"
        intensity={isDimmed ? 10 : 35}
        distance={30}
        decay={1.8}
      />

      {/* 5. Hệ thống đèn rọi trần chiếu thẳng xuống các hàng ghế ngồi (Audience Ceiling Downlights) */}
      <AudienceCeilingDownlights isDimmed={isDimmed} />

      {/* Kiến trúc phòng: sàn bậc thang, tường LED, nan tiêu âm (phản ứng theo isDimmed) */}
      <CinemaRoom isDimmed={isDimmed} />

      {/* Sân khấu: loa cột, disco ball, 3 bục biểu diễn */}
      <WeTubeStage screenZ={SCREEN.z} />

      {/* 100 ghế (10 hàng) + avatar chibi */}
      <WeTubeSeatGrid
        selectedSeatId={selectedSeat?.id || null}
        occupiedSeats={occupiedSeats}
        currentUserNickname={currentUserNickname}
        currentUserShirtColor={currentUserShirtColor}
        currentUserIsAdmin={currentUserIsAdmin}
        currentUserIsMicOn={currentUserIsMicOn}
        currentUserIsSpeaking={currentUserIsSpeaking}
        currentUserIsMicMuted={currentUserIsMicMuted}
        activeBubbles={activeBubbles}
        currentSocketId={currentSocketId}
        onSelectSeat={onSelectSeat}
      />

      {/* Màn chiếu IMAX 3D Rig (Frame + Brand + Ambilight trong trẻo + Transform Sync) */}
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
