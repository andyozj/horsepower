# Journey overhaul — adjudicated build plan (2026-06-12)

> **STATUS: ALL 6 SLICES SHIPPED & VERIFIED (2026-06-12 night)** — 64 browser-UAT +
> 34 contract checks green; edge camera (`qa-journey-edges.js`, 17 shots) verifies
> reclaim, catch-up card, TIME moment, phone canvas, share choreography.
> Two adjudicated deviations from the specs:
> 1. kept/MYTH lives in ONE client function `judgeLedger()` (share + race card +
>    export all call it) instead of a server `buildLedger` — same rules (survived-lock
>    OR accountable/served capacity OR confirmed-assumption, demoted by busted),
>    zero async refactor. Move server-side later if /api/diff consumers appear.
> 2. Offline dump→map does NOT auto-park lines as orphans (would spam the gate's
>    zero-orphan check from ordinary long chat); it shows an honest toast — the
>    text is never lost (it's in the thread).
> Dump→map's LIVE path (real AI proposals) is implemented but validated only
> structurally — no API key was available; first live-key session should exercise it.

Source: 3-lane Opus design panel (participant / facilitator / methodology) + Phase-0
edge-state evidence (`qa-edges/`, 15 shots: ghost member, late joiner, phone canvas,
timer expiry, share two-jobs). All designs respect the locked methodology (pre-reveal
vocabulary, Farrier-only phases, offline degradation) and the existing test contracts.

## Adjudication decisions (where lanes overlapped)
- **Timer expiry**: server-authoritative — one `timer.expired=true` flag + single
  broadcast on the existing heartbeat (~8 lines). All three surfaces consume it.
  Participant/projector treatment: settle to static red, never infinite pulse.
- **Ghost members**: BOTH ends — `member:reclaim` at join ("is this you?" picker of
  offline members; extend `team:join` with `reclaimMemberId`) prevents ghosts;
  console `member:remove` (clone of `member:reseat`'s gates) cleans up strays.
- **Idle states feed the methodology**: the Surface "polish pass" prompts route into
  WHY-deepening once the inspector exists ("flip your weakest card — write its why").
- **Proposals are device-local** (dump→map): never broadcast until accepted;
  accepted blocks ride the normal `canvas:update`. Human touch wins.
- **Vocabulary checks passed** on all team-facing copy ("the room catches up", never
  "waiting for the swap").

## Build slices (in order)

### Slice 1 — THE SPINE: block inspector (WHY + capacity) ✅ highest leverage
- Floating inspector card when a non-locked block is selected (rendered in `draw()`
  beside the `challengebtn` branch, world coords `b.x, b.y+b.h+6`).
- Fields by type: persona → capacity segmented (operates/accountable/served/informed)
  + why; phase → why; intent → "what decision does this drive?"; moment/trigger/
  input/outcome/agent → optional why. Writes `b.meta.why`/`b.meta.capacity` →
  existing `commit()`/`canvas:update` (server already reads them — verified).
- `editingLock` guard: extend focusin/focusout matcher to `.inspector textarea`.
- Server `governance()`: persona missing why/capacity → thin; phase missing why →
  thin; new gate check `key:'why'` (personas have why+capacity, phases have why).
  Amber-only — never a hard stop.
- Coach: SYSTEMS.surface gets "hunt the missing WHY" priority; client
  `buildCoachContext` adds `WHY-GAPS: …` line; +3 question-bank lines (offline).
- New testids: `inspector`, `inspector-capacity`, `inspector-why`.

### Slice 2 — PHONE USABILITY (exclusion-level; evidence qa-edges/06-09)
- `@media (max-width:760px)`: `.toolbar` → fixed bottom bar, single row,
  `overflow-x:auto`, `.tool` 48px targets, labels hidden at narrowest.
- `.handle`/`.bendhandle` → 18px on touch; `.viewctl` buttons 40px.
- Trays (`.orphantray`, `.landtray`) → `<details>` collapsed pills above the palette
  on phones (reuse `.assumefloat` pattern); `.assumefloat` joins the same pill row.
- Collapsed coach button clears the bottom palette (`bottom:72px` mobile).
- Hint copy mobile-shortened ("Tap where it goes").

### Slice 3 — SHARE CHOREOGRAPHY (the payoff moment)
- Section-level staggered reveal in `viewShare()`: before/after → diff → ledger →
  RECKONING STAGE → race card → exports (reduced-motion: all at once).
- Reckoning promoted: own stage card (blue wash family), header "Your turn — was it
  true?", sub explains confirm/bust; big ✓/✗ buttons; collapses to "N confirmed ·
  M busted"; read-only live view for non-source members; one-time toast to source
  team "Your moment — confirm or bust their guesses."
- "Now presenting" banner pinned atop share when `presentingPairId` set:
  "Now on the big screen: X → Y"; self-version "That's you up".
- Console presenting controls: `.nowpresenting` strip (renderMini thumbnail,
  "Clear projector" → `present:set null` [already supported], "Next pair ›"),
  presented pairs ✓-dimmed via client `ui.presented` set.

### Slice 4 — IDLE STATES (three dead zones)
- Lobby (saddled): live readiness line ("Waiting on N more…"); warm-up scratchpad
  textarea → seeds `canvas.orphans` via existing update path.
- Surface (gate green): "Saddle-ready — polish while the room catches up" strip in
  the gatebar; 3 tappable Coach prompts (weakest WHY / newcomer trap / parked items).
- Rebuild (all landed): landpill → "Build complete — ready for the share-out"
  rosette; assumefloat hint swap + one-time Coach nudge (post-reveal vocabulary OK).

### Slice 5 — TIME + RECOVERY + FACILITATION
- Server: heartbeat sets `timer.expired` + broadcasts once; cleared on timer ops.
- Member: one-time toast "Time's up on the clock — the Farrier calls the next move.
  Finish your thought; nothing's locked." + `.timer.elapsed` (static red, no pulse).
- Room view: throne flips to letterpress "TIME" + subline "Pencils down soon — wrap
  up your current thought." + phase caption under the timer (audit fix).
- Console: 0:00 chip + runcta pulse + hint "Time's up — advance when ready, or load
  more time." NEVER auto-advance.
- Recovery: `member:remove` (new, Farrier, pre-swap) + drill roster rows with ✕ and
  "Move to…" (uses existing `member:reseat`); `team:switch` (new, member self,
  pre-swap) behind a topbar "Switch stable" subtle button; `reclaimMemberId` on
  `team:join` + "Picking up where you left off?" picker; late-joiner catch-up card
  (modalcard, 3 prow lines, phase-aware variant for rebuild); `.roomlink` chip in
  runbar (JOIN_HOST · code · copy).
- Facilitation: `.runscript` collapsible per-phase script cards (copy in facilitator
  spec — all 5 phases written); "Needs you" queue (6 client-derived triggers, table
  in facilitator spec; row highlight `tr.needs`); richer `.amendcard` (locked-now vs
  proposed side-by-side + brief's original intent).

### Slice 6 — DUMP→MAP + LEDGER (needs live AI for full path; offline fallback mandatory)
- `/api/coach` `structure:true` branch: SYSTEMS.structure prompt → JSON
  `{reply, proposal:{blocks:[{type,text,why?,capacity?}], orphans:[]}}`; server-side
  clamp (7 types, text≤120, why≤200, ≤20 each, capacity enum); parse-fail →
  degraded reply, no proposal.
- Client: proposals shelf in orphan tray ("the Coach heard a map in that — accept
  what's right"); ✓ place (typed block + meta + author stamp, placement heuristics:
  singletons left column, phases row at 260px spacing, moments nest into phases) /
  ✕ to parking (orphans); "place all"; `coachStatus='working'` goes live.
- Offline: rule-based splitter → every line becomes an orphan + honest toast.
- Vignette line → "type how it really works — I'll structure it, or park it so
  nothing's lost".
- Ledger: server `buildLedger(team)` on `/api/diff` response (`constraintLedger`);
  kept = survived-locked OR capacity ∈ {accountable, served} OR confirmed-assumption
  overlap; MYTH otherwise / busted-overlap; replace the 3 duplicated client regex
  sites (share, race card myth count, export pack).

## Verification per slice
Both suites (`e2e.js` 34, `e2e-playwright.js` 63) + targeted Playwright visual pass
+ new edge camera (`qa-journey-edges.js`) where the slice touches an edge state.
New e2e checks to add as slices land: inspector writes meta.why (slice 1), phone
viewport palette reachable (slice 2), reckoning resolves (slice 3), reclaim prevents
ghost (slice 5), proposal accept creates typed block (slice 6).
