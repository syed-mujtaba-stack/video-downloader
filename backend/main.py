import uuid
import socket
import asyncio
from pathlib import Path
from typing import Optional, List
from contextlib import asynccontextmanager

try:
    import importlib.util
    if importlib.util.find_spec("static_ffmpeg") is not None:
        importlib.import_module("static_ffmpeg").add_paths()  # type: ignore
except Exception:
    pass

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from downloader import (
    extract_video_info,
    extract_subtitles_file,
    generate_compressed_preview,
    process_download_job,
    process_studio_export_job,
    cleanup_old_files,
    JOBS,
    DOWNLOADS_DIR,
    PREVIEWS_DIR,
)


def get_local_ip() -> str:
    """Detect the host machine's LAN IP for local network mobile downloads."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


async def periodic_cleanup_task():
    """Periodic task running every 30 minutes to purge files older than 1 hour."""
    while True:
        try:
            cleanup_old_files(max_age_seconds=3600)
        except Exception:
            pass
        await asyncio.sleep(1800)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: trigger initial cleanup and start background cleaner loop
    cleanup_old_files(max_age_seconds=3600)
    cleaner_task = asyncio.create_task(periodic_cleanup_task())
    yield
    # Shutdown: cancel task
    cleaner_task.cancel()


app = FastAPI(
    title="Universal Video Downloader & Compressor API",
    description="100% Free Full-Stack Video Downloader with FFmpeg Trimming & Compression",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VideoInfoRequest(BaseModel):
    url: str


class SubtitlesRequest(BaseModel):
    url: str
    lang: str = "en"


class DownloadRequest(BaseModel):
    url: str
    title: str = "video"
    quality: str = "720p"  # 1080p, 720p, 480p, 360p
    compression: str = "balanced"  # original, balanced, ultra
    format_type: str = "mp4"  # mp4, mp3
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    audio_bitrate: str = "192k"  # 128k, 192k, 320k


class StudioExportRequest(BaseModel):
    url: str
    title: str = "video"
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    aspect_ratio: str = "original"  # "16:9", "9:16", "1:1", "original"
    speed: float = 1.0  # 0.5, 0.75, 1.0, 1.25, 1.5, 2.0
    filter_preset: str = "none"  # "none", "cinematic", "vintage", "bw", "cyberpunk", "warm"
    volume: float = 1.0  # 0.0 to 2.0
    text_overlay: Optional[str] = None
    quality: str = "1080p"


class AIDirectorRequest(BaseModel):
    prompt: str
    title: str = "Video"
    duration: float = 60.0
    platform: Optional[str] = None



@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Universal Video Downloader & Compressor API",
        "version": "2.0.0",
        "local_ip": get_local_ip(),
    }


@app.get("/api/network-info")
def get_network_info():
    """
    Returns the host's LAN IP address so frontend can construct QR codes for mobile devices.
    """
    local_ip = get_local_ip()
    return {
        "local_ip": local_ip,
        "backend_url": f"http://{local_ip}:8000",
        "frontend_url": f"http://{local_ip}:3000",
    }


@app.post("/api/info")
async def get_video_info(payload: VideoInfoRequest):
    """
    Extract video metadata, resolutions, and available subtitles using yt-dlp.
    """
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    try:
        info = await asyncio.to_thread(extract_video_info, url)
        return {"success": True, "data": info}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/preview")
async def generate_preview(payload: VideoInfoRequest):
    """
    Generate or retrieve a compressed preview clip for fast in-browser playback.
    """
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    try:
        preview_filename = await asyncio.to_thread(generate_compressed_preview, url)
        return {
            "success": True,
            "preview_url": f"/api/previews/{preview_filename}",
            "filename": preview_filename,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {str(e)}")


@app.get("/api/previews/{filename}")
async def serve_preview(filename: str):
    file_path = PREVIEWS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Preview file not found")
    return FileResponse(file_path, media_type="video/mp4")


@app.post("/api/subtitles")
async def download_subtitles(payload: SubtitlesRequest):
    """
    Download subtitles in SRT format for a given video.
    """
    try:
        sub_filename = await asyncio.to_thread(extract_subtitles_file, payload.url, payload.lang)
        return {
            "success": True,
            "filename": sub_filename,
            "download_url": f"/api/download/file/{sub_filename}",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Subtitles not found: {str(e)}")


@app.post("/api/download/start")
async def start_download(payload: DownloadRequest, background_tasks: BackgroundTasks):
    """
    Trigger download, FFmpeg trimming & compression in background.
    """
    task_id = str(uuid.uuid4())

    background_tasks.add_task(
        process_download_job,
        task_id=task_id,
        url=payload.url,
        title=payload.title,
        format_type=payload.format_type,
        quality=payload.quality,
        compression=payload.compression,
        start_time=payload.start_time,
        end_time=payload.end_time,
        audio_bitrate=payload.audio_bitrate,
    )

    return {"success": True, "task_id": task_id}


@app.post("/api/editor/export")
async def export_studio_video(payload: StudioExportRequest, background_tasks: BackgroundTasks):
    """
    CapCut Studio Export Endpoint:
    Triggers background rendering with trimming, aspect ratio transformation, filters, and speed.
    """
    task_id = str(uuid.uuid4())

    background_tasks.add_task(
        process_studio_export_job,
        task_id=task_id,
        url=payload.url,
        title=payload.title,
        start_time=payload.start_time,
        end_time=payload.end_time,
        aspect_ratio=payload.aspect_ratio,
        speed=payload.speed,
        filter_preset=payload.filter_preset,
        volume=payload.volume,
        text_overlay=payload.text_overlay,
        quality=payload.quality,
    )

    return {"success": True, "task_id": task_id}


@app.post("/api/ai/director")
async def ai_director_plan(payload: AIDirectorRequest):
    """
    Agentic AI Director:
    Autonomously plans video editing directives, aspect ratios, trim segments,
    aesthetic color grading, speed ramps, and high-CTR viral text hooks.
    """
    import re

    p = payload.prompt.lower().strip()
    dur = max(5.0, payload.duration)
    title = payload.title.strip()

    # 1. Determine Target Aspect Ratio
    aspect = "9:16"
    if any(k in p for k in ["youtube", "widescreen", "16:9", "landscape", "tv", "desktop"]):
        aspect = "16:9"
    elif any(k in p for k in ["square", "1:1", "post", "feed", "linkedin"]):
        aspect = "1:1"
    elif any(k in p for k in ["tiktok", "reel", "shorts", "vertical", "9:16", "story", "status"]):
        aspect = "9:16"

    # 2. Determine Precision Trim Range
    sec_match = re.search(r"(\d+)\s*(?:s|sec|seconds)", p)
    target_dur = float(sec_match.group(1)) if sec_match else 30.0
    target_dur = max(5.0, min(target_dur, dur))

    if any(k in p for k in ["highlight", "viral", "climax", "best part", "middle"]):
        if dur > target_dur:
            midpoint = dur * 0.4
            start = round(max(0.0, midpoint), 1)
            end = round(min(dur, start + target_dur), 1)
        else:
            start = 0.0
            end = round(dur, 1)
    elif any(k in p for k in ["ending", "conclusion", "outro"]):
        start = round(max(0.0, dur - target_dur), 1)
        end = round(dur, 1)
    elif any(k in p for k in ["first", "intro", "start", "hook", "whatsapp"]):
        start = 0.0
        end = round(min(dur, target_dur), 1)
    else:
        if dur <= 35:
            start = 0.0
            end = round(dur, 1)
        elif dur <= 90:
            start = round(dur * 0.15, 1)
            end = round(min(dur, start + target_dur), 1)
        else:
            start = round(dur * 0.25, 1)
            end = round(min(dur, start + target_dur), 1)

    # 3. Determine Color Grading Filter
    filt = "none"
    if any(k in p for k in ["cinema", "cinematic", "movie", "film", "dramatic"]):
        filt = "cinematic"
    elif any(k in p for k in ["vintage", "retro", "90s", "old", "sepia", "nostalgia"]):
        filt = "vintage"
    elif any(k in p for k in ["bw", "black and white", "noir", "monochrome"]):
        filt = "bw"
    elif any(k in p for k in ["cyberpunk", "neon", "futuristic", "techno", "sci-fi"]):
        filt = "cyberpunk"
    elif any(k in p for k in ["warm", "sunset", "cozy", "golden", "summer"]):
        filt = "warm"
    else:
        filt = "cinematic" if aspect == "9:16" else "none"

    # 4. Determine Speed Ramping
    speed = 1.0
    if any(k in p for k in ["fast", "speed up", "timelapse", "recap", "quick"]):
        speed = 1.25
    elif any(k in p for k in ["slow", "slowmo", "dramatic slow"]):
        speed = 0.75

    # 5. Generate Attention-Grabbing Hook / Overlay Text
    clean_kw = re.sub(r"[^a-zA-Z0-9\s]", "", title).split()
    short_kw = " ".join(clean_kw[:4]).upper() if clean_kw else "WATCH THIS"

    if any(k in p for k in ["funny", "comedy", "laugh"]):
        hook = "BRO DID NOT EXPECT THIS 😂"
    elif any(k in p for k in ["mind blowing", "insane", "crazy", "wow"]):
        hook = "WAIT FOR THE END... 🤯"
    elif any(k in p for k in ["tip", "learn", "how to", "tutorial", "insight"]):
        hook = "SAVE THIS KEY TIP 💡"
    elif any(k in p for k in ["story", "secret", "truth"]):
        hook = "THE TRUTH NOBODY TELLS YOU 👇"
    else:
        hook = f"{short_kw} 🔥"

    format_desc = "Vertical 9:16 Reel" if aspect == "9:16" else "Landscape 16:9" if aspect == "16:9" else "Square 1:1"
    rationale = (
        f"Autonomous AI Plan: Formatted to {format_desc}, trimmed from {start}s to {end}s ({round(end-start)}s), "
        f"applied '{filt}' color grading, {speed}x speed, and high-CTR headline overlay."
    )

    return {
        "success": True,
        "plan_title": f"AI Directed {aspect} Edit",
        "rationale": rationale,
        "aspect_ratio": aspect,
        "trim_range": [start, end],
        "filter_preset": filt,
        "speed": speed,
        "text_overlay": hook,
        "text_position": "bottom",
        "suggested_caption": f"Check this out! {hook} #viral #shorts #trending",
        "hashtags": ["#viral", "#reels", "#trending", "#fyp", "#videoedit"],
    }



@app.get("/api/download/progress/{task_id}")
async def get_download_progress(task_id: str):
    job = JOBS.get(task_id)
    if not job:
        raise HTTPException(status_code=404, detail="Download task not found")
    return {"success": True, "job": job}


@app.get("/api/download/file/{filename}")
async def download_file(filename: str):
    file_path = DOWNLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Requested download file not found")

    if filename.endswith(".mp3"):
        media_type = "audio/mpeg"
    elif filename.endswith(".srt"):
        media_type = "text/plain"
    else:
        media_type = "video/mp4"

    return FileResponse(
        file_path,
        media_type=media_type,
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
