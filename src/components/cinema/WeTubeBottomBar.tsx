'use client';

import React, { useState } from 'react';
import {
  Maximize2,
  Armchair,
  Monitor,
  Users,
  DoorOpen,
  Smile,
  Send,
  Volume2,
  VolumeX
} from 'lucide-react';

interface WeTubeBottomBarProps {
  onSendChat?: (message: string) => void;
  onSetCameraPreset?: (preset: 'chair' | 'monitor' | 'audience' | 'overview') => void;
  onTogglePrivateRoom?: () => void;
  volume?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onVolumeChange?: (val: number) => void;
}

export function WeTubeBottomBar({
  onSendChat,
  onSetCameraPreset,
  onTogglePrivateRoom,
  volume = 80,
  isMuted = false,
  onToggleMute,
  onVolumeChange,
}: WeTubeBottomBarProps) {
  const [chatMessage, setChatMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojis = ['🍿', '🔥', '👏', '❤️', '😂', '🎉', '💃', '✨', '👍', '😱'];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = chatMessage.trim();
    if (!trimmed) return;
    onSendChat?.(trimmed);
    setChatMessage('');
    setShowEmojiPicker(false);
  };

  const handleAddEmoji = (emoji: string) => {
    setChatMessage((prev) => (prev + ' ' + emoji).trim());
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-center justify-between p-3 sm:p-5 select-none font-sans">
      {/* 1. Left: View Switchers + "Phòng riêng" button */}
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl">
          <button
            onClick={() => onSetCameraPreset?.('chair')}
            className="p-2 rounded-xl text-slate-400 hover:text-lime-300 hover:bg-white/10 transition"
            title="Góc nhìn ghế ngồi FPV"
          >
            <Armchair className="h-4 w-4" />
          </button>
          <button
            onClick={() => onSetCameraPreset?.('monitor')}
            className="p-2 rounded-xl text-slate-400 hover:text-lime-300 hover:bg-white/10 transition"
            title="Góc nhìn thẳng màn chiếu"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => onSetCameraPreset?.('audience')}
            className="p-2 rounded-xl text-slate-400 hover:text-lime-300 hover:bg-white/10 transition"
            title="Góc nhìn khán đài"
          >
            <Users className="h-4 w-4" />
          </button>
        </div>

        {/* Nút "Phòng riêng" */}
        <button
          onClick={onTogglePrivateRoom}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/60 border border-lime-400/30 text-lime-400 hover:bg-lime-400/20 backdrop-blur-xl text-xs font-semibold transition"
          title="Tạo hoặc tham gia phòng chiếu riêng"
        >
          <DoorOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Phòng riêng</span>
        </button>
      </div>

      {/* 2. Center: Chat Input Pill */}
      <div className="pointer-events-auto relative flex-1 max-w-lg mx-3">
        {showEmojiPicker && (
          <div className="absolute bottom-14 left-0 flex items-center gap-2 p-2 rounded-2xl bg-black/85 border border-white/15 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95">
            {emojis.map((emoji, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleAddEmoji(emoji)}
                className="text-lg hover:scale-125 transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 w-full px-4 py-2 rounded-full bg-black/70 border border-white/15 backdrop-blur-2xl shadow-2xl transition focus-within:border-lime-400/50"
        >
          {/* Smile Emoji Icon */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-slate-400 hover:text-lime-400 transition"
            title="Biểu cảm emoji"
          >
            <Smile className="h-5 w-5" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder="Nói gì với cả rạp đi..."
            maxLength={160}
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
          />

          {/* Character counter (0/160) */}
          <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
            {chatMessage.length}/160
          </span>

          {/* Send Arrow */}
          <button
            type="submit"
            disabled={!chatMessage.trim()}
            className="text-slate-400 hover:text-lime-400 disabled:opacity-30 disabled:hover:text-slate-400 transition"
            title="Gửi tin nhắn"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* 3. Right: Volume Controls (0%) */}
      <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl text-slate-300">
        <button
          onClick={onToggleMute}
          className="text-slate-400 hover:text-white transition"
          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="h-4 w-4 text-rose-400" />
          ) : (
            <Volume2 className="h-4 w-4 text-lime-400" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={isMuted ? 0 : volume}
          onChange={(e) => onVolumeChange?.(parseInt(e.target.value, 10))}
          className="w-16 h-1 appearance-none bg-white/20 rounded-full cursor-pointer accent-lime-400"
        />
        <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
          {isMuted ? '0%' : `${volume}%`}
        </span>
      </div>
    </div>
  );
}
