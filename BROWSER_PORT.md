# Browser Port: World-Conquer on the VanillaTD engine (Vanilla Conquer)

> STATUS (2026-11-24): The stock VanillaTD engine plays full skirmishes against its computer player in the browser on a 100% original, CI-built data pack, and the play site is published to GitHub Pages from `vanilla`. The authoritative plan is [docs/ROADMAP.md](docs/ROADMAP.md) (ADR-0003: the engine is the RTS, content is an original data pack; ADR-0004: player-facing gates).

This project adapts the existing Vanilla Conquer C++ engine for desktop web browsers using Emscripten, SDL2, and a browser-compatible lifecycle. Preserve game behavior and keep native builds working.

- Upstream: https://github.com/TheAssemblyArmada/Vanilla-Conquer (branch: vanilla)
- Starting fork: https://github.com/chucklowery/World-Conquer
- Plan created: 2026-10-24
- Roadmap: docs/ROADMAP.md (earlier docs/browser/ROADMAP.md is superseded)
- Architecture: docs/browser/ARCHITECTURE.md
- Build and verification: docs/browser/BUILD.md
- Decisions: docs/browser/DECISIONS.md
- Issue backlog: docs/browser/BACKLOG.md
- Independent SDL2 test: browser/smoke/README.md

## Project principles

1. Preserve Tiberian Dawn gameplay in C++ instead of rewriting the simulation in TypeScript.
2. Isolate Emscripten-only changes so native Linux/Windows builds still work.
3. First compile a **separate** SDL2 browser test; then compile the real game engine.
4. Ship an original, CI-built data pack (roadmap M2). Until it exists, support player-provided, legally acquired assets for development only; never commit, bundle, or upload copyrighted game data to CI.
5. Make every milestone measurable. A produced WASM file is not evidence the actual game runs.
6. The stock engine is the sole gameplay authority; do not build parallel simulation layers (ADR-0003).

## First playable acceptance criteria

- Chrome or Edge loads the actual VanillaTD WebAssembly binary without a browser hang.
- Local files can be imported into a virtual filesystem without server upload.
- A skirmish runs on the original data pack; harvesting, construction, production, combat, AI and win/loss all function through the engine (roadmap M3).
- CI publishes reproducible browser HTML, JavaScript and WASM artifacts.
- Build/test results include commit SHA, compiler and browser versions, and observed limitations.

## Non-goals of the first milestone

Multiplayer, accounts, cloud saves, mobile input, remastered graphics, and a React UI.

## Licensing and credits

Retain upstream License.txt and all copyright notices. The GPL source release includes EA additional terms and does not grant trademark or game asset distribution rights. The project must not claim EA endorsement or distribute EA's game data.
