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
  on both original and rerun attempts. Another [two-job attempt](https://github.com/chucklowery/World-Conquer/actions/runs/43932594444)
  was also cancelled before execution. GitHub's check-run annotations say the
  jobs were not acquired by a hosted runner after retries and report macOS
  arm64 capacity constraints. Pull requests therefore run `release` game-build
  and `testing` presets serially on `macos-15-intel` (x86_64); `vanilla` pushes
  and explicit `workflow_dispatch` retain **all four** presets on Apple Silicon
  (`macos-15`, arm64). R20 completion still requires full-matrix arm64 evidence
  on the final candidate revision. Intel PR checks do not substitute for it.

## Active checkpoint after PR #30 (2026-11-18 UTC)

**Latest merged candidate:** `vanilla`
[`166f008`](https://github.com/chucklowery/World-Conquer/commit/166f008752581ac16775fa2b97aba796334f7cbf)
([PR #30](https://github.com/chucklowery/World-Conquer/pull/30)).
This supersedes the PR #28 checkpoint *for current-state decisions*. R20 is
still **IN PROGRESS / NOT READY**; R06 and R09 are still gated. Work proposed
after this checkpoint must rerun all applicable final-SHA checks.

| Gate | Verified on `166f008` | Still required |
| --- | --- | --- |
| FND-001 foundation and browser | [Regular + ASan/UBSan](https://github.com/chucklowery/World-Conquer/actions/runs/44397006654) both passed; [real Chromium/WASM browser](https://github.com/chucklowery/World-Conquer/actions/runs/44397007058) passed; [roadmap](https://github.com/chucklowery/World-Conquer/actions/runs/44397007197) passed | Repeat checks on the ultimate R20 candidate SHA, including real browser input/economy capability scope as claimed |
| FND-001 platforms/publishing | [Linux](https://github.com/chucklowery/World-Conquer/actions/runs/44397006627), [Windows](https://github.com/chucklowery/World-Conquer/actions/runs/44397007108) and [MinGW](https://github.com/chucklowery/World-Conquer/actions/runs/44397006722) matrix jobs and separate `publish-release` jobs passed | [macOS arm64](https://github.com/chucklowery/World-Conquer/actions/runs/44397007000) remains non-green: `release` and `internal` cancelled, `testing` and `nonet` queued when inspected. Do not treat pending/cancelled hosted-runner capacity as a build failure *or* successful arm64 verification |
| FND-004/005 | PR #30 merged native resource depletion and R18 economy accounts, harvester/refinery identities, adjacent harvest/return ports and strict opt-in v4 `economy` JS schema; local foundation suite passes | Maintainer approves schema/depletion/seed policy; confirm final CI and real-WASM v4 before claiming gameplay; R06 still owns remote routing and UI |
| FND-003 | Instrumented two-map 24-actor native stress at this source revision still repeats identical hashes with no overlaps or waiting at 480 ticks | Ridge Pass's three terminal failures now have **static routes but no dynamic route at failure time**: actors 16, 18 and 4. Actor 16's goal is occupied; the other two have dynamically blocked corridors with unoccupied goals. This is deterministic congestion/timeout classification, not an approved unreachable policy or full 24/24 arrival. Review timeout/replanning expectations and budgets |
| FND-006 | The existing browser runner passes 12 real-WASM restarts/map with 40+ sampled ticks each | New candidate instrumentation records per-map JSON allocated-WASM-memory and rAF cadence, with a fail-closed three-artifact same-SHA comparator. Gather at least three completed runs, approve measurable limits, and still verify sustained duration/true native-frame timing and leak behavior. No approved threshold is claimed |
| FND-009 | [Entry contract](../../browser/R20_ENTRY_CONTRACTS.md) includes a concrete reviewer decision table for native visibility, hidden-target rejection, filtered events and combined economy scope | Maintainer explicitly accepts or revises decisions; native visibility implementation and browser no-leak tests belong to R09, not this R20 checkpoint |
| FND-008 | [`vanilla` branch API](https://api.github.com/repos/chucklowery/World-Conquer/branches/vanilla) still reports `protected: false`; repository rulesets API reports none | Owner enables required foundation regular/sanitizer and browser checks and review, then verifies enforcement on a PR |

The FND-003 classification and FND-006 measurement capture above are
**working-branch tests**, not checks already attached to `166f008` or proof
of final-SHA acceptance. A future PR must provide its own green CI links.
Retain all eight exit boxes unchecked until the corresponding scope, budgets,
branch rules and maintainer reviews have actually been accepted.

## Post-merge exit-gate assessment (2026-11-16)

**Candidate:** `vanilla` merge `6faaf47640a5080f66fad34776e496a2df4f59b8`
([PR #24](https://github.com/chucklowery/World-Conquer/pull/24)),
following [PR #23](https://github.com/chucklowery/World-Conquer/pull/23).
This checkpoint is evidence collection, **not R20 sign-off**:

- [Foundation regular and ASan/UBSan CI](https://github.com/chucklowery/World-Conquer/actions/runs/43946652167)
  **PASS** on the merged candidate, with CI leak detection enabled.
  The host C++11/Node gate also passed locally on the identical source tree;
  its repeated 2,880-tick/24-epoch replay hash was
  `5397879782798822267`, host p95 96 microseconds (informational,
  **not** an accepted performance budget). The fixture still uses six
  active infantry, not a representative 16+ actor congestion scenario.
- Post-merge [Linux](https://github.com/chucklowery/World-Conquer/actions/runs/43946652294),
  [Windows](https://github.com/chucklowery/World-Conquer/actions/runs/43946652110)
  and [MinGW](https://github.com/chucklowery/World-Conquer/actions/runs/43946652271)
  **PASS**, including their independent `publish-release` jobs. The
  [`latest` development release](https://github.com/chucklowery/World-Conquer/releases/tag/latest)
  contained 36 artifacts at this checkpoint, including Linux/Windows/MinGW
  outputs. This confirms that the former HTTP 403 publishing fault has been
  fixed for these three workflows.
- [macOS arm64 post-merge workflow](https://github.com/chucklowery/World-Conquer/actions/runs/43946652380)
  remains **IN PROGRESS**: `release` passed, while `internal`, `testing`
  and `nonet` were queued at this checkpoint. The macOS publish job and
  complete Apple Silicon matrix still require verification.
- The [browser/WASM workflow](https://github.com/chucklowery/World-Conquer/actions/workflows/browser-engine.yml)
  was **not triggered** by this workflow-only merge because its
  `paths` filter excludes other workflow files. Dispatch it explicitly
  on the candidate `vanilla` revision, and repeat the integrated scenario
  for flake/resource measurements; prior-commit browser success is not
  final-SHA evidence.
- The [`vanilla` branch](https://github.com/chucklowery/World-Conquer/tree/vanilla)
  still reports `protected: false` via GitHub's branch API, and the
  repository rulesets API returns no rulesets. FND-008 is an owner-level
  repository-settings action, not a test/code fix.
- The maintainer reports that the released gameplay looks good. This is
  useful qualitative smoke-test feedback; the precise browser scenario,
  revision, multi-select input path and replay/soak coverage are not
  established by that observation.

**Readiness interpretation:** FND-001 is partly resolved with direct
post-merge evidence; FND-002 through FND-006 and FND-008 remain open.
R05 native gameplay art binding stays an approved milestone boundary for
R19, not a reason to begin that work in R20. In addition, FND-009 below
requires an R09 visibility/serialization entry contract before joint
R06/R09 maintainer sign-off.

## Current integrated checkpoint after PR #28 (2026-11-17 UTC)

**Current candidate:** `vanilla` merge
[`54bfa5c`](https://github.com/chucklowery/World-Conquer/commit/54bfa5c280f3c649dacfe208d04739fb75ec6094)
([PR #28](https://github.com/chucklowery/World-Conquer/pull/28)).
This supersedes the earlier **post-PR #24** snapshot above for current-state
decisions, but preserves its observations as historical evidence. R20 remains
**IN PROGRESS / NOT READY**; R06/R09 remain **planned**.

| Change / concern | Current evidence | Disposition for R20 |
| --- | --- | --- |
| [PR #25](https://github.com/chucklowery/World-Conquer/pull/25) audit | Foundation regular/sanitizer CI and Linux/Windows/MinGW release publishing separated and green on the earlier merged candidate; baseline evidence and R09 leakage finding recorded | Historical checkpoint, not final sign-off |
| FND-003, [PR #26](https://github.com/chucklowery/World-Conquer/pull/26) | 24 native actors, 480 ticks/map, deterministic repeat, collision and two-search/tick budget checks; Marsh Border 24/24 arrived; Ridge Pass 21/24 arrived, three explicitly unreachable under dense reciprocal targets. Also 24-epoch R04 resource-to-neutral-instance positional parity | **Partial:** classify the three unreachable outcomes, approve congestion expectations and measured budgets |
| FND-004/005/009, [entry contracts](../../browser/R20_ENTRY_CONTRACTS.md) | FND-004/005 now implement opt-in **host-level** v4 economy accounts and JS schema: R04→R18 seeded IDs, native depletion/credits/cargo, R18 harvester/refinery definitions, adjacent harvest/return admission, typed deltas, epoch reset and atomic rejection; C++/Node foundation fixtures added. R09 visibility remains proposed. No v4 gameplay adapter/real-WASM run or maintainer approval | **Partial, review pending:** verify scoped PR/CI on final SHA, agree native contract and remote R02 approach policy, approve v4 schema and R09 scope before R06/R09 |
| FND-006, [PR #27](https://github.com/chucklowery/World-Conquer/pull/27) | Browser CI exercises both native maps with 12 repeated WASM epochs per map and at least 960 sampled ticks; runtime enforces heap, epoch, command/history and owner invariants | **Partial:** calibrate budgets and obtain at least three comparable candidate runs; no claim of an approved 10-minute steady-state threshold |
| FND-002, [PR #28](https://github.com/chucklowery/World-Conquer/pull/28) | Integrated R01 camera, pan/zoom, drag/Shift multi-selection, local groups and native R18 per-actor commands; desktop/narrow R01 browser tests and two-map real Chromium/WASM path pass at PR head `a4a30d8` | **Implemented, review pending:** maintainer verifies live controls and approves the future harvester/return UI pattern; existing Courier path is retained |
| FND-001, final-SHA verification | [PR #28 browser workflow](https://github.com/chucklowery/World-Conquer/actions/runs/43997540753) completed successfully; PR check summary: 36 successes, four expected skipped publishing jobs. The [merged-head workflows](https://github.com/chucklowery/World-Conquer/commit/54bfa5c280f3c649dacfe208d04739fb75ec6094/checks) include native Apple Silicon presets and independent browser/foundation jobs | **Pending:** verify post-merge conclusions and release publishing, not merely PR checks |
| FND-007 | Gallery-only art is an explicit R19 boundary | Deferred to R19, as approved |
| FND-008 | `vanilla` still reports `protected: false` immediately after PR #28 merge; no required-branch-check enforcement has been demonstrated | **Open owner action:** configure required foundation regular/sanitizer and browser checks, branch protection and reviews; test enforcement with a PR |

### Outstanding approval and measurement work

1. **FND-004/005:** review the implemented native v4 economy account/command
   and JS parser ports described in the entry contract, verify final-SHA
   foundation/sanitizer CI, and approve the adjacent-only foundation admission
   versus R06 remote R02 route/approach design. Full R06 gameplay, browser
   harvesting, seeded refinery and real-WASM v4 publication are not present.
2. **FND-009:** approve viewer-scoped publication, visibility, hidden-target
   rejection and no-leak rules for R09, including cross-capability behavior
   with R06. The v3 full-information snapshot must not be sold as fog-safe.
3. **FND-003/006:** classify the three Ridge Pass unreachable outcomes,
   measure and ratify host/WASM p95, backlog and memory bounds over repeated
   candidate runs; include deterministic replay and malformed-input guards.
4. **FND-001/008:** review all six post-merge platform/foundation/browser
   conclusions on `54bfa5c`, including macOS arm64 and publishing; configure
   `vanilla` branch protection and verify enforced required checks.
5. **Maintainer:** visually confirm integrated R01 controls and sign off the
   R06/R09 interface and acceptance budgets. Only then re-evaluate every R20
   exit checkbox and the manifest status. No earlier milestone statuses change.

**Interpretation of the original tables below:** their evidence/finding
columns document why each issue was opened at the PR #25 checkpoint. Use this
current section for the post-PR #28 dispositions; do not read an older
`Open` or `six actors only` entry as denying later PR #26–#28 evidence.

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
| FND-001 | P1 | Existing Linux, Windows, macOS and MinGW **workflow conclusions** failed on release creation/upload; earlier Linux log HTTP 403 | Separate build/test status from deployment; make the independent foundation and browser checks green and reliably required. PR #24 resolved Linux/Windows/MinGW publication on `6faaf47`; verify remaining macOS matrix/publish and final-SHA browser run | Partially verified |
| FND-002 | P1 | Integrated RTS mode deliberately hides Courier-only R01 camera/order controls (`browser/engine/README.md`, `ARCHITECTURE.md`) | Implement or approve a specific integrated-input contract sufficient for R06 harvest/return/stop/multi-selection, with real WASM/Chromium proof | Open |
| FND-003 | P1 | R02 integrated acceptance uses six infantry; no representative 16+ moving-actor crowding soak in the current suite | Extend native fixture and automated collision, obstruction, path budget and determinism tests; publish measured results | Open |
| FND-004 | P1 | R04 resource records were map metadata/neutral records, not harvestable economic instances | Native seeded resource accounts now bind neutral R18 IDs and release occupancy on zero; no regrowth, host regression added. Requires maintainer contract approval and final-SHA CI | Implemented in host ports; review/CI open |
| FND-005 | P1 | R18's v3 snapshot has houses but no credits, and live fixture has no harvesters/refinery structures | Opt-in v4 native house credits/harvester cargo/refinery IDs, adjacent order validation, typed events and strict JS consumer added without changing v3. R06 routing/runtime and owner approval still open | Implemented in host ports; review/CI open |
| FND-006 | P1 | Host/Node tests pass, but current acceptance does not include sustained real WASM/Chromium soak and flake characterization | Repeat final-SHA browser scenario and platform verification; log deterministic hashes, input/event parity, browser errors and resource/perf budget | Open |
| FND-007 | P2 | R05 gallery assets are not rendered by native gameplay | Keep an explicit placeholder contract and R19 dependency; do not block R06 purely for finished visuals | Deferred |
| FND-008 | P1 | GitHub reports the `vanilla` branch as unprotected; passing checks are not automatically enforced before integration | Configure protected branch rules/required reviews and require foundation regular/sanitizer plus browser checks; confirm enforcement using a PR | Open |
| FND-009 | P1 | R20's acceptance requires an R06/**R09** integration contract, but the minimum entry contract below specifies only economy; current v3 fixture exposes both houses' actors and map data without visibility filtering | Approve per-house/team visibility, concealment, discovery/memory, selection/command rejection, native event filtering, map/HUD snapshot versioning and deterministic restart policy; add bridge and Chromium acceptance before R09 starts | Open |

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

## Minimum pre-R09 native contract to approve

This is a **design/sign-off gate**, not an implementation of fog:

1. Define native-owned visibility per observing house/team, including
   terrain discovery, current actor/structure visibility, remembered terrain
   and ally-sharing rules. Never derive visibility from the browser DOM.
2. Specify deterministic sight sources, blockers, update ticks and death,
   movement and restart invalidation. Keep public `World` identity separate
   from what an observing player is permitted to see.
3. Define viewer-scoped v3-compatible snapshots/events and authorization:
   hidden hostile identity, HP, orders and projectiles cannot leak through
   the HUD, minimap or event history; hidden target selection/commands must
   be rejected natively. Additive schema versions must be negotiated by
   `simulation-bridge.js`.
4. Establish map-size and 16-house performance budgets, deterministic
   serialization/replay, and two-house native/real Chromium test fixtures
   that switch visibility without changing underlying simulation state.

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
