# IPO Panel — Product & Facilitation Review

**Lens:** if Horsepower had to impress at IPO-diligence level, what would we do better — as a *product for running workshops*, not as a codebase?
**Date:** 2026-06-13 · **Reviewer:** Product & Facilitation advisor
**Ground rules respected:** nothing here re-recommends items already fixed/deferred in `docs/critic-reports/iter2/SYNTHESIS.md` or `docs/design-reports/TRIAGE.md`; every recommendation is checked against the locked methodology (CLAUDE.md rules 1–9), and tensions are flagged honestly.

**Context for the bar.** Horsepower's in-session experience is genuinely ahead of the market in its niche: no general tool (Miro, FigJam, Mural) enforces a methodology server-side, pre-computes a surprise teardown, or ships an AI that is contractually a provocateur rather than a generator. The diligence gaps are almost all **around** the session — before it (facilitator confidence, pre-work), after it (momentum, measurement, memory), and at the declared scale ceiling. That is exactly where the comparable products earn their retention, and where Horsepower currently has nothing.

---

## 1. Top 10 recommendations

### R1. Post-workshop momentum engine — "Now what" beat + auto-recap + persistent link
**What:** Add a 3-minute closing beat after Share: each participant writes one commitment ("the first thing I'll redesign-not-retrofit back at my desk"), structured as Liberating Structures' *What / So What / Now What* debrief. The Coach (degrading to rule-based assembly) compiles a one-page session recap — both workflows' fates, the myth ledger, the commitments — emailed/linkable, not just downloadable in-room. Optionally resurface commitments to participants ~30 days later (the "postcard to yourself" pattern).
**Why it matters at the IPO bar:** the single most-reported facilitation pain is post-session decay — 37% of facilitators say maintaining momentum after the workshop is their #1 challenge (SessionLab State of Facilitation 2025). Horsepower's stated win is "a mindset shift, not a deliverable" — but a mindset shift with no follow-through artifact is unverifiable, and unverifiable value doesn't survive diligence. Butter and SessionLab both anchor retention on auto-generated recaps; Parabol on AI meeting summaries. The export packs and race card are in-room keepsakes; this is the *out-of-room* loop, and it's also the referral engine ("show your boss" is already a PRD goal — make it one click, not a PDF download).
**Evidence:** https://www.sessionlab.com/state-of-facilitation/2025-report/ · https://voltagecontrol.com/blog/how-to-use-liberating-structures-for-a-retrospective/ · https://www.butter.us/ · https://www.parabol.co/
**Effort:** M (recap = mostly existing judgeLedger/diff/export data; email/links need a tiny delivery surface). 30-day resurfacing: L, can be phase 2.
**Methodology tension:** none — everything happens post-reveal. Recap text must still pass the leak filter if a workshop is archived while another run is pending, but that's an edge.

### R2. Exit pulse — measure the "aha" (the proof-of-value engine)
**What:** A 60-second pulse at CLOSED, on each participant's own device: one aha you had (free text) · one thing you'll do differently · a before/after confidence slider ("I could redesign a workflow AI-native"). Results land on the Farrier's closed screen and in the recap (R1). Rule-based, zero AI dependency.
**Why:** the PRD's success criteria are "ahas, energy, radical redesigns" — currently *measured by vibes*. The workshop-impact literature is blunt: satisfaction smiles are not outcomes; you must define and capture intended outcomes at the event and follow up later (PLOS *Ten Simple Rules for Measuring the Impact of Workshops*). At IPO diligence, "we changed minds" needs a number and a quote stream. The aha quotes are also the marketing asset a facilitator-led product lives on. SessionLab now builds feedback-form + AI-summary loops into the session object itself for exactly this reason.
**Evidence:** https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1006191 · https://www.sessionlab.com/blog/sessionlab-2025-recap/
**Effort:** S–M.
**Methodology tension:** none (post-reveal). Keep it collaborative-toned — no scores between teams.

