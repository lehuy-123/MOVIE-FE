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
  canControl?: boolean;
  onReady?: (controls: YouTubePlayerControls) => void;
  onStateChange?: (state: number) => void;
  onTogglePlay?: () => void;
  onPlay?: (timestamp?: number) => void;
  onPause?: (timestamp?: number) => void;
  onSeek?: (timestamp: number) => void;
  onOpenAddVideo?: () => void;
}

export const CinemaScreenOverlay = forwardRef<
  CinemaScreenOverlayHandle,
  CinemaScreenOverlayProps
>(({ videoId, isPlaying = true, canControl = true, onReady, onStateChange, onTogglePlay, onPlay, onPause, onSeek, onOpenAddVideo }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [currentId, setCurrentId] = useState(videoId);
  const [localPlaying, setLocalPlaying] = useState(isPlaying);
  const [hasStarted, setHasStarted] = useState(false);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const isProgrammaticSeekRef = useRef(false);
  const isProgrammaticPlaybackRef = useRef(false);

  // Helper to build YouTube Embed URL with JS API, origin and playsinline
  const buildEmbedUrl = useCallback((id: string, start = 0) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const originParam = origin ? `&origin=${encodeURIComponent(origin)}&widget_referrer=${encodeURIComponent(origin)}` : '';
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

  // Tell YouTube iframe that window is listening for events
  const sendListening = useCallback(() => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening' }),
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
      setErrorCode(null);
      currentTimeRef.current = 0;
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

  // Sync prop isPlaying with local YouTube player
  useEffect(() => {
    setLocalPlaying(isPlaying);
    if (!hasStarted) return;
    isProgrammaticPlaybackRef.current = true;
    if (isPlaying) {
      postCommand('playVideo');
    } else {
      postCommand('pauseVideo');
    }
    const timer = setTimeout(() => {
      isProgrammaticPlaybackRef.current = false;
    }, 800);
    return () => clearTimeout(timer);
  }, [isPlaying, hasStarted, postCommand]);

  // Periodic handshake / sync query to ensure YouTube iframe delivers currentTime & duration
  useEffect(() => {
    const timer = setInterval(() => {
      sendListening();
      if (iframeRef.current) {
        postCommand('getCurrentTime');
        if (durationRef.current <= 0) {
          postCommand('getDuration');
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sendListening, postCommand]);

  // Listen to YouTube player state events sent via postMessage
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        let data = e.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }
        if (!data || typeof data !== 'object') return;

        if (data.event === 'onReady') {
          sendListening();
          postCommand('playVideo');
          postCommand('getCurrentTime');
          setHasStarted(true);
          setErrorCode(null);
        } else if (data.event === 'onError') {
          console.warn('[CinemaScreenOverlay] YouTube player error:', data.info);
          setErrorCode(Number(data.info) || 150);
        } else if ((data.event === 'infoDelivery' || data.event === 'initialDelivery') && data.info) {
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            durationRef.current = data.info.duration;
          }
          if (typeof data.info.currentTime === 'number') {
            const newTime = data.info.currentTime;
            const prevTime = currentTimeRef.current;
            currentTimeRef.current = newTime;

            // Detect user seeking using YouTube player native scrubber
            if (
              !isProgrammaticSeekRef.current &&
              durationRef.current > 0 &&
              prevTime > 0 &&
              canControl &&
              Math.abs(newTime - prevTime) > 2.0
            ) {
              console.log(
                `[CinemaScreenOverlay] Detected internal seek: ${prevTime.toFixed(1)}s -> ${newTime.toFixed(1)}s`
              );
              onSeek?.(newTime);
            }
          }
          if (typeof data.info.playerState === 'number') {
            const stateNum = data.info.playerState;
            const playing = stateNum === 1;
            setLocalPlaying(playing);
            if (stateNum === 1 || stateNum === 2) {
              setHasStarted(true);
            }
            onStateChange?.(stateNum);

            // User clicked pause or play directly on YouTube player
            if (!isProgrammaticPlaybackRef.current && hasStarted && canControl) {
              if (stateNum === 2 && isPlaying) {
                console.log('[CinemaScreenOverlay] User paused directly on YouTube iframe');
                onPause?.(currentTimeRef.current);
              } else if (stateNum === 1 && !isPlaying) {
                console.log('[CinemaScreenOverlay] User resumed directly on YouTube iframe');
                onPlay?.(currentTimeRef.current);
              }
            }
          }
        } else if (data.event === 'onStateChange') {
          const stateNum = Number(data.info);
          const playing = stateNum === 1;
          setLocalPlaying(playing);
          if (stateNum === 1 || stateNum === 2) {
            setHasStarted(true);
          }
          onStateChange?.(stateNum);

          if (!isProgrammaticPlaybackRef.current && hasStarted && canControl) {
            if (stateNum === 2 && isPlaying) {
              console.log('[CinemaScreenOverlay] User paused directly on YouTube iframe (onStateChange)');
              onPause?.(currentTimeRef.current);
            } else if (stateNum === 1 && !isPlaying) {
              console.log('[CinemaScreenOverlay] User resumed directly on YouTube iframe (onStateChange)');
              onPlay?.(currentTimeRef.current);
            }
          }
        }
      } catch {
        // Not a JSON message from YouTube iframe, ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onStateChange, postCommand, sendListening, onSeek, onPlay, onPause, isPlaying, hasStarted, canControl]);

  const handleIframeLoad = useCallback(() => {
    sendListening();
    postCommand('playVideo');
    postCommand('getCurrentTime');

    if (onReady) {
      const controls: YouTubePlayerControls = {
        loadVideoById: (id: string, startSeconds = 0) => {
          if (id === currentId) {
            currentTimeRef.current = startSeconds;
            isProgrammaticSeekRef.current = true;
            postCommand('seekTo', [startSeconds, true]);
            postCommand('playVideo');
            setTimeout(() => {
              isProgrammaticSeekRef.current = false;
            }, 1200);
          } else {
            setCurrentId(id);
            setHasStarted(false);
            currentTimeRef.current = startSeconds;
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
        seekTo: (sec: number) => {
          currentTimeRef.current = sec;
          isProgrammaticSeekRef.current = true;
          postCommand('seekTo', [sec, true]);
          setTimeout(() => {
            isProgrammaticSeekRef.current = false;
          }, 1200);
        },
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
  }, [currentId, onReady, postCommand, sendListening, buildEmbedUrl]);

  // Expose imperative handle for external control
  useImperativeHandle(
    ref,
    () => ({
      loadVideoById: (id: string, startSeconds = 0) => {
        if (!id) return;
        const isSameVideo = id === currentId;
        if (isSameVideo) {
          // If video is already loaded, only seek and play without reloading the iframe
          if (startSeconds > 0) {
            currentTimeRef.current = startSeconds;
            isProgrammaticSeekRef.current = true;
            postCommand('seekTo', [startSeconds, true]);
            setTimeout(() => {
              isProgrammaticSeekRef.current = false;
            }, 1200);
          }
          postCommand('playVideo');
          return;
        }

        setCurrentId(id);
        setHasStarted(false);
        currentTimeRef.current = startSeconds;
        isProgrammaticSeekRef.current = true;
        postCommand('loadVideoById', [{ videoId: id, startSeconds: Math.floor(startSeconds) }]);
        postCommand('playVideo');
        if (iframeRef.current) {
          const targetUrl = buildEmbedUrl(id, startSeconds);
          if (iframeRef.current.src !== targetUrl) {
            iframeRef.current.src = targetUrl;
          }
        }
        setTimeout(() => {
          isProgrammaticSeekRef.current = false;
        }, 1200);
      },
      play: () => {
        isProgrammaticPlaybackRef.current = true;
        setHasStarted(true);
        setLocalPlaying(true);
        postCommand('playVideo');
        setTimeout(() => {
          isProgrammaticPlaybackRef.current = false;
        }, 800);
      },
      pause: () => {
        isProgrammaticPlaybackRef.current = true;
        setLocalPlaying(false);
        postCommand('pauseVideo');
        setTimeout(() => {
          isProgrammaticPlaybackRef.current = false;
        }, 800);
      },
      seekTo: (sec: number) => {
        currentTimeRef.current = sec;
        isProgrammaticSeekRef.current = true;
        postCommand('seekTo', [sec, true]);
        setTimeout(() => {
          isProgrammaticSeekRef.current = false;
        }, 1200);
      },
      getCurrentTime: () => currentTimeRef.current,
      getDuration: () => durationRef.current,
      setVolume: (vol: number) => postCommand('setVolume', [vol]),
      getPlayer: () => ({
        mute: () => postCommand('mute'),
        unMute: () => postCommand('unMute'),
        isMuted: () => false,
        playVideo: () => {
          isProgrammaticPlaybackRef.current = true;
          setLocalPlaying(true);
          postCommand('playVideo');
          setTimeout(() => {
            isProgrammaticPlaybackRef.current = false;
          }, 800);
        },
        pauseVideo: () => {
          isProgrammaticPlaybackRef.current = true;
          setLocalPlaying(false);
          postCommand('pauseVideo');
          setTimeout(() => {
            isProgrammaticPlaybackRef.current = false;
          }, 800);
        },
        seekTo: (sec: number) => {
          currentTimeRef.current = sec;
          isProgrammaticSeekRef.current = true;
          postCommand('seekTo', [sec, true]);
          setTimeout(() => {
            isProgrammaticSeekRef.current = false;
          }, 1200);
        },
        getCurrentTime: () => currentTimeRef.current,
        getDuration: () => durationRef.current,
        setVolume: (vol: number) => postCommand('setVolume', [vol]),
        loadVideoById: (id: string | { videoId: string }) => {
          const vid = typeof id === 'string' ? id : id.videoId;
          if (vid === currentId) {
            currentTimeRef.current = 0;
            isProgrammaticSeekRef.current = true;
            postCommand('seekTo', [0, true]);
            postCommand('playVideo');
            setTimeout(() => {
              isProgrammaticSeekRef.current = false;
            }, 1200);
          } else {
            setCurrentId(vid);
            setHasStarted(false);
            currentTimeRef.current = 0;
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
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.65)',
            transformOrigin: '50% 50%',
            willChange: 'transform',
          }}
        >
          <iframe
            ref={iframeRef}
            src={buildEmbedUrl(currentId, 0)}
            title="3D Cinema YouTube Screen"
            onLoad={handleIframeLoad}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              position: 'absolute',
              inset: 0,
              pointerEvents: canControl ? 'auto' : 'none',
            }}
          />

          {/* 1. Lỗi YouTube (Bản quyền / Chặn nhúng 150/101 / Video riêng tư 100) */}
          {errorCode !== null ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(9, 12, 18, 0.96)',
                backdropFilter: 'blur(10px)',
                zIndex: 20,
                color: '#fff',
                padding: '40px',
                textAlign: 'center',
                fontFamily: 'sans-serif',
              }}
            >
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '2px solid rgba(239, 68, 68, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '44px',
                  color: '#f87171',
                  marginBottom: '20px',
                  boxShadow: '0 0 50px rgba(239, 68, 68, 0.35)',
                }}
              >
                ⚠️
              </div>
              <h2 style={{ fontSize: '30px', fontWeight: 800, margin: '0 0 12px 0', color: '#f87171' }}>
                Phim Không Thể Phát Trong Rạp (Lỗi YouTube {errorCode})
              </h2>
              <p style={{ fontSize: '18px', color: '#cbd5e1', maxWidth: '750px', lineHeight: 1.6, margin: '0 0 28px 0' }}>
                {errorCode === 150 || errorCode === 101
                  ? 'Chủ sở hữu video này đã cài đặt TẮT tính năng nhúng bên ngoài (Bản quyền âm nhạc / phân phối độc quyền trên YouTube).'
                  : errorCode === 100
                  ? 'Video này không tồn tại, đã bị xóa hoặc đang ở chế độ riêng tư.'
                  : 'Không thể phát video này do giới hạn trình phát của YouTube.'}
              </p>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <a
                  href={`https://www.youtube.com/watch?v=${currentId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '12px 24px',
                    borderRadius: '9999px',
                    backgroundColor: '#1e293b',
                    color: '#f1f5f9',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  🔗 Xem Trực Tiếp Trên YouTube
                </a>
                {onOpenAddVideo && (
                  <button
                    onClick={onOpenAddVideo}
                    style={{
                      padding: '12px 26px',
                      borderRadius: '9999px',
                      backgroundColor: '#d8f95f',
                      color: '#000',
                      border: 'none',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 0 30px rgba(216, 249, 95, 0.45)',
                    }}
                  >
                    🎬 Đổi Sang Phim Khác
                  </button>
                )}
              </div>
            </div>
          ) : !hasStarted ? (
            /* 2. Click to start / unmute overlay if autoplay was blocked */
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
          ) : null}
        </div>
      </div>
    </div>
  );
});

CinemaScreenOverlay.displayName = 'CinemaScreenOverlay';

