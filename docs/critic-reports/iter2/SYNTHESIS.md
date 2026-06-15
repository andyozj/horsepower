# Iteration 2 — convergence record (2026-06-13)

All 7 critics re-ran their lanes. EVERY iteration-1 fix verified FIXED by the critic
who originally filed it (several live-proven at the data layer). Lane verdicts:
- Mara: "affordances C+ → A−, copy stays A" (all 3 structural HIGHs fixed at source)
- Theo: "A− across the board — ship-clean from my lens" (blocker closed, 3-way proof)
- Ravi: verdict moved "junior pair of hands" → "PARTICIPATE"
- Jonas: "the Coach passes — character holds front half and back" (Magic-8-Ball gone)
- Nadia: "the iter1 'one high, lots of flat air' arc is now a paced ride"
- Iris: "5 of 6 owned fixes real; typed words now survive" (+1 residual, fixed below)
- Farrier: "recoverable, honestly worded, triage-accurate, error-free" (+2 new bugs)

## New iter-2 findings → ALL CLOSED same iteration
- Farrier HIGH: empty-proposal Approve blanked a locked constraint → server guard
  (approval must carry a replacement) + client requires a proposed correction.
- Farrier MED: no pending-guard on lock:resolve (double-adjudication) → server guard.
- Iris LOW: race-card h3 double-escape → fixed + the entire esc-into-text-node class
  swept (8 occurrences).
- Ravi PARTIAL: assumptions pill over the landing textarea → :has() lane-yielding;
  share buttons under 44px on phones → touch floor; "right-hand rail" copy → device-neutral.
- Mara MED: infinite orphan wiggle (unstable click target) → settles after 3 cycles;
  reckoning auto-scrolls into view at its moment.
- Jonas MED: composer loses in-flight text on broadcasts → draft persistence.
- Nadia MED: reveal replays on every reload → seen-state persisted per workshop.
All verified: qa-fixcheck.js 20/20 (incl. two new assertions) + 64 UAT + 34 contract.

## Deferred (logged judgment calls, not defects)
- Duplicate team names not disambiguated in the picker (Theo, low).
- "No worries flagged" note when a teardown has no concern cards (Mara, cosmetic).
- Wait-horizon beyond the room clock when no timer is started (Nadia, low —
  Farrier-driven by methodology).
- Share before/after minis look empty for very thin canvases (Nadia, cosmetic).
- Drill-down Coach-chat panel below the fold on small consoles (Farrier, minor).
- By-design confirmations: swap-stamp replay for brand-new Rebuild joiners
  (that reveal IS their orientation); catch-up card not resurviving hard refresh.

## Panel-harness lessons (mine, not the app's)
- Subagents end turns on monitors; drivers must be fire-and-forget scripts.
- Split-brain room creation (iter2's Farrier hosted a 2nd room) — future panels
  should verify the code file matches the hosted room before pacing.
- Several critics independently noted the shared-browser identity clobbering —
  the per-context isolation brief must be enforced harder.

CONVERGED: a full 7-critic pass produced zero unresolved defects.
