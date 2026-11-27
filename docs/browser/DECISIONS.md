# Architecture Decisions

## ADR-0001: Browser source-port strategy
**Status:** Proposed on 2026-10-24. Accepted only when merged.

### Context
Vanilla Conquer has a portable C++ engine, native SDL2 backend, null audio backend and a working native CMake target. Its nested synchronous game and menu loops require browser compatibility work.

### Proposed decision
1. Fork Vanilla Conquer rather than the incomplete historical EA source drop.
2. Preserve unit AI, pathfinding, simulation and missions in C++.
3. Compile to WebAssembly with a pinned Emscripten toolchain.
4. Use existing SDL2 renderer/input before attempting an HTML-native renderer.
5. Scope MVP to desktop, single-player Tiberian Dawn; turn off Red Alert, networking and audio.
6. Prove standalone SDL2 WebAssembly build before modifying the game engine.
7. Import legally obtained user assets; do not redistribute original game media.

### Alternatives
- DOS-in-WASM: fastest to emulate existing binary, poor source-port foundation.
- Full TypeScript rewrite: flexible but substantially more risky for fidelity.
- Browser-side serialized game state renderer: unnecessary integration complexity.
- Asyncify or a browser worker: possible bridging mechanisms, but evaluate against a maintainable cooperative loop.

### Consequences
Higher initial port effort in exchange for faithful gameplay and maintainable cross-platform C++ reuse. Native CI regression checks required.

### Unresolved decisions
- Verified SDK version and browser CI matrix.
- Main-loop strategy, pending source investigation.
- First certified game-data release.
- Persistent storage strategy and eventual audio support.

Follow-on ADRs: main-loop architecture; asset import/storage; audio/video.


## ADR-0002: Asyncify as transitional cooperative execution for original loops
**Status:** Proposed for runtime milestone P2b (2026-10-24); verify with headless Chromium and native CI.

### Context
Original VanillaTD main() invokes Main_Game(), which calls Select_Game() and
Main_Menu(); both use nested synchronous loops. Scenario processing calls
Main_Loop() in a for(;;) loop, and dialog/fade paths spin on Call_Back() or
Frame_Limiter(). These loops freeze browser rendering/input if left unchanged.

### Decision
Use Emscripten Asyncify in the browser build ONLY. Its emscripten_sleep(0)
operation suspends the current C++ call stack and resumes it on a future JS
turn, retaining existing gameplay, menu and dialog code. Insert yield points:
- In Call_Back(), covering menus, transitions and dialog maintenance.
- In Frame_Limiter(), covering full gameplay frames and most modal dialogs.
- In portable ms_sleep/us_sleep implementations on Emscripten, replacing
  browser-main-thread-blocking nanosleep with emscripten_sleep.
Native builds take none of these paths and retain their original threading.

