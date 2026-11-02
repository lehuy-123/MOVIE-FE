'use client';

import dynamic from 'next/dynamic';
import { Clapperboard } from 'lucide-react';

// Dynamic import for WebGL Canvas to prevent SSR hydration issues
const CinemaCanvas = dynamic(
  () => import('@/components/cinema/CinemaCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#07090e] text-white">
        <div className="relative flex items-center justify-center mb-6">
          <div className="h-20 w-20 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <div className="absolute flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600/30 text-blue-400">
            <Clapperboard className="h-6 w-6 animate-pulse" />
          </div>
        </div>
        <h2 className="text-xl font-bold tracking-wider text-slate-100 mb-1">
          3D VIRTUAL CINEMA
        </h2>
        <p className="text-sm text-slate-400 font-mono">
          Đang khởi tạo không gian rạp chiếu 3D...
        </p>
      </div>
    ),
  }
);

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-[#07090e]">
      <CinemaCanvas />
    </main>
  );
}
