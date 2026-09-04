import os
import re
import time
import asyncio
import hashlib
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List
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


def cleanup_old_files(max_age_seconds: int = 3600):
    """
    Purge files in downloads and previews directories older than max_age_seconds (default 1 hour).
    Protects .gitkeep files.
    """
    now = time.time()
    for folder in [DOWNLOADS_DIR, PREVIEWS_DIR]:
        for file in folder.iterdir():
            if file.is_file() and file.name != ".gitkeep":
                try:
                    if now - file.stat().st_mtime > max_age_seconds:
                        file.unlink()
                except Exception:
                    pass


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

        order = ["1080p", "720p", "480p", "360p"]
        available_resolutions = [r for r in order if r in resolutions_set]
        if not available_resolutions:
            available_resolutions = ["720p", "480p", "360p"]

        extractor = (info.get("extractor_key") or info.get("extractor") or "Generic").title()

        # Check for subtitles
        subtitles_dict = info.get("subtitles") or info.get("automatic_captions") or {}
        available_subtitles = list(subtitles_dict.keys())[:10]  # top 10 languages

        # Check for direct lightweight video url for preview
        direct_preview_url = None
        for f in formats:
            if f.get("ext") == "mp4" and f.get("vcodec") != "none" and f.get("url"):
                if f.get("acodec") != "none" or "googlevideo" not in f.get("url", ""):
                    direct_preview_url = f.get("url")
                    break

        return {
            "id": info.get("id"),
            "title": info.get("title", "Untitled Video"),
            "description": (info.get("description") or "")[:200],
            "thumbnail": info.get("thumbnail"),
            "duration": int(info.get("duration") or 0),
            "uploader": info.get("uploader") or info.get("channel") or "Unknown Creator",
            "view_count": info.get("view_count"),
            "platform": extractor,
            "webpage_url": info.get("webpage_url", url),
            "available_resolutions": available_resolutions,
            "has_audio": has_audio,
            "direct_preview_url": direct_preview_url,
            "available_subtitles": available_subtitles,
        }


