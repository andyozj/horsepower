# Horsepower — User Stories

**Status:** ✅ Finalized against the complete spec set; **reconciliation pass 2026-06-11** folded in: one-code join + team picker (supersedes two-code) · host code · room view · Newcomer-check cover story + vocabulary rule · people inventory · double-reveal share · per-workflow export packs · pre-computed teardown · lock amendments · conflict signal · gate semantics. Tech/scale (Epic 7) stays provisional (deferred, local-first).
**Date:** 2026-06-11
**Format:** `As a <persona>, I want <goal>, so that <why>` + testable acceptance criteria (AC).

## Personas
- **Team** — a group of members **each on their own device** (B-lite: one canonical map, contributions reconciled through the Coach), doing Surface → Rebuild → Share.
- **the Farrier** — the facilitator(s) running the room (phases, timer, swap, monitoring). 2+ may share control.
- **the Coach** — the in-canvas **AI** (system actor, not a user): scribe → governance → provocateur.

---

## Epic 0 — Session setup & join

**US-0.1** — As **anyone**, I want to host a workshop self-serve and get a **workshop code**, so that I can run Horsepower without being a pre-anointed facilitator.
- AC: "Host a workshop" mints a 4-letter **workshop code** (public, projected) + a **host code** (private, console-only); creator becomes the **Farrier**; persisted to disk; binds `0.0.0.0`; workshop code projector-legible via the **room view**.

**US-0.2** — As a **co-host**, I want to share full Farrier control, so that we're not a bottleneck.
- AC: co-hosts join as Farrier with **workshop code + host code**; all drive phases, timer, swap. **The projected workshop code alone never grants control** (anyone in the room can read it off the wall).

**US-0.3** — As a **participant**, I want one code and a team picker, so that joining is one short step in a loud room.
- AC: enter **workshop code + name** → **team picker** (live team list + member counts) → tap to join, or **create a team** (name it; appears in the picker). No per-team codes. Mis-joins fixed by Farrier re-seat (US-5.4).

**US-0.4** — As a **participant**, I want to take part on **my own device**, so that everyone participates (not huddled around one laptop).
- AC: **B-lite multi-device**; **presence** (teammates visible, live count); identity persists for reconnect.

