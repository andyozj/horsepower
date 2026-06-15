# Horsepower — End-to-End UX (the capstone)

**Status:** Source of truth. Weaves all phase + cross-cutting specs into one authoritative end-to-end flow.
**Date:** 2026-06-11
**Companion:** `journey-map.html` (visual render of this doc).

> This is the document whoever builds Horsepower follows. It defines the **master state machine**, the **woven Farrier + Team choreography**, the **screen inventory**, the **data model**, and **every decision branch / edge case**. Per-phase detail lives in the individual specs; this is the connective tissue.

---

## 1. Actors & model (recap)
- **the Farrier** — host(s). Create the workshop, drive phases, timer, swap, monitor.
- **Team member** — on their **own device** (B-lite). Create/join a team; do Surface → Rebuild → Share.
- **the Coach** — the AI. Reads the **one canonical map** per team; postures by phase; never decides.
- **Collaboration:** contributions flow *through* the Coach (it reconciles into one map); direct edits node-scoped (soft-lock/LWW) + presence; **no CRDT**.

---

## 2. Master state machine

```
[create] → LOBBY → SURFACE → (SWAP) → REBUILD → SHARE → CLOSED
```
- Transitions are **Farrier-driven** (except `create`). Edits are **phase-gated** server-side (Surface edits only in SURFACE; Rebuild edits only in REBUILD).
- **SWAP** is an action *on entry to REBUILD*: rotate canvases + distill briefs. Requires ≥2 teams.
- State **persists to disk**; survives restart; any actor can reconnect into the current state.

---

## 3. The woven choreography (per state)

### 3.0 CREATE / LOBBY
| | Farrier | Team member | Coach | → transition |
|---|---|---|---|---|
| Actions | "Host a workshop" → **workshop code** (public) + **host code** (private). Open the **room view** on the projector (code + roster + timer — never the console). Watch teams assemble (live counts). Re-seat/remove. (Off-app briefing.) | Enter **workshop code + name** → **team picker** → join a team or create one (name it). See teammates (presence). | idle | Farrier clicks **Start Surface** |
| Sees | Console: workshop + host codes, roster filling in. Projector: **room view** | Lobby: "you're in, <team> — <teammates>" — 🤫 **no foreshadowing of the swap** | — | |

