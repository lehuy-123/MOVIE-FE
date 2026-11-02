'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Armchair,
  Crown,
  Film,
  Plus,
  Image as ImageIcon,
  ListVideo,
  MessageSquare,
  Sparkles,
  Flag,
  Heart,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  DoorOpen,
  LayoutGrid,
  Users,
  Smile,
  Send,
  FastForward,
  Check,
  Monitor,
  Expand,
  Play,
  Pause,
} from 'lucide-react';
import type { ScreenMeshHandle } from './ScreenMesh';
import type { CameraMode } from './CinemaCameraController';
import type { ChatMessage } from '@/types/socket';

export type CameraPreset = 'chair' | 'monitor' | 'audience' | 'overview';

export interface ViewerInfo {
  id: string;
  nickname: string;
  seatId: string | null;
  color: string;
  isMe: boolean;
}

interface CinemaHUDProps {
  screenRef: React.RefObject<ScreenMeshHandle | null>;
  /** Đổi giá trị này (vd. videoId) để reset phiếu vote bỏ qua. */
  videoKey: string;
  videoTitle: string;
  suggester?: string;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onSeek?: (seconds: number) => void;
  onlineCount: number;
  seatedCount: number;
  totalSeats: number;
  initialVotes?: number;
  onVoteSkip?: () => void;

  nickname: string;
  seatId: string | null;
  shirtColor: string;

  volume: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;

  chatHistory: ChatMessage[];
  onSendChat: (message: string) => void;
  onSendReaction: (emoji: string) => void;

  viewers: ViewerInfo[];
  cameraMode: CameraMode;
  queueCount?: number;
  isAdmin?: boolean;

  roomName?: string;
  onOpenRoomList?: () => void;
  onOpenAdminLogin?: () => void;
  onSetCameraPreset: (preset: CameraPreset) => void;
  onOpenSeatMap: () => void;
  onOpenAddVideo: () => void;
  onOpenProfile: () => void;
  onTogglePrivateRoom: () => void;
  onProjectImage?: () => void;
  onReport?: (reason: string) => void;
}

const glass =
  'border border-white/10 bg-[#0e120e]/75 backdrop-blur-xl shadow-[0_10px_40px_-12px_rgba(0,0,0,0.8)]';
const iconBtn =
  'flex h-10 w-10 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white active:scale-95';

