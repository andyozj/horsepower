# Horsepower — Layout & Composition Audit

**Auditor lens:** layout & composition only (idiom locked: hand-drawn paper/ink, poster spreads, seeded tilts). Judged against best-in-class editorial/product work.
**Method:** self-hosted room on `localhost:3200`, drove the full journey (lobby → surface → swap → rebuild → share → closed + console + room view + modals). Screenshots at **1440×900, 1920×1080, 1280×800** (deviceScaleFactor 2) for every screen, plus **390×844** for the working canvases. Real boxes measured with `getBoundingClientRect`. Evidence in `qa-design/layout/` (71 shots) and `qa-design/layout/boxes.json`.

The idiom is genuinely strong and the *content* hierarchy is mostly right. The failures are almost all **edge-tension** (floating canvas chrome that accreted into corners instead of being arranged) and **responsive composition** (fixed-width blocks stranded in oceans of whitespace at 1920, plus a flex-wrapping run bar). None are idiom problems; all are arrangement problems.

---

## Problems

### 1. [HIGH] The Farrier run bar flex-wraps into two ragged rows — the primary CTA drops below the phase stepper
**Evidence (`boxes.json` → console-lobby):** `.runbar` is `h:117` because its flex row wrapped. `.stepper` sits alone on row 1 at `y:68`; `.runcta` ("Start Surface") and `.timerctl` are pushed to row 2 at `y:117/116`. The single most important control on the facilitator's screen — the "next step" CTA — is **49px below** the stepper and visually orphaned mid-bar, while the timer (474px wide, 4 presets + custom + start + reset) hogs the right. At 1280 it's tighter still. This is the screen that *runs the room*; its hierarchy reads as "phase rail … [gap] … oh, and a button somewhere."
**Prescription:** Give `.runbar` an explicit 3-zone grid instead of `flex-wrap`: `grid-template-columns: auto 1fr auto; align-items:center;` — zone 1 = stepper, zone 2 = the CTA + its blocking-reason caption (centered, the hero), zone 3 = timer cluster. Force `flex-wrap:nowrap` and let the timer presets collapse into a single "20m ▾" menu under ~1360px so the bar never wraps. Target a fixed `64px` bar height. The CTA and stepper must share one baseline (`y` within 2px).

### 2. [HIGH] Rebuild canvas: four floating widgets ring the bottom + right edges — accreted, not arranged
**Evidence (`boxes.json` → rebuild):** at the bottom:888 line sit **three** independently-anchored widgets — `.landpill` `[x:10–189]`, `.assumefloat` `[x:546–894]`, `.viewctl`/zoom `[x:1277–1428]` — plus `.railtoggle` (coach peek) at `[x:1372–1424, y:784–836]`, i.e. **the coach button and the zoom control stack in the bottom-right corner just 14px apart vertically** (`bot:836` vs `bot:888`). Add `.landtray` pinned top-right (`right:1430`) and `.goalnote` top-left, and every corner has a separately-positioned object. Nothing shares a baseline grid; it reads as six post-it notes slapped onto the glass. This is the product's signature screen.
**Prescription:** Adopt one **canvas-chrome rail system**. Dock the persistent status objects into a single bottom-left → bottom-right shelf with consistent `12px` inset and `10px` gaps: `[People pill] … [Assumptions] ………… [zoom]`, all on one `bot:888` baseline (they already are — but make them *look* like one row by giving them matching height/`8px` radius and a faint shared hairline). **Move the coach peek button out of the zoom's corner** — it belongs at `right:16, bottom:88` *above* the chrome shelf, or merge it into the shelf's right end so it doesn't double-stack with zoom. The landtray should align its right edge to the zoom's right edge (both `right:12`, not `10` vs `12`).

