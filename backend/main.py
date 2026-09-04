import uuid
import socket
import asyncio
from pathlib import Path
from typing import Optional, List
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from downloader import (
    extract_video_info,
    extract_subtitles_file,
    generate_compressed_preview,
    process_download_job,
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
