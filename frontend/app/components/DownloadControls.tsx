"use client";

import React, { useState, useEffect, useRef } from "react";
import { Download, CheckCircle, Music, Video, Zap, Shield, FileCheck, Loader2, Sparkles, HardDrive } from "lucide-react";
import { VideoInfo } from "./VideoPreviewPlayer";

interface DownloadControlsProps {
  info: VideoInfo;
  backendUrl: string;
  onDownloadComplete: (downloadItem: {
    title: string;
    filename: string;
    fileSize: string;
    format: string;
    quality: string;
    compression: string;
    timestamp: number;
  }) => void;
}

export const DownloadControls: React.FC<DownloadControlsProps> = ({
  info,
  backendUrl,
  onDownloadComplete,
}) => {
  const [formatType, setFormatType] = useState<"mp4" | "mp3">("mp4");
  const [quality, setQuality] = useState<string>(info.available_resolutions[0] || "720p");
  const [compression, setCompression] = useState<"balanced" | "ultra" | "original">("balanced");

  // Download Task state
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [speed, setSpeed] = useState<string>("");
  const [eta, setEta] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedFile, setCompletedFile] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update quality when info changes
  useEffect(() => {
    if (info.available_resolutions && info.available_resolutions.length > 0) {
      setQuality(info.available_resolutions[0]);
    }
  }, [info]);

  // Clean polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleStartDownload = async () => {
    setIsDownloading(true);
    setProgress(5);
    setStatusMessage("Connecting to downloader engine...");
    setErrorMessage(null);
    setCompletedFile(null);

    try {
      const res = await fetch(`${backendUrl}/api/download/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: info.webpage_url,
          title: info.title,
          quality,
          compression,
          format_type: formatType,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to start download");
      }

      const data = await res.json();
      const currentTaskId = data.task_id;
      setTaskId(currentTaskId);

      // Start Polling for Progress
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`${backendUrl}/api/download/progress/${currentTaskId}`);
          if (!pollRes.ok) return;

          const pollData = await pollRes.json();
          const job = pollData.job;

          if (job) {
            setProgress(job.progress || 0);
            setSpeed(job.speed || "");
            setEta(job.eta || "");

            if (job.status === "downloading") {
              setStatusMessage("Fetching video stream...");
            } else if (job.status === "compressing") {
              setStatusMessage("Compressing & optimizing with FFmpeg...");
            } else if (job.status === "completed") {
              clearInterval(pollIntervalRef.current!);
              setIsDownloading(false);
              setProgress(100);
              setStatusMessage("Compression finished!");
              setCompletedFile(job.filename);

              // Auto-trigger browser download
              const downloadUrl = `${backendUrl}/api/download/file/${encodeURIComponent(job.filename)}`;
              const link = document.createElement("a");
              link.href = downloadUrl;
              link.download = job.filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              // Record in history
              onDownloadComplete({
                title: info.title,
                filename: job.filename,
                fileSize: job.file_size || "Saved",
                format: formatType.toUpperCase(),
                quality: formatType === "mp3" ? "Audio (192k)" : quality,
                compression: formatType === "mp3" ? "N/A" : compression,
                timestamp: Date.now(),
              });
            } else if (job.status === "failed") {
              clearInterval(pollIntervalRef.current!);
              setIsDownloading(false);
              setErrorMessage(job.error || "Download failed. Please try another quality.");
            }
          }
        } catch {
          // ignore transient poll error
        }
      }, 1000);
    } catch (err: any) {
      setIsDownloading(false);
      setErrorMessage(err.message || "Failed to initiate download.");
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-400" />
            Download Options
          </h3>
          <p className="text-xs text-slate-400">
            Choose format and compression settings powered by local FFmpeg.
          </p>
        </div>
      </div>

      {/* Format Selection (MP4 vs MP3) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Select Output Format
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormatType("mp4")}
            className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all ${
              formatType === "mp4"
                ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                : "bg-slate-900/50 border-white/5 text-slate-400 hover:text-white hover:border-white/20"
            }`}
          >
            <Video className="w-4 h-4 text-indigo-400" />
            Video (MP4)
          </button>
          <button
            type="button"
            onClick={() => setFormatType("mp3")}
            className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all ${
              formatType === "mp3"
                ? "bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-500/10"
                : "bg-slate-900/50 border-white/5 text-slate-400 hover:text-white hover:border-white/20"
            }`}
          >
            <Music className="w-4 h-4 text-purple-400" />
            Audio Only (MP3)
          </button>
        </div>
      </div>

      {/* Resolution Selection (Only for MP4) */}
      {formatType === "mp4" && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Target Resolution
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(info.available_resolutions.length > 0
              ? info.available_resolutions
              : ["1080p", "720p", "480p", "360p"]
            ).map((res) => (
              <button
                key={res}
                type="button"
                onClick={() => setQuality(res)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  quality === res
                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                    : "bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/20"
                }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Compression Presets (Only for MP4) */}
      {formatType === "mp4" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Compression Preset
            </label>
            <span className="text-[11px] text-indigo-400 font-medium">
              Saves Storage & Bandwidth
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Balanced */}
            <div
              onClick={() => setCompression("balanced")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                compression === "balanced"
                  ? "bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10"
                  : "bg-slate-900/40 border-white/5 hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  Balanced
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    Popular
                  </span>
                </span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                ~50% smaller size. Near-lossless H.264 visual quality.
              </p>
            </div>

            {/* Ultra */}
            <div
              onClick={() => setCompression("ultra")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                compression === "ultra"
                  ? "bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10"
                  : "bg-slate-900/40 border-white/5 hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  Ultra Compact
                </span>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                ~75% smaller. Ideal for WhatsApp, Discord, or slow networks.
              </p>
            </div>

            {/* Original */}
            <div
              onClick={() => setCompression("original")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                compression === "original"
                  ? "bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10"
                  : "bg-slate-900/40 border-white/5 hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white">Original Quality</span>
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                Maximum bitrate without extra compression. Larger file.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Progress & Status Container */}
      {isDownloading && (
        <div className="space-y-3 p-4 rounded-xl bg-slate-900/70 border border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              {statusMessage}
            </span>
            <span className="font-mono font-bold text-indigo-400">{progress}%</span>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400 rounded-full transition-all duration-300 shadow-sm shadow-indigo-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{speed}</span>
            <span>{eta}</span>
          </div>
        </div>
      )}

      {/* Download Action Button */}
      {!isDownloading ? (
        <button
          type="button"
          onClick={handleStartDownload}
          className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/50 transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
        >
          <Download className="w-4 h-4" />
          {formatType === "mp3"
            ? "Download Audio (MP3)"
            : `Download ${quality} (${compression === "original" ? "Original" : "Compressed"})`}
        </button>
      ) : (
        <button
          disabled
          className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-slate-400 bg-slate-800/80 border border-white/5 cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          Processing Download & Compression...
        </button>
      )}

      {/* Completed feedback */}
      {completedFile && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Download completed & saved!</span>
          </div>
          <a
            href={`${backendUrl}/api/download/file/${encodeURIComponent(completedFile)}`}
            download
            className="text-[11px] font-bold underline hover:text-emerald-200"
          >
            Save again
          </a>
        </div>
      )}
    </div>
  );
};
