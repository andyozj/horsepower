# Slice A — AI-led Interview Surface (text-first) — Design Spec

**Date:** 2026-06-15
**Status:** Approved (brainstorm) — pending spec review
**Part of:** the "initiative Coach" vision (A=interview engine · B=voice · C=grander reveal · D=proactive Rebuild steering). **This spec is Slice A only.** B/C/D are out of scope here.

---

## 1. Goal

Turn the **Surface** phase from "fill in a canvas by hand" into **"get interviewed by an agent that authors your map."** The Coach holds the initiative: it asks, digs, identifies components and gaps, and **the team's map fills in real time as they answer** — blocks appear, connect, and reshape (including on spoken/typed corrections). This makes the tool itself AI-native (system initiates + acts; humans supply ground truth + correct), and lets the team *experience* an AI-native interaction before they're asked to design one.

**Slice A is text-first:** the team answers by typing. The screen is *designed* to host voice, but the mic is inert until Slice B.

## 2. Non-goals (explicit scope fence)

- **No voice** (STT/TTS) — that is Slice B. The mic button renders but is disabled.
- **No change** to the swap, Rebuild, Share, the phase state machine, the Newcomer-check gate, governance, locks, persistence, or the hardened wire protocol.
- **No new server broadcast model** — the server keeps broadcasting full per-role state exactly as today.
- Not a Rebuild-phase feature (that's Slice D).

## 3. Foundational principle (the load-bearing decision)

**Never regenerate; always diff — at both levels:**

1. **AI emits id-keyed operations, not whole maps.** Each turn the Coach returns a small **op-list** (add / update / connect / move / remove) keyed to existing block ids. It is given a compact snapshot of the current map so it targets edits (a correction updates block #7, it does not spawn a duplicate).
2. **The client reconciles, it does not rebuild.** A new **keyed canvas reconciler** diffs incoming state against the DOM by block/arrow id and touches *only* what changed (append one node with its entrance animation, patch one label, draw one arrow). This replaces the current "wipe `world`, re-append every node" in `makeCanvas`.

This principle is what makes a map that updates every few seconds feel alive instead of thrashing. The reconciler also retires the broader full-render jank (it is the root of the focus/selection/tool-restoration band-aids that exist today).

## 4. Architecture

The interview is a **layer on top of the existing Surface canvas**, not a replacement. The same `team.canvas` is the single source of truth; the interview just drives what fills it. Hand-editing, the gate, governance, and degradation all remain.

### 4.1 The turn loop
1. A team member types a message into the shared interview thread.
2. Client `POST /api/coach` with a new **`interview` mode**, riding the existing A4 gate / per-room + per-IP + global caps / timeout. Payload: the user message + recent transcript (the existing `canvas.chat`) + a **map snapshot** `[{id, type, text}]`.
3. AI returns `{ reply, ops: [...] }` — `reply` = the Coach's next question/steer (one sharp move at a time, per the existing Coach character); `ops` = the id-keyed diff.
4. **Server validates + applies** the ops (see §5), appends `reply` to `canvas.chat` (server-owned chat discipline, A7), and broadcasts full state as today.
5. Every client **reconciles** and animates only the changed nodes.

### 4.2 Multi-member model
**One shared team interview.** Any member can contribute a turn; everyone sees the same thread and the same map filling. The Coach addresses "the team." No per-player interview state. (Slice B's PTT = one person speaks into their own device at a time; same shared thread.)

### 4.3 Degradation (rule #8 — non-negotiable)
If `AI_PROVIDER` is unset or the call degrades, the interview falls back to a **rule-based scripted question sequence** assembled from the existing question bank (ontology-ordered: trigger → personas → inputs → phases → moments → intent → outcome → WHYs). It produces `reply` text only (no ops); the team places blocks by hand. The hand-canvas always works. The room never stalls.

## 5. The op protocol (server contract)

AI op-list shape (validated server-side — **never trusted**):

```
ops: [
  { op:'add',     tmpId:'t1', type:'phase', text:'Reconcile', why?:'…', capacity?:'…', system?:'…' },
  { op:'update',  id:'b123', text?:'…', why?:'…', capacity?:'…', system?:'…', pain?:true },
  { op:'connect', from:'b1'|'t1', to:'b2'|'t2' },
  { op:'move',    id:'b123', x:Int, y:Int },     // rare; layout is mostly server heuristic
  { op:'remove',  id:'b123' }                     // e.g. "that's not actually a step"
]
```

- **`add`**: server assigns the real id, **positions via the existing type-aware layout heuristic** (the same one the `proposal-place` path already uses), stamps `meta.author` as the Coach. `tmpId` lets same-batch `connect` ops reference not-yet-created blocks; resolved server-side within the batch.
- **Validation reuses the hardened discipline** (`sanitizeCanvas`/`clamp*`/`str`/`num`): type allowlist, text/why/system/note clamps, geometry clamps, drop unknown keys / `__proto__` / forged `locked`. Ops referencing unknown ids are dropped (logged), not fatal. A malformed op never crashes the turn (degrade: apply the valid ops, skip the rest).
- **`block.text` collision with live editing:** an `update` to a block whose label is being edited on some device is held by the existing `editingLock` idiom on that device (the reconciler skips patching a focused label).

## 6. The keyed reconciler (client)

Replaces the wipe-and-rebuild in `makeCanvas`'s draw path:

- **Blocks:** index existing `.node` DOM by `data-id`. For each block in new state: exists → patch only changed props (x/y/w/h, label text *unless focused*, washes/meta); absent → create node + play entrance animation (the existing B1 stagger / draw-on). For each DOM node whose id is gone → remove (with the orphan-not-delete settle where applicable).
- **Arrows:** same keyed diff by arrow id.
- **Preserves** focus, caret, selection, and active tool natively (no DOM churn → the `selRestore`/`toolRestore`/activeElement gymnastics become largely unnecessary; keep them as a safety net for full view switches).
- Hand-rolled, ~100–150 lines, **no framework / morphdom** (project invariant). Canvas-specific, not a general VDOM.

## 7. UI

### 7.1 Lobby on-ramp changes
- **Remove the "Let's ride" / `me.saddled` step entirely.** No per-player commitment beat (you meet the Coach by talking to it). The **Farrier starting Surface** is the de-facto trigger that opens the interview.
- **Steeds appear all at once** — drop the staggered canter-in / count-up; show the team's members together.
- **Frustrations seed the interview** — the lobby scratchpad carries in: the Coach's *opening* turn references them ("you flagged X — tell me about that"), and they are available as raw material (orphans). (Replaces today's silent `flushScratch`-to-orphans.)

### 7.2 The two-stage interview screen
- **Stage 1 — "talk to me":** chat is the hero (full-bleed), Coach asks, team answers. Mic button present (inert in A).
- **Stage 2 — the map takes over:** once the map has ≥3 blocks, the map becomes the big surface and the chat **docks as a floating panel** (bottom), staying live. A manual toggle is always available either way.
- The floating dock is the Surface home of the Coach (it supersedes the right-rail Coach in Surface for this flow).

## 8. Secrecy (rule #2)

No new cross-team surface. The transcript lives in the team's own `canvas.chat`, already team-scoped and server-projected. The map snapshot fed to the AI is the team's own map. Swap secrecy is untouched. Pre-reveal vocab lint (`BANNED_VOCAB`) applies to the `reply` exactly as it does to other Coach output.

## 9. Files

- **`server.js`** — `interview` mode in `/api/coach`; op-list validation + apply (`applyOps`, reusing sanitize/clamp); the `SYSTEMS.interview` prompt (drives one sharp question at a time, emits ops JSON); scripted-fallback sequence.
- **`public/index.html`** — the two-stage interview screen + shared thread; the **keyed reconciler** in `makeCanvas`; the interview client state (turn send, snapshot build, stage transition); lobby on-ramp changes (remove saddle, steeds-at-once, frustration seed).
- **`qa-interview.js`** (new) — see §10.

## 10. Testing

- **Op validation:** malformed/hostile ops (bad type, forged `locked`, unknown id, oversized text, `__proto__`, object-coerce) are rejected/clamped; the turn still applies the valid remainder; never crashes.
- **Reconciler correctness:** add/update/move/remove/connect each touch *only* the right DOM nodes (assert node identity is preserved for unchanged blocks — no churn); a focused/edited label is not clobbered by an incoming `update`.
- **Correction handling:** "X is actually Y" emits an `update` (not an `add`) → no duplicate block.
- **Degradation:** no `AI_PROVIDER` → scripted question sequence drives `reply`, no ops, hand-canvas fully works.
- **Secrecy:** the `interview` `reply` is `BANNED_VOCAB`-linted; transcript stays team-scoped (no leak in another team's projection).
- **Regression:** all existing suites stay green (e2e, e2e-playwright, qa-hostile, qa-a11y, qa-editguard, qa-online, batch1/2, sandbox, scale).

## 11. Risks / open items

- **Live-AI quality is the central risk** — incremental extraction + clean correction-handling depend on the model. Mitigated by: server validation (bad ops can't corrupt), the always-present hand-canvas, and tunable model (Haiku→Sonnet via env). Quality itself is provable only with a live key (Heineken gateway).
- **Reconciler is a real refactor** of the canvas render path; it must preserve every existing canvas behavior (drag, resize, handles, arrows, inspector, gate). The regression suites are the guard.
- **Layout churn:** server-side type-aware placement must be deterministic/stable so re-broadcasts don't reposition blocks (reuse the existing heuristic; AI rarely emits `move`).
