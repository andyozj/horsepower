# Horsepower — IPO-readiness review: final report

**Date:** 2026-06-13 · **Process:** 5 research lenses → consolidation → solution design (2 clusters, adversarially reviewed) → implementation of the BUILD work → this report.

All source material lives in `docs/ipo-review/`:
`product.md` · `engineering.md` · `platform.md` · `visual.md` · `ux.md` (the five lenses) ·
`CONSOLIDATED.md` (triaged + clustered) · `solutions/hardening-design.md` + `solutions/a11y-platform-design.md` (diff-level designs) · `solutions/REVIEW.md` (the lead's adversarial sign-off) · `solutions/IMPLEMENTATION-NOTES.md` (deviations found while building).

---

## 1. What we did (BUILD — done)

These were judged **engineering / critical or cheap-and-necessary** and implemented now. Everything was gated on the existing 98 automated checks staying green plus new adversarial suites.

### Cluster A — server hardening (CRITICAL + HIGH security, methodology-integrity)
The methodology was enforced *for honest clients only*; one device holding the projected room code could stall or bypass it. Closed:
- **A1 [CRITICAL]** `maxPayload` (was 100 MiB default) + a `sanitizeCanvas()` choke point — no client payload can stall the event loop. (DEV-1: also required a per-socket `ws.on('error')` listener — without it the oversize-frame guard *crashed the process*; now correct.)
- **A2 [HIGH]** Per-role state projection — the hidden original and every teardown are no longer on the wire to member devices pre-share. The swap surprise and anti-retrofit rules are now enforced in the data layer, not just the UI.
- **A3 [HIGH]** Atomic persistence (tmp→fsync→rename + `.bak` fallback) + SIGINT/SIGTERM flush — a crash mid-write no longer wipes every live room.
- **A4 [HIGH]** Coach proxy gated to live rooms + per-room token bucket + 20s timeout + reply clamp + no upstream-error echo — an open LLM key-spend hole closed; strangers get the question bank, never spend.
- **A5 [HIGH]** `redesign:update` whitelist-merge — the people-landing gate ("freed up for higher-value work") is no longer bypassable via mass-assignment. **(This exploit was passing; the new `qa-hostile.js` H7 now catches it.)**
- **A6 [HIGH]** 8-char hostKey + 3-strike lockout + mint limits + TTL sweep — Farrier takeover and unbounded growth closed.
- **A7–A15 [MED/LOW]** chat role discipline · assumption-resolve authz · seat tokens · array-safe lock amendments · per-socket rate limit + backpressure · security headers · health depth · GET trim · reconnect jitter.
- **A11** Block-merge by `knownIds` — stops cross-member edit wipes (the most likely *honest-use* data loss in a multi-editor room), with a full-replace kill-switch.

**Verification:** `e2e.js` 34 · `e2e-playwright.js` 64 · `qa-fixcheck.js` 20 · **new `qa-hostile.js` 69** (17 hostile payloads + projection leak sweep + kill-and-restore + authz matrix + reconnect storm) — all green. Two suite edits total (hostKey length assert 4→8).

### Cluster B — accessibility & platform — DONE
The EU Accessibility Act is enforceable since June 2025; Miro/FigJam set the canvas-a11y bar for procurement. Performance was measured *clean* (1.9ms renders, flat heap, 121fps) — recorded as a diligence asset, no framework added. Shipped: live-region toasts + a dedicated announce channel, landmarks + sr-only headings, focus-restore across re-renders, native-`<dialog>` modals + reveal focus, **a full canvas keyboard layer** (roving tabindex, arrow-nudge, Enter-place, A-to-connect, announcements — the ACR-defining item, focus escapable per WCAG 2.1.2), self-hosted variable fonts with the WONK/opsz axes preserved (CDN was an identity single-point-of-failure on venue LAN) + service worker + manifest, race-card retina export, reduced-motion live toggle, export print fidelity. New `qa-a11y.js` (33 checks: axe-core 0 critical/serious + keyboard flows + font/DPR checks).

**Verification:** `e2e.js` 34 · `e2e-playwright.js` 64 · `qa-fixcheck.js` 20 · **new `qa-a11y.js` 33** — all green (B is client-only; server untouched). `qa-hostile.js` 69 re-confirmed against the untouched server. Note: B's implementer was content-filtered mid-output with the font wiring + one test assertion incomplete; the lead finished them (DEV-B1) — re-verifying the fonts were genuinely variable, not a flattened static instance.

---

## 2. What awaits your decision (PARKED — strategy, not bugs)

These are real, well-sourced opportunities — but they're product/visual/UX *direction*, and the panel's job was to surface them, not to choose them for you. Each has a design sketch in the cluster docs. Ordered by the panel's own leverage verdicts.

### The three single-verdict picks (one per outward lens)
| Lens | Highest-leverage pick | Effort | Why |
|------|----------------------|--------|-----|
| **Product** | **Post-workshop momentum + proof loop** (R1+R2): a "now-what" commitment beat, a recap that travels by link, a 60-sec aha/confidence pulse | M | Attacks the #1 documented facilitation pain (post-session decay); turns "mindset shift" from a claim into measured, quotable evidence. "Build the part of the workshop that happens after the workshop." |
| **UX** | **Per-user scoped undo** (no CRDT, command-pattern) | M | The one pattern every 2025 canvas ships that Horsepower lacks entirely; its absence taxes exactly the non-designers the product exists for. Pair with QR-join + reconnect banner (both S). |
| **Visual** | **Fill the 15 illustration slots** via a style-anchored pipeline (Coach portrait first) | M | The Coach and steeds are load-bearing characters rendered as placeholder geometry; one consistent "hand" turns "tokens applied well" into "a world with an author." Then **ink engine v2** (vendor perfect-freehand, M). |

### Fuller menu (all in the cluster docs with sources + effort)
- **Product (E):** R3 Farrier rehearsal sandbox + seeded worked example · R4 optional systems/data + today-baseline capture · R5 Coach clustering / end-of-phase synthesis · R6 private brain-dump mode · R7 Farrier whisper-to-team (S) · R8 async pre-work · R9 workshop memory/archive/re-run · R10 6-team scale validation + Share gallery mode (**the PRD ceiling is currently untested** — this one is closer to a must-do than a nicety).
- **UX (C):** QR join (S) · reconnect banner (S — I'd fold this into engineering next pass; it completes rule #8 for transport) · selection presence (M) · Farrier spotlight in Share (M) · drag-out auto-connect (M) · marquee select (M) · ephemeral emotes scoped to lobby/share (S/M) · progressive time disclosure for members (S) · zoom-to-fit + shortcut overlay (S).
- **Visual (D):** paper-tooth feTurbulence grain + true letterpress emboss (S) · race-card → real racecard anatomy with tear-off stub (M) · room view as broadcast graphics / lower-third (S/M) · riso overprint at celebration moments (S).

### The panel's "do NOT" consensus (guardrails for whatever you pick)
No leaderboards/scoring · no participant-visible agenda (foreshadows the swap) · no AI-generated redesigns (guts provoke-not-solve) · no general-whiteboard parity · no AI-gated progression (breaks rule #8) · no CRDT · no global undo · no projector presence/cursors (leak-by-glance) · no member timer alarms · no infinite canvas · no glassmorphism/foil/aurora-gradient "AI aesthetic."

---

## 3. Recommended next move
1. **Reconnect banner + QR join** (both S, UX) — fold into the next small engineering pass; together they fix the coldest and worst moments of a real room.
2. **R10 scale validation** (Product) — the PRD's own ceiling is marked untested; cheap to run, and diligence *will* ask.
3. Then choose among the three verdict picks (recap loop / scoped undo / illustration set) by what the next demo needs to prove.

Tell me which of the parked items to pick up and I'll spin the same design→review→build pipeline on them.
