# Horsepower — Craft & Cross-Screen Consistency Audit

**Auditor lens:** pixel-level craft + cross-screen coherence of the locked hand-drawn paper/ink idiom (seeded rough-lite strokes, custom `g-*`/`i-*` line-glyph set, NO system emoji in chrome per spec §16).
**Method:** source CSS audit of `public/index.html` (lines cited against the live file) + 2× DPR element screenshots driven through every phase → `qa-design/craft/`.
**Verdict in one line:** the idiom is real and largely beautifully executed, but it is **two design systems wearing one coat** — a hand-drawn "map" system and a plain-radius "chrome/share/console" system that never reconciled their radii, shadows, and stroke language.

---

## Problems

### 1. [HIGH] The rough-stroke engine ignores node shape — the Trigger pill is drawn as a rectangle
`roughBoxSvg()` (line 1538) always calls `roughRect()` (line 1510), a 4-corner wobbly **rectangle**, regardless of the node's CSS `border-radius`. The Trigger node is a pill (`.node.trigger{border-radius:999px}`, line 253), so the rough overlay traces squared, wobbly corners that poke inside/outside the green pill fill — the ink outline and the fill disagree on the silhouette.
**Evidence:** `qa-design/craft/20-node-trigger.png` (rough corners are square; fill is a stadium). Same latent mismatch exists for every asymmetric-radius node (`12px 10px 13px 11px`, line 226) — the rough rect is a true rectangle, not the rounded silhouette — but it only becomes *visible* on the pill because the radius delta is extreme.
**Prescription:** branch in `roughBoxSvg`: when the host node is a pill, draw two wobbly horizontal segments + two wobbly arcs (or a rounded-rect path that respects a passed `radius`). At minimum pass the node's computed radius and inset the rect by it so the corners read rounded. Trigger is the only pill among the typed blocks, so a single special-case (`isPill` flag from `PALETTE`/type) fixes the visible sin.

### 2. [HIGH] Two radius families never reconciled — "map" cards are hand-drawn, "chrome/share/console" cards are plain
The floating-paper family deliberately uses asymmetric hand radii: `.inspector` / `.locktip` / `.ingcard` / `.landtray` / `.assumefloat` / `.modalcard` / `.card` (`16px 13px 17px 12px`, `12px 10px 13px 11px`, `14px 11px 15px 12px`). But the console + share + lobby card surfaces use **plain symmetric** radii: `.stat` `13px` (382), `.teamtable` `13px` (385), `.mirror` `13px` (397), `.needsyou` `13px` (411), `.roomview .rteam` `14px` (428), `.ba-card` `14px` (467), `.orphantray` `12px` (302), `.bubble` `12px` (196), `.coachsay` `12px` (586), `.vignette .vstage` `11px` (694).
**Evidence:** `45-ba-card.png` (crisp symmetric share card holding rough-stroked map nodes inside it), `48-racecard.png`, `14-lobby-coachpanel.png` (the big promises card is plain while every glyph badge is bespoke). The eye reads it as "the playful screens" vs "the spreadsheet screens."
**Prescription:** introduce two radius tokens — `--r-paper: 14px 11px 15px 12px` (hand) and `--r-plain: 12px` (utility) — and decide *per surface class* which language it speaks. Share/keepsake/lobby cards are emotional payoff moments and should adopt `--r-paper`; the console table/stats may legitimately stay plain (data, not paper) but should then be consistent with each other. Right now it's ad hoc.

### 3. [MED] Shadow recipes are a ~25-variant sprawl of near-duplicates
`box-shadow` census shows ~25 distinct recipes, many differing only in the second-layer alpha or blur (`.18` vs `.20` vs `.22`; `-6px` vs `-5px` vs `-8px` spread). E.g. `0 2px 0 …,.1, 0 10px 18px -8px …,.18` (lines 468/475/496) vs `…,.12, …,.22` (line 290/652/672) vs `…,.10, 0 8px 14px -6px …,.20` (line 117/121). These are the *same* "flat ink drop + soft lift" idea retyped with jittered constants.
**Prescription:** define `--shadow-rest`, `--shadow-hover`, `--shadow-float`, `--shadow-stamp` (the 5px/6px keepsake) as tokens and replace the inline recipes. Spec §12 already names a shadow model ("nodes flat at rest, soft ink-tinted shadow on hover; no black or purple shadows") — that's 2–3 tokens, not 25.

