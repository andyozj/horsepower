# Mara — Affordances & Discoverability critique (iter 2)

**Run:** self-hosted workshop `PDP6` (the live coordinated Farrier was mid-run on a stale code; per the
sync rule I drove a clean, controllable room). Joined as **Mara → Credit Desk**; a partner steed
(**Pat → Fleet Ops**) built a parallel gate-green map so the swap delivered Credit Desk a *real*
teardown (candidate + locked cards) — the gap that left iter-1's fix-C2 unevaluated. Full arc
lobby → Surface (gate-green, inspector capacity+why) → swap → Rebuild → Share → closed.
Driver `qa-critic2/mara/driver.js`, shots `01–20`, raw `qa-critic2/mara/notes.txt`. 1440×900.
**Zero page/console errors** the whole run (one harmless favicon 404). All claims grounded in live DOM
probes + pixels, cross-checked against `public/index.html` / `server.js`.

---

## Fixes verified

### Fix B — `<details>` open-state survives re-renders. **FIXED** (both halves)
The two methodology widgets that iter-1 caught snapping shut mid-read now hold open through a broadcast.
- **Gate (Surface):** opened the Newcomer-check, then forced a full re-render by dropping a block
  (`canvas:update` → server broadcast → `render()`). Probe: `gate.open = true` **before** *and* **after**
  the edit (notes: `FIX-B/gate before {"gate":true}` → `after {"gate":true}`). Shots `06`→`07`:
  the checklist is still expanded after the new block lands. Mechanism confirmed in source:
  `keepOpen(el(...),'gate')` (`:2003`) re-applies `open` from `ui.detailsOpen` on every render (`:1511`).
- **Assumptions ledger (Rebuild):** the ledger lives in Rebuild, not Surface (`assumptionsWidget`,
  appended `:2146`) — so iter-1's "log → snaps shut" path is *here*. Logged a real assumption (count→1),
  opened the ledger, dropped a Rebuild block to broadcast: `assume.open = true` **before and after**
  (notes: `FIX-B/ledger before {"open":true}` → `after {"open":true}`). Shots `15`→`16`.

The single primitive iter-1 flagged as "broken by design" is repaired at the source, and it covers
both widgets via the same `keepOpen` registry. This was my top structural finding; it is genuinely gone.

### Fix C — tap is the WHY channel, thin-reason surfaces inline. **FIXED** (all three sub-claims)
- **Thin-flag reason now lives *inside* the inspector, not in a `title=` tooltip.** Selected the
  why-less persona (a real thin condition per `server.js:142`) and the inspector renders an inline
  red **coachflag**: *"the Coach flagged: why does this role exist? the back of the card is blank"*
  (notes `FIX-C1 count=1`; shot `04` shows the red callout above the capacity segment). This is
  readable on a projector, fires on touch, and is a proper DOM node — every objection from iter-1 #1
  is answered. Source: `:1652`, gated on `opts.gov.thin`.
- **Candidate card: CLICK toggles the WHY open; hint reads "tap — the why".** Tapped a CANDIDATE
  CONSTRAINT card ("Fleet dispatcher") in the teardown: hint copy = `"tap — the why"` (notes), and
  after the click `.ingcard.candidate.open` count=1 with `.why` **visible=true** (shot `13` shows the
  WHY revealed). The hover-only dependency is gone; touch users get the WHY. Source `:1620-1622`.
- **Locked card: locktip shows while *selected* (no hover).** Clicked a locked card; `.node.locked.sel`
  count=1 and the `.locktip` is **visible** with its "Challenge this" amendment hatch beneath
  (shot `14`). Source `:270` adds `.node.locked.sel .locktip{display:block}`. Iter-1's
  "hover failed — element not stable" complaint is structurally defused: selection, not hover, is
  now the channel.

### Fix G — parking lot has a visible exit + a placement cue. **FIXED** (with one residual, below)
Added two orphans; each chip carries a visible **× ("let it go")** control (notes `.olet=2`; shot `08`).
Clicked × → orphan count 2→1 (the "let it go" path works). Mapped the remaining one → a **placement
toast fires**: *"Parked note placed on the map — drag it home."* (notes; shot `10`). And the gate copy
is now **positive/honest**: while orphans are parked the gatebar reads *"2 orphans"* + the checklist
line *"✕ Parking lot cleared (map it or let it go)"* — a comprehensible instruction, not iter-1's
contradictory "✕ Zero unresolved orphans." The drop is staggered by orphan index (`:1937`) rather than
the old hardcoded (140,140) teleport. The dead-end iter-1 described (no visible exit) is gone.

### Fix L — Share has an empty-reckoning state. **FIXED**
With Fleet Ops having logged no assumptions about Credit Desk's world, the Share page renders an explicit
empty card: **"No guesses to reckon — Fleet Ops's team logged no assumptions about your world — rare.
Ask them live what they had to guess."** (notes; shot `19`). Source `:2302`. Iter-1's #6 "promises a
reckoning then ghosts" is answered — the absence is now *narrated*, not silent. As a bonus the symmetric
"Your guesses — Fleet Ops judges them" section *does* render the assumption Credit Desk logged about
Fleet Ops, so both directions of the reckoning are wired.

