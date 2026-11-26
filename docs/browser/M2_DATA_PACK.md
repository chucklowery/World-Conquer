# M2 original data pack

The data pack is everything the **unmodified** VanillaTD engine needs to run a
skirmish match, generated from committed sources by `tools/content/pack.js`.
All content is original placeholder art (CC0). No commercial game data is
used, and generated binaries are never committed; CI builds the pack and
uploads it as the `world-conquer-data-pack` artifact.

## Build it

```bash
# Native MIX tool (once)
cmake -S . -B build/native -G Ninja -DBUILD_VANILLATD=OFF -DBUILD_VANILLARA=OFF \
  -DOPENAL=OFF -DSDL2=OFF -DNETWORKING=OFF -DBUILD_TOOLS=ON
cmake --build build/native --target vanillamix --parallel 4
```

```bash
node tools/content/pack.js build build/browser-engine/data
```

Output in `build/browser-engine/data/`:

| File | What it is |
| --- | --- |
| `game/` | The exact `/game` tree the engine sees: MIX archives plus a few loose boot files |
| `pack.json` | Manifest for `browser/engine/pack-loader.js` (sizes and SHA-256) |
| `archives.json` | Members of every generated MIX archive |
| `PROVENANCE.json` | Generator, sources, licence and revision of every file and archive member |
| `coverage.json` | Required entries produced vs. total, by stage (`boot`, `menu`, `scenario`, `gameplay`) |

Tests: `node tools/content/test-pack.js` (determinism, provenance, archive
placement), `test-boot-pack.js` (strings, no trademarks), `test-scenario.js`,
`test-iconset.js`, `test-theater.js`, and the C++ checks
`tests/test-m2-iconset.cpp` and `tests/test-m2-fading.cpp`.

## Where files must go (the rules that bit us)

1. **Game data must be inside a registered MIX archive.** The engine loads
   shapes, palettes and tiles with `MFCD::Retrieve`, which only searches
   registered archives (`common/mixfile.h`), never loose files. Object
   shapes, cameos and UI go in `CONQUER.MIX`; theater files (templates,
   terrain objects, smudges, `TEMPERAT.PAL`, `T*.MRF`) go in `TEMPERAT.MIX`.
   `MOUSE.SHP` is also in `CCLOCAL.MIX`/`LOCAL.MIX` because it is fetched
   before `CONQUER.MIX` is registered (`init.cpp:268`).
2. **The engine reads its palette tables from data.** `display.cpp:129` and
   `sidebar.cpp:84` define `_RETRIEVE`, so the 11 `T*.MRF` fading and
   translucency tables must be shipped. `tools/content/fading.js` is a
   byte-exact port of the engine's builders; `tests/test-m2-fading.cpp`
   compares it with `common/fading.cpp`.
3. **Palette indices with fixed meaning.** 0 is transparent; 12 is `BLACK`
   (the shroud), 13/14 grey (`common/wwstd.h`); 32–38 cycle
   (`defines.h:1936-1937`), so static art must avoid them; 176–191 are the
   house remap band. Terrain colours are named in `boot-colors.js` `TERRAIN`.
4. **Multiplayer maps need six start waypoints.** `Create_Units`
   (`scenarioini.cpp`) picks a random slot in `0..MPlayerMax-1`, and
   `MPlayerMax` is 6; fewer waypoints spawn a player at a garbage cell.
   `scenario.js` enforces this.
5. **Strings are generated from the `TXT_*` enum** (`conquer.h`), so every
   index exists. `boot-pack.js` `originalText()` holds the original names
   (Aster and Forge, not GDI and Nod); `test-boot-pack.js` fails on any
   trademark or franchise term.

## The requirements inventory

`game/content/pack/requirements.json` lists every file the engine requests,
discovered with the asset audit log (`[asset-hit]` / `[asset-miss]`) and
the engine source:

- Each entry has `name`, `container`, `format`, `requiredFor`
  (`boot|menu|scenario|gameplay|optional`), `referencedAt` (code lines),
  `generator`, and a `contract` (size, frames). Unverified values say so
  (`provisional-upper-bound`).
- `minFrames` contracts are audited from the draw code and enforced by
  `pack.js` (see `M2_ROSTER_CONTRACTS.md`).
- `optionalPatterns` documents engine probes for data that is allowed to be
  absent (scenario-list scans, sounds, movies, optional archives), with the
  reason and code reference for each.

`browser/engine/check-stock-scenario.js` classifies every miss in a real
match against this file and fails on any required or unclassified one.

## Add an object or a file the engine asks for

1. Run the match (`node browser/engine/check-stock-scenario.js`) and read
   `stock-scenario-audit.json` (`unclassifiedMisses`) or the full
   `stock-scenario-log.txt`.
2. Add a `requirements.json` entry with the code line that requests it and
   a `contract`. Use `generator: "placeholders"` for a generated
   placeholder; `tools/content/placeholders.js` picks the format (icon set
   for terrain templates, shape otherwise) and size from the contract.
3. If the engine indexes frames past a fixed point, derive the highest index
   from the draw code and record `minFrames` with its evidence.

## Add a map

Write `game/content/scenarios/<name>.json` (map rectangle, terrain cells,
overlays, trees, six start waypoints) and generate it with
`tools/content/scenario.js`; `pack.js` builds `foundry-test-range.json` as
`SCM94EA.INI`/`.BIN`. The skirmish dialog lists maps by their `[Basic]
Name`.

## M5 art and sound

`pack.js` now layers generated, original art over the placeholders
(ADR-0005):

| Generator | What it makes |
| --- | --- |
| `tools/content/art/build.js` (`models.js`, `render.js`) | The roster: units, structures, build-ups, damaged frames, cameos |
| `tools/content/art/effects.js` | Explosions, hits, muzzle flashes, fire, smoke, projectiles |
| `tools/content/art/ui.js` | Sidebar, buttons, power gauge, build clock, tags, tabs, radar housing, placement grid |
| `tools/content/art/terrain.js` (via `theater.js`) | Every temperate template from its land mask, crystals, trees, aprons, craters |
| `tools/content/sound.js` | Effects, unit replies and COMMS lines (`SOUNDS.MIX`, `SPEECH.MIX`); needs `flite` |
| `tools/content/art/palette.js` | The palette: named ramps and house colours for every remap table |

Previews: `node tools/content/art/map-preview.js <map.json> <out.png>`
renders a map with the terrain art. Tests: `node tools/content/art/test-art.js`
(palette, template table, frame contracts, AUD), plus the existing pack,
theater and scenario tests. `PROVENANCE.json` names the generator of every
archive member; the match audit uses it to fail on any wireframe draw.

## Replace placeholder art later (M5)

Keep the file contracts and swap the generator: the engine only cares about
file names, formats, frame counts, sizes and palette indices. A real sprite
must have at least `minFrames` frames, use the remap band for house colour,
avoid the cycling range, and keep index 0 transparent. Cameos are generated
from each object's sprite, so they follow automatically unless you supply
your own `*ICNH.SHP`.