### 3. [HIGH] Opening the Coach rail in Rebuild overlaps and clips canvas content
**Evidence:** shot `51-rebuild-coach-open-1440.png`. The rail slides in over the canvas (it's `flex:none` border-left, but the canvas world does not reflow), so `.landtray` ("People — where do they land?") is half-covered and the "CANDIDATE CONSTRA…" card is clipped by the rail's left edge. In Surface the rail is a permanent column (`x:1100`, canvas `w:1100`) so it never overlaps — but in Rebuild the rail is collapsible and overlays. The most important Rebuild affordances (people landing + locked/candidate cards) get occluded exactly when the team opens the Coach to think.
**Prescription:** When the Rebuild rail opens, shrink the canvas viewport to `calc(100% - railWidth)` the same way Surface does (make the canvas a flex sibling, not a full-bleed underlay), OR auto-reposition `.landtray` to the left of the rail when `rail.open`. At minimum, raise the landtray's `z-index` above the rail and nudge it left by `railWidth` while open. Content must never sit *under* the rail.

### 4. [HIGH] 1920 wastes ~40–60% of the screen — fixed-width blocks stranded in whitespace
**Evidence:** `06-console-lobby-empty-1920.png` (the "Set up your room" card is a fixed centered block; bottom ~60% of a 1080px screen is empty paper), `48-rebuild-initial-1920.png` (locked/candidate cards seed into the **top-left quarter**; right 60% + bottom half are dead), `02-landing-1920.png` (the form card anchors right with a huge empty right margin; see #5). The landing/picker grid is `minmax(0,1.55fr) minmax(380px,1fr)` with `clamp(...,76px)` padding — at 1920 the padding maxes and the form column stops growing, beaching it.
**Prescription:** (a) Console lobby card: cap at `max-width:720px` but **vertically center it** in the console body (`.dash`/lobby container `display:grid; place-items:center; min-height:100%`) so the empty band splits top/bottom instead of dumping below. (b) Rebuild seed scatter: scale the teardown card spawn coordinates to the actual canvas width (multiply x-spread by `canvasW/1200`) so cards distribute across the viewport instead of clustering at `<700px`. (c) Landing/picker: cap the grid at `max-width:1400px; margin:0 auto` so beyond 1440 the whole spread centers as a unit rather than the form drifting right.

### 5. [MED] Landing CHALLENGE stamp detaches into the gutter at 1920
**Evidence:** `02-landing-1920.png` — the red `CHALLENGE` stamp (`.poster .pstamp`, `position:absolute; top:-16px; right:2px`) is anchored to the poster's right edge, but at 1920 the poster column is wide and the stamp lands **dead-center in the empty gutter between headline and form**, floating with no object to relate to. At 1280 (`03`) it sits correctly tucked above the headline's right shoulder — that's the intended composition. At 1440 it's borderline.
**Prescription:** Anchor the stamp to the **headline**, not the poster column: move `.pstamp` inside the `<h1>` stacking context (or set `right` relative to the `h1` width, e.g. `left: calc(<h1 end> - 60px)`). It should always overlap the "…power" terminal, never float in negative space.

### 6. [MED] Surface bottom band has three mis-baselined objects competing
**Evidence:** `28-surface-empty-1280.png`, `30-surface-map-built-1440.png` + `boxes.json` → surface-built: `.gatebar` runs full-width at `bot:900` (h:45), but floating *over* the canvas above it are `.viewctl`/zoom at `bot:843` (`x:937–1088`) and an orphan-tray + "N thin for a newcomer" / "Newcomer check — N to fix" chips that sit at varying y. The zoom (`bot:843`) floats `12px` above the gatebar (`y:855`) creating a thin dead band, and the "Newcomer check" gate chip in the gatebar visually tangles with the zoom directly above it. Three different bottom anchors (gatebar bottom, zoom, orphan tray) read as clutter.
**Prescription:** Pull the zoom into the gatebar as a right-aligned member (`.gatebar` already `display:flex` — append `.viewctl` with `margin-left:auto`), eliminating the floating zoom and its dead band. Then the bottom is **one** strip: `[gate status] [thin-count] … [zoom]`. Align the orphan tray's bottom to the gatebar top (`bottom:45px`) so it stacks cleanly rather than overlapping.

### 7. [MED] Long team names clip with no ellipsis across four screens
**Evidence:** "Accounts Payable Process Excellence **Squa**" is truncated mid-word (no `…`) in: lobby code-throne caption (`14`,`20`), share-out left header (`59`), racecard `<h3>` (`65` — though the racecard h3 *does* have `text-overflow:ellipsis`, the lobby/share headers don't), console drill header (`35`), room present right header (`67`). The walkthrough deliberately uses a 40-char name to surface this; real workshop names ("AP Squad") are short, but the hard clip is sloppy.
**Prescription:** Add `max-width` + `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` to `.paddock` team caption, the share `What it was — … real process` header, and the room-view `What it became — …` header. Or `word-break:normal; overflow-wrap` to wrap to two lines. Either is fine; the current mid-word hard-cut is the only unacceptable option.

### 8. [MED] Console "instruction key/value" block is floating marginalia, ungridded
**Evidence:** `05-console-lobby-empty-1440.png`, `35-console-drill-mirror-1440.png`. The "LOBBY · GET EVERYONE ABOARD" + Say now / Watch for / Move on when 3-column list is jammed top-left under the run bar, while the actual content ("Set up your room" card / live board) is centered or full-width below. The instruction block and the "run-of-show cues" label (top-right) don't align to the content grid — they read as annotations stuck above the page rather than a designed header row.
**Prescription:** Either (a) give the instruction block the same horizontal padding/`max-width` as the content below it so its left edge aligns to the card/board, or (b) demote it into a dismissible single-line strip (`Say now: "…" · Watch for: … · Move on: …`) that spans the content width. Right now its `18px` page padding vs the centered card's different origin creates two competing left edges.

### 9. [LOW] Lobby left panel vertical centering leaves a dead band; lone horse glyph floats
**Evidence:** `14-lobby-presaddle-1440.png`, `boxes.json` → lobby: `.paddock` (code + fence cluster) sits at `y:505` in an `844px` panel — the cluster is upper-middle, and below it the "waiting for your team" caption + a single decorative horse glyph float near the bottom with a large empty gap between. The right "Meet your Coach" panel is top-aligned and content-dense, so the two columns don't share a baseline and the left looks half-empty by comparison.
**Prescription:** Center the left stack as a group (`justify-content:center` on the inner column) and either drop the lone bottom glyph or pin it as a true footer (`margin-top:auto`). Tighten the gap between code throne and the "Accounts…" caption (currently the throne→caption→fence rhythm has an oversized gap before the fence).

### 10. [LOW] Share-out panel headers are asymmetric (left bare, right ruled)
**Evidence:** `59-share-top-1440.png`, `67-roomview-present-1440.png`. "What it became" gets a bold full-width **yellow underline rule**; "What it was" gets nothing. The emphasis-on-the-rebuild is defensible editorially, but the bare left header looks unfinished beside it rather than intentionally quiet.
**Prescription:** Give the left header a matching but **muted** rule (thin `--line` underline, or a short `40px` ink tick) so the asymmetry reads as deliberate hierarchy, not a missing element. Keep the right one loud.

### 11. [LOW] Modal vertically high; buttons fine
**Evidence:** `boxes.json` → modal: `.modalcard` at `y:365`, `h:171` → center `y:450` = exact viewport center. Buttons right-aligned, `8px` gap, correct. This one is genuinely fine — listed only to confirm it was checked. No action.

---

## What's genuinely excellent

- **The reveal stamp (`45`, `46`):** full-screen scrim with the slammed REDESIGN stamp over the dimmed canvas is theatrical, perfectly centered, and the best-composed moment in the app. Exactly right.
- **Room-view timer throne (`41`):** the `clamp(96px,18vw,200px)` Fraunces timer centered on bare paper is a beautiful projector composition — measured `437×200` dead-centered. Confident use of scale and void.
- **Landing/picker poster spread at 1280–1440 (`01`,`03`,`11`):** the `1.55fr/1fr` headline-vs-form split with the hand-drawn mini-map illustration is a strong, distinctive editorial composition. The picker correctly mirrors the landing — good system consistency. (Only breaks at 1920, see #4/#5.)
- **The share-out section rhythm (`59`,`65`):** "double reveal → what died → reckoning → race card" as full-width stacked bands reads as a deliberate vertical narrative, not a dump. The bands have consistent radius and inset.
- **Surface canvas working baseline (`26`,`30`):** toolbar / canvas / coach-rail tri-column is clean and the empty-state centering ("Click a block…") is correct. The Surface rail-as-permanent-column (no overlap) is the right model — Rebuild should copy it (#3).

---

## 3 worst-composed screens

1. **Rebuild canvas (`47`, `48`, `51`)** — six independently-anchored floating widgets, coach button double-stacked on the zoom, content occluded when the rail opens, and a top-left-clustered seed scatter that beaches at 1920. The signature screen is the least arranged.
2. **Farrier console run bar + lobby (`05`, `06`)** — the flex-wrapping bar orphans the primary CTA below the stepper; the setup card strands in 60% whitespace at 1920; ungridded instruction marginalia up top. The room-running screen looks accreted.
3. **Rebuild on mobile (`56`)** — landtray sheet, assumptions float, coach peek, and the green build banner all collide in 390px; "transforms/removed" buttons clip off-edge. Functional but visibly cramped.

## 3 best-composed screens

1. **Swap reveal (`45`/`46`)** — theatrical, centered, restrained.
2. **Room-view timer throne (`41`)** — masterful scale/void.
3. **Landing poster @1280/1440 (`03`)** — distinctive editorial split, mini-map as hero supporting element.

---

## Verdict — single highest-leverage layout change

**Establish ONE canvas-chrome shelf system and make the Rebuild rail behave like the Surface rail (problems #2 + #3 together).** The Rebuild screen is the product's centre of gravity, and today its chrome is six post-its in six corners with content that gets clipped the moment the Coach opens. Dock all persistent canvas status (people pill · assumptions · zoom · coach toggle) into a single bottom shelf on a shared baseline with consistent `12px` insets, move the coach button out of the zoom's corner, and reflow the canvas (not overlay it) when the rail opens — exactly as Surface already does. That one change converts the signature screen from "accreted" to "arranged" and fixes the worst occlusion bug in the journey. The run-bar grid (#1) is the close second-highest-leverage fix.
