"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  FastForward,
  Rewind,
  Download,
  Film,
  Tv,
  Gauge,
  Sparkles,
  Scissors,
} from "lucide-react";

export interface CustomVideoPlayerProps {
  src: string | null;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  onDownload?: () => void;
  onOpenStudio?: () => void;
  isLoading?: boolean;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  poster,
  title,
  autoPlay = false,
  onDownload,
  onOpenStudio,
  isLoading = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hasError, setHasError] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls during playback
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current || !src) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    setHasError(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    setIsMuted(next);
    videoRef.current.muted = next;
    if (!next && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      // ignore
    }
  };

  const skipSeconds = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === 0) return "00:00";
    const s = Math.floor(secs);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const rem = s % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (isPlaying) setShowControls(false);
      }}
      className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border border-neutral-300 shadow-2xl group select-none flex items-center justify-center"
    >
      {/* 1. VIDEO ELEMENT */}
      {src && !hasError ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onError={() => setHasError(true)}
          autoPlay={autoPlay}
          playsInline
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-black">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt={title || "Video"}
              className="absolute inset-0 w-full h-full object-cover opacity-25"
            />
          )}
          <div className="relative z-10 space-y-2 max-w-sm px-4">
            <Film className="w-12 h-12 text-white/40 mx-auto" />
            <p className="text-sm font-bold text-white">
              {isLoading ? "Preparing Video Stream..." : "No Stream Loaded"}
            </p>
            <p className="text-xs text-neutral-400">
              {isLoading
                ? "FFmpeg is compiling a compressed real-time stream..."
                : "Select a video from the Video Box below or click to load preview."}
            </p>
          </div>
        </div>
      )}

      {/* 2. CENTER PLAY BUTTON OVERLAY */}
      {!isPlaying && src && !hasError && !isLoading && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform z-20"
          title="Play"
        >
          <Play className="w-7 h-7 fill-black translate-x-0.5" />
        </button>
      )}

      {/* 3. LOADING SPINNER */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30">
          <div className="w-10 h-10 rounded-full border-3 border-white border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-white tracking-wide">
            Rendering Stream...
          </span>
        </div>
      )}

      {/* 4. TOP BAR OVERLAY */}
      <div
        className={`absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-20 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="min-w-0 pr-4">
          {title && (
            <p className="text-xs sm:text-sm font-bold text-white truncate drop-shadow-md">
              {title}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenStudio && (
            <button
              type="button"
              onClick={onOpenStudio}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title="Open in CapCut Studio"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Studio</span>
            </button>
          )}
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="px-3 py-1.5 rounded-xl bg-white text-black text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs hover:bg-neutral-200"
              title="Direct Download"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. BOTTOM CUSTOM CONTROLS BAR */}
      <div
        className={`absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 z-20 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Seekbar */}
        <div className="relative w-full flex items-center group/scrub">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            disabled={!src || hasError}
            className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white hover:h-2 transition-all"
            style={{
              background: `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
            }}
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left: Play/Pause, Skip, Time, Volume */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!src || hasError}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-40"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
            </button>

            <button
              type="button"
              onClick={() => skipSeconds(-10)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors hidden sm:block"
              title="Rewind 10s"
            >
              <Rewind className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => skipSeconds(10)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors hidden sm:block"
              title="Forward 10s"
            >
              <FastForward className="w-4 h-4" />
            </button>

            {/* Time Stamp */}
            <span className="font-mono text-[11px] text-neutral-300 tracking-wider">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Volume */}
            <div className="flex items-center gap-1.5 group/vol pl-1">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-neutral-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-20 h-1 bg-white/30 rounded-lg cursor-pointer accent-white"
              />
            </div>
          </div>

          {/* Right: Speed, PiP, Fullscreen */}
          <div className="flex items-center gap-2 relative">
            {/* Speed Ramping Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-mono font-bold transition-all"
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-8 right-0 bg-neutral-900/95 border border-neutral-700 rounded-xl p-1 shadow-2xl z-30 flex flex-col gap-0.5 min-w-[70px]">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => changeSpeed(s)}
                      className={`px-2 py-1 text-left text-[11px] font-mono rounded-lg transition-colors ${
                        playbackSpeed === s
                          ? "bg-white text-black font-bold"
                          : "text-neutral-300 hover:bg-white/10"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PiP */}
            <button
              type="button"
              onClick={togglePiP}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors hidden sm:block"
              title="Picture-in-Picture"
            >
              <Tv className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
