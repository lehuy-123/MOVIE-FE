'use client';

import React, { useEffect, useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  Clapperboard,
  ArrowRight,
  ArrowLeft,
  Armchair,
  AlertCircle,
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
   * 'onboarding': Bước 1 (vé vào rạp) → Bước 2 (tạo nhân vật) → chuyển sang Bước 3 (chọn ghế).
   * 'wardrobe': chỉ mở Bước 2 để đổi tên/áo khi đang ở trong rạp.
   */
  mode?: 'onboarding' | 'wardrobe';
  onClose: () => void;
  onComplete: (profile: UserProfile) => void;
  initialNickname?: string;
  initialGender?: AvatarGender;
  initialColor?: string;
}

const ACCOUNTS_KEY = 'wetube-cine:accounts';

async function hashPassword(username: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${username.toLowerCase()}::${password}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function readAccounts(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
  } catch {
    return {};
  }
}

const eyebrow = 'text-[10px] font-bold tracking-[0.22em] text-[#d8f95f] uppercase';
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
  initialNickname = '',
  initialGender = 'Nam',
  initialColor = DEFAULT_SHIRT_COLOR,
}: TicketModalProps) {
  const [step, setStep] = useState<1 | 2>(mode === 'wardrobe' ? 2 : 1);

  // Step 1
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Step 2
  const [nickname, setNickname] = useState(initialNickname);
  const [gender, setGender] = useState<AvatarGender>(initialGender);
  const [shirtColor, setShirtColor] = useState(initialColor);

  useEffect(() => {
    if (!isOpen || mode !== 'wardrobe') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, mode, onClose]);

  if (!isOpen) return null;

  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setError('');
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim();
    if (name.length < 4) return setError('Tài khoản cần ít nhất 4 ký tự.');
    if (password.length < 6) return setError('Mật khẩu cần ít nhất 6 ký tự.');

    setBusy(true);
    try {
      const accounts = readAccounts();
      const key = name.toLowerCase();
      const hash = await hashPassword(name, password);

      if (activeTab === 'register') {
        if (password !== confirm) return setError('Mật khẩu xác nhận chưa khớp.');
        if (!agree) return setError('Bạn cần đồng ý Điều khoản sử dụng và Chính sách quyền riêng tư.');
        if (accounts[key]) return setError('Tài khoản này đã tồn tại. Hãy đăng nhập nhé.');
        accounts[key] = hash;
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      } else {
        if (!accounts[key]) return setError('Chưa có tài khoản này. Hãy chuyển sang "Tạo tài khoản".');
        if (accounts[key] !== hash) return setError('Mật khẩu chưa đúng.');
      }

      setError('');
      setNickname((prev) => prev || name);
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = () => {
    setError('');
    setNickname((prev) => prev || `Khách ${Math.floor(100 + Math.random() * 900)}`);
    setStep(2);
  };

  const handleFinish = () => {
    onComplete({
      nickname: nickname.trim() || 'Khách',
      gender,
      shirtColor,
      seatId: null,
      coins: 0,
    });
  };

  const isOnboarding = mode === 'onboarding';
  const printedName = nickname.trim() || 'Tên bạn';

  return (
    <div
      className={`wt-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-[3px] select-none ${
        isOnboarding ? 'bg-black/55' : 'bg-black/65'
      }`}
    >
      <div className="wt-card relative max-h-[94vh] w-full max-w-[420px] overflow-y-auto wt-scroll rounded-[28px] border border-white/10 bg-[#141814]/90 p-7 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-md sm:p-8">
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

        {/* ───────── BƯỚC 1: VÉ VÀO RẠP CỦA BẠN ───────── */}
        {step === 1 && (
          <div key="step-1" className="wt-step flex flex-col">
            <span className={eyebrow}>Vé vào rạp của bạn</span>
            <h1 className="mt-4 text-[28px] font-bold leading-[1.15] tracking-tight text-white">
              Video hay hơn
              <br />
              khi <span className="text-[#d8f95f]/90">xem cùng nhau.</span>
            </h1>
            <p className="mt-4 text-xs leading-relaxed text-white/45">
              Một nhân vật nhỏ, một chỗ ngồi riêng.
              <br />
              Vào rạp và mang theo gu của bạn.
            </p>

            {/* Tabs */}
            <div role="tablist" className="mt-6 flex gap-7 border-b border-white/10 text-[13px] font-semibold">
              {(
                [
                  ['login', 'Đăng nhập'],
                  ['register', 'Tạo tài khoản'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  id={`tab-${id}`}
                  role="tab"
                  aria-selected={activeTab === id}
                  type="button"
                  onClick={() => switchTab(id)}
                  className={`relative pb-3 transition ${
                    activeTab === id ? 'text-white' : 'text-white/40 hover:text-white/75'
                  }`}
                >
                  {label}
                  <span
                    className={`absolute inset-x-0 -bottom-px h-0.5 origin-left rounded-full bg-[#d8f95f] transition-transform duration-300 ${
                      activeTab === id ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </button>
              ))}
            </div>

            <form onSubmit={handleStep1Submit} className="mt-5 flex flex-col gap-4" noValidate>
              <div>
                <label htmlFor="ticket-username" className={fieldLabel}>
                  Tài khoản
                </label>
                <div className={fieldBox}>
                  <User className="h-4 w-4 shrink-0 text-white/40" />
                  <input
                    id="ticket-username"
                    type="text"
                    autoComplete="username"
                    placeholder="Ít nhất 4 ký tự"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={fieldInput}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ticket-password" className={fieldLabel}>
                  Mật khẩu
                </label>
                <div className={fieldBox}>
                  <Lock className="h-4 w-4 shrink-0 text-white/40" />
                  <input
                    id="ticket-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                    placeholder="Ít nhất 6 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={fieldInput}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="text-white/40 transition hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {activeTab === 'register' && (
                <>
                  <div className="wt-step">
                    <label htmlFor="ticket-confirm" className={fieldLabel}>
                      Xác nhận mật khẩu
                    </label>
                    <div className={fieldBox}>
                      <Lock className="h-4 w-4 shrink-0 text-white/40" />
                      <input
                        id="ticket-confirm"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Nhập lại mật khẩu"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className={fieldInput}
                      />
                    </div>
                  </div>

                  <label className="wt-step flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-white/70">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        agree ? 'border-[#d8f95f] bg-[#d8f95f]' : 'border-white/25 bg-white/5'
                      }`}
                    >
                      {agree && <Check className="h-3.5 w-3.5 stroke-[3] text-black" />}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                    />
                    <span>
                      Tôi đã đọc và đồng ý với{' '}
                      <a className="font-semibold text-[#d8f95f] underline underline-offset-2" href="#">
                        Điều khoản sử dụng
                      </a>{' '}
                      và{' '}
                      <a className="font-semibold text-[#d8f95f] underline underline-offset-2" href="#">
                        Chính sách quyền riêng tư
                      </a>
                      .
                    </span>
                  </label>
                </>
              )}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-xs text-red-200"
                >
                  <AlertCircle className="mt-px h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button id="ticket-submit" type="submit" disabled={busy} className={`${ctaButton} mt-1 disabled:opacity-60`}>
                {activeTab === 'login' ? 'Vào rạp thôi' : 'Tạo tài khoản & vào rạp'}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
            </form>

            {activeTab === 'login' && (
              <p className="mt-4 text-center text-[11px] text-white/45">
                <a className="font-medium text-[#d8f95f]/90 underline underline-offset-2" href="#">
                  Điều khoản sử dụng
                </a>{' '}
                ·{' '}
                <a className="font-medium text-[#d8f95f]/90 underline underline-offset-2" href="#">
                  Quyền riêng tư
                </a>
              </p>
            )}

            <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-[11px] text-white/45">
              <Armchair className="h-3.5 w-3.5" />
              <span>100 chỗ ngồi. Vô vàn câu chuyện.</span>
            </div>

            <button
              id="ticket-guest"
              type="button"
              onClick={handleGuest}
              className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#d8f95f]/25 bg-white/[0.03] py-3.5 text-[13px] font-semibold text-[#e9ffa0] transition hover:border-[#d8f95f]/60 hover:bg-[#d8f95f]/10 active:scale-[0.98]"
            >
              <Clapperboard className="h-4 w-4" />
              Video / Nghe nhạc
            </button>
          </div>
        )}

        {/* ───────── BƯỚC 2: BẠN SẼ LÀ AI TRONG RẠP? ───────── */}
        {step === 2 && (
          <div key="step-2" className="wt-step flex flex-col">
            <span className={eyebrow}>Wetube ciné / Cùng nhau</span>
            <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight">Bạn sẽ là ai trong rạp?</h1>
            <p className="mt-2 text-xs leading-relaxed text-white/45">
              Tên của bạn được in trên áo. Tin nhắn sẽ hiện trên đầu nhân vật.
            </p>

            {/* Avatar preview (nhìn từ phía sau, tên in trên lưng áo) */}
            <div className="relative mt-5 flex h-52 items-end justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/30">
              <div className="pointer-events-none absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[#d8f95f]/10 blur-3xl" />
              <div className="absolute bottom-3 h-3 w-28 rounded-[50%] bg-black/60 blur-md" />
              <div className="relative mb-4 flex flex-col items-center transition-transform duration-500 hover:scale-105">
                {/* Đầu + tóc */}
                <div className="relative z-10 h-[50px] w-[52px]">
                  <div className="absolute inset-0 rounded-[22px] bg-[#f1c9a5]" />
                  <div
                    className={`absolute inset-x-[-2px] top-[-3px] bg-[#4a2e1a] ${
                      gender === 'Nữ' ? 'bottom-[-14px] rounded-[24px_24px_16px_16px]' : 'bottom-[4px] rounded-[24px_24px_10px_10px]'
                    }`}
                  />
                </div>
                {/* Áo */}
                <div
                  className="relative -mt-1.5 flex h-[74px] w-[84px] items-center justify-center rounded-[18px] shadow-[inset_0_-6px_12px_rgba(0,0,0,0.12)] transition-colors duration-300"
                  style={{ backgroundColor: shirtColor }}
                >
                  <span className="max-w-[72px] truncate text-[10px] font-extrabold tracking-tight text-black/75">
                    {printedName}
                  </span>
                  <div
                    className="absolute -left-2.5 top-2 h-9 w-3.5 rounded-full transition-colors duration-300"
                    style={{ backgroundColor: shirtColor }}
                  />
                  <div
                    className="absolute -right-2.5 top-2 h-9 w-3.5 rounded-full transition-colors duration-300"
                    style={{ backgroundColor: shirtColor }}
                  />
                </div>
                {/* Quần / váy */}
                <div className="-mt-1 flex gap-1">
                  <div className={`h-9 w-[38px] bg-[#3a4046] ${gender === 'Nữ' ? 'rounded-b-xl' : 'rounded-b-md'}`} />
                  <div className={`h-9 w-[38px] bg-[#3a4046] ${gender === 'Nữ' ? 'rounded-b-xl' : 'rounded-b-md'}`} />
                </div>
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="avatar-name" className={fieldLabel}>
                Tên in trên áo
              </label>
              <div className={fieldBox}>
                <input
                  id="avatar-name"
                  type="text"
                  placeholder="Mọi người gọi bạn là gì?"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={16}
                  className={fieldInput}
                />
                <span className="text-[10px] tabular-nums text-white/30">{nickname.length}/16</span>
              </div>
            </div>

            <div className="mt-4">
              <span className={fieldLabel}>Giới tính / ngoại hình</span>
              <div className="grid grid-cols-2 gap-2.5" role="radiogroup">
                {(['Nam', 'Nữ'] as AvatarGender[]).map((g) => {
                  const active = gender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setGender(g)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-3 text-[13px] font-bold transition active:scale-[0.97] ${
                        active
                          ? 'border-[#d8f95f]/70 bg-[#d8f95f]/10 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white'
                      }`}
                    >
                      {g}
                      {active && <Check className="h-3.5 w-3.5 text-[#d8f95f]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <span className={fieldLabel}>Màu áo</span>
              <div className="flex items-center gap-3.5">
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
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:scale-110 ${
                        active ? 'ring-2 ring-white/90 ring-offset-2 ring-offset-[#141814]' : ''
                      }`}
                    >
                      {active && <Check className="h-4 w-4 stroke-[3] text-black/70" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button id="avatar-submit" type="button" onClick={handleFinish} className={`${ctaButton} mt-6`}>
              {isOnboarding ? 'Chọn ghế và vào rạp' : 'Lưu thay đổi'}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>

            {isOnboarding && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mx-auto mt-3 flex items-center gap-1.5 text-[11px] font-medium text-white/40 transition hover:text-white"
              >
                <ArrowLeft className="h-3 w-3" /> Quay lại vé vào rạp
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
