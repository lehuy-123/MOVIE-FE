'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ROOM, ROOM_DEPTH, ROOM_CENTER_Z } from '@/lib/roomLayout';
import { AISLE_X_POSITIONS, ROW_Y_POSITIONS, ROW_Z_POSITIONS } from '@/lib/seatLayout';

/** Dải đèn LED dọc trên tường bên: cách đều nhau 4m. */
const STRIP_Z = [-8, -4, 0, 4, 8, 12, 16, 20];
const ROW_DEPTH = 1.7;
const RISER_WIDTH = 23;
const HALF_W = ROOM.width / 2;

// Tông màu tường và nan tiêu âm sáng sủa, ấm áp (Screenshot 2)
const WALL_COLOR = '#1a2734';
const PANEL_COLOR = '#233444';
const WARM = '#ffc477';

/** Texture vệt sáng ấm toả ngang, mờ dần ở hai đầu (hắt lên tường). */
function useStripGlowTexture(): THREE.CanvasTexture {
  return useMemo(() => {
    const w = 128;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d')!;
    const horizontal = g.createLinearGradient(0, 0, w, 0);
    horizontal.addColorStop(0, 'rgba(255,176,80,0)');
    horizontal.addColorStop(0.5, 'rgba(255,196,110,1)');
    horizontal.addColorStop(1, 'rgba(255,176,80,0)');
    g.fillStyle = horizontal;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in';
    const vertical = g.createLinearGradient(0, 0, 0, h);
    vertical.addColorStop(0, 'rgba(0,0,0,0)');
    vertical.addColorStop(0.14, 'rgba(0,0,0,1)');
    vertical.addColorStop(0.86, 'rgba(0,0,0,1)');
    vertical.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = vertical;
    g.fillRect(0, 0, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function useStarPositions(count: number): Float32Array {
  return useMemo(() => {
    const arr = new Float32Array(count * 3);
    let seed = 1337;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rnd() - 0.5) * (ROOM.width - 2);
      arr[i * 3 + 1] = ROOM.height - 0.1;
      arr[i * 3 + 2] = ROOM.zFront + 1 + rnd() * (ROOM_DEPTH - 2);
    }
    return arr;
  }, [count]);
}

/** Một bên tường: nan tiêu âm + dải LED vàng ấm + đèn rọi tường gắn trần. */
function SideWall({ side, glow }: { side: -1 | 1; glow: THREE.Texture }) {
  const wallX = side * HALF_W;
  const inward = -side; // hướng vào phòng
  return (
    <group>
      {/* Mặt tường */}
      <mesh position={[wallX, ROOM.height / 2, ROOM_CENTER_Z]} rotation={[0, (-side * Math.PI) / 2, 0]}>
        <planeGeometry args={[ROOM_DEPTH, ROOM.height]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} />
      </mesh>

      {STRIP_Z.map((z) => (
        <group key={`strip-${z}`}>
          {/* Dải LED thanh dọc (nằm lõm giữa hai tấm tiêu âm) */}
          <mesh position={[wallX + inward * 0.1, 7.6, z]}>
            <boxGeometry args={[0.06, 11.2, 0.16]} />
            <meshBasicMaterial color={WARM} toneMapped={false} />
          </mesh>
          {/* Ánh sáng hắt lên tường quanh dải LED */}
          <mesh position={[wallX + inward * 0.34, 7.6, z]} rotation={[0, (inward * Math.PI) / 2, 0]}>
            <planeGeometry args={[3.4, 12.4]} />
            <meshBasicMaterial
              map={glow}
              transparent
              opacity={0.65}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {/* Đèn rọi tường hình trụ đen gắn trên trần chiếu xuống (Screenshot 2) */}
          <group position={[wallX + inward * 0.5, 16.6, z]} rotation={[0, 0, inward * -0.55]}>
            <mesh>
              <cylinderGeometry args={[0.17, 0.2, 0.75, 14]} />
              <meshStandardMaterial color="#07090c" roughness={0.45} metalness={0.5} />
            </mesh>
            <mesh position={[0, -0.39, 0]}>
              <cylinderGeometry args={[0.13, 0.13, 0.03, 14]} />
              <meshBasicMaterial color="#ffe2a8" toneMapped={false} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Tấm tiêu âm giữa các dải LED */}
      {STRIP_Z.slice(0, -1).map((z) => (
        <mesh key={`panel-${z}`} position={[wallX + inward * 0.14, 7.9, z + 2]}>
          <boxGeometry args={[0.28, 12.4, 2.8]} />
          <meshStandardMaterial color={PANEL_COLOR} roughness={0.75} />
        </mesh>
      ))}

      {/* Đèn ấm thật sự rọi lên tường + hàng ghế hai bên */}
      {[-6, 0, 6, 12, 18].map((z) => (
        <pointLight
          key={`warm-${z}`}
          position={[wallX + inward * 1.8, 8.5, z]}
          color="#ffb866"
          intensity={36}
          distance={22}
          decay={1.8}
        />
      ))}
    </group>
  );
}

/**
 * Kiến trúc phòng chiếu: hộp chữ nhật dài, sàn dốc giật cấp (cao dần về phía sau),
 * hai tường bên có dải LED vàng ấm, tường trước gắn màn chiếu viền rạp.
 * Tường sau chỉ render một mặt (hướng vào trong) để camera trên cao phía sau nhìn xuyên vào phòng.
 */
export function CinemaRoom() {
  const glow = useStripGlowTexture();
  const stars = useStarPositions(220);

  return (
    <group>
      {/* Sàn phòng rạp chiếu (bóng nhẹ, phản xạ ánh sáng ấm) */}
      <mesh position={[0, 0, ROOM_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM.width, ROOM_DEPTH]} />
        <meshStandardMaterial color="#111a24" roughness={0.3} metalness={0.35} />
      </mesh>

      {/* Sàn dốc giật cấp: mỗi hàng ghế một bậc đặc tông xám xanh sáng sủa */}
      {ROW_Z_POSITIONS.map((z, i) => {
        const top = ROW_Y_POSITIONS[i];
        return (
          <group key={`tier-${i}`}>
            <mesh position={[0, top / 2, z]}>
              <boxGeometry args={[RISER_WIDTH, top, ROW_DEPTH]} />
              <meshStandardMaterial color="#1e2938" roughness={0.65} metalness={0.12} />
            </mesh>
            {/* Đèn LED viền bậc sáng ấm */}
            <mesh position={[0, top - 0.035, z - ROW_DEPTH / 2 - 0.01]}>
              <boxGeometry args={[RISER_WIDTH, 0.045, 0.03]} />
              <meshBasicMaterial color="#ffc477" transparent opacity={0.85} toneMapped={false} />
            </mesh>
            {/* Lối đi: thảm lối đi + đèn chấm trắng vàng ấm */}
            {AISLE_X_POSITIONS.map((x) => (
              <group key={`aisle-${x}`}>
                <mesh position={[x, top + 0.006, z]}>
                  <boxGeometry args={[1.3, 0.012, ROW_DEPTH]} />
                  <meshStandardMaterial color="#141c27" roughness={0.85} />
                </mesh>
                <mesh position={[x - 0.5, top + 0.016, z + 0.5]}>
                  <boxGeometry args={[0.07, 0.012, 0.07]} />
                  <meshBasicMaterial color="#fff4d4" toneMapped={false} />
                </mesh>
                <mesh position={[x + 0.5, top + 0.016, z + 0.5]}>
                  <boxGeometry args={[0.07, 0.012, 0.07]} />
                  <meshBasicMaterial color="#fff4d4" toneMapped={false} />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}

      {/* Bục cao phía sau hàng ghế cuối */}
      {(() => {
        const lastTop = ROW_Y_POSITIONS[ROW_Y_POSITIONS.length - 1];
        const startZ = ROW_Z_POSITIONS[ROW_Z_POSITIONS.length - 1] + ROW_DEPTH / 2;
        const depth = ROOM.zBack - startZ;
        return (
          <mesh position={[0, lastTop / 2, startZ + depth / 2]}>
            <boxGeometry args={[RISER_WIDTH, lastTop, depth]} />
            <meshStandardMaterial color="#172230" roughness={0.7} />
          </mesh>
        );
      })()}

      {/* Tường trước (sau màn chiếu) */}
      <mesh position={[0, ROOM.height / 2, ROOM.zFront]}>
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshStandardMaterial color="#0e151e" roughness={0.9} />
      </mesh>
      {/* Tường sau: một mặt, hướng vào trong */}
      <mesh position={[0, ROOM.height / 2, ROOM.zBack]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshStandardMaterial color="#0f1722" roughness={0.9} />
      </mesh>

      {/* Hai tường bên */}
      <SideWall side={-1} glow={glow} />
      <SideWall side={1} glow={glow} />

      {/* Trần + bầu trời ngàn sao */}
      <mesh position={[0, ROOM.height, ROOM_CENTER_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM.width, ROOM_DEPTH]} />
        <meshStandardMaterial color="#06090e" roughness={0.95} />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffe9b8" size={0.14} sizeAttenuation transparent opacity={0.85} toneMapped={false} />
      </points>
    </group>
  );
}
