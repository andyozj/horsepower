# IRIS — Copy-Clarity Critic Report (iter1)

**Lens:** every word on every screen — do I know where I am, what to do now, what each label means? Run: full participant journey for "Ops Crew" + a crash-recovery test.
**Evidence:** `qa-critic/iris/01–32-*.png`, `run.log`, `driver.js`. Coach ran on the **offline question bank** (no live key) — judged as degradation quality, not AI absence.

---

## Problems

### 1. The lock-challenge VERDICT never returns to the participant — HIGH
**Where:** Rebuild, after "Send to Farrier" (`20-rebuild-challenge-modal.png`, `21-rebuild-after-challenge.png`).
The challenge flow is beautifully written up to the point of submission — modal says "Tell the Farrier why it's wrong — decide, and the change is logged on the brief," then a toast confirms "**Sent to the Farrier.**" But that is the *last* word the participant ever gets. The driver explicitly watched for verdict feedback (run.log L37) and **nothing arrived** across the rest of the session. A participant who challenges a locked intent is left permanently unsure: was it approved? declined? still pending? The copy promises "the change is logged on the brief" but the team never sees that brief update or any resolution. **This breaks the feedback loop on the one interaction the product invites most loudly ("⚑ Challenge this").** Either a pending state ("⏳ With the Farrier — you'll see the call here") or a resolution toast is missing. *Caveat: a verdict may surface only on the Farrier console / amended brief; from the participant's seat it is invisible — that is itself the defect.*

### 2. "1 people landed" — number/noun agreement bug — MEDIUM
**Where:** Race card on Share/Closed (`29-share-race-card.png`, `32-closed.png`; run.log L210).
Card reads "**1 people landed**." Should be "1 person landed" (or "1 / 1 people landed"). It's the keepsake artifact participants screenshot and "show the boss" — a visible grammar error on the trophy undercuts the craft everywhere else.

### 3. "waiting for your team to caddle up…" — typo — MEDIUM
**Where:** Lobby room-code panel (`06-lobby-saddled.png`, `07-lobby-scratchpad2.png`, zoomed `06-rt`).
Reads "caddle up" — should be "**saddle up**." It sits directly under the giant room code on the most-stared-at lobby screen, and the same word is spelled correctly ("saddled up") in the Coach panel two inches away, so the inconsistency is conspicuous.

### 4. Coach speaker label is a bare first name with no role anchor — MEDIUM
**Where:** Surface Coach rail (`08-surface-arrived.png`, zoomed `08-coach-top`).
The Coach's read-back of the captured workflow is attributed to "**Jonas**" with no preceding "you said" / "from your dump" framing. A participant who never typed "Jonas" sees an unexplained name asserting facts about *their* process ("Right now our invoice reconciliation is a mess: the GM signs off spend…"). It reads like a stray persona leaking in. Needs a label that says whose voice this is (e.g. "echoing your brain-dump" / "as you described it").

### 5. Goal banner copy is invisible/unreadable at the rendered size — LOW-MEDIUM
**Where:** Surface + Rebuild orange goal strip under the toolbar (`08`, `12`, `16`).
The "Goal: map it so a newcomer could run it — clear the Newcomer check below" banner (confirmed present in DOM, run.log) renders as a thin orange hairline that's essentially unreadable in every captured frame. The single most orienting sentence on the canvas — "what am I doing here NOW" — is the lowest-contrast text on the screen. The gate chip "Newcomer check — N to fix" carries the load instead, which is good, but the goal sentence itself is wasted.

### 6. "still need: persona, trigger +4 more" truncates the actual checklist — LOW
**Where:** Surface bottom-left status pill (`08-bottombar`).
"**+4 more**" hides four of six requirements behind a count. Early on, a team that doesn't know the ontology can't tell what the other four are without finding and running the Newcomer-check panel. The honest full list exists (the gate), but the always-visible summary teases rather than tells.

### 7. Reckoning / "Your turn — was it true?" copy was never reachable by a participant in this run — NOT FULLY ASSESSABLE (severity unknown)
**Where:** Share sequence (run.log L208–209: "reckoning controls: 0", '"Your turn — was it true?" present: 0').
The driver crashed mid-Rebuild (see Attribution), and by the time recovery rejoined, the Farrier had already advanced the room to **closed** — so shots `26–32` show the *closed* screen, not the live Share/reckoning stage. The assumption-reckoning UI ("confirm or bust what the rebuilders assumed") is *promised* in the Share-out header copy (`22-crash.png`: "Then the reckoning: confirm or bust what the rebuilders assumed about your work") but its actual controls and the "was it true?" copy were **never rendered on my screen**. Cannot confirm the reckoning copy is clear — only that the header advertises it. Flagging as a coverage gap, not a defect.

### 8. Export pack contents — NOT ASSESSABLE — N/A
**Where:** intended Share export (run.log L212, L220: "export buttons: 0").
Because the room was already closed on rejoin, no export button was present. The export popup was never captured. Export-pack copy is unreviewed this run.

