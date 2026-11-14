# R07 — Placeable buildings, construction, and power

Implement **R07** from a fresh branch of `https://github.com/chucklowery/World-Conquer`. Current native browser tactical alpha has an immersive right sidebar with a minimap above *non-buildable* structure preview cards; there is no base placement or power simulation. R00 establishes canonical entity/house/command/snapshot seams, R04 loads maps, R06 implements credits/harvesting. Inspect merged implementations, `browser/engine/tactical-hud.js`, `browser/engine/README.md`, `docs/browser/BUILD.md`, and the browser CI workflow. **No prior conversation is required.**

**Dependency gate:** R00, R04, **and R06** must be `completed` in `docs/rts-milestones/MANIFEST.md` and present on the branch; otherwise set blocked.

**Deliverable:** data-driven structures and footprints; terrain/occupancy/range validity; responsive preview/rotate/cancel/place interactions driven through native commands; resource deduction and refunds; timed construction; health/destruction and obstruction updates; ownership; and house-wide power generation/consumption affecting eligible buildings. Integrate actual build choices into the existing sidebar and show disabled states with reasons. Keep the existing left battlefield, minimap-above-build, and fullscreen layout.

**Acceptance:** earned credits can place a power plant and refinery/base structure on legal tiles; illegal, unaffordable, and overlapping placements have no side effects; construction completes over ticks, demolition updates pathing, power outages have defined effects; tests cover placement edge cases, refunds, power totals and HUD events; Chromium native-game regression includes visible base placement and restart.

**Manifest protocol:** edit only **R07** in `docs/rts-milestones/MANIFEST.md`, using `in_progress`, `blocked` with cause or `completed` with PR/SHA/test/browser/CI evidence. Complete only after full acceptance and green relevant workflows, not after UI placeholders. Preserve other rows when rebasing. Run `node docs/rts-milestones/validate-roadmap.js` and browser-engine checks; open scoped PR. Original/licensed art only.