### 4. [MED] Toolbar tools use Unicode dingbats where the `i-*` glyph set should be used
`Select` renders `'⌖ Select'` (U+2316 POSITION INDICATOR, line 1581) and `Arrow` renders `'↗ Arrow'` (U+2197, line 1582). These are system-font dingbats sitting in a toolbar whose other affordances are crisp SVG glyphs — they render at a different stroke weight/baseline and break the line-icon language. §16 says line-icons replace ALL system emoji/dingbats in chrome.
**Evidence:** `16-tool-select.png`, `17-tool-arrow.png` (the crosshair/arrow are visibly lighter and metrically off vs the `g-*` glyphs beside them on the same bar — see `15-toolbar-surface.png`).
**Prescription:** add `i-select` (crosshair/cursor) and `i-arrow` (NE arrow) symbols to the §16 defs block (line 774) and emit them via `glyph()`. Two ~6-line symbols.

### 5. [MED] Locked node info affordance is `ⓘ` (U+24D8) — a Unicode stand-in with no glyph
`n.append(el('span',{class:'ctxinfo'},'ⓘ'))` (line 1719). There is no `i-info` symbol in the defs; this circled-i is a font character that won't match the line-icon weight and varies across platform fonts.
**Evidence:** `35-node-locked.png` (top-right `ⓘ`), visible on every locked block in `32-rebuild-full.png`.
**Prescription:** add an `i-info` symbol (circle + dot + stem) to the defs and render via `glyph('i-info')`, sized to match `.lockglyph` (11px).

### 6. [MED] System emoji leak in the export pack — `🐎`, `⚠`, `🔒`, `✂️`
The PDF/print export (lines 2441, 2445) emits `<h1>🐎 …</h1>`, `⚠ partial`, and the constraint ledger as `🔒`/`✂️`. The in-app ledger correctly uses the **`g-lock` SVG glyph** (`47-ledger.png` shows a proper line-lock), so the export is the *one place* the idiom breaks into full-color OS emoji. The export pack is a leave-behind artifact (the keepsake) — arguably the highest-stakes chrome for "did this feel crafted."
**Note:** the export pack also has its own separate stylesheet (lines 2436–2440, `border-radius:8px`/`12px`, Georgia serif fallback) — it is off-system entirely. CLAUDE.md already flags "export pack still uses its own simplified styles" as a known gap; the emoji are the visible tip.
**Prescription:** swap the emoji for inline SVG (the same `g-horse`/`g-lock` paths; a scissor path for MYTH), or at minimum for typographic marks. Long-term, share the design-token CSS with the export template.

### 7. [LOW] Plain-radius buttons clip inside hand-radius trays
The land-fate buttons (`.land-btn` / `.landperson .lb`, `border-radius:8px`, lines 351/662) are plain while their host `.landtray` is hand-radius; in the 238px tray the third button ("removed") is clipped at the right edge.
**Evidence:** `36-landtray.png`, `41-landperson.png` ("removed" cut off). Functional, but reads unfinished.
**Prescription:** allow the `.ctrls` row to wrap (`flex-wrap:wrap`) or shorten labels; and decide whether small action buttons get `--r-plain` consistently (they do elsewhere — `.btn.sm` is `9px`, line 73 — so 8px here is a third value).

### 8. [LOW] `.btn.sm` radius (9px) is a third button radius alongside `.btn` (asymmetric) and land-btns (8px)
`.btn` is `11px 9px 12px 10px` (hand, line 63); `.btn.sm` collapses to plain `9px` (line 73); land/lb buttons are `8px`. Three button radii.
**Prescription:** `.btn.sm` should keep a (smaller) asymmetric radius to stay in the family, and land-buttons should reuse `.btn.sm`.

