'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ROOM } from '@/lib/roomLayout';

interface ChristmasSnowProps {
  count?: number;
}

/** Tạo texture bông tuyết tròn mờ mềm mại (không bị góc cạnh hình vuông thô). */
function useSoftSnowTexture(): THREE.CanvasTexture | null {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.55)');
    grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);
}

export function ChristmasSnow({ count = 65 }: ChristmasSnowProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const snowTex = useSoftSnowTexture();

  // Khởi tạo số lượng ít (65 hạt), phân bố cách xa ống kính máy quay để tránh rối mắt
  const [positions, speeds, offsets] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const off = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Phân bố trong rạp nhưng tránh quá sát camera (Z từ -8 đến +15, camera ở Z=26)
      pos[i * 3] = (Math.random() - 0.5) * (ROOM.width - 4);
      pos[i * 3 + 1] = 2.0 + Math.random() * (ROOM.height - 4);
      pos[i * 3 + 2] = -8 + Math.random() * 22;

      spd[i] = 0.4 + Math.random() * 0.6; // Rơi rất chậm và dịu
      off[i] = Math.random() * Math.PI * 2;
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
      // Rơi nhẹ nhàng
      posArray[idx + 1] -= speeds[i] * delta * 1.2;

      // Đung đưa rất khẽ
      posArray[idx] += Math.sin(time * 0.6 + offsets[i]) * 0.005;

      // Khi chạm tầm thấp thì đưa lên trần nhẹ nhàng
      if (posArray[idx + 1] < 1.0) {
        posArray[idx + 1] = ROOM.height - 1.5;
        posArray[idx] = (Math.random() - 0.5) * (ROOM.width - 4);
        posArray[idx + 2] = -8 + Math.random() * 22;
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
        map={snowTex || undefined}
        color="#ffffff"
        size={0.08}
        sizeAttenuation
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
