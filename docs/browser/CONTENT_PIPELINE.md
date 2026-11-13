# Original content pipeline and tactical wireframe integration

This is the reproducible packaging layer for a new World-Conquer game.
It emits native tactical SHP and 6-bit PAL files, and the WebAssembly
diagnostic now resolves and draws the generated shapes using the real engine.
The [295-slot wireframe catalog](WIREFRAME_REPLACEMENT_CATALOG.md) tracks
the placeholder art and final-art requirements. **It is not yet a playable
resource pack**: full class-specific state sequences, overlays, terrain
templates, UI, music, sound and missions remain to be implemented.

## Build

Requires Node.js 18+; no external npm dependencies.

```sh
node tools/content/test-build.js
node browser/engine/test-original-asset.js
node tools/content/test-wireframes.js
node browser/engine/test-wireframe-asset.js
node tools/content/build.js game/content/manifest.json build/world-conquer-content
node tools/content/wireframes.js build build/world-conquer-roster --representative
node browser/engine/test-wireframe-asset.js build/world-conquer-roster
g++ -std=c++11 -Icommon tests/test-original-shape.cpp common/lcw.cpp -o build/test-original-shape
build/test-original-shape build/world-conquer-content/files/units/SCOUT.SHP
```

The destination must not exist. Delete or choose a different *specific build
output* before rebuilding. Generated output contains `manifest.json` with
byte sizes, SHA-256 checksums, creator and license provenance, plus `files/`
holding the original bytes. Asset entries are sorted by ID, producing a
stable index across builds. No timestamps, absolute paths or network requests
enter the manifest.

The sample `unit.placeholder-scout` entry demonstrates the `tactical-shape`
transform, turning an indexed frame JSON file into `files/units/SCOUT.SHP`.
The optional `transform` property defaults to `copy`; source hashes are
recorded separately from hashes of produced files. Index 0 is transparency.
The tactical converter emits a `KeyFrameHeaderType` with 8-byte per-frame
offset entries and literal-only LCW data, based on `common/keyframe.cpp` and
`common/lcw.cpp`. This is the format read by `Build_Frame()` and used by the
unit/infantry `CC_Draw_Shape()` path. The older `indexed-shape` transform is
still available for the distinct cursor-style shape-block format, but **must
not be used for normal tactical unit sprites**. The game still expects a
palette, meaningful dimensions/frame ordering, resource naming, and archives.

The `palette6` transform converts a JSON array of `#RRGGBB` colors into a
256-entry `.PAL` (768 bytes, 6-bit RGB). Omitted palette entries are black and
entry 0 must be black for transparent shape pixels. The sample is generated
as `files/palettes/SCOUT.PAL`. `test-original-shape.cpp` decodes the sample
with the actual engine `LCW_Uncompress()` implementation; the browser test
additionally exercises `CCFileClass` lookup and `Build_Frame()`.

## Source manifest

`game/content/manifest.json` is the hand-edited source of truth. Every asset
requires a stable ID, type, source path relative to the manifest, destination
path relative to `files/`, creator and redistribution license. Optionally set
`sha256` to pin input contents. Allowed categories: `sprite`, `terrain`, `ui`,
`audio`, `music`, `map`, `rules`, `other`.

Use original art under `game/content/source/`, with attribution/rights tracked
per entry. Do not import copyrighted C&C game media into this directory.

## Next integration gates

1. Instrument the C++ engine's archive and loose-file lookups with real,
   privately held game data; record every required resource and format.
2. Implement and test sprite, palette, terrain, and scenario converters into
   formats supported by the original engine (or implement a browser-only
   engine reader). Verify animated directions and palette correctness.
3. Map original game definitions and filenames to project-owned identifiers.
4. `--browser-shape-probe` loads the original sample SHP/PAL and uses the
   actual `CC_Draw_Shape()` tactical function. `--browser-wireframe-probe`
   extends that path to a SHA-256-verified, six-class package: infantry,
   tank, aircraft, construction yard, tree, and effect, each resolved through
   `CCFileClass` and drawn in a native tactical buffer. The browser
   [loader](../../browser/engine/wireframe-asset.js) fails before writes
   on malformed metadata, hash errors, duplicate names or existing files.
   Headless Chromium CI includes the roster and asserts six draw logs and
   visible canvas output. This does **not** validate production frame-state
   lookups or a complete mission.
5. Add a test that loads an entirely original resource pack and completes
   one mission; only then enable bundled-game startup.
6. Publish the validated pack alongside the HTML/JS/WASM bundle, with
   integrity checks and persistent browser cache.

The existing `browser/engine/asset-import.js` remains the experimental
player-file importer and is not replaced by this build tool.
