'use client';

import React, { useState } from 'react';
import {
  Film,
  Users,
  Play,
  Pause,
  Check,
  Plus,
  DoorOpen,
  X,
  Sparkles,
} from 'lucide-react';
import { RoomSummary } from '@/types/socket';

interface RoomListModalProps {
  isOpen: boolean;
  currentRoomId: string;
  rooms: RoomSummary[];
  onClose: () => void;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom?: (roomId: string, name: string) => void;
}

export function RoomListModal({
  isOpen,
  currentRoomId,
  rooms,
  onClose,
  onSelectRoom,
  onCreateRoom,
}: RoomListModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomName, setNewRoomName] = useState('');

  if (!isOpen) return null;

  // Ensure default rooms exist if server list is still loading
  const displayRooms: RoomSummary[] = rooms && rooms.length > 0 ? rooms : [
    {
      roomId: 'cinema-01',
      name: 'Rạp 01 · IMAX Star',
      order: 1,
      viewersCount: 1,
      videoId: 'Sx5lJtEs56A',
      videoTitle: 'Tình Xưa Xa Rồi - Tiếng Hát Ngọc Lan',
      status: 'playing',
    },
    {
      roomId: 'cinema-02',
      name: 'Rạp 02 · Âm Nhạc & Chill',
      order: 2,
      viewersCount: 0,
      videoId: 'IcrbM1l_BoI',
      videoTitle: 'Avicii - Wake Me Up (Official Video)',
      status: 'playing',
    },
    {
      roomId: 'cinema-03',
      name: 'Rạp 03 · Bom Tấn Điện Ảnh',
      order: 3,
      viewersCount: 0,
      videoId: 'aqz-KE-bpKQ',
      videoTitle: 'Big Buck Bunny 4K 60fps',
      status: 'playing',
    },
    {
      roomId: 'cinema-04',
      name: 'Rạp 04 · Anime & Hoạt Hình',
      order: 4,
      viewersCount: 0,
      videoId: 'dQw4w9WgXcQ',
      videoTitle: 'Phim Ngắn Anime Cinema HD',
      status: 'playing',
    },
    {
      roomId: 'cinema-05',
      name: 'Rạp 05 · Phòng Chiếu Riêng',
      order: 5,
      viewersCount: 0,
      videoId: 'pPv3cU61_-M',
      videoTitle: 'YouTube Video (pPv3cU61_-M)',
      status: 'playing',
    },
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const num = newRoomNumber.trim() || (displayRooms.length + 1).toString().padStart(2, '0');
    const slug = `cinema-${num.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const name = newRoomName.trim() || `Rạp ${num} · CGV Cinema`;

    onCreateRoom?.(slug, name);
    onSelectRoom(slug);
    setShowCreateForm(false);
    setNewRoomNumber('');
    setNewRoomName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0e120e] p-4 sm:p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d8f95f] to-[#a3e635] text-black shadow-lg shrink-0">
              <DoorOpen className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Hệ Thống Rạp WeTube
                <span className="rounded-full bg-lime-400/20 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-[#d8f95f] border border-lime-400/30">
                  {displayRooms.length} Rạp
                </span>
              </h2>
              <p className="mt-0.5 text-[11px] sm:text-xs text-white/50">
                Các user vào chung một rạp sẽ xem cùng một phim & tương tác thời gian thực
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition shrink-0"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Danh sách rạp chiếu theo thứ tự */}
        <div className="mt-3 sm:mt-4 flex flex-1 max-h-[60vh] flex-col gap-2.5 sm:gap-3 overflow-y-auto pr-1">
          {displayRooms.map((room) => {
            const isCurrent = room.roomId === currentRoomId;
            return (
              <div
                key={room.roomId}
                className={`group flex items-center justify-between gap-4 rounded-2xl border p-4 transition ${
                  isCurrent
                    ? 'border-[#d8f95f]/60 bg-[#d8f95f]/10 shadow-[0_0_30px_rgba(216,249,95,0.15)]'
                    : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]'
                }`}
              >
                {/* Thông tin rạp */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-mono text-base font-black ${
                      isCurrent
                        ? 'bg-[#d8f95f] text-black shadow-lg'
                        : 'bg-white/10 text-white/70 group-hover:bg-white/15 group-hover:text-white'
                    }`}
                  >
                    {room.order ? room.order.toString().padStart(2, '0') : room.roomId.slice(-2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-white group-hover:text-[#d8f95f] transition">
                        {room.name}
                      </h3>
                      {isCurrent && (
                        <span className="flex items-center gap-1 rounded-full bg-[#d8f95f]/20 px-2 py-0.5 text-[10px] font-bold text-[#d8f95f]">
                          <Check className="h-3 w-3" /> Đang ở đây
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-xs text-white/60">
                      <span className="flex items-center gap-1 truncate text-white/85 max-w-[280px]">
                        <Film className="h-3.5 w-3.5 shrink-0 text-[#d8f95f]" />
                        <span className="truncate">{room.videoTitle || 'Chưa chọn phim'}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 shrink-0 text-white/70">
                        <Users className="h-3.5 w-3.5 text-sky-400" />
                        <span className="font-semibold text-white/90">{room.viewersCount || 0}</span> người
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 shrink-0 text-[11px]">
                        {room.status === 'playing' ? (
                          <span className="text-lime-400 flex items-center gap-1">
                            <Play className="h-3 w-3 fill-lime-400" /> Đang chiếu
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Pause className="h-3 w-3 fill-amber-400" /> Tạm dừng
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nút hành động */}
                <div className="shrink-0">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="rounded-xl border border-[#d8f95f]/40 bg-[#d8f95f]/20 px-4 py-2 text-xs font-bold text-[#d8f95f] cursor-default"
                    >
                      Đang ở rạp
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectRoom(room.roomId);
                        onClose();
                      }}
                      className="rounded-xl bg-[#d8f95f] px-4 py-2 text-xs font-bold text-black transition hover:scale-105 hover:bg-[#c9ef4c] active:scale-95 shadow-md flex items-center gap-1.5"
                    >
                      <DoorOpen className="h-3.5 w-3.5" /> Vào rạp
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Form thêm rạp mới */}
        {showCreateForm ? (
          <form onSubmit={handleCreate} className="mt-4 rounded-2xl border border-white/15 bg-white/[0.03] p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#d8f95f] mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Tạo thêm rạp chiếu mới
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-1">Mã / Số thứ tự rạp (vd: 06):</label>
                <input
                  type="text"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  placeholder="06"
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white focus:border-[#d8f95f] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-1">Tên rạp chiếu:</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Rạp 06 · Phim Chiếu Rạp Mới"
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white focus:border-[#d8f95f] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-xl px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#d8f95f] px-4 py-1.5 text-xs font-bold text-black hover:bg-[#c9ef4c]"
              >
                Xác nhận tạo rạp
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-xs text-white/40">
              💡 Bạn có thể gửi link rạp cho bạn bè để cùng vào một rạp!
            </span>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:border-[#d8f95f] hover:text-[#d8f95f] transition"
            >
              <Plus className="h-3.5 w-3.5" /> Tạo rạp mới
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

