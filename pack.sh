#!/usr/bin/env bash
# Pack Antigravity Continuity Portal into ZIP

echo "Packing Antigravity Continuity Portal into ZIP..."
DEST="../antigravity-portal.zip"

zip -r "$DEST" server.js package.json start.bat start.sh README.md public

if [ $? -eq 0 ]; then
    echo "[SUCCESS] Packed successfully to: $DEST"
else
    echo "[ERROR] Failed to create ZIP file."
fi
