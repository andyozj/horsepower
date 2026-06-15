# Re-verdict — design tribunal fixes (2026-06-13)

**Method:** an independent examiner agent drove a live multi-actor workshop at 1440/1280/1920,
capturing 37 evidence files + 3 measurement JSONs into `qa-design/reverdict/` (it hit a session
limit before authoring this document; the adjudication below was completed from its complete
evidence by the lead, with one follow-up fix and re-measurement). All verdicts below cite
computed values from `measurements*.json` or named screenshots.

## Verdict table

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | Race card h3: 2-line wrap, gradient highlighter follows wrap, no clip | **FIXED** | `racecard.postScroll`: lines:2, clamp:2, hlBg linear-gradient, overflowing:false; `race-card.png` |
| 2 | Land-fate buttons never clip ("removed" intact) | **FIXED** | `landtray`: wrap:wrap, all 3 buttons clip:false; `landtray.png` |
| 3 | Statusline Caveat 18px/600 muted-strong | **FIXED** | `statusline`: 18px / 600 / rgb(74,84,104) |
| 4 | 13px functional floor (inspector label, locked eyebrow .06em, briefblock) | **FIXED** | `inspector.label` 13px muted-strong; `locked.small` 13px / 0.78px tracking |
| 5 | Placeholders sentence-cased + maxlength 40 visible | **FIXED** | `teamname.capped`: typed 41 → kept 40, maxlength attr present |
| 6 | Washes distinct by fill alone | **FIXED (after follow-up)** | First measurement showed moment/input/agent still a grey cluster (the cream's low blue channel eats the moment-blue mix). Follow-up: moment 15→30%, agent 14→19%. Re-measured: moment (.857,.873,.920) cool blue · agent (.807,.802,.781) dark stone · input (.879,.868,.838) warm light — plus green trigger, violet persona, warm phase/intent, yellow outcome, rose pain. Ten tellable washes. |
| 7 | Gate chip text #7a4f07 on warn-wash (AA) | **FIXED** | `gchip.bad`: rgb(122,79,7) = 4.6:1 |
| 8 | Candidate kick in --thin-text not gold | **FIXED** | `candidate.kick`: rgb(122,79,7) |
| 9 | Poster dot-grid alpha .135 | **FIXED** | source: all poster surfaces at rgba(33,49,79,.135); canvas untouched at .13 |
| 10 | Runbar one row, CTA on stepper baseline (1280/1440/1920) | **FIXED** | `runbar.*`: dy=0 at all three widths, ctaBelowStepper:false |
| 11 | Surface zoom docked in gatebar | **FIXED** | `surface.zoomDock`: dockedInGatebar:true, 0 floating viewctls |
| 12 | Rebuild content clear of people tray, both rail states | **FIXED** | `rebuild.occlusion.*`: 0 occluded of 7 items in collapsed AND rail-open |
| 13 | Coach peek clears the zoom corner | **FIXED** | `rebuild.peekZoom`: 46px vertical gap |
| 14 | Landing/picker centered at 1920; stamp anchored to headline | **FIXED** | `landing.centering1920` gutters 230/270 (≈balanced); `landing.stampVsH1`: stamp x:933 inside h1's run (right edge 1110), 25px above its top — overlapping the wordmark's shoulder, not floating in the gutter |
| 15 | Console lobby card vertically centered at 1920 | **FIXED** | `console.lobbyCenter1920` + `console-lobby-1920.png` (band split above/below) |
| 16 | Trigger rough stroke follows the pill | **FIXED** | `trigger.pathD` (wobble run inset by the radius + arc ends); `trigger-pill.png` |
| 17 | ⌖ ↗ ⓘ ◖ replaced with i-select/i-arrow/i-info/i-chev | **FIXED** | source grep clean; toolbar/locked/rail screenshots |
| 18 | Export pack emoji-free | **FIXED** | `export.emoji`: count 0 (title/comments exempt); `export-pack.png` |
| 19 | landperson + assumption seeded tilt, flatten on hover | **FIXED** | `landtray.tilt` + `assumption.tilt` matrices ≠ identity; `assumption.hoverFlat` = identity |
| 20 | Disabled runcta reads armed, not broken | **FIXED** | `runcta.disabled`: opacity 1, highlighter-tint bg, dashed border; `runcta-disabled.png` |
| 21 | Console stats = paper cards (r-paper, Fraunces 38, glyph, tilt) | **FIXED** | `console.stat`: radius 14/11/15/12, Fraunces 38px, hasGlyph, rotation matrix |
| 22 | Roster rows Fraunces 17px + steeds | **FIXED** | `console.teamRow`: Fraunces 17px/600, 2 steed SVGs |
| 23 | Console squint test | **IMPROVED** | `squint-console.png`: highlighter CTA + timer + tilted paper cards + Caveat whispers now survive the blur — warm Horsepower register, no longer flat-beige-admin. (Full canvas-parity was never the goal: data stays data.) |
| 24 | Presented minis never overlap | **FIXED** | `share.miniOverlap`: worstOverlapFrac 0 on both minis (incl. a deliberately-overlapped source map) |
| 25 | Racecard deals in-view; reduced-motion safe | **FIXED** | `racecard.preScroll/postScroll` (.dealt on view, opacity 1) + `racecard.reducedMotion`: opacity 1 |
| 26 | Timer pulse → scale heartbeat | **FIXED** | source: `heartbeat` keyframe (transform scale), no opacity blink on .low |
| 27 | Teardown assembles left→right (shared cadence) | **FIXED** | `rebuild.ingcardEnter`: 2/2 cards with .enter, delays 350/420ms (after locked blocks) |
| 28 | Landing hero strokes .85 alpha / 2.4px / .9s draw | **FIXED** | `landing.heroStroke`: rgba(33,49,79,0.85), 2.4px |

## Regressions
- **None observed.** `pageerrors`: empty on Farrier, both members, and the room view.
  All suites green after every batch and after the follow-up wash tweak
  (34 contract + 64 browser UAT + 20 fixcheck).
- Two test-suite adaptations were required because the rebuild auto-fit legitimately changed
  the screen↔world mapping under hardcoded coordinates (deselect-via-tool-switch; `emptySpot()`).
  These reflect the new intended behavior, not workarounds for breakage.

## Notes / adjudicated remainders
- "…Squa" on the race card in the evidence is the examiner's 41-char test name stored at the
  server's 40-char clamp — the input now caps visibly at 40 while typing, so a real team sees
  the cut at entry time, never on the keepsake.
- `briefblock.h` / `candidate.ctag` probes returned null (elements absent in the driven state);
  both were source-verified (13px / --thin-text).
- The green left-border sliver hugging the trigger pill's left arc is the per-type hue border
  on a 999px radius — pre-existing, reads as the type accent.

**SIGN-OFF: YES** — every HIGH and MED finding from all six reports is FIXED (or improved with
rationale, #23), the one PARTIAL found during re-verdict (wash grey-cluster) was fixed and
re-measured in the same pass, and no regressions surfaced.
