# Batch 3 — Solution Design Doc (R3 + R10)

**Status:** for adversarial review. **No app file has been edited.**
**Scope:** `server.js` (1104 lines, read in full — already reflects the shipped A1–A16 hardening), `public/index.html` (client touch-points), two new test files (`qa-scale.js`, sandbox checks folded into `qa-hostile.js` or a small `qa-sandbox.js`), and the seed data.
**Invariants honored:** no framework, no build step, **no new runtime deps**, trivially deployable as-is. Every cap/TTL added lands in the existing `CONFIG` block (server.js:30–55).
**Contract:** `e2e.js` (34), `e2e-playwright.js` (64), `qa-hostile.js` (69), `qa-walkthrough.js`, `qa-fixcheck.js` all pass **unmodified**. Every claim below cites a `file:line` in the current tree.

The two features are nearly orthogonal. R3 adds a Farrier-only seeded sandbox; R10 adds scale validation + an N-team Share gallery. They share exactly one server hook (`createWorkshop`) and one client hook (`viewLanding` host area), so they are designed to land as two independent PRs.

---

## PART A — R3: Farrier rehearsal/sandbox + seeded worked example

### A.0 The architecture decision (flag vs client-sim) — RECOMMENDATION FIRST

**Recommendation: a real server-side workshop carrying a `sandbox:true` flag, with the Farrier socket playing every role through the *existing* socket model — NOT a client-only simulation.** One nuance that makes it safe and cheap (and answers hardening-hook A2): the sandbox's *teams already contain seeded "ghost" members*, so the Farrier never has to open member sockets — the console/room-view/share already render entirely from broadcast state, so a single Farrier socket sees a fully-populated room. The Farrier "plays all roles" by *driving the state machine* (which is all a real run is from the console), not by juggling sockets.

#### Why a real flagged workshop wins

