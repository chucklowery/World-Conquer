# M2: Minimum original data pack (single-session plan)

Read `docs/milestones/AGENT_GUIDE.md` first. This file is self-contained apart
from that guide, and is designed to be **completed in one long agent session**
on **one branch** with **one PR**. M1 is merged on `vanilla`; build on what it
delivered.

## Goal

From source, in CI, generate original data that lets the **unmodified**
VanillaTD engine run a match in Chromium. The player deploys a base, builds
structures, harvests a resource for credits, and produces and commands
units. The map, sidebar and radar render, and nothing the match needs is
missing.

**Placeholder art is the target.** Every graphic may be a generated
schematic (outlines, flat colors, house-colored fills). What matters is that
file names, formats, frame counts and palettes are correct, so the engine
finds, indexes and draws everything without crashing. Real art (R05 faction
art, final sprites) is **out of scope** for this session; it belongs to M5.

## Session contract (read before starting)

1. **One branch, one PR.** Branch `m2/original-data-pack` from the latest
   `vanilla`. Open a **draft PR** after Phase 1 and push after every phase.
   Mark it ready at the end.
2. **Keep a session log.** Create `docs/browser/M2_SESSION_LOG.md` in
   Phase 0. After each phase, append: status (done, partial or skipped),
   commit SHA, commands and results, CI links, and open issues. If the
   session is interrupted or your context resets, **read the log and the PR
   first** and continue from the first phase not marked done.
3. **Commit at every phase boundary** (`M2 phase <n>: <summary>`) and keep
   every commit buildable, with the M1 `stock-engine` job still green.
4. **Work through the phases in order without stopping to ask.** Use the
   defaults and fallbacks here. Stop only for AGENT_GUIDE.md "Stop and ask"
   cases or a **STOP** condition below.
5. **Time-box.** Each phase has a soft budget. At about twice the budget
   without progress, apply the phase fallback, log it, and move on.
6. **Never fake the engine.** Do not draw a fake map or sidebar from
   JavaScript, skip `Start_Scenario`, or add `--browser-*` shortcuts. The only
   permitted engine changes are small, `#ifdef __EMSCRIPTEN__`-guarded ones
   that this file names: making absent cinematics or audio non-fatal, and
   test log lines.
7. **Generated binaries are never committed.** Only generators, their JSON
   or SVG sources, and docs are committed. CI builds the pack.

### Build loop: local if you can, CI if you must

- **Local (preferred):** emsdk 3.1.68, Ninja, Node 18+, the native
  `vanillamix` tool and the Playwright Chromium. If GitHub archive downloads
  are blocked in your environment, the SDL2 Emscripten port fails to
  download. Clone it instead
  (`git clone --depth 1 --branch release-2.28.4 https://github.com/libsdl-org/SDL.git`)
  and build with `EMCC_LOCAL_PORTS="sdl2=<that dir>"`. Stage the runtime
  files exactly as the `wasm-vanillatd` job's "Verify compiled WebAssembly
  bundle" step does, or the page will not start.
- **CI only (fallback):** if you cannot build locally, push and read the
  `stock-engine` job's uploaded audit log after every iteration. Budget
  about 5 minutes per round trip and batch your changes. Phase 1 makes this
  loop informative.

## What M1 left you (verify in Phase 0)

| Piece | Location | Notes |
| --- | --- | --- |
| Boot pack generator | `tools/content/boot-pack.js` | PAL, SHP, FNT, CPS, PCX, string table (`CONQUER.ENG`, original text, Aster/Forge) and MIX via native `vanillamix`. CC0 and deterministic. |
| Encoders | `tools/content/encode-{palette,shape,font,cps,pcx}.js` | Host decoder test: `tests/test-m1-boot-data.cpp` |
| Boot inventory | `game/content/pack/boot-requirements.json` | 42 entries (boot, menu and optional). **No scenario-path entries were recorded.** |
| Placeholders for all 295 engine object slots | `tools/content/wireframes.js`, `game/content/wireframes/catalog.json` | Engine filenames with generous provisional frame counts (vehicle 192, infantry 640, building 128, …) |
| Pack loader | `browser/engine/pack-loader.js` | Loads `data/pack.json` (`schema:1`, `packVersion`, `files[{path,bytes,sha256}]`) into `/game` |
| Audit log | `common/ccfile.cpp`, `common/mixfile.h`, `browser/engine/asset-audit.js` | `[asset-hit]`, `[asset-miss]`, `[browser-game] fatal=`; `window.WCAssetAudit` |
| Input log | `common/wwkeyboard_sdl2.cpp` | `[browser-input] mouse-down x= y=` in game coordinates (640×400) |
| Menu acceptance test | `browser/engine/check-stock-engine.js`, CI job `stock-engine` | Must stay green |
| Browser settings | `common/settings.cpp`, `shell.html` | Windowed mode with raw input off; intro off |

