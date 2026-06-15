# Horsepower — image generation prompt pack (2026-06-12)

Exhaustive sweep of every slot where a generated illustration would beat the current
code-drawn art. Drop finished files into `public/img/` with the exact filenames below —
they get wired in as-is (no build step needed).

## Rules for every generation
- Append the STYLE BLOCK below to every prompt, verbatim.
- Ask for **PNG, 1024px+** (sizes noted per asset). If the generator supports true
  transparency, use it; otherwise request a **plain flat background of exactly #f4efe2**
  (our paper cream) — flat, no texture, no vignetting — so it composites invisibly.
- **No text/lettering in any image** (generators butcher it; all type stays live).
- Keep the SAME seed/style reference across the set if your tool supports it — these
  must read as one illustrator's hand.

### STYLE BLOCK (append to every prompt)
> Hand-drawn ink illustration in a warm "field notes" style: confident loose
> fountain-pen linework in deep navy ink (#21314f) with a slight hand wobble, sparse
> flat watercolor washes in dusty gold (#b8860b), sage green (#2e7d52), soft red
> (#e23b3b) and pale violet (#7c3aed), generous cream negative space, on a plain warm
> cream paper background (#f4efe2). Charming and slightly whimsical — a beautifully
> illustrated children's book crossed with a naturalist's notebook. No photorealism,
> no 3D, no gradients, no drop shadows, no text or lettering of any kind.

---

## MUST-HAVE (these unlock the most)

**1. The Coach — portrait** → `coach-hero.png` (1024×1024, transparent preferred)
> Friendly horse head-and-shoulders portrait facing slightly left, wearing a small
> soft red flat cap and a thin red whistle cord around the neck, one ear perked,
> kind knowing eyes with a raised-eyebrow "go on, tell me more" expression.
> Head-and-neck only, centred, fills ~80% of frame.

**2. The Coach — 3 small expressions** → `coach-listen.png`, `coach-question.png`, `coach-cheer.png` (1024×1024 each, same character as #1)
> Same horse character with red cap, three variants: (a) listening — head tilted,
> ear forward; (b) skeptical question — one brow raised, slight head shake;
> (c) celebrating — mouth open in a happy whinny, tiny rosette pinned to cap.
> Identical framing to the portrait so they can swap in place.

**3. Steed head sprite — 8 colour variants** → `steed-purple.png`, `steed-green.png`, `steed-navy.png`, `steed-gold.png`, `steed-chestnut.png`, `steed-blue.png`, `steed-plum.png`, `steed-teal.png` (1024×1024 each, transparent preferred)
> A cheerful horse head and neck in profile facing left, leaning slightly forward as
> if peering over a fence, mane flopping over the brow. Line art in navy ink with a
> single flat wash fill of [purple #7c3aed / green #2e7d52 / navy #2b3a55 / gold
> #b8860b / chestnut #9a5b3b / blue #3b6b9a / plum #a23b6b / teal #3b8a8a] at roughly
> 25% softness over cream. Same pose and framing for all eight so they line up in a row.

**4. Steed ghost variant** → `steed-ghost.png` (1024×1024)
> Same horse head pose as the colour set, but drawn as a faint pale-grey dotted-line
> ghost — an empty stall waiting for a horse. Very light, almost vanishing.

**5. Paddock fence strip** → `fence.png` (2048×512, transparent preferred)
> A long rustic wooden paddock fence strip seen straight-on: two slightly bowed
> horizontal rails, six posts with flat caps, small grass tufts and tiny pebbles at
> the base. Wide panorama, nothing above the top rail (horse heads composite in
> behind it).

**6. Social/OG card** → `og-image.png` (1200×630 exactly)
> Wide scene: three horses with coloured manes gathered around a big paper map on a
> workshop table, one horse in a red coach cap pointing a hoof at the map, sticky
> notes and a yellow highlighter strewn about. Leave the right third as calm cream
> negative space (the title gets typeset there live).

---

## HIGH VALUE (each lifts a key moment)

**7. Trot cycle — 4 frames** → `trot-1.png` … `trot-4.png` (512×512 each, transparent, same horse)
> A small horse trotting in side profile facing right, four animation frames of one
> trot cycle: (1) front leg reaching, (2) mid-stride legs gathered, (3) opposite
> reach, (4) all hooves tucked mid-air. Simple, minimal, consistent silhouette.

**8. Landing watermark** → `watermark-horse.png` (2048×2048, transparent)
> A single large elegant horse mid-canter drawn in one continuous loose ink line,
> unfilled — pure gesture-drawing energy, as if sketched in eight seconds by a master.
> Will be shown at 5% opacity, so bold simple strokes only.

**9. Empty-canvas spot** → `empty-canvas.png` (800×800, transparent)
> A small horse sitting at a drafting table holding an oversized pencil in its mouth,
> looking at a blank sheet with one curious raised eyebrow. Tiny, endearing, simple.

**10. Rosette badge** → `rosette.png` (512×512, transparent)
> A classic first-place show-ribbon rosette: ruffled circular ribbon in highlighter
> yellow (#ffd24a) and gold with two short trailing tails, a tiny horseshoe at the
> centre. Crisp, badge-like, reads at small size.

**11. Race-card crest** → `racecard-crest.png` (800×400, transparent)
> A small heraldic crest for a keepsake race card: crossed riding crops behind a
> horseshoe, a sprig of laurel either side, one tiny star above. Fine line work,
> mostly ink with a touch of gold wash.

**12. Reveal parcel** → `reveal-parcel.png` (1024×1024, transparent — shown on DARK navy #21314f, so line work must be cream/white ink instead of navy)
> A brown-paper parcel tied with string, slightly torn open at one corner with rolled
> map paper peeking out, a cracked red wax seal. Drawn in pale cream ink lines (for a
> dark background) with soft red wash on the seal only.

**13. Closed-screen farewell** → `farewell.png` (800×800, transparent)
> A horse seen from behind walking away down a gentle path, head turned back over its
> shoulder with a wink, tail mid-swish, tipping a small red cap with one hoof.
> Warm, funny, final.

---

## NICE-TO-HAVE

**14. Farrier console spot** → `farrier-setup.png` (800×800, transparent)
> A farrier's workbench still life: anvil, a few horseshoes, a clipboard with a
> checklist, a steaming mug. Calm, organised, "ready to run the room".

**15. Paper texture tile** → `paper-tile.png` (512×512, seamless/tileable)
> A barely-there warm cream handmade-paper texture with faint fibres and flecks,
> uniform tone #f4efe2, fully seamless when tiled. Extremely subtle — at 100% it
> should look almost plain.

## Deliberately NOT images (keep code-drawn — don't generate these)
- The 16–18px UI glyphs (persona/trigger/lock/bulb/flag/dice/play…): they must stay
  crisp at tiny sizes and recolour with CSS — SVG wins.
- The hero/tour/vignette mini-map sketches: they render live data (your real blocks,
  steed colours, boil animation) — a static image can't.
- The hand-drawn node strokes, arrows, squiggles, underlines: seeded per-element so
  every device draws the same wobble; that's the product's signature.
