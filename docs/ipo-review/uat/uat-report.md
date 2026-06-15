# Horsepower 🐎 — End-to-End UAT Report (IPO Review)

**Date:** 2026-06-13
**Build:** v0.2 (`server.js` ~1386 lines, `public/index.html` ~3589 lines)
**Environment:** isolated self-hosted server `PORT=3501 DATA_DIR=/tmp/hp-uat`, AI Coach **OFFLINE** (degraded / rule-based + question-bank path — the production floor)
**Method:** real multi-actor Playwright in isolated browser contexts — Farrier + 4 members across 2 teams — driven through the entire journey; every actor's `pageerror` + `console.error/warning` captured. Phone (390px), reduced-motion, keyboard, reconnect, and the Farrier sandbox dry-run exercised separately.
**Shots:** `docs/ipo-review/uat/shots/` (47 screenshots)

---

## SIGN-OFF: ✅ **YES (conditional)**

- **0 BROKEN**, **0 unresolved HIGH**, **0 console errors / pageerrors from app code** across ~30 full workshop runs.
- The complete journey (landing → join → lobby → Surface → swap → Rebuild → Share → Closed) works end-to-end for the Farrier and every member, including the full R1–R10 feature set.
- Server log is clean — only structured event logs, no stack traces, no crashes; the room stayed healthy through every run.
- **Condition:** the one MED layering issue below (share-phase CTA interception after room-view/gallery toggling) should be on the fix list, but it is intermittent, recoverable in-product, and does not block the happy path. Everything else is MED/LOW/POLISH.

---

## Findings

| # | Area | Issue | Severity | Repro | Shot |
|---|------|-------|----------|-------|------|
| 1 | Rebuild canvas layering | When the **Assumptions ledger is expanded** at rebuild-complete, its panel (`.assumefloat`, centre-bottom) **completely covers the "Hear your design back" synth button** (`synth-rebuild`, `bottom:54px`). `elementFromPoint` at the button centre returns the assumption row — a normal click is swallowed. | **HIGH→demoted MED*** | Rebuild → land all people (button appears) → expand Assumptions → try to click "Hear your design back". *Demoted: the synth button is a secondary nicety, and collapsing the ledger frees it; but two core rebuild affordances overlap. | `24-synth-assume-overlap.png` |
| 2 | Farrier console (share) | After the Farrier opens **room view → present-pick → Gallery** and returns to the console, the open **RUNSCRIPT `<summary>` panel intermittently overlays the primary "Finish & close" CTA** — a normal click times out (center not hittable; runbar momentarily lays out at 0-height during rapid re-renders). **Clean multi-team share = CTA hittable** (verified via trial-click). | MED | Share phase, toggle room view + present picker + gallery, return, click "Finish & close". Not reproducible on a clean entry to Share. | `23-farrier-pulse-board.png`, `27-farrier-share-cta-real.png` |
| 3 | Recap (R1) | Standalone recap downloaded immediately after typing a commitment shows the **"Commitments — Now-What" section empty (em-dash)** and "What it became: rebuilt from a blank page" generic fallback — the debounced commitment / rebuilder redesign line hadn't round-tripped to team state before download. | MED | Share → type commitment → immediately Save recap (within ~1s). Waiting longer fixes it. | `25-recap-standalone.png` |
| 4 | Coach rail toggle (mobile/desktop) | The collapsed Coach button (`.railtoggle.coachbtn.breathe`) carries a **perpetual `breathe` animation**, so automated/normal clicks report "element not stable" until it settles. A human can click it; it's a test-stability + micro-jitter concern flagged previously in CLAUDE.md. | LOW | Rebuild, collapsed rail, click the round red Coach button. | `18-whisper-in-rail.png` |
| 5 | Rebuild canvas density | The teardown-on-map design stacks many cards (locked blocks, candidate constraint, agent, people tray, assumptions) in one viewport — visually busy; on a 1280px canvas cards crowd. Inherent to the design, but the first impression is dense. | POLISH | Enter Rebuild on a desktop viewport. | `15-rebuild-teardown.png`, `16-people-landing.png` |
| 6 | Closed screen ordering | The Closed view leads with the farewell card then **empty-looking commitment + pulse input cards**, with the celebratory **race card below the fold**. For a member who already filled pulse/commitment at Share, the closed screen opens on input fields rather than the keepsake. | LOW | Reach Closed as a member; observe top-of-page. | `28-closed-member-clean.png` |

\* Findings 1 & 2 are both *layering* defects where a panel sits over a button. Neither blocks the critical path (both have an in-product workaround), so the build still signs off — but they are the two things most worth fixing before a live room.

