'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ROOM, ROOM_DEPTH } from '@/lib/roomLayout';

interface ChristmasDecorationsProps {
  isDimmed?: boolean;
}

// ── Shared static geometries & materials (Tối ưu GPU tối đa, tái sử dụng VBO) ──
const trunkGeo = new THREE.CylinderGeometry(0.28, 0.38, 1.1, 10);
const skirtGeo = new THREE.CylinderGeometry(1.45, 1.6, 0.06, 20);
const ornamentGeo = new THREE.SphereGeometry(0.11, 10, 10);
const fairyLightGeo = new THREE.SphereGeometry(0.055, 8, 8);
const starCoreGeo = new THREE.OctahedronGeometry(0.36, 0);
const giftBoxGeo = new THREE.BoxGeometry(1, 1, 1);
const wreathTorusGeo = new THREE.TorusGeometry(0.78, 0.22, 10, 22);
const wreathBowLoopGeo = new THREE.BoxGeometry(0.32, 0.16, 0.12);
const wreathBowTailGeo = new THREE.BoxGeometry(0.14, 0.45, 0.08);
const snowSphereGeo = new THREE.SphereGeometry(1, 14, 14);
const carrotGeo = new THREE.ConeGeometry(0.055, 0.28, 8);
const candyStickGeo = new THREE.CylinderGeometry(0.065, 0.065, 1.1, 10);
const candyHookGeo = new THREE.TorusGeometry(0.18, 0.065, 8, 14, Math.PI);

const trunkMat = new THREE.MeshStandardMaterial({ color: '#4a2c18', roughness: 0.85 });
const pineDarkMat = new THREE.MeshStandardMaterial({ color: '#0d4a26', roughness: 0.75 });
const pineMidMat = new THREE.MeshStandardMaterial({ color: '#125e32', roughness: 0.72 });
const pineLightMat = new THREE.MeshStandardMaterial({ color: '#17733e', roughness: 0.7 });
const snowWhiteMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.55 });
const redVelvetMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.45, metalness: 0.15 });
const goldMetallicMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.25, metalness: 0.85 });
const coalMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4 });
const carrotMat = new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.5 });

const emissiveGoldMat = new THREE.MeshBasicMaterial({ color: '#fde047', toneMapped: false });
const emissiveRedMat = new THREE.MeshBasicMaterial({ color: '#ff3b3b', toneMapped: false });
const emissiveGreenMat = new THREE.MeshBasicMaterial({ color: '#34d399', toneMapped: false });
const emissiveCyanMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', toneMapped: false });
const emissiveWarmMat = new THREE.MeshBasicMaterial({ color: '#ffe4a0', toneMapped: false });
const emissiveWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });

/** Tạo texture bông tuyết tròn mềm mại cho hệ hạt tuyết rơi 3D */
function useSnowflakeTexture(): THREE.CanvasTexture {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(235, 248, 255, 0.85)');
    grad.addColorStop(0.75, 'rgba(200, 230, 255, 0.25)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** Hộp quà Giáng Sinh 3D buộc nơ ruy-băng */
function ChristmasGiftBox({
  position,
  size = [0.65, 0.55, 0.65],
  rotationY = 0,
  boxColor = '#dc2626',
  ribbonColor = '#fbbf24',
}: {
  position: [number, number, number];
  size?: [number, number, number];
  rotationY?: number;
  boxColor?: string;
  ribbonColor?: string;
}) {
  const [w, h, d] = size;
  const boxMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.4, metalness: 0.15 }),
    [boxColor]
  );
  const ribMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: ribbonColor, roughness: 0.25, metalness: 0.7 }),
    [ribbonColor]
  );

  return (
    <group position={[position[0], position[1] + h / 2, position[2]]} rotation={[0, rotationY, 0]}>
      {/* Thân hộp quà */}
      <mesh geometry={giftBoxGeo} material={boxMat} scale={[w, h, d]} />
      {/* Dải ruy-băng dọc 1 */}
      <mesh geometry={giftBoxGeo} material={ribMat} scale={[w * 0.18, h + 0.015, d + 0.015]} />
      {/* Dải ruy-băng dọc 2 */}
      <mesh geometry={giftBoxGeo} material={ribMat} scale={[w + 0.015, h + 0.015, d * 0.18]} />
      {/* Nơ trên đỉnh hộp */}
      <mesh
        geometry={giftBoxGeo}
        material={ribMat}
        position={[-w * 0.14, h / 2 + 0.05, 0]}
        rotation={[0, 0, 0.35]}
        scale={[w * 0.26, 0.08, d * 0.22]}
      />
      <mesh
        geometry={giftBoxGeo}
        material={ribMat}
        position={[w * 0.14, h / 2 + 0.05, 0]}
        rotation={[0, 0, -0.35]}
        scale={[w * 0.26, 0.08, d * 0.22]}
      />
    </group>
  );
}

