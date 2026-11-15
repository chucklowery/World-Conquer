# VanillaTD browser runtime bootstrap

R02 adds an opt-in **four production-unit orders** mode alongside Courier.
It uses live `InfantryClass::AI` / `MapClass` and bounded C++ pathfinding,
with command state in the R00 snapshot/HUD. See
[`R02_UNIT_ORDERS.md`](../../docs/browser/R02_UNIT_ORDERS.md).

This launcher is compiled into the **real VanillaTD** HTML/JS/WASM bundle, not the independent SDL2 smoke test. It deliberately defers game main() until the user starts it.

## Tactical Alpha 0.1 — browser-playable native mission

**R01 input controls:** the tactical HUD now supports fitted camera zoom/pan,
drag-box selection, Shift-add, local control groups, right-click move/attack,
and explicit Move/Attack/Stop buttons. Shift+1–9 stores groups, 1–9 recalls
them, arrows pan, +/- zoom, S stops, C centers, and R restarts. Minimap clicks
recenter the camera rather than moving infantry. See
[`docs/browser/R01_INPUT_UX.md`](../../docs/browser/R01_INPUT_UX.md) for the
desktop/touch guide, keyboard-only limitations, native R00 boundary, and tests.

The default browser shell now leads with **Start Tactical Alpha**. The player
commands a two-person infantry squad in Operation Courier Extraction: recover
two guarded crates and bring at least one surviving soldier to the aircraft.
The native 18×11 mission includes selectable infantry, terrain-obstructed
movement, a click-to-attack command, moving sentry patrols, automatic defense,
health, combat defeat, extraction victory, and **R** to restart in place.
The keyboard also supports **1** (Scout), **2** (Ranger), and **Esc**
(cancel the selected unit's orders). A live status message now announces
supplies, combat events, and the extraction objective.

The player infantry are constructed production `InfantryClass` objects placed
on `MapClass` cells. Their movement orders use live `NavCom` targets and
`InfantryClass::AI()`; their coordinates are read back from the actual engine
on every tick. A separate deterministic Courier combat component owns health,
attack selection, and sentry movement, while a small HUD tracks remaining
squad HP, sentries, and recovered cargo. Sentry actors, supply pickups, and
win/loss rules are **not yet** production campaign entities or systems.
The game is a self-contained single-mission alpha, not the complete historical
VanillaTD campaign and not a multiplayer release.

### R05 original-faction gallery (visual content only)

The source-authored Aster Expedition / Forge Compact pack is built with
`node tools/content/r05.js build build/browser-engine/r05` and opens at
`r05/gallery.html` under a local server, or under the packaged site's `/r05/`
path. It renders both sides, environmental resources and tactical effects on
the native 24-pixel cell grid; phase controls illustrate motion, combat,
production, damage and wreckage. This is an art reference, **not a new game
mode or working construction system**. The native Courier tactical mission
and its existing content lookup remain unchanged.

To play the native version, build the WebAssembly bundle via
`docs/browser/BUILD.md`, serve `build/browser-engine/`, open `vanillatd.html`,
wait for **Runtime ready**, and press **Start Tactical Alpha**. No proprietary
game assets are required. The `world-conquer-courier-playable` artifact contains
the separate, lightweight JavaScript fallback; the compiled native game lives
in the **VanillaTD WebAssembly** CI artifact.

CI covers native combat orders, pursuit, damage, death, reset, and the entire
browser extraction loop. The Chromium test exercises the new launch button,
HUD, combat command, mission victory, and restart within the compiled engine.

### Immersive tactical command HUD spike

Starting **Tactical Alpha** now moves the *same SDL engine canvas* into a
full-viewport tactical layout. The battlefield occupies the left side and is
letterboxed at the native 18:11 mission aspect ratio, growing to fill the
available play area without distorting input coordinates. The right command
sidebar keeps a live minimap **above** the construction options, and provides
Build, Intel, and Controls navigation. The minimap reads the verified mission
grid and follows actual infantry position, sentry movement, combat health,
pickup, and restart messages emitted by the native game; it never substitutes
JavaScript movement for `InfantryClass::AI()`.

The four original-concept construction cards are **non-buildable previews**:
they reveal planned roles but cannot place structures or spend resources until
the production/building model exists. The panel can collapse to maximize the
field, and automatically becomes a collapsible drawer at narrow widths.
**Fullscreen** uses the browser Fullscreen API; browser F11 is also supported
by the viewport-filling CSS. The production HUD uses no third-party game art.
Engineering diagnostics and the standalone JavaScript fallback remain on the
launcher page, separate from the gameplay overlay.

`tactical-hud.js` is a small testable UI model and minimap renderer.
`test-tactical-hud.js` checks authored terrain, moving actors, pickup order,
health, selection, and restart. Chromium CI also asserts stage/sidebar order,
minimap-above-build layout, browser-sized HUD, responsive aspect ratio, and
navigation without breaking the full native extraction loop.

### GitHub Pages publication

The `Publish World-Conquer Tactical Alpha` workflow builds the native game,
stages original assets, runs the Chromium gameplay acceptance suite, packages
only public runtime files through `package-alpha.js`, and deploys the verified
artifact through GitHub's official Pages deployment action. It runs on
feature-branch pushes and can be dispatched manually after the workflow reaches
the repository's default branch. Publication never writes or force-pushes a
branch and does not grant pull-request code repository write permissions.
The standard browser CI independently checks this package and uploads the
`world-conquer-tactical-alpha-site` artifact.

One-time repository-owner setup is needed before the site appears publicly:
under **Settings → Pages → Build and deployment**, select **GitHub Actions**
as the source, then rerun the publication workflow. Until enabled, the job
builds and tests the site but skips deployment with an explanatory notice.
Once GitHub Pages
finishes publishing, the intended URL is
`https://chucklowery.github.io/World-Conquer/`. The URL is not live until
GitHub reports a successful Pages deployment. Future pushes to the feature
branch deploy the site automatically after passing the full native browser test.

For local packaging of an already compiled and staged engine:

```sh
node browser/engine/test-package-alpha.js
node browser/engine/package-alpha.js build/browser-engine build/tactical-alpha-site
python3 -m http.server 8080 --directory build/tactical-alpha-site
```

Open `http://localhost:8080/`. The output directory must be empty; the packer
refuses to overwrite an existing publication. Only original project-owned
content is included, not historical EA game data or native build intermediates.

## Original-content browser-playable vertical slice

For an immediate lightweight launch, open `browser/engine/play.html` directly
in Chrome or Edge (or serve the folder over HTTP). It does not depend on a
WebAssembly build. The compiled engine shell also embeds this same prototype.
The browser CI workflow now produces a small `world-conquer-courier-playable`
ZIP artifact containing `play.html`, its two JavaScript files, and the verified
mission data. Extract the ZIP and open `play.html` to play without installing
the original game or a WebAssembly toolchain. The static build is intentionally
separate from the larger engine WASM artifact; public hosting is not yet set up.

Click **Start tactical mission** in the browser shell. A deterministic, self-contained
18×11 mission opens without any third-party data: select either green squad member,
click a clear tile to move along a four-way path, retrieve the two amber supply
crates, survive the red sentries, and reach the Courier extraction zone. Restart
after victory or defeat. The original aircraft HD frame appears in the extraction
zone if the separately verified HD pack has been loaded; otherwise the landing
zone has a schematic aircraft marker. Tests cover pathfinding, pickup, victory,
defeat and the responsive browser canvas. Source: `vertical-slice.js`.

This **is gameplay, but it is not the native VanillaTD campaign**: the mission
simulation and canvas renderer are independent browser JavaScript. It is intended
to playtest controls, layout, original artwork and the supply-extraction loop
while the C++ gameplay asset/mission integration is still underway.

### Native WebAssembly gameplay milestone

The compiled VanillaTD launcher also offers **Play mission in native C++ engine**.
It selects `--browser-native-slice`, a C++11 implementation of the same
18×11 supply-recovery loop running directly inside the actual game executable
using SDL2. Click green units and destinations; press **R** to restart. The
mission core is tested without Emscripten by `test-native-slice.cpp`. Before
starting, the shell verifies the 36-frame HD pack and stages its north-facing
aircraft image as raw 512×512 RGBA in MEMFS. The native C++ renderer creates
an SDL texture and draws it at the extraction zone. If verification or staging
fails, a schematic extraction marker remains visible. The hosted browser CI
checks native WASM movement, restart and verified HD texture loading.

This milestone exercises real compiled C++ gameplay and HD drawing, but it
is intentionally a **separate native scenario** rather than an original
campaign mission. Integration with the historical unit, theater, save-game,
and mission systems remains outstanding.

### Shared mission-content integration

`game/content/missions/courier-extraction.map` is the single authored 18×11
tile grid consumed by the JavaScript and native C++ missions. `.` is passable
terrain, `#` is an impassable terrain tile, `S`/`R` are squad spawns,
`A`/`B` are sentries, `1`/`2` are recoverable supplies and `X` is extraction.
Each marker must occur exactly once. The mission manifest pins the grid's
SHA-256 digest; `mission-pack.js` validates it before staging `/COURIER.MAP`
in MEMFS. The native core's `loadMap()` validates all dimensions, symbols and
marker uniqueness *before* replacing the active state, and reuses the map
on restart. Browser CI verifies native mission-map loading. The direct-launch
HTML version falls back to the identical built-in terrain when opened via
`file://`, where browser fetch restrictions can prevent local file access.

This is a content-contract stepping stone, **not the final VanillaTD theater
format**. Native production map cells, unit-class definitions, state machines,
and scenario ownership have not been replaced or bypassed in the campaign.

### Native tactical sprite integration

The native Courier scenario now also stages the existing source-verified
six-class wireframe pack. It loads `E1.SHP` and `WIREFRAME.PAL` through the
game's `CCFileClass` search path, draws the infantry base frame with the actual
`CC_Draw_Shape()` routine into an indexed `GraphicBufferClass`, and converts
that verified output into an SDL texture for the two squad members and sentries.
This connects original engine SHP lookup and tactical drawing to moving units
in the playable scenario. On missing/invalid resources it retains the prior
colored markers. Chromium CI asserts the SHP-derived infantry texture loaded.
The entities still use the isolated Courier simulation, not the original
`InfantryClass` movement or `MapClass` cells.

The same bounded tactical drawing adapter now also resolves the original
`T01.SHP` terrain-object frame and paints the authored mission's blocked cells
with its source-rendered texture. Its use for scenery is deliberately visual:
the 18×11 scenario's passability comes from the validated mission grid, not
from the original theater-template or `MapClass` collision rules. Failure to
load either SHP leaves the fallback rendering intact. Chromium CI checks
both sprite classes independently.

### Persistent movement-command seam

Courier now maintains a destination per squad member independently of its
current breadth-first route. The native `assignDestination()` adapter mirrors
the command lifetime of `FootClass::Assign_Destination`/`NavCom`: a new valid
order replaces the prior target, arrival clears it, and a temporarily occupied
next tile triggers replanning without discarding the command. An invalid order
leaves the existing command intact. The standalone JavaScript slice uses the
same behavior, with host C++ and Node regression coverage. This remains a
**Courier-owned adapter**, not a constructed production `FootClass` or a claim
that VanillaTD mission movement is active; binding it to real engine units
requires the production world and house initialization sequence.

### Native/JavaScript replay parity

The checked-in `courier-replay.txt` is a small, deterministic tile-command
stream (`select x y`, `move x y`, `tick count`). The host C++ replay runner
loads the validated mission map, executes those commands through Courier's
native click/tick boundary, and prints the resulting mission state. The Node
parity test executes the same commands through the browser slice and compares
frame, selected unit, cargo, phase, all unit positions and HP, and pending
movement commands. GitHub Actions compiles and runs both implementations on
each browser build. This establishes a regression fixture for future engine
unit-system work; it is **not** a production replay/save-game format.

### VanillaTD cell-target adapter

The native slice now includes `courier_engine_target.h`, which converts a
validated Courier tile to a real Tiberian Dawn `CELL` and `TARGET` using the
engine's `MAP_CELL_W`, `As_Target(CELL)`, `Target_Kind()` and `Target_Value()`.
It also rejects out-of-range, non-cell, and non-Courier cell targets on decode.
The browser runtime logs an engine cell target for accepted movement orders,
and Chromium checks that this production-target encoding path was exercised.
Host CI compiles a round-trip assertion translation unit against the original
engine headers; that unit is compile-only because the full `function.h`
dependency graph has link-time engine-global requirements. The actual runtime
round trip executes inside the linked VanillaTD WASM build. Courier still
owns its units and collision rules; this is a typed command translation seam,
not a call to `FootClass::Assign_Destination` on a live production unit.

### Opt-in production unit command port

`native_slice_core.h` now exposes an optional accepted-order callback. It
emits one command when an order is issued or cancelled, never on rejected
clicks or path replans. The callback is covered by host C++ tests. The native
browser mission installs `EngineFootBridge`, a guarded implementation of that
port which calls the **real virtual** `FootClass::Assign_Destination(TARGET)`
only when a production world is marked ready and a live unit is bound. The
browser currently provides neither, so dispatch remains disabled and the
isolated Courier gameplay is unchanged. This avoids constructing infantry
without initialized `HouseClass`, `MapClass` cells, scenario context, and
type tables; `InfantryClass` construction and `Unlimbo()` depend on them.
Compile-only CI checks the port against the actual production `FootClass`
headers. A subsequent milestone must initialize and own those units before
the bridge can legitimately be enabled.

### Bounded production-map placement plan

`courier_world_plan.h` now prepares a pure, validated placement of all 198
Courier tiles into a larger engine cell grid. The native browser mode plans
the verified mission at origin (16,16) using the real VanillaTD `MAP_CELL_W`
and `MAP_CELL_H` dimensions (128×128 in the MEGAMAPS build). It calculates
the 14 blocked cells, four unit spawn cells, two supply cells and extraction
cell without modifying `MapClass`. Validation rejects out-of-bounds placement,
overflow, obstructed spawns and overlapping squad spawns, preserving the
previous plan on rejection. Host CI verifies exact mapped cells, and Chromium
requires a successful runtime plan. Applying those cells to the production
theater and constructing units remains a separate, guarded initialization
milestone; this plan alone does not make an engine scenario playable.

### Real `MapClass` cell staging (browser native mode)

The dedicated native Courier browser mode now invokes the original engine's
`Map.One_Time_Editor()`, `Map.Init_Cells()` and `Map.Set_Map_Dimensions()` after
producing a valid placement plan. It writes `LAND_ROCK` for the mission's
blocked tiles and `LAND_CLEAR` for walkable tiles using the actual
`CellClass::Override_Land_Type()`, then reads back every cell through
`Map[cell].Land_Type()` and confirms its radar bounds. Chromium CI requires
the staging/read-back success log, and host CI compile-checks the bridge
against the production engine API. The isolated Courier simulation still
drives gameplay, and no `HouseClass` or `InfantryClass` instances are created.
This initializes only the terrain-cell storage in a separate browser mode;
it is not a full theater, visibility, collision, or campaign initialization.

### First native infantry object (separate experimental probe)

The browser launcher offers **Test native infantry allocation (experimental)**.
The one-shot `--browser-unit-probe` mode initializes the verified Courier
terrain through `MapClass`, allocates the engine's `Houses` and `Infantry`
fixed heaps, initializes those collections, creates a `HOUSE_GOOD` house and
one real `INFANTRY_E1` instance, places it via the actual
`InfantryClass::Unlimbo()` path, then assigns a production cell `TARGET`
through `FootClass::Assign_Destination`. It verifies its map cell, owning house
and stored `NavCom`, without invoking infantry movement AI.
The probe is isolated from the playable native Courier mode and cannot
receive movement input or run a campaign. Browser CI checks its success log.
This is an **on-map object-allocation diagnostic**, not a playable
engine movement loop or a replacement for the remaining theater and
visibility initialization required by full campaign gameplay.

### Engine-owned Courier movement and tactical combat

The launcher also exposes **Play Courier with native infantry movement
(experimental)**. It stages the verified 18×11 mission in real `MapClass`
cells, allocates a player house and two `INFANTRY_E1` objects, and places
them via `Unlimbo()`. Clicks dispatch actual `MISSION_MOVE` commands with
translated cell `TARGET`s. Every native tick invokes `InfantryClass::AI()`;
the SDL renderer reads the players' real `Coord_Cell()` positions, rather
than advancing Courier's independent breadth-first movement. Courier combat
rules add attack orders, autonomous moving sentries, ranged auto-defense,
damage, and defeat. Sentries and combat damage are still mission-level actors
and rules, not the production weapon/projectile/targeting systems. Cargo pickup,
extraction victory, and restart also remain mission-level logic. The existing
`--browser-native-slice` remains available unchanged as a fallback.

Chromium CI requires successful production unit staging, a changed engine
unit position, supply recovery, extraction victory, a restart, and a combat
attack order that damages a sentry. This is a constrained single-mission engine
integration, not the full historical campaign startup.

## Try it

Build the engine with Emscripten per docs/browser/BUILD.md, then serve build/browser-engine over HTTP and open vanillatd.html.

- Wait for the page's **Runtime ready** status.
- Click **Run engine SDL2 probe**. Expect an animated rectangle, mouse click toggling its color, and keydown logs. This probe exercises SDL2 **inside the engine binary** but does not load game state.
- Reload the page to switch modes.
- Optionally select legally acquired game files or a folder. The browser stages files locally under /game in MEMFS without uploading them. **Launch experimental game** calls the unmodified synchronous game main(); it may freeze or fail and is not playable yet.

Files are memory-only and lost on refresh. No copyrighted EA media is included in the project or CI artifacts.

## Original six-class wireframe integration

The **Render six wireframe assets** button tests the project-owned placeholder art using the actual C++ resource lookup and tactical drawing path. It verifies the representative [roster](../../game/content/wireframes/representative-roster.json) and SHA-256 manifest, stages six `.SHP` files and `WIREFRAME.PAL` under `/game` in MEMFS, then launches the native `--browser-wireframe-probe` mode. This draws infantry (`E1`), tank (`MTNK`), aircraft (`ORCA`), construction yard (`FACT`), tree (`T01`) and explosion (`ART-EXP1`) in a 3×2 grid via `CC_Draw_Shape()`, with base and selected action-state frames side by side.

To create the served pack from repository source:

```sh
node tools/content/wireframes.js build build/browser-engine/wireframes --representative
node browser/engine/test-wireframe-asset.js build/browser-engine/wireframes
```

Run from the repository root and choose a new build output directory (the generator does not overwrite). The browser page also needs `wireframe-asset.js` copied alongside the generated `vanillatd.html`, as done by `.github/workflows/browser-engine.yml`. The workflow builds the six-class pack and exercises the actual WebAssembly rendering in headless Chromium; it tests that all six are drawn and that the canvas changes.

The loader checks every hash and metadata record **before writing any file**. It rejects conflicting engine filenames, missing classes, existing MEMFS files and partial/tampered content. It does not enable full-game launch, pack archives, verify per-state animation offsets or claim that the six assets are ready for production missions.

The emitted `contracts.json` now provides a [source-audited index contract](../../docs/browser/REPRESENTATIVE_FRAME_CONTRACTS.md). The loader rejects frame counts that cannot cover its required action/state probes; a native LCW test also decodes those exact frames. This is **frame-index correctness**, not proof that the artwork faithfully animates every action or that construction/sound dependencies exist.

## Outstanding

The browser loop, Select_Game(), Main_Game() and dialogs need a cooperative execution design. Asset loading/case behavior requires a real test with legitimately owned data. The probe needs manual Chrome/Edge verification before its runtime acceptance gate can be marked complete.

SDL2's Emscripten video backend defaults to the CSS selector `#canvas`; the browser shell must keep that ID for mouse events to register correctly. The Chromium test asserts that event registration succeeds.

## Player-owned game data / first GDI mission

The browser import preserves native CD folders named gdi, nod and
covertops. Loose files are staged at /game; GDI CD files are placed
under /game/gdi. The UI checks CONQUER.MIX, CCLOCAL.MIX or LOCAL.MIX,
and GENERAL.MIX before enabling game startup. This confirms only
nonzero-size files at those paths, not valid MIX contents.

Use Verify native engine file lookup to invoke a CCFileClass /
CDFileClass probe in the real VanillaTD binary. It does not parse
archives. Loose SCG01EA.INI is optional because missions may be packed.
Reload, stage legally acquired assets, then select New Game -> GDI
in experimental game mode. Instrumentation logs startup, menu and
scenario stages. A working first mission is NOT yet verified.
