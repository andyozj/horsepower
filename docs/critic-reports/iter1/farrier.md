# Farrier console — critic report (iter1)

**Run:** live 7-agent room, code `VN2E`, 3 teams (Ops Crew · Credit Desk · Fleet Ops), full facilitator journey host → lobby → Surface (6m timer) → swap → Rebuild (amendment adjudicated) → Share (present pairs) → close.
**Evidence:** `qa-critic/farrier/00..23-*.png`, `/tmp/hp-critic/farrier.log`, `/tmp/hp-critic/theo-run.log`.
**Console/page errors:** none captured (`farrier.log` === CONSOLE ERRORS === [] / PAGE ERRORS === []).

> **On the log's headline findings (F1/F2 "0 teams / 0 members"):** these are **driver parsing bugs, not product defects.** The setup card (`04-lobby-teams-assembled.png`) lists all three stables; every dashboard stat card reads **"3 teams"** (`05`, `09`, `11`, `16`, `23`); the swap modal names all three teams (`10`); the present-picker generates three real pairings (`16`); and `theo-run.log` independently drove Credit Desk with named members (Mara, Theo) through a real 7-node canvas and the swap reveal. A swap and presenting-pairs both require >=2 teams server-side, and both ran. The room was populated; the driver's roster scrape just missed it. **Attributed to the driver.**

---

## Problems

1. **Stat cards show Surface/Rebuild labels in Share and Closed phases — stale and misleading.** *(minor, console-only)* — `21-share-after-reckonings.png`, `23-closed-console.png`. On a workshop that has been presented and closed, the four KPI cards still read **"0 redesign-ready / 0 still capturing / 2 orphans blocking."** "2 orphans blocking" on a *closed* room is nonsense to a facilitator — capture is long over. The cards never re-label for the share/close context (where the meaningful counts would be pairs-presented / ledgers-settled). A first-time facilitator reading "2 blocking" at close would reasonably think something is wrong.

2. **The Share timer auto-loads but is never prompted to start, and the run completes with it frozen.** *(minor)* — `16`, `17`, `19`, `20`, `21`, `22`. Every Share shot reads **"10:00 · paused."** The run-of-show cue says "Watch for the assumption reckonings settling," but the timer the whole methodology leans on ("the Farrier's timer always rules the room") sat un-started through the entire present-and-reckon window. Either the cue row should nudge "Start the clock" when entering a phase with a loaded-but-paused timer, or the phase-advance should offer to start it. Same pattern at Rebuild entry (`11`: "30:00 · paused" — loaded, not running) — the Farrier must remember to hit Start every phase, with no affordance reminding them.

3. **Amendment card omits the team's rationale / WHY.** *(major)* — `12-amendment-card.png` (panel: "Ops Crew wants to amend **intent**", LOCKED NOW "decide: approve, refer, or decline" vs THEY PROPOSE "decide pay vs dispute before month-end", Approve / Deny). The card is *decidable on the what* — the before/after diff is crisp — but it gives the Farrier **no reason** for the change. Locked-constraint amendments are the single sanctioned mutation path (Rule 4); approving one blind, with no "why they're asking," is exactly the rubber-stamp the lock is meant to prevent. CLAUDE.md claims these cards also show "the brief's original intent" as a third reference — I do **not** see a third column in the evidence (only locked-now vs proposed). Either it's not rendering or it's cropped; either way the adjudication context is thinner than the spec promises.

4. **"<- all teams" back-control failed to click during the run.** *(major — needs verification)* — `farrier.log` line `[14:18:37] click failed text=<- all teams TIMEOUT`. After drilling into a team mirror (`07-team-mirror-roster-coach.png` shows the "<- all teams" / "Remove" header), the driver could not return via that control when advancing to Share. Could be transient (phase changing under it) or a real dead/obscured button. If a facilitator who has drilled into a team can't reliably get back to the dashboard, that's a trap. **Cannot fully disambiguate from a single log line — flag for a targeted retest.**

5. **Team-drill "live board" looks bare — promised roster/coach-conversation surgery not visible.** *(minor)* — `07-team-mirror-roster-coach.png`. The drill-down renders only a read-only canvas mirror ("Ops Crew — live board", read-only badge, ~3 sparse nodes) plus "<- all teams" / "Remove." CLAUDE.md advertises drill-down "roster surgery (remove / move-to select)" and a live "Their Coach conversation" — neither is on screen in this shot. If they live below the fold, the shot doesn't prove it; as captured, the drill-down under-delivers against its own spec and a facilitator wouldn't know the roster tools exist.

6. **"Progress: 0 blocks / 0 built" while teams demonstrably have canvas content.** *(minor — likely a metric-semantics gap)* — `05` table ("0 blocks" for all three teams), `12` rebuild table ("0 built"). `theo-run.log` reports Credit Desk's canvas already had **7 nodes**. The column almost certainly means *member-authored* blocks (excluding seeded/teardown blocks), but the bare label "0 blocks" reads, to a facilitator, as "this team has done nothing" — when they may have a full as-is map. The metric needs a label that distinguishes authored-from-seeded, or it will mislead triage.

