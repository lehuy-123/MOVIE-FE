'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface ExitSignProps {
  position?: [number, number, number];
  isDimmed?: boolean;
}

/**
 * Biển báo EXIT đèn LED dạ quang mẫu mới (Nền đen tuyền, không nẹp nhôm, chữ & hình xanh lá dạ quang nổi bật)
 * Đi kèm cụm cửa thoát hiểm khẩn cấp đặt ngay cạnh màn chiếu IMAX (giữa màn chiếu và cột loa trái).
 */
export function ExitSign({
  position = [-15.0, 3.8, -10.8],
  isDimmed = true,
}: ExitSignProps) {
  const [diffuseTex, emissiveTex, glowTex] = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const dTex = loader.load('/exit-sign.png');
    dTex.colorSpace = THREE.SRGBColorSpace;

    const eTex = loader.load('/exit-sign-emissive.png');
    eTex.colorSpace = THREE.SRGBColorSpace;

    // Vệt hào quang xanh khẩn cấp hắt nhẹ lên mảng tường
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const gCtx = glowCanvas.getContext('2d')!;
    const rad = gCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    rad.addColorStop(0, 'rgba(60, 255, 30, 0.85)');
    rad.addColorStop(0.35, 'rgba(40, 220, 20, 0.35)');
    rad.addColorStop(0.7, 'rgba(20, 160, 10, 0.1)');
    rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    gCtx.fillStyle = rad;
    gCtx.fillRect(0, 0, 256, 256);

    const gTex = new THREE.CanvasTexture(glowCanvas);
    gTex.colorSpace = THREE.SRGBColorSpace;

    return [dTex, eTex, gTex];
  }, []);

  const [posX, posY, posZ] = position;

  return (
    <group>
      {/* 1. Cửa thoát hiểm khẩn cấp bên dưới biển EXIT */}
      <group position={[posX, 1.6, posZ - 0.05]}>
        {/* Khung cửa thép than chì chịu lực */}
        <mesh>
          <boxGeometry args={[1.88, 3.28, 0.07]} />
          <meshStandardMaterial color="#0b0f14" roughness={0.65} metalness={0.4} />
        </mesh>

        {/* Hai cánh cửa thoát hiểm đóng kín với khe hở kỹ thuật */}
        <mesh position={[-0.45, 0, 0.02]}>
          <boxGeometry args={[0.88, 3.18, 0.04]} />
          <meshStandardMaterial color="#141c26" roughness={0.7} metalness={0.25} />
        </mesh>
        <mesh position={[0.45, 0, 0.02]}>
          <boxGeometry args={[0.88, 3.18, 0.04]} />
          <meshStandardMaterial color="#141c26" roughness={0.7} metalness={0.25} />
        </mesh>

        {/* Thanh đẩy thoát hiểm khẩn cấp màu đỏ / inox (Panic Crash Bar) */}
        <group position={[0, -0.5, 0.07]}>
          <mesh>
            <boxGeometry args={[1.6, 0.065, 0.05]} />
            <meshStandardMaterial color="#dc2626" roughness={0.35} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.022]}>
            <boxGeometry args={[1.44, 0.02, 0.025]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.15} metalness={0.95} />
          </mesh>
        </group>

        {/* Gờ kim loại chân cửa */}
        <mesh position={[0, -1.62, 0.035]}>
          <boxGeometry args={[1.84, 0.035, 0.07]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
        </mesh>
      </group>

      {/* 2. Biển EXIT mẫu mới: Nền đen tuyền, đồ hoạ xanh dạ quang sắc nét */}
      <group position={[posX, posY, posZ]}>
        {/* Hào quang ánh sáng xanh hắt lên mảng tường xung quanh */}
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[3.6, 2.2]} />
          <meshBasicMaterial
            map={glowTex}
            transparent
            opacity={isDimmed ? 0.45 : 0.22}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* Hộp bảo vệ đen kim loại (Housing siêu mỏng phong cách hiện đại) */}
        <mesh>
          <boxGeometry args={[1.68, 0.66, 0.06]} />
          <meshStandardMaterial color="#07090c" roughness={0.3} metalness={0.9} />
        </mesh>

        {/* Mặt mica phát sáng đồ hoạ EXIT mẫu mới từ ảnh người dùng cung cấp */}
        <mesh position={[0, 0, 0.032]}>
          <planeGeometry args={[1.64, 0.62]} />
          <meshStandardMaterial
            map={diffuseTex}
            emissiveMap={emissiveTex}
            emissive="#38ff14"
            emissiveIntensity={isDimmed ? 2.5 : 1.7}
            roughness={0.15}
            metalness={0.05}
            toneMapped={false}
          />
        </mesh>

        {/* Nguồn sáng xanh khẩn cấp hắt nhẹ ra không gian xung quanh */}
        <pointLight
          position={[0, 0, 0.35]}
          color="#38ff14"
          intensity={isDimmed ? 1.8 : 0.9}
          distance={5.5}
          decay={1.8}
        />
      </group>
    </group>
  );
}
