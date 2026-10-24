#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$root/dist"
if ! command -v em++ >/dev/null 2>&1; then
  echo "em++ unavailable: activate your Emscripten SDK first" >&2
  exit 1
fi
em++ "$root/main.cpp" -std=c++11 -O2 --use-port=sdl2 \
  -sALLOW_MEMORY_GROWTH=1 -sASSERTIONS=1 \
  -o "$root/dist/index.html"
echo "Independent SDL2 smoke artifacts at $root/dist"
