#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="/Users/zhangshuo/Library/Mobile Documents/iCloud~md~obsidian/Documents/work_notes/.obsidian/plugins/publisher-export"

cd "$SCRIPT_DIR"

echo "Building Publisher Export..."
npm run build

echo "Copying plugin files to:"
echo "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
cp -f "$SCRIPT_DIR/main.js" "$TARGET_DIR/main.js"
cp -f "$SCRIPT_DIR/manifest.json" "$TARGET_DIR/manifest.json"

echo "Done. Reload Obsidian to use the new version."
