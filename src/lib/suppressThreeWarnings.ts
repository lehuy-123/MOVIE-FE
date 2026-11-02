'use client';

// Triệt tiêu cảnh báo THREE.Clock deprecation do @react-three/fiber phát sinh
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('THREE.Clock: This module has been deprecated') ||
        args[0].includes('Clock: This module has been deprecated'))
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

