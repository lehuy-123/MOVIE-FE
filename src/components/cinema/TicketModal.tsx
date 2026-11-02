'use client';

import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  Clapperboard,
  ArrowRight,
  Armchair,
  Dices,
  Shield,
} from 'lucide-react';
import {
  AvatarGender,
  AVATAR_SHIRT_COLORS,
  DEFAULT_SHIRT_COLOR,
  UserProfile,
} from '@/types/cinema';

interface TicketModalProps {
  isOpen: boolean;
  /**
   * 'onboarding': Lần đầu vào web -> nhập tên + áo -> bấm 'Chọn ghế và vào rạp'.
   * 'wardrobe': mở khi đang ở trong rạp để đổi tên/màu áo.
   */
  mode?: 'onboarding' | 'wardrobe';
  onClose: () => void;
  onComplete: (profile: UserProfile) => void;
  onOpenAdminLogin?: () => void;
  initialNickname?: string;
  initialGender?: AvatarGender;
  initialColor?: string;
}

const PROFILE_KEY = 'wetube-cine:profile';

const RANDOM_NAMES = [
  'Cinephile',
  'Minh Quân',
  'Hải Yến',
  'Hoàng Nam',
  'Thuỳ Trang',
  'Bắp Bơ',
  'StarGazer',
  'Khán Giả Vui Tính',
  'Moonlight',
  'Chill Guy',
  'Trà Đào',
  'Mê Phim',
];

const eyebrow = 'text-[11px] font-bold tracking-[0.22em] text-[#d8f95f] uppercase';
const fieldLabel = 'block mb-2 text-[13px] font-bold text-white/90';
const fieldBox =
  'flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 transition focus-within:border-[#d8f95f]/70 focus-within:bg-white/[0.06]';
const fieldInput =
  'w-full bg-transparent py-3 text-[13px] text-white placeholder-white/30 focus:outline-none';
const ctaButton =
  'group flex w-full items-center justify-center gap-2 rounded-xl bg-[#d8f95f] py-3.5 text-sm font-semibold text-black shadow-[0_8px_30px_-8px_rgba(216,249,95,0.55)] transition hover:bg-[#e3ff7a] active:scale-[0.98]';

