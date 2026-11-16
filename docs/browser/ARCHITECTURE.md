# Architecture and Source Map

## R18 — native world, houses and gameplay-definition registry (v3)

`browser/engine/rts_world.h` provides the authoritative world/lifecycle
model for new RTS gameplay. This C++11 layer owns **all house records,
entity-instance records, HP, lifecycle, selection, map passability and queued
world commands** within a match. It does not calculate movement or weapons:
native `MapClass`/`InfantryClass::AI` and R02/R03 remain execution ports.
The Courier mission and historical VanillaTD game modes keep their existing
accepted authority as **compatibility adapters**. There is no new JavaScript
world or renderer.

### Identities and definitions

| Namespace | Policy |
| --- | --- |
| Instance entity ID | Nonzero `uint32_t`: bits 31–20 are a 12-bit match epoch; bits 19–0 are a monotonically allocated counter. IDs persist across ticks and are **never reused** within a match or after restart/reconfigure. Exhausting epochs requires a fresh runtime/session, not wraparound. |
| House and team | `uint16_t` IDs. House 0/team 0 are strictly neutral; registered houses have unique nonzero IDs and nonzero teams. Several houses may share a team, but only an entity's owning house (or server authority 0) can issue orders. Team is derived from its house, never supplied independently by a spawning caller. |
| Gameplay definition | Immutable `game.*` string selected from a validated, version-1 native catalog, e.g. `game.aster.ranger`. Specifies faction, role, 1–4-cell footprint, positive maximum HP and a visual reference. This is **not** an entity ID. |
| R05 visual key | `r05.*`, e.g. `r05.aster.ranger`, is only a source-authored sprite ID. Its faction, kind and footprint must match a reviewed R05 roster binding. It grants no gameplay action, economy, weapon or production ability. |

The canonical source is
`game/content/r18/definitions.rts`: UTF-8, LF/CRLF-safe,
`RTS-DEFINITIONS|1` header, then pipe-delimited `visual` rows
(`key|faction|role|width|height`) and `def` rows
(`gameplay-id|faction|role|width|height|visual-key|max-hp`).
The actual records include the row tag as the first field. All IDs are
lowercase, bounded and restricted to safe characters. `Catalog::load`
validates into a candidate and commits atomically, refusing unknown/duplicate
references, conflicting role/faction/footprints, unsupported version or
malformed fields. Its initial seven immutable R05 bindings are checked against
`game/content/r05/roster.json` by `tools/content/test-r18.js`. New roles or
bindings require explicit source/validator updates; art and gameplay
identifiers are never conflated.

### Ownership and lifecycle API

- `World::configure(catalog,width,height,terrain,houses)` validates the
  entire row-major map and house roster before committing; valid
  reconfiguration starts a **new epoch**, invalid input preserves all prior
  gameplay state. Map bounds: 8–128 per axis, at most 4,096 cells; terrain is
  binary passability. At most 16 houses and 256 entity records (including
  tombstones) exist in a match.
- `World::enqueue(WorldCommand)` accepts one of spawn, select, move, stop,
  attack, kill or despawn. Commands carry epoch, tick, global sequence,
  issuer, owner/actor, target, definition and tile as applicable. Validation
  checks house ownership, role/faction, target team, bounds, footprint,
  collision, lifecycle and epoch before mutation. Neutral/server issuer 0
  may spawn neutral actors or script player entities; nonzero issuers may
  spawn only their own faction/house. This is a scripting/test seam, **not**
  a build/production command.
- Command sequences are **strictly increasing at admission** per match.
  A rejected command does not consume its sequence. The high-water mark
  persists after processing; replaying an executed sequence is rejected.
  Pending commands execute by (tick, sequence, actor ID), allowing future
  scheduled ticks. Application rechecks occupancy/aliveness to catch a prior
  same-tick spawn, kill or movement. At most 128 commands may be queued and
  no command may target more than 64 ticks ahead.
- `World::process(tick)` advances the logical tick and resolves only
  administrative/order state. A successful command emits a `command`
  acknowledgement first, then its `spawn`, `selection`, `order`, `death`
  or `despawn` event. Death/despawn retain a tombstone in `entities[]`,
  with `active:false` and `lifecycle:"dead"|"despawned"`; selected ID 0
  means no selection. Destroying a selected actor emits `selection` with
  entity ID 0 before `death`/`despawn`. Removed IDs cannot be targeted.
