'use client';

import React, { useState } from 'react';
import {
  Crown,
  Lock,
  User,
  Eye,
  EyeOff,
  X,
  ShieldCheck,
  LogOut,
  Film,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLogin: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  onLogout: () => void;
  onOpenAddVideo?: () => void;
}

export function AdminLoginModal({
  isOpen,
  onClose,
  isAdmin,
  onLogin,
  onLogout,
  onOpenAddVideo,
}: AdminLoginModalProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username.trim()) {
      setError('Vui lòng nhập tên tài khoản Admin.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu Admin.');
      return;
    }

    setBusy(true);
    try {
      const res = await onLogin(username.trim(), password);
      if (res.ok) {
        setSuccessMsg('Đăng nhập Quản trị viên thành công!');
        setPassword('');
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 1000);
      } else {
        setError(res.message || 'Sai tên đăng nhập hoặc mật khẩu Admin.');
      }
    } catch {
      setError('Không thể kết nối đến máy chủ.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-sans">
      <div className="relative w-full max-w-md rounded-[28px] border border-amber-400/30 bg-[#12141a]/95 p-6 sm:p-7 shadow-[0_25px_80px_-15px_rgba(245,158,11,0.25)] text-white backdrop-blur-xl">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-5 top-5 rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Trạng thái ĐÃ LÀ ADMIN */}
        {isAdmin ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300 ring-2 ring-amber-400/40 shadow-lg">
              <Crown className="h-9 w-9" />
            </div>

            <div className="mt-4 flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/40 px-3 py-1 text-xs font-bold text-amber-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Đã xác thực quyền Quản trị viên (Host)
            </div>

            <h2 className="mt-3 text-2xl font-black text-white">Bạn đang là Admin</h2>
            <p className="mt-1.5 text-xs text-white/60 leading-relaxed max-w-sm">
              Bạn có toàn quyền thay đổi phim trực tiếp, tua / tạm dừng video đồng bộ với toàn bộ khán giả trong rạp.
            </p>

            <div className="mt-6 flex flex-col w-full gap-2.5">
              {onOpenAddVideo && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAddVideo();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3.5 text-sm font-bold text-black shadow-lg transition hover:bg-amber-300 active:scale-[0.98]"
                >
                  <Film className="h-4 w-4" />
                  Mở Bảng Đổi Phim / Chiếu Ngay
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-3 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20 active:scale-[0.98]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất quyền Admin
              </button>
            </div>
          </div>
        ) : (
          /* Form ĐĂNG NHẬP ADMIN */
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/40">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-400">
                  Cổng Quản Trị Rạp
                </span>
                <h2 className="text-xl font-black text-white leading-tight">Đăng Nhập Admin</h2>
              </div>
            </div>

            <p className="mt-3 text-xs text-white/55 leading-relaxed">
              Dành riêng cho Quản trị viên muốn thay đổi phim hoặc điều khiển phát lại. Khán giả xem phim bình thường không cần đăng nhập.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3.5">
              <div>
                <label className="block mb-1.5 text-xs font-bold text-white/80">
                  Tài khoản Quản trị
                </label>
                <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 transition focus-within:border-amber-400/70 focus-within:bg-white/[0.06]">
                  <User className="h-4 w-4 text-white/40 shrink-0" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tên tài khoản (mặc định: admin)"
                    className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold text-white/80">
                  Mật khẩu Admin
                </label>
                <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 transition focus-within:border-amber-400/70 focus-within:bg-white/[0.06]">
                  <Lock className="h-4 w-4 text-white/40 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu Admin"
                    className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-white/40 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xác thực...
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4" />
                    Mở Khóa Quyền Admin
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-white/10 text-center text-[11px] text-white/40">
              Mẹo: Tài khoản mặc định là <span className="font-mono text-amber-300">admin</span> / <span className="font-mono text-amber-300">admin123</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

