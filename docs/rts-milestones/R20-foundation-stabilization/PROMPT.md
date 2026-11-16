# R20 — Foundation stabilization and R06/R09 readiness

Implement **R20** for `https://github.com/chucklowery/World-Conquer` on an
isolated branch based on the current `vanilla` integration branch. **This prompt
is self-contained; do not rely on previous chats.** The repository is a
browser-native VanillaTD-derived RTS. R00/R01/R02/R03/R04/R05/R18 have been
accepted individually, and R02/R03/R04 share a native dynamic six-infantry
R18 battle fixture. This is not yet an economy or a full RTS. Review
`docs/rts-milestones/MANIFEST.md`, `REVIEW-R00-R05.md`,
`R20-foundation-stabilization/READINESS.md`, `docs/browser/ARCHITECTURE.md`,
`browser/engine/README.md` and `.github/workflows/browser-engine.yml` first.

**Dependency gate:** R00, R01, R02, R03, R04, R05 and R18 must all be
`completed` and merged. Do not start R06 or R09 until **R20 is completed**.
R20 does not undo any historical acceptance or prematurely implement R06/R09.

**Deliverable:** audit requirements against native implementation, browser
behavior and automated evidence; resolve release-blocking bugs and cross-mode
integration gaps; establish a repeatable independent foundation regression
check and sanitizer test; verify command/selection/ownership/state parity,
multiple houses, dynamic identities, events, restart epochs, invalid inputs,
map-to-resource handoff, pathfinding congestion/budget and combat lifecycle.
Provide a documented native economy extension contract for resource identity,
finite quantities, house credits, harvester/refinery actors, ownership,
serialization and HUD events **without implementing the R06 economy itself**.
Track every discovered finding with owner, reproduction, severity, resolution
and regression test. Separate verification CI failures from artifact/release
publishing and require genuinely green, independently reportable checks.

**Required test pyramid:**

1. Host C++11/Node contract, content, validation and cross-version bridge
   tests on the same candidate revision. Run
   `bash scripts/check-rts-foundation.sh`; repeat with `RTS_SANITIZE=1` on
   supported CI runners (ASan/UBSan and leak checking). Include at least
   2,880 deterministic ticks spanning both native maps and 24 map epochs;
   extend to a representative multi-unit crowding/obstacle soak. Record
   performance baselines and explicit budgets, not just functional PASS.
2. Real compiled VanillaTD WebAssembly + Chromium acceptance on the candidate
   revision. Exercise integrated native RTS input, multi-select/camera command
   routing or document an explicitly approved R01 integration split; movement,
   order queues, LOS/combat/HP/death, ownership, HUD/snapshot parity, both maps,
   malformed asset rejection, win/loss/restart, and Courier regressions.
3. Stable platform verification on Linux, Windows, macOS and MinGW, with
   failures correctly attributed to build/test or release publishing.
   Include repeated runs to expose flakiness. Do not treat a previous green
   commit, local host tests alone, or a successful release upload as acceptance.

**Acceptance:** the `READINESS.md` traceability matrix has a verified evidence
link or an explicitly approved deferral for every R00–R05/R18 requirement;
no open P0/P1 foundation or CI-verification defects; all deterministic,
sanitizer, browser/WASM, and platform checks green on the final candidate SHA;
no unexplained flaky tests; reproducible native resource-map handoff and
an R06/R09 integration contract signed off by the maintainer. Record known
limits separately from bugs (e.g. R05 gallery art binds to the actual match in
R19, not R20). **Do not complete R20 on documentation or local checks alone.**

**Manifest protocol:** modify **only R20's status/evidence cell** during
implementation: `in_progress` at start, `blocked` with a specific reason if
needed, `completed` only after all acceptance evidence is verified. This
roadmap-introduction PR may add the R20 row and adjust downstream dependencies
and wave numbers while preserving all existing milestone acceptance records.
Maintain `READINESS.md` as the audit ledger. Run
`node docs/rts-milestones/validate-roadmap.js`, the foundation script, the
real browser workflow, and relevant platform workflows; capture PR, commit,
commands, CI URLs and gameplay observations. Use scoped PRs, preserve other
workers' status updates and do not add proprietary assets.
