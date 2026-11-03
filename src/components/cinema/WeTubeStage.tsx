'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WeTubeAvatar } from './WeTubeAvatar';
import { GoldenCrown } from './GoldenCrown';

interface WeTubeStageProps {
  screenZ?: number;
}

const SPEAKER_X = 15.6;
const WOOFER_Y = [-2.8, -0.6, 1.6];

/** Loa cột đứng cao ~9.6m, 3 màng loa trầm + bảng hiển thị trạng thái phía trên (Screenshot 1 & 2) */
function SpeakerTower({ x, z, side }: { x: number; z: number; side: -1 | 1 }) {
  return (
    <group position={[x, 5.7, z]} rotation={[0, side * -0.12, 0]}>
      {/* Vỏ thùng loa đen nhám */}
      <mesh>
        <boxGeometry args={[2.4, 9.6, 2.6]} />
        <meshStandardMaterial color="#090b0f" roughness={0.45} metalness={0.55} />
      </mesh>
      {/* Viền mặt loa */}
      <mesh position={[0, 0, 1.31]}>
        <boxGeometry args={[2.1, 9.2, 0.03]} />
        <meshStandardMaterial color="#12161d" roughness={0.6} />
      </mesh>

      {/* Bảng màn hình hiển thị trạng thái phía trên màng loa (Screenshot 1 & 2) */}
      <group position={[0, 3.65, 1.33]}>
        <mesh>
          <boxGeometry args={[1.5, 0.5, 0.03]} />
          <meshStandardMaterial color="#0b111a" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[1.35, 0.38, 0.01]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
      </group>

      {/* 3 màng loa trầm hình tròn */}
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

/** Ghế Ngai Vàng Hoàng Gia VIP đặt trên bục vinh danh cánh phải sân khấu */
function StageRoyalThrone() {
  return (
    <group position={[0, 0, 0]}>
      {/* Đệm ngồi bọc nhung đỏ thẫm */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.04, 0.2, 0.8]} />
        <meshStandardMaterial color="#991b1b" roughness={0.35} />
      </mesh>
      {/* Tựa lưng viền vàng hoàng gia */}
      <mesh position={[0, 0.95, 0.36]} castShadow>
        <boxGeometry args={[1.08, 0.88, 0.16]} />
        <meshStandardMaterial color="#991b1b" roughness={0.35} />
      </mesh>
      {/* Khung tay vịn mạ vàng */}
      {[-0.54, 0.54].map((x) => (
        <mesh key={x} position={[x, 0.65, 0.02]} castShadow>
          <boxGeometry args={[0.1, 0.32, 0.72]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      {/* Vòm cung mạ vàng đỉnh tựa lưng (Screenshot 2) */}
      <mesh position={[0, 1.38, 0.36]}>
        <torusGeometry args={[0.36, 0.042, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Vương miện hoàng gia vàng 3D lơ lửng ngay phía trên ngai vàng (Screenshot 1 & 2) */}
      <GoldenCrown position={[0, 1.56, 0.36]} scale={1.1} />
    </group>
  );
}

/** 8 Đèn rọi chân sân khấu (Footlight pucks) ánh vàng ấm áp dọc theo mép sân khấu (Screenshot 1 & 2) */
const FOOTLIGHT_X = [-10.5, -7.5, -4.5, -1.5, 1.5, 4.5, 7.5, 10.5];

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
      {/* 1. Sân khấu chính màu đen nhám */}
      <mesh position={[0, 0.45, stageCenterZ]}>
        <boxGeometry args={[31, 0.9, stageDepth]} />
        <meshStandardMaterial color="#0c1016" roughness={0.6} metalness={0.25} />
      </mesh>

      {/* Viền chỉ vàng mảnh mép trước sân khấu */}
      <mesh position={[0, 0.88, stageFrontZ + 0.01]}>
        <boxGeometry args={[30.8, 0.03, 0.04]} />
        <meshBasicMaterial color="#ffd68a" toneMapped={false} />
      </mesh>

      {/* Hàng 8 đèn rọi chân sân khấu tròn (Stage Footlights / Pucks) chiếu hắt lên trên */}
      {FOOTLIGHT_X.map((x, i) => (
        <group key={`puck-${i}`} position={[x, 0.91, stageFrontZ - 0.16]}>
          {/* Thân đèn hình trụ đen nghiêng nhẹ về phía màn chiếu */}
          <mesh rotation={[-0.4, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.25, 0.22, 16]} />
            <meshStandardMaterial color="#07090c" roughness={0.4} metalness={0.8} />
          </mesh>
          {/* Mặt đèn phát sáng vàng ấm */}
          <mesh position={[0, 0.1, -0.04]} rotation={[-0.4, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.03, 16]} />
            <meshBasicMaterial color="#ffe3a8" toneMapped={false} />
          </mesh>
          {/* Điểm sáng thực tế hắt ánh vàng dịu lên sân khấu */}
          <pointLight position={[0, 0.4, -0.1]} color="#ffc477" intensity={3.5} distance={5.5} decay={2} />
        </group>
      ))}

      {/* 2. Hai loa cột lớn hai bên mép màn hình */}
      <SpeakerTower x={-SPEAKER_X} z={screenZ + 1.6} side={-1} />
      <SpeakerTower x={SPEAKER_X} z={screenZ + 1.6} side={1} />

      {/* 3. Quả cầu gương trên trần chính giữa màn chiếu */}
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

      {/* 4. 3 bục biểu diễn / vinh danh phía trước màn chiếu (Screenshot 1 & 2) */}
      {/* Bục trái: Vòng hồng + Nhân vật DJ Alex (Áo xanh pastel) */}
      <group position={[-3.8, 0.9, screenZ + 2.9]}>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.88, 40]} />
          <meshBasicMaterial color="#ff3d8b" side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.2, 0]} color="#ff3d8b" intensity={5} distance={4.5} decay={2} />
        <WeTubeAvatar
          nickname="DJ Alex"
          shirtColor="#bfdbfe"
          position={[0, 0, 0]}
          rotation={[0, Math.PI, 0]}
          isDancing
        />
      </group>

      {/* Bục giữa: Vòng hồng + Nhân vật MC Linh (Áo xanh lá pastel) */}
      <group position={[0, 0.9, screenZ + 3.3]}>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.88, 40]} />
          <meshBasicMaterial color="#ff3d8b" side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.2, 0]} color="#ff3d8b" intensity={5} distance={4.5} decay={2} />
        <WeTubeAvatar
          nickname="MC Linh"
          shirtColor="#a7f3d0"
          position={[0, 0, 0]}
          rotation={[0, Math.PI, 0]}
          isDancing
        />
      </group>

      {/* Bục phải: Vòng vàng tím + Ngai vàng hoàng gia VIP có vương miện hoàng kim (Screenshot 1) */}
      <group position={[3.8, 0.9, screenZ + 2.9]}>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.9, 40]} />
          <meshBasicMaterial color="#c084fc" side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.2, 0]} color="#c084fc" intensity={5} distance={4.5} decay={2} />
        <StageRoyalThrone />
      </group>
    </group>
  );
}
