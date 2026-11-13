# Milestone: first-pass original art for all 295 cataloged class slots

The code-generated concept-art kit now covers **every slot in the existing 295-entry engine-class inventory**, with an original pixel silhouette, a stable catalog ID, a category contact sheet, and a link to that slot's individual SVG. This is a complete *first pass of the inventoried class slots*, **not** all resources required to play a stand-alone game. No original commercial sprites, sound or maps are included.

The [machine-readable first-pass manifest](../../game/content/wireframes/first-pass-manifest.json) records each slot's archetype, canvas, placeholder frame allocation, visual fingerprint, runtime-packaging status and preview/gallery paths. The [replacement catalog](WIREFRAME_REPLACEMENT_CATALOG.md) has the independent `WF-####` checkbox for each slot, source-code references, engine resource filename, PNG destination and final-art acceptance tests.

## Browse the art

| Class | Count | Gallery | Generated concepts |
|---|---:|---|---|
| Aircraft | 5 | [All aircraft](../../game/content/wireframes/sheets/aircraft.svg) | Fixed-wing, rotorcraft and transports; directional flight framing |
| Buildings | 66 | [All buildings](../../game/content/wireframes/sheets/building.svg) | Wall, road, defense, airfield, industrial, power, service and civilian structures |
| Effects | 101 | [All effects](../../game/content/wireframes/sheets/effect.svg) | Explosion, fire, smoke, muzzle flash, signal, impact, crate glow and creature fall |
| Infantry | 20 | [All infantry](../../game/content/wireframes/sheets/infantry.svg) | Civilian, troop, engineer and specialist silhouettes with schematic movement |
| Overlays | 30 | [All overlays](../../game/content/wireframes/sheets/overlay.svg) | Road/wall joins, resource growth, crates and decals (format adapter not yet implemented) |
| Projectiles | 19 | [All projectiles](../../game/content/wireframes/sheets/projectile.svg) | Rocket, ballistic, energy, flame and melee placeholders |
| Terrain objects | 32 | [All terrain](../../game/content/wireframes/sheets/terrain.svg) | Rock, tree, crystal/blossom and scrub variants |
| Vehicles | 22 | [All vehicles](../../game/content/wireframes/sheets/vehicle.svg) | Armor, light wheeled, hover, naval, harvesting, creature and support silhouettes |
| **Total** | **295** | | **295 distinct first-frame image fingerprints** |

The [six representative assets](REPRESENTATIVE_ANIMATION_MILESTONE.md) continue to use more detailed C++-audited state-specific frames, with [23 separate state previews](../../game/content/wireframes/states/) plus the additional `FACTMAKE.SHP` construction resource. The other **289** use recognizable schematic family animations and deliberately small four-pip review identifiers so assets remain distinguishable while final artwork is commissioned.

## What is engine-compatible today?

| Layer | First-pass status | Final-art gate |
|---|---|---|
| 265 non-overlay class slots | Generated tactical SHP frames, original eight-color indexed palette, individual SVGs and manifest; can be built with `wireframes.js build`. The current full build finds **83 colliding class entries**, so only **182 primary class resources** and `FACTMAKE` are mount-ready under unique filenames | Audit exact class frame usage, pivots, dimensions, special layers and production artwork; reconcile each shared filename before extending runtime mounting |
| 30 overlay slots | Original preview art and provisional join-stage variations, **design-only** | Add/test theater icon/overlay encoder and tile-neighbor rules; cannot be staged as tactical SHP |
| `FACTMAKE.SHP` extra | Separate 24-frame provisional tactical SHP and three buildup previews | Confirm construction timing, frame count, pivot, footprint and reverse deconstruction in an actual scene |
| Six C++-audited representative classes | State-aware placeholder animation, real engine SHP decode and browser diagnostic | Validate all states in actual class movement/attack/build/damage events; replace procedural silhouettes |
| UI, cursors, menus, fonts, theater tiles, cameos, maps, audio | **Not inventoried by this class-slot generator** | Complete a separate source-driven resource audit and create authorized replacements; no stand-alone mission is bootable yet |

## Replacement instructions

1. Choose a gallery tile and open its matching [per-asset catalog entry](WIREFRAME_REPLACEMENT_CATALOG.md). Use `engineEnum` as the persistent mapping, not the generated numerical ID alone.
2. Audit the class constructor and render source before finalizing the canvas or frame count. Current counts are **provisional art-production scaffolds**, except the audited subset noted in [the frame contracts](REPRESENTATIVE_FRAME_CONTRACTS.md).
3. Draw wholly original, palette-indexed pixel-art sequences with the same frame-by-frame center, footprint and orientation. Use only current colors from [`placeholder.palette.json`](../../game/content/source/placeholder.palette.json); index 0 is transparent and all visible colors use alpha 255. No interpolation or off-palette pixels.
4. Place exactly numbered `0000.png`…`NNNN.png` files under `game/content/wireframes/final/WF-####/`, plus `ATTRIBUTION.json` with nonempty `creator`, `license`, `source`, `revision` values. For the independent yard buildup use `final/supplemental/FACTMAKE/`. Update the source-anchored count contract *before* changing frame numbers, and retain attribution evidence.
5. Build with `node tools/content/wireframes.js build <fresh-output-dir>`. The packer substitutes final PNGs, rejects invalid color/size/count/provenance, emits tactical SHP and SHA-256 metadata for the non-overlay classes and writes unambiguous engine filenames to `game-root/`.
6. Verify decode and native/Chromium sprite compositing, timing, all headings, silhouette readability at 1×, team remap, selection bounds, shadows, muzzle and turret/rotor layers, damage, special states and actual game scenario behavior. Mark the slot final only after these tests pass.

The four identity pips visible on schematic-only first-pass sprites are **art-review markers** and should not appear in final exported artwork. The geometric style is intentionally original and abstract; the genre and C++ class names guide only the functional silhouette.

## Reproducibility and CI

```sh
node tools/content/wireframes.js generate
node tools/content/test-wireframes.js
node tools/content/test-representative-animation.js
node tools/content/test-first-pass-art.js
node tools/content/wireframes.js build build/new-full-art-pass
```

`generate` refreshes 295 SVG previews, eight contact sheets and `first-pass-manifest.json`; tests reject missing art, duplicate first-frame fingerprints, non-palette colors, broken preview/manifest links and missing representative animation states. The full build can be sizable and is not committed; the browser workflow uses the seven-shape representative pack to validate actual engine loading.

**Full-build evidence:** `wireframes.js build` produced all **266 SHP resources** (265 inventoried classes + one `FACTMAKE`) and a 768-byte palette, totaling about **44.6 MB** of generated bytes. The 30 overlay slots deliberately do not produce SHP files. The builder detects filename conflicts and does not mount those colliding entries.

## Remaining art-resource audit before a complete game

The class constructor inventory does not include all nonclass media. The next milestone should separately enumerate: **theater tile templates and complete terrain/icon formats; sidebar cameos; menus, HUD, cursors and fonts; mission briefing/backdrop artwork; scenario/map-specific objects; aircraft shadows and special hard-coded sprites; palette variants and team-color mapping; audio, voices and music**. Each group needs a source-anchored manifest, replacement rights, loader integration and automated missing-resource detection. Maps, mission logic and rules data must then be authored in addition to visuals.

**Definition of this milestone:** all 295 inventoried slots have unique, reproducible first-pass artwork and replacement guidance. It is not a claim that all 295 image sequences are production-ready, that overlays are native-format compatible, or that a stand-alone RTS is playable.
