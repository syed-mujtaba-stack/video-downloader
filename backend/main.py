import uuid
import asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, HttpUrl
from typing import Optional

from downloader import (
    extract_video_info,
    generate_compressed_preview,
    process_download_job,
    JOBS,
    DOWNLOADS_DIR,
    PREVIEWS_DIR,
)

app = FastAPI(
    title="Universal Video Downloader & Compressor API",
    description="100% Free Full-Stack Video Downloader with Video Compression",
    version="1.0.0",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VideoInfoRequest(BaseModel):
    url: str


class DownloadRequest(BaseModel):
    url: str
    title: str = "video"
    quality: str = "720p"  # 1080p, 720p, 480p, 360p
    compression: str = "balanced"  # original, balanced, ultra
    format_type: str = "mp4"  # mp4, mp3


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Universal Video Downloader & Compressor API",
        "version": "1.0.0",
    }


@app.post("/api/info")
async def get_video_info(payload: VideoInfoRequest):
    """
    Extract video metadata (title, author, duration, thumbnail, resolutions) using yt-dlp.
    """
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    try:
        # Run blocking yt-dlp call in threadpool
        info = await asyncio.to_thread(extract_video_info, url)
        return {"success": True, "data": info}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/preview")
async def generate_preview(payload: VideoInfoRequest):
    """
    Generate or retrieve a compressed preview clip for smooth in-browser playback.
    """
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    try:
        # Generate compressed preview in threadpool
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
    """
    Stream the compressed preview video to the browser.
    """
    file_path = PREVIEWS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Preview file not found")
    return FileResponse(file_path, media_type="video/mp4")


@app.post("/api/download/start")
async def start_download(payload: DownloadRequest, background_tasks: BackgroundTasks):
    """
    Trigger download & FFmpeg compression in background. Returns task_id for progress polling.
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
    )

    return {"success": True, "task_id": task_id}


@app.get("/api/download/progress/{task_id}")
async def get_download_progress(task_id: str):
    """
    Check the current status and progress of a download/compression job.
    """
    job = JOBS.get(task_id)
    if not job:
        raise HTTPException(status_code=404, detail="Download task not found")
    return {"success": True, "job": job}


@app.get("/api/download/file/{filename}")
async def download_file(filename: str):
    """
    Directly serve the processed and compressed file as a downloadable attachment.
    """
    file_path = DOWNLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Requested download file not found")

    media_type = "audio/mpeg" if filename.endswith(".mp3") else "video/mp4"
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
