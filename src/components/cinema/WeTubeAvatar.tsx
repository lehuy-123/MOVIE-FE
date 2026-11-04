'use client';

import React, { useMemo, useRef } from 'react';
import { SafeHtml } from './SafeHtml';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ChatMessage } from '@/types/socket';

interface WeTubeAvatarProps {
  nickname: string;
  shirtColor?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  isDancing?: boolean;
  isCurrentUser?: boolean;
  seatId?: string | null;
  activeBubble?: ChatMessage;
  isAdmin?: boolean;
  isMicOn?: boolean;
  isSpeaking?: boolean;
  isMicMuted?: boolean;
  isFirstPersonPov?: boolean;
}

/* ──────────────── Shared geometry / material caches ──────────────── */
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.SphereGeometry(1, 20, 14);
const santaBrimGeo = new THREE.TorusGeometry(0.24, 0.055, 10, 22);
const santaConeGeo = new THREE.ConeGeometry(0.235, 0.42, 16);

const materialCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color?: string | null, roughness = 0.75): THREE.MeshStandardMaterial {
  const safeColor = typeof color === 'string' && color.trim().length > 0 ? color.trim() : '#a7f3d0';
  const key = `${safeColor}|${roughness}`;
  let m = materialCache.get(key);
  if (!m) {
    try {
      m = new THREE.MeshStandardMaterial({ color: safeColor, roughness });
    } catch {
      m = new THREE.MeshStandardMaterial({ color: '#a7f3d0', roughness });
    }
    materialCache.set(key, m);
  }
  return m;
}

const nameTextureCache = new Map<string, THREE.CanvasTexture>();
const headTagTextureCache = new Map<string, THREE.CanvasTexture>();

function getHeadNametagTexture(opts: {
  nickname?: string;
  isCurrentUser?: boolean;
  isAdmin?: boolean;
  isMicOn?: boolean;
  isSpeaking?: boolean;
  isMicMuted?: boolean;
  isFirstPersonPov?: boolean;
}): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const safeName = opts.nickname && opts.nickname.trim().length > 0 ? opts.nickname.trim() : 'Khán giả';
  const key = `${safeName}|${opts.isCurrentUser ? 1 : 0}|${opts.isAdmin ? 1 : 0}|${opts.isMicOn ? 1 : 0}|${opts.isSpeaking ? 1 : 0}|${opts.isMicMuted ? 1 : 0}`;

  let tex = headTagTextureCache.get(key);
  if (!tex) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.clearRect(0, 0, 512, 128);

      const x = 16, y = 20, w = 480, h = 88, r = 44;

      // Nền bóng mờ (Drop Shadow)
      ctx.shadowColor = opts.isCurrentUser ? 'rgba(251, 191, 36, 0.55)' : 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = opts.isCurrentUser ? 24 : 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;

      // Đường bo góc pill
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();

      // Nền pill
      if (opts.isCurrentUser) {
        ctx.fillStyle = '#fbbf24'; // Màu vàng nổi bật cho chính mình
      } else if (opts.isAdmin) {
        ctx.fillStyle = '#1e293b';
      } else {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)'; // Slate 900 đậm đà
      }
      ctx.fill();

      // Viền pill
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = opts.isCurrentUser || opts.isAdmin ? 6 : 4;
      if (opts.isCurrentUser) {
        ctx.strokeStyle = '#fef08a';
      } else if (opts.isAdmin) {
        ctx.strokeStyle = '#f59e0b';
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      }
      ctx.stroke();

      // Nội dung text & icon
      let prefix = '';
      if (opts.isAdmin) prefix += '👑 ';
      if (opts.isMicMuted) prefix += '🔇 ';
      else if (opts.isSpeaking) prefix += '🎙️🟢 ';
      else if (opts.isMicOn) prefix += '🎙️ ';

      const label = opts.isCurrentUser ? `${prefix}${safeName} (Bạn)` : `${prefix}${safeName}`;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (opts.isCurrentUser) {
        ctx.fillStyle = '#0f172a'; // Chữ đen đậm trên nền vàng
      } else if (opts.isAdmin) {
        ctx.fillStyle = '#fbbf24'; // Chữ vàng hoàng gia cho Host
      } else {
        ctx.fillStyle = '#ffffff'; // Chữ trắng sắc nét
      }

      let fontSize = 38;
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
      while (ctx.measureText(label).width > 440 && fontSize > 20) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
      }

      ctx.fillText(label, 256, 64);

      tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.anisotropy = 4;
      headTagTextureCache.set(key, tex);
    } catch {
      return null;
    }
  }
  return tex;
}

/**
 * Tạo nhãn vải tên người dùng in trên lưng áo (Cloth Nametag Patch)
 * Nền vải trắng sáng bo góc với chữ đen đậm nét chuẩn xác theo Screenshot 1 & 2
 */