7. **Surprise-vocabulary boundary is correct on the console but worth a deliberate guard.** *(not-a-defect, flagged for vigilance)* — The private console correctly uses honest names ("Swap -> Rebuild" CTA, `10` swap modal, "Lock amendment requests"). This is *right* — the console is never projected (Rule 2). The room view (`02`, `18`) stays clean. No leak observed. Logged only so a future change that ever projects the console would be caught as a blocker.

---

## What's genuinely good

- **The run-of-show cue row is the standout feature.** Every phase carries a three-line scripted block — **Say now / Watch for / Move on when** — in plain facilitator language (`06`: *"Map your real workflow exactly as it runs today... Don't fix anything yet."* / *"parked items and thin spots block the gate — nudge anyone stuck"* / *"Most teams ready and the room's energy dips -> load the clock, let it ring, then Swap -> Rebuild"*; `11` and `16` equally specific). A first-timer could literally read these aloud and run the room. Not filler — it's the difference between "I have a console" and "I can facilitate."

- **The single-CTA forward model is genuinely run-from-one-button.** The primary button re-labels per phase — **Start Surface -> Swap -> Rebuild -> Move to Share -> Finish & close** (`01`, `06`, `11`, `16`, `22`) — with a guarded "step back" alongside. No phase-jumping, no decision paralysis. The stepper (`01`, `05`, `11`) shows green-check completed / gold-active / grey-pending and tracks correctly throughout.

- **Destructive/irreversible actions are guarded with the *consequence stated*, not just "are you sure."** Swap modal (`10`): *"Ops Crew, Credit Desk, Fleet Ops **not** redesign-ready — their receiving team inherits a **thin brief**. [Cancel] [Swap now]"* — it tells the Farrier exactly what they're trading away by advancing early, then lets them (timer rules the room). Close modal (`22`): *"Teams keep their export packs; the room closes for everyone."* Mature facilitation design.

- **The "Needs you" triage queue works and is time-aware.** It surfaced on its own during the Surface window (`08`, log `[14:17:16] Needs-you / queue detected`), with priority chips ("med"), team + reason + an "open >" deep-link (`09`: *"Credit Desk — 1 parked item — chase them onto the map"*). At Rebuild it correctly switched to *"Ops Crew — a lock amendment request waiting on your call"* (`12`). Points the facilitator at the right team at the right moment.

- **Coach-whisper column is real triage signal, not decoration.** Dashboard surfaces genuinely useful per-team reads: *"1 orphan(s) to chase," "missing persona, trigger"* in Surface (`05`); *"no agent blocks yet — still retrofitting?"* and *"1 person unlanded"* in Rebuild (`12`). The anti-retrofit nudge (Rule 5) and human-landing gate (Rule 6) both show up here as scannable status.

- **The present-picker / projector flow is clean and unambiguous.** `16` "Pick who presents (Before/After on the room view)" -> real pairings (Credit Desk -> Ops Crew, etc.) -> on selection an *"On the projector: Credit Desk -> Ops Crew"* banner with **Clear projector** + **Next pair >** (`17`); already-presented chips dim (`19`); Clear returns to the full picker (`20`). The projected double-reveal itself (`18`: "What it was — Credit Desk" beside "What it became — Ops Crew," on the cream paper world, code chip top-right) is exactly the share methodology, and the console stays private.

- **Room view discipline.** `02` (lobby = giant code throne + "join at 192.168.1.15:3200" — the real LAN IP, not localhost) and `18` (share = before/after, no host code) confirm the projectable surface never carries the host key or honest swap vocabulary.

---

## WTF moments

- **A *closed* workshop reports "2 orphans blocking."** (`23`) The most jarring read in the journey — the room is over, exports are out, and the dashboard still flashes a blocking count from the capture phase. Nothing is blocked; nothing can be.
- **The timer says "paused" for the entire Share phase and nobody is told to start it** (`16`->`22`), in a product whose stated law is "the Farrier's timer always rules the room." The one phase where it's frozen is the one phase the screens never flag.
- **Amendment modal text captured by the driver was literally just `"Approve\nDeny"`** (`/tmp/hp-critic/amendment.txt`). The buttons are the only machine-readable content — a tidy illustration that the *decision context* (why the team wants the change) isn't structured on the card, only the button labels are.

---

## Verdict

This is a console a first-time facilitator could genuinely run a room from — and that is rare. The run-of-show cue row, the single re-labelling forward-CTA, the consequence-stating confirm modals, the time-aware "Needs you" queue, and the clean present-picker together form a coherent "read this, press that" spine that holds across all five phases with zero console errors. The methodology guardrails (private honest vocabulary, room-view discipline, anti-retrofit and human-landing whispers, the locked-intent amendment gate) are all present and correctly placed. The defects are real but bounded: the headline "0 teams" log finding is a **driver scrape bug** (the evidence shows three populated teams everywhere it matters); the genuine product gaps are a **stale stat-card label set that lies at Share/close**, a **timer that's never prompted to start** in the very phase the methodology says it must rule, and an **amendment card that's decidable on the *what* but blind on the *why*** — the one place a rubber-stamp would quietly violate the locked-constraint rule. Fix the amendment rationale and the timer/stat-card phase-awareness and this console moves from "impressively runnable" to "trustworthy." Re-test the "<- all teams" back-button in isolation before calling it a bug.
