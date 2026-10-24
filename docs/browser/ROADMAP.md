# Browser Port Roadmap

STATUS: Planning. Only check milestones after test evidence is recorded.

## P0: Fork, native baseline and SDL2 smoke artifact (initial priority)

- [x] Identify working fork and upstream branch.
- [x] Add documented project structure and independent SDL2 smoke-test source.
- [ ] Record upstream commit and validate native VanillaTD build on Linux/WSL2.
- [x] Pin and verify an Emscripten SDK version in CI (3.1.68, successful smoke build).
- [x] Build HTML/JS/WASM from browser/smoke in CI; artifact published.
- [ ] Validate mouse, keyboard and animation in desktop Chrome/Edge; link CI run.

**Verified CI evidence:** [Browser SDL2 smoke workflow #40127079631](https://github.com/chucklowery/World-Conquer/actions/runs/40127079631) succeeded for commit cf00fcbd6144f5b822f498b2e9894e93b10f7bfc. It installed Emscripten 3.1.68, compiled the smoke test, and uploaded artifact browser-sdl2-smoke. Manual browser interaction and native VanillaTD runtime validation remain outstanding.

**Exit gate P0:** actual native build and independent browser SDL2 smoke test both verified. Smoke artifact is NOT the game.

## P1: Compile real VanillaTD engine to WebAssembly

- [x] Add initial EMSCRIPTEN-gated SDL2/CMake configuration and CI compile spike (pending engine compilation verification).
- [x] Configure Emscripten SDL2 port and disable Red Alert, networking, remaster and OpenAL for initial browser build.
- [ ] Audit unsupported POSIX/platform calls and missing link symbols.
- [ ] Add portable browser path/file and timing behavior.
- [ ] Produce engine HTML/JS/WASM output and initialize without missing imports.

**Exit gate P1:** actual game engine module links, is loaded by the browser and produces logs. Menu not required yet.

## P2: Cooperative execution and graphical front end

- [ ] Inventory blocking loops in tiberiandawn/conquer.cpp, startup.cpp and dialogs.
- [ ] Record main-loop strategy (callback state machine versus temporary Asyncify/worker compatibility) in an ADR.
- [ ] Make browser event loop responsive without blocking.
- [ ] Verify SDL2 canvas, mouse, keyboard, focus and palette.
- [ ] Measure tick consistency, memory growth and frame time.

**Exit gate P2:** running graphical menu responds to browser input without hanging.

## P3: Player-provided game-data import

- [ ] Identify and validate a particular compatible set of Tiberian Dawn MIX files.
- [ ] Add local file picker and readable missing-asset errors.
- [ ] Stage assets in Emscripten virtual FS before engine initialization.
- [ ] Validate path/case semantics; confirm no files are uploaded to a server.

**Exit gate P3:** one real campaign mission loads from local user-provided assets.

## P4: First playable GDI mission

- [ ] Test selection, movement, targeting, combat, AI and scenario progression.
- [ ] Verify complete mission win/loss and restart.
- [ ] Add browser smoke automation and documented browser compatibility.
- [ ] Publish versioned playable beta artifact with no proprietary game assets.

**Exit gate P4:** first GDI mission is completable on desktop Chrome or Edge.

## Later

Campaign completeness, persistent saves (OPFS/IndexedDB), audio/video parity, multiplayer, gamepad/mobile controls and richer web UI.

## Evidence format

For each checked gate: commit SHA, OS/browser, toolchain version, exact command, logs or CI link, outcome, remaining bugs. Estimates are intentionally provisional until the engine compile spike.
