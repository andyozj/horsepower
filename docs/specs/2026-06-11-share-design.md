# Share & Export — Design Spec

**Status:** First solid pass.
**Date:** 2026-06-11
**Part of:** Horsepower PRD. Implements user-journeys A8, B6–B7.

---

## 1. Share-out (in the room) — the DOUBLE REVEAL *(reworked 2026-06-11)*
- State: `share` (Farrier-triggered).
- **Straight presentation, no scoring (v1).** The **Farrier picks who presents** and when (fits the ~10-min slot).
- **Why a double reveal:** Team B never saw the old steps (zero-leak), so Team B *cannot* narrate "what we killed" — it doesn't know. And until now, Team B has never seen the real process behind the brief it rebuilt. So each presentation is a **two-voice reveal**, and the second peak moment of the workshop:
  1. **"What it actually was"** — the original captured map appears, **shown to Team B (and the room) for the first time.** Team A gets ~a minute of voice: this is our real process. (Team B watching their abstract brief snap into a concrete sprawling reality is the beat.)
  2. **"What it became"** — Team B presents the rebuild: how they reasoned forward, what AI now does, **where the people landed** (the role-transformation cards).
  3. **"What died — and what was fake"** — the **Coach renders the diff** between the two maps (*"3 phases collapsed · 2 handoffs gone · the report no longer exists"*) **plus the constraint ledger**: which claimed constraints **held** 🔒 (accountable sign-off, legal gate) and which were **fake** ✂️ (informed-only, data-they-held, stale pre-AI workarounds). The fake-constraint list is the single most evangelizable line in the room (*"we believed X was mandatory — it was a pre-AI workaround"*) — it's the aha, made legible. Nobody has to claim knowledge they don't have — the system shows the kill-list.
  4. **The assumption reckoning** — Team B's logged assumptions about the hidden process (Rebuild §2a) go up; **Team A confirms ✓ or busts ✗ each one** (*"you assumed validation existed — it doesn't; that's the whole problem"*). Unknowns become theatre instead of silent design errors.
- **Every team sees its own workflow's fate.** With only a few teams presenting, a team whose workflow wasn't picked would never learn what happened to it. So **the moment `share` starts, every team's own screen shows their captured original beside its redesign by the other team** (their personal before→after). Presenting is curated; *seeing your own workflow's fate* is guaranteed.
- **Before/After present view (Farrier-projected):** for each presenting pair the Farrier projects a **clean, full-screen `original → redesign`** — the original captured map (before) beside the AI-native rebuild (after), with the Coach's diff as a caption strip. This is the **presentation surface**, distinct from the working canvas. (A team device can also drive; open, low-stakes.)

## 2. Export — dead simple
- **The unit of export is a WORKFLOW, not a team** *(resolved 2026-06-11)*: one pack per workflow = `original-map.png` + `redesign-map.png` (rendered from the canonical maps), bundled into a **one-page PDF** ("before" / "after" stacked) or 2 PNGs, with the **role-landing cards** + the **constraint ledger** (held 🔒 / fake ✂️) appended as a small caption block — the ledger is the "show your boss" payload.
- **Each team downloads BOTH packs that involve it:** (1) **"your workflow"** — the process they captured + the other team's redesign of it (this is the one their boss cares about — the evangelism artifact), and (2) **"your rebuild"** — the workflow they received + what they made of it (proof of their own AI-native thinking).
- No fancy layout, no branding system required — clarity over polish.

## 3. Close
- After share-out, the Farrier ends/archives the workshop. State persists locally (re-openable).

## 4. Edges
- A team that didn't finish Rebuild → exports whatever it has (clearly marked partial).
- Export works **offline** (client-side image render) so an AI/network hiccup never blocks the takeaway.
