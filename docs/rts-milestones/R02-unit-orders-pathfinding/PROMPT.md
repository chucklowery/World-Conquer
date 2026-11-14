# R02 — Production unit commands and navigation

Implement **R02** from a clean branch of `https://github.com/chucklowery/World-Conquer`, independently of chat history. Existing Courier Extraction uses real `InfantryClass::AI` and `MapClass` for infantry movement, `NavCom` destinations, and an authored 18×11 mission grid; current sentry and combat behavior still belong to the specialized Courier slice. Code resides in `browser/engine/` and VanillaTD sources under `tiberiandawn/`. Inspect `browser/engine/README.md`, `docs/browser/ARCHITECTURE.md`, and `docs/browser/BUILD.md`.

**Dependency gate:** R00 simulation/entity/command contracts must be `completed` in `docs/rts-milestones/MANIFEST.md`, merged and understood. Otherwise mark R02 blocked before implementing.

**Deliverable:** generalize move, attack-move, stop, hold-position, guard and patrol orders for multiple production-engine units; deterministic terrain-aware pathfinding with dynamic occupancy, collision avoidance, obstruction replanning, and explicit unreachable-order feedback. Implement a bounded cost strategy and unit tests. Use the production C++/WASM simulation, not an unrelated JavaScript simulator. Publish command state to the R00 HUD snapshot. Define predictable behavior when units die mid-order or destinations become blocked.

**Acceptance:** at least four independently commanded units cross around obstacles without phasing/lockups; queued or replaced orders behave deterministically; invalid/unreachable targets are handled safely; browser play/Chromium acceptance covers selection and commands; host C++ and WASM tests pass with existing Courier extraction regression preserved. Record measured pathfinding budget for a representative map.

**Manifest protocol:** update **only R02** in `docs/rts-milestones/MANIFEST.md` to `in_progress` on start, `blocked` with explanation if stopped, `completed` only upon verified tests/browser acceptance/CI; add PR/commit/commands/CI evidence. Rebase while preserving other statuses. Run `node docs/rts-milestones/validate-roadmap.js` and relevant `.github/workflows/browser-engine.yml` checks, then open a scoped PR. Do not ship proprietary game content.
