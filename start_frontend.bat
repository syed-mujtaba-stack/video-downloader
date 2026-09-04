@echo off
title Video Downloader - Frontend (Next.js)
echo ========================================================
echo Starting Next.js Frontend Server on http://localhost:3000
echo ========================================================
cd /d "%~dp0frontend"
npm run dev
pause
