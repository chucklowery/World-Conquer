# R18 — Dynamic RTS world, house and gameplay-definition registries

**Dependency gate:** R00 and R05 must both be marked `completed` in the
integration branch's [`MANIFEST.md`](../MANIFEST.md), and both must be
integrated. Otherwise mark R18 `blocked` with the concrete reason and do not
start implementation. R01 may run independently; R02, R03 and R04 must wait
for R18 so all three extend one native world and registry. Only R18's manifest
row belongs to this milestone; never change another milestone's status or
evidence.

## Required context before implementation

Read `docs/browser/ARCHITECTURE.md`,
`docs/browser/R05_ORIGINAL_FACTIONS.md`,
`docs/rts-milestones/REVIEW-R00-R05.md`,
`browser/engine/README.md`, and the current C++ host, Node and browser
acceptance tests. If a referenced review is absent, locate its integrated
replacement or document the gap; do not infer missing approval.

R00 v1 projects fixed Courier entities and an 18×11 grid.
R05 `r05.*` identifiers are **visual asset keys**, never gameplay-definition
or entity-instance IDs. Neither existing prototype makes harvesting,
production, weapons, power or full RTS drawing available.

## Native implementation

- Add a production-oriented C++11 world and definition registry behind the
  accepted R00 command/event/snapshot boundary, with dynamic houses and teams,
  faction/neutral identity, a configurable validated map, and separate immutable
  definition IDs, stable entity-instance IDs and visual keys.
- Make house-state and entity-state ownership canonical. Specify deterministic
  allocation, simultaneous spawn ordering, epochs, save/replay serialization,
  per-tick versus per-match identity and ID reuse policy. Support spawn,
  despawn, death and match restart without stale entity aliasing.
- Provide versioned content-definition schema validation for roles, factions,
  footprints and matching art keys; a small Aster/Forge catalog may reference
  R05 art without implementing gameplay that does not yet exist.
- Validate issuer, ownership, team membership, references, map dimensions and
  content fully before mutation. Reject invalid, stale or replayed commands,
  including sequences already executed. Define no-selection/dead/despawn
  snapshot semantics, creation/removal event order and deterministic ties.
- Version the snapshot boundary. Support explicit v1 migration or negotiated
  rejection with tests for `simulation-bridge.js` and existing consumers.
  Bound entity count, queued commands and retained events, document budgets.
- Reserve native extension seams for R02 movement/pathing, R03 combat, R04
  terrain, R06 economy, R07 structures, R08 tech, R09 team visibility and R14
  saves/replay. Do not create hidden authoritative JavaScript state.
- Retain the Courier compatibility adapter: its real production
  `InfantryClass::AI()` / `MapClass` movement remains authoritative. Do not
  rewrite historical VanillaTD modes or use proprietary game assets.

## Acceptance and completion protocol

Host C++ tests must cover dynamic two-house/neutral fixtures, map sizing,
deterministic mixed spawn/order/despawn/restart, IDs/epochs, isolated ownership,
no selection, malformed definitions, replayed/stale orders, and versioned
snapshots. Node tests must cover snapshot migration and C++ → JS event parity.
Run the compiled WebAssembly Courier mission under Chromium through
win/loss/restart, asserting live infantry movement against HUD snapshots.
Show Aster/Forge definition keys in a separate native-world fixture without
claiming gameplay economies. Keep existing R00/R05 tests and relevant
Linux/macOS/Windows/MinGW/browser CI green.

Document schema, ownership and lifecycle APIs and compatibility policy in
`docs/browser/ARCHITECTURE.md`. Use a clean branch from the latest integration
branch; run `node docs/rts-milestones/validate-roadmap.js` and workflow checks;
create a scoped PR with commit SHA, exact commands/results, CI links and
browser observations. Set only R18's row to `in_progress` when implementation
begins, `blocked` if gated, and `completed` **only** after all acceptance,
CI and integration gates are verified. Never report unrun checks as passed.
