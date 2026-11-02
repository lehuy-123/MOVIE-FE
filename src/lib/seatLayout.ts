import type { SeatData } from '@/types/cinema';

/** 10 hàng (A..J) */
export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/**
 * 10 cột chia 3 cụm (có lối đi giữa các cụm):
 *  - Trái:  01 (đơn) + 02·03 (đôi)
 *  - Giữa:  04·05·06 (ba)
 *  - Phải:  07·08·09 (ba) + 10 (đơn)
 */
export const COL_X_POSITIONS = [-8.05, -6.55, -5.35, -2.25, -0.45, 1.35, 4.45, 5.65, 6.85, 8.05];

/** Hai lối đi giữa các cụm ghế (x). */
export const AISLE_X_POSITIONS = [-3.8, 2.9];

export const ROW_Z_POSITIONS = [-1.0, 0.7, 2.4, 4.1, 5.8, 7.5, 9.2, 10.9, 12.6, 14.3];

export const ROW_Y_POSITIONS = [0.2, 0.45, 0.7, 0.95, 1.2, 1.45, 1.7, 1.95, 2.2, 2.45];

export type SeatKind = NonNullable<SeatData['type']>;

export function getSeatKind(id: string): SeatKind {
  if (id === 'D05' || id === 'D06') return 'vip';
  const colIndex = parseInt(id.slice(1), 10) - 1;
  if (colIndex === 1 || colIndex === 2) return 'double';
  if (colIndex >= 3 && colIndex <= 8) return 'triple';
  return 'single';
}

export const SEAT_KIND_LABEL: Record<SeatKind, string> = {
  single: 'Ghế đơn',
  double: 'Ghế đôi',
  triple: 'Ghế ba',
  vip: 'Ghế VIP',
};

/** Dựng SeatData đầy đủ (vị trí 3D thật) từ mã ghế như "B06". */
export function buildSeatData(id: string): SeatData | null {
  const row = ROWS.indexOf(id.charAt(0));
  const col = parseInt(id.slice(1), 10) - 1;
  if (row < 0 || Number.isNaN(col) || col < 0 || col >= COL_X_POSITIONS.length) return null;
  return {
    id,
    row,
    col,
    type: getSeatKind(id),
    position: [COL_X_POSITIONS[col], ROW_Y_POSITIONS[row], ROW_Z_POSITIONS[row]],
    state: 'selected',
  };
}
