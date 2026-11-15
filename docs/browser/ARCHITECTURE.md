# Architecture and Source Map

## R02 — bounded production-unit orders

See [R02_UNIT_ORDERS.md](R02_UNIT_ORDERS.md). An isolated R02 browser mode
uses four real `InfantryClass::AI` actors and `MapClass` terrain, a bounded
native order/path controller, and the version-1 R00 snapshot bridge. The
specialized Courier combat/objectives remain in the Courier mode.

## R04 — native maps and snapshot metadata

`mission-pack.js` verifies the v2 SHA-256 map catalog and chosen original
text content before staging MEMFS. The same bound-checked grammar lives in
`native_slice_core.h`: it makes a candidate world, then commits atomically.
`courier_world_plan.h` positions the configured rectangular footprint and
`courier_engine_map.h` stages/read-verifies actual `MapClass` land types and
resource-cell ground; real infantry are allocated at the authored unit spawns.
`simulation_contract.h` projects terrain type, cost, resources, spawn zones,
base locations, victory bounds and scenario IDs into R00 v2 snapshots (v1
stays for Courier), which `simulation-bridge.js` validates and freezes for the
HUD/minimap. This does not initialize campaign TheaterClass/BuildingClass or
create an economy. See [R04 format](R04_MAP_FORMAT.md).

## R00 — established simulation-to-browser contract (v1)

The **native C++ process is authoritative** for Tactical Alpha gameplay. Its
`browser/engine/simulation_contract.h` defines the portable, testable boundary,
and `native_slice.cpp` is the browser/VanillaTD adapter. In the engine-owned
Courier mode, `InfantryClass::AI()` and `MapClass` still own real infantry
movement/occupancy. The adapter reads the resulting `Coord_Cell` positions
into Courier state each tick. Courier state/combat continues to own sentry
movement, combat HP, supplies, extraction, and mission phase. The contract
projects that combined native state; it does **not** introduce JS simulation or
replace production movement. The standalone `play.html` JavaScript prototype
and `--browser-native-slice` diagnostic remain independent compatibility paths.

### Stable identities, map, and commands

| Contract concept | v1 meaning |
| --- | --- |
| Entity IDs | Nonzero `uint32_t`: squad 1001/1002, sentries 2001/2002, supply 3001/3002, extraction 4001. Stable across ticks and restart; never use array indexes as public IDs. |
| Ownership / team | `uint16_t`: 0 neutral, house 1/team 1 player, house 2/team 2 sentries. These are **contract IDs**, not numeric `HOUSE_GOOD` engine enums. |
| Terrain | Mission 18×11 row-major array, 0 clear / 1 blocked; native `Contract::terrainAt()` distinguishes clear, blocked, and outside. `courier_world_plan.h` stages the exact same footprint into production `MapClass` at origin (16,16) and verifies the cells. |
| Tick | `uint64_t` snapshot tick from `courier::State::frame`; advances once with each native combat/infantry simulation step (180 ms in this alpha), resets to zero on mission restart. Runtime animation frames are **not** simulation ticks. |
| Command | `{tick, sequence, issuer, actor, kind, tile, target}`; kinds select/move/stop/attack. Commands are validated without changing gameplay, then applied by `(tick, sequence, actor ID)` order. Issuer must own a living player infantry; coordinates/targets, blocked terrain, reachability, and game phase are checked. Commands are revalidated at application time. |
| Result | `accepted`, `invalid_tick`, `duplicate_sequence`, `unknown_entity`, `not_owned`, `dead`, `wrong_phase`, `bad_target`, `blocked`, `unreachable`. Rejections do not alter selection, target, movement, or combat. |
| Events | Typed `command`, `selection`, `position`, `health`, `pickup`, `phase`, `restart`, with tick, entity ID and command sequence/result where applicable. Events have deterministic order and are consumed once by `Contract::publish()`. |

The SDL adapter assigns monotonically increasing command sequences, uses the
contract for player mouse/keyboard orders, and delivers accepted destinations
via the existing `courier::EngineFootBridge` to the actual
`FootClass::Assign_Destination()` port. `process(nextTick)` can batch commands
from future transports in a deterministic order; the current single-player
adapter applies each local input immediately in sequence, before the next
native simulation step. External command producers must provide globally
unique, monotonic sequences in their chosen session/epoch. Restart drops all
pending commands and begins a new sequence epoch.

### Snapshot/HUD seam

`Contract::publish()` projects one full, read-only, version-1 JSON object:

