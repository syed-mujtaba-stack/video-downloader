"use client";

import React from "react";
import { Scissors, RotateCcw, Clock } from "lucide-react";

interface VideoTrimmerProps {
  duration: number; // in seconds
  startTime: number;
  endTime: number;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
  onReset: () => void;
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const VideoTrimmer: React.FC<VideoTrimmerProps> = ({
  duration,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onReset,
  isEnabled,
  onToggle,
}) => {
  const formatTime = (seconds: number) => {
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const clipDuration = Math.max(0, endTime - startTime);

  if (!duration || duration <= 5) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-black flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="w-4 h-4 rounded text-black accent-black bg-white border-neutral-300 focus:ring-black"
          />
          <Scissors className="w-3.5 h-3.5 text-black" />
          <span>Trim Video Clip</span>
          {isEnabled && (
            <span className="text-[10px] font-bold text-black bg-neutral-200 px-2 py-0.5 rounded-full border border-neutral-300">
              Clip: {formatTime(clipDuration)}
            </span>
          )}
        </label>

        {isEnabled && (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] text-neutral-400 hover:text-black flex items-center gap-1 transition-colors font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Full
          </button>
        )}
      </div>

      {isEnabled && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          {/* Visual Slider */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Time Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-neutral-500">
                <span>Start:</span>
                <span className="font-mono text-black font-bold">{formatTime(startTime)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, endTime - 1)}
                value={startTime}
                onChange={(e) => onStartTimeChange(Number(e.target.value))}
                className="w-full accent-black h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* End Time Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-neutral-500">
                <span>End:</span>
                <span className="font-mono text-black font-bold">{formatTime(endTime)}</span>
              </div>
              <input
                type="range"
                min={startTime + 1}
                max={duration}
                value={endTime}
                onChange={(e) => onEndTimeChange(Number(e.target.value))}
                className="w-full accent-black h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Trim Shortcuts */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-neutral-400">Quick:</span>
            {duration >= 30 && (
              <button
                type="button"
                onClick={() => {
                  onStartTimeChange(0);
                  onEndTimeChange(30);
                }}
                className="px-2.5 py-1 rounded-md bg-white border border-neutral-200 hover:bg-neutral-100 text-[11px] text-neutral-800 font-medium transition-colors shadow-2xs"
              >
                First 30s (WhatsApp)
              </button>
            )}
            {duration >= 60 && (
              <button
                type="button"
                onClick={() => {
                  onStartTimeChange(0);
                  onEndTimeChange(60);
                }}
                className="px-2.5 py-1 rounded-md bg-white border border-neutral-200 hover:bg-neutral-100 text-[11px] text-neutral-800 font-medium transition-colors shadow-2xs"
              >
                First 60s (Reels/Shorts)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
