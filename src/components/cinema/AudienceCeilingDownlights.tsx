'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface AudienceCeilingDownlightsProps {
  isDimmed?: boolean;
}

// 12 Đèn downlight âm trần phân bố đều trên trần rạp chiếu thẳng xuống các hàng ghế
const DOWNLIGHT_X = [-6.5, 0.0, 6.5];
const DOWNLIGHT_Z = [10.0, 15.0, 20.0, 25.0];

/**
 * Hệ thống đèn trần chiếu rọi từ trên cao xuống các hàng ghế ngồi (Audience Ceiling Downlights).
 * Khi bật đèn: Các cụm đèn trần chiếu rọi thẳng từ trên trần xuống các dãy ghế, tạo vệt sáng ấm áp rõ ràng.
 * Khi tắt đèn: Giữ ánh sáng vàng ấm dịu an toàn (dimmed safety downlights) giúp khán phòng sáng rõ, ấm cúng.
 */
export function AudienceCeilingDownlights({ isDimmed = true }: AudienceCeilingDownlightsProps) {
  const CEILING_Y = 18.8; // Độ cao trần rạp

  // Danh sách 12 vị trí đèn trần
  const fixtures = useMemo(() => {
    const list: { id: string; x: number; z: number }[] = [];
    DOWNLIGHT_Z.forEach((z, r) => {
      DOWNLIGHT_X.forEach((x, c) => {
        list.push({ id: `dl-${r}-${c}`, x, z });
      });
    });
    return list;
  }, []);

  return (
    <group name="audience-ceiling-downlights">
      {/* 12 Đèn âm trần trang trí (Chao kim loại + mặt kính phát sáng) - Tối ưu 60 FPS */}
      {fixtures.map((f) => (
        <group key={f.id} position={[f.x, CEILING_Y, f.z]}>
          {/* 1. Chao đèn kim loại đen âm trần */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.38, 0.42, 0.1, 14]} />
            <meshStandardMaterial color="#0b0f17" roughness={0.5} metalness={0.7} />
          </mesh>

          {/* 2. Mặt kính bóng đèn tròn toả sáng */}
          <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.3, 14]} />
            <meshBasicMaterial
              color={isDimmed ? '#451a03' : '#fff7e6'}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* 2 Nguồn sáng rọi trần gộp chung (Tối ưu GPU cực cao, thay thế 12 đèn riêng lẻ) */}
      <pointLight
        position={[0, CEILING_Y - 1.0, 13.5]}
        color="#fef3c7"
        intensity={isDimmed ? 1.5 : 32}
        distance={28}
        decay={1.6}
      />
      <pointLight
        position={[0, CEILING_Y - 1.0, 22.0]}
        color="#fef3c7"
        intensity={isDimmed ? 1.5 : 32}
        distance={28}
        decay={1.6}
      />
    </group>
  );
}

