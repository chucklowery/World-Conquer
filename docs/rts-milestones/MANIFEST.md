# Full RTS milestone manifest

**Project:** World-Conquer / browser-native VanillaTD-derived RTS

**Status as of:** 2026-11-16
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
| R01 | [Camera, selection, and command UX](R01-camera-selection-input/PROMPT.md) | R00 | W1 | completed | [PR #12](https://github.com/chucklowery/World-Conquer/pull/12) approved and merged; commit `de8d41c` (merge `7432c87`). PASS `node docs/rts-milestones/validate-roadmap.js`, `node browser/engine/test-rts-camera.js` (3 viewport shapes), `node browser/engine/test-tactical-hud.js`, `node browser/engine/test-simulation-bridge.js`, `node browser/engine/test-package-alpha.js` and native R02 command-contract suite. [Browser Chromium CI](https://github.com/chucklowery/World-Conquer/actions/runs/43669268706), roadmap, Linux, macOS, Windows and MinGW all PASS. Browser verified single/box/shift/group selection, camera pan/zoom, native move orders, minimap navigation, Courier extraction/restart and R02 input isolation. |
| R02 | [Unit orders and pathfinding](R02-unit-orders-pathfinding/PROMPT.md) | R00, R18 | W2 | completed | PR #11 supplied the four-infantry baseline; host C++/Node and native WASM/Chromium acceptance passed at `1b95f16`, with [browser CI #111](https://github.com/chucklowery/World-Conquer/actions/runs/43665090552) verifying obstacle crossing, orders, HUD snapshots and Courier regression. **Final dynamic-world acceptance:** [PR #21](https://github.com/chucklowery/World-Conquer/pull/21) merged to `vanilla` as `6219e03` (tested head `91d57f7`, nine review threads addressed/resolved). PASS `g++ -std=c++11 -Wall -Wextra -Werror -Ibrowser/engine browser/engine/test-production-orders.cpp -o /tmp/r21-test-production-orders && /tmp/r21-test-production-orders`, same compile/run for `test-rts-live-match.cpp`, `node browser/engine/test-rts-live-bridge.js /tmp/r21-test-rts-live-match`, `node browser/engine/test-rts-world-bridge.js /tmp/r21-test-rts-world`, and `node docs/rts-milestones/validate-roadmap.js`. [Real WASM/Chromium CI](https://github.com/chucklowery/World-Conquer/actions/runs/43804172557) PASS: six native `InfantryClass::AI` actors across Aster/Forge, 16×10 and 24×14 movement/HUD parity, weighted path and 32-step cost-3 corridor, bounded orders/queue rejection, hostile ownership isolation, hold/guard, stationary attack and restart; narrow 480px canvas fits with actual SDL mouse selection and no Courier overlays. Final [roadmap](https://github.com/chucklowery/World-Conquer/actions/runs/43804172399), [Linux](https://github.com/chucklowery/World-Conquer/actions/runs/43804172397), [macOS](https://github.com/chucklowery/World-Conquer/actions/runs/43804172461), [Windows](https://github.com/chucklowery/World-Conquer/actions/runs/43804172401), [MinGW](https://github.com/chucklowery/World-Conquer/actions/runs/43804172467) all PASS. |
| R03 | [Combat, weapons, and damage](R03-combat-weapons/PROMPT.md) | R00, R18 | W2 | completed | [PR #13](https://github.com/chucklowery/World-Conquer/pull/13) merged as `dc71ea1` (tested `5fd56e4`); PASS C++ weapon/armor/LOS/projectile/cooldown/filtering/simultaneous death/replay, R01/R00 bridge and Courier parity; [original browser/defeat drill](https://github.com/chucklowery/World-Conquer/actions/runs/43684755526) and [Windows](https://github.com/chucklowery/World-Conquer/actions/runs/43684755662), [Linux](https://github.com/chucklowery/World-Conquer/actions/runs/43684755598), [macOS](https://github.com/chucklowery/World-Conquer/actions/runs/43684755524), [MinGW](https://github.com/chucklowery/World-Conquer/actions/runs/43684755535) PASS, including `r03-defeat.png` artifact. **Final R18 combat acceptance:** [PR #21](https://github.com/chucklowery/World-Conquer/pull/21) merged as `6219e03` (tested `91d57f7`; nine review threads resolved). PASS C++11 compile/run `browser/engine/test-rts-weapons.cpp`, `test-rts-live-match.cpp` and `test-rts-world-ports.cpp`, `node browser/engine/test-rts-live-bridge.js /tmp/r21-test-rts-live-match`, `node browser/engine/test-simulation-bridge.js`, and `node docs/rts-milestones/validate-roadmap.js`. [Actual WebAssembly/Chromium](https://github.com/chucklowery/World-Conquer/actions/runs/43804172557) PASS: mutual native movement-only allies prevent VanillaTD weapon competition while hostile R18 teams retain canonical target/HP/lifecycle; v3 `shot`/`hit`/`damage`/`death` events, win/loss/restart and Courier regression pass. Host tests cover stationary range/LOS rejection, attack focus only upon activation, stale moving target feedback, queued replacement/Stop cancellation, projectile persistence and JS order-state parity. Final [roadmap](https://github.com/chucklowery/World-Conquer/actions/runs/43804172399), [Linux](https://github.com/chucklowery/World-Conquer/actions/runs/43804172397), [macOS](https://github.com/chucklowery/World-Conquer/actions/runs/43804172461), [Windows](https://github.com/chucklowery/World-Conquer/actions/runs/43804172401), [MinGW](https://github.com/chucklowery/World-Conquer/actions/runs/43804172467) all PASS. |
| R04 | [Maps and terrain pipeline](R04-map-terrain-pipeline/PROMPT.md) | R00, R18 | W2 | completed | [PR #14](https://github.com/chucklowery/World-Conquer/pull/14), implementation `032e0b5` and R02 compatibility fix `dff7f74`; PASS native C++11 map/contract/Courier traversal/replay, browser map/HUD, [prior WASM/Chromium](https://github.com/chucklowery/World-Conquer/actions/runs/43689868217) at `a50a3b2`, prior [Linux](https://github.com/chucklowery/World-Conquer/actions/runs/43689868210), [macOS](https://github.com/chucklowery/World-Conquer/actions/runs/43689868211), [Windows](https://github.com/chucklowery/World-Conquer/actions/runs/43689868265), [MinGW](https://github.com/chucklowery/World-Conquer/actions/runs/43689868247), and [roadmap](https://github.com/chucklowery/World-Conquer/actions/runs/43689868258). **Final integrated map acceptance:** [PR #21](https://github.com/chucklowery/World-Conquer/pull/21) merged to `vanilla` as `6219e03` (tested `91d57f7`; review resolved). PASS C++11 compile/run `browser/engine/test-map-pipeline.cpp`, `test-world-plan.cpp`, `test-rts-live-match.cpp`, `node browser/engine/validate-maps.js`, `node browser/engine/test-mission-pack.js`, `node browser/engine/test-rts-live-bridge.js /tmp/r21-test-rts-live-match`, and `node docs/rts-milestones/validate-roadmap.js`. [Real WASM/Chromium](https://github.com/chucklowery/World-Conquer/actions/runs/43804172557) PASS: immutable SHA-pinned Ridge Pass (16×10) and Marsh Border (24×14), typed terrain/costs, neutral resource records, two native houses, spawn/base/victory metadata in v3 C++→JS snapshots, malformed map/catalog atomic rejection, true `MapClass`/`InfantryClass::AI` positions, responsive fit, restart and retained Courier compatibility. Final [roadmap](https://github.com/chucklowery/World-Conquer/actions/runs/43804172399), [Linux](https://github.com/chucklowery/World-Conquer/actions/runs/43804172397), [macOS](https://github.com/chucklowery/World-Conquer/actions/runs/43804172461), [Windows](https://github.com/chucklowery/World-Conquer/actions/runs/43804172401), [MinGW](https://github.com/chucklowery/World-Conquer/actions/runs/43804172467) all PASS. |
| R05 | [Original faction art and content](R05-original-art-content/PROMPT.md) | — | W0 | completed | [PR #10](https://github.com/chucklowery/World-Conquer/pull/10) merged into `feature/original-content-pipeline` as `2d67c7d` (art `7d903f3`); PASS `node docs/rts-milestones/validate-roadmap.js`, `node tools/content/test-{build,wireframes,representative-contracts,representative-animation,first-pass-art,cargo-plane-art,r05}.js`, browser HUD/package/mission JS and Courier C++ host tests. [Browser CI #105](https://github.com/chucklowery/World-Conquer/actions/runs/43651026651) PASS: native alpha startup, Chromium gallery (five states, eight facings, frame stepping, integrity rejection) and screenshot artifact; Linux, macOS, Windows and MinGW PASS. Visual: 24 CC0 SVGs, 552 frames, one atlas, 743,239 bytes. Owner accepted merged work in 2026-11-15 follow-up (no separate GitHub review submitted). R00 registry semantics unchanged; explicit future art-ID binding remains an integration task. |
| R06 | [Resource economy and harvesting](R06-economy-harvesting/PROMPT.md) | R00, R04, R20 | W4 | planned | Await R20 foundation-readiness acceptance. |
| R07 | [Building placement and power](R07-structures-power/PROMPT.md) | R00, R04, R06 | W5 | planned | — |
| R08 | [Production, queues, and tech tree](R08-production-tech/PROMPT.md) | R00, R06, R07 | W6 | planned | — |
| R09 | [Fog of war and radar](R09-fog-radar/PROMPT.md) | R00, R04, R20 | W4 | planned | Await R20 foundation-readiness acceptance. |
| R10 | [Strategic enemy AI](R10-strategic-ai/PROMPT.md) | R02, R03, R06, R08, R09 | W7 | planned | — |
| R11 | [Campaign and mission scripting](R11-campaign/PROMPT.md) | R03, R04, R08, R09 | W7 | planned | — |
| R12 | [Skirmish and match lifecycle](R12-skirmish/PROMPT.md) | R04, R08, R09, R10 | W8 | planned | — |
| R13 | [Audio, feedback, and accessibility](R13-audio-accessibility/PROMPT.md) | R01, R03, R05, R19 | W8 | planned | — |
| R14 | [Save/load and deterministic replay](R14-save-replay/PROMPT.md) | R00, R02, R03, R04, R06, R07, R08, R09 | W7 | planned | — |
| R15 | [Multiplayer synchronization](R15-multiplayer/PROMPT.md) | R12, R14 | W9 | planned | — |
| R16 | [Integration, balance, and performance](R16-integration-balance/PROMPT.md) | R10, R11, R12, R13, R14, R15, R19 | W10 | planned | — |
| R17 | [Release, deployment, and hardening](R17-release-hardening/PROMPT.md) | R16 | W11 | planned | — |
| R18 | [Dynamic RTS world and definition registry](R18-world-registries/PROMPT.md) | R00, R05 | W1 | completed | [PR #19](https://github.com/chucklowery/World-Conquer/pull/19) merged into `vanilla` as `a400187` (reviewed head `b834fea`; four review findings fixed and threads resolved). PASS C++11 `g++ -std=c++11 -Wall -Wextra -Werror -Ibrowser/engine browser/engine/test-rts-world.cpp -o build/browser-engine/test-rts-world && build/browser-engine/test-rts-world`, corresponding `test-rts-world-ports.cpp`, `node browser/engine/test-rts-world-bridge.js build/browser-engine/test-rts-world`, `node tools/content/test-r18.js`, `node docs/rts-milestones/validate-roadmap.js`, plus R00/R02/R03/R04 host, replay and legacy Node suites. Native v3 fixtures verify two houses and neutral actors, Aster/Forge gameplay IDs separate from `r05.*` visuals, variable maps, restart/epoch/replay, ownership, capacity, rejected attacks and bounded restart-event parity through JS. All six Actions PASS: [real WASM/Chromium #177](https://github.com/chucklowery/World-Conquer/actions/runs/43790183894), [roadmap](https://github.com/chucklowery/World-Conquer/actions/runs/43790183830), [Linux](https://github.com/chucklowery/World-Conquer/actions/runs/43790183911), [macOS](https://github.com/chucklowery/World-Conquer/actions/runs/43790184037), [Windows](https://github.com/chucklowery/World-Conquer/actions/runs/43790183903), [MinGW](https://github.com/chucklowery/World-Conquer/actions/runs/43790183847). Chromium verified real `InfantryClass::AI` movement matches its v1 HUD snapshot, blocked order isolation, two-crate extraction victory, armored-sentry defeat, and native restarts; [browser probe artifact](https://github.com/chucklowery/World-Conquer/actions/runs/43790183894#artifacts). R02/R03/R04 remain separately gated on their full dynamic-world gameplay integration. |
| R19 | [Native gameplay art and content binding](R19-runtime-art-integration/PROMPT.md) | R03, R04, R05, R07, R08, R09, R18 | W7 | planned | — |
| R20 | [Foundation stabilization and R06/R09 readiness](R20-foundation-stabilization/PROMPT.md) | R00, R01, R02, R03, R04, R05, R18 | W3 | in_progress | [Audit ledger](R20-foundation-stabilization/READINESS.md) updated after [PR #25](https://github.com/chucklowery/World-Conquer/pull/25) (foundation/release evidence), [PR #26](https://github.com/chucklowery/World-Conquer/pull/26) (24-actor congestion and proposed native entry contracts), [PR #27](https://github.com/chucklowery/World-Conquer/pull/27) (12 real-WASM epochs/map), and [PR #28](https://github.com/chucklowery/World-Conquer/pull/28) (integrated R01 input). [PR #28 browser/CI](https://github.com/chucklowery/World-Conquer/actions/runs/43997540753) passed on head `a4a30d8` (36 successes, four expected skipped jobs); merged `vanilla` at `54bfa5c`. FND-004/005 opt-in native v4 economy interfaces, resource/account identity and harvest/return validation are implemented in a separate R20 candidate; local `bash scripts/check-rts-foundation.sh` exercises C++/Node cross-version, map-parity, depletion, overflow and restart regressions. Final-SHA platform/browser conclusions, congestion classification, economy and visibility contract approval, performance budgets, branch protection and maintainer sign-off remain open. **No R20 readiness sign-off.** |

**R00/R05 review follow-ups:** [Review and traceability](REVIEW-R00-R05.md).
Their accepted status remains unchanged. R18 closes the fixed-Courier-world to
dynamic-gameplay seam; R19 closes the gallery-only R05 art to live native-match
seam. R20 independently audits the combined R00–R05/R18 foundation before
economy/fog begin. These are additional gates, not a retroactive claim that
earlier milestones failed.

## Parallel execution guide

These are **earliest waves**, not exclusive sprints. A task is ready only when
**all** `Must follow` rows are `completed` on the integration branch:

| Wave | Can execute in parallel | Required gate / caution |
| --- | --- | --- |
| W0 | **R00 + R05** (completed) | R00 contracts and R05 gallery/art pack are accepted foundations, not a full RTS. |
| W1 | **R01 + R18** | R18 generalizes authoritative identity, player/house and content definitions before gameplay subsystems proliferate; R01 can improve the Courier UI independently. |
| W2 | **R02 + R03 + R04** | Requires R18. Movement, combat and maps share its registry but keep scoped ownership. |
| W3 | **R20 foundation stabilization** | Mandatory system-level audit, integrated regression/soak and R06/R09 interface/CI sign-off. No economy or fog work until completed. |
| W4 | **R06 + R09** | Both additionally require completed R20; real economy and per-house visibility can proceed in parallel. |
| W5 | **R07** | Wait for R06; create actual structures/power from registry definitions. |
| W6 | **R08** | Wait for R07; introduce production, prerequisites and faction gameplay rosters. |
| W7 | **R10 + R11 + R14 + R19** | Different gates; R19 wires R05 art to real native gameplay after R08 and R09. |
| W8 | **R12 + R13** | R12 waits for strategic AI; R13 requires real-match R19 art/events for final audio/VFX/accessibility. |
| W9 | **R15** | Requires R12 and R14; explicit transport/hosting authorization may still be needed. |
| W10 | **R16** | Full integration, determinism, balance, performance and end-to-end gate. |
| W11 | **R17** | Release gate after R16 and all required checks. |

### Integration checkpoints and shared-file safety

1. **Contract and live-world checkpoint (R00 → R18):** R00 supplies the
   Courier-tested seam; R18 implements dynamic entity/house lifecycles,
   definition IDs, deterministic commands and versioned snapshot migration
   before general RTS subsystems depend on those identities.
2. **Foundation readiness (R20 → R06/R09):** independently audit R00–R05/R18,
   validate native integration, repeatable CI and agreed resource/economy
   extension contracts before another subsystem builds on top of them.
3. **Playable RTS loop (R06 → R07 → R08):** harvest → funds → place → power →
   produce → order → fight. These three milestones are deliberately sequential.
4. **Native content checkpoint (R05 + R08 + R09 → R19):** validated art keys,
   gameplay definitions, state transitions, fog filtering and actual renderer
   binding. Gallery screenshots alone do not satisfy real-game acceptance.
5. **Single-player game (R10 → R12; R11 in parallel):** opponent, match lifecycle,
   victory/defeat, and missions become coherent after the economy loop.
6. **Reproducible match (R14 → R15):** canonical state and determinism precede
   synchronized multiplayer. Browser network permissions and host setup may
   require an explicitly documented service/transport choice.
7. **Release (R16 → R17):** end-to-end tests, balance, accessibility, then stable
   deployment. Avoid treating a preview-only HUD as working construction.

**Parallel branch rule:** each implementation branch edits *only its own row*
in this file, rebases onto the latest integrated manifest, and preserves all
other statuses/evidence. Shared code touchpoints need explicit interface
coordination; a parallel wave alone does not prevent merge conflicts.

**Completion evidence format:** `PR #N; commit <sha>; tests <commands/results>;
CI <workflow/link>; browser <observed behavior>`. For a blocker, name the unmet
dependency or fault and a proposed resolution. Never mark `completed` on local
unit tests alone when the milestone requires a browser acceptance test.
