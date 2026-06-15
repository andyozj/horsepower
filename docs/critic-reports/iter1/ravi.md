# Ravi — Mobile critique (iter1)

**Setup:** 390x844, `hasTouch:true, isMobile:true`, Chromium. Workshop `VN2E`, joined as "Ravi" → team Fleet Ops. Full journey driven live against the Farrier's pacing (lobby → Surface → swap → Rebuild → Share → close). Evidence: `qa-critic/ravi/01…28-*.png`, driver log `qa-critic/ravi/run.log`, console/page errors `qa-critic/ravi/errors.log` (zero pageerrors/console errors captured for the whole run — credit where due).

**Driver bugs I own (so nobody chases ghosts):**
- My Coach-drawer test FAILED because of *my* selector list — the real toggle is `[data-testid=rail-toggle]` (the 52x52 face button, clearly visible bottom-right in shots 06/14/16). The drawer was therefore **not exercised live on phone**; my assessment of it below is CSS-level only (`public/index.html` line ~709: at ≤860px the open rail becomes a full-width 50%-height bottom sheet — a sane mobile pattern, but unverified).
- My Share "scroll" shots (26-share-scroll-*) didn't scroll: `window.scrollTo` is a no-op because the document body doesn't scroll (an inner container does). Shots 25/26 are both the top of Share.
- "Keyboard overlap" is untestable in headless Chromium (no OS keyboard is rendered); typing itself worked everywhere I tried. Treat keyboard occlusion as **untested**, not passed — the people-tray textarea sits at the bottom half of the screen, exactly where an iOS keyboard would land.

## Problems

1. **[HIGH] The bottom-right corner of the canvas is a pile-up of overlapping floating UI — and it eats real functionality.** On Rebuild, four floating elements stack into the same ~140px corner: the zoom controls, the Coach face button, the "people · 0/1" pill, and the "Assumptions · 0" pill. Shot `20-rebuild-people-tray.png` shows the people pill half-covered by the Coach face with clipped text behind the zoom buttons; shot `21-rebuild-land-typing.png` shows the **Assumptions pill sitting on top of the people-tray textarea while I was typing my landing note** — you literally cannot read what you're typing. My tap on `.assumefloat summary` never visibly opened the assumptions sheet (shot 23), almost certainly because the tap landed on the overlapping element. CSS root cause: `.traysheet{position:fixed; bottom:70px}` + `.assumefloat{bottom:70px}` + `.railtoggle.peek{bottom:128px}` + `.viewctl{bottom:74px}` all anchor to the same band with no collision management (index.html ~726-742).

2. **[HIGH] The Newcomer-check gate — the entire point of Surface — is buried under the parking-lot pill.** The gatebar renders in-flow at the bottom of the canvas pane (`.gatebar`, line 325) while the orphan tray is `position:fixed; bottom:70px; left:8px` on phones. Result (shots 06, 09, 16): the gate chip is clipped to "…tent +1 more" peeking out from behind "parking lot · 0", and my explicit tap on `[data-testid=gate]` produced no visible expansion (shot 13). A phone user cannot see what's blocking their team's gate, let alone fix it. Desktop teammates carried the gate to green; the phone user was a passenger on the core mechanic.

3. **[STRUCTURAL] Teardown WHY is hover-gated — hover does not exist on touch.** `.ingcard .why{display:none}` revealed only by `.ingcard:hover .why,.ingcard:focus-within .why` (lines 539-543), and the on-card hint literally reads **"hover — the why"** (line 1598). The `tabindex:0` on the card (line 1588) means a tap *happens* to focus it and reveal the WHY, but that's luck, not design — the instruction text is a dead instruction on every phone in the room, and tap-to-focus competes with tap-to-select/drag. The WHY is the constraint raw-material the methodology runs on (product rule 1); on mobile it's behind an affordance the device doesn't have.

4. **[MED] The scattered teardown extends past the phone viewport with no signpost.** Shots 19/20: two locked cards are clipped at the right screen edge ("ⓘ LO…"), and the layout audit put scatter coordinates beyond x=390. Same in Surface — a teammate's block was a half-visible sliver at the right edge (shot 14). There's no minimap, no "fit to content" cue I could find, no indication that more map exists off-screen. A phone user sees a keyhole view of the shared canvas and doesn't know what they're missing — on Rebuild that can mean *never seeing a locked constraint*.

5. **[MED] The palette bottom bar hides 6 of 10 tools with zero scroll affordance.** Layout audit: tools span x=8→886 in a 390px viewport; `tool-moment` (x=449), `intent`, `outcome`, `text`, `arrow` are all off-screen, the bar is `overflow-x:auto` with `scrollbar-width:none` and `::-webkit-scrollbar{display:none}` (lines 718-721). The only hint anything scrolls is "Phase" being half-clipped (shot 06). The **arrow tool** — without which you cannot draw flow — is the last item, ~500px off-screen. New phone users will believe the app has four block types and no arrows.

6. **[MED] Share's before/after maps are unreadable postage stamps with no zoom path.** Shots 25/26: the "What it was — Fleet Ops's real process" mini renders blocks at roughly 40x12px — pure decoration. There's no tap-to-expand. The double reveal — the emotional payoff — is legible only on the projector; the phone shows you *that* maps exist, not *what they say*.

