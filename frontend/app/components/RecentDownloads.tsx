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
    <div className="card p-6 mt-8">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-black" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Recent Downloads
          </h3>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-mono font-bold border border-neutral-200">
            {history.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClearHistory}
          className="text-xs text-neutral-400 hover:text-red-600 flex items-center gap-1 transition-colors font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear All
        </button>
      </div>

      <div className="space-y-2.5">
        {history.map((item, index) => (
          <div
            key={`${item.filename}-${index}`}
            className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 hover:border-black/20 hover:bg-white transition-all flex-wrap gap-3 shadow-xs"
          >
            <div className="flex items-center gap-3 min-w-0 max-w-[70%]">
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0 shadow-sm">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-black truncate">{item.title}</p>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500 flex-wrap mt-0.5">
                  <span className="font-bold text-black bg-neutral-200/80 px-1.5 py-0.2 rounded">{item.format}</span>
                  <span>•</span>
                  <span>{item.quality}</span>
                  {item.compression !== "N/A" && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{item.compression}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="font-medium text-neutral-700">{item.fileSize}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`${backendUrl}/api/download/file/${encodeURIComponent(item.filename)}`}
                download
                className="px-3.5 py-1.5 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
              <button
                type="button"
                onClick={() => onRemoveItem(index)}
                className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
