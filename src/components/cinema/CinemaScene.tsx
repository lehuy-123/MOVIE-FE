'use client';

import React, { useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { ScreenMesh } from './ScreenMesh';
import { WeTubeSeatGrid } from './WeTubeSeatGrid';
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

      {/* ── Hệ thống ánh sáng điện ảnh thực tế: Phản ứng chân thực khi BẬT / TẮT ĐÈN ── */}
      {/* 1. Ánh sáng môi trường (Ambient Fill): Nâng tông sáng dịu hơn khi tắt đèn, không bị đen sì */}
      <ambientLight
        color="#ffffff"
        intensity={isDimmed ? 0.48 : 1.25}
      />

      {/* 2. Ánh sáng phản xạ bán cầu (Hemisphere): Vòm trời & Sàn phản xạ ấm */}
      <hemisphereLight
        args={[
          isDimmed ? '#3b4f6b' : '#f8fafc',
          isDimmed ? '#141c26' : '#2c394b',
          isDimmed ? 0.45 : 1.2,
        ]}
      />

      {/* 3. Đèn chính chiếu rọi từ trên cao (Sáng rõ khi BẬT ĐÈN, giữ vệt sáng mờ dịu khi TẮT ĐÈN) */}
      <directionalLight
        position={[0, 26, 16]}
        color="#fff6ed"
        intensity={isDimmed ? 0.18 : 2.0}
      />

      {/* 4. Đèn rọi dịu nhẹ khán phòng giữ chi tiết hàng ghế khi tắt đèn (Cinema Twilight Fill) */}
      <pointLight
        position={[0, 12, 6]}
        color="#ffe2ba"
        intensity={isDimmed ? 14 : 45}
        distance={35}
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
