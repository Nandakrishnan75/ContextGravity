#!/usr/bin/env bash
# Pack ContextGravity Suite (Extension + Web Portal) into ZIP archives

echo "======================================================"
echo "   Packing ContextGravity Suite into ZIP archives...  "
echo "======================================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/pack.js"

if [ $? -eq 0 ]; then
    echo ""
    echo "[SUCCESS] All packages generated and ready in dist/ and parent directory!"
else
    echo ""
    echo "[ERROR] Packaging encountered an error."
fi
