"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  CheckCircle,
  Music,
  Video,
  Zap,
  HardDrive,
  Sparkles,
  Loader2,
  Smartphone,
  Subtitles,
  FileText,
} from "lucide-react";
import { VideoInfo } from "./VideoPreviewPlayer";
import { VideoTrimmer } from "./VideoTrimmer";

interface ExtendedVideoInfo extends VideoInfo {
  available_subtitles?: string[];
}

interface DownloadControlsProps {
  info: ExtendedVideoInfo;
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
  onOpenQR: (url: string, filename: string) => void;
}

export const DownloadControls: React.FC<DownloadControlsProps> = ({
  info,
  backendUrl,
  onDownloadComplete,
  onOpenQR,
}) => {
  const [formatType, setFormatType] = useState<"mp4" | "mp3">("mp4");
  const [quality, setQuality] = useState<string>(info.available_resolutions[0] || "720p");
  const [compression, setCompression] = useState<"balanced" | "ultra" | "original">("balanced");
  const [audioBitrate, setAudioBitrate] = useState<string>("192k");

  // Trimmer state
  const [isTrimmerEnabled, setIsTrimmerEnabled] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(info.duration || 60);

  // Subtitle state
  const [selectedSubLang, setSelectedSubLang] = useState<string>("en");
  const [isDownloadingSub, setIsDownloadingSub] = useState(false);

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

  useEffect(() => {
    if (info.available_resolutions && info.available_resolutions.length > 0) {
      setQuality(info.available_resolutions[0]);
    }
    if (info.duration > 0) {
      setEndTime(info.duration);
    }
  }, [info]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleResetTrim = () => {
    setStartTime(0);
    setEndTime(info.duration || 60);
  };

  const handleStartDownload = async () => {
    setIsDownloading(true);
    setProgress(5);
    setStatusMessage("Connecting to downloader engine...");
    setErrorMessage(null);
    setCompletedFile(null);

    const payload: any = {
      url: info.webpage_url,
      title: info.title,
      quality,
      compression,
      format_type: formatType,
      audio_bitrate: audioBitrate,
    };

    if (isTrimmerEnabled) {
      payload.start_time = startTime;
      payload.end_time = endTime;
    }

    try {
      const res = await fetch(`${backendUrl}/api/download/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to start download");
      }

      const data = await res.json();
      const currentTaskId = data.task_id;
      setTaskId(currentTaskId);

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
              setStatusMessage(
                isTrimmerEnabled
                  ? "Trimming clip & compressing with FFmpeg..."
                  : "Compressing & optimizing with FFmpeg..."
              );
            } else if (job.status === "completed") {
              clearInterval(pollIntervalRef.current!);
              setIsDownloading(false);
              setProgress(100);
              setStatusMessage("Compression finished!");
              setCompletedFile(job.filename);

              const downloadUrl = `${backendUrl}/api/download/file/${encodeURIComponent(job.filename)}`;
              const link = document.createElement("a");
              link.href = downloadUrl;
              link.download = job.filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              onDownloadComplete({
                title: isTrimmerEnabled
                  ? `${info.title} (Trimmed Clip)`
                  : info.title,
                filename: job.filename,
                fileSize: job.file_size || "Saved",
                format: formatType.toUpperCase(),
                quality: formatType === "mp3" ? `Audio (${audioBitrate})` : quality,
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

  const handleDownloadSubtitles = async () => {
    setIsDownloadingSub(true);
    try {
      const res = await fetch(`${backendUrl}/api/subtitles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: info.webpage_url,
          lang: selectedSubLang,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "No subtitles found");
      }
      const data = await res.json();
      const subUrl = `${backendUrl}${data.download_url}`;
      const link = document.createElement("a");
      link.href = subUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || "Could not retrieve subtitles.");
    } finally {
      setIsDownloadingSub(false);
    }
  };

  return (
    <div className="card p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-black flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download Options
          </h3>
          <p className="text-xs text-gray-400">
            Select format, video trimming, and FFmpeg compression presets.
          </p>
        </div>
      </div>

      {/* Format Selection (MP4 vs MP3) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Output Format
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormatType("mp4")}
            className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all ${
              formatType === "mp4"
                ? "bg-black border-black text-white shadow-md"
                : "bg-white border-gray-200 text-gray-500 hover:text-black hover:border-gray-400"
            }`}
          >
            <Video className="w-4 h-4" />
            Video (MP4)
          </button>
          <button
            type="button"
            onClick={() => setFormatType("mp3")}
            className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all ${
              formatType === "mp3"
                ? "bg-black border-black text-white shadow-md"
                : "bg-white border-gray-200 text-gray-500 hover:text-black hover:border-gray-400"
            }`}
          >
            <Music className="w-4 h-4" />
            Audio Only (MP3)
          </button>
        </div>
      </div>

      {/* Video Trimmer Feature */}
      {info.duration > 5 && (
        <VideoTrimmer
          duration={info.duration}
          startTime={startTime}
          endTime={endTime}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          onReset={handleResetTrim}
          isEnabled={isTrimmerEnabled}
          onToggle={setIsTrimmerEnabled}
        />
      )}

      {/* MP3 Audio Bitrate Selection */}
      {formatType === "mp3" && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Audio Bitrate Quality
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "320 kbps", sub: "Studio", value: "320k" },
              { label: "192 kbps", sub: "Standard", value: "192k" },
              { label: "128 kbps", sub: "Compact", value: "128k" },
            ].map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => setAudioBitrate(b.value)}
                className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                  audioBitrate === b.value
                    ? "bg-black border-black text-white"
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"
                }`}
              >
                <div className="font-bold">{b.label}</div>
                <div className="text-[10px] text-gray-400">{b.sub}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resolution Selection (Only for MP4) */}
      {formatType === "mp4" && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
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
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  quality === res
                    ? "bg-black border-black text-white"
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"
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
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Compression Preset
            </label>
            <span className="text-[11px] text-gray-400 font-medium">
              Saves Storage & Bandwidth
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div
              onClick={() => setCompression("balanced")}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                compression === "balanced"
                  ? "bg-black border-black text-white"
                  : "bg-white border-gray-200 hover:border-gray-400"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold flex items-center gap-1 ${compression === "balanced" ? "text-white" : "text-black"}`}>
                  Balanced
                </span>
                <Sparkles className={`w-3.5 h-3.5 ${compression === "balanced" ? "text-white/70" : "text-gray-400"}`} />
              </div>
              <p className={`text-[11px] leading-tight ${compression === "balanced" ? "text-white/70" : "text-gray-400"}`}>
                ~50% smaller size. Crisp H.264 video.
              </p>
            </div>

            <div
              onClick={() => setCompression("ultra")}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                compression === "ultra"
                  ? "bg-black border-black text-white"
                  : "bg-white border-gray-200 hover:border-gray-400"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${compression === "ultra" ? "text-white" : "text-black"}`}>Ultra Compact</span>
                <Zap className={`w-3.5 h-3.5 ${compression === "ultra" ? "text-white/70" : "text-gray-400"}`} />
              </div>
              <p className={`text-[11px] leading-tight ${compression === "ultra" ? "text-white/70" : "text-gray-400"}`}>
                ~75% smaller. Ideal for WhatsApp / phone.
              </p>
            </div>

            <div
              onClick={() => setCompression("original")}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                compression === "original"
                  ? "bg-black border-black text-white"
                  : "bg-white border-gray-200 hover:border-gray-400"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${compression === "original" ? "text-white" : "text-black"}`}>Original</span>
                <HardDrive className={`w-3.5 h-3.5 ${compression === "original" ? "text-white/70" : "text-gray-400"}`} />
              </div>
              <p className={`text-[11px] leading-tight ${compression === "original" ? "text-white/70" : "text-gray-400"}`}>
                Maximum bitrate without extra compression.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subtitles Download Section (If available) */}
      {info.available_subtitles && info.available_subtitles.length > 0 && (
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-gray-700">
            <Subtitles className="w-4 h-4 text-gray-500" />
            <span>Subtitles (.SRT)</span>
            <select
              value={selectedSubLang}
              onChange={(e) => setSelectedSubLang(e.target.value)}
              className="bg-white text-xs text-black rounded px-2 py-1 border border-gray-300"
            >
              {info.available_subtitles.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleDownloadSubtitles}
            disabled={isDownloadingSub}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-black text-white hover:bg-gray-800 flex items-center gap-1 transition-all"
          >
            {isDownloadingSub ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <FileText className="w-3 h-3" />
            )}
            Download
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Progress & Status Container */}
      {isDownloading && (
        <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-700 font-medium flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {statusMessage}
            </span>
            <span className="font-mono font-bold text-black">{progress}%</span>
          </div>

          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400">
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
          className="btn-primary w-full py-3.5 px-6 text-sm flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          {formatType === "mp3"
            ? `Download MP3 (${audioBitrate})`
            : isTrimmerEnabled
            ? `Download Trimmed Clip (${quality})`
            : `Download ${quality} (${compression === "original" ? "Original" : "Compressed"})`}
        </button>
      ) : (
        <button
          disabled
          className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing with FFmpeg...
        </button>
      )}

      {/* Completed feedback with Send to Phone QR button */}
      {completedFile && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">File ready & downloaded!</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onOpenQR(
                  `${backendUrl}/api/download/file/${encodeURIComponent(completedFile)}`,
                  completedFile
                )
              }
              className="px-2.5 py-1 rounded-lg bg-black text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-800 transition-all"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Send to Phone (QR)
            </button>
            <a
              href={`${backendUrl}/api/download/file/${encodeURIComponent(completedFile)}`}
              download
              className="text-[11px] font-bold underline text-emerald-700 hover:text-emerald-900"
            >
              Save again
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
