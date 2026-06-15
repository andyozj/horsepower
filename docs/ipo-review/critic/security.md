# Adversarial Security Review — New Surface (R1/R2/R3/R4/R7) + Hardening Regression

**Reviewer:** adversarial security critic (isolated self-hosted server, PORT 3402–3406, `DATA_DIR=/tmp/hp-crit-sec`).
**Method:** raw `ws` + `fetch` harnesses (`/tmp/hp-crit-sec/attack*.js`, `enum.js`, `crash.js`) cribbed from `qa-hostile.js`. No app file edited.
**Scope:** the 4 new WS types (`farrier:whisper`, `commitment:submit`, `pulse:submit`) + `meta.system`/`canvas.baseline` + the 2 new HTTP paths (`/api/sandbox`, recap via `/api/coach`) + re-verification of the shipped A1–A16 hardening.

---

## VERDICT: SIGN-OFF — **NO**

**2 CRITICAL** (one **unauthenticated**), part of a single systemic crash class that `qa-hostile.js` does not cover and that the new batch handlers *widened*. Everything else in the new surface is verified solid.

---

## Findings table

| # | Sev | Finding | Auth required | Status |
|---|-----|---------|---------------|--------|
| S1 | **CRITICAL** | Uncaught-exception full-process crash via object-with-non-callable-`toString`/`valueOf` in any `String()`/`str()` sink. Kills **every workshop on the server**. The `ws.on('message')` switch (server.js:962–1306) has **no try/catch** around the handler body — only `JSON.parse` is guarded. | **NONE** (top-level) + member + farrier — see S1a–S1e | CONFIRMED |
| S1a | **CRITICAL** | **Unauthenticated.** `{"type":"ping","workshopCode":{"toString":"NOTAFUNC"}}` from a never-joined socket → `String(msg.workshopCode).toUpperCase()` (server.js:970) throws → process dies. | NONE | CONFIRMED (server DEAD) |
| S1b | **CRITICAL** | **New (R7).** `farrier:whisper` with `text:{toString:'x',a:1}` → `String(msg.text||'')` (server.js:1285) throws → process dies. | farrier | CONFIRMED (server DEAD) |
| S1c | **CRITICAL** | **New (R1).** `commitment:submit` with `text:{valueOf:'x',toString:'y'}` in `share` → `String(msg.text||'')` (server.js:1160) throws → process dies. | member | CONFIRMED (server DEAD) |
| S1d | **CRITICAL** | Member `chat:post` with `content:{valueOf:'x',toString:'y'}` → `String(msg.content||'')` (server.js:1102) throws → process dies. (Pre-existing sink, member-reachable.) | member | CONFIRMED (server DEAD) |
| S1e | **CRITICAL** | Member `canvas:update` with a block `text:{valueOf:'x',toString:'y'}` → the hardening helper `str()` itself (server.js:136, `String(v)`) throws inside `sanitizeCanvas` → process dies. The crash reaches the **core sanitize path**. | member | CONFIRMED (server DEAD) |

> S1b–S1e are the *same root cause* as S1a but are **new or member-reachable** sinks; R1 (`commitment`/`pulse`) and R7 (`whisper`) each added a fresh instance. `pulse:submit` (`String(msg.aha)` etc., server.js:1172–1173) and `assumption:add`/`lock:challenge`/`redesign` (server.js:1151/1199) are the same pattern (assumption/lock-challenge only reachable once a `redesign` exists, i.e. post-swap — still member-reachable then).

### Root cause & suggested remediation (not applied — review-only)
1. **Wrap the switch body in `try { … } catch (e) { log('ws_handler_error', …); }`** inside `ws.on('message')` — this single change makes the entire class non-fatal (matches the existing `ws.on('error')` swallow at server.js:960 that already protects against the A1 maxPayload 1009).
2. Make the coercion helpers object-safe at the source: `str(v)` and the top-level `workshopCode` read should guard with a `try`/typeof-or-`Object.prototype.toString`-based stringify, never a bare `String(obj)` on attacker JSON. JSON can carry `{"toString":"…"}` / `{"valueOf":"…"}` whose values are strings (non-callable), which is exactly what defeats `String()`.

**Guarantee broken:** A1/A12 hardening promise — *"a hostile/broken client can't starve the loop"* and CLAUDE.md rule #8 *"the workshop never stalls / a gate must never block a room."* One 40-byte frame from an anonymous LAN client takes down all rooms; persisted state survives but every live socket drops and the operator must manually restart.

---

## What's verified SOLID (passed every attack)

