# R11 — Campaign missions, objectives, and progression

Implement **R11** for `https://github.com/chucklowery/World-Conquer` without prior conversational state. The published native browser alpha has one Courier Extraction mission and hard-coded supply/extraction win/loss logic; it is not a campaign. Map source lives in `game/content/missions/`, C++/WASM gameplay in `tiberiandawn/` and `browser/engine/`; `docs/browser/BUILD.md` describes builds. R03 combat, R04 authored map pipeline, R08 production and R09 visibility precede campaign scripting.

**Dependency gate:** R03, R04, R08 and R09 must be `completed` in `docs/rts-milestones/MANIFEST.md`, merged. Otherwise mark R11 blocked.

**Deliverable:** versioned mission/objective schema, triggers/events, reinforcement waves, scripted units/buildings, timed goals, victory and defeat conditions, briefings, mission selection, in-session transitions, and replay-safe mission state. Create a short original-content campaign (at least three distinct scenarios: extraction, establish base, destroy enemy command) and progression/unlock metadata. Mission scripts must call the same canonical gameplay commands/event stream, not a second JS game. Keep assets legally distributable and browser performance predictable.

**Acceptance:** players can select and complete three missions in sequence; each has a distinct goal and reliable restart; objectives visibly update in the HUD and persist across scenario transitions; negative/invalid script cases fail safely. Automated trigger/transition tests and end-to-end Chromium checks pass, including legacy Courier extraction. Document how a designer adds a fourth mission.

**Manifest protocol:** set **only R11** in `docs/rts-milestones/MANIFEST.md` to `in_progress` at start, `blocked` with reason if needed, and `completed` only after browser playthrough and CI pass. Add PR/commit/test/CI/observation evidence, preserve other milestone rows during rebase, run `node docs/rts-milestones/validate-roadmap.js` plus relevant workflow tests, and open scoped PR. Original/licensed content only.
