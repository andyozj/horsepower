# Horsepower — Brand & First-Impressions Audit

**Lens:** "Does this feel EXPENSIVE?" — judged as if Anthropic's IPO depended on the screenshot.
**Method:** Self-hosted a full live room (Farrier + 3 participants, 2 teams) at `localhost:3200`, walked the entire journey as a first-time participant AND as the facilitator, captured every screen at deviceScaleFactor:2 (2880×1800) → `qa-design/brand/NN-name.png`, plus literal squint copies (`ffmpeg gblur sigma=18`) → `qa-design/brand/squint/`. No app files edited.
**Idiom is LOCKED** (hand-drawn paper/ink, horse-flavoured charm, Fraunces/Inter/Caveat). I judged execution-against-premium, not the idiom.

**Headline verdict:** This is already a *good-taste* product — the participant journey is genuinely premium in three or four places and never embarrassing. It is NOT yet a *uniformly* expensive product, and the gap is concentrated and nameable: **the Farrier console speaks a different, cheaper brand than the canvas**, and **two structural rooms (the team picker, the share-room-view after-map) read sparse/assembled rather than designed.** Fix the console's register and you close ~70% of the perceived-quality gap.

---

## Where quality drops

Numbered, with severity, the evidence file, what cheapens it, and the prescription.

### 1. The Farrier console is a generic SaaS admin dashboard — SEVERITY: HIGH
**Evidence:** `17-console-rebuild.png`, `15-console-mirror.png`, `14-console-lobby-2teams.png`; squint `squint/17-console-rebuild-blur.png`.
The participant world is warm paper, ink, big Fraunces, hand-drawn nodes. The console is **stat tiles** (`2 / 0 redesign-ready / 0 still capturing / 0 orphans blocking`), a **dense data table** (Team · Online · Progress · Flags · Status · Coach whisper) in small Inter, and conventional approve/deny chips. At the squint test it dissolves into a **beige Notion/Linear admin page** — nothing survives that says "Horsepower." This is the single biggest white-label failure: strip the logo and the console is indistinguishable from any internal ops tool.
**Why it cheapens:** It breaks the "one personality across 13 screens" test. A facilitator demoing their own screen (and the Farrier *is* a senior person in the room) is looking at the least crafted surface in the product. The methodology lives here — the locked-constraint amendment, the human-landing watch — and it's dressed as a spreadsheet.
**Prescription (the highest-leverage single move in the whole audit):** Re-skin the console in the canvas's own language without losing density. (a) Stat tiles → ink-bordered **paper cards** with the §-glyph set and a Fraunces numeral (the timer already proves big Fraunces numerals look expensive — `16-room-view-timer.png`). (b) The team table → **roster rows that look like the lobby stable** (steed glyph + Fraunces team name + a single calm status), not a CSV. (c) Keep the run-bar/stepper, but let the "Needs you" callout use the same warm-amber card as the participant gate pill, not a flat banner. The information architecture is already excellent — only the *finish* is admin-grade.

### 2. The team picker is sparse and unanchored — SEVERITY: MEDIUM
**Evidence:** `03-team-picker-ontology.png`.
"Pick your stable" with a strong Fraunces headline, but the left half is **three floating ontology blocks (Persona / Trigger / Phase) marooned in dead space** with one Caveat annotation ("Persona — who owns it"). It reads like an unfinished slide, not a designed teaching moment. The right-side "start a stable" card carries all the weight; the ontology tour — which is the *point* of this screen — looks like clip-art blocks dropped on a beige field.
**Why it cheapens:** First real screen after the polished landing, and the energy drops. The blocks don't relate to each other (no arrows, no implied flow) so the "map a process" promise underneath the headline isn't demonstrated.
**Prescription:** Give the ontology blocks a **real micro-map** — connect them with one hand-drawn arrow so they read as a tiny worked example (Trigger → Phase, Persona attached), and tighten the column so the left isn't 55% empty. Either make the tour a confident demonstration or shrink it to a caption; the in-between is the problem.

### 3. The share room-view "after" map is overlapping and thin — SEVERITY: MEDIUM
**Evidence:** `21-room-view-share.png`.
The projected double-reveal is the **trust-test screen** (the Heineken exec sees this on the wall). The "What it became" panel has nodes **physically overlapping** ("Finance Analyst" colliding with the "continuous reconcile agent" block, "…ERSONA" label clipped) and the rebuilt map is sparse enough to look unfinished next to the original.
**Why it cheapens:** On a projector, overlap reads as a bug, not a workshop-in-progress. This is the money shot of the whole exercise and it's the least composed of the room views.
**Prescription:** The room-view mini-maps need **auto-layout / collision nudging** for the projector (the working canvas can stay free-form; the *presented* version should never overlap). Even a simple force-apart pass before render would lift this from "their map glitched" to "look what they built."

### 4. On-canvas typed blocks read "sticky-note tool," not "premium" at squint — SEVERITY: LOW–MEDIUM
**Evidence:** `06-surface-built-inspector.png`; squint `squint/06-surface-built-inspector-blur.png`.
The per-type hue borders and rough strokes are good craft up close, but blurred, the nodes read like a competent generic diagramming app (Miro/Excalidraw register) rather than the bespoke paper world the rest of the product earns. The node label type is small and the boxes are a touch flat.
**Why it cheapens:** The canvas is where participants spend 80% of their time, so its *baseline* register sets the felt quality. It's "good app," not "expensive object," and it's the gap between the canvas and the landing/lobby/reveal.
**Prescription:** This is fine-tuning, not a rebuild. Slightly warmer paper-tint on node fills, one notch more shadow-on-hover separation (per §12, already specced), and a hair more type size/weight on labels would push it from "tool" to "crafted." Lowest priority of the four — it's already competent.