function getNameTexture(name?: string | null): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const safeName = typeof name === 'string' && name.trim().length > 0 ? name.trim() : '?';
  let tex = nameTextureCache.get(safeName);
  if (!tex) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.clearRect(0, 0, 256, 64);

      // Nền nhãn vải trắng ngà bo góc nhẹ
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;

      const x = 6, y = 6, w = 244, h = 52, r = 12;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tên chữ màu xám đen đậm
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let size = 30;
      ctx.font = `800 ${size}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
      while (ctx.measureText(safeName).width > 220 && size > 16) {
        size -= 2;
        ctx.font = `800 ${size}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
      }
      ctx.fillText(safeName, 128, 33);

      tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      nameTextureCache.set(safeName, tex);
    } catch {
      return null;
    }
  }
  return tex;
}

const SKIN_TONES = ['#f6d1b0', '#eec19b', '#d9a77e', '#f2cfae'];
const HAIR_COLORS = ['#25170d', '#3b2010', '#17171b', '#4b2e1a', '#2d1b12'];
const PANTS_COLORS = ['#2b3139', '#232a35', '#33363d', '#2a2f2c'];

// Bảng màu pastel nhẹ nhàng của áo thun chibi (Screenshot 1 & 2)
const PASTEL_SHIRTS = ['#a7f3d0', '#bfdbfe', '#ddd6fe', '#fed7aa', '#fef08a', '#fbcfe8'];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Chibi low-poly người xem và biểu diễn.
 * Nhân vật nhìn về phía -z (màn chiếu); lưng áo quay về +z nên camera phía sau
 * sẽ thấy mái tóc gọn gàng, áo pastel và nhãn tên in trên lưng áo.
 */
