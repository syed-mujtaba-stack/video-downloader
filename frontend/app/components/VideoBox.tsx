"use client";

import React, { useState } from "react";
import {
  Play,
  Film,
  Download,
  Scissors,
  Smartphone,
  Trash2,
  HardDrive,
  Eye,
  Clock,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { CustomVideoPlayer } from "./CustomVideoPlayer";
import { VideoInfo } from "./VideoPreviewPlayer";
import { DownloadHistoryItem } from "./RecentDownloads";

interface VideoBoxProps {
  currentInfo: VideoInfo;
  previewUrl: string | null;
  isLoadingPreview: boolean;
  backendUrl: string;
  savedVideos: DownloadHistoryItem[];
  onGeneratePreview: () => void;
  onOpenStudio: () => void;
  onOpenQR: (url: string, filename: string) => void;
  onRemoveSavedVideo: (index: number) => void;
  onClearSavedVideos: () => void;
}

export const VideoBox: React.FC<VideoBoxProps> = ({
  currentInfo,
  previewUrl,
  isLoadingPreview,
  backendUrl,
  savedVideos,
  onGeneratePreview,
  onOpenStudio,
  onOpenQR,
  onRemoveSavedVideo,
  onClearSavedVideos,
}) => {
  // Selected video to play in the Pro Player (null means current active fetched video)
  const [selectedSavedVideo, setSelectedSavedVideo] = useState<DownloadHistoryItem | null>(null);

  // Determine which video source and details to show in the main stage
  const activeVideoSrc = selectedSavedVideo
    ? `${backendUrl}/api/download/file/${encodeURIComponent(selectedSavedVideo.filename)}`
    : previewUrl || (currentInfo.direct_preview_url ? currentInfo.direct_preview_url : null);

  const activeTitle = selectedSavedVideo ? selectedSavedVideo.title : currentInfo.title;
  const activePoster = selectedSavedVideo ? currentInfo.thumbnail : currentInfo.thumbnail;

  const formatViews = (views?: number) => {
    if (!views) return null;
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
    return `${views} views`;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "Live";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDownloadActive = () => {
    if (selectedSavedVideo) {
      const url = `${backendUrl}/api/download/file/${encodeURIComponent(selectedSavedVideo.filename)}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedSavedVideo.filename;
      a.click();
    } else if (previewUrl) {
      const a = document.createElement("a");
      a.href = previewUrl;
      a.download = `${currentInfo.title}_preview.mp4`;
      a.click();
    }
  };

  return (
    <div className="card p-6 space-y-6 shadow-sm">
      {/* 1. TOP HEADER OF VIDEO BOX */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h3
              className="text-base font-bold text-black flex items-center gap-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <span>Video Player & Showcase Box</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                PRO PLAYER
              </span>
            </h3>
          </div>
        </div>

        {selectedSavedVideo && (
          <button
            type="button"
            onClick={() => setSelectedSavedVideo(null)}
            className="px-3 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-800 transition-colors flex items-center gap-1.5"
          >
            <span>Back to Source Stream</span>
          </button>
        )}
      </div>

      {/* 2. ACTIVE PRO VIDEO PLAYER STAGE */}
      <div className="space-y-4">
        <CustomVideoPlayer
          src={activeVideoSrc}
          poster={activePoster}
          title={activeTitle}
          autoPlay={!!selectedSavedVideo}
          isLoading={isLoadingPreview}
          onDownload={activeVideoSrc ? handleDownloadActive : undefined}
          onOpenStudio={onOpenStudio}
        />

        {/* Load Preview Prompt if not generated yet */}
        {!previewUrl && !selectedSavedVideo && (
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center shrink-0">
                <Play className="w-4 h-4 fill-white translate-x-0.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-black">Preview Stream Ready to Generate</p>
                <p className="text-[11px] text-neutral-500">
                  Click to let FFmpeg render a lightweight compressed clip for real-time playback.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isLoadingPreview}
              onClick={onGeneratePreview}
              className="px-4 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs shrink-0 disabled:opacity-50"
            >
              {isLoadingPreview ? "Generating..." : "Load Player Preview"}
            </button>
          </div>
        )}

        {/* Video Info Header Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
          <div className="space-y-1 max-w-xl">
            <h4 className="text-base font-bold text-black line-clamp-1">{activeTitle}</h4>
            <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
              <span className="font-semibold text-black">{currentInfo.uploader}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(currentInfo.duration)}
              </span>
              {currentInfo.view_count && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {formatViews(currentInfo.view_count)}
                  </span>
                </>
              )}
              <span>•</span>
              <span className="uppercase font-mono font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                {currentInfo.platform}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenStudio}
              className="px-3.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
            >
              <Scissors className="w-3.5 h-3.5 text-black" />
              <span>Edit in Studio</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE "VIDEO SHOWCASE BOX" (DOWNLOADED & SAVED VIDEOS) */}
      <div className="border-t border-neutral-200 pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <h4
              className="text-sm font-bold text-black"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Video Box Vault
            </h4>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-mono font-bold border border-neutral-200">
              {savedVideos.length} {savedVideos.length === 1 ? "Video" : "Videos"}
            </span>
          </div>

          {savedVideos.length > 0 && (
            <button
              type="button"
              onClick={onClearSavedVideos}
              className="text-xs text-neutral-400 hover:text-red-600 flex items-center gap-1 transition-colors font-medium"
            >
              <Trash2 className="w-3 h-3" />
              Clear Vault
            </button>
          )}
        </div>

        {savedVideos.length === 0 ? (
          <div className="p-6 rounded-2xl bg-neutral-50/70 border border-neutral-200 text-center space-y-2">
            <HardDrive className="w-8 h-8 text-neutral-400 mx-auto" />
            <p className="text-xs font-bold text-black">Your Video Box is Ready</p>
            <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
              Any video or audio you download or export will automatically appear here. You can click to watch it inside the Pro Player or download it anytime!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedVideos.map((item, idx) => {
              const isCurrentlyPlaying = selectedSavedVideo?.filename === item.filename;
              const downloadUrl = `${backendUrl}/api/download/file/${encodeURIComponent(item.filename)}`;

              return (
                <div
                  key={`${item.filename}-${idx}`}
                  className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isCurrentlyPlaying
                      ? "bg-neutral-100 border-black shadow-sm"
                      : "bg-neutral-50 border-neutral-200 hover:border-black/30 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <Film className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-black truncate" title={item.title}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 flex-wrap mt-0.5">
                        <span className="font-bold text-black bg-neutral-200/80 px-1.5 py-0.2 rounded">
                          {item.format}
                        </span>
                        <span>•</span>
                        <span>{item.quality}</span>
                        <span>•</span>
                        <span className="font-medium text-neutral-700">{item.fileSize}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions inside each Video Card */}
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedSavedVideo(item)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                        isCurrentlyPlaying
                          ? "bg-black text-white shadow-2xs"
                          : "bg-white border border-neutral-200 hover:border-black text-neutral-800"
                      }`}
                    >
                      <Play className={`w-3 h-3 ${isCurrentlyPlaying ? "fill-white" : "fill-neutral-800"}`} />
                      <span>{isCurrentlyPlaying ? "Playing" : "Watch"}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <a
                        href={downloadUrl}
                        download
                        className="p-1.5 rounded-lg bg-white border border-neutral-200 hover:border-black hover:bg-neutral-100 text-neutral-800 transition-colors shadow-2xs"
                        title="Download to Device"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => onOpenQR(downloadUrl, item.filename)}
                        className="p-1.5 rounded-lg bg-white border border-neutral-200 hover:border-black hover:bg-neutral-100 text-neutral-800 transition-colors shadow-2xs"
                        title="QR to Phone"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveSavedVideo(idx)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove from Box"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
