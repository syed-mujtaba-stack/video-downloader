"use client";

import React from "react";
import { Sparkles, ShieldCheck, Zap } from "lucide-react";

export const Header: React.FC = () => {
  return (
    <header className="w-full border-b border-white/5 bg-slate-950/40 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-sky-400 p-[1px] shadow-lg shadow-indigo-500/25">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">
                Clip<span className="text-gradient">Compress</span>
              </span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                100% Free
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Universal Multi-Platform Video Downloader & Compressor
            </p>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            No Ads • No Limits
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            FFmpeg Engine
          </div>
        </div>
      </div>
    </header>
  );
};
