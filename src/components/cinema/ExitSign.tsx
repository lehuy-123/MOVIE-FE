'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface ExitSignProps {
  position?: [number, number, number];
  isDimmed?: boolean;
}

/**
 * Tạo texture sắc nét 100% tức thì bằng Canvas mô phỏng chính xác hình ảnh biển EXIT người dùng gửi:
 * - Mũi tên chỉ hướng sang trái (←)
 * - Người đang chạy qua khung cửa thoát hiểm
 * - Chữ "EXIT" in hoa đậm nét
 * - Đèn LED chỉ thị xanh/đỏ ở góc dưới phải
 * - Nẹp nhôm sáng bóng ở mép trên
 */
function useExitSignTextures() {
  return useMemo(() => {
    const w = 1024;
    const h = 400;

    // 1. Diffuse Canvas
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Nền đen nhám đặc trưng của hộp mica dạ quang
    ctx.fillStyle = '#06100a';
    ctx.fillRect(0, 0, w, h);

    // Thanh nẹp nhôm sáng bóng mép trên (Brushed Aluminum Header)
    const alumGrad = ctx.createLinearGradient(0, 0, 0, 44);
    alumGrad.addColorStop(0, '#94a3b8');
    alumGrad.addColorStop(0.3, '#f1f5f9');
    alumGrad.addColorStop(0.7, '#cbd5e1');
    alumGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = alumGrad;
    ctx.fillRect(0, 0, w, 44);

    // Viền khung màu xanh rêu sẫm
    ctx.strokeStyle = '#0f2918';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 44, w - 6, h - 48);

    // Màu xanh dạ quang chuẩn đèn thoát hiểm khẩn cấp
    const greenColor = '#00ff66';
    ctx.fillStyle = greenColor;
    ctx.strokeStyle = greenColor;

    // A. Mũi tên chỉ trái: "←"
    ctx.beginPath();
    ctx.moveTo(90, 225);
    ctx.lineTo(195, 135);
    ctx.lineTo(195, 185);
    ctx.lineTo(315, 185);
    ctx.lineTo(315, 265);
    ctx.lineTo(195, 265);
    ctx.lineTo(195, 315);
    ctx.closePath();
    ctx.fill();

    // B. Khung cửa & Người chạy thoát hiểm
    // Khung cửa
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';
    ctx.strokeRect(375, 95, 165, 245);

    // Đầu người
    ctx.beginPath();
    ctx.arc(460, 140, 22, 0, Math.PI * 2);
    ctx.fill();

    // Thân và tứ chi người chạy
    ctx.lineWidth = 19;
    ctx.beginPath();
    // Thân nghiêng lao về trước
    ctx.moveTo(460, 165);
    ctx.lineTo(438, 240);
    // Chân sau
    ctx.lineTo(400, 305);
    ctx.lineTo(370, 290);
    // Chân trước
    ctx.moveTo(438, 240);
    ctx.lineTo(485, 265);
    ctx.lineTo(515, 315);
    // Tay trước
    ctx.moveTo(455, 185);
    ctx.lineTo(410, 205);
    ctx.lineTo(385, 190);
    // Tay sau
    ctx.moveTo(455, 185);
    ctx.lineTo(495, 210);
    ctx.lineTo(520, 248);
    ctx.stroke();

    // C. Chữ "EXIT" in hoa to bản cực rõ nét
    ctx.font = '900 178px "Impact", "Arial Black", "Arial", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', 585, 228);

    // D. Đèn LED chỉ thị nhỏ ở góc dưới phải (xanh, xanh, đỏ)
    ctx.fillStyle = '#00ff66';
    ctx.beginPath();
    ctx.arc(910, 365, 8, 0, Math.PI * 2);
    ctx.arc(940, 365, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.arc(970, 365, 8, 0, Math.PI * 2);
    ctx.fill();

    // 2. Emissive Canvas (Chỉ các phần phát quang có màu sáng, nền đen tuyền 100%)
    const emCanvas = document.createElement('canvas');
    emCanvas.width = w;
    emCanvas.height = h;
    const emCtx = emCanvas.getContext('2d')!;
    emCtx.fillStyle = '#000000';
    emCtx.fillRect(0, 0, w, h);

    emCtx.fillStyle = '#00ff66';
    emCtx.strokeStyle = '#00ff66';

    // Mũi tên
    emCtx.beginPath();
    emCtx.moveTo(90, 225);
    emCtx.lineTo(195, 135);
    emCtx.lineTo(195, 185);
    emCtx.lineTo(315, 185);
    emCtx.lineTo(315, 265);
    emCtx.lineTo(195, 265);
    emCtx.lineTo(195, 315);
    emCtx.closePath();
    emCtx.fill();

    // Khung cửa
    emCtx.lineWidth = 18;
    emCtx.lineCap = 'round';
    emCtx.strokeRect(375, 95, 165, 245);

    // Đầu & thân người
    emCtx.beginPath();
    emCtx.arc(460, 140, 22, 0, Math.PI * 2);
    emCtx.fill();
    emCtx.lineWidth = 19;
    emCtx.beginPath();
    emCtx.moveTo(460, 165);
    emCtx.lineTo(438, 240);
    emCtx.lineTo(400, 305);
    emCtx.lineTo(370, 290);
    emCtx.moveTo(438, 240);
    emCtx.lineTo(485, 265);
    emCtx.lineTo(515, 315);
    emCtx.moveTo(455, 185);
    emCtx.lineTo(410, 205);
    emCtx.lineTo(385, 190);
    emCtx.moveTo(455, 185);
    emCtx.lineTo(495, 210);
    emCtx.lineTo(520, 248);
    emCtx.stroke();

    // Chữ EXIT
    emCtx.font = '900 178px "Impact", "Arial Black", "Arial", sans-serif';
    emCtx.textAlign = 'left';
    emCtx.textBaseline = 'middle';
    emCtx.fillText('EXIT', 585, 228);

    // LEDs
    emCtx.fillStyle = '#00ff66';
    emCtx.beginPath();
    emCtx.arc(910, 365, 8, 0, Math.PI * 2);
    emCtx.arc(940, 365, 8, 0, Math.PI * 2);
    emCtx.fill();
    emCtx.fillStyle = '#ff2222';
    emCtx.beginPath();
    emCtx.arc(970, 365, 8, 0, Math.PI * 2);
    emCtx.fill();

    // 3. Vệt sáng hào quang xanh hắt lên tường
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const gCtx = glowCanvas.getContext('2d')!;
    const rad = gCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    rad.addColorStop(0, 'rgba(0, 255, 100, 0.9)');
    rad.addColorStop(0.35, 'rgba(0, 230, 80, 0.45)');
    rad.addColorStop(0.7, 'rgba(0, 160, 60, 0.12)');
    rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    gCtx.fillStyle = rad;
    gCtx.fillRect(0, 0, 256, 256);

    const dTex = new THREE.CanvasTexture(canvas);
    dTex.colorSpace = THREE.SRGBColorSpace;
    const eTex = new THREE.CanvasTexture(emCanvas);
    eTex.colorSpace = THREE.SRGBColorSpace;
    const gTex = new THREE.CanvasTexture(glowCanvas);
    gTex.colorSpace = THREE.SRGBColorSpace;

    return { diffuse: dTex, emissive: eTex, glow: gTex };
  }, []);
}

