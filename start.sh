#!/usr/bin/env bash
# Antigravity Continuity Portal - Linux / macOS Launcher

echo "======================================================"
echo "   Starting Antigravity Continuity Portal..."
echo "======================================================"

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not found in PATH!"
    echo "Please install Node.js (v18+) to run this portal."
    exit 1
fi

PORT=${PORT:-4242}
URL="http://localhost:$PORT"

echo "Starting server on $URL..."

# Open browser if graphical environment exists
if command -v xdg-open &> /dev/null; then
    (sleep 1 && xdg-open "$URL") &
elif command -v open &> /dev/null; then
    (sleep 1 && open "$URL") &
fi

node server.js
