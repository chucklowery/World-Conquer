# M3 session log — first playable skirmish

## Step 1: what the computer player does (2026-11-23)

**Question.** M3 needs a computer opponent that builds, harvests and attacks
on our original data. Does the stock engine do that?

**Engine facts.**

- `tiberiandawn/defines.h:56` defines `USE_RA_AI` unconditionally, so the
  browser build uses the Remastered skirmish computer player: the computer
  gets a mobile base (`scenarioini.cpp`, "Give the AI an MCV"), and
  `HouseClass::Expert_AI` builds, produces and attacks.
- Attacks are hunt waves: `Check_Attack` is critical after the first minute
  and `AI_Attack` sends armed units to `MISSION_HUNT` (`house.cpp:5626`,
  `5738`).
- Which side can build what comes from the engine's C++ type tables
  (`Ownable` in `bdata.cpp`, `udata.cpp`, `idata.cpp`), not from INI files.
  The two sides therefore already have different rosters.

**Measurement.** A new observation mode in
`browser/engine/check-stock-scenario.js` (`STOCK_SCENARIO_OBSERVE_MINUTES`)
deploys the human base and then idles. Guarded engine events report
placements, production, harvesting, deploys and kills per house
(`[browser-event] killed` was added in `TechnoClass::Record_The_Kill`).

In 20 minutes on Foundry Test Range the computer (one run per side):

| | Side A run | Side B run |
| --- | --- | --- |
| Buildings placed | 13 | 13 |
| Harvest deliveries | 373 (12,309 credits) | 392 (12,936 credits) |
| Units produced | 15 + harvester | 16 + harvester |
| Kills | 12 | 11 |
| Result | destroyed our base | destroyed our base |

Side A built tanks, a heavy tank and grenadiers; side B built a training
hall, airstrip, beam tower, light and stealth tanks, artillery and buggies.

**Conclusion.** The engine's computer player builds, harvests and attacks on
100% original data. No engine change was needed.

## Step 2: the end of a match

When a skirmish ends, `Do_Win`/`Do_Lose` show the multiplayer score screen
(`score.cpp` `Multi_Score_Presentation`), then return to the skirmish setup
dialog, where OK starts a new match.

Problems found and fixed (all data, no engine change):

1. **`MLTIPLYR.WSA` was missing.** `Open_Animation` then read an
   uninitialized header, computed a huge buffer, and the game stopped at
   "Error - out of memory". New `tools/content/encode-wsa.js` (LCW +
   XOR-delta WSA encoder, round-trip tested by `test-wsa.js`) and an
   original 320x200 score background in `placeholders.js`.
   `MULTSCOR.PAL` is optional (`interpal.cpp:75` checks `Is_Available`).
2. **Score text was invisible.** Two causes:
   - *Font colour.* The score screen prints with a transparent foreground
     (`Print(..., TBLACK, TBLACK)`), and the print routine replaces font
     colour 1 with the foreground, so glyphs drawn with colour 1 vanish.
     Gradient fonts (`GRAD6FNT`, `12GREEN`, `12GRNGRD`, `SCOREFNT`) now draw
     with colour 14, the one entry every gradient path fills: dialog
     gradient tables (`dialog.cpp` `_textfontpal`, entries 11-15), plain
     gradient text (entries 4-15) and the score palettes (entry 14). A first
     try with colour 4 hid dialog labels (their tables leave 2-10 empty).
   - *Palette.* The engine colours text through hard-coded indices: 5 is
     YELLOW (`common/wwstd.h`), and the score and dialog palettes use 2, 5,
     9, 16, 25, 202, 209 and the cycling yellows 233-237. Our palette had
     dark or unrelated colours there. They now have readable colours; the
     title art fill moved from 5 to 139 with the same RGB, and the
     wireframe translation never maps art onto them.

Guarded `[browser-event] match-end result=won|lost` logs in `Do_Win` and
`Do_Lose` let the test follow a match through the score screen to a
restarted match.

## Step 3: rosters, names and maps

- Every object in the type tables now has an authored display name
  ("Siege Tank", "Rocket Battery", "Beam Tower"), not one derived from its
  enum name. `test-boot-pack.js` fails if one is missing.
- `scenario.js` builds every map in `game/content/scenarios` and supports
  round resource `fields` and spaced `treeLines`, refusing a start position
  that is blocked. New maps: **Crossroads** (`SCM95EA`, 48x48) and **Long
  Valley** (`SCM96EA`, 62x36), alongside Foundry Test Range (`SCM94EA`).
  All terrain is still placeholder grass, so maps vary in size, start
  layout, resource fields and tree lines; water and cliffs wait for real
  theater art (M5).

## CI

`ai-match` in `browser-engine.yml` plays to the end against the computer
player (strict): the computer must place at least 3 buildings, deliver
at least one harvest and make at least one kill, the match must end within
35 minutes, the score screen must draw, and the game must restart. One map on pull
requests, all three on `vanilla` and manual runs.

