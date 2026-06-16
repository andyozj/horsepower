/* Slice C — the native redesign-challenger. Self-spawns a server on PORT 3260 with a MOCK Anthropic
 * upstream so both the LIVE coach path and the rule-based DEGRADED bank are testable with no real key.
 * Covers: constraint:route (authz + phase-gate + SERVER-derived movable), the persona challenge
 * (live flag + degraded bank flags + verdict persistence), personaDelta bands, and projection exposure.
 *   node qa-redesigner.js
 */
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const PORT = 3260, BASE = `http://localhost:${PORT}`, WSBASE = `ws://localhost:${PORT}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + JSON.stringify(x) : ''); } };
const J = o => JSON.stringify(o);

// The mock returns whatever `nextReply` is, JSON-stringified as the assistant text. A non-JSON string
// (e.g. 'garble') forces the server's JSON.parse to fail → its rule-based degraded bank fires.
let nextReply = { reply: 'ok' };
function startMock() {
  return new Promise(res => {
    const s = http.createServer((rq, rs) => { let b = ''; rq.on('data', d => b += d); rq.on('end', () => {
      rs.writeHead(200, { 'content-type': 'application/json' });
      rs.end(JSON.stringify({ content: [{ type: 'text', text: typeof nextReply === 'string' ? nextReply : JSON.stringify(nextReply) }] }));
    }); });
    s.listen(0, () => res(s));
  });
}
const coach = body => fetch(BASE + '/api/coach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: J(body) }).then(r => r.json());
function pblock(id, text, capacity) { return { id, type: 'persona', text, x: 60, y: 60, w: 160, h: 50, meta: { capacity } }; }
function block(id, type, text) { return { id, type, text, x: 80, y: 80, w: 160, h: 50 }; }

async function main() {
  const mock = await startMock();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-rd-'));
  const srv = spawn('node', ['server.js'], { env: Object.assign({}, process.env, {
    PORT: String(PORT), DATA_DIR: dir, ANTHROPIC_API_KEY: 'k', ANTHROPIC_BASE_URL: `http://localhost:${mock.address().port}/v1/messages`
  }), stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stderr.on('data', d => process.env.DEBUG && console.error(String(d)));
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {} await wait(100); }

  try {
    const { code, hostKey } = await (await fetch(BASE + '/api/workshop', { method: 'POST' })).json();
    const fac = new WebSocket(WSBASE); await new Promise(r => fac.on('open', r));
    const A = new WebSocket(WSBASE); await new Promise(r => A.on('open', r));
    const B = new WebSocket(WSBASE); await new Promise(r => B.on('open', r));
    let stA = null, stB = null, teamA = null, teamB = null;
    A.on('message', d => { const x = JSON.parse(d); if (x.type === 'state') stA = x.state; if (x.type === 'seated') teamA = x.teamId; });
    B.on('message', d => { const x = JSON.parse(d); if (x.type === 'state') stB = x.state; if (x.type === 'seated') teamB = x.teamId; });
    fac.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey }));
    A.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Ann' }));
    B.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Bob' }));
    await wait(150);
    A.send(J({ type: 'team:create', workshopCode: code, name: 'AP', memberName: 'Ann' }));
    B.send(J({ type: 'team:create', workshopCode: code, name: 'Onboard', memberName: 'Bob' }));
    await wait(220);
    fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'surface' }));
    await wait(200);
    // Seed both canvases. Team A receives team B's teardown (ring i+1), so we assert on A using B's people.
    A.send(J({ type: 'canvas:update', workshopCode: code, canvas: { blocks: [
      pblock('a-p1', 'Clerk', 'operates'), pblock('a-p2', 'Manager', 'accountable'),
      block('a-i', 'intent', 'decide pay or dispute'), block('a-o', 'outcome', 'invoice settled'), block('a-t', 'trigger', 'invoice arrives'), block('a-ph', 'phase', 'review')
    ], arrows: [] } }));
    B.send(J({ type: 'canvas:update', workshopCode: code, canvas: { blocks: [
      pblock('b-p1', 'Agent X', 'operates'), pblock('b-p2', 'Owner Y', 'accountable'), pblock('b-p3', 'Helper Z', 'operates'),
      block('b-i', 'intent', 'approve onboarding'), block('b-o', 'outcome', 'new hire active'), block('b-t', 'trigger', 'offer accepted'), block('b-ph', 'phase', 'setup')
    ], arrows: [] } }));
    await wait(250);
    fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'rebuild' }));
    await wait(300);

    const myA = () => (stA.teams || []).find(t => t.id === teamA);
    const ra = () => myA().redesign;
    ok('swap built team A redesign from team B (3 people inventory)', ra() && (ra().peopleLandings || []).length === 3, ra() && (ra().peopleLandings || []).map(p => p.role));
    ok('constraints ledger seeded from candidate constraints (3, all open/unrouted)',
      (ra().constraints || []).length === 3 && ra().constraints.every(c => c.status === 'open' && c.source === null && c.movable === null),
      ra().constraints);
    ok('personaDelta exposed on the wire, RETROFIT-SHAPED before any landing (0 agents)',
      myA().personaDelta && myA().personaDelta.band === 'RETROFIT-SHAPED', myA().personaDelta);

    // ---- constraint:route — SERVER-derived movable, client value ignored ----
    const c0 = ra().constraints[0].id;
    A.send(J({ type: 'constraint:route', workshopCode: code, constraintId: c0, source: 'law', movable: 'assumed' /* forged — must be ignored */ }));
    await wait(150);
    let c = ra().constraints.find(x => x.id === c0);
    ok('route law → movable REAL (forged client movable ignored)', c.source === 'law' && c.movable === 'real', c);
    A.send(J({ type: 'constraint:route', workshopCode: code, constraintId: c0, source: 'habit', movable: 'real' /* forged */ }));
    await wait(150);
    c = ra().constraints.find(x => x.id === c0);
    ok('re-route habit → movable ASSUMED (forged client movable ignored)', c.source === 'habit' && c.movable === 'assumed', c);
    A.send(J({ type: 'constraint:route', workshopCode: code, constraintId: c0, source: 'nonsense' }));
    await wait(120);
    c = ra().constraints.find(x => x.id === c0);
    ok('route with an unknown source is rejected (unchanged)', c.source === 'habit', c);
    A.send(J({ type: 'constraint:route', workshopCode: code, constraintId: 'not-a-real-id', source: 'law' }));
    await wait(120);
    ok('route on a foreign/unknown constraintId is a no-op (team-scoped)', ra().constraints.every(x => x.id === c0 ? x.source === 'habit' : x.source === null));

    // ---- persona challenge — LIVE path returns the AI flag + persists the verdict ----
    const pAgentX = ra().peopleLandings.find(p => p.role === 'Agent X').personId;
    A.send(J({ type: 'people:land', workshopCode: code, personId: pAgentX, outcome: 'transforms', note: 'reviews' }));
    await wait(150);
    nextReply = { reply: 'A verb, not a role — what is it CALLED?', flag: 'verb-not-role', require: 'named-role', settled: false };
    const r1 = await coach({ mode: 'rebuild', challenge: 'persona', code, teamId: teamA, personId: pAgentX });
    ok('persona challenge (live) returns the AI flag + require', r1.flag === 'verb-not-role' && r1.require === 'named-role' && r1.degraded !== true, r1);
    await wait(150);
    let land = ra().peopleLandings.find(p => p.personId === pAgentX);
    ok('persona verdict persists onto the landing (debrief signal)', land.coachFlag === 'verb-not-role' && land.coachReq === 'named-role', land);

    // a fresh landing RESETS the verdict (forces re-challenge)
    A.send(J({ type: 'people:land', workshopCode: code, personId: pAgentX, outcome: 'transforms', note: 'Exceptions Steward' }));
    await wait(150);
    land = ra().peopleLandings.find(p => p.personId === pAgentX);
    ok('re-landing clears the stale Coach verdict', land.coachFlag === null && land.coachReq === null, land);

    // ---- persona challenge — DEGRADED bank fires correct flags on a parse failure ----
    const pHelperZ = ra().peopleLandings.find(p => p.role === 'Helper Z').personId;
    A.send(J({ type: 'people:land', workshopCode: code, personId: pHelperZ, outcome: 'removed', note: '' }));
    await wait(150);
    nextReply = 'garble — not json';   // forces the server to fall to its rule-based bank
    const r2 = await coach({ mode: 'rebuild', challenge: 'persona', code, teamId: teamA, personId: pHelperZ });
    ok('persona challenge (degraded bank) flags removed-with-no-absorber', r2.degraded === true && r2.flag === 'missing-dropped-work' && r2.require === 'absorber', r2);

    const pOwnerY = ra().peopleLandings.find(p => p.role === 'Owner Y').personId;
    // the value-handwave is tested via the coach body directly — the people:land gate ALSO rejects "freed up",
    // so it never reaches a stored landing; the bank must still flag it when the Coach is asked about it.
    nextReply = 'garble';
    const r3 = await coach({ mode: 'rebuild', challenge: 'persona', code, teamId: teamA, personId: pOwnerY, outcome: 'transforms', note: 'freed up for higher-value work' });
    ok('persona challenge (degraded bank) rejects the value-handwave', r3.degraded === true && r3.flag === 'value-handwave', r3);
    // land Owner Y for real so the delta counts are clean
    A.send(J({ type: 'people:land', workshopCode: code, personId: pOwnerY, outcome: 'transforms', note: 'Onboarding Designer' }));
    await wait(150);

    // ---- personaDelta bands ----
    // current: Agent X transforms, Helper Z removed, Owner Y transforms → moved 3/3, but 0 agents → RETROFIT
    ok('personaDelta still RETROFIT-SHAPED while 0 agents act', myA().personaDelta.band === 'RETROFIT-SHAPED', myA().personaDelta);
    // add an agent block → moved/total ≥ .5 AND agents ≥ 1 → REDESIGNED
    A.send(J({ type: 'redesign:update', workshopCode: code, redesign: { canvas: { blocks: [block('ag1', 'agent', 'auto-match & post')], arrows: [] } } }));
    await wait(200);
    ok('personaDelta → REDESIGNED once agents act and roles moved', myA().personaDelta.band === 'REDESIGNED', myA().personaDelta);
    ok('personaDelta counts are correct (2 transformed, 1 removed, 0 stays, 1 agent)',
      myA().personaDelta.transforms === 2 && myA().personaDelta.removed === 1 && myA().personaDelta.stays === 0 && myA().personaDelta.agents === 1, myA().personaDelta);
    // flip two to 'stays' so moved/total < .5 (1/3) with an agent present → PARTIAL
    A.send(J({ type: 'people:land', workshopCode: code, personId: pHelperZ, outcome: 'stays', note: 'still keys it in' }));
    A.send(J({ type: 'people:land', workshopCode: code, personId: pOwnerY, outcome: 'stays', note: 'approves as before' }));
    await wait(200);
    ok('personaDelta → PARTIAL (1 moved, 2 stay, agent present)', myA().personaDelta.band === 'PARTIAL', myA().personaDelta);
    ok('toilStays counts operates-capacity people who only stay', myA().personaDelta.toilStays === 1, myA().personaDelta);

    // ---- authz: a member cannot route after the phase leaves rebuild ----
    fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'share' }));
    await wait(200);
    const before = JSON.stringify(ra().constraints);
    A.send(J({ type: 'constraint:route', workshopCode: code, constraintId: ra().constraints[1].id, source: 'law' }));
    await wait(150);
    ok('constraint:route is rejected outside rebuild (phase-gated)', JSON.stringify(ra().constraints) === before);

    A.close(); B.close(); fac.close();
  } finally { srv.kill('SIGKILL'); mock.close(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} }
  console.log(`\nqa-redesigner: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main();
