'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SeatData } from '@/types/cinema';
import { WeTubeAvatar } from './WeTubeAvatar';
import { ChatMessage } from '@/types/socket';
import {
  ROWS,
  COL_X_POSITIONS,
  ROW_Z_POSITIONS,
  ROW_Y_POSITIONS,
  getSeatKind,
} from '@/lib/seatLayout';

export { ROWS, COL_X_POSITIONS, ROW_Z_POSITIONS, ROW_Y_POSITIONS };

// Hình học & vật liệu ghế dùng chung cho rạp phim
const seatBoxGeo = new THREE.BoxGeometry(1, 1, 1);

// Tông màu ghế sáng sủa, sắc nét, rõ khối chuẩn Screenshot 2
const seatMat = new THREE.MeshStandardMaterial({
  color: '#4b5c73', // Màu xám xanh slate sáng, ăn sáng tốt
  roughness: 0.35,
  metalness: 0.15,
});

// Mặt lưng ốp sau ghế (hướng trực diện vào camera)
const seatBackShellMat = new THREE.MeshStandardMaterial({
  color: '#364559', // Không bị đen đặc khi tắt đèn
  roughness: 0.45,
  metalness: 0.15,
});

// Hình học logo thương hiệu CGV dùng chung cho tất cả 100 ghế
const cgvLogoGeo = new THREE.PlaneGeometry(0.34, 0.17);

const seatSelectedMat = new THREE.MeshStandardMaterial({
  color: '#d9f95f',
  emissive: '#d9f95f',
  emissiveIntensity: 0.45,
  roughness: 0.35,
});

const seatLegMat = new THREE.MeshStandardMaterial({ color: '#161c24', roughness: 0.5 });

export interface OccupiedSeatInfo {
  nickname: string;
  shirtColor: string;
  isAdmin?: boolean;
  isMicOn?: boolean;
  isSpeaking?: boolean;
  isMicMuted?: boolean;
  socketId?: string;
}

interface WeTubeSeatGridProps {
  selectedSeatId: string | null;
  onSelectSeat: (seat: SeatData) => void;
  occupiedSeats: Record<string, OccupiedSeatInfo>;
  currentUserNickname?: string;
  currentUserShirtColor?: string;
  currentUserIsAdmin?: boolean;
  currentUserIsMicOn?: boolean;
  currentUserIsSpeaking?: boolean;
  currentUserIsMicMuted?: boolean;
  activeBubbles?: ChatMessage[];
  currentSocketId?: string | null;
  isDimmed?: boolean;
}

