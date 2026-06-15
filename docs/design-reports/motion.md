# Motion Audit — Horsepower 🐎

**Auditor lens:** world-class motion design, IPO-grade. Idiom locked: hand-drawn paper/ink, signature boiling line, draw-on chalk arrows, riseSettle entrances, canter/trot characters. Law: *the working canvas stays calm; play lives in waiting/transition moments* + GPU-only + `prefers-reduced-motion`-safe.

**Method:** self-hosted a live room on `localhost:3200`, drove every phase with Playwright, recorded per-moment `webm` clips → `qa-design/motion/`, then extracted frame sequences with `ffmpeg` (50–400ms cadence) and **read the frames** — timing/easing judged from real frames, plus pixel-diff measurement of the boil cadence. Reduced-motion verified in a `reducedMotion:'reduce'` context (screenshot proof). Clips: `landing`, `picker`, `lobby-ride`, `journey` (Surface→reveal→Rebuild→Share, the money shot), `gate-rosette`, `time`, `toasts` + 8 reduced-motion stills.

**Evidence index (selected):** `qa-design/frames/reveal_sheet.png`, `slam_sheet.png`, `reveal/r_020.png` + `r_030.png` (reveal staging) · `boil_diff.png` + boil-cadence pixel table (§ The Boil) · `rebuild_boil_diff.png` (locked cards don't boil) · `landing_hi/h_001.png`+`h_007.png` (landing entrance) · `lobby/t_4.0.png`+`t_9.5.png` (paddock + vignette) · `picker_4.0.png`+`picker_7.5.png` (tour caption cycle) · `motion/reduced-*.png` (reduced-motion completeness).

---

## Problems

### 1. The race-card "deal" flip animates off-screen — the single most premium entrance is never seen — SEV: HIGH
**Evidence:** `qa-design/frames/racecard_deal_sheet.png` (20fps over the deal) shows the page *scrolling* the already-settled card into view; the `raceIn` keyframe (`rotateY(70deg)→0`, `.5s`) has already finished by the time the card is on-screen. The Share page is a tall scroll; `.racecard` sits at the very bottom and animates on render, while the viewport is still up top.
**Why it matters:** `raceIn` is the keepsake payoff — the one genuinely cinematic 3D flip in the app — and most users will never witness it. It's a wasted hero beat.
**Prescription:** gate the flip on visibility. Add an `IntersectionObserver` on `.racecard` that adds the `.dealt` class (which carries `animation:raceIn .5s cubic-bezier(.2,1.2,.3,1) both`) only when ≥40% in view; render it `opacity:0` until then. Keep the existing `.5s` duration and the `cubic-bezier(.2,1.2,.3,1)` overshoot — they're right. ~10 lines, no new dep.

### 2. The landing hero "mini-workflow that draws itself in" is invisible during draw-on — SEV: MEDIUM-HIGH
**Evidence:** `landing_hi/h_001.png`→`h_007.png` (50ms steps): at first paint the knight-glyph is mid-sketch but the **hero mini-workflow sketch is a near-invisible ghost** (the value props on the right name it, and `reduced-landing.png` reveals it fully — "the AP team → the WHY → invoice lands → check & chase → the 3pm chase → suppliers front us"). Under normal motion its `sketchIn` draw-on plays at such low contrast/opacity against cream that it reads as paper grain, not a drawing. The wordmark, by contrast, hard-renders near-solid at frame 1 (it does *not* draw on, despite the spec line "wordmark + card rise-and-settle").
**Why it matters:** the landing's whole promise is "the product demoing itself by drawing a map." That story is lost; first paint reads as a static poster with a faint smudge.
**Prescription:** (a) raise the draw-on stroke contrast during `sketchIn` — animate `stroke` from `--line-soft` to full `--ink`/`--red-pen` over the draw, or hold the strokes at ~0.85 opacity instead of fading. (b) Slow the hero map draw to ~1.4–1.8s (currently the strokes resolve faster than the eye catches at this contrast) and **delay it ~250ms** so the glyph sketch leads, then the map draws — a clear two-beat reveal. (c) Optional: give the wordmark a 600ms `sketchIn` mask so it too "writes itself," matching the spec.

### 3. Reveal scrim cross-fades back to the Rebuild canvas as a flat dissolve — no "teardown re-enters left→right" is perceptible — SEV: MEDIUM
**Evidence:** `rebuild_enter_sheet.png` (15fps, first 1.6s of Rebuild) shows the full teardown — locked cards, candidate, people tray — **present and static from the first frame**; no left→right cascade. The `B1` left→right stagger (`index.html:1635`) only orders `c.blocks` (the seeded locked nodes); the candidate/concern/person cards are `opts.overlays` (ingcards) and get no stagger. The CLAUDE.md "teardown re-enters left→right" reads as aspiration, not shipped behaviour on this path.
**Why it matters:** the reveal's emotional arc is "your old world is gone → here's the stranger's wreckage, reckon with it." A hard cut to a fully-assembled board drops the reckoning beat. The cards arriving scattered, one-by-one, *is* the "scrambled, Coach-placed" delivery made physical.
**Prescription:** extend the `B1` stagger to overlays. On first Rebuild paint, sort all teardown cards by `x`, apply `fragFly`/`riseSettle` with `animation-delay: i*70ms` (cap total at ~900ms via the existing stagger cap). Stamp/twist easing is already excellent — don't touch the reveal overlay; just make the *board behind it* assemble when "Let's build" clears the scrim.

### 4. `riseSettle` vs `heroRise` vs `canterIn` vs `vignetteIn` vs `flipIn` — five overlapping "entrance" keyframes, one tempo split across two durations — SEV: MEDIUM (system hygiene)
**Evidence:** keyframe tally — `riseSettle .55s` (×3) **and** `riseSettle .5s` (×1, on `.racecard`/`.led`), `heroRise .55s` (×2, a near-duplicate of riseSettle with an extra `rotate(var(--rot))`), `canterIn .5s`, `vignetteIn .45s`, `phaseIn .28s`, `flipIn .5s`, `raceIn .5s`, `fragFly .6s`. Easings are *mostly* unified on `cubic-bezier(.2,.9,.3,1.2)` (9 uses) with three near-clones (`.2,1.2,.3,1` · `.2,.9,.3,1.3` · `.18,1.5,.35,1`).
**Why it matters:** entrances are *almost* one system — close enough that the inconsistencies read as bugs, not intent. `heroRise` and `riseSettle` are functionally the same gesture at the same duration; the `.5s`/`.55s` split on the same keyword is an accident.
**Prescription:** collapse to **one entrance primitive** + documented variants. Define `--ease-settle: cubic-bezier(.2,.9,.3,1.2)` and `--ease-pop: cubic-bezier(.18,1.5,.35,1)` (the slam) as tokens (alongside `--t-fast`/`--t-med`); add `--t-enter:.5s`. Make `heroRise` an alias of `riseSettle` (it's only `+rotate`, which can ride on a CSS var). Pick ONE entrance duration (`.5s`) for all rise-style entrances. Keep `flipIn`/`raceIn`/`canterIn` as deliberate *character* variants — those earn their distinctness.

### 5. Durations are hard-coded literals, not tokens — `--t-fast`/`--t-med` exist but only ~6 of ~28 animations use a token — SEV: LOW-MEDIUM
**Evidence:** only `transition` properties use `var(--t-fast/med)`; every `@keyframes` consumer hard-codes `.55s`, `.32s`, `2.2s`, `16s`, etc. There is no `--t-slow` / `--t-enter` / character-loop token. Tempo is *implicitly* consistent (entrances cluster ~.5s, micro-feedback ~.3s, idle loops 2–3.4s) but nothing enforces it.
**Prescription:** promote the de-facto scale to tokens: `--t-fast:.12s; --t-med:.2s; --t-enter:.5s; --t-settle:.55s; --t-feedback:.3s; --t-idle:2.4s`. Refactor keyframe consumers to reference them. This is the difference between "looks consistent today" and "stays consistent through the next 20 edits."

### 6. Three perpetual idle loops run forever and risk the "restless waiting room" — SEV: LOW
**Evidence:** `.saddle{shimmer 2.4s infinite}`, `.breathe{2.2s/3.4s infinite}`, `.vdots i{breathe 1.2s infinite}`, `.trot{trotAcross 16s infinite}`, `.timer.low{pulse 1s infinite}`. In the lobby (`lobby/t_4.0.png`) and the rebuild Agent-tool spotlight, multiple infinite loops can be on-screen at once. The team already learned this lesson (CLAUDE.md: "finite orphan wiggle… perpetual animations break click stability"), and capped most one-shots, but a few perpetuals remain on waiting screens.
**Why it matters:** "charming or restless" is a knife-edge. A breathing CTA + a shimmering word + a trotting horse + breathing dots simultaneously tips toward restless.
**Prescription:** audit co-occurrence. Allow **at most one** perpetual idle per visual zone. The `pulse 1s infinite` on `.timer.low`/`bigtimer.low` is justified (urgency) — keep. The lobby `breathe` + `shimmer` + `trot` should not all run together; stagger or pick one as the zone's "heartbeat."

### 7. `.timer.low` countdown pulse is an `opacity` blink (`pulse{50%{opacity:.5}}`) — reads as a glitch under the calm idiom — SEV: LOW
**Evidence:** `pulse 1s infinite` halves opacity at the midpoint. A 50% opacity blink on a number is a harsh, digital-alarm gesture — off-idiom for hand-drawn paper, and on the projected room view it's the most aggressive motion in the app.
**Prescription:** replace the opacity blink with a **scale heartbeat** (`transform:scale(1)→scale(1.04)→scale(1)`, GPU-clean) or a warm color throb (`color` to `--loud-red` and back) at a slower 1.4s. Urgency without the strobe.

### 8. The boil is technically the one place "GPU-only" bends (SVG `d`-attribute swap = paint) — acceptable, but undocumented — SEV: INFORMATIONAL
**Evidence:** `index.html:1531` — a 100ms `setInterval` swaps the `d` attribute on rough-box/arrow paths. Attribute swaps re-rasterize the path (a paint), not a compositor-only transform/opacity. It is tiny (geometry only, no layout/reflow), DOM-scoped (skips off-DOM paths), `REDUCED`-gated, and *is the signature of the entire craft* — a justified, deliberate exception. Flag it only so a future reviewer doesn't "fix" it into a transform and kill the boil.
**Prescription:** none — keep as-is. Add a one-line code comment marking it the intentional GPU-rule exception (the §6 boil) so it survives future performance passes.

---

## What's genuinely excellent

- **The boil is a real signature, not noise.** Pixel-diff over a static map (`boil_diff.png` + cadence table below) proves it: only stroke *outlines* shift frame-to-frame (text/fills static), swaps are **intermittent and de-synced** (66 / 198 / 264 / 462 / 594 / 660ms — irregular per-path periods of 280–340ms with seeded phase offsets, `index.html:1530`), and only ~1–2% of pixels change per swap. This is exactly how a hand-inked frame-by-frame line should breathe — alive but calm, organic not mechanical. **It is the best thing in the motion system.**
- **Semantic boil discipline.** `rebuild_boil_diff.png`: on the Rebuild canvas, *only the gold hand-stroked candidate card boils*; the **locked cards (crisp-dashed) stay perfectly static** — "arrives official is information." The motion carries meaning. This is rare, expensive taste.
- **The reveal staging lands.** Frame-read of `slam_sheet.png` + `reveal/r_020.png` + `r_030.png`: scrim → `stampSlam` (`scale(2.6)→1`, `.38s`, `.33s` delay, overshoot `cubic-bezier(.18,1.5,.35,1)`) → twist copy rises at `+.9s` → CTA rises at `+1.5s`. The frames confirm the beats are *temporally separated* (at +1.9s the CTA is genuinely absent, appearing only by +2.5s) — the staging is deliberate and reads. The stamp's `-14deg→-5deg` settle is a lovely touch.
- **Reduced-motion is complete, not just "off."** All 8 reduced stills are static **and fully usable** — most critically `reduced-reveal.png`, where stamp + twist + CTA are all present instantly (the `backwards`-filled staged animations could have left elements invisible — they don't). The hero landing map, lobby vignettes, and Share all render at full opacity. This is the part teams usually botch; it's airtight here.
- **The picker ontology tour teaches through motion.** `picker_4.0.png`→`picker_7.5.png`: the caption cycles in the Coach's red hand ("Trigger — what kicks it off" → "Intent — the WHY: a decision, not a report") with the highlighted node tracking it, on a self-drawing ontology map. Calm, characterful, on-brand, and it *onboards a non-technical room* exactly as the PRD demands.
- **Easing intent is coherent.** 9 of ~13 eased animations share `cubic-bezier(.2,.9,.3,1.2)` — a single, slightly-overshooting "settle" personality that gives the whole app one body language.

---

## 3 worst / 3 best

**3 worst motion moments**
1. **Race-card deal flip plays off-screen** (Problem 1) — the most premium entrance, never seen.
2. **Landing hero map draws on invisibly** (Problem 2) — the "product demos itself" story is lost at first paint.
3. **Rebuild board hard-cuts in fully assembled** (Problem 3) — the reveal's reckoning beat (scattered cards arriving) is dropped to a flat dissolve.

**3 best motion moments**
1. **The boiling line** — de-synced, stroke-scoped, semantically disciplined (locked cards don't boil). The signature, and it's world-class.
2. **The swap reveal staging** — scrim → stamp-slam → twist → CTA, temporally separated, with a perfect overshoot. The money shot earns its name.
3. **Reduced-motion reveal** — every staged element present and complete instantly. Invisible craft, flawlessly executed.

---

## The boil — measured cadence (evidence for §"excellent")

Per-frame changed-pixel count on a *static* Surface map, 30fps (`compare -metric AE -fuzz 8%`, cropped to the node region). 0 = no change; spikes = a stroke frame-swap:

```
~66ms  2645px   ~198ms 1196px   ~264ms 2425px   ~462ms  213px
~594ms 1705px   ~660ms 1374px   ~858ms 1337px   ~990ms 1018px
~1056ms 1346px  ~1188ms 1234px  ...  (most intervening frames = 0)
```
Irregular spacing + low amplitude + intermittency = a genuine hand-inked boil, not a mechanical strobe.

---

## Verdict

**This is shippable, IPO-grade motion with three fixable gaps.** The signature — the boiling line — is genuinely excellent and, crucially, *semantically disciplined*: it carries meaning (locked vs. hand-stroked), stays scoped to strokes, and de-syncs so it never reads mechanical. The two transition tentpoles (the swap reveal, reduced-motion completeness) are executed at a level most funded products never reach. The choreography law — calm canvas, play in the waiting/transition moments — is honored: the working canvas only boils (low, intermittent); the delight lives in landing, picker, lobby, reveal, and share, exactly as specified.

What holds it back from a flat A is **three dropped payoffs** — the race-card flip (animates unseen), the landing hero map (draws invisibly), and the Rebuild assembly (hard-cuts in) — plus **system hygiene** (five overlapping entrance keyframes, durations as literals not tokens). None are deep; all are a focused day's work. Fix the three payoffs (Problems 1–3) and unify the entrance system (Problems 4–5) and this moves from **A− to A**. The boil alone is worth protecting at all costs — do not let a future "GPU-only" performance pass touch it.

**Grade: A−.** Signature-grade craft, three unseen payoffs from greatness.
