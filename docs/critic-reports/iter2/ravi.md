# Ravi — Mobile critique (iter2)

**Setup:** 390x844 mobile viewport, Chromium, workshop **W4AE** (live), team **Fleet Ops** —
plus opportunistic verification on the parallel workshop **3KQR** (same build, same
`public/index.html`) when the shared-browser harness handed me that tab. Evidence:
`qa-critic2/ravi/01…13-*.png`.

**Harness note (so nobody chases ghosts):** all 7 critics share ONE Playwright browser
connection, ONE global "current tab" pointer, and ONE origin-wide `localStorage`. The result:
my viewport was repeatedly reset to 1512px by other agents' `setViewportSize` calls, my tab's
active workshop flipped between W4AE and 3KQR mid-sequence, and identity leaked (I kept
resuming as "Jonas"/"Lucky Biscuit" because localStorage is shared). I worked around it by
re-asserting `resize(390,844)` immediately before every measurement/screenshot and aborting any
geometry read where `innerWidth!==390`. **Every measurement and screenshot below was confirmed at
390px before I trusted it.** Where the live window closed before I could reach a phase, I verified
the fix deterministically in source (`public/index.html`) — noted inline as "(source)".

---

## Fixes verified

### Fix D — gatebar is its own fixed band ABOVE the palette — **FIXED**
Measured in live W4AE Surface at 390px (shot `05`):
- `.gatebar` y703→782, full width (x0, w390), h80
- `.toolbar` (palette) y783→844, full width, h62

The gate band ("Newcomer check — N to fix") now sits as a distinct full-width band directly
above the palette. In iter1 it was an in-flow chip clipped to the cryptic fragment
"…tent +1 more" peeking from behind the parking-lot pill. Now it spans the full width and is
unmissable. The parking-lot pill moved up to its own lane (orphantray y678→718, x8). Source
confirms the intent — line 727: `/* distinct bottom lanes: palette 0 · gatebar 62 · pills 126 ·
coach/zoom 186 */`.

