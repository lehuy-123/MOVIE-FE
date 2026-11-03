'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ROOM, ROOM_DEPTH } from '@/lib/roomLayout';

interface ChristmasSnowProps {
  count?: number;
}

export function ChristmasSnow({ count = 650 }: ChristmasSnowProps) {
  const pointsRef = useRef<THREE.Points>(null);

  // Khởi tạo các bông tuyết ngẫu nhiên phân bố trong toàn bộ không gian rạp chiếu
  const [positions, speeds, offsets] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const off = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * (ROOM.width - 1);
      pos[i * 3 + 1] = Math.random() * (ROOM.height - 1) + 0.5;
      pos[i * 3 + 2] = ROOM.zFront + 1 + Math.random() * (ROOM_DEPTH - 2);

      spd[i] = 0.9 + Math.random() * 1.6; // Tốc độ rơi êm dịu, nhẹ nhàng
      off[i] = Math.random() * Math.PI * 2; // Góc dao động lượn sóng
    }
    return [pos, spd, off];
  }, [count]);

  useFrame(({ clock }, delta) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    const time = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Tuyết rơi từ từ từ trên cao xuống
      posArray[idx + 1] -= speeds[i] * delta * 1.4;

      // Hiệu ứng gió nhẹ thổi bồng bềnh
      posArray[idx] += Math.sin(time * 0.9 + offsets[i]) * 0.012;
      posArray[idx + 2] += Math.cos(time * 0.7 + offsets[i]) * 0.008;

      // Khi bông tuyết chạm sàn, đưa trở lại trần rạp
      if (posArray[idx + 1] < 0.2) {
        posArray[idx + 1] = ROOM.height - 0.3;
        posArray[idx] = (Math.random() - 0.5) * (ROOM.width - 1);
        posArray[idx + 2] = ROOM.zFront + 1 + Math.random() * (ROOM_DEPTH - 2);
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.17}
        sizeAttenuation
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

