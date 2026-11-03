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

// Nhãn số/mác xám nhỏ trên lưng ghế sáng rõ
const seatTagMat = new THREE.MeshStandardMaterial({
  color: '#94a3b8',
  roughness: 0.3,
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
                  <boxGeometry args={[1.22, 0.22, 0.84]} />
                </mesh>
                {/* Lưng tựa nhung đỏ */}
                <mesh position={[0, 1.02, 0.38]} material={vipRedMat} castShadow>
                  <boxGeometry args={[1.24, 0.94, 0.18]} />
                </mesh>
                {/* Tay vịn mạ vàng hoàng gia */}
                {[-0.64, 0.64].map((x) => (
                  <mesh key={x} position={[x, 0.68, 0.02]} material={vipGoldMat} castShadow>
                    <boxGeometry args={[0.12, 0.34, 0.76]} />
                  </mesh>
                ))}
                {/* Vòm cung mạ vàng đỉnh tựa lưng (Screenshot 2) */}
                <mesh position={[0, 1.48, 0.38]} rotation={[0, 0, 0]}>
                  <torusGeometry args={[0.42, 0.046, 8, 24, Math.PI]} />
                  <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Vương miện vàng hoàng gia lơ lửng ngay phía trên đỉnh ngai vàng VIP (Screenshot 2) */}
                <GoldenCrown position={[0, 1.68, 0.38]} scale={1.12} />
              </group>
            ) : (
              // Ghế cinema hiện đại rộng rãi, sắc nét, khoảng cách thoáng đãng
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
                {/* Mác/nhãn số ghế màu xám trên lưng ghế */}
                <mesh
                  geometry={seatBoxGeo}
                  material={seatTagMat}
                  position={[0, 0.88, 0.418]}
                  scale={[0.34, 0.09, 0.01]}
                />
                {/* Tay vịn hai bên rộng rãi */}
                <mesh geometry={seatBoxGeo} material={seatLegMat} position={[-0.56, 0.54, 0.02]} scale={[0.08, 0.08, 0.58]} />
                <mesh geometry={seatBoxGeo} material={seatLegMat} position={[0.56, 0.54, 0.02]} scale={[0.08, 0.08, 0.58]} />
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
