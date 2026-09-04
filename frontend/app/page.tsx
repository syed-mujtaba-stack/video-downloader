"use client";

import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Link as LinkIcon,
  Clipboard,
  ArrowRight,
  AlertTriangle,
  Loader2,
  X,
  Scissors,
  Smartphone,
  Cpu,
  HardDrive,
  Sparkles,
  Bot,
} from "lucide-react";
import { Header } from "./components/Header";
import { VideoPreviewPlayer, VideoInfo } from "./components/VideoPreviewPlayer";
import { DownloadControls } from "./components/DownloadControls";
import { RecentDownloads, DownloadHistoryItem } from "./components/RecentDownloads";
import { QRCodeModal } from "./components/QRCodeModal";
import { CapCutEditor } from "./components/CapCutEditor";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

/* ===========================================================
   PLATFORM LOGOS (Real SVG logos)
   =========================================================== */
const PLATFORMS = [
  {
    name: "YouTube",
    color: "#FF0000",
    bg: "#fff1f1",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FF0000">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  {
    name: "Instagram",
    color: "#E1306C",
    bg: "#fff1f6",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="url(#ig-grad)">
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFDC80" />
            <stop offset="25%" stopColor="#FCAF45" />
            <stop offset="50%" stopColor="#F77737" />
            <stop offset="75%" stopColor="#F56040" />
            <stop offset="100%" stopColor="#C13584" />
          </linearGradient>
        </defs>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
  },
  {
    name: "TikTok",
    color: "#000000",
    bg: "#f5f5f5",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#000000">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.73a8.25 8.25 0 0 0 4.83 1.55V6.84a4.85 4.85 0 0 1-1.06-.15z"/>
      </svg>
    ),
  },
  {
    name: "Facebook",
    color: "#1877F2",
    bg: "#f0f5ff",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    name: "Twitter / X",
    color: "#000000",
    bg: "#f5f5f5",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#000000">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    name: "Reddit",
    color: "#FF4500",
    bg: "#fff3f0",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FF4500">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
      </svg>
    ),
  },
  {
    name: "Pinterest",
    color: "#E60023",
    bg: "#fff1f1",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#E60023">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
      </svg>
    ),
  },
  {
    name: "Vimeo",
    color: "#1AB7EA",
    bg: "#f0faff",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1AB7EA">
        <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 12.5C4.603 9.913 3.826 8.619 2.99 8.619c-.188 0-.842.395-1.972 1.182L0 8.44c1.246-1.394 2.476-2.443 3.682-3.522C5.576 3.18 7.121 2.348 8.33 2.252c1.23-.092 2.003.56 2.44 1.861.442 1.355.735 2.194.895 2.521.491 2.994.766 4.783.856 5.374.331 2.054.737 3.083 1.213 3.083.346 0 .876-.56 1.591-1.667.705-1.109 1.081-1.942 1.098-2.508.031-1.013-.288-1.514-1.07-1.514-.371 0-.754.09-1.181.246 1.234-3.244 3.598-4.815 7.097-4.716.99.036 1.786.303 2.372.843z"/>
      </svg>
    ),
  },
  {
    name: "Twitch",
    color: "#9146FF",
    bg: "#f5f0ff",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#9146FF">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
    ),
  },
  {
    name: "SoundCloud",
    color: "#FF5500",
    bg: "#fff3ef",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FF5500">
        <path d="M1.175 12.225c-.017 0-.032.001-.05.003.005-.018.005-.036.005-.055C1.13 10.562 2.304 9.23 3.824 9.23c.39 0 .758.086 1.095.235.222-.972 1.052-1.701 2.066-1.701.367 0 .71.093 1.008.252.048-.187.077-.38.077-.582 0-1.326-1.074-2.4-2.4-2.4-.523 0-1.003.171-1.395.454C3.93 4.07 2.979 3.28 1.81 3.28c-1.45 0-2.626 1.176-2.626 2.627 0 .133.011.264.03.393C-.516 6.586-1.13 7.4-1.13 8.359c0 1.126.912 2.039 2.039 2.039h.266v1.827zM23.99 12.18c0 1.42-1.15 2.57-2.568 2.57h-1.154v3.524c0 .77-.624 1.393-1.393 1.393s-1.393-.624-1.393-1.393v-3.524h-9.55c-.77 0-1.393-.624-1.393-1.393 0-.77.624-1.393 1.393-1.393H16.9v-4.53c0-.77.624-1.393 1.393-1.393.77 0 1.393.624 1.393 1.393v4.53h1.154c.98 0 1.776.796 1.776 1.776z"/>
      </svg>
    ),
  },
  {
    name: "Dailymotion",
    color: "#0073F5",
    bg: "#f0f5ff",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0073F5">
        <path d="M13.478 0v3.51c3.965.521 7.013 3.918 7.013 8.032 0 4.481-3.642 8.123-8.123 8.123S4.245 16.023 4.245 11.542c0-2.79 1.41-5.25 3.562-6.729V1.207C3.26 2.874 0 6.878 0 11.542 0 18.366 5.543 23.91 12.368 23.91c6.826 0 12.369-5.544 12.369-12.368C24.737 5.116 19.69.167 13.478 0zm-1.55 7.168v4.949l3.558 3.558-1.516 1.516-4.296-4.296V7.168h2.254z"/>
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    color: "#0A66C2",
    bg: "#f0f5ff",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0A66C2">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
];

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);
  const urlBarRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const platformsRef = useRef<HTMLDivElement>(null);
  const featureCardsRef = useRef<HTMLDivElement>(null);

  const [url, setUrl] = useState("");
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [lanBackendUrl, setLanBackendUrl] = useState(BACKEND_URL);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [qrModal, setQrModal] = useState<{
    isOpen: boolean;
    downloadUrl: string;
    filename: string;
  }>({ isOpen: false, downloadUrl: "", filename: "" });
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>([]);

  /* ================================================
     GSAP Hero Entrance Animations
     ================================================ */
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.set(
      [
        heroTitleRef.current,
        heroSubRef.current,
        urlBarRef.current,
        statsRef.current,
        platformsRef.current,
      ],
      { visibility: "visible" }
    )
      .from(heroTitleRef.current, {
        y: 60,
        opacity: 0,
        duration: 0.9,
      })
      .from(
        heroSubRef.current,
        { y: 30, opacity: 0, duration: 0.7 },
        "-=0.5"
      )
      .from(urlBarRef.current, { y: 30, opacity: 0, duration: 0.7, scale: 0.97 }, "-=0.4")
      .from(statsRef.current, { y: 20, opacity: 0, duration: 0.5 }, "-=0.3")
      .from(platformsRef.current, { y: 20, opacity: 0, duration: 0.5 }, "-=0.3");
  }, { scope: containerRef });

  /* ================================================
     GSAP Feature Cards Scroll Trigger
     ================================================ */
  useGSAP(() => {
    if (!featureCardsRef.current) return;
    const cards = featureCardsRef.current.querySelectorAll(".feature-card");
    gsap.set(cards, { visibility: "visible" });
    gsap.from(cards, {
      scrollTrigger: {
        trigger: featureCardsRef.current,
        start: "top 85%",
      },
      y: 50,
      opacity: 0,
      duration: 0.6,
      stagger: 0.12,
      ease: "power2.out",
    });
  }, { scope: containerRef });

  /* ================================================
     GSAP Video Preview Panel Entrance
     ================================================ */
  useEffect(() => {
    if (videoInfo) {
      gsap.from(".video-result-panel", {
        y: 40,
        opacity: 0,
        duration: 0.65,
        ease: "power3.out",
        stagger: 0.15,
      });
    }
  }, [videoInfo]);

  /* ================================================
     Bootstrap: Load history + fetch LAN IP
     ================================================ */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("clipcompress_history");
      if (saved) setDownloadHistory(JSON.parse(saved));
    } catch {}

    fetch(`${BACKEND_URL}/api/network-info`)
      .then((r) => r.json())
      .then((d) => d.backend_url && setLanBackendUrl(d.backend_url))
      .catch(() => {});
  }, []);

  const saveHistory = (items: DownloadHistoryItem[]) => {
    setDownloadHistory(items);
    try { localStorage.setItem("clipcompress_history", JSON.stringify(items)); } catch {}
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch {}
  };

  const handleFetchVideo = async (targetUrl?: string) => {
    const finalUrl = (targetUrl || url).trim();
    if (!finalUrl) { setErrorMessage("Please enter a valid video URL."); return; }
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
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      const data = await res.json();
      setVideoInfo(data.data);
      handleGeneratePreview(finalUrl, data.data);
    } catch (err: any) {
      setErrorMessage(err.message || "Could not fetch video. Is the backend running?");
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const handleGeneratePreview = async (videoUrl: string, info?: VideoInfo) => {
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewUrl(`${BACKEND_URL}${data.preview_url}`);
      } else if (info?.direct_preview_url) {
        setPreviewUrl(info.direct_preview_url);
      }
    } catch {
      if (info?.direct_preview_url) setPreviewUrl(info.direct_preview_url);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleOpenQR = (rawUrl: string, filename: string) => {
    const mobileUrl = rawUrl
      .replace("127.0.0.1:8000", lanBackendUrl.replace("http://", ""))
      .replace("localhost:8000", lanBackendUrl.replace("http://", ""));
    setQrModal({ isOpen: true, downloadUrl: mobileUrl, filename });
  };

  const handleDownloadComplete = (item: DownloadHistoryItem) => {
    const updated = [item, ...downloadHistory.slice(0, 9)];
    saveHistory(updated);
  };

  /* Duplicate platforms list for infinite marquee */
  const marqueeItems = [...PLATFORMS, ...PLATFORMS];

  return (
    <div ref={containerRef} className="min-h-screen relative bg-white text-black">
      {/* Animated grid background */}
      <div className="grid-bg" />

      {/* Hero blobs */}
      <div className="hero-blob hero-blob-1" />
      <div className="hero-blob hero-blob-2" />

      <Header />

      <main className="relative z-10">
        {/* ================================
            HERO SECTION
            ================================ */}
        <section className="pt-20 pb-12 px-4 text-center overflow-hidden">
          <div className="max-w-4xl mx-auto">
            {/* Eyebrow badge */}
            <div
              ref={statsRef}
              className="gsap-stats inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-xs font-bold mb-6 shadow-md"
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              100% Free • 1000+ Platforms • FFmpeg Engine
            </div>

            {/* Main headline */}
            <h1
              ref={heroTitleRef}
              className="gsap-hero-title text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-black leading-[0.9] mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Download.
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">Edit. Share.</span>
                <span
                  className="absolute bottom-1 left-0 right-0 h-4 bg-black/10 rounded-full -z-0"
                />
              </span>
            </h1>

            {/* Subheading */}
            <p
              ref={heroSubRef}
              className="gsap-hero-sub text-base sm:text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10"
            >
              Paste any video link — YouTube, TikTok, Instagram, Twitter/X and 1,000+ more. Preview
              compressed, trim clips, apply CapCut-style filters, and download in any quality.
            </p>

            {/* ================================
                URL INPUT BAR
                ================================ */}
            <div ref={urlBarRef} className="gsap-url-bar max-w-2xl mx-auto mb-10">
              <form
                onSubmit={(e) => { e.preventDefault(); handleFetchVideo(); }}
                className="url-input-bar flex items-center p-2 gap-2"
              >
                <div className="pl-3 text-gray-400">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <input
                  type="url"
                  placeholder="Paste video URL here..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 bg-transparent py-2.5 text-sm sm:text-base text-black placeholder-gray-400 focus:outline-none"
                  required
                />
                {url ? (
                  <button
                    type="button"
                    onClick={() => setUrl("")}
                    className="p-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="hidden sm:flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-full border border-gray-200 transition-all"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    Paste
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isFetchingInfo || !url}
                  className="btn-primary px-5 py-2.5 text-sm flex items-center gap-1.5"
                >
                  {isFetchingInfo ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Fetching...</>
                  ) : (
                    <>Fetch Video <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            </div>

            {/* Stats row */}
            <div className="gsap-stats flex flex-wrap justify-center gap-3 mb-12">
              {[
                { icon: "✂️", text: "Clip Trimmer" },
                { icon: "🎬", text: "CapCut Studio" },
                { icon: "📱", text: "QR to Phone" },
                { icon: "🎵", text: "320kbps MP3" },
                { icon: "⚡", text: "FFmpeg Compression" },
                { icon: "🧹", text: "Auto Cleanup" },
              ].map((s) => (
                <span key={s.text} className="stat-badge text-sm gap-1.5">
                  <span>{s.icon}</span>
                  <span>{s.text}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ================================
            PLATFORM MARQUEE STRIP
            ================================ */}
        <div ref={platformsRef} className="gsap-platforms py-6 border-y border-gray-100 bg-gray-50/60">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
            Supported Platforms
          </p>
          <div className="marquee-wrapper">
            <div className="marquee-track">
              {marqueeItems.map((p, i) => (
                <div key={`${p.name}-${i}`} className="platform-pill mx-2">
                  {p.logo}
                  <span style={{ color: p.color }} className="font-semibold">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================================
            ERROR ALERT
            ================================ */}
        {errorMessage && (
          <div className="max-w-3xl mx-auto mt-8 px-4">
            <div className="card p-4 border-red-200 bg-red-50 text-red-700 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="font-bold text-sm">Could not fetch video</p>
                <p className="text-xs mt-0.5 text-red-600">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* ================================
            VIDEO RESULT PANEL
            ================================ */}
        {videoInfo && (
          <div className="max-w-6xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 video-result-panel">
                <VideoPreviewPlayer
                  info={videoInfo}
                  previewUrl={previewUrl}
                  isLoadingPreview={isLoadingPreview}
                  onGeneratePreview={() => handleGeneratePreview(videoInfo.webpage_url, videoInfo)}
                  onOpenStudio={() => setIsStudioOpen(true)}
                />
              </div>
              <div className="lg:col-span-5 video-result-panel">
                <DownloadControls
                  info={videoInfo}
                  backendUrl={BACKEND_URL}
                  onDownloadComplete={handleDownloadComplete}
                  onOpenQR={handleOpenQR}
                />
              </div>
            </div>

            {/* Agentic AI Video Director Banner */}
            <div className="mt-8 card p-5 border-neutral-200 bg-neutral-50/90 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4
                      className="font-bold text-sm text-black"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Agentic AI Video Director & Auto-Editor
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black text-white">
                      AI COPILOT
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Let autonomous AI create 9:16 viral TikTok/Reels clips, trim key highlights, and add custom hook overlays in 1 click.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStudioOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm shrink-0 active:scale-95"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Open AI Studio Director</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================
            FEATURE CARDS
            ================================ */}
        <div ref={featureCardsRef} className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-black text-black tracking-tight mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Professional Tools, Zero Cost
            </h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              Everything you need to download, edit, and share — running entirely on your machine
              with no cloud limits, no watermarks, no subscriptions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <Scissors className="w-6 h-6" />,
                title: "Video Clip Trimmer",
                desc: "Select exact start & end points. Download only the 30-second clip you need without touching the full video.",
              },
              {
                icon: <span className="text-2xl">🎬</span>,
                title: "CapCut Studio Editor",
                desc: "Full-screen editor with aspect ratio switcher (9:16 / 1:1), filters, speed ramping, text overlays & timeline.",
              },
              {
                icon: <Smartphone className="w-6 h-6" />,
                title: "Scan QR → Phone",
                desc: "After download, scan a Wi-Fi QR code with your phone camera to instantly transfer the file to mobile.",
              },
              {
                icon: <Cpu className="w-6 h-6" />,
                title: "FFmpeg Compression",
                desc: "Local FFmpeg engine compresses with H.264 CRF. Choose Balanced (~50% smaller) or Ultra (~75% smaller).",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="feature-card card p-6 space-y-3 cursor-default"
                style={{ visibility: "hidden" }}
              >
                <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center shadow-md">
                  {f.icon}
                </div>
                <h3 className="font-bold text-base text-black">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ================================
            DOWNLOAD HISTORY
            ================================ */}
        <div className="max-w-6xl mx-auto px-4 pb-20">
          <RecentDownloads
            history={downloadHistory}
            backendUrl={BACKEND_URL}
            onClearHistory={() => saveHistory([])}
            onRemoveItem={(i) => saveHistory(downloadHistory.filter((_, idx) => idx !== i))}
          />
        </div>
      </main>

      {/* ================================
          FOOTER
          ================================ */}
      <footer className="border-t border-gray-100 py-10 text-center bg-gray-50">
        <p className="text-xs text-gray-400 font-medium">
          ClipCompress — Free Full-Stack Video Downloader & Compressor
        </p>
        <p className="text-xs text-gray-300 mt-1">
          Next.js 16 • FastAPI • yt-dlp • FFmpeg • GSAP • 100% Free & Open Source
        </p>
        <a
          href="https://github.com/syed-mujtaba-stack/video-downloader"
          className="inline-block mt-3 text-xs font-semibold text-black underline underline-offset-2 hover:text-gray-600 transition-colors"
          target="_blank"
        >
          ⭐ Star on GitHub
        </a>
      </footer>

      {/* Modals */}
      <QRCodeModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ ...qrModal, isOpen: false })}
        downloadUrl={qrModal.downloadUrl}
        filename={qrModal.filename}
      />
      {isStudioOpen && videoInfo && (
        <CapCutEditor
          isOpen={isStudioOpen}
          onClose={() => setIsStudioOpen(false)}
          info={videoInfo}
          previewVideoUrl={previewUrl || null}
          backendUrl={BACKEND_URL}
          onExportComplete={handleDownloadComplete}
        />
      )}
    </div>
  );
}
