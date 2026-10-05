@echo off
title Antigravity Continuity Portal
echo ======================================================
echo    Starting Antigravity Continuity Portal...
echo ======================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Starting server on http://localhost:4242 ...
start "" http://localhost:4242
node server.js
pause
