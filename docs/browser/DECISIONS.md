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
