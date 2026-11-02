'use client';

import React from 'react';
import { SafeHtml } from './SafeHtml';
import { RoomUser, ChatMessage } from '@/types/socket';

interface UserAvatarProps {
  user: RoomUser;
  activeBubble?: ChatMessage;
  isCurrentUser?: boolean;
}

// Seat coordinates mapping helper matching SeatGrid tiers and columns
export function getSeatCoordinates(seatId: string): [number, number, number] | null {
  if (!seatId || seatId.length < 2) return null;
  const rowLetter = seatId[0].toUpperCase();
  const colNumber = parseInt(seatId.substring(1), 10);

  const rowLetters = ['A', 'B', 'C', 'D'];
  const rowIndex = rowLetters.indexOf(rowLetter);
  if (rowIndex === -1 || isNaN(colNumber) || colNumber < 1 || colNumber > 6) {
    return null;
  }

  const rowZPositions = [2.5, 5.8, 9.1, 12.4];
  const rowYPositions = [0.5, 0.9, 1.3, 1.7];
  const colXPositions = [-6.2, -3.7, -1.2, 1.2, 3.7, 6.2];

  const x = colXPositions[colNumber - 1];
  const y = rowYPositions[rowIndex];
  const z = rowZPositions[rowIndex];

  return [x, y, z];
}

export function UserAvatar({ user, activeBubble, isCurrentUser = false }: UserAvatarProps) {
  if (!user.seatId) return null;

  const seatPos = getSeatCoordinates(user.seatId);
  if (!seatPos) return null;

  const [x, y, z] = seatPos;
  const avatarColor = user.avatarColor || '#3b82f6';

  return (
    <group position={[x, y, z]}>
      {/* 1. Low-poly 3D Avatar seated in the cinema chair */}
      {/* Don't render avatar body if it's current user in FPV mode so it doesn't clip camera */}
      <group position={[0, 0, 0]}>
        {/* Thân người (Torso) */}
        <mesh position={[0, 1.1, 0.1]} castShadow receiveShadow>
          <capsuleGeometry args={[0.26, 0.45, 8, 12]} />
          <meshStandardMaterial
            color={avatarColor}
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>

        {/* Đầu avatar (Head) */}
        <mesh position={[0, 1.65, 0.15]} castShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
        </mesh>

        {/* Kính 3D Cinema thời thượng (Cinema 3D Glasses) */}
        <group position={[0, 1.68, 0.0]}>
          <mesh>
            <boxGeometry args={[0.3, 0.08, 0.08]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} />
          </mesh>
          {/* Mắt kính trái (Cyan) */}
          <mesh position={[-0.08, 0, -0.045]}>
            <planeGeometry args={[0.1, 0.06]} />
            <meshBasicMaterial color="#06b6d4" />
          </mesh>
          {/* Mắt kính phải (Red) */}
          <mesh position={[0.08, 0, -0.045]}>
            <planeGeometry args={[0.1, 0.06]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      </group>

      {/* 2. Bong bóng Chat 3D (Floating Speech Bubble with 5-second lifetime) */}
      {activeBubble && (
        <SafeHtml
          position={[0, 2.38, 0.15]}
          center
          distanceFactor={15}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div className="flex flex-col items-center animate-chat-bubble">
            {/* Bubble Container */}
            <div
              className="relative max-w-xs sm:max-w-sm rounded-2xl p-3 text-xs shadow-2xl backdrop-blur-xl border flex flex-col gap-1 transition-all"
              style={{
                backgroundColor: 'rgba(10, 14, 23, 0.88)',
                borderColor: avatarColor,
                boxShadow: `0 8px 30px rgba(0, 0, 0, 0.6), 0 0 15px ${avatarColor}40`,
              }}
            >
              {/* Nickname & Seat Badge */}
              <div className="flex items-center gap-1.5 font-bold">
                <span
                  className="h-2 w-2 rounded-full inline-block"
                  style={{ backgroundColor: avatarColor }}
                />
                <span style={{ color: avatarColor }} className="font-semibold">
                  {user.nickname}
                </span>
                <span className="text-[10px] text-slate-400 bg-white/10 px-1.5 py-0.2 rounded font-mono">
                  {user.seatId}
                </span>
                {isCurrentUser && (
                  <span className="text-[9px] text-blue-300 font-normal">(Tôi)</span>
                )}
              </div>

              {/* Message Content */}
              <p className="text-white text-xs leading-relaxed font-sans font-medium break-words">
                {activeBubble.message}
              </p>
            </div>

            {/* Speech Bubble Arrow pointing to avatar head */}
            <div
              className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px]"
              style={{
                borderTopColor: avatarColor,
              }}
            />
          </div>

          <style jsx>{`
            @keyframes chatBubbleLifecycle {
              0% {
                opacity: 0;
                transform: scale(0.6) translateY(12px);
              }
              8% {
                opacity: 1;
                transform: scale(1.04) translateY(-2px);
              }
              14% {
                transform: scale(1) translateY(0);
              }
              80% {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
              100% {
                opacity: 0;
                transform: scale(0.85) translateY(-14px);
              }
            }
            .animate-chat-bubble {
              animation: chatBubbleLifecycle 5s ease-out forwards;
            }
          `}</style>
        </SafeHtml>
      )}
    </group>
  );
}
