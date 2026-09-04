import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClipCompress — Free Video Downloader & Editor",
  description:
    "Download, compress, trim, and edit videos from YouTube, TikTok, Instagram, Twitter/X and 1000+ platforms. 100% free, powered by FFmpeg.",
  keywords: ["video downloader", "yt-dlp", "FFmpeg", "compress video", "free"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
