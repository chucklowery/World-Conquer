# World-Conquer: Original wireframe asset replacement catalog

> Generated original placeholder art. No Electronic Arts media is included. `WF-####` identifiers stay stable only while the upstream enumeration and sorting remain unchanged; use `engineEnum` for persistent game mappings.

This catalog contains **295 independently linked asset slots** derived from Tiberian Dawn C++ class definitions. The preview is the generated placeholder's first frame.

The [original first-pass art gallery](ART_FIRST_PASS.md) groups all 295 slots into browsable category sheets and identifies remaining visual dependencies. [WF-0002's authored cargo art](WF_0002_CARGO_ART.md) is the first 80-frame draft replacement. The [state-aware representative animation milestone](REPRESENTATIVE_ANIMATION_MILESTONE.md) adds 23 linked state previews and separate `FACTMAKE.SHP` buildup instructions.

## Replacement workflow

1. Open an individual `WF-####` SVG below. It is a design guide, not a request to redraw copyrighted artwork.
2. Create newly authored **palette-constrained pixel art** using the project-owned palette. Index `0` is transparent. Dimensions and frame counts here are **provisional build contracts** until each class's production frame lookup, footprint and anchor are audited against C++.
3. Export one numbered 8-bit RGB/RGBA PNG per frame, starting `0000.png`, using exact palette colors. Use consistent dimensions, transparent alpha for index 0, no interpolation and no semitransparent pixels.
4. Add `ATTRIBUTION.json` to that folder with `creator`, `license`, `source`, and `revision` (all nonempty strings). Run `node tools/content/wireframes.js build <new-output-dir>`. The builder automatically uses final PNGs instead of wireframes; it validates frame dimensions/count, palette colors and provenance.
5. Verify generated SHA-256 and native LCW decode; then test actual class state sequences (facings, combat, movement, damage, construction, death) in Chromium and a native build.
6. For terrain overlays, theater icons and other special formats, complete the format adapter before treating the art as runtime-compatible. `design-only` items are not yet game-ready.

## Shared technical contract

| Field | Requirement |
|---|---|
| Palette | 256 entries × RGB6, 768-byte `.PAL`; index 0 transparent; project-owned color definitions |
| Tactical SHP | `KeyFrameHeaderType`, little-endian 8-byte frame table, LCW full-keyframes initially |
| Canvas | The recorded width/height are generated-placeholder dimensions, **not verified original-game dimensions**. Fix dimensions and camera pivots after reviewing actual sprite lookup, weapon muzzle offsets and theater footprint. No resampling between states |
| Facing | 32 heading directions for vehicles/aircraft; infantry uses its `DoControls`; buildings/terrain/effects follow state-specific offsets |
| Replacements | New artwork and provenance, collision/hitbox and remap tests, frame timing, silhouette legibility at 1× |
| Runtime | A generated SHP that parses is **not** enough: verify class-specific lookup and frame selections, including damage and special states |
| Build outputs | `node tools/content/wireframes.js build <new-output-dir>`; output is generated, never committed as source media |
| Per-slot audit gate | Before marking final: determine exact frame offsets and order, frame timing, selection bounds, rendered offset, image dimensions, turret/door/rotor layers, shadows, remap range, theater variation and native/browser parity from engine use sites. Record verified changes in the catalog generator |

### Engine filename conflicts

Some engine classes share the same resource filename (for example a building and an overlay). The build emits an individual categorized SHP for each item but copies **only unambiguous filenames** into `game-root/`. Shared-filename items must be reconciled into one final resource and tested against every referencing class; do not blindly overwrite one with another.

## Aircraft (5)

32 body headings; additional flight, rotor, door and movement states per aircraft class. Keep the center point and shadow distinct and preserve transparent index 0.

- [ ] **WF-0001 — a10** · [View placeholder](../../game/content/wireframes/previews/WF-0001.svg) · engine slot `AIRCRAFT_A10` ([`tiberiandawn/aadata.cpp:55`](../../tiberiandawn/aadata.cpp#L55), `AttackPlane`).
  - **Engine target:** `A10.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 80 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0001/0000.png` through `0079.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match aircraft state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0002 — cargo** · [View placeholder](../../game/content/wireframes/previews/WF-0002.svg) · [Authored cargo art draft](WF_0002_CARGO_ART.md) · engine slot `AIRCRAFT_CARGO` ([`tiberiandawn/aadata.cpp:219`](../../tiberiandawn/aadata.cpp#L219), `CargoPlane`).
  - **Engine target:** `C17.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 80 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0002/0000.png` through `0079.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match aircraft state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0003 — helicopter** · [View placeholder](../../game/content/wireframes/previews/WF-0003.svg) · engine slot `AIRCRAFT_HELICOPTER` ([`tiberiandawn/aadata.cpp:137`](../../tiberiandawn/aadata.cpp#L137), `AttackHeli`).
  - **Engine target:** `HELI.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 80 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0003/0000.png` through `0079.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match aircraft state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0004 — orca** · [View placeholder](../../game/content/wireframes/previews/WF-0004.svg) · [Source-audited frame contract](REPRESENTATIVE_FRAME_CONTRACTS.md#wf-0004) · engine slot `AIRCRAFT_ORCA` ([`tiberiandawn/aadata.cpp:178`](../../tiberiandawn/aadata.cpp#L178), `OrcaHeli`).
  - **Engine target:** `ORCA.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 80 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0004/0000.png` through `0079.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match aircraft state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0005 — transport** · [View placeholder](../../game/content/wireframes/previews/WF-0005.svg) · engine slot `AIRCRAFT_TRANSPORT` ([`tiberiandawn/aadata.cpp:96`](../../tiberiandawn/aadata.cpp#L96), `TransportHeli`).
  - **Engine target:** `TRAN.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 80 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0005/0000.png` through `0079.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match aircraft state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

## Building (66)

Base, production/active, damage, destruction and potentially turret/directional frames. Building footprints and anchors must match the map occupancy definition; the placeholder animation is schematic.

- [ ] **WF-0006 — advanced power** · [View placeholder](../../game/content/wireframes/previews/WF-0006.svg) · engine slot `STRUCT_ADVANCED_POWER` ([`tiberiandawn/bdata.cpp:943`](../../tiberiandawn/bdata.cpp#L943), `ClassAdvancedPower`).
  - **Engine target:** `NUK2.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0006/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0007 — airstrip** · [View placeholder](../../game/content/wireframes/previews/WF-0007.svg) · engine slot `STRUCT_AIRSTRIP` ([`tiberiandawn/bdata.cpp:841`](../../tiberiandawn/bdata.cpp#L841), `ClassAirStrip`).
  - **Engine target:** `AFLD.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0007/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0008 — atower** · [View placeholder](../../game/content/wireframes/previews/WF-0008.svg) · engine slot `STRUCT_ATOWER` ([`tiberiandawn/bdata.cpp:372`](../../tiberiandawn/bdata.cpp#L372), `ClassATower`).
  - **Engine target:** `ATWR.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0008/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0009 — barbwire wall** · [View placeholder](../../game/content/wireframes/previews/WF-0009.svg) · engine slot `STRUCT_BARBWIRE_WALL` ([`tiberiandawn/bdata.cpp:3446`](../../tiberiandawn/bdata.cpp#L3446), `Barbwire`).
  - **Engine target:** `BARB.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0009/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0193.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0010 — barracks** · [View placeholder](../../game/content/wireframes/previews/WF-0010.svg) · engine slot `STRUCT_BARRACKS` ([`tiberiandawn/bdata.cpp:1097`](../../tiberiandawn/bdata.cpp#L1097), `ClassBarracks`).
  - **Engine target:** `PYLE.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0010/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0011 — bio lab** · [View placeholder](../../game/content/wireframes/previews/WF-0011.svg) · engine slot `STRUCT_BIO_LAB` ([`tiberiandawn/bdata.cpp:1046`](../../tiberiandawn/bdata.cpp#L1046), `ClassBioLab`).
  - **Engine target:** `BIO.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0011/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0012 — brick wall** · [View placeholder](../../game/content/wireframes/previews/WF-0012.svg) · engine slot `STRUCT_BRICK_WALL` ([`tiberiandawn/bdata.cpp:3395`](../../tiberiandawn/bdata.cpp#L3395), `Brick`).
  - **Engine target:** `BRIK.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0012/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0194.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0013 — const** · [View placeholder](../../game/content/wireframes/previews/WF-0013.svg) · [Source-audited frame contract](REPRESENTATIVE_FRAME_CONTRACTS.md#wf-0013) · engine slot `STRUCT_CONST` ([`tiberiandawn/bdata.cpp:534`](../../tiberiandawn/bdata.cpp#L534), `ClassConst`).
  - **Engine target:** `FACT.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0013/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0014 — cyclone wall** · [View placeholder](../../game/content/wireframes/previews/WF-0014.svg) · engine slot `STRUCT_CYCLONE_WALL` ([`tiberiandawn/bdata.cpp:3344`](../../tiberiandawn/bdata.cpp#L3344), `Cyclone`).
  - **Engine target:** `CYCL.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0014/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0196.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0015 — eye** · [View placeholder](../../game/content/wireframes/previews/WF-0015.svg) · engine slot `STRUCT_EYE` ([`tiberiandawn/bdata.cpp:213`](../../tiberiandawn/bdata.cpp#L213), `ClassEye`).
  - **Engine target:** `EYE.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0015/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0016 — gtower** · [View placeholder](../../game/content/wireframes/previews/WF-0016.svg) · engine slot `STRUCT_GTOWER` ([`tiberiandawn/bdata.cpp:320`](../../tiberiandawn/bdata.cpp#L320), `ClassGTower`).
  - **Engine target:** `GTWR.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0016/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0017 — hand** · [View placeholder](../../game/content/wireframes/previews/WF-0017.svg) · engine slot `STRUCT_HAND` ([`tiberiandawn/bdata.cpp:1148`](../../tiberiandawn/bdata.cpp#L1148), `ClassHand`).
  - **Engine target:** `HAND.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0017/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0018 — helipad** · [View placeholder](../../game/content/wireframes/previews/WF-0018.svg) · engine slot `STRUCT_HELIPAD` ([`tiberiandawn/bdata.cpp:688`](../../tiberiandawn/bdata.cpp#L688), `ClassHelipad`).
  - **Engine target:** `HPAD.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0018/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0019 — hospital** · [View placeholder](../../game/content/wireframes/previews/WF-0019.svg) · engine slot `STRUCT_HOSPITAL` ([`tiberiandawn/bdata.cpp:994`](../../tiberiandawn/bdata.cpp#L994), `ClassHospital`).
  - **Engine target:** `HOSP.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0019/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0020 — mission** · [View placeholder](../../game/content/wireframes/previews/WF-0020.svg) · engine slot `STRUCT_MISSION` ([`tiberiandawn/bdata.cpp:3240`](../../tiberiandawn/bdata.cpp#L3240), `ClassMission`).
  - **Engine target:** `MISS.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0020/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0021 — obelisk** · [View placeholder](../../game/content/wireframes/previews/WF-0021.svg) · engine slot `STRUCT_OBELISK` ([`tiberiandawn/bdata.cpp:424`](../../tiberiandawn/bdata.cpp#L424), `ClassObelisk`).
  - **Engine target:** `OBLI.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0021/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0022 — power** · [View placeholder](../../game/content/wireframes/previews/WF-0022.svg) · engine slot `STRUCT_POWER` ([`tiberiandawn/bdata.cpp:892`](../../tiberiandawn/bdata.cpp#L892), `ClassPower`).
  - **Engine target:** `NUKE.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0022/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0023 — pump** · [View placeholder](../../game/content/wireframes/previews/WF-0023.svg) · engine slot `STRUCT_PUMP` ([`tiberiandawn/bdata.cpp:2273`](../../tiberiandawn/bdata.cpp#L2273), `ClassV19`).
  - **Engine target:** `V19.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0023/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0024 — radar** · [View placeholder](../../game/content/wireframes/previews/WF-0024.svg) · engine slot `STRUCT_RADAR` ([`tiberiandawn/bdata.cpp:739`](../../tiberiandawn/bdata.cpp#L739), `ClassCommand`).
  - **Engine target:** `HQ.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0024/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0025 — refinery** · [View placeholder](../../game/content/wireframes/previews/WF-0025.svg) · engine slot `STRUCT_REFINERY` ([`tiberiandawn/bdata.cpp:585`](../../tiberiandawn/bdata.cpp#L585), `ClassRefinery`).
  - **Engine target:** `PROC.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0025/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0026 — repair** · [View placeholder](../../game/content/wireframes/previews/WF-0026.svg) · engine slot `STRUCT_REPAIR` ([`tiberiandawn/bdata.cpp:1250`](../../tiberiandawn/bdata.cpp#L1250), `ClassRepair`).
  - **Engine target:** `FIX.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0026/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0027 — road** · [View placeholder](../../game/content/wireframes/previews/WF-0027.svg) · engine slot `STRUCT_ROAD` ([`tiberiandawn/bdata.cpp:1302`](../../tiberiandawn/bdata.cpp#L1302), `ClassRoad`).
  - **Engine target:** `ROAD.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0027/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0198.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0028 — sam** · [View placeholder](../../game/content/wireframes/previews/WF-0028.svg) · engine slot `STRUCT_SAM` ([`tiberiandawn/bdata.cpp:790`](../../tiberiandawn/bdata.cpp#L790), `ClassSAM`).
  - **Engine target:** `SAM.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0028/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0029 — sandbag wall** · [View placeholder](../../game/content/wireframes/previews/WF-0029.svg) · engine slot `STRUCT_SANDBAG_WALL` ([`tiberiandawn/bdata.cpp:3293`](../../tiberiandawn/bdata.cpp#L3293), `Sandbag`).
  - **Engine target:** `SBAG.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0029/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0199.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0030 — storage** · [View placeholder](../../game/content/wireframes/previews/WF-0030.svg) · engine slot `STRUCT_STORAGE` ([`tiberiandawn/bdata.cpp:636`](../../tiberiandawn/bdata.cpp#L636), `ClassStorage`).
  - **Engine target:** `SILO.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0030/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0031 — tanker** · [View placeholder](../../game/content/wireframes/previews/WF-0031.svg) · engine slot `STRUCT_TANKER` ([`tiberiandawn/bdata.cpp:1199`](../../tiberiandawn/bdata.cpp#L1199), `ClassTanker`).
  - **Engine target:** `ARCO.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0031/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0032 — temple** · [View placeholder](../../game/content/wireframes/previews/WF-0032.svg) · engine slot `STRUCT_TEMPLE` ([`tiberiandawn/bdata.cpp:162`](../../tiberiandawn/bdata.cpp#L162), `ClassTemple`).
  - **Engine target:** `TMPL.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0032/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0033 — turret** · [View placeholder](../../game/content/wireframes/previews/WF-0033.svg) · engine slot `STRUCT_TURRET` ([`tiberiandawn/bdata.cpp:475`](../../tiberiandawn/bdata.cpp#L475), `ClassTurret`).
  - **Engine target:** `GUN.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0033/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0034 — v01** · [View placeholder](../../game/content/wireframes/previews/WF-0034.svg) · engine slot `STRUCT_V01` ([`tiberiandawn/bdata.cpp:1355`](../../tiberiandawn/bdata.cpp#L1355), `ClassV01`).
  - **Engine target:** `V01.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0034/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0035 — v02** · [View placeholder](../../game/content/wireframes/previews/WF-0035.svg) · engine slot `STRUCT_V02` ([`tiberiandawn/bdata.cpp:1406`](../../tiberiandawn/bdata.cpp#L1406), `ClassV02`).
  - **Engine target:** `V02.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0035/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0036 — v03** · [View placeholder](../../game/content/wireframes/previews/WF-0036.svg) · engine slot `STRUCT_V03` ([`tiberiandawn/bdata.cpp:1457`](../../tiberiandawn/bdata.cpp#L1457), `ClassV03`).
  - **Engine target:** `V03.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0036/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0037 — v04** · [View placeholder](../../game/content/wireframes/previews/WF-0037.svg) · engine slot `STRUCT_V04` ([`tiberiandawn/bdata.cpp:1508`](../../tiberiandawn/bdata.cpp#L1508), `ClassV04`).
  - **Engine target:** `V04.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0037/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0038 — v05** · [View placeholder](../../game/content/wireframes/previews/WF-0038.svg) · engine slot `STRUCT_V05` ([`tiberiandawn/bdata.cpp:1559`](../../tiberiandawn/bdata.cpp#L1559), `ClassV05`).
  - **Engine target:** `V05.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0038/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0039 — v06** · [View placeholder](../../game/content/wireframes/previews/WF-0039.svg) · engine slot `STRUCT_V06` ([`tiberiandawn/bdata.cpp:1610`](../../tiberiandawn/bdata.cpp#L1610), `ClassV06`).
  - **Engine target:** `V06.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0039/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0040 — v07** · [View placeholder](../../game/content/wireframes/previews/WF-0040.svg) · engine slot `STRUCT_V07` ([`tiberiandawn/bdata.cpp:1661`](../../tiberiandawn/bdata.cpp#L1661), `ClassV07`).
  - **Engine target:** `V07.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0040/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0041 — v08** · [View placeholder](../../game/content/wireframes/previews/WF-0041.svg) · engine slot `STRUCT_V08` ([`tiberiandawn/bdata.cpp:1712`](../../tiberiandawn/bdata.cpp#L1712), `ClassV08`).
  - **Engine target:** `V08.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0041/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0042 — v09** · [View placeholder](../../game/content/wireframes/previews/WF-0042.svg) · engine slot `STRUCT_V09` ([`tiberiandawn/bdata.cpp:1763`](../../tiberiandawn/bdata.cpp#L1763), `ClassV09`).
  - **Engine target:** `V09.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0042/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0043 — v10** · [View placeholder](../../game/content/wireframes/previews/WF-0043.svg) · engine slot `STRUCT_V10` ([`tiberiandawn/bdata.cpp:1814`](../../tiberiandawn/bdata.cpp#L1814), `ClassV10`).
  - **Engine target:** `V10.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0043/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0044 — v11** · [View placeholder](../../game/content/wireframes/previews/WF-0044.svg) · engine slot `STRUCT_V11` ([`tiberiandawn/bdata.cpp:1865`](../../tiberiandawn/bdata.cpp#L1865), `ClassV11`).
  - **Engine target:** `V11.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0044/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0045 — v12** · [View placeholder](../../game/content/wireframes/previews/WF-0045.svg) · engine slot `STRUCT_V12` ([`tiberiandawn/bdata.cpp:1916`](../../tiberiandawn/bdata.cpp#L1916), `ClassV12`).
  - **Engine target:** `V12.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0045/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0214.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0046 — v13** · [View placeholder](../../game/content/wireframes/previews/WF-0046.svg) · engine slot `STRUCT_V13` ([`tiberiandawn/bdata.cpp:1967`](../../tiberiandawn/bdata.cpp#L1967), `ClassV13`).
  - **Engine target:** `V13.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0046/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0215.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0047 — v14** · [View placeholder](../../game/content/wireframes/previews/WF-0047.svg) · engine slot `STRUCT_V14` ([`tiberiandawn/bdata.cpp:2018`](../../tiberiandawn/bdata.cpp#L2018), `ClassV14`).
  - **Engine target:** `V14.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0047/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0216.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0048 — v15** · [View placeholder](../../game/content/wireframes/previews/WF-0048.svg) · engine slot `STRUCT_V15` ([`tiberiandawn/bdata.cpp:2069`](../../tiberiandawn/bdata.cpp#L2069), `ClassV15`).
  - **Engine target:** `V15.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0048/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0217.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0049 — v16** · [View placeholder](../../game/content/wireframes/previews/WF-0049.svg) · engine slot `STRUCT_V16` ([`tiberiandawn/bdata.cpp:2120`](../../tiberiandawn/bdata.cpp#L2120), `ClassV16`).
  - **Engine target:** `V16.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0049/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0218.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0050 — v17** · [View placeholder](../../game/content/wireframes/previews/WF-0050.svg) · engine slot `STRUCT_V17` ([`tiberiandawn/bdata.cpp:2171`](../../tiberiandawn/bdata.cpp#L2171), `ClassV17`).
  - **Engine target:** `V17.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0050/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0219.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0051 — v18** · [View placeholder](../../game/content/wireframes/previews/WF-0051.svg) · engine slot `STRUCT_V18` ([`tiberiandawn/bdata.cpp:2222`](../../tiberiandawn/bdata.cpp#L2222), `ClassV18`).
  - **Engine target:** `V18.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0051/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0220.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0052 — v20** · [View placeholder](../../game/content/wireframes/previews/WF-0052.svg) · engine slot `STRUCT_V20` ([`tiberiandawn/bdata.cpp:2324`](../../tiberiandawn/bdata.cpp#L2324), `ClassV20`).
  - **Engine target:** `V20.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0052/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0053 — v21** · [View placeholder](../../game/content/wireframes/previews/WF-0053.svg) · engine slot `STRUCT_V21` ([`tiberiandawn/bdata.cpp:2375`](../../tiberiandawn/bdata.cpp#L2375), `ClassV21`).
  - **Engine target:** `V21.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0053/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0054 — v22** · [View placeholder](../../game/content/wireframes/previews/WF-0054.svg) · engine slot `STRUCT_V22` ([`tiberiandawn/bdata.cpp:2426`](../../tiberiandawn/bdata.cpp#L2426), `ClassV22`).
  - **Engine target:** `V22.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0054/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0055 — v23** · [View placeholder](../../game/content/wireframes/previews/WF-0055.svg) · engine slot `STRUCT_V23` ([`tiberiandawn/bdata.cpp:2477`](../../tiberiandawn/bdata.cpp#L2477), `ClassV23`).
  - **Engine target:** `V23.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0055/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0056 — v24** · [View placeholder](../../game/content/wireframes/previews/WF-0056.svg) · engine slot `STRUCT_V24` ([`tiberiandawn/bdata.cpp:2528`](../../tiberiandawn/bdata.cpp#L2528), `ClassV24`).
  - **Engine target:** `V24.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0056/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0057 — v25** · [View placeholder](../../game/content/wireframes/previews/WF-0057.svg) · engine slot `STRUCT_V25` ([`tiberiandawn/bdata.cpp:2579`](../../tiberiandawn/bdata.cpp#L2579), `ClassV25`).
  - **Engine target:** `V25.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0057/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0058 — v26** · [View placeholder](../../game/content/wireframes/previews/WF-0058.svg) · engine slot `STRUCT_V26` ([`tiberiandawn/bdata.cpp:2630`](../../tiberiandawn/bdata.cpp#L2630), `ClassV26`).
  - **Engine target:** `V26.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0058/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0059 — v27** · [View placeholder](../../game/content/wireframes/previews/WF-0059.svg) · engine slot `STRUCT_V27` ([`tiberiandawn/bdata.cpp:2681`](../../tiberiandawn/bdata.cpp#L2681), `ClassV27`).
  - **Engine target:** `V27.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0059/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0060 — v28** · [View placeholder](../../game/content/wireframes/previews/WF-0060.svg) · engine slot `STRUCT_V28` ([`tiberiandawn/bdata.cpp:2732`](../../tiberiandawn/bdata.cpp#L2732), `ClassV28`).
  - **Engine target:** `V28.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0060/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0061 — v29** · [View placeholder](../../game/content/wireframes/previews/WF-0061.svg) · engine slot `STRUCT_V29` ([`tiberiandawn/bdata.cpp:2783`](../../tiberiandawn/bdata.cpp#L2783), `ClassV29`).
  - **Engine target:** `V29.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0061/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0062 — v30** · [View placeholder](../../game/content/wireframes/previews/WF-0062.svg) · engine slot `STRUCT_V30` ([`tiberiandawn/bdata.cpp:2834`](../../tiberiandawn/bdata.cpp#L2834), `ClassV30`).
  - **Engine target:** `V30.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0062/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0063 — v31** · [View placeholder](../../game/content/wireframes/previews/WF-0063.svg) · engine slot `STRUCT_V31` ([`tiberiandawn/bdata.cpp:2885`](../../tiberiandawn/bdata.cpp#L2885), `ClassV31`).
  - **Engine target:** `V31.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0063/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0064 — v32** · [View placeholder](../../game/content/wireframes/previews/WF-0064.svg) · engine slot `STRUCT_V32` ([`tiberiandawn/bdata.cpp:2936`](../../tiberiandawn/bdata.cpp#L2936), `ClassV32`).
  - **Engine target:** `V32.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0064/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0065 — v33** · [View placeholder](../../game/content/wireframes/previews/WF-0065.svg) · engine slot `STRUCT_V33` ([`tiberiandawn/bdata.cpp:2987`](../../tiberiandawn/bdata.cpp#L2987), `ClassV33`).
  - **Engine target:** `V33.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0065/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0066 — v34** · [View placeholder](../../game/content/wireframes/previews/WF-0066.svg) · engine slot `STRUCT_V34` ([`tiberiandawn/bdata.cpp:3038`](../../tiberiandawn/bdata.cpp#L3038), `ClassV34`).
  - **Engine target:** `V34.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0066/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0067 — v35** · [View placeholder](../../game/content/wireframes/previews/WF-0067.svg) · engine slot `STRUCT_V35` ([`tiberiandawn/bdata.cpp:3089`](../../tiberiandawn/bdata.cpp#L3089), `ClassV35`).
  - **Engine target:** `V35.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0067/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0068 — v36** · [View placeholder](../../game/content/wireframes/previews/WF-0068.svg) · engine slot `STRUCT_V36` ([`tiberiandawn/bdata.cpp:3140`](../../tiberiandawn/bdata.cpp#L3140), `ClassV36`).
  - **Engine target:** `V36.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0068/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0069 — v37** · [View placeholder](../../game/content/wireframes/previews/WF-0069.svg) · engine slot `STRUCT_V37` ([`tiberiandawn/bdata.cpp:3190`](../../tiberiandawn/bdata.cpp#L3190), `ClassV37`).
  - **Engine target:** `V37.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0069/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0070 — weap** · [View placeholder](../../game/content/wireframes/previews/WF-0070.svg) · engine slot `STRUCT_WEAP` ([`tiberiandawn/bdata.cpp:264`](../../tiberiandawn/bdata.cpp#L264), `ClassWeapon`).
  - **Engine target:** `WEAP.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0070/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0071 — wood wall** · [View placeholder](../../game/content/wireframes/previews/WF-0071.svg) · engine slot `STRUCT_WOOD_WALL` ([`tiberiandawn/bdata.cpp:3497`](../../tiberiandawn/bdata.cpp#L3497), `Wood`).
  - **Engine target:** `WOOD.SHP`. **Placeholder contract (provisional):** 48×48 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0071/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match building state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0222.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

## Effect (101)

Timing, frame-start, frame-count, looping and transparency vary by animation type. Follow the AnimTypeClass sequence before finalizing; generated frames are visual stand-ins.

- [ ] **WF-0072 — art exp1** · [View placeholder](../../game/content/wireframes/previews/WF-0072.svg) · [Source-audited frame contract](REPRESENTATIVE_FRAME_CONTRACTS.md#wf-0072) · engine slot `ANIM_ART_EXP1` ([`tiberiandawn/adata.cpp:956`](../../tiberiandawn/adata.cpp#L956), `ArtExp1`).
  - **Engine target:** `ART-EXP1.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0072/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0073 — atom blast** · [View placeholder](../../game/content/wireframes/previews/WF-0073.svg) · engine slot `ANIM_ATOM_BLAST` ([`tiberiandawn/adata.cpp:1899`](../../tiberiandawn/adata.cpp#L1899), `AtomBomb`).
  - **Engine target:** `ATOMSFX.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0073/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0074 — atom door** · [View placeholder](../../game/content/wireframes/previews/WF-0074.svg) · engine slot `ANIM_ATOM_DOOR` ([`tiberiandawn/adata.cpp:1923`](../../tiberiandawn/adata.cpp#L1923), `AtomDoor`).
  - **Engine target:** `ATOMDOOR.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0074/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0075 — beacon** · [View placeholder](../../game/content/wireframes/previews/WF-0075.svg) · engine slot `ANIM_BEACON` ([`tiberiandawn/adata.cpp:2211`](../../tiberiandawn/adata.cpp#L2211), `Beacon`).
  - **Engine target:** `MOVEFLSH.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0075/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0145.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0076 — beacon virtual** · [View placeholder](../../game/content/wireframes/previews/WF-0076.svg) · engine slot `ANIM_BEACON_VIRTUAL` ([`tiberiandawn/adata.cpp:2237`](../../tiberiandawn/adata.cpp#L2237), `BeaconVirtual`).
  - **Engine target:** `BEACON.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0076/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0077 — burn big** · [View placeholder](../../game/content/wireframes/previews/WF-0077.svg) · engine slot `ANIM_BURN_BIG` ([`tiberiandawn/adata.cpp:364`](../../tiberiandawn/adata.cpp#L364), `BurnBig`).
  - **Engine target:** `BURN-L.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0077/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0151.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0078 — burn med** · [View placeholder](../../game/content/wireframes/previews/WF-0078.svg) · engine slot `ANIM_BURN_MED` ([`tiberiandawn/adata.cpp:343`](../../tiberiandawn/adata.cpp#L343), `BurnMed`).
  - **Engine target:** `BURN-M.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0078/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0152.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0079 — burn small** · [View placeholder](../../game/content/wireframes/previews/WF-0079.svg) · engine slot `ANIM_BURN_SMALL` ([`tiberiandawn/adata.cpp:322`](../../tiberiandawn/adata.cpp#L322), `BurnSmall`).
  - **Engine target:** `BURN-S.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0079/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0153.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0080 — chem ball** · [View placeholder](../../game/content/wireframes/previews/WF-0080.svg) · engine slot `ANIM_CHEM_BALL` ([`tiberiandawn/adata.cpp:2167`](../../tiberiandawn/adata.cpp#L2167), `ChemBall`).
  - **Engine target:** `CHEMBALL.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0080/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0081 — chem e** · [View placeholder](../../game/content/wireframes/previews/WF-0081.svg) · engine slot `ANIM_CHEM_E` ([`tiberiandawn/adata.cpp:755`](../../tiberiandawn/adata.cpp#L755), `ChemE`).
  - **Engine target:** `CHEM-E.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0081/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0082 — chem n** · [View placeholder](../../game/content/wireframes/previews/WF-0082.svg) · engine slot `ANIM_CHEM_N` ([`tiberiandawn/adata.cpp:629`](../../tiberiandawn/adata.cpp#L629), `ChemN`).
  - **Engine target:** `CHEM-N.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0082/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0083 — chem ne** · [View placeholder](../../game/content/wireframes/previews/WF-0083.svg) · engine slot `ANIM_CHEM_NE` ([`tiberiandawn/adata.cpp:776`](../../tiberiandawn/adata.cpp#L776), `ChemNE`).
  - **Engine target:** `CHEM-NE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0083/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0084 — chem nw** · [View placeholder](../../game/content/wireframes/previews/WF-0084.svg) · engine slot `ANIM_CHEM_NW` ([`tiberiandawn/adata.cpp:650`](../../tiberiandawn/adata.cpp#L650), `ChemNW`).
  - **Engine target:** `CHEM-NW.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0084/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0085 — chem s** · [View placeholder](../../game/content/wireframes/previews/WF-0085.svg) · engine slot `ANIM_CHEM_S` ([`tiberiandawn/adata.cpp:713`](../../tiberiandawn/adata.cpp#L713), `ChemS`).
  - **Engine target:** `CHEM-S.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0085/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0086 — chem se** · [View placeholder](../../game/content/wireframes/previews/WF-0086.svg) · engine slot `ANIM_CHEM_SE` ([`tiberiandawn/adata.cpp:734`](../../tiberiandawn/adata.cpp#L734), `ChemSE`).
  - **Engine target:** `CHEM-SE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0086/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0087 — chem sw** · [View placeholder](../../game/content/wireframes/previews/WF-0087.svg) · engine slot `ANIM_CHEM_SW` ([`tiberiandawn/adata.cpp:692`](../../tiberiandawn/adata.cpp#L692), `ChemSW`).
  - **Engine target:** `CHEM-SW.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0087/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0088 — chem w** · [View placeholder](../../game/content/wireframes/previews/WF-0088.svg) · engine slot `ANIM_CHEM_W` ([`tiberiandawn/adata.cpp:671`](../../tiberiandawn/adata.cpp#L671), `ChemW`).
  - **Engine target:** `CHEM-W.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0088/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0089 — crate deviator** · [View placeholder](../../game/content/wireframes/previews/WF-0089.svg) · engine slot `ANIM_CRATE_DEVIATOR` ([`tiberiandawn/adata.cpp:1945`](../../tiberiandawn/adata.cpp#L1945), `CDeviator`).
  - **Engine target:** `DEVIATOR.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0089/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0090 — crate dollar** · [View placeholder](../../game/content/wireframes/previews/WF-0090.svg) · engine slot `ANIM_CRATE_DOLLAR` ([`tiberiandawn/adata.cpp:1967`](../../tiberiandawn/adata.cpp#L1967), `CDollar`).
  - **Engine target:** `DOLLAR.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0090/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0091 — crate earth** · [View placeholder](../../game/content/wireframes/previews/WF-0091.svg) · engine slot `ANIM_CRATE_EARTH` ([`tiberiandawn/adata.cpp:1989`](../../tiberiandawn/adata.cpp#L1989), `CEarth`).
  - **Engine target:** `EARTH.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0091/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0092 — crate empulse** · [View placeholder](../../game/content/wireframes/previews/WF-0092.svg) · engine slot `ANIM_CRATE_EMPULSE` ([`tiberiandawn/adata.cpp:2011`](../../tiberiandawn/adata.cpp#L2011), `CEmpulse`).
  - **Engine target:** `EMPULSE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0092/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0093 — crate invun** · [View placeholder](../../game/content/wireframes/previews/WF-0093.svg) · engine slot `ANIM_CRATE_INVUN` ([`tiberiandawn/adata.cpp:2033`](../../tiberiandawn/adata.cpp#L2033), `CInvun`).
  - **Engine target:** `INVUN.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0093/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0094 — crate mine** · [View placeholder](../../game/content/wireframes/previews/WF-0094.svg) · engine slot `ANIM_CRATE_MINE` ([`tiberiandawn/adata.cpp:2055`](../../tiberiandawn/adata.cpp#L2055), `CMine`).
  - **Engine target:** `MINE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0094/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0095 — crate missile** · [View placeholder](../../game/content/wireframes/previews/WF-0095.svg) · engine slot `ANIM_CRATE_MISSILE` ([`tiberiandawn/adata.cpp:2121`](../../tiberiandawn/adata.cpp#L2121), `CMissile`).
  - **Engine target:** `MISSILE2.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0095/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0096 — crate rapid** · [View placeholder](../../game/content/wireframes/previews/WF-0096.svg) · engine slot `ANIM_CRATE_RAPID` ([`tiberiandawn/adata.cpp:2077`](../../tiberiandawn/adata.cpp#L2077), `CRapid`).
  - **Engine target:** `RAPID.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0096/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0097 — crate stealth** · [View placeholder](../../game/content/wireframes/previews/WF-0097.svg) · engine slot `ANIM_CRATE_STEALTH` ([`tiberiandawn/adata.cpp:2099`](../../tiberiandawn/adata.cpp#L2099), `CStealth`).
  - **Engine target:** `STEALTH2.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0097/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0098 — e1 rot exp** · [View placeholder](../../game/content/wireframes/previews/WF-0098.svg) · engine slot `ANIM_E1_ROT_EXP` ([`tiberiandawn/adata.cpp:1414`](../../tiberiandawn/adata.cpp#L1414), `E1RotExp`).
  - **Engine target:** `E1ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0098/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0099, WF-0100, WF-0101.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0099 — e1 rot fire** · [View placeholder](../../game/content/wireframes/previews/WF-0099.svg) · engine slot `ANIM_E1_ROT_FIRE` ([`tiberiandawn/adata.cpp:1354`](../../tiberiandawn/adata.cpp#L1354), `E1RotFire`).
  - **Engine target:** `E1ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0099/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0098, WF-0100, WF-0101.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0100 — e1 rot grenade** · [View placeholder](../../game/content/wireframes/previews/WF-0100.svg) · engine slot `ANIM_E1_ROT_GRENADE` ([`tiberiandawn/adata.cpp:1374`](../../tiberiandawn/adata.cpp#L1374), `E1RotGrenade`).
  - **Engine target:** `E1ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0100/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0098, WF-0099, WF-0101.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0101 — e1 rot gun** · [View placeholder](../../game/content/wireframes/previews/WF-0101.svg) · engine slot `ANIM_E1_ROT_GUN` ([`tiberiandawn/adata.cpp:1394`](../../tiberiandawn/adata.cpp#L1394), `E1RotGun`).
  - **Engine target:** `E1ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0101/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0098, WF-0099, WF-0100.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0102 — e2 rot exp** · [View placeholder](../../game/content/wireframes/previews/WF-0102.svg) · engine slot `ANIM_E2_ROT_EXP` ([`tiberiandawn/adata.cpp:1495`](../../tiberiandawn/adata.cpp#L1495), `E2RotExp`).
  - **Engine target:** `E2ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0102/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0103, WF-0104, WF-0105.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0103 — e2 rot fire** · [View placeholder](../../game/content/wireframes/previews/WF-0103.svg) · engine slot `ANIM_E2_ROT_FIRE` ([`tiberiandawn/adata.cpp:1435`](../../tiberiandawn/adata.cpp#L1435), `E2RotFire`).
  - **Engine target:** `E2ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0103/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0102, WF-0104, WF-0105.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0104 — e2 rot grenade** · [View placeholder](../../game/content/wireframes/previews/WF-0104.svg) · engine slot `ANIM_E2_ROT_GRENADE` ([`tiberiandawn/adata.cpp:1455`](../../tiberiandawn/adata.cpp#L1455), `E2RotGrenade`).
  - **Engine target:** `E2ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0104/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0102, WF-0103, WF-0105.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0105 — e2 rot gun** · [View placeholder](../../game/content/wireframes/previews/WF-0105.svg) · engine slot `ANIM_E2_ROT_GUN` ([`tiberiandawn/adata.cpp:1475`](../../tiberiandawn/adata.cpp#L1475), `E2RotGun`).
  - **Engine target:** `E2ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0105/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0102, WF-0103, WF-0104.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0106 — e3 rot exp** · [View placeholder](../../game/content/wireframes/previews/WF-0106.svg) · engine slot `ANIM_E3_ROT_EXP` ([`tiberiandawn/adata.cpp:1576`](../../tiberiandawn/adata.cpp#L1576), `E3RotExp`).
  - **Engine target:** `E3ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0106/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0107, WF-0108, WF-0109.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0107 — e3 rot fire** · [View placeholder](../../game/content/wireframes/previews/WF-0107.svg) · engine slot `ANIM_E3_ROT_FIRE` ([`tiberiandawn/adata.cpp:1516`](../../tiberiandawn/adata.cpp#L1516), `E3RotFire`).
  - **Engine target:** `E3ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0107/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0106, WF-0108, WF-0109.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0108 — e3 rot grenade** · [View placeholder](../../game/content/wireframes/previews/WF-0108.svg) · engine slot `ANIM_E3_ROT_GRENADE` ([`tiberiandawn/adata.cpp:1536`](../../tiberiandawn/adata.cpp#L1536), `E3RotGrenade`).
  - **Engine target:** `E3ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0108/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0106, WF-0107, WF-0109.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0109 — e3 rot gun** · [View placeholder](../../game/content/wireframes/previews/WF-0109.svg) · engine slot `ANIM_E3_ROT_GUN` ([`tiberiandawn/adata.cpp:1556`](../../tiberiandawn/adata.cpp#L1556), `E3RotGun`).
  - **Engine target:** `E3ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0109/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0106, WF-0107, WF-0108.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0110 — e4 rot exp** · [View placeholder](../../game/content/wireframes/previews/WF-0110.svg) · engine slot `ANIM_E4_ROT_EXP` ([`tiberiandawn/adata.cpp:1657`](../../tiberiandawn/adata.cpp#L1657), `E4RotExp`).
  - **Engine target:** `E4ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0110/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0111, WF-0112, WF-0113.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0111 — e4 rot fire** · [View placeholder](../../game/content/wireframes/previews/WF-0111.svg) · engine slot `ANIM_E4_ROT_FIRE` ([`tiberiandawn/adata.cpp:1597`](../../tiberiandawn/adata.cpp#L1597), `E4RotFire`).
  - **Engine target:** `E4ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0111/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0110, WF-0112, WF-0113.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0112 — e4 rot grenade** · [View placeholder](../../game/content/wireframes/previews/WF-0112.svg) · engine slot `ANIM_E4_ROT_GRENADE` ([`tiberiandawn/adata.cpp:1617`](../../tiberiandawn/adata.cpp#L1617), `E4RotGrenade`).
  - **Engine target:** `E4ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0112/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0110, WF-0111, WF-0113.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0113 — e4 rot gun** · [View placeholder](../../game/content/wireframes/previews/WF-0113.svg) · engine slot `ANIM_E4_ROT_GUN` ([`tiberiandawn/adata.cpp:1637`](../../tiberiandawn/adata.cpp#L1637), `E4RotGun`).
  - **Engine target:** `E4ROT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0113/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0110, WF-0111, WF-0112.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0114 — fball1** · [View placeholder](../../game/content/wireframes/previews/WF-0114.svg) · engine slot `ANIM_FBALL1` ([`tiberiandawn/adata.cpp:820`](../../tiberiandawn/adata.cpp#L820), `FBall1`).
  - **Engine target:** `FBALL1.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0114/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0115 — fire med** · [View placeholder](../../game/content/wireframes/previews/WF-0115.svg) · engine slot `ANIM_FIRE_MED` ([`tiberiandawn/adata.cpp:1256`](../../tiberiandawn/adata.cpp#L1256), `Fire2`).
  - **Engine target:** `FIRE2.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0115/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0116.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0116 — fire med virtual** · [View placeholder](../../game/content/wireframes/previews/WF-0116.svg) · engine slot `ANIM_FIRE_MED_VIRTUAL` ([`tiberiandawn/adata.cpp:1282`](../../tiberiandawn/adata.cpp#L1282), `Fire2Virtual`).
  - **Engine target:** `FIRE2.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0116/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0115.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0117 — fire med2** · [View placeholder](../../game/content/wireframes/previews/WF-0117.svg) · engine slot `ANIM_FIRE_MED2` ([`tiberiandawn/adata.cpp:1158`](../../tiberiandawn/adata.cpp#L1158), `Fire1`).
  - **Engine target:** `FIRE1.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0117/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0118.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0118 — fire med2 virtual** · [View placeholder](../../game/content/wireframes/previews/WF-0118.svg) · engine slot `ANIM_FIRE_MED2_VIRTUAL` ([`tiberiandawn/adata.cpp:1184`](../../tiberiandawn/adata.cpp#L1184), `Fire1Virtual`).
  - **Engine target:** `FIRE1.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0118/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0117.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0119 — fire small** · [View placeholder](../../game/content/wireframes/previews/WF-0119.svg) · engine slot `ANIM_FIRE_SMALL` ([`tiberiandawn/adata.cpp:1110`](../../tiberiandawn/adata.cpp#L1110), `Fire3`).
  - **Engine target:** `FIRE3.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0119/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0120.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0120 — fire small virtual** · [View placeholder](../../game/content/wireframes/previews/WF-0120.svg) · engine slot `ANIM_FIRE_SMALL_VIRTUAL` ([`tiberiandawn/adata.cpp:1136`](../../tiberiandawn/adata.cpp#L1136), `Fire3Virtual`).
  - **Engine target:** `FIRE3.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0120/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0119.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0121 — fire tiny** · [View placeholder](../../game/content/wireframes/previews/WF-0121.svg) · engine slot `ANIM_FIRE_TINY` ([`tiberiandawn/adata.cpp:1206`](../../tiberiandawn/adata.cpp#L1206), `Fire4`).
  - **Engine target:** `FIRE4.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0121/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0122.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0122 — fire tiny virtual** · [View placeholder](../../game/content/wireframes/previews/WF-0122.svg) · engine slot `ANIM_FIRE_TINY_VIRTUAL` ([`tiberiandawn/adata.cpp:1232`](../../tiberiandawn/adata.cpp#L1232), `Fire4Virtual`).
  - **Engine target:** `FIRE4.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0122/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0121.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0123 — flag** · [View placeholder](../../game/content/wireframes/previews/WF-0123.svg) · engine slot `ANIM_FLAG` ([`tiberiandawn/adata.cpp:2189`](../../tiberiandawn/adata.cpp#L2189), `Flag`).
  - **Engine target:** `FLAGFLY.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0123/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0124 — flame e** · [View placeholder](../../game/content/wireframes/previews/WF-0124.svg) · engine slot `ANIM_FLAME_E` ([`tiberiandawn/adata.cpp:583`](../../tiberiandawn/adata.cpp#L583), `FlameE`).
  - **Engine target:** `FLAME-E.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0124/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0125 — flame n** · [View placeholder](../../game/content/wireframes/previews/WF-0125.svg) · engine slot `ANIM_FLAME_N` ([`tiberiandawn/adata.cpp:457`](../../tiberiandawn/adata.cpp#L457), `FlameN`).
  - **Engine target:** `FLAME-N.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0125/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0126 — flame ne** · [View placeholder](../../game/content/wireframes/previews/WF-0126.svg) · engine slot `ANIM_FLAME_NE` ([`tiberiandawn/adata.cpp:604`](../../tiberiandawn/adata.cpp#L604), `FlameNE`).
  - **Engine target:** `FLAME-NE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0126/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0127 — flame nw** · [View placeholder](../../game/content/wireframes/previews/WF-0127.svg) · engine slot `ANIM_FLAME_NW` ([`tiberiandawn/adata.cpp:478`](../../tiberiandawn/adata.cpp#L478), `FlameNW`).
  - **Engine target:** `FLAME-NW.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0127/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0128 — flame s** · [View placeholder](../../game/content/wireframes/previews/WF-0128.svg) · engine slot `ANIM_FLAME_S` ([`tiberiandawn/adata.cpp:541`](../../tiberiandawn/adata.cpp#L541), `FlameS`).
  - **Engine target:** `FLAME-S.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0128/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0129 — flame se** · [View placeholder](../../game/content/wireframes/previews/WF-0129.svg) · engine slot `ANIM_FLAME_SE` ([`tiberiandawn/adata.cpp:562`](../../tiberiandawn/adata.cpp#L562), `FlameSE`).
  - **Engine target:** `FLAME-SE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0129/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0130 — flame sw** · [View placeholder](../../game/content/wireframes/previews/WF-0130.svg) · engine slot `ANIM_FLAME_SW` ([`tiberiandawn/adata.cpp:520`](../../tiberiandawn/adata.cpp#L520), `FlameSW`).
  - **Engine target:** `FLAME-SW.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0130/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0131 — flame w** · [View placeholder](../../game/content/wireframes/previews/WF-0131.svg) · engine slot `ANIM_FLAME_W` ([`tiberiandawn/adata.cpp:499`](../../tiberiandawn/adata.cpp#L499), `FlameW`).
  - **Engine target:** `FLAME-W.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0131/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0132 — frag1** · [View placeholder](../../game/content/wireframes/previews/WF-0132.svg) · engine slot `ANIM_FRAG1` ([`tiberiandawn/adata.cpp:842`](../../tiberiandawn/adata.cpp#L842), `Frag1`).
  - **Engine target:** `FRAG1.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0132/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0133 — frag2** · [View placeholder](../../game/content/wireframes/previews/WF-0133.svg) · engine slot `ANIM_FRAG2` ([`tiberiandawn/adata.cpp:866`](../../tiberiandawn/adata.cpp#L866), `Frag3`).
  - **Engine target:** `FRAG3.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0133/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0134 — grenade** · [View placeholder](../../game/content/wireframes/previews/WF-0134.svg) · engine slot `ANIM_GRENADE` ([`tiberiandawn/adata.cpp:798`](../../tiberiandawn/adata.cpp#L798), `Grenade`).
  - **Engine target:** `VEH-HIT2.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0134/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0171.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0135 — gun e** · [View placeholder](../../game/content/wireframes/previews/WF-0135.svg) · engine slot `ANIM_GUN_E` ([`tiberiandawn/adata.cpp:1832`](../../tiberiandawn/adata.cpp#L1832), `GUNE`).
  - **Engine target:** `MINIGUN.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0135/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0136, WF-0137, WF-0138, WF-0139, WF-0140, WF-0141, WF-0142.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0136 — gun n** · [View placeholder](../../game/content/wireframes/previews/WF-0136.svg) · engine slot `ANIM_GUN_N` ([`tiberiandawn/adata.cpp:1706`](../../tiberiandawn/adata.cpp#L1706), `GUNN`).
  - **Engine target:** `MINIGUN.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0136/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0135, WF-0137, WF-0138, WF-0139, WF-0140, WF-0141, WF-0142.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0137 — gun ne** · [View placeholder](../../game/content/wireframes/previews/WF-0137.svg) · engine slot `ANIM_GUN_NE` ([`tiberiandawn/adata.cpp:1853`](../../tiberiandawn/adata.cpp#L1853), `GUNNE`).
  - **Engine target:** `MINIGUN.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0137/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0135, WF-0136, WF-0138, WF-0139, WF-0140, WF-0141, WF-0142.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0138 — gun nw** · [View placeholder](../../game/content/wireframes/previews/WF-0138.svg) · engine slot `ANIM_GUN_NW` ([`tiberiandawn/adata.cpp:1727`](../../tiberiandawn/adata.cpp#L1727), `GUNNW`).
  - **Engine target:** `MINIGUN.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0138/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0135, WF-0136, WF-0137, WF-0139, WF-0140, WF-0141, WF-0142.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0139 — gun s** · [View placeholder](../../game/content/wireframes/previews/WF-0139.svg) · engine slot `ANIM_GUN_S` ([`tiberiandawn/adata.cpp:1790`](../../tiberiandawn/adata.cpp#L1790), `GUNS`).
  - **Engine target:** `MINIGUN.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0139/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0135, WF-0136, WF-0137, WF-0138, WF-0140, WF-0141, WF-0142.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0140 — gun se** · [View placeholder](../../game/content/wireframes/previews/WF-0140.svg) · engine slot `ANIM_GUN_SE` ([`tiberiandawn/adata.cpp:1811`](../../tiberiandawn/adata.cpp#L1811), `GUNSE`).
  - **Engine target:** `MINIGUN.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0140/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0135, WF-0136, WF-0137, WF-0138, WF-0139, WF-0141, WF-0142.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0141 — gun sw** · [View placeholder](../../game/content/wireframes/previews/WF-0141.svg) · engine slot `ANIM_GUN_SW` ([`tiberiandawn/adata.cpp:1769`](../../tiberiandawn/adata.cpp#L1769), `GUNSW`).
  - **Engine target:** `MINIGUN.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0141/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0135, WF-0136, WF-0137, WF-0138, WF-0139, WF-0140, WF-0142.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0142 — gun w** · [View placeholder](../../game/content/wireframes/previews/WF-0142.svg) · engine slot `ANIM_GUN_W` ([`tiberiandawn/adata.cpp:1748`](../../tiberiandawn/adata.cpp#L1748), `GUNW`).
  - **Engine target:** `MINIGUN.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0142/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0135, WF-0136, WF-0137, WF-0138, WF-0139, WF-0140, WF-0141.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0143 — ion cannon** · [View placeholder](../../game/content/wireframes/previews/WF-0143.svg) · engine slot `ANIM_ION_CANNON` ([`tiberiandawn/adata.cpp:1874`](../../tiberiandawn/adata.cpp#L1874), `IonCannon`).
  - **Engine target:** `IONSFX.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0143/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0144 — lz smoke** · [View placeholder](../../game/content/wireframes/previews/WF-0144.svg) · engine slot `ANIM_LZ_SMOKE` ([`tiberiandawn/adata.cpp:297`](../../tiberiandawn/adata.cpp#L297), `LZSmoke`).
  - **Engine target:** `SMOKLAND.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0144/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0145 — move flash** · [View placeholder](../../game/content/wireframes/previews/WF-0145.svg) · engine slot `ANIM_MOVE_FLASH` ([`tiberiandawn/adata.cpp:2144`](../../tiberiandawn/adata.cpp#L2144), `MoveFlash`).
  - **Engine target:** `MOVEFLSH.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0145/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0075.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0146 — muzzle flash** · [View placeholder](../../game/content/wireframes/previews/WF-0146.svg) · engine slot `ANIM_MUZZLE_FLASH` ([`tiberiandawn/adata.cpp:1326`](../../tiberiandawn/adata.cpp#L1326), `Gunfire`).
  - **Engine target:** `GUNFIRE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0146/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0147 — napalm1** · [View placeholder](../../game/content/wireframes/previews/WF-0147.svg) · engine slot `ANIM_NAPALM1` ([`tiberiandawn/adata.cpp:978`](../../tiberiandawn/adata.cpp#L978), `Napalm1`).
  - **Engine target:** `NAPALM1.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0147/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0148 — napalm2** · [View placeholder](../../game/content/wireframes/previews/WF-0148.svg) · engine slot `ANIM_NAPALM2` ([`tiberiandawn/adata.cpp:1000`](../../tiberiandawn/adata.cpp#L1000), `Napalm2`).
  - **Engine target:** `NAPALM2.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0148/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0149 — napalm3** · [View placeholder](../../game/content/wireframes/previews/WF-0149.svg) · engine slot `ANIM_NAPALM3` ([`tiberiandawn/adata.cpp:1022`](../../tiberiandawn/adata.cpp#L1022), `Napalm3`).
  - **Engine target:** `NAPALM3.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0149/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0150 — oilfield burn** · [View placeholder](../../game/content/wireframes/previews/WF-0150.svg) · engine slot `ANIM_OILFIELD_BURN` ([`tiberiandawn/adata.cpp:1304`](../../tiberiandawn/adata.cpp#L1304), `OilFieldBurn`).
  - **Engine target:** `FLMSPT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0150/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0151 — on fire big** · [View placeholder](../../game/content/wireframes/previews/WF-0151.svg) · engine slot `ANIM_ON_FIRE_BIG` ([`tiberiandawn/adata.cpp:432`](../../tiberiandawn/adata.cpp#L432), `OnFireBig`).
  - **Engine target:** `BURN-L.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0151/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0077.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0152 — on fire med** · [View placeholder](../../game/content/wireframes/previews/WF-0152.svg) · engine slot `ANIM_ON_FIRE_MED` ([`tiberiandawn/adata.cpp:411`](../../tiberiandawn/adata.cpp#L411), `OnFireMed`).
  - **Engine target:** `BURN-M.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0152/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0078.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0153 — on fire small** · [View placeholder](../../game/content/wireframes/previews/WF-0153.svg) · engine slot `ANIM_ON_FIRE_SMALL` ([`tiberiandawn/adata.cpp:390`](../../tiberiandawn/adata.cpp#L390), `OnFireSmall`).
  - **Engine target:** `BURN-S.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0153/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0079.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0154 — piff** · [View placeholder](../../game/content/wireframes/previews/WF-0154.svg) · engine slot `ANIM_PIFF` ([`tiberiandawn/adata.cpp:1066`](../../tiberiandawn/adata.cpp#L1066), `Piff`).
  - **Engine target:** `PIFF.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0154/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0155 — piffpiff** · [View placeholder](../../game/content/wireframes/previews/WF-0155.svg) · engine slot `ANIM_PIFFPIFF` ([`tiberiandawn/adata.cpp:1088`](../../tiberiandawn/adata.cpp#L1088), `PiffPiff`).
  - **Engine target:** `PIFFPIFF.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0155/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0156 — rapt die** · [View placeholder](../../game/content/wireframes/previews/WF-0156.svg) · engine slot `ANIM_RAPT_DIE` ([`tiberiandawn/adata.cpp:106`](../../tiberiandawn/adata.cpp#L106), `RaptDie`).
  - **Engine target:** `RAPT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0156/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0290.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0157 — sam e** · [View placeholder](../../game/content/wireframes/previews/WF-0157.svg) · engine slot `ANIM_SAM_E` ([`tiberiandawn/adata.cpp:254`](../../tiberiandawn/adata.cpp#L254), `SAME`).
  - **Engine target:** `SAMFIRE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0157/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0158, WF-0159, WF-0160, WF-0161, WF-0162, WF-0163, WF-0164.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0158 — sam n** · [View placeholder](../../game/content/wireframes/previews/WF-0158.svg) · engine slot `ANIM_SAM_N` ([`tiberiandawn/adata.cpp:128`](../../tiberiandawn/adata.cpp#L128), `SAMN`).
  - **Engine target:** `SAMFIRE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0158/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0157, WF-0159, WF-0160, WF-0161, WF-0162, WF-0163, WF-0164.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0159 — sam ne** · [View placeholder](../../game/content/wireframes/previews/WF-0159.svg) · engine slot `ANIM_SAM_NE` ([`tiberiandawn/adata.cpp:275`](../../tiberiandawn/adata.cpp#L275), `SAMNE`).
  - **Engine target:** `SAMFIRE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0159/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0157, WF-0158, WF-0160, WF-0161, WF-0162, WF-0163, WF-0164.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0160 — sam nw** · [View placeholder](../../game/content/wireframes/previews/WF-0160.svg) · engine slot `ANIM_SAM_NW` ([`tiberiandawn/adata.cpp:149`](../../tiberiandawn/adata.cpp#L149), `SAMNW`).
  - **Engine target:** `SAMFIRE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0160/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0157, WF-0158, WF-0159, WF-0161, WF-0162, WF-0163, WF-0164.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0161 — sam s** · [View placeholder](../../game/content/wireframes/previews/WF-0161.svg) · engine slot `ANIM_SAM_S` ([`tiberiandawn/adata.cpp:212`](../../tiberiandawn/adata.cpp#L212), `SAMS`).
  - **Engine target:** `SAMFIRE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0161/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0157, WF-0158, WF-0159, WF-0160, WF-0162, WF-0163, WF-0164.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0162 — sam se** · [View placeholder](../../game/content/wireframes/previews/WF-0162.svg) · engine slot `ANIM_SAM_SE` ([`tiberiandawn/adata.cpp:233`](../../tiberiandawn/adata.cpp#L233), `SAMSE`).
  - **Engine target:** `SAMFIRE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0162/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0157, WF-0158, WF-0159, WF-0160, WF-0161, WF-0163, WF-0164.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0163 — sam sw** · [View placeholder](../../game/content/wireframes/previews/WF-0163.svg) · engine slot `ANIM_SAM_SW` ([`tiberiandawn/adata.cpp:191`](../../tiberiandawn/adata.cpp#L191), `SAMSW`).
  - **Engine target:** `SAMFIRE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0163/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0157, WF-0158, WF-0159, WF-0160, WF-0161, WF-0162, WF-0164.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0164 — sam w** · [View placeholder](../../game/content/wireframes/previews/WF-0164.svg) · engine slot `ANIM_SAM_W` ([`tiberiandawn/adata.cpp:170`](../../tiberiandawn/adata.cpp#L170), `SAMW`).
  - **Engine target:** `SAMFIRE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0164/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0157, WF-0158, WF-0159, WF-0160, WF-0161, WF-0162, WF-0163.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0165 — smoke m** · [View placeholder](../../game/content/wireframes/previews/WF-0165.svg) · engine slot `ANIM_SMOKE_M` ([`tiberiandawn/adata.cpp:1679`](../../tiberiandawn/adata.cpp#L1679), `SmokeM`).
  - **Engine target:** `SMOKE_M.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0165/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0166 — smoke puff** · [View placeholder](../../game/content/wireframes/previews/WF-0166.svg) · engine slot `ANIM_SMOKE_PUFF` ([`tiberiandawn/adata.cpp:1044`](../../tiberiandawn/adata.cpp#L1044), `SmokePuff`).
  - **Engine target:** `SMOKEY.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0166/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0167 — steg die** · [View placeholder](../../game/content/wireframes/previews/WF-0167.svg) · engine slot `ANIM_STEG_DIE` ([`tiberiandawn/adata.cpp:84`](../../tiberiandawn/adata.cpp#L84), `StegDie`).
  - **Engine target:** `STEG.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0167/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0292.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0168 — trex die** · [View placeholder](../../game/content/wireframes/previews/WF-0168.svg) · engine slot `ANIM_TREX_DIE` ([`tiberiandawn/adata.cpp:62`](../../tiberiandawn/adata.cpp#L62), `TRexDie`).
  - **Engine target:** `TREX.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0168/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0293.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0169 — tric die** · [View placeholder](../../game/content/wireframes/previews/WF-0169.svg) · engine slot `ANIM_TRIC_DIE` ([`tiberiandawn/adata.cpp:40`](../../tiberiandawn/adata.cpp#L40), `TricDie`).
  - **Engine target:** `TRIC.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0169/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0294.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0170 — veh hit1** · [View placeholder](../../game/content/wireframes/previews/WF-0170.svg) · engine slot `ANIM_VEH_HIT1` ([`tiberiandawn/adata.cpp:890`](../../tiberiandawn/adata.cpp#L890), `VehHit1`).
  - **Engine target:** `VEH-HIT1.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0170/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0171 — veh hit2** · [View placeholder](../../game/content/wireframes/previews/WF-0171.svg) · engine slot `ANIM_VEH_HIT2` ([`tiberiandawn/adata.cpp:912`](../../tiberiandawn/adata.cpp#L912), `VehHit2`).
  - **Engine target:** `VEH-HIT2.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0171/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0134.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0172 — veh hit3** · [View placeholder](../../game/content/wireframes/previews/WF-0172.svg) · engine slot `ANIM_VEH_HIT3` ([`tiberiandawn/adata.cpp:934`](../../tiberiandawn/adata.cpp#L934), `VehHit3`).
  - **Engine target:** `VEH-HIT3.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 128 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0172/0000.png` through `0127.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match effect state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

## Infantry (20)

Animation frames must follow that class's DO control table (stand, eight-facing walk/fire, prone, death and optional gestures). The recorded frame count is derived from the DoControls table when possible; stand-ins are not choreographed.

- [ ] **WF-0173 — c1** · [View placeholder](../../game/content/wireframes/previews/WF-0173.svg) · engine slot `INFANTRY_C1` ([`tiberiandawn/idata.cpp:587`](../../tiberiandawn/idata.cpp#L587), `C1`).
  - **Engine target:** `C1.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 375 generated frames (minimum calculated from CivilianDos1); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0173/0000.png` through `0374.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0174 — c10** · [View placeholder](../../game/content/wireframes/previews/WF-0174.svg) · engine slot `INFANTRY_C10` ([`tiberiandawn/idata.cpp:1193`](../../tiberiandawn/idata.cpp#L1193), `C10`).
  - **Engine target:** `C10.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 375 generated frames (minimum calculated from NikoombaDos); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0174/0000.png` through `0374.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0175 — c2** · [View placeholder](../../game/content/wireframes/previews/WF-0175.svg) · engine slot `INFANTRY_C2` ([`tiberiandawn/idata.cpp:654`](../../tiberiandawn/idata.cpp#L654), `C2`).
  - **Engine target:** `C2.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 375 generated frames (minimum calculated from CivilianDos2); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0175/0000.png` through `0374.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0176 — c3** · [View placeholder](../../game/content/wireframes/previews/WF-0176.svg) · engine slot `INFANTRY_C3` ([`tiberiandawn/idata.cpp:722`](../../tiberiandawn/idata.cpp#L722), `C3`).
  - **Engine target:** `C3.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 375 generated frames (minimum calculated from CivilianDos3); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0176/0000.png` through `0374.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0177 — c4** · [View placeholder](../../game/content/wireframes/previews/WF-0177.svg) · engine slot `INFANTRY_C4` ([`tiberiandawn/idata.cpp:789`](../../tiberiandawn/idata.cpp#L789), `C4`).
  - **Engine target:** `C4.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 375 generated frames (minimum calculated from CivilianDos4); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0177/0000.png` through `0374.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0178 — c5** · [View placeholder](../../game/content/wireframes/previews/WF-0178.svg) · engine slot `INFANTRY_C5` ([`tiberiandawn/idata.cpp:856`](../../tiberiandawn/idata.cpp#L856), `C5`).
  - **Engine target:** `C5.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 375 generated frames (minimum calculated from CivilianDos5); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0178/0000.png` through `0374.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0179 — c6** · [View placeholder](../../game/content/wireframes/previews/WF-0179.svg) · engine slot `INFANTRY_C6` ([`tiberiandawn/idata.cpp:923`](../../tiberiandawn/idata.cpp#L923), `C6`).
  - **Engine target:** `C6.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 375 generated frames (minimum calculated from CivilianDos6); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0179/0000.png` through `0374.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0180 — c7** · [View placeholder](../../game/content/wireframes/previews/WF-0180.svg) · engine slot `INFANTRY_C7` ([`tiberiandawn/idata.cpp:990`](../../tiberiandawn/idata.cpp#L990), `C7`).
  - **Engine target:** `C7.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 375 generated frames (minimum calculated from CivilianDos7); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0180/0000.png` through `0374.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0181 — c8** · [View placeholder](../../game/content/wireframes/previews/WF-0181.svg) · engine slot `INFANTRY_C8` ([`tiberiandawn/idata.cpp:1057`](../../tiberiandawn/idata.cpp#L1057), `C8`).
  - **Engine target:** `C8.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 375 generated frames (minimum calculated from CivilianDos8); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0181/0000.png` through `0374.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0182 — c9** · [View placeholder](../../game/content/wireframes/previews/WF-0182.svg) · engine slot `INFANTRY_C9` ([`tiberiandawn/idata.cpp:1124`](../../tiberiandawn/idata.cpp#L1124), `C9`).
  - **Engine target:** `C9.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 375 generated frames (minimum calculated from CivilianDos9); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0182/0000.png` through `0374.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0183 — chan** · [View placeholder](../../game/content/wireframes/previews/WF-0183.svg) · engine slot `INFANTRY_CHAN` ([`tiberiandawn/idata.cpp:1394`](../../tiberiandawn/idata.cpp#L1394), `DrChan`).
  - **Engine target:** `CHAN.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 258 generated frames (minimum calculated from DrChanDos); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0183/0000.png` through `0257.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0184 — delphi** · [View placeholder](../../game/content/wireframes/previews/WF-0184.svg) · engine slot `INFANTRY_DELPHI` ([`tiberiandawn/idata.cpp:1327`](../../tiberiandawn/idata.cpp#L1327), `Delphi`).
  - **Engine target:** `DELPHI.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 375 generated frames (minimum calculated from DelphiDos); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0184/0000.png` through `0374.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0185 — e1** · [View placeholder](../../game/content/wireframes/previews/WF-0185.svg) · [Source-audited frame contract](REPRESENTATIVE_FRAME_CONTRACTS.md#wf-0185) · engine slot `INFANTRY_E1` ([`tiberiandawn/idata.cpp:100`](../../tiberiandawn/idata.cpp#L100), `E1`).
  - **Engine target:** `E1.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 532 generated frames (minimum calculated from MiniGunnerDos); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0185/0000.png` through `0531.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0186 — e2** · [View placeholder](../../game/content/wireframes/previews/WF-0186.svg) · engine slot `INFANTRY_E2` ([`tiberiandawn/idata.cpp:170`](../../tiberiandawn/idata.cpp#L170), `E2`).
  - **Engine target:** `E2.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 660 generated frames (minimum calculated from GrenadierDos); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0186/0000.png` through `0659.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0187 — e3** · [View placeholder](../../game/content/wireframes/previews/WF-0187.svg) · engine slot `INFANTRY_E3` ([`tiberiandawn/idata.cpp:239`](../../tiberiandawn/idata.cpp#L239), `E3`).
  - **Engine target:** `E3.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 548 generated frames (minimum calculated from BazookaDos); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0187/0000.png` through `0547.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0188 — e4** · [View placeholder](../../game/content/wireframes/previews/WF-0188.svg) · engine slot `INFANTRY_E4` ([`tiberiandawn/idata.cpp:309`](../../tiberiandawn/idata.cpp#L309), `E4`).
  - **Engine target:** `E4.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 660 generated frames (minimum calculated from FlamethrowerDos); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0188/0000.png` through `0659.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0189 — e5** · [View placeholder](../../game/content/wireframes/previews/WF-0189.svg) · engine slot `INFANTRY_E5` ([`tiberiandawn/idata.cpp:377`](../../tiberiandawn/idata.cpp#L377), `E5`).
  - **Engine target:** `E5.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 660 generated frames (minimum calculated from ChemwarriorDos); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0189/0000.png` through `0659.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0190 — e7** · [View placeholder](../../game/content/wireframes/previews/WF-0190.svg) · engine slot `INFANTRY_E7` ([`tiberiandawn/idata.cpp:447`](../../tiberiandawn/idata.cpp#L447), `E7`).
  - **Engine target:** `E6.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 248 generated frames (minimum calculated from EngineerDos); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0190/0000.png` through `0247.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0191 — moebius** · [View placeholder](../../game/content/wireframes/previews/WF-0191.svg) · engine slot `INFANTRY_MOEBIUS` ([`tiberiandawn/idata.cpp:1260`](../../tiberiandawn/idata.cpp#L1260), `Moebius`).
  - **Engine target:** `MOEBIUS.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 258 generated frames (minimum calculated from MoebiusDos); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0191/0000.png` through `0257.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0192 — rambo** · [View placeholder](../../game/content/wireframes/previews/WF-0192.svg) · engine slot `INFANTRY_RAMBO` ([`tiberiandawn/idata.cpp:517`](../../tiberiandawn/idata.cpp#L517), `Commando`).
  - **Engine target:** `RMBO.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 468 generated frames (minimum calculated from CommandoDos); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0192/0000.png` through `0467.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match infantry state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

## Overlay (30)

Road, wall, resource, decal or crate cells with neighbor-join and damage variants. These use the theater icon/overlay system: SVG preview is a design reference, not yet a verified tactical SHP replacement.

- [ ] **WF-0193 — barbwire wall** · [View placeholder](../../game/content/wireframes/previews/WF-0193.svg) · engine slot `OVERLAY_BARBWIRE_WALL` ([`tiberiandawn/odata.cpp:130`](../../tiberiandawn/odata.cpp#L130), `Barbwire`).
  - **Engine target:** `BARB.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0193/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0009.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0194 — brick wall** · [View placeholder](../../game/content/wireframes/previews/WF-0194.svg) · engine slot `OVERLAY_BRICK_WALL` ([`tiberiandawn/odata.cpp:114`](../../tiberiandawn/odata.cpp#L114), `Brick`).
  - **Engine target:** `BRIK.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0194/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0012.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0195 — concrete** · [View placeholder](../../game/content/wireframes/previews/WF-0195.svg) · engine slot `OVERLAY_CONCRETE` ([`tiberiandawn/odata.cpp:66`](../../tiberiandawn/odata.cpp#L66), `Concrete`).
  - **Engine target:** `CONC.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0195/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0196 — cyclone wall** · [View placeholder](../../game/content/wireframes/previews/WF-0196.svg) · engine slot `OVERLAY_CYCLONE_WALL` ([`tiberiandawn/odata.cpp:98`](../../tiberiandawn/odata.cpp#L98), `Cyclone`).
  - **Engine target:** `CYCL.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0196/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0014.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0197 — flag spot** · [View placeholder](../../game/content/wireframes/previews/WF-0197.svg) · engine slot `OVERLAY_FLAG_SPOT` ([`tiberiandawn/odata.cpp:483`](../../tiberiandawn/odata.cpp#L483), `FlagSpot`).
  - **Engine target:** `FPLS.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0197/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0198 — road** · [View placeholder](../../game/content/wireframes/previews/WF-0198.svg) · engine slot `OVERLAY_ROAD` ([`tiberiandawn/odata.cpp:50`](../../tiberiandawn/odata.cpp#L50), `Road`).
  - **Engine target:** `ROAD.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0198/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0027.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0199 — sandbag wall** · [View placeholder](../../game/content/wireframes/previews/WF-0199.svg) · engine slot `OVERLAY_SANDBAG_WALL` ([`tiberiandawn/odata.cpp:82`](../../tiberiandawn/odata.cpp#L82), `Sandbag`).
  - **Engine target:** `SBAG.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0199/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0029.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0200 — squish** · [View placeholder](../../game/content/wireframes/previews/WF-0200.svg) · engine slot `OVERLAY_SQUISH` ([`tiberiandawn/odata.cpp:354`](../../tiberiandawn/odata.cpp#L354), `Squish`).
  - **Engine target:** `SQUISH.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0200/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0201 — steel crate** · [View placeholder](../../game/content/wireframes/previews/WF-0201.svg) · engine slot `OVERLAY_STEEL_CRATE` ([`tiberiandawn/odata.cpp:515`](../../tiberiandawn/odata.cpp#L515), `SteelCrate`).
  - **Engine target:** `SCRATE.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0201/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0202 — tiberium1** · [View placeholder](../../game/content/wireframes/previews/WF-0202.svg) · engine slot `OVERLAY_TIBERIUM1` ([`tiberiandawn/odata.cpp:162`](../../tiberiandawn/odata.cpp#L162), `Tiberium1`).
  - **Engine target:** `TI1.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0202/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0203 — tiberium10** · [View placeholder](../../game/content/wireframes/previews/WF-0203.svg) · engine slot `OVERLAY_TIBERIUM10` ([`tiberiandawn/odata.cpp:306`](../../tiberiandawn/odata.cpp#L306), `Tiberium10`).
  - **Engine target:** `TI10.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0203/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0204 — tiberium11** · [View placeholder](../../game/content/wireframes/previews/WF-0204.svg) · engine slot `OVERLAY_TIBERIUM11` ([`tiberiandawn/odata.cpp:322`](../../tiberiandawn/odata.cpp#L322), `Tiberium11`).
  - **Engine target:** `TI11.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0204/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0205 — tiberium12** · [View placeholder](../../game/content/wireframes/previews/WF-0205.svg) · engine slot `OVERLAY_TIBERIUM12` ([`tiberiandawn/odata.cpp:338`](../../tiberiandawn/odata.cpp#L338), `Tiberium12`).
  - **Engine target:** `TI12.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0205/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0206 — tiberium2** · [View placeholder](../../game/content/wireframes/previews/WF-0206.svg) · engine slot `OVERLAY_TIBERIUM2` ([`tiberiandawn/odata.cpp:178`](../../tiberiandawn/odata.cpp#L178), `Tiberium2`).
  - **Engine target:** `TI2.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0206/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0207 — tiberium3** · [View placeholder](../../game/content/wireframes/previews/WF-0207.svg) · engine slot `OVERLAY_TIBERIUM3` ([`tiberiandawn/odata.cpp:194`](../../tiberiandawn/odata.cpp#L194), `Tiberium3`).
  - **Engine target:** `TI3.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0207/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0208 — tiberium4** · [View placeholder](../../game/content/wireframes/previews/WF-0208.svg) · engine slot `OVERLAY_TIBERIUM4` ([`tiberiandawn/odata.cpp:210`](../../tiberiandawn/odata.cpp#L210), `Tiberium4`).
  - **Engine target:** `TI4.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0208/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0209 — tiberium5** · [View placeholder](../../game/content/wireframes/previews/WF-0209.svg) · engine slot `OVERLAY_TIBERIUM5` ([`tiberiandawn/odata.cpp:226`](../../tiberiandawn/odata.cpp#L226), `Tiberium5`).
  - **Engine target:** `TI5.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0209/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0210 — tiberium6** · [View placeholder](../../game/content/wireframes/previews/WF-0210.svg) · engine slot `OVERLAY_TIBERIUM6` ([`tiberiandawn/odata.cpp:242`](../../tiberiandawn/odata.cpp#L242), `Tiberium6`).
  - **Engine target:** `TI6.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0210/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0211 — tiberium7** · [View placeholder](../../game/content/wireframes/previews/WF-0211.svg) · engine slot `OVERLAY_TIBERIUM7` ([`tiberiandawn/odata.cpp:258`](../../tiberiandawn/odata.cpp#L258), `Tiberium7`).
  - **Engine target:** `TI7.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0211/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0212 — tiberium8** · [View placeholder](../../game/content/wireframes/previews/WF-0212.svg) · engine slot `OVERLAY_TIBERIUM8` ([`tiberiandawn/odata.cpp:274`](../../tiberiandawn/odata.cpp#L274), `Tiberium8`).
  - **Engine target:** `TI8.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0212/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0213 — tiberium9** · [View placeholder](../../game/content/wireframes/previews/WF-0213.svg) · engine slot `OVERLAY_TIBERIUM9` ([`tiberiandawn/odata.cpp:290`](../../tiberiandawn/odata.cpp#L290), `Tiberium9`).
  - **Engine target:** `TI9.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0213/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0214 — v12** · [View placeholder](../../game/content/wireframes/previews/WF-0214.svg) · engine slot `OVERLAY_V12` ([`tiberiandawn/odata.cpp:371`](../../tiberiandawn/odata.cpp#L371), `V12`).
  - **Engine target:** `V12.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0214/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0045.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0215 — v13** · [View placeholder](../../game/content/wireframes/previews/WF-0215.svg) · engine slot `OVERLAY_V13` ([`tiberiandawn/odata.cpp:387`](../../tiberiandawn/odata.cpp#L387), `V13`).
  - **Engine target:** `V13.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0215/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0046.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0216 — v14** · [View placeholder](../../game/content/wireframes/previews/WF-0216.svg) · engine slot `OVERLAY_V14` ([`tiberiandawn/odata.cpp:403`](../../tiberiandawn/odata.cpp#L403), `V14`).
  - **Engine target:** `V14.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0216/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0047.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0217 — v15** · [View placeholder](../../game/content/wireframes/previews/WF-0217.svg) · engine slot `OVERLAY_V15` ([`tiberiandawn/odata.cpp:419`](../../tiberiandawn/odata.cpp#L419), `V15`).
  - **Engine target:** `V15.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0217/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0048.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0218 — v16** · [View placeholder](../../game/content/wireframes/previews/WF-0218.svg) · engine slot `OVERLAY_V16` ([`tiberiandawn/odata.cpp:435`](../../tiberiandawn/odata.cpp#L435), `V16`).
  - **Engine target:** `V16.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0218/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0049.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0219 — v17** · [View placeholder](../../game/content/wireframes/previews/WF-0219.svg) · engine slot `OVERLAY_V17` ([`tiberiandawn/odata.cpp:451`](../../tiberiandawn/odata.cpp#L451), `V17`).
  - **Engine target:** `V17.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0219/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0050.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0220 — v18** · [View placeholder](../../game/content/wireframes/previews/WF-0220.svg) · engine slot `OVERLAY_V18` ([`tiberiandawn/odata.cpp:467`](../../tiberiandawn/odata.cpp#L467), `V18`).
  - **Engine target:** `V18.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0220/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0051.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0221 — wood crate** · [View placeholder](../../game/content/wireframes/previews/WF-0221.svg) · engine slot `OVERLAY_WOOD_CRATE` ([`tiberiandawn/odata.cpp:499`](../../tiberiandawn/odata.cpp#L499), `WoodCrate`).
  - **Engine target:** `WCRATE.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0221/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

- [ ] **WF-0222 — wood wall** · [View placeholder](../../game/content/wireframes/previews/WF-0222.svg) · engine slot `OVERLAY_WOOD_WALL` ([`tiberiandawn/odata.cpp:146`](../../tiberiandawn/odata.cpp#L146), `Wood`).
  - **Engine target:** `WOOD.SHP`. **Placeholder contract (provisional):** 24×24 indexed pixels, 16 generated frames (provisional allocation; verify exact frame use); format `theater-overlay-unverified`.
  - **Final art input:** `game/content/wireframes/final/WF-0222/0000.png` through `0015.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match overlay state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0071.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **design-only**.

## Projectile (19)

Heading, flight, hit, explosion or intentionally invisible states per weapon code. Validate visibility requirements before replacing; not every bullet requires a drawn sprite.

- [ ] **WF-0223 — apds** · [View placeholder](../../game/content/wireframes/previews/WF-0223.svg) · engine slot `BULLET_APDS` ([`tiberiandawn/bbdata.cpp:109`](../../tiberiandawn/bbdata.cpp#L109), `ClassAPDS`).
  - **Engine target:** `120MM.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0223/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0228.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0224 — bullet** · [View placeholder](../../game/content/wireframes/previews/WF-0224.svg) · engine slot `BULLET_BULLET` ([`tiberiandawn/bbdata.cpp:65`](../../tiberiandawn/bbdata.cpp#L65), `ClassBullet`).
  - **Engine target:** `50CAL.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0224/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0236, WF-0237.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0225 — chemspray** · [View placeholder](../../game/content/wireframes/previews/WF-0225.svg) · engine slot `BULLET_CHEMSPRAY` ([`tiberiandawn/bbdata.cpp:263`](../../tiberiandawn/bbdata.cpp#L263), `ClassChem`).
  - **Engine target:** `FLAME.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0225/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0226.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0226 — flame** · [View placeholder](../../game/content/wireframes/previews/WF-0226.svg) · engine slot `BULLET_FLAME` ([`tiberiandawn/bbdata.cpp:241`](../../tiberiandawn/bbdata.cpp#L241), `ClassFlame`).
  - **Engine target:** `FLAME.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0226/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0225.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0227 — grenade** · [View placeholder](../../game/content/wireframes/previews/WF-0227.svg) · engine slot `BULLET_GRENADE` ([`tiberiandawn/bbdata.cpp:307`](../../tiberiandawn/bbdata.cpp#L307), `ClassGrenade`).
  - **Engine target:** `BOMB.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0227/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0228 — he** · [View placeholder](../../game/content/wireframes/previews/WF-0228.svg) · engine slot `BULLET_HE` ([`tiberiandawn/bbdata.cpp:131`](../../tiberiandawn/bbdata.cpp#L131), `Class120mm`).
  - **Engine target:** `120MM.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0228/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0223.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0229 — headbutt** · [View placeholder](../../game/content/wireframes/previews/WF-0229.svg) · engine slot `BULLET_HEADBUTT` ([`tiberiandawn/bbdata.cpp:417`](../../tiberiandawn/bbdata.cpp#L417), `ClassHeadButt`).
  - **Engine target:** `GORE.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0229/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0230 — honest john** · [View placeholder](../../game/content/wireframes/previews/WF-0230.svg) · engine slot `BULLET_HONEST_JOHN` ([`tiberiandawn/bbdata.cpp:395`](../../tiberiandawn/bbdata.cpp#L395), `ClassHonestJohn`).
  - **Engine target:** `MISSILE.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0230/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0235.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0231 — laser** · [View placeholder](../../game/content/wireframes/previews/WF-0231.svg) · engine slot `BULLET_LASER` ([`tiberiandawn/bbdata.cpp:329`](../../tiberiandawn/bbdata.cpp#L329), `ClassLaser`).
  - **Engine target:** `LASER.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0231/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0232 — napalm** · [View placeholder](../../game/content/wireframes/previews/WF-0232.svg) · engine slot `BULLET_NAPALM` ([`tiberiandawn/bbdata.cpp:285`](../../tiberiandawn/bbdata.cpp#L285), `ClassNapalm`).
  - **Engine target:** `BOMBLET.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0232/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0233 — nuke down** · [View placeholder](../../game/content/wireframes/previews/WF-0233.svg) · engine slot `BULLET_NUKE_DOWN` ([`tiberiandawn/bbdata.cpp:373`](../../tiberiandawn/bbdata.cpp#L373), `ClassNukeDown`).
  - **Engine target:** `ATOMICDN.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0233/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0234 — nuke up** · [View placeholder](../../game/content/wireframes/previews/WF-0234.svg) · engine slot `BULLET_NUKE_UP` ([`tiberiandawn/bbdata.cpp:351`](../../tiberiandawn/bbdata.cpp#L351), `ClassNukeUp`).
  - **Engine target:** `ATOMICUP.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0234/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0235 — sam** · [View placeholder](../../game/content/wireframes/previews/WF-0235.svg) · engine slot `BULLET_SAM` ([`tiberiandawn/bbdata.cpp:197`](../../tiberiandawn/bbdata.cpp#L197), `ClassPatriot`).
  - **Engine target:** `MISSILE.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0235/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0230.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0236 — sniper** · [View placeholder](../../game/content/wireframes/previews/WF-0236.svg) · engine slot `BULLET_SNIPER` ([`tiberiandawn/bbdata.cpp:43`](../../tiberiandawn/bbdata.cpp#L43), `ClassSniper`).
  - **Engine target:** `50CAL.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0236/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0224, WF-0237.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0237 — spreadfire** · [View placeholder](../../game/content/wireframes/previews/WF-0237.svg) · engine slot `BULLET_SPREADFIRE` ([`tiberiandawn/bbdata.cpp:87`](../../tiberiandawn/bbdata.cpp#L87), `ClassSpreadfire`).
  - **Engine target:** `50CAL.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0237/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0224, WF-0236.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0238 — ssm** · [View placeholder](../../game/content/wireframes/previews/WF-0238.svg) · engine slot `BULLET_SSM` ([`tiberiandawn/bbdata.cpp:153`](../../tiberiandawn/bbdata.cpp#L153), `ClassMissile`).
  - **Engine target:** `DRAGON.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0238/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0239, WF-0240.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0239 — ssm2** · [View placeholder](../../game/content/wireframes/previews/WF-0239.svg) · engine slot `BULLET_SSM2` ([`tiberiandawn/bbdata.cpp:175`](../../tiberiandawn/bbdata.cpp#L175), `ClassMissile2`).
  - **Engine target:** `DRAGON.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0239/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0238, WF-0240.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0240 — tow** · [View placeholder](../../game/content/wireframes/previews/WF-0240.svg) · engine slot `BULLET_TOW` ([`tiberiandawn/bbdata.cpp:219`](../../tiberiandawn/bbdata.cpp#L219), `ClassDragon`).
  - **Engine target:** `DRAGON.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0240/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0238, WF-0239.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0241 — trexbite** · [View placeholder](../../game/content/wireframes/previews/WF-0241.svg) · engine slot `BULLET_TREXBITE` ([`tiberiandawn/bbdata.cpp:439`](../../tiberiandawn/bbdata.cpp#L439), `ClassTRexBite`).
  - **Engine target:** `CHEW.SHP`. **Placeholder contract (provisional):** 16×16 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0241/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match projectile state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

## Terrain (32)

Theater-dependent vegetation/rock silhouette, tile footprint, collision/selection footprint, burning/damage stages where applicable. Preserve ground contact and transparent pixels.

- [ ] **WF-0242 — blossomtree1** · [View placeholder](../../game/content/wireframes/previews/WF-0242.svg) · engine slot `TERRAIN_BLOSSOMTREE1` ([`tiberiandawn/tdata.cpp:419`](../../tiberiandawn/tdata.cpp#L419), `Split1Class`).
  - **Engine target:** `SPLIT2.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0242/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0243 — blossomtree2** · [View placeholder](../../game/content/wireframes/previews/WF-0243.svg) · engine slot `TERRAIN_BLOSSOMTREE2` ([`tiberiandawn/tdata.cpp:438`](../../tiberiandawn/tdata.cpp#L438), `Split2Class`).
  - **Engine target:** `SPLIT3.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0243/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0244 — clump1** · [View placeholder](../../game/content/wireframes/previews/WF-0244.svg) · engine slot `TERRAIN_CLUMP1` ([`tiberiandawn/tdata.cpp:457`](../../tiberiandawn/tdata.cpp#L457), `Clump1Class`).
  - **Engine target:** `TC01.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0244/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0245 — clump2** · [View placeholder](../../game/content/wireframes/previews/WF-0245.svg) · engine slot `TERRAIN_CLUMP2` ([`tiberiandawn/tdata.cpp:476`](../../tiberiandawn/tdata.cpp#L476), `Clump2Class`).
  - **Engine target:** `TC02.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0245/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0246 — clump3** · [View placeholder](../../game/content/wireframes/previews/WF-0246.svg) · engine slot `TERRAIN_CLUMP3` ([`tiberiandawn/tdata.cpp:495`](../../tiberiandawn/tdata.cpp#L495), `Clump3Class`).
  - **Engine target:** `TC03.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0246/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0247 — clump4** · [View placeholder](../../game/content/wireframes/previews/WF-0247.svg) · engine slot `TERRAIN_CLUMP4` ([`tiberiandawn/tdata.cpp:514`](../../tiberiandawn/tdata.cpp#L514), `Clump4Class`).
  - **Engine target:** `TC04.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0247/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0248 — clump5** · [View placeholder](../../game/content/wireframes/previews/WF-0248.svg) · engine slot `TERRAIN_CLUMP5` ([`tiberiandawn/tdata.cpp:533`](../../tiberiandawn/tdata.cpp#L533), `Clump5Class`).
  - **Engine target:** `TC05.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0248/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0249 — rock1** · [View placeholder](../../game/content/wireframes/previews/WF-0249.svg) · engine slot `TERRAIN_ROCK1` ([`tiberiandawn/tdata.cpp:552`](../../tiberiandawn/tdata.cpp#L552), `Rock1Class`).
  - **Engine target:** `ROCK1.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0249/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0250 — rock2** · [View placeholder](../../game/content/wireframes/previews/WF-0250.svg) · engine slot `TERRAIN_ROCK2` ([`tiberiandawn/tdata.cpp:571`](../../tiberiandawn/tdata.cpp#L571), `Rock2Class`).
  - **Engine target:** `ROCK2.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0250/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0251 — rock3** · [View placeholder](../../game/content/wireframes/previews/WF-0251.svg) · engine slot `TERRAIN_ROCK3` ([`tiberiandawn/tdata.cpp:590`](../../tiberiandawn/tdata.cpp#L590), `Rock3Class`).
  - **Engine target:** `ROCK3.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0251/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0252 — rock4** · [View placeholder](../../game/content/wireframes/previews/WF-0252.svg) · engine slot `TERRAIN_ROCK4` ([`tiberiandawn/tdata.cpp:609`](../../tiberiandawn/tdata.cpp#L609), `Rock4Class`).
  - **Engine target:** `ROCK4.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0252/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0253 — rock5** · [View placeholder](../../game/content/wireframes/previews/WF-0253.svg) · engine slot `TERRAIN_ROCK5` ([`tiberiandawn/tdata.cpp:628`](../../tiberiandawn/tdata.cpp#L628), `Rock5Class`).
  - **Engine target:** `ROCK5.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0253/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0254 — rock6** · [View placeholder](../../game/content/wireframes/previews/WF-0254.svg) · engine slot `TERRAIN_ROCK6` ([`tiberiandawn/tdata.cpp:647`](../../tiberiandawn/tdata.cpp#L647), `Rock6Class`).
  - **Engine target:** `ROCK6.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0254/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0255 — rock7** · [View placeholder](../../game/content/wireframes/previews/WF-0255.svg) · engine slot `TERRAIN_ROCK7` ([`tiberiandawn/tdata.cpp:666`](../../tiberiandawn/tdata.cpp#L666), `Rock7Class`).
  - **Engine target:** `ROCK7.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0255/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0256 — tree1** · [View placeholder](../../game/content/wireframes/previews/WF-0256.svg) · [Source-audited frame contract](REPRESENTATIVE_FRAME_CONTRACTS.md#wf-0256) · engine slot `TERRAIN_TREE1` ([`tiberiandawn/tdata.cpp:77`](../../tiberiandawn/tdata.cpp#L77), `Tree1Class`).
  - **Engine target:** `T01.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0256/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0257 — tree10** · [View placeholder](../../game/content/wireframes/previews/WF-0257.svg) · engine slot `TERRAIN_TREE10` ([`tiberiandawn/tdata.cpp:248`](../../tiberiandawn/tdata.cpp#L248), `Tree10Class`).
  - **Engine target:** `T10.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0257/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0258 — tree11** · [View placeholder](../../game/content/wireframes/previews/WF-0258.svg) · engine slot `TERRAIN_TREE11` ([`tiberiandawn/tdata.cpp:267`](../../tiberiandawn/tdata.cpp#L267), `Tree11Class`).
  - **Engine target:** `T11.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0258/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0259 — tree12** · [View placeholder](../../game/content/wireframes/previews/WF-0259.svg) · engine slot `TERRAIN_TREE12` ([`tiberiandawn/tdata.cpp:286`](../../tiberiandawn/tdata.cpp#L286), `Tree12Class`).
  - **Engine target:** `T12.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0259/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0260 — tree13** · [View placeholder](../../game/content/wireframes/previews/WF-0260.svg) · engine slot `TERRAIN_TREE13` ([`tiberiandawn/tdata.cpp:305`](../../tiberiandawn/tdata.cpp#L305), `Tree13Class`).
  - **Engine target:** `T13.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0260/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0261 — tree14** · [View placeholder](../../game/content/wireframes/previews/WF-0261.svg) · engine slot `TERRAIN_TREE14` ([`tiberiandawn/tdata.cpp:324`](../../tiberiandawn/tdata.cpp#L324), `Tree14Class`).
  - **Engine target:** `T14.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0261/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0262 — tree15** · [View placeholder](../../game/content/wireframes/previews/WF-0262.svg) · engine slot `TERRAIN_TREE15` ([`tiberiandawn/tdata.cpp:343`](../../tiberiandawn/tdata.cpp#L343), `Tree15Class`).
  - **Engine target:** `T15.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0262/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0263 — tree16** · [View placeholder](../../game/content/wireframes/previews/WF-0263.svg) · engine slot `TERRAIN_TREE16` ([`tiberiandawn/tdata.cpp:362`](../../tiberiandawn/tdata.cpp#L362), `Tree16Class`).
  - **Engine target:** `T16.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0263/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0264 — tree17** · [View placeholder](../../game/content/wireframes/previews/WF-0264.svg) · engine slot `TERRAIN_TREE17` ([`tiberiandawn/tdata.cpp:381`](../../tiberiandawn/tdata.cpp#L381), `Tree17Class`).
  - **Engine target:** `T17.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0264/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0265 — tree18** · [View placeholder](../../game/content/wireframes/previews/WF-0265.svg) · engine slot `TERRAIN_TREE18` ([`tiberiandawn/tdata.cpp:400`](../../tiberiandawn/tdata.cpp#L400), `Tree18Class`).
  - **Engine target:** `T18.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0265/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0266 — tree2** · [View placeholder](../../game/content/wireframes/previews/WF-0266.svg) · engine slot `TERRAIN_TREE2` ([`tiberiandawn/tdata.cpp:96`](../../tiberiandawn/tdata.cpp#L96), `Tree2Class`).
  - **Engine target:** `T02.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0266/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0267 — tree3** · [View placeholder](../../game/content/wireframes/previews/WF-0267.svg) · engine slot `TERRAIN_TREE3` ([`tiberiandawn/tdata.cpp:115`](../../tiberiandawn/tdata.cpp#L115), `Tree3Class`).
  - **Engine target:** `T03.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0267/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0268 — tree4** · [View placeholder](../../game/content/wireframes/previews/WF-0268.svg) · engine slot `TERRAIN_TREE4` ([`tiberiandawn/tdata.cpp:134`](../../tiberiandawn/tdata.cpp#L134), `Tree4Class`).
  - **Engine target:** `T04.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0268/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0269 — tree5** · [View placeholder](../../game/content/wireframes/previews/WF-0269.svg) · engine slot `TERRAIN_TREE5` ([`tiberiandawn/tdata.cpp:153`](../../tiberiandawn/tdata.cpp#L153), `Tree5Class`).
  - **Engine target:** `T05.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0269/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0270 — tree6** · [View placeholder](../../game/content/wireframes/previews/WF-0270.svg) · engine slot `TERRAIN_TREE6` ([`tiberiandawn/tdata.cpp:172`](../../tiberiandawn/tdata.cpp#L172), `Tree6Class`).
  - **Engine target:** `T06.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0270/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0271 — tree7** · [View placeholder](../../game/content/wireframes/previews/WF-0271.svg) · engine slot `TERRAIN_TREE7` ([`tiberiandawn/tdata.cpp:191`](../../tiberiandawn/tdata.cpp#L191), `Tree7Class`).
  - **Engine target:** `T07.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0271/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0272 — tree8** · [View placeholder](../../game/content/wireframes/previews/WF-0272.svg) · engine slot `TERRAIN_TREE8` ([`tiberiandawn/tdata.cpp:210`](../../tiberiandawn/tdata.cpp#L210), `Tree8Class`).
  - **Engine target:** `T08.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0272/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0273 — tree9** · [View placeholder](../../game/content/wireframes/previews/WF-0273.svg) · engine slot `TERRAIN_TREE9` ([`tiberiandawn/tdata.cpp:229`](../../tiberiandawn/tdata.cpp#L229), `Tree9Class`).
  - **Engine target:** `T09.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 32 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0273/0000.png` through `0031.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match terrain state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

## Vehicle (22)

32 heading frames (0–31); turret or radar layers from frame 32 when applicable; ammo, movement, door and damage variations depend on class flags. For this placeholder the first 32 are directional; later frames are repeatable stand-ins.

- [ ] **WF-0274 — apc** · [View placeholder](../../game/content/wireframes/previews/WF-0274.svg) · engine slot `UNIT_APC` ([`tiberiandawn/udata.cpp:907`](../../tiberiandawn/udata.cpp#L907), `UnitAPC`).
  - **Engine target:** `APC.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0274/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0275 — arty** · [View placeholder](../../game/content/wireframes/previews/WF-0275.svg) · engine slot `UNIT_ARTY` ([`tiberiandawn/udata.cpp:531`](../../tiberiandawn/udata.cpp#L531), `UnitArty`).
  - **Engine target:** `ARTY.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0275/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0276 — bike** · [View placeholder](../../game/content/wireframes/previews/WF-0276.svg) · engine slot `UNIT_BIKE` ([`tiberiandawn/udata.cpp:797`](../../tiberiandawn/udata.cpp#L797), `UnitBike`).
  - **Engine target:** `BIKE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0276/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0277 — buggy** · [View placeholder](../../game/content/wireframes/previews/WF-0277.svg) · engine slot `UNIT_BUGGY` ([`tiberiandawn/udata.cpp:744`](../../tiberiandawn/udata.cpp#L744), `UnitBuggy`).
  - **Engine target:** `BGGY.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0277/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0278 — ftank** · [View placeholder](../../game/content/wireframes/previews/WF-0278.svg) · engine slot `UNIT_FTANK` ([`tiberiandawn/udata.cpp:105`](../../tiberiandawn/udata.cpp#L105), `UnitFTank`).
  - **Engine target:** `FTNK.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0278/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0279 — gunboat** · [View placeholder](../../game/content/wireframes/previews/WF-0279.svg) · engine slot `UNIT_GUNBOAT` ([`tiberiandawn/udata.cpp:960`](../../tiberiandawn/udata.cpp#L960), `UnitGunBoat`).
  - **Engine target:** `BOAT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0279/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0280 — harvester** · [View placeholder](../../game/content/wireframes/previews/WF-0280.svg) · engine slot `UNIT_HARVESTER` ([`tiberiandawn/udata.cpp:584`](../../tiberiandawn/udata.cpp#L584), `UnitHarvester`).
  - **Engine target:** `HARV.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0280/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0281 — hover** · [View placeholder](../../game/content/wireframes/previews/WF-0281.svg) · engine slot `UNIT_HOVER` ([`tiberiandawn/udata.cpp:423`](../../tiberiandawn/udata.cpp#L423), `UnitHover`).
  - **Engine target:** `LST.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0281/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0282 — htank** · [View placeholder](../../game/content/wireframes/previews/WF-0282.svg) · engine slot `UNIT_HTANK` ([`tiberiandawn/udata.cpp:317`](../../tiberiandawn/udata.cpp#L317), `UnitHTank`).
  - **Engine target:** `HTNK.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0282/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0283 — jeep** · [View placeholder](../../game/content/wireframes/previews/WF-0283.svg) · engine slot `UNIT_JEEP` ([`tiberiandawn/udata.cpp:691`](../../tiberiandawn/udata.cpp#L691), `UnitJeep`).
  - **Engine target:** `JEEP.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0283/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0284 — ltank** · [View placeholder](../../game/content/wireframes/previews/WF-0284.svg) · engine slot `UNIT_LTANK` ([`tiberiandawn/udata.cpp:211`](../../tiberiandawn/udata.cpp#L211), `UnitLTank`).
  - **Engine target:** `LTNK.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0284/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0285 — mcv** · [View placeholder](../../game/content/wireframes/previews/WF-0285.svg) · engine slot `UNIT_MCV` ([`tiberiandawn/udata.cpp:638`](../../tiberiandawn/udata.cpp#L638), `UnitMCV`).
  - **Engine target:** `MCV.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0285/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0286 — mhq** · [View placeholder](../../game/content/wireframes/previews/WF-0286.svg) · engine slot `UNIT_MHQ` ([`tiberiandawn/udata.cpp:370`](../../tiberiandawn/udata.cpp#L370), `UnitMHQ`).
  - **Engine target:** `MHQ.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0286/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0287 — mlrs** · [View placeholder](../../game/content/wireframes/previews/WF-0287.svg) · engine slot `UNIT_MLRS` ([`tiberiandawn/udata.cpp:854`](../../tiberiandawn/udata.cpp#L854), `UnitMLRS`).
  - **Engine target:** `MSAM.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0287/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0288 — msam** · [View placeholder](../../game/content/wireframes/previews/WF-0288.svg) · engine slot `UNIT_MSAM` ([`tiberiandawn/udata.cpp:477`](../../tiberiandawn/udata.cpp#L477), `UnitSAM`).
  - **Engine target:** `MLRS.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0288/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0289 — mtank** · [View placeholder](../../game/content/wireframes/previews/WF-0289.svg) · [Source-audited frame contract](REPRESENTATIVE_FRAME_CONTRACTS.md#wf-0289) · engine slot `UNIT_MTANK` ([`tiberiandawn/udata.cpp:264`](../../tiberiandawn/udata.cpp#L264), `UnitMTank`).
  - **Engine target:** `MTNK.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0289/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0290 — rapt** · [View placeholder](../../game/content/wireframes/previews/WF-0290.svg) · engine slot `UNIT_RAPT` ([`tiberiandawn/udata.cpp:1115`](../../tiberiandawn/udata.cpp#L1115), `UnitRapt`).
  - **Engine target:** `RAPT.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0290/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0156.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0291 — stank** · [View placeholder](../../game/content/wireframes/previews/WF-0291.svg) · engine slot `UNIT_STANK` ([`tiberiandawn/udata.cpp:158`](../../tiberiandawn/udata.cpp#L158), `UnitSTank`).
  - **Engine target:** `STNK.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0291/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0292 — steg** · [View placeholder](../../game/content/wireframes/previews/WF-0292.svg) · engine slot `UNIT_STEG` ([`tiberiandawn/udata.cpp:1166`](../../tiberiandawn/udata.cpp#L1166), `UnitSteg`).
  - **Engine target:** `STEG.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0292/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0167.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0293 — trex** · [View placeholder](../../game/content/wireframes/previews/WF-0293.svg) · engine slot `UNIT_TREX` ([`tiberiandawn/udata.cpp:1064`](../../tiberiandawn/udata.cpp#L1064), `UnitTrex`).
  - **Engine target:** `TREX.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0293/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0168.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0294 — tric** · [View placeholder](../../game/content/wireframes/previews/WF-0294.svg) · engine slot `UNIT_TRIC` ([`tiberiandawn/udata.cpp:1013`](../../tiberiandawn/udata.cpp#L1013), `UnitTric`).
  - **Engine target:** `TRIC.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0294/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics. **Shared engine filename:** coordinate replacement with WF-0169.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

- [ ] **WF-0295 — vice** · [View placeholder](../../game/content/wireframes/previews/WF-0295.svg) · engine slot `UNIT_VICE` ([`tiberiandawn/udata.cpp:52`](../../tiberiandawn/udata.cpp#L52), `UnitVisceroid`).
  - **Engine target:** `VICE.SHP`. **Placeholder contract (provisional):** 32×32 indexed pixels, 192 generated frames (provisional allocation; verify exact frame use); format `tactical-keyframe`.
  - **Final art input:** `game/content/wireframes/final/WF-0295/0000.png` through `0191.png` (ordered RGBA PNGs), plus `ATTRIBUTION.json` documenting creator/license/source/revision.
  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match vehicle state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.
  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **generated-tactical-placeholder**.

## Separate global dependencies still required

These class entries do not enumerate menus, all tile templates, fonts, complete theater icon sets, missions, UI skin, music, voice lines, audio, particles, or hardcoded special assets (such as `MOUSE.SHP`, `WAKE.SHP`, and `SHADOW.SHP`). Those require distinct manifests and integration work before a wholly standalone game can boot.
