# Horsepower — User Journeys (the missing middle layer)

**Status:** First solid pass. The *how each user moves through it*, step by step — distinct from the PRD (*what*) and the Design system (*look*).
**Date:** 2026-06-11
**Model:** B-lite multi-device · one canonical AI-readable map · self-serve lobby creation.

> Three layers: **PRD** (what & why) · **User journeys** (this doc — the flow) · **Design system** (look). This is the layer we'd been skipping.

---

## 0. The collaboration model (read first — it shapes every step)

- **One canonical map per team, server-side, AI-readable.** The Coach reads it to govern; all devices render it.
- **Contributions flow *through* the AI.** Members brain-dump into the shared chat from their own devices; the Coach reconciles everything into the one map. No edit-collisions, because people feed the AI rather than fight over nodes.
- **Direct edits are node-scoped** (soft-lock "Alex is editing this" / last-write-wins) + **presence** (who's here, whose cursor). No CRDT/OT.
- **Roles:** whoever creates the room is the **Farrier (host)**; everyone else is a **Team member**.

---

## Journey A — the Farrier (host)

**A1 · Create the room** — opens Horsepower → "Create a room" → gets a **4-letter workshop code** + a private **host code**, becomes the Farrier. *(state: lobby)*
- Optional: pre-create named teams; set expected team count.

**A2 · Share the code** — opens the **room view** (the only projectable surface — code shown huge + roster + timer; **no phase rail**, console stays private — farrier-console §2a). Co-hosts join as Farrier with the **host code** (the projected workshop code alone never grants control).

**A3 · Watch teams assemble** — console shows teams appearing, each with name + **live member count** (presence). Decision: wait until everyone's in.

**A4 · Brief + start Surface** — (off-app slides for hot-take/context/framework) → clicks **Start Surface**, sets a timer. *(state: surface)* — edits now accepted only in Surface.

**A5 · Monitor Surface** — per-team tiles: map progress, **governance flags** (thin/orphan/conflict counts), **redesign-ready?** status (the team sees this as the **"Newcomer check"** — capture §5a). The Farrier nudges teams who are thin/stuck. Once a team goes green, its **teardown pre-computes**; the Farrier may **preview the brief** (leak QA) from the drill-down.

**A6 · Trigger the Swap** — when teams are redesign-ready (or timer ends), clicks **Swap** → confirm (needs ≥2 teams). System **rotates each canvas to the next team** + delivers the **pre-computed teardown** (instant — no spinner at the peak). *(state: rebuild)*
- Decision/edge: a team *not* redesign-ready at swap time → Farrier override (swap anyway; the confirm names which team inherits the thin brief) or hold.

**A7 · Monitor Rebuild** — per-team tiles: redesign progress, **retrofit/drift flags**, **human-landing gate** status. Timer.

**A8 · Run Share** — clicks **Share** *(state: share)* → every team's own screen shows **their workflow's fate** (their original beside its redesign — guaranteed, even if they don't present). The Farrier **picks who presents** (straight, no scoring) and projects the **double reveal** per presenting pair: original ("what it was" — Team A's voice) → rebuild ("what it became" — Team B's voice) → the Coach's **"what died" diff**.

**A9 · Close** — teams export; Farrier ends/archives the room. (State persists locally.)

---

## Journey B — the Team member

**B1 · Join** — enters the **code** + their **name** → enters the room. Then **joins a team**: pick an existing team or create one (name it). *(B-lite: own device.)* Sees teammates via presence.
- Edge: latecomer joins mid-Surface → drops straight into the team's live map.

**B2 · Lobby / wait** — "You're in, **<team>** — <teammates>. Waiting for the Farrier to start." **🤫 No foreshadowing of the swap — it's a surprise (see B4).** Framing is just "document your real process."

**B3 · Surface — capture, together**
- Everyone **brain-dumps** their process into the **shared chat** from their own device, any order.
- The **Coach structures all of it into the one live map** — everyone watches it build (presence cursors).
- Anyone can **directly edit a node** (drag / rename / add) — node-scoped lock/LWW; arrows follow.
- **Governance surfaces on the shared map:** missing (grey) · **thin (amber + squiggle)** · **orphan (tray)** · **conflict (two versions — surfaced, never silently merged)**. The Coach pushes on the **WHY**. The team resolves them.
- **Gate:** the **"Newcomer check"** must go green (owner-real · phases-have-moments · intent-not-artifact · zero orphans) before the team can be swapped. *(Team-facing cover-story name — the Farrier sees "redesign-ready?"; the team never hears swap/redesign language pre-reveal, capture §5a.)* As the timer runs down, governance switches to **triage** ("these 2 gaps hurt most").

**B4 · The Swap — the REVEAL** 🤫 — *surprise: they never knew this was coming.* The **stamp** lands — their canvas leaves, and they **receive another team's teardown** (brief + areas of concern + candidate constraints + **people inventory**, **no old steps**). *"Plot twist — it's not yours you're redesigning. Nothing to retrofit."* (Instant — teardowns are pre-computed, Swap §4a.)

**B5 · Rebuild — reinvent, together**
- **Map-heavy** shared canvas; the **Coach is docked** (assist on request, or when they play it safe).
- The canvas opens as **scattered ingredient context cards** (locked blocks, candidate constraints, areas of concern, people cards) — each with a one-line context; **select/hover → the WHY tooltip** (who claimed it, why it's locked, capacity rung).
- Guided **absorb → identify areas → design**; the team builds the new HOW; anyone contributes. Need facts? **Interview the Coach** ("ask about the workflow" — problem-space answers only; guesses land on the **assumption ledger**, settled at the reveal).
- The **Coach (fair skeptic, both ways)** tests each element **constraint-or-HOW** (challenge / be sold) *and* audits autonomy (consequential ⚡ blocks need a catch/escalate/SME-gate answer); flags **retrofits, drift, rabbit-rule**; names the patterns you invent ("that's a HITL gate"). One challenge at a time — context is pull, not push.
- **Human-landing gate:** every person **in the received people inventory** must **stay / transform / be removed-justified**; "freed up for higher-value work" is rejected; produces **role-transformation cards**. Blocks the ✓-complete status + marks the export partial until all land (the timer still rules the room — Rebuild §6).
- **Stuck on a locked block that's wrong?** Challenge it via the Coach → the Farrier approves/denies; approved amendments are logged on the brief (Rebuild §6a).

**B6 · Share** — share starts and **your own workflow's fate appears on your screen** (your original beside its rebuild). Presenting pairs do the **double reveal**: the original team voices "what it was" (the rebuilders see the real process for the first time), the rebuilders present "what it became", the Coach shows **"what died"**. (Farrier picks who/when.)

**B7 · Export** — download **both packs**: *your workflow* (your original + its redesign by the other team — the one for your boss) and *your rebuild* (the brief you received + what you built).

---

## Cross-cutting journey notes

- **Disconnect/reconnect** (any device, any step): identity persists; rejoin restores the team's current state.
- **Graceful AI failure** at any AI touchpoint (structure / govern / challenge): degrade to rule-based checks + question bank — **never block the flow**.
- **Phase gating:** Surface edits only in `surface`; Rebuild edits only in `rebuild` — enforced server-side.

---

## Open journey questions
1. ✅ **Team formation in B1** — RESOLVED: self-select (one workshop code + team picker, lobby §1) with Farrier re-seat/remove as the override.
2. ✅ **Whose screen presents in Share** — RESOLVED default: the Farrier projects the double reveal on the room view; a team device may also drive (low-stakes).
3. **Identify-areas (B5 step 2)** — explicit tagging UI vs fluid conversation.
