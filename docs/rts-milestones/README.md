# World-Conquer RTS execution roadmap

This directory is a set of **independently executable milestone briefs**, not a
claim that the full RTS already exists. Start with [MANIFEST.md](MANIFEST.md).
Each `Rxx-*/PROMPT.md` can be pasted into a fresh coding-agent context without
the conversation that produced this roadmap.

## Repository and present baseline

- Repository: `https://github.com/chucklowery/World-Conquer`
- Published tactical-alpha URL: `https://chucklowery.github.io/World-Conquer/`
- Reference branch at roadmap creation: `feature/original-content-pipeline`.
- Native browser implementation: VanillaTD C++ compiled to SDL2/WebAssembly;
  launcher and full-viewport HUD in `browser/engine/`; source mission data in
  `game/content/missions/`; project-owned sprite/content pipeline in
  `game/content/` and `tools/content/`.
- The current **Courier Extraction tactical alpha** has selectable infantry,
  engine-driven movement, tactical combat, enemy sentries, supply retrieval,
  extraction win/loss, restart, a minimap, and a sidebar. Building cards in the
  HUD are **previews only**. This is not yet a resource/build/production RTS.
- Important reading: `browser/engine/README.md`, `docs/browser/ARCHITECTURE.md`,
  `docs/browser/BUILD.md`, `docs/browser/ROADMAP.md`, and the two browser
  GitHub Actions workflows.

## Execute a milestone in a fresh context

1. Create a branch/worktree from the latest integrated target branch. Open a
   **single** milestone's `PROMPT.md`; it contains project background, scope,
   dependency gate, implementation boundaries, tests, and completion protocol.
2. Check its prerequisite IDs in [MANIFEST.md](MANIFEST.md). Do not implement
   against a missing dependency; mark the milestone blocked and describe the
   missing interface. `R00` and `R05` can start immediately.
3. Change that milestone's manifest row from `planned` to `in_progress` in your
   branch. Implement with regression tests and a verifiable browser outcome.
4. Mark the **same row** `completed` only after its acceptance criteria and
   relevant workflows pass. Record the evidence (commit/PR, test results, and
   playable observation) in the row's evidence cell. Otherwise leave
   `in_progress` or set `blocked`, with the reason. Never mark another row done.
5. Open a PR or follow the repository's established review process. Rebase or
   merge the latest manifest before integration; preserve every other team's
   row and evidence. Do not force-push shared branches or assume two PRs editing
   the manifest can be merged without resolving conflicts.

## Parallelism, contracts, and reality checks

- The manifest's dependencies are hard gates. Its *parallel waves* are an
  illustration of overlapping work, **not** an instruction to start all items
  before their prerequisites exist. Re-evaluate readiness after each merge.
- Give parallel workers separate branches/worktrees. Keep new source within
  well-named modules and agreed interfaces. The browser launcher, HUD, engine
  entry points, mission manifest, workflows, and this manifest are shared
  integration points: coordinate or sequence modifications to them.
- Each brief asks its implementer to inspect the live code, create tests for
  the new behavior, and run the existing relevant checks. Never satisfy a
  milestone by implementing a parallel mock simulation while leaving the
  native browser game disconnected.
- Do not commit copyrighted/proprietary historical game assets. Use original,
  openly licensed, attributable resources under the existing content policy.
- `R15` describes a multiplayer implementation target; it is not a blocker to
  iterating on single-player gameplay, but it **is** a gate to declaring this
  roadmap's full-featured release complete.

Validate manifest/brief consistency locally with:

```sh
node docs/rts-milestones/validate-roadmap.js
```
