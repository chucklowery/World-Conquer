# Agent work packages for M1 and M2

This folder holds self-contained instructions that let a coding agent, for
example ChatGPT/Codex, complete roadmap milestones **M1** (stock engine in
the browser, as one long session) and **M2** (minimum original data pack, as
separate work packages) without any earlier conversation.

| File | What it is |
| --- | --- |
| [`AGENT_GUIDE.md`](AGENT_GUIDE.md) | Shared context, hard rules, build/test commands, code map, PR and report format. **Include it in every session.** |
| [`M1-engine-in-browser.md`](M1-engine-in-browser.md) | M1 as a single-session plan (Phases 0–9) and its exit gate |
| [`M2-original-data-pack.md`](M2-original-data-pack.md) | M2 work packages M2-A … M2-G and the exit gate |

## Order of work

**M1 runs first, as one long session.** It is self-contained: it generates
its own placeholder boot data, so it doesn't depend on M2. Its file is a
phased plan (Phases 0–9) on one branch with one PR, and it keeps a session
log so an interrupted session can resume. After M1 is merged, M2 runs as
separate work packages:

| Step | Work packages | Depends on | Unblocks |
| --- | --- | --- | --- |
| 1 | **M1** (whole milestone, one session) | — | everything in M2 |
| 2 | **M2-A** requirements inventory | M1 | M2-B |
| 3 | **M2-B** pack build pipeline (absorbs M1's boot-pack generator) | M2-A | M2-C |
| 4 | **M2-C** boot pack with real art | M2-B | M2-D, M2-E |
| 5 | **M2-D** theater/terrain/resource · **M2-E** unit and structure roster | M2-C | M2-F |
| 6 | **M2-F** scenario tool and `WCS01` | M2-D, M2-E | M2-G |
| 7 | **M2-G** missing-asset gate and end-to-end check (also finishes the scenario part of M1's original gate) | M2-F | **M2 exit gate** |

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

For **M1**, use this prompt instead:

```text
You are working in the GitHub repository chucklowery/World-Conquer, branch
`vanilla`. Read docs/milestones/AGENT_GUIDE.md, then
docs/milestones/M1-engine-in-browser.md, then docs/ROADMAP.md and ADR-0003
in docs/browser/DECISIONS.md, completely. Complete milestone M1 in this
session by working through Phases 0-9 in order, following the "Session
contract" exactly: one branch, a draft PR after Phase 1, a commit and push
after every phase, and docs/browser/M1_SESSION_LOG.md updated after every
phase. Do not stop between phases to ask me; use the stated defaults and
fallbacks. Stop only for the guide's "Stop and ask" cases or a STOP
condition in the M1 file. Never add EA/Westwood game data or trademarks.
End with the AGENT_GUIDE.md section 6 report, listing every phase's status.
```

If the session is interrupted, resume with: "Continue M1. Read
docs/browser/M1_SESSION_LOG.md and the PR first, then carry on from the
first phase not marked done."

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
