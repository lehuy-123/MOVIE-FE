'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WeTubeAvatar } from './WeTubeAvatar';
import { ChristmasTree } from './ChristmasTree';

interface WeTubeStageProps {
  screenZ?: number;
}

const SPEAKER_X = 15.6;
const WOOFER_Y = [-2.8, 0, 2.8];

/** Loa cột đứng cao ~9.6m, 3 màng loa trầm, xoay nhẹ về phía khán giả theo `side`. */
function SpeakerTower({ x, z, side }: { x: number; z: number; side: -1 | 1 }) {
  return (
    <group position={[x, 5.7, z]} rotation={[0, side * -0.12, 0]}>
      <mesh>
        <boxGeometry args={[2.4, 9.6, 2.6]} />
        <meshStandardMaterial color="#090b0f" roughness={0.45} metalness={0.55} />
      </mesh>
      {/* Viền loa */}
      <mesh position={[0, 0, 1.31]}>
        <boxGeometry args={[2.1, 9.2, 0.03]} />
        <meshStandardMaterial color="#12161d" roughness={0.6} />
      </mesh>
      {WOOFER_Y.map((y, i) => (
        <group key={`woofer-${i}`} position={[0, y, 1.33]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.76, 0.76, 0.05, 28]} />
            <meshStandardMaterial color="#1b2230" roughness={0.35} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.28, 0.28, 0.05, 18]} />
            <meshStandardMaterial color="#3b4658" roughness={0.25} metalness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function WeTubeStage({ screenZ = -10.4 }: WeTubeStageProps) {
  const discoBallRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (discoBallRef.current) {
      discoBallRef.current.rotation.y += delta * 0.4;
    }
  });

  const stageDepth = 5.2;
  const stageCenterZ = screenZ + stageDepth / 2;
  const stageFrontZ = screenZ + stageDepth;

  return (
    <group>
      {/* 1. Sân khấu chính */}
      <mesh position={[0, 0.45, stageCenterZ]}>
        <boxGeometry args={[31, 0.9, stageDepth]} />
        <meshStandardMaterial color="#0c1016" roughness={0.6} metalness={0.25} />
      </mesh>
      {/* Viền LED chân sân khấu */}
      <mesh position={[0, 0.88, stageFrontZ + 0.01]}>
        <boxGeometry args={[30.8, 0.05, 0.05]} />
        <meshBasicMaterial color="#e4f08a" toneMapped={false} />
      </mesh>

      {/* 2. Hai loa cột lớn hai bên mép màn hình */}
      <SpeakerTower x={-SPEAKER_X} z={screenZ + 1.6} side={-1} />
      <SpeakerTower x={SPEAKER_X} z={screenZ + 1.6} side={1} />

      {/* Cây thông Noel Giáng sinh hai bên cánh sân khấu (nằm hoàn toàn ngoài khung màn chiếu) */}
      <ChristmasTree position={[-15.2, 0.9, screenZ + 2.2]} scale={0.72} />
      <ChristmasTree position={[15.2, 0.9, screenZ + 2.2]} scale={0.72} />

      {/* 3. Quả cầu gương */}
      <group ref={discoBallRef} position={[0, 15.2, screenZ + 4.4]}>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 2.4, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.9} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.75, 20, 20]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} emissive="#4b5563" emissiveIntensity={0.6} />
        </mesh>
        <pointLight color="#fdf4ff" intensity={14} distance={14} decay={2} />
      </group>

      {/* 4. 3 bục biểu diễn có vòng neon hồng, nhân vật quay mặt về khán giả */}
      {[
        { x: -3.8, z: screenZ + 2.9, name: 'DJ Alex', color: '#9fb4e0' },
        { x: 0, z: screenZ + 3.3, name: 'MC Linh', color: '#b9cf8f' },
        { x: 3.8, z: screenZ + 2.9, name: 'Dancer Ken', color: '#e0a08a' },
      ].map((podium, i) => (
        <group key={`podium-${i}`} position={[podium.x, 0.9, podium.z]}>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.7, 0.88, 40]} />
            <meshBasicMaterial color="#ff3d8b" side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <pointLight position={[0, 0.2, 0]} color="#ff3d8b" intensity={5} distance={4.5} decay={2} />
          <WeTubeAvatar
            nickname={podium.name}
            shirtColor={podium.color}
            position={[0, 0, 0]}
            rotation={[0, Math.PI, 0]}
            isDancing
          />
        </group>
      ))}
    </group>
  );
}
