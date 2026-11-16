# R20 foundation audit and R06/R09 entry gate

**Status:** OPEN / NOT READY — initial audit 2026-11-16, based on `vanilla`
`21ae009db0f7e5f49a063394e82dd40301d19997`. This is a living evidence
ledger, not a claim that the prior milestones failed. Do not begin R06/R09
while R20 is `in_progress` or `blocked`.

## Verified baseline and scope

- Individual completion evidence is preserved in the [manifest](../MANIFEST.md).
- On the baseline commit, native C++11 host suites for contracts, world,
  world ports, pathfinding, weapons, map pipeline and integrated live match
  passed with `-Wall -Wextra -Werror`; targeted Node contract/HUD/camera,
  map/mission and R05/R18 content checks passed locally. This verifies only
  the exercised fixtures, not general stability.
- AddressSanitizer/UndefinedBehaviorSanitizer host runs of the same seven
  native suites passed with leak detection disabled locally because the
  executor's ptrace environment prevents LeakSanitizer initialization.
  Full leak detection remains a required CI acceptance result.
- The new `scripts/check-rts-foundation.sh` also runs the R20 native match
  stress fixture twice, verifying identical replay hashes over 2,880 ticks,
  24 alternating 16×10/24×14 map loads/epochs, ownership/isolation, bounded
  path searches and event snapshots. This is **not** yet a 16+ unit crowding
  test or a real WebAssembly soak. The host p95 tick duration is printed for
  comparison, not treated as a portable timing limit.
