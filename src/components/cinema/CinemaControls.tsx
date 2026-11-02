'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Film,
  Compass,
  MessageSquare,
  Send,
  Link as LinkIcon,
  Smile,
  X,
  Moon,
  Sun,
  Crown
} from 'lucide-react';
import { ScreenMeshHandle } from './ScreenMesh';
import { SeatData } from '@/types/cinema';

interface CinemaControlsProps {
  screenRef: React.RefObject<ScreenMeshHandle | null>;
  currentVideoId: string;
  selectedSeat?: SeatData | null;
  status?: 'playing' | 'paused';
  isConnected?: boolean;
  viewersCount?: number;
  isDimmed?: boolean;
  onToggleDimmed?: () => void;
  onSelectVideo: (videoId: string) => void;
  onResetCamera?: () => void;
  onLeaveSeat?: () => void;
  onPlay?: (currentTime: number) => void;
  onPause?: (currentTime: number) => void;
  onSeek?: (seekTime: number) => void;
  onSendChat?: (message: string) => void;
}

export function CinemaControls({
  screenRef,
  currentVideoId,
  selectedSeat,
  status,
  isConnected = false,
  viewersCount = 1,
  isDimmed = false,
  onToggleDimmed,
  onSelectVideo,
  onResetCamera,
  onLeaveSeat,
  onPlay,
  onPause,
  onSeek,
  onSendChat,
}: CinemaControlsProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [inputUrl, setInputUrl] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [volume, setVolumeState] = useState(85);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Sync state from server if provided
  useEffect(() => {
    if (status) {
      setIsPlaying(status === 'playing');
    }
  }, [status]);

  // Poll video timestamp & duration
  useEffect(() => {
    const interval = setInterval(() => {
      if (screenRef.current) {
        const time = screenRef.current.getCurrentTime();
        const dur = screenRef.current.getDuration();
        if (typeof time === 'number' && !isNaN(time)) setCurrentTime(time);
        if (typeof dur === 'number' && !isNaN(dur) && dur > 0) setDuration(dur);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [screenRef]);

  const handleTogglePlay = () => {
    if (!screenRef.current) return;
    const curTime = screenRef.current.getCurrentTime();
    if (isPlaying) {
      screenRef.current.pause();
      setIsPlaying(false);
      onPause?.(curTime);
    } else {
      screenRef.current.play();
      setIsPlaying(true);
      onPlay?.(curTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetSec = parseFloat(e.target.value);
    setCurrentTime(targetSec);
    screenRef.current?.seekTo(targetSec);
    onSeek?.(targetSec);
  };

  const handleToggleMute = () => {
    const player = screenRef.current?.getPlayer();
    if (!player) return;
    if (isMuted) {
      player.unMute();
      setIsMuted(false);
    } else {
      player.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolumeState(val);
    screenRef.current?.setVolume(val);
    if (val === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  const extractYouTubeId = (urlOrId: string): string => {
    const trimmed = urlOrId.trim();
    if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes('?')) {
      return trimmed;
    }
    const match = trimmed.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    return match ? match[1] : trimmed;
  };

  const handleLoadVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    const vidId = extractYouTubeId(inputUrl);
    onSelectVideo(vidId);
    screenRef.current?.loadVideoById(vidId);
    setInputUrl('');
    setIsPlaying(true);
    setShowVideoModal(false);
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    onSendChat?.(trimmed);
    setChatInput('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Curated 4K blockbuster trailers
  const sampleVideos = [
    { title: 'Big Buck Bunny (4K 60fps)', id: 'aqz-KE-bpKQ', tag: 'Animation 4K' },
    { title: 'Cyberpunk 2077 Night City', id: 'qIcTM8WXFjk', tag: 'Cyberpunk 4K' },
    { title: 'Avatar: The Way of Water IMAX', id: 'd9MyW72ELq0', tag: 'Sci-Fi IMAX' },
    { title: 'Interstellar - Official Trailer', id: 'zSWdZVtXT7E', tag: 'Masterpiece' },
    { title: 'Top Gun: Maverick IMAX', id: 'giXco2jaZ_4', tag: 'Action 4K' },
    { title: 'Oppenheimer IMAX Trailer', id: 'uYPbbksJxIg', tag: 'IMAX 70mm' },
  ];

  const quickReactions = [
    '🍿 Bắp rang ngon!',
    '🔥 Phim cháy quá!',
    '👏 Đỉnh nóc kịch trần!',
    '❤️ Siêu phẩm điện ảnh!',
    '😱 Quá bất ngờ!',
  ];

  return (
    <>
      {/* 1. Modal đổi link YouTube / Chọn trailer 4K */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5 text-white font-bold text-base">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30">
                  <Film className="h-4 w-4" />
                </div>
                <span>Kho Phim & Đổi Link YouTube 3D</span>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLoadVideo} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-2">
                  Dán liên kết YouTube hoặc mã Video ID:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="https://www.youtube.com/watch?v=... hoặc Video ID"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/30 transition whitespace-nowrap active:scale-95"
                  >
                    Phát Ngay
                  </button>
                </div>
              </div>

              {/* Danh sách Trailer 4K tuyển chọn */}
              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2 flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  Trailer 4K IMAX Tuyển Chọn:
                </span>
                <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {sampleVideos.map((vid) => (
                    <button
                      key={vid.id}
                      type="button"
                      onClick={() => {
                        onSelectVideo(vid.id);
                        screenRef.current?.loadVideoById(vid.id);
                        setIsPlaying(true);
                        setShowVideoModal(false);
                      }}
                      className={`text-left p-3 rounded-2xl border transition-all ${
                        currentVideoId === vid.id
                          ? 'bg-blue-600/30 border-blue-400 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/50'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 inline-block mb-1">
                        {vid.tag}
                      </span>
                      <p className="text-xs font-semibold truncate text-white">{vid.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{vid.id}</p>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Floating Luxury Glassmorphism Dock (Bottom HUD) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center p-3 sm:p-5">
        <div className="pointer-events-auto relative w-full max-w-5xl rounded-3xl border border-white/15 bg-slate-950/75 backdrop-blur-2xl shadow-2xl transition-all duration-300">
          {/* Neon Underglow Ambient Rim */}
          <div className="absolute -top-[1px] inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-80" />

          <div className="p-3.5 sm:p-4 flex flex-col gap-3">
            {/* Top Bar: Video Status, Sync Indicator, Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 relative">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isPlaying ? 'bg-red-400' : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      isPlaying ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                  />
                </span>
                <span className="font-bold text-white tracking-wide">Màn Chiếu IMAX 4K:</span>
                <span className="text-blue-300 bg-blue-950/70 px-2 py-0.5 rounded-lg border border-blue-500/30 font-mono text-[11px]">
                  {currentVideoId}
                </span>

                {isConnected ? (
                  <span className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1.5 font-sans font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Đồng Bộ ({viewersCount} người xem)
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1 font-sans">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                    Chế độ Đơn lẻ
                  </span>
                )}
              </div>

              {/* Right Side Buttons: Đổi Phim + Tắt/Bật Đèn Rạp */}
              <div className="flex items-center gap-2">
                {/* Nút Tắt/Mở Đèn Rạp (Lights Dimmer) */}
                {onToggleDimmed && (
                  <button
                    onClick={onToggleDimmed}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                      isDimmed
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                    title={isDimmed ? 'Bật sáng đèn rạp' : 'Tắt tối đèn rạp (chuyên tâm xem phim)'}
                  >
                    {isDimmed ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-slate-400" />}
                    <span>{isDimmed ? 'Bật Đèn' : 'Tắt Đèn Rạp'}</span>
                  </button>
                )}

                {/* Nút Đổi Link YouTube */}
                <button
                  onClick={() => setShowVideoModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/40 text-xs font-bold shadow-lg shadow-blue-500/20 transition active:scale-95"
                >
                  <Film className="h-3.5 w-3.5" />
                  <span>Đổi Phim / 4K Trailer</span>
                </button>
              </div>
            </div>

            {/* Middle Bar: Glowing Seek Timeline Slider */}
            <div className="flex items-center gap-3 w-full">
              <span className="text-[11px] font-mono text-slate-400 w-11 text-right font-medium">
                {formatTime(currentTime)}
              </span>
              <div className="relative flex-1 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/15 accent-blue-500 hover:bg-white/25 transition shadow-inner"
                />
              </div>
              <span className="text-[11px] font-mono text-slate-400 w-11 font-medium">
                {formatTime(duration)}
              </span>
            </div>

            {/* Bottom Row: Play/Pause, Volume, Camera, Chat Input */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              {/* Left Group: Play/Pause + Volume + FPV Seat Status */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleTogglePlay}
                  className="flex items-center justify-center h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition"
                  title={isPlaying ? 'Tạm dừng (Pause)' : 'Tiếp tục phát (Play)'}
                >
                  {isPlaying ? (
                    <Pause className="h-4.5 w-4.5 fill-current" />
                  ) : (
                    <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Volume Slider with percentage */}
                <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-2xl border border-white/10">
                  <button
                    onClick={handleToggleMute}
                    className="text-slate-300 hover:text-white transition"
                    title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4 text-rose-400" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-blue-400" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1.5 appearance-none bg-white/20 rounded-full cursor-pointer accent-blue-400"
                  />
                  <span className="text-[10px] font-mono text-slate-400 w-6 text-right">
                    {isMuted ? '0%' : `${volume}%`}
                  </span>
                </div>

                {/* Reset Camera Button */}
                {onResetCamera && (
                  <button
                    onClick={onResetCamera}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs border border-white/10 transition"
                    title="Đặt lại góc nhìn trung tâm rạp"
                  >
                    <Compass className="h-3.5 w-3.5 text-blue-400" />
                    <span className="hidden sm:inline">Reset Camera</span>
                  </button>
                )}

                {/* FPV Seat Mode Indicator & Exit Button */}
                {selectedSeat && (
                  <button
                    onClick={onLeaveSeat}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-blue-600/80 hover:bg-rose-600/90 text-white text-xs border border-blue-400/50 hover:border-rose-400 transition shadow-lg shadow-blue-500/25 group"
                    title="Rời ghế để về góc nhìn bao quát"
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-300 group-hover:bg-rose-200 animate-pulse" />
                    <span>FPV: <strong>{selectedSeat.id}</strong></span>
                    <span className="text-[10px] text-blue-200 group-hover:text-rose-100 hidden sm:inline">(Rời ghế)</span>
                  </button>
                )}
              </div>

              {/* Right Group: Real-time 3D Chat Input */}
              <form
                onSubmit={handleSendChat}
                className="flex items-center gap-2 flex-1 max-w-md ml-auto"
              >
                <div className="relative w-full">
                  <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-400" />
                  <input
                    type="text"
                    placeholder="Nhập chat (nổi bong bóng 3D trên đầu ghế)..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-2xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="flex items-center justify-center h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:hover:from-blue-600 text-white text-xs font-bold rounded-2xl transition shadow-md shadow-blue-600/25 whitespace-nowrap gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Gửi</span>
                </button>
              </form>
            </div>

            {/* Quick Chat Reaction Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5">
              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mr-1">
                <Smile className="h-3 w-3 text-amber-400" />
                Cảm xúc nhanh:
              </span>
              {quickReactions.map((reaction, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSendChat?.(reaction)}
                  className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] border border-white/10 transition whitespace-nowrap active:scale-95"
                >
                  {reaction}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
