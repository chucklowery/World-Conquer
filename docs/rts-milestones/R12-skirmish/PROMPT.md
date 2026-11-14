# R12 — Skirmish match flow and victory conditions

Implement **R12** in a fresh context for `https://github.com/chucklowery/World-Conquer`. World-Conquer's published native C++/WASM tactical alpha currently offers one Courier Extraction mission and a full-viewport HUD, but no true configurable RTS skirmish. Prior milestones establish flexible map loading (R04), production/tech (R08), fog (R09), and a strategic opponent (R10). Browse `browser/engine/README.md`, `docs/browser/BUILD.md`, the current game launcher and merged contracts. No past chat knowledge is needed.

**Dependency gate:** R04, R08, R09 and R10 must be marked `completed` in `docs/rts-milestones/MANIFEST.md` and integrated. Mark R12 blocked if any are missing.

**Deliverable:** a native match lifecycle with a browser menu for choosing map, faction, AI difficulty, starting resources and player/AI slots; spawn, load, pause/resume, restart, surrender, base-elimination victory and postgame results. Enforce one canonical house/team registry and clear ordering for defeat, draw and timeout; prevent input after termination. Menu must launch the actual compiled native RTS simulation, not a standalone JS mock. Leave seams for multiplayer lobby and replay integration.

**Acceptance:** two playable maps and two factions can be selected; player vs AI match supports harvesting, structures, unit production, combat and victory/defeat; pause and restart are deterministic and clear residual state; postgame panel and shortcut help fit fullscreen and mobile/narrow viewports. Host lifecycle tests and Chromium end-to-end flow pass without regressing Courier mission.

**Manifest protocol:** edit only **R12** row of `docs/rts-milestones/MANIFEST.md`: `in_progress` while coding, `blocked` with precise reason if gated, `completed` only with accepted browser match and green relevant workflows; record PR/SHA/tests/CI/browser evidence. Preserve all other rows while integrating. Run `node docs/rts-milestones/validate-roadmap.js`, relevant `.github/workflows/browser-engine.yml` checks, and open a scoped PR. No unauthorized assets.