### 3.1 SURFACE (capture)
| | Farrier | Team member | Coach | → transition |
|---|---|---|---|---|
| Actions | Set per-part timer. Monitor dashboard. **Drill into any team → read-only canvas mirror** (real labels, floating orphans, typed content). **Preview pre-computed briefs** (leak QA). Nudge the stuck. Re-seat mis-joins. | **Brain-dump** the process into shared chat (any order). Directly **edit the map** (drag/rename/add; arrows follow). Resolve flags. | **Scribe** (structure dump → living map, under the §2b contention rules) + **governance** (missing/thin-squiggle/orphan-tray/**conflict**; push WHY; timer-aware triage) + the readiness gate (**"Newcomer check"** to teams · **"redesign-ready?"** to the Farrier) + **pre-compute teardowns at gate-green**. 🤫 Never uses pre-reveal vocabulary. | Farrier clicks **Swap** (≥2 teams) |
| Layout | console (dashboard + drill-down); projector shows room view | **chat ǀ map split, resizable** | reads canonical map | |

### 3.2 SWAP (transition into REBUILD)
| | Farrier | Team member | Coach | → |
|---|---|---|---|---|
| Actions | Confirm Swap (override names which team inherits a thin brief; or hold). | 🤫 **SURPRISE — first they learn of the swap.** Stamp lands **instantly** (teardowns pre-computed); receive the **teardown** of *another* team's process (brief + areas of concern + candidate constraints + **people inventory**, no HOW). | Serve the cached **teardown** (brief zero-leak + areas + candidates + people inventory); rotate; scramble-place locked blocks. | enter REBUILD |

### 3.3 REBUILD (redesign)
| | Farrier | Team member | Coach | → transition |
|---|---|---|---|---|
| Actions | Timer. Monitor (retrofit match-flags — console-only, **human-landing** status, the Coach's **room whisper**). Approve/deny **lock amendments**. Drill into mirrors. | Guided **absorb → identify areas → design** over the **scattered ingredient context cards** (one-line context; tooltip = the WHY). **Interview the oracle** ("ask about the workflow"). Build the new HOW on the map. Resolve constraint-vs-HOW + autonomy-audit + human-landing. Challenge a wrong locked block if needed. | **Fair skeptic** (constraint-or-HOW over candidates + the new design) + **autonomy audit** (fake autonomy challenged like fake constraints) + **context oracle** (problem-space answers, leak-filtered; assumption ledger) + **teach** (capability translator, pattern naming) + **coverage check** (areas of concern addressed) + **provocateur** (no leak-by-flag; drift/rabbit-rule) + **human-landing gate** (blocks ✓-complete, not the clock) + (rare) propose — all push rationed by the **challenge budget** | Farrier clicks **Share** |
| Layout | console | **map-heavy + Coach dock** | reads canonical map | |

### 3.4 SHARE + EXPORT
| | Farrier | Team member | Coach | → |
|---|---|---|---|---|
| Actions | **Pick who presents** (straight, no scoring); project the **double reveal** per pair on the room view. Then **close/archive**. | **See your own workflow's fate** on your screen (guaranteed). Presenting pairs: original team voices "what it was" → rebuilders present "what it became" → the diff shows "what died — and what was fake" → **assumption reckoning** (original team confirms ✓/busts ✗). **Export both packs** (*your workflow* + *your rebuild*). | **Diff renderer** ("what died" + constraint ledger) + assumption reckoning + narrative scaffold | CLOSED |

---

## 4. Screen inventory

**Farrier:** Host-start (workshop + host codes) · Console·Lobby (roster) · Console·Surface (dashboard + drill-down mirror + brief preview) · Console·Rebuild (same, redesign flags + lock-amendment requests) · Console·Share (present picker) · **Room view** (projector-only: code + roster + timer; → Before/After present view in Share) · Closed.
**Team:** Join (workshop code + name) · **Team picker** (join or create) · Lobby · Surface (chat ǀ map) · Swap-moment (stamp + teardown) · Rebuild (map + dock) · Share (own-fate view; present) · Export (both packs).

---

## 5. Data model (light)
- **Workshop** {code, **hostKey**, farrierIds[], teamIds[], state, timerEnd}
- **Team** {id, name, workshopId, memberIds[], canvas, **teardown?** (pre-computed), receivedTeardown?, redesign?}
- **Member** {id, name, teamId, presence}
- **Canvas** (the canonical map) {persona[], trigger, inputs, phases[{name, moments[{text, persona, pain, why}]}], intent, outcome, orphans[], conflicts[]}
- **Teardown** (pre-computed at gate-green; served at swap) {brief: {need, want, constraints}, areasOfConcern[], candidateConstraints[], **people[{role, capacity[], whys[]}]** — *HOW stripped; people never step-attached*, glossary[], **contextCards[]** (one-liner + abstracted WHY per ingredient, zero-leak-filtered), amendments[]}
- **Redesign** {map, constraintLedger[], **assumptions[{text, status: open|confirmed|busted}]**, peopleLandings[], notes}

---

## 6. Decision branches & edge cases (comprehensive)
- **<2 teams at swap** → Swap disabled; Farrier prompted to wait/merge.
- **Team not redesign-ready at swap** → Farrier **override** (swap with a flagged-thin brief; confirm names the receiving team) or **hold**.
- **Empty/very thin canvas** → receiver gets a thin brief; flagged on the console pre-swap.
- **Orphans unresolved** → Surface gate **blocks** (team sees the "Newcomer check" framing); shown on the console mirror.
- **Timer running out with flags open** → governance switches to **triage** ("these 2 gaps hurt most"); gate informs, the Farrier's clock rules.
- **Human unplaced in Rebuild** → ✓-complete status **blocks** + export marked "partial — N unlanded"; the timer still ends the phase.
- **"Freed up for higher-value work"** → rejected; demands stays/transforms/removed-justified.
- **Locked block is genuinely wrong** → team challenges via the Coach → Farrier approves/denies → amendment logged on the brief (Rebuild §6a).
- **Teardown stale at swap** (team edited after gate-green) → regenerated in background; worst case the swap serves the rule-assembled fallback, upgraded when ready.
- **Latecomer** joins mid-phase → workshop code + team picker → drops into the team's live canonical state.
- **Member joins the wrong team** → Farrier re-seats them (allowed any time pre-swap).
- **Disconnect/reconnect** (any actor) → identity persists; restores current state.
- **AI failure** at any Coach touchpoint → **degrade** to rule-based checks + question bank; gates run rule-only (semantic checks → heuristics); teardown → rule-assembled fallback; share diff → structural comparison; **never block**. Export renders client-side (works offline).
- **AI/human edit collision on a node** → contention rules (capture §2b): human touch wins; ~10s cooldown; Coach changes narrated; Coach never deletes (orphans instead).
- **Odd team count** → ring rotation still gives each team someone else's canvas.
- **Co-Farrier** → joins with the **host code** (the projected workshop code never grants control); multiple hosts, equal control; last-write-wins on phase actions.
- **Concurrent node edits** → per-node soft-lock / LWW; presence shows who's editing.
- **Members' accounts of the process conflict** → conflict signal on the node; the Coach never silently merges; unresolved = thin.

---

## 7. Cross-cutting invariants
- **Phase-gating** enforced server-side.
- **Persistence** (disk) across all states.
- **Graceful degradation** is mandatory at every AI touchpoint — including the gates, the teardown, and the share diff (rule-based fallbacks; a gate never blocks a room because the AI is down).
- **One canonical map per team** = the single source of truth the Coach reads and the Farrier mirrors.
- **Humans decide; the Coach challenges** — at every step. (Gates are system-owned and rule-evaluable; the Coach enriches them, it never *is* them.)
- 🤫 **The swap is a SURPRISE** — never foreshadowed in lobby/Surface; the Farrier doesn't pre-announce it. Protects honest capture *and* the zero-attachment that makes anti-retrofit work.
- 🤫 **The pre-reveal vocabulary rule (capture §5a):** no team-facing surface — UI copy, gate names, Coach utterances — uses *swap / redesign / rebuild / hand over / receiving team / stranger / transfer* before the reveal. The team-facing gate is the **"Newcomer check"**; the honest names live on the Farrier's private console. **The console is never projected** — only the **room view** (code + roster + timer) goes on the wall.
- **Zero-leak with one scoped exception:** the teardown strips all HOW (steps, sequence, layout) — except the **people inventory** (roster + capacities, never step-attached), which the human-landing gate requires. Retrofit flags never reference the hidden original on team screens (no leak-by-flag).