## Known engine facts (verified 2026-11-22; recheck the line numbers)

- **New Game** (`tiberiandawn/init.cpp`, `case SEL_START_NEW_GAME`) asks for
  difficulty, then calls `Choose_Side()` (`intro.cpp`). That loads
  `CHOOSE.WSA`, `SIDES.PAL`, VQP palettes and `.AUD` speech before
  starting `SCG01EA`. `Start_Scenario` → `Read_Scenario` → briefing movies
  (already skipped when absent).
- **Skirmish** exists without networking. Multiplayer →
  `Select_MPlayer_Game()` (`mplayer.cpp`) → `GAME_SKIRMISH` →
  `Com_Scenario_Dialog()` (`nulldlg.cpp`). It lists multiplayer scenarios
  (`SCM*EA.INI`; the M1 audit shows the engine scanning `scm94ea.ini` …
  `scm99ea.ini`), and computer players build and harvest on their own.
- **Theater loading** (`display.cpp` `DisplayClass::Init_Theater`,
  `const.cpp` `Theaters[]`): temperate uses `TEMPERAT.MIX`, `TEMPICNH.MIX`
  and `TEMPERAT.PAL`; theater-specific files use the `.TEM` suffix.
- **Object art loads eagerly.** Object type `Init`/`One_Time` functions load
  images for **every** type, not just those on the map. Expect hundreds of
  lookups, broadly the 295 wireframe slots plus theater templates, UI and
  effects.
- **Scenario INI:** `[Basic]` keys are in `scenarioini.cpp`. Other sections
  (`[Map]`, houses, `[STRUCTURES]`, `[UNITS]`, `[INFANTRY]`, `[TERRAIN]`,
  `[OVERLAY]`, `[Waypoints]`, triggers, teams, `[Base]`) are read by each
  class's `Read_INI`. The map **BIN** layout is defined by
  `MapClass::Read_Binary`/`Write_Binary` in `map.cpp`.
- **Text strings:** `CONQUER.ENG` is generated from the `TXT_*` enum in
  `tiberiandawn/conquer.h`; extend `originalText()` in `boot-pack.js` for
  new visible strings.

## Phase overview

| # | Phase | Soft budget | Produces |
| --- | --- | --- | --- |
| 0 | Setup, baseline and log | 30–60 min | Builds, green M1 test, session log |
| 1 | Scenario-path probe test and path decision | 2–3 h | `check-stock-scenario.js`, CI job, `[browser-event]` logs, decision record |
| 2 | Pack pipeline consolidation | 2–3 h | `tools/content/pack.js`, `requirements.json`, CI artifact |
| 3 | Universal placeholders | 2–3 h | Every engine-requested name produced |
| 4 | Theater, terrain and resource | 3–5 h | Icon-set encoder, `TEMPERAT.MIX`, `TEMPICNH.MIX`, overlays |
| 5 | Playable roster with verified frame contracts | 4–6 h | Exact frame counts for the slice, sidebar cameos, UI art |
| 6 | Scenario generator and the M2 map | 3–4 h | `tools/content/scenario.js`, map source, INI and BIN |
| 7 | Reach the battlefield | 3–6 h | Scenario loads and renders, with zero required misses |
| 8 | End-to-end gameplay test | 3–4 h | Build, harvest, produce and command, tested in CI |
| 9 | Docs, roadmap evidence and PR | 1 h | Docs, evidence line, PR ready |

---

## Phase 0: Setup, baseline and log

1. Branch `m2/original-data-pack` from `vanilla` and set up the build loop
   (see above).
2. Build the WASM engine and the native `vanillamix`, generate the boot pack,
   and run `node browser/engine/check-stock-engine.js`. **It must pass
   before you change anything.**
3. Run `node docs/rts-milestones/validate-roadmap.js`,
   `bash scripts/check-rts-foundation.sh`, `node tools/content/test-boot-pack.js`
   and `node tools/content/test-wireframes.js`.
4. Create `docs/browser/M2_SESSION_LOG.md` with the toolchain versions,
   baseline results, and which build loop you are using.

**Fallback:** if the M1 test fails on unchanged `vanilla`, record the failure,
fix only what is needed to restore it (it is a prerequisite), and log the fix.

## Phase 1: Scenario-path probe test and path decision