### 9. [LOW] Seeded-tilt family is applied inconsistently
Seeded paper-tilt (`transform:rotate(var(--rot))`, flattening on hover) is on `.ingcard` (526–528) and `.hnode`/`.hmoment` (hero). But `.orphan` uses a *keyframe* wiggle then rest (307) — a different restlessness model — and `.landperson` cards (the mirror of orphans, per the comment line 651) get **no tilt at all**. The rule ("scraps/stickies tilt; official things stay crisp") is sound but unevenly applied: landperson stickies should tilt like orphans/ingcards; the assumption stickies (`.assumption`, 347) also sit flat despite being "cousin of the orphan sticky" per their own comment.
**Prescription:** decide the rule explicitly — *every* paper scrap (orphan, ingcard, assumption, landperson) gets a seeded `--rot` that flattens on hover; official cards (locked, console, stat) stay square. Apply uniformly.

### 10. [LOW] Disabled primary CTA loses its identity to flat grey
`.btn[disabled]{opacity:.4}` (72) on the highlighter primary makes "Start Surface" read as washed sand with grey text and no shadow (`09-runcta-disabled.png`) — the disabled state and the reason text (`.ctareason`, italic thin) carry the "why" but the button itself looks broken rather than intentionally gated.
**Prescription:** for the gated run-CTA specifically, keep a faint highlighter tint + a dashed ink border so "armed but waiting" reads as a state, not a bug; pair tightly with the existing `.ctareason`.

---

## Emoji / Glyph audit table

§16 bans **system pictographic emoji** in chrome. Verdict key: **KEEP** = acceptable typographic mark; **REPLACE** = should be a `g-*`/`i-*` SVG; **OK-CONTENT** = outside team-facing chrome (comment / `<title>` / print artifact, lower stakes but noted).

| Occurrence | Where (line) | Verdict |
|---|---|---|
| `🐎` | `<title>` (6), JS comments (874, 1184) | OK-CONTENT — browser tab title + comments, not rendered chrome |
| `🐎` | export pack `<h1>` (2441) | **REPLACE** — rendered on the keepsake; use `g-horse` SVG |
| `⚠` | export pack "partial" (2441) | **REPLACE** — use `g-pain` SVG or "(!)" |
| `🔒` `✂️` | export ledger pills (2445) | **REPLACE** — in-app uses `g-lock`; mirror it (scissor path for MYTH) |
| `⌖` | Select tool (1581) | **REPLACE** — add `i-select` |
| `↗` | Arrow tool (1582) | **REPLACE** — add `i-arrow` |
| `ⓘ` | locked node info (1719) | **REPLACE** — add `i-info` |
| `◖` | collapsed-rail fallback chevron (2032) | **REPLACE** — half-disc dingbat; collapsed rail already uses the coach face; this branch should use an `i-*` chevron or the coach avatar |
| `▴` | assumption "log a guess ▴" (2215) | KEEP (borderline) — small triangle as affordance; acceptable typographic mark, but `i-up` would be cleaner |
| `↩` `↺` | step-back (2530), timer-reset (2547) | KEEP — standard typographic arrows, console-only, read as controls |
| `○` | gate "still need" (1989) | KEEP — geometric mark, reads as empty-state bullet |
| `✓` `✗` `✕` | gate checks, assumption status, proposal park, present-pick, room view (many: 1971–2751) | KEEP — check/cross are typographic, consistent, and used systematically. **However** they render in the system font and sit beside SVG glyphs; consider a single `i-check`/`i-cross` pair for the highest-visibility ones (gate chip 2010, assumption reckoning 2295–2298) to unify weight. Low priority. |
| `➤` | coach send button (2080) | KEEP (borderline) — a send triangle; `i-send` would match weight better |
| `⌫` | shortcuts toast (1871) | KEEP — keyboard symbol in a help toast, correct usage |
| `🐎` (g-horse SVG), `g-lock` ledger, `i-*` timer/play/pause/dice/down/thumb | throughout | CORRECT — these are the proper SVG glyph set, well executed |

**Summary:** no emoji leak in live team-facing chrome except the **toolbar dingbats (⌖ ↗)**, the **locked-node ⓘ**, and the **collapsed-rail ◖**. The genuine pictographic-emoji violations (`🔒 ✂️ ⚠ 🐎`) are all isolated to the **export pack**, which is already a known off-system artifact.

---

## What's genuinely excellent

