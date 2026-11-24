# World-Conquer Roadmap: a browser RTS on the VanillaTD engine

**Status:** Authoritative as of 2026-11-22. Supersedes
`docs/browser/ROADMAP.md` (P0–P4) and `docs/rts-milestones/` (R00–R20),
which are kept as historical records. Decision record:
[ADR-0003](browser/DECISIONS.md#adr-0003-the-vanillatd-engine-is-the-rts-content-is-an-original-data-pack).

## Goal

A complete, legally distributable real-time strategy game that runs in a
desktop browser: harvest, build, power, produce, fight an AI opponent, save,
and eventually play another person, all on **original art, rules, maps and
missions**.

## Core principle

> **The VanillaTD engine is the simulation. The browser port is a platform
> layer. The product is an original data pack.**

`tiberiandawn/` already implements a complete RTS: harvesting and credits
(`HouseClass`, tiberium overlays), construction and power (`BuildingClass`),
production queues and the sidebar (`FactoryClass`, `SidebarClass`), shroud
and radar, AI teams and triggers (`TeamTypeClass`, `TriggerClass`),
scenario/campaign loading, save/load, and deterministic lockstep multiplayer
(`EventClass`, `queue.cpp`). We do not rebuild these systems. Our work falls
into three tracks:

| Track | Owns | Does **not** own |
| --- | --- | --- |
| **Platform** | Emscripten build, cooperative main loop, input, display scaling, filesystem/OPFS, audio backend, network transport | Gameplay rules |
| **Data** | Original SHP/PAL/MIX assets, rules/scenario INI, maps, missions, faction identity, balance | Engine code changes, unless a data format requires them |
| **Engine fixes** | Minimal, upstream-friendly C++ fixes needed by Platform or Data, guarded so native builds keep working | Parallel simulations or a JavaScript authority |

**Rule:** a feature that already exists in the engine is delivered by
*configuring or feeding the engine*, not by reimplementing it.

## Current state (2026-11-22)

- **Working:** native CI on Linux, macOS, Windows and MinGW; a pinned
  Emscripten 3.1.68 build of the real VanillaTD engine; an Asyncify
  cooperative loop; local file import into MEMFS; the R04 map pipeline; the
  R05 original Aster/Forge art pack; the SHP, PAL and MIX encoders
  (`tools/content`, `tools/mixtool`); a 295-slot engine asset replacement
  catalog (`docs/browser/WIREFRAME_REPLACEMENT_CATALOG.md`).
- **Tactical demos:** Courier Extraction and the R02/R03/R04 live match run
  in the real WASM build on a parallel C++ world (`browser/engine/rts_world.h`,
  `production_orders.h`, `rts_weapon_system.h`), drawn with SDL rectangles
  rather than the engine renderer. These are frozen as **legacy demos** (see
  "Disposition of prior work").
- **Not yet proven:** the stock engine reaching its menu and running a
  scenario in the browser on any data set; any original data set the stock
  engine can load.

## Milestones

Each milestone has one **playable, observable exit gate**. A milestone is
complete when its gate is demonstrated in Chromium on a published CI build,
and that is recorded as one evidence line (see "Evidence").

### M0: Reset and consolidation (1–2 weeks)

- [x] Adopt ADR-0003 and this roadmap; mark the earlier roadmaps as superseded.
- [x] The launcher's first panel is the stock engine; the tactical demos
      are grouped under "Legacy demos (frozen)". (Element IDs are unchanged,
      so the existing browser tests still drive them.)
- [x] Make the R20 WASM soak and the ASan/UBSan foundation leg run only on
      manual dispatch; per-PR CI keeps the native matrix, WASM build, the
      legacy demo regression and the headless Chromium check.
- [x] Add a stock-engine headless smoke test (engine boots to its first frame
      without page errors) and make it the primary browser check. This needs
      a data source, so it lands with the first M2 data slice.
- [x] Update `BROWSER_PORT.md` and `browser/engine/README.md` to match.
- [x] Close the open R20 gate issues (#48, #50) as superseded.

**Exit gate:** one roadmap, no contradictory status documents, and a green
minimal CI on `vanilla`.

### M1: Stock engine runs in the browser (2–4 weeks)

Agent instructions: [`docs/milestones/M1-engine-in-browser.md`](milestones/M1-engine-in-browser.md) (a single-session plan).

Finishes the old P2/P3 work.

- [ ] Audit every remaining blocking loop and dialog path not covered by the
      Asyncify yield points in `Call_Back()`, `Frame_Limiter()` and sleeps.
- [x] Mount data into MEMFS (later OPFS) before `main()`, with
      case-insensitive lookup.
- [ ] **Developer-only check:** load a locally owned, legally acquired TD data
      set (never committed or uploaded to CI) to prove the full menu →
      scenario → gameplay path works. This isolates platform bugs from data
      bugs before M2.
- [ ] Display scaling to the canvas, HiDPI, focus/blur pause, pointer
      capture, and edge scrolling.
- [x] Measure frame time, WASM size and memory; record the baselines.
- [x] A generated, original placeholder boot pack and a `stock-engine` CI job
      that boots the unmodified engine to its main menu.

**Exit gate:** in Chromium on CI, the unmodified engine loads the original
boot pack, reaches and renders its main menu with its own renderer, responds
to mouse and keyboard, and never stalls the page for more than 1 s.
Starting and playing a scenario (map, sidebar, radar, selection, building,
harvesting) needs M2's data and is verified by M2's exit gate.

Evidence: 2026-11-22 · `f43de4d5433f7fc6c768b45424540addde92070c` · [stock-engine CI run](https://github.com/chucklowery/World-Conquer/actions/runs/45077613546) · headless Chromium (Playwright 1.56.1) · menu reached on original boot pack in 832/855/862 ms at 480/1100/1600 px; three background clicks per width reach the engine at the matching game position (within 3%); keyboard changes the menu selection; no pointer-lock request; zero page errors, fatals and boot/menu misses; max post-startup stall 0 ms; frame p95 16.7 ms; 60 s heap steady at 17,235,968 bytes.

**Deferred validation:** owner-only external-data mission check (not part of M1's original-data CI exit gate), remaining modal loop audit and scenario-only edge scrolling are not marked complete.

### M2: Minimum original data pack (4–8 weeks; overlaps M1)

Agent instructions: [`docs/milestones/M2-original-data-pack.md`](milestones/M2-original-data-pack.md) (four sessions: M2a, M2b, M2c, M2d).

The highest-risk milestone. It turns the repository into a game we can ship.

- [x] From the wireframe catalog, define the **minimum slice**: palette,
      fonts, mouse cursors, sidebar/radar/tab art, one theater (templates and
      terrain objects), one resource overlay, about 6 structures (yard, power,
      refinery, barracks, factory, defense), about 4 units (harvester, rifle
      infantry, light vehicle, heavy vehicle), projectiles, explosions and
      smudges. Placeholder (wireframe) art is acceptable.
- [x] CI builds every required MIX archive from source (`tools/content`,
      `tools/mixtool`); generated archives are artifacts, not commits.
- [x] Write original rules and scenario INI from scratch; retarget the R04
      map pipeline to emit scenario INI and map data.
- [x] Add a **missing-asset detector**: the engine logs every failed file and
      shape lookup in a debug build, and CI fails if any occur during a
      scripted skirmish.
- [x] Map the R05 Aster/Forge art onto the engine slots it replaces.

**Exit gate:** the unmodified engine plays a full skirmish start (base,
harvester, production) on **100% original data**, with zero missing-asset
lookups, built entirely by CI. The map, sidebar and radar render; selection,
movement, scrolling, building and harvesting respond; and the page never
stalls for more than 1 s.

Evidence: 2026-11-23 · `58d86a51e71f42b199e8a1333211990d3099a4a3` · [stock-scenario CI run](https://github.com/chucklowery/World-Conquer/actions/runs/45167410607) · headless Chromium (Playwright 1.56.1) · Skirmish match on 100% original data (pack built in CI: 66,994,806 bytes, 2,031,885 gzip): MCV deployed; placed power plant, refinery, barracks and vehicle factory; harvest +25 credits; produced rifle infantry and a light vehicle; box-select move, force-fire, keyboard and edge scrolling; ran 2 more minutes; zero required or unclassified misses (149 optional probes, each documented); no stall over the 1 s limit (0 ms in three local runs); frame p95 16.7 ms; heap flat at 99,876,864 bytes; match start in about 2 s.

### UI track: command interface (parallel with M2–M5)

Agent instructions: [`docs/milestones/UI-command-interface.md`](milestones/UI-command-interface.md)
(six sessions, UI-A to UI-F). The engine's own sidebar, radar, cursors and
menus are restyled with original art in a late-90s command-bar aesthetic.
UI-A (design spec) can start after M1; UI-B onward requires the M2 exit
gate evidenced on `vanilla` and the preceding UI session merged.

### M3: First playable skirmish (2–4 weeks)

Session notes: [`docs/browser/M3_SESSION_LOG.md`](browser/M3_SESSION_LOG.md).

- [x] Two factions (Aster and Forge) as engine houses with distinct rosters.
      The rosters come from the engine's type tables (`Ownable`), not INI;
      every object has an authored original name.
- [x] The engine AI builds, harvests and attacks on the original data
      (`USE_RA_AI` computer player; measured by the `ai-match` CI job).
- [x] Two or three original skirmish maps; win/loss screens; restart.
      Foundry Test Range, Crossroads and Long Valley; the end-of-match
      score screen and restart are automated for a loss. The win path uses
      the same screen but is not yet automated.
- [ ] Publish to GitHub Pages from `vanilla` (replacing the tactical alpha).
      Set up: play view (`vanillatd.html?play`), `package-play.js` and
      `publish-play.yml`; live once merged and Pages deploys from Actions.
- [x] A short, scripted Chromium acceptance test: start a match, place a
      structure, produce a unit, and see credits change (`stock-scenario`,
      M2).

Progress: 2026-11-23 · `8ccae03ee5039cc87e698bc2101dc3bdf9245b09` · [CI run](https://github.com/chucklowery/World-Conquer/actions/runs/45222236369) · headless Chromium (Playwright 1.56.1) · on all three maps the computer player built 9-11 structures, made 131-224 harvest deliveries and 9-13 kills, and destroyed the idle player's base; the score screen drew and the game restarted from the skirmish dialog; zero required or unclassified misses. Open for the exit gate: publishing (owner decision) and an automated win.

**Exit gate:** a person with only a link can play a winnable and losable
match against the AI in the browser.

### M4: Browser quality (3–5 weeks)

- [ ] Audio: SDL2 or OpenAL through Emscripten, with original or CC0 sounds;
      Web Audio unlock on the first user gesture.
- [ ] Saves through the engine's own save/load, persisted to OPFS or
      IndexedDB; export/import of save files.
- [ ] Settings: key remapping, scroll speed, UI scale, fullscreen.
- [ ] Performance and size budgets enforced in CI: first load size, time to
      menu, frame-time p95, heap growth over a 10-minute soak. Reuse the R20
      soak harness and `scripts/summarize-r20-metrics.js` here.
- [ ] Evaluate removing Asyncify (an explicit state machine for menus) only
      if the budgets demand it.

**Exit gate:** save mid-match, reload the page, resume; audio works; the
budgets pass on CI.

### M5: Content depth (ongoing, parallel after M3)

- [ ] Replace wireframe art with final art, slot by slot (per-slot audit gate
      in the catalog).
- [ ] Expand rosters (support, air and naval are optional) and tune balance
      in INI.
- [ ] Three to five skirmish maps; a 3-mission campaign built with the
      engine's trigger/teamtype scenario scripting.
- [ ] Accessibility: colorblind-safe faction remaps, readable UI scale,
      captions for key audio cues.

**Exit gate:** campaign missions 1–3 can be completed; no placeholder art
appears in the default skirmish.

### M6: Multiplayer (4–6 weeks)

The engine is already deterministic lockstep; only the transport is new.

- [ ] Replace the IPX/TCP session layer with a WebSocket relay (WebRTC
      optional later) carrying the existing `EventClass` stream.
- [ ] A minimal lobby (create/join by code), a desync detector that compares
      CRCs, and reconnect-or-forfeit handling.
- [ ] Get the hosting choice and its cost approved before deployment.

**Exit gate:** two browsers on different networks complete a match without
desync.

### M7: Release hardening

- [ ] Branch protection with required checks (the former FND-008),
      sanitizer and soak jobs required, crash/error reporting, versioned
      deploys with rollback.
- [ ] License and attribution audit: GPL source, EA additional terms, no EA
      media or trademarks, provenance for every asset.

**Exit gate:** a tagged 1.0 release deployed from a protected branch.

## Critical path

```
M0 ─► M1 ─┬─► M3 ─► M4 ─► M6 ─► M7
     M2 ──┘          └─► M5 (parallel, ongoing)
```

M1 (platform) and M2 (data) run in parallel; M3 needs both. M5 can start
art replacement as soon as M2 defines the slots.

## Disposition of prior work

| Prior work | Disposition |
| --- | --- |
| WASM build, Asyncify loop, asset importer, CI matrix | **Keep**: the foundation for M1 |
| R04 map pipeline and validation | **Keep**: retarget to emit scenario INI (M2) |
| R05 art, SHP/PAL/MIX encoders, wireframe catalog | **Keep**: the core of M2/M5 |
| R01 camera/selection/input UX | **Port** the ideas as engine-side input improvements (M1/M4) |
| R20 soak harness, metrics schema, sanitizer job | **Keep**, as optional now and required at M4/M7 |
| `rts_world.h`, `production_orders.h`, `rts_weapon_system.h`, v3 snapshot bridge, JS tactical HUD | **Freeze** as legacy demos; no new features. Remove once M3 ships unless still needed as a test fixture |
| R06–R17, R19 prompts | **Superseded**: each is covered by engine features configured through M2–M7 |
| R20 open gates (FND-003 idle displacement, FND-006 budgets, FND-008 branch protection) | **Close** as superseded for the parallel world; FND-008 moves to M7, budgets to M4 |

## Evidence

One line per completed gate in this file, immediately under the milestone:

`Evidence: <date> · <commit SHA> · <CI run link> · <browser/version> · <what was observed>`

Keep longer notes in the PR description, not in this roadmap.

## Non-goals (until after M7)

Mobile/touch-first controls, accounts and cloud saves, matchmaking, a map
editor UI, a JavaScript or React re-implementation of the game UI, and
bundling or downloading any EA game data.
