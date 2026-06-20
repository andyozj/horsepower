/* Horsepower — Batch 1 (R4 capture-enrichment · R5 instant-synthesis · R7 Farrier whisper).
 * WS/REST contract checks for the new product-track features. Matches the qa-fixcheck/
 * qa-hostile harness idiom (ok(name, cond)). Run with the main server up:
 *   PORT=3200 node server.js   &&   BASE=http://localhost:3200 node qa-batch1.js
 * The R5 LIVE-AI path needs a key (none in CI) — those checks assert the offline/degraded
 * (rule-based fallback / honest-absence) path and the gating, NOT live AI quality.
 */
const WebSocket = require('ws');
const BASE = process.env.BASE || 'http://localhost:3200';
const WSBASE = BASE.replace('http', 'ws');
const J = o => JSON.stringify(o);
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra != null ? '→ ' + JSON.stringify(extra) : ''); } }

function mk(base = WSBASE) { return new Promise((res, rej) => { const w = new WebSocket(base); w.on('open', () => res(w)); w.on('error', rej); }); }
async function actor(base = WSBASE) {
  const s = await mk(base);
  s.lastState = null; s.seat = null; s.errors = [];
  s.on('message', d => { let m; try { m = JSON.parse(d); } catch { return; }
    if (m.type === 'state') s.lastState = m.state;
    if (m.type === 'seated') s.seat = m;
    if (m.type === 'error') s.errors.push(m.error);
  });
  s.on('error', () => {});
  return s;
}
const teamOf = (st, id) => st && st.teams.find(t => t.id === id);

function fixtureCanvas(p, intentText) {
  return { blocks: [
    { id: p + 'p1', type: 'persona', x: 60, y: 60, w: 170, h: 58, text: p === 'a' ? 'OpCo GM' : 'Analyst', meta: { capacity: 'accountable', why: 'owns it' } },
    { id: p + 'p2', type: 'persona', x: 60, y: 320, w: 170, h: 58, text: 'Supplier', meta: { capacity: 'served', why: 'paid on time' } },
    { id: p + 'tr', type: 'trigger', x: 60, y: 160, w: 180, h: 54, text: 'invoice arrives', meta: {} },
    { id: p + 'in', type: 'input', x: 60, y: 240, w: 150, h: 46, text: 'supplier invoice', meta: {} },
    { id: p + 'ph', type: 'phase', x: 300, y: 60, w: 240, h: 120, text: 'Reconcile', meta: { why: 'must match POs' } },
    { id: p + 'm1', type: 'moment', x: 320, y: 110, w: 150, h: 50, text: 'match to PO', pain: true, meta: { phaseId: p + 'ph' } },
    { id: p + 'it', type: 'intent', x: 600, y: 60, w: 230, h: 70, text: intentText || 'suppliers paid on time so credit terms hold', meta: {} },
    { id: p + 'oc', type: 'outcome', x: 600, y: 170, w: 200, h: 62, text: 'credit terms kept', meta: {} }
  ], arrows: [{ id: p + 'ar1', from: p + 'tr', to: p + 'ph' }], orphans: [], chat: [], glossary: [] };
}

