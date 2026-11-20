# R20 sustained real-browser/WASM performance acceptance

**Status: implementation proposed for review. Real 10-minute GitHub-hosted
runs, approval of budgets, and final-SHA sign-off remain required.**

The regular browser workflow provides three distinct tiers:

- Pull requests: fast real-WASM smoke only; metrics status `smoke`.
- `vanilla` pushes: complete functional integration and 12 epochs per map,
  but without a 10-minute minimum; not eligible for sustained acceptance.
- Explicit **workflow_dispatch**: sustained acceptance. At least **300 seconds
  of advancing native simulation per map** (Ridge Pass and Marsh Border,
  600 seconds total), at least 12 restart epochs/map, and enforced budgets.

The sustained test issues a native move command every epoch, observes native
ticks advance rather than sleeping without simulation work, checks v3 entities,
command acknowledgement, epoch ID rollover, bounded history, map/resource
parity and real page errors, and samples native SDL tick duration, browser rAF
intervals, and allocated-WASM heap after each epoch. The existing full browser
scenario also covers combat, win/loss, native input, Courier and R05.
The 24-unit crowding path-budget/collision fixture remains a **separate native
host test**. This browser soak uses the live six-actor match and must not be
represented as a 24-unit browser stress test.

## Release-candidate evidence collection

1. Freeze the R20 candidate commit SHA. Use
   [Browser VanillaTD engine compile](https://github.com/chucklowery/World-Conquer/actions/workflows/browser-engine.yml)
   and manually dispatch the workflow on an immutable ref (or verify
   `r20-wasm-metrics.json.sha` is the identical 40-character SHA on every run).
   Trigger **three separate workflow runs**, not three attempts of one run ID.
   A PR smoke or ordinary push is not acceptable.
2. Verify each workflow finishes successfully. Download the
   `vanillatd-browser-probe` artifact's `r20-wasm-metrics.json`.
   Preserve run IDs, attempts, commit SHA, CI links, and unmodified JSON.
3. Run `node scripts/summarize-r20-metrics.js run1.json run2.json run3.json`.
   Schema 3 rejects missing or duplicate workflow run IDs, mixed revisions,
   incomplete runs, fewer than 300 elapsed seconds/map, fewer than the
   required advancing native ticks, malformed telemetry or browser errors.
4. Inspect all three runs and the summary. Record p95 native tick duration,
   rAF frame pacing, post-warmup allocated WASM heap spread, event/state
   checks, collision/path-budget host evidence, sanitizer leak results and
   platform CI links on the **same final candidate SHA**.
5. Maintainer approves or revises the numerical budgets, then verifies
   the workflow actually enforces them. If approved budgets differ, update
   workflow limits **before** re-running the three final-SHA measurements.

## Provisional enforced acceptance limits (manual dispatch only)

| Metric | Limit | Interpretation |
| --- | --- | --- |
| Native simulation tick p95 | at most 50,000 microseconds | C++ tick + bridge/HUD publication, excludes SDL drawing/compositor |
| Allocated WASM heap post-warmup spread | at most 16,777,216 bytes | Allocation proxy, **not** proof of leak-freedom |
| Real duration | at least 300 seconds/map | Minimum 600 seconds total, both maps |
| Restart epochs | at least 12/map | Fresh IDs and bounded command/event state |
| Page errors | zero | Includes errors outside the soak interval |
| Independent runs | three distinct GitHub run IDs | Exactly one SHA; retries do not count |

The heap bound compares the range of allocated heap sizes after the first
epoch; it cannot detect all live-object leaks. CI ASan/UBSan with leak
detection, event backlog validation, and repeated restarts remain independent
acceptance checks. rAF p95 is telemetry, not native tick latency.

**R20 FND-006 is not complete** until the actual three sustained runs pass
on the final SHA, maintainer-approved budgets are in force and the readiness
ledger links the successful evidence. Changing code after collection invalidates
the final-SHA run set.
