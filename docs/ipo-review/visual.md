# IPO panel — visual design review (outward benchmark)

**Date:** 2026-06-13 · **Lens:** visual design, benchmarked against the best of the web 2025-26.
**Scope guard:** the internal 6-critic tribunal (`docs/design-reports/TRIAGE.md`, `REVERDICT.md`,
sign-off YES 2026-06-13) already fixed execution — washes, type floors, shadow tokens, console
finish, runbar grid, race-card clipping. Nothing below re-litigates those. This review asks only:
*what does world-class look like outside this repo, and what can the locked cream-paper/navy-ink
idiom absorb to raise its ceiling?*

**The idiom is locked and is the right call.** Excalidraw's success is the proof of the strategy:
the hand-drawn look lowers the barrier to participation, signals "working document, not deliverable,"
and makes rough contribution feel safe ([Hack Design on Excalidraw](https://www.hackdesign.org/toolkit/excalidraw/),
[Excalimate guide](https://excalimate.com/guides/what-is-excalidraw/)) — exactly what a
brain-dump workshop needs. Everything below deepens that bet; nothing replaces it.

---

## 1. Top 10 recommendations

### 1. Ink engine v2 — variable-width strokes + angle-aware corner softening
- **What:** Upgrade the ~50-line seeded rough-lite engine with two techniques the best ink renderer
  on the web uses: (a) **variable-width filled-polygon strokes** — draw the outline of the stroke
  and fill it, so line weight swells and tapers like a real nib, instead of a constant-width wobbly
  path; (b) **angle-aware corner softening** — quadratic-bezier rounding scaled by corner angle
  (sharp 90° corners get heavy rounding, near-180° corners almost none), with clamping on short
  segments so tiny nodes don't dissolve.
- **Reference:** tldraw, ["Engineering imperfection with draw shapes"](https://tldraw.dev/blog/engineering-imperfection-with-draw-shapes)
  — note they validate Horsepower's existing approach exactly (shape-ID-seeded PRNG so wobble is
  stable across renders; multi-pass strokes with a modified seed per pass — Horsepower's 2-pass
  boil is already this). [perfect-freehand](https://github.com/steveruizok/perfect-freehand)
  (MIT, ~小 single-purpose, vendors as one plain file — exactly the repo's "vendoring is the
  pressure valve" convention) supplies the pressure/velocity-thinned outline math.
- **How it lands here:** arrows are the biggest win — a chalk arrow whose stroke swells mid-run and
  tapers into the head reads as *drawn by someone*, not generated. Node outlines keep rough-lite
  but adopt corner softening. This also unblocks the known "no freehand tool yet" gap with the same
  vendored lib. Boiling line, seeding, and the §6 cadence all survive unchanged.
- **Effort:** **M** (vendor lib + swap path generation; geometry, no new architecture).

### 2. Real paper tooth — feTurbulence grain + a true letterpress emboss
- **What:** The cream surfaces are currently flat color + dot grid; the "paper" is asserted, not
  felt. One inline SVG `feTurbulence` filter (fractal noise, low alpha, `mix-blend-mode:multiply`)
  gives genuine paper grain for ~1KB and zero raster assets. Then take the room-view code — already
  *named* letterpress — and make it physically true: `feTurbulence` + `feDiffuseLighting` +
  `feDistantLight` produces a real debossed-into-paper impression, the way letterpress actually
  bruises the sheet.
- **References:** [Codrops — SVG Filter Effects: creating texture with feTurbulence](https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/),
  [CSS-Tricks — Grainy Gradients](https://css-tricks.com/grainy-gradients/),
  [fffuel nnnoise generator](https://www.fffuel.co/nnnoise/),
  [rough paper texture demo](https://codepen.io/Chokcoco/pen/OJWLXPY). Awwwards'
  [texture collection](https://www.awwwards.com/websites/texture/) shows paper-tooth is a
  consistent SOTD differentiator in 2024-26 print-inspired sites.
- **How it lands here:** grain on **poster surfaces and keepsakes only** (landing, lobby, share
  cards, race card, swap-stamp scrim) — the working canvas stays optically clean per the motion
  spec's "calm canvas" rule. Letterpress lighting on: room-view code throne, the 144px timer
  throne, the CHALLENGE/swap stamp (a stamp *presses*). Static filters, no animation cost; gate
  behind `prefers-reduced-motion`-irrelevant since nothing moves.
- **Effort:** **S** (one SVG filter def + a utility class; tune `baseFrequency` per surface).

### 3. Fill the 15 illustration slots with one "hand" — style-anchor + omni-reference pipeline
- **What:** `docs/image-prompts.md` defines 15 slots (Coach portrait, 8 steeds, fence, trot cycle,
  watermark, OG card…) that have never been generated. 2025-26 image-gen finally makes a
  *consistent* set cheap: generate the **Coach portrait first as the canonical style anchor**, then
  generate every other asset with character reference (`--oref`/`--cref`) for the *who* plus style
  reference (`--sref`) for the *hand*, with omni-weight tuned low enough to allow pose change.
  The existing STYLE BLOCK in image-prompts.md is already a good `--sref` seed text.
- **References:** [Midjourney omni-reference guide (--oref/--ow)](https://www.aiarty.com/midjourney-guide/midjourney-omni-reference.htm),
  [omni-reference + sref workflow](https://www.imaginepro.ai/blog/2025/7/midjourney-omni-reference-guide).
  The benchmark for *why one hand matters*: Notion built its entire illustration warmth on a single
  illustrator's consistent stroke weight (Roman Muradov, with Order) — illustrations that "hold
  integrity across sizes because of consistent stroke weight" ([Order — Block by Block](https://order.design/project/block-by-block),
  [getillustrations on the Notion style](https://getillustrations.com/blog/notion-style-illustrations-how-to-use-them-in-templates-websites-and-saas-products/)).
- **How it lands here:** the Coach is already a CHARACTER in code (`coachAvatar()` red cap + ring,
  rendered in 6 places) but is still code-drawn geometry. A real ink-portrait Coach with 3
  expressions (listen/question/cheer) swapped by coach state is the single biggest emotional
  upgrade in the app; steed-head sprites make the paddock the screenshot people share. Files drop
  into `public/img/` as-is — no build step touched.
- **Effort:** **M** (generation + curation sessions; wiring is already spec'd in image-prompts.md).

### 4. Race card → a true racecard artifact (the keepsake test: "would you pin it up?")
- **What:** The race card has the *content* of a keepsake but the *anatomy* of a UI card. Real
  racecards and betting slips have load-bearing furniture: a **saddlecloth number** in a bold
  cornered box, a **going/distance/date metadata rule** in tiny caps, hairline **column rules**
  (the Daily Racing Form's signature), and — the giftable detail — a **perforated tear-off stub**
  (CSS: dashed rule + punched semicircles via radial-gradient mask, no images) carrying the
  workshop code like a ticket check.
- **References:** [racecard anatomy](https://en.wikipedia.org/wiki/Racecard),
  [1948 Daily Racing Form specimens](https://www.ebay.com/itm/134017825533) (the column-ruled,
  condensed-caps look), and the print-revival trend context:
  [Morphic Studio 2025 trends — letterpress/retro print](https://www.themorphicstudio.com/graphic-and-illustration-trends-for-2025/).
- **How it lands here:** all live-rendered (type stays live per the repo's own rule), survives the
  existing Save-as-PNG path. Saddlecloth number = team index; "ridden by" already exists; myth
  kill-count sits in the stub like a tote return. Same anatomy upgrades the export pack's cover
  page (which is allowed its own literal-hex print styles by design).
- **Effort:** **M** (pure CSS/HTML composition; one careful afternoon).

### 5. Room view as broadcast graphics — one message, persistent furniture, pre-show ritual
- **What:** The projector screen is competing with ESPN-grade expectations — audiences are
  calibrated by broadcast TV. Three rules from that world: (a) **one message at a time** at
  display scale (the room view largely does this — keep it sacred); (b) a **persistent
  "lower-third" strip**: phase name + one-line "what your table should be doing now" in Caveat,
  always in the same place, so a glance re-orients anyone; (c) **countdown as pre-show ritual** —
  the final 60 seconds deserve choreography (numerals settle heavier, the heartbeat already
  shipped; add a Caveat "final furlong" line on the projector itself, not just member screens).
- **References:** [H2R Graphics](https://h2r.graphics/) (the indie-broadcast benchmark: big timers,
  lower thirds, "fill the screen and let the audience stay on time"),
  [lower-third design strategies](https://blog.be.live/lower-third-definition-and-design-strategies-for-your-live-stream/),
  [livestream visual design elements](https://theavdept.com/livestream-design/). Mentimeter's
  presenter/audience split validates the console-never-projected architecture
  ([Mentimeter presentation view](https://help.mentimeter.com/en/articles/375448-this-is-the-presentation-view));
  their accessibility guidance (read the screen aloud, far-seat legibility) should shape the
  RUNSCRIPT cues too ([Mentimeter — present with accessibility in mind](https://help.mentimeter.com/en/articles/4280075-present-with-accessibility-and-inclusion-in-mind)).
- **How it lands here:** the lower-third is an ink-ruled cream strip with a red-pen phase word —
  broadcast *function*, paper *finish*. Pre-reveal vocabulary rule applies to every string on it.
- **Effort:** **S/M** (the phase-aware room view shipped; this is one strip + final-minute states).

### 6. Risograph overprint — let the two inks physically mix at celebration moments
- **What:** The palette is already risograph-shaped (cream stock, navy + red inks, gold/green spot
  washes). What riso *actually* does that the app doesn't yet: **overprint** — translucent inks
  multiply where they overlap, making a third color and slight misregistration. Apply
  `mix-blend-mode:multiply` + a 1-2px seeded registration offset to layered moments: the rosette,
  the CHALLENGE stamp over the wordmark, the swap-stamp slam, ledger MYTH strikethroughs.
- **References:** [People of Print — risograph showcase](https://peopleofprint.com/category/risograph/),
  [True Grit RizzCraft riso system](https://www.truegrittexturesupply.com/products/rizzcraft)
  (the definitive breakdown of riso's visual grammar: overprint, misregistration, grain),
  riso in [2025 illustration trends](https://www.themorphicstudio.com/graphic-and-illustration-trends-for-2025/).
- **How it lands here:** celebration-moments-only — overprint is loud; the canvas never gets it.
  The stamp already slams; landing 2px off-register with red×navy multiplying at the overlap is
  the difference between "CSS badge" and "rubber stamp."
- **Effort:** **S** (blend modes + seeded offsets on ~5 existing elements).

### 7. Editorial print furniture — folio line, column rules, a dateline, one drop cap
- **What:** Award-tier paper sites win on *print furniture*, not texture alone: hairline column
  rules between share-out panels (the right panel already has one — TRIAGE layout #10 added the
  left; extend the system), a **folio line** footer on poster surfaces (workshop code · date ·
  "Horsepower" in small caps — like a page number), a **dateline** on the brief ("RECEIVED —
  13 JUN 2026" in letterpress caps), and exactly one Fraunces **drop cap** on the rebuild brief's
  need/want paragraph (it's the most editorial text in the app).
- **Reference:** [Qode — websites inspired by poster aesthetics](https://qodeinteractive.com/magazine/websites-inspired-by-poster-aesthetics/)
  (the SOTD "paper portfolio… newspaper columns and typography" pattern),
  [Awwwards texture collection](https://www.awwwards.com/websites/texture/).
- **How it lands here:** Fraunces was *built* for this (optical-size axis already in use). The
  folio quietly stamps every projected/exported surface as part of one document — cheap brand
  cohesion the squint test will pick up.
- **Effort:** **S**.

### 8. Presence cursors as pen nibs (§13, unbuilt) — multiplayer is a visual feature
- **What:** The single most-copied piece of visual design in collaborative software is Figma-style
  named cursors — presence is what makes a shared canvas feel *alive on the projector*. §13
  presence cursors are an acknowledged gap. In-idiom: a small ink **nib/pencil-tip glyph** in the
  member's steed color with a Caveat name tag, throttled (~10/s), fading out after idle, author
  dots (already shipped) as the at-rest trace.
- **Reference:** every best-in-class canvas — tldraw's SDK treats live cursors as a core primitive
  ([tldraw canvas interactions](https://tldraw.dev/features/composable-primitives/drawing-and-canvas-interactions));
  Zoom/FigJam whiteboards on Mobbin show the convention is now table stakes
  ([Zoom whiteboard screen — Mobbin](https://mobbin.com/screens/45c9021b-ea4c-46c1-b712-da1ced7cdf2f)).
- **How it lands here:** WS volume is the only real cost; visually it's one SVG glyph + one Caveat
  label. On the Farrier's live mirror it doubles as facilitation telemetry (who's touching the map).
- **Effort:** **M** (server relay + throttle + client layer; small visually, real plumbing).

### 9. "Invisible details" pass — ink-settle on commit, paper-press on drop
- **What:** The Linear/Emil Kowalski school: quality is felt through many unnoticed micro-details,
  not one showpiece. Two in-idiom candidates: (a) **ink-settle** — when a label/WHY commits, the
  text blooms for ~120ms (tiny blur + darken, then sharpens) like ink soaking into stock; (b)
  **paper-press** — on block drop, the shadow compresses to zero then springs to rest (the sheet
  pressed onto the table), replacing a plain transform end.
- **References:** [Interfaces.dev — design engineering magazine](https://interfaces.dev/),
  [UI polish: visual realism](https://www.marcfriedmanportfolio.com/blog/ui-polish-visual-realism/)
  ("the best polish is invisible — lots of small things"), and the craft standard set by Stripe's
  front-end writing ([Connect: behind the front-end experience](https://stripe.com/blog/connect-front-end-experience)).
- **How it lands here:** both are GPU-cheap (filter/opacity/transform), `prefers-reduced-motion`-
  gated, and confined to *moments of commitment* — they reinforce the methodology (committing a
  WHY *should* feel like ink drying) without violating the calm-canvas rule.
- **Effort:** **S**.

### 10. The OG/social card + favicon lockup — the first projector is the browser tab
- **What:** The app meets most participants as a link in chat before it meets them on a projector.
  Slot #6 in image-prompts.md (`og-image.png`, 1200×630, horses around a paper map, right third
  cream for live-set type) is unfilled; ship it with the illustration set (#3), then typeset the
  wordmark + "redesign, don't retrofit" into the reserved negative space as a static composite.
  Pair with a slightly bolder favicon ink-weight so the 🐎 survives 16px.
- **Reference:** Notion's lesson again — illustration as "mood and sense of place," doing brand
  work before any feature is seen ([Janni Valkealahti on Notion's illustrated brand](https://www.jannivalkealahti.com/fieldnotes/illustrated-mascot-humanizing-the-brand)).
- **How it lands here:** one static asset + two meta tags; the meta description already shipped.
- **Effort:** **S** (rides on #3's style anchor).

---

## 2. Do NOT list — trends that would cheapen the paper world

1. **Glassmorphism / backdrop-blur panels.** Frosted glass is the anti-paper; one blurred rail
   would break the material story everywhere.
2. **Dark mode / navy-first surfaces.** Already litigated by the video-feedback cut (full-navy
   share screens were ripped out). The single navy moment at the swap reveal is powerful *because*
   it is single.
3. **Foil, holographic, chrome, iridescent text effects.** Award-tier elsewhere, but they read
   "luxury print finish" — this is a field notebook, not a wedding invitation.
4. **3D/WebGL set pieces** (globes, fluid sims, particle canvases). Stripe's globe is great *for
   Stripe*; here it would also break the no-build/vendoring invariant for pure spectacle.
5. **Scrolljacking / parallax storytelling.** This is a working tool used under a timer; nothing
   should fight the user for the scroll position.
6. **Neobrutalism** (4px black borders, hard offset shadows, clashing fills). Adjacent-looking,
   tonally opposite: brutalism is loud and confrontational; this idiom is warm and invitational.
7. **Confetti cannons / emoji-burst libraries.** The rosette and stamp are the celebration
   language; canned confetti is the fastest way to make them generic. (Also: system emoji in
   chrome are already banned.)
8. **Animated/looping grain.** Film-grain flicker on paper reads as video, not stock; the boiling
   line is the only sanctioned "alive" texture, and it earns it. (Static feTurbulence per #2: yes.)
9. **Mixed-hand illustration** — grabbing stock "Notion-style" packs or generating assets without
   the single style anchor. One off-hand image is worse than the current code-drawn art; the whole
   value of #3 is *one illustrator's hand* ([IconScout on illustration systems](https://iconscout.com/blog/guide-illustration-system)).
10. **Torn-paper / washi-tape / coffee-stain PNG clipart.** Skeuomorphic kitsch is the failure mode
    of paper idioms. Horsepower's paper is *drawn* (strokes, seeds, washes), never photographed —
    keep it that way.
11. **AI-aesthetic gradients** (aurora meshes, purple-cyan glows). Ironic for an AI-native product,
    fatal for this one: the product's whole visual argument is that AI-native ≠ sci-fi.

---

## 3. Verdict

**Fund the illustration set first (#3 + #10, with #2's grain as the supporting coat):** the Coach
and the steeds are already load-bearing *characters* rendered as placeholder geometry — one
style-anchored generation pass converts the app's emotional core from "tokens applied well" to
"a world with an author," and it's the only top-10 item 2025-26 tooling made an order of magnitude
cheaper this year. Ink engine v2 (#1) is the close second and the right next sprint: it deepens the
one asset every screen shares — the line itself.
