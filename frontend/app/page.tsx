"use client";

import React, { useState, useEffect } from "react";
import {
  Link as LinkIcon,
  Clipboard,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertTriangle,
  Loader2,
  X,
  Layers,
  HardDrive,
  Cpu,
} from "lucide-react";
import { Header } from "./components/Header";
import { VideoPreviewPlayer, VideoInfo } from "./components/VideoPreviewPlayer";
import { DownloadControls } from "./components/DownloadControls";
import { RecentDownloads, DownloadHistoryItem } from "./components/RecentDownloads";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

const SUPPORTED_PLATFORMS = [
  { name: "YouTube", icon: "▶️", color: "from-red-500/20 to-red-600/10 text-red-400" },
  { name: "Instagram", icon: "📸", color: "from-pink-500/20 to-purple-600/10 text-pink-400" },
  { name: "TikTok", icon: "🎵", color: "from-cyan-500/20 to-sky-600/10 text-cyan-400" },
  { name: "Facebook", icon: "🌐", color: "from-blue-500/20 to-indigo-600/10 text-blue-400" },
  { name: "Twitter / X", icon: "𝕏", color: "from-slate-500/20 to-slate-700/10 text-slate-300" },
  { name: "Reddit", icon: "💬", color: "from-orange-500/20 to-red-600/10 text-orange-400" },
  { name: "Pinterest", icon: "📌", color: "from-rose-500/20 to-pink-600/10 text-rose-400" },
  { name: "Vimeo", icon: "🎬", color: "from-teal-500/20 to-emerald-600/10 text-teal-400" },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compressed preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  // Recent downloads stored in localStorage
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("clipcompress_history");
      if (saved) {
        setDownloadHistory(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveHistory = (items: DownloadHistoryItem[]) => {
    setDownloadHistory(items);
    try {
      localStorage.setItem("clipcompress_history", JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const handleDownloadComplete = (newItem: DownloadHistoryItem) => {
    const updated = [newItem, ...downloadHistory.slice(0, 9)];
    saveHistory(updated);
  };

  const handleClearHistory = () => {
    saveHistory([]);
  };

  const handleRemoveHistoryItem = (index: number) => {
    const updated = downloadHistory.filter((_, i) => i !== index);
    saveHistory(updated);
  };

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
      }
    } catch {
      // ignore clipboard error
    }
  };

  // Fetch video metadata & auto-trigger preview
  const handleFetchVideo = async (targetUrl?: string) => {
    const finalUrl = (targetUrl || url).trim();
    if (!finalUrl) {
      setErrorMessage("Please enter or paste a valid video URL.");
      return;
    }

    setIsFetchingInfo(true);
    setErrorMessage(null);
    setVideoInfo(null);
    setPreviewUrl(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: finalUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Unable to retrieve video from this URL.");
      }

      const data = await res.json();
      const info: VideoInfo = data.data;
      setVideoInfo(info);

      // Auto-trigger compressed preview generation
      handleGeneratePreview(finalUrl, info);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          "Could not fetch video. Please check that the URL is public and correct, and that the backend server is running."
      );
    } finally {
      setIsFetchingInfo(false);
    }
  };

  // Generate compressed preview clip with FFmpeg
  const handleGeneratePreview = async (videoUrl: string, info?: VideoInfo) => {
    setIsLoadingPreview(true);
    try {
      // If platform provides a direct previewable mp4 stream, use it or request backend compression
      const res = await fetch(`${BACKEND_URL}/api/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewUrl(`${BACKEND_URL}${data.preview_url}`);
      } else if (info?.direct_preview_url) {
        // Fallback to direct stream if backend clip fails
        setPreviewUrl(info.direct_preview_url);
      }
    } catch {
      if (info?.direct_preview_url) {
        setPreviewUrl(info.direct_preview_url);
      }
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-[#090d16] text-slate-100 selection:bg-indigo-500/30">
      {/* Dynamic ambient backgrounds */}
      <div className="ambient-glow" />
      <div className="ambient-glow-secondary" />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            100% Free Stack • Built with FastAPI, Next.js & FFmpeg
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Download Any Video <br />
            <span className="text-gradient">Compressed & High Quality</span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Paste any link from YouTube, Instagram, TikTok, Twitter/X, Facebook, and 1000+
            platforms. Preview the compressed video instantly, then download with custom FFmpeg
            compression levels.
          </p>
        </div>

        {/* Search & URL Input Bar */}
        <div className="max-w-3xl mx-auto mb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFetchVideo();
            }}
            className="relative flex items-center p-2 rounded-2xl glass-panel border border-white/10 shadow-2xl focus-within:border-indigo-500/50 transition-all"
          >
            <div className="pl-3 text-slate-400">
              <LinkIcon className="w-5 h-5" />
            </div>

            <input
              type="url"
              placeholder="Paste video URL here (YouTube, Instagram, TikTok, Facebook...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-transparent px-3 py-2 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
              required
            />

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 pr-1">
              {url ? (
                <button
                  type="button"
                  onClick={() => setUrl("")}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  title="Clear input"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePaste}
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-white/5 transition-all"
                >
                  <Clipboard className="w-3.5 h-3.5 text-indigo-400" />
                  Paste
                </button>
              )}

              <button
                type="submit"
                disabled={isFetchingInfo || !url}
                className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
              >
                {isFetchingInfo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    Fetch Video
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Supported Platforms Pills */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            {SUPPORTED_PLATFORMS.map((p) => (
              <span
                key={p.name}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${p.color} border border-white/5`}
              >
                <span>{p.icon}</span>
                <span>{p.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="max-w-3xl mx-auto mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3 shadow-lg">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Error Fetching Video</p>
              <p className="text-xs text-rose-300/80">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Dynamic Video Preview & Download Area */}
        {videoInfo && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12 animate-in fade-in duration-500">
            {/* Left Column: Video Preview Player */}
            <div className="lg:col-span-7">
              <VideoPreviewPlayer
                info={videoInfo}
                previewUrl={previewUrl}
                isLoadingPreview={isLoadingPreview}
                onGeneratePreview={() => handleGeneratePreview(videoInfo.webpage_url, videoInfo)}
              />
            </div>

            {/* Right Column: Download & Compression Controls */}
            <div className="lg:col-span-5">
              <DownloadControls
                info={videoInfo}
                backendUrl={BACKEND_URL}
                onDownloadComplete={handleDownloadComplete}
              />
            </div>
          </div>
        )}

        {/* Feature Highlights Grid */}
        <div className="max-w-5xl mx-auto mt-16 pt-12 border-t border-white/5">
          <div className="text-center mb-8 space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Why Use Smart FFmpeg Compression?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Save up to 75% file storage without losing noticeable video clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">H.264 CRF Compression</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Uses industry-standard Constant Rate Factor (CRF) encoding. Shrinks large 4K/1080p
                streams into lightweight MP4 files that open instantly on mobile.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Fast Compressed Preview</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Before downloading 200MB+, our system renders a quick compressed snippet so you can
                verify the video content in your browser with minimal bandwidth.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">100% Free & Unlimited</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zero subscriptions, no cloud API limits, no watermarks. Runs entirely on your local
                FastAPI backend with open-source tools.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Downloads History */}
        <div className="max-w-5xl mx-auto">
          <RecentDownloads
            history={downloadHistory}
            backendUrl={BACKEND_URL}
            onClearHistory={handleClearHistory}
            onRemoveItem={handleRemoveHistoryItem}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-8 mt-16 bg-slate-950/60 text-center text-xs text-slate-500">
        <p>ClipCompress • Free Full-Stack Video Downloader & Compressor</p>
        <p className="mt-1 text-slate-600">
          Powered by FastAPI, Next.js 16, yt-dlp & FFmpeg. Use responsibly according to platform terms.
        </p>
      </footer>
    </div>
  );
}
