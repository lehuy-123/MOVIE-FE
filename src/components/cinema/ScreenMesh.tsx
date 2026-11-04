'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface ScreenMeshProps {
  width?: number;
  height?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  isDimmed?: boolean;
  isPlaying?: boolean;
  onScreenTransform?: (
    outerTransform: string,
    innerTransform: string,
    perspective: string,
    isVisible: boolean
  ) => void;
}

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();

const epsilon = (value: number) => (Math.abs(value) < 1e-10 ? 0 : value);

function getCSSMatrix(matrix: THREE.Matrix4, multipliers: number[], prepend = '') {
  let matrix3d = 'matrix3d(';
  for (let i = 0; i !== 16; i++) {
    matrix3d += epsilon(multipliers[i] * matrix.elements[i]) + (i !== 15 ? ',' : ')');
  }
  return prepend + matrix3d;
}

const cameraMultipliers = [1, -1, 1, 1, 1, -1, 1, 1, 1, -1, 1, 1, 1, -1, 1, 1];
const objectMultipliers = (f: number) => [
  1 / f, 1 / f, 1 / f, 1,
  -1 / f, -1 / f, -1 / f, -1,
  1 / f, 1 / f, 1 / f, 1,
  1, 1, 1, 1
];

function getCameraCSSMatrix(matrix: THREE.Matrix4) {
  return getCSSMatrix(matrix, cameraMultipliers);
}

function getObjectCSSMatrix(matrix: THREE.Matrix4, factor: number) {
  return getCSSMatrix(matrix, objectMultipliers(factor), 'translate(-50%,-50%)');
}

