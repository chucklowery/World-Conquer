# M1 stock-engine platform and asset audit

Date: 2026-11-22. Scope: original `main()` boot → menu, with the
scenario-time path reviewed only. See `docs/browser/M1_SESSION_LOG.md`.

## Phase 2: boot inventory

`game/content/pack/boot-requirements.json` contains 40 candidates from
static string literals in the early startup, UI and font paths. Literal
filename formats surveyed: MIX, PAL, SHP, CPS, FNT, ENG and INI. Entries
preserve their source `file:line` references. Unknown decoder requirements
remain **unverified**, rather than fabricated. Dynamic `Language_Name`
produces `CONQUER.ENG` (see `tiberiandawn/conquer.cpp`).

The empty `/game` browser run has **not** been executed. Its miss/fatal
sequence is still needed to validate the required/optional classification.
The `CCLOCAL.MIX` vs `LOCAL.MIX` choice depends on resolution; only one
is needed per mode, although the initial inventory lists both candidates.
After CI captures the empty-data result, this document and the JSON should
be reconciled with observed lookup order.

## Phase 3: potentially blocking loops

| Location | Loop / behavior | Known yield | Browser change / disposition |
| --- | --- | --- | --- |
| `tiberiandawn/init.cpp:280` | Startup wait for game focus | No | Added `emscripten_sleep(0)` under Emscripten |
| `tiberiandawn/menus.cpp:760` | Mouse state normalization | No | Added guarded `Call_Back()` |
| `tiberiandawn/menus.cpp:768` | Main menu processing | `Call_Back()` per iteration | Existing yield retained |
| `tiberiandawn/menus.cpp:422` | Alternate menu selection | Callback and frame limiter | Existing yield retained |
| `tiberiandawn/init.cpp:819` | `Select_Game` menu wrapper | Needs full-path review | No structural rewrite |
| `tiberiandawn/init.cpp:1232` etc. | Attract/movie waits | `Call_Back()` | Missing VQA now skipped in browser |
| `tiberiandawn/conquer.cpp:161` | Top-level `Select_Game` loop | Indirect via menu | Observe in stock CI |
| `tiberiandawn/conquer.cpp:265` | Main scenario loop | `Main_Loop` indirect | Reviewed, unexercised until M2 |
| `tiberiandawn/conquer.cpp:2974` | Focus-loss wait | Previously no guaranteed yield | Added guarded `Call_Back()` |
| `tiberiandawn/msgbox.cpp:268` | Message box modal loop | Needs full-path review | TODO: exercise in Phase 6 |
| `tiberiandawn/msgbox.cpp:434` | Timed message wait | `Call_Back()` | Existing yield retained |
| `tiberiandawn/goptions.cpp:201` | Options loop | `Call_Back()` | Existing yield retained |
| `tiberiandawn/loaddlg.cpp:279` | Save/load dialog | `Call_Back()` | Existing yield retained |
| `tiberiandawn/gamedlg.cpp:198` | Game dialogs | `Call_Back()` | Existing yield retained |
| `common/vqaloader.cpp:407,593,815` | VQA decoding | No proven per-iteration yield | Not restructured; browser skips absent optional movies |
| `common/vqatask.cpp:114` | VQA playback | No proven per-iteration yield | TODO: review on optional movie playback |
| `common/framelimit.cpp` | Frame limiter | Asyncify yield already present | No change |

The watchdog runs on `requestAnimationFrame`, reports gaps above 250ms as
`[browser-watchdog] stall=<ms>`, and stores the maximum in
`window.WCWatchdog.maxStallMs`. These are **not** proof of no stalls until
Chromium exercises the stock path and the maximum is asserted.

## Observability and strict gate

- `[asset-hit]` reports first hit per filename; `[asset-miss]` reports each
  miss in instrumented lookup paths.
- `[browser-game] fatal=<reason>` is emitted by guarded startup failures and
  parsed by `WCAssetAudit`.
- The original `main()` must reach `[browser-game] menu.enter` and render
  its own menu. Legacy tactical/diagnostic modes cannot satisfy the gate.
- `browser/engine/check-stock-engine.js` evaluates page errors, required
  asset misses, input response and the post-startup watchdog.

## Outstanding evidence

1. Empty-data failure and exact boot lookup order.
2. Native audit ON/OFF build verification and pin-matched WASM rebuild.
3. Decoder round-trip coverage against the real host C++ implementation.
4. Stock menu rendering, options/cancel dialogs and three-size input proof.
5. CI metrics, screenshots, and final `stock-engine` run URL.
