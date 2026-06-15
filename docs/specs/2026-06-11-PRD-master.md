# Horsepower — Master PRD

*(working title was "AI-Native Workflow Studio")*

**Status:** Locked + **reconciliation pass applied 2026-06-11** (cross-spec seams closed: secrecy/vocabulary rule · room view · host code · one-code join · people inventory · double-reveal share · per-workflow exports · pre-computed teardown · lock amendments · gate semantics · contention rules · conflict signal). Living document.
**Date:** 2026-06-11
**Purpose of this PRD:** to define the product for **building** (not stakeholder sign-off).
**Method:** breadth-first on the knowns (this doc); mock-first depth per phase (phase specs).

**Naming (locked 2026-06-11):**
- **Product: Horsepower** 🐎 — carries the wit (horse / engine-of-work motif).
- **Phases: Surface** (capture the real process) **→ Rebuild** (redesign it AI-native). Deliberately literal — clarity for things people navigate.
- **Facilitator: the Farrier** — the human running the session (shapes & equips the "horses"). Ties to Horsepower.
- **In-canvas AI challenger: the Coach** (kept clear, per the division-of-labour rule — you talk to it constantly).
- *Principle:* the **product name carries the wit; phase/role names carry the clarity** — what keeps it usable after the novelty wears off.
- Spec files use capture/redesign interchangeably with **Surface/Rebuild**.

> Legend: ✅ decided · 🟡 partial · ⬜ not started · ❓OPEN = needs a decision from facilitator

---

## 1. Vision / why this exists

A live, in-room workshop tool for the GenAI Lab's **"redesign, don't retrofit"** exercise. Teams document a real business workflow, swap canvases with another team, and redesign each other's workflow AI-native — with an AI that scribes, governs, and provokes throughout.

**The win is a mindset shift, not a deliverable.** Two goals (from facilitator planning):

1. **Direction** — confront the lab that *retrofitting AI onto today's process is the wrong path*. If we keep doing what we do now, we're heading the wrong way; in 5–6 months the work itself changes.
2. **Get good** — level the lab up into GenAI / agentic thinking.

Success is measured in **"ahas," energy, and genuinely radical redesigns** — not in artifacts produced.

**The product's job:** be the **governance** that makes teams capture rigorously enough to hand off, and redesign radically enough to matter — with an AI that does the structuring toil and the provoking, so humans spend their time on judgment and imagination.

**Product positioning — GENERAL & SCALABLE.** This is **not** a bespoke tool for one lab session. It is a **reusable product for running "redesign, don't retrofit" workshops with *any* team** — the GenAI Lab is simply **pilot run #1.** Consequences:
- **Do not assume an AI-savvy audience.** Future teams include non-technical business users. The product must **onboard, guide, and worked-example** people who've never heard "AI-native" — without condescending. (The disarming-but-legible Critic's Notebook direction serves this.)
- **Scalability is a hard requirement** — start at 2 teams but scale to N (see §6).
- **The methodology is the constant; each team brings its own *why*.** The lab's trust-building motivation below is run #1's reason, not the product's.

**The lab's specific arc (run #1):** an internal alignment + trust-building rehearsal — the lab must master "redesign, don't retrofit" *themselves* before they can earn leadership's trust to run real discovery (*"if we cannot run our own redesigning, no one will dare let us"*), leaving able to evangelize to peers and bosses.

**The surprise's shelf life (stance, 2026-06-11).** 🤫 The swap-as-surprise only fully works once per participant; as a reusable product, repeat participants and facilitator briefings are permanent leak vectors. The stance: **the methodology survives a known twist, degraded but intact** — zero-attachment still holds (you still redesign a process you didn't capture, anticipated or not); what degrades is the honest-capture benefit (knowing teams may game the capture) and the theatrical beat. So: facilitators are briefed to keep the secret; the product never foreshadows it (the vocabulary rule, capture §5a); and a run where the room already knows is a *worse but valid* run — never a broken one. No design depends on the secret holding.

### 1a. What "AI-native" means (authoritative — use in the framework + redesign coach)

