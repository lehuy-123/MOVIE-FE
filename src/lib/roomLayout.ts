/** Kích thước phòng chiếu (đơn vị mét, trục -z là hướng về màn chiếu). */
export const ROOM = {
  width: 38,
  height: 19,
  /** Tường phía sau màn chiếu */
  zFront: -11,
  /** Tường phía sau hàng ghế cuối */
  zBack: 21,
} as const;

export const ROOM_DEPTH = ROOM.zBack - ROOM.zFront;
export const ROOM_CENTER_Z = (ROOM.zBack + ROOM.zFront) / 2;

/** Màn chiếu 16:9 gắn sát tường trước. */
export const SCREEN = {
  width: 25,
  height: 14.0625,
  y: 9.3,
  z: -10.4,
} as const;

/** Góc nhìn bao quát từ trên cao phía sau (high-angle / isometric). */
export const OVERVIEW_CAMERA = {
  position: [0, 14.5, 26] as [number, number, number],
  target: [0, 5.0, -1] as [number, number, number],
  fov: 55,
} as const;
