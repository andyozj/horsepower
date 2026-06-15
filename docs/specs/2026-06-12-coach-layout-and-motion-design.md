# Coach Layout & Motion — Design Spec

**Status:** Approved 2026-06-12. Evolves `2026-06-11-design-system.md` §17 (Surface/Rebuild layout) and §6 (motion). Where this disagrees with §17's "chat∣map split" / "map-heavy + Coach dock" phrasing, **this wins** — it's the same intent (map is the hero, Coach assists), made ergonomic.
**Date:** 2026-06-12
**Scope:** the v0.2 client (`public/index.html`). No server changes — the data model, locks, gate, teardown, and human-landing semantics are unchanged; this is purely how those surface in the UI, plus new motion.

---

## 1. Why

Two problems with the shipped v0.2 UI:
1. **The Coach competes with the map.** Surface is a fixed chat∣map split; Rebuild squeezes the canvas between a left Coach pane *and* a right Brief/People/Assume panel. The map — the hero artifact — loses on both sides.
2. **Horsepower is a fun app with dead air.** Landing, the lobby, "ready and waiting", and phase transitions are static. They're also the safest place for delight (no content to compete with) and, in the lobby, a chance to *teach a non-technical room what the Coach does* (PRD §1: assume no AI fluency, onboard without condescending).

The fix: **the map is the full-bleed hero in both phases; the Coach is a single collapsible rail; the Rebuild teardown lives on the map as scattered context cards; and the waiting/transition moments get characterful, on-brand motion.**

---

## 2. The Coach — placement & behaviour

**One collapsible right rail, both phases. The map is full-bleed behind/beside it.**

- **Rail = the Coach, and (almost) only the Coach.** Pure chat + the "ask about the workflow" oracle. Nothing else is crammed into the conversation.
- **Collapsible + resizable.** Drag the edge to widen (useful for the Surface brain-dump); collapse to a thin edge to reclaim the full map. Collapsed state shows a **launcher** (◗) + the status pill (*"Coach is reading along…"*).
- **Phase-aware default open state:**
  - **Surface:** rail **open** by default — the brain-dump *is* the Coach; it's the primary input.
  - **Rebuild:** rail **collapsed** by default — the map is the build surface; the Coach taps you on the shoulder.
- **Challenge badge = the challenge budget, made physical.** The Coach surfaces one challenge at a time (coach-behavior §3); the rest queue. When the rail is collapsed and a challenge is waiting, the launcher shows a badge ①. Pull, not push — opening the rail is the user's move. This is the spec's rationing rule as an interaction.
- **Mobile (<860px):** rail becomes a bottom sheet (existing behaviour, retained).

### 2a. Surface information architecture
```
┌──────────────────────────────────────────┬─────────┐
│ palette toolbar                            │  Coach  │ ← open by default
│                                            │  chat   │
│        CANVAS (full-bleed, the hero)       │  +oracle│
│        orphan tray docked (existing)       │         │
│                                            │  status │
│ gate: ✓ a newcomer could run with this     │  ◗      │ ← drag to resize / collapse
└──────────────────────────────────────────┴─────────┘
```
Surface keeps: the typed-block palette, the orphan tray (canvas-docked), the Newcomer-check gate bar. Only change from today: the Coach is a collapsible/resizable rail rather than a fixed left split, and the map gets the freed width.

### 2b. Rebuild information architecture — **the teardown lives on the map**
The brief is no longer a side panel. **Every delivered ingredient is a card scattered on the canvas, mostly unconnected** — its orphaned presence says *"the old process had this and treated it as critical; reckon with it"* (this is the §2a context-stack + swap §4 "scrambled, Coach-placed" delivery, realised). Card taxonomy:

