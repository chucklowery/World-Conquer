# Stage-0 SDL2 WebAssembly Smoke Test

This independent sample is **not VanillaTD**. It validates compiler, SDL2, Emscripten event loop, rendering and input in a browser without game assets.

## Local commands

~~~bash
# Activate Emscripten SDK first.
bash browser/smoke/build.sh
python3 -m http.server 8080 --directory browser/smoke/dist
~~~

Open http://localhost:8080/index.html.

## Acceptance
- A green rectangle animates over a dark canvas.
- Clicking the canvas changes the rectangle from green to amber.
- Keyboard events are logged in the browser developer console after the canvas is focused.
- Browser Network panel shows successful JS/WASM fetches; no runtime errors.
- GitHub Actions publishes index.html, index.js and index.wasm as one downloadable artifact.

The dist/ folder is ignored. The first [GitHub Actions build](https://github.com/chucklowery/World-Conquer/actions/runs/40127079631) succeeded using Emscripten 3.1.68 and published the browser-sdl2-smoke artifact. Manual Chrome/Edge animation and input checks remain outstanding. This does not verify the actual game engine.