Add a separate real-engine test mode \`--browser-cooperative-probe\`: a
synchronous C++ while loop rendering SDL2 frames, where Asyncify suspends and
resumes the loop as browser JS timers and input handlers continue to execute.
CI tests responsive browser heartbeat, animation and input without EA assets.

### Tradeoffs, remaining gaps
Asyncify increases WASM size, CPU cost and memory usage, and cannot make long
single C++ operations interruptible until the next suspension point. Some
code paths that neither call Call_Back, Frame_Limiter nor sleep may still
block. Movie playback and initialization can be asset dependent; they require
further audits and real game-data integration tests. User game media must
never be committed or uploaded. A future explicit state machine may remove
Asyncify once all menu/dialog transitions are modeled.


## ADR-0003: The VanillaTD engine is the RTS; content is an original data pack
**Status:** Accepted on 2026-11-22. Supersedes the R00–R20 parallel-world
direction in `docs/rts-milestones/`. Roadmap: [`docs/ROADMAP.md`](../ROADMAP.md).

### Context
The R-series milestones built a second native simulation in
`browser/engine/` (`rts_world.h` world/houses/HP/lifecycle,
`production_orders.h` A*, `rts_weapon_system.h` combat, and the start of a
harvest economy). It uses VanillaTD only for `InfantryClass::AI()` movement
and `MapClass` terrain, and draws with SDL rectangles instead of the engine
renderer. The remaining R06–R15 milestones would re-create economy,
construction, power, production, fog, AI, campaign, saves and multiplayer.
`tiberiandawn/` already implements all of these. Keeping two simulations in
step is the main source of R20 work (position observation, congestion,
friendly-yield), and gameplay progress has been blocked behind it.

The project cannot ship EA game data. The engine can, however, load any data
in its formats, and the repository already has SHP/PAL/MIX encoders and a
295-slot asset replacement catalog.

### Decision
1. The stock VanillaTD engine is the sole gameplay authority in the browser.
   No parallel world, pathfinder, combat or economy layer is extended further.
2. Shippable content is an **original data pack** (SHP/PAL/MIX assets,
   rules and scenario INI, maps), built from source in CI.
3. Browser work is limited to the platform layer: the loop, input, display,
   filesystem/OPFS, audio and network transport. Engine C++ changes are
   minimal and guarded so native builds keep working.
4. The Courier and R02/R03/R04 live-match modes are frozen as legacy demos.
5. Heavy process gates (performance budgets, branch protection, soak
   sign-off) are applied at release milestones (M4/M7), not before a
   playable loop exists.

### Consequences
- The fastest path to a playable skirmish is M1 (the engine boots in the
  browser) plus M2 (a minimum original data pack); the engine supplies the
  RTS systems.
- The main risk moves to data completeness: exact frame counts, offsets and
  theater sets. A missing-asset detector in CI mitigates it.
- R05 art must be remapped onto engine asset slots instead of `r05.*` keys.
- Multiplayer reduces to a new transport for the existing lockstep
  `EventClass` stream.
- Fidelity to engine behavior constrains game design; deviations need
  targeted engine changes that are justified case by case.


## ADR-0004: Player-facing gates and milestone reorder after M3
**Status:** Accepted on 2026-11-24. Amends the roadmap after M3; ADR-0003
stands. Roadmap: [`docs/ROADMAP.md`](../ROADMAP.md) (revision 2).

### Context
M1 to M3 were evidenced within two days of ADR-0003, which confirms that
direction. Their gates, however, check only what CI can observe. The
published game runs, but it is all grass and wireframes, has no sound, has
been tested only in headless Chromium, and is about 96 MB before
compression. Download size, readability and multiplayer feasibility were
scheduled late (old M4, M5 and M6), although they decide whether anyone plays
or the plan holds. The frozen legacy demos still ship in the public site and
run in per-PR CI.

### Decision
1. Gates have up to three parts: CI, budget and **player** (a recorded
   playtest of the published site by at least three people new to the
   project). A milestone with a player part is not done on CI alone.
2. Reorder after M3: M4 load, budgets and browser reach; M5 readable
   vertical slice (real theater, final art for the minimum roster, UI-B to
   UI-E, sound); M6 persistence and controls (parallel with M5); S1 a
   multiplayer spike any time after M3; M7 game design and content; M8
   multiplayer; M9 release.
3. Remove the legacy demos, their workflows and their scripts in M3 instead
   of keeping them frozen.
4. Size milestones in agent sessions, not calendar weeks.
5. Add a Design track that owns faction identity, balance targets and AI
   difficulty, measured by an AI-versus-AI balance job.

### Consequences
- Budgets move from a release concern to the first post-M3 milestone.
- The UI track is folded into M5 and no longer runs open-ended.
- An engine change for an alternative order scheme is accepted in principle
  (M6), still guarded and justified per ADR-0003.
- Playtests need people outside the project; the owner arranges them.


## ADR-0005: M5 slice: minimum roster, generated art and sound, OpenAL audio
**Status:** Accepted on 2026-11-26. Implements roadmap M5; ADR-0003 stands.

### Context
M5 asks for a game a stranger can read: final art for a minimum roster, a
real temperate theater, the command interface, sound and onboarding text,
with a CI gate that no wireframe is drawn in a scripted match. The stock
rules let the computer build about 30 object types (helipads, repair bays,
advanced power, heavy tanks, grenadiers...), so a skirmish would always show
wireframes; and each side owns only part of the minimum roster.

### Decision
1. **Minimum roster in the browser build.** `WC_MINIMUM_ROSTER` (set only for
   the Emscripten target) makes exactly the roster buildable, by both sides:
   power plant, refinery, barracks, vehicle factory, guard tower, harvester,
   rifle infantry, light vehicle and medium tank; the construction yard comes
   from the mobile base vehicle as before (`browser/engine/roster.cpp`).
   Every other source of units stays inside the roster too: starting units,
   crews leaving a construction yard (no engineer) or an unarmed vehicle
   (riflemen, not civilians), and crates, which are not placed. Native
   builds keep the stock rules.
   M7 widens the roster as content arrives.
2. **Art is generated from code, not drawn by hand.** `tools/content/art/`
   ray-traces small models (boxes, wedges, cylinders, spheres) into
   palette-indexed frames for every facing and animation frame the engine
   indexes; effects, terrain and the command bar are procedural. All of it
   is original and CC0, deterministic, and built in CI. The palette is
   redesigned around named ramps, and each house remap table's targets get
   that house's colour ramp, so house colours are real colours.
3. **Terrain passability is the engine's.** The template table is extracted
   from `cdata.cpp` (`templates.json`, checked for staleness), and each
   template is painted from its own land mask, so what a player sees is
   what units can cross.
4. **Audio uses the engine's OpenAL backend on Emscripten's OpenAL**, which
   runs on Web Audio, instead of a new SDL2 audio backend: the engine
   already has a working OpenAL path, and Emscripten's resumes the audio
   context on the first click. The page puts a master gain in front of every
   context for mute and volume (remembered in localStorage).
5. **Voices are synthesised with flite** (CMU; its voices allow free use and
   redistribution) at pack-build time; effects are synthesised in Node. The
   pack build needs `flite` installed.
6. **CI gate:** the engine logs the first draw of every file
   (`[asset-draw]`, `WC_ASSET_AUDIT`), and every scripted match fails if a
   file generated by `wireframes.js` was drawn. The default skirmish job also
   fails unless sound played after the first click.

### Consequences
- The art is consistent and cheap to change, but it is "programmer art" by
  design; human-authored art can replace any file later under the same
  contracts.
- The first visit grows by about 1.2 MB (sound) and stays well inside the
  15 MB budget.
- Both factions share one roster until M7 gives them distinct units.

### Addendum (2026-11-26): readable menus and the power gauge
Owner feedback: the menus were hard to read and the power gauge came and went.
- **Font.** Every font file now uses an original proportional face with
  lower case and baked shadow and outline pixels (`tools/content/art/font.js`)
  instead of the M2 5x7 capitals-only face.
- **Dialog style.** `WC_BROWSER_UI` (browser build only) routes `Draw_Box`
  to `browser/engine/ui_style.cpp`: steel panels with a teal inner edge,
  bevelled buttons that light up when pressed, dark list wells. Layout is
  unchanged. The dialog palette entries are retuned, and generated labels
  read "Side:", "Select map", "Crystal regrows" (no franchise term).
- **Power gauge.** The sidebar redraws its panels without redrawing the
  gauge (sidebar.cpp:767-806), so the panels now leave the gauge channel
  transparent; the gauge frames reach the bottom of the screen.
The look is a step toward the owner's reference mock-up, not a copy of it:
the engine keeps its own dialog layouts and 640x400 resolution.

### Addendum (2026-11-26): skirmish dialog layout (UI-F)
The owner approved the full mock-up look ("I would like the full look"),
which is the approval UI-F needed. Under `WC_BROWSER_UI` the skirmish setup
dialog (`tiberiandawn/nulldlg.cpp`) takes its geometry from
`Browser_Skirmish_Layout` (`browser/engine/ui_style.cpp`): headed sections
(PLAYER NAME, SIDE, COLOR, SELECT MAP, DIFFICULTY), a wide map list, labelled
gauges with value wells, and large OK >> / CANCEL buttons. Difficulty is
three EASY / NORMAL / HARD buttons that set the stock difficulty value; the
option list keeps Bases and Crystal regrows (crates and capture-the-flag are
off, outside the minimum roster). Native builds keep the stock dialog. The
dialog prints its button and list positions (`[browser-event]
skirmish-dialog`) so the browser tests click the real controls.

## ADR-0006: HD sprite layer over the 640x400 engine
**Status:** Accepted on 2026-11-27 (owner chose option 3 of the M5 resolution
review). Roadmap: HD track.

### Context
The engine draws one 640x400, 8-bit page with 24-pixel cells
(`ICON_PIXEL_W`, display.h:41), and the browser stretches it. Sprite detail is
capped by those cells: 32x32 vehicles, 24x24 infantry, 48-72 px structures.
The art generator can already render any frame at any scale. The options
reviewed were (1) a larger logical screen, which shows more map at the same
detail; (2) 48-pixel cells, which breaks the 256-lepton cell arithmetic in
about 60 places and every layout and art contract; and (3) an HD sprite
layer at presentation time, the route the engine's own `REMASTER_BUILD`
intercepts (`DLL_Draw_Intercept`, conquer.cpp) were made for.

### Decision
1. **The game keeps its logical resolution.** Rules, coordinates, input,
   layouts and the 1x art stay as they are; the 1x frames remain the
   fallback and what the CI draw audit checks.
2. **`WC_HD` (Emscripten only, needs `WC_ASSET_AUDIT`)** presents the page at
   `[Video] HDScale` times its size (default 2 in the browser; 1 turns it
   off), with the window grown to match.
3. **Capture.** `CC_Draw_Shape` records each tactical-map blit of a file that
   has an HD sheet: file (named through the MIX loader registry), frame,
   page rectangle, remap and shadow tables, and the page pixels just before
   and just after the blit (`common/hdlayer.cpp`). A tactical redraw clears
   the records, and with HD on every tactical redraw is complete (no scroll
   copy or partial cell redraw), so the records always describe the page.
4. **Compose.** At presentation the page is scaled up in palette indices and
   each record is repainted from its HD frame wherever the page still holds
   what its blit left. Later draws (shroud, pips, health bars, text, other
   sprites) changed those pixels, so they stay on top with no draw list.
   Shadow pixels use the blit's own ghost table on the pixel under the
   sprite, house colour its remap table, exactly as the 8-bit blitter does.
   The software cursor is drawn after, scaled.
5. **HD sheets** (`NAME.HD2`, `tools/content/art/hd.js`): every frame of
   `NAME.SHP` rendered at the scale, same palette and frame order, run-length
   coded. A sheet is used only if its scale and frame size match.

### Consequences
- Where a sprite overlaps one drawn earlier, the overlap shows the earlier
  sprite at 1x until both have HD; that is the only visible seam.
- With HD on, the tactical view is fully redrawn whenever it is redrawn at
  all; the cost is small at 640x400 but is measured by the budget job.
- HD sheets add download size (the medium tank at 2x is 66 KB); the whole
  roster must stay inside the M4 budget.
- Cameos, the sidebar and dialogs are not tactical draws and stay 1x until
  the capture is extended to their windows.
