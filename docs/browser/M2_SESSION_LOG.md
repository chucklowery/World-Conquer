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

### Phase 2 — unified pack build

- Status: **partial** (generator, deterministic-build test and CI wiring committed; CI results and Phase 1 audit not yet available).
- Commit SHA: `02882304998080b6bde204f56e7f703434359a6b` (implementation checkpoint; log commit follows).
- Commands/results: `node tools/content/test-pack.js` and `node tools/content/pack.js build build/browser-engine/data` added to `wasm-vanillatd`; `world-conquer-data-pack` is the new shared artifact used by `stock-engine` and `stock-scenario`. Local tests unavailable without the native `vanillamix` binary. Determinism/provenance checks execute in CI.
- CI: https://github.com/chucklowery/World-Conquer/pull/57/checks (pending).
- Coverage: `coverage.json` reports produced/required totals by boot, menu, scenario, gameplay and missing names. Requirements were copied from the M1 inventory as the first stage; scenario-path misses will be added after the probe audit is available.
- Open issues: `boot-pack.js` remains a compatibility generator used by `pack.js`; phase 3 still needs object placeholders and additional loader contracts.

### Phase 3 — universal engine placeholders

- Status: **partial** (source implementation committed, but no completed CI/audit result yet).
- Commit SHA: `bdc18832422b31762fb358ab3ba1d104cadc0c90` (latest phase implementation checkpoint; log commit follows).
- Commands/results: `pack.js` now invokes `wireframes.js` with house remapping, chooses the greatest frame count for shared filenames, copies source-generated `.SHP` shapes into the pack, and adds a CC0 skirmish-picker probe INI `SCM94EA.INI`. `requirements.json` now includes 219 unique provisional tactical-shape contracts plus the scenario picker fixture. JavaScript source syntax checks passed via V8. Runtime/binary tests remain pending in CI.
- CI: https://github.com/chucklowery/World-Conquer/pull/57/checks (unconfirmed at this checkpoint).
- Remap indices: `tiberiandawn/const.cpp` `RemapGold` versus `RemapRed` differ at palette indices **176–191**. The pack-only wireframe generator paints a nontransparent central band with indices in this range for building, unit, infantry and aircraft placeholders.
- Open issues: no confirmed Chromium `scenario.request` observation; no verified non-SHP theater/icon-set encoder (Phase 4, M2b); not all runtime-demanded UI and effect assets can be classified without the probe audit.

### M2a handoff (provisional; gate not yet established)

- Path: **Skirmish** is the default and is wired through `Select_MPlayer_Game`, `Com_Scenario_Dialog`, and the original `SCM94EA.INI` picker fixture. The runtime still must confirm this choice; only fall back to New Game if Skirmish is unfixably blocked using allowed guarded changes.
- Scenario names: `SCM94EA.INI` is the source-owned dialog fixture. `SCM*EA.INI` is scanned by `mplayer.cpp:640-673`; M2b must replace the stub with a valid generated multiplayer scenario and BIN.
- Remaining misses by kind: **theater** — TEMPERAT icon/MIX contracts not yet generated; **roster** — shapes supplied provisionally, exact slice frame contracts unverified; **UI** — names not yet classified by a successful audit; **effects** — engine-named shape placeholders supplied, runtime coverage unverified; **other** — optional audio/movie omitted, extra scenario requests unknown.
- Format gaps: theater icon-set remains scheduled for M2b Phase 4; absent cinematics/audio must remain non-fatal; no proprietary content used.
- Engine behavior: multiplayer scenario picker scans scenario numbers 0–99, requires the corresponding INI to list its `[Basic] Name`; the initial boot inventory contained no scenario-path files. Browser hooks are restricted to test instrumentation.
- Critical next check: get a completed `wasm-vanillatd`, `stock-engine`, and `stock-scenario` run on the final M2a head; inspect its uploaded `stock-scenario-audit.json` before claiming the M2a gate. Do not start M2b while the M2a gate is unverified.
