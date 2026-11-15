# R09 — Visibility, fog of war, and tactical radar

Implement **R09** for the repository `https://github.com/chucklowery/World-Conquer` in a new, independent context. The native SDL2/WASM tactical alpha has a true minimap in the right HUD, above preview-only construction choices, but presently shows full mission terrain and combat state. `browser/engine/tactical-hud.js` renders the minimap; `tiberiandawn/` contains native engine systems; `game/content/missions/` contains maps. R00 canonical snapshots and R04 configurable maps are prerequisites. Inspect `browser/engine/README.md`, `docs/browser/BUILD.md` and merged interfaces.

**Dependency gate:** both R00 and R04 must be `completed` in `docs/rts-milestones/MANIFEST.md`. Mark blocked if absent.

**Deliverable:** deterministic per-house visibility and exploration layers, sight radius/obstructions, unit/building reveal on movement, shroud/fog states, and ownership-safe state queries. Render fog correctly on the battlefield and minimap; do not leak unseen enemy positions through snapshots, tooltips, selection, events or radar. Define detector/radar rules and structure-power integration seam for R07; support spectator/replay visibility explicitly. Avoid storing authoritative visibility exclusively in JavaScript.

**Acceptance:** two houses see different map information; hidden enemies cannot be selected or targeted through HUD; movement reveals terrain, explored cells persist as shroud, and fog re-hides departing enemies; minimap matches world view at multiple zooms; tests catch information leaks and deterministic visibility updates. Native browser mission remains playable and regressions pass.

**Manifest protocol:** update just **R09** row in `docs/rts-milestones/MANIFEST.md` to `in_progress` at start, `blocked` if necessary, `completed` only after tests/browser acceptance/relevant CI. Include PR/SHA/commands/CI/evidence, preserve other workers' rows, run `node docs/rts-milestones/validate-roadmap.js` and browser-engine checks, and open scoped PR. Use original/licensed assets.
