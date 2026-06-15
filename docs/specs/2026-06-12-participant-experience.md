# Participant Experience — the (collaborative) game layer

**Status:** ✅ Built & verified 2026-06-12 (player + Farrier UAT, 54 checks). Builds on `2026-06-12-coach-layout-and-motion-design.md`. Client-only except a tiny `member.steed` passthrough on the server (so the Farrier roster/room view show steeds).
**Date:** 2026-06-12
**Scope:** the *participant* side (join → picker → lobby → work → reveal → share). Makes it feel like joining a game (Jackbox/Kahoot energy) while staying collaborative, on-theme, and faithful to the methodology's secret.

---

## 1. Why
The participant side is "correct but lifeless." We want the **joy** of a game-room — you become a character, your stable fills up, you're taught the ropes playfully, you always know the time — while the *work itself* stays calm so thinking happens, and **the swap stays a surprise.**

## 2. Theme & voice (the rule that keeps it from being gimmicky)
- **Stable metaphor for FLAVOUR, plain names for NAVIGATION.** Teams = **stables**; a member = a **steed**; joining = **entering the paddock**; Farrier starts = **"and they're off"**; the timer's last stretch = **"the final furlong"**; gate-green = a **rosette 🏅**; the share keepsake = a **race card**.
- **Locked names stay clear (PRD naming principle):** *Surface, Rebuild, the Coach, the Farrier* are navigational and must NOT be re-themed — the product name carries the wit, the labels carry the clarity.
- **Voice:** the Critic's-Notebook tone — wry, warm, specific. Empty states/toasts get light horsey one-liners ("hold your horses…", "stable's tidy — no orphans") but never at the cost of clarity.
- **No scoring (PRD-locked, re-confirmed):** all joy is collaborative — identity, lobby energy, micro-wins, reveals, keepsakes. No points, no leaderboard. The win is the aha.

## 3. Randomised steeds (identity)
- On join, the participant is **auto-assigned a steed**: a **random horse-themed name** (`<adjective> <noun>` — e.g. "Crimson Comet", "Reckless Biscuit", "Midnight Pip") + a **colour** drawn from the §1 presence palette (never the loud/state colours), rendered on the tinted **knight glyph** (`g-horse`).
- **🎲 Re-roll** ("not feeling it? shuffle") regenerates name+colour — **pre-start only** (identities settle once the room is working).
- **Persists** (localStorage) so reconnect keeps your steed.
- **Appears everywhere:** presence **cursor flag** on the map, **roster chip**, your **contribution tag** in the Coach thread, and your face on the **share race card**.
- **A11y/projector:** colour + name + glyph together — never colour alone.

## 4. Onboarding beat 1 — Team picker = "meet the map"
While choosing a stable, an **auto-building demo** teaches the ontology: 👤 Persona → 🔔 Trigger → [Phase ▸ Moments] → 💡 Intent → 🚩 Outcome, each element drawing itself in with a one-line "what this is"; **tap an element to learn more** (learn-by-poke). Goal: arrive on the canvas already knowing the pieces. Obeys the vocabulary rule (only the capture ontology; nothing about redesign/swap).

## 5. Onboarding beat 2 — Lobby = "meet the Coach" (relayout)
- **Big Coach "slide"** front-and-centre: the Coach **introduces itself as a character** (a small steed/coach face on its bubbles) and cycles the teaching vignettes *large* — Surface-phase behaviours only (scribe / thin-flag / push-on-WHY), **vocabulary-safe** (never foreshadow the swap).
- **Your stable** on the right: steeds **canter in** as teammates join (names + glyphs). **No count fractions** ("3/5" removed) — just who's here + a **"waiting for the off"** line.
```
┌──────────── THE COACH (big slide) ────────────┬──── your stable ────┐
│  "Hi — I'm your Coach.                          │  🐎 Crimson Comet(you)│
│   I turn your brain-dump into a map…"           │  🐎 Reckless Biscuit │
│        [ animated vignette ]   ● ● ○            │  · cantering in…      │
│                                                 │  ───────────────────  │
│                                                 │  waiting for the off  │
└─────────────────────────────────────────────────┴─────────────────────┘
```

## 6. Always-on timer (calm) + gentle end nudge
- A clear **countdown on participant screens during Surface & Rebuild** (and the big timer on the room view).
- **Gentle end nudge:** in the **final furlong** (~last 60s) the timer chip warms amber; a **one-time** calm toast ("≈2 min — start wrapping up"). Present, never panic-inducing. Honours the existing server timer model (load → start → pause → reset).

## 7. Collaborative joy (no scores)
- **Micro-wins:** gate-green earns a **rosette stamp — "transfer-grade 🏅"**; the first AI agent block in Rebuild earns a quiet nod ("now you're thinking AI-native"). Small, earned, never spammy.
- **Share-out as a reveal show:** the fake-constraint **ledger flips like cards** ("we thought this was mandatory… ✂️ MYTH") — the most evangelisable beat, made theatrical.
- **Keepsake "race card":** at share, each team/participant gets a shareable card (steed + "what your workflow became") — doubles as the export/evangelism artifact.
- **Waiting-room tip cards** (optional): light "AI-native = the system acts, you audit" cards so dead time teaches.

## 8. Room view (projector) = communal energy
Stables filling, the paddock, the big clock, the "saddling up…" build into the reveal — the shared screen the whole room glances at. Obeys the vocabulary rule (no phase names, no swap hint).

## 9. Invariants preserved
- **Secrecy / vocabulary rule** — onboarding + lobby + room view never foreshadow the swap; teaching is Surface-ontology + Surface-Coach only.
- **Calm working canvas** — play lives in join/learn/wait/reveal/transition; the capture/build surface stays calm (design-system §0).
- **No scoring** (PRD). **A11y** — colour never the only signal; **`prefers-reduced-motion`** drops to instant; **projector-legible**.
- **Locked navigational names** (Surface/Rebuild/Coach/Farrier) unchanged.

## 10. Files & test impact
- **`public/index.html`** (client-only): steed generator + re-roll + persistence; presence cursor/roster/tag use the steed; team-picker map tour; lobby Coach-slide + stable relayout (drop counts); participant timer + final-furlong nudge; rosette micro-win; share card-flip ledger + race card; Coach character face; themed copy/empty-states sweep.
- **`e2e-playwright.js`**: assert steed assigned on join + re-roll; map tour present at picker; lobby Coach-slide + stable (no "/" count); participant timer visible in Surface/Rebuild; rosette on gate-green; share card-flip + keepsake present. Keep all journeys green.
- **Server:** none expected (identity is client-side; if we want steeds to show on the Farrier roster too, pass `steed` through `member` — a tiny optional addition, decide at build).

## 11. Non-goals
No points/leaderboards/competition. No renaming of Surface/Rebuild/Coach/Farrier. No sound. No new build step/deps. Nothing that foreshadows the swap. Don't animate the active editing canvas.
