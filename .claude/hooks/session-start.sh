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

# Install npm dependencies (skip Puppeteer's Chromium download — not needed for tests/build)
cd "$CLAUDE_PROJECT_DIR"
PUPPETEER_SKIP_DOWNLOAD=1 npm install
