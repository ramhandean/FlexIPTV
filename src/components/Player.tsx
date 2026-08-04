import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RefreshCw,
  AlertTriangle,
  PictureInPicture,
  Tv,
  Radio,
  ExternalLink,
  ShieldAlert,
  Globe
} from 'lucide-react';
import type { Channel, PlayerSettings } from '../types/iptv';

interface PlayerProps {
  channel: Channel | null;
  settings: PlayerSettings;
  onUpdateSettings: (newSettings: Partial<PlayerSettings>) => void;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
}

export const Player: React.FC<PlayerProps> = ({
  channel,
  settings,
  onUpdateSettings,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<dashjs.MediaPlayerClass | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(settings.muted);
  const [volume, setVolume] = useState<number>(settings.volume);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [useProxyForCurrentStream, setUseProxyForCurrentStream] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<any>(null);

  // Reset local proxy state when channel changes
  useEffect(() => {
    setUseProxyForCurrentStream(false);
  }, [channel?.id]);

  // Determine if current stream is proxied based on proxyMode settings & local state
  const isStreamProxied = (ch: Channel | null): boolean => {
    if (!ch) return false;
    const mode = settings.proxyMode || 'auto';
    if (mode === 'direct') return false;
    if (mode === 'proxy') return true;
    
    // Auto mode: route via proxy by default to prevent initial CORS errors on live streams
    return true;
  };

  // Construct stream URL (applying CORS proxy & header forwarding if needed)
  const getStreamUrl = (ch: Channel | null): string => {
    if (!ch?.url) return '';
    const rawUrl = ch.url;

    if (isStreamProxied(ch)) {
      const proxyBase = settings.corsProxy && settings.corsProxy.trim() ? settings.corsProxy : '/api/proxy?url=';
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      
      if (proxyBase.includes('/api/proxy')) {
        let proxyUrl = `${origin}/api/proxy?url=${encodeURIComponent(rawUrl)}`;
        if (ch.userAgent) proxyUrl += `&userAgent=${encodeURIComponent(ch.userAgent)}`;
        if (ch.referer) proxyUrl += `&referer=${encodeURIComponent(ch.referer)}`;
        return proxyUrl;
      }
      return `${proxyBase}${encodeURIComponent(rawUrl)}`;
    }

    return rawUrl;
  };

  // Video loader hook
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel?.url) return;

    setError(null);
    setIsBuffering(true);

    const targetUrl = getStreamUrl(channel);
    const rawUrlLower = channel.url.toLowerCase();
    const isMpd = rawUrlLower.includes('.mpd') || targetUrl.toLowerCase().includes('.mpd');

    // Clean up previous HLS and DASH instances
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashRef.current) {
      dashRef.current.reset();
      dashRef.current = null;
    }

    if (isMpd) {
      // MPEG-DASH playback via dash.js
      try {
        const dashPlayer = dashjs.MediaPlayer().create();
        dashRef.current = dashPlayer;

        if (channel.drmKey) {
          if (channel.drmKey.includes(':')) {
            const [keyId, key] = channel.drmKey.split(':').map((s) => s.trim());
            dashPlayer.setProtectionData({
              'org.w3.clearkey': {
                clearkeys: {
                  [keyId]: key,
                },
              },
            });
          } else if (channel.drmKey.startsWith('http')) {
            dashPlayer.setProtectionData({
              'com.widevine.alpha': {
                serverURL: channel.drmKey,
              },
            });
          }
        }

        dashPlayer.initialize(video, targetUrl, settings.autoPlay);

        dashPlayer.on(dashjs.MediaPlayer.events.CAN_PLAY, () => {
          setIsBuffering(false);
          setError(null);
        });

        dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
          console.warn('DashJS Error:', e);
          if (!useProxyForCurrentStream && !channel.userAgent && !channel.referer) {
            console.info('Direct MPD playback failed, retrying automatically with stream proxy...');
            setUseProxyForCurrentStream(true);
          } else {
            setError('Gagal memuat stream MPEG-DASH (.mpd). Server target mungkin offline atau memblokir koneksi.');
          }
          setIsBuffering(false);
        });
      } catch (err: any) {
        console.error('DashJS Init Error:', err);
        setError('Gagal inisialisasi pemutar MPEG-DASH.');
        setIsBuffering(false);
      }
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        xhrSetup: (xhr) => {
          if (channel.referer) {
            try {
              xhr.setRequestHeader('X-Alt-Referer', channel.referer);
            } catch (e) {
              // Ignore browser restricted header warnings
            }
          }
        },
      });

      hlsRef.current = hls;
      hls.loadSource(targetUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        if (settings.autoPlay) {
          video.play().catch((err) => {
            console.warn('Autoplay prevented by browser policy, muting video to enable playback:', err);
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => {
              setIsPlaying(false);
            });
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.warn('HLS Error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (!useProxyForCurrentStream && !channel.userAgent && !channel.referer) {
                console.info('Direct playback failed, retrying automatically with stream proxy...');
                setUseProxyForCurrentStream(true);
              } else {
                setError('Gagal memuat stream (Network/CORS Error). Server target mungkin offline atau memblokir koneksi.');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError('Stream tidak dapat diputar atau format tidak didukung oleh browser secara langsung.');
              hls.destroy();
              break;
          }
          setIsBuffering(false);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari / iOS)
      video.src = targetUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsBuffering(false);
        if (settings.autoPlay) {
          video.play().catch(() => setIsPlaying(false));
        }
      });
    } else {
      // Direct stream src fallback
      video.src = targetUrl;
      if (settings.autoPlay) {
        video.play().catch(() => setIsPlaying(false));
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (dashRef.current) {
        dashRef.current.reset();
        dashRef.current = null;
      }
    };
  }, [channel?.id, channel?.url, useProxyForCurrentStream, settings.corsProxy]);

  // Video event handlers
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(console.error);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
    setIsMuted(newVol === 0);
    onUpdateSettings({ volume: newVol, muted: newVol === 0 });
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    onUpdateSettings({ muted: nextMuted });
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(console.error);
    }
  };

  const handleTogglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP Error:', err);
    }
  };

  // Mouse activity timer for hiding player overlay controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  const retryPlayback = () => {
    if (channel?.url) {
      setError(null);
      setIsBuffering(true);
      if (videoRef.current) {
        videoRef.current.src = getStreamUrl(channel);
        videoRef.current.play().catch(() => {});
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full h-full min-h-[280px] lg:min-h-[420px] bg-slate-950 flex items-center justify-center overflow-hidden group select-none"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onError={() => {
          setIsBuffering(false);
          setError('Gagal memutar video. Cek koneksi atau coba aktifkan Stream Proxy.');
        }}
        className={`w-full h-full object-${settings.aspectRatio || 'contain'}`}
        playsInline
      />

      {/* Empty State / No Channel Selected */}
      {!channel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
            <Tv className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-200 mb-1">Pilih Saluran untuk Diputar</h2>
          <p className="text-xs text-slate-400 max-w-sm">
            Silakan pilih saluran dari daftar di sebelah kiri atau tambah playlist M3U baru melalui tombol di bagian atas.
          </p>
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && channel && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-xs z-10">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
          <span className="text-xs font-semibold text-slate-300 animate-pulse">
            Memuat Stream...
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {error && channel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 z-20">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-3 text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-rose-300 mb-1">Gagal Memutar Live Stream</h3>
          <p className="text-xs text-slate-400 max-w-md mb-4">{error}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={retryPlayback}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
            </button>

            <a
              href={channel.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Buka URL Asli
            </a>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Ubah mode Proxy (Auto / Direct / Proxy) melalui menu <strong className="text-slate-300">Pengaturan</strong>.
          </p>
        </div>
      )}

      {/* Top Banner Channel Metadata (Overlaid) */}
      {channel && (
        <div
          className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-transparent z-10 transition-opacity duration-300 flex items-center justify-between ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3">
            {channel.logo ? (
              <img
                src={channel.logo}
                alt={channel.name}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-9 h-9 object-contain rounded bg-slate-900/80 p-1 border border-slate-800"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-9 h-9 rounded bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold">
                {channel.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 drop-shadow">
                {channel.name}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/50">
                  {channel.group}
                </span>
                {channel.userAgent && (
                  <span className="text-slate-400 font-mono text-[10px] hidden md:inline">UA Set</span>
                )}
                {isStreamProxied(channel) ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-amber-400" />
                    ⚡ Mode: Proxy ({settings.corsProxy && settings.corsProxy.includes('/api/proxy') ? 'Vite Proxy' : 'External Proxy'})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-emerald-400" />
                    🟢 Mode: Langsung (Direct Stream)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-[10px]">
              <button
                type="button"
                onClick={() => onUpdateSettings({ proxyMode: 'direct' })}
                className={`px-2 py-0.5 rounded-lg transition ${
                  (settings.proxyMode || 'auto') === 'direct'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Matikan Proxy (Paksa Langsung)"
              >
                Langsung
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ proxyMode: 'proxy' })}
                className={`px-2 py-0.5 rounded-lg transition ${
                  settings.proxyMode === 'proxy'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Aktifkan Stream Proxy"
              >
                Proxy
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ proxyMode: 'auto' })}
                className={`px-2 py-0.5 rounded-lg transition ${
                  (settings.proxyMode || 'auto') === 'auto'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Otomatis Fallback"
              >
                Auto
              </button>
            </div>

            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <Radio className="w-3 h-3 mr-1 animate-pulse" /> LIVE
            </span>
          </div>
        </div>
      )}

      {/* Bottom Control Overlay Bar */}
      {channel && (
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent z-10 transition-opacity duration-300 flex flex-col gap-2 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-between">
            {/* Play/Pause & Volume */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayPause}
                className="p-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              </button>

              <div className="flex items-center gap-2 group/vol">
                <button
                  onClick={handleToggleMute}
                  className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 transition"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-slate-200" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 sm:w-24 accent-indigo-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                />
              </div>
            </div>

            {/* Aspect Ratio & Fullscreen */}
            <div className="flex items-center gap-1 sm:gap-2">
              <select
                value={settings.aspectRatio}
                onChange={(e) =>
                  onUpdateSettings({
                    aspectRatio: e.target.value as 'contain' | 'cover' | 'fill',
                  })
                }
                className="bg-slate-900/80 text-slate-300 text-xs border border-slate-700/60 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                title="Rasio Aspek Video"
              >
                <option value="contain">Original</option>
                <option value="cover">Crop Fill</option>
                <option value="fill">Stretch</option>
              </select>

              {document.pictureInPictureEnabled && (
                <button
                  onClick={handleTogglePiP}
                  className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 transition"
                  title="Picture-in-Picture"
                >
                  <PictureInPicture className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleToggleFullscreen}
                className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 transition"
                title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
