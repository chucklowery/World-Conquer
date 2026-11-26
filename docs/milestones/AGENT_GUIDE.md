# Agent operating guide (paste this first in every session)

You are a coding agent working on **World-Conquer**,
`https://github.com/chucklowery/World-Conquer`, integration branch `vanilla`.
This guide is self-contained. You do not need earlier conversations.

## 1. What the project is

- A fork of **Vanilla Conquer**, the portable GPL C++ engine for
  *Tiberian Dawn* (TD, in `tiberiandawn/`) and *Red Alert* (in `redalert/`,
  unused here). Shared engine code is in `common/`.
- The goal is a **browser RTS**: the VanillaTD engine compiled to WebAssembly
  with Emscripten and SDL2, playing **original, project-owned content**.
- The authoritative plan is `docs/ROADMAP.md`. The decision behind it is
  ADR-0003 in `docs/browser/DECISIONS.md`. Read both before you start.

## 2. Non-negotiable rules

1. **The stock engine is the only gameplay authority.** Harvesting, building,
   power, production, combat, AI, shroud and scenarios come from
   `tiberiandawn/`. Do **not** add parallel simulation layers. The earlier
   parallel world (`rts_world.h`, the Courier and R02/R03 demos and the JS
   tactical HUD) was removed in M3; do not restore it.
2. **No EA or Westwood media, ever.** Do not commit, download, upload to CI,
   trace, redraw from, or describe the contents of original game files
   (MIX, SHP, PAL, AUD, VQA, CPS, FNT, INI or BIN files from any C&C release).
   All new content must be original, and its provenance must be recorded.
   Placeholder art generated from geometry is fine.
3. **No EA trademarks in shipped content.** "GDI", "Nod", "Command & Conquer"
   and "Tiberium" must not appear in player-visible strings or art in our data
   pack. The engine's internal C++ identifiers (`HOUSE_GOOD`, `INFANTRY_E1`,
   `UNIT_HARVESTER`, …) can stay.
4. **Native builds must keep compiling.** Guard browser-only code with
   `#ifdef __EMSCRIPTEN__` and engine-behavior changes with a narrowly named
   macro or runtime flag. Linux, macOS, Windows and MinGW workflows must keep
   their *build* jobs green.
5. **Minimal, upstream-friendly engine edits.** Change engine C++ only when
   the platform or a data format needs it. Keep diffs small, commented and
   isolated.
6. **Evidence over assertion.** Do not mark a task done because something
   compiles. Each acceptance criterion below names what to observe.
7. **Scope discipline.** Do only the work package you were given. If you find
   other bugs, list them in your report instead of fixing them.
8. **Stop and ask** if a task would require EA data in CI, a non-trivial
   rewrite of an engine subsystem, removal of a native platform, or changes to
   repository settings or secrets.

## 3. Build and test commands

Toolchain: Emscripten SDK **3.1.68** (pinned), CMake 3.25+, Ninja, Node 18+.
Install `emsdk`, then `./emsdk install 3.1.68 && ./emsdk activate 3.1.68 &&
source ./emsdk_env.sh`.

Browser engine build (the same command CI uses):

```bash
emcmake cmake -S . -B build/browser-engine -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_VANILLATD=ON -DBUILD_VANILLARA=OFF \
  -DBUILD_REMASTERTD=OFF -DBUILD_REMASTERRA=OFF \
  -DNETWORKING=OFF -DOPENAL=OFF -DSDL2=ON \
  -DBUILD_TOOLS=OFF -DBUILD_TESTS=OFF
cmake --build build/browser-engine --target VanillaTD --parallel 2
```

Outputs: `build/browser-engine/vanillatd.{html,js,wasm}`. Serve the directory
with `python3 -m http.server 8080 --directory build/browser-engine` and open
`http://localhost:8080/vanillatd.html`.

Native build (with tools, including `mixtool`):

```bash
sudo apt install -y build-essential cmake ninja-build libsdl2-dev libopenal-dev
cmake -S . -B build/native -G Ninja -DBUILD_VANILLATD=ON -DBUILD_VANILLARA=OFF \
  -DNETWORKING=OFF -DSDL2=ON -DOPENAL=ON -DBUILD_TOOLS=ON
cmake --build build/native
```

Existing checks you must keep passing:

