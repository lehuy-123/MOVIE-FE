'use client';

import React, { useState } from 'react';
import { FastForward, Check } from 'lucide-react';

interface WeTubeVideoCardProps {
  videoTitle?: string;
  suggester?: string;
  currentTimeStr?: string;
  durationStr?: string;
  onlineCount?: number;
  initialVotes?: number;
  onVoteSkip?: () => void;
}

export function WeTubeVideoCard({
  videoTitle = 'Avicii - Wake Me Up (Official Video)',
  suggester = 'Phòng chiếu',
  currentTimeStr = '0:00',
  durationStr = '0:00',
  onlineCount = 1,
  initialVotes = 0,
  onVoteSkip,
}: WeTubeVideoCardProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [votes, setVotes] = useState(initialVotes);

  const neededVotes = Math.ceil(onlineCount * 0.35); // 35% needed to skip
  const percentage = Math.min(100, Math.round((votes / neededVotes) * 100));

  const handleVote = () => {
    if (hasVoted) return;
    setHasVoted(true);
    setVotes((prev) => prev + 1);
    onVoteSkip?.();
  };

  return (
    <div className="pointer-events-none fixed top-20 left-4 sm:left-6 z-20 flex flex-col gap-2 max-w-sm select-none font-sans">
      <div className="pointer-events-auto flex flex-col gap-2">
        {/* Category Label */}
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          TRÊN MÀN ẢNH
        </span>

        {/* Video Title & Suggester */}
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug drop-shadow-md line-clamp-2">
            {videoTitle}
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {suggester} đề xuất · {currentTimeStr} / {durationStr}
          </p>
        </div>

        {/* Vote Bỏ Qua Button & Progress Bar */}
        <div className="flex flex-col gap-1.5 mt-1">
          <button
            onClick={handleVote}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition shadow-xl backdrop-blur-xl ${
              hasVoted
                ? 'bg-lime-500/20 border-lime-400 text-lime-300'
                : 'bg-black/60 hover:bg-black/80 border-white/10 text-white hover:border-lime-400/50'
            }`}
          >
            {hasVoted ? (
              <Check className="h-4 w-4 text-lime-400" />
            ) : (
              <FastForward className="h-4 w-4 text-lime-400" />
            )}
            <span>Vote bỏ qua {votes}/{neededVotes}</span>
          </button>

          {/* Progress bar and explanation */}
          <div className="flex flex-col gap-1">
            <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-lime-400 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              {votes}/{onlineCount} người thật đồng ý · {Math.round((votes / onlineCount) * 100)}% | Đủ 35% thì chuyển bài
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
