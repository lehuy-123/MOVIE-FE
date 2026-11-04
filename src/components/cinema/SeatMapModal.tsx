'use client';

import React, { useEffect, useMemo } from 'react';
import { X, Tv } from 'lucide-react';
import { ROWS, SEAT_KIND_LABEL, getSeatKind } from '@/lib/seatLayout';

interface SeatMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSeatId: string | null;
  onSelectSeatId: (seatId: string) => void;
  /** Ghế do người dùng thật (kết nối qua server) đang ngồi. */
  occupiedSeatIds?: string[];
  /** true khi đây là Bước 3 của luồng vào rạp. */
  isOnboarding?: boolean;
}

const COLS_LEFT_SINGLE = ['01'];
const COLS_LEFT_DOUBLE = ['02', '03'];
const COLS_MID_TRIPLE = ['04', '05', '06'];
const COLS_RIGHT_TRIPLE = ['07', '08', '09'];
const COLS_RIGHT_SINGLE = ['10'];

export function SeatMapModal({
  isOpen,
  onClose,
  selectedSeatId,
  onSelectSeatId,
  occupiedSeatIds = [],
  isOnboarding = false,
}: SeatMapModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Tổng 100 ghế (10 hàng x 10 cột) - chỉ tính là đã có người khi người dùng thật đang ngồi
  const freeCount = useMemo(() => {
    const total = 100;
    const occupiedCount = occupiedSeatIds.filter((id) => id !== selectedSeatId).length;
    const myCount = selectedSeatId ? 1 : 0;
    return Math.max(0, total - occupiedCount - myCount);
  }, [occupiedSeatIds, selectedSeatId]);

  if (!isOpen) return null;

  // Ghế bị chiếm khi có người dùng khác trong phòng đang ngồi
  const isTaken = (id: string) =>
    id !== selectedSeatId && occupiedSeatIds.includes(id);

  const renderSeat = (id: string) => {
    const mine = id === selectedSeatId;
    const taken = isTaken(id);
    const cls = mine
      ? 'border-[#d8f95f] bg-[#d8f95f] text-black font-extrabold shadow-[0_0_18px_rgba(216,249,95,0.55)]'
      : taken
        ? 'cursor-not-allowed border-white/[0.04] bg-white/[0.07] text-white/25'
        : 'border-white/30 bg-white/[0.02] text-white/90 hover:-translate-y-0.5 hover:border-[#d8f95f] hover:bg-[#d8f95f]/15 hover:text-[#d8f95f]';

    return (
      <button
        key={id}
        type="button"
        id={`seat-${id}`}
        disabled={taken}
        aria-label={`${SEAT_KIND_LABEL[getSeatKind(id)]} ${id}${taken ? ' (đã có người)' : mine ? ' (ghế của bạn)' : ''}`}
        onClick={() => {
          onSelectSeatId(id);
          onClose();
        }}
        className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg border text-[9px] sm:text-[10px] font-semibold tabular-nums transition duration-150 active:scale-90 ${cls}`}
      >
        {id.slice(1)}
      </button>
    );
  };

  const rowLabel = (letter: string) => (
    <span className="w-3.5 sm:w-4 text-center text-[10px] sm:text-xs font-semibold text-white/35">{letter}</span>
  );

  return (
    <div className="wt-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-6 backdrop-blur-[3px] select-none">
      <div className="wt-card wt-scroll relative max-h-[94vh] w-full max-w-[640px] overflow-y-auto rounded-[28px] border border-white/10 bg-[#141814]/90 p-4 sm:p-8 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-md">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng sơ đồ ghế"
          className="absolute right-4 top-4 sm:right-5 sm:top-5 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-[#d8f95f]/60 text-[#d8f95f] transition hover:bg-[#d8f95f]/10 hover:rotate-90"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <header className="mb-4 sm:mb-6 pr-10 sm:pr-12">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
            {isOnboarding ? 'Bước 3/3 · ' : ''}Wetube ciné / Cùng nhau
          </span>
          <h2 className="mt-2 text-xl sm:text-[26px] font-bold leading-tight tracking-tight">Chọn một chỗ thật ưng.</h2>
          <p className="mt-1.5 text-xs text-white/45">
            10 hàng · 100 chỗ · Ghế đơn, ghế đôi và ghế ba. Bạn có thể đổi chỗ bất kỳ lúc nào.
          </p>
        </header>

        {/* Màn hình chiếu */}
        <div className="mx-auto mb-5 sm:mb-7 flex w-full max-w-[560px] flex-col items-center">
          <div className="h-4 sm:h-5 w-full rounded-[50%/100%_100%_0_0] border-t-2 border-[#d8f95f]/50 bg-gradient-to-b from-[#d8f95f]/10 to-transparent" />
          <div className="-mt-0.5 flex items-center gap-2 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.25em] text-white/55">
            <Tv className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
            Màn hình chiếu
          </div>
        </div>

        {/* Lưới ghế: 10 hàng, 3 cụm (1+2 | 3 | 3+1) */}
        <div className="wt-scroll flex flex-col items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2">
          {ROWS.map((letter) => (
            <div key={letter} className="flex items-center gap-1.5 sm:gap-3">
              {rowLabel(letter)}

              <div className="flex items-center gap-1.5">
                {COLS_LEFT_SINGLE.map((n) => renderSeat(`${letter}${n}`))}
                <div className="flex items-center gap-1 rounded-xl bg-white/[0.05] p-[3px]">
                  {COLS_LEFT_DOUBLE.map((n) => renderSeat(`${letter}${n}`))}
                </div>
              </div>

              <div className="w-1.5 sm:w-3" />

              <div className="flex items-center gap-1 rounded-xl bg-white/[0.05] p-[3px]">
                {COLS_MID_TRIPLE.map((n) => renderSeat(`${letter}${n}`))}
              </div>

              <div className="w-1.5 sm:w-3" />

              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 rounded-xl bg-white/[0.05] p-[3px]">
                  {COLS_RIGHT_TRIPLE.map((n) => renderSeat(`${letter}${n}`))}
                </div>
                {COLS_RIGHT_SINGLE.map((n) => renderSeat(`${letter}${n}`))}
              </div>

              {rowLabel(letter)}
            </div>
          ))}
        </div>

        {/* Chú thích trạng thái */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-xs text-white/55">
          <span className="flex items-center gap-2">
            <i className="h-3.5 w-3.5 rounded border border-white/35" /> Còn trống
          </span>
          <span className="flex items-center gap-2">
            <i className="h-3.5 w-3.5 rounded bg-white/[0.12]" /> Đã có người
          </span>
          <span className="flex items-center gap-2 font-semibold text-[#d8f95f]">
            <i className="h-3.5 w-3.5 rounded bg-[#d8f95f]" /> Ghế của bạn
          </span>
        </div>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/40">
          <span>
            <strong className="mr-1 text-base font-bold text-[#d8f95f]">{freeCount}</strong>
            ghế đang trống
          </span>
          <span>Chạm vào ghế trống để vào rạp. Vuốt ngang để xem sơ đồ.</span>
        </footer>
      </div>
    </div>
  );
}