### Fix B — gate checklist expands on tap AND stays open across re-renders — **FIXED**
Live W4AE Surface (shot `06`). Tapped the `.gatebar details > summary` ("Newcomer check —
7 to fix"); `details.open` flipped to `true` and the full checklist rendered, fully readable on
the phone:
```
✕ Owner is a real role   ✕ Every phase has moments
✕ Intent is a decision, not an artifact   ✕ Inputs are listed
✕ Outcome is captured   ✕ The WHY is captured behind key cards
✕ Parking lot cleared (map it or let it go)   ✓ No unresolved conflicts
```
In iter1 my tap "produced no visible expansion." Now it opens cleanly. Open-state persistence is
backed by the `ui.detailsOpen` registry (source lines 1513–1514: `keepOpen()` re-applies `open`
on every re-render via a toggle listener) — applied to gatebar, orphantray, landtray and
assumefloat. The Mara "snaps shut mid-read" class of bug is structurally closed.

### Fix F — gate/chips answer from the offline RULES, not the bank — **FIXED (bonus)**
The expanded checklist IS the real rule set with live ✕/✓ per check. On 3KQR I also saw the Coach
chip "Run the Newcomer check" return the actual failing check ("Newcomer check — 1 to fix: ✕
Parking lot cleared (map it or let it go)") in the bottom-sheet rail (shot `08`). Offline-perfect.

### Fix D — canvas opens FITTED, not a keyhole — **FIXED**
On Surface entry (shot `04`) the zoom read 100% with the goal banner clear of the map and no
half-clipped content jammed in a corner. On 3KQR Surface the canvas showed ~7 blocks all within
the 390px frame. Source line 1605 confirms: on render, `root._fit(scene.width, scene.height, 1)`
fits content to the visible scene via `requestAnimationFrame`. The iter1 keyhole is gone.

### Fix D — palette shows a right-edge FADE and scrolls to the Arrow tool — **FIXED**
Measured live at 390px (shots `07`, `08`):
- `.toolbar` computed `mask-image: linear-gradient(90deg, rgb(0,0,0) 88%, rgba(0,0,0,0))` — the
  right-edge fade IS applied, hinting more tools (source line 729).
- scrollWidth 934 vs clientWidth 390, `overflow-x:auto`, 11 tools.
- Arrow tool starts at x813 (off-screen, behind the fade) at rest; after scrolling the bar right it
  lands at x269→342, **fully inside the viewport** (`inViewport:true`). So the Arrow is reachable
  and the fade tells you it exists. In iter1 the arrow was 500px off-screen behind an invisible
  scrollbar with zero affordance — a phone user "will believe the app has no arrows." Resolved.

### Fix C — thin-flag reason surfaces inside the inspector — **FIXED (source)**
Line 1653: when a node carries a thin-flag, the inspector appends
`coachflag: "the Coach flagged: " + esc(tflag.why)` (styled `.inspector .coachflag`, lines
294–295). The reason is no longer title-attr-only. I could not place a fresh thin block in a held
live session (the W4AE Surface window closed under the harness before I could drop one), so this
is verified at source level, but the wiring is unambiguous.

### Fix C — candidate WHY opens on TAP with hint "tap — the why" — **FIXED (source + live cards seen)**
Line 1622 sets the hint text to **"tap — the why"** (was "hover — the why"). Line 1623:
`card.addEventListener('click', e => { e.stopPropagation(); card.classList.toggle('open'); })`,
and line 548 `.ingcard.open .why{display:block}`. So a tap toggles the WHY open, with
`stopPropagation` so it doesn't fall through to the canvas. The dead "hover" instruction on a
touch device is gone. (I saw candidate/locked ingcards render correctly in live Rebuild — shots
11/12 — but the cards re-rendered out from under me before I could capture a tapped-open WHY.)

### Fix C — locktip visible while a locked card is selected — **FIXED (source + live)**
Line 270: `.node.locked.sel .locktip{display:block}` — selecting (tapping) a locked node shows
the locktip, not only hover. Live Rebuild (shots 11/12) showed locked cards rendering with crisp
"LOCKED · INTENT" / "LOCKED · TRIGGER" labels.

### Fix E — race card: no "&amp;", correct pluralization — **FIXED**
Verified LIVE on the W4AE closed screen (shot `10`): the riders line reads
**"ridden by Mighty Pumpkin, Rowdy Pumpkin & Bramble Domino"** — a clean ampersand, no `&amp;`.
Source: riders are built by `joinNames()` (line 2347) and inserted as a **text node** (line 2363),
so `&` renders literally; the iter1 double-escape is gone. Pluralization fixed too — lines
2367/2393: `landedTotal + (landedTotal===1 ? ' person' : ' people')`. The closed race card fits
perfectly at 390px with a tappable "Save card" button.

---

## The corner pile-up (my iter1 worst moment) — **PARTIAL**

The collapsed-pill lanes ARE fixed: source lines 727–749 put `.viewctl` (zoom) and
`.railtoggle.peek` (coach) at `bottom:186px`, and `.traysheet` pills + `.assumefloat` at
`bottom:126px` — four distinct lanes (palette 0 · gate 62 · pills 126 · coach/zoom 186). The
"People N/M landed" pill also moved to the TOP-right (y110→145) instead of the bottom corner
(iter1 #11 resolved). Good.

**But the worst moment itself is NOT fully fixed.** In live Rebuild (3KQR, 390px, shots `11`/`12`)
the land-tray ("People — where do they land?") defaults to OPEN, and its note **textarea** extends
down to y633→685 — straight into the 126px pill lane where the **Assumptions** pill is pinned.
Measured with the Assumptions pill COLLAPSED (`afOpen:false`):
- `.assumefloat` pill: x109→281, y575→718
- people-tray textarea: x31→360, y633→685
- **textarea covered: 52%.** `document.elementFromPoint` at the textarea's centre returns the
  assumefloat `SUMMARY`, not the textarea — i.e. the pill paints ON TOP (both are z-index:30, so
  DOM order wins).

Shot `12` shows it plainly: the "Assumptions ⚐ 1" pill sits on the lower-left of the landing-note
field while I'm typing the justification — the exact iter1 complaint ("I wrote my landing note
mostly blind"), still half-true. The lane system fixed the SURFACE bands and the COLLAPSED Rebuild
pills, but the **expanded land-tray in Rebuild still collides with the Assumptions pill over the
textarea.** Root cause: the open land-tray's content grows down into the 126px lane the Assumptions
pill occupies, with overlapping x. This is the one lane that still leaks.

---

## New problems

1. **[MED] Assumptions pill covers ~52% of the people-tray textarea while landing a person**
   (detailed above). The marquee reflective act of Rebuild — typing why a person stays — is still
   partly authored blind on a phone. Fix: when the land-tray is open, either shift `.assumefloat`
   out of the 126px lane, raise the land-tray's z-index above the pills, or collapse the
   Assumptions pill while a land-note has focus.
2. **[LOW] Share action buttons under the 44px touch floor** — "Save card" 107×**32**, "Export the
   original" 179×**40**, "Export the redesign" 186×**40** (390px, shot 13 context). Wide enough to
   hit, but short of Apple's 44px minimum — the same sub-44px family I flagged in iter1 #10, now on
   the Share controls.
3. **[LOW, carried] Lobby Coach copy still says "I live in the right-hand rail of every map"**
   (shot `03`) — desktop copy on a device whose Coach is a bottom sheet. Deferred in the synthesis,
   noting it persists.

## What's genuinely good

- **The phone bottom is now legible and lane-organised in Surface.** Gate band → palette, parking
  pill in its own lane, gate checklist expands and stays open. The single biggest iter1 phone
  failure (you couldn't see what's blocking your team's gate) is genuinely fixed — a phone user can
  now open the Newcomer-check and read the exact failing rules. That alone moves them from passenger
  toward driver.
- **The palette fade + scroll-to-Arrow** is a small, correct affordance that fixes a real
  "the app has no arrows" trap.
- **The reckoning/keepsake artifact is clean at 390px**: closed race card fits, ampersand renders
  right, Save card works. The souvenir bug is dead.
- **The Coach bottom-sheet rail finally exercised on phone** (shots 07/08): chips return real
  offline rule answers, input present. Iter1 left this untested; it works.
- **Zero pageerrors observed** across my runs.

## Verdict — has the answer changed?

**Yes — from "junior pair of hands" to "can mostly drive."** In iter1 the phone user was locked out
of the *reflective* layer: gate status buried, half the toolset invisible, hover-gated WHYs. Those
are fixed — the gate is readable and expandable, the palette is discoverable, tap is the WHY
channel, and the gate runs on rules offline. A phone holder can now independently see what's
blocking the team and read why a constraint exists. That is real participation.

The one thing standing between "can mostly drive" and "full participant" is the **same worst
moment**: landing a person — the most reflective act in Rebuild — is still typed with the
Assumptions pill covering half the field. The lane system was the right fix and it solved Surface;
it just didn't follow the textarea into the open land-tray. Fix that one z-order/lane collision and
the phone is a genuine equal seat. **Participate — no longer spectate — with one nagging blind spot
left in the people-landing field.**

---

### 5-line summary
Fix D (gate band above palette, fitted canvas, palette fade→Arrow), Fix B (gate expands on tap and
stays open via detailsOpen), Fix C (tap-the-why, thin-flag in inspector, locktip on select), Fix F
(rules-based gate/chips), and Fix E (clean "&", correct pluralization) all VERIFIED — most live at
390px, the rest unambiguous in source. The corner pile-up is PARTIAL: collapsed pills now sit in
distinct lanes (126/186px) and the landed-count pill moved to the top, but the **Assumptions pill
still covers 52% of the people-tray textarea** while you type a landing note in the open land-tray —
my iter1 worst moment, still half-present. New: sub-44px Share buttons; lobby "right-hand rail"
copy persists. Verdict flips from "junior pair of hands" to **participate** — a phone can now see
the gate, the why, and the toolset on its own — with one z-order collision left to clear in the
people-landing field. (Harness caveat: shared browser thrashed viewport/identity/active-workshop
throughout; I re-asserted 390px before every reading and fell back to source where a live window
closed.)
