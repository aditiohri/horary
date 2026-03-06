#!/bin/bash
set -euo pipefail

# Only run in remote (web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install gh CLI if not already present
if ! command -v gh &>/dev/null; then
  apt-get install -y gh
fi

# Authenticate gh CLI using GH_TOKEN env var (set this in Claude Code web environment settings)
if [ -n "${GH_TOKEN:-}" ]; then
  echo "$GH_TOKEN" | gh auth login --with-token
else
  echo "Warning: GH_TOKEN not set — gh CLI will not be authenticated. Add GH_TOKEN to your Claude Code web environment settings."
fi

# Install npm dependencies (skip Puppeteer's Chromium download — not needed for tests/build)
cd "$CLAUDE_PROJECT_DIR"
PUPPETEER_SKIP_DOWNLOAD=1 npm install
