'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * SafeHtml — nhãn HTML gắn vào một điểm trong không gian 3D.
 *
 * Thay thế hoàn toàn `Html` của @react-three/drei, vốn gây lỗi trên React 19:
 *  - "createRoot() on a container that has already been passed to createRoot()"
 *  - "Failed to execute 'removeChild' on 'Node'"
 *  - "Attempted to synchronously unmount a root while React was already rendering"
 *
 * Nguyên nhân gốc: ở chế độ StrictMode (dev), effect chạy mount → cleanup → mount.
 * Drei (và bản vá cũ) unmount root trễ rồi xoá container, trong khi lần mount thứ hai
 * đã tạo root MỚI trên chính container đó → React mất đồng bộ DOM → removeChild crash.
 *
 * Cách làm ở đây:
 *  - Mỗi component giữ đúng 1 container + 1 root suốt vòng đời.
 *  - Cleanup chỉ *lên lịch* huỷ root (setTimeout). Nếu component mount lại (StrictMode)
 *    thì huỷ lịch đó và dùng lại root cũ → không bao giờ tạo root trùng.
 *  - Root chỉ bị unmount ngoài pha render của React, sau đó mới gỡ container khỏi DOM.
 *  - Vị trí được cập nhật trực tiếp qua style trong useFrame, không gây re-render.
 */

export interface SafeHtmlProps {
  children?: React.ReactNode;
  position?: [number, number, number];
  center?: boolean;
  distanceFactor?: number;
  className?: string;
  style?: React.CSSProperties;
  zIndex?: number;
}

const vObj = new THREE.Vector3();
const vCam = new THREE.Vector3();
const vDir = new THREE.Vector3();

function objectScale(obj: THREE.Object3D, camera: THREE.Camera) {
  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    return (camera as THREE.OrthographicCamera).zoom;
  }
  const cam = camera as THREE.PerspectiveCamera;
  const objectPos = vObj.setFromMatrixPosition(obj.matrixWorld);
  const cameraPos = vCam.setFromMatrixPosition(cam.matrixWorld);
  const vFOV = (cam.fov * Math.PI) / 180;
  const dist = objectPos.distanceTo(cameraPos);
  const scaleFOV = 2 * Math.tan(vFOV / 2) * dist;
  return scaleFOV > 0 ? 1 / scaleFOV : 1;
}

export function SafeHtml({
  children,
  position = [0, 0, 0],
  center = false,
  distanceFactor,
  className,
  style,
  zIndex = 10,
}: SafeHtmlProps) {
  const { gl, camera, size, events } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // Container DOM + root React: tạo đúng một lần cho mỗi instance
  const [el] = useState(() => {
    const div = document.createElement('div');
    div.setAttribute('translate', 'no');
    div.className = 'notranslate';
    div.style.cssText =
      'position:absolute;top:0;left:0;pointer-events:none;transform-origin:0 0;will-change:transform;';
    return div;
  });
  const rootRef = useRef<ReactDOM.Root | null>(null);
  const disposeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gắn container vào DOM & tạo root (an toàn với StrictMode)
  useEffect(() => {
    // Nếu vừa cleanup ở lần mount trước (StrictMode) → huỷ lịch dọn dẹp, dùng lại root
    if (disposeTimerRef.current) {
      clearTimeout(disposeTimerRef.current);
      disposeTimerRef.current = null;
    }

    const target =
      (events.connected as HTMLElement | undefined) ||
      (gl.domElement.parentNode as HTMLElement | null);
    if (target && el.parentNode !== target) {
      target.appendChild(el);
    }
    if (!rootRef.current) {
      rootRef.current = ReactDOM.createRoot(el);
    }

    return () => {
      // Không unmount đồng bộ trong pha commit của React — lên lịch sau đó
      disposeTimerRef.current = setTimeout(() => {
        disposeTimerRef.current = null;
        const root = rootRef.current;
        rootRef.current = null;
        try {
          root?.unmount();
        } catch {
          /* ignore */
        }
        if (el.parentNode) {
          try {
            el.parentNode.removeChild(el);
          } catch {
            /* ignore */
          }
        }
      }, 0);
    };
  }, [el, gl, events.connected]);

  // Render nội dung vào root riêng mỗi khi props thay đổi
  useLayoutEffect(() => {
    if (!rootRef.current) {
      rootRef.current = ReactDOM.createRoot(el);
    }
    rootRef.current.render(
      <div
        className={className}
        style={{
          position: 'absolute',
          transform: center ? 'translate3d(-50%,-50%,0)' : 'none',
          ...style,
        }}
      >
        {children}
      </div>
    );
  });

  // Cập nhật vị trí màn hình mỗi frame (không re-render React)
  const lastRef = useRef({ x: NaN, y: NaN, s: NaN, visible: true });
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    group.updateWorldMatrix(true, false);
    const objectPos = vObj.setFromMatrixPosition(group.matrixWorld);
    const cameraPos = vCam.setFromMatrixPosition(camera.matrixWorld);
    const camDir = camera.getWorldDirection(vDir);
    const isBehind = objectPos.clone().sub(cameraPos).angleTo(camDir) > Math.PI / 2;

    const last = lastRef.current;
    if (isBehind) {
      if (last.visible) {
        el.style.display = 'none';
        last.visible = false;
      }
      return;
    }
    if (!last.visible) {
      el.style.display = 'block';
      last.visible = true;
    }

    const projected = objectPos.project(camera);
    const x = (projected.x * size.width) / 2 + size.width / 2;
    const y = -(projected.y * size.height) / 2 + size.height / 2;
    const s = distanceFactor === undefined ? 1 : objectScale(group, camera) * distanceFactor;

    if (Math.abs(x - last.x) > 0.1 || Math.abs(y - last.y) > 0.1 || Math.abs(s - last.s) > 0.0005) {
      el.style.transform = `translate3d(${x}px,${y}px,0) scale(${s})`;
      el.style.zIndex = String(zIndex);
      last.x = x;
      last.y = y;
      last.s = s;
    }
  });

  return <group ref={groupRef} position={position} />;
}
