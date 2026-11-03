import type { SeatData } from '@/types/cinema';

/** 10 hàng (A..J) */
export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/**
 * 10 cột chia 3 cụm rộng rãi, đối xứng, ghế cách nhau 1.9m thoáng đãng:
 *  - Cụm Trái (3 ghế):  01, 02, 03  [-10.5, -8.6, -6.7]
 *  - Lối đi Trái:      x = -4.78 (rộng ~3.85m)
 *  - Cụm Giữa (4 ghế):  04, 05 (VIP), 06 (VIP), 07  [-2.85, -0.95, 0.95, 2.85]
 *  - Lối đi Phải:      x = +4.78 (rộng ~3.85m)
 *  - Cụm Phải (3 ghế):  08, 09, 10  [6.7, 8.6, 10.5]
 */
export const COL_X_POSITIONS = [-10.5, -8.6, -6.7, -2.85, -0.95, 0.95, 2.85, 6.7, 8.6, 10.5];

/** Hai lối đi rộng rãi giữa các cụm ghế (x). */
export const AISLE_X_POSITIONS = [-4.78, 4.78];

export const ROW_Z_POSITIONS = [-1.0, 0.8, 2.6, 4.4, 6.2, 8.0, 9.8, 11.6, 13.4, 15.2];

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
