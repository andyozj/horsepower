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
    await testCoachCaps();      // Task 1 (mints)
    await testCodeLength();     // Task 2 (mints)
    await testProxyTrust();     // Task 3 (GETs only)
    await testWsOrigin();       // Task 5 (WS only)
    await testDiffGate();       // Task 6 (mints — MUST precede the global-mint drain)
    // await testHeaders();     // Task 7 (GET / only)
    await testGlobalMint();     // Task 4 — MUST BE LAST: it drains the global mint bucket, so any
                                // later check that mints would 429. (Reordered after a real test-isolation bug.)
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

// ---- Task 2: 6-char workshop codes ----
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

// ---- Task 3: trusted-proxy IP attribution ----
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

// ---- Task 4: global mint cap (botnet backstop) ----
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

// ---- Task 5: WebSocket origin allowlist ----
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

// ---- Task 6: /api/diff phase gate ----
async function testDiffGate() {
  console.log('\n[diff phase gate]');
  // a fresh room is in 'lobby' — the diff endpoint must refuse regardless of code knowledge.
  const { code } = await (await fetch(BASE + '/api/workshop', { method: 'POST' })).json();
  const r = await fetch(`${BASE}/api/diff/${code}/anyteam`);
  // Assert 403 specifically (the phase gate), not just "not 200": pre-fix a lobby room returned 404
  // incidentally, so a "not 200" check passed even WITHOUT the gate. 403 proves the gate is doing it.
  ok('diff phase-gated pre-share (403, not the incidental 404)', r.status === 403, { status: r.status });
}

main();
