# M1 session log

Milestone: `docs/milestones/M1-engine-in-browser.md`
Branch: `m1/stock-engine-in-browser`
Base: `vanilla`
Started: 2026-11-22

## Phase 0 — partial

- Branch created from `vanilla` using the GitHub connector.
- Read `docs/milestones/AGENT_GUIDE.md`, `docs/ROADMAP.md`, `docs/browser/DECISIONS.md`, milestone plan, browser workflow, and existing launcher.
- Available execution environment: Node v22.16.0, CMake 3.31.6, Git 2.47.3; no `emcmake` on PATH.
- Baseline verification: **not run**. GitHub repository cannot be cloned into the execution environment (DNS error: `Could not resolve host: github.com`). Connector supports GitHub file operations but not a mounted checkout.
- Commands attempted:
  - `git --version` → 2.47.3
  - `node --version` → v22.16.0
  - `cmake --version` → 3.31.6
  - `which emcmake` → not installed
  - `git ls-remote https://github.com/chucklowery/World-Conquer.git refs/heads/vanilla` → failed (DNS)
- Open issues: install emsdk 3.1.68, clone checkout, build WASM/native tools, run roadmap/foundation tests and Playwright runtime test. No tests may be considered passing until executed.

## Phase status (as of latest committed implementation)

| Phase | Status | Evidence / open work |
| --- | --- | --- |
| 0 | partial | Setup and branch done; original local baseline cannot be reproduced without a checkout/toolchain |
| 1 | done | Audit and fatal reporting; native WC_ASSET_AUDIT ON/OFF builds pass in CI |
| 2 | partial | 40-file source inventory present; empty-MEMFS failure run not captured |
| 3 | partial | Cooperative yields and watchdog; optional movie/dialog paths remain unexercised |
| 4 | done in CI | Verified pack manifest, hashes and browser delivery; IDBFS configured |
| 5 | done in CI | Deterministic original boot pack, native MIX tool and host decoder test |
| 6 | done for exit gate | Original stock engine reaches menu in Chromium; additional dialog paths unverified |
| 7 | done for menu gate | Three viewport widths and mouse/keyboard regression checks; scenario edge-scroll deferred to M2 |
| 8 | done | Strict stock-engine run 45074464722 passed on 96c6738; all six workflow groups green |
| 9 | done for M1 exit gate | Owner instructions and docs written, roadmap evidence updated; PR can be marked ready |

## Phase 1 — partial (2026-11-22)

Commits through `e95273335dd1b8dcca6805529a30783be94ffbc5` on the milestone branch.

- Added `WC_ASSET_AUDIT` CMake option defaulting to the Emscripten setting, with the macro passed to `common`.
- Instrumented `CCFileClass::Is_Available` and `Open` to log first successful hit per filename and every failed lookup, identifying loose files or MIX archive filenames.
- Added `browser/engine/asset-audit.js` with `window.WCAssetAudit`, hooked `shell.html` print/printErr collection and fatal display, and created `test-asset-audit.js`.
- Browser workflow stages the new JS file and invokes its parser unit test.
- Added fatal diagnostics for browser startup exits via `Prog_End(...,true)`, `Print_Error_Exit`, `Print_Error_End_Exit`, and the mouse initialization failure.
- Tests: **not run**; repository checkout and Emscripten/Chromium unavailable in the execution environment.
- Open work: inspect MIX retrieval-only paths for lookup completeness, test `WC_ASSET_AUDIT=ON/OFF` on native builds, run JS parser tests, run pinned WASM build, validate startup fatal coverage and verify launcher behavior in Chromium. Do not mark Phase 1 done until verification.

## Continued session — 2026-11-22

- Phase 1: instrumented MIX lookup/retrieval paths and refined the audit logger.
  The initial WASM/legacy suite passed on commit `675fb20` and the Linux
  formatting failure was fixed; verification for later changes is pending.
- Phase 2: wrote `game/content/pack/boot-requirements.json` with 40
  candidates. Empty-data Chromium run still unavailable.
- Phase 3: added requestAnimationFrame watchdog and guarded browser yields in
  startup focus, menu mouse and gameplay focus loops; missing optional VQA
  files return immediately. Wrote `M1_PLATFORM_AUDIT.md`.
- Phase 4: added SHA-256 verifying, path-validating pack loader, Play action,
  Cache API fallback, IDBFS mount/sync and Node tests.
- Phase 5: wrote original FNT/CPS encoders, a deterministic MIX/ENG/SHP/PAL
  placeholder generator, Node determinism test and host LCW decoder harness.
  CI builds `vanillamix`, stages the original pack, and uploads its files.
- Phase 7: added responsive aspect scaling, focus, keyboard prevention,
  contextmenu suppression, edge-pointer clamping and opt-in pointer lock.