### R3. Facilitator pre-flight: rehearsal/sandbox mode + a seeded worked example
**What:** A "dry-run" mode on the console: spin up a sandbox workshop pre-seeded with one realistic example workflow (a fictional team's capture) so a first-time Farrier can click through Surface → swap → Rebuild → Share alone in 10 minutes, see the teardown and reveal fire, and rehearse the RUNSCRIPT cues. Ship the example workflow doubling as the in-room worked example (today it's assumed to live in slides, out of scope).
**Why:** the PRD's positioning is **general & scalable — any facilitator, not the founding lab**. The product's growth model is "a new facilitator succeeds on their first run"; right now their first run *is* production, with a live room and a one-shot surprise. Every comparable tool invests here — SessionLab's entire core is pre-session planning; Butter ships an AI agenda planner and a library of tested session blocks; Mural ships guided facilitation training. The swap's theatre makes Horsepower *less* forgiving of facilitator fumbles than any of them, and it currently has the least pre-flight support.
**Evidence:** https://www.sessionlab.com/blog/sessionlab-2025-recap/ · https://www.butter.us/features/agenda · https://learning.mural.co/courses/basics-running-meetings
**Effort:** M (the state machine, teardown, and console all exist; this is seeding + an isolated sandbox flag).
**Methodology tension:** none — the sandbox is Farrier-only. Keep the seeded example out of participants' reach so the worked example never reveals swap mechanics to a future participant browsing alone.

### R4. Capture ontology: add "systems & data touched" and a today-baseline (light, optional)
**What:** Two optional, Coach-prompted enrichments to capture: (a) per input/phase, *which system or data source this lives in* (one line, meta like `meta.capacity`/`meta.why`); (b) one workflow-level baseline line on the trigger or outcome — *how often does this run, how long does it take today*. Both flow into the teardown (systems are constraint raw-material; the baseline gives rebuilders a "today costs X" anchor) and the export pack.
**Why:** the 2024–26 agentic-redesign literature is consistent that workflow redesign around agents stands on three legs the current ontology under-captures: the data/systems the work lives in, guardrails/permissions for the agent, and a pre-deployment baseline to compare against (McKinsey's agentic operating model and data-foundations work; Microsoft's agentic maturity model). Horsepower's "inputs" gesture at data but never name systems; nothing captures volume/cycle-time. Without a baseline, the rebuild's export pack can't say "this redesign removes a 3-day loop that runs 40×/month" — which is precisely the sentence the participant's boss needs. The autonomy-audit posture (PRD §1a: accountability is *in* scope) also gets sharper raw material: "the agent acts inside Salesforce — who audits that?"
**Evidence:** https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/the-agentic-organization-contours-of-the-next-paradigm-for-the-ai-era · https://www.mckinsey.com/capabilities/mckinsey-technology/our-insights/building-the-foundations-for-agentic-ai-at-scale · https://learn.microsoft.com/en-us/agents/adoption-maturity-model/maturity-model-business-process
**Effort:** S–M (the meta plumbing, thin-checks, and teardown assembly all exist from the Slice-1 inspector work).
**Methodology tension:** REAL — the capture window is ~20 min and the ontology is locked (rule 1). Mitigate: strictly optional, never gate-blocking, Coach asks only when governance is otherwise green (the "polish while the room catches up" slot already exists). Feasibility stays out of scope — the baseline is *evidence of today*, not a ROI calculator for the unicorn.

