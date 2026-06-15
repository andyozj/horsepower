/* Slice A1 — server interview engine. Self-spawns a server on PORT 3240 with a MOCK Anthropic
 * upstream returning a canned {reply, ops}, so the op-apply path is testable with no real key.
 *   node qa-interview.js
 */
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const PORT = 3240, BASE = `http://localhost:${PORT}`, WSBASE = `ws://localhost:${PORT}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + JSON.stringify(x) : ''); } };
const J = o => JSON.stringify(o);
const BLOCK_OK = b => b && typeof b.text === 'string' && b.text.length <= 400 && b.type !== 'NOPE';

let nextReply = { reply: 'ok', ops: [] };
function startMock() {
  return new Promise(res => {
    const s = http.createServer((rq, rs) => { let b = ''; rq.on('data', d => b += d); rq.on('end', () => {
      rs.writeHead(200, { 'content-type': 'application/json' });
      rs.end(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(nextReply) }] }));
    }); });
    s.listen(0, () => res(s));
  });
}
async function seatTeam() {
  const { code, hostKey } = await (await fetch(BASE + '/api/workshop', { method: 'POST' })).json();
  const fac = new WebSocket(WSBASE); await new Promise(r => fac.on('open', r));
  const m = new WebSocket(WSBASE); await new Promise(r => m.on('open', r));
  let teamId = null, st = null;
  m.on('message', d => { const x = JSON.parse(d); if (x.type === 'state') st = x.state; if (x.type === 'seated') teamId = x.teamId; });
  fac.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey }));
  m.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'A' }));
  await wait(150);
  m.send(J({ type: 'team:create', workshopCode: code, name: 'AP', memberName: 'A' }));
  await wait(180);
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'surface' }));
  await wait(180);
  return { code, teamId, m, fac, canvas: () => st.teams.find(t => t.id === teamId).canvas };
}
const callInterview = (code, teamId, msg) => fetch(BASE + '/api/coach', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: J({ mode: 'surface', interview: true, code, teamId, messages: [{ role: 'user', content: msg }] })
}).then(r => r.json());

async function main() {
  const mock = await startMock();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-iv-'));
  const srv = spawn('node', ['server.js'], { env: Object.assign({}, process.env, {
    PORT: String(PORT), DATA_DIR: dir, ANTHROPIC_API_KEY: 'k', ANTHROPIC_BASE_URL: `http://localhost:${mock.address().port}/v1/messages`
  }), stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stderr.on('data', d => process.env.DEBUG && console.error(String(d)));
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {} await wait(100); }
  try {
    const room = await seatTeam();
    ok('team seated in surface', !!room.canvas, room.teamId);

    nextReply = { reply: 'Who actually owns this?', ops: [
      { op: 'add', tmpId: 't1', type: 'persona', text: 'Analyst' },
      { op: 'add', tmpId: 't2', type: 'phase', text: 'Reconcile' },
      { op: 'connect', from: 't1', to: 't2' }
    ] };
    const r1 = await callInterview(room.code, room.teamId, 'finance reviews invoices monthly');
    ok('interview returns the reply (not degraded)', /own/i.test(r1.reply || '') && r1.degraded !== true, r1);
    await wait(300);
    const c1 = room.canvas();
    ok('add ops created 2 blocks server-side', (c1.blocks || []).length === 2, (c1.blocks || []).map(b => b.type));
    ok('connect op created an arrow (tmpIds resolved)', (c1.arrows || []).length === 1, c1.arrows);

    const pid = c1.blocks.find(b => b.type === 'persona').id;
    nextReply = { reply: 'noted', ops: [{ op: 'update', id: pid, text: 'Senior Analyst', why: 'pulls the numbers' }] };
    await callInterview(room.code, room.teamId, 'actually senior analyst');
    await wait(300);
    const c2 = room.canvas();
    ok('update op edits in place (no duplicate)', c2.blocks.length === 2 && c2.blocks.find(b => b.id === pid).text === 'Senior Analyst', c2.blocks.map(b => b.text));
    ok('update op wrote meta.why', (c2.blocks.find(b => b.id === pid).meta || {}).why === 'pulls the numbers');

    nextReply = { reply: 'x', ops: [
      { op: 'add', type: 'NOPE', text: 'bad' },
      { op: 'add', tmpId: 't9', type: 'phase', text: 'X'.repeat(5000) },
      { op: 'update', id: 'does-not-exist', text: 'ghost' },
      { op: 'remove', id: pid }
    ] };
    await callInterview(room.code, room.teamId, 'mess it up');
    await wait(300);
    const c3 = room.canvas();
    ok('hostile ops: bad type dropped + oversized clamped + unknown-id ignored + valid remove applied',
      c3.blocks.every(BLOCK_OK) && !c3.blocks.find(b => b.id === pid) && !!c3.blocks.find(b => b.type === 'phase' && b.text.length <= 400),
      c3.blocks.map(b => b.type + ':' + (b.text || '').length));

    // A2c: the Coach hands off (done) when it says so OR the map is ontology-complete
    nextReply = { reply: 'That’s your workflow mapped — take a look.', ops: [], done: true };
    const rDone = await callInterview(room.code, room.teamId, 'and that’s the whole thing');
    ok('A2c: interview returns done:true when the Coach hands off', rDone.done === true, rDone);
    nextReply = { reply: 'keep going', ops: [], done: false };
    const rNot = await callInterview(room.code, room.teamId, 'one more thing');
    // map isn't ontology-complete (no trigger/intent/outcome) → done stays false
    ok('A2c: done:false mid-interview (not ontology-complete)', rNot.done === false, rNot);

    room.m.close(); room.fac.close();
  } finally { srv.kill('SIGKILL'); mock.close(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} }
  console.log(`\nqa-interview: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main();