export function WeTubeAvatar({
  nickname,
  shirtColor,
  position,
  rotation = [0, 0, 0],
  isDancing = false,
  isCurrentUser = false,
  isFirstPersonPov = false,
  seatId,
  activeBubble,
  isAdmin = false,
  isMicOn = false,
  isSpeaking = false,
  isMicMuted = false,
}: WeTubeAvatarProps) {
  const hideSelfHeadInPov = isCurrentUser && isFirstPersonPov;
  const look = useMemo(() => {
    const h = hashString(nickname || 'x');
    const defaultColor = PASTEL_SHIRTS[h % PASTEL_SHIRTS.length];
    return {
      skin: SKIN_TONES[h % SKIN_TONES.length],
      hair: HAIR_COLORS[(h >> 3) % HAIR_COLORS.length],
      pants: PANTS_COLORS[(h >> 6) % PANTS_COLORS.length],
      shirt: shirtColor || defaultColor,
      style: (h >> 9) % 3,
      phase: (h % 628) / 100,
    };
  }, [nickname, shirtColor]);

  const nameTexture = useMemo(() => getNameTexture(nickname || '?'), [nickname]);

  const headNametagTexture = useMemo(
    () =>
      getHeadNametagTexture({
        nickname,
        isCurrentUser,
        isAdmin,
        isMicOn,
        isSpeaking,
        isMicMuted,
      }),
    [nickname, isCurrentUser, isAdmin, isMicOn, isSpeaking, isMicMuted]
  );

  const bodyRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!isDancing || !bodyRef.current) return;
    const t = clock.getElapsedTime() * 5.5 + look.phase;
    bodyRef.current.position.y = 0.38 + Math.abs(Math.sin(t)) * 0.06;
    bodyRef.current.rotation.z = Math.sin(t * 0.5) * 0.05;
    if (leftArmRef.current) leftArmRef.current.rotation.z = -(2.35 + Math.sin(t) * 0.4);
    if (rightArmRef.current) rightArmRef.current.rotation.z = 2.35 + Math.sin(t + Math.PI) * 0.4;
  });

  const skin = mat(look.skin, 0.6);
  const hair = mat(look.hair, 0.9);
  const shirt = mat(look.shirt, 0.7);
  const pants = mat(look.pants, 0.85);
  const shoes = mat('#0d0f12', 0.5);

  const armRestX = isDancing ? 0 : 0.5;

  return (
    <group position={position} rotation={rotation}>
      <group ref={bodyRef} position={[0, isDancing ? 0.38 : 0, 0]}>
        {/* ── Chân ── */}
        {isDancing ? (
          <>
            {[-0.1, 0.1].map((x) => (
              <React.Fragment key={x}>
                <mesh geometry={boxGeo} material={pants} position={[x, -0.14, 0]} scale={[0.15, 0.5, 0.17]} />
                <mesh geometry={boxGeo} material={shoes} position={[x, -0.4, -0.03]} scale={[0.16, 0.08, 0.24]} />
              </React.Fragment>
            ))}
          </>
        ) : (
          <>
            <mesh geometry={boxGeo} material={pants} position={[0, 0.07, 0.02]} scale={[0.4, 0.14, 0.32]} />
            {[-0.1, 0.1].map((x) => (
              <React.Fragment key={x}>
                <mesh geometry={boxGeo} material={pants} position={[x, 0.07, -0.2]} scale={[0.15, 0.14, 0.34]} />
                <mesh geometry={boxGeo} material={pants} position={[x, -0.12, -0.36]} scale={[0.14, 0.34, 0.14]} />
                <mesh geometry={boxGeo} material={shoes} position={[x, -0.31, -0.39]} scale={[0.15, 0.07, 0.22]} />
              </React.Fragment>
            ))}
          </>
        )}

        {/* ── Thân + áo thun pastel ── */}
        <mesh geometry={boxGeo} material={shirt} position={[0, 0.4, 0.04]} scale={[0.44, 0.52, 0.28]} />

        {/* ── Nhãn tên vải in sau lưng áo chuẩn Screenshot 1 ── */}
        {nameTexture && (
          <mesh position={[0, 0.46, 0.185]}>
            <planeGeometry args={[0.38, 0.11]} />
            <meshBasicMaterial map={nameTexture} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        )}

        {/* ── Tay ── */}
        <group ref={leftArmRef} position={[-0.28, 0.62, 0.04]} rotation={[armRestX, 0, 0]}>
          <mesh geometry={boxGeo} material={shirt} position={[0, -0.1, 0]} scale={[0.11, 0.22, 0.13]} />
          <mesh geometry={boxGeo} material={skin} position={[0, -0.27, 0]} scale={[0.09, 0.14, 0.1]} />
        </group>
        <group ref={rightArmRef} position={[0.28, 0.62, 0.04]} rotation={[armRestX, 0, 0]}>
          <mesh geometry={boxGeo} material={shirt} position={[0, -0.1, 0]} scale={[0.11, 0.22, 0.13]} />
          <mesh geometry={boxGeo} material={skin} position={[0, -0.27, 0]} scale={[0.09, 0.14, 0.1]} />
        </group>

        {/* ── Đầu chibi gọn gàng & Mũ Noel (Ẩn cho chính người dùng khi ở chế độ góc nhìn POV thứ nhất để không che màn hình) ── */}
        {!hideSelfHeadInPov && (
          <>
            <mesh geometry={sphereGeo} material={skin} position={[0, 0.94, 0.03]} scale={0.27} />
            {/* Mái tóc màu tối bóng mượt */}
            <mesh geometry={sphereGeo} material={hair} position={[0, 0.98, 0.09]} scale={[0.285, 0.275, 0.285]} />
            {look.style === 1 && (
              <mesh geometry={boxGeo} material={hair} position={[0, 0.7, 0.2]} scale={[0.5, 0.42, 0.12]} />
            )}

            {/* ── Mũ Ông Già Noel (Santa Hat 3D) ── */}
            <group position={[0, 1.15, 0.06]} rotation={[0.1, 0, -0.08]}>
              {/* Viền bông trắng quanh trán */}
              <mesh geometry={santaBrimGeo} material={mat('#f8fafc', 0.65)} rotation={[Math.PI / 2, 0, 0]} />
              {/* Chóp mũ đỏ Giáng Sinh */}
              <mesh geometry={santaConeGeo} material={mat('#dc2626', 0.5)} position={[0, 0.2, 0]} />
              {/* Cục bông trắng tròn trên chóp mũ */}
              <mesh geometry={sphereGeo} material={mat('#ffffff', 0.55)} position={[0, 0.42, 0]} scale={0.072} />
            </group>
          </>
        )}

        {/* Khuôn mặt (khi đứng trên sân khấu quay mặt về khán giả) */}
        {isDancing && !hideSelfHeadInPov && (
          <>
            <mesh geometry={sphereGeo} material={mat('#111318', 0.4)} position={[-0.09, 0.93, -0.235]} scale={0.03} />
            <mesh geometry={sphereGeo} material={mat('#111318', 0.4)} position={[0.09, 0.93, -0.235]} scale={0.03} />
            <mesh geometry={sphereGeo} material={mat('#e58d8d', 0.7)} position={[0, 0.86, -0.25]} scale={[0.05, 0.02, 0.02]} />
          </>
        )}
      </group>

      {/* ── Bảng tên người dùng 3D Native Sprite nổi trên đầu (Luôn hướng về camera, không bị khuất, ẩn khi tự nhìn POV) ── */}
      {headNametagTexture && !hideSelfHeadInPov && (
        <sprite position={[0, isDancing ? 2.18 : 1.76, 0]} scale={[1.4, 0.35, 1]}>
          <spriteMaterial
            map={headNametagTexture}
            transparent
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      )}

      {/* ── Bong bóng thoại tròn màu trắng ngà nổi ngay phía trên đầu ── */}
      {activeBubble && (
        <SafeHtml
          position={[0, isDancing ? 2.5 : 2.08, 0.05]}
          center
          distanceFactor={14}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div className="flex flex-col items-center select-none pointer-events-none max-w-[240px]">
            <div className="bg-[#edf1ed] text-[#0f172a] font-bold text-xs px-3.5 py-2 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.65)] border border-white/90 leading-snug whitespace-pre-wrap break-words text-center">
              {activeBubble.message}
            </div>
            {/* Mũi tên tam giác chỉ xuống đầu nhân vật */}
            <div
              className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] -mt-[1px]"
              style={{ borderTopColor: '#edf1ed' }}
            />
          </div>
        </SafeHtml>
      )}
    </group>
  );
}
