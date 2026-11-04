'use client';

import React, { useState, useMemo } from 'react';
import { X, Film, Link as LinkIcon, Music, Crown, Send, Trash2, Play, ListVideo, Sparkles } from 'lucide-react';
import { VideoRequestItem } from '@/types/socket';

interface AddVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  queue?: VideoRequestItem[];
  onAddVideo: (videoId: string, title?: string) => void;
  onRequestVideo?: (videoId: string, title?: string) => void;
  onManageQueue?: (action: 'play' | 'remove', requestId?: string, videoId?: string, videoTitle?: string) => void;
  onOpenAdminLogin?: () => void;
}

export function extractYouTubeId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  // Direct 11 char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex covering watch?v=, youtu.be/, embed/, live/, shorts/
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regex);
  return match ? match[1] : null;
}

export function AddVideoModal({
  isOpen,
  onClose,
  isAdmin = true,
  queue = [],
  onAddVideo,
  onRequestVideo,
  onManageQueue,
  onOpenAdminLogin,
}: AddVideoModalProps) {
  const [url, setUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'request' | 'queue' | 'trending'>('request');

  const detectedId = useMemo(() => extractYouTubeId(url), [url]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detectedId) return;

    const title = customTitle.trim() || `YouTube Video (${detectedId})`;

    if (isAdmin) {
      onAddVideo(detectedId, title);
    } else {
      onRequestVideo?.(detectedId, title);
    }

    setUrl('');
    setCustomTitle('');
    onClose();
  };

  const trendingVideos = [
    { id: 'IcrbM1l_BoI', title: 'Avicii - Wake Me Up (Official Video)', tag: 'Music Video' },
    { id: '60ItHLz5WEA', title: 'Alan Walker - Faded', tag: 'EDM Masterpiece' },
    { id: 'zSWdZVtXT7E', title: 'Interstellar - Main Theme IMAX', tag: 'Cinema OST' },
    { id: 'd9MyW72ELq0', title: 'Avatar: The Way of Water Trailer', tag: 'Sci-Fi' },
    { id: 'qIcTM8WXFjk', title: 'Cyberpunk 2077 Night City Trailer', tag: '4K 60fps' },
    { id: 'aqz-KE-bpKQ', title: 'Big Buck Bunny (4K 60fps Animation)', tag: 'Animation' },
    { id: 'jfKfPfyJRdk', title: 'lofi hip hop radio - beats to relax/study to', tag: 'Lofi 24/7' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none font-sans">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0e131b] p-4 sm:p-7 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div
            className={`p-2.5 rounded-2xl flex items-center justify-center ${
              isAdmin
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                : 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
            }`}
          >
            {isAdmin ? <Crown className="h-6 w-6" /> : <Film className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-white">
                {isAdmin ? 'Quản Trị: Chiếu Phim Theo Yêu Cầu' : 'Đề Xuất Phim Cho Rạp'}
              </h3>
              {isAdmin && (
                <span className="text-[10px] uppercase font-black bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/40">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAdmin
                ? 'Bạn có quyền chọn và phát bất kỳ video YouTube nào lên màn chiếu lớn'
                : 'Gửi link YouTube vào hàng chờ để Admin duyệt và phát cho cả rạp cùng xem'}
            </p>
          </div>
        </div>

        {/* Banner dành cho Quản trị viên nếu chưa đăng nhập */}
        {!isAdmin && onOpenAdminLogin && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2.5 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Bạn là Quản trị viên của rạp?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdminLogin();
              }}
              className="rounded-xl bg-amber-400 px-3 py-1.5 text-[11px] font-black text-black hover:bg-amber-300 transition shrink-0 active:scale-95 shadow-md shadow-amber-400/20"
            >
              Đăng nhập Admin
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/5 mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('request')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'request'
                ? 'bg-lime-400 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            <span>Dán Link YouTube</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trending')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'trending'
                ? 'bg-lime-400 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Phim/Nhạc Hot</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 relative ${
              activeTab === 'queue'
                ? 'bg-lime-400 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListVideo className="h-3.5 w-3.5" />
            <span>Hàng Chờ</span>
            {queue.length > 0 && (
              <span className="px-1.5 py-0.2 bg-red-500 text-white text-[9px] rounded-full font-black animate-pulse">
                {queue.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Dán Link */}
        {activeTab === 'request' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>URL hoặc Mã Video YouTube:</span>
                {detectedId && (
                  <span className="text-lime-400 text-[11px] font-mono">
                    ✓ ID: {detectedId}
                  </span>
                )}
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-400 transition"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Tên hiển thị video (tuỳ chọn):
              </label>
              <input
                type="text"
                placeholder="VD: Phim Chiếu Rạp 2026, MV Âm Nhạc, ..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-400 transition"
              />
            </div>

            {detectedId && (
              <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <img
                  src={`https://img.youtube.com/vi/${detectedId}/mqdefault.jpg`}
                  alt="Thumbnail"
                  className="w-20 h-12 object-cover rounded-lg border border-white/10 shrink-0"
                />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">
                    {customTitle || `YouTube Video (${detectedId})`}
                  </p>
                  <p className="text-[10px] text-lime-400 font-mono mt-0.5">
                    Sẵn sàng phát lên màn chiếu 3D Full HD
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!detectedId}
              className={`w-full py-3 rounded-2xl font-extrabold text-xs transition shadow-lg flex items-center justify-center gap-2 mt-1 active:scale-98 ${
                detectedId
                  ? isAdmin
                    ? 'bg-[#c8e658] hover:bg-[#d4f068] text-black shadow-lime-400/20'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'
                  : 'bg-white/10 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isAdmin ? (
                <>
                  <Film className="h-4 w-4" />
                  <span>Chiếu Ngay Lên Màn Hình Rạp</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Gửi Yêu Cầu Cho Admin Duyệt</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Phim & Nhạc Hot */}
        {activeTab === 'trending' && (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {trendingVideos.map((vid) => (
              <div
                key={vid.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-left text-xs transition group"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <img
                    src={`https://img.youtube.com/vi/${vid.id}/default.jpg`}
                    alt={vid.title}
                    className="w-12 h-9 object-cover rounded-md shrink-0 border border-white/10"
                  />
                  <div className="overflow-hidden">
                    <span className="font-bold text-white group-hover:text-lime-300 block truncate">
                      {vid.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {vid.tag}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        onAddVideo(vid.id, vid.title);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#c8e658] hover:bg-[#d4f068] text-black font-extrabold text-[11px] transition shadow"
                    >
                      Chiếu Ngay
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onRequestVideo?.(vid.id, vid.title);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-lime-400/20 text-white hover:text-lime-300 font-bold text-[11px] transition border border-white/10"
                    >
                      Yêu Cầu
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Hàng Chờ (Queue) */}
        {activeTab === 'queue' && (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {queue.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <ListVideo className="h-10 w-10 mx-auto text-slate-600 mb-2 opacity-50" />
                <p className="text-xs font-semibold">Chưa có video nào trong hàng chờ</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Khán giả có thể dán link YouTube để yêu cầu bài hát / phim yêu thích
                </p>
              </div>
            ) : (
              queue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <img
                      src={`https://img.youtube.com/vi/${item.videoId}/default.jpg`}
                      alt={item.videoTitle}
                      className="w-12 h-9 object-cover rounded-md shrink-0 border border-white/10"
                    />
                    <div className="overflow-hidden">
                      <span className="font-bold text-white block truncate">
                        {item.videoTitle}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        Yêu cầu bởi: <b className="text-lime-400">{item.requestedBy}</b>
                      </span>
                    </div>
                  </div>

                  {isAdmin ? (
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => {
                          onManageQueue?.('play', item.id, item.videoId, item.videoTitle);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[#c8e658] hover:bg-[#d4f068] text-black font-extrabold text-[11px] flex items-center gap-1 transition"
                      >
                        <Play className="h-3 w-3 fill-black" />
                        <span>Phát</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onManageQueue?.('remove', item.id)}
                        className="p-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-400 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic shrink-0">
                      Đang đợi Admin
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