export function WeTubeSeatGrid({
  selectedSeatId,
  onSelectSeat,
  occupiedSeats,
  currentUserNickname = 'Bạn',
  currentUserShirtColor = '#a7f3d0',
  currentUserIsAdmin = false,
  currentUserIsMicOn = false,
  currentUserIsSpeaking = false,
  currentUserIsMicMuted = false,
  activeBubbles = [],
  currentSocketId,
  isDimmed = true,
}: WeTubeSeatGridProps) {
  // Ghế thời gian thực dựa trên kết nối người dùng thật trong phòng
  const seats: SeatData[] = useMemo(() => {
    const list: SeatData[] = [];

    ROWS.forEach((rowLetter, rowIndex) => {
      COL_X_POSITIONS.forEach((x, colIndex) => {
        const seatNumStr = (colIndex + 1).toString().padStart(2, '0');
        const id = `${rowLetter}${seatNumStr}`;

        // Determine seat type
        const type = getSeatKind(id);

        let state: SeatData['state'] = 'empty';
        let occupantName = '';
        let avatarColor = '#a7f3d0';

        if (id === selectedSeatId) {
          state = 'selected';
          occupantName = (currentUserNickname && currentUserNickname.trim()) || 'Bạn';
          avatarColor = currentUserShirtColor || '#a7f3d0';
        } else if (occupiedSeats[id]) {
          state = 'occupied';
          occupantName = (occupiedSeats[id].nickname && occupiedSeats[id].nickname.trim()) || 'Khán giả';
          avatarColor = occupiedSeats[id].shirtColor || '#bfdbfe';
        }

        list.push({
          id,
          row: rowIndex,
          col: colIndex,
          type,
          position: [x, ROW_Y_POSITIONS[rowIndex], ROW_Z_POSITIONS[rowIndex]],
          state,
          occupiedBy: occupantName || undefined,
          avatarColor,
        });
      });
    });
    return list;
  }, [selectedSeatId, occupiedSeats, currentUserNickname, currentUserShirtColor]);

  // Tạo vật liệu logo thương hiệu CGV sắc nét (vẽ Canvas khởi tạo tức thì + nạp cgv-logo.png chuẩn thương hiệu)
  const cgvLogoMat = useMemo(() => {
    if (typeof document === 'undefined') {
      return new THREE.MeshBasicMaterial();
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const drawFallback = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, 512, 256);
      ctx.fillStyle = '#ed3124';
      ctx.font = '900 130px "Arial Black", "Impact", "Montserrat", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('CGV', 50, 138);

      const cx = 415;
      const cy = 70;
      const petals = 6;
      for (let i = 0; i < petals; i++) {
        const angle = (i * Math.PI * 2) / petals;
        const px = cx + Math.cos(angle) * 26;
        const py = cy + Math.sin(angle) * 26;
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? '#f26f21' : '#ed3124';
        ctx.fill();
      }
    };

    drawFallback();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 8;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/cgv-logo.png';
    img.onload = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, 512, 256);
      const aspect = img.width / img.height;
      const targetH = 210;
      const targetW = targetH * aspect;
      const offsetX = (512 - targetW) / 2;
      const offsetY = (256 - targetH) / 2;
      ctx.drawImage(img, offsetX, offsetY, targetW, targetH);
      texture.needsUpdate = true;
    };

    return new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.12,
      roughness: 0.45,
      metalness: 0.1,
      emissive: isDimmed ? '#000000' : '#ed3124',
      emissiveMap: isDimmed ? null : texture,
      emissiveIntensity: isDimmed ? 0 : 0.08,
      side: THREE.FrontSide,
    });
  }, [isDimmed]);

  return (
    <group name="wetube-seat-grid">
      {seats.map((seat) => {
        const isSelected = seat.id === selectedSeatId;

        // Check if there is an active chat bubble for this seat occupant
        const seatBubble = activeBubbles
          .filter((b) => b.seatId === seat.id || (isSelected && b.socketId === currentSocketId))
          .slice(-1)[0];

        return (
          <group
            key={seat.id}
            position={seat.position}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSeat(seat);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
            }}
          >
            {/* 1. Ghế rạp chiếu cinema hiện đại rộng rãi, sắc nét, khoảng cách thoáng đãng */}
            <group position={[0, 0, 0]}>
              {/* Chân ghế */}
              <mesh geometry={seatBoxGeo} material={seatLegMat} position={[0, 0.16, 0.02]} scale={[0.14, 0.32, 0.14]} />
              {/* Đệm ngồi êm ái rộng rãi */}
              <mesh
                geometry={seatBoxGeo}
                material={isSelected ? seatSelectedMat : seatMat}
                position={[0, 0.38, 0]}
                scale={[1.08, 0.16, 0.78]}
              />
              {/* Lưng tựa trước (rộng rãi, tạo dáng ghế rạp phim cao cấp) */}
              <mesh
                geometry={seatBoxGeo}
                material={isSelected ? seatSelectedMat : seatMat}
                position={[0, 0.72, 0.33]}
                rotation={[0.07, 0, 0]}
                scale={[1.08, 0.62, 0.14]}
              />
              {/* Ốp lưng sau ghế */}
              <mesh
                geometry={seatBoxGeo}
                material={seatBackShellMat}
                position={[0, 0.72, 0.405]}
                scale={[1.06, 0.60, 0.02]}
              />
              {/* Logo thương hiệu CGV sắc nét sau lưng mỗi ghế */}
              <mesh
                geometry={cgvLogoGeo}
                material={cgvLogoMat}
                position={[0, 0.86, 0.420]}
              />
              {/* Tay vịn hai bên rộng rãi */}
              <mesh geometry={seatBoxGeo} material={seatLegMat} position={[-0.56, 0.54, 0.02]} scale={[0.08, 0.08, 0.58]} />
              <mesh geometry={seatBoxGeo} material={seatLegMat} position={[0.56, 0.54, 0.02]} scale={[0.08, 0.08, 0.58]} />
            </group>

            {/* 2. Avatar người xem ngồi trên ghế */}
            {(seat.state === 'occupied' || isSelected) && seat.occupiedBy && (
              <WeTubeAvatar
                nickname={seat.occupiedBy}
                shirtColor={seat.avatarColor || '#a7f3d0'}
                position={[0, 0.43, 0]}
                isCurrentUser={isSelected}
                seatId={seat.id}
                activeBubble={seatBubble}
                isAdmin={isSelected ? currentUserIsAdmin : occupiedSeats[seat.id]?.isAdmin}
                isMicOn={isSelected ? currentUserIsMicOn : occupiedSeats[seat.id]?.isMicOn}
                isSpeaking={isSelected ? currentUserIsSpeaking : occupiedSeats[seat.id]?.isSpeaking}
                isMicMuted={isSelected ? currentUserIsMicMuted : occupiedSeats[seat.id]?.isMicMuted}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}
