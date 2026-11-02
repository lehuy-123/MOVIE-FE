'use client';

import React from 'react';
import {
  Link as LinkIcon,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Sliders,
  Sparkles
} from 'lucide-react';

interface WeTubeHeaderProps {
  onlineCount?: number;
  seatedCount?: number;
  totalSeats?: number;
  coins?: number;
  userNickname?: string;
  isUiHidden?: boolean;
  onToggleHideUi?: () => void;
  onToggleSeatMap?: () => void;
  onOpenTicketModal?: () => void;
}

export function WeTubeHeader({
  onlineCount = 1,
  seatedCount = 0,
  totalSeats = 100,
  coins = 0,
  userNickname = 'Bạn',
  isUiHidden = false,
  onToggleHideUi,
  onToggleSeatMap,
  onOpenTicketModal,
}: WeTubeHeaderProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const copyRoomLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert('Đã sao chép liên kết phòng rạp phim!');
    }
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between p-3 sm:p-5 select-none font-sans">
      {/* 1. Left: WeTube Ciné Brand & Subtitle */}
      <div className="pointer-events-auto flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          {/* Red Squircle Logo */}
          <div className="flex items-center justify-center h-10 w-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-lg shadow-red-600/30 font-black text-lg">
            w
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
              wetube ciné
            </span>
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mt-1">
              VIDEO / NGHE NHẠC / 01
            </span>
          </div>
        </div>

        {/* Live Status Pill: • Đang chiếu | 156 đang online · 94 / 100 ghế */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-xl text-xs text-slate-300">
          <span className="flex items-center gap-1.5 text-lime-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
            Đang chiếu
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 font-medium">{onlineCount} đang online</span>
          <span className="text-slate-600">·</span>
          <button
            onClick={onToggleSeatMap}
            className="text-lime-400 hover:underline font-semibold"
          >
            {seatedCount} / {totalSeats} ghế
          </button>
        </div>
      </div>

      {/* 2. Right: Toolbar (0đ, Copy Link, Fullscreen, Hide UI, Avatar) */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Ticket Coin Badge: 0đ */}
        <button
          onClick={onOpenTicketModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-xl text-xs text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Ví vé vào rạp"
        >
          <span className="text-amber-400 font-bold">🎫</span>
          <span className="font-semibold text-white">{coins}đ</span>
        </button>

        {/* Copy Link Button */}
        <button
          onClick={copyRoomLink}
          className="flex items-center justify-center h-9 w-9 rounded-xl bg-black/60 border border-white/10 backdrop-blur-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Sao chép link rạp"
        >
          <LinkIcon className="h-4 w-4" />
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="flex items-center justify-center h-9 w-9 rounded-xl bg-black/60 border border-white/10 backdrop-blur-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Toàn màn hình"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        {/* Hide UI Button */}
        <button
          onClick={onToggleHideUi}
          className="flex items-center justify-center h-9 w-9 rounded-xl bg-black/60 border border-white/10 backdrop-blur-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
          title={isUiHidden ? 'Hiện thanh công cụ' : 'Ẩn thanh công cụ để ngắm rạp'}
        >
          {isUiHidden ? <Eye className="h-4 w-4 text-lime-400" /> : <EyeOff className="h-4 w-4" />}
        </button>

        {/* User Profile Avatar Circle ("H") */}
        <button
          onClick={onOpenTicketModal}
          className="flex items-center justify-center h-9 w-9 rounded-full bg-lime-400 text-black font-black text-sm shadow-lg shadow-lime-400/20 hover:scale-105 transition"
          title="Hồ sơ nhân vật"
        >
          {userNickname ? userNickname[0].toUpperCase() : 'H'}
        </button>
      </div>
    </header>
  );
}
