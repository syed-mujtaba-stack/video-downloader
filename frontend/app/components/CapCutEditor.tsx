"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Play,
  Pause,
  Scissors,
  RotateCcw,
  Sparkles,
  Download,
  Maximize2,
  Volume2,
  VolumeX,
  Type,
  Gauge,
  Film,
  Layers,
  Check,
  Loader2,
  FastForward,
  Rewind,
  Eye,
} from "lucide-react";
import { VideoInfo } from "./VideoPreviewPlayer";

interface CapCutEditorProps {
  isOpen: boolean;
  onClose: () => void;
  info: VideoInfo;
  previewVideoUrl: string;
  backendUrl: string;
  onExportComplete: (item: any) => void;
}

export const CapCutEditor: React.FC<CapCutEditorProps> = ({
  isOpen,
  onClose,
  info,
  previewVideoUrl,
  backendUrl,
  onExportComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(info.duration || 60);

  // Studio Edit Settings
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("9:16");
  const [trimRange, setTrimRange] = useState<[number, number]>([0, info.duration || 60]);
  const [speed, setSpeed] = useState<number>(1.0);
  const [activeFilter, setActiveFilter] = useState<
    "none" | "cinematic" | "vintage" | "bw" | "cyberpunk" | "warm"
  >("none");
  const [textOverlay, setTextOverlay] = useState<string>("");
  const [textPosition, setTextPosition] = useState<"top" | "center" | "bottom">("bottom");
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Active Tool Tab
  const [activeTab, setActiveTab] = useState<"aspect" | "trim" | "speed" | "filter" | "text" | "audio">(
    "aspect"
  );

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportPollRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard shortcut for Spacebar play/pause & ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape" && !isExporting) {
        onClose();
      }
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPlaying, isExporting]);

  useEffect(() => {
    if (info.duration > 0) {
      setDuration(info.duration);
      setTrimRange([0, info.duration]);
    }
  }, [info]);

  useEffect(() => {
    return () => {
      if (exportPollRef.current) clearInterval(exportPollRef.current);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      // Loop within trim range
      if (currentTime >= trimRange[1]) {
        videoRef.current.currentTime = trimRange[0];
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    // Loop within trim range if trimming is applied
    if (t >= trimRange[1]) {
      videoRef.current.currentTime = trimRange[0];
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      setDuration(videoRef.current.duration);
      if (trimRange[1] === 60 || trimRange[1] === 0) {
        setTrimRange([0, videoRef.current.duration]);
      }
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !videoRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * duration;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : newVol;
    }
  };

  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  // Get CSS filter string for live canvas preview
  const getFilterStyle = () => {
    switch (activeFilter) {
      case "cinematic":
        return "contrast(1.25) brightness(1.02) saturate(1.2)";
      case "vintage":
        return "sepia(0.35) contrast(1.1) brightness(0.95)";
      case "bw":
        return "grayscale(1) contrast(1.15)";
      case "cyberpunk":
        return "contrast(1.35) saturate(1.6) hue-rotate(15deg)";
      case "warm":
        return "sepia(0.2) saturate(1.25) brightness(1.05)";
      default:
        return "none";
    }
  };

  // Get aspect ratio frame sizing
  const getAspectDimensions = () => {
    switch (aspectRatio) {
      case "9:16":
        return "w-[280px] sm:w-[330px] aspect-[9/16]";
      case "1:1":
        return "w-[360px] sm:w-[440px] aspect-square";
      case "16:9":
      default:
        return "w-full max-w-[680px] aspect-video";
    }
  };

  // Export video with FFmpeg
  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(10);
    setExportStatus("Initializing CapCut FFmpeg Engine...");
    setExportError(null);
    setExportedFilename(null);

    const payload = {
      url: info.webpage_url,
      title: info.title,
      start_time: trimRange[0] > 0 ? trimRange[0] : null,
      end_time: trimRange[1] < duration ? trimRange[1] : null,
      aspect_ratio: aspectRatio,
      speed: speed,
      filter_preset: activeFilter,
      volume: isMuted ? 0.0 : volume,
      text_overlay: textOverlay || null,
      quality: "1080p",
    };

    try {
      const res = await fetch(`${backendUrl}/api/editor/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Export initialization failed.");
      }

      const data = await res.json();
      const taskId = data.task_id;

      exportPollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`${backendUrl}/api/download/progress/${taskId}`);
          if (!pollRes.ok) return;

          const pollData = await pollRes.json();
          const job = pollData.job;

          if (job) {
            setExportProgress(job.progress || 0);
            if (job.status === "downloading") {
              setExportStatus("Downloading source video stream...");
            } else if (job.status === "compressing") {
              setExportStatus("Rendering filters, aspect ratio & encoding FFmpeg...");
            } else if (job.status === "completed") {
              clearInterval(exportPollRef.current!);
              setExportProgress(100);
              setExportStatus("Export Complete!");
              setExportedFilename(job.filename);

              // Trigger download
              const downloadUrl = `${backendUrl}/api/download/file/${encodeURIComponent(job.filename)}`;
              const link = document.createElement("a");
              link.href = downloadUrl;
              link.download = job.filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              onExportComplete({
                title: `${info.title} (CapCut Edit)`,
                filename: job.filename,
                fileSize: job.file_size || "Saved",
                format: "MP4",
                quality: `${aspectRatio} Edit`,
                compression: "Studio Export",
                timestamp: Date.now(),
              });
            } else if (job.status === "failed") {
              clearInterval(exportPollRef.current!);
              setExportError(job.error || "Export failed.");
            }
          }
        } catch {
          // ignore
        }
      }, 1000);
    } catch (err: any) {
      setExportError(err.message || "Failed to start export.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0d17] text-slate-100 overflow-hidden select-none animate-in fade-in duration-200">
      {/* 1. TOP HEADER BAR */}
      <header className="h-14 border-b border-white/10 bg-slate-950/80 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-wide">
                CapCut <span className="text-gradient">Studio</span>
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO EDITOR
              </span>
            </div>
            <p className="text-[11px] text-slate-400 max-w-[260px] truncate hidden sm:block">
              {info.title}
            </p>
          </div>
        </div>

        {/* Aspect Ratio Fast Switcher in Header */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setAspectRatio("9:16")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              aspectRatio === "9:16"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>📱 9:16</span>
            <span className="text-[10px] opacity-70 hidden sm:inline">TikTok / Reels</span>
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio("16:9")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              aspectRatio === "16:9"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🖥️ 16:9</span>
            <span className="text-[10px] opacity-70 hidden sm:inline">YouTube</span>
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio("1:1")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              aspectRatio === "1:1"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>⏹️ 1:1</span>
            <span className="text-[10px] opacity-70 hidden sm:inline">Square</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Video</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Close Editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (VIEWPORT & TOOLS) */}
      <div className="flex-1 flex overflow-hidden">
        {/* CENTER VIEWPORT (CANVAS) */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#07090e] relative overflow-hidden">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Video Aspect Canvas Container */}
          <div
            className={`relative ${getAspectDimensions()} max-h-[58vh] bg-black rounded-2xl overflow-hidden border-2 border-indigo-500/30 shadow-2xl flex items-center justify-center transition-all duration-300`}
          >
            <video
              ref={videoRef}
              src={previewVideoUrl || info.direct_preview_url || ""}
              poster={info.thumbnail}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              playsInline
              className="w-full h-full object-contain"
              style={{ filter: getFilterStyle() }}
              onClick={togglePlay}
            />

            {/* Custom On-Screen Text Overlay */}
            {textOverlay && (
              <div
                className={`absolute left-0 right-0 px-4 text-center pointer-events-none ${
                  textPosition === "top"
                    ? "top-6"
                    : textPosition === "center"
                    ? "top-1/2 -translate-y-1/2"
                    : "bottom-6"
                }`}
              >
                <span className="inline-block bg-black/60 backdrop-blur-sm text-white font-extrabold text-base sm:text-xl px-3 py-1.5 rounded-lg border border-white/20 shadow-lg tracking-wide">
                  {textOverlay}
                </span>
              </div>
            )}

            {/* Canvas Overlay Badges */}
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-indigo-300 border border-white/10 flex items-center gap-1">
              <span>{aspectRatio}</span>
              {speed !== 1.0 && <span>• {speed}x</span>}
              {activeFilter !== "none" && <span className="capitalize">• {activeFilter}</span>}
            </div>

            {/* Big Play overlay if paused */}
            {!isPlaying && (
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-xl shadow-indigo-600/40 hover:scale-110 transition-transform"
              >
                <Play className="w-6 h-6 fill-white translate-x-0.5" />
              </button>
            )}
          </div>

          {/* Quick Playback Bar under canvas */}
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
            <span className="font-mono text-white font-semibold">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime -= 5;
                }}
                className="p-1.5 rounded-lg bg-slate-900 border border-white/5 hover:text-white"
                title="Rewind 5s"
              >
                <Rewind className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime += 5;
                }}
                className="p-1.5 rounded-lg bg-slate-900 border border-white/5 hover:text-white"
                title="Forward 5s"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: CAPCUT TOOLS INSPECTOR */}
        <aside className="w-72 sm:w-80 border-l border-white/10 bg-slate-950/90 flex flex-col shrink-0">
          {/* Tool Tabs Bar */}
          <div className="grid grid-cols-6 border-b border-white/10 bg-slate-900/60 p-1">
            {[
              { id: "aspect", icon: Film, label: "Crop" },
              { id: "trim", icon: Scissors, label: "Trim" },
              { id: "speed", icon: Gauge, label: "Speed" },
              { id: "filter", icon: Sparkles, label: "Filter" },
              { id: "text", icon: Type, label: "Text" },
              { id: "audio", icon: Volume2, label: "Audio" },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex flex-col items-center py-2 rounded-lg text-[10px] font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tool Tab Content Body */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {/* 1. ASPECT RATIO TAB */}
            {activeTab === "aspect" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-indigo-400" />
                  Aspect Ratio & Framing
                </h4>
                <div className="space-y-2">
                  {[
                    {
                      id: "9:16",
                      name: "Vertical (9:16)",
                      desc: "For TikTok, Instagram Reels, YouTube Shorts",
                    },
                    {
                      id: "16:9",
                      name: "Widescreen (16:9)",
                      desc: "Standard YouTube & Landscape Video",
                    },
                    {
                      id: "1:1",
                      name: "Square (1:1)",
                      desc: "For Instagram Feed & Twitter",
                    },
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setAspectRatio(opt.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        aspectRatio === opt.id
                          ? "bg-indigo-600/20 border-indigo-500 text-white"
                          : "bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>{opt.name}</span>
                        {aspectRatio === opt.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. TRIM TAB */}
            {activeTab === "trim" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-indigo-400" />
                    Clip In & Out Points
                  </h4>
                  <button
                    type="button"
                    onClick={() => setTrimRange([0, duration])}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-white/5 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Start Time:</span>
                      <span className="font-mono text-white font-bold">
                        {formatTime(trimRange[0])}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, trimRange[1] - 1)}
                      value={trimRange[0]}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTrimRange([val, trimRange[1]]);
                        if (videoRef.current) videoRef.current.currentTime = val;
                      }}
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/70 border border-white/5 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">End Time:</span>
                      <span className="font-mono text-white font-bold">
                        {formatTime(trimRange[1])}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={trimRange[0] + 1}
                      max={duration}
                      value={trimRange[1]}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTrimRange([trimRange[0], val]);
                        if (videoRef.current) videoRef.current.currentTime = val;
                      }}
                      className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                    Clip Duration:{" "}
                    <span className="font-bold text-white">
                      {formatTime(trimRange[1] - trimRange[0])}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. SPEED TAB */}
            {activeTab === "speed" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                  Speed Ramping
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSpeedChange(s)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                        speed === s
                          ? "bg-indigo-600/30 border-indigo-500 text-indigo-300"
                          : "bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      {s}x
                      {s < 1 ? " (Slow)" : s > 1 ? " (Fast)" : " (Normal)"}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  Audio pitch will be automatically preserved during FFmpeg export.
                </p>
              </div>
            )}

            {/* 4. FILTER TAB */}
            {activeTab === "filter" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Color Grading & Filters
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "none", name: "Normal", preview: "bg-slate-800" },
                    { id: "cinematic", name: "Cinematic", preview: "bg-indigo-900" },
                    { id: "vintage", name: "Vintage", preview: "bg-amber-900" },
                    { id: "bw", name: "Monochrome", preview: "bg-zinc-800" },
                    { id: "cyberpunk", name: "Cyberpunk", preview: "bg-fuchsia-900" },
                    { id: "warm", name: "Warm Sunset", preview: "bg-orange-900" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setActiveFilter(f.id as any)}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                        activeFilter === f.id
                          ? "bg-indigo-600/20 border-indigo-500 text-white"
                          : "bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      <div className={`w-full h-8 rounded-lg mb-2 ${f.preview} opacity-80`} />
                      <div className="flex items-center justify-between">
                        <span>{f.name}</span>
                        {activeFilter === f.id && (
                          <Check className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 5. TEXT OVERLAY TAB */}
            {activeTab === "text" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-indigo-400" />
                  Text & Captions Overlay
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Enter Text</label>
                    <input
                      type="text"
                      placeholder="Add caption or watermark..."
                      value={textOverlay}
                      onChange={(e) => setTextOverlay(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Position</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["top", "center", "bottom"].map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setTextPosition(pos as any)}
                          className={`p-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                            textPosition === pos
                              ? "bg-indigo-600/30 border-indigo-500 text-indigo-300"
                              : "bg-slate-900/40 border-white/5 text-slate-400"
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. AUDIO TAB */}
            {activeTab === "audio" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  Audio Volume Booster
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Volume Level:</span>
                    <span className="font-bold text-white font-mono">
                      {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Mute</span>
                    <span>100% (Normal)</span>
                    <span>200% (Boost)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !isMuted;
                      setIsMuted(next);
                      if (videoRef.current) videoRef.current.muted = next;
                    }}
                    className={`w-full py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      isMuted
                        ? "bg-rose-500/20 border-rose-500 text-rose-300"
                        : "bg-slate-900/50 border-white/5 text-slate-300"
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isMuted ? "Unmute Audio" : "Mute Audio Track"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 3. BOTTOM CAPCUT MULTI-TRACK TIMELINE */}
      <footer className="h-28 border-t border-white/10 bg-slate-950 px-4 py-2 flex flex-col shrink-0 select-none">
        {/* Timeline Header & Ruler */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-white/5 pb-1">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-400">Tracks</span>
            <span className="font-mono text-indigo-400 font-bold">
              {formatTime(currentTime)}
            </span>
          </div>
          <div className="flex items-center gap-6 font-mono text-[10px]">
            <span>00:00</span>
            <span>{formatTime(duration * 0.25)}</span>
            <span>{formatTime(duration * 0.5)}</span>
            <span>{formatTime(duration * 0.75)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Multi-Track Area */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="relative flex-1 bg-slate-900/80 rounded-xl mt-1.5 overflow-hidden border border-white/5 cursor-pointer flex flex-col justify-center px-1"
        >
          {/* Moving Playhead Bar */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none shadow-lg shadow-rose-500"
            style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
          >
            <div className="w-3 h-3 -translate-x-[5px] bg-rose-500 rounded-sm shadow-md" />
          </div>

          {/* Video Track with Trim Region */}
          <div className="h-8 bg-indigo-950/40 rounded-lg border border-indigo-500/20 relative overflow-hidden flex items-center">
            {/* Active Trim Window */}
            <div
              className="absolute top-0 bottom-0 bg-indigo-600/30 border-y-2 border-indigo-400"
              style={{
                left: `${(trimRange[0] / (duration || 1)) * 100}%`,
                width: `${((trimRange[1] - trimRange[0]) / (duration || 1)) * 100}%`,
              }}
            >
              <div className="w-2 h-full bg-indigo-400 absolute left-0 top-0 cursor-ew-resize" />
              <div className="w-2 h-full bg-indigo-400 absolute right-0 top-0 cursor-ew-resize" />
            </div>

            <div className="pl-3 text-[10px] font-bold text-indigo-300 flex items-center gap-1 z-10 pointer-events-none">
              <Film className="w-3 h-3" />
              <span>Video Stream ({aspectRatio})</span>
            </div>
          </div>

          {/* Audio Waveform Track */}
          <div className="h-4 bg-purple-950/20 rounded-md border border-purple-500/10 mt-1 flex items-center px-3 text-[9px] text-purple-400 font-mono pointer-events-none">
            <Volume2 className="w-2.5 h-2.5 mr-1" />
            <span>Audio Waveform • {Math.round(volume * 100)}%</span>
          </div>
        </div>
      </footer>

      {/* 4. EXPORTING PROGRESS MODAL */}
      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl glass-panel border border-white/10 p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
              {exportProgress === 100 ? (
                <Check className="w-7 h-7 text-emerald-400" />
              ) : (
                <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">
                {exportProgress === 100 ? "CapCut Render Complete!" : "Exporting CapCut Video..."}
              </h3>
              <p className="text-xs text-slate-400">{exportStatus}</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <div className="text-right text-xs font-mono font-bold text-indigo-400">
              {exportProgress}%
            </div>

            {exportError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {exportError}
              </div>
            )}

            {exportProgress === 100 && exportedFilename && (
              <div className="pt-2 flex items-center justify-center gap-3">
                <a
                  href={`${backendUrl}/api/download/file/${encodeURIComponent(exportedFilename)}`}
                  download
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Edited Video
                </a>
                <button
                  type="button"
                  onClick={() => setIsExporting(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Back to Studio
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
