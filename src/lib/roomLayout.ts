/** Kích thước phòng chiếu (đơn vị mét, trục -z là hướng về màn chiếu). */
export const ROOM = {
  width: 38,
  height: 19,
  /** Tường phía sau màn chiếu */
  zFront: -11,
  /** Tường phía sau hàng ghế cuối (mở rộng về sau tương ứng khi lùi các hàng ghế) */
  zBack: 30.5,
} as const;

export const ROOM_DEPTH = ROOM.zBack - ROOM.zFront;
export const ROOM_CENTER_Z = (ROOM.zBack + ROOM.zFront) / 2;

/** Màn chiếu 16:9 siêu lớn IMAX gắn sát tường trước (chiều rộng 27.2m x chiều cao 15.3m). */
export const SCREEN = {
  width: 27.2,
  height: 15.3,
  y: 9.4,
  z: -10.4,
} as const;

/** Góc nhìn bao quát từ trên cao phía sau (high-angle / isometric). */
export const OVERVIEW_CAMERA = {
  position: [0, 16.0, 35.5] as [number, number, number],
  target: [0, 5.5, 4.0] as [number, number, number],
  fov: 55,
} as const;