/**
 * Biển báo EXIT đèn LED khẩn cấp và cửa thoát hiểm điện ảnh chân thực
 * Đặt ở bên trái màn chiếu IMAX chuẩn quy chuẩn rạp chiếu phim CGV.
 */
export function ExitSign({
  position = [-15.2, 4.3, -10.7],
  isDimmed = true,
}: ExitSignProps) {
  const { diffuse, emissive, glow } = useExitSignTextures();
  const [posX, posY, posZ] = position;

  return (
    <group>
      {/* 1. Cửa thoát hiểm khẩn cấp bên dưới biển EXIT */}
      <group position={[posX, 1.7, posZ - 0.05]}>
        {/* Khung cửa thép than chì chịu lực */}
        <mesh>
          <boxGeometry args={[2.4, 3.4, 0.08]} />
          <meshStandardMaterial color="#0b0f14" roughness={0.6} metalness={0.4} />
        </mesh>

        {/* Hai cánh cửa thoát hiểm đóng kín với khe hở giữa */}
        <mesh position={[-0.58, 0, 0.02]}>
          <boxGeometry args={[1.12, 3.28, 0.04]} />
          <meshStandardMaterial color="#141c26" roughness={0.7} metalness={0.25} />
        </mesh>
        <mesh position={[0.58, 0, 0.02]}>
          <boxGeometry args={[1.12, 3.28, 0.04]} />
          <meshStandardMaterial color="#141c26" roughness={0.7} metalness={0.25} />
        </mesh>

        {/* Thanh đẩy thoát hiểm khẩn cấp màu đỏ / inox (Panic Crash Bar) */}
        <group position={[0, -0.55, 0.08]}>
          <mesh>
            <boxGeometry args={[2.08, 0.07, 0.06]} />
            <meshStandardMaterial color="#b91c1c" roughness={0.35} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <boxGeometry args={[1.88, 0.022, 0.03]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.15} metalness={0.95} />
          </mesh>
        </group>

        {/* Gờ kim loại chân cửa */}
        <mesh position={[0, -1.66, 0.04]}>
          <boxGeometry args={[2.36, 0.04, 0.08]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
        </mesh>
      </group>

      {/* 2. Biển EXIT phát sáng xanh chính (Rộng 1.9m x Cao 0.74m) */}
      <group position={[posX, posY, posZ]}>
        {/* Hào quang ánh sáng xanh hắt lên mảng tường xung quanh */}
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[4.2, 2.6]} />
          <meshBasicMaterial
            map={glow}
            transparent
            opacity={isDimmed ? 0.5 : 0.28}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* Hộp bảo vệ đen kim loại (Housing) */}
        <mesh>
          <boxGeometry args={[1.92, 0.74, 0.09]} />
          <meshStandardMaterial color="#080a0e" roughness={0.3} metalness={0.85} />
        </mesh>

        {/* Thanh nhôm nẹp đỉnh sáng bóng chuẩn như ảnh chụp */}
        <mesh position={[0, 0.35, 0.02]}>
          <boxGeometry args={[1.88, 0.05, 0.1]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.2} metalness={0.95} />
        </mesh>

        {/* Mặt mica phát sáng đồ hoạ EXIT xanh dạ quang rực rỡ */}
        <mesh position={[0, -0.02, 0.048]}>
          <planeGeometry args={[1.84, 0.66]} />
          <meshStandardMaterial
            map={diffuse}
            emissiveMap={emissive}
            emissive="#00ff66"
            emissiveIntensity={isDimmed ? 2.6 : 1.8}
            roughness={0.18}
            metalness={0.1}
            toneMapped={false}
          />
        </mesh>

        {/* Nguồn sáng xanh khẩn cấp hắt nhẹ ra không gian xung quanh */}
        <pointLight
          position={[0, 0, 0.4]}
          color="#00ff66"
          intensity={isDimmed ? 2.2 : 1.2}
          distance={6.0}
          decay={1.8}
        />
      </group>
    </group>
  );
}
