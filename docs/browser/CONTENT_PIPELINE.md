# Original content pipeline (initial implementation)

This is the first reproducible packaging layer for a new World-Conquer game.
It can now produce an **experimental indexed SHP shape block**, but does not
yet produce game-ready PAL, MIX, or mission files. Neither the placeholder
SVG nor the sample SHP is integrated with VanillaTD's game definitions.
Do not describe the output as a playable resource pack. Actual in-engine
rendering and a compatibility adapter are still required.

## Build

Requires Node.js 18+; no external npm dependencies.

```sh
node tools/content/test-build.js
node tools/content/build.js game/content/manifest.json build/world-conquer-content
```

The destination must not exist. Delete or choose a different *specific build
output* before rebuilding. Generated output contains `manifest.json` with
byte sizes, SHA-256 checksums, creator and license provenance, plus `files/`
holding the original bytes. Asset entries are sorted by ID, producing a
stable index across builds. No timestamps, absolute paths or network requests
enter the manifest.

The sample `unit.placeholder-scout` entry demonstrates the `indexed-shape`
transform, turning an indexed frame JSON file into `files/units/SCOUT.SHP`.
The optional `transform` property defaults to `copy`; source hashes are
recorded separately from hashes of produced files. Index 0 is transparency.
The converter emits a little-endian shape-block frame table and uncompressed
zero-run image data based on `common/shape.h`, `common/getshape.cpp`, and
`common/wwmouse.cpp`. This is **format-level validation only**. The old engine
uses a global palette and may expect specific dimensions, frame ordering,
additional data, filenames, or embedded archives.

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
4. Add a test that loads an entirely original resource pack and completes
   one mission; only then enable bundled-game startup.
5. Publish the validated pack alongside the HTML/JS/WASM bundle, with
   integrity checks and persistent browser cache.

The existing `browser/engine/asset-import.js` remains the experimental
player-file importer and is not replaced by this build tool.
