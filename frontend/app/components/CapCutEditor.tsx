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
  Volume2,
  VolumeX,
  Type,
  Gauge,
  Film,
  Check,
  Loader2,
  FastForward,
  Rewind,
  Send,
  Wand2,
  Bot,
  AlertCircle,
} from "lucide-react";
import { VideoInfo } from "./VideoPreviewPlayer";

interface CapCutEditorProps {
  isOpen: boolean;
  onClose: () => void;
  info: VideoInfo;
  previewVideoUrl?: string | null;
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

  // Agentic AI Copilot State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

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
      if (currentTime >= trimRange[1]) {
        videoRef.current.currentTime = trimRange[0];
      }
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      } else {
        setIsPlaying(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    if (t >= trimRange[1]) {
      videoRef.current.currentTime = trimRange[0];
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      if (trimRange[1] === 60 || trimRange[1] === 0) {
        setTrimRange([0, dur]);
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

  // Agentic AI Command Execution
  const executeAiCommand = async (promptText: string) => {
    if (!promptText.trim()) return;
    setIsAiThinking(true);
    setAiFeedback("Agentic AI Director is analyzing video and generating edit recipe...");

    try {
      const res = await fetch(`${backendUrl}/api/ai/director`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          title: info.title,
          duration: duration || info.duration || 60,
        }),
      });

      if (!res.ok) throw new Error("AI Director endpoint unavailable");
      const data = await res.json();

      if (data.success) {
        if (data.aspect_ratio) setAspectRatio(data.aspect_ratio);
        if (data.trim_range && Array.isArray(data.trim_range)) {
          setTrimRange([data.trim_range[0], data.trim_range[1]]);
          if (videoRef.current) {
            videoRef.current.currentTime = data.trim_range[0];
            setCurrentTime(data.trim_range[0]);
          }
        }
        if (data.filter_preset) setActiveFilter(data.filter_preset);
        if (data.speed) handleSpeedChange(data.speed);
        if (data.text_overlay) setTextOverlay(data.text_overlay);
        if (data.text_position) setTextPosition(data.text_position);

        setAiFeedback(data.rationale || "AI Directive applied successfully!");
      }
    } catch (err: any) {
      setAiFeedback(err.message || "Failed to execute AI Directive.");
    } finally {
      setIsAiThinking(false);
    }
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
        return "w-[270px] sm:w-[320px] aspect-[9/16]";
      case "1:1":
        return "w-[340px] sm:w-[400px] aspect-square";
      case "16:9":
      default:
        return "w-full max-w-[620px] aspect-video";
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
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-neutral-900 overflow-hidden select-none animate-in fade-in duration-200">
      {/* ===================================================
          1. TOP HEADER BAR (White & Black Minimalist)
          =================================================== */}
      <header className="h-14 border-b border-neutral-200 bg-white px-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shadow-sm">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="font-bold text-sm text-black tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                CapCut <span className="underline underline-offset-2">Studio</span>
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
                PRO EDITOR
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 max-w-[240px] truncate hidden sm:block">
              {info.title}
            </p>
          </div>
        </div>

        {/* Aspect Ratio Fast Switcher in Header */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
          <button
            type="button"
            onClick={() => setAspectRatio("9:16")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              aspectRatio === "9:16"
                ? "bg-black text-white shadow-xs"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            <span>📱 9:16</span>
            <span className="text-[10px] opacity-70 hidden sm:inline">TikTok/Reels</span>
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio("16:9")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              aspectRatio === "16:9"
                ? "bg-black text-white shadow-xs"
                : "text-neutral-600 hover:text-black"
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
                ? "bg-black text-white shadow-xs"
                : "text-neutral-600 hover:text-black"
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
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-black hover:bg-neutral-800 shadow-sm flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Video</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-xl transition-colors"
            title="Close Editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ===================================================
          AGENTIC AI DIRECTOR COPILOT BAR
          =================================================== */}
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-black shrink-0 px-2 py-1 bg-white border border-neutral-200 rounded-lg shadow-2xs">
            <Bot className="w-3.5 h-3.5 text-black" />
            <span>AI Director</span>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  executeAiCommand(aiPrompt);
                }
              }}
              placeholder="Prompt AI: e.g. 'Make a 30s viral TikTok reel with cinematic filter'..."
              className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black shadow-2xs"
            />
            <button
              type="button"
              disabled={isAiThinking || !aiPrompt.trim()}
              onClick={() => executeAiCommand(aiPrompt)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-black hover:bg-neutral-800 text-white text-[11px] font-semibold flex items-center gap-1 transition-all disabled:opacity-40"
            >
              {isAiThinking ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              <span>Run</span>
            </button>
          </div>

          {/* Quick AI Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 shrink-0">
            {[
              { label: "⚡ 30s Viral Reel", prompt: "Make a 30s viral TikTok reel with bold hook" },
              { label: "🎬 Cinematic Widescreen", prompt: "Format to 16:9 widescreen with cinematic color grade" },
              { label: "🏎️ 1.5x Speed Recap", prompt: "Fast 1.5x recap square format" },
              { label: "📱 WhatsApp Clip", prompt: "First 30 seconds clip for WhatsApp status" },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setAiPrompt(chip.prompt);
                  executeAiCommand(chip.prompt);
                }}
                className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200 hover:border-black hover:bg-neutral-100 text-[10px] font-semibold text-neutral-700 whitespace-nowrap transition-all shadow-2xs"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Rationale Notice */}
        {aiFeedback && (
          <div className="flex items-center justify-between text-[11px] text-neutral-700 bg-white border border-neutral-200 px-3 py-1.5 rounded-xl animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-black shrink-0" />
              <span>{aiFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setAiFeedback(null)}
              className="text-neutral-400 hover:text-black ml-2"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* ===================================================
          2. MAIN WORKSPACE (CANVAS & TOOLS)
          =================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* CENTER VIEWPORT (CANVAS) */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-neutral-100/70 relative overflow-hidden">
          {/* Subtle Dot Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#00000010_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          {/* Video Aspect Canvas Container */}
          <div
            className={`relative ${getAspectDimensions()} max-h-[56vh] bg-black rounded-2xl overflow-hidden border border-neutral-300 shadow-xl flex items-center justify-center transition-all duration-300`}
          >
            {(() => {
              const videoSrc = (previewVideoUrl && previewVideoUrl.trim() !== "")
                ? previewVideoUrl
                : (info.direct_preview_url && info.direct_preview_url.trim() !== "")
                ? info.direct_preview_url
                : null;

              if (videoSrc) {
                return (
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    poster={info.thumbnail}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    playsInline
                    className="w-full h-full object-contain"
                    style={{ filter: getFilterStyle() }}
                    onClick={togglePlay}
                  />
                );
              }

              return (
                <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-4 bg-black">
                  {info.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={info.thumbnail}
                      alt={info.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                  )}
                  <div className="relative z-10 space-y-2 max-w-xs px-2">
                    <Film className="w-10 h-10 text-white/40 mx-auto" />
                    <p className="text-sm font-semibold text-white">No Preview Stream Ready</p>
                    <p className="text-xs text-neutral-400">
                      Generate a compressed preview on the main page to enable real-time playback while editing.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Custom On-Screen Text Overlay */}
            {textOverlay && (
              <div
                className={`absolute left-0 right-0 px-4 text-center pointer-events-none ${
                  textPosition === "top"
                    ? "top-5"
                    : textPosition === "center"
                    ? "top-1/2 -translate-y-1/2"
                    : "bottom-5"
                }`}
              >
                <span className="inline-block bg-black/75 backdrop-blur-sm text-white font-extrabold text-sm sm:text-base px-3 py-1 rounded-lg border border-white/20 shadow-lg tracking-wide">
                  {textOverlay}
                </span>
              </div>
            )}

            {/* Canvas Overlay Badges */}
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono text-white border border-white/10 flex items-center gap-1">
              <span>{aspectRatio}</span>
              {speed !== 1.0 && <span>• {speed}x</span>}
              {activeFilter !== "none" && <span className="capitalize">• {activeFilter}</span>}
            </div>

            {/* Big Play overlay if paused */}
            {!isPlaying && (previewVideoUrl || info.direct_preview_url) && (
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/90 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
              >
                <Play className="w-6 h-6 fill-white translate-x-0.5" />
              </button>
            )}
          </div>

          {/* Quick Playback Bar under canvas */}
          <div className="mt-3 flex items-center gap-4 text-xs text-neutral-600 bg-white border border-neutral-200 px-4 py-1.5 rounded-full shadow-2xs">
            <span className="font-mono text-black font-bold">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime -= 5;
                }}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-black transition-colors"
                title="Rewind 5s"
              >
                <Rewind className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="px-2.5 py-1 rounded-lg bg-black hover:bg-neutral-800 text-white font-semibold flex items-center gap-1 text-[11px] shadow-2xs"
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime += 5;
                }}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-black transition-colors"
                title="Forward 5s"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: CAPCUT TOOLS INSPECTOR (White & Black) */}
        <aside className="w-72 sm:w-80 border-l border-neutral-200 bg-white flex flex-col shrink-0">
          {/* Tool Tabs Bar */}
          <div className="grid grid-cols-6 border-b border-neutral-200 bg-neutral-50 p-1">
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
                      ? "bg-black text-white shadow-2xs"
                      : "text-neutral-500 hover:text-black"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 mb-0.5" />
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-black" />
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
                          ? "bg-black text-white border-black shadow-xs"
                          : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-black/30"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>{opt.name}</span>
                        {aspectRatio === opt.id && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <p className={`text-[11px] mt-0.5 ${aspectRatio === opt.id ? "text-neutral-300" : "text-neutral-500"}`}>
                        {opt.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. TRIM TAB */}
            {activeTab === "trim" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-black" />
                    Clip In & Out Points
                  </h4>
                  <button
                    type="button"
                    onClick={() => setTrimRange([0, duration])}
                    className="text-[10px] text-neutral-400 hover:text-black flex items-center gap-1 font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Start Time:</span>
                      <span className="font-mono text-black font-bold">
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
                      className="w-full accent-black h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">End Time:</span>
                      <span className="font-mono text-black font-bold">
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
                      className="w-full accent-black h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-700 flex items-center justify-between">
                    <span>Clip Duration:</span>
                    <span className="font-bold text-black font-mono">
                      {formatTime(trimRange[1] - trimRange[0])}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. SPEED TAB */}
            {activeTab === "speed" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-black" />
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
                          ? "bg-black text-white border-black shadow-xs"
                          : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-black/30"
                      }`}
                    >
                      {s}x
                      <span className="block text-[9px] font-normal opacity-80">
                        {s < 1 ? "Slow" : s > 1 ? "Fast" : "Normal"}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-500">
                  Audio pitch will be automatically preserved during FFmpeg export.
                </p>
              </div>
            )}

            {/* 4. FILTER TAB */}
            {activeTab === "filter" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-black" />
                  Color Grading & Filters
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "none", name: "Normal", preview: "bg-neutral-300" },
                    { id: "cinematic", name: "Cinematic", preview: "bg-neutral-800" },
                    { id: "vintage", name: "Vintage", preview: "bg-amber-800/80" },
                    { id: "bw", name: "Monochrome", preview: "bg-neutral-600" },
                    { id: "cyberpunk", name: "Cyberpunk", preview: "bg-neutral-900" },
                    { id: "warm", name: "Warm Sunset", preview: "bg-orange-700/80" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setActiveFilter(f.id as any)}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                        activeFilter === f.id
                          ? "bg-black text-white border-black shadow-xs"
                          : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-black/30"
                      }`}
                    >
                      <div className={`w-full h-8 rounded-lg mb-2 ${f.preview}`} />
                      <div className="flex items-center justify-between">
                        <span>{f.name}</span>
                        {activeFilter === f.id && (
                          <Check className="w-3.5 h-3.5 text-white" />
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-black" />
                  Text & Captions Overlay
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-neutral-500 block mb-1">Enter Text</label>
                    <input
                      type="text"
                      placeholder="Add headline, hook or caption..."
                      value={textOverlay}
                      onChange={(e) => setTextOverlay(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-500 block mb-1">Position</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["top", "center", "bottom"].map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setTextPosition(pos as any)}
                          className={`p-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                            textPosition === pos
                              ? "bg-black text-white border-black"
                              : "bg-neutral-50 border-neutral-200 text-neutral-600"
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-black" />
                  Audio Volume Booster
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Volume Level:</span>
                    <span className="font-bold text-black font-mono">
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
                    className="w-full accent-black h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400">
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
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-neutral-50 border-neutral-200 text-neutral-800 hover:bg-neutral-100"
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

      {/* ===================================================
          3. BOTTOM TIMELINE (White & Black High-Contrast)
          =================================================== */}
      <footer className="h-28 border-t border-neutral-200 bg-white px-4 py-2 flex flex-col shrink-0 select-none">
        {/* Timeline Header & Ruler */}
        <div className="flex items-center justify-between text-[11px] text-neutral-500 border-b border-neutral-100 pb-1">
          <div className="flex items-center gap-3">
            <span className="font-bold text-black">Timeline Tracks</span>
            <span className="font-mono text-black font-bold">
              {formatTime(currentTime)}
            </span>
          </div>
          <div className="flex items-center gap-6 font-mono text-[10px] text-neutral-400">
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
          className="relative flex-1 bg-neutral-100 rounded-xl mt-1.5 overflow-hidden border border-neutral-200 cursor-pointer flex flex-col justify-center px-1"
        >
          {/* Moving Playhead Bar */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-black z-30 pointer-events-none shadow-md"
            style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
          >
            <div className="w-3 h-3 -translate-x-[5px] bg-black rounded-sm shadow" />
          </div>

          {/* Video Track with Trim Region */}
          <div className="h-8 bg-neutral-200/80 rounded-lg border border-neutral-300 relative overflow-hidden flex items-center">
            {/* Active Trim Window */}
            <div
              className="absolute top-0 bottom-0 bg-black/15 border-y-2 border-black"
              style={{
                left: `${(trimRange[0] / (duration || 1)) * 100}%`,
                width: `${((trimRange[1] - trimRange[0]) / (duration || 1)) * 100}%`,
              }}
            >
              <div className="w-2 h-full bg-black absolute left-0 top-0 cursor-ew-resize" />
              <div className="w-2 h-full bg-black absolute right-0 top-0 cursor-ew-resize" />
            </div>

            <div className="pl-3 text-[10px] font-bold text-neutral-800 flex items-center gap-1 z-10 pointer-events-none">
              <Film className="w-3 h-3" />
              <span>Video Track ({aspectRatio})</span>
            </div>
          </div>

          {/* Audio Waveform Track */}
          <div className="h-4 bg-neutral-200/50 rounded-md border border-neutral-300/60 mt-1 flex items-center px-3 text-[9px] text-neutral-600 font-mono pointer-events-none">
            <Volume2 className="w-2.5 h-2.5 mr-1" />
            <span>Audio Waveform • {Math.round(volume * 100)}%</span>
          </div>
        </div>
      </footer>

      {/* ===================================================
          4. EXPORTING PROGRESS MODAL (White & Black)
          =================================================== */}
      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white border border-neutral-200 p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-black border border-neutral-200 flex items-center justify-center mx-auto shadow-xs">
              {exportProgress === 100 ? (
                <Check className="w-7 h-7 text-emerald-600" />
              ) : (
                <Loader2 className="w-7 h-7 animate-spin text-black" />
              )}
            </div>

            <div className="space-y-1">
              <h3
                className="text-lg font-bold text-black"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {exportProgress === 100 ? "CapCut Render Complete!" : "Exporting CapCut Video..."}
              </h3>
              <p className="text-xs text-neutral-500">{exportStatus}</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200">
              <div
                className="h-full bg-black rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <div className="text-right text-xs font-mono font-bold text-black">
              {exportProgress}%
            </div>

            {exportError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{exportError}</span>
              </div>
            )}

            {exportProgress === 100 && exportedFilename && (
              <div className="pt-2 flex items-center justify-center gap-3">
                <a
                  href={`${backendUrl}/api/download/file/${encodeURIComponent(exportedFilename)}`}
                  download
                  className="px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Edited Video
                </a>
                <button
                  type="button"
                  onClick={() => setIsExporting(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-800"
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