/** Cây thông Noel 3D lớn trang trí quả châu phát sáng, dây đèn vàng ấm, ngôi sao đỉnh & các hộp quà dưới gốc */
function ChristmasTree({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  // Tạo danh sách toạ độ quả châu và đèn led xoắn ốc quanh các tầng lá thông
  const { ornaments, fairyLights } = useMemo(() => {
    const orn: { pos: [number, number, number]; mat: THREE.Material }[] = [];
    const lights: [number, number, number][] = [];
    const mats = [emissiveRedMat, emissiveGoldMat, emissiveCyanMat, emissiveWhiteMat, emissiveGreenMat];

    const totalOrnaments = 26;
    for (let i = 0; i < totalOrnaments; i++) {
      const t = i / totalOrnaments;
      const y = 1.05 + t * 3.35;
      const radius = (1 - t * 0.82) * 1.48;
      const angle = i * 1.45;
      orn.push({
        pos: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
        mat: mats[i % mats.length],
      });
    }

    const totalLights = 42;
    for (let i = 0; i < totalLights; i++) {
      const t = i / totalLights;
      const y = 0.95 + t * 3.55;
      const radius = (1 - t * 0.83) * 1.52;
      const angle = i * 0.72 + 0.5;
      lights.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
    }

    return { ornaments: orn, fairyLights: lights };
  }, []);

  const tiers = [
    { y: 1.35, r: 1.62, h: 1.45, mat: pineDarkMat },
    { y: 2.15, r: 1.36, h: 1.35, mat: pineMidMat },
    { y: 2.9, r: 1.1, h: 1.25, mat: pineLightMat },
    { y: 3.6, r: 0.82, h: 1.1, mat: pineMidMat },
    { y: 4.2, r: 0.52, h: 0.9, mat: pineLightMat },
  ];

  return (
    <group position={position} scale={scale}>
      {/* Thảm đỏ viền vàng dưới gốc cây */}
      <mesh geometry={skirtGeo} material={redVelvetMat} position={[0, 0.03, 0]} />
      <mesh position={[0, 0.04, 0]}>
        <torusGeometry args={[1.52, 0.045, 8, 24]} />
        <primitive object={goldMetallicMat} attach="material" />
      </mesh>

      {/* Thân gỗ cây thông */}
      <mesh geometry={trunkGeo} material={trunkMat} position={[0, 0.55, 0]} />

      {/* 5 Tầng tán lá thông xanh mướt phủ viền tuyết trắng */}
      {tiers.map((tier, idx) => (
        <group key={idx} position={[0, tier.y, 0]}>
          <mesh material={tier.mat}>
            <coneGeometry args={[tier.r, tier.h, 16]} />
          </mesh>
          {/* Viền tuyết trắng đọng dưới mép tán lá */}
          <mesh position={[0, -tier.h / 2 + 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={snowWhiteMat}>
            <torusGeometry args={[tier.r * 0.96, 0.055, 8, 20]} />
          </mesh>
        </group>
      ))}

      {/* Quả châu trang trí phát sáng */}
      {ornaments.map((o, i) => (
        <mesh key={`orn-${i}`} geometry={ornamentGeo} material={o.mat} position={o.pos} />
      ))}

      {/* Dây đèn đom đóm vàng ấm xoắn quanh cây */}
      {fairyLights.map((pos, i) => (
        <mesh key={`fl-${i}`} geometry={fairyLightGeo} material={emissiveWarmMat} position={pos} />
      ))}

      {/* Ngôi sao Giáng Sinh phát sáng rực rỡ trên đỉnh cây */}
      <group position={[0, 4.82, 0]}>
        <mesh geometry={starCoreGeo} material={emissiveGoldMat} scale={[1.1, 1.35, 0.45]} />
        <mesh geometry={starCoreGeo} material={emissiveGoldMat} rotation={[0, 0, Math.PI / 4]} scale={[0.85, 0.85, 0.35]} />
      </group>

      {/* Cụm hộp quà Noel dưới gốc cây */}
      <ChristmasGiftBox position={[-0.95, 0.05, 0.75]} size={[0.58, 0.48, 0.58]} rotationY={0.35} boxColor="#dc2626" ribbonColor="#fde047" />
      <ChristmasGiftBox position={[0.92, 0.05, 0.78]} size={[0.52, 0.56, 0.52]} rotationY={-0.4} boxColor="#15803d" ribbonColor="#f8fafc" />
      <ChristmasGiftBox position={[0.15, 0.05, 1.12]} size={[0.64, 0.42, 0.48]} rotationY={0.15} boxColor="#2563eb" ribbonColor="#fbbf24" />
      <ChristmasGiftBox position={[-0.38, 0.05, 1.05]} size={[0.42, 0.38, 0.42]} rotationY={0.8} boxColor="#f59e0b" ribbonColor="#dc2626" />
      <ChristmasGiftBox position={[1.15, 0.05, 0.1]} size={[0.48, 0.45, 0.48]} rotationY={0.2} boxColor="#9333ea" ribbonColor="#fde047" />
    </group>
  );
}

/** Người tuyết Chibi đội mũ Giáng Sinh & quàng khăn đỏ đứng hai bên sân khấu */
function StageSnowman({
  position,
  rotationY = 0,
  scale = 0.78,
}: {
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* Thân dưới */}
      <mesh geometry={snowSphereGeo} material={snowWhiteMat} position={[0, 0.55, 0]} scale={[0.62, 0.56, 0.62]} />
      {/* Thân giữa */}
      <mesh geometry={snowSphereGeo} material={snowWhiteMat} position={[0, 1.25, 0]} scale={[0.46, 0.43, 0.46]} />
      {/* Đầu người tuyết */}
      <mesh geometry={snowSphereGeo} material={snowWhiteMat} position={[0, 1.82, 0]} scale={[0.34, 0.33, 0.34]} />

      {/* Mắt than đen & Cúc áo */}
      <mesh geometry={snowSphereGeo} material={coalMat} position={[-0.11, 1.9, 0.3]} scale={0.04} />
      <mesh geometry={snowSphereGeo} material={coalMat} position={[0.11, 1.9, 0.3]} scale={0.04} />
      <mesh geometry={snowSphereGeo} material={coalMat} position={[0, 1.38, 0.43]} scale={0.042} />
      <mesh geometry={snowSphereGeo} material={coalMat} position={[0, 1.18, 0.45]} scale={0.042} />
      <mesh geometry={snowSphereGeo} material={coalMat} position={[0, 0.98, 0.42]} scale={0.042} />

      {/* Mũi cà rốt cam */}
      <mesh geometry={carrotGeo} material={carrotMat} position={[0, 1.82, 0.44]} rotation={[Math.PI / 2, 0, 0]} />

      {/* Khăn choàng cổ màu đỏ Noel */}
      <mesh position={[0, 1.56, 0]} rotation={[Math.PI / 2, 0, 0]} material={redVelvetMat}>
        <torusGeometry args={[0.31, 0.075, 10, 20]} />
      </mesh>
      <mesh geometry={giftBoxGeo} material={redVelvetMat} position={[0.18, 1.32, 0.32]} rotation={[0.1, 0, -0.15]} scale={[0.13, 0.46, 0.06]} />

      {/* Mũ Ông Già Noel / Top Hat đỏ viền trắng trên đầu Người Tuyết */}
      <group position={[0, 2.1, 0]} rotation={[0.05, 0, -0.08]}>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={snowWhiteMat}>
          <torusGeometry args={[0.28, 0.065, 8, 18]} />
        </mesh>
        <mesh position={[0, 0.28, 0]} material={redVelvetMat}>
          <coneGeometry args={[0.27, 0.56, 14]} />
        </mesh>
        <mesh geometry={snowSphereGeo} material={snowWhiteMat} position={[0, 0.58, 0]} scale={0.085} />
      </group>
    </group>
  );
}

/** Kẹo gậy Giáng Sinh (Candy Cane) trang trí mép sân khấu */
function CandyCane({ position, side = 1 }: { position: [number, number, number]; side?: 1 | -1 }) {
  return (
    <group position={position} rotation={[0, side * -0.3, side * 0.12]}>
      <mesh geometry={candyStickGeo} material={snowWhiteMat} position={[0, 0.55, 0]} />
      {[0.2, 0.45, 0.7, 0.95].map((y, idx) => (
        <mesh key={idx} position={[0, y, 0]} material={emissiveRedMat}>
          <cylinderGeometry args={[0.068, 0.068, 0.11, 10]} />
        </mesh>
      ))}
      <mesh geometry={candyHookGeo} material={emissiveRedMat} position={[side * 0.18, 1.1, 0]} rotation={[0, 0, 0]} />
    </group>
  );
}

/** Vòng nguyệt quế Giáng Sinh (Christmas Wreath) gắn trên tường hai bên khán phòng */
function WallChristmasWreath({
  position,
  rotationY,
}: {
  position: [number, number, number];
  rotationY: number;
}) {
  const berryAngles = [0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6];
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Vòng lá thông xanh */}
      <mesh geometry={wreathTorusGeo} material={pineMidMat} />
      {/* Nơ đỏ lớn phía trên vòng nguyệt quế */}
      <group position={[0, 0.74, 0.16]}>
        <mesh geometry={wreathBowLoopGeo} material={emissiveRedMat} position={[-0.18, 0, 0]} rotation={[0, 0, 0.25]} />
        <mesh geometry={wreathBowLoopGeo} material={emissiveRedMat} position={[0.18, 0, 0]} rotation={[0, 0, -0.25]} />
        <mesh geometry={wreathBowTailGeo} material={redVelvetMat} position={[-0.12, -0.26, -0.02]} rotation={[0, 0, 0.2]} />
        <mesh geometry={wreathBowTailGeo} material={redVelvetMat} position={[0.12, -0.26, -0.02]} rotation={[0, 0, -0.2]} />
      </group>
      {/* Đèn vàng ấm & quả holly đỏ đính quanh vòng nguyệt quế */}
      {berryAngles.map((ang, idx) => (
        <mesh
          key={idx}
          geometry={fairyLightGeo}
          material={idx % 2 === 0 ? emissiveGoldMat : emissiveRedMat}
          position={[Math.cos(ang) * 0.78, Math.sin(ang) * 0.78, 0.2]}
          scale={1.35}
        />
      ))}
    </group>
  );
}

