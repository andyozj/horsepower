# The Swap — Design Spec

**Status:** First solid pass.
**Date:** 2026-06-11
**Part of:** Horsepower PRD. Implements user-journeys A6, B4. Pairs with Rebuild spec §2.

---

## 1. What the swap is

The **rotation of canvases between teams**: on leaving Surface, each team's captured workflow goes to the **next** team to rebuild. The redesigning team works on **someone else's** workflow — never their own. Entering Rebuild *is* the swap.

---

## 2. Trigger (the Farrier)
- The Farrier clicks **Swap** → confirm dialog (it's irreversible-ish: capture locks).
- **Requires ≥2 teams.**
- State machine: `surface → rebuild`. After swap, **capture edits are rejected**; redesign edits accepted only in `rebuild`.

## 3. Rotation
- Deterministic ring: team[i] → team[i+1], last → first. Each team receives exactly one other team's canvas; each canvas goes to exactly one team.
- Odd/any team count: ring rotation handles it (no team gets its own).

## 4. The teardown — the Coach tears out the current process *for* Rebuild
The swap is **not just "hide the steps."** The Coach **tears the captured process apart** and hands the receiving team a **structured teardown** to rebuild from — so Rebuild starts from a real frame, not a blank "here's the need." Four parts:

- **Abstract brief** — **need** (intent + trigger) · **want** (outcome + personas). The HOW (phases/moments/steps) is **stripped** — *zero-leak* (a pain that names a step must be reworded as a problem). Domain label kept.
- **Areas of concern** — *where the problems are* (pains/friction), abstracted to the **problem**, not the step (e.g. "payments often late & error-prone" — not "manual reconcile takes 3 days").
- **Candidate constraints** — the captured WHYs that *look* like real constraints (accountability, legal, sole-access) — surfaced as **starting candidates, not verdicts.**
- **People inventory** *(added 2026-06-11)* — the roster of everyone in the original workflow: **role + capacity-ladder data** (accountable / approves / informed / contributes-data-they-hold / sole-knowledge / sole-access) + their abstracted WHYs. **Explicitly NOT attached to phases, steps, or sequence** — no step references in any description. This is a **deliberate, scoped exception to zero-leak**: without it the human-landing gate is vacuous (Team B can't land people it never saw — Rebuild spec §6), and the capacity ladder has nothing to run on. The leak is bounded: a list of *who exists and what they hold*, never *what they do in which order*.
- **Domain glossary** *(added 2026-06-11)* — Team A's decoded jargon from capture (capture §4) — "RO pack = the regional-office reporting bundle". Pure problem-space vocabulary; a stranger can't rebuild what they can't read.

**Every ingredient is a CONTEXT CARD.** Each delivered component — locked block, candidate constraint, area of concern, people card — lands carrying a **one-line context** visible on the card and the **full abstracted WHY behind a tooltip** (select/hover): *what this is, why it's here, what's locked or claimed about it* (e.g. a candidate constraint shows who claimed it + its capacity rung + "candidate, not verdict — pressure-test me"). All card content passes the zero-leak filter. This is what makes the scrambled ingredients *navigable* instead of cryptic (redesign §2a).

**Still fresh in Rebuild:** the candidates + areas are the *frame*; **Team B + the Coach pressure-test each one** (fair skeptic, constraint-vs-HOW). They are *not* pre-baked truth — so Team A's attachment can't smuggle its HOW through.

**Delivery — scrambled, Coach-placed.** The locked components (persona · intent · outcome · trigger · inputs) land on the Rebuild canvas **scrambled / only partially assembled**, *placed by the Coach* — **never in the original arrangement.** The layout itself is a hint of the old HOW, so it's stripped too. The team gets **raw locked ingredients, not an inherited structure** — reinforcing strip-the-HOW *and* zero-attachment.

This is what makes "redesign, don't retrofit" both **structurally enforced** (no steps, no inherited layout) *and* **actionable** (a real analysis to react to). The Coach's hardest job.

## 4a. Pre-compute + Farrier preview (added 2026-06-11 — the swap must be instant and QA'd)

The teardown is an LLM distillation per team. Generated *at* the swap, 2–6 simultaneous distillations would turn the stamp-slam — the workshop's peak theatrical beat — into a loading spinner. And a teardown that leaks a single step silently breaks the methodology, with nothing checking for it. So:

- **Pre-compute:** the Coach generates a team's teardown **in the background the moment its readiness gate first goes green**; cached server-side; **invalidated and regenerated on any material canvas edit.** At swap time the teardown is already sitting there — the reveal is instant.
- **Farrier brief preview (leak QA):** once a teardown exists, the Farrier can open it from the console drill-down **before swapping** — a human QA pass on the Coach's hardest, most failure-prone output. One read catches a leaked step name; a **"regenerate"** action requests a fresh distillation. Optional, never blocking.
- **Offline fallback:** no AI → the teardown degrades to the rule-assembled version (locked fields verbatim + pains re-worded by template + people inventory from captured data). Cruder, but the swap still fires.

## 5. The moment — the REVEAL (the curveball)  🤫
- **Until this instant, no one knew their process would be handed off.** The swap is a deliberate **surprise** — and it's *load-bearing*, not just theatre:
  - the redesigning team has **zero attachment** to a process they didn't capture → **anti-retrofit comes for free**;
  - no one captured *for* a redesign → the captures are **honest** (not gamed).
- The **`REDESIGN — DON'T RETROFIT` stamp** slams down (the one loud beat) and reveals the twist: *"Plot twist — you're **not** redesigning yours. You now hold **<Team X>'s** workflow, and yours is in someone else's hands. The old steps are gone — nothing to retrofit."*
- **Never spoil it earlier** — the Farrier does not pre-announce the swap; lobby + Surface never foreshadow it. (Product secret.)

## 6. Gate & override
- **redesign-ready?** (Surface gate — shown to teams as the **"Newcomer check"**, capture §5/§5a) should be green before a team is swapped (owner-real · phases-have-moments · intent-not-artifact · zero orphans).
- **Farrier override:** if a team isn't ready at swap time, the Farrier may swap anyway (flagged) or hold. Their call. The console shows **which receiving team** inherits the thin brief, so the Farrier knows who pays for the override.

## 7. Edges
- A team with an empty/very thin canvas → its receiver gets a thin brief; flagged to the Farrier pre-swap.
- Reconnect mid-rebuild → restores the received brief + redesign-in-progress.