**R7 `farrier:whisper`** — authz + lint + scoping all hold:
- Member send → rejected (no farrier note in target chat). Pre-join socket → rejected.
- Server-side `BANNED_VOCAB` lint blocks `swap`/`redesign`/`rebuilt`/`handoff`/`stranger`/`transfer` → `error`, no broadcast (never trusts the client lint).
- Length clamp 240 holds (`'A'.repeat(99999)` → ≤240). Whisper to non-existent team → no-op, no crash.
- **Cross-team isolation:** a whisper to team A is invisible to a member of team B (B receives only A's *stub* — no canvas/chat). No pre-reveal leak.
- **`chat:post role:'farrier'` is un-forgeable** — a member's `role:'farrier'` coerces to `'user'`; only the authz-gated `farrier:whisper` case mints a `farrier` note.
- *Note (LOW/by-design):* the lint is word-boundary based, so deliberate evasions like `re-design` / `s w a p` pass — acceptable for a private Farrier console (never projected), but worth a glance.

**R1 `commitment:submit` / R2 `pulse:submit`** — model-correct:
- **Member-only + own-record:** server uses `ws.memberId`/`ws.teamId`, never `msg.memberId`/`msg.teamId`. `memberId`-spoof writes the *attacker's own* record, not the victim's. Cross-team write blocked. Farrier/pre-join submits ignored.
- **Phase-gated:** `share`/`closed` only → `null` in lobby/surface/rebuild (no pre-reveal leak).
- **Pulse slider clamp:** `'abc'`→null, `Infinity`→null, `1e9`→10, `7.7`→8 (int 0–10), object/array → null/coerced-then-clamped. **Allowlist-by-construction** — `evil`/`role`/`ts` extra keys never land (fresh literal). Text clamped to 400.
- Commitment text clamped to 400; only `{text,ts}` stored.

**R4 `meta.system` + `canvas.baseline`** — clamps + allowlist hold:
- `meta.system` clamped to 80; `baseline.{frequency,cycleTime}` clamped to 80; smuggled `evil`/`secret` keys dropped (fresh `{frequency,cycleTime}` literal). Non-object/string baseline ignored (default `{'',''}`). No proto-pollution via `__proto__` in baseline/meta/canvas (sanitize allowlist + `BLOCK_TYPES` filter neutralize it).
- **`knownIds` merge preserves non-known blocks** (baseline merge can't wipe other canvas data).
- **Locked-field forgery blocked:** in rebuild, `redesign:update` with a tampered locked block (`locked:false`, `lockField:null`, mutated `text`, forged `meta.system`) → server **re-asserts** the lock (`locked:true`, original text `decide pay` preserved, forged `meta.system` stripped). 4 locked seeds (intent/outcome/trigger/persona) all protected.

**R3 sandbox** — 4 leak guards all hold:
- `/api/sandbox` returns `sandbox:true`. **GET `/api/workshop/:code` → 404** for a sandbox (invisible to the join path).
- **Member join refused** (`"That code isn't an open room."`) with **no state ever sent** to the refused socket. `team:create`/`team:join` silently no-op. Server stays alive.
- Farrier *can* drive it (hostKey join, `sandbox:true` in state). Sandbox shares the **mint IP bucket** with `/api/workshop` (cannot be used as a separate exhaustion lane).

**Projection / leak sweep (§16.2-style, manual re-run)** — the widened `teamPublic` member-map does **not** leak:
- Pre-share, a member's view of *other* teams is the STUB `{id,name,members,gateGreen,hasTeardown}` — members carry `commitment:null`/`pulse:null` (gated null by the share-only write path), never canvas/teardown/redesign/governance/receivedFrom*. Holds in surface **and** rebuild. Unseated lurker sees only stubs (no canvas, no pulse).

**Rate-limiting / DoS surfaces that DO hold:**
- Per-socket bucket: 300 rapid `farrier:whisper` → `"Slow down — too many updates."` emitted; target chat capped (30 wire / 200 store). No starvation.
- Mint bucket: 80 sandbox mints → 23 rejected (429), and the *real* `/api/workshop` mint is 429 after the shared bucket drains. `MAX_WORKSHOPS` cap intact.

**R1 recap** — no new unauthenticated endpoint: `/api/recap` → 404. Recap rides `/api/coach` **past** the per-room coach bucket + timeout; no-key/no-room path returns rule-based degraded prose (free, deterministic). Bucketed exactly like every other coach call.

---

## Attack coverage delta vs `qa-hostile.js`
`qa-hostile.js` (70 checks) covers oversize payloads, numeric/geometry clamps, stub-shape leak, authz matrix, reconnect storm, kill-restore. It **does not** send a `{"toString":<string>}` / `{"valueOf":<string>}` object into any string field — the exact payload that defeats `String()`/`str()`. That is the gap S1 exploits. Recommend adding a "coercion-trap" row per String-sink (workshopCode, chat content, whisper text, commitment/pulse text, canvas block text) to `qa-hostile.js`, plus the handler-level try/catch guard.

---

## SIGN-OFF: **NO** — 2 CRITICAL open (S1a unauthenticated, S1c new-in-R1). Re-test after the `ws.on('message')` try/catch + object-safe `str()` land; the rest of the new surface is sign-off-ready.
