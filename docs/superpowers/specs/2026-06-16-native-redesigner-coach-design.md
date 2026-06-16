# Slice C — the native redesign-challenger Coach (design)

> Source: synthesis of a 3-agent Opus design panel (persona-challenger / constraint-routing+persona-delta / native-not-oracle) + the user's strategy: "the AI coach is the CORE; lean into native; guide people to REDEFINE the new role; dissect Socratically; personas are the spine."

**Goal:** give the Rebuild Coach a real redesign-challenger muscle that makes retrofit *visible* — without ever adjudicating truth, and degrading to rule-based scaffolding so the room never stalls (rules #4, #8).

## The contract (Agent 3, binding)

- The Coach **provokes, names patterns, demands verdicts — it never renders them.** Its job is to turn a silent fake-keep into a *stated* claim the team owns and the debrief adjudicates.
- The app survives with AI down (the whiteboard still captures), but the **deliverable** (a real redesign) does not. Degraded mode therefore stays honest: the rule-based bank fires (nobody blocked) but is labelled scaffolding, not the genuine article.
- Personas are the spine; the retrofit happens at the **person-landing** moment → that is where the challenge attaches, **inline, per person** (Agent 1).

## 1. Persona redesign-challenger — `SYSTEMS.persona`

New coach branch: `POST /api/coach {challenge:'persona', code, teamId, personId, outcome, note}` (sits past the A4 gate/bucket/timeout like every coach call).

Server builds context from: person role + capacity + chosen outcome (stays/transforms/removed) + note + locked intent/outcome. Returns ONLY JSON:

```json
{"reply":"<one challenge, <=2 sentences>",
 "flag":"unexamined-keep|shape-keep|blank-transform|verb-not-role|missing-dropped-work|value-handwave|absorbed-by-whom|null",
 "require":"named-role|dropped-work|absorber|named-break|null",
 "settled":false}
```

- ONE challenge per call. Quote them back. No generic mush.
- `flag` is the debrief signal (goes to the Farrier console, never projected). `require` is what the team still owes.
- Vocab-linted before broadcast; on trip → degraded bank.
- **Degrades** to `personaChallengeBank(outcome, note, role)`: removed+empty → "removed by what? name the design move that absorbs the work"; transforms+verb-only → "that's a verb, not a role — what's the new role called?"; value-handwave (`freed up|higher.?value`) → rejected; stays+operates → "they keep doing the toil — is that the redesign, or the old shape?".

The challenge is **additive enrichment** — it never blocks landing (the `people:land` gate already rejects filler). It writes nothing server-side except the chat reply; the `flag` is returned to the client and surfaced on the card + carried to the debrief via the existing chat/flag channel.

## 2. Constraint routing — `constraint:route` + `SYSTEMS.route`

`team.redesign.constraints` ledger, seeded at swap from `teardown.candidateConstraints`:

```
{ id, text, source:null, movable:null, status:'open', why, ts }
```

WS case `constraint:route {constraintId, source}` (rebuild-gated, team-scoped authz, rides `ws.bucket`):
- `source ∈ {law, external-party, physics, policy, habit}` (allowlist; else drop).
- **Server derives `movable`** — never trusts the client: `law|external-party|physics → 'real'`; `policy → 'assumed'` (named but movable); `habit → 'assumed'`. `policy` stays distinct from `habit` in `source` for the debrief.
- idempotent re-route allowed while `status==='open'`.

Coach branch `{challenge:'route', code, teamId, constraintId}` → `SYSTEMS.route` challenges the routing ("which law? or is that just how it's always run?"). Degrades to `routeChallengeBank(source)`.

## 3. persona-delta — the retrofit detector (rule-based, server)

`personaDelta(team)` for a rebuilder team:
- **before**: capacity histogram from `teardown.people` (operates/accountable/served/informed/unspecified).
- **after**: `peopleLandings` outcomes (stays/transforms/removed) + agent-block count in `redesign.canvas`.
- **toilStays**: # people who `stays` AND whose capacity is `operates` (still hand-cranking → retrofit signal).
- **band**:
  - `REDESIGNED` — (transforms+removed) / total ≥ 0.5 AND agents ≥ 1.
  - `RETROFIT-SHAPED` — agents === 0 OR (stays / total ≥ 0.6 AND transforms+removed === 0).
  - `PARTIAL` — otherwise.
- returns `{ band, before, stays, transforms, removed, agents, toilStays, total, landed }`.

Exposed on the team's own `redesign` projection (rebuild+share+closed) — it's about the rebuilder's *new* design, never the hidden original, so no leak. Live "shape meter" in Rebuild; "shape verdict" card in Share; a debrief row on the Farrier console (never projected).

## Client surfaces

- **Inline persona challenge** on each `.landperson` card: after an outcome is picked, a "⚑ Coach, check this" affordance → `challenge:'persona'` → renders the one-line challenge + a `require:` chip on the card.
- **Constraint routing panel** ("Real or habit?") near the assumptions widget: per candidate, source buttons → live server `movable` verdict; "ask the Coach" → `challenge:'route'`.
- **Shape meter** pill in Rebuild (live `personaDelta.band`); **shape verdict** card in Share; debrief row on the console.

## Tests — `qa-redesigner.js` (node WS+REST, mock upstream)

constraint:route authz + phase-gate + **server-derived movable** (client `movable` ignored); persona challenge degraded bank fires + correct flags; `personaDelta` bands (redesigned / partial / retrofit); projection exposes `constraints`+`personaDelta`; secrecy (no banned vocab in persona/route replies). All existing suites stay green.
