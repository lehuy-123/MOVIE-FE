'use client';

import React from 'react';
import {
  ChevronUp,
  Armchair,
  Plus,
  Image as ImageIcon,
  ListVideo,
  MessageSquare,
  Sparkles,
  Shirt,
  Heart
} from 'lucide-react';

interface WeTubeSidebarProps {
  currentSeatId?: string | null;
  onOpenSeatMap?: () => void;
  onOpenAddVideo?: () => void;
  onOpenWardrobe?: () => void;
  onSendReaction?: (emoji: string) => void;
}

export function WeTubeSidebar({
  currentSeatId = 'B06',
  onOpenSeatMap,
  onOpenAddVideo,
  onOpenWardrobe,
  onSendReaction,
}: WeTubeSidebarProps) {
  const [showReactions, setShowReactions] = React.useState(false);

  return (
    <aside className="pointer-events-none fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center select-none font-sans">
      <div className="pointer-events-auto flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-black/65 border border-white/10 backdrop-blur-2xl shadow-2xl text-slate-300">
        {/* Up arrow */}
        <button
          className="p-1 text-slate-400 hover:text-white transition"
          title="Cuộn lên"
        >
          <ChevronUp className="h-4 w-4" />
        </button>

        {/* 1. Seat Badge: B06 */}
        <button
          onClick={onOpenSeatMap}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-lime-400/20 hover:text-lime-300 transition w-14 group"
          title="Đổi ghế ngồi trong rạp"
        >
          <Armchair className="h-4 w-4 text-lime-400 mb-0.5" />
          <span className="text-[10px] font-bold text-white group-hover:text-lime-300 font-mono">
            {currentSeatId || 'Chọn ghế'}
          </span>
        </button>

        <div className="w-8 h-[1px] bg-white/10 my-0.5" />

        {/* 2. + Gửi video */}
        <button
          onClick={onOpenAddVideo}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-blue-500/20 hover:text-blue-300 transition w-14 group"
          title="Gửi link video YouTube"
        >
          <Plus className="h-4 w-4 text-blue-400 mb-0.5" />
          <span className="text-[9px] font-semibold text-slate-300 group-hover:text-blue-300">
            Gửi video
          </span>
        </button>

        {/* 3. Chiếu ảnh */}
        <button
          onClick={() => alert('Tính năng chiếu ảnh / meme trên màn hình!')}
          className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/10 transition w-14 group"
          title="Chiếu ảnh meme"
        >
          <ImageIcon className="h-4 w-4 text-slate-400 group-hover:text-white mb-0.5" />
          <span className="text-[9px] font-semibold text-slate-400 group-hover:text-white">
            Chiếu ảnh
          </span>
        </button>

        {/* 4. Hàng chờ (100) */}
        <button
          onClick={onOpenAddVideo}
          className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/10 transition w-14 group relative"
          title="Danh sách hàng chờ phát"
        >
          <ListVideo className="h-4 w-4 text-slate-400 group-hover:text-white mb-0.5" />
          <span className="text-[9px] font-semibold text-slate-400 group-hover:text-white">
            Hàng chờ
          </span>
          <span className="absolute top-1 right-1 text-[8px] font-bold bg-lime-400 text-black px-1 rounded-full">
            100
          </span>
        </button>

        {/* 5. Trò chuyện (99+) */}
        <button
          className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/10 transition w-14 group relative"
          title="Phòng trò chuyện"
        >
          <MessageSquare className="h-4 w-4 text-slate-400 group-hover:text-white mb-0.5" />
          <span className="text-[9px] font-semibold text-slate-400 group-hover:text-white">
            Trò chuyện
          </span>
          <span className="absolute top-1 right-1 text-[8px] font-bold bg-rose-500 text-white px-1 rounded-full">
            99+
          </span>
        </button>

        {/* 6. Tương tác */}
        <div className="relative">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/10 transition w-14 group"
            title="Thả cảm xúc tương tác"
          >
            <Sparkles className="h-4 w-4 text-amber-400 mb-0.5" />
            <span className="text-[9px] font-semibold text-slate-400 group-hover:text-white">
              Tương tác
            </span>
          </button>

          {showReactions && (
            <div className="absolute right-16 top-0 flex flex-col gap-1 p-2 rounded-2xl bg-black/85 border border-white/15 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95">
              {['👏 Vỗ tay', '🔥 Cháy', '❤️ Yêu thích', '🍿 Ăn bắp', '🎉 Quẩy'].map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onSendReaction?.(emoji);
                    setShowReactions(false);
                  }}
                  className="px-2.5 py-1 text-xs text-slate-200 hover:text-white hover:bg-white/10 rounded-xl whitespace-nowrap text-left transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 7. Tủ đồ */}
        <button
          onClick={onOpenWardrobe}
          className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-purple-500/20 hover:text-purple-300 transition w-14 group"
          title="Đổi màu áo & nhân vật"
        >
          <Shirt className="h-4 w-4 text-purple-400 mb-0.5" />
          <span className="text-[9px] font-semibold text-slate-400 group-hover:text-purple-300">
            Tủ đồ
          </span>
        </button>

        {/* 8. Ủng hộ */}
        <button
          onClick={() => alert('Cảm ơn bạn đã đồng hành cùng wetube ciné!')}
          className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-rose-500/20 hover:text-rose-300 transition w-14 group"
          title="Ủng hộ rạp phim"
        >
          <Heart className="h-4 w-4 text-rose-400 mb-0.5" />
          <span className="text-[9px] font-semibold text-slate-400 group-hover:text-rose-300">
            Ủng hộ
          </span>
        </button>
      </div>
    </aside>
  );
}
