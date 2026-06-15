/* Concurrent-edit / contention test — two members editing the SAME team map at once.
 * The load test proved the server handles simultaneous TRAFFIC; this proves DATA INTEGRITY
 * under contention: the knownIds block-merge (A11) + per-block LWW. Raw `ws`, no browser.
 *   PORT=3530 node qa-concurrent.js   (self-spawns the server on PORT, isolated DATA_DIR)
 *
 * NOTE on the editingLock case (a member typing a label while a peer commits): that is a
 * client behavior already covered green by qa-fixcheck ("label typed without blur survives a
 * broadcast", "in-flight Coach text survives a broadcast re-render"). This file covers the
 * server-side merge cases the browser suites can't time precisely.
 */
const http = require('http');
const { spawn, execSync } = require('child_process');
const WebSocket = require('ws');
const PORT = Number(process.env.PORT || 3530);
const DATA_DIR = process.env.DATA_DIR || '/tmp/hp-concurrent';
const BASE = `http://127.0.0.1:${PORT}`, WS = `ws://127.0.0.1:${PORT}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + JSON.stringify(x) : ''); } };
const J = o => JSON.stringify(o);

function post(path) { return new Promise((res, rej) => { const r = http.request(BASE + path, { method: 'POST' }, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res(JSON.parse(d || '{}'))); }); r.on('error', rej); r.end(); }); }

// a ws member/farrier that tracks the latest team canvas it has seen
function actor() {
  const a = { ws: null, teamId: null, memberId: null, token: null, lastState: null };
  return a;
}
function teamCanvas(a, teamId) {
  const s = a.lastState; if (!s) return null;
  const t = (s.teams || []).find(x => x.id === teamId); return t ? (t.canvas || { blocks: [] }) : null;
}

(async () => {
  execSync(`rm -rf ${DATA_DIR}`, { stdio: 'ignore' });
  const srv = spawn('node', ['server.js'], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR }), stdio: 'ignore' });
  await wait(1200);
  try {
    const { code, hostKey } = await post('/api/workshop');
    console.log('workshop', code);

    // farrier
    const F = actor();
    F.ws = new WebSocket(WS);
    await new Promise(r => F.ws.on('open', r));
    F.ws.on('message', d => { const m = JSON.parse(d); if (m.type === 'state') F.lastState = m.state; });
    F.ws.send(J({ type: 'join', workshopCode: code, role: 'farrier', hostKey }));
    await wait(200);

    // two members on ONE team
    async function member(create, teamId, name) {
      const a = actor();
      a.ws = new WebSocket(WS);
      await new Promise(r => a.ws.on('open', r));
      a.ws.on('message', d => { const m = JSON.parse(d); if (m.type === 'state') a.lastState = m.state; else if (m.type === 'seated') { a.teamId = m.teamId; a.memberId = m.memberId; a.token = m.token; } });
      a.ws.send(J({ type: 'join', workshopCode: code, role: 'member' }));
      await wait(150);
      if (create) a.ws.send(J({ type: 'team:create', workshopCode: code, name, memberName: name }));
      else a.ws.send(J({ type: 'team:join', workshopCode: code, teamId, memberName: name }));
      await wait(250);
      return a;
    }
    const A = await member(true, null, 'Ann');
    const TEAM = A.teamId;
    const B = await member(false, TEAM, 'Bob');
    await wait(200);

    // surface phase (editing is gated to surface)
    F.ws.send(J({ type: 'phase:set', workshopCode: code, phase: 'surface' }));
    await wait(300);

    const send = (a, blocks, known) => a.ws.send(J({ type: 'canvas:update', workshopCode: code, canvas: { blocks, arrows: [], orphans: [] }, knownIds: { blocks: known, arrows: [], orphans: [] } }));
    const blk = (id, text, x = 100, y = 100) => ({ id, type: 'phase', text, x, y, w: 170, h: 56 });
    const idsOn = a => (teamCanvas(a, TEAM) || { blocks: [] }).blocks.map(b => b.id);
    const blockOn = (a, id) => ((teamCanvas(a, TEAM) || { blocks: [] }).blocks.filter(b => b.id === id));

    // ---- 1. CONCURRENT ADD (cross-member): both add a distinct new block in the same tick ----
    console.log('\n— 1. concurrent add (both new blocks must survive) —');
    send(A, [blk('cc-A1', 'Ann adds A1')], []);      // new -> not in knownIds
    send(B, [blk('cc-B1', 'Bob adds B1')], []);      // new -> not in knownIds, same instant
    await wait(400);
    const after1 = idsOn(F);
    ok('1a: Ann’s new block survived', after1.includes('cc-A1'), after1);
    ok('1b: Bob’s new block survived (no cross-member wipe)', after1.includes('cc-B1'), after1);

    // ---- 2. SAME-BLOCK LWW: both edit the SAME existing block at once ----
    console.log('\n— 2. same-block contention (LWW, no corruption/dup) —');
    // seed X, let both members see it
    send(A, [blk('cc-A1', 'Ann adds A1'), blk('cc-B1', 'Bob adds B1'), blk('cc-X', 'seed X')], ['cc-A1']);
    await wait(350);
    const knownBoth = idsOn(A);                       // both members now know X (+ A1,B1)
    ok('2-pre: both members see block X', idsOn(A).includes('cc-X') && idsOn(B).includes('cc-X'));
    // near-simultaneous edits to X's text
    send(A, (teamCanvas(A, TEAM).blocks).map(b => b.id === 'cc-X' ? blk('cc-X', 'X-by-ANN', 120, 130) : b), idsOn(A));
    send(B, (teamCanvas(B, TEAM).blocks).map(b => b.id === 'cc-X' ? blk('cc-X', 'X-by-BOB', 400, 300) : b), idsOn(B));
    await wait(450);
    const xs = blockOn(F, 'cc-X');
    ok('2a: block X still exists exactly once (no duplicate, no loss)', xs.length === 1, xs.map(b => b.text));
    ok('2b: X resolved to one writer’s value (clean LWW, not corrupted/merged-garbage)', xs.length === 1 && ['X-by-ANN', 'X-by-BOB'].includes(xs[0].text), xs.map(b => b.text));
    ok('2c: X geometry is finite (not NaN/garbage from a torn merge)', xs.length === 1 && Number.isFinite(xs[0].x) && Number.isFinite(xs[0].y));

    // ---- 3. DELETE CROSSING: A deletes X, B deletes Y, simultaneously ----
    console.log('\n— 3. delete crossing (both deletes land, no resurrection) —');
    // seed Y alongside; both know X and Y
    send(A, (teamCanvas(A, TEAM).blocks).concat([blk('cc-Y', 'seed Y', 500, 400)]), idsOn(A));
    await wait(350);
    ok('3-pre: both see X and Y', idsOn(A).includes('cc-X') && idsOn(A).includes('cc-Y') && idsOn(B).includes('cc-Y'));
    const knA = idsOn(A), knB = idsOn(B);
    // A commits WITHOUT X (delete X), keeping Y; B commits WITHOUT Y (delete Y), keeping X
    send(A, teamCanvas(A, TEAM).blocks.filter(b => b.id !== 'cc-X'), knA);
    send(B, teamCanvas(B, TEAM).blocks.filter(b => b.id !== 'cc-Y'), knB);
    await wait(450);
    const after3 = idsOn(F);
    ok('3a: X deleted by Ann stays deleted', !after3.includes('cc-X'), after3);
    ok('3b: Y deleted by Bob stays deleted (delete crossing honored)', !after3.includes('cc-Y'), after3);

    // ---- 4. STALE-ADD MUST NOT RESURRECT a peer-deleted block ----
    console.log('\n— 4. stale echo cannot resurrect a deleted block —');
    // A adds Z and deletes nothing; everyone sees Z
    send(A, teamCanvas(A, TEAM).blocks.concat([blk('cc-Z', 'seed Z', 200, 200)]), idsOn(A));
    await wait(350);
    const knownWithZ = idsOn(B);                      // B knows Z now
    // A deletes Z (server drops it)
    send(A, teamCanvas(A, TEAM).blocks.filter(b => b.id !== 'cc-Z'), idsOn(A));
    await wait(350);
    ok('4-pre: Z is deleted on the server', !idsOn(F).includes('cc-Z'));
    // B, on STALE state, commits a canvas that STILL contains Z, with Z in knownIds
    // merge rule: incoming present + not-on-server + in-knownIds -> SKIP (no resurrection)
    B.ws.send(J({ type: 'canvas:update', workshopCode: code,
      canvas: { blocks: [blk('cc-A1', 'Ann adds A1'), blk('cc-Z', 'STALE Z from Bob', 200, 200)], arrows: [], orphans: [] },
      knownIds: { blocks: knownWithZ, arrows: [], orphans: [] } }));
    await wait(450);
    ok('4a: Bob’s stale echo did NOT resurrect the deleted Z', !idsOn(F).includes('cc-Z'), idsOn(F));

    // ---- 5. RESPONSIVE after the contention storm ----
    console.log('\n— 5. server responsive after contention —');
    const t0 = Date.now();
    await new Promise((res) => { const h = d => { const m = JSON.parse(d); if (m.type === 'pong') { F.ws.off('message', h); res(); } }; F.ws.on('message', h); F.ws.send(J({ type: 'ping', workshopCode: code })); });
    const rtt = Date.now() - t0;
    ok('5a: ping round-trip < 200ms after contention storm', rtt < 200, rtt + 'ms');

    [F, A, B].forEach(a => { try { a.ws.close(); } catch {} });
  } catch (e) {
    console.log('THREW:', e.message);
    fail++;
  } finally {
    try { srv.kill('SIGKILL'); } catch {}
  }
  console.log(`\nCONCURRENT ${fail ? '❌' : '✅'} — ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