- **The seeded rough-lite engine on rectangular nodes** (`19-node-persona.png`, `21-node-phase.png`): the two-pass ink+ghost stroke with the de-synced boil is convincing, deterministic across devices, and the per-type full-hue left border + wash is a clean taxonomy. This is the heart of the idiom and it lands.
- **The reveal stamp** (`31-reveal-stampbox.png`): the distress filter (feTurbulence holes + displacement) on a rotated double-rule rubber stamp with Fraunces 900 is a true showpiece — exactly the "one ink moment" the spec reserves it as.
- **The Coach as a WHO** (`14-lobby-coachpanel.png`, collapsed coach-face button in `32-rebuild-full.png`): one avatar (red ring + cap + whistle) recurs at 24/30/34/36/54px, the red-pen bubble has a consistent clipped corner, and the Caveat voice ("While you wait — what's broken about it?") is characterful and consistent.
- **The candidate ingcard** (`33-ingcard-candidate.png`): rough gold stroke + folded-corner `::after` + uppercase kicker + "tap — the why" hint — a sticky that explains itself, distinct at arm's length from the crisp purple locked law. The three-species teardown taxonomy reads instantly.
- **The inspector / "back of the card"** (`24-inspector.png`): Caveat header, capacity segmented pills, the coach-flag in a pain-wash — a cohesive floating paper object.

---

## 3 worst craft sins

1. **The Trigger pill drawn as a wobbly rectangle** (Problem 1) — the rough engine and the CSS silhouette openly contradict on the one pill-shaped node. Most visible single defect.
2. **Two unreconciled radius systems** (Problem 2) — hand-drawn map vs plain-radius console/share/lobby; the keepsake race card and before/after cards — the emotional finale — speak the *plain* dialect while holding hand-drawn content.
3. **Export-pack emoji + off-system styles** (Problem 6) — the leave-behind artifact (the thing people keep) breaks into OS emoji and Georgia/plain radii, undoing the craft at the last mile.

## 3 best craft moments

1. **The reveal rubber stamp** — distress-filtered, the product's signature image.
2. **The rough-lite node engine** — deterministic, boiling, type-coloured; the idiom's spine.
3. **The Coach character system** — one face, one voice, one red-pen bubble, everywhere.

---

## Verdict

Horsepower has a **real, opinionated, mostly-exquisite hand-drawn idiom** — the rough engine, the stamp, the Coach, the teardown stickies are agency-grade. It falls short of *exquisite* because the system was built map-first and the surrounding chrome (console, share keepsakes, lobby cards, export) never fully adopted the same radii, shadows, and glyph language — and the rough engine has one literal shape bug (the pill). None of this is structural; it is **tokenization + a shape branch + ~4 new glyph symbols**. Fix the radius/shadow tokens, special-case the pill stroke, add `i-select`/`i-arrow`/`i-info`/`i-chevron`, and de-emoji the export pack, and the two coats become one. As-is: **strong B+ craft with three A+ moments and three avoidable seams.**

---

### 5-line summary
1. The hand-drawn idiom is real and often exquisite (rough-node engine, reveal stamp, Coach character, teardown stickies) — but it's effectively **two systems**: a hand-drawn "map" and a plain-radius "console/share/lobby/export" that never reconciled radii (asymmetric vs `12/13/14px`), shadows (~25 near-dup recipes), and glyph language.
2. **Worst single bug:** the rough-stroke engine (`roughBoxSvg`→`roughRect`, lines 1538/1510) always draws a *rectangle*, so the Trigger **pill** (`border-radius:999px`, line 253) gets squared wobbly corners that fight its fill (`20-node-trigger.png`).
3. **Emoji/glyph:** live chrome is clean except toolbar dingbats `⌖`/`↗` (1581–82), locked-node `ⓘ` (1719), and collapsed-rail `◖` (2032), which need `i-*` symbols; true pictographic emoji (`🔒 ✂️ ⚠ 🐎`) leak only in the off-system **export pack** (2441/2445), while the in-app ledger correctly uses the `g-lock` SVG.
4. **Best moments:** the distress-filtered REDESIGN reveal stamp, the deterministic boiling rough-node engine, and the one-face/one-voice Coach system; the steed avatar holds up cleanly 22→92px (`51-steed-sizes.png`).
5. **All fixes are tokenization + one shape branch + ~4 new glyphs** (`--r-paper`/`--r-plain`, `--shadow-rest/hover/float/stamp`, pill-aware rough path, `i-select/i-arrow/i-info/i-chevron`, de-emoji export) — no app edits made; full evidence in `qa-design/craft/`.
