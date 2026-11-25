# R04 — Original-content map format, validation and migration

> **Historical (removed 2026-11-24).** This document describes the parallel
> world layer and legacy demos deleted in M3 (see `docs/ROADMAP.md`). The
> code is in git history before the M3 cleanup commit.

The tactical alpha now supports a **versioned map pack** with multiple playable
dimensions and terrain types. All maps are project-authored text: no historical
VanillaTD theater data or proprietary media is imported. The full VanillaTD
campaign file format remains separate.

## Pack manifest v2

`game/content/missions/manifest.json` is a UTF-8 JSON file with
`schema: "world-conquer-map-pack-v2"`, a `default` ID, and 1–16 `maps` entries.
Each entry has a unique lowercase hyphenated `id`, human-readable `title`,
`width` (8–32), `height` (8–24), `format` (`legacy-v1` or `wc-map-v2`),
`file` (`<id>.map`) and the lowercase SHA-256 digest of the **exact bytes**.
Files are at most 65,536 bytes, and the manifest at most 8,192 bytes.
Relative paths, duplicate IDs, invalid hashes, unsupported schema versions,
invalid UTF-8, extra files and manifest/map dimension disagreement fail closed.

The browser fetches and verifies the whole selected map before staging it at
`/COURIER.MAP` in the private Emscripten filesystem. An invalid selection or
checksum never replaces the staged file or starts a different mission. The
bounded native `loadMap()` independently checks the format and **parses into a
temporary State**, committing only if every directive is legal; existing state
and orders are preserved on errors. A mission restart reloads the same source.

## WC-MAP 2 grammar

All lines are LF-delimited ASCII with no BOM, tabs, CRLF, empty interior lines,
or trailing directives. This is a fixed-order, deliberately simple grammar:

```
WC-MAP 2
id ridge-pass
title Ridge Pass
biome highland
size 16 10
terrain
................
...::...^^......
...::...^^......
... (complete rows of exactly 16 symbols, 10 rows total)
endterrain
spawn 1 0 1 5 5
spawn 2 11 1 5 9
base 1 0 1
base 2 15 9
unit S 1 2
unit R 2 3
unit A 12 2
unit B 13 6
crate 1 6 2
crate 2 10 7
resource 7 3 450
resource 11 7 700
victory 13 8 3 2
exit 14 8
endmap
```

The `terrain` block must have exactly `height` rows of `width` symbols.
Coordinates are **zero-based**; rectangles use `x y width height` and
right/bottom-exclusive bounds. There are exactly two spawn rectangles (`1`
player, `2` opponent), one starting base inside each spawn, four uniquely
positioned unit spawns (`S` scout, `R` ranger, `A`/`B` opponent sentries), two
crate positions, 0–16 unique resource nodes of amount 1–100,000, one victory
rectangle, and one passable `exit` inside it. Spawns, bases, units, crates,
resources and victory bounds must be inside the map; bases and actors must be
on passable ground. `title` and `biome` are short printable ASCII strings;
quotes, backslashes and control characters are not accepted.

| Tile | Meaning | Planner movement cost | Native `MapClass` land |
| --- | --- | --- | --- |
| `.` | Open ground | 1 | `LAND_CLEAR` |
| `#` | Rock obstruction | impassable | `LAND_ROCK` |
| `:` | Rough ground | 2 | `LAND_BEACH` |
| `~` | Marsh | 3 | `LAND_TIBERIUM` |
| `^` | Cliff obstruction | impassable | `LAND_ROCK` |

Resource-node cells are staged as `LAND_TIBERIUM` and checked by native cell
read-back. This is a location/terrain contract, **not** an implemented R06
economy or harvest quantity in the historical VanillaTD overlay system.
Starting bases reserve and label authored faction positions but do not spawn
buildings (that belongs to R07). The tactical alpha spawns the same two real
`InfantryClass` player units into its real `MapClass`; sentries, pickups and
combat remain deterministic Courier-owned actors, as documented in R00.

The native planner uses the tile costs for weighted traversal and exposes them
on snapshots. Live VanillaTD infantry navigate via their production `NavCom`
and engine land-speed rules, not a parallel JavaScript pathfinder. The mission
still uses two-crate extraction; on v2 maps, any living squad unit in the
authored victory rectangle completes that objective.

The additional **integrated native R18 match** uses this *same* validated
native map parser and SHA-pinned browser loader, but initializes dynamic
Aster/Forge houses and real infantry from the authored spawn zones. It creates
neutral World resource instances (no harvesting), passes movement costs to
R02 weighted pathfinding, and publishes `map.id`, typed terrain, cost,
resources, spawn zones, bases and victory geometry in negotiated R18 v3
snapshots. Invalid map/catalog input leaves the active native match unchanged;
restart preserves the selected map and creates new entity IDs in a new epoch.

## Browser / R00 snapshot migration

Old 18×11 Courier map bytes and marker semantics (`. # S R A B 1 2 X`) are
**unchanged** and accepted as `legacy-v1`. The previous single-map manifest
(`world-conquer-original-mission-v1`) remains readable, but new packs should
use v2 and pin the original Courier file as the default entry. Existing
`play.html` standalone mode continues to use Courier; v2 selection is offered
by the actual WASM launcher.

R00 version-1 snapshots are kept for Courier. Other maps emit snapshot
`version: 2` and preserve v1 entity IDs, tick, selection, commands, events and
the `map.terrain` 0/1 passability array. They add `map.id`, `title`, `biome`,
`tiles` (numeric symbols 0–4), `costs`, `resources`, `spawns`, `bases` and
`victory`. The browser bridge validates v2 consistency and freezes the entire
snapshot; the tactical minimap renders this **native** data, not an
independently advancing JavaScript world. No migration of historical theater
maps or saved-games is claimed.

## Reproducible authoring and validation

1. Copy one of the `wc-map-v2` examples to a new, lowercase hyphenated
   filename; edit the dimensions, row counts, terrain and ordered directives.
2. Compute the exact digest with `sha256sum game/content/missions/<id>.map`.
   Add a manifest entry with the chosen ID, dimensions, format and digest.
   Digests are **never** automatically rewritten during a check.
3. Run the read-only authoring gate and tests from the repository root:

   ```sh
   node browser/engine/validate-maps.js
   node browser/engine/test-mission-pack.js
   g++ -std=c++11 -Wall -Wextra -Werror -Ibrowser/engine \
     browser/engine/test-map-pipeline.cpp -o /tmp/world-conquer-r04-maps
   /tmp/world-conquer-r04-maps
   node docs/rts-milestones/validate-roadmap.js
   ```

4. Build and serve the **real** browser WASM per `docs/browser/BUILD.md`; select
   each map from the alpha launcher. Click both infantry, move through varied
   terrain, inspect minimap cells and press `R` to restart. CI additionally
   compiles VanillaTD, checks native `MapClass` staging/infantry movement and
   validates both examples in Chromium (`browser/engine/check-runtime.js`).

Map changes require a new SHA-256 entry and test review. Incompatible grammar
changes require a new `WC-MAP` header version, pack format and explicit
browser/native reader; do not silently reinterpret v2 bytes.