def extract_subtitles_file(url: str, lang: str = "en") -> str:
    """
    Downloads subtitle track in SRT format and returns filename in DOWNLOADS_DIR.
    """
    url_hash = hashlib.md5(f"{url}_{lang}".encode()).hexdigest()[:8]
    sub_base = DOWNLOADS_DIR / f"sub_{url_hash}"

    ydl_opts = {
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": [lang],
        "subtitlesformat": "srt",
        "outtmpl": str(sub_base),
        "quiet": True,
        "no_warnings": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    # Look for downloaded subtitle file
    matching = list(DOWNLOADS_DIR.glob(f"sub_{url_hash}.*"))
    if not matching:
        raise FileNotFoundError(f"No subtitle track found for language: {lang}")

    return matching[0].name


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

    ydl_opts = {
        "format": "bestvideo[height<=480]+bestaudio/best[height<=480]/worst",
        "outtmpl": str(temp_raw),
        "quiet": True,
        "no_warnings": True,
        "overwrites": True,
        "download_ranges": yt_dlp.utils.download_range_func(None, [(0, 45)]),
        "force_keyframes_at_cuts": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        if not temp_raw.exists():
            ydl_opts_fallback = {
                "format": "worst/worstvideo+worstaudio",
                "outtmpl": str(temp_raw),
                "quiet": True,
                "no_warnings": True,
                "overwrites": True,
            }
            with yt_dlp.YoutubeDL(ydl_opts_fallback) as ydl2:
                ydl2.download([url])

        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(temp_raw),
            "-t",
            "45",
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
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
    audio_bitrate: str = "192k",
):
    """
    Background worker that downloads video, applies video trimming if requested,
    and compresses using FFmpeg.
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
    trim_tag = f"_trim_{int(start_time or 0)}s_{int(end_time or 0)}s" if (start_time or end_time) else ""
    url_hash = hashlib.md5(f"{url}_{quality}_{compression}_{format_type}_{audio_bitrate}{trim_tag}".encode()).hexdigest()[:8]
    ext = "mp3" if format_type == "mp3" else "mp4"
    final_filename = f"{clean_title}_{quality}_{compression}{trim_tag}_{url_hash}.{ext}"
    final_output_path = DOWNLOADS_DIR / final_filename

    # If already downloaded, mark completed immediately
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
                percent = int((downloaded / total_bytes) * 60)
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
                "speed": "Download complete. Preparing compression & trim...",
                "status": "compressing",
            })

    # Download format selector
    if format_type == "mp3":
        ydl_format = "bestaudio/best"
    else:
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

        matching_files = list(DOWNLOADS_DIR.glob(f"raw_{task_id}.*"))
        if not matching_files:
            raise FileNotFoundError("Downloaded source file could not be found.")

        raw_file = matching_files[0]

        JOBS[task_id].update({
            "status": "compressing",
            "progress": 70,
            "speed": "Compressing & trimming with FFmpeg...",
            "eta": "Almost ready...",
        })

        # Base FFmpeg command with input
        cmd = ["ffmpeg", "-y", "-i", str(raw_file)]

        # Video Trimming arguments (applied after input for accurate keyframe seek)
        if start_time is not None and start_time > 0:
            cmd.extend(["-ss", str(start_time)])
        if end_time is not None and end_time > (start_time or 0):
            cmd.extend(["-to", str(end_time)])

        # Audio vs Video encoding
        if format_type == "mp3":
            cmd.extend([
                "-vn",
                "-c:a",
                "libmp3lame",
                "-b:a",
                audio_bitrate or "192k",
                str(final_output_path),
            ])
        elif compression == "ultra":
            cmd.extend([
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
            ])
        elif compression == "balanced":
            cmd.extend([
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
            ])
        else:  # Original
            cmd.extend([
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
            ])

        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Cleanup raw downloaded file
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


def process_studio_export_job(
    task_id: str,
    url: str,
    title: str,
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
    aspect_ratio: str = "original",
    speed: float = 1.0,
    filter_preset: str = "none",
    volume: float = 1.0,
    text_overlay: Optional[str] = None,
    quality: str = "1080p",
):
    """
    CapCut Studio Export Worker:
    Downloads source video, applies trimming, speed ramping, aspect ratio conversion (9:16, 16:9, 1:1),
    color filters, audio amplification, and compresses using FFmpeg.
    """
    JOBS[task_id] = {
        "status": "downloading",
        "progress": 0,
        "speed": "Starting Studio Render...",
        "eta": "Calculating...",
        "filename": None,
        "file_size": None,
        "error": None,
    }

    clean_title = sanitize_filename(title)
    url_hash = hashlib.md5(
        f"{url}_{start_time}_{end_time}_{aspect_ratio}_{speed}_{filter_preset}_{volume}_{text_overlay}".encode()
    ).hexdigest()[:8]
    final_filename = f"{clean_title}_CapCut_{aspect_ratio.replace(':', 'x')}_{url_hash}.mp4"
    final_output_path = DOWNLOADS_DIR / final_filename

    if final_output_path.exists() and final_output_path.stat().st_size > 5000:
        JOBS[task_id].update({
            "status": "completed",
            "progress": 100,
            "filename": final_filename,
            "file_size": f"{final_output_path.stat().st_size / (1024 * 1024):.1f} MB",
        })
        return

    raw_temp = DOWNLOADS_DIR / f"raw_studio_{task_id}.%(ext)s"

    def progress_hook(d):
        if d["status"] == "downloading":
            total_bytes = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            downloaded = d.get("downloaded_bytes") or 0
            percent = int((downloaded / total_bytes) * 50) if total_bytes > 0 else 25
            JOBS[task_id].update({
                "progress": percent,
                "speed": d.get("_speed_str", "Downloading..."),
                "eta": d.get("_eta_str", ""),
                "status": "downloading",
            })
        elif d["status"] == "finished":
            JOBS[task_id].update({
                "progress": 55,
                "speed": "Download done. Rendering CapCut filters & effects...",
                "status": "compressing",
            })

    ydl_opts = {
        "format": "bestvideo+bestaudio/best",
        "outtmpl": str(raw_temp),
        "quiet": True,
        "no_warnings": True,
        "progress_hooks": [progress_hook],
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        matching_files = list(DOWNLOADS_DIR.glob(f"raw_studio_{task_id}.*"))
        if not matching_files:
            raise FileNotFoundError("Raw downloaded file could not be found.")
        raw_file = matching_files[0]

        JOBS[task_id].update({
            "status": "compressing",
            "progress": 65,
            "speed": "Encoding filters, aspect ratio & speed...",
            "eta": "Rendering in progress...",
        })

        cmd = ["ffmpeg", "-y", "-i", str(raw_file)]

        # Precision Trimming
        if start_time is not None and start_time > 0:
            cmd.extend(["-ss", str(start_time)])
        if end_time is not None and end_time > (start_time or 0):
            cmd.extend(["-to", str(end_time)])

        # Build Video Filter Chain
        vf_chain = []

        # 1. Speed Adjustment
        if speed and speed != 1.0:
            vf_chain.append(f"setpts={1.0 / speed}*PTS")

        # 2. Aspect Ratio Transformation
        if aspect_ratio == "9:16":
            # Vertical format for TikTok / Reels / Shorts
            vf_chain.append("scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black")
        elif aspect_ratio == "16:9":
            vf_chain.append("scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black")
        elif aspect_ratio == "1:1":
            vf_chain.append("scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:black")

        # 3. Color Filter Presets
        if filter_preset == "cinematic":
            vf_chain.append("eq=contrast=1.2:brightness=0.02:saturation=1.15")
        elif filter_preset == "vintage":
            vf_chain.append("colorbalance=rs=.15:gs=-.05:bs=-.1,eq=contrast=1.1:saturation=0.85")
        elif filter_preset == "bw":
            vf_chain.append("hue=s=0")
        elif filter_preset == "cyberpunk":
            vf_chain.append("eq=contrast=1.35:saturation=1.55,hue=h=15")
        elif filter_preset == "warm":
            vf_chain.append("colorbalance=rs=.18:gs=.06:bs=-.12")

        if vf_chain:
            cmd.extend(["-vf", ",".join(vf_chain)])

        # Build Audio Filter Chain
        af_chain = []
        if speed and speed != 1.0:
            # atempo accepts 0.5 to 2.0
            safe_speed = max(0.5, min(2.0, speed))
            af_chain.append(f"atempo={safe_speed}")
        if volume and volume != 1.0:
            af_chain.append(f"volume={volume}")

        if af_chain:
            cmd.extend(["-af", ",".join(af_chain)])

        # Output encoding options
        cmd.extend([
            "-c:v", "libx264",
            "-crf", "24",
            "-preset", "fast",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            str(final_output_path),
        ])

        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        try:
            raw_file.unlink()
        except Exception:
            pass

        size_mb = final_output_path.stat().st_size / (1024 * 1024)
        JOBS[task_id].update({
            "status": "completed",
            "progress": 100,
            "speed": "Export Complete!",
            "eta": "Ready for download",
            "filename": final_filename,
            "file_size": f"{size_mb:.1f} MB",
        })

    except Exception as e:
        JOBS[task_id].update({
            "status": "failed",
            "error": str(e),
            "speed": "Studio export failed",
        })

