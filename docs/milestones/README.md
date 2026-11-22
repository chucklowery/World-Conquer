# Agent instructions for M1 and M2

This folder holds self-contained instructions that let a coding agent, for
example ChatGPT/Codex, complete roadmap milestones **M1** (stock engine in
the browser) and **M2** (minimum original data pack) without any earlier
conversation. Each milestone is designed as **one long session** on one
branch with one PR.

| File | What it is |
| --- | --- |
| [`AGENT_GUIDE.md`](AGENT_GUIDE.md) | Shared context, hard rules, build/test commands, code map, PR and report format. **Include it in every session.** |
| [`M1-engine-in-browser.md`](M1-engine-in-browser.md) | M1 as a single-session plan (Phases 0–9) and its exit gate |
| [`M2-original-data-pack.md`](M2-original-data-pack.md) | M2 as a single-session plan (Phases 0–9) and its exit gate |

## Order of work

| Step | Milestone | Status | Depends on |
| --- | --- | --- | --- |
| 1 | **M1**: stock engine reaches its menu on generated boot data | **Merged** ([PR #56](https://github.com/chucklowery/World-Conquer/pull/56)) | — |
| 2 | **M2**: original data pack; a match starts and plays | Next | M1 |

Each is a phased plan (Phases 0–9) with a session log, so an interrupted
session can resume. Run M2 as one session; don't split it into parallel
agents, because its phases build on each other's outputs.

## How to start the M2 session

Give the agent repository access (Codex connected to
`chucklowery/World-Conquer`), then send:

```text
You are working in the GitHub repository chucklowery/World-Conquer, branch
`vanilla`. Read docs/milestones/AGENT_GUIDE.md, then
docs/milestones/M2-original-data-pack.md, then docs/ROADMAP.md and ADR-0003
in docs/browser/DECISIONS.md, completely. Complete milestone M2 in this
session by working through Phases 0-9 in order, following the "Session
contract" exactly: one branch, a draft PR after Phase 1, a commit and push
after every phase, and docs/browser/M2_SESSION_LOG.md updated after every
phase. Do not stop between phases to ask me; use the stated defaults and
fallbacks. Stop only for the guide's "Stop and ask" cases or a STOP
condition in the M2 file. Placeholder art is the target; never add
EA/Westwood game data or trademarks. End with the AGENT_GUIDE.md section 6
report, listing every phase's status.
```

If the session is interrupted, resume with: "Continue M2. Read
docs/browser/M2_SESSION_LOG.md and the PR first, then carry on from the
first phase not marked done."

If the session is cut off repeatedly, ask it to finish the current phase,
push, and update the log before stopping; a later session resumes from the
log.

## Reviewing the agent's PR (the owner's checklist)

1. Every exit-gate item has evidence (CI links, logs, screenshots or
   metrics), not just a claim. Download the `stock-scenario` evidence and
   **look at the screenshots**: the map, sidebar and radar should be drawn
   by the engine, and placed or produced objects should be visible.
2. Check the test asserts what matters: `[browser-event]` lines for placed,
   produced, harvest-unload and credits, plus `[browser-input]` positions for
   clicks. A test that only checks "the frame changed" is not enough; that
   gap hid a real mouse bug in M1.
3. No binary game data is committed; generated outputs live only in CI
   artifacts. Run `git diff --stat` and look for `.MIX`, `.SHP`, `.PAL`,
   `.CPS`, `.FNT`, `.TEM` or `.BIN` files.
4. No changes to the frozen legacy demo files (`rts_world.h` and the others
   listed in AGENT_GUIDE.md rule 1) beyond keeping tests green.
5. Engine C++ changes are small, `#ifdef __EMSCRIPTEN__`-guarded, limited to
   the kinds the M2 file allows, and the native build jobs are green.
6. The evidence line is added to `docs/ROADMAP.md`, or it says "partial"
   with the furthest stage reached.
