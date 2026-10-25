# Architecture Decisions

## ADR-0001: Browser source-port strategy
**Status:** Proposed on 2026-10-24. Accepted only when merged.

### Context
Vanilla Conquer has a portable C++ engine, native SDL2 backend, null audio backend and a working native CMake target. Its nested synchronous game and menu loops require browser compatibility work.

### Proposed decision
1. Fork Vanilla Conquer rather than the incomplete historical EA source drop.
2. Preserve unit AI, pathfinding, simulation and missions in C++.
3. Compile to WebAssembly with a pinned Emscripten toolchain.
4. Use existing SDL2 renderer/input before attempting an HTML-native renderer.
5. Scope MVP to desktop, single-player Tiberian Dawn; turn off Red Alert, networking and audio.
6. Prove standalone SDL2 WebAssembly build before modifying the game engine.
7. Import legally obtained user assets; do not redistribute original game media.

### Alternatives
- DOS-in-WASM: fastest to emulate existing binary, poor source-port foundation.
- Full TypeScript rewrite: flexible but substantially more risky for fidelity.
- Browser-side serialized game state renderer: unnecessary integration complexity.
- Asyncify or a browser worker: possible bridging mechanisms, but evaluate against a maintainable cooperative loop.

### Consequences
Higher initial port effort in exchange for faithful gameplay and maintainable cross-platform C++ reuse. Native CI regression checks required.

### Unresolved decisions
- Verified SDK version and browser CI matrix.
- Main-loop strategy, pending source investigation.
- First certified game-data release.
- Persistent storage strategy and eventual audio support.

Follow-on ADRs: main-loop architecture; asset import/storage; audio/video.


## ADR-0002: Asyncify as transitional cooperative execution for original loops
**Status:** Proposed for runtime milestone P2b (2026-10-24); verify with headless Chromium and native CI.

### Context
Original VanillaTD main() invokes Main_Game(), which calls Select_Game() and
Main_Menu(); both use nested synchronous loops. Scenario processing calls
Main_Loop() in a for(;;) loop, and dialog/fade paths spin on Call_Back() or
Frame_Limiter(). These loops freeze browser rendering/input if left unchanged.

### Decision
Use Emscripten Asyncify in the browser build ONLY. Its emscripten_sleep(0)
operation suspends the current C++ call stack and resumes it on a future JS
turn, retaining existing gameplay, menu and dialog code. Insert yield points:
- In Call_Back(), covering menus, transitions and dialog maintenance.
- In Frame_Limiter(), covering full gameplay frames and most modal dialogs.
- In portable ms_sleep/us_sleep implementations on Emscripten, replacing
  browser-main-thread-blocking nanosleep with emscripten_sleep.
Native builds take none of these paths and retain their original threading.

Add a separate real-engine test mode \`--browser-cooperative-probe\`: a
synchronous C++ while loop rendering SDL2 frames, where Asyncify suspends and
resumes the loop as browser JS timers and input handlers continue to execute.
CI tests responsive browser heartbeat, animation and input without EA assets.

### Tradeoffs, remaining gaps
Asyncify increases WASM size, CPU cost and memory usage, and cannot make long
single C++ operations interruptible until the next suspension point. Some
code paths that neither call Call_Back, Frame_Limiter nor sleep may still
block. Movie playback and initialization can be asset dependent; they require
further audits and real game-data integration tests. User game media must
never be committed or uploaded. A future explicit state machine may remove
Asyncify once all menu/dialog transitions are modeled.