- Phase 8: added `stock-engine` Chromium driver and separate workflow job.
  Must prove actual `menu.enter` with original data; it has **not** passed yet.
- Phase 9: wrote owner-only check and updated BUILD/README; roadmap evidence
  deliberately not ticked before a successful stock CI run.
- PR: https://github.com/chucklowery/World-Conquer/pull/56 (draft).
- Commands executed locally in this continuation: none; source changes were
  committed through the GitHub connector. CI observations include the
  previously green WASM and legacy jobs and a Linux formatting failure that
  was fixed. Later checks are pending; no unobserved result is reported green.
- Open blockers: native audit ON/OFF verification, exact boot requirements,
  screenshot/input proof, no-fatal/no-miss criterion, watchdog max ≤ 1000 ms,
  complete frame/heap metrics and green native/legacy CI on the PR head.

## Acceptance evidence — 2026-11-22

- Verified prior head `97b60ab71d89fe64761df33674e04e73f7962694` in GitHub Actions browser run:
  https://github.com/chucklowery/World-Conquer/actions/runs/45072600919
- `stock-engine` job passed on real Chromium 141.0.7390.37 with the stock `main()` path, original boot pack, screenshot and changed frame after input at 480px, 1100px and 1600px.
- Time to menu: 1004ms / 1006ms / 1029ms; after-startup watchdog maximum: 0ms across three sizes. Frame-time p95: 50.0ms / 66.6ms / 216.7ms. Heap: 17,235,968 bytes at menu; stable at the original 30s sample.
- All Linux, Windows, MinGW, macOS, browser and legacy regression workflow groups passed on that head.
- Added stricter asset-miss basename/case normalization, 60s heap sample and end-of-soak assertions in subsequent commits. Added native audit ON/OFF compile checks. **The latest HEAD must pass before completing Phase 8/9.**
- This CI gate does not prove locally owned external game data/mission gameplay; that owner-only check is intentionally separate. Additional modal dialogs and empty-data startup remain documented follow-ups.

## Final strict CI acceptance — 2026-11-22

- Verified commit: `96c6738f0d403a6d41671930ca776f9cff2c81a1`
- CI: https://github.com/chucklowery/World-Conquer/actions/runs/45074464722
- Browser: Chromium 141.0.7390.37 using Emscripten SDK 3.1.68.
- `stock-engine`: **PASS**. Original pack verified; stock `main()` entered its real menu, frame nonblank, input changed frame at three viewport widths; no page errors, fatal markers or required boot/menu misses; post-startup max watchdog stall below 1000ms.
- Viewport 480: time to menu 787ms; frame p50 16.7ms, p95 100.0ms; maximum stall 0ms.
- Viewport 1100: time to menu 835ms; frame p50 16.7ms, p95 33.4ms; maximum stall 0ms.
- Viewport 1600: time to menu 854ms; frame p50 16.7ms, p95 116.7ms; maximum stall 350.1ms.
- Menu heap 17,235,968 bytes at the menu and after 60s in all three cases; no enforced metrics budgets.
- CI also passed native audit ON/OFF compile checks, original pack generation, host decoder harness, browser runtime/legacy demos, and the Linux, Windows, MinGW and macOS build groups.
- Full M1 **original-data CI exit gate met**. The owner-only proprietary-data mission-1 smoke is intentionally not run by an agent. Empty-MEMFS inventory proof and some optional dialogs/VQA loops remain partial and are tracked above; scenario and map-edge scrolling wait for M2.
- Post-evidence commits update only docs and log. If their PR CI fails, revert status to partial before merging.

## Review fix: absolute mouse input — 2026-11-22

- Independent review rebuilt the branch locally (Emscripten 3.1.68,
  Chromium) and found that clicks did not reach the engine at the clicked
  position. The engine defaulted to fullscreen with raw input, so SDL used
  relative mouse mode: it requested pointer lock without a user gesture
  (a page error in newer Chromium) and moved the cursor by deltas. The
  previous test only checked that the frame changed, so CI stayed green.
- Fix `f43de4d`: Emscripten builds default to windowed mode with raw input
  off (`common/settings.cpp`, also seeded in `shell.html`); browser builds
  log `[browser-input] mouse-down x= y=`; `check-stock-engine.js` clicks
  three background points per width, requires the engine position to match
  within 3%, and fails on any pointer-lock request without the toggle.
- Verified: without the settings fix the new test fails (a click at
  x=0.1 reached x=271, expected 64); with it, all clicks land within 1 px
  locally. CI run 45077613546 passed all six workflow groups; frame p95 fell
  from 33–117 ms to 16.7 ms at every width.
- Phase 7 mouse mapping and the M1 exit gate are now met. Still open, as
  before: the empty-data capture (Phase 2), modal/VQA loop exercise
  (Phase 3), and the owner-only licensed-data check.
