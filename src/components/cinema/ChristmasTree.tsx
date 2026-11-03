'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ChristmasTreeProps {
  position: [number, number, number];
  scale?: number;
}

export function ChristmasTree({ position, scale = 1 }: ChristmasTreeProps) {
  const starRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (starRef.current) {
      starRef.current.rotation.y = t * 0.8;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 18 + Math.sin(t * 3) * 6;
    }
  });

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* 1. Thân cây gỗ thông */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 1.2, 12]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} />
      </mesh>

      {/* 2. Tầng tán lá thông 1 (dưới cùng, to nhất) */}
      <group position={[0, 1.6, 0]}>
        <mesh>
          <coneGeometry args={[2.4, 2.0, 14]} />
          <meshStandardMaterial color="#0f3d23" roughness={0.7} />
        </mesh>
        {/* Viền tuyết phủ rìa lá */}
        <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.45, 16]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
        </mesh>
      </group>

      {/* Tầng tán lá thông 2 */}
      <group position={[0, 2.7, 0]}>
        <mesh>
          <coneGeometry args={[1.9, 1.8, 14]} />
          <meshStandardMaterial color="#14532d" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.55, 1.95, 16]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
        </mesh>
      </group>

      {/* Tầng tán lá thông 3 */}
      <group position={[0, 3.7, 0]}>
        <mesh>
          <coneGeometry args={[1.4, 1.6, 14]} />
          <meshStandardMaterial color="#166534" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.15, 1.45, 16]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
        </mesh>
      </group>

      {/* Tầng tán lá thông 4 (ngọn) */}
      <group position={[0, 4.6, 0]}>
        <mesh>
          <coneGeometry args={[0.9, 1.4, 14]} />
          <meshStandardMaterial color="#15803d" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.95, 16]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
        </mesh>
      </group>

      {/* 3. Ngôi sao Giáng sinh vàng rực trên đỉnh cây */}
      <group ref={starRef} position={[0, 5.5, 0]}>
        <mesh rotation={[0, 0, 0]}>
          <octahedronGeometry args={[0.38, 0]} />
          <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={1.2} roughness={0.2} metalness={0.8} />
        </mesh>
        <mesh rotation={[0, Math.PI / 4, Math.PI / 4]}>
          <octahedronGeometry args={[0.26, 0]} />
          <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={1.5} roughness={0.1} />
        </mesh>
        <pointLight ref={lightRef} color="#fef08a" intensity={20} distance={12} decay={2} />
      </group>

      {/* 4. Quả châu Noel trang trí (Baubles: đỏ ruby, vàng kim, xanh tuyết, tím) */}
      {[
        // Tầng 1
        { pos: [1.6, 1.0, 0.9], color: '#ef4444' },
        { pos: [-1.4, 1.1, 1.1], color: '#f59e0b' },
        { pos: [0.3, 0.9, 1.8], color: '#06b6d4' },
        { pos: [-1.7, 1.0, -0.6], color: '#ec4899' },
        { pos: [1.3, 1.1, -1.3], color: '#a855f7' },
        { pos: [-0.4, 1.0, -1.8], color: '#ef4444' },
        // Tầng 2
        { pos: [1.2, 2.2, 0.8], color: '#f59e0b' },
        { pos: [-1.1, 2.1, 0.9], color: '#ef4444' },
        { pos: [0.0, 2.2, 1.4], color: '#ec4899' },
        { pos: [-1.2, 2.3, -0.7], color: '#06b6d4' },
        { pos: [1.0, 2.1, -1.0], color: '#eab308' },
        // Tầng 3
        { pos: [0.8, 3.3, 0.6], color: '#ef4444' },
        { pos: [-0.7, 3.2, 0.7], color: '#06b6d4' },
        { pos: [0.2, 3.4, 0.9], color: '#f59e0b' },
        { pos: [-0.6, 3.3, -0.7], color: '#a855f7' },
        // Tầng 4
        { pos: [0.4, 4.3, 0.4], color: '#ef4444' },
        { pos: [-0.4, 4.2, 0.4], color: '#f59e0b' },
        { pos: [0.0, 4.4, -0.5], color: '#06b6d4' },
      ].map((b, i) => (
        <group key={`bauble-${i}`} position={b.pos as [number, number, number]}>
          <mesh>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshStandardMaterial
              color={b.color}
              emissive={b.color}
              emissiveIntensity={0.65}
              metalness={0.9}
              roughness={0.15}
            />
          </mesh>
        </group>
      ))}

      {/* 5. Hộp quà Giáng sinh (Presents / Gift boxes) đặt quanh gốc cây */}
      <group position={[0, 0, 0]}>
        {/* Hộp quà đỏ nơ vàng */}
        <group position={[0.9, 0.3, 0.8]} rotation={[0, 0.35, 0]}>
          <mesh>
            <boxGeometry args={[0.65, 0.6, 0.65]} />
            <meshStandardMaterial color="#dc2626" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.67, 0.62, 0.14]} />
            <meshStandardMaterial color="#facc15" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.14, 0.62, 0.67]} />
            <meshStandardMaterial color="#facc15" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>

        {/* Hộp quà xanh lục nơ đỏ */}
        <group position={[-0.8, 0.25, 0.9]} rotation={[0, -0.4, 0]}>
          <mesh>
            <boxGeometry args={[0.55, 0.5, 0.55]} />
            <meshStandardMaterial color="#15803d" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.57, 0.52, 0.12]} />
            <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.12, 0.52, 0.57]} />
            <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.3} />
          </mesh>
        </group>

        {/* Hộp quà vàng nơ xanh lam */}
        <group position={[0.2, 0.22, 1.2]} rotation={[0, 0.2, 0]}>
          <mesh>
            <boxGeometry args={[0.45, 0.44, 0.45]} />
            <meshStandardMaterial color="#eab308" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.47, 0.46, 0.1]} />
            <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.1, 0.46, 0.47]} />
            <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

