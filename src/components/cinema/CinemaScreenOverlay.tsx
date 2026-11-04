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
  setSubtitles?: (enable: boolean) => void;
  setPlaybackQuality?: (quality: string) => void;
  getPlaybackQuality?: () => string;
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
  isDimmed?: boolean;
  canControl?: boolean;
  showSubtitles?: boolean;
  quality?: string;
  onQualityChange?: (quality: string) => void;
  onToggleSubtitles?: (show: boolean) => void;
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
>(({ videoId, isPlaying = true, isDimmed = true, canControl = true, showSubtitles = false, quality = 'hd1080', onQualityChange, onToggleSubtitles, onReady, onStateChange, onTogglePlay, onPlay, onPause, onSeek, onOpenAddVideo }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [currentId, setCurrentId] = useState(videoId);
  const [localPlaying, setLocalPlaying] = useState(isPlaying);
  const [hasStarted, setHasStarted] = useState(false);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [currentQuality, setCurrentQuality] = useState(quality);
  const currentQualityRef = useRef(quality);
  currentQualityRef.current = currentQuality;

  // Helper to build YouTube Embed URL with JS API, origin and playsinline
  const buildEmbedUrl = useCallback((id: string, start = 0) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const originParam = origin ? `&origin=${encodeURIComponent(origin)}&widget_referrer=${encodeURIComponent(origin)}` : '';
    const startParam = start > 0 ? `&start=${Math.floor(start)}` : '';
    return `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&mute=0&controls=1&rel=0&playsinline=1&iv_load_policy=3&vq=hd1080&cc_load_policy=0${startParam}${originParam}`;
  }, []);

  // Stable iframe src that NEVER changes on quality or subtitles change (prevents iframe reload)
  const [embedSrc, setEmbedSrc] = useState(() => buildEmbedUrl(videoId, 0));

  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const isProgrammaticSeekRef = useRef(false);
  const isProgrammaticPlaybackRef = useRef(false);
  const lastOuterRef = useRef('');
  const lastInnerRef = useRef('');
  const lastPerspectiveRef = useRef('');
  const lastVisibleRef = useRef(true);

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

  // Ép luồng phát đạt độ phân giải (1080p, 4K, 720p hoặc Tự động) hoàn toàn mượt mà qua API, không reload iframe
  const applyQuality = useCallback((qualityLevel: string = 'hd1080') => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        if (qualityLevel === 'auto') {
          postCommand('setPlaybackQuality', ['default']);
          postCommand('setPlaybackQualityRange', ['default', 'highres']);
        } else {
          postCommand('setPlaybackQuality', [qualityLevel]);
          postCommand('setPlaybackQualityRange', [qualityLevel, qualityLevel]);
          postCommand('setOption', ['quality', 'quality', qualityLevel]);
        }
      }
    } catch {
      // ignore
    }
  }, [postCommand]);

  useEffect(() => {
    if (hasStarted) {
      applyQuality(quality);
    }
  }, [quality, hasStarted, applyQuality]);

  // Bật hoặc tắt phụ đề YouTube cho màn chiếu theo trạng thái đồng bộ
  const applySubtitleState = useCallback(
    (enabled: boolean) => {
      try {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          if (enabled) {
            postCommand('loadModule', ['captions']);
            postCommand('setOption', ['captions', 'track', { languageCode: 'vi' }]);
            postCommand('setOption', ['captions', 'reload', true]);
          } else {
            postCommand('unloadModule', ['captions']);
            postCommand('setOption', ['captions', 'track', {}]);
            postCommand('setOption', ['cc', 'track', {}]);
          }
        }
      } catch {
        // ignore
      }
    },
    [postCommand]
  );

  // Đồng bộ trạng thái phụ đề ngay khi prop showSubtitles thay đổi
  useEffect(() => {
    applySubtitleState(showSubtitles);
  }, [showSubtitles, applySubtitleState]);

  // Update video when prop changes
  useEffect(() => {
    if (videoId && videoId !== currentId) {
      setCurrentId(videoId);
      setHasStarted(false);
      setErrorCode(null);
      currentTimeRef.current = 0;
      const targetUrl = buildEmbedUrl(videoId, 0);
      setEmbedSrc(targetUrl);
      postCommand('loadVideoById', [{ videoId, startSeconds: 0 }]);
      postCommand('playVideo');
      setTimeout(() => {
        applyQuality(quality);
        applySubtitleState(showSubtitles);
      }, 500);
    }
  }, [videoId, currentId, buildEmbedUrl, postCommand, applyQuality, quality, applySubtitleState, showSubtitles]);

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

  // Relaxed handshake check: only query duration if not yet known; zero command spam during active playback
  useEffect(() => {
    const timer = setInterval(() => {
      if (iframeRef.current && durationRef.current <= 0) {
        sendListening();
        postCommand('getDuration');
        postCommand('getCurrentTime');
      }
    }, 4000);
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
          applyQuality(quality);
          applySubtitleState(showSubtitles);
          setHasStarted(true);
          setErrorCode(null);
        } else if (data.event === 'onError') {
          console.warn('[CinemaScreenOverlay] YouTube player error:', data.info);
          setErrorCode(Number(data.info) || 150);
        } else if (data.event === 'onPlaybackQualityChange' && data.info) {
          console.log('[CinemaScreenOverlay] YouTube quality changed to:', data.info);
          setCurrentQuality(data.info);
        } else if (data.event === 'onCaptionsChange') {
          const info = data.info;
          const isNowOn = Boolean(info && info !== 'none' && info !== '');
          if (canControl && onToggleSubtitles && isNowOn !== showSubtitles) {
            console.log('[CinemaScreenOverlay] Subtitle changed inside YouTube iframe to:', isNowOn);
            onToggleSubtitles(isNowOn);
          }
        } else if ((data.event === 'infoDelivery' || data.event === 'initialDelivery') && data.info) {
          if (data.info.playbackQuality) {
            setCurrentQuality(data.info.playbackQuality);
          }
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
            if (!isProgrammaticPlaybackRef.current && hasStarted) {
              if (canControl) {
                if (stateNum === 2 && isPlaying) {
                  console.log('[CinemaScreenOverlay] User paused directly on YouTube iframe');
                  onPause?.(currentTimeRef.current);
                } else if (stateNum === 1 && !isPlaying) {
                  console.log('[CinemaScreenOverlay] User resumed directly on YouTube iframe');
                  onPlay?.(currentTimeRef.current);
                }
              } else {
                // Khán giả bấm nhầm vào video: tự động duy trì trạng thái chiếu của phòng
                if (stateNum === 2 && isPlaying) {
                  postCommand('playVideo');
                } else if (stateNum === 1 && !isPlaying) {
                  postCommand('pauseVideo');
                }
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

          if (!isProgrammaticPlaybackRef.current && hasStarted) {
            if (canControl) {
              if (stateNum === 2 && isPlaying) {
                console.log('[CinemaScreenOverlay] User paused directly on YouTube iframe (onStateChange)');
                onPause?.(currentTimeRef.current);
              } else if (stateNum === 1 && !isPlaying) {
                console.log('[CinemaScreenOverlay] User resumed directly on YouTube iframe (onStateChange)');
                onPlay?.(currentTimeRef.current);
              }
            } else {
              if (stateNum === 2 && isPlaying) {
                postCommand('playVideo');
              } else if (stateNum === 1 && !isPlaying) {
                postCommand('pauseVideo');
              }
            }
          }
        }
      } catch {
        // Not a JSON message from YouTube iframe, ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onStateChange, postCommand, sendListening, onSeek, onPlay, onPause, isPlaying, hasStarted, canControl, showSubtitles, applySubtitleState, onToggleSubtitles, quality, applyQuality, onQualityChange]);

  const handleIframeLoad = useCallback(() => {
    sendListening();
    postCommand('playVideo');
    postCommand('getCurrentTime');
    setTimeout(() => {
      applyQuality(quality);
      applySubtitleState(showSubtitles);
    }, 300);
    setTimeout(() => {
      applyQuality(quality);
      applySubtitleState(showSubtitles);
    }, 1000);
    setTimeout(() => {
      applyQuality(quality);
    }, 2500);

    if (onReady) {
      const controls: YouTubePlayerControls = {
        loadVideoById: (id: string, startSeconds = 0) => {
          if (id === currentId) {
            currentTimeRef.current = startSeconds;
            isProgrammaticSeekRef.current = true;
            postCommand('seekTo', [startSeconds, true]);
            postCommand('playVideo');
            applyQuality(quality);
            setTimeout(() => {
              isProgrammaticSeekRef.current = false;
            }, 1200);
          } else {
            setCurrentId(id);
            setHasStarted(false);
            currentTimeRef.current = startSeconds;
            const targetUrl = buildEmbedUrl(id, startSeconds);
            setEmbedSrc(targetUrl);
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
  }, [currentId, onReady, postCommand, sendListening, buildEmbedUrl, showSubtitles, applySubtitleState, quality, applyQuality]);

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
        const targetUrl = buildEmbedUrl(id, startSeconds);
        setEmbedSrc(targetUrl);
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
      setSubtitles: (enable: boolean) => applySubtitleState(enable),
      setPlaybackQuality: (q: string) => applyQuality(q),
      getPlaybackQuality: () => currentQualityRef.current,
      getPlayer: () => ({
        mute: () => postCommand('mute'),
        unMute: () => postCommand('unMute'),
        isMuted: () => false,
        setSubtitles: (enable: boolean) => applySubtitleState(enable),
        setPlaybackQuality: (q: string) => applyQuality(q),
        getPlaybackQuality: () => currentQualityRef.current,
        loadModule: (mod: string) => postCommand('loadModule', [mod]),
        unloadModule: (mod: string) => postCommand('unloadModule', [mod]),
        setOption: (mod: string, opt: string, val: any) => postCommand('setOption', [mod, opt, val]),
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
            applyQuality(quality);
            setTimeout(() => {
              isProgrammaticSeekRef.current = false;
            }, 1200);
          } else {
            setCurrentId(vid);
            setHasStarted(false);
            currentTimeRef.current = 0;
            const targetUrl = buildEmbedUrl(vid, 0);
            setEmbedSrc(targetUrl);
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
          if (lastVisibleRef.current !== false) {
            lastVisibleRef.current = false;
            outerRef.current.style.display = 'none';
          }
          return;
        }
        if (lastVisibleRef.current !== true) {
          lastVisibleRef.current = true;
          outerRef.current.style.display = 'block';
        }
        if (lastPerspectiveRef.current !== perspective && containerRef.current && perspective) {
          lastPerspectiveRef.current = perspective;
          containerRef.current.style.perspective = perspective;
        }
        if (lastOuterRef.current !== outerTransform) {
          lastOuterRef.current = outerTransform;
          outerRef.current.style.transform = outerTransform;
        }
        if (lastInnerRef.current !== innerTransform) {
          lastInnerRef.current = innerTransform;
          innerRef.current.style.transform = innerTransform;
        }
      },
    }),
    [currentId, localPlaying, postCommand, buildEmbedUrl, showSubtitles, applySubtitleState, quality, applyQuality]
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
          WebkitTransformStyle: 'preserve-3d',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      >
        {/* Inner container updated by IMAX Screen Object Matrix */}
        <div
          ref={innerRef}
          style={{
            position: 'absolute',
            pointerEvents: canControl ? 'auto' : 'none',
            width: '1920px',
            height: '1080px',
            backgroundColor: '#000000',
            borderRadius: '4px',
            overflow: 'hidden',
            boxSizing: 'border-box',
            border: '1px solid rgba(254, 215, 170, 0.22)',
            boxShadow:
              '0 0 16px rgba(254, 215, 170, 0.12), 0 0 36px rgba(251, 191, 36, 0.05), 0 8px 30px rgba(0, 0, 0, 0.85)',
            transformOrigin: '50% 50%',
            willChange: 'transform',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
            imageRendering: '-webkit-optimize-contrast',
          }}
        >
          <iframe
            ref={iframeRef}
            src={embedSrc}
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
              imageRendering: '-webkit-optimize-contrast',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
            }}
          />

          {/* Hiệu ứng ánh sáng máy chiếu chiếu mờ lên màn hình khi BẬT ĐÈN KHÁN PHÒNG (Biến mất hoàn toàn khi TẮT ĐÈN) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 3,
              opacity: isDimmed ? 0 : 1,
              transition: 'opacity 0.85s cubic-bezier(0.4, 0, 0.2, 1)',
              background:
                'radial-gradient(ellipse 90% 80% at 50% 50%, rgba(255, 252, 240, 0.22) 0%, rgba(255, 246, 228, 0.15) 35%, rgba(240, 245, 255, 0.07) 70%, rgba(200, 220, 255, 0) 100%), linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
              mixBlendMode: 'screen',
            }}
          />

          {/* 1. Lỗi YouTube (Bản quyền / Chặn nhúng 150/101 / Video riêng tư 100) */}
          {errorCode !== null ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'auto',
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

