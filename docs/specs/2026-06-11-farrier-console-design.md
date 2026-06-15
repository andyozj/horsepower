# The Farrier's Console — Design Spec

**Status:** First solid pass.
**Date:** 2026-06-11
**Part of:** Horsepower PRD. Implements user-journeys A1–A9, user-stories Epic 5.

---

## 1. Purpose
The host's control surface: create the workshop, drive the phases, set timers, and **monitor every team — drilling into any team's *actual board* to see what they're doing.**

## 2. Layout
- **Bar:** 🐎 Horsepower · **workshop code** · **host code** (private — co-hosts join with it, lobby §1) · "you are the Farrier" · **live timer**.
- **Phase controls:** Lobby → Surface → Swap → Rebuild → Share (current highlighted); the primary action advances the phase (Start Surface · **Swap → Rebuild** · Move to Share). **Per-part timer** presets (e.g. 6/10/20/30 + clear), broadcast to all, low-time warning.
- **Team dashboard (compact):** one row per team — *name · members online · progress · flags (thin/orphan counts) · status (ready / building / blocked)*. Dense + legible at arm's length, holds at the **~6-team ceiling**.

## 2a. The ROOM VIEW — the only projectable surface 🤫 *(added 2026-06-11)*

**The console is NEVER projected.** Its phase rail literally spells out *Swap → Rebuild* — 20 minutes of that on the wall and the surprise is dead. The console spec saying "never spoil the swap" while putting the word SWAP on the projector was the contradiction; this closes it.

- **Room view** = a separate, dedicated projector surface: **workshop code (huge) · team roster with live member counts · the timer.** Nothing else — no phase rail, no phase names, no governance language, no controls.
- The Farrier opens it from the console ("Open room view") onto the projector/second screen; the console with its controls stays private on the laptop.
- During Surface the room view may additionally show a calm ambient roster ("AP Squad — 5 capturing"); **never** flags or phase names.
- At share-out the room view becomes the **Before/After present view** (§4).
- *Rule of thumb:* the **console is private** (honest vocabulary allowed); the **room view is public** (pre-reveal vocabulary rule applies — capture §5a).

## 3. Drill-down = a faithful mirror of the team's canvas  ⬅ key requirement
Clicking a team expands into a **read-only mirror of that team's *live, entire canvas* — exactly what the team sees**, in whatever phase they're in:
- The **real editable-style board** (the actual map nodes with the team's real labels), **not a schematic**.
- **Orphans are floating cards *on the canvas*** (the orphan tray lives in canvas space) — *not* a separate list. Same for thin-squiggles, the redesign-ready banner, etc. — rendered where the team sees them.
- The team's **typed content** is visible (their brain-dump / chat with the Coach), so the Farrier can read *what* they wrote and tell "stuck/confused" from "on track."
- **Read-only** — "the Farrier watches, the team drives." (No editing the team's board from here.)

> The current `mock-farrier-console.html` list-ifies orphans/governance — that is a **stand-in**, not the spec. The real drill-down is the team's actual canvas mirrored.

## 4. Controls / actions
- **Advance phases** (gated: Swap needs ≥2 teams; confirm).
- **Swap override:** swap even if a team isn't redesign-ready (flagged), or hold. The confirm dialog names **which receiving team** inherits the thin brief.
- **Brief preview (leak QA — Swap §4a):** once a team's teardown is pre-computed (gate green), the Farrier can read it from the drill-down *before* swapping — one human pass catches a leaked step name — with a **regenerate** action. Optional, never blocking.
- **Lock amendments (Rebuild §6a):** a team's challenge to a locked block lands here; the Farrier reads the original capture in the mirror, then approves/denies. Approved changes are logged on the brief.
- **Retrofit flags are console-honest, team-generic:** the console shows the real match ("Phase 2 ≈ original's *reconcile*"); the team only ever gets the generic convergence challenge (Rebuild §4 — leak-by-flag rule).
- **Roster:** re-seat / remove a team or member **any time before the swap** (wrong-team joins and latecomers happen mid-Surface, not just in the lobby).
- **Nudge** a team (lightweight ping) from its drill-down.
- **Co-Farrier:** joins with the **host code** (lobby §1 — the projected workshop code alone never grants control); multiple hosts share full control.
- **Share — Before/After present view:** for each presenting pair, project the **double reveal** (share §1): the original map ("what it was" — Team A's voice) → the rebuild ("what it became" — Team B's voice) → the Coach's diff ("what died"). Full-screen, on the room view. The presentation surface, distinct from the working canvas. (~journey step A8.)
- **Never spoil the swap:** the console gives the Farrier no "announce the swap" affordance pre-swap — the reveal is a surprise (Swap §5) — and the console itself is never projected (§2a).

## 5. Scale & resilience
- Compact dashboard + on-demand drill-down keeps it legible at the ceiling (the Farrier reads *one* board at a time, not 6 shrunk maps).
- Survives reconnect (state persists); AI-failure in any team degrades gracefully without breaking the console.

## 6. Open
- Whose screen presents in Share — Farrier projects a team's mirror, or a team device drives. (Default: Farrier projects the mirror.)
