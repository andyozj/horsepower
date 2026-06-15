/* Horsepower v0.2 — WS-level end-to-end contract test.
 * Drives a Farrier + two teams through the full state machine and asserts the
 * server invariants (locks, phase-gating, teardown, people-landing, amendments,
 * swap rotation, diff, graceful AI degradation). Run with the server up:
 *   PORT=3100 node server.js   &&   BASE=http://localhost:3100 node e2e.js
 */
const WebSocket = require('ws');
const BASE = process.env.BASE || 'http://localhost:3100';
const WSBASE = BASE.replace('http', 'ws');
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra != null ? '→ ' + JSON.stringify(extra) : ''); } }

const mk = () => new Promise(res => { const w = new WebSocket(WSBASE); w.on('open', () => res(w)); });

(async () => {
  console.log('\n— Epic 0: setup & join —');
  const r = await fetch(BASE + '/api/workshop', { method: 'POST' });
  const { code, hostKey } = await r.json();
  ok('host mints workshop + host code', code && code.length === 6 && hostKey && hostKey.length === 8, { code, hostKey });

  const fac = await mk(), a1 = await mk(), a2 = await mk(), b1 = await mk();
  const last = {};
  [['fac', fac], ['a1', a1], ['a2', a2], ['b1', b1]].forEach(([k, w]) => w.on('message', d => { const m = JSON.parse(d); last[k] = m; if (m.type === 'state') last[k + '_state'] = m.state; if (m.type === 'seated') last[k + '_seat'] = m; if (m.type === 'joined') last[k + '_joined'] = m; }));

  fac.send(JSON.stringify({ type: 'join', role: 'farrier', workshopCode: code, hostKey }));
  await wait(150);
  ok('farrier joins with host code', last.fac_joined && last.fac_joined.role === 'farrier');

  // wrong host key rejected
  const bad = await mk(); let badMsg; bad.on('message', d => badMsg = JSON.parse(d));
  bad.send(JSON.stringify({ type: 'join', role: 'farrier', workshopCode: code, hostKey: 'XXXX' }));
  await wait(150);
  ok('projected code alone never grants control (wrong host code rejected)', badMsg && badMsg.type === 'error');

  // members join + team picker (create / join)
  a1.send(JSON.stringify({ type: 'join', role: 'member', workshopCode: code, name: 'Alex' }));
  await wait(80);
  a1.send(JSON.stringify({ type: 'team:create', workshopCode: code, name: 'AP Squad', memberName: 'Alex' }));
  await wait(120);
  const teamAId = last.a1_seat && last.a1_seat.teamId;
  ok('member creates a team via picker', !!teamAId);
  a2.send(JSON.stringify({ type: 'join', role: 'member', workshopCode: code, name: 'Sam' }));
  await wait(80);
  a2.send(JSON.stringify({ type: 'team:join', workshopCode: code, teamId: teamAId, memberName: 'Sam' }));
  await wait(120);
  b1.send(JSON.stringify({ type: 'join', role: 'member', workshopCode: code, name: 'Bo' }));
  await wait(80);
  b1.send(JSON.stringify({ type: 'team:create', workshopCode: code, name: 'ETL Crew', memberName: 'Bo' }));
  await wait(150);
  const teamBId = last.b1_seat && last.b1_seat.teamId;
  const st0 = last.fac_state;
  ok('two teams formed, presence tracked', st0.teams.length === 2 && st0.teams.find(t => t.id === teamAId).members.length === 2, st0.teams.map(t => [t.name, t.members.length]));

  console.log('\n— Epic 1: Surface (capture) + governance + gate —');
  fac.send(JSON.stringify({ type: 'phase:set', workshopCode: code, phase: 'surface' }));
  await wait(120);
  ok('Farrier starts Surface', last.fac_state.state === 'surface');

  // capture edits rejected before surface? we're in surface now. Build a transfer-grade canvas for A.
  const apCanvas = {
    blocks: [
      { id: 'p1', type: 'persona', x: 60, y: 60, w: 170, h: 58, text: 'OpCo GM', meta: { capacity: 'accountable', why: 'signs off the plan' } },
      { id: 'tr', type: 'trigger', x: 60, y: 160, w: 180, h: 54, text: 'invoice arrives', meta: {} },
      { id: 'in', type: 'input', x: 60, y: 240, w: 150, h: 46, text: 'supplier invoice', meta: {} },
      { id: 'ph1', type: 'phase', x: 300, y: 60, w: 240, h: 120, text: 'Reconcile', meta: { why: 'invoices must match POs before payment' } },
      { id: 'm1', type: 'moment', x: 320, y: 110, w: 150, h: 50, text: 'match to PO', pain: true, meta: { phaseId: 'ph1' } },
      { id: 'it', type: 'intent', x: 600, y: 60, w: 230, h: 70, text: 'suppliers are paid on time so credit terms hold', meta: {} },
      { id: 'oc', type: 'outcome', x: 600, y: 170, w: 200, h: 62, text: 'credit terms kept', meta: {} }
    ], arrows: [{ id: 'ar1', from: 'tr', to: 'ph1' }], orphans: [], chat: [], glossary: [{ term: 'PO', meaning: 'purchase order' }]
  };
  a1.send(JSON.stringify({ type: 'canvas:update', workshopCode: code, canvas: apCanvas }));
  await wait(200);
  let teamA = last.fac_state.teams.find(t => t.id === teamAId);
  ok('canvas persists + governance computed', teamA.canvas.blocks.length === 7 && teamA.governance, teamA.governance && teamA.governance.gate);
  ok('Newcomer-check gate goes GREEN on a solid canvas', teamA.governance.gate.ready, teamA.governance.gate.checks.filter(c => !c.ok).map(c => c.label));
  ok('teardown pre-computed at gate-green', teamA.hasTeardown && teamA.teardown && teamA.teardown.people.length === 1, teamA.teardown && { people: teamA.teardown.people.length, candidates: teamA.teardown.candidateConstraints.length });

  // thin intent detection on team B (artifact intent)
  const etlCanvas = {
    blocks: [
      { id: 'bp1', type: 'persona', x: 60, y: 60, w: 170, h: 58, text: 'Analyst', meta: { capacity: 'contributes data they hold', why: 'pulls the numbers' } },
      { id: 'btr', type: 'trigger', x: 60, y: 160, w: 180, h: 54, text: 'month end', meta: {} },
      { id: 'bin', type: 'input', x: 60, y: 240, w: 150, h: 46, text: 'ledger export', meta: {} },
      { id: 'bph', type: 'phase', x: 300, y: 60, w: 240, h: 120, text: 'Collect', meta: {} },
      { id: 'bm', type: 'moment', x: 320, y: 110, w: 150, h: 50, text: 'chase submissions', pain: true, meta: { phaseId: 'bph' } },
      { id: 'bit', type: 'intent', x: 600, y: 60, w: 230, h: 70, text: 'a monthly report', meta: {} },
      { id: 'boc', type: 'outcome', x: 600, y: 170, w: 200, h: 62, text: 'report sent', meta: {} }
    ], arrows: [], orphans: [{ id: 'o1', text: 'someone validates upstream?' }], chat: [], glossary: []
  };
  b1.send(JSON.stringify({ type: 'canvas:update', workshopCode: code, canvas: etlCanvas }));
  await wait(200);
  let teamB = last.fac_state.teams.find(t => t.id === teamBId);
  ok('artifact intent flagged thin ("a report isn\'t a reason")', teamB.governance.thin.some(x => x.id === 'bit'), teamB.governance.thin);
  ok('unresolved orphan blocks the gate', !teamB.governance.gate.ready && teamB.governance.orphans === 1);

  console.log('\n— Epic 2/3: Swap + Rebuild —');
  // swap with the ring rotation
  fac.send(JSON.stringify({ type: 'phase:set', workshopCode: code, phase: 'rebuild' }));
  await wait(250);
  const stR = last.fac_state;
  ok('state → rebuild', stR.state === 'rebuild');
  const A = stR.teams.find(t => t.id === teamAId), B = stR.teams.find(t => t.id === teamBId);
  ok('ring rotation: no team gets its own', A.receivedFromTeamId !== teamAId && B.receivedFromTeamId !== teamBId && A.receivedFromTeamId !== B.receivedFromTeamId, { A: A.receivedFromTeamId, B: B.receivedFromTeamId });
  ok('locked blocks seeded on rebuild canvas (scrambled, no arrows)', A.redesign.canvas.blocks.some(b => b.locked) && (A.redesign.canvas.arrows || []).length === 0);
  // A received B's teardown → its locked intent is B's intent
  ok('teardown brief carries need/want', A.redesign.teardown.brief.need.intent !== '' && A.redesign.teardown.brief.want.outcome !== '');
  ok('people inventory delivered for human-landing', A.redesign.peopleLandings.length >= 1, A.redesign.peopleLandings.map(p => p.role));

  // tamper: client tries to overwrite a locked block + delete it
  const tampered = JSON.parse(JSON.stringify(A.redesign.canvas));
  const lockedBlock = tampered.blocks.find(b => b.locked);
  const lockedId = lockedBlock.id, lockedText = lockedBlock.text;
  lockedBlock.text = 'HACKED';                         // try to mutate locked text
  const idx = tampered.blocks.findIndex(b => b.id === lockedId);
  tampered.blocks.splice(idx, 1);                       // try to delete the lock
  tampered.blocks.push({ id: 'agent1', type: 'agent', x: 400, y: 300, w: 190, h: 64, text: 'auto-reconcile agent', meta: {} });
  a1.send(JSON.stringify({ type: 'redesign:update', workshopCode: code, redesign: { canvas: tampered } }));
  await wait(200);
  const A2 = last.fac_state.teams.find(t => t.id === teamAId);
  const survived = A2.redesign.canvas.blocks.find(b => b.id === lockedId);
  ok('locked block text is server-protected against tamper', survived && survived.text === lockedText, survived && survived.text);
  ok('locked block cannot be deleted by client', !!survived);
  ok('legit agent block accepted', A2.redesign.canvas.blocks.some(b => b.type === 'agent'));

  // canvas:update (surface) must be rejected during rebuild
  a1.send(JSON.stringify({ type: 'canvas:update', workshopCode: code, canvas: { blocks: [{ id: 'x', type: 'phase', x: 0, y: 0, w: 1, h: 1, text: 'SHOULD NOT APPLY' }] } }));
  await wait(150);
  const A3 = last.fac_state.teams.find(t => t.id === teamAId);
  ok('Surface edits rejected during Rebuild (phase-gating)', !A3.canvas.blocks.some(b => b.text === 'SHOULD NOT APPLY'));

  // people landing + filler rejection
  const personId = A3.redesign.peopleLandings[0].personId;
  a1.send(JSON.stringify({ type: 'people:land', workshopCode: code, personId, outcome: 'transforms', note: 'freed up for higher-value work' }));
  await wait(150);
  let A4 = last.fac_state.teams.find(t => t.id === teamAId);
  ok('"freed up for higher-value work" rejected', !A4.redesign.peopleLandings.find(p => p.personId === personId).outcome, last.a1 && last.a1.error);
  a1.send(JSON.stringify({ type: 'people:land', workshopCode: code, personId, outcome: 'transforms', note: 'owns the eval: reviews exceptions, sets the rules, audits misses' }));
  await wait(150);
  A4 = last.fac_state.teams.find(t => t.id === teamAId);
  ok('valid landing accepted', A4.redesign.peopleLandings.find(p => p.personId === personId).outcome === 'transforms');

  // assumption ledger
  a1.send(JSON.stringify({ type: 'assumption:add', workshopCode: code, text: 'presumably someone validates upstream' }));
  await wait(120);
  A4 = last.fac_state.teams.find(t => t.id === teamAId);
  ok('assumption logged', A4.redesign.assumptions.length === 1);

  // lock amendment flow
  a1.send(JSON.stringify({ type: 'lock:challenge', workshopCode: code, field: 'intent', reason: 'the captured intent is an artifact', proposed: 'the real decision behind it' }));
  await wait(120);
  A4 = last.fac_state.teams.find(t => t.id === teamAId);
  ok('lock challenge lands on Farrier console', A4.amendmentRequests.length === 1 && A4.amendmentRequests[0].status === 'pending');
  const reqId = A4.amendmentRequests[0].id;
  // member cannot self-approve (only farrier)
  a1.send(JSON.stringify({ type: 'lock:resolve', workshopCode: code, teamId: teamAId, id: reqId, approve: true }));
  await wait(120);
  A4 = last.fac_state.teams.find(t => t.id === teamAId);
  ok('member cannot resolve own amendment (not farrier)', A4.redesign.locked.intent !== 'the real decision behind it');
  fac.send(JSON.stringify({ type: 'lock:resolve', workshopCode: code, teamId: teamAId, id: reqId, approve: true }));
  await wait(150);
  A4 = last.fac_state.teams.find(t => t.id === teamAId);
  ok('Farrier approval amends the lock + logs it on the brief', A4.redesign.locked.intent === 'the real decision behind it' && A4.redesign.amendments.length === 1);
  ok('amended locked block updated on canvas', A4.redesign.canvas.blocks.some(b => b.locked && b.meta.lockField === 'intent' && b.text === 'the real decision behind it'));

  console.log('\n— Epic 4: Share + diff + export + reckoning —');
  fac.send(JSON.stringify({ type: 'phase:set', workshopCode: code, phase: 'share' }));
  await wait(150);
  ok('state → share', last.fac_state.state === 'share');
  // diff (rule-based, offline)
  const dr = await fetch(`${BASE}/api/diff/${code}/${teamAId}`);
  const diff = await dr.json();
  ok('rule-based diff renders "what died"', Array.isArray(diff.died) && diff.died.length > 0, diff.died);
  // assumption reckoning (original team B confirms A's assumption — A rebuilt B's? No: A rebuilt whoever A received. The ORIGINAL team resolves.)
  const aId = A4.redesign.assumptions[0].id;
  fac.send(JSON.stringify({ type: 'assumption:resolve', workshopCode: code, id: aId, status: 'busted' }));
  await wait(150);
  A4 = last.fac_state.teams.find(t => t.id === teamAId);
  ok('assumption reckoning flips status', A4.redesign.assumptions[0].status === 'busted');
  // present picker
  fac.send(JSON.stringify({ type: 'present:set', workshopCode: code, teamId: teamAId }));
  await wait(120);
  ok('Farrier picks presenting pair (room view)', last.fac_state.presentingPairId === teamAId);

  console.log('\n— Epic 6/7: Coach degradation + persistence guards —');
  const c = await fetch(BASE + '/api/coach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'surface', context: 'x', messages: [{ role: 'user', content: 'hi' }] }) });
  const cj = await c.json();
  ok('Coach degrades gracefully with NO key (200 + question bank, never blocks)', c.status === 200 && cj.degraded === true && typeof cj.reply === 'string', cj);

  // swap guard <2 teams
  const r2 = await fetch(BASE + '/api/workshop', { method: 'POST' }); const w2 = await r2.json();
  const f2 = await mk(); let f2msg; f2.on('message', d => { const m = JSON.parse(d); if (m.type === 'error') f2msg = m; });
  f2.send(JSON.stringify({ type: 'join', role: 'farrier', workshopCode: w2.code, hostKey: w2.hostKey }));
  await wait(100);
  f2.send(JSON.stringify({ type: 'phase:set', workshopCode: w2.code, phase: 'rebuild' }));
  await wait(150);
  ok('swap blocked with <2 teams', f2msg && /2 teams/.test(f2msg.error));

  // close
  fac.send(JSON.stringify({ type: 'phase:set', workshopCode: code, phase: 'closed' }));
  await wait(120);
  ok('Farrier closes the workshop', last.fac_state.state === 'closed');

  console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
