'use client';

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SeatData } from '@/types/cinema';
import { OVERVIEW_CAMERA, SCREEN } from '@/lib/roomLayout';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export type CameraMode = 'overview' | 'seat' | 'screen' | 'audience';

interface CinemaCameraControllerProps {
  mode: CameraMode;
  selectedSeat: SeatData | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  /** Tăng giá trị này để ép camera quay lại vị trí chuẩn của chế độ hiện tại. */
  resetKey?: number;
}

interface Pose {
  position: THREE.Vector3;
  /** Điểm nhìn xa (dùng để nội suy mượt). */
  look: THREE.Vector3;
  /** Target thật của OrbitControls khi đã tới nơi. */
  controlsTarget: THREE.Vector3;
  apply: (c: OrbitControlsImpl) => void;
}

const FPV_DISTANCE = 0.05;

function buildPose(mode: CameraMode, seat: SeatData | null): Pose {
  if (mode === 'seat' && seat) {
    const eye = new THREE.Vector3(seat.position[0], seat.position[1] + 1.5, seat.position[2] + 0.05);
    const look = new THREE.Vector3(0, SCREEN.y - 1, SCREEN.z);
    const dir = look.clone().sub(eye).normalize();
    const controlsTarget = eye.clone().addScaledVector(dir, FPV_DISTANCE);
    // Góc cầu của vector (camera - target) = -dir
    const polar = Math.acos(THREE.MathUtils.clamp(-dir.y, -1, 1));
    const azimuth = Math.atan2(-dir.x, -dir.z);
    return {
      position: eye,
      look,
      controlsTarget,
      apply: (c) => {
        c.enableZoom = false;
        c.enablePan = false;
        c.rotateSpeed = -0.35; // kéo chuột = quay đầu quanh ghế
        c.minDistance = FPV_DISTANCE;
        c.maxDistance = FPV_DISTANCE;
        c.minPolarAngle = Math.max(0.3, polar - 0.5);
        c.maxPolarAngle = Math.min(2.9, polar + 0.45);
        c.minAzimuthAngle = azimuth - 1.1;
        c.maxAzimuthAngle = azimuth + 1.1;
      },
    };
  }

  if (mode === 'screen') {
    const look = new THREE.Vector3(0, SCREEN.y, SCREEN.z);
    return {
      position: new THREE.Vector3(0, 6.5, 9),
      look,
      controlsTarget: look.clone(),
      apply: (c) => {
        c.enableZoom = true;
        c.enablePan = false;
        c.rotateSpeed = 0.5;
        c.minDistance = 6;
        c.maxDistance = 26;
        c.minPolarAngle = 0.8;
        c.maxPolarAngle = 1.55;
        c.minAzimuthAngle = -0.7;
        c.maxAzimuthAngle = 0.7;
      },
    };
  }

  if (mode === 'audience') {
    const look = new THREE.Vector3(0, 2.8, 12);
    return {
      position: new THREE.Vector3(0, 3.6, -4.2),
      look,
      controlsTarget: look.clone(),
      apply: (c) => {
        c.enableZoom = true;
        c.enablePan = false;
        c.rotateSpeed = 0.5;
        c.minDistance = 6;
        c.maxDistance = 24;
        c.minPolarAngle = 1.0;
        c.maxPolarAngle = 1.8;
        c.minAzimuthAngle = -Infinity;
        c.maxAzimuthAngle = Infinity;
      },
    };
  }

  // Overview: góc cao bao quát từ phía sau, zoom/pan nhẹ
  const look = new THREE.Vector3(...OVERVIEW_CAMERA.target);
  return {
    position: new THREE.Vector3(...OVERVIEW_CAMERA.position),
    look,
    controlsTarget: look.clone(),
    apply: (c) => {
      c.enableZoom = true;
      c.enablePan = true;
      c.screenSpacePanning = true;
      c.rotateSpeed = 0.5;
      c.panSpeed = 0.6;
      c.zoomSpeed = 0.7;
      c.minDistance = 12;
      c.maxDistance = 40;
      c.minPolarAngle = 0.7;
      c.maxPolarAngle = 1.52;
      c.minAzimuthAngle = -0.6;
      c.maxAzimuthAngle = 0.6;
    },
  };
}

// Giới hạn pan nhẹ ở chế độ overview
const PAN_MIN = new THREE.Vector3(-6, 1.5, -6);
const PAN_MAX = new THREE.Vector3(6, 9, 8);

export function CinemaCameraController({ mode, selectedSeat, controlsRef, resetKey = 0 }: CinemaCameraControllerProps) {
  const { camera } = useThree();

  const isTransitioning = useRef(false);
  const pose = useRef<Pose>(buildPose('overview', null));
  const lookCurrent = useRef(new THREE.Vector3(...OVERVIEW_CAMERA.target));
  const modeRef = useRef<CameraMode>(mode);

  // Chỉ chuyển cảnh lại khi đổi chế độ hoặc đổi ghế ở chế độ ngồi
  const baseKey = mode === 'seat' && selectedSeat ? `seat:${selectedSeat.id}` : mode === 'seat' ? 'overview' : mode;
  const poseKey = `${baseKey}#${resetKey}`;

  useEffect(() => {
    const effectiveMode: CameraMode = mode === 'seat' && !selectedSeat ? 'overview' : mode;
    modeRef.current = effectiveMode;
    pose.current = buildPose(effectiveMode, selectedSeat);

    // Hướng nhìn hiện tại làm điểm xuất phát để nội suy mượt
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    lookCurrent.current.copy(camera.position).addScaledVector(dir, 20);

    isTransitioning.current = true;
    if (controlsRef.current) controlsRef.current.enabled = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poseKey]);

  useFrame((_, delta) => {
    if (isTransitioning.current) {
      const p = pose.current;
      const factor = Math.min(delta * 4.5, 0.15);

      camera.position.lerp(p.position, factor);
      lookCurrent.current.lerp(p.look, factor);
      camera.lookAt(lookCurrent.current);

      if (camera.position.distanceTo(p.position) < 0.06 && lookCurrent.current.distanceTo(p.look) < 0.1) {
        camera.position.copy(p.position);
        camera.lookAt(p.look);
        isTransitioning.current = false;

        const controls = controlsRef.current;
        if (controls) {
          controls.target.copy(p.controlsTarget);
          p.apply(controls);
          controls.enabled = true;
          controls.update();
        }
      }
    } else if (modeRef.current === 'overview') {
      const controls = controlsRef.current;
      if (controls && controls.enabled) {
        const clamped = controls.target.clone().clamp(PAN_MIN, PAN_MAX);
        if (!clamped.equals(controls.target)) {
          camera.position.add(clamped.clone().sub(controls.target));
          controls.target.copy(clamped);
        }
      }
    }
  });

  return null;
}
