'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface AudienceCeilingDownlightsProps {
  isDimmed?: boolean;
}

// 12 Đèn downlight âm trần phân bố đều trên trần rạp chiếu thẳng xuống các hàng ghế
const DOWNLIGHT_X = [-5.5, 0.0, 5.5];
const DOWNLIGHT_Z = [0.5, 4.8, 9.2, 13.5];

/**
 * Hệ thống đèn trần chiếu rọi từ trên cao xuống các hàng ghế ngồi (Audience Ceiling Downlights).
 * Khi bật đèn: Các cụm đèn trần chiếu rọi thẳng từ trên trần xuống các dãy ghế, tạo vệt sáng ấm áp rõ ràng.
 * Khi tắt đèn: Đèn trần tắt hoàn toàn để phòng tối chuyên tâm xem phim.
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
      {fixtures.map((f) => (
        <group key={f.id} position={[f.x, CEILING_Y, f.z]}>
          {/* 1. Chao đèn kim loại đen âm trần */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.38, 0.42, 0.1, 18]} />
            <meshStandardMaterial color="#0b0f17" roughness={0.5} metalness={0.7} />
          </mesh>

          {/* 2. Mặt kính bóng đèn tròn toả sáng */}
          <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.3, 18]} />
            <meshBasicMaterial
              color={isDimmed ? '#332717' : '#fff7e6'}
              toneMapped={false}
            />
          </mesh>

          {/* 3. Đèn rọi Three.js chiếu thẳng đứng từ trần xuống ghế bên dưới */}
          {!isDimmed && (
            <>
              {/* Điểm phát sáng nhẹ tại miệng đèn */}
              <pointLight
                position={[0, -0.2, 0]}
                color="#ffe8cc"
                intensity={8}
                distance={6}
                decay={2}
              />

              {/* Nón spotlight chiếu rọi thẳng xuống sàn và ghế */}
              <spotLight
                position={[0, -0.1, 0]}
                target-position={[0, -18, 0]}
                color="#ffe6c4"
                intensity={32}
                angle={Math.PI / 5.2}
                penumbra={0.75}
                distance={23}
                decay={1.6}
              />

              {/* Luồng sáng nón hình học mờ nhẹ thể hiện ánh đèn rọi từ trần xuống ghế */}
              <mesh position={[0, -8.6, 0]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.28, 2.8, 17.2, 16, 1, true]} />
                <meshBasicMaterial
                  color="#ffecc9"
                  transparent
                  opacity={0.035}
                  blending={THREE.AdditiveBlending}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

