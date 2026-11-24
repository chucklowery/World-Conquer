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

## ADR-0004: Runtime-height command bar and faction sidebar art (UI-F)

Status: accepted (owner approval: "Implement A-F", 2026-11-24, for the UI plan
in docs/milestones/UI-command-interface.md).

Context: the stock 640×400 layout fixes four cameo rows per strip, places the
SIDE1/SIDE2 halves at y 158 and 276, the command buttons at x 484/537/590, the
lower power-bar piece at PowY+100, and loads one neutral sidebar set. UI-F asks
for a full-height command bar on larger screens and per-faction sidebar art,
behind a named compile-time option, with no save-game or multiplayer change.

Decision: `WC_COMMAND_BAR_TALL` (CMake option, default OFF on native, ON in the
browser build; compile definition on the VanillaTD target only).

- Constants that become runtime values: `StripClass::MAX_VISIBLE` uses become
  `WC_STRIP_ROWS` = `StripClass::VisibleRows` (sidebar.h/.cpp), computed in
  `SidebarClass::One_Time` as `(screen height − strip top − 26) / 48`, clamped
  to 4..`MAX_VISIBLE_LIMIT` (12, the array size of `SelectButton`). `MaxVisible`
  and the WINDOW_SIDEBAR clip height follow it; the scroll buttons follow
  `Y + rows × 48 − 1`. `radar.h` and `tab.h` constants are unchanged: the radar
  and tabs keep their size and anchor to the right edge as before.
- Screen size: `[Video] GameWidth/GameHeight` (640..1024 × 400..768, read in
  startup.cpp `Read_Setup_Options`). The SeenBuff/HidPage viewports grow to the
  screen and never shrink below 640×400, so the default and DOS mode attach as
  in the stock code. The playfield width is derived as before from
  `SeenBuff.Get_Width() − SideBarWidth` (display.cpp); the command buttons are
  placed relative to `SideX` instead of x 484.
- Drawing: SIDE1 at y 158, SIDE2 against the bottom edge, and the one-row SIDE3
  filler (48 rows) repeated between them; at 640×400 SIDE2 lands at 276 and no
  filler is drawn. The lower power-bar piece repeats every frame height down the
  gauge; at 640×400 it draws once at PowY+100.
- Faction skins: `Load_Sidebar_Art` loads `SIDE1/2/3.<suffix>` for the player's
  `ActLike` house when it is HOUSE_GOOD (Aster, .GDI) or HOUSE_BAD (Forge, .NOD),
  the same suffix scheme the stock radar uses, and falls back to the neutral
  `.SHP` set; it reloads when the house changes (checked at draw time).
- Save games and multiplayer: nothing new is saved or sent. `VisibleRows` is
  derived from the screen each start; `TopIndex`/scroll state saved by the stock
  code is bounded by the existing scroll logic. Players with different screen
  heights see different numbers of rows; the simulation is unaffected.

Consequences: with the option OFF the compiled code is the stock code. With it
ON at 640×400 the layout is pixel-identical to OFF except for the faction art.
The browser shell may request a larger screen with `?gamew=&gameh=` (it also
turns off the SDL presenter's 16:10 boxing for that profile) and the Forge side
with `?side=forge`.
