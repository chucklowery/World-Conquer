# R20 native extension contracts — R06 economy and R09 visibility

**Status: proposed for maintainer review, not yet approved or implemented.**
This is a pre-R06/R09 interface freeze, not permission to begin either feature.
The accepted Courier v1, map v2 and world v3 snapshots must continue to work.
R20 readiness is recorded in
[`READINESS.md`](../rts-milestones/R20-foundation-stabilization/READINESS.md).

## Existing native invariants (verified)

- `rts::World` owns instance identity, house/team ownership, lifecycle,
  commands and events. IDs encode an epoch; stale-epoch commands are rejected.
  `orders::Controller` and the combat system feed the same native world.
- `LiveMatch::seed()` spawns one neutral `game.world.crystal` entity at each
  R04 map resource tile. Authored `map.resources` records retain finite
  positive seed amounts, but **do not yet identify their R18 instance IDs**.
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
4. This document proposes field names and invariants to review; production
   parsers must validate them on **both** C++ and JavaScript sides before
   any v4 runtime is enabled. No v4 implementation is claimed by this PR.

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
`r05.aster.refinery`, `r05.forge.refinery`). R06 must extend the
validated R18 gameplay catalog and JS schema together; R19 remains
responsible for finished native art rendering.

### R06 commands and events to reserve

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

## Performance and sign-off gates

- Existing hard caps remain 16 houses, 256 entities, 4,096 cells and
  256 retained events. R02 remains at two A* searches per tick and at
  most `2 * min(cells,512)` expanded cells. The new 24-actor test
  exercises 480 ticks on **each** authored map and repeats each scenario
  to verify stable state hashes and absence of overlapping live actors.
- Observed on the host during R20 development: 24 actors all arrive on
  Marsh Border; 21 of 24 arrive on Ridge Pass under densely packed
  reciprocal destinations, with three explicit unreachable responses
  requiring further classification. These are **not** full browser
  performance or collision acceptance results; record and review the
  target-packing policy before closing FND-003.
- **Proposed, not yet approved budgets:** a 24-actor Ubuntu CI host p95
  navigation tick under 5 ms and no growth in reachable actor backlog
  between repeated 480-tick runs; real Chromium/WASM p95 simulation frame
  under 50 ms and heap increase under 16 MiB after warmup during a
  10-minute repeated-map soak. Gather baseline distributions over at
  least three final-SHA runs before enforcing the timing/memory thresholds.
- The maintainer must approve the v4 schema, resource-depletion footprint
  rules, R06 seeded-refinery exception, R09 viewer authorization policy,
  congestion expectations and measured budgets. R20 cannot close until
  implementation-specific regression evidence and branch/CI enforcement
  meet its separate readiness checklist.
