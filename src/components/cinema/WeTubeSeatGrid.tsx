'use client';

import React, { useMemo } from 'react';
import { SafeHtml } from './SafeHtml';
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
  SEAT_KIND_LABEL,
} from '@/lib/seatLayout';

export { ROWS, COL_X_POSITIONS, ROW_Z_POSITIONS, ROW_Y_POSITIONS };

// Hình học & vật liệu ghế dùng chung cho cả 100 ghế
const seatBoxGeo = new THREE.BoxGeometry(1, 1, 1);
const seatMat = new THREE.MeshStandardMaterial({ color: '#2b3442', roughness: 0.65 });
const seatSelectedMat = new THREE.MeshStandardMaterial({
  color: '#c8e658',
  emissive: '#c8e658',
  emissiveIntensity: 0.3,
  roughness: 0.6,
});
const seatLegMat = new THREE.MeshStandardMaterial({ color: '#0d1117', roughness: 0.5 });


interface WeTubeSeatGridProps {
  selectedSeatId: string | null;
  onSelectSeat: (seat: SeatData) => void;
  occupiedSeats: Record<string, { nickname: string; shirtColor: string }>;
  currentUserNickname?: string;
  currentUserShirtColor?: string;
  activeBubbles?: ChatMessage[];
  currentSocketId?: string | null;
}

// Layout constants (10 rows x 10 cols, 3 blocks with aisles) live in '@/lib/seatLayout'.

export function WeTubeSeatGrid({
  selectedSeatId,
  onSelectSeat,
  occupiedSeats,
  currentUserNickname = 'Bạn',
  currentUserShirtColor = '#86efac',
  activeBubbles = [],
  currentSocketId,
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
        let avatarColor = '#86efac';

        if (id === selectedSeatId) {
          state = 'selected';
          occupantName = (currentUserNickname && currentUserNickname.trim()) || 'Bạn';
          avatarColor = currentUserShirtColor || '#86efac';
        } else if (occupiedSeats[id]) {
          state = 'occupied';
          occupantName = (occupiedSeats[id].nickname && occupiedSeats[id].nickname.trim()) || 'Khán giả';
          avatarColor = occupiedSeats[id].shirtColor || '#93c5fd';
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

  return (
    <group name="wetube-seat-grid">
      {seats.map((seat) => {
        const isSelected = seat.id === selectedSeatId;
        const isVip = seat.type === 'vip';

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
            {/* 1. Ghế rạp chiếu WeTube Ciné */}
            {isVip ? (
              // Ghế Ngai Vàng VIP (Golden Throne)
              <group position={[0, 0, 0]}>
                <mesh position={[0, 0.45, 0]} castShadow>
                  <boxGeometry args={[1.05, 0.2, 0.8]} />
                  <meshStandardMaterial color="#881337" roughness={0.3} />
                </mesh>
                {/* Khung viền vàng ngai vàng */}
                <mesh position={[0, 0.95, 0.38]} castShadow>
                  <boxGeometry args={[1.1, 0.9, 0.16]} />
                  <meshStandardMaterial color="#881337" roughness={0.4} />
                </mesh>
                <mesh position={[0, 1.45, 0.4]}>
                  <torusGeometry args={[0.35, 0.06, 8, 24]} />
                  <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.2} />
                </mesh>
              </group>
            ) : (
              // Ghế cinema hiện đại
              <group position={[0, 0, 0]}>
                {/* Chân ghế */}
                <mesh geometry={seatBoxGeo} material={seatLegMat} position={[0, 0.16, 0.02]} scale={[0.12, 0.32, 0.12]} />
                {/* Đệm ngồi */}
                <mesh
                  geometry={seatBoxGeo}
                  material={isSelected ? seatSelectedMat : seatMat}
                  position={[0, 0.36, 0]}
                  scale={[0.82, 0.14, 0.68]}
                />
                {/* Lưng tựa (thấp để lộ vai áo và tên in trên lưng nhân vật) */}
                <mesh
                  geometry={seatBoxGeo}
                  material={isSelected ? seatSelectedMat : seatMat}
                  position={[0, 0.63, 0.31]}
                  rotation={[0.1, 0, 0]}
                  scale={[0.82, 0.5, 0.12]}
                />
                {/* Tay vịn hai bên */}
                <mesh geometry={seatBoxGeo} material={seatLegMat} position={[-0.43, 0.5, 0.02]} scale={[0.05, 0.05, 0.5]} />
                <mesh geometry={seatBoxGeo} material={seatLegMat} position={[0.43, 0.5, 0.02]} scale={[0.05, 0.05, 0.5]} />
              </group>
            )}

            {/* 2. Avatar người xem ngồi trên ghế */}
            {(seat.state === 'occupied' || isSelected) && seat.occupiedBy && (
              <WeTubeAvatar
                nickname={seat.occupiedBy}
                shirtColor={seat.avatarColor || '#b9cf8f'}
                position={[0, isVip ? 0.55 : 0.43, 0]}
                isCurrentUser={isSelected}
                activeBubble={seatBubble}
              />
            )}

            {/* 3. Floating Tooltip cho ghế của bạn / đã chọn (Màu trắng ngà Screenshot 5) */}
            {isSelected && !seatBubble && (
              <SafeHtml
                position={[0, 1.85, 0.1]}
                center
                distanceFactor={15}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                <div className="flex flex-col items-center select-none">
                  <div className="bg-[#edf1ed] text-[#0f172a] font-extrabold text-xs px-3.5 py-1.5 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.55)] border border-white/90 whitespace-nowrap flex items-center gap-1.5">
                    <span>Đã chọn {seat.id}</span>
                    <span className="opacity-75 font-semibold text-[11px]">· {SEAT_KIND_LABEL[seat.type ?? 'single']}</span>
                  </div>
                  <div
                    className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] -mt-[1px]"
                    style={{ borderTopColor: '#edf1ed' }}
                  />
                </div>
              </SafeHtml>
            )}
          </group>
        );
      })}
    </group>
  );
}
