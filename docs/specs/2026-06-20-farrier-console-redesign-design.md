# Farrier Console Redesign — Design

**Date:** 2026-06-20
**Status:** Approved (brainstorm), pending build
**Scope:** Reorganize the Farrier console (`viewConsole` + `runBar` + `topbar` for the Farrier) from a stack of full-width horizontal bands into a **persistent left rail (control) + phase-adaptive main stage (monitoring)**. Auto-start the per-phase timer. Make the projector ("big screen") a first-class, state-aware control with a one-click separate-window launch.

## Problem (evidence from the 2026-06-20 UX audit)

The console is "stiff, cluttered, blocked." Concretely:
- The **run bar** crams stepper + CTA + Hold + step-back + 5 timer presets + timer + Start into one row → wraps to ~105px at 1280px.
- The **timer** loads on phase change but must be **separately started**; the loaded-not-started state is mislabeled **"paused"** (implies it was running).
- **Rebuild** stacks 6+ full-width bands (run bar → runscript → needs-you → stat tiles → shape board → team table → amendments); amendments sink below the fold.
- The always-on **RUNSCRIPT** band is a wide wall of text above every phase.
- The **projector toggle** ("Open room view") is a small top-bar button despite being a primary, frequently-used control; it's a full-screen takeover of whichever screen presses it.

## Approved decisions

1. **Layout:** Left rail (control) + main stage (monitoring).
2. **Stage priority:** Monitoring-first ("watch the room"); run-of-show cues collapsible, not always-on.
3. **Timer:** Auto-start the pre-set per-phase default on phase advance; rail shows countdown + Pause; tap-the-time reveals presets/Reset; stopped state reads "ready."
4. **Projector:** Separate projector window — a one-click "Open big screen ↗" opens the room view in its own window (2nd Farrier socket); the rail carries a state-aware Big-screen zone; the Share present-picker folds into it. The old same-screen takeover toggle is kept as a single-screen fallback.

## Layout

`viewConsole()` returns a two-column flex: `.farrier-rail` (fixed ~270px, left) + `.farrier-stage` (flex, right). The Farrier **`topbar()` chrome is absorbed into the rail** (home, code, room-view, end-workshop). The room-view (projected) path of `topbar()` is unchanged (brand + "← Console" only).

### Left rail — three stacked zones (order top→bottom)

**1. Navigate**
- 🐎 Home (`data-testid=home`, `goHome`) + workshop **code** chip (`.codechip`).
- Vertical **run-of-show stepper** (`data-testid=stepper`) — the 5 phases (Lobby/Surface/Rebuild/Share/Closed) as `✓ done / ▶ cur / ○ todo`, each line showing its suggested length (from `PHASE_TIMER_MIN`).

**2. Act**
- The **one next-step CTA** (`primaryCTA()` → `data-testid=phase-<next>`, `.runcta`), disabled with its `reason`. Hold-the-room (`hold-room`/`unhold`) and **↩ step back** (`step-back`) stay attached, but stacked, not inline-crammed.
- The **timer**: a large `mm:ss` countdown (`#timerlive`) + state word (running/ready/paused-after-manual-pause). A single **Pause** (`timer-pause`) when running, **Start** (`timer-start`) only in the rare stopped-but-loaded case. **Tap the time** toggles a small popover exposing presets (`timer-6/10/20/30`), custom (`timer-custom`), and Reset (`timer-reset`). All existing timer testids preserved.

**3. 📽 Big screen** (its own zone)
- **Open big screen ↗** — `window.open(location.pathname + '?screen=room', 'hp-bigscreen', 'width=1280,height=800')`. The opened window reads `me` from localStorage, connects as a Farrier socket, and (because of the `?screen=room` param) boots straight into `ui.roomView=true`. Console window is untouched.
- **State line:** "On the big screen: <Lobby code | War-room | AP → ETL reveal | Gallery>" derived from `state.state` + `state.presentingPairId`.
- **Flip this screen instead** — the existing same-screen takeover (`toggle-room`), kept as a one-screen fallback.
- In **Share**, the present-picker (`present-pick`, `present-gallery`, Clear/Next) folds into this zone instead of a separate card.

### Main stage — monitoring-first, phase-adaptive

