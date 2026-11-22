| 9 | partial | see commits | Owner checklist and build/runtime docs; exit evidence pending || 8 | partial | see commits | stock-engine CI job and metrics driver; not yet green || 7 | partial | see commits | Canvas scaling, focus, pointer and keyboard handling; Chromium checks pending || 6 | not started | see commits | Stock menu has not been observed; not started || 5 | partial | see commits | FNT/CPS/font/shape/palette/ENG boot generator plus host harness; CI pending || 4 | partial | see commits | Pack loader, SHA tests, IDBFS and launcher; browser verification pending || 3 | partial | see commits | Watchdog, guarded yields and VQA skip; Chromium stall gate unverified || 2 | partial | see commits | Static inventory created (40 candidates); empty-data run not observed |# M1 session log

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

## Phase status

| Phase | Status | Commit | Notes |
| --- | --- | --- | --- |
| 0 | partial | this commit | Network/toolchain blocker; baseline unverified |
| 1 | partial | e952733 | CMake audit option; CCFileClass lookup logs; browser audit collector and parser test; startup fatal markers. Builds and tests unverified; MIX Retrieve-only paths require review. |
| 2 | not started | — | Boot inventory |
| 3 | not started | — | Cooperative loops |
| 4 | not started | — | Loader/persistence |
| 5 | not started | — | Placeholder generator |
| 6 | not started | — | Stock menu |
| 7 | not started | — | Display/input |
| 8 | not started | — | CI gate |
| 9 | not started | — | Owner checklist |

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
