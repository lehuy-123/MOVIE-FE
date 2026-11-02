'use client';

import React, { useRef } from 'react';
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

export function ScreenMesh({
  width = 26,              // Giant IMAX width
  height = 14.625,         // Giant IMAX height (16:9)
  position = [0, 8.5, -10],
  rotation = [0, 0, 0],
  isDimmed = false,
  isPlaying = true,
  onScreenTransform,
}: ScreenMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowLightRef = useRef<THREE.PointLight>(null);
  const spotGlowRef = useRef<THREE.SpotLight>(null);
  const ambientGlowRef = useRef<THREE.PointLight>(null);

  // Synchronize 3D screen position into CSS 3D matrix every frame
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

    // Dynamic ambilight flicker
    const time = state.clock.getElapsedTime();
    if (isPlaying) {
      const flicker = Math.sin(time * 2.8) * 0.35 + Math.cos(time * 5.7) * 0.2;
      const baseIntensity = isDimmed ? 5.5 : 4.0;

      if (glowLightRef.current) {
        glowLightRef.current.intensity = baseIntensity + flicker;
      }
      if (spotGlowRef.current) {
        spotGlowRef.current.intensity = baseIntensity * 1.5 + flicker * 1.8;
      }
      if (ambientGlowRef.current) {
        ambientGlowRef.current.intensity = 2.0 + flicker * 0.5;
      }
    } else {
      if (glowLightRef.current) {
        glowLightRef.current.intensity = THREE.MathUtils.lerp(
          glowLightRef.current.intensity,
          0.9,
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
          0.5,
          0.05
        );
      }
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} name="imax-screen-rig">
      {/* 1. Khung viền màn chiếu màu đen mờ sang trọng */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[width + 0.8, height + 0.8, 0.4]} />
        <meshStandardMaterial color="#020305" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* 2. Mặt lưng màn chiếu */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#050608"
          roughness={0.15}
          metalness={0.1}
          emissive="#0e1726"
          emissiveIntensity={isPlaying ? 0.35 : 0.05}
        />
      </mesh>

      {/* 3. Dải viền Ambilight phía sau khung màn chiếu */}
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[width + 1.2, height + 1.2]} />
        <meshBasicMaterial
          color={isPlaying ? '#60a5fa' : '#334155'}
          transparent
          opacity={isPlaying ? 0.75 : 0.25}
        />
      </mesh>

      {/* 4. Hệ thống ánh sáng màn chiếu hắt ra khắp rạp */}
      <pointLight
        ref={glowLightRef}
        position={[0, 0, 2.5]}
        color={isPlaying ? '#93c5fd' : '#475569'}
        intensity={3.5}
        distance={35}
        decay={1.6}
      />

      <spotLight
        ref={spotGlowRef}
        position={[0, -2, 3]}
        color={isPlaying ? '#60a5fa' : '#334155'}
        intensity={5.0}
        angle={Math.PI / 2.5}
        penumbra={0.8}
        distance={38}
        decay={1.3}
      />

      <pointLight
        ref={ambientGlowRef}
        position={[0, 0, -1.5]}
        color={isPlaying ? '#3b82f6' : '#1e293b'}
        intensity={1.8}
        distance={20}
        decay={2}
      />
    </group>
  );
}

// Re-export type handle
export type ScreenMeshHandle = import('./CinemaScreenOverlay').CinemaScreenOverlayHandle;
