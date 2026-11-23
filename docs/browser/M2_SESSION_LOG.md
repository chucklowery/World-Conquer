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

### Review corrections — M2a phase 0–3 follow-up (2026-11-22)

- Status: **partial**, review findings addressed in source; awaiting final PR-head CI and Chromium audit.
- Fix commits: `86936b3` (correct artifact name), `461cfe7` (single authoritative probe log and post-capture strict status, delayed click echo), `db75491`/`1dcf208` (physical MIX listing and lower-case native-mixer alias), `ead398a` (determinism/hash/output tests), `12b804b` (stored harvest amount), `6c58ecc` (restrict placement and preserve original CP437/Latin-1 bytes), `a70879c` (all placeholder sources plus FACTMAKE remap), `0feaf1d` (audited code-line shift).
- CI diagnosis: [run 45088769659](https://github.com/chucklowery/World-Conquer/actions/runs/45088769659) failed `Verify original content pipeline` because inserting an Emscripten-only include moved the `building.cpp` evidence line from 513 to 516. The downstream `stock-engine` and `stock-scenario` jobs were skipped. The cached contract was updated to 516 without modifying frozen gameplay demo behavior.
- Binary encoding check: `building.cpp` original and review head each contain **656 non-ASCII bytes**; reconstructed from the original Git blob with surgical ASCII-only edits, preserving the preexisting debug box characters. `house.cpp` and `factory.cpp` have no high-bit source bytes.
- Verification: V8 syntax checks passed for modified JavaScript; the original pack and Chromium probes have not been run locally (CI-only fallback). The new deterministic test checks actual file sizes/SHA-256, required outputs, a tamper case and a child-process rebuild. `coverage.json` counts a MIX member only when `vanillamix --list` finds it in the generated archive.
- Remaining acceptance evidence: confirmed `stock-engine` pass, report-only `stock-scenario` audit with `scenario.request=`, and review of missing filenames from the final CI head. No M2b work performed; do not mark M2a complete without this evidence.

### CI follow-up: reviewed run failures

- [Browser run 45089812657](https://github.com/chucklowery/World-Conquer/actions/runs/45089812657): `Generate original M1 boot data` **passed**, including three independent pack invocations, on-disk hash/required-output/tamper checks and archive-member-based coverage reporting **240/240** produced in the *current provisional inventory*. The `Verify original content pipeline` failure was only an outdated generated Markdown reference to `building.cpp:513`; updated `docs/browser/REPRESENTATIVE_FRAME_CONTRACTS.md` to `:516` in commit `9b26393`.
- [Linux run 45089812634](https://github.com/chucklowery/World-Conquer/actions/runs/45089812634): clang formatting check flagged one overlong `std::printf` in `factory.cpp`. Formatting corrected in `ecf9629`. This was a CI formatting failure rather than a native compiler failure.
- Final validation remains required on the latest review head: green native build/format job, green `wasm-vanillatd`/`stock-engine`, and report-only `stock-scenario` audit showing the furthest reached event. No M2b work started.

## Session M2b

- Branch: `m2b/theater-roster-scenario`, branched from `vanilla` at `dbfb0c334bbda1b8c9132211fbddb21175566123`.
- Entry condition: M2a [PR #57](https://github.com/chucklowery/World-Conquer/pull/57) merged at `dbfb0c334bbda1b8c9132211fbddb21175566123`.
- M2a baseline: [browser run 45098472157](https://github.com/chucklowery/World-Conquer/actions/runs/45098472157) completed with `wasm-vanillatd`, `stock-engine`, and report-mode `stock-scenario` all successful. `stock-scenario` reported `scenario.loaded` and 163 misses. Latest `vanilla` baseline run [45100216241](https://github.com/chucklowery/World-Conquer/actions/runs/45100216241) was still running at this checkpoint.
- Build loop: CI-only. GitHub checkout is unavailable in this environment (DNS resolution failure); Emscripten/Chromium and native host tests cannot be executed here.

### Phase 4 — theater, terrain and resource

- Status: **partial**. Added the geometry-only 32-byte TD icon-set writer/reader, JavaScript round-trip fixture, and generated `TEMPERAT.MIX`/`TEMPICNH.MIX` with clear and reference-water tiles. Hooked both generated archives into the unified pack with provenance.
- Commit SHA: `06efee38997c8d1ace12af6d29d45bcb932dfca9` (implementation checkpoint; this log update follows).
- Commands/results: reviewed `tiberiandawn/tile.h:55-69`, `tiberiandawn/iconset.cpp:72-149`, `common/stamp.cpp:84-102`, and `tiberiandawn/display.cpp:335-404`; local build and test unavailable (no clone). `node tools/content/test-iconset.js` and pack CI validation still unverified.
- CI: [M2b browser workflow](https://github.com/chucklowery/World-Conquer/actions/workflows/browser-engine.yml) (first branch run pending).
- Open issues: host *engine-backed* icon-set test has not been added; the loader's exact template archive member set and the terrain/radar drawing remain unverified. Resource overlays, theater-specific trees/smudges and complete color contracts still need work. The 163 scenario misses require audit classification. The files written in this phase are original generated schematics; no proprietary art was used.

### Phase 5 — playable roster with frame contracts

- Status: **partial**. Recorded code-backed exact accessed-frame minimums for rifle infantry (532) and tank body/turret (64); retained the tank's 192-frame generated safety margin and unverified building/vehicle contracts as provisional. Added `docs/browser/M2_ROSTER_CONTRACTS.md` identifying ten slice slots and outstanding animation contracts.
- Commit SHA: `f4b00c0d42297e833ce820b166cfd002b50722bd` (documentation checkpoint; phase log commit follows).
- Commands/results: source inspection of `idata.cpp:63-98`, `infantry.cpp:629`, `unit.cpp:2195-2245`, `building.cpp:503-560`, `bdata.cpp` and `udata.cpp`; runtime test and shape build not run locally.
- CI: https://github.com/chucklowery/World-Conquer/pull/58/checks (PR checks not yet final).
- Open issues: exact animation contracts for the rest of the slice, cameo/sidebar/radar/power controls, resource overlay stages, and effects remain unverified. No newly authored cameo frames were completed. See the source-audited contract table.

### Phase 6 — scenario generator and M2 map

- Status: **partial** pending PR-head CI. Added `tools/content/scenario.js`, editable `game/content/scenarios/foundry-test-range.json`, and `test-scenario.js`. Generator emits source-owned `SCM94EA.INI` and `SCM94EA.BIN`; the `pack.js` pipeline includes both with CC0 provenance. Two start waypoints (cell 650 at (10,10) and cell 3445 at (53,53)), two crystal overlay patches, two trees and a two-cell water reference are authored.
- Commit SHA: `a84fc63e8e1de3cedba6bdcbfe1ca4cf94ef1a6c` (latest implementation checkpoint; phase log commit follows).
- Commands/results: derived 4096 × (one-byte `TemplateType` + one-byte `TIcon`) from `tiberiandawn/defines.h:1089` and `tiberiandawn/map.cpp:1076-1165,1206-1258`; map section and waypoints from `display.cpp:1273-1346`; unit format from `unit.cpp:3770-3819`. Node and C++ checks now wired to CI, not locally executed. The full `MapClass` and `CCINIClass` host load test has not been completed.
- CI: https://github.com/chucklowery/World-Conquer/pull/58/checks (pending); previous completed M2a report-only run https://github.com/chucklowery/World-Conquer/actions/runs/45098472157 reached `scenario.loaded` on the *probe stub*, not on this M2 map.
- Open issues: require a successful branch-head `stock-engine` and `stock-scenario` run on the generated map; check required misses and screenshot; the map's resource draw and radar are unverified. The C++ icon-set accessor test has not yet returned an outcome.

### M2b close-out — provisional handoff to M2c (gate pending)

- **Current result: partial, not accepted.** The generated map has not yet been demonstrated to reach `[browser-game] scenario.loaded=` on the M2b PR head. Do not treat report-mode CI job success alone as evidence of the gate.
- M2b work is confined to phases 4–6: original temperate icon-set/identity lookup generation, roster frame-contract audit, and a two-start INI/BIN generator. No M2c phases or roadmap evidence were started.
- **Last M2a Chromium audit (run 45098472157, not an M2b result):** the stub `SCM94EA.INI` reached `scenario.loaded` and reported **163 misses**. Most are optional audio/movie files and multiplayer picker probes. The relevant scenario-path misses include `TEMPERAT.MIX`, `TEMPICNH.MIX`, `SCM94EA.BIN` and temperate fading tables; generated sources now supply these except `TCLOCK.MRF`, which still requires format research. The new pack's actual miss list must be regenerated.
- **Visual handoff:** M2a's after-confirm screenshot is predominantly black; no trustworthy visible terrain/radar, sidebar/cameo placement or object-quality observation on the new map exists yet. Thus there are no verified sidebar or cameo game-coordinate positions to pass forward.
- **Map starts:** waypoint 0 at (10,10), cell 650; waypoint 1 at (53,53), cell 3445. Resource fields near (15,12) and (48,51), two schematic trees and two water-reference cells near (31,31).
- **Unverified contracts:** icon-set C++ host test and generated INI/BIN have not been confirmed by successful CI; `MapClass`/INI genuine host reader test still absent. Building animation/docking frames, `*MAKE` frames, sprites/cameos, HUD, special effects and growth-stage overlay data remain provisional. The 10 roster entries and source notes are in `docs/browser/M2_ROSTER_CONTRACTS.md`.
- **CI:** current M2b PR checks https://github.com/chucklowery/World-Conquer/pull/58/checks ; the browser run head must be rechecked after this log commit. `stock-engine` on `vanilla` was green in M2a run 45098472157. No local Emscripten build or Chromium execution is available.
- **Owner review:** do not merge M2b until its acceptance gate is verified. Keep original generated placeholders; never import proprietary art or game data. M2c must not start on an unverified M2b gate.

### M2b post-audit Phase 4 corrections

- M2a's downloaded `stock-scenario-audit.json` (artifact 14783878902) showed temperate archive, BIN and 10 fading-table misses in addition to optional picker/audio misses. Added original 256-byte and multi-plane identity remap tables (`TGREEN.MRF` through `TLIGHT.MRF`; exact sizes from `display.cpp:415-490`, `defines.h:1929-1931`) and corresponding requirements.
- Added source-generated theater-specific 16-frame `TI1.TEM`–`TI12.TEM` growth/adjacency stand-ins and `T01.TEM` 16-frame tree stand-in, with requirements. The archive generator now includes those alongside the two icon sets. Source references: `odata.cpp:162-353,828-875`, `tdata.cpp:77`, `terrain.cpp:357`.
- Implementation checkpoint: `344f1982f9d894a0e8b281f2383a3940d5177ee9`. Changes are unverified against the browser renderer; `TCLOCK.MRF` was not generated (unknown file contract). Re-run PR-head CI after this log update. All binaries remain generated in CI, not committed.

### M2b CI acceptance evidence — 2026-11-22 (America/Denver)

- Browser run: https://github.com/chucklowery/World-Conquer/actions/runs/45101868936 at code head `7f42b636d52af55579a7e4adf221860a1e9915c6`: **`wasm-vanillatd` success, `stock-engine` success, `stock-scenario` success**.
- Node tests: `node tools/content/test-iconset.js` → PASS; `node tools/content/test-scenario.js` → PASS. Stock C++ icon-set accessor fixture linked against `build/native/common/libcommon.a` → PASS (wasm-vanillatd job). `node tools/content/test-pack.js` → deterministic PASS, 268/268 declared requirements generated.
- Chromium observation (stock-scenario artifact `14785368445`, `stock-scenario-audit.json`): `stage=scenario.loaded`; last game line `[browser-game] scenario.loaded=SCM94EA` on generated INI/BIN; `fatal=null`; `pageErrors=[]`. This confirms **M2b's scripted scenario-load gate**, not a playable or fully visible match.
- Missing lookups: 150, improved from M2a's 163. The precise 13 eliminated names are `temperat.mix`, `tempicnh.mix`, `tgreen.mrf`, `tyellow.mrf`, `tred.mrf`, `tmouse.mrf`, `ttrans.mrf`, `twhite.mrf`, `tshadow.mrf`, `tunits.mrf`, `tshade.mrf`, `tlight.mrf`, `scm94ea.bin`. The 150 remaining misses are for further auditing in M2c; zero misses are **not** claimed.
- Caveat: engine source-backed binary INI/BIN *host* parser test, full resource animation/hud/cameo verification, terrain/radar rendering and gameplay remain incomplete. The browser screenshot is not evidence of a playable match. M2b delivered only the phase 4–6 source-built placeholder path.
- This evidence was recorded in the log as a documentation-only closeout commit after the successful code-head run. Final PR-head CI must be rechecked after this commit before readiness is concluded.

### M2b final CI integration corrections

- After the initial successful browser scenario-load run, native Linux `clang-format` identified a style-only diff in `tests/test-m2-iconset.cpp`. Applied the formatter's exact output; no test logic changed (`3a1df6bcc26ed021e4400d0e3ff90f209e5ab5b2`). The earlier Linux matrix also reported all 12 functional native tests passed before the formatting check.
- Provenance now records both `encode-iconset.js` and `encode-shape.js` for source-generated theater archives (implementation `fd894b97d67da6fa01d86d883b8c94ee41a41c9c`).
- **Final head evidence pending:** a fresh PR-head CI is required for the formatting and provenance corrections. Prior successful engine/browsers at `7f42b636d52af55579a7e4adf221860a1e9915c6` remain documented above. Do not infer passing final head until those checks complete.
- **M2b session gate already observed on the implementation head**; ready-for-review transition occurs after the new final-head `stock-engine` and `stock-scenario` jobs are verified. Remaining 150 misses are a M2c follow-up, not a zero-miss claim.

### PR #58 review corrections (supersedes earlier MRF claims)

Six reviewer threads (2026-11-23) were addressed on `m2b/theater-roster-scenario`:

- **Clear-tile safety:** `CLEAR1.TEM` now encodes **16 logical map slots** (each referencing one original 24×24 image), covering `Clear_Icon()` 0–15. The `CLEAR1.TEM` requirement now distinguishes 16 logical icons from 1 unique image.
- **Fading table clarification:** the non-`_RETRIEVE` stock engine generates and **writes**, rather than reads, the ten `T*.MRF` fading tables in `display.cpp:415-490`. Removed our ten unnecessary placeholder MRF files and ten incorrect required-content entries. The earlier claim that ten MRF misses were resolved by supplying required original data **was inaccurate**. Earlier M2b audit showed **163 → 150 total lookup misses**, but only **three** eliminated names are demonstrated newly supplied loadable game assets: `TEMPERAT.MIX`, `TEMPICNH.MIX`, and `SCM94EA.BIN`. The other ten were write-path lookups, not missing input assets. The aggregate count is not a measure of delivered content; it must be remeasured following removal.
- **Scenario validation:** every terrain template, waypoint, overlay, tree and unit must lie inside the declared map rectangle in addition to the legal global grid. Added boundary failure tests, including a small-map off-map start waypoint.
- **Obsolete fixture:** removed unused `game/content/pack/scenario-probe.ini`. The maintained authored source is `game/content/scenarios/foundry-test-range.json`.
- **MIX coverage:** `test-theater.js` extracts real members from the generated `TEMPERAT.MIX` and `TEMPICNH.MIX`; checks the identical 15-member inventories, 16-slot clear map, 1-slot water iconset, all twelve 16-frame resource sprites, and 16-frame tree. The browser CI pack step runs this test.
- **Decoder hardening:** `decodeIconset` now rejects empty image sections and overlapping trans-flag/map spans, with negative tests.

**Evidence:** earlier run `45102805481` is pre-review and does not validate these changes. Review-fix CI and Chromium scenario-load checks must pass on the review-fix head before calling them verified. The source-generated placeholders remain original; gameplay, HUD and zero-miss gate are outside M2b.

## Session M2c

- Branch: `m2c/playable-match`, branched from `vanilla` at `6db6bcd4155131bce122df4f225033cadc5fcb6f`.
- Entry condition: M2b [PR #58](https://github.com/chucklowery/World-Conquer/pull/58) merged; review-fix [run 45108622499](https://github.com/chucklowery/World-Conquer/actions/runs/45108622499) reported green `wasm-vanillatd`, `stock-engine`, `stock-scenario`.
- Build loop: CI-only in the GitHub connector environment; local Emscripten, native toolchain and Chromium builds are not available.
- Scope: Phases 7–9 only. Nothing from M3 or M5 is included.

### Phase 7 — battlefield and runtime asset classification

- Status: **partial**; no claim that a playable battlefield, radar, or sidebar renders correctly.
- Implementation checkpoint: `961c89932c1b30d22fe96863cab52eac405e7abc`.
- Change: Chromium audit now categorizes file lookup misses using committed `requirements.json` contracts into required, optional and unclassified, retaining unknown misses rather than silently treating them as optional. Strict-mode predicate now requires `scenario.loaded` and zero required/unclassified misses when enabled.
- Commands/results: repository source inspected via the GitHub connector. No local pack generation, Chromium execution, or Node test occurred; CI output is not yet available on this branch.
- CI: pending M2c PR-head run. **Report-only remains enabled** until asset rendering and zero required misses are established.
- Open issues: prior M2b review-fix audit reports 160 lookup events including self-generated fading-table write requests; exact runtime classification and screenshots are not yet available. Phase 7 gate, Phase 8 interactive play, and Phase 9 exit evidence remain unverified. These are not completed phases.

- Phase 7 follow-up checkpoint: `291d950d22dd622be0ec4b5efed15b1c1e7a0c54` corrected the path separator regular expression and a literal newline escape in the strict predicate. JavaScript source parsing with V8 `Function` (after removing the Node shebang) → PASS. This is syntax validation only, not a Node/Chromium run. [First PR workflow batch](https://github.com/chucklowery/World-Conquer/actions/runs/45116942529) still in progress when checked; it predates this correction.