export function TicketModal({
  isOpen,
  mode = 'onboarding',
  onClose,
  onComplete,
  onOpenAdminLogin,
  initialNickname = '',
  initialGender = 'Nam',
  initialColor = DEFAULT_SHIRT_COLOR,
}: TicketModalProps) {
  const [nickname, setNickname] = useState(initialNickname);
  const [gender, setGender] = useState<AvatarGender>(initialGender);
  const [shirtColor, setShirtColor] = useState(initialColor);
  const [error, setError] = useState('');

  // Nạp profile đã lưu trước đó nếu có
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.nickname && !initialNickname) setNickname(parsed.nickname);
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.shirtColor) setShirtColor(parsed.shirtColor);
      }
    } catch {}
  }, [initialNickname]);

  useEffect(() => {
    if (!isOpen || mode !== 'wardrobe') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, mode, onClose]);

  if (!isOpen) return null;

  const randomizeName = () => {
    const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const suffix = Math.floor(10 + Math.random() * 90);
    setNickname(`${random} ${suffix}`);
    setError('');
  };

  const handleFinish = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanName = nickname.trim();
    if (!cleanName) {
      setError('Vui lòng nhập tên của bạn để in lên áo nhé!');
      return;
    }

    const profile: UserProfile = {
      nickname: cleanName,
      gender,
      shirtColor,
      seatId: null,
      coins: 0,
    };

    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      localStorage.setItem('cinema_nickname', cleanName);
    } catch {}

    onComplete(profile);
  };

  const isOnboarding = mode === 'onboarding';
  const printedName = nickname.trim() || 'Tên bạn';

  return (
    <div
      className={`wt-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-[4px] select-none ${
        isOnboarding ? 'bg-black/60' : 'bg-black/70'
      }`}
    >
      <div className="wt-card relative max-h-[94vh] w-full max-w-[440px] overflow-y-auto wt-scroll rounded-[28px] border border-white/10 bg-[#121614]/95 p-6 text-white shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
        {!isOnboarding && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="absolute right-5 top-5 rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className={eyebrow}>
              {isOnboarding ? 'Vé vào rạp · WeTube Ciné' : 'Đổi ngoại hình nhân vật'}
            </span>
          </div>

          <h1 className="mt-2.5 text-[26px] font-black leading-[1.2] tracking-tight text-white">
            {isOnboarding ? (
              <>
                Chào mừng bạn đến với{' '}
                <span className="text-[#d8f95f]">Rạp Chiếu Online</span>
              </>
            ) : (
              'Bạn sẽ là ai trong rạp?'
            )}
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-white/55">
            Không cần đăng nhập rườm rà. Chỉ cần chọn tên và màu áo là có ngay một chỗ ngồi riêng cùng cả rạp!
          </p>

          {/* Avatar preview (nhìn từ phía sau, tên in trên lưng áo) */}
          <div className="relative mt-4 flex h-48 items-end justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/40">
            <div className="pointer-events-none absolute -top-10 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-[#d8f95f]/15 blur-3xl" />
            <div className="absolute bottom-3 h-3 w-28 rounded-[50%] bg-black/70 blur-md" />
            <div className="relative mb-3 flex flex-col items-center transition-transform duration-500 hover:scale-105">
              {/* Đầu + tóc */}
              <div className="relative z-10 h-[48px] w-[50px]">
                <div className="absolute inset-0 rounded-[22px] bg-[#f1c9a5]" />
                <div
                  className={`absolute inset-x-[-2px] top-[-3px] bg-[#3e2513] ${
                    gender === 'Nữ'
                      ? 'bottom-[-14px] rounded-[24px_24px_16px_16px]'
                      : 'bottom-[4px] rounded-[24px_24px_10px_10px]'
                  }`}
                />
              </div>
              {/* Áo */}
              <div
                className="relative -mt-1.5 flex h-[70px] w-[82px] items-center justify-center rounded-[18px] shadow-[inset_0_-6px_12px_rgba(0,0,0,0.15)] transition-colors duration-300"
                style={{ backgroundColor: shirtColor }}
              >
                <span className="max-w-[70px] truncate text-[10.5px] font-extrabold tracking-tight text-black/85">
                  {printedName}
                </span>
                <div
                  className="absolute -left-2.5 top-2 h-8 w-3.5 rounded-full transition-colors duration-300"
                  style={{ backgroundColor: shirtColor }}
                />
                <div
                  className="absolute -right-2.5 top-2 h-8 w-3.5 rounded-full transition-colors duration-300"
                  style={{ backgroundColor: shirtColor }}
                />
              </div>
              {/* Quần / váy */}
              <div className="-mt-1 flex gap-1">
                <div
                  className={`h-8 w-[36px] bg-[#2d3238] ${gender === 'Nữ' ? 'rounded-b-xl' : 'rounded-b-md'}`}
                />
                <div
                  className={`h-8 w-[36px] bg-[#2d3238] ${gender === 'Nữ' ? 'rounded-b-xl' : 'rounded-b-md'}`}
                />
              </div>
            </div>
          </div>

          <form onSubmit={handleFinish} className="mt-4 flex flex-col gap-3.5">
            {/* Tên in trên áo */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="avatar-name" className={fieldLabel}>
                  Tên in trên áo của bạn
                </label>
                <button
                  type="button"
                  onClick={randomizeName}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#d8f95f]/80 hover:text-[#d8f95f] transition"
                  title="Gợi ý tên ngẫu nhiên"
                >
                  <Dices className="h-3 w-3" />
                  Gợi ý tên
                </button>
              </div>
              <div className={fieldBox}>
                <input
                  id="avatar-name"
                  type="text"
                  placeholder="Nhập tên bạn (VD: Tuấn, Linh, Bắp...)"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    if (error) setError('');
                  }}
                  maxLength={16}
                  autoFocus
                  className={fieldInput}
                />
                <span className="text-[10px] tabular-nums text-white/30">{nickname.length}/16</span>
              </div>
              {error && <p className="mt-1 text-xs text-rose-400 font-medium">{error}</p>}
            </div>

            {/* Giới tính / kiểu dáng */}
            <div>
              <span className={fieldLabel}>Kiểu tóc / ngoại hình</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {(['Nam', 'Nữ'] as AvatarGender[]).map((g) => {
                  const active = gender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setGender(g)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[12.5px] font-bold transition active:scale-[0.97] ${
                        active
                          ? 'border-[#d8f95f]/70 bg-[#d8f95f]/15 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/55 hover:text-white'
                      }`}
                    >
                      {g}
                      {active && <Check className="h-3.5 w-3.5 text-[#d8f95f]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Màu áo */}
            <div>
              <span className={fieldLabel}>Chọn màu áo thời trang</span>
              <div className="flex items-center justify-between gap-2 px-1">
                {AVATAR_SHIRT_COLORS.map((c) => {
                  const active = shirtColor === c.color;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      aria-label={c.label}
                      onClick={() => setShirtColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:scale-110 ${
                        active ? 'ring-2 ring-white/95 ring-offset-2 ring-offset-[#121614] scale-105' : ''
                      }`}
                    >
                      {active && <Check className="h-3.5 w-3.5 stroke-[3] text-black/75" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nút hoàn tất */}
            <button
              id="avatar-submit"
              type="submit"
              className={`${ctaButton} mt-3`}
            >
              <Clapperboard className="h-4 w-4" />
              {isOnboarding ? 'Chọn ghế và vào rạp' : 'Lưu thay đổi'}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
          </form>

          {/* Footer thông tin & nút Admin */}
          <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-[11px] text-white/45">
            <div className="flex items-center gap-1.5">
              <Armchair className="h-3.5 w-3.5 text-[#d8f95f]/70" />
              <span>100 ghế ngồi 3D · Realtime</span>
            </div>

            {onOpenAdminLogin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdminLogin();
                }}
                className="flex items-center gap-1 font-semibold text-amber-300 hover:text-amber-200 transition underline underline-offset-2"
                title="Đăng nhập dành cho Quản trị viên"
              >
                <Shield className="h-3 w-3" />
                Quản trị viên?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
