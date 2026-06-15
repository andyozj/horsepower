# Design-Review Cut — Spec & Implementation Plan

**Status:** Approved 2026-06-12 (synthesis of the 5-persona design review: Vera/colorist, Momo/charm, Kai/motion, Ingrid/type, Rex/game-feel — consensus items + the agreed personality ranking).
**Scope:** `public/index.html` (single-file vanilla JS client) + `e2e-playwright.js` test updates. **`server.js` must NOT change** (author identity travels inside block `meta`; everything else is presentation).
**Date:** 2026-06-12

## Hard constraints (violating any of these = wrong)
- No framework, no build step, no new dependencies. All motion = `transform`/`opacity` only, honour the existing `prefers-reduced-motion` kill (the `REDUCED` const exists).
- 🤫 Pre-reveal secrecy: no team-facing/projected surface may use *swap/redesign/rebuild/hand over/receiving team/stranger/transfer* before the reveal, or foreshadow the twist.
- No points/leaderboards. The working canvas stays calm during active work.
- Type families: Fraunces (display) / Inter (content+labels) / Caveat (the Coach's hand ONLY).
- Don't break existing `data-testid` selectors except where this spec says to update the test.
- After implementing, run both suites until green: `BASE=http://localhost:3200 node e2e.js` and `BASE=http://localhost:3200 node e2e-playwright.js` (server already running on 3200; static files served from disk — no restart needed).

---

## Part A — Rule violations & bugs (do first)

**A1. Host code leaks onto the projected room view.** In `topbar()`, when `ui.roomView` is true (Farrier projecting), render ONLY the brand + the `← Console` toggle — no workshop-code chip, no host-code chip, no timer chip. Test: add UAT assertion that the room view's topbar text contains neither the host code nor 'host'.

**A2. Banned vocabulary in the rosette.** "transfer-grade — saddled up" → **"saddle-ready — a newcomer could ride it"**; the toast "Rosette earned — transfer-grade…" → **"Rosette earned — saddle-ready. A newcomer could ride with this."** Update the UAT regex that matches the rosette if needed.

**A3. Blocks dropped off-canvas get swallowed.** In `createBlockAt`, clamp the drop position so the block lands fully inside the current scene viewport (account for `local.pan`/`local.zoom`): `x = clamp(x, 8, sceneWidth/zoom - w - 8)` style. Also keep the rail toggle from overlapping more than ~40px of canvas (it already only protrudes 40px — fine).

**A4. Keepsake/copy fallbacks.** `raceCard()`: when `intentOf()` is empty use *"their real process, warts and all"*; when 0 agent blocks use *"rebuilt from a blank page — no retrofit"*. Landing copy "4 letters, e.g. MARE" → "4 characters, e.g. MARE". Momo's free copy wins: orphan input placeholder `'+ note'` → `'+ said, not yet placed'`; people-card capacity `'unspecified'` renders as Inter italic muted *"capacity unknown"*; land-tray textarea placeholder → `'what do they ride next? inputs · outputs · skills'`.

## Part B — The two shared peaks (4/5 + 3/5 consensus)

**B1. Reveal choreography (`#reveal`, `showReveal`).** Staged sequence, all CSS animations with delays (no JS timers needed beyond what exists):
1. Scrim: near-opaque `rgba(26,39,64,.96)`, fades in 240ms ease-out (currently `display:none→flex` hard cut — animate via a `.on` opacity transition; keep `display` toggling but add a keyframe fade).
2. Stamp: **opacity 1 from frame one** (a rubber stamp is opaque); `scale(2.6)→1` + `rotate(-14deg)→rotate(-5deg)`, 380ms `cubic-bezier(.18,1.5,.35,1)`, starting at +330ms (use `animation-delay` + `animation-fill-mode:backwards`).
3. Twist text: `riseSettle .55s` at +900ms (fill-mode backwards).
4. CTA "Let's build →": rises at +1500ms (fill-mode backwards).
5. On dismiss (`#reveal-go`): clear the canvas's `seenBlocks` entry for the rebuild canvas before re-render so the locked blocks re-enter with the map-build stagger, sorted left→right (sort entrance index by `b.x`), 120ms apart — the team *watches* the teardown assemble.
- Under `REDUCED`: everything instant (existing kill covers keyframes; ensure fill-modes don't hide content).
- UAT note: the test clicks `#reveal-go` — it must `waitForSelector('#reveal-go', {state:'visible'})` and may need a ~1.6s allowance; update the test accordingly.

**B2. Phase-aware room view (`viewRoom`).** Three modes:
- **lobby:** as now — code at `display-xl`, roster huge. Bump type per Ingrid: join line ≥24px Inter w500 ink (include `location.host` — fix the dangling "join at — one code" to `join at <host> · code below`); team names Fraunces 32px; "N aboard" 18px `#4A5468`.
- **surface/rebuild (timer running):** the **timer takes the throne** — Fraunces tabular ~144px; the code shrinks to a corner chip (top-right, ~28px, still always visible for late joiners). When no timer is loaded/started, keep the code large.
- **share with `presentingPairId`:** before/after full-bleed (already exists) — code becomes the same corner chip, big heading stays.
- Final 60s: timer digits turn `--loud-red` with the existing pulse — no other fire.

## Part C — Finale staging + keepsake (consensus)

**C1. Share = a stage (`viewShare`).** Background of the share view goes ink `#21314f` (scoped to `.share.stage` — don't touch other views). "What it was" card slightly ghosted (opacity .92, desaturated title); "What it became" full-bright `--card` with a highlighter title rule. Headline promoted to Fraunces 40px (Ingrid #10); panel titles unified at 20px w600. Diffstrip `<li>`s stagger in (`translateX(-8px)`+opacity, +120ms each, fill-mode backwards). `.led` flip keeps its stagger but easing → `cubic-bezier(.2,1.2,.3,1)`. Race card enters last: `rotateY(70deg)→0`, 500ms, delay after the leds.

**C2. Keepsake race card (`raceCard`).** Add: a **riders line** — all teammates' steed names ("ridden by Crimson Comet, Reckless Biscuit & Dusty Banjo" — from `t.members[].steed.name`, fall back to member name); a **kill-count line** when data exists ("2 myths struck · 3 people landed" — myths = candidate constraints judged fake by the existing held/fake logic; landed = peopleLandings with outcome); a venue/date footer line ("ran at <workshop code> · <today's date>", Inter 12px w500 uppercase +0.06em — NOT Caveat; fix the existing Caveat footer leak); and a **"Save card" button** that renders the card to PNG via a plain `<canvas>` 2D draw (background, ink text lines, steed-coloured rect — simple, no libs) and triggers an `<a download>` click.

## Part D — Motion grammar (the cheap consensus subset)

**D1. Phase cross-fade.** In `render()`, when `state.state` changed since last render, give the new view root a one-shot class: incoming `opacity 0→1` + `translateY(12px)→0`, 280ms `cubic-bezier(.2,.9,.3,1.2)`. Content-agnostic. Skip when `REDUCED`.
**D2. Toasts animate.** Enter: `translateY(16px)`+opacity, 320ms house curve. Exit: fade+`translateY(6px)` 240ms before removal (adjust the `setTimeout` to play exit then remove). `.warn` adds a ±2px translateX wiggle ×2.
**D3. De-sync the boil (Kai).** Replace the global 2-frame flip: bake **3 frames** per rough path; each path gets its own period 280–400ms and phase offset (seeded from its id — deterministic). One global `setInterval` at ~100ms advances paths whose `next <= now`. Same for arrow `path.flow`. Performance: only touch paths currently in the DOM; skip entirely under `REDUCED`.

## Part E — Type-scale collapse (Ingrid)

**E1. Seven steps:** `12 / 14 / 16 / 20 / 28 / 40 / display(64+)`. Sweep the stylesheet: kill `10.5px, 11px, 11.5px, 12.5px, 13.5px` (→12 or 14); `13px` → keep ONLY for `.meta`-class secondary text or bump to 14 where it's a control label. Specifically: LOCKED tag → 12px Inter w600 uppercase +0.08em; land-tray `stays/transforms/removed` buttons → 13px w500 with ≥8px padding; `.ingcard .tag` → 12px; `.bubble .nm`, `.dimbadge` → 12px.
**E2. Contrast:** anything under 14px that uses `--muted` switches to `#4A5468` (add `--muted-strong:#4a5468` token).
**E3. Buttons don't inherit color in some browsers** — add `button{color:inherit}` so no pure-black leaks.
**E4. Console whisper** (Caveat in the Farrier table) → 20px, full ink.
**E5. Share/race-card Caveat leak** fixed in C2. Console top-bar timer chip → Fraunces 24px tabular.

## Part F — Personality bets (the agreed ranking)

**F1. Rex's presence/attribution (spec'd §13, core bet).**
- When a member creates a block (`createBlockAt`), stamp `b.meta.author = {n: me.steed?.name || me.name, c: me.steed?.color || '#7c3aed'}`. (Travels through the existing `canvas:update` — **no server change**.)
- `renderBlock`: blocks authored by someone OTHER than me get a small **author dot** (8px, the author's colour, top-left corner, `title` = author name). When such a block is *first seen* on my screen (use the existing `seenBlocks` newness), the dot pulses for ~8s (CSS animation, then settles).
- This must not disturb locked blocks (no dot) or the calm of one's own blocks (no dot on your own).
**F2. Vera-lite block identity.** Each `.node` type gets a **3px solid left border in its full PALETTE hue** (`border-left` is fine — it's not animated). Keep washes as they are. Rebuild's toolbar gets a whisper of lock-purple: `background: color-mix(in srgb, #7c3aed 4%, var(--card))` — post-reveal surface only.
**F3. Momo parked** except the A4 copy wins above.

## Part G — Tests (update + add in `e2e-playwright.js`)
- Update rosette regex to `saddle-ready`.
- Reveal: wait for `#reveal-go` to be *visible* (staged at +1.5s).
- Add: room view topbar contains no host code (A1).
- Add: author dot appears on a teammate-authored block (drive Sam to author one block on AP Squad's canvas, assert Alex sees `.authordot`).
- Add: race card contains the riders line ("ridden by").
- Keep ALL existing assertions green (59 currently + the additions). Also run `node e2e.js` (34) — must stay green since the server is untouched.

## Acceptance
Both suites green; no `<svg` text leaks; no banned vocabulary pre-reveal (grep team-facing strings); no new font families; `node -c` clean is not applicable (HTML) — verify by loading the page headless without `pageerror`.
