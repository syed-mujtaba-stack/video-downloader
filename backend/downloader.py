import os
import re
import asyncio
import hashlib
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional
import yt_dlp

BASE_DIR = Path(__file__).resolve().parent
DOWNLOADS_DIR = BASE_DIR / "downloads"
PREVIEWS_DIR = BASE_DIR / "previews"

DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)

# In-memory job store for download tasks
JOBS: Dict[str, Dict[str, Any]] = {}


def sanitize_filename(name: str) -> str:
    """Sanitize string for safe filenames across OS."""
    clean = re.sub(r'[\\/*?:"<>|]', "", name)
    return clean[:80].strip() or "video"


def extract_video_info(url: str) -> Dict[str, Any]:
    """
    Extract video metadata using yt-dlp without downloading full video.
    """
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
        "no_color": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        if not info:
            raise ValueError("Could not retrieve video information.")

        # Extract available video resolutions
        formats = info.get("formats", [])
        resolutions_set = set()
        has_audio = False

        for f in formats:
            height = f.get("height")
            vcodec = f.get("vcodec")
            acodec = f.get("acodec")
            if height and vcodec != "none":
                if height >= 1080:
                    resolutions_set.add("1080p")
                elif height >= 720:
                    resolutions_set.add("720p")
                elif height >= 480:
                    resolutions_set.add("480p")
                elif height >= 360:
                    resolutions_set.add("360p")
            if acodec and acodec != "none":
                has_audio = True

        # Sort resolutions high to low
        order = ["1080p", "720p", "480p", "360p"]
        available_resolutions = [r for r in order if r in resolutions_set]
        if not available_resolutions:
            available_resolutions = ["720p", "480p", "360p"]

        # Platform detection
        extractor = (info.get("extractor_key") or info.get("extractor") or "Generic").title()

        # Check for direct lightweight video url for preview (e.g., TikTok/Instagram/Twitter direct mp4)
        direct_preview_url = None
        for f in formats:
            # find an mp4 stream with both video and audio or progressive mp4
            if f.get("ext") == "mp4" and f.get("vcodec") != "none" and f.get("url"):
                if f.get("acodec") != "none" or "googlevideo" not in f.get("url", ""):
                    direct_preview_url = f.get("url")
                    break

        return {
            "id": info.get("id"),
            "title": info.get("title", "Untitled Video"),
            "description": (info.get("description") or "")[:200],
            "thumbnail": info.get("thumbnail"),
            "duration": info.get("duration", 0),
            "uploader": info.get("uploader") or info.get("channel") or "Unknown Creator",
            "view_count": info.get("view_count"),
            "platform": extractor,
            "webpage_url": info.get("webpage_url", url),
            "available_resolutions": available_resolutions,
            "has_audio": has_audio,
            "direct_preview_url": direct_preview_url,
        }