| Card | Look | Carries | Hover/select → |
|---|---|---|---|
| **Locked block** (intent · outcome · trigger · accountable persona) | dashed purple, no edit | the locked need/want | the WHY + "LOCKED"; a **"Challenge this"** action (the §6a amendment hatch — lives here because you can't edit a lock) |
| **Candidate constraint** | dashed amber | the claimed constraint + capacity rung | the abstracted WHY + *"candidate — pressure-test me"* |
| **Area of concern** | pain-tinted | the problem (never a step) | why it's a friction point |
| **Person to land** | persona glyph, in a canvas-edge **"to land" tray** | role + capacity | the WHY; the **stays / transforms / removed** control (landed in place) |

- **Pre-drawn relationships are minimal** — the Coach draws at most a couple of genuinely critical links (e.g. accountable-persona → outcome). Everything else arrives unconnected; connecting/killing is the team's forward reasoning. *Not* an inherited structure (that would be a retrofit anchor).
- **People-landing is the mirror of the orphan tray** (Rebuild §6 says so explicitly): unlanded people sit in a canvas-edge tray; you pull each onto the design where it lands and mark stays/transforms/removed (a *transforms* person ends up beside the agent block it now governs — exactly where the autonomy-audit wants the escalation drawn). The tray empties as you land them. A persistent **"People: N/M landed"** pill shows gate status. Server semantics unchanged: unlanded → status stays "building" + export "partial — N unlanded"; "freed up for higher-value work" still rejected.
- **Glossary** → jargon terms get a dotted underline on cards; hover to decode. No panel.
- **Assumptions** → a persistent strip pinned at the **bottom of the rail**, visible regardless of whether the Coach chat is scrolled: collapsed reads `Assumptions ③`, expands to the list. It is *never* mixed into the Coach conversation (user-firm) and never buried behind a tab. Logging an assumption stays a one-line affordance there.

```
┌────────────────────────────────────┬──────────────┐
│ palette toolbar                     │  Coach       │ ← collapsed by default;
│  ┌─ people to land ─┐               │  (chat+oracle)│   ◗① when a challenge waits
│  │ 👤GM 👤Analyst …  │               │              │
│  └──────────────────┘               │              │
│   CANVAS — locked / candidate /      │              │
│   concern / person cards scattered,  │              │
│   hover→WHY. ⚡agent ──→ 👤(gate)     ├──────────────┤
│  People: 3/5 landed                  │ Assumptions ③│ ← always visible
└────────────────────────────────────┴──────────────┘
```

No tabs. The rail is the Coach + the Assumptions strip. The brief is the map.

---

## 3. Motion — playful & characterful (the waiting/transition moments)

Direction: **playful & characterful**, leaning on the horse motif and hand-drawn craft. Hard rules (design-system §0/§5/§6 still hold): **GPU `transform`/`opacity` only**, 60fps, **`prefers-reduced-motion` drops everything to instant**, and the **working canvas during active capture/build stays calm** — play lives in waiting + transitions, never over the user's content.

| Moment | Motion |
|---|---|
| **Landing / first paint** | paper grain settles; the 🐎 knight-glyph **sketches itself in** (stroke-draw via `stroke-dashoffset`); wordmark + card rise-and-settle. One-time, ~600ms. |
| **Team picker + lobby (the paddock)** | teammate avatars **canter in** from the edge and settle on real presence events; team cards nudge; a calm boiling-line idle keeps it alive. |
| **Lobby — "meet the Coach" vignettes** | short looping hand-drawn vignettes cycle while waiting, teaching the Coach: *"I turn your brain-dump into a map"* (fragments fly into blocks) · *"I flag what's too thin for a newcomer"* (squiggle draws under a weak phrase) · *"I push on the WHY"* (a tiny challenge exchange). **HARD: Surface-phase Coach behaviours only** — no fair-skeptic / challenge-the-redesign content, and no use of *swap/redesign/rebuild/hand over/receiving team/stranger/transfer* (capture §5a vocabulary rule). Teaches "sharp scribe", never spoils the twist. |
| **"Ready, waiting" (gate green)** | finishing earns a beat: the gate chip stamps to ✓, a brief "saddled up — waiting for the off" settle, then a calm idle — so being done feels like an accomplishment, not a void. |
| **Phase transitions + room view** | soft cross-fades between phases; the room-view code has a subtle letterpress breathe; while waiting for teams it shows the paddock filling; a **"saddling up…" shimmer** builds quiet tension in the pause before the reveal (no spoiler — vocabulary-safe). The swap stamp-slam (existing) is unchanged. |

---

## 4. Invariants preserved (nothing methodology-breaking changes)
- **Vocabulary rule:** lobby vignettes + room view obey capture §5a (Surface-Coach behaviours only; no pre-reveal vocabulary). The swap stays a surprise.
- **Challenge budget:** the badge surfaces queued challenges as pull, not push.
- **Zero-leak:** on-canvas context cards render the same abstracted WHYs the teardown already produced (server-filtered); putting them on the map changes presentation, not content.
- **Locked enforcement** (server), **human-landing gate** semantics (status + export marking, never the clock), **assumption ledger / reckoning**, **graceful degradation** — all unchanged.

---

## 5. Files & test impact
- **`public/index.html`** — the only code file. Changes: `makeCanvas`/rail layout (full-bleed + collapsible/resizable rail), Rebuild canvas seeds candidate/concern/person cards (in addition to today's locked blocks) with hover-WHY tooltips + a "Challenge this" action on locked cards; people-landing moves to a canvas "to land" tray + in-place control + status pill; Assumptions becomes a rail-bottom strip; remove the `rtab-*` Brief/People/Assume tabs; add the motion layer (landing sketch-in, paddock, vignettes, ready-waiting, transitions/room-view shimmer).
- **`docs/specs/2026-06-11-design-system.md`** — update §17 Surface/Rebuild layout notes + §6 motion table to reference this spec (consistency; the spec set should not contradict the build).
- **`e2e-playwright.js`** — selectors change: `rtab-people` → canvas person-card + `land-*` in place; `rtab-assumptions`/`add-assumption` → rail-bottom Assumptions strip; `rtab-brief` → on-canvas cards + locked-card "Challenge this". Re-point these and keep the 35 journey assertions green. `e2e.js` (WS contract) is unaffected (no server change).

## 5a. Farrier console rework (added 2026-06-12, same day — usability)
The phase rail was five equally-clickable buttons (reads like tabs you can jump between) with no way home. Replaced with a **guided run bar**:
- A **display-only phase stepper** (`① Lobby → ② Surface → ③ Rebuild → ④ Share`; current lit, past checked) — *not* buttons.
- **ONE primary CTA** that advances to the next phase, labelled for what it does (Start Surface → Swap → Rebuild → Move to Share → Finish), **greyed with the blocking reason** ("need 2+ teams") until valid. A discreet guarded **"↩ step back"** for misclicks.
- The **Lobby becomes a "set up your room" screen** (big join code + how-to-join + teams assembling + the Start CTA), so "start before anything happens" is obvious; it becomes the monitoring dashboard from Surface on.
- The **🐎 logo is a home control on every screen** (`goHome()`; confirm when a workshop is live).
- Server: `performSwap` is now **idempotent** — re-entering Rebuild after a step-back never re-rotates/re-seeds, so no work is clobbered.
- **Per-phase timer with explicit controls.** The timer is server state `{durationMs, remainingMs, endsAt, running}` (so it survives refresh and is identical on every screen). Each phase **resets + pre-loads its run-of-show default** (Surface 20m · Rebuild 30m · Share 10m · Lobby none); a preset/custom value *loads* the clock, and **▶ Start / ⏸ Pause / ↺ Reset** drive it — no more instant-start-on-preset. Members + the room view show the countdown (with a ⏸ marker when paused) read-only.

## 6. Non-goals
- No server / data-model changes. No new dependencies (still no build step; rough.js/perfect-freehand remain deferred — sketch-in uses plain SVG `stroke-dashoffset`). No change to the swap, teardown computation, or export. Not adding sound. Not animating the active editing canvas.