### Medium re-test — the rosette revoke is now comprehensible. **FIXED (acceptable transition)**
Iter-1 #5 said the rosette was "silently revoked." Re-tested: adding an orphan after gate-green does
drop the rosette (notes `rosette WHILE orphans parked = 0`), but the **transition now reads honestly** —
the gatebar simultaneously shows the `2 orphans` chip and the checklist flips to `✕ Parking lot cleared
(map it or let it go)`, so a team can see *exactly why* saddle-ready lapsed and what restores it.
After clearing the parking lot the rosette returns and the gate reads `✓ ready` (shot `11`). The gate
honestly reflects state and the new chip copy makes the cause legible. Judged: acceptable.

---

## New problems

1. **The orphan × is a perpetually-moving click target. Severity: MEDIUM.** The × ("let it go") works,
   but the chip carries `animation:wiggle 3s infinite` (`:307`), so the control never holds still —
   my driver could only hit it with a Playwright `force` click; a normal click times out on
   "element is not stable." A human with a trackpad or a tablet is fighting a wiggling 13px target.
   The fix added the *control*; it didn't quiet the *motion* under it. Killing the wiggle on
   `:hover`/`:focus-within` (or while the × is the pointer target) would finish the job — and would
   also honour the calm-working-canvas principle (§12: play lives in waiting moments, not on a control).

2. **The teardown can still deliver zero of a promised card species, silently.** Iter-1 #9 lives on:
   whether you get candidate/concern cards depends entirely on what the *source* team built. A team
   whose partner skipped pains gets no red concern cards while the arrival legend still names them.
   Not a regression — just unaddressed. A one-liner ("no worries flagged on this one") would close it.

3. **Share payoff still below the fold at 1440×900 (iter-1 #10, unaddressed).** The reckoning/ledger/
   race-card sit under an unprompted scroll; shot `17` (share arrival) shows only the before/after.
   Logged, not new, but still true.

## What's genuinely good

- **The fix batch landed where it counts.** The two disclosure primitives iter-1 called "broken by
  design" — `<details>` and hover-for-WHY — are both repaired at the *source*, not papered over:
  `keepOpen` is a registry every widget shares, and tap/selection now carry the WHY everywhere
  (inspector coachflag, ingcard `.open`, locked `.sel`). That is the right altitude of fix.
- **The inline coachflag is the standout.** "the Coach flagged: why does this role exist? the back of
  the card is blank" — the *rule's own words*, inside the card you're editing, in red, on a real node.
  This is the affordance standard the rest of the app already aspired to, now met.
- **The parking-lot copy turned a contradiction into an instruction** ("map it or let it go") — the
  gate now teaches the exit instead of just scoring you down for an orphan.
- **The empty-reckoning copy is warm and useful** — it reframes the absence as a *prompt* ("Ask them
  live what they had to guess. — rare"), exactly the teach-don't-scold pattern the people tray set.
- Zero console/page errors across the full multi-actor arc; the swap confirm-modal, reveal CTA, and
  phase cross-fades all behaved.

## Verdict

Every one of my three iter-1 HIGH findings is fixed at the source, and fixed *well* — state-preserving
renders via a shared `keepOpen` registry, and a non-hover WHY channel (tap + inline coachflag + selected
locktip) that finally serves tablets and projectors. The mediums (rosette revoke, empty reckoning) are
resolved with copy that teaches rather than ghosts. The one thing the batch didn't finish is the
**wiggling × control** — the affordance is now present but still mounted on a moving target, which is a
real touch/precision problem. That, plus the still-below-fold Share payoff and the silently-absent card
species, are the remaining affordance debt. The copy stays A; **affordances jump from C+ to A−** — the
delivery mechanics now match the words. Quiet the orphan wiggle and pull the reckoning above the fold
and it's a clean A.

---

### 5-line summary
1. **All three of my HIGH iter-1 findings: FIXED at the source** — `<details>` open-state survives broadcasts (gate + ledger, both halves probed open before/after), and the WHY is now a tap/selection channel, not hover.
2. **Fix C verified end-to-end:** inline coachflag "the Coach flagged: <rule reason>" in the inspector; candidate card tap toggles WHY open with "tap — the why"; locked card shows its locktip while selected.
3. **Fix G + L verified:** orphan × ("let it go") works, placement toast fires, gate copy is now a comprehensible "map it or let it go"; Share renders the explicit "No guesses to reckon…" empty state.
4. **New MEDIUM:** the orphan × sits on a chip with `wiggle 3s infinite` — a perpetually-moving click target (needed a force-click); quiet it on hover/focus.
5. **Verdict: affordances C+ → A−, copy stays A** — delivery mechanics finally match the words; remaining debt is the wiggle, below-fold Share payoff, and silently-absent card species.
