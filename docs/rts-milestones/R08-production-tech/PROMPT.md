# R08 — Build queues, unit production, and tech tree

Implement **R08** at `https://github.com/chucklowery/World-Conquer` without any earlier chat. World-Conquer currently provides a playable native C++/WASM tactical mission, not a true RTS production loop. The existing sidebar has building preview options; R00 supplies native commands/entity IDs, R06 canonical house resources, and R07 working structures and power. Gameplay code lives in `tiberiandawn/` and `browser/engine/`, mission data in `game/content/`, CI under `.github/workflows/browser-engine.yml`. Examine the actual merged contracts before editing.

**Dependency gate:** R00, R06, **and R07** must be marked `completed` in `docs/rts-milestones/MANIFEST.md` and integrated. If any are absent, mark R08 blocked.

**Deliverable:** unit and building production queues, deterministic timers and prices, cancellation/refunds, rally points, blocked-exit handling, prerequisites, tech unlocks, faction-specific rosters, disabled/available states in the right HUD, and native production events. Implement a small, coherent tech tree spanning refinery → power/barracks/factory → infantry/harvester/vehicle. No fake DOM-only queues. Use content IDs from approved original assets where available, with safe fallback drawing.

**Acceptance:** starting from a seeded base, the player harvests resources, builds required facilities, queues and produces multiple units, sets a rally point, cancels a queue item and unlocks a gated unit. Tests check cost, refunds, ordering, timing, power, prerequisites, spawn blocking, house separation and reset. Browser test asserts newly built units are selectable and commandable; prior mission and CI checks pass.

**Manifest protocol:** change only **R08** row of `docs/rts-milestones/MANIFEST.md` to `in_progress` on start; `blocked` with reason if gated; `completed` only after all tests, browser acceptance and relevant GitHub Actions pass. Store PR/commit/test/CI/play evidence there; preserve other rows during integration. Run `node docs/rts-milestones/validate-roadmap.js` and relevant browser-engine tests, create scoped PR. No proprietary assets.