---

## What's genuinely good

- **Landing pitch earns its place** (`01-landing`, zoomed `01-saddle`): "A live workshop where your team maps a real process — and reinvents it **AI-native, not retrofitted**" + the three promises "**one shared, living map** / pushes on the **why**, not just the what / Leave with a workflow **worth showing your boss**." Concrete, benefit-led, and the live ontology mini-map shows-not-tells the product. The "CHALLENGE" stamp and "the WHY — where the gold is" annotation set the methodology tone in one glance.
- **The pre-reveal vocabulary discipline holds** (Product Rule 2). The gate is "**Newcomer check**," the wait copy is "saddled-ready," and nothing on the team-facing surface said *swap/redesign/rebuild/hand over* before the stamp. Verified across lobby + all Surface shots.
- **The reveal twist is the best copy in the app** (`15-reveal-twist`, run.log L28): "**Plot twist — you're not redesigning yours.** You now hold Credit Desk's workflow… The old steps are gone — **nothing to retrofit.** You get their brief: the need, the worries, their people. The HOW is stripped — build it AI-native." It lands the surprise, explains the new rules, and motivates in four sentences. CTA "Let's build →" is perfect.
- **The people-landing rail teaches the rule in the copy** (`16-people-rail`): "everyone lands — that's the deal… **removed** (the design itself must justify it — "**freed up for higher-value work" won't pass**)." It bakes Product Rule 6's banned phrase straight into the instructions. Excellent.
- **Locked-card language is precise and non-leaky** (`18-tip`, `19-sel`): "this arrived official from the capture. **Design around it, don't fight it.** wrong? select it → '⚑ Challenge this' goes to the Farrier." Tells you the status, the attitude to take, and the escape hatch — without referencing the hidden original.
- **The Coach warm-up framing** (`06-rt`): "I turn your brain-dump into a map — type how it really works, **I'll propose the blocks, you place them**" and the parking-lot promise "jot a frustration — **it'll be waiting in your parking lot when the map opens**," which then *literally happens* (see below). "parked ✓ — add another?" is a crisp confirmation.
- **The "back of the card" inspector** (`11-inspector`): "their capacity" (operates/accountable/served/informed) + "**why does this role exist?**" — clean, jargon-light capture of capacity + WHY.
- **Crash-recovery copy is humane** (`24-reclaim-modal`): "Picking up where you left off? Some riders stepped away from Ops Crew. **Tap yourself to carry on — or start fresh.**" Names each rider by steed so you recognise yourself.
- **Closed screen** (`32-head`): "Workshop closed / **Thanks for riding.** 🐎" — warm, on-metaphor, done.

---

## WTF moments

- **The scratchpad note round-trips perfectly.** I jotted "Approvals bounce between 4 inboxes and nobody owns the SLA" in the lobby warm-up; it appeared verbatim in the Surface **Parking lot — said, not yet mapped** card, with the toast "Your lobby notes are in the parking lot" (`08-coach-top`, `08-parking`, run.log L16). The promise was kept exactly. Genuinely delightful and rare.
- **I challenged a locked intent and the room swallowed it.** "Sent to the Farrier." …and then silence forever (Problem 1). The most confident-feeling interaction in the app gives the least closure.
- **My "Share-out" was actually a tombstone.** Because the Farrier closed the room before recovery rejoined, the screen that *says* "Share-out — the double reveal… then the reckoning" (`22-crash`) is immediately followed by "Workshop closed" with no reckoning ever shown. The header writes a cheque the (closed) state can't cash. A participant who rejoins late reads a promise of an interactive reckoning that has already evaporated.
- **"Jonas" knows my business.** An unnamed-to-me persona confidently narrating my own captured workflow in the Coach rail (Problem 4) is briefly uncanny.

---

## Verdict

**The writing is, line for line, the strongest part of Horsepower.** The landing pitch, the reveal twist, the locked-card language, and especially the people-landing rail are professional-grade product copy that *teaches the methodology through the words themselves* — and the methodology discipline (pre-reveal vocabulary, no-leak locked cards, banned "freed up for higher-value work") holds on every team-facing screen I saw. The scratchpad→parking-lot round-trip is a small piece of magic.

But three gaps keep it from clean: **(1)** the lock-challenge flow has no return path — it confirms submission and then goes dark, breaking closure on the product's signature invitation; **(2)** small but visible craft slips on the artifacts people keep — "**1 people landed**" on the race card and "**caddle up**" in the lobby; **(3)** the orienting goal banner is rendered nearly invisible, leaving the gate chip to do all the "what now" work.

Two whole stages — the Share **reckoning** ("was it true?") and the **export pack** — were **not assessable** this run because a driver crash (element-not-stable on the agent-block drop, run.log L39–186) pushed recovery past the moment the Farrier closed the room. That's a coverage hole, not a product verdict; those screens need a clean re-run before sign-off.

**Fix Problem 1 and the two typos and this copy is ready to put in front of a room.**
