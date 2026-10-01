@echo off
title Canteen IAS Management System - Live Server Launcher
color 0A

echo ===============================================================================
echo                 CANTEEN IAS RESTAURANT SYSTEM - LIVE LAUNCHER
echo ===============================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo [1/5] Freeing up Port 5001 (Backend) and Port 8081 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5001" ^| findstr /i "listening"') do (
    if "%%a" neq "0" taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8081" ^| findstr /i "listening"') do (
    if "%%a" neq "0" taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [2/5] Starting Cloudflare Live Tunnel (restaurants.stackvil.com)...
cd /d "%ROOT_DIR%backend"
start "Cloudflare Tunnel" cmd /k "cloudflared.exe tunnel --no-autoupdate run --token eyJhIjoiMDU4NzM5ZmEzOGM4MzNjMTI4NDYxNmJiYjg4Yjk1MGMiLCJ0IjoiMmNlNDEyNmQtMDFiMC00YjI0LTkzYmItYTRmODRiYzY4OGM0IiwicyI6Illqa3pOV0kwTlRJdE4yUTBaQzAwTXpRMkxXSTNNRFV0TXpNMlpqTTJaRFV6WXpReSJ9"

echo.
echo [3/5] Starting Node.js Backend Server (Port 5001)...
cd /d "%ROOT_DIR%backend"
start "Backend Server (Port 5001)" cmd /k "node server.js"

echo.
echo [4/5] Starting Expo Frontend Web Server (Port 8081)...
cd /d "%ROOT_DIR%frontend"
start "Frontend Web Server (Port 8081)" cmd /k "npx expo start --web --port 8081"

echo.
echo [5/5] Initializing live services...
timeout /t 4 /nobreak >nul

echo Opening browser at http://localhost:8081...
start http://localhost:8081

echo.
echo ===============================================================================
echo                           ALL SERVICES ARE NOW LIVE!
echo ===============================================================================
echo.
echo  * Local Web App:       http://localhost:8081
echo  * Public Cloud Domain: https://restaurants.stackvil.com
echo  * Admin Dashboard:     http://localhost:5001/admin
echo  * Kitchen (KOT):       http://localhost:5001/admin/kot/
echo  * API Documentation:   https://restaurants.stackvil.com/api-docs/
echo.
echo ===============================================================================
echo Leave the opened terminal windows running in the background.
echo ===============================================================================
echo.
pause
