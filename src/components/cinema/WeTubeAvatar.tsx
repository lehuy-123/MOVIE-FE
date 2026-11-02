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
  activeBubble?: ChatMessage;
}

/* ──────────────── Shared geometry / material caches ────────────────
 * ~100 avatars share the same unit geometries and per-colour materials so the
 * GPU only holds a handful of buffers instead of thousands.
 */
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.SphereGeometry(1, 20, 14);

const materialCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color?: string | null, roughness = 0.75): THREE.MeshStandardMaterial {
  const safeColor = (typeof color === 'string' && color.trim().length > 0) ? color.trim() : '#3b82f6';
  const key = `${safeColor}|${roughness}`;
  let m = materialCache.get(key);
  if (!m) {
    try {
      m = new THREE.MeshStandardMaterial({ color: safeColor, roughness });
    } catch {
      m = new THREE.MeshStandardMaterial({ color: '#3b82f6', roughness });
    }
    materialCache.set(key, m);
  }
  return m;
}

const nameTextureCache = new Map<string, THREE.CanvasTexture>();
/** Tên in trên lưng áo (texture nhẹ, thay cho DOM overlay). */
function getNameTexture(name?: string | null): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const safeName = (typeof name === 'string' && name.trim().length > 0) ? name.trim() : '?';
  let tex = nameTextureCache.get(safeName);
  if (!tex) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.clearRect(0, 0, 256, 64);
      ctx.fillStyle = 'rgba(20, 24, 20, 0.82)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let size = 38;
      ctx.font = `800 ${size}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
      while (ctx.measureText(safeName).width > 236 && size > 14) {
        size -= 2;
        ctx.font = `800 ${size}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
      }
      ctx.fillText(safeName, 128, 34);
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

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Chibi low-poly. Gốc toạ độ = mặt trên đệm ghế (ngồi) hoặc mặt sàn (đứng, khi `isDancing`).
 * Nhân vật nhìn về phía -z (màn chiếu); lưng áo quay về +z nên từ camera phía sau
 * sẽ thấy tóc, vai áo và tên in trên lưng.
 */
export function WeTubeAvatar({
  nickname,
  shirtColor = '#b9cf8f',
  position,
  rotation = [0, 0, 0],
  isDancing = false,
  isCurrentUser = false,
  activeBubble,
}: WeTubeAvatarProps) {
  const look = useMemo(() => {
    const h = hashString(nickname || 'x');
    return {
      skin: SKIN_TONES[h % SKIN_TONES.length],
      hair: HAIR_COLORS[(h >> 3) % HAIR_COLORS.length],
      pants: PANTS_COLORS[(h >> 6) % PANTS_COLORS.length],
      style: (h >> 9) % 3, // 0 ngắn, 1 dài, 2 búi
      phase: (h % 628) / 100,
    };
  }, [nickname]);

  const nameTexture = useMemo(() => getNameTexture(nickname || '?'), [nickname]);

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
  const shirt = mat(shirtColor, 0.7);
  const pants = mat(look.pants, 0.85);
  const shoes = mat('#0d0f12', 0.5);

  const armRestX = isDancing ? 0 : 0.5; // ngồi: tay đặt hơi chìa về phía trước

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
            {/* Mông + đùi đặt ngang trên đệm, cẳng chân buông xuống */}
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

        {/* ── Thân + áo thun ── */}
        <mesh geometry={boxGeo} material={shirt} position={[0, 0.4, 0.04]} scale={[0.44, 0.52, 0.28]} />
        {/* Tên in trên lưng áo */}
        {nameTexture && (
          <mesh position={[0, 0.5, 0.186]}>
            <planeGeometry args={[0.4, 0.1]} />
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

        {/* ── Đầu chibi (to, tròn) ── */}
        <mesh geometry={sphereGeo} material={skin} position={[0, 0.94, 0.03]} scale={0.27} />
        {/* Tóc: phủ đỉnh đầu + sau gáy, chừa mặt phía trước */}
        <mesh geometry={sphereGeo} material={hair} position={[0, 0.98, 0.09]} scale={[0.285, 0.275, 0.285]} />
        {look.style === 1 && (
          <mesh geometry={boxGeo} material={hair} position={[0, 0.7, 0.2]} scale={[0.5, 0.42, 0.12]} />
        )}
        {look.style === 2 && (
          <mesh geometry={sphereGeo} material={hair} position={[0, 1.27, 0.1]} scale={0.1} />
        )}
        {/* Mặt (chỉ cần khi nhân vật quay mặt về khán giả) */}
        {isDancing && (
          <>
            <mesh geometry={sphereGeo} material={mat('#111318', 0.4)} position={[-0.09, 0.93, -0.235]} scale={0.03} />
            <mesh geometry={sphereGeo} material={mat('#111318', 0.4)} position={[0.09, 0.93, -0.235]} scale={0.03} />
            <mesh geometry={sphereGeo} material={mat('#e58d8d', 0.7)} position={[0, 0.86, -0.25]} scale={[0.05, 0.02, 0.02]} />
          </>
        )}

        {/* Vòng sáng cho nhân vật của bạn */}
        {isCurrentUser && (
          <mesh position={[0, 1.34, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.13, 0.015, 8, 24]} />
            <meshBasicMaterial color="#d8f95f" toneMapped={false} />
          </mesh>
        )}
      </group>

      {/* ── Bong bóng thoại tròn màu trắng ngà nổi ngay phía trên ghế (5s) ── */}
      {activeBubble && (
        <SafeHtml
          position={[0, 1.85, 0.05]}
          center
          distanceFactor={14}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div className="flex flex-col items-center animate-chat-bubble select-none">
            <div
              className="relative max-w-xs rounded-2xl px-3.5 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.55)] border border-white/90 flex flex-col items-center gap-0.5 text-center transition-all"
              style={{
                backgroundColor: '#edf1ed', // Màu trắng ngà WeTube Ciné
                color: '#0f172a',
              }}
            >
              {!activeBubble.message.startsWith('Đã chọn') && (
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: shirtColor }} />
                  <span className="font-extrabold text-[10.5px] text-emerald-800">
                    {nickname}
                  </span>
                  {isCurrentUser && <span className="text-[9px] text-lime-700 font-bold">(Bạn)</span>}
                </div>
              )}
              <p className="text-xs font-bold leading-snug text-[#0f172a] break-words whitespace-nowrap">
                {activeBubble.message}
              </p>
            </div>
            {/* Mũi tên nhọn trỏ xuống ghế / đầu nhân vật */}
            <div
              className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] -mt-[1px]"
              style={{ borderTopColor: '#edf1ed' }}
            />
          </div>

          <style jsx>{`
            @keyframes chatBubbleLifecycle {
              0% { opacity: 0; transform: scale(0.65) translateY(12px); }
              8% { opacity: 1; transform: scale(1.05) translateY(-2px); }
              14% { transform: scale(1) translateY(0); }
              82% { opacity: 1; transform: scale(1) translateY(0); }
              100% { opacity: 0; transform: scale(0.85) translateY(-14px); }
            }
            .animate-chat-bubble {
              animation: chatBubbleLifecycle 5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
            }
          `}</style>
        </SafeHtml>
      )}
    </group>
  );
}
