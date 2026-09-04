# ⚡ ClipCompress - Universal Video Downloader & Compressor

A modern, 100% free, full-stack video downloader and compressor. Paste any video link from **YouTube, Instagram, TikTok, Facebook, Twitter/X, Reddit, Pinterest, Vimeo**, and 1,000+ platforms to preview compressed videos and download them in customizable quality presets.

---

## 🌟 Key Features

- **100% Free Open-Source Stack**: No paid APIs, no monthly subscriptions, zero limits.
- **Fast Compressed Video Preview**: Generates an in-browser compressed preview clip so users can verify the video before full download without bandwidth waste.
- **FFmpeg-Powered Compression Presets**:
  - 🚀 **Balanced**: ~50-60% size reduction with crisp visual fidelity (H.264 CRF 28).
  - ⚡ **Ultra Compressed**: ~75-80% size reduction for quick sharing on WhatsApp / low-storage devices.
  - 💎 **Original Quality**: Maximum uncompressed source bitrate.
  - 🎵 **Audio Extraction (MP3)**: Extract pure 192kbps audio tracks.
- **Universal Platform Support**: Powered by `yt-dlp` to extract videos from over 1,000 sites.
- **Real-Time Progress Tracking**: Live download & compression progress bar, speed, and ETA.
- **Download History**: Stores recent downloads in browser `localStorage` for instant re-access.

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Backend**: FastAPI (Python), Uvicorn, yt-dlp, asyncio.
- **Encoding Engine**: FFmpeg (H.264 video & AAC/MP3 audio).

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
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
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
