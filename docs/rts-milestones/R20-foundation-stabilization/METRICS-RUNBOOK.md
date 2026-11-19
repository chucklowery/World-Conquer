# R20 repeated browser/WASM measurement procedure

This is an evidence-collection procedure for FND-006, not a performance
budget or R20 sign-off. Use the **same full `vanilla` candidate SHA** for all
three runs. Record the candidate before dispatching: a moving branch ref is
not sufficient evidence that the resulting artifacts have the same source.

Ordinary pull-request browser CI uses the runtime driver's fast functional
scenario with `R20_WASM_SOAK_EPOCHS=0`. It is **not** FND-006 measurement
evidence and cannot replace a full R20 candidate-SHA acceptance run. Pushes
to `vanilla` and explicit `workflow_dispatch` runs still execute 12 epochs
per map. Before R20 approval, dispatch the full workflow on the exact
candidate commit (or an immutable ref to it) and verify the artifact SHA.

1. Open [Browser VanillaTD engine compile](https://github.com/chucklowery/World-Conquer/actions/workflows/browser-engine.yml)
   and dispatch it on the candidate branch **three separate times**. Wait for
   each run to finish. Manual dispatch uses 12 R20 WASM epochs per map.
   Do not count reruns of the same workflow run ID as independent, even when
   GitHub assigns a different attempt number.
2. Confirm that all three runs passed, including real Chromium acceptance,
   Courier/R05 regression checks, and evidence upload. Record the three run
   URLs, attempt numbers, commit SHAs and any unrelated platform failures.
3. Download each run's `vanillatd-browser-probe` artifact and extract its
   `r20-wasm-metrics.json` to **different** local filenames. Preserve the
   originals as linked CI artifacts. Do not merge, edit or synthesize samples.
4. Run `node scripts/summarize-r20-metrics.js run1.json run2.json run3.json`
   from the repository root. The comparator rejects incomplete scenarios,
   mismatched revisions, duplicate workflow attempts, missing maps, invalid
   heap or frame measurements, and absent native tick latency. Attach its
   JSON output with the source artifact URLs to the R20 readiness ledger.
5. Inspect the individual screenshots/logs as well as the aggregate ranges.
   Review failure/retry histories, sampled tick counts, elapsed time, native
   tick p95, rAF p95, and allocated-WASM-heap post-warmup spread **per map**.
   A passing comparator is measurement integrity, not a performance pass.

**Interpretation:** `nativeTickP95Us` measures the synchronous native
simulation/bridge/HUD publication path; it excludes drawing and scheduling.
`animationFrameIntervalP95Ms` reflects browser presentation cadence.
`postWarmupHeapDeltaBytes` measures the span of allocated WASM memory, not
live-object retention, and does not establish absence of leaks. The browser
scenario is a bounded multi-epoch soak, not yet a sustained ten-minute run.

**Acceptance remains blocked** until the maintainer approves numeric budgets,
the candidate meets those budgets across independent runs, sanitizer/leak
CI and all applicable platform/real-browser checks pass on the final SHA,
and the other R20 exit gates are explicitly reviewed. If the source changes,
restart the three-run set; do not combine artifacts from different commits.