- *"AI-native is where your whole product cannot survive without AI."* (Cursor, Perplexity — gone without their LLM.)
- **A chatbot is NOT AI-native — it's a *feature* of it.** (Directly validates our capture pivot away from chat-first toward a system that *builds, governs, and acts*.)
- AI-native = the **system initiates** ("why can't the system tell you what to do next?"), preemptively flags, and *acts*; the human **monitors / approves / audits.**
- **The "rabbit rule" (core mechanic of the redesign phase):** teams instinctively say *"AI makes the report for me"* — that's still a **retrofit/feature.** The coach must push past it: **start from purpose → let the stack collapse** (cadence, deliverable, goal all change; you become an *auditor*, not a *creator*; maybe there's *no report at all*).
- **Unicorn ≠ headless (the second edge, 2026-06-11):** the definition above *includes* the human — monitor/approve/audit is constitutive, not residue. So **"just agentic-loop everything" fails the AI-native test too**: a consequential decision with no SME gate, no escalation path, no audit surface isn't AI-native, it's unaccountable automation. *Feasibility* (latency, cost, model capability) stays out of scope; *accountability* (SME gates, HITL escalation) is **in** scope — the Coach challenges fake autonomy with the same fair-skeptic rules it uses on fake constraints (Rebuild §4).

---

## 2. Users & roles

| Role | Count | What they do |
|---|---|---|
| **Facilitator** | **2+ (a few)** | Run the room, explain each part with a worked example, control phases / timer / the swap, monitor teams' progress. |
| **Team** | **Start ~2 · scale to ~6 (≈30 pax)** | Mixed roles, ~5 people each. Capture one *real* process; after the swap, redesign *another* team's workflow AI-native. **B-lite multi-device** (below). |

**Lobby creation (self-serve):** **anyone** can create a room → gets a **workshop code** (public, projected) + a **host code** (private, console-only) → becomes that room's **Farrier (host)**. Not gated to pre-anointed facilitators. Participants join with the workshop code + a **team picker** (one code for the whole room — no per-team codes); co-hosts join as Farrier with the **host code** (the projected code alone never grants control).

**Collaboration model — B-lite (supersedes the old "one device per team"):** each member is on **their own device**. There is **one canonical, AI-readable map** (server-side = source of truth). Contributions flow *through the AI* (everyone brain-dumps into the shared chat; the Coach reconciles into the one map), so they don't collide. **Direct map edits are node-scoped** (per-node soft-lock / last-write-wins) with **presence**. No CRDT/OT — the AI absorbs the merge. Everyone participates; nobody's locked out around one laptop.

**Usage context:** ✅ same physical room, co-located. Devices join over LAN with the short code.

