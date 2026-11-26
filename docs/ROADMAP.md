# World-Conquer Roadmap: a browser RTS on the VanillaTD engine

**Status:** Authoritative as of 2026-11-24 (revision 2). Supersedes
`docs/browser/ROADMAP.md` (P0–P4) and `docs/rts-milestones/` (R00–R20),
which are kept as historical records. Decision records:
[ADR-0003](browser/DECISIONS.md#adr-0003-the-vanillatd-engine-is-the-rts-content-is-an-original-data-pack)
(engine is the RTS) and
[ADR-0004](browser/DECISIONS.md#adr-0004-player-facing-gates-and-milestone-reorder-after-m3)
(player-facing gates and the post-M3 reorder).

Revision 2 keeps M0–M3 and their evidence as they were, and replaces the
milestones after M3. Old numbers used in session logs map as shown in
"Renumbering" at the end.

## Goal

A complete, legally distributable real-time strategy game that runs in a
desktop browser: harvest, build, power, produce, fight an AI opponent, save,
and play another person, all on **original art, rules, maps and missions**.

"Done" means a stranger with only a link chooses to play a second match.
Every milestone after M3 is judged against that, not only against what CI can
observe.

## Core principle

> **The VanillaTD engine is the simulation. The browser port is a platform
> layer. The product is an original data pack.**

`tiberiandawn/` already implements a complete RTS: harvesting and credits
(`HouseClass`, tiberium overlays), construction and power (`BuildingClass`),
production queues and the sidebar (`FactoryClass`, `SidebarClass`), shroud
and radar, AI teams and triggers (`TeamTypeClass`, `TriggerClass`),
scenario/campaign loading, save/load, and deterministic lockstep multiplayer
(`EventClass`, `queue.cpp`). We do not rebuild these systems. Work falls into
four tracks:

| Track | Owns | Does **not** own |
| --- | --- | --- |
| **Platform** | Emscripten build, cooperative main loop, input, display scaling, loading and caching, filesystem/OPFS, audio backend, network transport | Gameplay rules |
| **Data** | Original SHP/PAL/MIX/AUD assets, rules/scenario INI, maps, missions, faction identity | Engine code changes, unless a data format requires them |
| **Design** | Faction asymmetry, balance targets, AI difficulty, map and mission design, playtests | Code; it is delivered as data and written targets |
| **Engine fixes** | Minimal, upstream-friendly C++ fixes needed by the other tracks, guarded so native builds keep working | Parallel simulations or a JavaScript authority |

**Rule:** a feature that already exists in the engine is delivered by
*configuring or feeding the engine*, not by reimplementing it.

## Current state (2026-11-24)

- **Done:** M0, M1 and M2 gates evidenced. A full skirmish runs on 100%
  original placeholder data in the stock engine. The computer player
  (`USE_RA_AI`) builds, harvests, attacks and wins on three original maps.
  The play site is **deployed to GitHub Pages** from `vanilla`
  ([publish run 45262345913](https://github.com/chucklowery/World-Conquer/actions/runs/45262345913),
  2026-11-23, at `977d4f6`).
- **Measured:** frame p95 16.7 ms in a match; heap flat at about 100 MB; match
  start about 2 s after Play. The published site is about 96 MB (pack
  67 MB raw, 2 MB gzip). Placeholder frames compress well, but the transfer
  size a visitor actually pays has not been measured.
- **Weak for a player:** every terrain cell is grass; units and buildings
  are wireframe placeholders; there is no sound; only headless Chromium is
  tested; there is no human playtest on record.
- **Cleaned up (2026-11-24):** the legacy demos, their scripts, content and
  workflows are removed; the play site ships only engine files.

## How milestones work

### Gates

Each milestone has one **exit gate** with up to three parts. It is complete
only when every part it lists is met and recorded.

| Part | What it proves | How it is recorded |
| --- | --- | --- |
| **CI gate** | Behaviour is automated and repeatable | A passing job on `vanilla`, linked in an `Evidence:` line |
| **Budget gate** | Size, speed and memory targets hold | The budget job's numbers in the `Evidence:` line |
| **Player gate** | A person can actually play and understand it | A playtest entry in `docs/browser/PLAYTESTS.md` (protocol below), linked in the `Evidence:` line |

A CI gate that passes while the player gate fails means the milestone is
**not** done.

### Playtest protocol (player gates)

A playtest uses the **published** site, at least three people who have not
worked on the project, and no help beyond the in-game text. For each tester,
record: browser and OS, time to first match, whether they finished the match,
what they could not identify or work out, and one quote. A gate's wording
says what share must succeed. `PLAYTESTS.md` is created by the first
milestone that needs it (M5).

### Sizing

Milestones are sized in **agent sessions** (one branch, one PR, roughly 6–8
hours of work, as in `docs/milestones/AGENT_GUIDE.md`), not in calendar weeks.
M1 to M3 took about one session per planned week. A milestone over 6 sessions
must be split into named sessions in `docs/milestones/` before it starts.

### Definition of done (every PR)

- Native CI (Linux, macOS, Windows, MinGW) stays green; engine changes are
  guarded by `__EMSCRIPTEN__` or a named macro.
- No EA data, trademarks or franchise terms (`test-boot-pack.js` enforces
  this for strings).
- Generated binaries are built in CI, never committed; `PROVENANCE.json`
  covers every new asset.
- Zero required or unclassified asset misses (`check-stock-scenario.js`).
- Docs updated in the same PR; one `Evidence:` line per completed gate.

## Milestones

### M0: Reset and consolidation — done

- [x] Adopt ADR-0003 and this roadmap; mark the earlier roadmaps as superseded.
- [x] The launcher's first panel is the stock engine; the tactical demos
      are grouped under "Legacy demos (frozen)".
- [x] Make the R20 WASM soak and the ASan/UBSan foundation leg run only on
      manual dispatch.
- [x] Add a stock-engine headless smoke test and make it the primary
      browser check.
- [x] Update `BROWSER_PORT.md` and `browser/engine/README.md` to match.
- [x] Close the open R20 gate issues (#48, #50) as superseded.

**Exit gate:** one roadmap, no contradictory status documents, and a green
minimal CI on `vanilla`.

### M1: Stock engine runs in the browser — done

Agent instructions: [`docs/milestones/M1-engine-in-browser.md`](milestones/M1-engine-in-browser.md).

- [x] Mount data into MEMFS before `main()`, with case-insensitive lookup.
- [x] Display scaling to the canvas, focus handling and pointer behaviour
      sufficient for the menu gate.
- [x] Measure frame time, WASM size and memory; record the baselines.
- [x] A generated, original boot pack and a `stock-engine` CI job that boots
      the unmodified engine to its main menu.
- Moved: the modal-loop audit moves to M6 (it is about saves, dialogs and
  options screens). Edge-scrolling verification is covered by M2's gate.
- Dropped: the owner-only check with external game data. M2 and M3 proved
  the full path on original data, so it no longer isolates anything.

**Exit gate:** in Chromium on CI, the unmodified engine loads the original
boot pack, reaches and renders its main menu with its own renderer, responds
to mouse and keyboard, and never stalls the page for more than 1 s.

Evidence: 2026-11-22 · `f43de4d5433f7fc6c768b45424540addde92070c` · [stock-engine CI run](https://github.com/chucklowery/World-Conquer/actions/runs/45077613546) · headless Chromium (Playwright 1.56.1) · menu reached on original boot pack in 832/855/862 ms at 480/1100/1600 px; three background clicks per width reach the engine at the matching game position (within 3%); keyboard changes the menu selection; no pointer-lock request; zero page errors, fatals and boot/menu misses; max post-startup stall 0 ms; frame p95 16.7 ms; 60 s heap steady at 17,235,968 bytes.

### M2: Minimum original data pack — done

Agent instructions: [`docs/milestones/M2-original-data-pack.md`](milestones/M2-original-data-pack.md).

- [x] Define the minimum slice from the wireframe catalog.
- [x] CI builds every required MIX archive from source.
- [x] Original rules and scenario INI; the R04 map pipeline emits scenario
      INI and map data.
- [x] A missing-asset detector that fails CI on required or unclassified
      misses.
- [x] Map the R05 Aster/Forge art onto engine slots.

**Exit gate:** the unmodified engine plays a full skirmish start (base,
harvester, production) on **100% original data**, with zero missing-asset
lookups, built entirely by CI.

Evidence: 2026-11-23 · `58d86a51e71f42b199e8a1333211990d3099a4a3` · [stock-scenario CI run](https://github.com/chucklowery/World-Conquer/actions/runs/45167410607) · headless Chromium (Playwright 1.56.1) · Skirmish match on 100% original data (pack built in CI: 66,994,806 bytes, 2,031,885 gzip): MCV deployed; placed power plant, refinery, barracks and vehicle factory; harvest +25 credits; produced rifle infantry and a light vehicle; box-select move, force-fire, keyboard and edge scrolling; ran 2 more minutes; zero required or unclassified misses (149 optional probes, each documented); no stall over the 1 s limit (0 ms in three local runs); frame p95 16.7 ms; heap flat at 99,876,864 bytes; match start in about 2 s.

### M3: First playable skirmish and cleanup (1–2 sessions left)

Session notes: [`docs/browser/M3_SESSION_LOG.md`](browser/M3_SESSION_LOG.md).

- [x] Two factions (Aster and Forge) as engine houses with distinct rosters
      and authored original names.
- [x] The engine AI builds, harvests and attacks on the original data
      (`ai-match` CI job).
- [x] Three original skirmish maps (Foundry Test Range, Crossroads, Long
      Valley); end-of-match score screen; restart.
- [x] Publish to GitHub Pages from `vanilla`
      ([run 45262345913](https://github.com/chucklowery/World-Conquer/actions/runs/45262345913)).
- [x] A scripted Chromium acceptance test (`stock-scenario`).
- [x] **Automated win.** A test drives the human side to destroy the
      computer's base on at least one map and sees the win screen and restart.
      Done with a CI-only test hook (`browser/engine/test_hooks.cpp`, off
      unless the test passes `--browser-test-hooks`) and the `win-match` job;
      design and the failed runs that shaped it are in the M3 session log.
- [x] **Remove the legacy demos.** Delete `rts_world.h`,
      `production_orders.h`, `rts_weapon_system.h`, `rts_live_match.h`, the
      Courier sources and their JS (`tactical-hud.js`,
      `simulation-bridge.js`, `rts-camera.js`, `rts-input-ui.js`,
      `vertical-slice.js`, `mission-pack.js`, and any other script only the
      legacy panel loads) with their tests. Remove `rts-foundation.yml`,
      `validate-rts-roadmap.yml`, `publish-tactical-alpha.yml`, the
      `validate-roadmap.js` step in `browser-engine.yml` and the legacy
      launcher panel. Keep any
      C++ test that checks *engine* behaviour by moving it under `tests/`.
      `package-play.js` then ships only engine files.
- [x] **Docs housekeeping.** Rewrite `docs/browser/BACKLOG.md` as an index
      of this roadmap; fix the title and status in `BROWSER_PORT.md`; mark
      `docs/rts-milestones/` as archived in its README only (no validator).

**Exit gate (CI):** on `vanilla`, `ai-match` covers both a loss and a win,
per-PR CI runs only the native matrix, the WASM build and the stock-engine
jobs, and the published site contains no legacy demo files. (Met on the
branch; on `vanilla` once it is merged and published.)

Progress: 2026-11-23 · `8ccae03ee5039cc87e698bc2101dc3bdf9245b09` · [CI run](https://github.com/chucklowery/World-Conquer/actions/runs/45222236369) · headless Chromium (Playwright 1.56.1) · on all three maps the computer player built 9-11 structures, made 131-224 harvest deliveries and 9-13 kills, and destroyed the idle player's base; the score screen drew and the game restarted from the skirmish dialog; zero required or unclassified misses.

Progress: 2026-11-23 · `977d4f6e5d2344b51f6edea421d24c629f901d8b` · [publish run](https://github.com/chucklowery/World-Conquer/actions/runs/45262345913) · headless Chromium · the packaged play site started a skirmish and deployed the base through its play view, then deployed to GitHub Pages.

Progress: 2026-11-25 · `86d4cfc56478c7a194377fd60a3cfe48d3f5aca6` · [CI run](https://github.com/chucklowery/World-Conquer/actions/runs/45514602700) · headless Chromium (Playwright 1.56.1) · legacy demos removed: WASM build, engine diagnostics, `stock-engine`, strict `stock-scenario` and `ai-match` on all three maps passed; the `wasm-vanillatd` job now takes about 3.5 minutes.

Progress: 2026-11-25 · `55b3042f8f2b80d39decacc711883664289b78b6` · [CI run](https://github.com/chucklowery/World-Conquer/actions/runs/45562526792) · headless Chromium (Playwright 1.56.1) · automated win: the hook left the computer one power plant; the player's 6 starting units, box-selected with real input, destroyed it 112 s later (kill credited to the player); `match-end result=won`, score screen drawn, new match started. Every job in the run passed, including `ai-match` (losses) on all three maps.

### M4: Load, budgets and browser reach (2–3 sessions)

Every visitor pays for load time before seeing anything, so this comes before
art and features. Track: Platform.

- [ ] **Measure first.** A `site-budget` CI job serves the packaged site with
      the same compression Pages uses and records the transfer size, the
      uncompressed size, the WASM size and time to menu on a throttled
      connection (Playwright, 20 Mbps profile).
- [ ] **Shrink the transfer.** Pick the cheapest option that meets the
      budget, in this order: precompressed archives (`.mix.gz` or Brotli,
      decompressed in `pack-loader.js` with `DecompressionStream`); lazy
      loading of data not needed for the menu (theater and score archives
      after the menu appears); placeholder frames that are smaller in the
      file. Do not change engine file formats.
- [ ] **Cache it.** A versioned service worker caches the engine and pack by
      SHA-256 from `site.json`, so a second visit loads from cache and a new
      deploy replaces only changed files.
- [ ] **Loading screen.** A progress bar in the browser shell (outside the
      canvas) with bytes loaded and a clear error message on failure.
- [ ] **Browser reach.** Run `stock-engine` and `stock-scenario` in Playwright
      Firefox and WebKit as well as Chromium. Fix or document each failure;
      an unsupported browser shows a message instead of a blank canvas.
- [ ] **Budgets in CI** (fail the job when exceeded):

| Budget | Target | Current |
| --- | --- | --- |
| First-visit transfer (engine and pack) | ≤ 15 MB | not measured (≈96 MB raw) |
| Repeat-visit transfer | ≤ 100 KB | not measured |
| Time to menu, 20 Mbps, first visit | ≤ 8 s | not measured |
| Time to menu, repeat visit | ≤ 2 s | ≈0.85 s on CI (local files) |
| Match frame time p95 | ≤ 20 ms | 16.7 ms |
| Heap growth over a 10-minute match | ≤ 5% | flat over 2 minutes |
| Longest main-thread stall after start | ≤ 250 ms | 0 ms |

**Exit gate (CI and budget):** the budget job passes on `vanilla` in
Chromium, Firefox and WebKit, and a repeat visit to the published site
starts from cache.

### M5: Readable vertical slice (4–6 sessions)

The goal is a game a stranger can read at a glance. It covers the existing
minimum roster only; more content waits for M7. Tracks: Data and Design. The
UI track (UI-B to UI-E) is delivered inside this milestone.

- [ ] **One real theater.** Temperate templates for clear ground, water,
      shore, cliffs, roads and rough ground, with passability from the
      template data. Each map uses them for chokepoints and expansions, not
      decoration only.
- [ ] **Final art for the minimum roster.** About 6 structures (yard, power,
      refinery, barracks, factory, defence), about 4 units (harvester, rifle
      infantry, light vehicle, heavy vehicle), the resource overlay,
      projectiles, explosions and smudges. Each is distinguishable by
      silhouette at 1× zoom, shows house colour through the remap band and
      passes the per-slot audit in the wireframe catalog.
- [ ] **Command interface.** UI-B to UI-E from
      [`UI-command-interface.md`](milestones/UI-command-interface.md):
      command bar, build strip, cursors, menus. UI-F stays optional and
      approval-gated.
- [ ] **Sound.** SDL2 audio through Emscripten with original or CC0 sounds:
      weapon fire, explosions, unit acknowledgements, construction, and
      COMMS voice lines for the key cues (construction complete, unit ready,
      base under attack, low power, insufficient funds). Web Audio unlocks
      on the first user gesture; mute and volume persist.
- [ ] **Onboarding text.** A short how-to in the play view (controls and the
      goal of a match); in-engine tooltips use the authored names.
- [ ] **Playtest log.** Create `docs/browser/PLAYTESTS.md` and run the
      protocol.

**Exit gate (CI):** no wireframe slot is drawn during the default skirmish
(the audit fails on any `wireframe` provenance in a scripted match), sound
plays in Chromium after the first click, and the M4 budgets still pass.

**Exit gate (player):** at least 3 of 3 testers start a match unaided, at
least 2 of 3 finish a match against the AI, and every tester can name what
each of the 10 roster objects is for.

### M6: Persistence, controls and settings (2–4 sessions; parallel with M5)

Track: Platform. It can run alongside M5 because it touches different files.

- [ ] **Saves.** The engine's own save/load, persisted to OPFS (IndexedDB
      fallback), with export and import of save files. Saves carry the pack
      SHA so a mismatched pack gives a clear message, not a crash.
- [ ] **Modal-loop audit** (moved from M1): every dialog, options screen and
      save/load path yields to the browser; no stall over 250 ms.
- [ ] **Browser input conflicts.** No browser shortcut fires during play:
      context menu, Ctrl+number group keys, Alt, F-keys, Backspace, wheel
      zoom. Groups work with both Ctrl and an alternative if a browser
      reserves a key.
- [ ] **Order scheme option.** An option for right-click orders and
      left-click select, alongside the engine's original scheme, behind an
      engine setting (an engine change, justified case by case per ADR-0003).
- [ ] **Settings.** Key remapping, scroll speed, UI scale, fullscreen,
      volume; stored with the saves.
- [ ] **Tab handling.** The game pauses when the tab is hidden in
      single-player and resumes cleanly; no backlog of frames runs on return.

**Exit gate (CI):** a test saves mid-match, reloads the page, loads the save
and sees the same credits and structures; a 10-minute soak passes the M4 heap
budget; a scripted run of each blocked browser shortcut leaves the page in
place.

**Exit gate (player):** testers in the M5 or M7 playtest report no lost input
and no accidental page navigation.

### S1: Multiplayer spike (1–2 sessions; any time after M3)

A time-boxed experiment to remove the largest unknown before M8 is planned.
Track: Platform. Its outcome is a written report, not a feature.

- [ ] Carry the engine's `EventClass` lockstep stream between two browser tabs
      over a WebSocket through a minimal local relay.
- [ ] Measure: whether the engine's session code can be fed by a new
      transport without touching gameplay; behaviour when one tab is
      hidden (browsers throttle timers); latency tolerance; CRC agreement
      over 10 minutes.
- [ ] Write `docs/browser/S1_MULTIPLAYER_SPIKE.md`: what worked, each
      blocker, and a revised M8 scope and session count.

**Exit gate:** two tabs finish a skirmish against each other without
desync, **or** the report names each blocker and how M8 must change.

### M7: Game design and content depth (ongoing, after M5)

Tracks: Design and Data. All tuning is data (INI and scenarios), so it
iterates quickly.

- [ ] **Faction identity.** A one-page design note per faction (strengths,
      weaknesses, signature units) in `docs/browser/R05_ORIGINAL_FACTIONS.md`;
      the rosters and INI match it.
- [ ] **Roster expansion.** Support units, an anti-armour and an
      anti-infantry option per faction; air and naval stay optional.
- [ ] **AI difficulty.** Easy, normal and hard computer players through
      existing engine settings, offered in the skirmish dialog.
- [ ] **Balance harness.** An AI-versus-AI CI job (both sides computer) runs
      each faction pairing on each map several times and records win rates,
      match length and the units built.
- [ ] **Maps.** Five skirmish maps with distinct layouts (open, chokepoint,
      island or river crossing, expansions), all on the real theater.
- [ ] **Campaign.** Three missions per faction is the target, three in total
      is the minimum, built with the engine's triggers and team types. Each
      introduces one mechanic and has a briefing.
- [ ] **Accessibility.** Colour-blind-safe house remaps, captions for COMMS
      cues, readable UI scale.

**Exit gate (CI and budget):** in the balance job, no faction pairing wins
more than 60% of matches on any map over at least 10 matches; campaign
missions 1–3 can be completed by a scripted run; budgets still pass.

**Exit gate (player):** at least 2 of 3 testers complete mission 1 unaided,
and at least 2 of 3 say they would play another skirmish.

### M8: Multiplayer (scope set by S1; 4–6 sessions expected)

The engine is already deterministic lockstep; the transport, lobby and
failure handling are new.

- [ ] Replace the IPX/TCP session layer with a WebSocket relay (WebRTC
      optional later) carrying the existing `EventClass` stream, as S1
      recommends.
- [ ] A minimal lobby (create or join by code), faction and colour choice.
- [ ] A desync detector comparing CRCs, which ends the match with a report
      the players can download.
- [ ] Reconnect within a grace period, or forfeit.
- [ ] Get the hosting choice and its monthly cost approved by the owner
      before deployment.

**Exit gate (CI):** two headless browsers on separate network contexts finish
a match through the deployed relay with matching CRCs.

**Exit gate (player):** two people on different networks finish a match
without desync.

### M9: Release hardening

- [ ] Branch protection on `vanilla` with required checks (the former
      FND-008): native matrix, WASM build, stock-engine jobs, budgets.
- [ ] Error reporting that sends only crash text and versions, opt-in, with
      no personal data.
- [ ] Versioned deploys with a one-step rollback to the previous site.
- [ ] Licence and attribution audit: GPL source offer, EA additional terms,
      no EA media or trademarks, provenance for every asset, credits screen.
- [ ] A short public page: how to play, known limitations, how to report a
      bug.

**Exit gate:** a tagged 1.0 release deployed from a protected branch, with
a passing release checklist recorded in the release notes.

## Critical path

```
M0 ─► M1 ─► M2 ─► M3 ─► M4 ─┬─► M5 ─► M7 ─┐
                            └─► M6 ───────┼─► M8 ─► M9
                  M3 ─► S1 ───────────────┘
```

M4 comes first after M3 because it affects every visit. M5 (Data and
Design) and M6 (Platform) run in parallel. S1 can run at any time after M3,
and must finish before M8 is planned in detail. M7 continues after the 1.0
release.

## Risks

| Risk | Effect | Mitigation | Milestone |
| --- | --- | --- | --- |
| Pages does not compress `.MIX` files | First visit downloads about 96 MB | Precompressed archives and lazy loading | M4 |
| Firefox or Safari fails with Asyncify or audio | The link works only in Chromium | Cross-browser CI; a clear unsupported message | M4 |
| Final art breaks a frame or palette contract | Missing or garbled sprites | Per-slot audit and `minFrames` checks in CI | M5 |
| Engine design limits block a faction idea | Design changes or engine edits | Design notes checked against engine type tables before art | M7 |
| Lockstep stalls when a tab is hidden | Multiplayer freezes or desyncs | S1 measures it early | S1, M8 |
| Relay hosting cost or abuse | Ongoing cost | Owner approval; join-by-code only; rate limits | M8 |
| Asyncify cost grows with content | Frame or size budgets fail | Remove Asyncify only if a budget fails (ADR-0002) | M4–M7 |

## Disposition of prior work

| Prior work | Disposition |
| --- | --- |
| WASM build, Asyncify loop, asset importer, native CI matrix | **Keep**: the platform foundation |
| R04 map pipeline, R05 art, SHP/PAL/MIX encoders, wireframe catalog | **Keep**: the core of the data pack |
| R01 camera/selection/input UX | **Port** the ideas as engine-side input options (M6) |
| R20 soak harness and metrics | **Removed** with the demos it measured (M3); the M4 budget job and M6 soak are written for the stock engine |
| `rts_world.h`, `production_orders.h`, `rts_weapon_system.h`, Courier, v3 snapshot bridge, JS tactical HUD, legacy workflows | **Removed** in M3 (2026-11-24); kept in git history |
| R06–R17, R19 prompts | **Superseded**: covered by engine features configured through M4–M9 |

## Evidence

One line per completed gate in this file, immediately under the milestone:

`Evidence: <date> · <commit SHA> · <CI run link> · <browser/version> · <what was observed>`

Player gates add `· playtest: <PLAYTESTS.md anchor>`. Partial progress uses
`Progress:` with the same fields. Keep longer notes in session logs and PR
descriptions, not in this roadmap.

## Non-goals (until after M9)

Mobile or touch-first controls, accounts and cloud saves, matchmaking and
ranking, a map editor UI, a JavaScript or React re-implementation of the game
UI, and bundling or downloading any EA game data.

## Renumbering (revision 1 → revision 2)

Session logs and code comments written before 2026-11-24 use the old
numbers.

| Old (rev 1) | Item | New (rev 2) |
| --- | --- | --- |
| M4 | Performance and size budgets, Asyncify evaluation | **M4** |
| M4 | Audio | **M5** |
| M4 | Saves, settings | **M6** |
| M5 | Final art replacement | **M5** (minimum roster), **M7** (expanded roster) |
| M5 | Rosters, balance, maps, campaign, accessibility | **M7** |
| M6 | Multiplayer | **S1** (spike), **M8** |
| M7 | Release hardening, branch protection (FND-008) | **M9** |
