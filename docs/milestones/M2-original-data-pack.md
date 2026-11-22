# M2: Minimum original data pack

Read `docs/milestones/AGENT_GUIDE.md` first. This file is self-contained apart
from that guide.

## Goal

Produce, **entirely from source in CI**, a set of original data files in the
engine's native formats that the **unmodified** VanillaTD engine loads to
play a full skirmish-style match: build a base, harvest, produce units, and
fight an AI. Art may be placeholder (wireframe) quality. Correct formats,
frame counts and file names matter more than beauty.

## Principles

- **The engine defines the contract.** Every file name, format, dimension,
  frame count and palette rule comes from reading the C++ code that loads and
  draws it, never from inspecting EA data.
- **Minimum slice first.** Cover one theater, one resource, about 6
  structures and about 4 units. Anything else the engine requests on the
  chosen path gets a valid minimal placeholder (for example a 1-frame
  transparent SHP), not real art.
- **Generated, not committed.** Source assets (JSON frame specs, SVG, PNG,
  INI templates) are committed. Binary outputs (SHP, PAL, CPS, FNT, MIX, BIN)
  are CI artifacts only. Every output file carries provenance in the pack
  manifest.
- **Keep the engine's internal slots.** Reuse existing engine object types
  (for example `INFANTRY_E1`, `UNIT_HARVESTER`, `STRUCT_CONST`, `STRUCT_POWER`,
  `STRUCT_REFINERY`, `STRUCT_BARRACKS`, `STRUCT_WEAP`) and their file names.
  Change only player-visible names and art. Do not add new C++ object types in
  M2.

## Existing building blocks (verify before relying on them)

- `tools/content/encode-shape.js`: tactical SHP (`KeyFrameHeaderType`,
  LCW). Readers: `common/keyframe.cpp`, `common/lcw.cpp`; drawing goes through
  `CC_Draw_Shape()`.
- `tools/content/encode-palette.js`: 768-byte 6-bit PAL.
- `tools/content/build.js`: deterministic, manifest-driven builder with
  SHA-256 and provenance.
- `tools/content/wireframes.js` and
  `docs/browser/WIREFRAME_REPLACEMENT_CATALOG.md`: 295 slots derived from TD
  class definitions, with placeholder frames. The catalog itself warns that
  dimensions and frame counts are **provisional**. You must verify each one
  you use against the code.
- `tools/mixtool/`: native MIX creator (`makemix --create --directory <dir>
  --file <out.mix>`, `--list` to inspect). Build it with `-DBUILD_TOOLS=ON`.
- `game/content/r05/`: original Aster/Forge faction art (24 SVGs, 552 frames,
  SHP output). Its frame layout was designed for a different system, so remap
  it to engine slots only where facings and frame order truly match.
- `browser/engine/test-wireframe-asset.js` and `--browser-wireframe-probe`:
  proof that generated SHPs resolve and draw through the real engine.

## Formats you will likely need to write encoders for

Confirm each one from its loader and write a Node encoder in `tools/content/`,
with a round-trip test against a small C++ host harness that calls the real
decoder (pattern: `tests/test-original-shape.cpp`).

| Format | Used for | Read by (start here) |
| --- | --- | --- |
| CPS / LCW image | Title and full-screen pictures (`TITLE.CPS`, …) | `common/iff.cpp` (`Load_Uncompress`, `Load_Picture`) |
| FNT | Fonts (`8FAT.FNT`, `6POINT.FNT`, `12GREEN.FNT`, `VCR.FNT`, `LED.FNT`, …) | `common/font.cpp` |
| Theater icon sets | Terrain templates per theater (`*.TEM`) | `tiberiandawn/tile.h` (`IControl_Type`), `tiberiandawn/template.cpp`, `common/stamp.cpp` |
| String table | Player-visible text (`CONQUER.ENG` via `Language_Name("CONQUER")`) | `tiberiandawn/init.cpp` (`SystemStrings`), `Text_String()` in `tiberiandawn/function.h` |
| Scenario INI + BIN | Missions and maps | `tiberiandawn/scenarioini.cpp`, `MapClass::Read_Binary` in `tiberiandawn/map.cpp` (`Write_Binary` shows the exact layout) |
| MIX | Archives the engine registers | `common/mixfile.*`; build with `tools/mixtool` |
| WSA, AUD, VQA | Animations, sound, movies | **Optional in M2**: confirm the chosen path tolerates their absence |

