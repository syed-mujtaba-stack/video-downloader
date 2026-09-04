# ⚡ ClipCompress - Universal Video Downloader & Compressor

A modern, 100% free, full-stack video downloader and compressor with integrated **video trimming**, **mobile QR code transfer**, and **high-fidelity audio extraction**. Paste any video link from **YouTube, Instagram, TikTok, Facebook, Twitter/X, Reddit, Pinterest, Vimeo**, and 1,000+ platforms.

---

## 🌟 Key Features

- **100% Free Open-Source Stack**: Zero paid APIs, no monthly subscriptions, zero limits.
- **✂️ Video Clip Trimmer**: Choose custom start and end times via an interactive range slider to download only the necessary clip without wasting time or storage.
- **📱 Scan QR Code to Download on Mobile**: Instantly generate a local Wi-Fi QR code. Scan with any smartphone camera to download the file directly to your phone.
- **⚡ FFmpeg-Powered Compression Presets**:
  - 🚀 **Balanced**: ~50-60% size reduction with crisp visual fidelity (H.264 CRF 28).
  - ⚡ **Ultra Compressed**: ~75-80% size reduction for instant sharing on WhatsApp, Discord, or low-storage devices.
  - 💎 **Original Quality**: Maximum uncompressed source bitrate.
- **🎵 High-Fidelity Audio & Subtitles**:
  - Extract MP3 audio at **320 kbps (Studio Quality)**, **192 kbps**, or **128 kbps**.
  - One-click subtitle (`.srt`) track extraction.
- **🧹 Automated Disk Cleanup**: Background maintenance loop that purges temporary downloads and preview files older than 1 hour to protect disk space.
- **Universal Platform Support**: Powered by `yt-dlp` to extract videos from over 1,000 sites.
- **Real-Time Progress Tracking**: Live download & compression progress bar, speed, and ETA.
- **Download History**: Stores recent downloads in browser `localStorage` for instant re-access.

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, `qrcode.react`.
- **Backend**: FastAPI (Python), Uvicorn, yt-dlp, asyncio.
- **Encoding Engine**: FFmpeg (H.264 video, AAC, and MP3 audio).

---

## 🚀 Quick Start Guide

### Prerequisites
- [Python 3.12+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)
- [FFmpeg](https://ffmpeg.org/) installed and available in system PATH

### One-Click Launch (Windows)
Double-click `start_all.bat` to launch both servers simultaneously!

### Manual Setup

#### 1. Backend Setup
```bash
cd backend
# Create virtual environment & install dependencies
uv sync # or: python -m venv .venv && .\.venv\Scripts\activate && pip install fastapi uvicorn yt-dlp aiofiles python-multipart

# Start FastAPI server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation: `http://127.0.0.1:8000/docs`

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open application: `http://localhost:3000`

---

## 📜 License
This project is licensed under the MIT License.
