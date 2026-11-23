# Agent instructions for M1 and M2

This folder holds self-contained instructions that let a coding agent, for
example ChatGPT/Codex, complete roadmap milestones **M1** (stock engine in
the browser) and **M2** (minimum original data pack) without any earlier
conversation. M1 was one session. M2 is three sessions, each about the size
of M1 (roughly 6–8 hours, one branch, one PR).

| File | What it is |
| --- | --- |
| [`AGENT_GUIDE.md`](AGENT_GUIDE.md) | Shared context, hard rules, build/test commands, code map, PR and report format. **Include it in every session.** |
| [`M1-engine-in-browser.md`](M1-engine-in-browser.md) | M1 as a single-session plan (Phases 0–9) and its exit gate |
| [`M2-original-data-pack.md`](M2-original-data-pack.md) | M2 as three sessions (M2a: Phases 0–3, M2b: 4–6, M2c: 7–9), with session gates and the exit gate |

## Order of work

| Step | Session | Phases | Status | Starts when |
| --- | --- | --- | --- | --- |
| 1 | **M1**: stock engine reaches its menu on generated boot data | 0–9 | **Merged** ([PR #56](https://github.com/chucklowery/World-Conquer/pull/56)) | — |
| 2 | **M2a**: scenario probe, pack pipeline, universal placeholders | 0–3 | Next | now |
| 3 | **M2b**: theater, roster frame contracts, scenario generator | 4–6 | — | M2a merged |
| 4 | **M2c**: playable match on original data (M2 exit gate) | 7–9 | — | M2b merged |

Run them strictly in order and **review and merge each PR before starting
the next session**. Each session's gate is in the Sessions table of the M2
file. The merge between sessions is the checkpoint for catching problems
(for example, rebuild locally and look at the screenshots) before later work
builds on them.

## How to start an M2 session

Give the agent repository access (Codex connected to
`chucklowery/World-Conquer`). Then send the prompt below, with `<S>`
replaced by `M2a`, `M2b` or `M2c`:

```text
You are working in the GitHub repository chucklowery/World-Conquer, branch
`vanilla`. Read docs/milestones/AGENT_GUIDE.md, then
docs/milestones/M2-original-data-pack.md, then docs/ROADMAP.md and ADR-0003
in docs/browser/DECISIONS.md, completely. If docs/browser/M2_SESSION_LOG.md
exists, read it too.

Your task is session <S> of milestone M2 only. Check its entry condition in
the "Sessions" table; if it is not met, stop and report it as blocked. Work
through that session's phases in order, following the "Session contract"
exactly: the branch and PR title from the table, a draft PR after the
session's first phase, a commit and push after every phase, and the shared
session log updated after every phase. Do not stop between phases to ask
me; use the stated defaults and fallbacks. Stop only for the guide's "Stop
and ask" cases or that session's STOP condition. Do not start the next
session's phases. Placeholder art is the target; never add EA/Westwood game
data or trademarks. Finish with the session's close-out (or, for M2c,
Phase 9) and the AGENT_GUIDE.md section 6 report.
```

If a session is interrupted, resume with: "Continue session <S> of M2.
Read docs/browser/M2_SESSION_LOG.md and the PR first, then carry on from the
first phase of <S> not marked done."

## Reviewing the agent's PR (the owner's checklist)

1. Every item of that session's gate (for M2c, the M2 exit gate) has
   evidence (CI links, logs, screenshots or metrics), not just a claim.
   Download the `stock-scenario` evidence and **look at the screenshots**: the map, sidebar and radar should be drawn
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
6. The session log has a handoff for the next session. For M2c, the
   evidence line is added to `docs/ROADMAP.md`, or it says "partial" with
   the furthest stage reached.