**US-0.5** — As a **Team**, I want a lobby that orients me, so that I know to wait.
- AC: "you're in, <team> — <teammates>"; framing is just *"document your real process"*; 🤫 **does NOT foreshadow the swap** (it's a surprise — US-2.3); waits for the Farrier to start Surface.

---

## Epic 1 — Surface (capture)

**US-1.1** — As a **Team**, I want to brain-dump our process in plain language, any order, so that we don't fight a form.
- AC: free-text input; the Coach structures it into the living map; later additions re-route the map (continuous, non-linear).

**US-1.2** — As a **Team**, I want the map to build itself as we talk, so that we see the process take shape.
- AC: persona/trigger/inputs/phases/moments/intent/outcome populate as captured; map updates live.

**US-1.3** — As a **Team**, I want to **author the map by hand** (not just via the Coach), so that I can build/fix it directly — and keep working if the AI is down.
- AC: a **real diagramming tool** — **add typed blocks** (Persona/Trigger/Input/Phase/Moment/Outcome) so each element is **properly identified**; **draw lines, arrows, freehand**; drag/rename/re-type/delete (arrows follow); **fully usable without the Coach** (the Coach accelerates, never gates); edits persist. *(Same tool in Rebuild.)*

**US-1.4** — As a **Team**, I want to be warned when something is too thin for a newcomer to follow, so that our capture is transfer-grade *(the swap framing exists only in spec-land — see the vocabulary rule)*.
- AC: missing → grey chip; **thin → amber + squiggle** (e.g. "a report isn't a reason — what decision does it drive?"); pushes on **WHY**, not just WHAT; 🤫 **all team-facing copy obeys the pre-reveal vocabulary rule** (capture §5a — never *swap / redesign / hand over / stranger*; the cover story is "could a newcomer run with this?").

**US-1.5** — As a **Team**, I want blurbs the Coach can't place to stay visible, so that nothing is silently dropped.
- AC: unplaceable blurb → **orphan tray**; the Coach actively chases it; unresolved orphans **block the swap**.

**US-1.6** — As a **Team**, I want each element's WHY captured, so that constraints can be told from HOW in Rebuild.
- AC: the Coach elicits the reason a persona/step/check exists; "that's just how it's done" is flagged thin.

**US-1.7** — As **the Farrier**, I want a readiness gate before the swap, so that no thin canvas is handed over.
- AC: checks owner-is-real, every phase has moments, intent-not-an-artifact, inputs listed, **zero orphans**; blocks swap until green; evaluated "through the receiving team's eyes." **Named "redesign-ready?" on the console, "Newcomer check" on team screens** (capture §5/§5a). **System-owned + rule-evaluable offline** (the Coach enriches, never *is*, the gate); in the timer's final stretch governance switches to **triage** ("these 2 gaps hurt most"); Farrier override is the universal escape hatch.

**US-1.8** — As a **Team**, I want our disagreements surfaced (not silently merged), so that fuzzy handoffs get caught while we're all in the room.
- AC: two members describing the same element differently → **conflict marker** on the node ("two versions — Alex says X, Sam says Y"); the Coach never silently picks a winner; unresolved conflicts count as **thin**.

---

## Epic 2 — The Swap

**US-2.1** — As **the Farrier**, I want to trigger the swap, so that teams redesign each other's workflow.
- AC: requires ≥2 teams; each canvas rotates to the **next** team; capture is **locked** afterward; the moment is marked (stamp); **the reveal is instant** (teardowns pre-computed at gate-green, regenerated on material edits — Swap §4a); override confirm names which team inherits a thin brief.

**US-2.2** — As **the Coach** (system), I want to **tear the capture down into a teardown** (not just hide the steps), so that the receiving team starts from a real frame *and* can't retrofit.
- AC: produces **abstract brief** (need + want; HOW stripped, zero-leak) **+ areas of concern** (problems, not steps) **+ candidate constraints** (starting candidates, not verdicts — pressure-tested fresh in Rebuild) **+ people inventory** (full roster: role + capacity-ladder data + abstracted WHYs, **never step-attached** — the scoped zero-leak exception that powers US-3.5); domain label kept.

**US-2.4** — As **the Farrier**, I want to preview a team's brief before the swap, so that a leaked step name never reaches the receiving team.
- AC: pre-computed teardown readable from the console drill-down once the gate is green; **regenerate** action; optional, never blocking.

**US-2.3** — As a **Team**, I want the swap to hit as a **surprise reveal**, so that the twist lands and I have zero attachment to what I'm redesigning.
- AC: **not foreshadowed** beforehand; the stamp reveals *"you're redesigning **another** team's — yours is gone"*; I receive the **teardown** (need/want + areas of concern + candidate constraints), **no old steps**.

---

## Epic 3 — Rebuild (redesign)

**US-3.1** — As a **Team**, I want guidance through **absorb → identify areas → design**, so that we reason forward, not from old steps.
- AC: three-step flow; step 2 is forward reasoning ("what's needed to get from trigger → outcome?").

**US-3.2** — As a **Team**, I want a **map-heavy canvas with the Coach on assist**, so that we focus on building.
- AC: large editable map; Coach docked; chat assists on request or when we play it safe.

**US-3.3** — As a **Team**, I want the Coach to test every element "real constraint, or HOW?", so that we don't retrofit.
- AC: **fair skeptic** over what Team B *can see* — the **candidate constraints** + **every element of the new design** (pass 2 of the two-pass engine, Rebuild §5; the old phases/moments stay hidden); **capacity ladder** for people (accountable/approve = constraint; informed/data-they-hold = HOW; sole-knowledge/sole-access = case-by-case, sold only if hard); catches **stale constraints**; can be **sold** by a genuine reason; never a bulldozer or pushover.

**US-3.4** — As a **Team**, I want retrofits, drift, and feature-thinking flagged, so that we stay AI-native and on-intent.
- AC: convergence with old patterns challenged **without referencing the hidden original** (generic cliché challenge to the team; the honest match-flag goes to the Farrier console only — no leak-by-flag, Rebuild §4); **drift** from locked intent/outcome/real-constraints flagged; **rabbit rule** caught ("a report / a chatbot is a *feature*, not AI-native").

**US-3.5** — As a **Team**, I want Rebuild's ✓-complete blocked until **every person has landed**, so that the design is complete *and* politically safe.
- AC: **"where did the people land?" gate** runs over the **people inventory** from the teardown (everyone in the original workflow, not just locked personas); each person → **stays / transforms / removed-justified-by-the-design**; **"freed up for higher-value work" is rejected** (demands input/output/nameable skill); removal must point to where the design absorbs them; SMEs flagged for redeployment; produces **role-transformation cards**. **Blocking = console status stays "building" + export marked "partial — N unlanded"**; the timer still ends the phase (Rebuild §6).

**US-3.6** — As a **Team**, I want the Coach to **provoke, not solve**, so that the thinking is ours.
- AC: challenges + (rarely, when stuck) poses a *question* about an area; **never hands over a finished design**.

**US-3.7** — As a **Team**, I want to challenge a locked block that's genuinely wrong, so that a bad capture can't trap our whole Rebuild.
- AC: challenge via the Coach with a stated reason → lands on the **Farrier's console** → approve/deny (Farrier can read the original capture in the mirror); approved amendments **logged on the brief** (visible at share-out); locked fields stay client-tamper-proof — Farrier approval is the *only* mutation path (Rebuild §6a).

**US-3.8** — As a **Team**, I want naive full-automation challenged, so that our design is accountable, not just radical.
- AC: every ⚡ agent block over a **consequential/irreversible** decision is asked *who catches it / where it escalates / what's the SME gate* — challenge-or-be-sold, same fair-skeptic rules ("low-stakes + reversible" is a valid sale); **over-simplification bar**: each agent block names input · decision · output · **failure path** ("AI handles compliance" rejected like "freed up for higher-value work"); an agent block with **no arrow to any human block** (👤/🔒) is rule-flaggable (works offline); the Coach points at *transforms* landings to staff the gates (Rebuild §4).

**US-3.9** — As a **Team**, I want every delivered ingredient to carry its context, so that the scrambled components are navigable, not cryptic.
- AC: each teardown component (locked block / candidate constraint / area of concern / people card) renders as an **ingredient context card** — one-line context on the card + the **full abstracted WHY on select/hover** (tooltip: what it is, why it's locked, who claimed it, capacity rung); all card content zero-leak-filtered; candidate constraints carry "candidate — pressure-test me" (Swap §4, design system §5).

**US-3.10** — As a **Team**, I want to interview the Coach about the workflow we received, so that we design from facts, not a vacuum — without ever seeing the old steps.
- AC: **"ask about the workflow"** answers in **problem-space only** (facts, volumes, pains, people); step/sequence questions declined *in character* ("that's the old way — you're building the new one"); zero-leak filter on every answer; refusals + our stated guesses logged to the **assumption ledger**, confirmed/busted by the original team at the reveal (Rebuild §2a, US-4.1).

---

## Epic 4 — Share & Export

**US-4.1** — As a **Team**, I want share-out to be a **double reveal**, so that the room learns from us — and we finally see what we were really rebuilding.
- AC: per presenting pair — (1) the **original map revealed** ("what it was", the original team's voice; the rebuilders see the real process **for the first time**), (2) the **rebuild presented** ("what it became", incl. where people landed), (3) the **Coach renders the "what died — and what was fake" diff** ("3 phases collapsed · 2 handoffs gone" + the constraint ledger held 🔒/fake ✂️), (4) the **assumption reckoning** — the original team confirms ✓/busts ✗ the rebuilders' logged assumptions — the rebuilders never claim knowledge of an original they couldn't see.

**US-4.1b** — As a **Team**, I want to see **my own workflow's fate** even if we don't present, so that nobody leaves not knowing what happened to their process.
- AC: the moment `share` starts, every team's screen shows **their captured original beside its redesign** by the other team; presenting is curated, seeing your own fate is guaranteed.

**US-4.2** — As a **Team**, I want **both export packs**, so that we can show our boss.
- AC: export unit = a **workflow** (page 1 original · page 2 AI-native redesign + role-landing cards; printable/shareable). Each team downloads **(1) "your workflow"** (theirs + the other team's redesign of it — the evangelism artifact) and **(2) "your rebuild"** (the brief they received + what they built).

**US-4.3** — As **the Farrier**, I want to pick who presents, so that share-out fits the time.
- AC: facilitator-selected; **straight presentation, no scoring (v1)**.

---

## Epic 5 — The Farrier's console

**US-5.1** — As **the Farrier**, I want to drive the phase state machine, so that I control the room's pace.
- AC: lobby → Surface → swap → Rebuild → Share; edits accepted only in the correct phase.

**US-5.2** — As **the Farrier**, I want to set/clear a timer per part, so that the agenda holds.
- AC: presets (e.g. 6/10/20/30 min) + clear; visible to all; low-time warning.

**US-5.3** — As **the Farrier**, I want to monitor all teams at a glance *and drill into any team's board*, so that I know who's stuck and can see exactly what they're doing.
- AC: compact dashboard (progress + thin/orphan counts + status), legible at the **ceiling (~6 teams / 30 pax)**; **click a team → read-only mirror of their *actual live canvas*** (real labels, **floating orphans on the canvas**, the team's typed brain-dump/chat) — not a schematic or list.

**US-5.4** — As **the Farrier**, I want to remove/re-seat teams and members, so that I can fix the roster **any time before the swap** (mis-joins and latecomers happen mid-Surface too).

**US-5.5** — As **the Farrier**, I want a **Before/After present view**, so that I can project the double reveal during share-out.
- AC: full-screen `original | redesign` per presenting pair + the Coach's diff caption; a **presentation surface distinct from the working canvas**; lives on the room view.

**US-5.6** — As **the Farrier**, I want a **room view** that's safe to project, so that the wall never spoils the swap. 🤫
- AC: a dedicated projector surface — **workshop code (huge) + team roster/counts + timer, nothing else**; no phase rail, no phase names, no governance language, no controls; the console (which says *Swap → Rebuild*) is **never** projected; opened from the console onto the second screen; obeys the pre-reveal vocabulary rule (capture §5a).

---

## Epic 6 — The Coach (AI capabilities — system actor)

**US-6.1** scribe — structure a brain-dump into the Surface ontology, under the **contention rules** (capture §2b: human touch wins · cooldown · narrated settles · orphan-not-delete).
**US-6.2** governance — flag missing / thin / orphan / **conflict**; push on WHY; **never use pre-reveal vocabulary to a team** (capture §5a — prompt-level rule).
**US-6.3** distillation — produce the teardown (brief + areas + candidates + **people inventory**) that strips the HOW (the hardest; zero-leak is the AC); **pre-computed at gate-green, regenerated on edits** (Swap §4a).
**US-6.4** fair-skeptic — run constraint-vs-HOW on candidates + the new design (pass 2; challenge + be sold).
**US-6.5** human-landing — run the people-land gate over the inventory; reject filler.
**US-6.6** provoke-not-solve — challenge without handing over answers; retrofit challenges never reference the hidden original (no leak-by-flag).
**US-6.7** diff-render — at share, compute "what died" between original and rebuild (phases collapsed / handoffs gone / artifacts killed) **+ the constraint ledger** (held 🔒 / fake ✂️) for the double reveal and the export caption.
**US-6.8** autonomy-audit — the skeptic's second edge: challenge fake autonomy (consequential agent blocks without catch/escalate/gate answers); enforce the over-simplification bar (input · decision · output · failure path per agent block).
**US-6.9** context-oracle — answer Team B's problem-space questions about the original (leak-filtered, in-character refusals); maintain the assumption ledger; generate the ingredient context cards + glossary from the captured WHYs.
**US-6.10** teach — capability translator ("could AI even do X?") + pattern naming ("that's an escalation queue / an eval / a HITL gate") — the "get good" win, never designing for them.
**US-6.11** coverage-check — verify each area of concern from the teardown is addressed by the new design.
**US-6.12** room-whisper — one-line per-team diagnosis on the Farrier console ("stuck on intent 6 min"); pre-share, suggest the strongest presenting pair.
- AC (all): behaves per the Surface/Rebuild specs; outputs are inspectable/editable by the team; every capability **degrades gracefully** (rule-based fallback) per coach-behavior §4; **the challenge budget governs all push** (one challenge at a time, the most consequential; pull — tooltips, oracle, chips — is unlimited; coach-behavior §3).

---

## Epic 7 — Non-functional

**US-7.1** — As **anyone**, I want the workshop to never stall on an AI failure, so that the room keeps moving.
- AC: any 5xx / timeout → **graceful fallback** (rule-based checks + question bank); degrade, never block.

**US-7.2** — As **the Farrier**, I want sessions to survive a restart, so that a crash doesn't nuke the room.
- AC: **persistent** (disk-backed); reload restores full state.

**US-7.3** — As **the product owner**, I want it to scale to **~30 pax / 6 teams / a few facilitators**, so that any team can run it.
- AC: swap rotation generalizes to N; broadcast + monitoring hold at the ceiling.

**US-7.4** — As **the product owner**, I want it trivially deployable, so that anyone can run it.
- AC: single-file client, no build step, runs on a laptop or Render/Railway as-is.

---

## Coverage check (stories ↔ specs)
- Surface spec → Epic 1, US-6.1/6.2/6.3. ✅
- Rebuild spec (incl. constraint engine, human-landing) → Epics 2–3, US-6.3/6.4/6.5/6.6. ✅
- PRD locked decisions (scale, persistence, export, share, naming, degradation) → Epics 0, 4, 5, 7. ✅
- Farrier console, swap, share, lobby specs → all landed (Epics 0, 2, 4, 5). ✅
- **Gap still needing its own spec:** tech/scale (Epic 7 — deferred, local-first).
