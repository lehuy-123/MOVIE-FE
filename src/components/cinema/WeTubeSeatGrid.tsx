'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SeatData } from '@/types/cinema';
import { WeTubeAvatar } from './WeTubeAvatar';
import { GoldenCrown } from './GoldenCrown';
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
  color: '#3a4657', // Màu xám xanh slate hiện đại, ăn sáng tốt
  roughness: 0.45,
  metalness: 0.15,
});

// Mặt lưng ốp sau ghế
const seatBackShellMat = new THREE.MeshStandardMaterial({
  color: '#26303d',
  roughness: 0.65,
});

// Nhãn số/mác xám nhỏ trên lưng ghế (Screenshot 2)
const seatTagMat = new THREE.MeshStandardMaterial({
  color: '#5b6b80',
  roughness: 0.5,
});

const seatSelectedMat = new THREE.MeshStandardMaterial({
  color: '#d9f95f',
  emissive: '#d9f95f',
  emissiveIntensity: 0.45,
  roughness: 0.35,
});

const seatLegMat = new THREE.MeshStandardMaterial({ color: '#161c24', roughness: 0.5 });

// Ghế VIP Ngai Vàng Hoàng Gia: Đỏ nhung tươi sang trọng & viền mạ vàng
const vipRedMat = new THREE.MeshStandardMaterial({
  color: '#991b1b', // Đỏ nhung tươi sang trọng, không bị chìm tối
  roughness: 0.35,
  metalness: 0.1,
});

const vipGoldMat = new THREE.MeshStandardMaterial({
  color: '#f59e0b',
  metalness: 0.9,
  roughness: 0.2,
  emissive: '#d97706',
  emissiveIntensity: 0.25,
});

interface WeTubeSeatGridProps {
  selectedSeatId: string | null;
  onSelectSeat: (seat: SeatData) => void;
  occupiedSeats: Record<string, { nickname: string; shirtColor: string }>;
  currentUserNickname?: string;
  currentUserShirtColor?: string;
  activeBubbles?: ChatMessage[];
  currentSocketId?: string | null;
}

export function WeTubeSeatGrid({
  selectedSeatId,
  onSelectSeat,
  occupiedSeats,
  currentUserNickname = 'Bạn',
  currentUserShirtColor = '#a7f3d0',
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
              // Ghế Ngai Vàng VIP (Golden Throne) màu đỏ nhung viền vàng + Vương miện phát sáng lơ lửng ngay trên tựa đầu (Screenshot 2)
              <group position={[0, 0, 0]}>
                {/* Đệm ngồi nhung đỏ */}
                <mesh position={[0, 0.45, 0]} material={vipRedMat} castShadow>
                  <boxGeometry args={[1.04, 0.2, 0.8]} />
                </mesh>
                {/* Lưng tựa nhung đỏ */}
                <mesh position={[0, 0.95, 0.36]} material={vipRedMat} castShadow>
                  <boxGeometry args={[1.08, 0.88, 0.16]} />
                </mesh>
                {/* Tay vịn mạ vàng hoàng gia */}
                {[-0.54, 0.54].map((x) => (
                  <mesh key={x} position={[x, 0.65, 0.02]} material={vipGoldMat} castShadow>
                    <boxGeometry args={[0.1, 0.32, 0.72]} />
                  </mesh>
                ))}
                {/* Vòm cung mạ vàng đỉnh tựa lưng (Screenshot 2) */}
                <mesh position={[0, 1.38, 0.36]} rotation={[0, 0, 0]}>
                  <torusGeometry args={[0.36, 0.042, 8, 24, Math.PI]} />
                  <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Vương miện vàng hoàng gia lơ lửng ngay phía trên đỉnh ngai vàng VIP (Screenshot 2) */}
                <GoldenCrown position={[0, 1.56, 0.36]} scale={1.05} />
              </group>
            ) : (
              // Ghế cinema hiện đại tông xám sáng sủa, rõ nét từng khối (Screenshot 2)
              <group position={[0, 0, 0]}>
                {/* Chân ghế */}
                <mesh geometry={seatBoxGeo} material={seatLegMat} position={[0, 0.16, 0.02]} scale={[0.12, 0.32, 0.12]} />
                {/* Đệm ngồi êm ái */}
                <mesh
                  geometry={seatBoxGeo}
                  material={isSelected ? seatSelectedMat : seatMat}
                  position={[0, 0.36, 0]}
                  scale={[0.84, 0.14, 0.7]}
                />
                {/* Lưng tựa trước (thấp để lộ vai áo và tên in trên lưng nhân vật) */}
                <mesh
                  geometry={seatBoxGeo}
                  material={isSelected ? seatSelectedMat : seatMat}
                  position={[0, 0.64, 0.31]}
                  rotation={[0.08, 0, 0]}
                  scale={[0.84, 0.52, 0.12]}
                />
                {/* Ốp lưng sau ghế */}
                <mesh
                  geometry={seatBoxGeo}
                  material={seatBackShellMat}
                  position={[0, 0.64, 0.375]}
                  scale={[0.82, 0.5, 0.02]}
                />
                {/* Mác/nhãn số ghế màu xám trên lưng ghế (rất rõ nét trong Screenshot 2) */}
                <mesh
                  geometry={seatBoxGeo}
                  material={seatTagMat}
                  position={[0, 0.78, 0.388]}
                  scale={[0.26, 0.08, 0.01]}
                />
                {/* Tay vịn hai bên */}
                <mesh geometry={seatBoxGeo} material={seatLegMat} position={[-0.43, 0.5, 0.02]} scale={[0.06, 0.06, 0.52]} />
                <mesh geometry={seatBoxGeo} material={seatLegMat} position={[0.43, 0.5, 0.02]} scale={[0.06, 0.06, 0.52]} />
              </group>
            )}

            {/* 2. Avatar người xem ngồi trên ghế */}
            {(seat.state === 'occupied' || isSelected) && seat.occupiedBy && (
              <WeTubeAvatar
                nickname={seat.occupiedBy}
                shirtColor={seat.avatarColor || '#a7f3d0'}
                position={[0, isVip ? 0.55 : 0.43, 0]}
                isCurrentUser={isSelected}
                seatId={seat.id}
                activeBubble={seatBubble}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}
