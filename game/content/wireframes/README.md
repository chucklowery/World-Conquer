# Original first-pass art and wireframe replacement kit

This folder is a **license-clean, generated first-pass art kit** for the Tiberian Dawn class slots identified in `tiberiandawn/*data.cpp`. All placeholder graphics are procedural project artwork; no original game art is bundled.

Browse the [eight category contact sheets](../../../docs/browser/ART_FIRST_PASS.md) or use the machine-readable [`first-pass-manifest.json`](first-pass-manifest.json) to find one of **295 unique concepts**. Most class slots use recognizable original schematic silhouettes with distinct review markers; six audited representatives have richer animation and 23 state previews. This is not final approved artwork.

Start with [the complete, individually checked replacement catalog](../../../docs/browser/WIREFRAME_REPLACEMENT_CATALOG.md) or [the machine-readable slot catalog](catalog.json). Every `WF-####` has a [linked SVG preview](previews/WF-0001.svg), an engine enum, original source-code location, resource filename, current placeholder dimensions and frame count, replacement file location, and acceptance criteria.

## Rebuild and preview

From the repository root:

```sh
node tools/content/wireframes.js generate
node tools/content/test-wireframes.js
node tools/content/test-first-pass-art.js
node tools/content/wireframes.js build build/world-conquer-wireframes
```

For a small integration pack representing six different visual classes, run `node tools/content/wireframes.js build build/world-conquer-smoke --representative`. This adds a validated `roster.json` to that output. The browser runtime can import and render that pack with its **Render six wireframe assets** diagnostic; see [the browser runtime instructions](../../../browser/engine/README.md). This validates actual engine file lookup and first-frame tactical drawing, but not all class-specific frame-state contracts.

The six representative classes now also have a [C++-anchored frame contract](../../../docs/browser/REPRESENTATIVE_FRAME_CONTRACTS.md) with action/facing offsets, minimum frame requirements, sampled frame indices, separate dependencies and explicitly unresolved animation details. The `--representative` build checks those contracts and emits `contracts.json`. It refuses stale frame specs. The browser verifies that the manifest's frame counts cover the indexed ranges before staging artwork.

The last command writes a generated `manifest.json`, `files/<category>/WF-####.SHP` tactical keyframe files, `files/WIREFRAME.PAL`, and `game-root/` with non-conflicting engine filenames. Choose a **new output directory** for each build; it intentionally refuses to overwrite an existing one. Generated binary outputs are ignored by git. The `game-root/` folder is a staging input for a future complete asset-mount implementation, **not a playable standalone game**.

Current coverage is 295 engine-defined slots: 265 compiled tactical SHP stand-ins, 30 overlay design references, plus the separately generated `FACTMAKE.SHP` buildup asset. Neither the provisional frame layouts nor every declared `SHP` resource binding has been validated against the full engine. Some enum slots share an engine filename; both retain independent wireframe specs, but the builder excludes colliding filenames from `game-root/` until resolved. See each catalog entry's `sharedFilenameWith` property.

## Replace one placeholder with final art

1. Pick an asset, for example `WF-0001`, in the replacement catalog. Check its C++ constructor and the gameplay code that renders it before approving the final image size, pivot, facing order and animation frame offsets. The listed pixel size and frame count are **provisional placeholder contracts**.
2. Produce newly authored pixel art using the eight active colors of [`placeholder.palette.json`](../source/placeholder.palette.json); exported PNGs must use 8-bit-per-channel RGB or RGBA, match an active palette color, use alpha 0 for transparent pixels (palette index 0), and use alpha 255 for opaque pixels. No antialiasing, partial alpha, color drifting or rescaling. The `.PAL` encoder pads unused positions to the native 256-entry RGB6 table.
3. In `game/content/wireframes/final/WF-0001/`, add exactly `0000.png` through `0079.png` for that item's currently specified 80-frame placeholder contract; each image is 32×32. A real verified frame count can be changed by updating `wireframes.js` with the class-specific requirements and regenerating the catalog before submitting final art.
4. Copy [`ATTRIBUTION.example.json`](ATTRIBUTION.example.json) into that folder as `ATTRIBUTION.json`. Fill in creator, license, source and revision, preserving evidence of redistribution rights. Do not use proprietary game sprites or unverified stock art.
5. Run `node tools/content/wireframes.js build build/your-new-build-name`. The build auto-detects numbered final PNGs and the attribution file, validates color, dimensions and frame count, and substitutes them for the procedural frames in the resulting `.SHP`. Its manifest marks the source `final-art` and records provenance plus SHA-256.
6. Test exact render offsets, theater cell dimensions, frame-state mappings, palette remapping, independent turrets and animated overlays in native and browser gameplay. Only then mark the relevant catalog checkbox complete.

### Format boundaries

- The current SHP packer emits 8-byte tactical full keyframes with LCW encoding. It is verified through native decode round-trip but not validated against **every** class consumer. It does not yet pack MIX archives or use original game art.
- Overlay (`WF-####`, category `overlay`) entries are **design-only**. The original engine uses theater/icon and neighbor-adjacency variants for these; their `.SHP` replacement cannot be accepted until a separately verified adapter is implemented. The builder rejects final-overlay directories deliberately.
- Terrain templates, tile sets, UI, cursors, fonts, complete sound/music, missions and theater-specific data are outside the enumerated 295 class slots and need independent inventories.
- Placeholder identifiers are generated from sorted engine enums; avoid using the numeric `WF-####` alone as a long-lived runtime lookup key. `engineEnum` is authoritative.

## Definition of done for each final asset

- Original source files and authorized attribution exist; no restricted or borrowed media.
- Exact engine filename, palette, theater and class-specific resource format are verified.
- All runtime-referenced animation frames and heading offsets exist and are in the correct order.
- Weapon, muzzle, docking, rotor, shadow, damage, production and death states behave correctly where applicable.
- Selection, collision, footprint, cell origin, center/pivot, layering and transparency are correct at 1× zoom.
- Browser and native rendering agree, with no missing resource references and no build or licensing errors.

This kit provides a drawable production baseline and an explicit backlog, not certification that all current placeholders can already substitute for every original asset at full game startup.
