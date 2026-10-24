# Browser Port Backlog

This is a planning index. Actual GitHub issue numbers should be linked here after creation.

## BROW-001: Native baseline
Build VanillaTD with existing CMake options on Linux/WSL2, run with legally obtained compatible assets, record commit, command, result and log. No game data committed.

## BROW-002: Independent SDL2 WebAssembly smoke
Build browser/smoke with pinned Emscripten SDK. Download index.html/index.js/index.wasm from GitHub Actions. Verify animation and keyboard/mouse in desktop Chrome or Edge.

## BROW-003: Emscripten CMake support
Introduce platform-gated SDL2 link flags and WASM output settings. Keep native targets building.

## BROW-004: Engine compile/link blockers
Resolve incompatible APIs, missing symbols and target assumptions until actual VanillaTD HTML/JS/WASM artifacts link.

## BROW-005: Nonblocking browser lifecycle
Adapt startup, Select_Game, Main_Game, Main_Loop and synchronous dialogs. Verify responsive canvas, input and simulation ticks.

## BROW-006: Local asset import
Accept a legally obtained compatible game-data directory. Validate files and mount into Emscripten FS before game initialization, without server upload.

## BROW-007: First GDI mission
Verify selection, movement, attack, enemy AI, mission objectives, win/loss and restart. Document any parity failures.

## Delivery order
BROW-001 and -002 can be parallel. BROW-003/-004 precede the actual game WASM boot. BROW-005 and -006 unlock scenario load. BROW-007 closes the first playable milestone.

## Definition of done
Each issue needs a scoped PR, regression checks for engine changes, recorded evidence (commit SHA, versions, command, result), updated docs and no unauthorized assets.