def generate_compressed_preview(url: str) -> str:
    """
    Downloads a lightweight version or short clip of the video and compresses it with FFmpeg.
    Returns the relative filename of the preview MP4.
    """
    url_hash = hashlib.md5(url.encode()).hexdigest()[:12]
    preview_filename = f"preview_{url_hash}.mp4"
    output_path = PREVIEWS_DIR / preview_filename

    # If already cached, return immediately
    if output_path.exists() and output_path.stat().st_size > 10000:
        return preview_filename

    temp_raw = PREVIEWS_DIR / f"temp_{url_hash}.mp4"

    # yt-dlp download low-res format or first 60 seconds
    ydl_opts = {
        "format": "bestvideo[height<=480]+bestaudio/best[height<=480]/worst",
        "outtmpl": str(temp_raw),
        "quiet": True,
        "no_warnings": True,
        "overwrites": True,
        # Download at most first 45 seconds for rapid preview generation
        "download_ranges": yt_dlp.utils.download_range_func(None, [(0, 45)]),
        "force_keyframes_at_cuts": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        if not temp_raw.exists():
            # Fallback without range if range download is not supported by extractor
            ydl_opts_fallback = {
                "format": "worst/worstvideo+worstaudio",
                "outtmpl": str(temp_raw),
                "quiet": True,
                "no_warnings": True,
                "overwrites": True,
            }
            with yt_dlp.YoutubeDL(ydl_opts_fallback) as ydl2:
                ydl2.download([url])

        # Run FFmpeg to strongly compress preview (CRF 32, scale to max height 480, fast preset)
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(temp_raw),
            "-t",
            "45",  # max 45 seconds preview
            "-vf",
            "scale=-2:'min(480,ih)'",
            "-c:v",
            "libx264",
            "-crf",
            "30",
            "-preset",
            "veryfast",
            "-c:a",
            "aac",
            "-b:a",
            "96k",
            "-movflags",
            "+faststart",
            str(output_path),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        return preview_filename
    except Exception as e:
        # If preview compression fails, attempt simple copy or pass
        if temp_raw.exists() and not output_path.exists():
            try:
                temp_raw.rename(output_path)
                return preview_filename
            except Exception:
                pass
        raise RuntimeError(f"Preview generation failed: {str(e)}")
    finally:
        if temp_raw.exists():
            try:
                temp_raw.unlink()
            except Exception:
                pass


def process_download_job(
    task_id: str,
    url: str,
    title: str,
    format_type: str,
    quality: str,
    compression: str,
):
    """
    Background worker that downloads video and compresses it using FFmpeg.
    """
    JOBS[task_id] = {
        "status": "downloading",
        "progress": 0,
        "speed": "Starting...",
        "eta": "Calculating...",
        "filename": None,
        "file_size": None,
        "error": None,
    }

    clean_title = sanitize_filename(title)
    url_hash = hashlib.md5(f"{url}_{quality}_{compression}_{format_type}".encode()).hexdigest()[:8]
    ext = "mp3" if format_type == "mp3" else "mp4"
    final_filename = f"{clean_title}_{quality}_{compression}_{url_hash}.{ext}"
    final_output_path = DOWNLOADS_DIR / final_filename

    # If already downloaded, mark completed right away!
    if final_output_path.exists() and final_output_path.stat().st_size > 5000:
        JOBS[task_id].update({
            "status": "completed",
            "progress": 100,
            "filename": final_filename,
            "file_size": f"{final_output_path.stat().st_size / (1024 * 1024):.1f} MB",
        })
        return

    raw_temp = DOWNLOADS_DIR / f"raw_{task_id}.%(ext)s"

    def progress_hook(d):
        if d["status"] == "downloading":
            total_bytes = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            downloaded = d.get("downloaded_bytes") or 0
            if total_bytes > 0:
                percent = int((downloaded / total_bytes) * 60)  # 0% - 60% is download
            else:
                percent = 30
            speed = d.get("_speed_str", "Downloading...")
            eta = d.get("_eta_str", "")

            JOBS[task_id].update({
                "progress": percent,
                "speed": speed,
                "eta": f"ETA: {eta}" if eta else "",
                "status": "downloading",
            })
        elif d["status"] == "finished":
            JOBS[task_id].update({
                "progress": 65,
                "speed": "Download complete. Preparing compression...",
                "status": "compressing",
            })

    # Format selector for yt-dlp
    if format_type == "mp3":
        ydl_format = "bestaudio/best"
    else:
        # Select target resolution
        max_h = 1080
        if quality == "720p":
            max_h = 720
        elif quality == "480p":
            max_h = 480
        elif quality == "360p":
            max_h = 360

        ydl_format = f"bestvideo[height<={max_h}]+bestaudio/best[height<={max_h}]/best"

    ydl_opts = {
        "format": ydl_format,
        "outtmpl": str(raw_temp),
        "quiet": True,
        "no_warnings": True,
        "progress_hooks": [progress_hook],
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Find the actual raw downloaded file (extension could be mkv, webm, mp4, etc.)
        matching_files = list(DOWNLOADS_DIR.glob(f"raw_{task_id}.*"))
        if not matching_files:
            raise FileNotFoundError("Downloaded source file could not be found.")

        raw_file = matching_files[0]

        JOBS[task_id].update({
            "status": "compressing",
            "progress": 70,
            "speed": "Compressing with FFmpeg...",
            "eta": "Almost ready...",
        })

        # Run FFmpeg compression according to selected compression preset
        if format_type == "mp3":
            # Extract high quality MP3
            cmd = [
                "ffmpeg",
                "-y",
                "-i",
                str(raw_file),
                "-vn",
                "-c:a",
                "libmp3lame",
                "-b:a",
                "192k",
                str(final_output_path),
            ]
        elif compression == "ultra":
            # Ultra compression: CRF 32, max 480p scale, audio 96k
            cmd = [
                "ffmpeg",
                "-y",
                "-i",
                str(raw_file),
                "-vf",
                "scale=-2:'min(480,ih)'",
                "-c:v",
                "libx264",
                "-crf",
                "32",
                "-preset",
                "fast",
                "-c:a",
                "aac",
                "-b:a",
                "96k",
                "-movflags",
                "+faststart",
                str(final_output_path),
            ]
        elif compression == "balanced":
            # Balanced compression: CRF 28 (~50% size reduction with high visual quality)
            cmd = [
                "ffmpeg",
                "-y",
                "-i",
                str(raw_file),
                "-c:v",
                "libx264",
                "-crf",
                "28",
                "-preset",
                "fast",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-movflags",
                "+faststart",
                str(final_output_path),
            ]
        else:
            # Original quality (standard remux to MP4)
            cmd = [
                "ffmpeg",
                "-y",
                "-i",
                str(raw_file),
                "-c:v",
                "libx264",
                "-crf",
                "22",
                "-preset",
                "fast",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-movflags",
                "+faststart",
                str(final_output_path),
            ]

        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Cleanup raw file
        try:
            raw_file.unlink()
        except Exception:
            pass

        size_mb = final_output_path.stat().st_size / (1024 * 1024)
        JOBS[task_id].update({
            "status": "completed",
            "progress": 100,
            "speed": "Complete",
            "eta": "Ready for download",
            "filename": final_filename,
            "file_size": f"{size_mb:.1f} MB",
        })

    except Exception as e:
        JOBS[task_id].update({
            "status": "failed",
            "error": str(e),
            "speed": "Error occurred",
        })