---

## M2-A: Asset requirements inventory

**Needs:** M1 completed (its asset audit log and `boot-requirements.json`).

Tasks:

1. **Static pass:** list every file the engine can request on the path
   *startup → main menu → start scenario → play*. Sources:
   - string literals ending in `.MIX`, `.SHP`, `.PAL`, `.CPS`, `.FNT`,
     `.INI`, `.ENG`, `.WSA` and `.AUD` in `tiberiandawn/` and `common/`;
   - names built at runtime: `ObjectTypeClass` names plus `.SHP`; theater
     suffixes from `Theaters[].Suffix`/`Root` (`.TEM`, `TEMPERAT.MIX`,
     `TEMPICNH.MIX`); build-up anims `<NAME>MAKE.SHP`; sidebar cameos
     `<NAME>ICON.SHP` (or the engine's actual naming, so verify it); and
     `sprintf` patterns in `init.cpp`, `display.cpp`, `sidebar.cpp`,
     `radar.cpp` and `*data.cpp`.
2. **Dynamic pass:** start from M1's `game/content/pack/boot-requirements.json`
   (its `requiredFor:"scenario"` entries are the misses M1 observed). Run
   the stock engine with each partial pack as you build it; the M1 asset
   audit log reports every new miss, and each one is a requirement.
3. Write `game/content/pack/requirements.json`: one entry per file, with
   `name`, `container` (loose or which MIX), `format`, `requiredFor`
   (`boot|menu|scenario|gameplay|optional`), `referencedAt`
   (`file:line` list), and `contract` (dimensions, frame count, facings,
   palette constraints) **with the code location that proves each value**.
   Mark unknown values `"unverified"`; never guess silently.
4. Add `tools/content/test-requirements.js`. It validates the schema and
   checks that every `required*` entry has a producer in the pack manifest
   (initially many will be missing; report the coverage percentage).

Acceptance: `requirements.json` covers the boot and menu path completely,
and the scenario path at least for the theater and the minimum roster; the
coverage report is printed in CI.

## M2-B: Pack build pipeline

Tasks:

1. Add `tools/content/pack.js build <outDir>`. It reads a committed
   `game/content/pack/pack-manifest.json` (source → transform → output name →
   container), runs the encoders, assembles the MIX archives with `mixtool`
   (built in the same CI job), and writes:
   - `<outDir>/game/…`: the exact `/game` tree the engine expects (loose
     files plus MIX archives);
   - `<outDir>/pack.json`: the M1 pack-loader manifest (`schema`, `packVersion` = git
     SHA, `files[{path,bytes,sha256}]`);
   - `<outDir>/PROVENANCE.json`: per output file, its sources, creator,
     license and revision.
2. Output must be byte-for-byte deterministic: no timestamps, sorted
   inputs, fixed MIX ordering.
3. Add a CI job (in `browser-engine.yml` or a new workflow) that builds the
   pack and uploads it as artifact `world-conquer-data-pack`. The
   `stock-engine` browser job (from M1) uses it in place of M1's boot pack.
4. Absorb M1's `tools/content/boot-pack.js` and its encoders into this
   pipeline rather than keeping two generators.
5. Choose a content license. Default to **CC BY 4.0** for art and data
   unless the owner says otherwise, record it in `game/content/pack/LICENSE.md`,
   and fail the build when any source lacks attribution.

Acceptance: two clean CI builds of the same SHA produce identical
`pack.json` hashes; `mixtool --list` shows the expected entries; a Node test
covers manifest errors (missing source, duplicate output, missing
provenance).

## M2-C: Boot pack (engine reaches the main menu)

**Needs:** M2-A and M2-B. M1's placeholder boot pack already reaches the
menu; this package replaces it with proper art and the full pipeline.

Tasks:

1. Produce everything on the boot and menu path: the base palette (and any
   fade or menu palettes it loads), every font loaded at startup, mouse
   cursor shapes (`MOUSE.SHP`, with the frame count the mouse-control table
   requires), the title and menu background pictures, menu button and dialog
   art the menu draws, and the string table.
2. **Strings:** produce a complete string table for every `TXT_*` index the
   engine uses. Write it as an editable source (`game/content/pack/strings.en.json`
   keyed by `TXT_*` name) and generate the binary from it. Replace EA
   trademarks: the player houses are **Aster** (`HOUSE_GOOD`) and **Forge**
   (`HOUSE_BAD`), and the resource has an original name. Keep strings short
   enough for their UI boxes.
3. Put the files into the archives and names the engine registers at
   startup (`CCLOCAL.MIX`/`LOCAL.MIX`, `CONQUER.MIX`, `GENERAL.MIX`,
   `SOUNDS.MIX`, per `init.cpp`). If a missing optional archive (movies,
   scores, speech) aborts startup, fix that with a minimal guarded engine
   change (`#ifdef __EMSCRIPTEN__` or a data-pack flag). Do not ship
   empty fakes of EA archive contents.
4. Art can be plain: solid panels, readable original fonts (bitmap fonts
   you draw, or ones derived from an OFL/CC0 font **with its license
   recorded**).

Acceptance: in Chromium, `[browser-game] menu.enter` is reached with
**only** the original pack mounted; the menu is legible and clickable; there
are no boot- or menu-path `[asset-miss]` lines.

## M2-D: Theater, terrain and resource

Tasks:

1. Pick **temperate** (`THEATER_TEMPERATE`). Produce its palette, its theater
   MIX and icon MIX (`Init_Theater` in `display.cpp` shows the names), and
   template icon sets for the **clear** template plus the templates the
   scenario map uses (shore, cliffs, roads; keep the set small).
2. Terrain objects (a few trees and rocks), the resource overlay used for
   harvesting (all growth stages the overlay code indexes), walls if the
   scenario uses them, and smudges/craters the engine draws on damage.
3. Encode the theater icon-set format (see the formats table) and test
   round-trips through the real decoder.

Acceptance: a test scenario (from M2-G, or a temporary one) renders terrain,
resource and trees with no theater-path misses, and the radar minimap shows
the terrain.

## M2-E: Minimum unit and structure roster

Tasks:

1. **Structures** (the engine names in brackets are what to verify):
   construction yard, power plant, refinery (with docking frames), barracks,
   vehicle factory, and one defensive structure. For each: the main SHP with
   every frame the building code indexes (idle, damaged, active/animation
   states), the `*MAKE` build-up animation, the sidebar cameo, and the
   footprint/occupy data the code expects. Footprints are defined in
   `bdata.cpp`; the art must match them.
2. **Units:** harvester, rifle infantry, light vehicle and heavy vehicle,
   plus the MCV if the scenario starts with one. Vehicles need **32 facings**
   for body and turret where `udata.cpp` says they rotate. Infantry need the
   full `DoControls` frame table (`idata.cpp`): stand, walk, fire, prone,
   die variants, with exact frame counts.
3. **Effects:** bullets/projectiles, muzzle flashes, explosions and the
   death animations the weapons and warheads in this roster reference
   (`odata.cpp`/`adata.cpp`/`bbdata.cpp`).
4. **UI:** sidebar strips, tabs, power bar, repair/sell buttons, radar frame,
   selection brackets and health bars (`PIPS.SHP`, `SELECT.SHP`, etc.), the
   credits display, and anything the M2-A inventory lists for gameplay.
5. Start from the wireframe placeholders. Use the R05 Aster/Forge art where
   its facings and frames really map (most likely infantry); otherwise keep
   placeholders. Use the engine's house remap ranges so that Aster and Forge
   units take on house colors; verify which palette indices the remap tables
   in the engine replace.
6. Restrict the buildable roster to this slice: through scenario INI
   settings where possible, otherwise through the tech-level and prerequisite
   values in the compiled tables, changed by a minimal guarded edit. Record
   any edit to a `*data.cpp` table in the PR.

Acceptance: every slice object places, animates and dies on screen without
misses; vehicles rotate smoothly through 32 facings; house colors differ
between Aster and Forge.

## M2-F: Scenario authoring tool and the M2 scenario

Tasks:

1. Add `tools/content/scenario.js`. It generates a scenario INI and the
   matching map BIN from an editable source (for example
   `game/content/scenarios/<name>.json`, holding the terrain grid, overlays,
   houses, starting units and structures, AI settings and triggers). Derive
   the BIN layout from `MapClass::Write_Binary`/`Read_Binary` and the INI keys
   from `scenarioini.cpp`. Where practical, reuse the R04 maps as terrain
   sources (`browser/engine/mission-pack.js`).
2. Write one scenario, `WCS01`, or whatever name pattern the engine's
   scenario loader accepts (verify how `Scen.ScenarioName` is formed and how
   the menu selects it):
   - player Aster starts with a construction yard or MCV, a harvester and
     starting credits;
   - Forge has a pre-built base, a harvester and an AI that builds and
     attacks (verify how TD drives base-building AI: house IQ, `TeamTypes`,
     `Base` sections, triggers);
   - win when all Forge buildings are destroyed, lose on the reverse.
3. Find out whether TD skirmish/multiplayer setup works with
   `NETWORKING=OFF`. If it does, also provide a 2-player skirmish map. If it
   doesn't, the single-player scenario above is the M2/M3 vehicle; record
   the finding.
4. Give the menu a path to this scenario that does **not** depend on EA
   campaign files. This may need a small guarded change to the new-game flow
   (for example a browser flag that picks the scenario name). Document it.

Acceptance: from the main menu, a player reaches `WCS01` and the engine logs
`scenario.loaded=`. A host test checks that the generated BIN round-trips
through the engine's reader.

## M2-G: Missing-asset gate and end-to-end check

**Needs:** M1's `check-stock-engine.js` and `stock-engine` CI job. This
package also completes the scenario part of the roadmap's original M1 gate
(map scrolling, the scenario-time loops M1 marked "reviewed, unexercised",
and scenario frame-time metrics).

Tasks:

1. Extend `check-stock-engine.js` with a scripted session on `WCS01`.
   Verify map scrolling (keyboard and edge scroll) and that the M1
   watchdog reports no stall over 1,000 ms during play. Through real mouse
   input on the engine's sidebar, it builds a power plant,
   lets the harvester complete one round trip (assert the credits display
   changes), produces one infantry unit and one vehicle, and orders them to
   move and attack. Then it idles for 2 minutes of game time and adds
   scenario frame-time p50/p95 to `stock-engine-metrics.json`.
2. Fail on any `[asset-miss]` whose name is marked
   `boot|menu|scenario|gameplay` in `requirements.json`. Report optional
   misses as warnings.
3. Save screenshots at each step as CI artifacts.
4. Add a coverage report to the job summary showing required vs produced
   counts from `requirements.json`.

Acceptance: the M2 exit gate below.

---

## M2 exit gate

On a CI run of `vanilla`:

1. The `world-conquer-data-pack` artifact is built from source and is
   deterministic.
2. The unmodified engine boots to the menu, starts `WCS01`, and the scripted
   session places a structure, completes a harvest cycle, and produces and
   commands units.
3. There are **zero** required-asset misses, and the coverage report shows
   100% of required entries produced.
4. `PROVENANCE.json` lists an original source and license for every file;
   no EA data or trademarks are present.

Add the evidence line under M2 in `docs/ROADMAP.md` and tick the M2
checkboxes. Together with M1's gate, this unblocks M3 (first playable
skirmish: balance, AI tuning and publishing).

## Out of scope for M2

Final art quality, sound and music (M4), additional theaters, campaigns
(M5), new C++ object types, balance tuning beyond "playable" (M3), and
changes to the frozen legacy demos.

## Pitfalls to watch for

- **Shared file names:** some engine classes share a resource name (the
  catalog notes building/overlay conflicts). One file must satisfy every
  user of it.
- **Frame indexing is computed:** frame numbers often come from facing ×
  stage arithmetic or damage offsets. Read the draw code for each object
  (`Draw_It`, `Shape_Number` and similar), not just its type table.
- **Palette index 0 is transparent**, and certain index ranges are remapped
  for house colors or used for shadows. Keep art out of the reserved ranges.
- **Theater suffix:** terrain and overlay files are looked up with the
  theater's suffix (`.TEM` for temperate), not `.SHP`.
- **Strings are positional:** the string table is indexed by `TXT_*`
  number, so a missing entry shifts every string after it. Generate it from
  the enum, not by hand.
- **Case and paths:** the browser importer uppercases names and the engine
  expects exact names inside MIX archives; MIX lookups go by name hash.
