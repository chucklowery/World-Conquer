# Agent work packages for M1 and M2

This folder breaks roadmap milestones **M1** (stock engine in the browser) and
**M2** (minimum original data pack) into work packages that a coding agent,
for example ChatGPT/Codex, can complete one session at a time without any
earlier conversation.

| File | What it is |
| --- | --- |
| [`AGENT_GUIDE.md`](AGENT_GUIDE.md) | Shared context, hard rules, build/test commands, code map, PR and report format. **Include it in every session.** |
| [`M1-engine-in-browser.md`](M1-engine-in-browser.md) | M1 work packages M1-A … M1-F and the exit gate |
| [`M2-original-data-pack.md`](M2-original-data-pack.md) | M2 work packages M2-A … M2-G and the exit gate |

## Order of work

M1 and M2 depend on each other: CI cannot use EA data, so M1's browser
gates are proven with M2's original pack. Run the work packages in this
order. Packages in the same step can run in parallel sessions on separate
branches.

| Step | Work packages | Depends on | Unblocks |
| --- | --- | --- | --- |
| 1 | **M1-A** asset audit log and graceful failure | — | M2-A, M1-D |
| 2 | **M1-B** blocking-loop audit · **M1-C** pack loader · **M2-A** requirements inventory | M1-A (for M2-A's dynamic pass) | — |
| 3 | **M2-B** pack build pipeline | M2-A (format of `requirements.json`), M1-C (pack manifest format) | M2-C |
| 4 | **M2-C** boot pack (menu reachable) | M2-B | M1-D menu check |
| 5 | **M1-D** display, input and stock-engine smoke test (menu part) · **M1-E** metrics | M1-A, M1-B, M1-C, M2-C | — |
| 6 | **M2-D** theater/terrain/resource · **M2-E** unit and structure roster | M2-C | M2-F |
| 7 | **M2-F** scenario tool and `WCS01` | M2-D, M2-E | M1-D scenario part, M2-G |
| 8 | **M1-D** (scenario part) · **M2-G** missing-asset gate and end-to-end check | M2-F | **M1 and M2 exit gates** |
| any | **M1-F** owner-only licensed-data checklist (the agent writes it; the owner runs it) | M1-C | — |

Expect M2-C, M2-E and M2-F to take several sessions each. Split them by
sub-task, for example "M2-E structures" and "M2-E infantry", and keep each
PR reviewable.

## How to start a ChatGPT/Codex session

Give the agent repository access (Codex connected to
`chucklowery/World-Conquer`), then send:

```text
You are working in the GitHub repository chucklowery/World-Conquer, branch
`vanilla`. First read these files completely and follow them exactly:
  1. docs/milestones/AGENT_GUIDE.md
  2. docs/milestones/<M1-engine-in-browser.md | M2-original-data-pack.md>
  3. docs/ROADMAP.md and ADR-0003 in docs/browser/DECISIONS.md

Your task is work package <WP-ID> only. Confirm that its prerequisites
(see docs/milestones/README.md "Order of work") are merged on `vanilla`;
if not, stop and report it as blocked. Implement it on a new branch
m<N>/<wp-id>-<slug>, meet every acceptance criterion with real evidence,
open one PR against `vanilla`, and finish with the report format from
AGENT_GUIDE.md section 6. Never add EA/Westwood game data or trademarks.
Ask me before doing anything the guide lists under "Stop and ask".
```

For a long work package, follow up in the same session with:
"Continue <WP-ID>. Re-read the acceptance criteria and list which are
still unmet before writing more code."

## Reviewing an agent's PR (the owner's checklist)

1. The PR covers **one** work package, and the acceptance criteria are each
   shown with evidence (CI links, logs or screenshots), not just claimed.
2. No binary game data is committed; generated outputs live only in CI
   artifacts. Run `git diff --stat` and look for `.MIX`, `.SHP`, `.PAL`,
   `.CPS`, `.FNT` or `.BIN` files.
3. No changes to the frozen legacy demo files (`rts_world.h` and the others
   listed in AGENT_GUIDE.md rule 1) beyond keeping tests green.
4. Engine C++ changes are small and guarded, and the native build jobs are
   green.
5. On the final package of a milestone, the evidence line is added to
   `docs/ROADMAP.md`.
