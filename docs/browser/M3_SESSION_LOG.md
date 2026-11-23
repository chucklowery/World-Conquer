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

- **Win path.** Only losses are automated (the idle human always loses).
  `Do_Win` uses the same score screen and restart path; a scripted win
  needs the test to find and destroy the computer's base.
- **Publishing** is set up (approved by the owner); it goes live after this
  branch is merged and Pages is set to deploy from GitHub Actions.

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
