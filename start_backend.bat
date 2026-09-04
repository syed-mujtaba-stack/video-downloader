@echo off
title Video Downloader - Backend (FastAPI)
echo ========================================================
echo Starting FastAPI Backend with yt-dlp and FFmpeg...
echo ========================================================
cd /d "%~dp0backend"
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
    python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
) else (
    uv run uvicorn main:app --host 127.0.0.1 --port 8000 --reload
)
pause
