'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GoldenCrownProps {
  position?: [number, number, number];
  scale?: number;
}

const crownGoldMat = new THREE.MeshStandardMaterial({
  color: '#fbbf24',
  metalness: 0.95,
  roughness: 0.2,
  emissive: '#d97706',
  emissiveIntensity: 0.55,
});

const jewelMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  metalness: 0.9,
  roughness: 0.1,
  emissive: '#fef08a',
  emissiveIntensity: 0.8,
});

/**
 * Vương miện hoàng gia 3D phát sáng lơ lửng trên ghế VIP và bục vinh danh
 * Chuẩn xác theo hình ảnh tham khảo rạp WeTube Ciné (Screenshot 2).
 */
export function GoldenCrown({ position = [0, 0, 0], scale = 1 }: GoldenCrownProps) {
  const groupRef = useRef<THREE.Group>(null);
  const baseX = position[0];
  const baseY = position[1];
  const baseZ = position[2];

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    // Chuyển động lơ lửng bồng bềnh khẽ nhấp nhô quanh tọa độ gốc
    groupRef.current.position.set(
      baseX,
      baseY + Math.sin(t * 2.2) * 0.025,
      baseZ
    );
    groupRef.current.rotation.y = t * 0.5;
  });

  // 5 đỉnh vương miện hoàng kim
  const SPIKES = [0, 1, 2, 3, 4];
  const radius = 0.18;

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Vành đế vương miện hình tròn */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={crownGoldMat}>
        <torusGeometry args={[radius, 0.032, 12, 28]} />
      </mesh>

      {/* 5 đỉnh nhọn vươn lên */}
      {SPIKES.map((i) => {
        const angle = (i * Math.PI * 2) / 5;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;
        const isFront = i === 0;
        const h = isFront ? 0.22 : 0.16;

        return (
          <group key={`spike-${i}`} position={[x, 0.06, z]}>
            <mesh position={[0, h / 2, 0]} material={crownGoldMat}>
              <coneGeometry args={[0.036, h, 6]} />
            </mesh>
            {/* Viên ngọc đính trên đỉnh nhọn */}
            <mesh position={[0, h + 0.015, 0]} material={jewelMat}>
              <sphereGeometry args={[0.026, 8, 8]} />
            </mesh>
          </group>
        );
      })}

      {/* Ánh sáng vàng hoàng gia toả ra xung quanh */}
      <pointLight color="#f59e0b" intensity={2.2} distance={3.0} decay={2} />
    </group>
  );
}