## Open

- **Win path** (test added 2026-11-25; CI evidence pending): see "Automated win" below.
- **Publishing** went live on 2026-11-23 (publish run 45262345913).

## Publishing (step 4)

- **Play view.** `vanillatd.html?play` shows only the game: title, status,
  Play, the canvas and a short how-to. A small script moves those elements
  into the view and hides the rest of the page; the legacy launcher is
  unchanged without `?play`. The strict `stock-scenario` CI job now opens
  the play view.
- **Fonts.** The top tab labels use `12GRNGRD` through `_textfontpal` row 11
  (entries 1-5), so a single glyph colour cannot serve every gradient font.
  `boot-pack.js` `FONT_INK` sets it per file: `12GRNGRD`/`12GREEN` use 4,
  `GRAD6FNT`/`SCOREFNT` use 14, plain fonts 1.
- **Site.** `browser/engine/package-play.js` packages the tested engine,
  its scripts and the data pack, with `index.html` opening the play view and
  a `site.json` listing every file with its SHA-256 (about 96 MB; size
  budgets are M4).
- **Workflow.** `publish-play.yml` runs after a successful browser-engine
  run on a `vanilla` push (or by hand on `vanilla`), downloads that run's
  artifacts, plays the packaged site through its play view in Chromium
  (start a skirmish, deploy the base), then deploys it to GitHub Pages.
  `publish-tactical-alpha.yml` is now manual only, so it cannot overwrite
  the site.
- **Owner step.** Settings > Pages > Build and deployment > Source: GitHub
  Actions. Until then the workflow stops before deploying with a notice.

## CI evidence (2026-11-23)

Manual run [45222236369](https://github.com/chucklowery/World-Conquer/actions/runs/45222236369)
on `8ccae03` (`legacy_soak` off): every job passed, including `stock-engine`
(M1), the strict `stock-scenario` full match (M2) and `ai-match` on all
three maps.

| Map | Computer placed | Harvest deliveries | Kills | End |
| --- | ---: | ---: | ---: | --- |
| Foundry Test Range (`SCM94EA`) | 9 | 168 (5,544 credits) | 12 | lost, score screen, restart |
| Crossroads (`SCM95EA`) | 11 | 224 (7,392 credits) | 13 | lost, score screen, restart |
| Long Valley (`SCM96EA`) | 9 | 131 (4,323 credits) | 9 | lost, score screen, restart |

Manual runs with the default `legacy_soak` on also run the frozen legacy
demo soak; its R02 order check timed out once in that slow path (pull
requests run it in fast mode). It does not involve the stock engine path.

## Automated win (2026-11-25)

The engine declares a skirmish won only when every other house has no
buildings, units, infantry or aircraft (`house.cpp:1445`,
`MPlayer_Defeated`). Beating the computer by scripted play is slow and
unreliable, so the owner approved a CI-only test hook (roadmap M3, ADR-0004).

- **Hook.** `browser/engine/test_hooks.cpp`, compiled into the Emscripten
  build only. `main()` strips `--browser-test-hooks` before the engine's own
  command-line parser and enables the hook; without it,
  `Browser_Test_Request()` returns 0. The play page passes no arguments; the
  test supplies the flag through `window.WCTestArgs` in an init script.
  `check-stock-scenario.js` fails if the hooks are on when a test did not
  ask for them.
- **Request 1 (reduce).** Removes every computer unit, infantry, aircraft
  and all buildings but one the way the engine removes a sabotaged building
  (`Limbo()` then `delete`, `scenario.cpp:593`): no death, no explosion.
  The kept building is the first one that neither builds (`ToBuild ==
  RTTI_NONE`) nor shoots (`Primary == WEAPON_NONE`). The house's expert AI
  is switched off (`IsBaseBuilding`, `house.cpp:1596`, so no fire sale or
  power sale) and it gets at least 5000 credits, so a damaged building
  repairs instead of selling itself (`building.cpp:1187`). Safe to repeat.
- **Why each of those** (CI runs on this branch): 45546655452 weakened the
  kept building and destroyed its neighbours through `Take_Damage`; their
  death explosions killed it (`by=none`). 45549805362 kept it at full
  strength; the explosions still killed it. 45551864057 removed the others
  quietly; the computer then sold the weakened building, which the engine
  logs as a kill with no attacker (`building.cpp:4274`).
- **Request 2 (show).** Centres the view on the kept building and logs its
  screen position on the next frame (`[browser-event] test-target`).
- **Test** (`STOCK_SCENARIO_WIN=1`, CI job `win-match`). Waits until the
  computer has placed two buildings, reduces it, box-selects the player's
  starting units at home, centres on the target and attacks with a normal
  click, repeating every 45 s and reselecting units that have arrived. It
  requires `match-end result=won`, a kill of the target credited to the
  player, the score screen, and a restart.
