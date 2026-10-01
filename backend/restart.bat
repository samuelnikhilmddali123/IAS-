@echo off
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5001" ^| findstr /i "listening"') do (
    if "%%a" neq "0" taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul
start "Backend Server (Port 5001)" /B node server.js