/** Tạo texture vệt sáng hào quang dịu mắt toả ra xung quanh 4 cạnh màn chiếu */
function useScreenHaloTexture(): THREE.CanvasTexture | null {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const w = 512;
    const h = 288;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, w, h);

    // Vẽ hào quang toả sáng vàng ấm dịu mắt từ mép màn chiếu ra ngoài
    const grad = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.28,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.52
    );
    grad.addColorStop(0, 'rgba(254, 215, 170, 0.32)');
    grad.addColorStop(0.35, 'rgba(251, 191, 36, 0.14)');
    grad.addColorStop(0.7, 'rgba(217, 119, 6, 0.05)');
    grad.addColorStop(1, 'rgba(180, 83, 9, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** Tạo texture chữ 'LEHUY' màu bạc trắng in nổi trên viền dưới màn chiếu */
function useBrandingTexture(): THREE.CanvasTexture | null {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 512, 64);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.75)';
    ctx.shadowBlur = 8;
    ctx.font = "900 32px 'Inter', system-ui, -apple-system, sans-serif";
    try {
      // @ts-ignore
      ctx.letterSpacing = '10px';
    } catch {
      // ignore
    }
    ctx.fillText('LEHUY', 256, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

export function ScreenMesh({
  width = 27.2,             // Kích thước IMAX mở rộng (16:9)
  height = 15.3,            // Kích thước IMAX mở rộng (16:9)
  position = [0, 9.4, -10.4],
  rotation = [0, 0, 0],
  isDimmed = true,
  isPlaying = true,
  onScreenTransform,
}: ScreenMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowLightRef = useRef<THREE.PointLight>(null);
  const spotGlowRef = useRef<THREE.SpotLight>(null);
  const ambientGlowRef = useRef<THREE.PointLight>(null);
  const brandingTex = useBrandingTexture();
  const haloTex = useScreenHaloTexture();

  const bezelThickness = 0.22;
  const bottomBezelHeight = 0.62;

  // Đồng bộ vị trí 3D màn chiếu sang ma trận CSS 3D mỗi frame
  useFrame((state) => {
    const { camera, size } = state;
    if (groupRef.current && onScreenTransform) {
      camera.updateMatrixWorld();
      groupRef.current.updateWorldMatrix(true, false);

      const matrix = groupRef.current.matrixWorld;
      const camPos = camera.position;
      const objPos = v1.setFromMatrixPosition(matrix);
      const deltaCamObj = objPos.sub(camPos);
      const camDir = camera.getWorldDirection(v2);
      const isBehindCamera = deltaCamObj.angleTo(camDir) > Math.PI / 2;

      if (isBehindCamera) {
        onScreenTransform('', '', '', false);
      } else {
        const widthHalf = size.width / 2;
        const heightHalf = size.height / 2;
        const fov = camera.projectionMatrix.elements[5] * heightHalf;
        const cameraMatrix = getCameraCSSMatrix(camera.matrixWorldInverse);
        const cameraTransform = `translateZ(${fov}px)`;

        const distanceFactor = (width / 1920) * 400;
        const outerTransform = `${cameraTransform}${cameraMatrix}translate(${widthHalf}px,${heightHalf}px)`;
        const innerTransform = getObjectCSSMatrix(matrix, 1 / (distanceFactor / 400));
        const perspective = `${fov}px`;

        onScreenTransform(outerTransform, innerTransform, perspective, true);
      }
    }

    // Ánh sáng màn chiếu vàng ấm êm dịu, ổn định 60fps (không dao động gây giật khung hình)
    const targetGlow = isPlaying ? (isDimmed ? 1.6 : 0.9) : 0.5;
    const targetSpot = isPlaying ? (isDimmed ? 2.2 : 1.0) : 0.8;
    const targetAmbient = isPlaying ? (isDimmed ? 0.6 : 0.25) : 0.2;

    if (glowLightRef.current && Math.abs(glowLightRef.current.intensity - targetGlow) > 0.01) {
      glowLightRef.current.intensity = THREE.MathUtils.lerp(glowLightRef.current.intensity, targetGlow, 0.08);
    }
    if (spotGlowRef.current && Math.abs(spotGlowRef.current.intensity - targetSpot) > 0.01) {
      spotGlowRef.current.intensity = THREE.MathUtils.lerp(spotGlowRef.current.intensity, targetSpot, 0.08);
    }
    if (ambientGlowRef.current && Math.abs(ambientGlowRef.current.intensity - targetAmbient) > 0.01) {
      ambientGlowRef.current.intensity = THREE.MathUtils.lerp(ambientGlowRef.current.intensity, targetAmbient, 0.08);
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} name="imax-flat-screen-rig">
      {/* 0. Vệt sáng hào quang vàng ấm dịu mắt toả ra xung quanh màn chiếu hắt lên tường rạp */}
      {haloTex && (
        <mesh position={[0, (bezelThickness - bottomBezelHeight) / 4, -0.15]}>
          <planeGeometry args={[width + 3.8, height + 2.8]} />
          <meshBasicMaterial
            map={haloTex}
            transparent
            opacity={isDimmed ? (isPlaying ? 0.22 : 0.12) : 0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* 1. Khung viền màn chiếu phẳng IMAX nguyên bản (Cinema Bezel) */}
      {/* Khung sau màn hình */}
      <mesh position={[0, 0, -0.07]}>
        <boxGeometry args={[width + 0.6, height + 0.6, 0.14]} />
        <meshStandardMaterial color="#0a0e17" roughness={0.6} metalness={0.5} />
      </mesh>

      {/* Viền trên */}
      <mesh position={[0, height / 2 + bezelThickness / 2, 0.02]}>
        <boxGeometry args={[width + 0.6, bezelThickness, 0.1]} />
        <meshStandardMaterial color="#111827" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Viền trái */}
      <mesh position={[-width / 2 - bezelThickness / 2, 0, 0.02]}>
        <boxGeometry args={[bezelThickness, height + 0.6, 0.1]} />
        <meshStandardMaterial color="#111827" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Viền phải */}
      <mesh position={[width / 2 + bezelThickness / 2, 0, 0.02]}>
        <boxGeometry args={[bezelThickness, height + 0.6, 0.1]} />
        <meshStandardMaterial color="#111827" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Viền dưới dày hơn mang thương hiệu LEHUY */}
      <mesh position={[0, -height / 2 - bottomBezelHeight / 2, 0.02]}>
        <boxGeometry args={[width + 0.6, bottomBezelHeight, 0.12]} />
        <meshStandardMaterial color="#111827" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Logo chữ 'LEHUY' màu bạc trắng in chính giữa viền dưới màn hình */}
      {brandingTex && (
        <mesh position={[0, -height / 2 - bottomBezelHeight / 2, 0.09]}>
          <planeGeometry args={[4.2, 0.54]} />
          <meshBasicMaterial map={brandingTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {/* 1.5. Đường chỉ viền vàng ấm siêu mảnh (Gold Hairline Rim) sang trọng, tự nhiên */}
      {/* Viền chỉ trên */}
      <mesh position={[0, height / 2 + 0.008, 0.035]}>
        <boxGeometry args={[width + 0.02, 0.015, 0.02]} />
        <meshBasicMaterial
          color="#fde68a"
          transparent
          opacity={isDimmed ? 0.42 : 0.28}
          toneMapped={false}
        />
      </mesh>

      {/* Viền chỉ dưới (sát trên logo LEHUY) */}
      <mesh position={[0, -height / 2 - 0.008, 0.035]}>
        <boxGeometry args={[width + 0.02, 0.015, 0.02]} />
        <meshBasicMaterial
          color="#fde68a"
          transparent
          opacity={isDimmed ? 0.42 : 0.28}
          toneMapped={false}
        />
      </mesh>

      {/* Viền chỉ trái */}
      <mesh position={[-width / 2 - 0.008, 0, 0.035]}>
        <boxGeometry args={[0.015, height + 0.02, 0.02]} />
        <meshBasicMaterial
          color="#fde68a"
          transparent
          opacity={isDimmed ? 0.42 : 0.28}
          toneMapped={false}
        />
      </mesh>

      {/* Viền chỉ phải */}
      <mesh position={[width / 2 + 0.008, 0, 0.035]}>
        <boxGeometry args={[0.015, height + 0.02, 0.02]} />
        <meshBasicMaterial
          color="#fde68a"
          transparent
          opacity={isDimmed ? 0.42 : 0.28}
          toneMapped={false}
        />
      </mesh>

      {/* 2. Mặt nền màn chiếu phẳng khi chưa bật video */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#050608"
          roughness={0.2}
          metalness={0.1}
          emissive="#0b1320"
          emissiveIntensity={isPlaying ? 0.15 : 0.05}
        />
      </mesh>

      {/* 3. Hệ thống ánh sáng màn chiếu vàng ấm nhẹ nhàng, sang trọng */}
      <pointLight
        ref={glowLightRef}
        position={[0, -1, 2.0]}
        color={isPlaying ? '#fef3c7' : '#475569'}
        intensity={isDimmed ? 1.6 : 0.9}
        distance={24}
        decay={1.8}
      />

      <spotLight
        ref={spotGlowRef}
        position={[0, 0, 2.5]}
        target-position={[0, -5, 12]}
        color={isPlaying ? '#fed7aa' : '#334155'}
        intensity={isDimmed ? 2.2 : 1.0}
        angle={Math.PI / 2.5}
        penumbra={0.9}
        distance={26}
        decay={1.6}
      />

      <pointLight
        ref={ambientGlowRef}
        position={[0, 0, -1.0]}
        color={isPlaying ? '#f59e0b' : '#1e293b'}
        intensity={isDimmed ? 0.6 : 0.25}
        distance={14}
        decay={2.0}
      />
    </group>
  );
}

// Re-export type handle
export type ScreenMeshHandle = import('./CinemaScreenOverlay').CinemaScreenOverlayHandle;