const REACTIONS = ['👏', '🔥', '❤️', '🍿', '😂', '🎉', '💃', '😱'];
const REPORT_REASONS = ['Spam / quảng cáo', 'Nội dung phản cảm', 'Quấy rối trong chat', 'Video không phù hợp'];
const EMOJIS = ['🍿', '🔥', '👏', '❤️', '😂', '🎉', '💃', '✨', '👍', '😱'];

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = (s % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${r}` : `${m}:${r}`;
}

/* ──────────────────────────── Right dock button ──────────────────────────── */
function DockButton({
  icon,
  label,
  badge,
  active,
  tone = 'default',
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string | number | null;
  active?: boolean;
  tone?: 'default' | 'lime' | 'rose' | 'amber';
  onClick?: () => void;
}) {
  const hover =
    tone === 'rose'
      ? 'hover:text-rose-300'
      : tone === 'amber'
      ? 'text-amber-300 hover:text-amber-200'
      : 'hover:text-[#d8f95f]';
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`group relative flex w-[54px] flex-col items-center gap-1 rounded-2xl px-1 py-2.5 transition active:scale-95 ${
        active ? 'bg-white/10 text-[#d8f95f]' : 'text-white/65 hover:bg-white/[0.07]'
      } ${hover}`}
    >
      <span className="transition group-hover:scale-110">{icon}</span>
      <span className="text-[9.5px] font-semibold leading-none">{label}</span>
      {badge ? (
        <span className="absolute right-1 top-1 min-w-[16px] rounded-full bg-[#d8f95f] px-1 text-center text-[8.5px] font-extrabold leading-4 text-black">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Lớp giao diện 2D phủ lên Canvas 3D (phong cách wetube ciné):
 * thanh trên, thanh đáy, dock dọc bên phải, cùng các popover/toast.
 * Bong bóng chat 3D nằm trong cảnh (WeTubeAvatar), không thuộc HUD này.
 */
export function CinemaHUD({
  screenRef,
  videoKey,
  videoTitle,
  suggester = 'Phòng chiếu',
  isPlaying = true,
  onTogglePlay,
  onSeek,
  onlineCount,
  seatedCount,
  totalSeats,
  initialVotes = 0,
  onVoteSkip,
  nickname,
  seatId,
  shirtColor,
  volume,
  isMuted,
  onToggleMute,
  onVolumeChange,
  chatHistory,
  onSendChat,
  onSendReaction,
  viewers,
  cameraMode,
  queueCount = 0,
  isAdmin = false,
  roomName,
  onOpenRoomList,
  onOpenAdminLogin,
  onSetCameraPreset,
  onOpenSeatMap,
  onOpenAddVideo,
  onOpenProfile,
  onTogglePrivateRoom,
  onProjectImage,
  onReport,
}: CinemaHUDProps) {
  const [hidden, setHidden] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dockOpen, setDockOpen] = useState(true);
  const [dockPanel, setDockPanel] = useState<null | 'chat' | 'react' | 'report'>(null);
  const [bottomPanel, setBottomPanel] = useState<null | 'layout' | 'viewers'>(null);
  const [micOn, setMicOn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hearts, setHearts] = useState<{ id: number; dx: number }[]>([]);

  // Chat
  const [draft, setDraft] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const [seenChatCount, setSeenChatCount] = useState(0);

  // Vote bỏ qua
  const [votes, setVotes] = useState(initialVotes);
  const [hasVoted, setHasVoted] = useState(false);
  const needed = Math.max(1, Math.ceil(onlineCount * 0.35));
  const votePct = Math.min(100, Math.round((votes / needed) * 100));

  // Tiến độ video
  const [time, setTime] = useState({ cur: 0, dur: 0 });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setVotes(initialVotes);
    setHasVoted(false);
  }, [videoKey, initialVotes]);

  useEffect(() => {
    const id = setInterval(() => {
      try {
        const h = screenRef.current;
        if (!h) return;
        const cur = h.getCurrentTime();
        const dur = h.getDuration();
        setTime((p) => (Math.floor(p.cur) === Math.floor(cur) && Math.floor(p.dur) === Math.floor(dur) ? p : { cur, dur }));
      } catch {
        /* player chưa sẵn sàng */
      }
    }, 1000);
    return () => clearInterval(id);
  }, [screenRef]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Nhấn Enter (khi không gõ ở ô khác) → focus ô chat; Esc → đóng popover
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === 'Escape') {
        setDockPanel(null);
        setBottomPanel(null);
        setShowEmoji(false);
      } else if (e.key === 'Enter' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'BUTTON') {
        chatInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Click ra ngoài popover → đóng
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement | null)?.closest('[data-hud-popover]')) {
        setDockPanel(null);
        setBottomPanel(null);
        setShowEmoji(false);
      }
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);

  // Cuộn log chat & đánh dấu đã đọc khi mở panel
  useEffect(() => {
    if (dockPanel === 'chat') {
      setSeenChatCount(chatHistory.length);
      const el = chatLogRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [dockPanel, chatHistory.length]);

  const unread = dockPanel === 'chat' ? 0 : Math.max(0, chatHistory.length - seenChatCount);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const handleVote = () => {
    if (hasVoted) return;
    setHasVoted(true);
    setVotes((v) => v + 1);
    onVoteSkip?.();
  };

  const submitChat = (e?: React.FormEvent) => {
    e?.preventDefault();
    const msg = draft.trim();
    if (!msg) return;
    onSendChat(msg);
    setDraft('');
    setShowEmoji(false);
  };

  const burstHearts = () => {
    const batch = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      dx: (Math.random() - 0.5) * 70,
    }));
    setHearts((h) => [...h, ...batch]);
    setTimeout(() => setHearts((h) => h.filter((x) => !batch.some((b) => b.id === x.id))), 1800);
    onSendReaction('❤️');
  };

  const toggleDock = (panel: 'chat' | 'react' | 'report') => {
    setBottomPanel(null);
    setDockPanel((p) => (p === panel ? null : panel));
  };

  /* Khi ẩn giao diện chỉ giữ lại nút hiện lại */
  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        title="Hiện giao diện"
        className={`fixed right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl text-[#d8f95f] transition hover:scale-105 ${glass}`}
      >
        <Eye className="h-4 w-4" />
      </button>
    );
  }

  const initial = nickname ? nickname.trim().charAt(0).toUpperCase() : 'K';

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none font-sans text-white">
      {/* ═══════════════ TOP BAR ═══════════════ */}
      <header className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-5">
        {/* Trái: logo + video đang chiếu + vote */}
        <div className="pointer-events-auto flex max-w-[360px] flex-col gap-3">
          <button
            type="button"
            onClick={onOpenRoomList}
            title="Bấm để xem danh sách rạp và đổi rạp"
            className={`flex w-fit items-center gap-3 rounded-2xl py-2 pl-2 pr-4 text-left transition hover:scale-[1.02] active:scale-[0.98] ${glass}`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff3b3b] to-[#d3122a] text-xl font-black leading-none text-white shadow-[0_6px_18px_-4px_rgba(239,35,60,0.7)]">
              w
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] font-bold leading-none tracking-tight">wetube ciné</span>
              <span className="mt-1 flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#d8f95f]">
                {roomName || 'Rạp 01 · IMAX Star'} <ChevronDown className="h-3 w-3" />
              </span>
            </div>
          </button>

          <div className="hidden flex-col gap-2 pl-1 sm:flex">
            <span className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-white/45">Trên màn ảnh</span>
            <h2 className="line-clamp-2 text-[17px] font-bold leading-snug tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {videoTitle}
            </h2>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-medium text-white/50">
                {suggester} đề xuất · {formatTime(time.cur)}
                {time.dur > 0 ? ` / ${formatTime(time.dur)}` : ''}
              </p>
              {/* Thanh tua thời gian video mượt mà */}
              <div
                className="relative h-2 w-[220px] cursor-pointer rounded-full bg-white/15 overflow-hidden transition hover:h-2.5"
                title="Bấm để tua video"
                onClick={(e) => {
                  if (time.dur <= 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  const targetTime = pct * time.dur;
                  onSeek?.(targetTime);
                  screenRef.current?.seekTo(targetTime);
                }}
              >
                <div
                  className="h-full rounded-full bg-[#d8f95f] transition-all"
                  style={{ width: `${time.dur > 0 ? (time.cur / time.dur) * 100 : 0}%` }}
                />
              </div>
            </div>

            <button
              id="hud-vote-skip"
              type="button"
              onClick={handleVote}
              disabled={hasVoted}
              className={`mt-1 flex w-fit items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold backdrop-blur-xl transition active:scale-95 ${
                hasVoted
                  ? 'border-[#d8f95f]/60 bg-[#d8f95f]/15 text-[#d8f95f]'
                  : 'border-white/20 bg-black/35 text-white hover:border-[#d8f95f]/60'
              }`}
            >
              {hasVoted ? <Check className="h-4 w-4" /> : <FastForward className="h-4 w-4" />}
              Vote bỏ qua {votes}/{needed}
            </button>
            <div className="h-[3px] w-[190px] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#d8f95f] transition-[width] duration-500"
                style={{ width: `${votePct}%` }}
              />
            </div>
            <p className="text-[10px] leading-relaxed text-white/45">
              {votes}/{onlineCount} người thật đồng ý · {Math.round((votes / Math.max(1, onlineCount)) * 100)}%
              <br />
              Đủ 35% thì chuyển bài
            </p>
          </div>
        </div>

        {/* Giữa: trạng thái phòng */}
        <div className="pointer-events-auto absolute left-1/2 top-3 hidden -translate-x-1/2 sm:top-5 md:block">
          <div className={`flex items-center gap-3.5 rounded-full px-4 py-2 text-xs ${glass}`}>
            <button
              type="button"
              onClick={onTogglePlay}
              title={isPlaying ? 'Bấm để tạm dừng video' : 'Bấm để tiếp tục phát video'}
              className={`flex items-center gap-2 font-semibold transition hover:scale-105 active:scale-95 ${isPlaying ? 'text-[#d8f95f]' : 'text-amber-300'}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-[#d8f95f] animate-pulse' : 'bg-amber-300'}`}
              />
              {isPlaying ? 'Đang chiếu' : 'Tạm dừng'}
            </button>
            <span className="h-4 w-px bg-white/15" />
            <span className="flex items-center gap-2 text-white/80">
              <Users className="h-3.5 w-3.5 text-white/55" />
              <span className="font-semibold">{onlineCount} đang online</span>
              <span className="text-white/30">·</span>
              <button
                type="button"
                onClick={onOpenSeatMap}
                className="font-semibold text-white/80 transition hover:text-[#d8f95f]"
                title="Xem sơ đồ ghế"
              >
                {seatedCount} / {totalSeats} ghế
              </button>
              {isAdmin && (
                <>
                  <span className="h-4 w-px bg-white/15" />
                  <span className="flex items-center gap-1 font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/40 text-[10px]">
                    <Crown className="h-3 w-3" /> Host
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Phải: nút Quản trị Admin, toàn màn hình, âm thanh, ẩn UI, avatar */}
        <div className={`pointer-events-auto flex items-center gap-1.5 rounded-2xl p-1 ${glass}`}>
          {/* Nút Admin riêng biệt */}
          <button
            id="hud-admin-button"
            type="button"
            onClick={onOpenAdminLogin}
            title={
              isAdmin
                ? 'Bạn đang là Quản trị viên (Host) - Bấm để quản lý hoặc đăng xuất'
                : 'Đăng nhập Quản trị viên để đổi phim và điều khiển rạp'
            }
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
              isAdmin
                ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:bg-amber-300'
                : 'border border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'
            }`}
          >
            <Crown className={`h-3.5 w-3.5 ${isAdmin ? 'text-black fill-black' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">{isAdmin ? 'Quản trị viên' : 'Admin'}</span>
          </button>

          <span className="h-5 w-px bg-white/10 mx-0.5" />

          <button type="button" onClick={toggleFullscreen} className={iconBtn} title="Toàn màn hình">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className={iconBtn}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4 text-rose-400" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <button type="button" onClick={() => setHidden(true)} className={iconBtn} title="Ẩn giao diện để ngắm rạp">
            <EyeOff className="h-4 w-4" />
          </button>
          <button
            id="hud-profile"
            type="button"
            onClick={onOpenProfile}
            title="Hồ sơ nhân vật"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-black ring-2 ring-white/20 transition hover:scale-105"
            style={{ backgroundColor: shirtColor }}
          >
            {initial}
          </button>
        </div>
      </header>

      {/* ═══════════════ RIGHT DOCK ═══════════════ */}
      <aside
        data-hud-popover
        className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 sm:right-5"
      >
        <div className={`flex flex-col items-center gap-0.5 rounded-[26px] p-1.5 ${glass}`}>
          <button
            type="button"
            onClick={() => {
              setDockOpen((o) => !o);
              setDockPanel(null);
            }}
            className="flex h-9 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:text-white"
            title={dockOpen ? 'Thu gọn' : 'Mở rộng'}
          >
            {dockOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {dockOpen && (
            <>
              <DockButton
                icon={<Armchair className="h-[18px] w-[18px]" />}
                label={seatId || 'Chọn ghế'}
                tone="lime"
                onClick={onOpenSeatMap}
              />
              <DockButton
                icon={isAdmin ? <Film className="h-[18px] w-[18px] text-amber-300" /> : <Plus className="h-[18px] w-[18px]" />}
                label={isAdmin ? 'Chiếu phim' : 'Yêu cầu phim'}
                tone={isAdmin ? 'amber' : 'default'}
                onClick={onOpenAddVideo}
              />
              <DockButton
                icon={<ImageIcon className="h-[18px] w-[18px]" />}
                label="Chiếu ảnh"
                onClick={() => (onProjectImage ? onProjectImage() : showToast('Chiếu ảnh lên màn sẽ sớm có mặt!'))}
              />
              <DockButton
                icon={<ListVideo className="h-[18px] w-[18px]" />}
                label="Hàng chờ"
                badge={queueCount && queueCount > 0 ? queueCount : undefined}
                onClick={onOpenAddVideo}
              />
              <DockButton
                icon={<MessageSquare className="h-[18px] w-[18px]" />}
                label="Trò chuyện"
                badge={unread > 0 ? (unread > 99 ? '99+' : unread) : undefined}
                active={dockPanel === 'chat'}
                onClick={() => toggleDock('chat')}
              />
              <DockButton
                icon={<Sparkles className="h-[18px] w-[18px]" />}
                label="Tương tác"
                active={dockPanel === 'react'}
                onClick={() => toggleDock('react')}
              />
              <DockButton
                icon={<Flag className="h-[18px] w-[18px]" />}
                label="Tố cáo"
                active={dockPanel === 'report'}
                onClick={() => toggleDock('report')}
              />
              <DockButton
                icon={<Heart className="h-[18px] w-[18px]" />}
                label="Thả tim"
                tone="rose"
                onClick={burstHearts}
              />
            </>
          )}
        </div>

        {/* Panel bên trái dock */}
        {dockPanel && (
          <div className={`wt-step absolute right-full top-0 mr-3 w-[280px] rounded-2xl p-3 ${glass}`}>
            {dockPanel === 'chat' && (
              <>
                <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-white/50">
                  <span>Trò chuyện cả rạp</span>
                  <span className="text-white/30">{chatHistory.length}</span>
                </div>
                <div ref={chatLogRef} className="wt-scroll flex max-h-[320px] min-h-[120px] flex-col gap-2 overflow-y-auto pr-1">
                  {chatHistory.length === 0 && (
                    <p className="py-6 text-center text-xs text-white/35">Chưa có tin nhắn nào. Nói gì đó đi!</p>
                  )}
                  {chatHistory.map((m) => (
                    <div key={m.id} className="text-xs leading-snug">
                      <span className="mr-1.5 font-bold" style={{ color: m.avatarColor }}>
                        {m.nickname}
                        {m.seatId ? <span className="ml-1 font-normal text-white/35">{m.seatId}</span> : null}
                      </span>
                      <span className="break-words text-white/85">{m.message}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {dockPanel === 'react' && (
              <>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/50">Thả cảm xúc</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onSendReaction(emoji);
                        setDockPanel(null);
                      }}
                      className="flex h-11 items-center justify-center rounded-xl bg-white/[0.05] text-xl transition hover:scale-110 hover:bg-white/10 active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}
            {dockPanel === 'report' && (
              <>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/50">Tố cáo</div>
                <div className="flex flex-col gap-1">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => {
                        onReport?.(reason);
                        setDockPanel(null);
                        showToast('Đã gửi tố cáo. Cảm ơn bạn!');
                      }}
                      className="rounded-xl px-3 py-2 text-left text-xs text-white/80 transition hover:bg-white/10 hover:text-white"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </aside>

      {/* Tim bay */}
      <div className="pointer-events-none absolute bottom-24 right-6 h-0 w-0">
        {hearts.map((h) => (
          <Heart
            key={h.id}
            className="wt-heart absolute h-6 w-6 fill-rose-500 text-rose-500"
            style={{ ['--dx' as string]: `${h.dx}px` }}
          />
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="wt-step pointer-events-none absolute inset-x-0 bottom-24 flex justify-center">
          <div className={`rounded-full px-4 py-2 text-xs font-medium text-white/90 ${glass}`}>{toast}</div>
        </div>
      )}

      {/* ═══════════════ BOTTOM BAR ═══════════════ */}
      <footer className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 sm:p-5">
        {/* Trái: Phòng riêng, layout, danh sách người xem */}
        <div data-hud-popover className="pointer-events-auto relative flex items-center gap-2">
          <button
            id="hud-private-room"
            type="button"
            onClick={onOpenRoomList || onTogglePrivateRoom}
            className="flex items-center gap-2 rounded-2xl border border-[#d8f95f]/35 bg-[#d8f95f]/10 px-4 py-2.5 text-xs font-bold text-[#d8f95f] backdrop-blur-xl transition hover:bg-[#d8f95f]/20 active:scale-95"
            title="Xem danh sách rạp và chuyển rạp"
          >
            <DoorOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Đổi rạp ({roomName?.split('·')[0]?.trim() || 'Rạp 01'})</span>
          </button>

          <div className={`flex items-center gap-0.5 rounded-2xl p-1 ${glass}`}>
            <button
              type="button"
              title="Góc nhìn"
              onClick={() => setBottomPanel((p) => (p === 'layout' ? null : 'layout'))}
              className={`${iconBtn} ${bottomPanel === 'layout' ? 'bg-white/10 !text-[#d8f95f]' : ''}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Người đang xem"
              onClick={() => setBottomPanel((p) => (p === 'viewers' ? null : 'viewers'))}
              className={`${iconBtn} ${bottomPanel === 'viewers' ? 'bg-white/10 !text-[#d8f95f]' : ''}`}
            >
              <Users className="h-4 w-4" />
            </button>
          </div>

          {bottomPanel === 'layout' && (
            <div className={`wt-step absolute bottom-full left-0 mb-3 w-[210px] rounded-2xl p-2 ${glass}`}>
              {(
                [
                  ['overview', 'Bao quát', Expand],
                  ['chair', 'Ghế của tôi', Armchair],
                  ['monitor', 'Màn hình', Monitor],
                  ['audience', 'Khán phòng', Users],
                ] as const
              ).map(([preset, label, Icon]) => {
                const active =
                  (preset === 'overview' && cameraMode === 'overview') ||
                  (preset === 'chair' && cameraMode === 'seat') ||
                  (preset === 'monitor' && cameraMode === 'screen') ||
                  (preset === 'audience' && cameraMode === 'audience');
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      onSetCameraPreset(preset);
                      setBottomPanel(null);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition hover:bg-white/10 ${
                      active ? 'text-[#d8f95f]' : 'text-white/75'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    {active && <Check className="ml-auto h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          )}

          {bottomPanel === 'viewers' && (
            <div className={`wt-step absolute bottom-full left-0 mb-3 w-[250px] rounded-2xl p-3 ${glass}`}>
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-white/50">
                <span>Người đang xem</span>
                <span className="text-white/30">{viewers.length}</span>
              </div>
              <div className="wt-scroll flex max-h-[260px] flex-col gap-0.5 overflow-y-auto pr-1">
                {viewers.map((v) => (
                  <div key={v.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-xs">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-black"
                      style={{ backgroundColor: v.color }}
                    >
                      {v.nickname.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate font-semibold text-white/90">
                      {v.nickname}
                      {v.isMe && <span className="ml-1 font-normal text-[#d8f95f]">(Bạn)</span>}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-white/40">{v.seatId ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Giữa: ô chat */}
        <div data-hud-popover className="pointer-events-auto relative mx-auto w-full max-w-[520px] flex-1">
          {showEmoji && (
            <div className={`wt-step absolute bottom-full left-0 mb-3 flex flex-wrap gap-1 rounded-2xl p-2 ${glass}`}>
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setDraft((d) => (d + emoji).slice(0, 160));
                    chatInputRef.current?.focus();
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition hover:scale-125 hover:bg-white/10"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={submitChat}
            className="flex items-center gap-2.5 rounded-full border border-white/15 bg-[#0e120e]/80 py-1.5 pl-4 pr-1.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl transition focus-within:border-[#d8f95f]/60"
          >
            <button
              type="button"
              onClick={() => setShowEmoji((s) => !s)}
              title="Biểu cảm"
              className={`transition hover:text-[#d8f95f] ${showEmoji ? 'text-[#d8f95f]' : 'text-white/55'}`}
            >
              <Smile className="h-5 w-5" />
            </button>
            <input
              id="hud-chat-input"
              ref={chatInputRef}
              type="text"
              value={draft}
              maxLength={160}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nói gì với cả rạp đi..."
              className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder-white/35 focus:outline-none"
            />
            <span className="whitespace-nowrap text-[10px] tabular-nums text-white/30">{draft.length}/160</span>
            <button
              type="submit"
              disabled={!draft.trim()}
              title="Gửi"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d8f95f] text-black transition enabled:hover:scale-105 enabled:active:scale-95 disabled:bg-white/10 disabled:text-white/35"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Phải: play/pause + scrubber tua phim + mic + volume */}
        <div className={`pointer-events-auto flex items-center gap-1.5 rounded-2xl p-1 ${glass}`}>
          <button
            type="button"
            onClick={onTogglePlay}
            className={`${iconBtn} ${isPlaying ? 'text-[#d8f95f]' : 'text-amber-300'}`}
            title={isPlaying ? 'Tạm dừng video' : 'Phát tiếp tục'}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          {/* Thanh tua thời gian ở thanh điều khiển đáy */}
          <div className="hidden items-center gap-2 px-1 lg:flex">
            <span className="text-[10px] tabular-nums font-mono text-white/50">{formatTime(time.cur)}</span>
            <input
              type="range"
              min={0}
              max={time.dur > 0 ? Math.floor(time.dur) : 100}
              value={Math.floor(time.cur)}
              onChange={(e) => {
                const target = parseFloat(e.target.value);
                onSeek?.(target);
                screenRef.current?.seekTo(target);
              }}
              className="h-1 w-20 xl:w-28 cursor-pointer appearance-none rounded-full bg-white/20 accent-[#d8f95f]"
              aria-label="Tua video"
              title="Kéo để tua video nhanh"
            />
            <span className="text-[10px] tabular-nums font-mono text-white/40">{formatTime(time.dur)}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setMicOn((m) => !m);
              showToast(micOn ? 'Đã tắt mic' : 'Đã bật mic · voice chat sắp ra mắt');
            }}
            className={`${iconBtn} ${micOn ? '!text-[#d8f95f]' : ''}`}
            title={micOn ? 'Tắt mic' : 'Bật mic'}
          >
            {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
          <button type="button" onClick={onToggleMute} className={iconBtn} title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}>
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4 text-rose-400" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseInt(e.target.value, 10))}
            aria-label="Âm lượng"
            className="hidden h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-[#d8f95f] sm:block"
          />
          <span className="mr-2 hidden w-8 text-right text-[10px] tabular-nums text-white/45 sm:block">
            {isMuted ? 0 : volume}%
          </span>
        </div>
      </footer>
    </div>
  );
}
