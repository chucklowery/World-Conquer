# R20 native extension contracts — R06 economy and R09 visibility

**Status: FND-004/005 native/JS host economy ports and opt-in real-WASM
publication are implemented; maintainer approval of the contract is pending.
R09 visibility remains proposed and unimplemented.** The explicit owner
decision checklist is [R20 issue #50](https://github.com/chucklowery/World-Conquer/issues/50).
FND-006 sustained-WASM measurement budgets were separately approved at
`5b14f9a`, but that does not approve economy or visibility semantics.
This is a pre-R06/R09 interface gate, not permission to begin either feature.
The accepted Courier v1, map v2 and world v3 snapshots must continue to work.
R20 readiness is recorded in
[`READINESS.md`](../rts-milestones/R20-foundation-stabilization/READINESS.md).

## Pre-FND-004/005 v3 invariants (preserved)

- `rts::World` owns instance identity, house/team ownership, lifecycle,
  commands and events. IDs encode an epoch; stale-epoch commands are rejected.
  `orders::Controller` and the combat system feed the same native world.
- `LiveMatch::seed()` spawns one neutral `game.world.crystal` entity at each
  R04 map resource tile. Authored `map.resources` records retain finite
  positive seed amounts, and the new native account maps them to R18 IDs;
  **v3 map metadata intentionally still does not expose those IDs**.
  The R20 foundation stress test checks the one-to-one positional handoff
  across both maps and 24 load/epoch cycles.
- Existing v3 `houses` contain `id`, `teamId` and `faction`, **not**
  balances. V3 `cargo` is always zero; its JS validator explicitly rejects
  nonzero cargo. There are no harvest/return commands or credit events.
- The existing v3 snapshot is full-information. No per-viewer redaction or
  fogged event history exists; presenting a fog overlay alone is not security
  or R09 acceptance.

## Compatibility and authority rule

1. Preserve v1/v2/v3 encodings for existing modes. Introduce **world v4**
   for native economy and/or visibility; use a negotiated capability array
   (`economy`, `visibility`) and refuse unknown capabilities. This reserves
   one compatible extension envelope for the independently scheduled R06
   and R09 implementations. Do **not** quietly send economy or fog data
   through the v3 consumer: `simulation-bridge.js` has hard-coded v3 shape
   checks, including `cargo === 0`.
2. The native producer remains sole authority for entity IDs, map state,
   house balances, order results, visibility and events. JavaScript may
   render and validate only. A v4 consumer must opt in explicitly; an
   unrecognized version or feature must fail closed rather than silently
   downgrade to a full-information v3 snapshot.
3. Epoch and tick monotonicity, bounded queues, command result ordering and
   deterministic event sequence are inherited from R00/R18. V4 rejects
   stale epochs/IDs and malformed nested data **atomically**. Replays,
   restarts and viewer switches may not retain unauthorized old history.
4. The native v4 economy producer and strict JS economy parser now exist in
   opt-in host ports. The `rts-live` runtime continues to publish **v3**;
   visibility capability is reserved but **rejected**, not implemented.
   An explicit R20 diagnostic export supplies a non-draining v4 snapshot to
   Chromium for strict schema validation on both maps after restart. This
   does **not** seed harvesters/refineries, exercise harvest commands, or
   enable v4 HUD/gameplay. Maintainer schema approval remains mandatory.

## FND-004/005 implemented entry interface (R20, not R06)

- `World::seedResource(entityId, amount)` is the one-time validated R04→R18
  handoff; `LiveMatch::seed()` binds each authored resource to its freshly
  spawned neutral crystal ID. The immutable R04 amount is never decremented.
  Active quantities belong to native `ResourceAccount`, with `1..100000`
  initial units and `0..maxAmount` remaining. Zero tombstones/despawns the
  entity, releases its native footprint, and keeps the old ID in the v4
  snapshot for epoch-local history. R06 baseline has **no regrowth**; any
  future regrowth gets a new R18 ID. Destroying a resource also zeroes its
  account and emits depletion events.
- House balances are native signed 32-bit nonnegative integers capped at
  `1,000,000,000`. Configuration validates starting balances; epoch restart
  restores the configured amounts, not the final earned amounts. An adjacent
  return transfers *all* carried units at a fixed 1 credit/unit with checked
  overflow. No spending, build price, or production rule is implemented here.
- `game.{aster,forge}.harvester` are 1×1 R18 vehicles with native cargo
  capacity **20**, job state `idle|harvesting|returning`, target IDs and
  admitted command sequence. `game.{aster,forge}.refinery` are 2×2 R18
  structures with the normal owner/team, HP, footprint and lifetime. These
  gameplay IDs bind to the matching real `r05.*` roster visuals, not to JS
  placeholders. No refinery or harvester is yet scenario-seeded in the live
  runtime; R06 may seed a refinery until R07 placement exists.
- `WorldAction::Harvest` and `ReturnCargo` use normal R18 queued tick/epoch,
  issuer/owner, actor, target and sequence admission. Only **adjacent**
  admitted targets may execute in this foundation port; wrong role, stale or
  dead ID, enemy actor/refinery, empty/full cargo, spoofed coordinates, or
  credit overflow fails without resource/cargo/balance mutation. R06 must
  provide R02 navigation to a free adjacent approach tile and revalidate on
  arrival; no remote target routing or timed pickup loop is claimed here.
  `World::commitHarvest()` and `commitReturnCargo()` are explicit, atomic
  native arrival/transfer ports. Stop, replacement, target loss and death
  cancel jobs; death/despawn forfeits native cargo, and restart clears it.
- V4 is emitted **only** through `viewEconomy()`/`publishEconomy()` (or a
  `LiveMatch::snapshot(..., true)` host opt-in), never through v3 `view()` or
  the current browser runtime. Its exact top-level capability list is
  `["economy"]`. Fields added to otherwise unchanged v3 JSON are
  `houses[].credits`, `resources[{entityId,remaining,maxAmount}]`,
  `harvesters[{entityId,cargo,capacity,resourceId,refineryId,jobState,sequence}]`
  and `events[].ownerId`; committed events add `resource_delta`, `cargo_delta`,
  `credits_delta`, `resource_depleted`, `harvest_state`. The event `entityId`
  is the changed instance, `sourceId` is its source/target, `ownerId` is its
  canonical R18 owner and signed `value` is the delta. Acknowledgement events
  precede native mutation events at the same sequence/tick; rejected commands
  have no delta. V3 publication filters economy-only events/result codes but
  preserves ordinary selection/death/despawn events; resource depletion also
  clears any selection pointing at that instance. V4 rejects stale/unknown
  event entity/source IDs and inactive harvesters carrying cargo. JS requires
  explicit `{capabilities:["economy"]}` and rejects
  unknown, combined or unapproved capabilities. V3 snapshots remain byte-shape
  compatible; v4 history resets on epoch or version switch.

**Host evidence:** `test-rts-economy.cpp`, `test-rts-economy-bridge.js`,
`test-rts-world.cpp`, `test-rts-live-match.cpp`, `tools/content/test-r18.js`
via `scripts/check-rts-foundation.sh`. These are implementation readiness
checks, not proof of R06 harvesting in real Chromium or sign-off of R20.

**Browser contract check:** `check-runtime.js` calls the explicit
`Browser_Live_World_Economy_Probe` export on both loaded maps, parses the
compiled native v4 payload through the negotiated JS bridge, and verifies
epoch, resource account identities/amounts and house balances. The probe
does not drain native events or change regular v3 publication; the test
reloads the page before further gameplay. The browser workflow must pass
on the candidate SHA before treating this as verified real-WASM evidence.

## R06: resource, cargo and credit ownership

| Concept | Proposed native field / identity | Validation and behavior |
| --- | --- | --- |
| Authored map source | `map.resources[{x,y,amount}]` (unchanged v2/v3) | Immutable input; map hash, amount bounds, terrain/footprint and duplicate-tile checks remain R04-owned |
| Active resource | `resources[{entityId,remaining,maxAmount}]` in v4 | `entityId` references exactly one live neutral R18 `Role::Resource` instance; `0 <= remaining <= maxAmount`, initial `maxAmount` equals authored seed; never use tile coordinates as a lifetime identity |
| Depletion | Native amount transition and `resource_depleted` event | At zero, despawn/tombstone the neutral instance and free its occupied tile only after native state commit; do not resurrect its ID |
| Regrowth | Explicitly out of R06 baseline | Any later regrowth must spawn a **new** R18 instance/ID and be deterministically ordered; no hidden JS refill timer |
| House funds | `houses[].credits` (nonnegative bounded integer) | Owner is the canonical R18 house, not the selected unit or browser; reject overflow and cross-house transfers atomically |
| Harvester | R18 `Role::Vehicle` entity with `cargo`, `capacity`, `resourceId`, `jobState` | Stable instance identity and normal HP/death; cargo stays native, bounded, and is cleared/forfeited by an explicit death/reset policy |
| Refinery | R18 `Role::Structure` entity and 2×2 footprint | R06 may script an initial refinery, never place a fake DOM structure; R07 later owns user placement/power without changing the stable identity rules |

Proposed gameplay definition IDs are `game.aster.harvester`,
`game.forge.harvester`, `game.aster.refinery` and
`game.forge.refinery`. They remain separate from existing R05 art keys
(`r05.aster.harvester`, `r05.forge.harvester`,
`r05.aster.refinery`, `r05.forge.refinery`). The R18 gameplay catalog
and JS schema now include those IDs together; R19 remains responsible
for finished native art rendering.

### R06 follow-on command and event requirements

- Native `Harvest(resourceId)`, `ReturnCargo(refineryId)` and `Stop`
  operate on the same R18 actor, issuer, epoch, tick and sequence ordering.
  Both target IDs must be live, type-correct and reachable with the accepted
  R02 navigation policy. Enemy issuance, stale IDs, full cargo, no capacity,
  no compatible refinery or blocked approaches yield typed rejections
  without partial balance/cargo/resource mutation.
- Distinct `resource_delta`, `cargo_delta`, `credits_delta` and
  `harvest_state` events expose **committed native changes** with actor,
  source/resource/refinery identity, owner, tick, sequence and signed
  bounded delta. Accepted command acknowledgement precedes mutation events.
  Queued orders do not activate early; Stop, actor death, target depletion
  and restart have explicit cancellation/cleanup events.
- The HUD obtains balances, cargo, job state and progress solely from the
  opt-in v4 snapshot/event bridge. It may not infer funds from Courier crate
  counters, replay stale events, or display credits from an unvalidated
  local timer.

**R06 minimum test contract:** two maps; two houses; neutral source amount
and ID parity; harvest to full cargo; return and credit once; concurrent
harvesters; depletion releases occupancy; failed ownership/path/target
validation is atomic; death and Stop cancel cleanly; restart clears resources,
cargo, credits and old IDs deterministically; native/JS event parity and
real WASM/Chromium interaction pass.

## R09: visibility and scoped publication

- Native state tracks `visibleNow` and `discovered` per observing house
  (or explicitly documented allied team-sharing). Each is a bounded map
  bitset indexed by R04 row-major cells. Sight radii, terrain blockers,
  sources and update order use deterministic native rules.
- Every v4 viewer-facing snapshot has a validated `viewerHouseId`.
  The native producer **filters** enemy identities, positions, HP, orders,
  projectiles, combat events and map/resource metadata that the viewer has
  not discovered. An optional remembered-terrain projection cannot expose
  current hidden occupants. Do not ship full raw map/actor state to a viewer
  and rely on CSS fog to conceal it.
- Omit undiscovered terrain/resource/structure details or replace with a
  documented unknown sentinel; prohibit stale minimap/selection/inspector
  leaks. A hidden enemy target is rejected by the same native command
  admission authority that checks ownership, not by the browser alone.
- Viewer-scoped event streams remain ordered and bounded even when hidden
  events leave sequence gaps. Clear retained JS history on viewer change,
  reload and epoch restart. Cross-house visibility and allied sharing must
  be tested both ways.
- When both `economy` and `visibility` capabilities are enabled, another
  house's hidden credits, resource discoveries, harvester cargo and refinery
  events receive the same filtering as units/structures.

**R09 minimum test contract:** two observers on each authored map; sight
movement and terrain blocking; exploration memory; hostile unit/structure,
resource and projectile reveal/conceal; valid/invalid attack selection;
no leaks in JSON, HUD, minimap or event history; restart/epoch/viewer switch;
native deterministic replay; actual browser/WASM acceptance.

### FND-009 decision proposal for maintainer review (not implemented)

This table freezes concrete *questions and proposed defaults* for the R09
entry review. No visibility capability is accepted by the existing v4 parser;
the choices below are neither implemented nor approved.

| Decision | Proposed rule to approve or amend | Required negative test |
| --- | --- | --- |
| Viewer authority | Require native `viewerHouseId` matching a live observing house. Compute sight per house at the end of each completed native tick, after movement/death and before event/snapshot publication. Allied houses share a union of current sight and discovered cells by canonical `teamId`; opposing teams never share. | Invalid/stale viewer, enemy team and restarted epochs cannot request unscoped v3 fallback. |
| Terrain memory | Row-major `visibleNow`/`discovered` bitsets are bounded to the authored map; unknown cells have an explicit unknown sentinel. Remember terrain only. Never remember enemy entity instances, HP, orders or live resource amounts after they leave current sight. | Reveal, conceal and restart leave no hidden identity or live state in retained terrain, minimap or DOM. |
| Sight evaluation | Native definitions specify integer radius and blocking terrain types. Use deterministic source-ID order and four-neighbor/rasterized line-of-sight decisions; remove a killed/moved source at the next completed visibility evaluation. | Equal input/replay creates identical bitsets and filtered payloads irrespective of observer query order. |
| Hostile entity projection | Publish a hostile unit/structure/projectile ID and state only while `visibleNow` permits it. Friendly/allied actors remain visible by owner rule. Omit hidden entities entirely rather than provide IDs with placeholder coordinates. | Hidden IDs/HP/order/owner and projectile paths cannot be found by parsing raw JSON, events, HUD or minimap. |
| Commands | Targeted hostile-ID commands and selection require native current visibility at admission and again on execution; previously seen IDs confer no authority. Ground attack-move to a valid tile is not an entity-target command. | Guessing a hidden stable ID, replaying a stale selection, or switching viewers never grants a target command. Rejection is atomic. |
| Events/history | Filter events at the native producer using visibility at the event tick, retaining canonical order with permissible sequence gaps. For friendly damage from an unseen attacker, project only the friendly delta and redact the unknown hostile source; if the envelope cannot express redaction, omit the source field by an explicitly versioned event type. | Event source/target IDs cannot reveal hidden enemies, including across epochs, viewer switches and 256-entry history rotation. |
| Economy + visibility | Negotiate only canonical `['visibility']` or `['economy','visibility']` in addition to existing `['economy']`; never degrade to v3. House credits and cargo are owner/allied-private, even if an enemy refinery is visible. Neutral resource amount is exposed only while currently visible; an undiscovered resource cannot be targeted for harvest. | Switch capabilities and viewers mid-session and verify no stale balance, resource amount, cargo, target or event survives in JS cache. |

**Sign-off needed:** confirm allied sharing (especially credits), which terrain
blocks sight, unit sight radii, unseen-attacker event encoding, terrain-memory
serialization and whether discovered-but-not-currently-visible resources may
be ordered to. R09 implementation must add independent native authorization,
strict viewer-scoped JS parsing and real two-house Chromium acceptance; this
table alone does not close FND-009.

## Performance and sign-off gates

- Existing hard caps remain 16 houses, 256 entities, 4,096 cells and
  256 retained events. R02 remains at two A* searches per tick and at
  most `2 * min(cells,512)` expanded cells. The new 24-actor test
  exercises 480 ticks on **each** authored map and repeats each scenario
  to verify stable state hashes and absence of overlapping live actors.
- Observed on the host during R20 development: 24 actors all arrive on
  Marsh Border; 21 of 24 arrive on Ridge Pass under densely packed
  reciprocal destinations, with three dynamic congestion terminals (one
  occupied goal and two occupancy-blocked corridors). The scheduler now
  reports `congested` command status instead of claiming a statically
  unreachable target; the public result remains the existing `blocked` code.
  A temporary-blockage regression verifies that replanning can recover before
  timeout. These are **not** three successful arrivals or full browser
  performance/collision acceptance; the maintainer must approve the bounded
  terminal policy or request further deadlock resolution before FND-003 closes.
  A follow-up opt-in-to-explicit-team native scheduler change now performs
  bounded deterministic idle-friendly scatter (up to four requests per
  obstructed order, depth-two chains). The Ridge Pass host regression records
  24/24 completed destinations and 19/24 final parking after allies yield.
  This is Westwood-style clearance, not preservation of completed parking
  orders, and still requires explicit maintainer and real-WASM approval.
- **Accepted FND-006 browser budget (2026-11-20):** native tick p95
  at most 50,000 µs and post-warmup allocated-WASM heap spread at most
  16 MiB. The [three independent real-browser runs](../rts-milestones/R20-foundation-stabilization/READINESS.md#accepted-fnd-006-sustained-wasm-evidence--2026-11-20)
  on candidate SHA `5b14f9a` each covered >=300 seconds per authored map,
  48 restart epochs/map and 1,920 advancing native ticks/map, with zero
  browser errors. This is not a live-object leak test, and later gameplay
  changes require new final-SHA verification.
- **Still proposed for FND-003 host navigation:** 24-actor Ubuntu CI
  p95 navigation tick below 5 ms and no unexplained growth in the
  reachable-actor backlog. These are distinct from the accepted FND-006
  browser budgets and require trace review and maintainer approval.
- The maintainer must approve the v4 schema, resource-depletion footprint
  rules, R06 seeded-refinery exception, R09 viewer authorization policy,
  congestion expectations and measured budgets. R20 cannot close until
  implementation-specific regression evidence and branch/CI enforcement
  meet its separate readiness checklist.