async function setupRoom() {
  const r = await fetch(BASE + '/api/workshop', { method: 'POST' });
  const { code, hostKey } = await r.json();
  const fac = await actor(), a1 = await actor(), b1 = await actor();
  fac.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey }));
  a1.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Alex' }));
  b1.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Bo' }));
  await wait(200);
  a1.send(J({ type: 'team:create', workshopCode: code, name: 'AP Squad', memberName: 'Alex' }));
  await wait(150);
  const teamAId = a1.seat.teamId;
  b1.send(J({ type: 'team:create', workshopCode: code, name: 'ETL Crew', memberName: 'Bo' }));
  await wait(150);
  const teamBId = b1.seat.teamId;
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'surface' }));
  await wait(150);
  a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: fixtureCanvas('a') }));
  b1.send(J({ type: 'canvas:update', workshopCode: code, canvas: fixtureCanvas('b', 'a monthly report') }));
  await wait(250);
  return { code, hostKey, fac, a1, b1, teamAId, teamBId };
}
const post = (body) => fetch(BASE + '/api/coach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: J(body) }).then(r => r.json());

(async () => {
  // ================================================================
  console.log('\n— R4 capture enrichment (systems + today-baseline) —');
  // ================================================================
  {
    const { code, fac, a1, b1, teamAId } = await setupRoom();

    // H-R4a-1: meta.system persists through sanitize (the load-bearing allowlist guard)
    const cv = fixtureCanvas('a');
    cv.blocks.find(b => b.id === 'ain').meta = { system: 'Salesforce' };
    a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: cv })); await wait(200);
    let blk = teamOf(fac.lastState, teamAId).canvas.blocks.find(b => b.id === 'ain');
    ok('H-R4a-1: meta.system survives a commit (sanitize allowlist)', blk && blk.meta && blk.meta.system === 'Salesforce', blk && blk.meta);

    // H-R4a-2: meta.system clamped to 80 chars
    const cv2 = fixtureCanvas('a');
    cv2.blocks.find(b => b.id === 'ain').meta = { system: 'x'.repeat(9999) };
    a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: cv2 })); await wait(200);
    blk = teamOf(fac.lastState, teamAId).canvas.blocks.find(b => b.id === 'ain');
    ok('H-R4a-2: meta.system clamped ≤80', blk && blk.meta && blk.meta.system.length === 80, blk && blk.meta.system.length);

    // H-R4a-3: meta.system on a persona is NOT counted in teardown.systems (scoped to input/phase/agent)
    const cv3 = fixtureCanvas('a');
    cv3.blocks.find(b => b.id === 'ain').meta = { system: 'Salesforce' };
    cv3.blocks.find(b => b.id === 'ap1').meta = { capacity: 'accountable', why: 'owns it', system: 'PersonaSystemLeak' };
    a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: cv3 })); await wait(200);
    const td = teamOf(fac.lastState, teamAId).teardown;
    const sysNames = (td && td.systems || []).map(s => s.system);
    ok('H-R4a-3: teardown.systems scoped (persona system excluded, input included)',
      sysNames.includes('Salesforce') && !sysNames.includes('PersonaSystemLeak'), sysNames);

    // H-R4b-1: canvas.baseline round-trips, and survives a knownIds merge commit
    const cv4 = fixtureCanvas('a');
    cv4.baseline = { frequency: '40×/mo', cycleTime: '3d' };
    a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: cv4 })); await wait(200);
    let team = teamOf(fac.lastState, teamAId);
    const roundTrip = team.canvas.baseline && team.canvas.baseline.frequency === '40×/mo' && team.canvas.baseline.cycleTime === '3d';
    // now a merged (knownIds) commit that does NOT carry baseline — it must NOT be wiped
    const cv5 = fixtureCanvas('a');   // no baseline field
    a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: cv5,
      knownIds: { blocks: cv5.blocks.map(b => b.id), arrows: cv5.arrows.map(a => a.id), orphans: [] } })); await wait(200);
    team = teamOf(fac.lastState, teamAId);
    const survived = team.canvas.baseline && team.canvas.baseline.frequency === '40×/mo';
    ok('H-R4b-1: canvas.baseline round-trips AND survives a knownIds merge', roundTrip && survived, team.canvas.baseline);

    // also assert it reached the teardown brief
    ok('H-R4b-1b: teardown.brief.baseline carries today’s numbers', team.teardown && team.teardown.brief.baseline && team.teardown.brief.baseline.frequency === '40×/mo', team.teardown && team.teardown.brief.baseline);

    // H-R4b-2: baseline strings clamped ≤80
    const cv6 = fixtureCanvas('a');
    cv6.baseline = { frequency: 'y'.repeat(9999), cycleTime: 'z'.repeat(9999) };
    a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: cv6 })); await wait(200);
    team = teamOf(fac.lastState, teamAId);
    ok('H-R4b-2: baseline.frequency clamped ≤80', team.canvas.baseline.frequency.length === 80, team.canvas.baseline.frequency.length);

    // F-R4-1: gate-green reachable with NO system/baseline set (locked discipline — zero new gate conditions)
    const cv7 = fixtureCanvas('a');   // no system, no baseline, but a complete map
    cv7.orphans = [];
    a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: cv7 })); await wait(200);
    team = teamOf(fac.lastState, teamAId);
    ok('F-R4-1: gate goes green with NO systems/baseline (never gate-blocking)', team.governance.gate.ready === true,
      team.governance.gate.checks.filter(c => !c.ok).map(c => c.key));

    fac.close(); a1.close(); b1.close();
  }

  // ================================================================
  console.log('\n— R5 instant-synthesis (cluster + synth, offline/degraded) —');
  // ================================================================
  {
    const { code, teamAId } = await setupRoom();

    // F-R5a-1: cluster with a valid room, no key → 200, degraded:true, no clusters (honest absence)
    const cl = await post({ mode: 'surface', cluster: true, code, messages: [{ role: 'user', content: 'group: a;b;c;d' }] });
    ok('F-R5a-1: cluster no-key → degraded, no clusters (honest absence)', cl.degraded === true && !cl.clusters, cl);

    // F-R5a-2: clampClusters rejects malformed shapes (unit-style; code is in scope via require-free eval of fixtures)
    //   no key → can't drive the live clamp, so assert structurally: the offline cluster never fabricates clusters.
    const clBad = await post({ mode: 'surface', cluster: true, code, messages: [{ role: 'user', content: '' }] });
    ok('F-R5a-2: cluster never fabricates clusters offline (clamp/honest-absence)', !clBad.clusters, clBad);

    // F-R5b-1: synth surface no-key → 200, degraded, non-empty rule-based 4-line reply
    const s1 = await post({ mode: 'surface', synth: true, synthMode: 'surface', code, teamId: teamAId, messages: [{ role: 'user', content: 'read back' }] });
    const lines1 = String(s1.reply || '').split('\n').filter(Boolean);
    ok('F-R5b-1: synth surface no-key → rule-based 4-line synthesis', s1.synth === true && s1.degraded === true && lines1.length === 4, s1);

    // F-R5b-2: synth rebuild branch mentions agents/landing (rule-based rebuild line)
    const s2 = await post({ mode: 'rebuild', synth: true, synthMode: 'rebuild', code, teamId: teamAId, messages: [{ role: 'user', content: 'read back' }] });
    ok('F-R5b-2: synth rebuild branch → agents/act language', /agent|act/i.test(String(s2.reply || '')), s2);
  }

  // ================================================================
  console.log('\n— R7 Farrier whisper-to-team —');
  // ================================================================
  {
    const { code, fac, a1, b1, teamAId, teamBId } = await setupRoom();

    // H-R7-1: a MEMBER socket firing farrier:whisper → no farrier note lands (authz)
    a1.send(J({ type: 'farrier:whisper', workshopCode: code, teamId: teamAId, text: 'sneaky' })); await wait(200);
    let teamA = teamOf(fac.lastState, teamAId);
    ok('H-R7-1: member farrier:whisper rejected (authz)', !(teamA.canvas.chat || []).some(m => m.role === 'farrier'), teamA.canvas.chat);

    // H-R7-2: a pre-join (unseated) socket → rejected
    const ghost = await actor();
    ghost.send(J({ type: 'farrier:whisper', workshopCode: code, teamId: teamAId, text: 'ghost note' })); await wait(200);
    teamA = teamOf(fac.lastState, teamAId);
    ok('H-R7-2: unseated farrier:whisper rejected (authz)', !(teamA.canvas.chat || []).some(m => m.role === 'farrier'), teamA.canvas.chat);
    ghost.close();

    // H-R7-3: Farrier whisper containing a banned word → error, chat unchanged (server vocab lint)
    const beforeLen = (teamOf(fac.lastState, teamAId).canvas.chat || []).length;
    fac.errors = [];
    fac.send(J({ type: 'farrier:whisper', workshopCode: code, teamId: teamAId, text: 'time to redesign this' })); await wait(200);
    teamA = teamOf(fac.lastState, teamAId);
    const afterLen = (teamA.canvas.chat || []).length;
    ok('H-R7-3: banned-vocab whisper → error + chat unchanged (server lint)',
      fac.errors.length > 0 && afterLen === beforeLen && !(teamA.canvas.chat || []).some(m => m.role === 'farrier'), { errs: fac.errors, beforeLen, afterLen });

    // H-R7-3b (M-1 fix): an INFLECTED banned word also trips the lint (base-form-only let these leak the surprise)
    const beforeLen2 = (teamOf(fac.lastState, teamAId).canvas.chat || []).length;
    fac.errors = [];
    fac.send(J({ type: 'farrier:whisper', workshopCode: code, teamId: teamAId, text: 'start rebuilding it — we\'re swapping yours' })); await wait(200);
    teamA = teamOf(fac.lastState, teamAId);
    ok('H-R7-3b: inflected banned vocab (rebuilding/swapping) → error + chat unchanged',
      fac.errors.length > 0 && (teamA.canvas.chat || []).length === beforeLen2 && !(teamA.canvas.chat || []).some(m => m.role === 'farrier' && /rebuild|swap/i.test(m.content)),
      { errs: fac.errors });

    // H-R7-4: clean Farrier whisper → lands as role:'farrier' in the target team's chat
    fac.send(J({ type: 'farrier:whisper', workshopCode: code, teamId: teamAId, text: 'your trigger is still empty — 5 min left' })); await wait(200);
    teamA = teamOf(fac.lastState, teamAId);
    const note = (teamA.canvas.chat || []).find(m => m.role === 'farrier');
    ok('H-R7-4: clean whisper lands as role:farrier', !!note && /trigger is still empty/.test(note.content), note);

    // H-R7-5 (leak): a member of team B sees NO canvas/chat for team A (stub) → whisper invisible cross-team
    const bStateTeamA = teamOf(b1.lastState, teamAId);
    ok('H-R7-5: whisper invisible cross-team (B’s view of A is a stub, no chat)',
      bStateTeamA && !('canvas' in bStateTeamA), bStateTeamA && Object.keys(bStateTeamA));

    // H-R7-6: a member firing chat:post role:'farrier' is coerced to 'user' (un-forgeable)
    a1.send(J({ type: 'chat:post', workshopCode: code, role: 'farrier', name: 'Alex', content: 'forged farrier note' })); await wait(200);
    teamA = teamOf(fac.lastState, teamAId);
    const forged = (teamA.canvas.chat || []).find(m => m.content === 'forged farrier note');
    ok('H-R7-6: member chat:post role:farrier coerced to user (un-forgeable)', forged && forged.role === 'user', forged);

    fac.close(); a1.close(); b1.close();
  }

  console.log(`\n${fail === 0 ? '✅ BATCH 1 SUITE ALL PASS' : '❌ FAILURES'} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