**Audience nature:** GENERAL — spans AI-savvy engineers to **non-technical business teams. Assume no AI fluency.** The tool must onboard and guide without condescending. (Run #1 is the AI-aware lab, but the product can't bank on that.)

**Resolved:** start ~2 teams, but **scalability is a hard requirement** — rotation, monitoring, projector view, and state must not assume a small fixed count; two facilitators — recommend **both get control**.
**Still ❓OPEN:** target scale ceiling (max teams/people?); exact people-per-team.

---

## 3. The journey (skeleton + timing)

`lobby → capture → swap → redesign → share` — a facilitator-driven state machine.

| Phase | Time | What happens | Spec |
|---|---|---|---|
| **Lobby / join** | — | Low-friction: one workshop code + team picker; template ready to fill. | ✅ `2026-06-11-lobby-design.md` |
| **Capture** | ~20 min (+5–7 setup) | Teams brain-dump their current process; AI co-authors a living map; governance ensures it's transfer-grade. | ✅ `2026-06-11-capture-design.md` |
| **Swap** | instant (pre-computed) | Teardowns rotate to the *next* team. The peak "REDESIGN — DON'T RETROFIT" moment. | ✅ `2026-06-11-swap-design.md` |
| **Redesign** | ~30 min (+4 setup) | Teams reinvent the received workflow AI-native; AI flips to provocateur; convergence challenged; intent/outcome/accountable-personas locked. | ✅ `2026-06-11-redesign-design.md` |
| **Share-out** | ~10 min | The double reveal: what it was → what it became → what died; closing. | ✅ `2026-06-11-share-design.md` |

**Total ≈ 80–90 min** (target ~1 hr, may stretch to 1.5). Facilitator sets/clears the timer per part.

**App scope vs slideware:** the app powers **capture → swap → redesign → share** (~55 min). The surrounding segments — **hot-take/shock, context/why, the "AI Everywhere All At Once" framework** (~25 min) — are facilitator slides, *out of app scope*.

---

## 4. Core capabilities (high-level — detail lives in phase specs)

- **Brain-dump capture** → living, re-routing workflow map (AI/human contention rules: human touch wins — capture §2b). ✅ (see capture spec)
- **Four-signal governance**: missing / thin / orphan / conflict; readiness gate at the swap (**"Newcomer check"** to teams · **"redesign-ready?"** to the Farrier — the 🤫 vocabulary rule, capture §5a); system-owned + offline-evaluable; timer-aware triage. ✅
- **The swap / rotation**: each team receives the *next* team's **teardown** (brief + areas + candidate constraints + people inventory); pre-computed at gate-green so the reveal is instant; Farrier brief-preview for leak QA. ✅
- **Locked constraints at redesign**: intent, outcome, accountable personas locked (server-enforced; Farrier-approved amendment as the only escape hatch). ✅ rule
- **Anti-retrofit detection**: convergence challenged without referencing the hidden original (honest match-flags on the console only — no leak-by-flag). ✅ rule, ⬜ experience
- **AI coach postures — the moat**: scribe + governance (Surface, incl. jargon/exception hunting) → teardown distiller (swap) → **fair skeptic both ways** (fake constraints *and* fake autonomy) + **context oracle** ("ask about the workflow" — problem-space answers, leak-filtered, assumption ledger) + **teacher** (capability translator, pattern naming — the "get good" win) + provocateur (Rebuild) → diff renderer + assumption reckoning (Share). **Propose is demoted**: at most a provocative question when stuck — never its own designs on the canvas (provoke-not-solve). All push rationed by the **challenge budget**; pull (tooltips, oracle, chips) unlimited. ✅ contract: `coach-behavior.md`
- **Per-phase interface:** **Surface** = chat | map split (resizable). **Rebuild** = map-heavy + chat-assist (for when you're "lazy to move things"). The **map is interactive & editable throughout** — direct-manipulation like Excalidraw, but with the Critic's-Notebook soul + AI governance: **the AI co-authors structure, the human can grab and edit any node.** 🟡
- **Facilitator console**: phase control, timer, live monitoring of all teams — **never projected**; the projector gets the **room view** (code + roster + timer, no phase rail — protects the surprise). 🟡 (exists, needs redesign)
- **Share / takeaway**: the **double reveal** (original revealed → rebuild presented → the Coach's "what died" diff); every team guaranteed to see **its own workflow's fate**; export = **per-workflow 2-page pack**, each team downloads both packs that involve it. ✅
- **Graceful degradation**: any AI/API failure falls back to rule-based checks + a question bank; the workshop never stalls. ✅ rule

---

## 5. Success criteria

A session went well if:
1. Every team's captured map is **transfer-grade** — the receiving team can redesign it cold, without asking questions.
2. Redesigns are **genuinely AI-native** — phases collapsed (not preserved), AI *acts* instead of informs, no retrofits survive.
3. Teams have visible **"aha" moments** — they see their own process was redesignable, not just automatable.
4. The room has **energy**; the AI's provocation lands as a spark, not a chore.
5. Two facilitators can **run the whole arc within ~90 min** without the tool getting in the way.

---

## 6. Performance & constraints

- **Network:** same-room LAN; binds `0.0.0.0`; teams join by short code. ✅
- **Concurrency:** multiple teams editing simultaneously; full-state broadcast on every change. ✅ (validate at target team count)
- **Scalability (first-class):** must scale from 2 teams to the ceiling without a redesign — the **swap rotation generalizes to N teams**, facilitator **monitoring stays legible at scale**, the **projector view handles a growing roster**, and full-state broadcast stays performant. **Target ceiling: ~30 people / ~6 teams / a few facilitators.** ⬜
- **Devices / display:** must read on a **projector from the back of the room** *and* on a **laptop up close**. Drives "expressive chrome, legible content." ✅ principle
- **AI latency / reliability:** coach calls must tolerate slowness and **fail gracefully** — never block the exercise. ✅ rule
- **State:** ✅ **persistent** — disk-backed so sessions survive a server restart (not in-memory-only). Keep deployment trivial. *Hosted-deploy footnote:* free-tier Render/Railway filesystems are **ephemeral** (lost on redeploy/restart) — persistence is guaranteed on a laptop; hosted runs need a persistent disk/volume add-on or accept in-memory-grade durability.
- **Editing model:** ✅ **B-lite** — multi-device per team; one canonical AI-readable map (server source of truth); contributions reconciled through the AI; direct edits node-scoped (soft-lock / LWW) + presence. No CRDT.

---

## 7. Non-goals (deliberate scope limits)

- **General across teams/orgs, but methodology-specific.** Reusable by *any* team — but it is **not** a general workflow/diagramming tool (not Miro/Excalidraw). It's purpose-built for the redesign-don't-retrofit exercise.
- **Not** practicality-oriented — the redesign is *deliberately* impractical/"unicorn"; feasibility is out of scope by design.
- **Not** remote/hybrid for v1 — co-located only.
- **Not** voice-input for v1 — typed brain-dump only (voice is a different mode, deferred).
- **Not** a heavyweight persistence/analytics platform — keep it trivially deployable (laptop or Render/Railway), single-file client, no build step.

---

## 8. Open questions (product-level)

1. ✅ **Scale** — start ~2 teams; ceiling **~30 pax / ~6 teams / a few facilitators** (~5 per team).
2. ✅ **Two-facilitator control** — both/all facilitators get full control. *(recommended; confirm)*
3. ✅ **Export** — **2-page per-WORKFLOW pack**: page 1 = original captured process, page 2 = AI-native redesign (+ role-landing cards). Each team downloads **both packs that involve it** — *your workflow* (the evangelism artifact for their boss) and *your rebuild*. Printable/shareable (feeds the "show your boss" goal).
4. ✅ **Persistence** — sessions are **persistent** (disk-backed, survive a server restart). Not in-memory-only.
5. ✅ **Share-out** — the **double reveal** (original revealed by its team → rebuild presented by its rebuilders → Coach diff "what died"); facilitator picks who presents; every team sees its own workflow's fate regardless. **No scoring in v1.**

**All product-level questions resolved — umbrella PRD locked.**

---

## 9. Spec index (the documents under this PRD)

**UX / journeys**
- ✅ `2026-06-11-ux-end-to-end.md` — **the capstone**: master state machine, woven Team/Coach/Farrier choreography, screen inventory, data model, all edge cases (+ visual `journey-map.html`)
- ✅ `2026-06-11-user-journeys.md` — Farrier + Team-member journeys, B-lite collaboration model

**User stories**
- ✅ `2026-06-11-user-stories.md` — finalized against the complete spec set

**Phase specs**
- ✅ Lobby / onboarding — `2026-06-11-lobby-design.md` (one workshop code + team picker; private host code)
- ✅ Surface (capture) — `2026-06-11-capture-design.md`
- ✅ Swap — `2026-06-11-swap-design.md`
- ✅ Rebuild (redesign) — `2026-06-11-redesign-design.md` (abstract brief, 1/2/3, two-pass constraint engine, human-landing gate over the people inventory, lock amendments)
- ✅ Share + Export — `2026-06-11-share-design.md`

**Cross-cutting specs**
- ✅ The Coach (AI behavior contract) — `2026-06-11-coach-behavior.md`
- ✅ Visual design system — `2026-06-11-design-system.md` (tokens · type · **map symbol vocabulary** · components · **motion system** · do/don'ts)
- ✅ The Farrier's console — `2026-06-11-farrier-console-design.md` (compact dashboard + read-only **canvas mirror** drill-down)
- ⏸ Technical / performance / reliability — deferred (local-first)

---

## 10. Locked methodology (do not break — mirrored in `CLAUDE.md`)

The capture ontology (+ the WHY behind every element); the swap rotation **as a surprise** (vocabulary rule; console never projected); the teardown (HOW stripped zero-leak, one scoped exception: the people inventory); intent/outcome/**accountable** personas locked at redesign (server-enforced; Farrier-approved amendments only); anti-retrofit **without leak-by-flag**; the human-landing gate; the `lobby → surface → swap → rebuild → share` state machine; graceful AI degradation **including the gates**. These are the *point* of the product and constrain every spec above.
