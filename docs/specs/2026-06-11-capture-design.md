# Capture — Design Spec

**Status:** Locked (capture phase only). Redesign / Share / Lobby specs to follow.
**Date:** 2026-06-11
**Part of:** AI-Native Workflow Studio PRD (in progress)

---

## 1. Why capture is load-bearing

The workshop runs `capture → swap → redesign`. At the **swap**, each team redesigns the **next** team's workflow — with **zero prior context**. The captured map is the *only* thing that crosses the handoff: no hallway conversation, no "what did you mean here."

**Therefore the bar for capture is not "good enough for the people who made it" — it is "good enough for a stranger to redesign from."** Thin or wrong capture → garbage redesign. This single fact drives every decision below.

---

## 2. The capture model: brain-dump → living map

Capture is **a living graph, not a form and not a wizard.**

- **Input — brain-dump, any juncture, any order.** Teams describe their process however it spills out (messy is fine). There is no required field order. New information can arrive at *any* time and reshape the map.
- **The AI is the co-author, not an interrogator.** It continuously structures incoming fragments into a **live workflow map** (trigger → phases/moments → outcome) that re-routes as understanding deepens. Phases move, split, merge. The map is never "done" — it gets *less thin* over time.
- **The map is the hero artifact.** "The moment you see the mind-map, you should know the process." It is visible and lightly editable (the AI proposes; humans can nudge a box directly as a safety net).

> **Explicitly rejected: interview/Q&A as the primary mode.** It made the AI a quizmaster and the team a witness, dribbling answers one at a time — slow and patronizing for people who know their process cold. The AI may ask **targeted follow-ups for genuine gaps**, but it does not drive a scripted interview.

### Input modality
- **Now:** typed brain-dump in a side panel. May be framed visually as a **chatbot-style** thread (same model, friendlier skin) — low-cost reskin.
- **Deferred (different mode):** **voice / "talk to it."** Most natural, but hard in a shared physical room with multiple teams talking at once (mic bleed, accuracy, privacy). Out of scope for v1; revisit later.

---

## 2a. The canvas is a real diagramming tool (works without the Coach)

The map is **not AI-only.** Participants can **author it by hand** at any time — and *must* be able to if the Coach is unavailable:
- **Add typed blocks** from a palette — **Persona · Trigger · Input · Phase · Moment · Outcome** — so every element is **properly identified** (its type is explicit; the structure stays legible *and* governable).
- **Draw freely** — lines, arrows, freehand sketches, labels — Excalidraw-grade direct manipulation, with the Critic's-Notebook soul.
- **Edit anything** — drag, rename, re-type, delete; arrows follow.

The Coach is an **accelerator on top, not the only way in**: it co-authors from the brain-dump and governs, but **the canvas is fully usable by hand.** This is the *real* graceful-degradation path — if the AI is down, teams keep working on a proper diagramming tool (not just rule-flags). Because element **types are first-class**, governance and the swap-teardown operate on a hand-drawn map exactly as on an AI-built one. *(Applies identically in Rebuild.)*

## 2b. AI/human contention on the canvas (resolved 2026-06-11 — the rules)

The Coach restructures the map continuously while up to ~5 humans hand-edit it (B-lite). Without explicit rules this becomes *fighting the AI* — the existential interaction risk of the living map. The rules:

1. **Human touch wins, always.** A node a human is actively dragging or editing is inviolable; concurrent Coach output targeting it is dropped or re-queued.
2. **Touch cooldown.** The Coach does not move, rename, merge, or re-type a node a human has touched in the last **~10 seconds**.
3. **Narrated, gentle settles.** Coach restructures arrive as the map-build motion (design system §6) plus a one-line narration (*"moved* reconcile *under Phase 1"*) — never a teleport, never a silent change.
4. **The Coach never deletes human-authored content.** Anything it can't reconcile becomes a visible orphan, not a deletion.
5. **Layout-stability bias.** The Coach extends and refines in place; wholesale re-layouts happen only when the team is idle, and are narrated.

## 3. The capture ontology (locked — product methodology)

A workflow is captured as:

| Element | Notes |
|---|---|
| **Persona / owner** | Captured **first** — "who are we doing this for / who owns each step." |
| **Trigger** | What starts the workflow. |
| **Input** | What it consumes (e.g. invoice · PO · ledger). |
| **Phases** | The key stages of the journey. |
| **Moments that matter** | Inside each phase; flaggable as **pain points** (⚠). |
| **Intent** | *Why* the workflow exists. **Must not be an artifact** — "a report" is not an intent; *why* do you need it / what decision does it drive? |
| **Outcome** | What changes in the world. Must not merely restate the intent. |

`intent`, `outcome`, and `personas` become **LOCKED** at the redesign phase (server-enforced, per existing product rules). In capture they are authored normally.

### 3a. Capture the WHY behind each element — constraint raw-material *(added 2026-06-11)*

Capture must surface not just *what* the process is, but **why each element exists** — why this persona is involved, why a handoff happens, why a check is there. These WHYs are the **raw material for separating real constraints from the HOW** at redesign:

- **Accountable / decision / external-requirement reasons** → likely **real constraints** (must survive the redesign).
- **Coordination / knowledge-holding / access reasons** → likely **the HOW** (demolishable — and often *stale* constraints that AI/data have since dissolved, e.g. a handoff that existed only because top-level couldn't see bottom-level data).

So **governance/thought-check also pushes on WHY, not just WHAT** — a persona or step given with no reason ("that's just how it's done") is **thin** and gets flagged. Without the WHYs captured, the swap-abstraction can't distill genuine constraints and Team B can't redesign cleanly.

**How constraints get separated from HOW (the engine of redesign):**

*Who decides:* **the humans make the call; the AI is a *fair skeptic*** — it challenges every claimed constraint but can be **sold** by a genuine reason. Neither a bulldozer (kills everything) nor a pushover (accepts anything). The bar: **the team must convince the skeptic.** Team A surfaces raw WHYs + each persona's *capacity* in capture; Team B re-tests fresh in redesign; the AI is the consistent challenger across both.

*The test applies to **every element — each phase, moment, handoff, and check, not just people.** A whole phase can be pure HOW (it survives only from old sequencing); a single moment can be a hard constraint (a legally-required check). For **people**, sharpen it with the capacity ladder (RACI as a constraint-detector):
- **Accountable / approves / decides** — a gate; the buck stops with them → **REAL CONSTRAINT.**
- **Notified / informed** — only needs to know → **NOT a constraint** (the AI just notifies). *Most common fake constraint.*
- **Contributes data they hold** — their only input is information → **NOT a constraint** (the AI holds/accesses the data). *Second most common fake constraint.*
- **Consulted / sole domain knowledge / sole data access** — **case-by-case.** Challenge first (AI often *dissolves* exactly these — tacit knowledge can be encoded; access can be granted to the system). But if the reason is *hard* — irreplaceable judgment, or a legal/contractual/security boundary — the AI is **sold** and it stays a real constraint.

*Stale constraints (the AI's favourite catch):* a reason that *was* real (info silos, manual access) but that AI/data have since dissolved → now it's HOW. *"That was true pre-AI — still true?"*

Reasons are usually **layered** (a person is there for 3 reasons; 2 are HOW, 1 is real) — the AI teases the layers apart and keeps only the real bit.

**Locked-persona refinement:** at redesign, lock the **accountable / served stakeholders**, *not* the **operators** who merely perform steps (those are HOW and may be demolished). This tweaks the flat "all personas locked" rule.

**The WHYs become the tooltips (added 2026-06-11 — why capture solidity is non-negotiable):** every captured WHY is the raw material for a Rebuild **ingredient context card** (redesign §2a) — the one-line context + tooltip the receiving team hovers for. This makes the thin-bar concrete and testable: *"would this WHY generate a useful context card for the team that inherits it?"* A thin intent in Surface = an empty tooltip in Rebuild = a team designing blind. Intent, outcome, personas, and the WHYs **must be solid at the gate** — the context system downstream has no other source.

---

## 4. Governance: four signals

Governance is **not box-ticking completeness.** It enforces **transferability** — "could a stranger redesign this?" *(internal framing only — team-facing copy must use the "newcomer" cover story, per §5a)*. There are exactly four signal states:

1. **Missing** — *required ontology slot is empty* (e.g. no persona at all).
   - Signal: **grey** governance chip.
2. **Thin** — *present but too shallow to hand over* (e.g. a phase literally named "Processing"; persona = "the team"; intent = "a monthly report").
   - Signal: **amber** chip + a quiet **squiggle underline** on the offending text ("thought-check" — spell-check, but for lazy thinking). Hover/tap reveals the sharp catch, e.g. *"a report isn't a reason — what decision does it drive?"*
3. **Orphan** — *captured but unlinked.* The AI heard a blurb but **cannot connect it to the trigger→phases→outcome spine.**
   - Signal: a **floating sticky in the Orphan tray** ("said, but not yet placed"). The AI **chases** it ("which phase does this attach to?") rather than dropping or mis-gluing it.
4. **Conflict** *(added 2026-06-11 — the B-lite signal)* — *two members described the same element differently.* With ~5 people brain-dumping at once, contradictions are inevitable — and they're **capture gold** (the disagreement usually marks a fuzzy handoff or an undocumented exception), not merge noise.
   - Signal: a **paired marker on the contested node** ("two versions — Alex says X, Sam says Y"). The Coach **must not silently pick a winner** — it surfaces the conflict and the team resolves it. Unresolved conflicts count as **thin**.

**Two active hunts (added 2026-06-11 — both feed the thin signal):**
- **Unexpanded jargon** — *"the RO pack goes to OpCo"* drowns a reader who wasn't in the room. Acronyms/team-speak get the squiggle ("a newcomer won't know what an RO pack is"); decoded terms build a **domain glossary** that rides with the handoff.
- **Missing exceptions** — teams describe the happy path; the value hides in the failures. The Coach actively asks *"what happens when this goes wrong? who gets the angry call?"* — exceptions are where most orphans come from, and where the redesign's areas-of-concern get their teeth.

**Design principles for governance:**
- **Calm by default, loud only at peaks.** The everyday signal is the quiet squiggle, never a red-pen slash. (Loud red/stamp energy is reserved for peak moments — see §6.)
- **Nothing the team says is silently swallowed.** If the AI can't place it, it becomes a visible orphan. The disconnection is itself a finding (often an exception, side-loop, or missing phase).
- **Orphans guard against AI hallucination.** Showing "I couldn't place this" beats wrongly gluing it into the map the next team inherits.
- **The AI trends the orphan tray toward empty** by actively chasing, so it never becomes a chaotic pile.

---

## 5. The readiness gate — "Newcomer check" (team-facing) · "redesign-ready?" (Farrier-facing)

Before a team's canvas can be swapped, the system runs a readiness check — evaluated through the eyes of the team about to receive it. **The two audiences see two different names for the same gate** (secrecy — see §5a):

- **Team-facing: "the Newcomer check."** *"Could someone who just joined your team pick this up and run with it?"* A true cover story — it demands exactly the transfer-grade quality the swap needs, without hinting that anyone else will receive the map.
- **Farrier-facing (private console only): "redesign-ready?"** — the honest name, safe on a screen the room never sees.

The checks (identical under both names):

- Owner is a **real role**, not "the team."
- Every phase has **concrete moments** — no black boxes.
- Intent is a **decision, not an artifact**.
- Inputs are listed.
- **Zero unresolved orphans.**

**Unresolved thin spots or orphans BLOCK the swap.** Team-facing copy stays in the cover story: `"✕ 1 orphan — a newcomer wouldn't know where this fits"`. When clear → `✓ ready` (team) / `✓ redesign-ready` (Farrier) and the swap unlocks. This gate is the single fixed checkpoint in an otherwise continuous flow, and it is what protects the integrity of the whole exercise.

**Gate mechanics (resolved 2026-06-11 — were fuzzy):**

1. **The gate is SYSTEM-owned, not Coach-owned.** Every check above is rule-evaluable and runs offline. The Coach *enriches* the semantic checks when available (e.g. properly judging "intent is a decision, not an artifact"); offline, those degrade to heuristics (artifact-noun patterns) + the question bank, and the gate runs rule-only. The Coach accelerates the gate; it never *is* the gate — consistent with §2a ("accelerator, not gatekeeper").
2. **Timebox-aware triage, not a wall.** While the part-timer is comfortable, governance flags everything it sees. In the final stretch (~last 5 min), it switches to a **prioritized burn-down**: *"you won't fix everything — these 2 gaps hurt a reader most"*, ranked by transfer-impact. A binary block that's routinely overridden teaches the room the gate is decorative; a triaged countdown keeps it meaningful under real workshop time pressure.
3. **The Farrier override** (swap anyway, flagged) remains the universal escape hatch — the gate informs the human call; it never overrules the room's clock.

### 5a. The pre-reveal vocabulary rule (HARD — protects the 🤫 surprise)

**No team-facing surface, before the swap reveal, may use the words:** *swap · redesign · rebuild · hand over / handoff · receiving team · stranger · transfer.* The capture experience is framed entirely as *"document your real process well enough for a newcomer."*

- Applies to: governance chips, squiggle tooltips, the gate banner, empty states, lobby copy, **and the Coach's own utterances** (the Surface system prompt must carry this instruction — an LLM that says "the team receiving this…" burns the secret; see coach-behavior spec §2).
- Spec documents may use the honest vocabulary internally; **UI copy may not.**
- The Farrier's private console is exempt; the projected **room view** is not (see farrier-console spec §2a).

---

## 6. Visual language (capture surface)

Per the agreed direction (see vibe boards):

- **Base aesthetic — "Critic's Notebook" (light, hand-drawn).** Craft-paper cream `#f4efe2`, ballpoint blue-black ink `#21314f`, with a hot red-pen `#e23b3b` and highlighter-yellow `#ffd24a` as the only accents. Typography, stroke technique, glyphs, and texture are owned by the design system (`design-system.md` §2/§3/§16/§18, craft pass): Fraunces + Inter, Caveat as the Coach's hand only — Patrick Hand and Permanent Marker are retired; hand-drawn strokes via seeded rough.js (the "boiling line"), custom SVG glyphs instead of system emoji.
- **Expressive chrome, legible content.** Everything the team **types or reads** (intent, outcome, map labels, the brain-dump) stays in Inter. Fraunces carries the brand voice; Caveat appears only as the Coach's hand — never body or input. This must read on a **projector from the back of the room** *and* a laptop up close.
- **Calm 95% / loud at peaks.** The capture surface is calm. "Crayon-Manifesto" loud energy (rubber stamp, bold marker) is reserved for the **swap** (`REDESIGN — DON'T RETROFIT` stamp slams down) and other peak moments — not soaked into everyday use.

---

## 7. Reference mocks (in repo root)

| File | Shows |
|---|---|
| `vibe-board.html` | 3 vibe directions (whiteboard / abstract / blend) |
| `vibe-board-souls.html` | Souls A (Critic's Notebook) / B (Crayon Manifesto) / C (Storybook) |
| `vibe-board-AB.html` | A base + B peaks (swap stamp, retrofit scribble) |
| `mock-capture-v2.html` | Brain-dump + thought-check (thin-spot squiggle) + redesign-ready gate |
| **`mock-capture-living.html`** | **Canonical**: living re-structure + orphan tray + swap-gate blocking |
| `mock-interview-capture.html` | Interview model — **superseded** (kept for history) |

---

## 8. Open questions (deferred, not blocking)

1. **"Sharpen a thin spot" interaction** — when the AI flags something thin, *how* does the team fix it: AI proposes a rewrite, AI offers 2–3 options, or it pushes back and the team rewrites? (The mock hand-waves this as auto-upgrade.) This is where depth actually gets forced — design before build.
1b. **Who classifies constraint-vs-HOW** — capture surfaces raw WHYs; classification happens fresh in redesign (lean). Confirm vs letting Team A flag their own hard constraints. (See §3a.)
2. ✅ **Re-layout stability** — RESOLVED: the AI/human contention rules in §2b (human-touch wins · cooldown · narrated settles · no deletions · stability bias).
3. **Chatbot vs panel framing** of the brain-dump input — cosmetic; decide at build.
4. **Voice mode** — deferred entirely (see §2).
5. ✅ **Multi-device per team** — RESOLVED: **B-lite** (each member on own device; one canonical map; contributions reconciled through the Coach; direct edits node-scoped soft-lock/LWW + presence). Supersedes the old one-device rule.

---

## 9. What this does NOT change

- The locked product rules / methodology (the swap rotation; locked intent/outcome/personas at redesign; anti-retrofit; phase state machine). Capture redesign sits *on top of* these.
- Graceful degradation: any AI/API failure must fall back so the workshop never stalls (existing rule).
