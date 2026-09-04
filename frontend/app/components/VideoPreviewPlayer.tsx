"use client";

import React, { useState } from "react";
import {
  Play,
  Eye,
  Clock,
  User,
  Film,
  Sparkles,
  Scissors,
  ExternalLink,
} from "lucide-react";

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

  const formatDuration = (seconds: number) => {
    if (!seconds) return "Live";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatViews = (views?: number) => {
    if (!views) return null;
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
    return `${views} views`;
  };

  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-black text-white">
            {info.platform || "Video"}
          </span>
          {previewUrl && !videoError && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Sparkles className="w-3 h-3" />
              Preview Ready
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {info.view_count && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {formatViews(info.view_count)}
            </span>
          )}
          <a
            href={info.webpage_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-black flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Source
          </a>
        </div>
      </div>

      {/* Video Player */}
      <div className="relative w-full aspect-video bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 flex items-center justify-center">
        {isLoadingPreview ? (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="w-10 h-10 rounded-full border-[3px] border-black border-t-transparent animate-spin" />
            <p className="text-sm font-semibold text-black">Compressing Preview...</p>
            <p className="text-xs text-gray-400 max-w-xs">
              FFmpeg is rendering a lightweight preview clip for instant playback.
            </p>
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
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <Film className="w-16 h-16" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 fill-white translate-x-0.5" />
              </div>
              <span className="text-xs font-bold px-4 py-1.5 rounded-full bg-white text-black shadow">
                Click to Load Compressed Preview
              </span>
            </div>
          </div>
        )}

        {/* Duration badge */}
        {info.duration > 0 && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 text-white text-xs font-mono font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3 opacity-70" />
            {formatDuration(info.duration)}
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-black line-clamp-2 leading-snug">
          {info.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1 font-medium text-gray-700">
            <User className="w-3.5 h-3.5" />
            {info.uploader}
          </span>
          <span className="text-gray-300">•</span>
          <span>Best quality: {info.available_resolutions[0] || "HD"}</span>
        </div>
      </div>

      {/* Edit in Studio Button */}
      {onOpenStudio && (
        <button
          type="button"
          onClick={onOpenStudio}
          className="w-full mt-1 py-3 px-4 rounded-xl font-bold text-sm text-white bg-black hover:bg-gray-800 shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Scissors className="w-4 h-4" />
          <span>Edit This Video in Studio</span>
        </button>
      )}
    </div>
  );
};
