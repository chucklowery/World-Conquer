# Full RTS milestone manifest

**Project:** World-Conquer / browser-native VanillaTD-derived RTS

**Status as of:** 2026-11-14
**Baseline:** browser-playable *Courier Extraction* tactical alpha with the
immersive, full-viewport HUD, selectable infantry, native engine movement,
combat/sentries, supplies, extraction, minimap, and building-option previews.
It is **not** a full RTS: no integrated harvesting economy, construction,
production, technology, strategic opponent, campaign, saves, or multiplayer.
See `browser/engine/README.md` and `docs/browser/BUILD.md` for exact behavior.

**Status contract:** `planned` = not accepted; `in_progress` = implementation
underway; `blocked` = dependency or technical obstacle documented;
`completed` = acceptance criteria met, tests and CI verified, change integrated.
All future milestones start `planned`, even when the alpha has partial
proof-of-concept code in that area. Only the owner of a milestone updates its
row; never overwrite another worker's status or evidence.

## Authoritative milestone register

| ID | Milestone / standalone prompt | Must follow | Parallel wave | Status | Evidence / blocker |
| --- | --- | --- | --- | --- | --- |
| R00 | [Simulation contracts and runtime bridge](R00-simulation-contracts/PROMPT.md) | — | W0 | completed | PR #9 merged; commit `c04d0b1` (merge `d1acc6f`); tests `node docs/rts-milestones/validate-roadmap.js`, host C++11 contract and Node snapshot/HUD suites passed; CI [browser-engine #97](https://github.com/chucklowery/World-Conquer/actions/runs/43650103498), Linux, macOS, Windows, MinGW all passed; browser Chromium verified native infantry/HUD parity, rejected blocked orders, extraction victory and restart. |
| R01 | [Camera, selection, and command UX](R01-camera-selection-input/PROMPT.md) | R00 | W1 | planned | — |
| R02 | [Unit orders and pathfinding](R02-unit-orders-pathfinding/PROMPT.md) | R00 | W1 | planned | — |
| R03 | [Combat, weapons, and damage](R03-combat-weapons/PROMPT.md) | R00 | W1 | planned | — |
| R04 | [Maps and terrain pipeline](R04-map-terrain-pipeline/PROMPT.md) | R00 | W1 | planned | — |
| R05 | [Original faction art and content](R05-original-art-content/PROMPT.md) | — | W0 | planned | — |
| R06 | [Resource economy and harvesting](R06-economy-harvesting/PROMPT.md) | R00, R04 | W2 | planned | — |
| R07 | [Building placement and power](R07-structures-power/PROMPT.md) | R00, R04, R06 | W3 | planned | — |
| R08 | [Production, queues, and tech tree](R08-production-tech/PROMPT.md) | R00, R06, R07 | W4 | planned | — |
| R09 | [Fog of war and radar](R09-fog-radar/PROMPT.md) | R00, R04 | W2 | planned | — |
| R10 | [Strategic enemy AI](R10-strategic-ai/PROMPT.md) | R02, R03, R06, R08, R09 | W5 | planned | — |
| R11 | [Campaign and mission scripting](R11-campaign/PROMPT.md) | R03, R04, R08, R09 | W5 | planned | — |
| R12 | [Skirmish and match lifecycle](R12-skirmish/PROMPT.md) | R04, R08, R09, R10 | W6 | planned | — |
| R13 | [Audio, feedback, and accessibility](R13-audio-accessibility/PROMPT.md) | R01, R03, R05 | W2–W5 | planned | — |
| R14 | [Save/load and deterministic replay](R14-save-replay/PROMPT.md) | R00, R02, R03, R04, R06, R07, R08, R09 | W5 | planned | — |
| R15 | [Multiplayer synchronization](R15-multiplayer/PROMPT.md) | R12, R14 | W7 | planned | — |
| R16 | [Integration, balance, and performance](R16-integration-balance/PROMPT.md) | R10, R11, R12, R13, R14, R15 | W8 | planned | — |
| R17 | [Release, deployment, and hardening](R17-release-hardening/PROMPT.md) | R16 | W9 | planned | — |

## Parallel execution guide

These are **earliest waves**, not exclusive sprints. A task is ready only when
**all** `Must follow` rows are `completed` on the integration branch:

| Wave | Can execute in parallel | Required gate / caution |
| --- | --- | --- |
| W0 | **R00 + R05** | Can start now, independently. Align art IDs with the eventual data contract during integration. |
| W1 | **R01 + R02 + R03 + R04** | After R00. Keep HUD/controller, movement, combat, and map modules isolated behind R00 contracts. |
| W2 | **R06 + R09**, with **R13** when its distinct R01/R03/R05 gates pass | R06/R09 after R04; R13 can run beside later simulation work. |
| W3 | **R07** alongside unfinished R09/R13 | R07 waits for R06. |
| W4 | **R08** alongside unfinished R09/R13 | R08 waits for R07. |
| W5 | **R10 + R11 + R14** (and R13, if unfinished) | Different dependency sets; all may overlap after their own gates. |
| W6 | **R12** alongside R11/R14/R13 if unfinished | R12 waits for R10 and gameplay foundations. |
| W7 | **R15** alongside final R11/R13 work if unfinished | Requires both R12 and R14. |
| W8 | **R16** | Full integration gate; not parallel with unfinished feature work. |
| W9 | **R17** | Release gate after integration and all required checks. |

### Integration checkpoints and shared-file safety

1. **Contract checkpoint (R00):** shared player/house, entity identity, commands,
   mission content, simulation tick, snapshot, and browser event boundaries.
2. **Playable RTS loop (R06 → R07 → R08):** harvest → funds → place → power →
   produce → order → fight. These three milestones are deliberately sequential.
3. **Single-player game (R10 → R12; R11 in parallel):** opponent, match lifecycle,
   victory/defeat, and missions become coherent after the economy loop.
4. **Reproducible match (R14 → R15):** canonical state and determinism precede
   synchronized multiplayer. Browser network permissions and host setup may
   require an explicitly documented service/transport choice.
5. **Release (R16 → R17):** end-to-end tests, balance, accessibility, then stable
   deployment. Avoid treating a preview-only HUD as working construction.

**Parallel branch rule:** each implementation branch edits *only its own row*
in this file, rebases onto the latest integrated manifest, and preserves all
other statuses/evidence. Shared code touchpoints need explicit interface
coordination; a parallel wave alone does not prevent merge conflicts.

**Completion evidence format:** `PR #N; commit <sha>; tests <commands/results>;
CI <workflow/link>; browser <observed behavior>`. For a blocker, name the unmet
dependency or fault and a proposed resolution. Never mark `completed` on local
unit tests alone when the milestone requires a browser acceptance test.
