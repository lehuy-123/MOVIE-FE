'use client';

import React, { useState } from 'react';
import { SafeHtml } from './SafeHtml';
import * as THREE from 'three';
import { SeatData } from '@/types/cinema';

interface SeatMeshProps {
  seat: SeatData;
  isSelected: boolean;
  onSelect: (seat: SeatData) => void;
}

export function SeatMesh({ seat, isSelected, onSelect }: SeatMeshProps) {
  const [hovered, setHovered] = useState(false);

  const isOccupied = seat.state === 'occupied';
  const effectiveState = isSelected ? 'selected' : seat.state;

  // Inward arc yaw angle towards center screen
  const inwardYaw = -seat.position[0] * 0.025;

  // Leather colors
  let primaryColor = '#701a28'; // Deep VIP cinema burgundy
  let emissiveColor = '#000000';
  let emissiveIntensity = 0;

  if (effectiveState === 'selected') {
    primaryColor = '#1e40af'; // Royal Electric Blue
    emissiveColor = '#3b82f6';
    emissiveIntensity = 0.6;
  } else if (isOccupied) {
    primaryColor = '#1f2937'; // Slate dark gray
  } else if (hovered) {
    primaryColor = '#9f1239'; // Glowing Rose Red
    emissiveColor = '#f43f5e';
    emissiveIntensity = 0.35;
  }

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!isOccupied) {
      onSelect(seat);
    }
  };

  return (
    <group
      position={seat.position}
      rotation={[0, inwardYaw, 0]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!isOccupied) {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        } else {
          document.body.style.cursor = 'not-allowed';
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* 1. Chân đế kim loại sơn tĩnh điện đen nhám */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.44, 12]} />
        <meshStandardMaterial color="#0b0f19" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.06, 0.65]} />
        <meshStandardMaterial color="#111827" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* 2. Đệm ngồi bọc da cao cấp (VIP Leather Cushion) */}
      <mesh position={[0, 0.54, 0.06]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.16, 0.74]} />
        <meshStandardMaterial
          color={primaryColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* Gờ đệm bo viền sang trọng */}
      <mesh position={[0, 0.59, -0.26]} castShadow>
        <boxGeometry args={[0.88, 0.08, 0.1]} />
        <meshStandardMaterial color={primaryColor} roughness={0.35} metalness={0.15} />
      </mesh>

      {/* 3. Lưng tựa ghế Recliner công thái học */}
      <mesh
        position={[0, 1.15, 0.38]}
        rotation={[-0.16, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.88, 1.08, 0.18]} />
        <meshStandardMaterial
          color={primaryColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* Tựa đầu VIP (Padded Headrest) */}
      <mesh
        position={[0, 1.74, 0.47]}
        rotation={[-0.16, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.74, 0.26, 0.22]} />
        <meshStandardMaterial
          color={primaryColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity * 1.3}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* 4. Tay vịn 2 bên với khay để ly có đèn LED phát sáng */}
      {/* Tay vịn trái */}
      <group position={[-0.49, 0.76, 0.06]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.09, 0.38, 0.68]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.13, 0.06, 0.68]} />
          <meshStandardMaterial color="#1e293b" roughness={0.25} metalness={0.7} />
        </mesh>
        {/* Vòng LED hộc để ly */}
        <mesh position={[0, 0.24, -0.22]}>
          <cylinderGeometry args={[0.045, 0.045, 0.02, 16]} />
          <meshBasicMaterial color={isSelected ? '#38bdf8' : '#06b6d4'} />
        </mesh>
      </group>

      {/* Tay vịn phải */}
      <group position={[0.49, 0.76, 0.06]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.09, 0.38, 0.68]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.13, 0.06, 0.68]} />
          <meshStandardMaterial color="#1e293b" roughness={0.25} metalness={0.7} />
        </mesh>
        {/* Vòng LED hộc để ly */}
        <mesh position={[0, 0.24, -0.22]}>
          <cylinderGeometry args={[0.045, 0.045, 0.02, 16]} />
          <meshBasicMaterial color={isSelected ? '#38bdf8' : '#06b6d4'} />
        </mesh>
      </group>

      {/* 5. Vòng tròn ánh sáng chọn ghế (Glowing Floor Selection Ring) */}
      {isSelected && (
        <group position={[0, 0.03, 0.1]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.75, 0.9, 32]} />
            <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
          </mesh>
          <pointLight color="#38bdf8" intensity={1.5} distance={3} />
        </group>
      )}

      {/* 6. Đèn gầm ghế dịu nhẹ chiếu sàn (Under-seat Step Light) */}
      <pointLight
        position={[0, 0.1, 0.2]}
        color="#fbbf24"
        intensity={0.15}
        distance={2}
        decay={2}
      />

      {/* 7. Nhãn ghế thông minh hiển thị khi hover hoặc khi ghế được chọn */}
      {(hovered || isSelected || isOccupied) && (
        <SafeHtml
          position={[0, 2.15, 0.45]}
          center
          distanceFactor={16}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shadow-2xl border backdrop-blur-xl ${
              isSelected
                ? 'bg-blue-600/90 text-white border-blue-400 shadow-blue-500/50 ring-2 ring-blue-400/50'
                : isOccupied
                ? 'bg-slate-900/90 text-slate-300 border-slate-700'
                : 'bg-black/90 text-white border-rose-500 shadow-rose-500/40 ring-1 ring-rose-500/40'
            }`}
          >
            <span className="font-mono text-sm tracking-wider">{seat.id}</span>
            <span>•</span>
            <span className="text-[11px] font-medium">
              {isSelected
                ? 'Ghế của bạn (FPV IMAX)'
                : isOccupied
                ? seat.occupiedBy || 'Đang có người'
                : 'Bấm để ngồi (Góc xem chuẩn)'}
            </span>
          </div>
        </SafeHtml>
      )}
    </group>
  );
}
