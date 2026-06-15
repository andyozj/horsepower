# Public-Internet Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the security/abuse gaps that make Horsepower unsafe on the public internet, with small surgical edits only — no whole-file rewrites, no DB, no scaling work (confirmed target: workshop scale ≤ a few hundred concurrent).

**Architecture:** Seven independent, mostly server-only changes to `server.js`, each env-gated to be a no-op by default (so LAN/dev/CI behaviour is byte-identical until you flip the env on the public host). One client edit (join-code field length). All changes sit OFF the hot path — zero effect on edit→propagation latency. A new self-spawning test suite `qa-online.js` proves each fix and guards against regression.

**Tech Stack:** Node 18+, Express 4, `ws` 8, vanilla-JS single-file client. No new dependencies (project invariant: no framework, no build step).

**Scale decision (locked):** Single instance. No DB migration, no Redis, no room-routing. Durability is handled operationally (mount a volume + `DATA_DIR=/data`) and is out of scope for this plan.

---

## Pre-flight notes for the implementer

- **This repo is NOT under git** (`git rev-parse` will fail). The per-task "Checkpoint" is **running the test suite**, not a commit. If you want version control, run `git init` once before Task 1 and add a `.gitignore` containing `node_modules/`, `data/`, `uat-shots/`, `qa-shots/`, `qa-*-shots/`, `/tmp` artifacts — then the optional `git add/commit` lines at each task end become real. Do NOT commit `data/workshops.json`.
- **Default-off principle:** every new env var defaults to today's behaviour. `ALLOWED_ORIGINS` empty ⇒ all origins allowed. `TRUSTED_PROXY_HOPS=0` ⇒ use the socket address. The coach/mint global caps are set high enough that no honest run trips them. This is what keeps the 9 existing suites green without edits.
- **Existing suites that MUST stay green** (run each against a fresh server — they share the per-IP mint bucket, so restart between them or use distinct ports): `e2e.js` (34), `qa-hostile.js` (76), `qa-batch1.js` (18), `qa-batch2.js` (20), `qa-sandbox.js` (12), `qa-scale.js` (12), `qa-a11y.js` (33), `qa-editguard.js` (30), `e2e-playwright.js` (64 UAT). The browser UAT is the one that can break from the client code-length edit (Task 2) — it is called out there.
- **Port convention for this plan:** `qa-online.js` self-spawns its own server on `PORT=3220` with a temp `DATA_DIR`, exactly like `qa-hostile.js` does its kill-and-restore. You never need a server already running to use `qa-online.js`.
- All `server.js` line numbers below are as of the audit (2026-06-15). If they drift, search for the quoted anchor strings.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `server.js` | All server-side hardening (config block, `reqIp`, mint/coach/diff routes, WS `verifyClient`, headers) | Modify (7 small edits) |
| `public/index.html` | Join-code input length + placeholder | Modify (2 tiny edits, Task 2) |
| `qa-online.js` | New self-spawning suite proving every fix | Create |
| `CLAUDE.md` | Document the new env vars + suite in the run/test section | Modify (Task 8) |
| `docs/DEPLOY.md` | Operator runbook: required env on a public host | Create (Task 8) |

---

## Task 1: Coach proxy — per-IP + global spend caps (the bill-burn fix)

