# Redesign — Design Spec

**Status:** First draft (locks the model we designed; mocks are the reference).
**Date:** 2026-06-11
**Part of:** AI-Native Workflow Studio PRD. Pairs with `2026-06-11-capture-design.md`.

---

## 1. What the redesign phase is

After the swap, **Team B reinvents Team A's workflow AI-native.** The point is **mindset, not a deployable design** — *"don't think practicality, think unicorn."* The redesign is **Team B's own reasoning**; the AI **facilitates and challenges, never solves.**

---

## 2. The swap is a *transformation*, not a handoff

At the swap, the AI **distills Team A's detailed capture into an abstract brief** and **strips every trace of the HOW.** Team B never sees the old phases/steps — *there is nothing to retrofit.* (This replaces the existing app's "original phases (do not recreate)" list, which was itself a retrofit-anchor.)

**The brief Team B receives:**
- **Need** = locked **intent** (why) + **trigger** (what kicks it off)
- **Want** = locked **outcome** (what changes) + **personas** (who it's for / accountable)
- **Constraints** = boundaries + today's **pains re-expressed as *problems*, never steps** (*"payments are often late and error-prone"*, **not** *"manual reconcile takes 3 days"* — the latter leaks a step).
- **Hidden:** phases, moments, the workflow. The HOW.

Domain label stays (it's part of the need — "paying suppliers / AP"); the *steps* are scrubbed.

Team B actually receives the **teardown** (Swap spec §4): the abstract brief **+ areas of concern + candidate constraints + the people inventory** (roster + capacity-ladder data, *not* step-attached — the deliberate, scoped exception to zero-leak that makes the human-landing gate possible, §6). The candidates are a *starting frame*, not verdicts — Team B + the Coach **pressure-test each one** fresh (§5).

**The Rebuild canvas is the same real diagramming tool as Surface** (capture §2a): typed blocks · draw lines/arrows/freehand · proper element identification · **fully usable by hand without the Coach.** The Coach accelerates and challenges; it does not gate.

**The canvas opens pre-seeded with the LOCKED carried components** — the **accountable/served persona(s)** (not operators — capture §3a; operators arrive via the people inventory, unlocked), intent, outcome, trigger/inputs (the need/want/constraints from the teardown) — rendered as **locked blocks** (dashed purple, can't edit/delete; movable for layout). The **phases/moments are stripped** (the HOW). The team builds the **new HOW within that locked context** — they "work within all the constraints," reinventing only what's free to change.

**These locked blocks arrive scrambled / only partially assembled — *placed by the Coach*, not in the original arrangement** — because layout itself leaks the old HOW. The team first makes sense of the raw locked ingredients, then assembles the new HOW around them. (They're scattered, unconnected — no inherited flow.)

## 2a. The CONTEXT STACK (added 2026-06-11 — how Team B gets context without ever seeing the HOW)

Rebuilding from an abstract brief risks designing in a vacuum. The fix is **never** showing the original (that's an anchoring trap — v0.1's struck-through phase list proved even a crossed-out original is an outline people fill back in). Instead, five layers of context, each leak-filtered:

1. **The teardown frame** — brief + areas of concern + candidate constraints + people inventory + glossary (Swap §4).
2. **Ingredient context cards** — every delivered component sits scattered on the canvas with a **one-line context on the card** and the **full abstracted WHY on select/hover** (a tooltip: what it is, why it's locked, who claimed it, which capacity rung). Pull, not push — context exactly where the eye is.
3. **"Ask about the workflow" — the Coach as interviewable client.** The Coach has read the entire original capture; Team B can question it like a stakeholder: *"how often does this run?" · "who screams when it's late?" · "what's the volume? is the data structured?"* It answers **in problem-space only** (facts, volumes, pains, people, what the business cares about), with the **zero-leak filter on every answer**. Asked for the old steps, it declines *in character*: *"that's the old way — you're building the new one."* This is more realistic than seeing the original — real discovery teams interview; they don't get the legacy process's soul either.
4. **The assumption ledger.** Anything the Coach can't or won't answer, plus every guess Team B makes about the hidden process ("presumably someone validates this upstream"), is **logged as an explicit assumption** — designing on assumptions is fine; designing on *unstated* assumptions is not.
5. **The reveal.** At share, Team A **confirms or busts** the logged assumptions against reality (*"you assumed validation existed — it doesn't; that's the whole problem"*). The ledger turns unknowns into share-out theatre instead of silent errors.

**Dependency (hard):** layers 1–3 are generated from the captured WHYs — which is why Surface's intent/outcome/WHYs **must be solid at the gate** (capture §3a): a thin capture produces empty tooltips and a mute oracle.

---

## 3. The AI guides Team B through 1 → 2 → 3

1. **Absorb the brief** — the need/want, no old steps.
2. **Identify the areas** — *forward* reasoning: "to get from trigger → outcome, what capabilities are actually needed?" (not reverse-engineering steps they can't see).
3. **Design the HOW** — the team produces it; the AI provokes + governs.

---

## 4. The AI's role in redesign

- **Provoke** (devil's advocate): kills retrofits, catches the **rabbit rule** (*"AI writes my report" / "add a chatbot"* → *"that's a feature, not AI-native — what decision does it drive? maybe no report"*), pushes **stack-collapse** (start from purpose; cadence/deliverable/goal change; the human ends up auditing, not creating).
  - **Retrofit flagging must not leak (resolved 2026-06-11).** Team B never saw the original — so a flag phrased *"this matches the old process"* would itself reveal what the old process contained (leak-by-flag). The system may still compare Team B's elements against the hidden original, but the result splits by audience: **the Farrier's console** gets the honest match-flag ("Phase 2 ≈ original's *reconcile*"); **the team** gets a *generic* convergence challenge that never references the original (*"collect → review → approve → report — that's how every pre-AI process looks. Reason forward from the purpose instead"*). With the HOW stripped, real retrofit risk is mostly convergent process-cliché thinking anyway — challenge the cliché, not the match.
- **Audit autonomy — the skeptic's SECOND EDGE (added 2026-06-11):** the fair skeptic cuts both ways. It demolishes **fake constraints** — and it challenges **fake autonomy**: *"just agentic-loop everything"* is as wrong as a retrofit. For every ⚡ agent block over a **consequential or irreversible** decision, the Coach asks the **over-automation questions**: *who catches it when it's wrong? where does it escalate? what's the SME gate?* Same rules as constraint-testing — challenge, or **be sold** (*"it's low-stakes and reversible"* is a valid sale). Grounding: the AI-native definition *itself* includes the human — "the system acts; the human **monitors/approves/audits**" (PRD §1a). **Unicorn ≠ headless.**
  - **The over-simplification bar:** every ⚡ agent block must name **what it consumes, what it decides/does, what it emits, and its failure path** — the same input/output/nameable bar the role-transformation cards demand of people. *"AI handles compliance"* is the agent-side equivalent of *"freed up for higher-value work"* — a placeholder where thinking stopped. Rejected.
  - **The interlock with §6:** the *transforms* landings — people who now "govern the system: escalations, errors, owns the rules, audits the misses" — **are the SME gates the new design needs.** Every agent needs an accountable human surface; every landed human needs a concrete role; many of those roles *are* those surfaces. Two gates, one closed loop — and the politically-safe story writes itself ("you're the escalation authority on the queue").
- **Propose (demoted):** at most a provocative *question* about an *area* (*"what if no human touched this?"*), and only when a team is genuinely stuck. **Never a finished solution** — that does the thinking for them and kills the learning.
- **Govern:** flags drift from locked **intent/outcome** + the **real constraints**.

> "A chatbot is a feature of AI-native, not AI-native." AI-native = the system **initiates, preempts, and acts**; the human **monitors / approves / audits.** (Authoritative, from transcript — see PRD §1a.)

---

## 5. The constraint-vs-HOW engine

The heart of the phase. **The engine runs in two passes across the two phases (clarified 2026-06-11 — Team B cannot interrogate elements it cannot see):**

- **Pass 1 — Surface (Team A):** capture harvests the raw WHY behind every element — each phase, moment, handoff, check, and person (capture §3a). This is where "why does this exist?" is asked *of the old process*, by the people who own it.
- **Pass 2 — Rebuild (Team B):** the old phases/moments are hidden; Team B pressure-tests only what it *can* see — **(a) the candidate constraints** from the teardown and **(b) every element of its own new design.** The Coach is the consistent skeptic across both passes.

In both passes the **AI is a fair skeptic: challenge, or be sold.** Full model in `capture-design.md` §3a. Summary:

- **Real constraint** (accountable/approves/decides · regulator-mandated · irreplaceable judgment · hard legal/contractual/security boundary) → **survives** the redesign.
- **HOW** (informed/notified · contributes data they hold · coordination · old sequencing) → **demolished.**
- **Stale constraint** — was real pre-AI (info silos, manual access) but AI/data dissolved it → now HOW. *"That was true pre-AI — still true?"*
- The AI is neither bulldozer nor pushover; **the team must convince the skeptic.** Reasons are layered — keep the real bit, drop the rest.

---

## 6. The "where did the people land?" gate (redesign completeness)

**A workflow is steps + people. Redesign the steps but can't say what each person now concretely does → the design is half-finished.** This gate is the **mirror of capture's orphan tray**: capture had orphan *blurbs*; redesign has **unplaced *people*** — and they **block "redesign complete."**

**Who the people are (resolved 2026-06-11):** the gate runs on the **people inventory** from the teardown (Swap spec §4) — the full roster of the original workflow (role + capacity data, not step-attached), *not* just the locked accountable personas. Without the inventory Team B couldn't land people it never saw; with it, every person in the old workflow must land in the new design.

**What "blocks" means (resolved — gates vs the timebox):** the phase still ends when the Farrier's timer ends — nothing can hold a live room hostage. Concretely, unlanded people (a) keep the team's console status at **building, never ✓ complete**, (b) mark the export **"partial — N people unlanded"**, and (c) trigger the Coach's triage in the final stretch (*"4 people still haven't landed — land them before polishing boxes"*). Blocking gates completeness *status*, not the room's clock.

**"Freed up for higher-value work" is the tell** — a placeholder where a decision should be; unfalsifiable filler that proves the designer stopped thinking. The AI rejects it.

**Separate the *task's* fate from the *person's* fate.** Classifying a task as HOW kills the *task* — it does **not** auto-delete the *person* (they're an **SME, not headcount**). Each person must land in one of **three honest outcomes, read off the new design:**

1. **Stays** — keeps their existing role (e.g., the accountable approver still approves). They were never the thing automated.
2. **Transforms** — *(default for absorbed-but-expert)* moves from doing the volume → **governing the system**: handles **escalations + errors**, owns the rules, sets the standard, audits pipeline misses. (For the lab: literally *"owns the eval."*) Same person, more leverage. **These landings staff the SME gates the autonomy audit demands (§4)** — when the Coach asks an agent block "where does this escalate?", the answer is usually a *transforms* card.
3. **Removed — justified *by the new design*** — only if their contribution (e.g., "adds data they hold") is **demonstrably absorbed**, and you can **point to where** in the design it's handled. Deliberate, on the record, with awareness they're an SME (flag for redeployment).

**The AI checks the justification against the actual redesign** — you can't claim "removed" unless the design demonstrably covers their function. Output: a **role-transformation card per person** (`from → to`, with input/output/nameable skill) → feeds **export page 2.**

**This is three tests stacked:** completeness (design isn't done) · honesty (designer stopped thinking) · **recruitment** (the displaced person is the SME whose cooperation you need — *"freed up"* = they hear "redundant" and kill your project with edge cases; *"you're the judge of the queue and owner of the rules"* = a future with more leverage). **Same redesign, opposite politics** — and the tool refuses to ship the version that gets you sabotaged.

---

## 6a. Amending a locked block (the escape hatch — added 2026-06-11)

Locked-but-wrong is a trap: if Team A's intent was thin/mis-captured and the Farrier overrode the gate, Team B inherits a **locked wrong intent** and is stuck with it for 30 minutes. The escape hatch:

- Team B **challenges a locked block** via the Coach, with a stated reason (*"this intent is an artifact — the capture missed the decision behind it"*).
- The request lands on the **Farrier's console** → the Farrier approves or denies (they can read the original capture in the mirror to judge).
- Approved → the locked block is **amended, with the change logged on the brief** (visible at share-out, so the original team sees what was corrected and why).
- Rare by design — the gate exists to prevent this — but when needed, nothing else saves the exercise. Server-side: locked fields stay client-tamper-proof; the *only* mutation path is the Farrier-approved amendment.

## 7. Visual language

A "Critic's Notebook" base; **loud B-peak energy reserved for the retrofit-kill** (scribble-out) and the swap. Calm, legible elsewhere. (See `capture-design.md` §6.)

---

## 8. Reference mocks (repo root)

| File | Shows |
|---|---|
| **`mock-redesign-v2.html`** | **Canonical**: abstract brief, guided 1/2/3, fair-skeptic constraint-vs-HOW (sold vs demolished across phase/person/check) |
| `mock-human-landing.html` | The "where did the people land?" gate (stays / transforms / removed-justified) |
| `mock-redesign.html` | First attempt — **superseded** (AI wrongly handed over the answer) |

---

## 9. Open questions (deferred)

1. **Identify-areas (step 2)** — explicit tagging UI, or fluid conversation? (capture's open Q1 applies here too)
2. ✅ **Re-layout stability** — RESOLVED: the AI/human contention rules (capture §2b) apply identically in Rebuild.
3. **How the AI checks "removed" against the design** — heuristic vs explicit "point to the absorbing element."
4. **Propose frequency** — purely on-demand vs occasional nudge when stuck.
