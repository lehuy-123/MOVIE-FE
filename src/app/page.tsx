'use client';

import dynamic from 'next/dynamic';

// Dynamic import for WebGL Canvas to prevent SSR hydration issues
const CinemaCanvas = dynamic(
  () => import('@/components/cinema/CinemaCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#06080d] text-white select-none">
        {/* Vầng hào quang đỏ ấm phía sau logo CGV */}
        <div className="relative flex items-center justify-center mb-6">
          <div
            className="absolute w-36 h-36 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(237, 49, 36, 0.35) 0%, rgba(245, 158, 11, 0.12) 50%, transparent 75%)',
              filter: 'blur(20px)',
              animation: 'pulse 2.5s ease-in-out infinite',
            }}
          />

          {/* Vòng quay loading tinh tế mang phong cách điện ảnh CGV */}
          <div className="h-28 w-28 rounded-full border-2 border-red-500/15 border-t-red-500 border-r-amber-400/60 animate-spin" />

          {/* Logo CGV chính hãng phát sáng ở trung tâm */}
          <div className="absolute flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cgv-logo.png"
              alt="CGV Cinema Logo"
              className="h-9 w-auto object-contain drop-shadow-[0_0_16px_rgba(237,49,36,0.85)]"
              style={{
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
          </div>
        </div>

        {/* Tiêu đề thương hiệu CGV */}
        <h2 className="text-base sm:text-lg font-black tracking-[0.22em] text-white uppercase mb-2">
          CJ CGV · IMAX CINEMA
        </h2>

        {/* Dòng chữ trạng thái */}
        <p className="text-xs text-slate-400 font-mono tracking-wide mb-4">
          Đang khởi tạo không gian rạp chiếu 3D...
        </p>

        {/* Thanh progress bar phát sáng đỏ */}
        <div className="w-48 h-1 rounded-full bg-white/10 overflow-hidden relative">
          <div
            className="absolute inset-y-0 left-0 w-24 rounded-full bg-gradient-to-r from-red-600 via-red-500 to-amber-400 shadow-[0_0_10px_rgba(237,49,36,0.8)]"
            style={{
              animation: 'cgvBarMove 1.6s ease-in-out infinite',
            }}
          />
        </div>

        <style>{`
          @keyframes cgvBarMove {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
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
