# Milestone: state-aware, original-art tactical placeholders

Seven engine-facing resources now have **procedural, distributable, palette-indexed placeholder animation**: the six audited [representative classes](REPRESENTATIVE_FRAME_CONTRACTS.md) plus the construction yard's separately loaded `FACTMAKE.SHP`. The 23 independently linked state previews below are checked-in SVGs; the browser build emits native tactical SHP frames from the same generation code. No commercial artwork is used or required.

**Scope boundary:** these are engine-loadable diagnostics, **not signed-off final art**. Placeholder canvas sizes, pivots, resource palette/remaps, hit effects and some animation counts remain provisional. The other 289 primary catalog slots still use generic procedural wireframes. The [full 295-slot checklist](WIREFRAME_REPLACEMENT_CATALOG.md) remains the replacement inventory.

## Shared final-art handoff specification

- **Authored source:** For each primary resource, place one `0000.png` … `NNNN.png` per frame in `game/content/wireframes/final/WF-####/`, and create `ATTRIBUTION.json` alongside them. For `FACTMAKE`, use `game/content/wireframes/final/supplemental/FACTMAKE/`. No final PNGs are shipped at this stage.
- **Provenance:** `ATTRIBUTION.json` must contain nonempty string values for `creator`, `license`, `source`, and `revision`. The code enforces their presence but **not the legal suitability of a license**; obtain permission and record evidence before distributing third-party art. Prefer wholly original authored artwork with a clearly stated redistribution license.
- **Pixel contract:** All frames for a resource have exactly the dimensions and count in the table below **until a source-anchored contract revision is approved**. Use 8-bit RGBA PNGs with project palette colors from [`placeholder.palette.json`](../../game/content/source/placeholder.palette.json), alpha 0 only for transparent index 0, alpha 255 for other pixels, no resampling, antialiasing, partial alpha or off-palette colors. The importer maps PNGs to palette indices and writes tactical SHP with LCW keyframes. The `.PAL` output has 256 RGB6 entries; only 8 colors are in the current authored palette.
- **Registration and framing:** Keep the center/body anchor stable at 1×. Do not change the weapon muzzle, feet, shadow, firing pivot, turret joint or 3×2 construction-yard footprint between frames. Existing 24/32/48 pixel canvases are provisional; verify offsets against engine `Draw_It`, `CC_Draw_Shape`, footprint and render calls before setting a final canvas contract.
- **Runtime acceptance:** Compare compositing, orientation, order and time progression on native and Chromium rendering. Verify focus/selection bounds, team-color remap, transparent pixels, damage behavior, stage wrap and animation reversal. A valid SHP header and a rendered debug probe do **not** certify these behaviors.
- **Build:** `node tools/content/representative-contracts.js generate`, `node tools/content/wireframes.js generate`, `node tools/content/test-representative-animation.js`, and `node tools/content/wireframes.js build <unused-directory> --representative`. The browser loader validates and stages `/game/FACTMAKE.SHP` together with the six class resources and palette; hashes are checked before any files are written to MEMFS.

| Resource | Slot / engine usage | Current per-frame canvas | Placeholder frames | PNG replacement directory |
|---|---|---:|---:|---|
| `E1.SHP` | `WF-0185` / infantry | 24×24 | 532, from `MiniGunnerDos` | `final/WF-0185/` |
| `MTNK.SHP` | `WF-0289` / tank | 32×32 | 192 | `final/WF-0289/` |
| `ORCA.SHP` | `WF-0004` / aircraft | 32×32 | 80 | `final/WF-0004/` |
| `FACT.SHP` | `WF-0013` / construction yard | 48×48 | 128 | `final/WF-0013/` |
| `FACTMAKE.SHP` | `supplemental.fact-buildup` / construction yard | 48×48 | 24 | `final/supplemental/FACTMAKE/` |
| `T01.SHP` | `WF-0256` / tree | 32×32 | 32 | `final/WF-0256/` |
| `ART-EXP1.SHP` | `WF-0072` / explosion | 32×32 | 128 | `final/WF-0072/` |