**Goal:** an automated way to drive the stock menu into a match and capture
every missing file, and a decision on which game path M2 uses.

1. Add test log lines, guarded by `#ifdef __EMSCRIPTEN__`. Each is one
   `printf` plus `fflush` at the point where the event happens:
   - `[browser-event] scenario-start name=<ScenarioName> type=<GameToPlay>`
   - `[browser-event] placed name=<BuildingType ini name> house=<house>`
     (when a building is placed or finishes construction)
   - `[browser-event] produced name=<ini name> house=<house>` (when a
     factory delivers a unit or infantry)
   - `[browser-event] credits house=<house> value=<n>` (when the player's
     credits change; throttle to changes only)
   - `[browser-event] harvest-unload house=<house> value=<n>` (when a
     refinery receives a load)

   Find the hook points (building placement and completion, factory
   completion, `HouseClass` credit changes, refinery unload) and keep each
   edit to a few lines.
2. Add `browser/engine/check-stock-scenario.js`. It reuses the serving,
   pack-loading and audit plumbing of `check-stock-engine.js` (factor shared
   helpers into a small module rather than copying them), then drives the
   menu with real clicks and keys into a match. On success **and on
   failure**, it writes `stock-scenario-audit.json`: misses (deduplicated,
   with the first-seen stage), the fatal reason, the last `[browser-game]`
   and `[browser-event]` lines, and screenshots.
3. Add the CI job `stock-scenario` (`needs: wasm-vanillatd`, same setup as
   `stock-engine`). Until Phase 7 it runs in **report mode**: set
   `STOCK_SCENARIO_REPORT_ONLY=1`, so it uploads the audit but does not fail
   the build. Phase 7 removes that flag.
4. **Decide the path. Default: Skirmish.** Drive Multiplayer → Skirmish →
   scenario dialog. Skirmish gives the engine's own computer opponent, a
   starting MCV and credit settings, and needs no AI scripting, so it also
   serves M3. Confirm it works with `NETWORKING=OFF`: the menu entry
   appears, `Com_Scenario_Dialog` opens, and it reads multiplayer scenario
   files.
   - **Fallback:** if Skirmish is unavailable or blocked by something you
     cannot fix with a small guarded change, use **New Game**. Make
     `Choose_Side()` return immediately with the first player house
     (`HOUSE_GOOD`, shown as Aster) when `CHOOSE.WSA` is absent in browser
     builds, mirroring M1's absent-movie rule, and ship the scenario as
     `SCG01EA`. Enemy AI then comes from scenario data (a pre-placed enemy
     base is enough for M2; attacks are not required).
   - Record the decision, the evidence, and the scenario file names the
     chosen path loads in the session log and in the PR description.
5. Run the probe with the current boot pack. Expect it to stop at the first
   missing scenario-path file; that is the point. Save the miss list.

## Phase 2: Pack pipeline consolidation

1. Add `tools/content/pack.js build <outDir>`. It is the **single**
   generator for the whole pack and absorbs `boot-pack.js`: keep
   `boot-pack.js` as a thin wrapper, or delete it and update the M1 CI step
   and test. Outputs:
   - `<outDir>/game/…`: the exact `/game` tree (loose files plus MIX);
   - `<outDir>/pack.json`: same schema as M1;
   - `<outDir>/PROVENANCE.json`: for each output, its generator, source
     files, `license: "CC0-1.0"` and source revision.
2. Replace `boot-requirements.json` with
   `game/content/pack/requirements.json`, a superset with the same entry
   shape plus `requiredFor` values `boot|menu|scenario|gameplay|optional`.
   Every contract value cites the code line that proves it, or says
   `"unverified"`. Seed it with the Phase 1 miss list.
3. Make the output deterministic (sorted inputs, fixed MIX order, no
   timestamps). Add `tools/content/test-pack.js`: build twice and compare
   hashes; fail on any missing provenance; and print the coverage report
   (required entries produced versus total).
4. CI: build the pack in `wasm-vanillatd` (replacing the boot-pack step),
   upload it as `world-conquer-data-pack`, and have **both** `stock-engine`
   and `stock-scenario` use it. Keep `check-stock-engine.js` green.

## Phase 3: Universal placeholders

**Goal:** every filename the engine requests on the chosen path exists and is
structurally valid, so missing files stop masking the real problems.

1. Run `node tools/content/wireframes.js build <dir>` and put its SHP outputs
   into the pack under the engine filenames from `catalog.json`. Resolve any
   shared-filename conflicts (the catalog flags them). One file must serve
   every class that references it.