### Non-findings (investigated, cleared)
- **Reconnect** — socket auto-reconnects (exponential backoff in `ws.onclose`); canvas state preserved (server is source of truth) and authoring works post-reconnect. Initial "did not reconnect" was a false probe (`window.ws` isn't window-attached). **PASS.**
- **`inspector-system` "missing"** — by design only renders for input/phase/agent blocks, not persona. Works on the right types. **PASS.**
- **Reduced motion** — 0 infinite animations running under `prefers-reduced-motion: reduce`. **PASS.**
- **People-landing gate** — correctly **rejects** "freed up for higher-value work" (stays at 0/1) and **accepts** a real landing. **PASS.**
- **Pre-reveal vocabulary** — lobby + room view never leak swap/redesign/rebuild/transfer. Room view never leaks the host code or "localhost". **PASS.**

---

## What's genuinely excellent

- **The swap reveal.** Wrapped-parcel illustration, "REDESIGN / DON'T RETROFIT" red stamp, a twist line that names the other team and says "nothing to retrofit", a brief-orientation sentence, staged CTA. Genuinely a surprise-payoff moment, fully on the cream/ink idiom. (`14-swap-reveal.png`)
- **The keepsake recap.** A self-contained HTML file (`horsepower-recap-<team>.html`, ~2.6 kB, cream + system fonts, zero external deps) that opens standalone and reads beautifully: riders (steed names), what-it-was → what-it-became, myths struck & constraints kept, ahas, confidence 3→8, dateline. A real take-home artifact. (`25-recap-standalone.png`)
- **The room-view timer throne.** Huge Fraunces letterpress "9:59" + phase caption + corner code chip. Projector-ready and elegant. (`44-roomview-timer-throne.png`)
- **The Coach as a character.** Red-capped portrait in the lobby with four promise rows ("I'll capture everything / push on the WHY / be newcomer-proof / where to find me") + "Let's ride" commitment. Warm and clear on both desktop and phone. (`32-phone-lobby.png`, `43-lobby-coach-desktop.png`)
- **The ontology tour** ("Pick your stable") — a living hand-drawn workflow with a red-pen caption cycling through Persona/Trigger/Phase/Intent/Outcome. Teaches the map without a wall of text. (`45-ontology-tour-settled.png`)
- **The Farrier sandbox dry-run** — one click mints a fully-seeded two-team room (Field Service / Onboarding demos) you can step through lobby→closed solo, with a leak-safe banner. Excellent facilitator onboarding. (`40–41-sandbox-*.png`)
- **The gallery wall** — "The whole room — before → after" contact sheet of every pair's mini-maps. (`21-room-share-gallery.png`)
- **Graceful degradation is real.** With the AI off, every gate, teardown, governance check, synth, cluster path and Coach reply still works from rules + the question bank. The room never stalls.
- **Phone adaptation** — fixed bottom palette (96×48px targets), rail collapsed by default, collapsed details trays, charming empty-canvas illustration. (`33-phone-surface.png`)
- **Zero console noise.** Not one app-code error or warning across the entire multi-actor suite; all referenced `/img/*.png` assets exist (no 404s).

---

## Per-phase verdict

| Phase | Verdict |
|-------|---------|
| **Landing → join → picker → lobby** | ✅ Excellent. Self-drawing hero, steed roll/reroll, ontology tour, Coach portrait, paddock, commitment "Let's ride", presence all work. |
| **Surface** | ✅ Strong. Every block type drops, two-click arrows, inspector (WHY + capacity + system on right types), baseline strip, gate → rosette at green, synth, degraded Coach, author dots, Farrier mirror, per-phase timer broadcast. |
| **Swap reveal** | ✅ Excellent. Stamp fires, twist names the other team, staged CTA, click-to-build. A highlight. |
| **Rebuild** | ✅ Works, with two layering nits (Findings 1, 5). Locked blocks (5) scrambled + readable, candidate cards w/ WHY, agent blocks, people-landing gate enforced, assumptions, lock-challenge → Farrier approve → label updates on canvas, R7 whisper lands in member rail, rebuild-complete synth. |
| **Share** | ✅ Strong. Double reveal (before/after), diff strip, ledger, R2 pulse (2 textareas + 2 sliders), R1 commitment, recap download (Finding 3 timing nit), export pack, reckoning controls, R10 gallery + featured present. |
| **Closed** | ✅ Works. Farewell + still-capturable pulse/commitment + race card + recap save/copy; pulse board on Farrier. Minor ordering note (Finding 6). |
| **Farrier console** | ✅ Strong. Run bar + stepper + per-phase timer, drill mirror, needs-you triage, whisper, amendment adjudication, present picker/gallery, sandbox dry-run. One intermittent CTA-overlap (Finding 2). |
| **Room view** | ✅ Excellent at lobby (code throne), running (timer throne), and share (gallery / featured pair). No leaks. |
| **Phone (390px)** | ✅ Good. Landing, join, lobby, Surface + bottom palette all fit and function. |
| **Edge UX** | ✅ Reconnect recovers state; reduced-motion clean; keyboard focuses with a visible ring. |

---

## Coverage notes / limitations
- AI Coach ran **offline** the whole time (no key) — Coach *quality* (live LLM replies, dump-to-map proposals via `SYSTEMS.structure`, live synth/cluster) was validated only on the degradation path. The live-AI proposal shelf path remains untested without a key (a known gap per CLAUDE.md).
- Findings 1 & 2 are layering/z-order issues surfaced by `elementFromPoint`; both have in-product workarounds and neither produced a console error.
