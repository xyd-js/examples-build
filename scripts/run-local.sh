#!/usr/bin/env bash
# One-shot local runner: ensure submodules, install deps, build, then serve.
#
# Usage:
#   scripts/run-local.sh                    # build all 18 examples and serve
#   scripts/run-local.sh abtesting          # build only abtesting and serve
#   scripts/run-local.sh abtesting,basename # build a comma-separated subset
#
# Env:
#   XYD_CLI_VERSION   xyd CLI to use (default "latest")
#   PORT              local serve port (default 4321)
#   NO_SERVE=1        build only, don't start the server

set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-4321}"
ONLY="${1:-}"

echo "▶ ensuring git submodules"
git submodule update --init --recursive --jobs 4

if [ ! -d node_modules ]; then
  echo "▶ installing deps"
  bun install
fi

echo "▶ building (xyd-cli=${XYD_CLI_VERSION:-latest})"
if [ -n "$ONLY" ]; then
  bun run scripts/build-all.ts "--only=$ONLY"
else
  bun run scripts/build-all.ts
fi

if [ "${NO_SERVE:-0}" = "1" ]; then
  echo "▶ build complete (NO_SERVE=1) — dist/ ready"
  exit 0
fi

echo "▶ serving dist/ at http://localhost:${PORT}"
exec bunx serve dist -p "$PORT"
