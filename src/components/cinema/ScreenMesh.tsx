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

/** Tạo texture chữ 'WETUBE CINÉ' màu bạc trắng in nổi trên viền dưới màn chiếu */
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
    ctx.fillStyle = '#cbd5e1';
    ctx.font = "900 28px 'Inter', system-ui, -apple-system, sans-serif";
    try {
      // @ts-ignore
      ctx.letterSpacing = '8px';
    } catch {
      // ignore
    }
    ctx.fillText('WETUBE CINÉ', 256, 34);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

export function ScreenMesh({
  width = 25,              // Chuẩn 16:9 cinema width
  height = 14.0625,        // Chuẩn 16:9 cinema height
  position = [0, 9.3, -10.4],
  rotation = [0, 0, 0],
  isDimmed = false,
  isPlaying = true,
  onScreenTransform,
}: ScreenMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowLightRef = useRef<THREE.PointLight>(null);
  const spotGlowRef = useRef<THREE.SpotLight>(null);
  const ambientGlowRef = useRef<THREE.PointLight>(null);
  const brandingTex = useBrandingTexture();

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

    // Dynamic cinema ambilight flicker (Hiệu ứng ánh sáng màn chiếu trong trẻo, không bị chói mờ)
    const time = state.clock.getElapsedTime();
    if (isPlaying) {
      const flicker = Math.sin(time * 2.8) * 0.25 + Math.cos(time * 5.7) * 0.15;
      // Ánh sáng màn chiếu dịu nhẹ vừa phải, không làm mờ nhoè màn hình
      const baseGlow = isDimmed ? 3.0 : 1.5;
      const baseSpot = isDimmed ? 4.5 : 2.0;
      const baseAmbient = isDimmed ? 1.0 : 0.4;

      if (glowLightRef.current) {
        glowLightRef.current.intensity = baseGlow + flicker;
      }
      if (spotGlowRef.current) {
        spotGlowRef.current.intensity = baseSpot + flicker * 0.5;
      }
      if (ambientGlowRef.current) {
        ambientGlowRef.current.intensity = baseAmbient + flicker * 0.2;
      }
    } else {
      if (glowLightRef.current) {
        glowLightRef.current.intensity = THREE.MathUtils.lerp(
          glowLightRef.current.intensity,
          0.8,
          0.05
        );
      }
      if (spotGlowRef.current) {
        spotGlowRef.current.intensity = THREE.MathUtils.lerp(
          spotGlowRef.current.intensity,
          1.2,
          0.05
        );
      }
      if (ambientGlowRef.current) {
        ambientGlowRef.current.intensity = THREE.MathUtils.lerp(
          ambientGlowRef.current.intensity,
          0.3,
          0.05
        );
      }
    }
  });

  const bezelThickness = 0.22;
  const bottomBezelHeight = 0.62;

  return (
    <group ref={groupRef} position={position} rotation={rotation} name="imax-screen-rig">
      {/* 1. Khung viền màn chiếu rạp phim màu đen nhám (Cinema Bezel) */}
      {/* Mặt lưng màn chiếu */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[width + 0.6, height + 0.6, 0.2]} />
        <meshStandardMaterial color="#080a0e" roughness={0.85} metalness={0.2} />
      </mesh>

      {/* Viền trên */}
      <mesh position={[0, height / 2 + bezelThickness / 2, 0.02]}>
        <boxGeometry args={[width + 0.6, bezelThickness, 0.1]} />
        <meshStandardMaterial color="#090c12" roughness={0.8} />
      </mesh>

      {/* Viền trái */}
      <mesh position={[-width / 2 - bezelThickness / 2, 0, 0.02]}>
        <boxGeometry args={[bezelThickness, height + 0.6, 0.1]} />
        <meshStandardMaterial color="#090c12" roughness={0.8} />
      </mesh>

      {/* Viền phải */}
      <mesh position={[width / 2 + bezelThickness / 2, 0, 0.02]}>
        <boxGeometry args={[bezelThickness, height + 0.6, 0.1]} />
        <meshStandardMaterial color="#090c12" roughness={0.8} />
      </mesh>

      {/* Viền dưới dày hơn mang thương hiệu WETUBE CINÉ */}
      <mesh position={[0, -height / 2 - bottomBezelHeight / 2, 0.02]}>
        <boxGeometry args={[width + 0.6, bottomBezelHeight, 0.12]} />
        <meshStandardMaterial color="#090c12" roughness={0.8} />
      </mesh>

      {/* Logo chữ 'WETUBE CINÉ' màu bạc trắng in chính giữa viền dưới màn hình (Screenshot 1 & 2) */}
      {brandingTex && (
        <mesh position={[0, -height / 2 - bottomBezelHeight / 2 + 0.03, 0.09]}>
          <planeGeometry args={[4.2, 0.52]} />
          <meshBasicMaterial map={brandingTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {/* 2. Mặt nền màn chiếu khi chưa bật video */}
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

      {/* 3. Hệ thống ánh sáng màn chiếu hắt ra nhẹ nhàng, trong trẻo */}
      <pointLight
        ref={glowLightRef}
        position={[0, -1, 2.0]}
        color={isPlaying ? '#bae6fd' : '#475569'}
        intensity={isDimmed ? 3.0 : 1.5}
        distance={28}
        decay={1.8}
      />

      <spotLight
        ref={spotGlowRef}
        position={[0, 0, 2.5]}
        target-position={[0, -5, 12]}
        color={isPlaying ? '#93c5fd' : '#334155'}
        intensity={isDimmed ? 4.5 : 2.0}
        angle={Math.PI / 2.5}
        penumbra={0.9}
        distance={30}
        decay={1.6}
      />

      <pointLight
        ref={ambientGlowRef}
        position={[0, 0, -1.0]}
        color={isPlaying ? '#38bdf8' : '#1e293b'}
        intensity={isDimmed ? 1.0 : 0.4}
        distance={15}
        decay={2.0}
      />
    </group>
  );
}

// Re-export type handle
export type ScreenMeshHandle = import('./CinemaScreenOverlay').CinemaScreenOverlayHandle;