```json
{
  "version": 1,
  "tick": 0,
  "map": {"width": 18, "height": 11, "terrain": [0, 0, 0]},
  "selectedEntityId": 1001,
  "cargo": 0,
  "phase": "playing",
  "entities": [
    {"id": 1001, "kind": "infantry", "ownerId": 1, "teamId": 1,
     "x": 1, "y": 2, "hp": 5, "active": true, "order": null}
  ],
  "events": []
}
```

The short arrays above illustrate the shape only: a real snapshot carries
**all 198 terrain cells and all seven entities**, including active/inactive
supplies, infantry order targets (or `null`), and the extraction point.
`EM_ASM` forwards the serialized value to `simulation-bridge.js` without
feeding gameplay back into C++. The bridge validates version/shape/IDs/ticks,
deep-freezes the snapshot, exposes `WCRTS.latest()` and a bounded immutable
`WCRTS.eventHistory()` stream, then notifies its HUD subscriber. The
`tactical-hud.js` adapter paints native snapshot positions and terrain; shell
status/selection/health/victory also use the snapshot. Console logs are kept
for diagnostics, **not** as a second source of browser gameplay state. No
browser module interpolates or calculates a movement step.

### Ownership and extensions

- **Economy and harvesting (R06):** add funds, resources, and harvester
  entities/commands to the native state and a *new* versioned snapshot schema;
  retain integer house IDs and emit typed resource events.
- **Buildings and placement (R07):** extend entity kinds, footprint and
  placement validation against native `MapClass`; build cards stay preview-only
  until commands actually create production structures.
- **Production/tech (R08):** queues and prerequisites belong in native house
  state, not sidebar JavaScript; expose commands/results and queue deltas.
- **Fog/radar (R09):** add per-team visibility projections so snapshots do not
  leak hidden enemy state; the current full-map Courier snapshot is only valid
  for this single-player alpha.
- **Multiplayer (R15):** authoritative lockstep/replication must schedule and
  validate commands at agreed simulation ticks, assign stable IDs across peers,
  determine sequence/rollback rules, and version the wire protocol separately
  from this local browser view. No network transport or determinism guarantee
  for unrelated historical engine subsystems is asserted by R00.

Coverage: `test-simulation-contract.cpp` (host C++11),
`test-simulation-bridge.js` (Node/immutable HUD), and `check-runtime.js`
(real WebAssembly/Chromium unit-position parity, blocked order, full extraction
and restart). The browser workflow copies the bridge into both engine output
and the scoped public alpha package.

## Target shape

~~~text
Browser UI (minimal HTML first, optional TypeScript later)
    -> local asset selection / virtual file system
    -> Emscripten JS runtime
    -> VanillaTD C++ simulation, menu and game state
    -> SDL2 rendering + input -> HTML canvas
~~~

Do not split rendering into a new JavaScript engine until C++ gameplay runs. Keep native and browser builds in one fork.

## Verified upstream structure

| Responsibility | File | Browser-port notes |
| --- | --- | --- |
| CMake options | CMakeLists.txt | BUILD_VANILLATD, BUILD_VANILLARA, NETWORKING, SDL2, OPENAL |
| VanillaTD executable target | tiberiandawn/CMakeLists.txt | add_executable(VanillaTD), links commonv |
| SDL2 and null audio backend | common/CMakeLists.txt | video_sdl2.cpp; soundio_null.cpp with OPENAL=OFF |
| Video | common/video_sdl2.cpp | Existing SDL2 renderer |
| Input | common/wwkeyboard_sdl2.cpp | Existing SDL event routing |
| Native paths | common/paths_posix.cpp | Assumes native executable paths/home directories |
| Startup | tiberiandawn/startup.cpp | main(), path/config, graphics initialization |
| Game menus and loop | tiberiandawn/conquer.cpp | Main_Game(), Select_Game(), Main_Loop() |
| MIX archives | common/mixfile.cpp | Requires compatible legally obtained game data |

## Adapters required

- Build: Emscripten-aware SDL2 flags, without native find_package(SDL2).
- Platform: browser-safe path/time/OS shims, conditionally compiled.
- Lifecycle: nonblocking frame callback or a documented temporary compatibility strategy for nested synchronous loops.
- Files: import local game data into the virtual filesystem before startup.
- Rendering/input: preserve SDL2 initially; ensure palettes, scaling and focus behave correctly.
- Audio: null backend first; investigate WebAudio later.
- Networking: off until single-player tests pass.

## Early risks

The original game uses blocking menus and nested loops; successful compilation alone does not guarantee a responsive browser. Other risks include POSIX-specific calls, C++ ABI/data layout, browser storage permissions, and asset format/version mismatches.