- **Header:** phase name + one-liner ("Surface · 2 teams mapping").
- **⚠ Needs you** (`needsYou()`): pinned at the top of the stage when non-empty (stuck teams + pending amendments). Each item opens the drill-down.
- **Teams panel:** the `teamtable` rows (`data-testid=team-row`), unchanged in data, restyled cleaner; click → `drillDown()` as a stage takeover ("← all teams"). The 4 **stat tiles** collapse into one compact summary line above the table (not 4 big paper cards).
- **›Run-of-show cues** (`runScript()`): collapsed by default (`ui.scriptOpen` defaults false now), a slim disclosure at the bottom of the stage.
- **Phase specifics:**
  - **Lobby:** `consoleLobby()` setup card is the stage (rail still shows code; remove the duplicate "Open room view (top-right)" copy → point at the rail's Big-screen zone).
  - **Rebuild:** amendments surface in **Needs you**; the full amendment-compare cards + `shapeBoard()` become **collapsible** sections below the teams panel.
  - **Share:** present-picker lives in the rail's Big-screen zone; `pulseBoard()` + shape board are stage sections.
  - **Closed:** `pulseBoard()` is the stage.
- **Drill-down** (`drillDown()`): unchanged content (mirror + roster surgery + whisper + chat), rendered as a stage takeover. Testids preserved (`brief-preview`, `whisper-input`, `whisper-send`, `approve-amend` when amendments shown there).

## Server changes (minimal)

- `phase:set` (server.js): after `loadTimer(...)`, **auto-start** for timed phases — if `PHASE_TIMER_MIN[w.state] > 0`, set `w.timer.endsAt = Date.now() + w.timer.remainingMs; w.timer.running = true`. Lobby/Closed (0 min) start nothing. Idempotent re-entry (step-back→forward) must not double-start: only auto-start when entering a phase whose timer isn't already running for that duration — simplest: always `loadTimer` then auto-start (re-entering re-arms the clock; acceptable and predictable).
- The stopped-but-loaded UI label "paused"/"clock loaded — Start when ready" → "ready." (`timerControls`/rail timer text.) The server `timer` model is unchanged.

## Projector window (`?screen=room`)

- On boot, if `me.role==='farrier'` and the URL has `?screen=room`, set `ui.roomView=true` before first render so the new window shows the projectable view immediately and follows state over its own WS.
- It is a normal 2nd Farrier socket (multi-Farrier already supported — presenter mode). No server change.
- The console's `present:set` broadcasts reach it (already do), so picking a pair updates the projector window live.

## Testid preservation (MUST keep — suites depend on these)

`home`, `codechip` (class), `stepper`, `phase-surface|rebuild|share|closed` (the CTA), `hold-room`, `unhold`, `step-back`, `timer` (wrap), `timer-6|10|20|30`, `timer-custom`, `timer-start`, `timer-pause`, `timer-reset`, `team-row`, `brief-preview`, `approve-amend`, `present-pick`, `present-gallery`, `whisper-input`, `whisper-send`, `toggle-room`, `end-workshop`.

## Test impact (deliberate)

- `e2e-playwright.js` asserts *"Surface pre-loads its default length (Start, not auto-run)"* by checking `timer-start` is present right after entering Surface. With auto-start the timer is **running** on entry → that line and the subsequent load→start→pause sequence must be **updated** to: assert `timer-pause` present on entry (running), then exercise load (`timer-10` stops+loads) → `timer-start` → `timer-pause`. This is an intended behavior change, not a regression.
- All other console-touching suites (e2e contract, qa-hostile, qa-presenter, qa-scale-ui, qa-batch2, qa-fixcheck) rely on the preserved testids / WS messages and should stay green; re-run the full set.

## Build constraints / non-goals

- **Single-file vanilla JS, no framework, no build step** (repo invariant). All changes in `public/index.html` + the one `server.js` timer edit.
- **No data-model or WS-protocol changes** beyond the timer auto-start (and the client-only `?screen=room` boot flag).
- Non-goals: redesigning the participant views, the room-view (projected) visuals, or the export pack; changing governance/teardown logic; mobile console layout overhaul (the console is a laptop surface — keep it usable but desktop-first).

## Verification

- Full suite: e2e 34 · UAT 65 (after the timer-assertion update) · hostile 76 · a11y 33 · editguard 30 · fixcheck 20 · presenter 18 · batch1/2 · redesigner 18 · scale-ui 5.
- Visual capture of the new console across all 5 phases at 1440×900 and 1280×800 (no wrap/overlap/blocking).
- Manual: open the projector window via "Open big screen ↗" and confirm it follows state + present-picker.
