# M2 shared session log

This log records phase-boundary evidence for the three-session M2 plan. Original, generated content only; no proprietary game media.

## Session M2a

- Branch: `m2a/probe-pack-placeholders` (from `vanilla` at `df67bf4f3634ab67d4bb9de98b69488004ce7b30`).
- Entry condition: M1 PR [#56](https://github.com/chucklowery/World-Conquer/pull/56) merged at `64c6cf5bb277cfe6480eff105e2026b5a0b2fb8d`; latest browser workflow on `vanilla` [run 45084411238](https://github.com/chucklowery/World-Conquer/actions/runs/45084411238) succeeded with `wasm-vanillatd` and `stock-engine` both green (head `64c6cf5bb277cfe6480eff105e2026b5a0b2fb8d`).
- Build loop: **CI-only fallback**. This agent environment has Node.js v22.16.0, Git, CMake and Ninja, but no local `emcc`; external GitHub Git access fails DNS resolution. CI uses pinned Emscripten 3.1.68, Ubuntu 24.04, Playwright 1.56.1 and Ninja as specified in `.github/workflows/browser-engine.yml`.
- Baseline: the last successful `vanilla` browser job compiled WASM, generated the original boot pack with native `vanillamix`, and executed `stock-engine` successfully. The workflow's content validation includes `node docs/rts-milestones/validate-roadmap.js`, `node tools/content/test-boot-pack.js`, and `node tools/content/test-wireframes.js`. The separate legacy RTS workflow completed successfully on `vanilla` at [run 45087673627](https://github.com/chucklowery/World-Conquer/actions/runs/45087673627); local execution of `bash scripts/check-rts-foundation.sh` is unavailable without a clone.
- Open issues: baseline browser workflow predates the latest documentation-only `vanilla` head; cannot independently run the baseline Chromium smoke in this environment. No EA or Westwood game data used.

### Phase 0 — setup, baseline and log

- Status: **partial** (CI-only baseline, local build/test unavailable).
- Commit SHA: see this phase's commit in Git history (`M2a phase 0: baseline and shared session log`).
- Commands/results: `emcc` discovery → absent; `git ls-remote` → DNS resolution failure; CI `wasm-vanillatd` → success; CI `stock-engine` → success; CI boot/content checks → success. Local full baseline commands not executed.
- CI: https://github.com/chucklowery/World-Conquer/actions/runs/45084411238
- Open issues: a current-branch CI run is needed after PR creation.

### Phase 1 — scenario probe and path decision

- Status: **partial**. Report-mode Chromium probe, stock-engine event hooks and CI job committed; runtime probe has not yet produced an inspected audit.
- Commit SHA: `01435e96b57daada10e3e90f530758bf3cd7540c` (latest implementation checkpoint; phase log commit follows).
- Commands/results: source review of `menus.cpp`, `mplayer.cpp`, `nulldlg.cpp` confirms the Skirmish UI and `GAME_SKIRMISH` path are present without `NETWORKING`; `node browser/engine/check-stock-scenario.js` scheduled in CI with `STOCK_SCENARIO_REPORT_ONLY=1`. No local Chromium execution available.
- CI: https://github.com/chucklowery/World-Conquer/actions/workflows/browser-engine.yml (PR #57 run pending at this checkpoint).
- Path decision: **provisional Skirmish**, pending a successful click-path observation. Multiplayer scenario scanning uses `SCM*EA.INI` (initial M1 audit names `scm94ea.ini`–`scm99ea.ini`). New Game and `SCG01EA` remain the prescribed fallback only after runtime evidence.
- Open issues: probe audit not yet inspected; building/production/credits hooks need WASM compilation verification; scenario files are intentionally absent from M1 boot pack, and no generated map has been created in M2a.