- `World::observePosition(id,x,y)` commits a coordinate *already observed*
  from native `InfantryClass::AI` after collision validation.
  `World::observeDamage(id,amount,source,weapon)` commits an effect already
  resolved by R03, publishing typed damage/death events. The registry never
  synthesizes a movement step or damage roll. Events are bounded to 256
  pending records; `publish()` drains them once and `view()` is nonmutating.
- `World::restart()` clears orders, events, selection and entity tombstones,
  increments the epoch, resets tick/sequence/ID counter and emits one
  `restart` event. A pre-restart command cannot act in a new epoch even if
  its sequence is reused.

### Snapshot and compatibility policy

`worldJson(World::publish())` emits the read-only **version 3** schema:
`{version:3, definitionSchemaVersion:1, epoch, tick, map:{width,height,terrain},
houses:[{id,teamId,faction}], definitions:[{id,faction,role,kind,width,height,
maxHp,visualKey}], selectedEntityId, cargo:0, phase:"playing",
entities:[{id,definitionId,visualKey,kind,ownerId,teamId,x,y,hp,active,
lifecycle,order}], events:[{type,epoch,tick,sequence,entityId,sourceId,
weaponId,x,y,value,code}]}`. JSON object keys are serialized in a fixed
order, entities in allocated-ID order, and events in execution order.
These conventions plus a command stream are the deterministic R14 replay/save
foundation; canonical binary save loading and multiplayer transport are
not implemented. This schema intentionally makes house/definition ownership
explicit instead of inventing it in JavaScript.

R00 Courier **v1** and R04 map **v2** snapshots remain byte-compatible and
continue through the unchanged `WCRTS.receive(data)` path. The bridge
**rejects v3 by default**; a consumer that understands the new schema must
explicitly call `WCRTS.receive(data,{allowWorldV3:true})`. It validates
epoch/team/definition/lifecycle relationships before deep-freezing and
publishing. Existing HUD subscribers never receive v3 accidentally.
Regressed epochs/ticks and unannounced restarts are rejected. The standalone
native fixture (`test-rts-world.cpp --json`) and
`test-rts-world-bridge.js` check C++→JS event parity, unselected state,
version negotiation, and preservation of the R00 v1 bridge.

### Integration seams and current limits

`rts_world_ports.h` adapts R04's validated variable-size
`courier::State` map to `World::configure`, maps R18 instance IDs and team
ownership onto the bounded **four-infantry** R02 diagnostic, and seeds R03's
native weapon engine from R18 entity IDs and HP, committing its damage events
back to the world. `test-rts-world-ports.cpp` covers these adapters and
rejects wrong owners, duplicate actors and incompatible map dimensions.

The shared `rts_live_match.h` coordinator and `native_rts_match.cpp` adapter
now exercise these ports together in a new opt-in **real VanillaTD WASM**
match. R04 parses the selected 16×10 or 24×14 map and seeds two R18 houses,
six native infantry (four authored plus two scripted additional actors) and
neutral resources. R02's controller has a bounded dynamic map/roster path,
cost-weighted A* and collision reservations; its waypoints drive real
`InfantryClass::AI`, with native positions committed via `observePosition`.
R03's persistent native weapon system consumes those same entity IDs and
commits shot/hit/damage/death into World-owned HP/lifecycle records. Native
v3 snapshots add optional validated R04 map metadata and R02 `commandStates`,
plus `shot`/`hit` events and `won`/`lost` phases. Existing R00 v1/R04 v2
consumers still require no migration, and v3 remains explicitly negotiated.

The older Courier, four-unit R02 diagnostic and R03 defeat drill remain
independent compatibility modes; none is silently reinterpreted as a new RTS
match. The new fixture is a six-infantry tactical battle, **not** a production,
harvesting or campaign system. R02/R03/R04 production acceptance requires
host + actual WASM/Chromium checks on this combined path. R06 funds and
harvesters belong to house/entity extensions, R07 structures use footprint
placement, R08 queues/tech go on house state, R09 exposes team-filtered
visibility rather than the current full-information fixture, and R14 adds
canonical save/replay hydration. R15 specifies a transport and synchronization
policy before network play. This is not a harvesting, power, production,
weapons-content or finished-art milestone.

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
