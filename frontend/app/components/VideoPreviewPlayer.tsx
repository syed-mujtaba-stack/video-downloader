"use client";

import React, { useState } from "react";
import { Play, Eye, Clock, User, Film, Sparkles, RefreshCw, AlertCircle, Scissors } from "lucide-react";

export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  view_count?: number;
  platform: string;
  webpage_url: string;
  available_resolutions: string[];
  has_audio: boolean;
  direct_preview_url?: string | null;
}

interface VideoPreviewPlayerProps {
  info: VideoInfo;
  previewUrl: string | null;
  isLoadingPreview: boolean;
  onGeneratePreview: () => void;
  onOpenStudio?: () => void;
}

export const VideoPreviewPlayer: React.FC<VideoPreviewPlayerProps> = ({
  info,
  previewUrl,
  isLoadingPreview,
  onGeneratePreview,
  onOpenStudio,
}) => {
  const [videoError, setVideoError] = useState(false);

  // Format seconds to mm:ss or hh:mm:ss
  const formatDuration = (seconds: number) => {
    if (!seconds) return "Live / Unknown";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format view count
  const formatViews = (views?: number) => {
    if (!views) return null;
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
    return `${views} views`;
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden p-5 flex flex-col gap-4 transition-all duration-300">
      {/* Platform & Status Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {info.platform || "Video"}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <Sparkles className="w-3 h-3" />
            Compressed Preview Ready
          </span>
        </div>
        {info.view_count && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            {formatViews(info.view_count)}
          </span>
        )}
      </div>

      {/* Video Display Area */}
      <div className="relative w-full aspect-video bg-black/60 rounded-xl overflow-hidden border border-white/10 shadow-inner flex items-center justify-center">
        {isLoadingPreview ? (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center animate-pulse">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">Compressing Preview Clip...</p>
              <p className="text-xs text-slate-400 max-w-xs">
                Rendering lightweight FFmpeg preview stream for smooth instant playback.
              </p>
            </div>
          </div>
        ) : previewUrl && !videoError ? (
          <video
            src={previewUrl}
            poster={info.thumbnail}
            controls
            playsInline
            autoPlay
            muted
            className="w-full h-full object-contain"
            onError={() => setVideoError(true)}
          />
        ) : (
          <div className="relative w-full h-full group cursor-pointer" onClick={onGeneratePreview}>
            {info.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={info.thumbnail}
                alt={info.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
                <Film className="w-16 h-16" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 transition-opacity duration-300">
              <div className="w-16 h-16 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 fill-white translate-x-0.5" />
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-black/70 text-white border border-white/20">
                Click to Play Compressed Preview
              </span>
            </div>
          </div>
        )}

        {/* Duration badge */}
        {info.duration > 0 && (
          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/80 text-white text-xs font-mono font-medium flex items-center gap-1 border border-white/10">
            <Clock className="w-3 h-3 text-slate-400" />
            {formatDuration(info.duration)}
          </div>
        )}
      </div>

      {/* Video Details */}
      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-white line-clamp-2 leading-snug">
          {info.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
          <span className="flex items-center gap-1 text-slate-300 font-medium">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            {info.uploader}
          </span>
          <span>•</span>
          <span>Max Quality: {info.available_resolutions[0] || "HD"}</span>
        </div>
      </div>

      {/* CapCut Studio Action Button */}
      {onOpenStudio && (
        <button
          type="button"
          onClick={onOpenStudio}
          className="w-full mt-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
        >
          <Scissors className="w-4 h-4 text-white" />
          <span>Edit This Video in CapCut Studio</span>
        </button>
      )}
    </div>
  );
};