- `.github/workflows/browser-engine.yml`, which runs
  `browser/engine/check-runtime.js` (engine diagnostics: SDL2 probe,
  cooperative loop, SHP drawing, file staging) and
  `browser/engine/check-r05-gallery.js` in headless Chromium. Playwright is
  installed under `browser/engine/node_modules` by the workflow.

- `browser/engine/check-stock-engine.js` (CI job `stock-engine`, added in
  M1): the unmodified engine reaches its menu on generated data, and clicks
  land at the right game position.

- `browser/engine/check-stock-scenario.js` (CI jobs `stock-scenario` and
  `ai-match`): a full skirmish on the original data pack.

## 4. Key code locations

| Area | Location |
| --- | --- |
| Emscripten link flags (Asyncify, shell, FS) | `tiberiandawn/CMakeLists.txt` (`if(EMSCRIPTEN)` block) |
| Browser `main()` dispatch of `--browser-*` modes | `tiberiandawn/startup.cpp` |
| Menu, scenario-start logging (`[browser-game] …`) | `tiberiandawn/init.cpp` |
| MIX registration order at startup | `tiberiandawn/init.cpp` (`CCLOCAL.MIX`, `CONQUER.MIX`, `GENERAL.MIX`, `SOUNDS.MIX`, …) |
| Theater loading | `tiberiandawn/display.cpp` `DisplayClass::Init_Theater` |
| Asyncify yield points | `common/framelimit.cpp`, `common/mssleep.h`, `Call_Back()` |
| Browser path defaults (`/game`, `/game/user`) | `common/paths_posix.cpp` |
| Main loop | `tiberiandawn/conquer.cpp` |
| Unit, building and infantry stats (compiled tables) | `tiberiandawn/{udata,bdata,idata,aadata,odata,tdata,…}.cpp` |
| Optional rules overrides | `RULES.INI` handling in `tiberiandawn/` (verify which keys are read) |
| Scenario loading | `tiberiandawn/scenarioini.cpp` |
| Browser launcher page | `browser/engine/shell.html` (first panel = stock engine) |
| Local file import into MEMFS | `browser/engine/asset-import.js` |
| Chromium acceptance drivers | `browser/engine/check-stock-engine.js`, `check-stock-scenario.js` (game); `check-runtime.js` (diagnostics) |
| SHP/PAL encoders | `tools/content/encode-shape.js`, `encode-palette.js`, `build.js` |
| 295 engine asset slots and placeholders | `docs/browser/WIREFRAME_REPLACEMENT_CATALOG.md`, `tools/content/wireframes.js`, `game/content/wireframes/` |
| MIX archive builder (native tool) | `tools/mixtool/` (`--create`, `--directory`, `--manifest`, `--file`) |
| Original R05 faction art | `game/content/r05/`, `tools/content/r05.js` |
| Skirmish maps (scenario INI/BIN) | `game/content/scenarios/*.json`, `tools/content/scenario.js` |

## 5. Workflow for each work package

**Exception for M1 and M2:** M1 is one session; M2 is four sessions (M2a,
M2b, M2c, M2d), each with one branch and one PR. Follow the milestone file's
"Session contract" instead of steps 1 and 5 below.

1. Branch from the latest `vanilla`: `git checkout -b m<N>/<wp-id>-<slug>`.
2. Read the files the work package names. Confirm its prerequisites are
   merged. If they are not, stop and report the work package as blocked.
3. Implement it, with tests (Node unit tests for JS and content tools, host
   C++ tests where practical, and Chromium checks for browser behavior).
4. Run the checks in section 3 that the change touches.
5. Open **one PR per work package** against `vanilla`. Title it
   `M<N> <WP-ID>: <summary>`. In the body, include what changed, the commands
   you ran with their results, CI links, and known limitations.
6. When a milestone's exit gate is met, add one evidence line under that
   milestone in `docs/ROADMAP.md`:
   `Evidence: <date> · <commit SHA> · <CI run link> · <browser/version> · <what was observed>`
   and tick its checkboxes. Do not edit `docs/rts-milestones/`; it is archived.

## 6. Report format (end of every session)

```
Work package: <id>  Status: done | partial | blocked
PR: <link>   Head SHA: <sha>
Changed: <bullet list of files/areas>
Verified: <command → result>, <CI run → result>, <browser observation>
Not verified / limitations: <list>
Follow-ups found (not fixed): <list>
```
