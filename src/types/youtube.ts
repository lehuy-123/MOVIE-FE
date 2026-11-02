export interface YouTubePlayer {
  loadVideoById: (
    videoId: string | { videoId: string; startSeconds?: number; endSeconds?: number },
    startSeconds?: number
  ) => void;
  cueVideoById: (
    videoId: string | { videoId: string; startSeconds?: number; endSeconds?: number },
    startSeconds?: number
  ) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getVideoUrl: () => string;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  destroy: () => void;
  getIframe: () => HTMLIFrameElement;
}

export type YouTubePlayerState =
  | -1 // UNSTARTED
  | 0  // ENDED
  | 1  // PLAYING
  | 2  // PAUSED
  | 3  // BUFFERING
  | 5; // CUED

export interface YouTubePlayerControls {
  loadVideoById: (id: string, startSeconds?: number) => void;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentVideoId: string;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          width?: string | number;
          height?: string | number;
          videoId?: string;
          playerVars?: {
            autoplay?: 0 | 1;
            controls?: 0 | 1;
            disablekb?: 0 | 1;
            enablejsapi?: 0 | 1;
            fs?: 0 | 1;
            modestbranding?: 0 | 1;
            origin?: string;
            rel?: 0 | 1;
            start?: number;
            [key: string]: unknown;
          };
          events?: {
            onReady?: (event: { target: YouTubePlayer }) => void;
            onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
            onError?: (event: { data: number; target: YouTubePlayer }) => void;
          };
        }
      ) => YouTubePlayer;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
