"use client";

import React from "react";
import { History, Trash2, Download, ExternalLink, HardDrive } from "lucide-react";

export interface DownloadHistoryItem {
  title: string;
  filename: string;
  fileSize: string;
  format: string;
  quality: string;
  compression: string;
  timestamp: number;
}

interface RecentDownloadsProps {
  history: DownloadHistoryItem[];
  backendUrl: string;
  onClearHistory: () => void;
  onRemoveItem: (index: number) => void;
}

export const RecentDownloads: React.FC<RecentDownloadsProps> = ({
  history,
  backendUrl,
  onClearHistory,
  onRemoveItem,
}) => {
  if (!history || history.length === 0) return null;

  return (
    <div className="glass-panel rounded-2xl p-6 mt-8">
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white">Recent Downloads</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {history.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClearHistory}
          className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear All
        </button>
      </div>

      <div className="space-y-2.5">
        {history.map((item, index) => (
          <div
            key={`${item.filename}-${index}`}
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/50 border border-white/5 hover:border-white/10 transition-all flex-wrap gap-2"
          >
            <div className="flex items-center gap-3 min-w-0 max-w-[70%]">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                  <span className="text-indigo-400 font-medium">{item.format}</span>
                  <span>•</span>
                  <span>{item.quality}</span>
                  {item.compression !== "N/A" && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{item.compression}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{item.fileSize}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`${backendUrl}/api/download/file/${encodeURIComponent(item.filename)}`}
                download
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
              <button
                type="button"
                onClick={() => onRemoveItem(index)}
                className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                title="Remove from history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