- [Browser CI on functional source `6219e03`](https://github.com/chucklowery/World-Conquer/actions/runs/43808653273)
  passed actual compiled WASM/Chromium. The baseline differs from that commit
  only in the manifest; rerun browser acceptance on the final R20 SHA.
- The [2026-11-16 Linux platform run](https://github.com/chucklowery/World-Conquer/actions/runs/43900753213)
  includes successful builds but fails its release job with HTTP 403
  (`Resource not accessible by integration`). Other platform runs contain
  failed release-upload steps. These are CI/publishing faults, **not evidence
  of a failed compile**. Triage all matrix steps before attributing failures.
- PR #23's macOS matrix was [cancelled without any steps](https://github.com/chucklowery/World-Conquer/actions/runs/43910624218)
  on both original and rerun attempts. To reduce scarce macOS runner demand,
  pull requests now run the `release` game-build and `testing` presets
  serially; `vanilla` pushes and explicit
  `workflow_dispatch` still run **all four** presets. R20 completion still
  requires full-matrix macOS evidence on the final candidate revision.

## Requirement traceability and decisions

Legend: **Verified** means the named narrow behavior has evidence, not that
the entire milestone is newly accepted; **open** means additional evidence or
implementation is required for R06/R09 readiness; **deferred** means a
documented later-milestone responsibility must remain explicit.

| Origin | Existing evidence | Foundation risk / next verification | Disposition |
| --- | --- | --- | --- |
| R00 native contract | `simulation_contract.h`, `simulation-bridge.js`, C++/Node tests | Same authoritative actor/house/command/event semantics after restart and replay in integrated v3; malformed/stale snapshots and unbounded consumer lag | Open |
| R01 camera/input | `test-rts-camera.js`, Courier Chromium CI | Full R01 camera/group/box selection is disabled in integrated RTS mode; exercise real native RTS SDL pointer/keyboard ownership and define harvester command UX | **Open P1** |
| R02 orders/pathfinding | `test-production-orders.cpp`, `test-rts-live-match.cpp` | Six actors and two maps do not prove production congestion, collision, unreachable replanning or performance under a representative enlarged roster | **Open P1** |
| R03 combat/damage | `test-rts-weapons.cpp`, integrated battle CI | Verify simultaneous combat, mixed weapon/armor classes, death/target cleanup and native-HUD event parity under long-running orders and restarts | Open |
| R04 maps/terrain | `test-map-pipeline.cpp`, `validate-maps.js`, two native maps in Chromium | Freeze resource-node ID/position/type contract and verify map reloading/rejection with simulated economic consumers; mutable quantities belong to R06 | **Open P1** |
| R05 original art | `test-r05.js`, browser gallery | Pack is gallery-only; runtime art/palette/animation/fog binding intentionally belongs to R19; no claim of playable native art | Deferred to R19 |
| R18 world/registry | `test-rts-world.cpp`, `test-rts-world-ports.cpp`, v3 bridge | Verify epoch/sequence/tombstone/queue/event bounds, 16-house/256-entity capacity assumptions, long-run snapshot stability and house economic extension slots | Open |

## Defects, integration risks, and release criteria

| ID | Severity | Finding and reproducible evidence | Required resolution / proof | State |
| --- | --- | --- | --- | --- |
| FND-001 | P1 | Existing Linux, Windows, macOS and MinGW **workflow conclusions** fail on release creation/upload; Linux log HTTP 403 at latest SHA | Separate build/test status from deployment; make the independent foundation and browser checks green and reliably required. Resolve publishing permissions/flow independently | Open |
| FND-002 | P1 | Integrated RTS mode deliberately hides Courier-only R01 camera/order controls (`browser/engine/README.md`, `ARCHITECTURE.md`) | Implement or approve a specific integrated-input contract sufficient for R06 harvest/return/stop/multi-selection, with real WASM/Chromium proof | Open |
| FND-003 | P1 | R02 integrated acceptance uses six infantry; no representative 16+ moving-actor crowding soak in the current suite | Extend native fixture and automated collision, obstruction, path budget and determinism tests; publish measured results | Open |
| FND-004 | P1 | R04 resource records are map metadata/neutral records, not harvestable economic instances | Define stable resource instance identity, terrain occupancy, depletion/regrowth ownership and validated map-to-R06 native ports before R06 implementation | Open |
| FND-005 | P1 | R18's v3 snapshot has houses but no credits, and live fixture has no harvesters/refinery structures | Agree on additive version/negotiation rules for per-house state, resource quantity/cargo, refinery/harvester IDs and authoritative economy events | Open |
| FND-006 | P1 | Host/Node tests pass, but current acceptance does not include sustained real WASM/Chromium soak and flake characterization | Repeat final-SHA browser scenario and platform verification; log deterministic hashes, input/event parity, browser errors and resource/perf budget | Open |
| FND-007 | P2 | R05 gallery assets are not rendered by native gameplay | Keep an explicit placeholder contract and R19 dependency; do not block R06 purely for finished visuals | Deferred |
| FND-008 | P1 | GitHub reports the `vanilla` branch as unprotected; passing checks are not automatically enforced before integration | Configure protected branch rules/required reviews and require foundation regular/sanitizer plus browser checks; confirm enforcement using a PR | Open |

## Minimum pre-R06 native contract to approve

This is an interface specification task, **not** an implementation of economy:

1. R04 resource nodes must have stable, validated identifiers and tile/footprint
   semantics. Decide how depletion and regrowth affect blocking and navigation.
2. R18 houses are canonical owners of future credit balances; units/structures
   use stable instance IDs and immutable gameplay definitions. Keep faction
   artwork keys separate from economic/gameplay definitions.
3. R02's command model must admit the future harvest/return/stop lifecycle
   without spoofing move orders; failed ownership/path/destination checks
   leave state unchanged. Document queued-order and death/restart behavior.
4. R00/v3 snapshots and events remain native-authored, versioned and
   validated. Specify exact additive schema keys, order acknowledgement,
   credits/cargo/resource delta events, stale-epoch handling and HUD binding.
5. R06 may seed one explicit refinery before R07, but that structure must
   have an R18 identity/footprint and a documented migration to R07's native
   placement/production rules; no browser-local balances or JS simulation.

## R20 exit checklist (all must be checked with links)

- [ ] Requirement-by-requirement R00–R05/R18 traceability reviewed; P0/P1
      defects resolved with regression tests or explicit approved deferrals
- [ ] Foundation host/Node checks and ASan/UBSan including CI leak detection
      pass on the candidate SHA; deterministic soak and congestion budget recorded
- [ ] Two-map live WASM/Chromium acceptance on the candidate SHA exercises
      integrated input, orders, combat, HUD/event parity, win/loss and restart
- [ ] Courier extraction and original R05 gallery regressions pass on that SHA
- [ ] Linux, Windows, macOS, MinGW build/test evidence is distinguishable from
      release-publishing and genuinely green (no hidden or unexplained failures)
- [ ] Repeated candidate runs show no unexplained flaky tests, crashes or
      memory growth; performance thresholds documented and met
- [ ] Pre-R06 resource/house/harvester/refinery/bridge contract reviewed
- [ ] Maintainer signs off R06/R09 entry; R20 `completed` with PR/commit/CI
      evidence in the manifest

**Decision:** STOP. R06 and R09 remain `planned`; the validator and manifest
dependency now prohibit starting them while R20 is unfinished.
