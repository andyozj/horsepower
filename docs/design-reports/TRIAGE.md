# Design tribunal — triage ledger

> **STATUS: CLOSED — SIGN-OFF YES (2026-06-13).** All fix batches shipped & verified
> (34 contract + 64 UAT + 20 fixcheck green). Independent re-verdict with 37 evidence
> files + computed measurements: `REVERDICT.md` / `qa-design/reverdict/`. One PARTIAL
> found at re-verdict (moment/input/agent washes still a grey cluster) fixed and
> re-measured in the same pass (moment 30%, agent 19%).

Rule: every claim verified against source before it costs a fix. Fixes implemented
only after ALL six critics finish capturing (live edits would corrupt their evidence).

## typography.md — VERIFIED, all real (1 root-cause correction)

| # | Claim | Verdict | Source | Fix plan |
|---|-------|---------|--------|----------|
| 1a | Race card h3 hard-clips mid-word, swash sheared | REAL | `index.html:646` nowrap+inline-block+inset-shadow defeats ellipsis | 2-line clamp (`-webkit-line-clamp:2`), highlighter as inline `linear-gradient` background so it follows wraps |
| 1b | Lobby/share/console show "…Squa" | REAL but ROOT CAUSE = server 40-char name clamp (42-char test name stored pre-clipped) | `server.js` name clamp | `maxlength=40` on create-team input (+ keep clamp server-side); CSS wrap for lobby/share headings so ≤40-char names never nowrap-clip |
| 1c | Console table cell ellipsis | REAL | `.tn-ell` exists (574) but verify it's applied to console td | apply `.tn-ell` + `title` attr in console table |
| 2 | "removed" clips to "remove" in land tray | REAL | `:661` `.ctrls` flex, no wrap | `flex-wrap:wrap` on `.ctrls` |
| 3 | Caveat 16px `--muted` carries functional status (statusline, offline subhead, land-tray subhead, peek pill) | REAL | `:194` etc. | state/instruction strings → Caveat 18px/600 `--muted-strong` or Inter 13px; decorative Caveat untouched |
| 4 | 12px floor overloaded (inspector labels, locked eyebrow, briefblock .h, land buttons…) | REAL (grep confirms many 12px functional sites) | various | raise functional secondary floor to 13px; keep 12px for badges/chrome only; locked eyebrow tracking .08em→.06em |
| 5 | Label/placeholder case mismatch ("Your name" / "your name") | REAL | landing form | sentence-case placeholders |
| 6 | Em/en-dash inconsistency | PLAUSIBLE | literal strings | audit ` - ` / ` – ` in UI strings → ` — ` |

Praise (keep, do not regress): wordmark/code-throne/timer display setting, tabular
nums, opsz ladder, stamp typography, Caveat-as-annotation.

## craft.md — VERIFIED (all line citations check out)

| # | Claim | Verdict | Fix plan |
|---|-------|---------|----------|
| 1 | Trigger pill drawn as wobbly rectangle | REAL — `roughRect` (1510) is 4 straight wobble segs; `.node.trigger` is 999px pill (253) | `roughPill()` branch: 2 wobble horizontals + 2 arc ends; flag from PALETTE type |
| 2 | Two radius families (hand vs plain) | REAL | tokens `--r-paper`/`--r-plain`; share/keepsake/lobby cards adopt paper radius; console table/stats stay plain but consistent |
| 3 | ~25 shadow recipes | REAL | tokens `--shadow-rest/hover/float/stamp`; sweep |
| 4 | `⌖`/`↗` toolbar dingbats (1581-2) | REAL | add `i-select`/`i-arrow` symbols, render via glyph() |
| 5 | `ⓘ` locked info (1719) | REAL | add `i-info` |
| 6 | Export pack emoji 🐎⚠🔒✂️ (2441/2445) | REAL (export is known off-system; emoji still worth fixing) | inline SVG / typographic marks in export template |
| 7 | land-btn clip + 8px radius (third value) | REAL — dup of typography #2 | flex-wrap + reuse `.btn.sm` radius |
| 8 | `.btn.sm` plain 9px | REAL | small asymmetric radius |
| 9 | tilt family inconsistent (orphan wiggles, landperson flat, assumption flat) | REAL | seeded `--rot` on all paper scraps, flatten on hover |
| 10 | disabled CTA reads broken | REAL | faint highlighter tint + dashed ink border for gated runcta |
| ◖ | collapsed-rail fallback dingbat (2032) | REAL | `i-chevron` or coach face |

## brand.md — VERIFIED

