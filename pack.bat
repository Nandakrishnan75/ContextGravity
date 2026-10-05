@echo off
title Packing ContextGravity Suite
echo ======================================================
echo    Packing ContextGravity (Extension + Web Portal)...
echo ======================================================

node "%~dp0pack.js"

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] All packages generated and ready!
) else (
    echo.
    echo [ERROR] Packaging encountered an error.
)

pause
