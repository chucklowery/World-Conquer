# R10 — Full-match strategic opponent AI

Implement **R10** on a fresh branch of `https://github.com/chucklowery/World-Conquer`; the brief is independent of previous chat. The browser-native VanillaTD Courier Extraction alpha has moving hostile sentries, **not** a strategic base-building computer opponent. R00 provides tick/house/snapshot contracts, R02 unit orders, R03 combat, R06 economy, R08 production/tech and R09 fog. Inspect their merged implementations, `browser/engine/README.md`, `docs/browser/BUILD.md` and the browser CI workflow.

**Dependency gate:** R02, R03, R06, R08, and R09 must all be `completed` in `docs/rts-milestones/MANIFEST.md` and integrated. Mark R10 blocked if not.

**Deliverable:** deterministic, budget-limited RTS AI that scouts with imperfect information, chooses harvesting and rebuilding targets, manages credits/power/production, stages defenses, attacks with squads, retreats/recovers, and wins/loses under player-equivalent rules. Supply configurable difficulty via strategy/cadence/resources, not by secretly reading fogged enemies. Favor blackboard or explicit decision state over ad hoc scripting, seed randomness, and instrument intentions for debugging; use the same native command API as the player.

**Acceptance:** at least three headless full-match AI-vs-AI runs reach valid terminal states within a time budget; AI maintains an economy, builds a base, produces, scouts and fights without deadlocks; hidden-information test proves no enemy leak; scripted seed yields repeatable results. Chromium test starts a skirmish-like match and observes an AI economy/order, while existing alpha tests stay green.

**Manifest protocol:** edit **only R10** status/evidence in `docs/rts-milestones/MANIFEST.md`: `in_progress` on start; `blocked` with cause when necessary; `completed` only after accepted behavior, host and browser tests, relevant CI and PR review. Record commit, PR, test results and CI links; preserve concurrent rows. Run `node docs/rts-milestones/validate-roadmap.js` and the workflow checks; no copyrighted game assets.
