"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Smartphone, Copy, Check, Wifi, ExternalLink } from "lucide-react";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  downloadUrl: string;
  filename: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  downloadUrl,
  filename,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-white border border-neutral-200 p-6 shadow-2xl space-y-5 text-center">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mx-auto mb-2 shadow-md">
            <Smartphone className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-black" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Scan to Download on Phone
          </h3>
          <p className="text-xs text-neutral-500">
            Scan this QR code using your phone camera to start the download directly.
          </p>
        </div>

        {/* QR Code Canvas */}
        <div className="p-4 bg-neutral-50 rounded-2xl inline-block shadow-inner mx-auto border border-neutral-200">
          <QRCodeSVG
            value={downloadUrl}
            size={190}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Wi-Fi Note */}
        <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs flex items-center gap-2 text-left">
          <Wifi className="w-4 h-4 text-black shrink-0" />
          <span>Make sure your phone is connected to the same Wi-Fi network.</span>
        </div>

        {/* Direct Link Copy */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            readOnly
            value={downloadUrl}
            className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 font-mono truncate focus:outline-none focus:border-black"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