2. For each Phase 1 miss that the wireframes don't cover (UI, sidebar, radar,
   cursor, effects or theater files), add a generator entry, using the
   existing encoders. When a frame count isn't known yet, use a **safe upper
   bound** and mark the contract `"provisional-upper-bound"`. Extra frames
   are harmless; too few can make the engine index past the end.
3. Remap ranges: find which palette indices the engine's house remap tables
   replace (`const.cpp` remap tables), and paint each object's "house color"
   area with those indices, so Aster and Forge look different with no extra
   work.
4. Optional audio (`.AUD`), music and movie files stay absent. If any absent
   audio file turns out to be fatal on the chosen path, make it non-fatal
   with a guarded change (same rule as M1's movies).
5. Iterate with the Phase 1 probe until the run gets **past menu and dialog
   loading into `Start_Scenario`**.

**Fallback:** if a format is needed that has no encoder and isn't covered in
Phase 4 (for example `.WSA` on the New Game path), prefer the guarded
"absent is non-fatal" change for cinematic-only uses. For anything drawn
during play, write the encoder; it's required.

## Phase 4: Theater, terrain and resource

1. **Icon-set encoder:** read the template icon format (`tiberiandawn/tile.h`
   `IControl_Type`, the template drawing in `template.cpp`, and the stamp code
   in `common/stamp.cpp`). Write `tools/content/encode-iconset.js`, with a
   host round-trip test that calls the engine's real access functions (follow
   the `tests/test-m1-boot-data.cpp` pattern).
2. Generate the temperate theater:
   - `TEMPERAT.PAL`, with the engine's remap and shadow ranges respected, and
     a readable terrain color set;
   - icon sets for the **clear** template plus only the templates your map
     uses (default: an all-clear map, plus one water or cliff template for
     visual reference);
   - `TEMPERAT.MIX` and `TEMPICNH.MIX` containing exactly the names the
     engine loads (follow `Init_Theater` and the template type table).
3. Theater objects: a few trees or rocks (`.TEM` names from `tdata.cpp`), the
   **resource overlay** with every growth stage the overlay code indexes
   (`odata.cpp`, plus how the harvester and `CellClass` read it), and
   smudges/craters that are drawn on damage.
4. Confirm with the probe that the scenario terrain draws and the radar
   shows the terrain colors.

## Phase 5: Playable roster with verified frame contracts

The universal placeholders keep the engine running. This phase makes the
objects the player **actually uses** correct.

1. **Slice (default for Skirmish):** MCV and construction yard, power plant,
   refinery (with its docking and unloading frames), harvester, barracks,
   rifle infantry, vehicle factory, light tank, plus one defensive structure.
   Include whatever the chosen path auto-spawns.
2. For each slice object, derive the **exact** frame layout from its draw
   code, not only from the type tables: `Shape_Number`/`Draw_It` and the
   rotation math for 32-facing bodies and turrets; the infantry `DoControls`
   tables in `idata.cpp`; building active, damaged and docking states in
   `building.cpp`/`bdata.cpp`; `*MAKE` build-up animations; and footprints in
   `bdata.cpp`. Record each contract and its code reference in
   `requirements.json`, then make the generator follow it.
3. Sidebar and HUD: build cameos for every slice item, sidebar strips and
   tabs, the power bar, repair and sell buttons, the radar frame, selection
   brackets and health pips, the credits display, and the placement grid.
   Placement and selection must be visibly usable.
4. Effects used by the slice's weapons and deaths: projectiles, muzzle
   flashes, explosions and death animations (`bbdata.cpp`, `adata.cpp`).
5. Text: make every player-visible name in the slice original (extend
   `originalText()`); no EA trademarks.

## Phase 6: Scenario generator and the M2 map

1. Add `tools/content/scenario.js`. From an editable source
   (`game/content/scenarios/<name>.json`: size, terrain grid, overlays,
   houses, starting objects, waypoints, and AI or trigger settings) it emits
   the scenario INI and the matching BIN. Derive the BIN layout from
   `MapClass::Write_Binary`/`Read_Binary` and the INI keys from
   `scenarioini.cpp` and each class's `Read_INI`. Add a host test that loads
   the generated BIN and INI through the real readers.
2. **Map defaults (Skirmish):** one 2-player multiplayer scenario in the
   `SCM*EA` name range the engine scans, with a display name the skirmish
   dialog shows. Use the temperate theater, mostly clear ground, two resource
   fields near the start points, a few trees, and start waypoints for both
   players. **Fallback path:** `SCG01EA` with the player's MCV, a harvester,
   starting credits, and a pre-built enemy base.
