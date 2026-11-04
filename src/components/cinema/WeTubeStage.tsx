'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WeTubeStageProps {
  screenZ?: number;
}

const SPEAKER_X = 15.6;
const WOOFER_Y = [-2.8, -0.6, 1.6];

/** Loa cột đứng cao ~8.8m, 3 màng loa trầm + bảng hiển thị trạng thái phía trên */
function SpeakerTower({ x, z, side }: { x: number; z: number; side: -1 | 1 }) {
  return (
    <group position={[x, 5.2, z]} rotation={[0, side * -0.15, 0]}>
      {/* Vỏ thùng loa đen nhám */}
      <mesh>
        <boxGeometry args={[1.8, 8.8, 1.8]} />
        <meshStandardMaterial color="#090b0f" roughness={0.45} metalness={0.55} />
      </mesh>
      {/* Viền mặt loa */}
      <mesh position={[0, 0, 0.91]}>
        <boxGeometry args={[1.6, 8.4, 0.03]} />
        <meshStandardMaterial color="#12161d" roughness={0.6} />
      </mesh>

      {/* Bảng màn hình hiển thị trạng thái phía trên màng loa */}
      <group position={[0, 3.2, 0.93]}>
        <mesh>
          <boxGeometry args={[1.2, 0.45, 0.03]} />
          <meshStandardMaterial color="#0b111a" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[1.1, 0.35, 0.01]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
      </group>

      {/* 3 màng loa trầm hình tròn */}
      {[-2.5, -0.6, 1.3].map((y, i) => (
        <group key={`woofer-${i}`} position={[0, y, 0.93]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.62, 0.62, 0.05, 28]} />
            <meshStandardMaterial color="#1b2230" roughness={0.35} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.05, 18]} />
            <meshStandardMaterial color="#3b4658" roughness={0.25} metalness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Loa kiểm âm sân khấu vát góc chuyên nghiệp (Pro Stage Foldback Wedge Monitors) */
function StageMonitorWedge({ x, z, rotationY }: { x: number; z: number; rotationY: number }) {
  return (
    <group position={[x, 0.95, z]} rotation={[0, rotationY, 0]}>
      {/* Thùng loa kiểm âm vát chéo 45 độ nằm sát sàn */}
      <mesh position={[0, 0.16, 0]} rotation={[-0.45, 0, 0]}>
        <boxGeometry args={[1.2, 0.45, 0.75]} />
        <meshStandardMaterial color="#10151d" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Mặt lưới tản âm kim loại bảo vệ */}
      <mesh position={[0, 0.19, 0.02]} rotation={[-0.45, 0, 0]}>
        <boxGeometry args={[1.1, 0.38, 0.02]} />
        <meshStandardMaterial color="#1c2430" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Vành loa trầm tròn bên trong mặt lưới */}
      <mesh position={[0, 0.21, 0.04]} rotation={[Math.PI / 2 - 0.45, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 20]} />
        <meshStandardMaterial color="#2d3748" roughness={0.3} metalness={0.9} />
      </mesh>
    </group>
  );
}

/** Bục phát biểu sự kiện & điện ảnh cao cấp (Cinema Event Lectern / Podium) */
function StageLectern({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.9, z]} rotation={[0, 0.25, 0]}>
      {/* Đế bục kim loại tròn */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.42, 0.46, 0.06, 20]} />
        <meshStandardMaterial color="#111827" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Trụ đứng thon gọn sang trọng mạ kim loại xước */}
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 1.2, 16]} />
        <meshStandardMaterial color="#1f2937" roughness={0.3} metalness={0.85} />
      </mesh>
      {/* Mặt bàn bục phát biểu vát nghiêng */}
      <mesh position={[0, 1.28, 0.08]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[0.75, 0.06, 0.55]} />
        <meshStandardMaterial color="#0f172a" roughness={0.25} metalness={0.6} />
      </mesh>
      {/* Mic cổ ngỗng siêu nhỏ gắn trên bục phát biểu */}
      <mesh position={[0.18, 1.42, -0.05]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.35, 8]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.9} />
      </mesh>
      {/* Đèn chỉ báo LED nhỏ trên đầu micro */}
      <mesh position={[0.18, 1.58, 0.02]}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

/** 8 Đèn rọi chân sân khấu (Footlight pucks) ánh vàng ấm áp dọc theo mép sân khấu */
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
      {/* 1. Sân khấu chính màu đen nhám sang trọng */}
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

      {/* 2. Hai loa cột đứng hai bên mép màn hình (Bố trí gọn gàng sát vách để không chắn cửa thoát hiểm) */}
      <SpeakerTower x={-17.4} z={screenZ + 1.2} side={-1} />
      <SpeakerTower x={17.2} z={screenZ + 1.2} side={1} />

      {/* 3. Trái châu (Quả cầu gương disco) treo trên cao phía trước màn chiếu - KHÔNG BỊ KHUẤT */}
      <group ref={discoBallRef} position={[0, 18.0, screenZ + 3.4]}>
        {/* Dây cáp treo thả từ trần rạp (Y=19) xuống quả cầu */}
        <mesh position={[0, 0.52, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 1.05, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} />
        </mesh>
        {/* Quả cầu gương lấp lánh phản chiếu ánh sáng */}
        <mesh>
          <sphereGeometry args={[0.6, 24, 24]} />
          <meshStandardMaterial
            color="#e2e8f0"
            metalness={0.95}
            roughness={0.12}
            emissive="#64748b"
            emissiveIntensity={0.5}
          />
        </mesh>
        <pointLight color="#fdf4ff" intensity={10} distance={15} decay={2} />
      </group>

      {/* 4. Thiết bị sân khấu chuyên nghiệp (Thay thế 3 người đứng rối mắt): */}
      {/* Hai loa kiểm âm sân khấu vát góc chuyên nghiệp hai bên cánh sân khấu */}
      <StageMonitorWedge x={-5.2} z={stageFrontZ - 0.9} rotationY={0.35} />
      <StageMonitorWedge x={5.2} z={stageFrontZ - 0.9} rotationY={-0.35} />

      {/* Bục phát biểu điện ảnh cao cấp tinh tế đặt gọn gàng phía cánh trái sân khấu */}
      <StageLectern x={-8.8} z={stageFrontZ - 1.4} />
    </group>
  );
}
