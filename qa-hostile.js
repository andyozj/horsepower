/* Horsepower — hostile-client / failure-mode suite (hardening A1–A16, design §16).
 * Fires the §16.1 hostile payloads, the §16.2 projection leak sweep, the §16.3
 * kill-and-restore drills (spawns ITS OWN server on PORT 3401 + temp DATA_DIR),
 * the §16.4 authorization matrix and the §16.5 reconnect storm.
 * Run with the main server up:
 *   PORT=3200 node server.js   &&   BASE=http://localhost:3200 node qa-hostile.js
 * NOTE: H17 deliberately drains the per-IP mint bucket — run this suite LAST
 * (or restart the server afterwards) if other suites follow on the same instance.
 */
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:3200';
const WSBASE = BASE.replace('http', 'ws');
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra != null ? '→ ' + JSON.stringify(extra) : ''); } }

function mk(base = WSBASE) {
  return new Promise((res, rej) => {
    const w = new WebSocket(base);
    w.on('open', () => res(w));
    w.on('error', rej);
  });
}
// actor: a socket that records the latest message of each type
async function actor(base = WSBASE) {
  const s = await mk(base);
  s.lastState = null; s.seat = null; s.joinedMsg = null; s.errors = [];
  s.on('message', d => {
    let m; try { m = JSON.parse(d); } catch { return; }
    if (m.type === 'state') s.lastState = m.state;
    if (m.type === 'seated') s.seat = m;
    if (m.type === 'joined') s.joinedMsg = m;
    if (m.type === 'error') s.errors.push(m.error);
  });
  s.on('error', () => {});
  return s;
}
function pingMs(sock) {
  return new Promise(res => {
    const t0 = Date.now();
    const h = d => { let m; try { m = JSON.parse(d); } catch { return; } if (m.type === 'pong') { sock.off('message', h); res(Date.now() - t0); } };
    sock.on('message', h);
    try { sock.send(JSON.stringify({ type: 'ping' })); } catch { res(99999); }
    setTimeout(() => { sock.off('message', h); res(99999); }, 3000);
  });
}
const J = o => JSON.stringify(o);
const teamOf = (st, id) => st && st.teams.find(t => t.id === id);

// transfer-grade fixture canvas (same shape e2e.js uses)
function fixtureCanvas(p, intentText) {
  return { blocks: [
    { id: p + 'p1', type: 'persona', x: 60, y: 60, w: 170, h: 58, text: p === 'a' ? 'OpCo GM' : 'Analyst', meta: { capacity: p === 'a' ? 'accountable' : 'contributes data they hold', why: 'pulls the numbers' } },
    { id: p + 'tr', type: 'trigger', x: 60, y: 160, w: 180, h: 54, text: 'invoice arrives', meta: {} },
    { id: p + 'in', type: 'input', x: 60, y: 240, w: 150, h: 46, text: 'supplier invoice', meta: {} },
    { id: p + 'ph', type: 'phase', x: 300, y: 60, w: 240, h: 120, text: 'Reconcile', meta: { why: 'invoices must match POs' } },
    { id: p + 'm1', type: 'moment', x: 320, y: 110, w: 150, h: 50, text: 'match to PO', pain: true, meta: { phaseId: p + 'ph' } },
    { id: p + 'it', type: 'intent', x: 600, y: 60, w: 230, h: 70, text: intentText || 'suppliers are paid on time so credit terms hold', meta: {} },
    { id: p + 'oc', type: 'outcome', x: 600, y: 170, w: 200, h: 62, text: 'credit terms kept', meta: {} }
  ], arrows: [{ id: p + 'ar1', from: p + 'tr', to: p + 'ph' }], orphans: [], chat: [], glossary: [] };
}

// mint + seat fac/a1/b1 (+a2 on team A), drive to surface with both canvases committed
async function setupRoom(base = BASE) {
  const wsb = base.replace('http', 'ws');
  const r = await fetch(base + '/api/workshop', { method: 'POST' });
  const { code, hostKey } = await r.json();
  const fac = await actor(wsb), a1 = await actor(wsb), a2 = await actor(wsb), b1 = await actor(wsb);
  fac.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey }));
  a1.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Alex' }));
  b1.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Bo' }));
  a2.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Sam' }));
  await wait(200);
  a1.send(J({ type: 'team:create', workshopCode: code, name: 'AP Squad', memberName: 'Alex' }));
  await wait(150);
  const teamAId = a1.seat.teamId;
  a2.send(J({ type: 'team:join', workshopCode: code, teamId: teamAId, memberName: 'Sam' }));
  b1.send(J({ type: 'team:create', workshopCode: code, name: 'ETL Crew', memberName: 'Bo' }));
  await wait(200);
  const teamBId = b1.seat.teamId;
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'surface' }));
  await wait(150);
  a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: fixtureCanvas('a') }));
  b1.send(J({ type: 'canvas:update', workshopCode: code, canvas: fixtureCanvas('b', 'a monthly report') }));
  await wait(250);
  return { code, hostKey, fac, a1, a2, b1, teamAId, teamBId };
}