7. **[MED] A toast covers an action button on Share.** Shot 27: the "Your moment — confirm or bust their guesses" toast sits directly on top of the second export button (bottom-left stack). Toasts anchored bottom on a phone collide with bottom-anchored actions.

8. **[LOW-MED] During Share, the race card was a blank 125x457px sliver on my screen.** Share audit: `raceCard {w:125,h:457}`, and `27-share-race-card.png` shows empty canvas where it scrolled into view (mid-"dealt last" animation, most likely). It DOES recover: the closed screen (shot 28) shows a full-width, fully legible race card with a working "Save card" button. So the keepsake exists — but during the Share window itself, when the room is actually looking, my phone showed a blank sliver.

8b. **[MED — not mobile-specific, but caught on my screen] Raw `&amp;` in the race card riders line.** Shot 28: "ridden by Restless Sergeant, Lucky Sundae **&amp;** Lucky Nutmeg" — an HTML entity double-escaped into visible text on the keepsake artifact people are meant to save. One of the only text-rendering bugs in the whole run, and it's on the souvenir.

9. **[LOW] Reveal stamp clips off both screen edges.** The stamp SVG is hardcoded `width="430"` (line 773) inside `#reveal{padding:24px}` — 430px into 342px of space. Shots 17/18: the rubber-stamp frame runs off both sides. The choreography (scrim → slam → twist → CTA) otherwise survives and the twist text + "Let's build →" fit fine. Cosmetic, but it's the hero moment, and `max-width:100%` is a one-line fix.

10. **[LOW] Sub-44px tap targets on the landing/picker.** Join/host buttons 296x40, the steed re-roll 85x31, zoom buttons 40x40 (all below Apple's 44px floor; the toolbar's 48px min shows the team knows the rule — it just wasn't applied outside the canvas).

11. **[LOW] "People: 0/1 landed" status pill overlaps the goal banner.** Shots 19/20/21: the dark landed-count pill sits on the goal note's text ("…where AI should act, land every person…" partially covered). Two fixed top-anchored elements, same band.

12. **[LOW] Lobby Coach copy promises "I live in the right-hand rail of every map"** (shot 05) — on a phone the Coach is a floating face + (per CSS) a bottom sheet. "Tap my face if I'm tucked away" is correct; "right-hand rail" is desktop copy shipped to a device that has no right-hand rail.

## What's genuinely good

- **There is a real, deliberate phone layer — this is not a shrunken desktop.** `@media (max-width:760px)` rebuilds the palette as a fixed 48px-target bottom bar, turns trays into pills, pins the Coach as a face button, and the ≤860px rule turns the open rail into a 50% bottom sheet (lines 716-743). Someone thought about phones.
- **A phone can genuinely AUTHOR.** I placed two typed blocks ("driver waits at the gate", "fuel card slip") by tap-palette → tap-canvas → type, the inline label focused correctly, text round-tripped to the server (shots 07-09). Touch-drag moved a block exactly 80px (drag log + shot 15). The inspector ("the back of the card") is a compact popover that fits with room to spare (whyBottom=391 of 844) with tappable capacity chips (shots 10-11). Landing a person — chips + textarea + transforms — worked end-to-end on the phone (landed count flipped to "Build complete", shot 22).
- **Landing, team picker, and lobby are flawless at 390px.** No horizontal scroll anywhere all run (`docScroll sw:390` at every checkpoint — genuinely impressive discipline). The picker's ontology tour, the steed card, the Meet-your-Coach lobby all fit and read beautifully (shots 01-05).
- **Zero console errors and zero page errors across the entire ~7-minute run.** errors.log is empty.
- **The reveal's narrative survives the small screen** — scrim, stamp slam, twist copy naming Ops Crew, staged CTA all landed (shots 17-18), clipped frame notwithstanding.
- **The closed screen is the best mobile screen in the app** (shot 28): "Workshop closed — thanks for riding", then the full race card — what it was / what it became / 1 people landed / RAN AT VN2E · 6/12/2026 — perfectly fitted at 390px with a tappable Save card button. This is what the Share phase should look like on a phone.

## WTF moments

- Typing a person's landing justification — the single most reflective act in Rebuild — **under an opaque pill that covers the textarea** (shot 21). I wrote "owns the eval…" mostly blind.
- An instruction that says **"hover — the why"** shipped to a device where hover is physically impossible.
- The arrow tool — the thing that makes it a *diagram* — parked 500px off-screen behind an invisible scrollbar.
- The gate chip reduced to the cryptic fragment "…tent +1 more" peeking from behind the parking-lot pill.
- The Share "race card" I was promised as a keepsake: a blank 125px sliver.

## Verdict

**A phone can participate — barely, and only in the authoring loop.** Block placement, typing, drag, inspector, people-landing: all genuinely work with touch, which clears the bar most workshop tools miss. But the phone user is **locked out of the reflective layer**: the gate status is buried, the teardown WHYs are hover-gated with hover-only copy, half the toolset and part of the map are invisible without undiscoverable scrolling, the Share payoff is unreadable, and the Coach went un-tested because even my scripted driver couldn't find its way in cleanly. Today a phone holder is a *junior pair of hands* — they can move blocks a desktop teammate tells them to move, but they can't independently see what's blocking the team, why a constraint exists, or what the reveal says. Fix the bottom-band pill collisions (1, 2), kill hover-gating (3), and give the palette a scroll affordance (5), and this jumps from "spectator-plus" to genuine participation.