/** Hệ thống bông tuyết 3D rơi nhẹ nhàng trong không gian rạp chiếu (1 draw call duy nhất) */
function FallingSnowParticles({ isDimmed }: { isDimmed: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const snowTex = useSnowflakeTexture();
  const count = 200;

  const { positions, speeds, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const phs = new Float32Array(count);
    let seed = 20251225;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * (ROOM.width - 4);
      pos[i * 3 + 1] = 1.5 + rnd() * (ROOM.height - 2.5);
      pos[i * 3 + 2] = ROOM.zFront + 3 + rnd() * (ROOM_DEPTH - 5);
      spd[i] = 0.45 + rnd() * 0.65;
      phs[i] = rnd() * Math.PI * 2;
    }
    return { positions: pos, speeds: spd, phases: phs };
  }, []);

  useFrame(({ clock }, delta) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speeds[i] * dt;
      arr[i * 3] += Math.sin(t * 0.8 + phases[i]) * 0.008;

      if (arr[i * 3 + 1] < 1.0) {
        arr[i * 3 + 1] = ROOM.height - 0.6;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={snowTex}
        color="#ffffff"
        size={0.28}
        sizeAttenuation
        transparent
        opacity={isDimmed ? 0.35 : 0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

export function ChristmasDecorations({ isDimmed = true }: ChristmasDecorationsProps) {
  const halfW = ROOM.width / 2;
  const wreathZPositions = [-4, 4, 12, 20, 27];
  const stageFrontZ = -5.18;

  // Dải đèn led Giáng Sinh Đỏ - Vàng - Xanh dọc mép trước sân khấu & trên viền màn chiếu
  const stageGarlandLights = useMemo(() => {
    const items: { x: number; mat: THREE.Material }[] = [];
    const mats = [emissiveRedMat, emissiveGoldMat, emissiveGreenMat, emissiveWarmMat];
    for (let i = -14; i <= 14; i++) {
      items.push({
        x: i * 1.0,
        mat: mats[Math.abs(i) % mats.length],
      });
    }
    return items;
  }, []);

  return (
    <group>
      {/* 1. Hai Người Tuyết Chibi Giáng Sinh & Hộp quà nhỏ gọn hai bên cánh sân khấu (Không che khuất màn hình) */}
      <StageSnowman position={[-13.8, 0.9, -6.1]} rotationY={0.32} scale={0.76} />
      <ChristmasGiftBox position={[-12.6, 0.9, -5.8]} size={[0.46, 0.38, 0.46]} rotationY={0.4} boxColor="#dc2626" ribbonColor="#fde047" />
      <ChristmasGiftBox position={[-12.0, 0.9, -5.65]} size={[0.36, 0.32, 0.36]} rotationY={-0.25} boxColor="#16a34a" ribbonColor="#ffffff" />

      <StageSnowman position={[13.9, 0.9, -6.1]} rotationY={-0.32} scale={0.76} />
      <ChristmasGiftBox position={[12.7, 0.9, -5.8]} size={[0.46, 0.38, 0.46]} rotationY={-0.35} boxColor="#2563eb" ribbonColor="#fbbf24" />
      <ChristmasGiftBox position={[12.1, 0.9, -5.65]} size={[0.36, 0.32, 0.36]} rotationY={0.3} boxColor="#dc2626" ribbonColor="#f8fafc" />

      {/* 3. Kẹo gậy Giáng Sinh (Candy Canes) hai bên mép sân khấu */}
      <CandyCane position={[-14.2, 0.9, -5.5]} side={-1} />
      <CandyCane position={[-7.2, 0.9, -5.5]} side={-1} />
      <CandyCane position={[7.2, 0.9, -5.5]} side={1} />
      <CandyCane position={[14.8, 0.9, -5.5]} side={1} />

      {/* 4. Dải đèn LED Noel Đỏ - Vàng - Xanh ngọc dọc mép trước sân khấu */}
      {stageGarlandLights.map((item, idx) => (
        <mesh
          key={`sg-${idx}`}
          geometry={fairyLightGeo}
          material={item.mat}
          position={[item.x, 0.93, stageFrontZ]}
          scale={1.4}
        />
      ))}

      {/* 5. Dải đèn Noel trang trí dọc viền đỉnh trên cùng của khung màn chiếu IMAX */}
      {stageGarlandLights.map((item, idx) => (
        <mesh
          key={`top-screen-light-${idx}`}
          geometry={fairyLightGeo}
          material={item.mat}
          position={[item.x * 0.94, 17.15, -10.15]}
          scale={1.5}
        />
      ))}

      {/* 6. Bốn Vòng Nguyệt Quế Giáng Sinh mỗi bên tường khán phòng */}
      {wreathZPositions.map((z) => (
        <React.Fragment key={`wreath-pair-${z}`}>
          <WallChristmasWreath position={[-halfW + 0.32, 8.2, z]} rotationY={Math.PI / 2} />
          <WallChristmasWreath position={[halfW - 0.32, 8.2, z]} rotationY={-Math.PI / 2} />
        </React.Fragment>
      ))}

      {/* 7. Tuyết rơi 3D lung linh khắp khán phòng */}
      <FallingSnowParticles isDimmed={isDimmed} />
    </group>
  );
}

