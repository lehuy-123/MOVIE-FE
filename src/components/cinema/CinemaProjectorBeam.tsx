'use client';

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SCREEN, ROOM } from '@/lib/roomLayout';

interface CinemaProjectorBeamProps {
  isDimmed?: boolean;
}

/**
 * Hiệu ứng tia sáng máy chiếu điện ảnh từ buồng chiếu (Projection Booth) phía sau rạp
 * chiếu thẳng tới màn hình IMAX khi khán phòng BẬT ĐÈN (tắt hẳn khi TẮT ĐÈN).
 */
export function CinemaProjectorBeam({ isDimmed = true }: CinemaProjectorBeamProps) {
  const beamMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const lensGlowRef = useRef<THREE.MeshBasicMaterial>(null);

  // Vị trí cửa sổ buồng máy chiếu ở vách tường sau
  const boothZ = ROOM.zBack - 0.45; // ~20.55m
  const boothY = 15.2;
  const boothX = 0;

  // Tọa độ và kích thước màn chiếu IMAX
  const screenZ = SCREEN.z + 0.2; // ~ -10.2m
  const screenY = SCREEN.y;
  const screenW = SCREEN.width;
  const screenH = SCREEN.height;

  // Geometry của hình chóp cụt 4 cạnh (Frustum Volumetric Beam)
  const { geometry, beamTex } = useMemo(() => {
    const bw2 = 0.55;
    const bh2 = 0.31;
    const sw2 = screenW / 2;
    const sh2 = screenH / 2;

    // 4 đỉnh tại ống kính buồng chiếu (Z = boothZ):
    const TL = [-bw2, boothY + bh2, boothZ];
    const TR = [bw2, boothY + bh2, boothZ];
    const BR = [bw2, boothY - bh2, boothZ];
    const BL = [-bw2, boothY - bh2, boothZ];

    // 4 đỉnh tại khung màn chiếu IMAX (Z = screenZ):
    const STL = [-sw2, screenY + sh2, screenZ];
    const STR = [sw2, screenY + sh2, screenZ];
    const SBR = [sw2, screenY - sh2, screenZ];
    const SBL = [-sw2, screenY - sh2, screenZ];

    const positions: number[] = [];
    const uvs: number[] = [];

    function addQuad(
      p1: number[],
      p2: number[],
      p3: number[],
      p4: number[],
      u1: number,
      u2: number
    ) {
      positions.push(...p1, ...p2, ...p3);
      uvs.push(u1, 0, u1, 1, u2, 1);
      positions.push(...p1, ...p3, ...p4);
      uvs.push(u1, 0, u2, 1, u2, 0);
    }

    // 4 mặt bao quanh nón sáng máy chiếu
    addQuad(TL, TR, STR, STL, 0, 1);
    addQuad(BL, BR, SBR, SBL, 0, 1);
    addQuad(TL, BL, SBL, STL, 0, 1);
    addQuad(TR, BR, SBR, STR, 0, 1);
    // 2 mặt chéo bên trong tăng độ dày thể tích khi quan sát từ mọi góc
    addQuad(TL, BR, SBR, STL, 0, 1);
    addQuad(TR, BL, SBL, STR, 0, 1);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    // Texture chuyển sắc dịu nhẹ: rực rỡ ở ống kính và loang mờ dần về phía màn hình
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, 'rgba(255, 252, 242, 1.0)');
    grad.addColorStop(0.12, 'rgba(255, 246, 228, 0.65)');
    grad.addColorStop(0.4, 'rgba(245, 240, 230, 0.28)');
    grad.addColorStop(0.8, 'rgba(235, 240, 255, 0.12)');
    grad.addColorStop(1, 'rgba(220, 235, 255, 0.04)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    return { geometry: geo, beamTex: tex };
  }, [boothY, boothZ, screenH, screenW, screenY, screenZ]);

  // Object mục tiêu chiếu sáng cho Spotlight
  const targetObj = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0, screenY, screenZ);
    return obj;
  }, [screenY, screenZ]);

  // Chuyển đổi ánh sáng mượt mà (Lerp) khi bật / tắt đèn khán phòng
  useFrame((_, delta) => {
    const targetOpacity = isDimmed ? 0.0 : 0.13;
    const targetSpot = isDimmed ? 0.0 : 20.0;
    const targetLens = isDimmed ? 0.08 : 1.0;

    const lerpSpeed = Math.min(1, delta * 3.5);

    if (beamMatRef.current) {
      beamMatRef.current.opacity = THREE.MathUtils.lerp(
        beamMatRef.current.opacity,
        targetOpacity,
        lerpSpeed
      );
    }
    if (spotRef.current) {
      spotRef.current.intensity = THREE.MathUtils.lerp(
        spotRef.current.intensity,
        targetSpot,
        lerpSpeed
      );
    }
    if (lensGlowRef.current) {
      lensGlowRef.current.opacity = THREE.MathUtils.lerp(
        lensGlowRef.current.opacity,
        targetLens,
        lerpSpeed
      );
    }
  });

  return (
    <group>
      <primitive object={targetObj} />

      {/* 1. Khung cửa sổ buồng máy chiếu (Projection Booth Window) trên tường sau */}
      <group position={[boothX, boothY, boothZ + 0.1]}>
        {/* Khung kim loại đen dày */}
        <mesh>
          <boxGeometry args={[2.8, 1.6, 0.14]} />
          <meshStandardMaterial color="#080a0f" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Kính quang học máy chiếu */}
        <mesh position={[0, 0, -0.06]}>
          <planeGeometry args={[2.4, 1.2]} />
          <meshStandardMaterial color="#0b1320" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* Ống kính máy chiếu phát quang */}
        <mesh position={[0, 0, -0.07]}>
          <circleGeometry args={[0.32, 24]} />
          <meshBasicMaterial
            ref={lensGlowRef}
            color="#fff8e7"
            transparent
            opacity={isDimmed ? 0.08 : 1.0}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* 2. Tia sáng thể tích máy chiếu (Volumetric Projector Light Cone / Frustum) */}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          ref={beamMatRef}
          map={beamTex}
          color="#fff8e8"
          transparent
          opacity={isDimmed ? 0.0 : 0.13}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* 3. Đèn rọi máy chiếu thực tế từ buồng máy chiếu chiếu thẳng lên màn hình */}
      <spotLight
        ref={spotRef}
        position={[boothX, boothY, boothZ]}
        target={targetObj}
        color="#fffaf0"
        intensity={isDimmed ? 0 : 20}
        angle={Math.PI / 8.5}
        penumbra={0.7}
        distance={45}
        decay={1.6}
      />
    </group>
  );
}