### R5. Coach instant-synthesis: cluster the parking lot + end-of-phase "here's what you said"
**What:** Two enrichment-only AI moves. (a) When the parking lot holds ≥4 orphans, the Coach offers theme-clusters with names ("these 5 are all about approvals — one phase?") as proposals on the existing proposals shelf — never auto-applied. (b) At gate-green and at Rebuild ✓-complete, a 4-line Coach synthesis of the team's map ("you've described a workflow that exists to…"), read aloud-able by the team in share prep. Both vanish silently offline (pull, not gate).
**Why:** instant clustering + summarization is the table-stakes AI pattern every competitor now ships — Miro AI's affinity clustering and summaries, FigJam's sort/summarize stickies, Mural's AI clustering and themed Sidekicks, Parabol's AI group-naming and per-topic summaries. Horsepower has the *harder* half (dump→typed-map structuring) but not the *expected* half. The orphan tray is the natural home: it's already the "said, not yet mapped" pile, and clustering it accelerates exactly the moment teams stall. The phase synthesis doubles as share-prep, feeding R1's recap.
**Evidence:** https://uxdesign.cc/miro-vs-figjam-how-their-ai-assistants-stack-up-a6ac0b9d5385 · https://medium.com/@uxraspberry/redesigning-the-workshop-ai-powered-facilitation-in-miro-figjam-and-mural-84d8b3deab62 · https://www.parabol.co/
**Effort:** M (rides the existing `SYSTEMS.structure`/proposals-shelf machinery and rule #9 contention model).
**Methodology tension:** low, but two checks: cluster proposals must respect provoke-not-solve (clusters organize what the team said; they don't design); synthesis copy must pass the pre-reveal vocabulary filter.

### R6. Private brain-dump mode (the Mural "Private Mode" pattern, Farrier-toggled)
**What:** An optional first-N-minutes-of-Surface mode: every member dumps into their own private pad (the scratchpad machinery, extended); on Farrier release, entries flow into the shared chat/orphans with authorship optionally withheld. Toggle lives on the console.
**Why:** honest capture is the methodology's fuel, and the threat to honest capture isn't the AI — it's the room: HiPPO effects and groupthink in a mixed-role team of 5 with the boss present. Private-then-merge is Mural's most-cited "facilitation superpower" ("reduce groupthink, more honest feedback") and a standard brainstorm-quality move (1-2-4-All in Liberating Structures). Horsepower already half-built it (the lobby scratchpad flushes to orphans); this promotes it to a deliberate facilitation instrument.
**Evidence:** https://www.mural.co/features/superpowers · https://support.mural.co/s/article/facilitation-superpowers
**Effort:** M.
**Methodology tension:** mild friction with the presence/author-dots feature (contributions are normally attributed). Resolution: it's a Farrier-chosen mode for the first minutes only; B-lite reconciliation is untouched (everything still flows through the one canonical map).

### R7. Farrier whisper-to-team (the "summon" gap, adapted)
**What:** A one-line message from the console to a *specific team's* screens, rendered as a distinguished Farrier note in their Coach rail ("From the Farrier: your trigger is still empty — 5 min left"). Compose box runs the pre-reveal vocabulary lint and warns before sending banned words. Pairs with the existing "Needs you" triage queue: triage tells the Farrier *who*; the whisper gives them reach without walking the room mid-beat.
**Why:** every facilitation-first tool gives the facilitator in-tool reach into participants' attention — Mural's summon/outline, Butter's hand-raise queue and agenda push, Parabol's facilitator "next" button. The Farrier can currently *see* everything (drill-down, match-flags, triage) but can only act with their feet or the global timer. At 2 teams that's fine; at the PRD's 6-team ceiling it is the difference between facilitating and firefighting.
**Evidence:** https://support.mural.co/s/article/facilitation-superpowers · https://www.parabol.co/ · https://www.butter.us/use-case/meetings
**Effort:** S (one WS message type + a rail rendering; the rail and console both exist).
**Methodology tension:** the whisper is human-authored, so the vocabulary rule depends on the lint + the briefing. Lint client-side AND server-side (rule 4's lesson: never trust the client).

### R8. Async pre-work intake (Surface-ontology only)
**What:** An optional pre-workshop link per team: 3 questions, answered privately before the session ("what kicks this workflow off? what's the most painful moment? who's involved and what do they actually do?"). Answers land as pre-seeded scratchpad/orphan material when Surface opens.
**Why:** sessions are trending shorter (1–2 hours now standard — SessionLab 2025) and multi-modal (async + live blends are mainstream practice; Parabol runs whole retro phases async). Horsepower's 20-minute capture window is its tightest squeeze — the Newcomer gate regularly competes with the clock (the spec's triage mode exists *because* of this). Pre-work converts dead calendar time into capture depth and gives quiet members a voice before the loud ones set the frame.
**Evidence:** https://www.sessionlab.com/state-of-facilitation/2025-report/ · https://www.parabol.co/support/how-to-start-an-asynchronous-retrospective/
**Effort:** M–L (a pre-session surface + identity linking; the flush-to-orphans path exists).
**Methodology tension:** TWO real ones, flagged: (a) the vocabulary rule extends to pre-work copy — questions must be pure Surface ontology, zero swap scent; (b) "co-located v1" is a PRD non-goal boundary — pre-work happens *before* the room, which arguably respects it, but it does soften the "everything happens live" purity. Recommend piloting as facilitator-optional.

### R9. Workshop memory: archive, re-run, and cross-run patterns
**What:** Don't let CLOSED be a dead end. (a) An archive index for a host: past workshops browsable read-only (the disk persistence already holds them). (b) "Run it again" — clone room settings/timer defaults. (c) Later: anonymized cross-run patterns ("the 5 most-busted constraint myths across your workshops") as facilitator insight.
**Why:** at IPO diligence the first product question is retention, and a single-session ephemeral tool structurally has none. Every comparable (SessionLab sessions library, Parabol meeting history + dashboards, Butter recaps room) treats session history as the spine of repeat usage. For Horsepower the flywheel is the *facilitator*: their third workshop should be easier and more credible than their first, and busted-myth patterns across runs are unique, defensible data no whiteboard owns.
**Evidence:** https://www.parabol.co/ · https://www.sessionlab.com/blog/sessionlab-2025-recap/
**Effort:** M for (a)+(b); (c) is L and needs consent/anonymization design.
**Methodology tension:** brushes the PRD non-goal "not a heavyweight persistence/analytics platform." (a)+(b) stay inside the existing JSON-on-disk model and trivial deployability; (c) should be deferred until the invariant can be honored.

### R10. Prove the ceiling: a 6-team / 30-pax validation pass + a Share format that scales
**What:** (a) Run the existing e2e harness at the PRD ceiling (6 teams, ~30 actors) and fix what buckles — console dashboard legibility, full-state broadcast volume, room-view roster. (b) Design the N-team Share: 6 double-reveals do not fit in 10 minutes; add a "featured pair + gallery" mode (Farrier features one or two reveals live; every team still gets its own fate on-device + in the recap, which R1 guarantees).
**Why:** scalability is a PRD *hard requirement* explicitly marked ⬜ unvalidated ("validate at target team count"), and the share-phase arithmetic is a real methodology-vs-clock collision nobody has had to face at 2 teams. Diligence will ask "what happens at your own stated ceiling?" — today the honest answer is "untested." The room-energy beat (PRD success criterion #4) is most at risk exactly here.
**Evidence:** PRD §6 (`docs/specs/2026-06-11-PRD-master.md`) · participant-count benchmarks of comparable rooms, e.g. Butter's 100-participant sessions: https://www.sessionlab.com/blog/online-tools-for-workshops/
**Effort:** M for the validation pass; M for the Share gallery mode.
**Methodology tension:** "every team sees its own workflow's fate" is locked — the gallery mode must preserve it on-device even when stage time doesn't allow 6 full reveals.

---

## 2. Do NOT do — fashionable features that would damage the point

1. **Points, leaderboards, talk-time analytics, or any inter-team scoring.** PRD-locked collaborative-only. Kahoot-envy would corrupt the share-out into a competition and kill the psychological safety the reckoning depends on. Per-participant "engagement analytics" for the Farrier is the same poison in dashboard clothing.
2. **A participant-visible agenda / session outline (the Butter/Mural pattern).** Their best feature is Horsepower's worst enemy: any run-of-show visible to teams foreshadows the swap. The agenda belongs on the console and nowhere else. (This is why R3's rehearsal mode is Farrier-only.)
3. **AI-generated redesigns — "let the Coach draw it."** FigJam/Miro generate diagrams from prompts; shipping that into Rebuild guts provoke-not-solve, the product's moat. The Coach proposes structure for *what the team said* (dump→map, R5 clustering) — never solutions.
4. **General-whiteboard feature parity** (infinite freeform canvas, sticky packs, template marketplace, embeds). Explicit PRD non-goal; it's an unwinnable arms race against Miro and it dilutes the methodology-shaped tool into a worse whiteboard.
5. **AI-gated progression** — letting any LLM verdict block a gate, the swap, or the share. Rule 8 is the operational moat: the workshop never stalls. Every AI feature must keep the "key absent = feature absent or rule-based" property.
6. **Feasibility scoring / ROI calculators inside Rebuild.** The redesign is deliberately unicorn; practicality policing reintroduces exactly the retrofit mindset the workshop exists to break. (R4's baseline is evidence about *today*, captured in Surface — not a judgment on the rebuild.)
7. **Built-in video/hybrid calling.** Co-located is a v1 non-goal for good reason; bolting on a Butter-style call stack is a different product with a different cost structure.
8. **Re-theming the navigational names** or deepening the stable metaphor into navigation. The PRD principle (wit in the product name, clarity in the labels) is what keeps it usable after the novelty fades.

---

## 3. Verdict

The session itself is already differentiated beyond anything Miro, Mural, or FigJam can fake; the IPO-level hole is that Horsepower's value currently **evaporates when the projector turns off**.
The single highest-leverage investment is the **post-workshop momentum + proof loop (R1 + R2)**: a Now-what beat, an auto-recap that travels, and a 60-second aha pulse — it attacks the #1 documented facilitation pain, converts "mindset shift" from a claim into a measured, quotable asset, requires zero methodology compromise, and is the engine that makes every other investment (facilitator growth R3, memory R9, scale R10) compound.
Build the part of the workshop that happens after the workshop.
