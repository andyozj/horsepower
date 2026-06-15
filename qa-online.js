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
