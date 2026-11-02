'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { YouTubePlayerControls } from '@/types/youtube';

export interface CinemaScreenOverlayHandle {
  loadVideoById: (id: string, startSeconds?: number) => void;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  getPlayer: () => any;
  updateTransform: (
    outerTransform: string,
    innerTransform: string,
    perspective: string,
    isVisible: boolean
  ) => void;
}

export interface CinemaScreenOverlayProps {
  videoId: string;
  isPlaying?: boolean;
  onReady?: (controls: YouTubePlayerControls) => void;
  onStateChange?: (state: number) => void;
  onTogglePlay?: () => void;
}

export const CinemaScreenOverlay = forwardRef<
  CinemaScreenOverlayHandle,
  CinemaScreenOverlayProps
>(({ videoId, isPlaying = true, onReady, onStateChange, onTogglePlay }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [currentId, setCurrentId] = useState(videoId);
  const [localPlaying, setLocalPlaying] = useState(isPlaying);
  const [hasStarted, setHasStarted] = useState(false);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);

  // Helper to build YouTube Embed URL with JS API, origin and playsinline
  const buildEmbedUrl = useCallback((id: string, start = 0) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const originParam = origin ? `&origin=${encodeURIComponent(origin)}` : '';
    const startParam = start > 0 ? `&start=${Math.floor(start)}` : '';
    return `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&mute=0&controls=1&rel=0&playsinline=1&iv_load_policy=3${startParam}${originParam}`;
  }, []);

  // Send command to YouTube iframe via standard postMessage
  const postCommand = useCallback((func: string, args: (string | number | boolean | Record<string, any>)[] = []) => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      }
    } catch {
      // ignore
    }
  }, []);

  // Update video when prop changes
  useEffect(() => {
    if (videoId && videoId !== currentId) {
      setCurrentId(videoId);
      setHasStarted(false);
      postCommand('loadVideoById', [{ videoId, startSeconds: 0 }]);
      postCommand('playVideo');
      if (iframeRef.current) {
        const targetUrl = buildEmbedUrl(videoId, 0);
        if (iframeRef.current.src !== targetUrl) {
          iframeRef.current.src = targetUrl;
        }
      }
    }
  }, [videoId, currentId, buildEmbedUrl, postCommand]);

  // Sync prop isPlaying with local state
  useEffect(() => {
    setLocalPlaying(isPlaying);
  }, [isPlaying]);

  // Listen to YouTube player state events sent via postMessage
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data) return;

        if (data.event === 'onReady') {
          postCommand('playVideo');
          setHasStarted(true);
        } else if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            currentTimeRef.current = data.info.currentTime;
          }
          if (typeof data.info.duration === 'number') {
            durationRef.current = data.info.duration;
          }
          if (typeof data.info.playerState === 'number') {
            const playing = data.info.playerState === 1;
            setLocalPlaying(playing);
            if (data.info.playerState === 1 || data.info.playerState === 2) {
              setHasStarted(true);
            }
            onStateChange?.(data.info.playerState);
          }
        } else if (data.event === 'onStateChange') {
          const playing = data.info === 1;
          setLocalPlaying(playing);
          if (data.info === 1 || data.info === 2) {
            setHasStarted(true);
          }
          onStateChange?.(data.info);
        }
      } catch {
        // Not a JSON message from YouTube iframe, ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onStateChange, postCommand]);

  const handleIframeLoad = useCallback(() => {
    postCommand('listening');
    postCommand('playVideo');

    if (onReady) {
      const controls: YouTubePlayerControls = {
        loadVideoById: (id: string, startSeconds = 0) => {
          if (id === currentId) {
            postCommand('seekTo', [startSeconds, true]);
            postCommand('playVideo');
          } else {
            setCurrentId(id);
            setHasStarted(false);
            if (iframeRef.current) {
              iframeRef.current.src = buildEmbedUrl(id, startSeconds);
            }
          }
        },
        play: () => {
          setLocalPlaying(true);
          postCommand('playVideo');
        },
        pause: () => {
          setLocalPlaying(false);
          postCommand('pauseVideo');
        },
        seekTo: (sec: number) => postCommand('seekTo', [sec, true]),
        getCurrentTime: () => currentTimeRef.current,
        getDuration: () => durationRef.current,
        setVolume: (vol: number) => postCommand('setVolume', [vol]),
        isReady: true,
        isPlaying: true,
        currentTime: 0,
        duration: durationRef.current,
        currentVideoId: currentId,
      };

      onReady(controls);
    }
  }, [currentId, onReady, postCommand, buildEmbedUrl]);

  // Expose imperative handle for external control
  useImperativeHandle(
    ref,
    () => ({
      loadVideoById: (id: string, startSeconds = 0) => {
        if (!id) return;
        setCurrentId(id);
        setHasStarted(false);
        postCommand('loadVideoById', [{ videoId: id, startSeconds: Math.floor(startSeconds) }]);
        postCommand('playVideo');
        if (iframeRef.current) {
          const targetUrl = buildEmbedUrl(id, startSeconds);
          if (iframeRef.current.src !== targetUrl) {
            iframeRef.current.src = targetUrl;
          }
        }
      },
      play: () => {
        setHasStarted(true);
        setLocalPlaying(true);
        postCommand('playVideo');
      },
      pause: () => {
        setLocalPlaying(false);
        postCommand('pauseVideo');
      },
      seekTo: (sec: number) => postCommand('seekTo', [sec, true]),
      getCurrentTime: () => currentTimeRef.current,
      getDuration: () => durationRef.current,
      setVolume: (vol: number) => postCommand('setVolume', [vol]),
      getPlayer: () => ({
        mute: () => postCommand('mute'),
        unMute: () => postCommand('unMute'),
        isMuted: () => false,
        playVideo: () => {
          setLocalPlaying(true);
          postCommand('playVideo');
        },
        pauseVideo: () => {
          setLocalPlaying(false);
          postCommand('pauseVideo');
        },
        seekTo: (sec: number) => postCommand('seekTo', [sec, true]),
        getCurrentTime: () => currentTimeRef.current,
        getDuration: () => durationRef.current,
        setVolume: (vol: number) => postCommand('setVolume', [vol]),
        loadVideoById: (id: string | { videoId: string }) => {
          const vid = typeof id === 'string' ? id : id.videoId;
          if (vid === currentId) {
            postCommand('seekTo', [0, true]);
            postCommand('playVideo');
          } else {
            setCurrentId(vid);
            setHasStarted(false);
            if (iframeRef.current) {
              iframeRef.current.src = buildEmbedUrl(vid, 0);
            }
          }
        },
        cueVideoById: () => {},
        stopVideo: () => postCommand('stopVideo'),
        getPlayerState: () => (localPlaying ? 1 : 2),
        getVideoUrl: () => `https://www.youtube.com/watch?v=${currentId}`,
        getVolume: () => 100,
        destroy: () => {},
        getIframe: () => iframeRef.current as HTMLIFrameElement,
      }),
      updateTransform: (
        outerTransform: string,
        innerTransform: string,
        perspective: string,
        isVisible: boolean
      ) => {
        if (!outerRef.current || !innerRef.current) return;
        if (!isVisible) {
          outerRef.current.style.display = 'none';
          return;
        }
        outerRef.current.style.display = 'block';
        if (containerRef.current && perspective) {
          containerRef.current.style.perspective = perspective;
        }
        outerRef.current.style.transform = outerTransform;
        innerRef.current.style.transform = innerTransform;
      },
    }),
    [currentId, localPlaying, postCommand, buildEmbedUrl]
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 5,
      }}
    >
      {/* Outer container updated by Three.js Camera Matrix */}
      <div
        ref={outerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      >
        {/* Inner container updated by IMAX Screen Object Matrix */}
        <div
          ref={innerRef}
          style={{
            position: 'absolute',
            pointerEvents: 'auto',
            width: '1920px',
            height: '1080px',
            backgroundColor: '#000000',
            borderRadius: '4px',
            overflow: 'hidden',
            boxShadow: localPlaying ? '0 0 120px rgba(96, 165, 250, 0.4)' : 'none',
            transformOrigin: '50% 50%',
            willChange: 'transform',
          }}
        >
          <iframe
            ref={iframeRef}
            src={buildEmbedUrl(currentId, 0)}
            title="3D Cinema YouTube Screen"
            onLoad={handleIframeLoad}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              position: 'absolute',
              inset: 0,
              pointerEvents: 'auto',
            }}
          />

          {/* Click to start / unmute overlay if autoplay was blocked */}
          {!hasStarted && (
            <div
              onClick={() => {
                setHasStarted(true);
                setLocalPlaying(true);
                postCommand('playVideo');
                postCommand('unMute');
                if (!isPlaying) {
                  onTogglePlay?.();
                }
              }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                cursor: 'pointer',
                zIndex: 10,
                color: '#fff',
                fontFamily: 'sans-serif',
              }}
            >
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: '#d8f95f',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '52px',
                  fontWeight: 'bold',
                  boxShadow: '0 0 60px rgba(216, 249, 95, 0.6)',
                  marginBottom: '24px',
                  transition: 'transform 0.2s',
                }}
              >
                ▶
              </div>
              <p
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  margin: '0 0 8px 0',
                  textShadow: '0 4px 12px rgba(0,0,0,0.8)',
                }}
              >
                BẤM ĐỂ BẮT ĐẦU CHIẾU PHIM
              </p>
              <p style={{ fontSize: '20px', color: '#cbd5e1', margin: 0, opacity: 0.85 }}>
                Đồng bộ âm thanh & hình ảnh rạp chiếu WeTube
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CinemaScreenOverlay.displayName = 'CinemaScreenOverlay';