**Why:** Today the only gate on spending the AI key is a **per-room** bucket (`server.js:891-892`). A stranger who knows/mints N live rooms gets N× the budget. There is no per-IP and no global ceiling, so a determined caller can run up a real Anthropic/Azure bill. Add a per-IP coach bucket and a global daily-ish bucket *before* the upstream call; on trip, degrade to the free bank reply (same shape as every other degradation — rule #8). Also make the Anthropic base URL overridable so the cap is testable without a live key.

**Files:**
- Modify: `server.js` — CONFIG block (`:30-56`), add buckets near `coachBuckets` (`:113`), the coach handler spend-gate (`:888-892`), `callAnthropic` URL (`:852`)
- Test: `qa-online.js` (create in this task)

- [ ] **Step 1: Write the failing test (scaffold qa-online.js + the coach-cap checks)**

Create `qa-online.js`:

```js
/* Horsepower — public-internet hardening suite (2026-06-15 plan).
 * Self-spawns its OWN server on PORT 3220 with a temp DATA_DIR and the
 * public-hosting env vars set, runs all checks, then tears down.
 *   node qa-online.js
 * No pre-running server required.
 */
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 3220;
const BASE = `http://localhost:${PORT}`;
const WSBASE = `ws://localhost:${PORT}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra != null ? '→ ' + JSON.stringify(extra) : ''); } }
const J = o => JSON.stringify(o);

// --- a tiny mock "Anthropic" upstream so we can test the coach cost-gate with NO real key ---
let upstreamCalls = 0;
function startMockUpstream() {
  return new Promise(res => {
    const srv = http.createServer((req, rq) => {
      upstreamCalls++;
      rq.writeHead(200, { 'content-type': 'application/json' });
      rq.end(JSON.stringify({ content: [{ type: 'text', text: 'mock coach reply' }] }));
    });
    srv.listen(0, () => res(srv));
  });
}

async function main() {
  const mock = await startMockUpstream();
  const mockUrl = `http://localhost:${mock.address().port}/v1/messages`;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-online-'));
  const srv = spawn('node', ['server.js'], {
    env: Object.assign({}, process.env, {
      PORT: String(PORT),
      DATA_DIR: dataDir,
      ANTHROPIC_API_KEY: 'test-dummy-key',          // forces AI_PROVIDER='anthropic'
      ANTHROPIC_BASE_URL: mockUrl,                   // (Task 1) point spend at the mock
      ALLOWED_ORIGINS: 'http://allowed.test',        // (Task 5)
      TRUSTED_PROXY_HOPS: '1',                       // (Task 3)
      COACH_GLOBAL_MAX: '3',                         // (Task 1) tiny global cap for the test
      COACH_IP_MAX: '2',                             // (Task 1) tiny per-IP cap for the test
      MINT_GLOBAL_MAX: '4'                           // (Task 4) tiny global mint cap for the test
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  srv.stdout.on('data', () => {});
  srv.stderr.on('data', d => process.env.DEBUG && console.error('[srv]', String(d)));
  // wait for health
  for (let i = 0; i < 50; i++) { try { const r = await fetch(BASE + '/api/health'); if (r.ok) break; } catch {} await wait(100); }

  try {
    await testCoachCaps();      // Task 1
    // await testCodeLength();  // Task 2 (added later)
    // await testProxyTrust();  // Task 3
    // await testGlobalMint();  // Task 4
    // await testWsOrigin();    // Task 5
    // await testDiffGate();    // Task 6
    // await testHeaders();     // Task 7
  } finally {
    srv.kill('SIGKILL');
    mock.close();
    try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch {}
  }
  console.log(`\nqa-online: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

// ---- Task 1: coach spend caps ----
async function testCoachCaps() {
  console.log('\n[coach spend caps]');
  // a live room is required to spend
  const { code } = await (await fetch(BASE + '/api/workshop', { method: 'POST' })).json();
  // seat a member over WS so the room is genuinely live
  const m = new WebSocket(WSBASE); await new Promise(r => m.on('open', r));
  m.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'T' }));
  await wait(150);

  const callCoach = () => fetch(BASE + '/api/coach', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: J({ mode: 'surface', code, messages: [{ role: 'user', content: 'go' }] })
  }).then(r => r.json());

  upstreamCalls = 0;
  const before = await callCoach();
  ok('coach call hits the live upstream (not degraded) under the cap', before.degraded !== true && upstreamCalls === 1, before);
  const second = await callCoach();
  ok('2nd call from same IP still allowed (per-IP cap=2)', upstreamCalls === 2, { upstreamCalls });
  const third = await callCoach();   // 3rd from same IP > COACH_IP_MAX=2 → degrade, NO upstream
  ok('per-IP cap blocks the 3rd call BEFORE spending (degraded, upstream unchanged)', third.degraded === true && upstreamCalls === 2, { third, upstreamCalls });

  m.close();
}

main();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node qa-online.js`
Expected: the coach-cap checks FAIL — current server has no per-IP/global coach cap and `ANTHROPIC_BASE_URL` is ignored, so calls go to the real api.anthropic.com (401 → degraded), `upstreamCalls` stays 0, assertions fail.

- [ ] **Step 3: Make `callAnthropic` URL overridable**

In `server.js`, add the env near the other AI config (after line 60, `const ANTHROPIC_MODEL = ...`):

```js
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1/messages';
```

Then change `callAnthropic` (line 852) from:

```js
  const r = await fetch('https://api.anthropic.com/v1/messages', {
```

to:

```js
  const r = await fetch(ANTHROPIC_BASE_URL, {
```

- [ ] **Step 4: Add the coach cap config + buckets**

In the `CONFIG` block, after the `COACH_BUCKET` line (`server.js:42`), add:

```js
  // public-internet coach spend caps (per-IP + global). Env-overridable; defaults are high
  // enough that no honest LAN room trips them. On trip → degrade to the free bank reply.
  COACH_IP_BUCKET: { capacity: Number(process.env.COACH_IP_MAX) || 40, refillPerSec: 40 / 3600 },        // ~40/hr/IP
  COACH_GLOBAL_BUCKET: { capacity: Number(process.env.COACH_GLOBAL_MAX) || 2000, refillPerSec: 2000 / 86400 }, // ~2000/day total
```

After `const coachBuckets = new Map();` (`server.js:113`), add:

```js
const coachIpBuckets = new Map();                 // per-IP coach spend bucket
const coachGlobalBucket = makeBucket(CONFIG.COACH_GLOBAL_BUCKET);  // one shared global ceiling
function coachSpendAllowed(ip, room) {
  // per-room (existing intent), per-IP, and global — all must have a token to spend the key.
  if (!coachBuckets.has(room.code)) coachBuckets.set(room.code, makeBucket(CONFIG.COACH_BUCKET));
  if (!coachIpBuckets.has(ip)) coachIpBuckets.set(ip, makeBucket(CONFIG.COACH_IP_BUCKET));
  return takeToken(coachBuckets.get(room.code)) && takeToken(coachIpBuckets.get(ip)) && takeToken(coachGlobalBucket);
}
```

- [ ] **Step 5: Wire the gate into the coach handler**

In `server.js`, replace the existing per-room gate (lines 891-892):

```js
  if (!coachBuckets.has(room.code)) coachBuckets.set(room.code, makeBucket(CONFIG.COACH_BUCKET));
  if (!takeToken(coachBuckets.get(room.code))) return res.json({ reply: bankReply(m), degraded: true });
```

with:

```js
  // public-internet cost control: per-room + per-IP + global must all allow before we spend the key.
  if (!coachSpendAllowed(reqIp(req), room)) { log('coach_capped', { code: room.code, ip: reqIp(req) }); return res.json({ reply: bankReply(m), degraded: true }); }
```

> Note: this keeps `coachBuckets` (the per-room limiter) intact; `coachSpendAllowed` now owns taking its token, so there is exactly one place that decrements it. The structured `synth`/`cluster`/`recap`/`structure` branches all sit *after* this gate (they're inside the same handler past line 892), so they inherit the cap automatically — no per-branch edits needed.

- [ ] **Step 6: Run the test to verify it passes**

Run: `node qa-online.js`
Expected: the 3 coach-cap checks PASS — 1st/2nd calls reach the mock upstream (`upstreamCalls` 1 then 2), 3rd is blocked before spend (`degraded:true`, `upstreamCalls` still 2).

- [ ] **Step 7: Checkpoint — regression**

Run: `PORT=3221 node server.js &` then `BASE=http://localhost:3221 node e2e.js` (kill the server after).
Expected: `e2e.js` still reports its full pass (34 checks) — the coach path with no key still returns the free bank reply unchanged (the cap only engages when `AI_PROVIDER` is set AND the global/IP token is exhausted).
(Optional git: `git add server.js qa-online.js && git commit -m "harden: per-IP + global coach spend caps"`)

---

## Task 2: Workshop codes 4 → 6 chars (kill the enumeration oracle)

**Why:** 4 chars over a 30-symbol alphabet = 810K codes; `GET /api/workshop/:code` is an existence oracle, so a few cloud IPs sweep the whole space in hours and discover every live room, defeating the surprise-swap secrecy (rule #2). 6 chars = 30⁶ ≈ 729M — combined with the existing ~30/min/IP GET bucket and the fixed per-IP attribution (Task 3), enumeration becomes infeasible. Legacy 4-char rooms already on disk still join fine (lookup is by exact code); only NEW codes are 6-char.

**Files:**
- Modify: `server.js:85` (`newCode` default length)
- Modify: `public/index.html:1532` (join-code input) and `:1570` (host-side workshop-code input)
- Test: `qa-online.js` (`testCodeLength`)

- [ ] **Step 1: Write the failing test**

Add to `qa-online.js` and enable its call in `main()` (uncomment `await testCodeLength();`):

```js
async function testCodeLength() {
  console.log('\n[code length]');
  const { code, hostKey } = await (await fetch(BASE + '/api/workshop', { method: 'POST' })).json();
  ok('new workshop code is 6 chars', typeof code === 'string' && code.length === 6, code);
  ok('host key length unchanged (8)', typeof hostKey === 'string' && hostKey.length === 8, hostKey);
  // a 6-char code is joinable end-to-end
  const m = new WebSocket(WSBASE); await new Promise(r => m.on('open', r));
  let joined = null; m.on('message', d => { const x = JSON.parse(d); if (x.type === 'joined') joined = x; });
  m.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'T' }));
  await wait(150);
  ok('6-char code joins over WS', !!joined, joined);
  m.close();
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `node qa-online.js`
Expected: "new workshop code is 6 chars" FAILS (code is 4 chars today).

- [ ] **Step 3: Bump the server default**

`server.js:85` — change:

```js
function newCode(len = 4) {
```

to:

```js
function newCode(len = 6) {
```

> `createWorkshop` (`:277`) calls `newCode()` with no arg → now 6. The host key call `newCode(CONFIG.HOSTKEY_LEN)` (`:278`) passes 8 explicitly → unchanged. The collision recursion `newCode(len)` (`:89`) preserves the length → unchanged.

- [ ] **Step 4: Update the client inputs**

`public/index.html:1532` — change:

```js
  const jcode = el('input',{class:'ticket', placeholder:'4 letters — e.g. MARE', 'data-testid':'join-code', maxlength:'4'});
```

to:

```js
  const jcode = el('input',{class:'ticket', placeholder:'6 letters — e.g. MARELY', 'data-testid':'join-code', maxlength:'6'});
```

`public/index.html:1570` — change `maxlength:'4'` to `maxlength:'6'` on the host-side workshop-code input:

```js
  const hcode = el('input',{placeholder:'workshop code', maxlength:'6', style:'text-transform:uppercase; margin-top:8px'});
```

> Leaving `maxlength:6` accepts BOTH legacy 4-char and new 6-char codes (it's an upper bound). The host-code (`hkey`) input at `:1571` stays `maxlength:'12'` (host key is 8) — untouched.

- [ ] **Step 5: Run to verify it passes**

Run: `node qa-online.js`
Expected: all `testCodeLength` checks PASS.

- [ ] **Step 6: Checkpoint — regression (incl. the UAT that types codes in the browser)**

Run: `npx playwright install chromium` (if not already) then `PORT=3222 node server.js &` and `BASE=http://localhost:3222 node e2e-playwright.js` (kill server after).
Expected: 64 UAT checks still pass. This is the suite most exposed to the client edit — it fills the join-code field with the real returned code; the `maxlength:6` bump ensures a 6-char code is not truncated.

(Optional git commit: `harden: 6-char workshop codes`)

---

## Task 3: Trust `X-Forwarded-For` correctly (make per-IP limits real behind a proxy)

**Why:** `reqIp` (`server.js:109-112`) takes the **leftmost** XFF token, which is client-controlled — a hostile client sends `X-Forwarded-For: <random>` and resets every per-IP bucket. The correct rule: trust only the hop your proxy appended. Introduce `TRUSTED_PROXY_HOPS` (default 0 = direct connection, ignore XFF and use the socket address; set to 1 on a single-proxy PaaS to read the rightmost-but-N entry).

**Files:**
- Modify: `server.js:109-112` (`reqIp`)
- Test: `qa-online.js` (`testProxyTrust`) — the suite spawns the server with `TRUSTED_PROXY_HOPS=1`

- [ ] **Step 1: Write the failing test**

Add to `qa-online.js` and enable `await testProxyTrust();`:

```js
async function testProxyTrust() {
  console.log('\n[proxy trust]');
  // server is spawned with TRUSTED_PROXY_HOPS=1, so the IP = the LAST xff entry (proxy-appended).
  // A client that prepends a spoofed IP must NOT be able to reset its bucket: both requests below
  // share the same trusted IP (127.0.0.1, appended last) and so share one mint bucket.
  const hdr = ip => ({ 'x-forwarded-for': `${ip}, 127.0.0.1` });
  // drain the per-IP mint bucket is heavy; instead assert the GET bucket keys identically despite spoof.
  // Fire GETs with different SPOOFED left entries; the trusted IP is constant → one shared GET bucket.
  let lastStatus = 200, sawThrottle = false;
  for (let i = 0; i < 80; i++) {
    const r = await fetch(BASE + '/api/workshop/ZZZZZZ', { headers: hdr('9.9.9.' + i) });
    lastStatus = r.status;
    if (r.status === 429) { sawThrottle = true; break; }
  }
  ok('spoofed XFF left-entry cannot dodge the per-IP GET bucket (got throttled)', sawThrottle, { lastStatus });
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `node qa-online.js`
Expected: FAILS — today `reqIp` keys on the spoofed leftmost entry, so each request looks like a new IP and never throttles (`sawThrottle` false).

- [ ] **Step 3: Implement configurable proxy trust**

`server.js` — add near the CONFIG block (after line 56) or beside `reqIp`:

```js
const TRUSTED_PROXY_HOPS = Math.max(0, Number(process.env.TRUSTED_PROXY_HOPS) || 0);
```

Replace `reqIp` (lines 109-112):

```js
function reqIp(req) {
  return (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim())
    || req.socket.remoteAddress || 'unknown';
}
```

with:

```js
// Public-internet-safe client IP. With no trusted proxy (default), use the socket address and
// IGNORE the client-spoofable X-Forwarded-For. Behind N trusted proxies, read the Nth-from-the-right
// XFF entry — the one your own proxy appended (everything to its left is attacker-controlled).
function reqIp(req) {
  if (TRUSTED_PROXY_HOPS > 0) {
    const parts = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
    const ip = parts[parts.length - TRUSTED_PROXY_HOPS];
    if (ip) return ip;
  }
  return req.socket.remoteAddress || 'unknown';
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node qa-online.js`
Expected: `testProxyTrust` PASSES — the constant trusted IP (`127.0.0.1`) shares one GET bucket regardless of the spoofed left entry, so requests throttle (429) within the loop.

- [ ] **Step 5: Checkpoint — regression**

Run: `PORT=3223 node server.js &` then `BASE=http://localhost:3223 node qa-hostile.js` (restart the server first for a clean mint bucket; kill after).
Expected: 76 hostile checks still pass. Default `TRUSTED_PROXY_HOPS=0` means hostile (which connects directly from localhost) keys on `req.socket.remoteAddress` — consistent per-IP behaviour, no regression.

(Optional git commit: `harden: configurable trusted-proxy IP attribution`)

---

## Task 4: Global room-creation cap (botnet backstop)

**Why:** `MAX_WORKSHOPS:500` is a hard ceiling but there is no global *rate* cap — with per-IP attribution now fixed (Task 3), the per-IP mint bucket works again, but a distributed botnet (many IPs) could still churn-create rooms. Add a single global mint bucket as a backstop that applies to BOTH `/api/workshop` and `/api/sandbox`.

**Files:**
- Modify: `server.js` CONFIG (`:46-47`), add a module-level bucket near `ipBuckets` (`:103`), guard `/api/workshop` (`:691-695`) and `/api/sandbox` (`:702-706`)
- Test: `qa-online.js` (`testGlobalMint`) — server spawned with `MINT_GLOBAL_MAX=4`

- [ ] **Step 1: Write the failing test**

Add to `qa-online.js` and enable `await testGlobalMint();`. Run this **last** of the create-heavy checks (it intentionally drains the global mint bucket):

```js
async function testGlobalMint() {
  console.log('\n[global mint cap]');
  // server spawned with MINT_GLOBAL_MAX=4. We have already minted a few rooms in earlier checks,
  // so just hammer until we see a 429 attributable to the GLOBAL cap (not per-IP — same IP, but the
  // per-IP MINT bucket capacity default 60 is far higher, so the global cap of 4 bites first here).
  let sawCap = false, codes = 0;
  for (let i = 0; i < 12; i++) {
    const r = await fetch(BASE + '/api/workshop', { method: 'POST' });
    if (r.status === 429) { sawCap = true; break; }
    if (r.ok) codes++;
  }
  ok('global mint cap returns 429 once exhausted', sawCap, { codes });
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `node qa-online.js`
Expected: FAILS — no global cap today; with a default-high per-IP bucket the loop never 429s on the global axis.

- [ ] **Step 3: Add the global mint bucket + config**

`server.js` CONFIG, after `MAX_WORKSHOPS: 500,` (`:47`), add:

```js
  MINT_GLOBAL_BUCKET: { capacity: Number(process.env.MINT_GLOBAL_MAX) || 300, refillPerSec: 300 / 3600 }, // ~300/hr total backstop
```

After `const ipBuckets = new Map();` (`:103`), add:

```js
const mintGlobalBucket = makeBucket(CONFIG.MINT_GLOBAL_BUCKET);  // distributed-flood backstop (all create routes)
```

- [ ] **Step 4: Guard both create routes**

`/api/workshop` (`server.js:691-695`) — after the per-IP mint check and before the MAX_WORKSHOPS check, add the global check. Replace:

```js
app.post('/api/workshop', (req, res) => {
  if (!takeToken(ipBucket('mint', reqIp(req), CONFIG.MINT_BUCKET)))
    return res.status(429).json({ error: 'Too many workshops from this address — try again in a minute.' });
  if (workshops.size >= CONFIG.MAX_WORKSHOPS)
```

with:

```js
app.post('/api/workshop', (req, res) => {
  if (!takeToken(ipBucket('mint', reqIp(req), CONFIG.MINT_BUCKET)))
    return res.status(429).json({ error: 'Too many workshops from this address — try again in a minute.' });
  if (!takeToken(mintGlobalBucket))
    return res.status(429).json({ error: 'Server is busy creating rooms — try again shortly.' });
  if (workshops.size >= CONFIG.MAX_WORKSHOPS)
```

`/api/sandbox` (`server.js:702-706`) — apply the SAME global guard after its per-IP check. Replace:

```js
app.post('/api/sandbox', (req, res) => {
  if (!takeToken(ipBucket('mint', reqIp(req), CONFIG.MINT_BUCKET)))          // SHARES the mint bucket (A6)
    return res.status(429).json({ error: 'Too many rooms from this address — try again in a minute.' });
  if (workshops.size >= CONFIG.MAX_WORKSHOPS)
```

with:

```js
app.post('/api/sandbox', (req, res) => {
  if (!takeToken(ipBucket('mint', reqIp(req), CONFIG.MINT_BUCKET)))          // SHARES the mint bucket (A6)
    return res.status(429).json({ error: 'Too many rooms from this address — try again in a minute.' });
  if (!takeToken(mintGlobalBucket))
    return res.status(429).json({ error: 'Server is busy creating rooms — try again shortly.' });
  if (workshops.size >= CONFIG.MAX_WORKSHOPS)
```

- [ ] **Step 5: Run to verify it passes**

Run: `node qa-online.js`
Expected: `testGlobalMint` PASSES (429 observed once the global cap of 4 is drained).

- [ ] **Step 6: Checkpoint — regression**

Run the create-heavy suites against fresh servers (the default global cap is 300/hr — far above any suite's mint count): `PORT=3224 node server.js &` then `BASE=http://localhost:3224 node qa-sandbox.js` and (restart) `node qa-scale.js`. Expected: 12 + 12 still pass. If `qa-scale.js` (6 teams) ever approaches the global cap, it won't at default 300 — but confirm.

(Optional git commit: `harden: global room-creation backstop`)

---

## Task 5: WebSocket origin allowlist

**Why:** The WS upgrade (`server.js:79`) has no origin check, so any web page can open a socket and (with a code) drive a room cross-origin. Add a `verifyClient` that enforces `ALLOWED_ORIGINS` when set; empty = allow all (preserves LAN/dev/native-client behaviour, where there is no browser Origin).

**Files:**
- Modify: `server.js:79` (`WebSocketServer` options)
- Test: `qa-online.js` (`testWsOrigin`) — server spawned with `ALLOWED_ORIGINS=http://allowed.test`

- [ ] **Step 1: Write the failing test**

Add to `qa-online.js` and enable `await testWsOrigin();`:

```js
async function testWsOrigin() {
  console.log('\n[ws origin allowlist]');
  const tryOrigin = origin => new Promise(res => {
    const w = new WebSocket(WSBASE, { headers: origin ? { Origin: origin } : {} });
    let settled = false;
    w.on('open', () => { if (!settled) { settled = true; w.close(); res('open'); } });
    w.on('error', () => { if (!settled) { settled = true; res('rejected'); } });
    w.on('unexpected-response', () => { if (!settled) { settled = true; res('rejected'); } });
    setTimeout(() => { if (!settled) { settled = true; res('open'); } }, 1500);
  });
  ok('allowed Origin connects', (await tryOrigin('http://allowed.test')) === 'open');
  ok('disallowed Origin is rejected', (await tryOrigin('http://evil.test')) === 'rejected');
  ok('no Origin (native client / LAN) is allowed', (await tryOrigin(null)) === 'open');
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `node qa-online.js`
Expected: "disallowed Origin is rejected" FAILS (no check today — `evil.test` connects).

- [ ] **Step 3: Implement `verifyClient`**

`server.js` — add the allowlist near the CONFIG block (after line 56):

```js
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
function originAllowed(origin) {
  if (!ALLOWED_ORIGINS.length) return true;   // unset = allow all (LAN/dev default)
  if (!origin) return true;                    // native (non-browser) clients send no Origin
  return ALLOWED_ORIGINS.includes(origin);
}
```

Replace the `WebSocketServer` construction (`server.js:79`):

```js
const wss = new WebSocketServer({ server, maxPayload: CONFIG.WS_MAX_PAYLOAD });
```

with:

```js
const wss = new WebSocketServer({
  server,
  maxPayload: CONFIG.WS_MAX_PAYLOAD,
  verifyClient: (info, cb) => {
    if (originAllowed(info.origin)) return cb(true);
    log('ws_origin_rejected', { origin: info.origin || null });
    return cb(false, 403, 'Forbidden origin');
  }
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `node qa-online.js`
Expected: all 3 `testWsOrigin` checks PASS.

- [ ] **Step 5: Checkpoint — regression**

Run: `PORT=3225 node server.js &` then `BASE=http://localhost:3225 node e2e.js` (kill after).
Expected: 34 checks pass — the suites connect with no Origin header (default-allow), and the spawned `qa-online` server is the only one with `ALLOWED_ORIGINS` set. Confirm `e2e-playwright.js` is NOT run against an allowlisted server (its browser Origin would be the test host) — keep `ALLOWED_ORIGINS` unset in normal/UAT runs.

(Optional git commit: `harden: WS origin allowlist`)

---

## Task 6: Gate `/api/diff` to share/closed

**Why:** `GET /api/diff/:code/:teamId` (`server.js:1378-1386`) returns the original + redesign canvases to anyone with the code at ANY phase, bypassing the per-role projection that hides the original pre-reveal. Gate it to `share`/`closed` (parity with the WS projection).

**Files:**
- Modify: `server.js:1378-1385`
- Test: `qa-online.js` (`testDiffGate`)

- [ ] **Step 1: Write the failing test**

Add to `qa-online.js` and enable `await testDiffGate();`:

```js
async function testDiffGate() {
  console.log('\n[diff phase gate]');
  // a fresh room is in 'lobby' — the diff endpoint must refuse regardless of code knowledge.
  const { code } = await (await fetch(BASE + '/api/workshop', { method: 'POST' })).json();
  const r = await fetch(`${BASE}/api/diff/${code}/anyteam`);
  ok('diff refused pre-share (not 200)', r.status !== 200, { status: r.status });
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `node qa-online.js`
Expected: it currently returns 404 for "no redesign" anyway — but that 404 is incidental, not a phase gate. To make the test meaningful and the gate explicit, the assertion checks status ≠ 200 AND the implementation must short-circuit on phase BEFORE looking up teams. (If this check already passes incidentally, keep it; the implementation step makes the refusal phase-driven and explicit. The real protection is verified by the regression note below: a share-phase room with a real redesign still returns 200.)

- [ ] **Step 3: Add the phase gate**

`server.js:1378-1380` — change:

```js
app.get('/api/diff/:code/:teamId', (req, res) => {
  const w = workshops.get((req.params.code || '').toUpperCase());
  if (!w) return res.status(404).json({ error: 'not found' });
```

to:

```js
app.get('/api/diff/:code/:teamId', (req, res) => {
  const w = workshops.get((req.params.code || '').toUpperCase());
  if (!w) return res.status(404).json({ error: 'not found' });
  if (w.state !== 'share' && w.state !== 'closed')   // parity with the A2 WS projection: no original pre-reveal
    return res.status(403).json({ error: 'not available yet' });
```

- [ ] **Step 4: Run to verify it passes**

Run: `node qa-online.js`
Expected: `testDiffGate` PASSES (403 pre-share).

- [ ] **Step 5: Checkpoint — regression (the legitimate share-phase path must still work)**

The diff endpoint is used by the client at share (`public/index.html:2875`). Verify it still returns 200 at share: run `BASE=... node e2e.js` — `e2e.js` drives a room to share and the share flow exercises diff; confirm its share-phase checks still pass. Also `e2e-playwright.js` renders the share "what died" list from this endpoint.
Run: `PORT=3226 node server.js &` then `BASE=http://localhost:3226 node e2e.js`.
Expected: 34 pass (share-phase diff still 200).

(Optional git commit: `harden: gate /api/diff to share/closed`)

---

## Task 7: HSTS + relaxed CSP headers

**Why:** Only three security headers are set today (`server.js:70-75`). For public HTTPS, add HSTS (browsers ignore it over plain HTTP, so it's safe to send unconditionally) and a relaxed Content-Security-Policy as defense-in-depth (the XSS posture is already clean via `esc()`, but a CSP contains any future slip). The CSP must allow the app's inline `<script>`/`<style>` and `wss:`/`ws:` connections, so it uses `'unsafe-inline'` for script/style — still blocks third-party injection.

**Files:**
- Modify: `server.js:70-75` (header middleware)
- Test: `qa-online.js` (`testHeaders`)

- [ ] **Step 1: Write the failing test**

Add to `qa-online.js` and enable `await testHeaders();`:

```js
async function testHeaders() {
  console.log('\n[security headers]');
  const r = await fetch(BASE + '/');
  ok('HSTS header present', /max-age=\d+/.test(r.headers.get('strict-transport-security') || ''), r.headers.get('strict-transport-security'));
  const csp = r.headers.get('content-security-policy') || '';
  ok('CSP present with self default', /default-src 'self'/.test(csp), csp);
  ok('CSP allows wss/ws connect', /connect-src[^;]*wss:/.test(csp) && /connect-src[^;]*ws:/.test(csp), csp);
  ok('existing nosniff header retained', (r.headers.get('x-content-type-options') || '') === 'nosniff');
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `node qa-online.js`
Expected: HSTS and CSP checks FAIL (not set today).

- [ ] **Step 3: Add the headers**

`server.js:70-75` — replace:

```js
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
```

with:

```js
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // HSTS: ignored by browsers over plain HTTP, so safe to always send; engages on the HTTPS host.
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Relaxed CSP — single-file app uses inline script/style (needs 'unsafe-inline'); data: for inline
  // SVG/PNG; self-hosted fonts; wss/ws for the live socket. Still blocks third-party script injection.
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; " +
    "font-src 'self'; " +
    "connect-src 'self' ws: wss:; " +
    "base-uri 'self'; " +
    "frame-ancestors 'none'");
  next();
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `node qa-online.js`
Expected: all 4 `testHeaders` checks PASS.

- [ ] **Step 5: Checkpoint — regression (CSP must not break the live app)**

The CSP is the one item that can break the running UI (a too-strict policy blocks inline scripts, fonts, the WS, or images). Verify in a real browser run: `PORT=3227 node server.js &` then `BASE=http://localhost:3227 node e2e-playwright.js`.
Expected: 64 UAT checks pass with **zero console CSP-violation errors** (the UAT already asserts a clean console). If any asset is blocked, widen the matching directive (e.g. add `blob:` to `img-src` if the race-card PNG export trips it — the UAT will surface it).

(Optional git commit: `harden: HSTS + relaxed CSP`)

---

## Task 8: Full regression sweep + operator docs

**Why:** Prove the whole hardening set is green together, document the new env vars, and give the operator a runbook so the public deploy actually flips the gates on.

**Files:**
- Modify: `CLAUDE.md` (run/test section — add `qa-online.js` and the env vars)
- Create: `docs/DEPLOY.md`

- [ ] **Step 1: Full suite sweep**

Run each against a freshly-restarted server (restart between suites — they share the per-IP mint bucket), defaults only (no `ALLOWED_ORIGINS`, `TRUSTED_PROXY_HOPS` unset):

```bash
node qa-online.js                                   # NEW — self-spawns; expect all green
node qa-editguard.js                                # static; expect 30
PORT=3230 node server.js &  BASE=http://localhost:3230 node e2e.js                 # 34
# restart server between each of the following:
BASE=http://localhost:3230 node qa-batch1.js        # 18
BASE=http://localhost:3230 node qa-batch2.js        # 20
BASE=http://localhost:3230 node qa-sandbox.js       # 12
BASE=http://localhost:3230 node qa-a11y.js          # 33
BASE=http://localhost:3230 node e2e-playwright.js   # 64
BASE=http://localhost:3230 node qa-hostile.js       # 76  (run LAST — drains the mint bucket)
```

Expected: every suite reports its full count with 0 failures. `qa-hostile.js` last.

- [ ] **Step 2: Update CLAUDE.md run/test section**

Add a line under the test-suite list documenting the new suite:

```
node qa-online.js                                   # NEW self-spawning PUBLIC-HARDENING suite (port 3220): per-IP+global coach spend caps (via a mock upstream), 6-char codes, X-Forwarded-For trust, global mint backstop, WS origin allowlist, /api/diff phase-gate, HSTS+CSP. No pre-running server needed.
```

And add a short "Public-host env" note near the AI-provider config bullet:

```
- **Public-internet env (default-off, set on the public host):** `ALLOWED_ORIGINS` (comma-sep; empty=allow all), `TRUSTED_PROXY_HOPS` (0=direct, 1 behind a single PaaS proxy), `COACH_GLOBAL_MAX`/`COACH_IP_MAX` (key-spend caps), `MINT_GLOBAL_MAX` (creation backstop), `ANTHROPIC_BASE_URL` (override for testing/proxy). Codes are now 6 chars. See `docs/DEPLOY.md`.
```

- [ ] **Step 3: Create docs/DEPLOY.md**

```markdown
# Deploying Horsepower to the public internet

Single instance (workshop scale ≤ a few hundred concurrent). No DB required.

## Required on the host
- A persistent volume mounted at `/data`, with `DATA_DIR=/data` (otherwise every restart wipes live workshops — free-tier disks are ephemeral).
- Health check: `GET /api/health`.
- Node 18+ (`engines` in package.json). Native WebSockets must be proxied (Render/Railway/Fly all do).

## Security env (set ALL of these on a public host)
| Var | Set to | Why |
|-----|--------|-----|
| `ALLOWED_ORIGINS` | `https://your-app.example.com` | WS origin allowlist (Task 5) |
| `TRUSTED_PROXY_HOPS` | `1` (single PaaS proxy) | correct per-IP attribution (Task 3) |
| `COACH_GLOBAL_MAX` | e.g. `2000` | daily ceiling on AI key spend (Task 1) |
| `COACH_IP_MAX` | e.g. `40` | per-IP ceiling on AI key spend (Task 1) |
| `MINT_GLOBAL_MAX` | e.g. `300` | global room-creation backstop (Task 4) |
| `ANTHROPIC_API_KEY` | your key (optional) | omit to run on the free bank path |

Also set a **billing cap/alert** on the Anthropic/Azure account — the env caps are the app-side defense, the provider cap is the hard backstop.

## Not done by this plan (operator's call)
- Durable DB migration (not needed at this scale; volume covers durability).
- CAPTCHA on room creation (the per-IP + global mint caps are the current backstop).
- Horizontal scaling (single instance is ~15× over the design target).
```

- [ ] **Step 4: Final checkpoint**

Re-run `node qa-online.js` once more after the doc edits (docs don't affect it, but confirm nothing was touched accidentally). Expected: all green.

(Optional git commit: `docs: public-hardening suite + deploy runbook`)

---

## Self-Review

**Spec coverage** (against the 7-item security checklist + testing requirement):
1. Coach cost cap → Task 1 ✓ (per-IP + global, mock-upstream test)
2. 6-char codes → Task 2 ✓ (server + client + join test)
3. X-Forwarded-For trust → Task 3 ✓ (`TRUSTED_PROXY_HOPS`, spoof test)
4. Global creation cap → Task 4 ✓ (global mint bucket, both routes)
5. WS origin allowlist → Task 5 ✓ (`verifyClient`, 3-case test)
6. Gate `/api/diff` → Task 6 ✓ (phase gate, refusal + share-path regression)
7. HSTS + CSP → Task 7 ✓ (headers, UAT console-clean regression)
- Testing plan for everything → each task has RED test → fail → implement → pass → regression checkpoint; `qa-online.js` consolidates all checks ✓
- Durability/DB/scaling → explicitly OUT of scope, documented in DEPLOY.md ✓

**Placeholder scan:** no TBD/TODO; every code step shows the exact before/after. ✓

**Type/name consistency:** `coachSpendAllowed(ip, room)` defined in Task 1, called in Task 1 only. `reqIp` signature unchanged (still `(req)`). `originAllowed`/`mintGlobalBucket`/`coachGlobalBucket`/`coachIpBuckets`/`ANTHROPIC_BASE_URL`/`TRUSTED_PROXY_HOPS`/`ALLOWED_ORIGINS` each defined once and referenced consistently. `qa-online.js` test fns (`testCoachCaps`/`testCodeLength`/`testProxyTrust`/`testGlobalMint`/`testWsOrigin`/`testDiffGate`/`testHeaders`) match their `main()` call sites. ✓

**Risk note:** the two edits that can break the *running app* (not just a test) are the client `maxlength` (Task 2 — guarded by the Playwright UAT) and the CSP (Task 7 — guarded by the Playwright UAT's clean-console assertion). Both have explicit browser-run checkpoints. Everything else is server-only and env-defaulted-off.