| Dimension | Real flagged workshop (RECOMMENDED) | Client-only simulation |
|---|---|---|
| **Fidelity** (the whole point of a dry-run) | Exercises `performSwap`, `buildTeardown`, `maybePrecomputeTeardown`, `lockedFromCanvas`, the real phase gates, the real broadcast/projection, the real timer, the real `present:set` gallery. What the Farrier rehearses *is* the production path. | Would have to re-implement `performSwap`/`buildTeardown`/governance in the client — a **second source of truth** for the locked methodology (rules 1,3,4). Drift between sim and reality is a methodology-correctness bug waiting to happen; the rule-engine living once on the server is a load-bearing invariant (CLAUDE.md "rule-based on the server → fully offline-capable"). **Disqualifying.** |
| **Code added** | ~1 seed function + ~6 lines in `createWorkshop` + a `phase:demo-advance` convenience + landing button. The teardown/swap/reveal are reused verbatim. | Hundreds of lines re-deriving teardown/diff/governance client-side, plus a fake-broadcast loop. |
| **Reveal authenticity** | The real swap-reveal stamp fires (the Farrier *sees the surprise* the way a participant will). | The reveal is faked → the Farrier rehearses a different artifact than ships. |
| **Hardening surface** | Mints a workshop → must respect A6 mint bucket + MAX_WORKSHOPS + TTL sweep (handled in A.4 below). | No mint, but loses everything above. |
| **Leak risk (rule #2)** | A real room → a stray participant could in principle reach it. **This is the one real risk; the entire A.3 section is built to close it.** | Lower leak surface (nothing on the wire), but at the cost of fidelity. |

The leak risk of the real-workshop path is *containable by construction* (A.3); the fidelity loss of the client-sim is *not* recoverable without duplicating the methodology engine. We take the contained risk.

#### Why "Farrier plays all roles via sockets" is the WRONG framing (and what we do instead)

The prompt asks whether the Farrier "plays all roles via the existing socket model." Driving it by **opening a member socket per seeded participant** would be brittle (the Farrier's one browser tab juggling N WS connections; A2 projection would need per-member views the single tab can't usefully consume). Instead:

- The sandbox is seeded **server-side** with fully-formed teams whose members are *static seed records* (`online:true`, real ids, steeds). No member ever needs to be "live."
- The Farrier joins **as Farrier only** (one socket, exactly as today). The Farrier view is FULL at every phase (server.js:539, the `farrier` projection key) — so the console, drill-down, brief-preview, room-view, and the Share double-reveal **already render the whole sandbox from the Farrier's single broadcast**, with zero per-member data required. This is precisely what **A2 hardening guarantees**: `viewKey(ws)==='farrier'` → FULL state (server.js:552–554).
- The Farrier rehearses by clicking the **run-bar CTA** (the real `phase:set` path) — Surface → swap → Rebuild → Share → closed — watching the real teardown/reveal/gallery fire on the room view.

So the answer to "flag or client-sim, and does the Farrier need member sockets": **flag; and no — a single Farrier socket suffices because A2 already serves the Farrier the full room.** This is the cleanest possible fit with the shipped hardening.

---

### A.1 Server: the seed (`createSandbox` + the example workflow)

#### A.1.1 `createWorkshop` gains a `sandbox` flag

Replace `createWorkshop()` (server.js:256–269) with a thin parameterization — **default behavior byte-identical** so every existing caller (the REST mint at server.js:578) is unchanged:

```js
function createWorkshop(opts) {
  const w = {
    code: newCode(),
    hostKey: newCode(CONFIG.HOSTKEY_LEN),
    state: 'lobby',
    teams: [],
    timer: { durationMs: 0, remainingMs: 0, endsAt: null, running: false },
    presentingPairId: null,
    createdAt: Date.now()
  };
  if (opts && opts.sandbox) w.sandbox = true;   // throwaway: shorter TTL, never participant-reachable (A.3/A.4)
  workshops.set(w.code, w);
  scheduleSave();
  return w;
}
```

#### A.1.2 The seed function — fully-formed, methodology-complete

A sandbox is a real `createWorkshop({sandbox:true})` whose teams are populated by `seedSandbox(w)`. It seeds **two** teams (the swap needs ≥2; two is enough to rehearse the full rotation and one featured reveal) with complete, gate-green captures. Because the captures are gate-green, `maybePrecomputeTeardown` fires on seed and the teardown/locks are pre-computed exactly as production (server.js:414–418), so `phase:set('rebuild')` → the real `performSwap` (server.js:421) runs with no special-casing.

**Critical realism requirement (prompt): NOT the AP-invoice fixture the suites use.** The suites use "AP Squad / ETL Crew" with PO/invoice content (e2e.js). To avoid collision in screenshots, exports, and any future cross-test grep, the sandbox ships **two unrelated fictional workflows**: a **Field Service dispatch** team and a **New-hire onboarding** team. Each capture carries trigger / inputs / personas (with `meta.capacity` + `meta.why`) / phases (each with `meta.why` + moments via `meta.phaseId`) / intent (a decision, not an artifact) / outcome — i.e. it passes the rule-based `governance()` gate (server.js:329–339), including the `why` check (server.js:335) which requires every persona to have `why`+`capacity` and every phase a `why`.

Block-shape note: blocks must satisfy `sanitizeCanvas` shape (server.js:147–182) so they survive any later client `canvas:update` echo — `id`, `type ∈ BLOCK_TYPES`, finite `x/y/w/h`, `text`, `meta`. Moments reference their phase via `meta.phaseId`. I give x/y so the room-view mini renders legibly.

```js
// ---- R3: seeded worked example (Field Service dispatch ⇄ New-hire onboarding) ----
// Realistic, gate-green captures so performSwap/buildTeardown/locks run the PRODUCTION path.
// Deliberately NOT the AP-invoice fixture the suites use (no collision).
function seedMember(name, color) {
  return { id: 'sb-' + newId(8), name, steed: { name: name + "'s steed", color }, online: true, token: newId(16) };
}
function seedBlock(id, type, text, x, y, extra) {
  return Object.assign({ id, type, x, y, w: 180, h: 60, text, meta: {} }, extra || {});
}
function fieldServiceCanvas() {
  const C = emptyCanvas();
  C.blocks = [
    seedBlock('fs-tr', 'trigger', 'Customer reports equipment down via the call centre', 60, 40),
    seedBlock('fs-in1', 'input', 'Fault description + site address', 60, 130),
    seedBlock('fs-in2', 'input', 'Service contract / SLA tier', 60, 220),
    seedBlock('fs-p1', 'persona', 'Dispatch coordinator', 320, 40,
      { meta: { capacity: 'accountable', why: 'owns the promise to the customer — the SLA clock is on them' } }),
    seedBlock('fs-p2', 'persona', 'Field engineer', 320, 130,
      { meta: { capacity: 'operates', why: 'the only person who can physically fix the unit on site' } }),
    seedBlock('fs-p3', 'persona', 'Regional service manager', 320, 220,
      { meta: { capacity: 'informed', why: 'escalation path when an SLA is about to breach' } }),
    seedBlock('fs-ph1', 'phase', 'Triage the fault', 580, 40,
      { meta: { why: 'a wrong severity call sends the wrong skill set and burns the SLA' } }),
    seedBlock('fs-ph2', 'phase', 'Assign & route an engineer', 580, 130,
      { meta: { why: 'matching skill + parts + drive-time is what makes or breaks same-day fix' } }),
    seedBlock('fs-ph3', 'phase', 'On-site fix & sign-off', 580, 220,
      { meta: { why: 'the customer only counts it resolved when the unit runs and they sign' } }),
    seedBlock('fs-m1', 'moment', 'Decide severity (P1 down vs P3 degraded)', 800, 40, { meta: { phaseId: 'fs-ph1' }, pain: true }),
    seedBlock('fs-m2', 'moment', 'Find the nearest engineer who carries the right part', 800, 130, { meta: { phaseId: 'fs-ph2' }, pain: true }),
    seedBlock('fs-m3', 'moment', 'Capture the fix + customer signature', 800, 220, { meta: { phaseId: 'fs-ph3' } }),
    seedBlock('fs-it', 'intent', 'Decide who goes where next so the SLA is met at lowest cost', 580, 320),
    seedBlock('fs-oc', 'outcome', 'Equipment running again within the contracted window', 800, 320)
  ];
  C.arrows = [
    { id: 'fs-a1', from: 'fs-tr', to: 'fs-ph1' },
    { id: 'fs-a2', from: 'fs-ph1', to: 'fs-ph2' },
    { id: 'fs-a3', from: 'fs-ph2', to: 'fs-ph3' }
  ];
  C.glossary = [{ term: 'SLA', meaning: 'service-level agreement — the contracted fix-time window' }];
  return C;
}
function onboardingCanvas() {
  const C = emptyCanvas();
  C.blocks = [
    seedBlock('ob-tr', 'trigger', 'Signed offer letter returned by a new hire', 60, 40),
    seedBlock('ob-in1', 'input', 'Role, start date, manager, location', 60, 130),
    seedBlock('ob-in2', 'input', 'Equipment + system-access checklist', 60, 220),
    seedBlock('ob-p1', 'persona', 'People-ops onboarding lead', 320, 40,
      { meta: { capacity: 'accountable', why: 'owns whether day-one actually works for the new hire' } }),
    seedBlock('ob-p2', 'persona', 'Hiring manager', 320, 130,
      { meta: { capacity: 'served', why: 'needs the person productive fast; defines what "ready" means for this role' } }),
    seedBlock('ob-p3', 'persona', 'IT provisioning tech', 320, 220,
      { meta: { capacity: 'operates', why: 'the hands that create accounts and ship the laptop' } }),
    seedBlock('ob-ph1', 'phase', 'Collect joiner details', 580, 40,
      { meta: { why: 'everything downstream keys off correct role + start-date + manager' } }),
    seedBlock('ob-ph2', 'phase', 'Provision access & kit', 580, 130,
      { meta: { why: 'a person with no laptop/logins on day one is a wasted, demoralising first week' } }),
    seedBlock('ob-ph3', 'phase', 'First-week ramp & check-in', 580, 220,
      { meta: { why: 'early confusion is when regretted attrition is seeded' } }),
    seedBlock('ob-m1', 'moment', 'Chase the manager for role-specific access list', 800, 40, { meta: { phaseId: 'ob-ph1' }, pain: true }),
    seedBlock('ob-m2', 'moment', 'Laptop + all logins ready before day one', 800, 130, { meta: { phaseId: 'ob-ph2' }, pain: true }),
    seedBlock('ob-m3', 'moment', '30-day "is this working?" check-in', 800, 220, { meta: { phaseId: 'ob-ph3' } }),
    seedBlock('ob-it', 'intent', 'Decide a new hire is set up to be productive and stay', 580, 320),
    seedBlock('ob-oc', 'outcome', 'New hire productive and confident by end of week one', 800, 320)
  ];
  C.arrows = [
    { id: 'ob-a1', from: 'ob-tr', to: 'ob-ph1' },
    { id: 'ob-a2', from: 'ob-ph1', to: 'ob-ph2' },
    { id: 'ob-a3', from: 'ob-ph2', to: 'ob-ph3' }
  ];
  return C;
}
function seedSandbox(w) {
  const t1 = { id: 'sb-fs', name: 'Field Service (demo)', members: [seedMember('Dana', '#2e7d52'), seedMember('Theo', '#3b6b9a')],
               canvas: fieldServiceCanvas(), gateGreen: false, teardown: null, receivedFromTeamId: null, redesign: null, amendmentRequests: [] };
  const t2 = { id: 'sb-ob', name: 'Onboarding (demo)', members: [seedMember('Priya', '#a23b6b'), seedMember('Mo', '#b8860b')],
               canvas: onboardingCanvas(), gateGreen: false, teardown: null, receivedFromTeamId: null, redesign: null, amendmentRequests: [] };
  w.teams.push(t1, t2);
  w.teams.forEach(maybePrecomputeTeardown);   // gate-green → teardown pre-computed, production path (server.js:414)
  scheduleSave();
}
```

**Verification the seed is gate-green** (so swap/teardown run unforced): each persona has `meta.capacity` + `meta.why`; each phase has `meta.why` and at least one moment with matching `meta.phaseId`; intents are decisions ("Decide who goes where…", "Decide a new hire is set up…") — they pass `ARTIFACT_WORDS` (server.js:285, no report/dashboard/etc.) and the ≥3-word check (server.js:324); inputs + outcome present; no orphans, no conflicts. → `governance().gate.ready === true` (server.js:339) → `maybePrecomputeTeardown` sets `gateGreen` and builds the teardown.

**The locked-persona check works:** `lockedFromCanvas` locks personas whose capacity matches `/accountable|approve|served|decide/` (server.js:407–408). Field Service has `accountable` (dispatch coordinator); Onboarding has `accountable` + `served`. So the swap seeds locked blocks for intent/outcome/trigger/accountable-persona/inputs (server.js:447–451) — the Farrier sees real locked cards and can rehearse the "Challenge this" amendment path too.

#### A.1.3 Minting a sandbox — a dedicated REST route (Farrier-gated by obscurity + bucket)

```js
app.post('/api/sandbox', (req, res) => {
  if (!takeToken(ipBucket('mint', reqIp(req), CONFIG.MINT_BUCKET)))     // SHARES the mint bucket — A6 (hook 1)
    return res.status(429).json({ error: 'Too many rooms from this address — try again in a minute.' });
  if (workshops.size >= CONFIG.MAX_WORKSHOPS)
    return res.status(503).json({ error: 'Server is at capacity.' });
  const w = createWorkshop({ sandbox: true });
  seedSandbox(w);
  log('sandbox_minted', { code: w.code, ip: reqIp(req) });
  res.json({ code: w.code, hostKey: w.hostKey, sandbox: true });
});
```

It reuses the real mint path's two guards verbatim (A6 + MAX_WORKSHOPS) — see hardening-hook answers in A.4.

---

### A.2 Client: the "Rehearse / try a dry run" affordance (Farrier-only)

The sandbox must be **reachable only from the host/Farrier surface, never from any participant surface** (rule #2). The single safe entry point is the landing's **host area** (`viewLanding`, the `host-btn` at index.html:1321). I add a sibling button *beside* host (same fetch-then-`connect()` idiom), and — critically — phrase it so a stray participant browsing the landing learns nothing about the swap.

**Copy lint (rule #2 / capture spec §5a):** the button and any sandbox chrome must NOT say *swap / redesign / rebuild / hand over / receiving team / stranger / transfer*. The participant-safe label is **"Practise running a room"** with the meta line **"A private dry-run with an example workshop — only you see it."** "Dry run / rehearse / practise" are facilitator words, not swap-mechanic words; they reveal nothing about rotation.

```js
// in viewLanding(), immediately after card.append(hostBtn) (index.html:1327):
const sbBtn = el('button', { class: 'btn sm subtle', style: 'width:100%; margin-top:8px', 'data-testid': 'sandbox-btn',
  onclick: async () => {
    const r = await fetch('/api/sandbox', { method: 'POST' }); const d = await r.json();
    me.role = 'farrier'; me.code = d.code; me.hostKey = d.hostKey; me.sandbox = true;
    me.teamId = null; me.memberId = null; saveMe();
    connect();
  } }, glyph('i-play') + ' Practise running a room');
card.append(el('div', { class: 'meta', style: 'margin:10px 0 4px' },
  'First time? Take a private dry-run with an example — only you see it.'), sbBtn);
```

`me.sandbox` is client hygiene only (lets the console show a banner; reset in `goHome`, index.html:1110). It is **never trusted** server-side — the server's `w.sandbox` is the truth.

**Console banner + fast-advance (optional convenience, Farrier-only):** in `viewConsole` (server.js view is FULL so `state.sandbox` is available — see A.2.1), show a dismissible **"Dry-run room — nothing here is a live workshop. Step through with the button below."** strip above `runBar()`. No new server message is required to rehearse — the existing run-bar CTA already does `phase:set`. (Optional nicety: a `phase:demo-advance` that the server treats exactly like `phase:set` to the next state; **omit it** — it adds an authz surface for zero gain since the real CTA is the thing being rehearsed.)

#### A.2.1 Surfacing `sandbox` to the Farrier client

`baseState` (server.js:509) builds the per-broadcast envelope. Add one field so the Farrier UI can render the banner and the room-view watermark:

```js
function baseState(w) {
  return { code: w.code, state: w.state,
    timer: w.timer || { durationMs: 0, remainingMs: 0, endsAt: null, running: false },
    presentingPairId: w.presentingPairId || null,
    sandbox: !!w.sandbox };           // +1 field, harmless to all consumers
}
```

This flows to *every* view string. That is **fine and in fact desirable**: even if a participant ever did reach a sandbox (they can't — A.3), `state.sandbox===true` lets the client refuse to render the participant journey (A.3 belt-and-braces). It does not leak swap mechanics — it's a boolean "this is a demo."

---

### A.3 The leak rigor (rule #2 — the BIG methodology risk, treated adversarially)

> "Keep the seeded example out of participants' reach so the worked example never reveals swap mechanics to a future participant browsing alone."

A sandbox is a real workshop with a real 4-letter `code`. The threat: a participant **guesses or shoulder-surfs** a sandbox code, joins as a member, and — because a sandbox is mid-`rebuild` with seeded teardown/locked cards on the wire — *learns the swap exists before their own reveal.* This is the single most important thing to get right. Four independent guards, defense-in-depth (any one suffices; all four ship):

**Guard 1 — sandbox codes are never displayed to participants.** The room-view (the only projected surface) is shown for a *sandbox* only on the Farrier's own machine during a private dry-run; the Farrier is told in copy "only you see it." There is no participant-facing surface that ever prints a sandbox code. (A real workshop's code is meant to be projected; a sandbox's is not.)

**Guard 2 — the server refuses member joins to a sandbox (the load-bearing guard).** In the `join` case, member branch (server.js:778–790), reject seating into a sandbox:

```js
// member branch of 'join':
ws.role = 'member';
if (w.sandbox) {                         // rule #2: a sandbox is Farrier-only — no participant may ever seat
  log('sandbox_member_refused', { code: w.code });
  return send(ws, { type: 'error', error: 'That code isn’t an open room.' });
}
```

And the same refusal in `team:create` / `team:join` (server.js:792, 803) — a hostile client that skips `join` and posts `team:create` directly is also bounced:

```js
// top of team:create AND team:join:
if (w.sandbox) return;                   // silent: a sandbox never grows real teams
```

The error copy **"That code isn't an open room"** is itself leak-safe — it does not reveal the room is a *demo* or that a *swap* exists; to a stranger it's indistinguishable from a typo'd code. This is deliberate (a curious participant gets no signal at all).

**Guard 3 — `GET /api/workshop/:code` hides sandboxes.** The join flow's existence check (index.html:1309–1310, 1337) calls `GET /api/workshop/:code` and only proceeds on `r.ok`. Make a sandbox return 404 there so the client's "join the room" path treats it as nonexistent:

```js
app.get('/api/workshop/:code', (req, res) => {
  if (!takeToken(ipBucket('get', reqIp(req), CONFIG.GET_BUCKET)))
    return res.status(429).json({ error: 'Slow down.' });
  const w = workshops.get((req.params.code || '').toUpperCase());
  if (!w || w.sandbox) return res.status(404).json({ error: 'Workshop not found' });   // +`|| w.sandbox`
  res.json({ code: w.code, state: w.state, teams: w.teams.map(t => ({ id: t.id, name: t.name, members: t.members.length })) });
});
```

So a participant typing a sandbox code into the join card gets "That room doesn't exist." The Farrier reaches the sandbox via `connect()` → WS `join` with the `hostKey` (sandbox returns it on mint), bypassing this GET entirely — so the Farrier is unaffected.

**Guard 4 — client refuses the participant journey when `state.sandbox`.** Belt-and-braces in `render()`: if a non-Farrier somehow holds a sandbox state, bounce home. Right after the role routing (index.html:1083):

```js
if (state && state.sandbox && me.role !== 'farrier'){ toast('That isn’t an open room.', true); return goHome(); }
```

**Net:** a member cannot seat (Guard 2, server-enforced — the only one that matters against a hostile client), cannot even confirm existence (Guard 3), and cannot render the journey (Guard 4). The Farrier path is untouched at every guard. **This fully preserves rule #2's pre-reveal secrecy.**

**One honest residual (logged in the risk register):** the seeded *example workflows themselves* (Field Service, Onboarding) become "worked examples" the Farrier may screen-share while teaching. If the Farrier projects the sandbox room-view mid-`rebuild` to a room that will *later* be participants, they'd show teardown/locked cards. **This is a facilitation choice, not a product leak** — the same way a slide deck could spoil the swap. Mitigation: the RUNSCRIPT/console copy for the sandbox explicitly says *"use the Surface capture as your worked example before the room starts; don't project the later phases."* We cannot prevent a Farrier from mis-using their own private room; we *can* and do prevent any participant from reaching it unbidden.

---

### A.4 Hardening-hook answers for R3 (the 4, by name)

**Hook 1 — A6 mint bucket + MAX_WORKSHOPS + TTL sweep.**
- *Mint bucket:* `/api/sandbox` calls `takeToken(ipBucket('mint', reqIp(req), CONFIG.MINT_BUCKET))` — the **same bucket** as `/api/workshop` (server.js:574), capacity 60, refill 0.1/s. A facilitator doing a few dry-runs before a real room mints maybe 1–3 sandboxes plus 1 real workshop — nowhere near 60. **Confirmed: normal facilitator use cannot trip it.** Sharing the bucket is correct: a single attacker shouldn't be able to mint 60 real + 60 sandbox rooms by hitting two endpoints.
- *MAX_WORKSHOPS:* the same `workshops.size >= CONFIG.MAX_WORKSHOPS` (500) guard (server.js:576) is copied into `/api/sandbox`. Sandboxes count toward the cap (they're real Map entries) — correct, and the short TTL (next point) keeps them from accumulating.
- *TTL sweep — sandboxes get a SHORTER, prioritized TTL.* Add `SANDBOX_TTL_MS` to CONFIG and one clause to the sweep (server.js:1072–1081):

```js
// CONFIG (server.js:55, alongside CLOSED_TTL_MS / IDLE_TTL_MS):
SANDBOX_TTL_MS: 4 * 60 * 60 * 1000,    // a dry-run is throwaway — gone after 4h idle (well past a 10-min rehearsal)

// in the sweep (server.js:1075–1077), the delete condition becomes:
const ttl = w.sandbox ? CONFIG.SANDBOX_TTL_MS
          : (w.state === 'closed' ? CONFIG.CLOSED_TTL_MS : CONFIG.IDLE_TTL_MS);
const limit = w.sandbox ? CONFIG.SANDBOX_TTL_MS : (w.state === 'closed' ? CONFIG.CLOSED_TTL_MS : CONFIG.IDLE_TTL_MS);
if (idle > ttl) { workshops.delete(code); coachBuckets.delete(code); n++; }
```

(Cleaner single form: `const ttl = w.sandbox ? CONFIG.SANDBOX_TTL_MS : w.state==='closed' ? CONFIG.CLOSED_TTL_MS : CONFIG.IDLE_TTL_MS; if (idle > ttl) {…}` — replaces the current two-branch `if` at server.js:1076.) 4h idle is 24× a 10-minute rehearsal yet 6× shorter than the 24h closed-room TTL, so sandboxes don't litter `workshops.json`. `lastActivity` is touched on every broadcast (server.js:561), so an *active* rehearsal never sweeps mid-session.

**Hook 2 — A2 per-role projection (Farrier plays all roles).** Already answered in A.0: the Farrier socket gets `viewKey==='farrier'` → FULL state (server.js:552–554), which is exactly what `viewConsole`/`drillDown`/`viewRoom`/the Share double-reveal consume (server.js read: all farrier-routed at index.html:1079–1081). **No per-member view is needed**, because the seeded "members" are static records inside the FULL team objects, not live sockets. So the single Farrier socket renders a fully-populated room with zero projection gaps. The `sandbox` flag rides in `baseState` (A.2.1), reaching the Farrier view like every other base field. **No A2 change required beyond the +1 base field.**

**Hook 3 — scale caps.** R3 adds ~1 long-lived workshop per rehearsal and zero extra sockets (one Farrier socket). It does not approach any WS/broadcast/mint cap. Nothing to change for R3 here (R10's scale work is Part B).

**Hook 4 — `present:set` / present-view contract.** The sandbox *uses* the gallery (Part B) to let the Farrier rehearse a featured reveal, but adds no new behavior to `present:set`. Reusing the production path is the point. No contract change from R3.

---

## PART B — R10: scale validation (6 teams × ~5 actors) + Share gallery

### B.0 What predictably buckles at 6×5 — and the fix for each

A 6-team room is ~30 members + the Farrier ≈ **31 sockets**. The hardening already did most of the heavy lifting; R10 is (a) *proving* it and (b) fixing the share-clock collision. Walking each pressure point against the shipped code:

| Pressure point | Shipped mitigation | Verdict @ 6×5 | R10 action |
|---|---|---|---|
| **Full-state broadcast volume** | A2 per-role projection (server.js:535–551): pre-share each member gets OWN + STUBs; chat capped to 30 (server.js:516). | Pre-share, a member's wire carries 1 full team + 5 stubs — *smaller* than today's all-teams blob. | **Confirmed headroom** — measure in qa-scale, no change. |
| **Per-view serialization cost (hardening R23)** | `buildViews` serializes T+2 strings per broadcast (server.js:535–551); at share/closed it's **1** string reused for all. | 6 teams → 8 `JSON.stringify`s per broadcast pre-share. R23 measured render ~1.9ms; 8× a clamped ≤200KB state is low-ms. | **Confirm in qa-scale**; if hot, memoize views per dirty-tick (B.4, 1 flag) — designed, gated behind evidence. |
| **WS message bucket (A12)** | `WS_BUCKET` capacity 120, refill 25/s **per socket** (server.js:39). | Per-socket, so 31 sockets each get their own budget — no aggregate cap. A 30-person room committing canvases ≈ ≤1 msg/s each. | **Confirmed** — per-socket design means team count is irrelevant to the bucket. |
| **Broadcast backpressure (A12)** | Skip a socket when `bufferedAmount > 1_000_000` (server.js:565); it resyncs on its next message. | 31 sends per broadcast; each ≤200KB. A laptop server handles this trivially; a slow phone self-heals. | **Confirm** no socket is starved; no change. |
| **Console dashboard legibility** | `teamtable` (index.html:2919–2938) renders one row/team; `needsYou` triage (index.html:2868) surfaces who needs attention. | 6 rows fit; **but the stat row + table + needs-you stack vertically and the present picker becomes 6 buttons** — usable but dense. | **B.3** light density pass (no methodology change): triage stays the entry point; the dashboard is "scan, don't read." |
| **Room-view roster overflow** | `viewRoom` lobby roster maps every team, slicing members to 8 avatars (index.html:3093). | 6 team cards with up to 8 steeds each — fits a projector but tightens. | **B.3** roster is `flex-wrap` already; cap avatar count + add a "+N" pill; no logic change. |
| **Share arithmetic (the real collision)** | `present:set` features ONE pair on the room view (server.js:1033); every team's fate is on its own device (`viewShare`, index.html:2478). | **6 double-reveals × ~90s = 9 min of stage time alone**, before discussion — blows the 10-min Share. | **B.1 — the gallery mode** (below). This is the core R10 build. |

**The key realization:** the on-device guarantee *already holds* at any N. `viewShare` (index.html:2478) renders **the viewer's own team's** before/after + reckoning regardless of `presentingPairId` — the `presentingPairId` block (index.html:2482) only adds a "now presenting on the wall" banner. So **"every team sees its own fate on-device" is already locked and N-independent** (rule preserved by construction). R10's gallery is purely a *room-view / Farrier-pacing* feature: which one or two pairs get the live stage time, while the other four teams still get their full fate on their laptops + in the export/recap.

---

### B.1 The Share gallery — "featured pair + gallery", reusing `present:set`

**Design:** `present:set` is unchanged on the wire (still sets `w.presentingPairId`). The gallery is a **room-view rendering mode** + a **Farrier control upgrade**, so the existing e2e present checks (e2e-playwright.js:330–334 — clicks `present-pick`, asserts `.roomview .ba-card` count === 2) keep passing untouched.

Two coordinated pieces:

**(1) Room view gains a gallery wall when no pair is featured (server.js view already carries all teams at share).** Today `viewRoom` at share with `presentingPairId===null` falls through to the lobby code path (the code throne, index.html:3089). Instead, at `state==='share'` with no featured pair, render a **contact-sheet gallery**: every pair as a small before→after thumbnail with team names, so the *whole room's* output is on the wall at once (the "everyone's fate is visible" beat), and the Farrier *features* one to zoom it.

```js
// in viewRoom(), replacing the share-with-no-pair fall-through.
// Insert BEFORE the lobby/code block (index.html:3089), after the `presenting` block (3088):
if(state.state==='share' && !state.presentingPairId){
  rv.classList.add('gallery');
  rv.append(el('div',{class:'galleryhead'}, el('span',{}, 'The whole room — before → after')));
  const grid=el('div',{class:'gallery-grid'});
  (state.teams||[]).filter(t=>t.receivedFromTeamId).forEach(t=>{
    const orig=state.teams.find(x=>x.id===t.receivedFromTeamId);
    const cell=el('div',{class:'gcell'});
    cell.append(el('div',{class:'gnames'}, (orig?orig.name:'?')+' → '+t.name));
    const pair=el('div',{class:'gpair'});
    const bm=el('div',{class:'g-mini'}); const am=el('div',{class:'g-mini bright'});
    pair.append(bm, el('span',{class:'garrow', html: glyph('g-flag')}), am); cell.append(pair); grid.append(cell);
    if(orig) setTimeout(()=>renderMini(bm, orig.canvas, 'surface', 1.4),0);
    if(t.redesign) setTimeout(()=>renderMini(am, t.redesign.canvas, 'rebuild', 1.4),0);
  });
  rv.append(grid);
  rv.append(el('div',{class:'codecorner', title:'join code'}, state.code));
  return rv;
}
```

When the Farrier *does* feature a pair (`present:set` with a teamId), the existing `presenting` branch (index.html:3073–3088) zooms that pair full-bleed — **unchanged**, so the e2e `.ba-card` count===2 assertion holds. The gallery is the *between-features* state, not a replacement for the featured view.

**(2) Farrier present picker upgrade — "feature these N, then play through."** The console present picker (index.html:2982–2986) already lists every pair and tracks `ui.presented`. R10 adds, with **zero new server message**:
- A **"Gallery (show all on the wall)"** button → `present:set teamId:null` (already supported, server.js:1035) → the room view renders the contact sheet above.
- The existing **"Next pair ›"** (index.html:2978) already walks unpresented pairs — at 6 teams the Farrier features the 1–2 most instructive pairs live, clicks "Gallery" to put the rest on the wall as thumbnails, and moves on. The RUNSCRIPT share cue (index.html:2852) is amended to say so (copy-only): *"Feature one or two reveals live; drop the rest to the gallery wall — every team already has its own fate on their screen."*

**(3) On-device fate is already guaranteed — assert it, don't rebuild it.** `viewShare` (index.html:2478) is the viewer's own before/after + reckoning. No change needed. qa-scale (B.2) asserts each of the 6 member contexts renders its own `.ba-mini` pair and its own reckoning stage — *that* is the locked rule, verified at N=6.

**(4) The recap/export already covers every team.** `exportPack` (index.html:2683) and the per-team race card (`viewClosed`, index.html:1584) are per-team and N-independent. So "every team sees its own fate in the recap" holds without change.

**Methodology check (rule preserved):** "every team sees its own workflow's fate" — preserved three ways at N=6: (a) on the viewer's own device via `viewShare` (always, any N); (b) on the wall via the gallery contact sheet (all pairs at once, even un-featured); (c) in the per-team export + race card. The featured-pair live stage time is a *pacing* device layered on top, not a gate on who sees their fate. **No leak, no rule break.**

---

### B.2 `qa-scale.js` — the 6-team / ~30-actor validation harness

New file, **WS-level** (raw `ws` + `fetch`, the `e2e.js` idiom — fast, deterministic, no browser; the browser legibility checks are a small Playwright addendum in B.3). Run:

```bash
PORT=3400 node server.js   &&   BASE=http://localhost:3400 node qa-scale.js
```

Structure (mirrors e2e.js's `ok()`/`mk()`/`last[]` harness, server.js read of e2e.js:7–14):

```js
const TEAMS = 6, PER = 5;     // 6 teams × 5 members = 30 member sockets + 1 farrier
```

**Phase 0 — build the room (scale the join fan-out):**
- Mint 1 workshop. Join farrier.
- For each of 6 teams: socket #1 `team:create`, sockets #2–5 `team:join` with the returned `teamId`. 30 member sockets total. Assert all 6 teams formed, presence counts correct (`fac_state.teams.length===6`, each `members.length===5`).
- **Scale assertion A (mint headroom):** confirm minting these did not 429 (1 mint « bucket 60).

**Phase 1 — Surface at scale:**
- Farrier → `phase:set surface`.
- Each team's socket #1 sends a gate-green canvas (reuse the seed canvases from A.1.2 with uniqued ids per team, or e2e's `apCanvas` cloned 6×). To stress the broadcast, **interleave**: round-robin a `canvas:update` from every team with `wait(60)` between — ~6 commits/350ms, sustained for ~30 rounds.
- **Scale assertion B (broadcast integrity):** after the storm, `fac_state` shows all 6 teams gate-green; a *member* socket's latest state shows OWN team full + 5 stubs (assert `!('canvas' in otherTeam)` — the A2 projection holds at N=6).
- **Scale assertion C (no starvation):** a `ping` from team-6's socket #5 round-trips < 200ms *during* the storm (the A12 per-socket bucket + backpressure proof at scale).
- **Scale assertion D (bucket fairness):** fire 200 `canvas:update`s in a tight loop from ONE socket; assert ≥1 `error:'Slow down…'` AND every *other* team's socket still gets fresh broadcasts (one greedy socket can't starve the room — per-socket bucket, server.js:755).

**Phase 2 — swap at 6 teams:**
- Farrier → `phase:set rebuild`. `performSwap` rotates 6 teams in a ring (server.js:430). Assert each team `receivedFromTeamId === teams[(i+1)%6].id` and **no team received its own** (the rotation invariant at N=6, not just 2). Assert each team's `redesign.canvas` has the seeded locked blocks.

**Phase 3 — rebuild at scale:** each team lands its people + adds one agent block + one assumption (round-robin, paced). Assert no crash, all 6 `redesign`s mutate independently (no cross-team bleed).

**Phase 4 — share + GALLERY (the R10 payoff):**
- Farrier → `phase:set share`. At share the projection opens (server.js:538) → every socket gets FULL state.
- **Scale assertion E (on-device fate, the locked rule):** for **each** of the 6 teams, pick one member socket and assert its FULL state lets it compute its own pair: `state.teams.find(x=>x.receivedFromTeamId===myTeamId)` (the rebuilder of my workflow) is present with a full `redesign.canvas`, AND my own team's `redesign` (my fate as a rebuilder) is present. → all 6 teams can render their own double-reveal on-device. **This is the rule #R10 lock, verified at N=6.**
- **Gallery pacing:** Farrier fires `present:set teamId:T1` (feature pair 1), then `present:set teamId:null` (gallery wall), then `present:set teamId:T2`. Assert each broadcast updates `presentingPairId` and the contract is intact (`present:set` unchanged). (The room-view *rendering* of the gallery is a Playwright check, B.3 — WS-level only asserts state.)
- **Scale assertion F (serialization budget):** wrap the share-phase broadcast in a timing probe via a benign farrier write loop (e.g. 20× `present:set` toggling) and assert the server stays responsive (`ping` < 200ms throughout) — the R23 per-view cost proof at 6 teams.

**Phase 5 — close + recap:** `phase:set closed`; assert each team still has its `redesign` + race-card data (per-team recap, N-independent).

**Cleanup:** the sweep TTLs are days/hours; the harness mints 1 workshop — no pollution.

---

### B.3 Console legibility + room-view density (light, no methodology change)

These are *display* fixes surfaced by R10; they touch only `viewConsole`/`viewRoom` rendering, no server, no rule.

1. **Console table at 6 rows** — already fits (one row/team, index.html:2921). The triage queue (`needsYou`, index.html:2868) is the real scale answer: it tells the Farrier *who to look at* so they never have to scan 6 rows under time pressure. No change beyond confirming it renders. *(If the lead wants: cap the table to teams not already in "Needs you" + a collapsed "all 6" — deferred; the triage already solves the legibility problem.)*
2. **Present picker at 6 pairs** — add the "Gallery (show all)" button (B.1) and keep the existing "Next pair ›" walker. The picker wraps (`flex-wrap:wrap`, index.html:2982) — 6 buttons fit.
3. **Room-view roster** — `viewRoom` lobby roster slices members to 8 avatars already (index.html:3093); add a `+N` pill when `members.length>8` and confirm the 6-card `flex` wraps. Cosmetic.

**Playwright addendum (3–4 checks appended to `e2e-playwright.js` OR a tiny `qa-scale-ui.js`):** spin a 6-team room (driven WS-level for speed, then open one Farrier browser), assert: the console table shows 6 rows; the present picker shows 6 pairs + a Gallery button; clicking Gallery renders `.roomview.gallery .gcell` count === 6; featuring a pair still renders `.roomview .ba-card` count === 2 (the existing assertion, now proven coexisting with the gallery). This keeps the **existing e2e present check semantics** (hardening-hook 4) while proving the gallery.

---

### B.4 Optional: view memoization (gated behind qa-scale evidence)

If qa-scale assertion F shows the 8-string serialization is ever hot (it won't, per R23's 1.9ms render measurement, but designed for completeness): add a `w._viewsDirty` flag set by every mutator and cleared in `buildViews`, caching the built strings between broadcasts on `w._viewsCache`. ~6 lines. **Do not build speculatively** — only if the harness measures a regression. Listed so the lead sees the escape hatch.

### B.5 Hardening-hook answers for R10 (the 4, by name)

**Hook 3 — scale must not weaken any cap (the central R10 hook).**
- *WS bucket (A12):* per-socket, capacity 120 — **team count is irrelevant**; 31 sockets each carry their own budget. No change; ≥5× honest peak holds per-socket. **Confirmed headroom.**
- *Broadcast backpressure (A12):* `WS_MAX_BUFFERED` 1MB per-socket skip (server.js:565) — at 31 sends × ≤200KB, no socket buffers near 1MB on a LAN; a slow phone self-heals. **Confirmed.**
- *MAX_WORKSHOPS (A6):* 500 — a 6-team room is **one** workshop. Untouched. **Confirmed.**
- *Mint bucket (A6):* one mint for the whole 6-team room. Untouched. **Confirmed.**
- **No CONFIG change is required for R10.** The hardening's per-socket design already absorbs the team-count axis; R10's job is to *prove* it (qa-scale B.2 assertions C/D/F) rather than to raise a limit. If, and only if, qa-scale empirically finds a socket starved, the precise change would be `WS_MAX_BUFFERED → 2_000_000` (still self-healing) — flagged, not pre-applied.

**Hook 4 — `present:set` keeps present-view + room-view + e2e present checks working.** The gallery adds a *new render branch* for `share && !presentingPairId` and leaves the `presenting` (featured) branch byte-identical (index.html:3073–3088). `present:set` is unchanged on the wire (server.js:1033–1037). e2e-playwright.js:330–334 features a pair and asserts `.ba-card`===2 → still passes (featured branch untouched). **Confirmed compatible.**

**Hook 1 (A6) / Hook 2 (A2)** — not exercised by R10 (no mint, no new projection); R10 *relies on* A2's per-role projection holding at N=6, which qa-scale assertion B verifies.

---

## SUITE SAFETY (both features)

| Existing suite | Why it still passes |
|---|---|
| `e2e.js` (34) | R3: `createWorkshop({sandbox})` defaults byte-identical (no opts → no flag); `baseState` +`sandbox:false` field is additive (e2e reads `state.teams`/`state.state`/`timer` only). R10: no server message changes. `present:set` untouched. |
| `e2e-playwright.js` (64) | R3: sandbox is a new landing button (`sandbox-btn`); existing host/join testids untouched. R10: `present-pick` + `.ba-card`===2 (line 330–334) untouched — gallery is a *different* render branch (no featured pair). New `sandbox`/gallery checks are *added*, not edited. |
| `qa-hostile.js` (69) | R3: the member-join refusal (Guard 2) is a *new rejection* on a sandbox code; honest hostile tests use *real* workshops (qa-hostile mints via `/api/workshop`, never `/api/sandbox`) → never see a sandbox → unaffected. The `sandbox` base field is additive. R10: no cap changed → every hostile cap assertion (H15–H17, mint 429, MAX_WORKSHOPS 503 at qa-hostile.js:463) holds with identical numbers. |
| `qa-walkthrough.js` | Drives the real host/journey via testids; sandbox button is additive; room-view share path adds the gallery branch but `present-pick` (line 229) still features a pair. |
| `qa-fixcheck.js` | No touched surface. |

**New suite-edit ledger:** *none required to existing suites.* New files only: `qa-scale.js` (B.2), optionally `qa-sandbox.js` (a 12-check WS-level sandbox suite: mint sandbox → assert member `join` refused, `team:create`/`team:join` refused, `GET /api/workshop` 404, Farrier `join` with hostKey succeeds + sees 2 seeded gate-green teams, `phase:set rebuild` swaps the seeded teams, sandbox TTL is `SANDBOX_TTL_MS`, sandbox counts toward MAX_WORKSHOPS). These can also fold into `qa-hostile.js`'s §16.2-style leak sweep as a "sandbox isolation" section.

**Sandbox suite (`qa-sandbox.js`) check list:**
1. `POST /api/sandbox` → 200, returns `{code,hostKey,sandbox:true}`.
2. `GET /api/workshop/<sandboxCode>` → 404 (Guard 3).
3. member `join` → `error` (Guard 2), `joined` not seated.
4. `team:create` on a sandbox → no team added (Guard 2 silent).
5. `team:join` on a sandbox → no member added.
6. Farrier `join` with the sandbox hostKey → `joined role:farrier`, `state.teams.length===2`, both `gateGreen`.
7. both seeded teams have a pre-computed `teardown` (`hasTeardown` true).
8. Farrier `phase:set surface` then `rebuild` → `performSwap` ran; `sb-fs.receivedFromTeamId==='sb-ob'` and vice-versa; locked blocks seeded.
9. Farrier `phase:set share` → projection opens; the gallery state (`presentingPairId:null`) is valid.
10. `present:set teamId:'sb-fs'` then `null` → `presentingPairId` toggles (gallery pacing).
11. mint bucket: 80× `/api/sandbox` rapid → ~60 ok then 429 (shares the mint bucket).
12. (kill/restore) a sandbox persists to disk + reloads (it's a real workshop) — and is swept after `SANDBOX_TTL_MS` (simulate by back-dating `lastActivity`).

---

## RISK REGISTER

| # | Risk | Likelihood | Blast | Mitigation |
|---|---|---|---|---|
| B-R1 | **Sandbox leak (rule #2)** — a participant reaches a sandbox and learns the swap exists pre-reveal | **Low** — 4 independent guards (A.3); Guard 2 is server-enforced against hostile clients | Methodology-breaking if it happened | Guards 2–4 ship together; `qa-sandbox.js` checks 2–5 are the detector; error copy reveals nothing |
| B-R2 | **Farrier mis-projects the sandbox** mid-rebuild to future participants (the honest residual) | Low–medium (human) | Worked example spoils the swap for that room | Out of product control (same as a slide deck); RUNSCRIPT/console copy: "use the Surface capture as the worked example; don't project later phases"; documented honestly in A.3 |
| B-R3 | Seeded canvas is **not actually gate-green** (a missing `why`/capacity) → swap forced, teardown thin | Low — A.1.2 hand-verified against `governance()` server.js:329–339 | Sandbox rehearses a degraded teardown | `qa-sandbox.js` check 6–7 asserts `gateGreen` + `hasTeardown`; if it fails the seed is wrong, caught pre-merge |
| B-R4 | Sandbox seed ids (`fs-*`/`ob-*`) **collide** with a future suite fixture | Very low — distinct prefixes, distinct domain (not AP-invoice) | Test cross-talk | Namespaced `sb-`/`fs-`/`ob-` ids; domain chosen to avoid the suites' AP/PO vocabulary |
| B-R5 | `SANDBOX_TTL_MS` sweeps an **active long teaching session** kept idle | Very low — 4h idle, `lastActivity` touches on every broadcast (server.js:561) | Sandbox vanishes mid-teach | 4h » any rehearsal; CONFIG knob; any click/broadcast resets idle |
| B-R6 | Sandbox **counts toward MAX_WORKSHOPS** and a flood of sandboxes fills the cap | Low — mint bucket gates it (shared, 60 burst) + 4h TTL reaps fast | Server "at capacity" 503 | Shared mint bucket + short TTL; sandboxes reaped 6× faster than closed rooms |
| B-R7 | **Gallery render cost** at 6 pairs (12 `renderMini` calls) janks the projector | Low — minis are static SVG, scale 1.4 | Projector stutter on share entry | `setTimeout(…,0)` staggers as today (index.html:3079); minis are tiny; cap thumbnails if >8 pairs (future) |
| B-R8 | **e2e present check breaks** if the gallery branch accidentally captures the featured case | Low — branch guard is `!state.presentingPairId` | e2e-playwright 330–334 fails | The featured branch (index.html:3073) is matched *first* and untouched; gallery is the `else` for `!presentingPairId`; Playwright addendum (B.3) asserts both coexist |
| B-R9 | **qa-scale flakes** on timing (30 sockets, paced storms) | Medium — many sockets | CI red | Use `waitFor(predicate)` not fixed sleeps (e2e idiom); generous `wait(60)` pacing « bucket refill; ping-based liveness not wall-clock |
| B-R10 | **`baseState` +`sandbox` field** missed by a consumer that does strict-shape comparison | Very low — additive boolean | Cosmetic | qa-hostile's authz-matrix snapshots `JSON.stringify(state)` minus jitter — a *new constant field* is stable across before/after, so it doesn't break the "unchanged" assertions |
| B-R11 | View **memoization** (B.4) if ever built introduces a stale-view bug | — (not built unless measured) | Stale broadcast | Gated behind qa-scale evidence; dirty-flag set by every mutator; ship only with a regression to justify it |
| B-R12 | Scale work **uncovers a real starvation** at 31 sockets despite the analysis | Low | One socket lags | qa-scale assertions C/D/F are the detector; documented escape hatch = `WS_MAX_BUFFERED→2MB` (still self-healing), applied only on evidence |
| B-R13 | Sandbox `seedMember` records carry `token` + persist to `workshops.json` | Certain (they're real records) | Cosmetic disk noise; same trust domain as hostKey | Same as real members (A9); swept in 4h |

---

## BUILD ORDER (suggested — two independent PRs, suites green between)

**PR-1 (R3 sandbox):** 1. `createWorkshop({sandbox})` + `seedSandbox`/canvases (inert until routed) → 2. `/api/sandbox` route (reuses mint+cap guards) → 3. `baseState.sandbox` field → 4. the 4 leak guards (A.3) → 5. `SANDBOX_TTL_MS` + sweep clause → 6. landing `sandbox-btn` + `goHome` reset + `render()` Guard 4 → 7. `qa-sandbox.js`. Run e2e + qa-hostile after step 4 (the guards are the risk).

**PR-2 (R10 scale + gallery):** 1. `qa-scale.js` (proves the *current* server holds at 6×5 — run it FIRST, against unchanged code, to get the baseline) → 2. `viewRoom` gallery branch + console "Gallery" button → 3. RUNSCRIPT/copy amendment → 4. room-view density `+N` pill → 5. Playwright addendum (gallery + featured coexist). Only build B.4 memoization if step 1 measures a regression.
