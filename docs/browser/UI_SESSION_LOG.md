# UI session log

## Session UI-A

2026-11-23 — Phase 0: branch created from vanilla. M1 and M2 exit evidence recorded in docs/ROADMAP.md (Actions runs 45077613546 and 45167410607). Reviewed AGENT_GUIDE, ADR-0003 and UI milestone. No engine or pack changes. Baseline build and stock-engine rerun not executed in this connector session; acceptance remains pending.

### Progress and revised design

- Phase 1: 2a7180a, 5744be0 — initial inventory and refined cursor, radar, power, production contracts. Unverified dimensions, localized variants and palette consumers remain open.
- Phase 2: c8c50d4, 9f8778f, b70aded, 93784fa — provisional palette, semantic blacksite tokens and contrast checks. Direct calculation of existing pack wireframe translation: 140,97,42,170,41,110,255; no overlap with proposal. Direct RGB calculations pass dedicated gauge luminance separation in normal vision, protanopia and deuteranopia. Full generated asset and remap collision audit not done; indices remain provisional. No palette or pack runtime changes.
- Phase 3: 6b0d5ba, 904231a, fe50300, ea08396, 062055b — deterministic preview source, tests, audited coordinates, angular chrome and gauge patterns. 9cbdb3f adds design tests and preview generation to browser-engine workflow. Commands: node tools/content/ui/test-ui-spec.js; node tools/content/ui/mockups.js build/ui-mockups. Full Node suite and stock-engine gate not yet observed passing on PR head.
- Owner revised visual criteria: d484768, 7d87cb4; matte charcoal, selective crimson/cyan, thin angular framing. Design targets are separate from indexed allocation. Preserve engine geometry and original assets.
- Draft PR: https://github.com/chucklowery/World-Conquer/pull/64. No UI-B work until UI-A gate passes and PR merges. Remaining blockers: complete slot dimensions and palette consumers, verify quantized colors and actual generated asset indices, review preview artifacts and CI, record final head evidence. No engine or production pack edits.

### Palette impact and CI evidence

- Head d5e96d5: browser run https://github.com/chucklowery/World-Conquer/actions/runs/45311971224 reported UI design validation and wasm-vanillatd successful; Linux, Windows, MinGW and legacy regression also successful. Stock-engine, stock-scenario, AI match and macOS were not complete at observation. This is historical evidence, not final-head acceptance.
- 79cbe85, a5e7047: audit-palette-impact.js simulates six-bit palette encoding and fading-table differences. Unprotected candidate translations change 140 to 218 and 255 to 227. Protect reserved UI indices in the world-art translator in UI-B, and verify regenerated fading tables against existing gameplay. No runtime modifications in UI-A.
- be4cc66: CI runs audit and publishes ui-design-evidence (six SVG previews and palette-impact.json). New-head results not yet verified. Full slot dimension and engine remap consumer audit remains outstanding; PR stays draft.

### Close-out (2026-11-24)

- Phase 4: contracts the later generators depend on (tabs, sidebar halves, command buttons, radar animation per house suffix, power gauge, drain marker, strip logo, scroll arrows, clock, pips) re-read from the draw code and recorded in UI_SPEC.md "UI-A close-out". Radar frame 0 is the "no radar" plate (radar.cpp:472), not an absent frame. Remap-table collision test added to test-ui-spec.js.
- Local verification (Emscripten 3.1.68, SDL2 2.28.4): VanillaTD wasm built; `node tools/content/pack.js build build/browser-engine/data` → 748/748 required files; `STOCK_SCENARIO_PAGE='vanillatd.html?play' node browser/engine/check-stock-scenario.js` → exit 0, scenario loaded, 0 required / 0 unclassified misses, all gameplay steps reached; `node tools/content/ui/test-ui-spec.js` → pass.
- Status: done. Hand-off to UI-B.

## Session UI-B

Entry condition: UI-A complete on this branch (stacked; the UI-A PR is not yet merged), M2 exit gate evidenced on `vanilla` (ROADMAP.md, run 45167410607).

- Phase 1 (generator scaffold): `tools/content/ui/raster.js` (indexed primitives, original 5×7 capitals), `ui-colors.js`, `build.js` (encodes through `encode-shape.js` and writes into the pack content stage ahead of placeholders; `pack.js` records `tools/content/ui/*.js` as the member generator), `preview.js` (PNG contact sheets through the shipped palette) and `compose.js` (chrome composed at engine coordinates and draw order). Palette allocated: `boot-colors.js` applies `ui/palette.json` (216–232, 238, 239); `pack.js` keeps the wireframe translation off those indices; the translation is unchanged ([140,97,42,170,41,110,255], asserted).
- Phases 2–4 (frame, tabs, strip, radar, buttons, power): `tools/content/ui/chrome.js` generates HSIDE1/2, HTABS, HSTRIP, HSTRIPUP/DN, HRADAR.GDI (Aster cyan) and HRADAR.NOD (Forge crimson) with all 42 frames, HREPAIR/HSELL/HMAP (up/on, sunk-and-lit, disabled), HPWRBAR (empty, normal solid, low diagonal, critical cross-hatch) and the HPOWER drain marker. Contracts recorded in requirements.json (`generator: "ui"`, `minFrames` enforced by pack.js). SHP files have one size per file, so the 100 px upper gauge pieces are padded to 124 rows with transparent rows.
- Phase 5 (tests and evidence): `node tools/content/ui/test-ui-chrome.js` (contracts, round trip, palette discipline, state distinctness, radar shutter monotonicity, gauge seam). `browser/engine/ui-chrome-probes.js`, called from check-stock-scenario.js after the sidebar appears: 9 pixel probes at spec coordinates; REPAIR and SELL clicks read back off→on→off from the engine's reflected button frame; MAP toggles the radar well and restores it. Any `[asset-miss]` for a `generator: "ui"` file fails the run.
- Local result: pack 749/749; `STOCK_SCENARIO_SKIP_GAMEPLAY=1 STOCK_SCENARIO_PAGE='vanillatd.html?play' node browser/engine/check-stock-scenario.js` → status scenario-request, 0 required / 0 unclassified misses, 0 UI misses, all probes ok, `[ui-chrome] REPAIR off->on->off`, `SELL off->on->off`, `MAP changed=true restored=true`. Screenshots at 1100 px: stock-scenario-ui-chrome.png, -ui-repair-on.png, -ui-map-toggled.png (CI artifact stock-scenario-audit).
- Note: no engine C++ changed. Cameos on the strip are still M2 placeholders (UI-C).