### 5. The lobby/room-view code "4" is a different weight than its letters — SEVERITY: LOW (cosmetic)
**Evidence:** `13-room-view-lobby.png`, `12-console-lobby-setup.png`.
In the giant Fraunces code, numerals render visibly lighter/narrower than the caps (e.g. "TW**4**B"), giving the hero code a slightly inconsistent colour.
**Prescription:** Use Fraunces' optical/weight settings (or a tabular/heavier numeral axis) so digits match the caps' weight. Trivial CSS, but it's the hero of the projector screen — worth getting exact.

---

## Squint-test results per major screen

| Screen | Survives the squint? | Verdict |
|---|---|---|
| **Landing** (`01`) | Wordmark dominates, CHALLENGE stamp + yellow CTA + corner steed watermark all read | **Premium** — brand, hierarchy, intent all intact |
| **Lobby / Meet the Coach** (`04`) | Giant "TW4B", green steed on the fence, Coach-cap panel | **Premium** — warmth and intent survive completely |
| **Swap reveal** (`09`) | Red letterpress stamp + yellow accent words punch through navy scrim | **Premium** — the single most cinematic moment; pure drama at any blur |
| **Surface canvas** (`06`) | Coloured typed blocks stay distinct, toolbar + Coach rail anchor edges, gate pill survives | **Good** — hierarchy holds, but reads "tool" not "object" |
| **Share double-reveal** (`18`) | Headline holds, two before/after panels read as distinct, red "what died" diff legible | **Good** — editorial structure survives the blur cleanly |
| **Room-view timer** (`16`) | Huge Fraunces "10:00" + caption + corner code | **Premium** — calm, projector-perfect |
| **Console rebuild** (`17`) | Dissolves to beige stat tiles + faint table; only the yellow timer/CTA survive | **CHEAP** — reads as generic SaaS admin; no Horsepower DNA survives |

The pattern is unambiguous: **everything participant-facing survives the squint with brand intact; the facilitator console fails it.**

---

## What's genuinely premium already

- **The swap reveal (`09`, `09b`).** Navy scrim, red "REDESIGN / DON'T RETROFIT" letterpress stamp, the staged "Plot twist…" copy with bolded turns, yellow "Let's build" CTA. This is *designed*, not assembled — it would stop a room. Best single moment in the product.
- **The lobby (`04`).** The giant Fraunces join code, the steed cantering onto a hand-drawn fence, the "Meet your Coach" teaching vignettes with the Coach-cap glyph. Confident, warm, and it teaches while it waits. Keynote-grade.
- **The race card / keepsake (`20`, `22`).** Steed glyph, Fraunces team name with a Caveat-yellow highlighter underline, flag/lightning glyphs, "RAN AT TW4B · date", Save-as-card. A genuinely giftable object — the kind of detail that makes people screenshot and share. This is taste.
- **The room-view timer throne (`16`).** Proves the design system can carry a projector with nothing but big Fraunces and restraint.
- **The landing (`01`).** Wordmark, CHALLENGE stamp, the "Saddle up" card with the live steed + shuffle. Sets the bar high.
- **The horse metaphor is charming-confident, not twee** — in the *participant* surfaces. The steed-as-identity, "stable," the fence, "ridden by," "saddle up" all earn their place because they're rendered as bespoke ink glyphs, never emoji/clip-art. The one place the metaphor strains toward cute-overload is the console guidance copy ("GET EVERYONE ABOARD," "the room's energy dips") layered on an un-crafted dashboard — there the flavour text writes a cheque the visuals don't cash.

---

## 3 keynote screens / 3 hide-these screens

**Proud to put in a keynote:**
1. **Swap reveal** (`09-swap-reveal.png`) — the cinematic peak; no apology needed.
2. **Lobby / Meet the Coach** (`04-lobby-meet-coach.png`) — proves charm + craft + teaching in one frame.
3. **Room-view timer throne** (`16-room-view-timer.png`) — or the **race card** (`20`) as the emotional closer. Both read expensive.

**Would hide:**
1. **Console rebuild dashboard** (`17-console-rebuild.png`) — the white-label failure; reads as someone's internal ops tool. (Issue #1.)
2. **Team picker** (`03-team-picker-ontology.png`) — sparse, unanchored, energy-drop right after the strong landing. (Issue #2.)
3. **Share room-view** (`21-room-view-share.png`) — overlapping nodes on the projector's money shot. (Issue #3.) The console mirror (`15`) is a close runner-up for the same dashboard-register reason.

---

## Verdict — the single investment that most raises perceived quality

**Re-skin the Farrier console in the canvas's own paper-and-ink language.** (Issue #1.)

The participant journey already clears the "premium workshop tool" bar — in places it's keynote-grade. The product's *one-personality* test fails on exactly one actor's screens: the Farrier's. And that actor is the most senior person in the room, often mirrored or glanced-at, and the methodology (locked constraints, human-landing, amendments) literally lives on those screens. Today they're dressed as a SaaS spreadsheet.

The information architecture of the console is genuinely good — do **not** touch the structure. Only change the *finish*: stat-tiles → ink-bordered paper cards with Fraunces numerals (the timer already proves this looks expensive), the team table → lobby-stable-style roster rows, the "needs you" banner → the warm-amber gate-card treatment. That one pass takes the product from "premium for participants, admin tool for the facilitator" to **one confident personality end to end** — which is the difference a Heineken exec, or an IPO prospectus, actually feels.

Second-highest leverage if budget allows: fix the projected after-map overlap (#3) so the trust-test money shot is clean.

---

*Artifacts: `qa-design/brand/01–22*.png` (deviceScaleFactor:2), squint copies in `qa-design/brand/squint/`. Driver: `qa-design/brand-driver.js` (drives the running server; no app files modified).*
