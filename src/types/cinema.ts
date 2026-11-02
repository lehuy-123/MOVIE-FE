export type SeatState = 'empty' | 'occupied' | 'selected' | 'bot';

export interface SeatData {
  id: string; // e.g. "A01", "B06"
  row: number; // 0..9 (A..J)
  col: number; // 0..9 (1..10)
  type?: 'single' | 'double' | 'triple' | 'vip';
  position: [number, number, number];
  state: SeatState;
  occupiedBy?: string;
  avatarColor?: string;
}

export type AvatarGender = 'Nam' | 'Nữ';

export const AVATAR_SHIRT_COLORS = [
  { id: 'moss', color: '#b9cf8f', label: 'Xanh rêu' },
  { id: 'peach', color: '#e0a08a', label: 'Cam pastel' },
  { id: 'baby', color: '#9fb4e0', label: 'Xanh baby' },
  { id: 'lilac', color: '#c9a3d6', label: 'Tím pastel' },
  { id: 'butter', color: '#e8c872', label: 'Vàng pastel' },
  { id: 'mint', color: '#8fd1c4', label: 'Mint' },
];

export const DEFAULT_SHIRT_COLOR = AVATAR_SHIRT_COLORS[0].color;

export interface UserProfile {
  nickname: string;
  gender: AvatarGender;
  shirtColor: string;
  seatId: string | null;
  coins: number;
}