(async () => {

  // ================================================================
  console.log('\n— §16.1 Hostile payloads —');
  // ================================================================
  const R = await setupRoom();
  const { code, hostKey, fac, a1, a2, b1, teamAId, teamBId } = R;

  // H1: 2000-block canvas → clamped to MAX_BLOCKS, loop stays responsive
  const flood2k = { blocks: Array.from({ length: 2000 }, (_, i) => ({ id: 'z' + i, type: 'moment', x: 0, y: 0, w: 50, h: 40, text: 'x' })), arrows: [], orphans: [] };
  a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: flood2k }));
  await wait(300);
  let tA = teamOf(fac.lastState, teamAId);
  ok('H1: 2000-block canvas clamped to <=300', tA.canvas.blocks.length <= 300, tA.canvas.blocks.length);
  ok('H1: server responsive after block flood (ping <200ms)', (await pingMs(b1)) < 200);
  a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: fixtureCanvas('a') })); // restore
  await wait(200);

  // H2: 300 KB frame → ws maxPayload closes the sender; fresh socket joins fine
  const fat = await actor();
  fat.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Fat' }));
  await wait(120);
  const fatClosed = new Promise(res => fat.on('close', c => res(c)));
  try { fat.send(J({ type: 'canvas:update', workshopCode: code, canvas: { blocks: [{ id: 'big', type: 'text', text: 'x'.repeat(300 * 1024) }] } })); } catch {}
  const closeCode = await Promise.race([fatClosed, wait(3000).then(() => 'noclose')]);
  ok('H2: 300KB frame closes the offending socket (1009)', closeCode !== 'noclose', closeCode);
  const fresh = await actor();
  fresh.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Fresh' }));
  await wait(150);
  ok('H2: fresh socket still joins fine after the oversize kill', fresh.joinedMsg && fresh.joinedMsg.role === 'member');
  ok('H2: server responsive (ping <200ms)', (await pingMs(fresh)) < 200);

  // H3: garbage geometry/type coercion
  const c3 = fixtureCanvas('a');
  c3.blocks.push({ id: 'g1', type: 'phase', x: NaN, y: '<style>', w: 1e9, h: -5, text: { a: 1 } });
  a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: c3 }));
  await wait(200);
  tA = teamOf(fac.lastState, teamAId);
  const g1 = tA.canvas.blocks.find(b => b.id === 'g1');
  ok('H3: NaN/string/huge geometry clamped to finite GEO bounds', g1 && Number.isFinite(g1.x) && Number.isFinite(g1.y) && g1.x >= -20000 && g1.y >= -20000 && g1.w <= 4000 && g1.h >= 10, g1 && { x: g1.x, y: g1.y, w: g1.w, h: g1.h });
  ok('H3: non-string text coerced to a string', g1 && typeof g1.text === 'string', g1 && typeof g1.text);

  // H4: unknown type dropped; smuggled keys / proto / lockField / huge why stripped
  const c4 = fixtureCanvas('a');
  c4.blocks.push({ id: 'wz', type: 'wizard', x: 0, y: 0, w: 50, h: 40, text: 'no' });
  c4.blocks.push({ id: 'ev', type: 'moment', x: 0, y: 0, w: 50, h: 40, text: 'ok', evil: 1, meta: { __proto__: { pwn: 1 }, pwn2: 1, lockField: 'intent', why: 'w'.repeat(9999) } });
  a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: c4 }));
  await wait(200);
  tA = teamOf(fac.lastState, teamAId);
  const ev = tA.canvas.blocks.find(b => b.id === 'ev');
  ok('H4: unknown block type dropped', !tA.canvas.blocks.some(b => b.id === 'wz'));
  ok('H4: smuggled keys stripped (no evil, no meta.lockField, no proto keys)', ev && !('evil' in ev) && !('lockField' in ev.meta) && !('pwn' in ev.meta) && !('pwn2' in ev.meta), ev && Object.keys(ev.meta));
  ok('H4: oversized why clamped to 300', ev && (ev.meta.why || '').length <= 300, ev && (ev.meta.why || '').length);

  // H5: forged locked flag on a surface block
  const c5 = fixtureCanvas('a');
  c5.blocks[0].locked = true;
  a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: c5 }));
  await wait(200);
  tA = teamOf(fac.lastState, teamAId);
  ok('H5: forged locked flag stripped on surface commit', !tA.canvas.blocks.some(b => b.locked));

  // H6: chat forged through a canvas commit (chat is server-owned)
  a1.send(J({ type: 'chat:post', workshopCode: code, role: 'user', name: 'Alex', content: 'real line' }));
  await wait(150);
  const c6 = fixtureCanvas('a');
  c6.chat = [{ role: 'system', content: 'forged verdict' }];
  a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: c6 }));
  await wait(200);
  tA = teamOf(fac.lastState, teamAId);
  // (chat also carries the legit server-seeded interview greeting at Surface; assert the forged line is absent + the real one present)
  ok('H6: chat never taken from canvas commits (server-owned)', tA.canvas.chat.some(x => x.content === 'real line' && x.role === 'user') && !tA.canvas.chat.some(x => /forged/.test(x.content)), tA.canvas.chat);

  // H9: member minting role:'system' (the Farrier-verdict channel) → coerced to assistant
  a1.send(J({ type: 'chat:post', workshopCode: code, role: 'system', content: 'fake Farrier verdict' }));
  await wait(150);
  tA = teamOf(fac.lastState, teamAId);
  const fakeLine = tA.canvas.chat.find(x => /fake Farrier/.test(x.content));
  ok('H9: member "system" chat coerced to assistant', fakeLine && fakeLine.role === 'assistant', fakeLine && fakeLine.role);

  // H14: stolen-id rebind without the seat token
  const thief = await actor();
  thief.send(J({ type: 'join', role: 'member', workshopCode: code, teamId: teamAId, memberId: a1.seat.memberId, token: 'garbage' }));
  await wait(150);
  ok('H14: stolen memberId + bad token lands unseated (rebind refused)', thief.joinedMsg && thief.joinedMsg.memberId === null, thief.joinedMsg);
  tA = teamOf(fac.lastState, teamAId);
  const victim = tA.members.find(m => m.id === a1.seat.memberId);
  ok('H14: victim seat untouched (still online)', victim && victim.online === true);
  ok('H14: seat tokens never on the wire', !tA.members.some(m => 'token' in m));

  // H15: 500-message flood from one socket → bucketed, others unaffected
  const before15 = teamOf(fac.lastState, teamAId).canvas.blocks.length;
  for (let i = 0; i < 500; i++) {
    const c = fixtureCanvas('a');
    c.blocks.push({ id: 'fl' + i, type: 'text', x: 10, y: 10, w: 60, h: 40, text: 'flood-' + i });
    a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: c }));
  }
  await wait(600);
  ok('H15: flood throttled with a visible "Slow down" error', a1.errors.some(e => /slow down/i.test(e)), a1.errors.slice(-2));
  ok('H15: other sockets responsive during flood (ping <200ms)', (await pingMs(b1)) < 200);
  tA = teamOf(fac.lastState, teamAId);
  ok('H15: an accepted flood commit is coherent (one flood block, fixture intact)', tA.canvas.blocks.filter(b => /^fl\d+$/.test(b.id)).length === 1 && tA.canvas.blocks.length === before15 + 1, tA.canvas.blocks.length);
  await wait(2000); // bucket refill before honest restore
  a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: fixtureCanvas('a') }));
  await wait(250);

  // ---- rebuild-phase attacks ----
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'rebuild' }));
  await wait(300);
  let A = teamOf(fac.lastState, teamAId);
  ok('setup: swap done, locked blocks seeded', fac.lastState.state === 'rebuild' && A.redesign.canvas.blocks.some(b => b.locked));

  // H7: the eng#5 mass-assignment bypass (peopleLandings / assumptions / locked / teardown)
  const pid = A.redesign.peopleLandings[0].personId;
  const lockedIntentBefore = A.redesign.locked.intent;
  a1.send(J({ type: 'redesign:update', workshopCode: code, redesign: {
    peopleLandings: [{ personId: pid, outcome: 'removed', note: 'freed up for higher-value work' }],
    assumptions: [{ id: 'x', text: 'self-confirmed', status: 'confirmed' }],
    locked: { intent: 'HACK' }, teardown: null, amendments: [{ field: 'intent', from: 'x', to: 'HACK' }]
  } }));
  await wait(200);
  A = teamOf(fac.lastState, teamAId);
  ok('H7: peopleLandings bypass dead (outcome still null)', A.redesign.peopleLandings.find(p => p.personId === pid).outcome === null, A.redesign.peopleLandings[0]);
  ok('H7: assumptions bypass dead', (A.redesign.assumptions || []).length === 0);
  ok('H7: locked.intent untouched by mass-assign', A.redesign.locked.intent === lockedIntentBefore, A.redesign.locked.intent);
  ok('H7: teardown not nullable by client', !!A.redesign.teardown);
  ok('H7: amendments not client-writable', (A.redesign.amendments || []).length === 0);

  // H8: forged locked flag on a non-locked rebuild block
  const c8 = JSON.parse(JSON.stringify(A.redesign.canvas));
  c8.blocks.push({ id: 'fakelock', type: 'agent', x: 400, y: 300, w: 190, h: 64, text: 'I claim to be locked', locked: true, meta: { lockField: 'intent' } });
  a1.send(J({ type: 'redesign:update', workshopCode: code, redesign: { canvas: c8 } }));
  await wait(200);
  A = teamOf(fac.lastState, teamAId);
  const fk = A.redesign.canvas.blocks.find(b => b.id === 'fakelock');
  ok('H8: forged lock flag stripped in rebuild', fk && !fk.locked && !(fk.meta || {}).lockField, fk && { locked: fk.locked, meta: fk.meta });

  // H10: bogus challenge fields bounce
  const reqsBefore = (A.amendmentRequests || []).length;
  a1.send(J({ type: 'lock:challenge', workshopCode: code, field: '__proto__', reason: 'r', proposed: 'p' }));
  a1.send(J({ type: 'lock:challenge', workshopCode: code, field: 'personas', reason: 'r', proposed: 'p' }));
  await wait(200);
  A = teamOf(fac.lastState, teamAId);
  ok('H10: __proto__/personas challenge fields rejected with an error', a1.errors.filter(e => /unknown locked field/i.test(e)).length === 2, a1.errors.slice(-2));
  ok('H10: amendmentRequests unchanged', (A.amendmentRequests || []).length === reqsBefore);

  // H11: valid persona challenge → array-safe amendment
  const personaBlk = A.redesign.canvas.blocks.find(b => b.locked && b.meta.lockField === 'persona');
  a1.send(J({ type: 'lock:challenge', workshopCode: code, field: 'persona', blockId: personaBlk.id, reason: 'role is mislabeled', proposed: 'Senior Analyst' }));
  await wait(200);
  A = teamOf(fac.lastState, teamAId);
  const pReq = A.amendmentRequests.find(r => r.field === 'persona' && r.status === 'pending');
  fac.send(J({ type: 'lock:resolve', workshopCode: code, teamId: teamAId, id: pReq.id, approve: true }));
  await wait(200);
  A = teamOf(fac.lastState, teamAId);
  ok('H11: locked.personas is STILL an array after persona amendment', Array.isArray(A.redesign.locked.personas), typeof A.redesign.locked.personas);
  ok('H11: targeted persona entry + canvas block updated', A.redesign.locked.personas.some(p => p.text === 'Senior Analyst') && A.redesign.canvas.blocks.find(b => b.id === personaBlk.id).text === 'Senior Analyst');

  // H12 (rebuild half): assumption self-adjudication blocked outside share
  a1.send(J({ type: 'assumption:add', workshopCode: code, text: 'presumably someone validates upstream' }));
  await wait(150);
  A = teamOf(fac.lastState, teamAId);
  const asId = A.redesign.assumptions[0].id;
  a1.send(J({ type: 'assumption:resolve', workshopCode: code, id: asId, status: 'confirmed' }));
  fac.send(J({ type: 'assumption:resolve', workshopCode: code, id: asId, status: 'confirmed' }));
  await wait(200);
  A = teamOf(fac.lastState, teamAId);
  ok('H12: assumption:resolve refused during rebuild (even for the Farrier)', A.redesign.assumptions[0].status === 'open', A.redesign.assumptions[0].status);

  // ---- share-phase: who may adjudicate ----
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'share' }));
  await wait(250);
  a1.send(J({ type: 'assumption:resolve', workshopCode: code, id: asId, status: 'confirmed' })); // rebuilder self-confirm
  await wait(200);
  A = teamOf(fac.lastState, teamAId);
  ok('H12: rebuilding team cannot self-confirm at share', A.redesign.assumptions[0].status === 'open', A.redesign.assumptions[0].status);
  b1.send(J({ type: 'assumption:resolve', workshopCode: code, id: asId, status: 'confirmed' })); // original team
  await wait(200);
  A = teamOf(fac.lastState, teamAId);
  ok('H12: ORIGINAL team adjudicates at share', A.redesign.assumptions[0].status === 'confirmed');
  fac.send(J({ type: 'assumption:resolve', workshopCode: code, id: asId, status: 'busted' })); // farrier override
  await wait(200);
  A = teamOf(fac.lastState, teamAId);
  ok('H12: Farrier adjudication works at share', A.redesign.assumptions[0].status === 'busted');

  // H13: hostKey brute-force strikes
  const brute = await actor();
  const bruteClosed = new Promise(res => brute.on('close', () => res(true)));
  for (let i = 0; i < 3; i++) { brute.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey: 'WRONGKEY' })); await wait(120); }
  const dead = await Promise.race([bruteClosed, wait(2000).then(() => false)]);
  ok('H13: wrong host code gets an error, not a seat', brute.errors.length >= 2 && brute.errors.every(e => /wrong host code/i.test(e)), brute.errors);
  ok('H13: socket terminated after 3 strikes', dead === true);
  const cohost = await actor();
  cohost.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey }));
  await wait(150);
  ok('H13: the real key still seats a farrier on a new socket', cohost.joinedMsg && cohost.joinedMsg.role === 'farrier');

  // H16: coach proxy — bank path free, never an error, clamped
  let coachTimes = [];
  let coachOk = true;
  for (let i = 0; i < 20; i++) {
    const t0 = Date.now();
    const cr = await fetch(BASE + '/api/coach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: J({ mode: 'surface', code: i % 2 ? code : undefined, messages: [{ role: 'user', content: 'hi' }] }) });
    coachTimes.push(Date.now() - t0);
    const cj = await cr.json();
    if (cr.status !== 200 || typeof cj.reply !== 'string' || cj.reply.length > 1200) coachOk = false;
  }
  coachTimes.sort((a, b) => a - b);
  ok('H16: 20 rapid coach posts all 200 + clamped reply', coachOk);
  ok('H16: bank path is fast (median <200ms)', coachTimes[10] < 200, coachTimes[10]);

  // H18 (S1 crash class): a JSON {"toString":"x"} (non-callable) makes String(obj) THROW.
  // With no try/catch around the WS switch, ONE 40-byte unauth frame would kill the whole process
  // (every room). Fire the worst offenders; assert the server is STILL ALIVE + responsive after each.
  {
    // S1a — unauthenticated: ping with an object workshopCode (resolved before the switch)
    const ghost = await actor();
    ghost.send(J({ type: 'ping', workshopCode: { toString: 'NOTAFUNC' } }));
    await wait(120);
    ok('H18a: unauth object-workshopCode ping does NOT crash the server', (await pingMs(b1)) < 300, 'server dead?');

    // S1c — R1/R2 handlers: object-valued text/aha defeats String(obj || '')
    fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'share' })); await wait(150);
    a1.send(J({ type: 'commitment:submit', workshopCode: code, text: { toString: 'boom' } })); await wait(120);
    ok('H18b: commitment:submit object text does NOT crash', (await pingMs(b1)) < 300, 'server dead?');
    a1.send(J({ type: 'pulse:submit', workshopCode: code, aha: { valueOf: 'boom' }, confBefore: { toString: 'x' }, confAfter: 3 })); await wait(120);
    ok('H18c: pulse:submit object aha/slider does NOT crash', (await pingMs(b1)) < 300, 'server dead?');

    // S1d — chat:post: object-valued content (str())
    a1.send(J({ type: 'chat:post', workshopCode: code, content: { toString: 'boom' } })); await wait(120);
    ok('H18d: chat:post object content does NOT crash', (await pingMs(b1)) < 300, 'server dead?');

    // S1e — the sanitize choke point: object-valued block text via canvas:update (str())
    const ce = fixtureCanvas('a');
    ce.blocks.push({ id: 'boom', type: 'phase', x: 10, y: 10, w: 100, h: 50, text: { toString: 'pwn' } });
    a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: ce })); await wait(150);
    ok('H18e: object-valued block text (str()) does NOT crash', (await pingMs(b1)) < 300, 'server dead?');

    // and a member can STILL transact normally afterwards (no corruption)
    a1.send(J({ type: 'commitment:submit', workshopCode: code, text: 'a real commitment' })); await wait(150);
    const mm = (teamOf(fac.lastState, teamAId).members || []).find(m => m.id === a1.seat.memberId);
    ok('H18f: server fully functional after the crash-class barrage', mm && mm.commitment && mm.commitment.text === 'a real commitment', mm && mm.commitment);
    try { ghost.terminate(); } catch {}
    // restore surface fixture + share-state hygiene is fine (suite tears down per-section)
  }

  // (H17 mint-flood lives AFTER the other main-server sections — it drains the per-IP
  //  mint bucket, so it must not starve the setupRoom() calls in §16.2/16.4/16.5.)

  [fac, a1, a2, b1, fresh, thief, brute, cohost].forEach(s => { try { s.terminate(); } catch {} });

  // ================================================================
  console.log('\n— §16.2 Projection leak sweep (member wire = devtools) —');
  // ================================================================
  {
    const S = await setupRoom();
    const sa = S.a1.lastState;
    const otherS = teamOf(sa, S.teamBId), ownS = teamOf(sa, S.teamAId);
    ok('LEAK surface: other team is a STUB (exact key set)', otherS && Object.keys(otherS).sort().join() === ['id', 'name', 'members', 'gateGreen', 'hasTeardown'].sort().join(), otherS && Object.keys(otherS));
    ok('LEAK surface: no canvas/teardown/redesign/governance on other team', !('canvas' in otherS) && !('teardown' in otherS) && !('redesign' in otherS) && !('governance' in otherS));
    // Batch 2: the teamPublic member-map widening (commitment/pulse) must be NULL pre-reveal — server-gated to share/closed.
    ok('LEAK surface (B2): commitment/pulse null on pre-reveal members (own + other team)',
      (otherS.members || []).every(m => m.commitment == null && m.pulse == null) && (ownS.members || []).every(m => m.commitment == null && m.pulse == null),
      { other: (otherS.members || []).map(m => [m.commitment, m.pulse]), own: (ownS.members || []).map(m => [m.commitment, m.pulse]) });
    ok('LEAK surface: own team full but own teardown withheld (no self-spoiler)', ownS.canvas && ownS.governance && ownS.teardown === null && ownS.hasTeardown === true, { hasTeardown: ownS.hasTeardown });
    // unseated socket: stubs everywhere
    const lurker = await actor();
    lurker.send(J({ type: 'join', role: 'member', workshopCode: S.code, name: 'Lurk' }));
    await wait(150);
    ok('LEAK surface: unseated socket gets stubs for EVERY team', lurker.joinedMsg.state.teams.every(t => !('canvas' in t) && !('teardown' in t)), lurker.joinedMsg.state.teams.map(t => Object.keys(t).length));

    S.fac.send(J({ type: 'phase:set', workshopCode: S.code, phase: 'rebuild' }));
    await wait(300);
    const sr = S.a1.lastState;
    const ownR = teamOf(sr, S.teamAId), otherR = teamOf(sr, S.teamBId);
    ok('LEAK rebuild: own redesign + received teardown + receivedFromTeamName on the wire', ownR.redesign && ownR.redesign.teardown && ownR.receivedFromTeamName === 'ETL Crew');
    ok('LEAK rebuild: own teardown still withheld', ownR.teardown === null);
    ok('LEAK rebuild: hidden original is hidden ON THE WIRE (other team still stub)', !('canvas' in otherR) && !('redesign' in otherR) && !('receivedFromTeamId' in otherR), Object.keys(otherR));
    ok('LEAK rebuild: original\'s block ids never reach the rebuilder\'s wire', !JSON.stringify(sr.teams.map(t => t.id === S.teamAId ? null : t)).includes('"bph"'));
    ok('LEAK rebuild: farrier keeps the FULL state (brief preview)', S.fac.lastState.teams.every(t => t.canvas) && !!teamOf(S.fac.lastState, S.teamAId).teardown);

    S.fac.send(J({ type: 'phase:set', workshopCode: S.code, phase: 'share' }));
    await wait(300);
    const ss = S.a1.lastState;
    const reb = teamOf(ss, S.teamAId), orig = teamOf(ss, S.teamBId);
    ok('LEAK share: double reveal opens the wire (rebuilder redesign + original canvas)', reb.redesign && reb.redesign.canvas && orig.canvas && orig.canvas.blocks.length > 0);
    [S.fac, S.a1, S.a2, S.b1, lurker].forEach(s => { try { s.terminate(); } catch {} });
  }

  // ================================================================
  console.log('\n— §16.4 Authorization matrix (member + pre-join sockets) —');
  // ================================================================
  {
    const M = await setupRoom();
    M.fac.send(J({ type: 'phase:set', workshopCode: M.code, phase: 'rebuild' }));
    await wait(300);
    // a pending amendment for the lock:resolve probes
    M.a1.send(J({ type: 'lock:challenge', workshopCode: M.code, field: 'intent', reason: 'r', proposed: 'probe-proposal' }));
    await wait(200);
    const pend = teamOf(M.fac.lastState, M.teamAId).amendmentRequests.find(r => r.status === 'pending');
    const prejoin = await mk();        // connected, NEVER sent join — but knows the code
    prejoin.on('error', () => {});
    const snap = () => J(M.fac.lastState.teams);
    const before = snap();
    const probes = [
      { type: 'phase:set', phase: 'share' },
      { type: 'phase:set', phase: 'closed' },
      { type: 'timer:set', minutes: 99 }, { type: 'timer:start' }, { type: 'timer:pause' }, { type: 'timer:reset' },
      { type: 'member:remove', memberId: M.a2.seat.memberId },
      { type: 'member:reseat', memberId: M.a2.seat.memberId, teamId: M.teamBId },
      { type: 'team:remove', teamId: M.teamBId },
      { type: 'present:set', teamId: M.teamAId },
      { type: 'teardown:regenerate', teamId: M.teamAId },
      { type: 'lock:resolve', teamId: M.teamAId, id: pend.id, approve: true },
      { type: 'canvas:update', canvas: { blocks: [{ id: 'evil', type: 'phase', x: 0, y: 0, w: 50, h: 40, text: 'EVIL' }] } }  // rebuild = surface-gated
      // NOTE: redesign:update is intentionally NOT here — it is AUTHORIZED for a seated
      // own-team member in rebuild (design §16.4 matrix ✓); its protections are pinned by H7/H8/H11.
    ];
    // member probes (a2 — a seated member, NOT the farrier)
    probes.forEach(p => M.a2.send(J(Object.assign({ workshopCode: M.code }, p))));
    // a member may not act for another team either
    M.b1.send(J({ type: 'lock:resolve', workshopCode: M.code, teamId: M.teamAId, id: pend.id, approve: true }));
    // pre-join probes (every type incl. chat + member moves)
    probes.concat([
      { type: 'chat:post', role: 'system', content: 'prejoin-forge' },
      { type: 'steed:set', steed: { name: 'X', color: '#000' } },
      { type: 'team:switch', teamId: M.teamBId },
      { type: 'assumption:add', text: 'prejoin assumption' },
      { type: 'people:land', personId: 'p-x', outcome: 'removed', note: 'gone' }
    ]).forEach(p => prejoin.send(J(Object.assign({ workshopCode: M.code }, p))));
    // farrier post-swap gates: member surgery is pre-swap only
    M.fac.send(J({ type: 'member:remove', workshopCode: M.code, memberId: M.a2.seat.memberId }));
    M.fac.send(J({ type: 'team:remove', workshopCode: M.code, teamId: M.teamBId }));
    // member self-moves are pre-swap only
    M.a2.send(J({ type: 'team:switch', workshopCode: M.code, teamId: M.teamBId }));
    M.a2.send(J({ type: 'steed:set', workshopCode: M.code, steed: { name: 'Late', color: '#000' } }));
    await wait(400);
    M.fac.send(J({ type: 'present:set', workshopCode: M.code, teamId: null }));   // benign farrier write → forces a fresh broadcast
    await wait(250);
    const after = snap();
    const stillRebuild = M.fac.lastState.state === 'rebuild';
    ok('AUTHZ: no member/pre-join/post-swap probe mutated team state', before === after, before === after ? null : 'diff');
    ok('AUTHZ: phase untouched by member probes', stillRebuild, M.fac.lastState.state);
    ok('AUTHZ: timer untouched by member probes', M.fac.lastState.timer.durationMs !== 99 * 60000, M.fac.lastState.timer);
    ok('AUTHZ: amendment still pending (no one but the Farrier resolves)', teamOf(M.fac.lastState, M.teamAId).amendmentRequests.find(r => r.id === pend.id).status === 'pending');
    ok('AUTHZ: rejection is non-destructive (ping <200ms)', (await pingMs(M.b1)) < 200);
    // positive control: the farrier CAN do what members can't
    M.fac.send(J({ type: 'lock:resolve', workshopCode: M.code, teamId: M.teamAId, id: pend.id, approve: true }));
    await wait(200);
    ok('AUTHZ: farrier positive control (resolve works)', teamOf(M.fac.lastState, M.teamAId).redesign.locked.intent === 'probe-proposal');
    [M.fac, M.a1, M.a2, M.b1].forEach(s => { try { s.terminate(); } catch {} });
    try { prejoin.terminate(); } catch {}
  }

  // ================================================================
  console.log('\n— §16.5 Reconnect / presence storm —');
  // ================================================================
  {
    const S = await setupRoom();
    const N = 12;
    const humans = [];
    for (let i = 0; i < N; i++) {
      const s = await actor();
      const teamId = i % 2 ? S.teamBId : S.teamAId;
      s.send(J({ type: 'join', role: 'member', workshopCode: S.code, name: 'H' + i }));
      await wait(40);
      s.send(J({ type: 'team:join', workshopCode: S.code, teamId, memberName: 'H' + i }));
      await wait(60);
      humans.push({ i, teamId, sock: s, memberId: s.seat.memberId, token: s.seat.token });
    }
    const baseCount = teamOf(S.fac.lastState, S.teamAId).members.length + teamOf(S.fac.lastState, S.teamBId).members.length;
    for (let cycle = 0; cycle < 10; cycle++) {
      humans.forEach(h => { try { h.sock.terminate(); } catch {} });
      await wait(180);                          // server marks offline on close
      for (const h of humans) {
        h.sock = await actor();
        if (h.i % 2 === 0) {                    // half: token rebind via join
          h.sock.send(J({ type: 'join', role: 'member', workshopCode: S.code, teamId: h.teamId, memberId: h.memberId, token: h.token }));
        } else {                                // half: reclaim mid-team:join (token rotates)
          h.sock.send(J({ type: 'join', role: 'member', workshopCode: S.code, name: 'H' + h.i }));
        }
      }
      await wait(150);
      for (const h of humans) {
        if (h.i % 2 !== 0) h.sock.send(J({ type: 'team:join', workshopCode: S.code, teamId: h.teamId, reclaimMemberId: h.memberId, memberName: 'H' + h.i }));
      }
      await wait(250);
      humans.forEach(h => { if (h.sock.seat && h.sock.seat.token) h.token = h.sock.seat.token; });
    }
    const st = S.fac.lastState;
    const all = teamOf(st, S.teamAId).members.concat(teamOf(st, S.teamBId).members);
    ok('STORM: no ghost rows after 10 disconnect/reclaim cycles', all.length === baseCount, { now: all.length, base: baseCount });
    ok('STORM: every human holds exactly ONE row, rebound to the same id', humans.every(h => all.filter(m => m.id === h.memberId).length === 1));
    ok('STORM: presence settled (all stormers online)', humans.every(h => all.find(m => m.id === h.memberId).online === true));
    ok('STORM: server healthy + responsive after the storm', (await fetch(BASE + '/api/health')).status === 200 && (await pingMs(S.fac)) < 200);
    [S.fac, S.a1, S.a2, S.b1].forEach(s => { try { s.terminate(); } catch {} });
    humans.forEach(h => { try { h.sock.terminate(); } catch {} });
  }

  // ================================================================
  console.log('\n— §16.1 H17: mint-flood throttle (drains the per-IP bucket — runs last on the main server) —');
  // ================================================================
  {
    const probe = await actor();
    let minted = 0, throttled = 0, capped = 0, lastCode = null;
    for (let i = 0; i < 80; i++) {
      const mr = await fetch(BASE + '/api/workshop', { method: 'POST' });
      if (mr.status === 200) { minted++; lastCode = (await mr.json()).code; }
      else if (mr.status === 429) throttled++;          // per-IP rate limit
      else if (mr.status === 503) capped++;             // MAX_WORKSHOPS server cap (also a hardening guard)
    }
    // the rate limit MUST fire (429s); every request gets a guarded answer (200/429/503), none crash
    ok('H17: mint flood throttled (some minted, rate-limit 429s fire, all 80 guarded)',
      minted >= 1 && throttled >= 5 && minted + throttled + capped === 80, { minted, throttled, capped });
    const gr = await fetch(BASE + '/api/workshop/' + lastCode);
    ok('H17: a minted code still resolves after the flood', gr.status === 200);
    ok('H17: server responsive after mint flood (ping <200ms)', (await pingMs(probe)) < 200);
    try { probe.terminate(); } catch {}
  }

  // ================================================================
  console.log('\n— §16.3 Kill-and-restore (own server, PORT 3401, temp DATA_DIR) —');
  // ================================================================
  {
    const PORT2 = 3401, BASE2 = `http://localhost:${PORT2}`;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-hostile-'));
    const dataFile = path.join(tmpDir, 'workshops.json');
    let proc = null;
    const boot = async () => {
      proc = spawn(process.execPath, [path.join(__dirname, 'server.js')], { env: Object.assign({}, process.env, { PORT: String(PORT2), DATA_DIR: tmpDir }), stdio: 'ignore' });
      for (let i = 0; i < 60; i++) { await wait(120); try { const h = await fetch(BASE2 + '/api/health'); if (h.ok) return; } catch {} }
      throw new Error('spawned server never came up');
    };
    const killHard = async () => { proc.kill('SIGKILL'); await wait(300); };

    await boot();
    const K = await setupRoom(BASE2);
    K.fac.send(J({ type: 'phase:set', workshopCode: K.code, phase: 'rebuild' }));
    await wait(300);
    let KA = teamOf(K.fac.lastState, K.teamAId);
    const lockedBlk = KA.redesign.canvas.blocks.find(b => b.locked);
    // one redesign edit + one landing
    const kc = JSON.parse(J(KA.redesign.canvas));
    kc.blocks.push({ id: 'agent1', type: 'agent', x: 400, y: 300, w: 190, h: 64, text: 'auto-reconcile agent', meta: {} });
    K.a1.send(J({ type: 'redesign:update', workshopCode: K.code, redesign: { canvas: kc } }));
    await wait(150);
    const kpid = KA.redesign.peopleLandings[0].personId;
    K.a1.send(J({ type: 'people:land', workshopCode: K.code, personId: kpid, outcome: 'transforms', note: 'owns the eval: reviews exceptions, sets the rules' }));
    await wait(700);                             // debounce 400 + margin → saveNow ran
    [K.fac, K.a1, K.a2, K.b1].forEach(s => { try { s.terminate(); } catch {} });

    // (a) clean SIGKILL → restore
    await killHard();
    await boot();
    const fac2 = await actor(BASE2.replace('http', 'ws'));
    fac2.send(J({ type: 'join', role: 'farrier', workshopCode: K.code, hostKey: K.hostKey }));
    await wait(250);
    const rs = fac2.joinedMsg && fac2.joinedMsg.state;
    const rsA = rs && teamOf(rs, K.teamAId);
    ok('RESTORE(a): SIGKILL + restart restores the workshop in rebuild', rs && rs.state === 'rebuild' && rs.teams.length === 2, rs && rs.state);
    ok('RESTORE(a): redesign edit + human landing survived the crash', rsA && rsA.redesign.canvas.blocks.some(b => b.id === 'agent1') && rsA.redesign.peopleLandings.find(p => p.personId === kpid).outcome === 'transforms');
    // locked tamper still rejected after restore
    const a1b = await actor(BASE2.replace('http', 'ws'));
    a1b.send(J({ type: 'join', role: 'member', workshopCode: K.code, teamId: K.teamAId, memberId: K.a1.seat.memberId, token: K.a1.seat.token }));
    await wait(200);
    ok('RESTORE(a): seat token survives the restart (rebind works)', a1b.joinedMsg && a1b.joinedMsg.memberId === K.a1.seat.memberId);
    const tc = JSON.parse(J(rsA.redesign.canvas));
    tc.blocks.find(b => b.id === lockedBlk.id).text = 'HACKED-AFTER-RESTORE';
    a1b.send(J({ type: 'redesign:update', workshopCode: K.code, redesign: { canvas: tc } }));
    await wait(250);
    const rsA2 = teamOf(fac2.lastState, K.teamAId);
    ok('RESTORE(a): lock protection intact after restore', rsA2.redesign.canvas.blocks.find(b => b.id === lockedBlk.id).text === lockedBlk.text);
    await wait(700);                             // let the tamper-broadcast save complete (fresh .bak pair)

    // (b) torn write → .bak fallback
    try { fac2.terminate(); a1b.terminate(); } catch {}
    await killHard();
    const buf = fs.readFileSync(dataFile);
    fs.writeFileSync(dataFile, buf.slice(0, Math.floor(buf.length / 2)));   // simulate mid-write truncation
    await boot();
    const gb = await fetch(`${BASE2}/api/workshop/${K.code}`);
    const gbj = gb.ok ? await gb.json() : null;
    ok('RESTORE(b): torn workshops.json falls back to .bak (workshop alive)', gb.ok && gbj.code === K.code && gbj.teams.length === 2, gbj);

    // (c) flush-on-signal: edit inside the debounce window, SIGTERM, restart
    const fac3 = await actor(BASE2.replace('http', 'ws'));
    fac3.send(J({ type: 'join', role: 'farrier', workshopCode: K.code, hostKey: K.hostKey }));
    await wait(200);
    const a1c = await actor(BASE2.replace('http', 'ws'));
    a1c.send(J({ type: 'join', role: 'member', workshopCode: K.code, teamId: K.teamAId, memberId: K.a1.seat.memberId, token: K.a1.seat.token }));
    await wait(200);
    a1c.send(J({ type: 'assumption:add', workshopCode: K.code, text: 'flush-me: written 100ms before SIGTERM' }));
    await wait(150);                             // processed + broadcast, still inside the 400ms debounce
    proc.kill('SIGTERM');
    await wait(800);                             // shutdown() flushes saveNow then exits
    await boot();
    const gc = await fetch(`${BASE2}/api/workshop/${K.code}`);
    ok('RESTORE(c): server restarts clean after SIGTERM', gc.ok);
    const fac4 = await actor(BASE2.replace('http', 'ws'));
    fac4.send(J({ type: 'join', role: 'farrier', workshopCode: K.code, hostKey: K.hostKey }));
    await wait(250);
    const fA = teamOf(fac4.joinedMsg.state, K.teamAId);
    ok('RESTORE(c): SIGTERM flushed the debounce window (edit survived)', fA && (fA.redesign.assumptions || []).some(x => /flush-me/.test(x.text)), fA && fA.redesign.assumptions);
    [fac3, a1c, fac4].forEach(s => { try { s.terminate(); } catch {} });
    proc.kill('SIGKILL');
    await wait(200);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }

  console.log(`\n${fail === 0 ? '✅ HOSTILE SUITE ALL PASS' : '❌ FAILURES'} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