3. Optionally convert the R04 maps (`game/content/missions/`, parsed by
   `browser/engine/mission-pack.js`) into this format. Do it only if it is
   quick; one good map is enough.

## Phase 7: Reach the battlefield

1. Iterate with the probe until the match starts and the engine draws the
   map, sidebar and radar. Each round: read misses or the fatal reason, then
   fix the generator, contract or map, then rebuild. After each round, check
   the screenshot for objects drawn wrong (garbled frames usually mean a
   wrong frame count or wrong dimensions).
2. Then switch `stock-scenario` to **strict mode** (remove
   `STOCK_SCENARIO_REPORT_ONLY`). It now fails on any page error, fatal, or
   `[asset-miss]` for a `boot|menu|scenario|gameplay` entry, and on any
   watchdog stall over 1,000 ms after the match starts.
3. Record the remaining `optional` misses (audio, movies, unused types) in
   the session log.

**STOP condition:** if, after the encoders in Phases 3–4 exist and contracts
have been derived from the code, the engine still cannot start a scenario
because of a format or behavior you cannot determine, stop iterating.
Record the exact blocker (file, loader, code location, what you tried) and
still complete Phases 8–9 for whatever stage was reached, with `stock-scenario`
asserting the furthest verified stage. Report M2 as **partial**.

## Phase 8: End-to-end gameplay test

Extend `check-stock-scenario.js` so that in the match it performs, with
**real mouse and keyboard input only**:

1. Deploy the MCV (or use the scenario's construction yard).
2. Build and place a power plant, then a refinery, through the sidebar.
   Assert `[browser-event] placed` for each.
3. Wait for the harvester to deliver one load. Assert
   `[browser-event] harvest-unload` and a rise in `[browser-event] credits`.
4. Build a barracks, produce one infantry unit, then one vehicle (if the
   factory is in the slice). Assert `[browser-event] produced`.
5. Select the produced units, order a move and an attack-move, and verify
   the screenshot changes and no fatal occurs.
6. Scroll the map with the keyboard and with the edge of the screen (the
   edge scrolling M1 deferred), then let the game run for 2 minutes.
7. Write `stock-scenario-metrics.json` with the time to match start, frame
   p50/p95 during play, the maximum stall, heap at start and after 2 minutes,
   and the pack size (raw and gzip). No budgets are enforced.

Derive sidebar and cameo click positions from the sidebar layout code (game
coordinates, 640×400) and use the M1 `[browser-input]` log to confirm that
clicks land where intended. Use the fastest game speed setting to shorten
waits.

## Phase 9: Docs, roadmap evidence and PR

1. Write `docs/browser/M2_DATA_PACK.md`: how to build the pack, the
   requirement and contract format, how to add an object or a map, and how
   to replace a placeholder with real art later (M5).
2. Update `docs/browser/BUILD.md` and `browser/engine/README.md`.
3. In `docs/ROADMAP.md`, tick the completed M2 boxes and add the evidence
   line:
   `Evidence: <date> · <SHA> · <stock-scenario CI run> · Chromium <version> · <path: Skirmish|New Game> match on 100% original data; placed <list>; harvest +<n> credits; produced <list>; zero required misses; max stall <n> ms`.
   If Phase 7 stopped early, write "partial: <furthest stage>" and leave
   the exit gate unticked.
4. Finish the log, mark the PR ready, and post the AGENT_GUIDE.md section 6
   report with every phase's status.

---

## M2 exit gate

On the PR head (and later on `vanilla`), CI shows:

1. `world-conquer-data-pack` is built entirely from committed sources and is
   deterministic, and its coverage report shows **100%** of
   `boot|menu|scenario|gameplay` requirements produced;
2. `stock-engine` (M1) still passes;
3. `stock-scenario` passes in **strict mode**. The unmodified engine starts
   the match, renders the map, sidebar and radar, and the scripted session
   places structures, completes a harvest cycle (credits rise), and produces
   and commands units, with zero required misses, zero page errors or
   fatals, and no stall over 1,000 ms;
4. `PROVENANCE.json` lists an original generator and license for every
   file, and the pack contains no EA data or trademarks.

## Handed to M3 and later

- The chosen path (Skirmish or New Game), the map generator and the event log
  lines → M3 (AI tuning, balance, publishing a playable build).
- Contracts in `requirements.json` → M5 art replacement (swap placeholder
  generators for real art without changing file contracts).
- Optional misses (audio, music) → M4.

## Out of scope

Real or final art, mapping the R05 art onto engine slots, sound and music,
extra theaters, campaigns, new C++ object types, balance tuning, multiplayer,
and changes to the frozen legacy demos beyond keeping their tests green.
