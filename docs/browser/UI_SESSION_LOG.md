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
