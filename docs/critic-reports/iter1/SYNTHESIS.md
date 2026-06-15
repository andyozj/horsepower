# Iteration 1 — panel synthesis & fix plan (7 critics, live run VN2E)

Zero console/page errors on every seat, full arc completed. Praise consensus: the reveal
beat, the reclaim modal, the amendment compare card, offline-toast honesty, the inspector,
copy quality ("C+ affordances, A copy" — Mara). Now the cuts.

## False alarms (verified against source)
- Farrier's "garbled Rebuild cue" — file copy is clean; critic transcription error.
- Farrier's "0 teams/0 members" findings — his own DOM-probe bug (swap+presenting ran).
- Jonas's reveal "blocker" — scrim is modal BY DESIGN until "Let's build"; his driver
  skipped the click. Mitigation still warranted (see fix I).

## FIX BATCH (iteration-2 targets)
A. **Debounced commits** for block labels + inspector WHY (Theo BLOCKER: device death
   between typing and blur loses content for the whole team — geometry survives, text dies).
B. **`<details>` open-state survives re-renders** (Mara HIGH: gate checklist + assumptions
   ledger snap shut mid-read on every broadcast) — ui.detailsOpen registry.
C. **Tap is the WHY channel, not hover** (Mara/Ravi HIGH): ingcards + locked tips toggle
   on click; hint copy "tap — the why"; thin-flag reasons surface inside the inspector
   ("the Coach flagged: …") instead of title-attr-only.
D. **Phone lanes** (Ravi HIGH): gatebar fixed above palette; pills/coach/zoom in distinct
   bands; palette right-edge fade + chevron (6/10 tools were invisible); phone canvas
   auto-fits content on mount (keyhole problem).
E. **Race card**: drop esc() in text node ("&amp;"), pluralize "1 people landed",
   cap deal-in delay ≤3s (blank-during-share).
F. **Chips answer from RULES, not the bank** (Jonas HIGH): "What's thin?" lists the actual
   thin reasons; "Run the Newcomer check" lists failing checks — both from governance,
   offline-perfect. Bank dedup widened to last-3.
G. **Parking lot**: visible ✕ dismiss per orphan ("let it go"); positive gate copy
   ("N notes still parked" not "✕ Zero unresolved orphans"); drop placement staggered +
   toast (Iris HIGH: the app's own warm-up prompt gate-blocked the team with no visible exit).
H. **Scratchpad visible pre-saddle** (Nadia HIGH: hidden behind "Let's ride").
I. **Reveal scrim**: click-anywhere dismisses once the CTA is shown (safety for walk-aways).
J. **Amendment card**: reason line made unmissable; Farrier drill: roster above mirror,
   mirror 48vh (below-fold tools).
K. **Verdict feedback**: lock:resolve posts a system chat line to the team (silent verdicts).
L. **Diff strip**: drop zero-count bullets; ledger chips carry capacity ("Ops lead (accountable)").
M. **Console**: phase-aware stat cards in share/closed; "clock loaded — Start when ready"
   nudge on phase entry.
N. **Catch-up card**: adds a live team-state line (N blocks + the intent so far).
O. **Polish strip**: shows the running phase clock ("M:SS on the room clock").
P. Rebuild entry stagger capped (~70ms/block, max 10) for stability.

Deferred (logged, not iteration-2): picker first-paint skeleton; curly-apostrophe audit;
share-mini readability on phone (depends on art); wait-horizon beyond the room clock.