| # | Claim | Verdict | Fix plan |
|---|-------|---------|----------|
| 1 | Farrier console = generic SaaS admin (HIGH; fails squint) | REAL | re-skin finish only: stats → ink-border paper cards + Fraunces numerals + glyphs; team table → stable-flavoured roster rows (steed glyph + Fraunces name); needs-you → warm-amber card. NO structural change |
| 2 | Team picker ontology tour sparse/marooned | REAL | connect tour blocks with hand-drawn arrows into a micro-map; tighten column |
| 3 | Share room-view minis overlap nodes (projector money shot) | REAL | collision-nudge pass in renderMini for presented/share minis only |
| 4 | Canvas nodes read "tool" at squint | REAL (LOW) | rolls into color wash recalibration + label size +1 |
| 5 | Code numerals lighter than caps | REAL (LOW) | bump weight/axis for digits in code throne |

## layout.md — VERIFIED

| # | Claim | Verdict | Fix plan |
|---|-------|---------|----------|
| 1 | Runbar flex-wraps; CTA orphaned below stepper | REAL — `.runbar` has `flex-wrap:wrap` (364) | 3-zone grid `auto 1fr auto`, nowrap, timer presets collapse <1360px |
| 2 | Rebuild bottom/right chrome accreted; coach btn 14px above zoom | REAL — landpill/assumefloat/viewctl/railtoggle all independently anchored (282/668/672/506) | one bottom shelf: consistent insets/baseline; move coach peek above shelf (right:16 bottom:88 desktop) |
| 3 | Rail open in Rebuild occludes landtray/candidate cards | PROBED (qa-design/probe-rail.js): rail DOES reflow (canvas 1440→1100). Real bug = the viewport-anchored landtray slides left onto the world-coord candidate band (tray x:852 vs cards r:892). Fix: auto-fit rebuild world to (canvasW − trayW) on rail toggle/mount |
| 4 | 1920 wastes 40-60% (console card, rebuild seed cluster, landing drift) | REAL | console lobby: place-items center; rebuild: auto-fit on mount at desktop too; landing/picker: max-width 1400 centered |
| 5 | CHALLENGE stamp detaches at 1920 | REAL | anchor stamp to h1 stacking context |
| 6 | Surface bottom band 3 mis-baselined objects | REAL | zoom docks into gatebar right (`margin-left:auto`); orphan tray bottom aligns to gatebar top |
| 7 | Team-name clipping (dup of typography 1b) | REAL | covered above |
| 8 | Console runscript block ungridded | REAL | align left edge to content grid / single-line strip |
| 9 | Lobby left column dead band | REAL | center inner column as group; lone glyph → footer |
| 10 | Share left header bare vs right ruled | REAL | muted thin rule on left |

## color.md — VERIFIED (computed ratios in qa-design/color/ratios.json)

| # | Claim | Verdict | Fix plan |
|---|-------|---------|----------|
| 1 | 7 of 10 washes collapse to one grey | REAL (hexes resolved) | raise quiet mixes (trigger 18% ok, input 14% muted, moment 22% moment-blue, agent 14%, lock 16%) |
| 2 | outcome/intent washes shout | REAL | outcome → 22% highlighter; one perceptual ramp |
| 3 | gate chips `--thin` 3.55:1 (13px) | REAL FAIL | darken thin-text token → `#7a4f07`/`#8a5a08` where text |
| 4 | `--muted` ≤13px fails on washes | REAL | rule: ≤13px functional text uses `--muted-strong` (aligns w/ typography #4 floor) |
| 5 | four yellows unranked; gold heading 2.53:1 | REAL FAIL | gold for border/dog-ear only; CANDIDATE label → darkened amber/ink |
| 6 | ctag 2.96:1 | REAL | same |
| 7 | Share figure-ground 1.89:1 edges | REAL (LOW) | share cards: stronger edge `color-mix(ink 14%)` |
| 8 | poster grain vestigial | REAL (LOW) | lift dot alpha ~15-20% on poster surfaces only, canvas untouched |

## motion.md — pending

## Cross-report convergences (high-confidence themes)
- Console finish is the #1 brand gap (brand #1 + layout #1/#8 + craft #2) → one console pass: runbar grid + paper-card stats + stable roster rows + aligned runscript.
- Small-text floor: typography #4 + color #4 → one sweep (13px floor + muted-strong).
- Land tray buttons: typography #2 + craft #7 + layout (mobile clip) → flex-wrap + radius.
- Team-name long-content: typography #1 + layout #7 → input maxlength + wrap/ellipsis sweep + race-card 2-line clamp w/ gradient highlighter.
- Rebuild chrome shelf: layout #2/#3 + craft #9 (tilt) → one rebuild-canvas pass.