## Independent state previews and replacement criteria

### Infantry `E1.SHP` — `WF-0185`

The engine adds `DoControls` start offsets and eight-facing strides to form the frame index. The [source-derived 34-action table](REPRESENTATIVE_FRAME_CONTRACTS.md#wf-0185) governs **all 532** frames, including unused/aliased frame ranges. Final art must render natural action transitions without visible teleporting, keep feet and weapon pivot fixed, and address all eight facings; `DO_PRONE` and `DO_FIRE_PRONE` can reference overlapping pixels and require joint artistic review.

- [ ] **[E1 standing, frame 0](../../game/content/wireframes/states/WF-0185-stand.svg)** — neutral combat-ready silhouette; verify head, torso and centered ground contact.
- [ ] **[E1 walking, frame 16](../../game/content/wireframes/states/WF-0185-walk.svg)** — first frame of a six-frame cycle at eight facings; complete the foot cycle and arm swing without pivot drift.
- [ ] **[E1 firing, frame 66](../../game/content/wireframes/states/WF-0185-fire.svg)** — eight-frame firing sequence at eight facings; make recoil, muzzle flash and weapon hand readable; align actual projectile origin.
- [ ] **[E1 prone, frame 192](../../game/content/wireframes/states/WF-0185-prone.svg)** — use the common prone/fire-prone frame region; define crawl, lie-down and stand-up transitions and low-body selection bounds.
- [ ] **[E1 fire death, frame 424](../../game/content/wireframes/states/WF-0185-death.svg)** — remove upright pose over the 18-stage death sequence; confirm disposal, overlap and damage timing.
- [ ] **[E1 salute, frame 511](../../game/content/wireframes/states/WF-0185-salute.svg)** — gesture at an eight-facing offset; verify all 34 `DoType` behaviors, not just the six preview states.

### Medium tank `MTNK.SHP` — `WF-0289`

Body frames `0..31` and **independent turret layer** frames `32..63` share a file. Turret frames must have transparent hull pixels so the engine can rotate it separately. Align all 32 facing angles to the same center and test joint/pivot, color remap, muzzle location, recoil and track silhouettes. Frames `64..191` are placeholder reserve, not a verified animation contract.

- [ ] **[Tank hull north, frame 0](../../game/content/wireframes/states/WF-0289-hull-north.svg)** — body, treads and turret attachment zone, but no composited firing turret.
- [ ] **[Tank hull east, frame 8](../../game/content/wireframes/states/WF-0289-hull-east.svg)** — rotated body with unchanged ground pivot, size and collision footprint.
- [ ] **[Tank turret north, frame 32](../../game/content/wireframes/states/WF-0289-turret-north.svg)** — weapon barrel/pivot **without tracks or hull**; confirm the two SHP layers blend.
- [ ] **[Tank turret east, frame 40](../../game/content/wireframes/states/WF-0289-turret-east.svg)** — independent heading; verify aiming, barrel extension, weapon center and shadow order.

### Orca `ORCA.SHP` — `WF-0004`

The engine chooses one of two 32-heading banks according to speed. The mock flight sprite changes swept-wing and thrust shape between modes. Final artwork needs distinct speed legibility, facing progression, shadow/altitude checks, rotor/door specifics and weapon hardpoints. The final 16 placeholder frames `64..79` are **not** proven gameplay sequences.

- [ ] **[Orca cruise, frame 0](../../game/content/wireframes/states/WF-0004-cruise.svg)** — first of 32 normal-speed headings; test aircraft center/shadow registration.
- [ ] **[Orca high-speed, frame 32](../../game/content/wireframes/states/WF-0004-high-speed.svg)** — matching first heading in the high-speed bank; maintain a common weapon pivot while visibly shifting propulsion mode.

### Construction yard `FACT.SHP` — `WF-0013`, plus `FACTMAKE.SHP`

The C++ `STRUCT_CONST` state table assigns **idle frames `0..3`** and **active frames `4..23`** in `FACT.SHP`. Separately, `building.cpp` selects `Get_Buildup_Data()` for construction, and `bdata.cpp` loads `FACTMAKE.SHP` and derives its frame count and animation rate. Deconstruction plays that separate sequence backward. The synthetic **24-frame** buildup is a replacement target, *not an audited original expected length*. Resolve foundation 3×2 cells, bib, doors, smokestacks, selection geometry, damage and construction/deconstruction completion in actual scenes.

- [ ] **[Yard idle, frame 0](../../game/content/wireframes/states/WF-0013-idle.svg)** — normal building, ground contact and stable footprint.
- [ ] **[Yard active, frame 5](../../game/content/wireframes/states/WF-0013-active.svg)** — production indicator in the active bank; validate stages `4..23` and engine animation rate 3.
- [ ] **[FACTMAKE foundation, frame 0](../../game/content/wireframes/states/WF-0013-buildup-start.svg)** — initial pad/foundation layer; no instantaneous full-height silhouette.
- [ ] **[FACTMAKE partial assembly, frame 12](../../game/content/wireframes/states/WF-0013-buildup-mid.svg)** — scaffold and raised components at the same anchor.
- [ ] **[FACTMAKE complete, frame 23](../../game/content/wireframes/states/WF-0013-buildup-finish.svg)** — full construction and a seamless transition into `FACT.SHP`; validate reverse progression on deconstruction. All 24 frames need final art plus a separate attribution file.

### Tree `T01.SHP` — `WF-0256`

The terrain engine tests damage strength and may enter crumbling frames. Check theater-specific variants, cell occupancy, crown transparency and trunk anchoring. The exact crumbling stage range and rate still need engine audit.

- [ ] **[Tree healthy, frame 0](../../game/content/wireframes/states/WF-0256-healthy.svg)** — undamaged foliage and trunk.
- [ ] **[Tree damaged, frame 1](../../game/content/wireframes/states/WF-0256-damaged.svg)** — visibly degraded crown without translating the base.
- [ ] **[Tree crumbling, frame 9](../../game/content/wireframes/states/WF-0256-crumbling.svg)** — progressive collapse; audit all stage indices and final disposal.

### Artillery impact `ART-EXP1.SHP` — `WF-0072`

The engine computes `Start + Fetch_Stage()`, and the class declares dynamic stages (`-1`), so **the emitted SHP frame count affects runtime effect duration**. The 128-frame placeholder is only a scaffolding allocation; select and audit the finished effect's intended time budget before approving artwork. The projectile/sound dependencies (including `VOC_XPLOSML2`) remain missing.

- [ ] **[Explosion ignition, frame 0](../../game/content/wireframes/states/WF-0072-ignition.svg)** — nonempty initial flash with a centered impact point.
- [ ] **[Explosion blast, frame 16](../../game/content/wireframes/states/WF-0072-blast.svg)** — distinct spreading ring; coordinate debris, scorch mark and perceived radius.
- [ ] **[Explosion fade, frame 86](../../game/content/wireframes/states/WF-0072-fade.svg)** — fading embers and transparent edge; match engine disposal and sound cue, then replace the provisional duration.

## Automated milestone checks

1. `test-representative-animation.js` checks state visual differences, deterministic indexed output, transparent pixels, turret-only compositing and the committed SVG preview bytes.
2. `test-representative-contracts.js` rebuilds class frame-index contracts from source and checks them against the committed JSON.
3. `test-wireframe-asset.js` checks a seven-shape-plus-palette MEMFS pack, including required `FACTMAKE` metadata, SHA-256, decoded frames and rollback-before-write on malformed input.
4. Browser CI also decodes selected SHP frames with native LCW and draws the six representative resources in the Emscripten tactical renderer. It does not boot a complete game or validate real mission state transitions.

**Next gate:** replace one of the seven placeholders with a complete original frame set, verify all class-specific states/anchors in an actual scenario, and then repeat the art approval workflow for the remaining resources. Full terrain, overlays, audio, UI and missions are separate blockers before a stand-alone game is playable.
