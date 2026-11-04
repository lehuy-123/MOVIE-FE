export type VideoPlaybackStatus = 'playing' | 'paused';

export interface RoomUser {
  socketId: string;
  sessionId?: string | null;
  nickname: string;
  seatId: string | null;
  avatarColor: string;
  gender?: 'Nam' | 'Nữ';
  joinedAt: number;
  isAdmin?: boolean;
  canControl?: boolean;
  isChatMuted?: boolean;
  isMicMuted?: boolean;
  isMicOn?: boolean;
  isSpeaking?: boolean;
}

export interface VideoRequestItem {
  id: string;
  videoId: string;
  videoTitle: string;
  requestedBy: string;
  requestedBySocketId: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  socketId: string;
  nickname: string;
  seatId: string | null;
  avatarColor: string;
  message: string;
  createdAt: number;
}

export interface RoomState {
  roomId: string;
  name?: string;
  order?: number;
  hostId?: string | null;
  videoId: string;
  videoTitle?: string;
  status: VideoPlaybackStatus;
  timestamp: number; // Video progress in seconds
  updatedAt: number; // Timestamp (ms) when state was last modified
  serverTime: number; // Server's current timestamp (ms)
  users: RoomUser[];
  skipVotes: string[]; // List of socketIds who voted to skip
  queue?: VideoRequestItem[];
  chatHistory?: ChatMessage[];
  showSubtitles?: boolean;
}

export interface RoomSummary {
  roomId: string;
  name: string;
  order: number;
  viewersCount: number;
  videoId: string;
  videoTitle: string;
  status: VideoPlaybackStatus;
}

export interface VideoSyncPayload {
  timestamp: number;
  updatedAt: number;
  serverTime: number;
  status: VideoPlaybackStatus;
  videoId?: string;
  videoTitle?: string;
  senderId?: string;
}

export interface ClientToServerEvents {
  'join-room': (payload: { roomId: string; nickname?: string; avatarColor?: string; gender?: 'Nam' | 'Nữ'; seatId?: string | null; adminToken?: string; sessionId?: string }) => void;
  'switch-room': (payload: { newRoomId: string; nickname?: string; avatarColor?: string; gender?: 'Nam' | 'Nữ'; seatId?: string | null; adminToken?: string; sessionId?: string }) => void;
  'get-rooms': () => void;
  'create-room': (payload: { roomId: string; name: string }) => void;
  'admin-login': (payload: { username?: string; password?: string }, ack?: (res: { ok: boolean; token?: string; message?: string }) => void) => void;
  'admin-logout': (payload?: { adminToken?: string }, ack?: (res: { ok: boolean }) => void) => void;
  'user-play': (payload: { timestamp: number }) => void;
  'user-pause': (payload: { timestamp: number }) => void;
  'user-seek': (payload: { timestamp: number }) => void;
  'user-change-video': (payload: { videoId: string; videoTitle?: string }) => void;
  'request-video': (payload: { videoId: string; videoTitle?: string }) => void;
  'admin-manage-queue': (payload: { action: 'play' | 'remove'; requestId?: string; videoId?: string; videoTitle?: string }) => void;
  'claim-admin': (payload?: { key?: string }) => void;
  'user-select-seat': (payload: { seatId: string; nickname?: string; avatarColor?: string; gender?: 'Nam' | 'Nữ' }) => void;
  'user-leave-seat': () => void;
  'user-chat': (payload: { message: string }) => void;
  'user-vote-skip': () => void;
  'user-update-profile': (payload: { nickname: string; avatarColor?: string; gender?: 'Nam' | 'Nữ' }) => void;
  'admin-toggle-control': (payload: { targetSocketId: string; canControl: boolean }) => void;
  'admin-toggle-chat-mute': (payload: { targetSocketId: string; isMuted?: boolean }) => void;
  'admin-toggle-mic-mute': (payload: { targetSocketId: string; isMuted?: boolean }) => void;
  'user-mic-status': (payload: { isMicOn: boolean; isSpeaking: boolean }) => void;
  'user-toggle-subtitles': (payload?: { showSubtitles?: boolean }) => void;
  'webrtc-offer': (payload: { to: string; offer: RTCSessionDescriptionInit }) => void;
  'webrtc-answer': (payload: { to: string; answer: RTCSessionDescriptionInit }) => void;
  'webrtc-ice-candidate': (payload: { to: string; candidate: RTCIceCandidateInit }) => void;
}

export interface ServerToClientEvents {
  'room-state': (state: RoomState) => void;
  'rooms-list': (rooms: RoomSummary[]) => void;
  'sync-play': (payload: VideoSyncPayload) => void;
  'sync-pause': (payload: VideoSyncPayload) => void;
  'sync-seek': (payload: VideoSyncPayload) => void;
  'sync-video': (payload: { videoId: string; videoTitle?: string; updatedAt: number; suggester?: string }) => void;
  'queue-updated': (queue: VideoRequestItem[]) => void;
  'error-message': (payload: { message: string }) => void;
  'user-joined': (user: RoomUser) => void;
  'user-left': (payload: { socketId: string; seatId: string | null }) => void;
  'users-updated': (users: RoomUser[]) => void;
  'chat-message': (message: ChatMessage) => void;
  'skip-votes-updated': (votes: { count: number; total: number; voters: string[] }) => void;
  'admin-muted-chat': (payload: { isMuted: boolean }) => void;
  'admin-muted-mic': (payload: { isMuted: boolean }) => void;
  'sync-subtitles': (payload: { showSubtitles: boolean; senderId?: string }) => void;
  'webrtc-offer': (payload: { from: string; offer: RTCSessionDescriptionInit }) => void;
  'webrtc-answer': (payload: { from: string; answer: RTCSessionDescriptionInit }) => void;
  'webrtc-ice-candidate': (payload: { from: string; candidate: RTCIceCandidateInit }) => void;
}
