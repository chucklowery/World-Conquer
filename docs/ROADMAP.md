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
- [ ] Add a stock-engine headless smoke test (engine boots to its first frame
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
- [ ] Mount data into MEMFS (later OPFS) before `main()`, with
      case-insensitive lookup.
- [ ] **Developer-only check:** load a locally owned, legally acquired TD data
      set (never committed or uploaded to CI) to prove the full menu →
      scenario → gameplay path works. This isolates platform bugs from data
      bugs before M2.
- [ ] Display scaling to the canvas, HiDPI, focus/blur pause, pointer
      capture, and edge scrolling.
- [ ] Measure frame time, WASM size and memory; record the baselines.
- [ ] A generated, original placeholder boot pack and a `stock-engine` CI job
      that boots the unmodified engine to its main menu.

**Exit gate:** in Chromium on CI, the unmodified engine loads the original
boot pack, reaches and renders its main menu with its own renderer, responds
to mouse and keyboard, and never stalls the page for more than 1 s.
Starting and playing a scenario (map, sidebar, radar, selection, building,
harvesting) needs M2's data and is verified by M2's exit gate.

### M2: Minimum original data pack (4–8 weeks; overlaps M1)

Agent work packages: [`docs/milestones/`](milestones/README.md) (M2-A … M2-G).

The highest-risk milestone. It turns the repository into a game we can ship.

- [ ] From the wireframe catalog, define the **minimum slice**: palette,
      fonts, mouse cursors, sidebar/radar/tab art, one theater (templates and
      terrain objects), one resource overlay, about 6 structures (yard, power,
      refinery, barracks, factory, defense), about 4 units (harvester, rifle
      infantry, light vehicle, heavy vehicle), projectiles, explosions and
      smudges. Placeholder (wireframe) art is acceptable.
- [ ] CI builds every required MIX archive from source (`tools/content`,
      `tools/mixtool`); generated archives are artifacts, not commits.
- [ ] Write original rules and scenario INI from scratch; retarget the R04
      map pipeline to emit scenario INI and map data.
- [ ] Add a **missing-asset detector**: the engine logs every failed file and
      shape lookup in a debug build, and CI fails if any occur during a
      scripted skirmish.
- [ ] Map the R05 Aster/Forge art onto the engine slots it replaces.

**Exit gate:** the unmodified engine plays a full skirmish start (base,
harvester, production) on **100% original data**, with zero missing-asset
lookups, built entirely by CI. The map, sidebar and radar render; selection,
movement, scrolling, building and harvesting respond; and the page never
stalls for more than 1 s.

### M3: First playable skirmish (2–4 weeks)

- [ ] Two factions (Aster and Forge) as engine houses with distinct rosters
      defined in INI.
- [ ] The engine AI builds, harvests and attacks on the original data.
- [ ] Two or three original skirmish maps; win/loss screens; restart.
- [ ] Publish to GitHub Pages from `vanilla` (replacing the tactical alpha).
- [ ] A short, scripted Chromium acceptance test: start a match, place a
      structure, produce a unit, and see credits change.

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
