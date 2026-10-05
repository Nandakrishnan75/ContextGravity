@echo off
title Packing Antigravity Portal
echo ======================================================
echo    Packing Antigravity Continuity Portal into ZIP...
echo ======================================================

set DEST=..\antigravity-portal.zip

powershell -Command "Compress-Archive -Path 'server.js', 'package.json', 'start.bat', 'start.sh', 'README.md', 'public' -DestinationPath '%DEST%' -Force"

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Packed successfully to: %DEST%
    echo You can now send antigravity-portal.zip to anyone!
) else (
    echo.
    echo [ERROR] Failed to create ZIP file.
)

pause
