@echo off
title Video Downloader & Compressor Launcher
echo ========================================================
echo Launching Full-Stack Video Downloader & Compressor
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo ========================================================

start "Backend Server" cmd /k "%~dp0start_backend.bat"
timeout /t 2 /nobreak >nul
start "Frontend Server" cmd /k "%~dp0start_frontend.bat"

echo.
echo Both servers started!
echo Frontend will be accessible at http://localhost:3000
echo.
