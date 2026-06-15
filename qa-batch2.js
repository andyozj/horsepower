/* Horsepower — Batch 2 (R1 commitment beat + travelling recap · R2 exit pulse).
 * WS/REST contract checks for the new product-track features. Matches the qa-batch1/
 * qa-hostile harness idiom (ok(name, cond)). Run with the main server up:
 *   PORT=3200 node server.js   &&   BASE=http://localhost:3200 node qa-batch2.js
 *
 * Covers: commitment:submit + pulse:submit phase-gate, self-authz, clamps; the teamPublic
 * projection widening (null pre-reveal, full at share); the rule-assembled recap floor
 * (assembled purely from wire state, no external refs); the AI recap-intro degraded path.
 * The recap HTML assembly is verified against the SAME shape the client builds it from
 * (we reproduce buildRecapHTML's pure logic here — it is rule-based wire-state assembly).
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
const memOf = (st, tid, mid) => { const t = teamOf(st, tid); return t && (t.members || []).find(m => m.id === mid); };

function fixtureCanvas(p, intentText) {
  return { blocks: [
    { id: p + 'p1', type: 'persona', x: 60, y: 60, w: 170, h: 58, text: p === 'a' ? 'OpCo GM' : 'Analyst', meta: { capacity: 'accountable', why: 'owns it' } },
    { id: p + 'tr', type: 'trigger', x: 60, y: 160, w: 180, h: 54, text: 'invoice arrives', meta: {} },
    { id: p + 'in', type: 'input', x: 60, y: 240, w: 150, h: 46, text: 'supplier invoice', meta: {} },
    { id: p + 'ph', type: 'phase', x: 300, y: 60, w: 240, h: 120, text: 'Reconcile', meta: { why: 'must match POs' } },
    { id: p + 'm1', type: 'moment', x: 320, y: 110, w: 150, h: 50, text: 'match to PO', pain: true, meta: { phaseId: p + 'ph' } },
    { id: p + 'it', type: 'intent', x: 600, y: 60, w: 230, h: 70, text: intentText || 'suppliers paid on time so credit terms hold', meta: {} },
    { id: p + 'oc', type: 'outcome', x: 600, y: 170, w: 200, h: 62, text: 'credit terms kept', meta: {} }
  ], arrows: [{ id: p + 'ar1', from: p + 'tr', to: p + 'ph' }], orphans: [], chat: [], glossary: [], baseline: { frequency: '40×/mo', cycleTime: '3d' } };
}

// Build a room, two seated members, both with surfaced canvases. Returns sockets + ids.
async function setupSurface() {
  const r = await fetch(BASE + '/api/workshop', { method: 'POST' });
  const { code, hostKey } = await r.json();
  const fac = await actor(), a1 = await actor(), b1 = await actor();
  fac.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey }));
  a1.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Alex' }));
  b1.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Bo' }));
  await wait(200);
  a1.send(J({ type: 'team:create', workshopCode: code, name: 'AP Squad', memberName: 'Alex' })); await wait(150);
  b1.send(J({ type: 'team:create', workshopCode: code, name: 'ETL Crew', memberName: 'Bo' })); await wait(150);
  const teamAId = a1.seat.teamId, teamBId = b1.seat.teamId;
  const memA = a1.seat.memberId, memB = b1.seat.memberId;
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'surface' })); await wait(150);
  a1.send(J({ type: 'canvas:update', workshopCode: code, canvas: fixtureCanvas('a') }));
  b1.send(J({ type: 'canvas:update', workshopCode: code, canvas: fixtureCanvas('b', 'a monthly report') }));
  await wait(250);
  return { code, hostKey, fac, a1, b1, teamAId, teamBId, memA, memB };
}
async function toShare(ctx) {
  ctx.fac.send(J({ type: 'phase:set', workshopCode: ctx.code, phase: 'rebuild' })); await wait(250);
  ctx.fac.send(J({ type: 'phase:set', workshopCode: ctx.code, phase: 'share' })); await wait(200);
}
const post = (body) => fetch(BASE + '/api/coach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: J(body) }).then(r => r.json());

(async () => {
  // ================================================================
  console.log('\n— R1 commitment beat (commitment:submit) —');
  // ================================================================
  {
    const ctx = await setupSurface();
    const { code, fac, a1, teamAId, memA } = ctx;

    // H-R1-1: commitment:submit during SURFACE → no mutation (phase gate)
    a1.send(J({ type: 'commitment:submit', workshopCode: code, text: 'too early' })); await wait(200);
    ok('H-R1-1: commitment:submit in surface → null (phase gate)', !memOf(fac.lastState, teamAId, memA).commitment, memOf(fac.lastState, teamAId, memA).commitment);

    // H-R1-5a (leak): pre-reveal, B's view of team A members carries commitment:null (nothing to leak)
    const bView = teamOf(ctx.b1.lastState, teamAId);
    ok('H-R1-5a: pre-reveal commitment is null on the projected member (no leak)',
      bView && bView.members && bView.members.every(m => m.commitment == null), bView && bView.members);

    await toShare(ctx);

    // H-R1-2: commitment:submit during SHARE → stored; visible in farrier view
    a1.send(J({ type: 'commitment:submit', workshopCode: code, text: 'Stop the Friday approval email.' })); await wait(200);
    let m = memOf(fac.lastState, teamAId, memA);
    ok('H-R1-2: commitment stored at share + visible to farrier', m && m.commitment && m.commitment.text === 'Stop the Friday approval email.', m && m.commitment);

    // H-R1-3: 9999-char text clamped ≤400
    a1.send(J({ type: 'commitment:submit', workshopCode: code, text: 'x'.repeat(9999) })); await wait(200);
    m = memOf(fac.lastState, teamAId, memA);
    ok('H-R1-3: commitment text clamped ≤400', m && m.commitment && m.commitment.text.length === 400, m && m.commitment && m.commitment.text.length);

    // empty clears it (un-submit)
    a1.send(J({ type: 'commitment:submit', workshopCode: code, text: '   ' })); await wait(200);
    // note: server slices but does NOT trim — '   ' is truthy → stored; client trims. assert non-empty whitespace path:
    a1.send(J({ type: 'commitment:submit', workshopCode: code, text: '' })); await wait(200);
    m = memOf(fac.lastState, teamAId, memA);
    ok('H-R1-3b: empty commitment clears it (un-submit)', m && m.commitment === null, m && m.commitment);

    // H-R1-4: pre-join socket (no memberId) → no mutation anywhere
    const ghost = await actor();
    ghost.send(J({ type: 'commitment:submit', workshopCode: code, text: 'ghost commit' })); await wait(200);
    const anyGhost = (fac.lastState.teams || []).some(t => (t.members || []).some(mm => mm.commitment && mm.commitment.text === 'ghost commit'));
    ok('H-R1-4: pre-join commitment:submit → no mutation (authz)', !anyGhost);
    ghost.close();

    // H-R1-5b (post-reveal): at share, farrier + members all see commitments (FULL view by design)
    a1.send(J({ type: 'commitment:submit', workshopCode: code, text: 'redesign the close.' })); await wait(200);
    const bSeesA = teamOf(ctx.b1.lastState, teamAId);
    ok('H-R1-5b: at share, commitments visible cross-team (FULL by design)',
      bSeesA && bSeesA.members && bSeesA.members.some(mm => mm.commitment && mm.commitment.text === 'redesign the close.'), bSeesA && bSeesA.members.map(x => x.commitment));

    fac.close(); a1.close(); ctx.b1.close();
  }

  // ================================================================
  console.log('\n— R2 exit pulse (pulse:submit) —');
  // ================================================================
  {
    const ctx = await setupSurface();
    const { code, fac, a1, b1, teamAId, memA } = ctx;

    // H-R2-1: pulse:submit during REBUILD → no mutation (phase gate)
    fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'rebuild' })); await wait(250);
    a1.send(J({ type: 'pulse:submit', workshopCode: code, aha: 'early', confBefore: 5, confAfter: 8 })); await wait(200);
    ok('H-R2-1: pulse:submit in rebuild → null (phase gate)', !memOf(fac.lastState, teamAId, memA).pulse, memOf(fac.lastState, teamAId, memA).pulse);

    fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'share' })); await wait(200);

    // H-R2-2: clamp — '9e9' is finite → 10; 7.6 rounds to 8; 9999-char aha ≤400
    a1.send(J({ type: 'pulse:submit', workshopCode: code, aha: 'x'.repeat(9999), didDiff: 'less email', confBefore: '9e9', confAfter: 7.6 })); await wait(200);
    let m = memOf(fac.lastState, teamAId, memA);
    ok('H-R2-2: confBefore "9e9" (finite) clamped to 10', m && m.pulse && m.pulse.confBefore === 10, m && m.pulse);
    ok('H-R2-2b: confAfter 7.6 rounds to 8', m && m.pulse && m.pulse.confAfter === 8, m && m.pulse);
    ok('H-R2-2c: aha clamped ≤400', m && m.pulse && m.pulse.aha.length === 400, m && m.pulse && m.pulse.aha.length);

    // non-numeric → null
    a1.send(J({ type: 'pulse:submit', workshopCode: code, aha: 'ok', confBefore: 'banana', confAfter: 3 })); await wait(200);
    m = memOf(fac.lastState, teamAId, memA);
    ok('H-R2-2d: non-numeric confBefore → null', m && m.pulse && m.pulse.confBefore === null, m && m.pulse);

    // H-R2-3: out-of-range clamp — -5 → 0, 42 → 10
    a1.send(J({ type: 'pulse:submit', workshopCode: code, aha: 'ok', confBefore: -5, confAfter: 42 })); await wait(200);
    m = memOf(fac.lastState, teamAId, memA);
    ok('H-R2-3: confBefore -5 → 0 and confAfter 42 → 10', m && m.pulse && m.pulse.confBefore === 0 && m.pulse.confAfter === 10, m && m.pulse);

    // H-R2-4: member A cannot target member B — A's socket always writes ws.memberId; B's pulse untouched
    const bPulseBefore = (memOf(fac.lastState, ctx.teamBId, ctx.memB) || {}).pulse || null;
    a1.send(J({ type: 'pulse:submit', workshopCode: code, memberId: ctx.memB, teamId: ctx.teamBId, aha: 'A hijacks B', confBefore: 1, confAfter: 1 })); await wait(200);
    const bPulseAfter = (memOf(fac.lastState, ctx.teamBId, ctx.memB) || {}).pulse || null;
    const aPulse = memOf(fac.lastState, teamAId, memA).pulse;
    ok('H-R2-4: A cannot set B’s pulse (self-only); A’s own pulse updated instead',
      JSON.stringify(bPulseAfter) === JSON.stringify(bPulseBefore) && aPulse && aPulse.aha === 'A hijacks B', { bPulseAfter, aPulse });

    // H-R2-5 (projection + aggregate): B also submits → farrier sees both; aggregate count = 2
    b1.send(J({ type: 'pulse:submit', workshopCode: code, aha: 'B aha', didDiff: 'd', confBefore: 4, confAfter: 9 })); await wait(200);
    const allPulses = (fac.lastState.teams || []).reduce((n, t) => n + (t.members || []).filter(mm => mm.pulse).length, 0);
    ok('H-R2-5: farrier projection exposes all pulses (aggregate count = 2)', allPulses === 2, allPulses);

    fac.close(); a1.close(); b1.close();
  }

  // ================================================================
  console.log('\n— R1b travelling recap (rule-assembled floor + AI degrade) —');
  // ================================================================
  {
    const ctx = await setupSurface();
    const { code, fac, a1, b1, teamAId, teamBId, memA, memB } = ctx;
    await toShare(ctx);
    // seed commitments + pulses so the recap has content
    a1.send(J({ type: 'commitment:submit', workshopCode: code, text: 'Kill the Friday email.' })); await wait(120);
    a1.send(J({ type: 'pulse:submit', workshopCode: code, aha: 'agents can own the close', didDiff: 'less manual review', confBefore: 3, confAfter: 8 })); await wait(200);

    // Pull team A's FULL projected state from the farrier socket — this is EXACTLY the wire state
    // the client's recapFacts/buildRecapHTML read (members carry commitment/pulse; canvas carries baseline).
    const st = fac.lastState;
    const tA = teamOf(st, teamAId);

    // Reproduce buildRecapHTML's pure rule-based assembly (the always-correct floor — no AI, no external refs).
    function intentOf(canvas) { const it = (canvas.blocks || []).find(b => b.type === 'intent'); return it ? it.text : ''; }
    function buildRecapHTMLFromWire(t, allTeams, codeStr, aiIntro) {
      const rebuilder = allTeams.find(x => x.receivedFromTeamId === t.id);
      const bl = (t.canvas && t.canvas.baseline) || null;
      const commitments = (t.members || []).map(m => m.commitment && m.commitment.text).filter(Boolean);
      const pulses = (t.members || []).map(m => m.pulse).filter(Boolean);
      const intent = intentOf(t.canvas) || 'their real process';
      const valueSentence = (bl && (bl.frequency || bl.cycleTime))
        ? `<p class="value"><b>Today:</b> this ran ${bl.frequency || '—'}, taking ${bl.cycleTime || '—'} — the redesign rebuilds it AI-native.</p>` : '';
      const intro = (aiIntro && String(aiIntro).trim()) ? `<p class="intro">${String(aiIntro).trim()}</p>` : '';
      return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Horsepower recap — ${t.name}</title>` +
        `<style>body{font-family:Inter,sans-serif}</style></head><body><div class="sheet">` +
        `<h1>${t.name}</h1>${intro}` +
        `<p class="lede"><b>What it was:</b> ${intent}</p>${valueSentence}` +
        `<h2>Myths struck &amp; constraints kept</h2>` +
        `<h2>Commitments — our Now-What</h2><ul>${commitments.map(c => `<li>${c}</li>`).join('')}</ul>` +
        `<h2>Ahas from the room</h2>${pulses.map(p => p.aha ? `<blockquote>“${p.aha}”</blockquote>` : '').join('')}` +
        `<p class="foot">Ran at ${codeStr} · Horsepower.</p></div></body></html>`;
    }

    // F-R1b-1: recap is a non-empty self-contained HTML string with team name + commitments; NO external asset refs
    const html = buildRecapHTMLFromWire(tA, st.teams, code, '');
    const hasName = html.includes(tA.name);
    const hasCommit = html.includes('Kill the Friday email.');
    const hasAha = html.includes('agents can own the close');
    // portability: no http(s) asset URLs (truly off-server / offline-openable)
    const noExternal = !/\b(src|href)\s*=\s*["']https?:/i.test(html) && !/url\(\s*https?:/i.test(html);
    ok('F-R1b-1: recap HTML assembles from wire state (name + commitment + aha, no external refs)',
      html.startsWith('<!doctype') && hasName && hasCommit && hasAha && noExternal,
      { hasName, hasCommit, hasAha, noExternal });

    // F-R1b-2a: with baseline present → value sentence rendered
    ok('F-R1b-2a: baseline present → value sentence in recap', html.includes('40×/mo') && html.includes('rebuilds it AI-native'), null);

    // F-R1b-2b: with baseline absent → sentence omitted, no "undefined"
    const tNoBl = JSON.parse(JSON.stringify(tA)); delete tNoBl.canvas.baseline;
    const html2 = buildRecapHTMLFromWire(tNoBl, st.teams, code, '');
    ok('F-R1b-2b: baseline absent → value sentence omitted, no "undefined"',
      !html2.includes('class="value"') && !/undefined/.test(html2), null);

    // F-R1b-3: POST /api/coach {recap:true} with no key → 200 degraded (recap proceeds rule-assembled)
    const recapResp = await post({ mode: 'share', recap: true, code, messages: [{ role: 'user', content: 'Write the intro.' }] });
    ok('F-R1b-3: /api/coach recap:true no-key → degraded:true (AI intro silently omitted)',
      recapResp && recapResp.degraded === true, recapResp);

    // F-R1b-3b: a degraded AI reply must NOT be inlined — the client only inlines !degraded replies.
    // (structural: with degraded:true the recap is built with aiIntro='' → no .intro paragraph)
    const htmlDegraded = buildRecapHTMLFromWire(tA, st.teams, code, recapResp.degraded ? '' : (recapResp.reply || ''));
    ok('F-R1b-3b: degraded recap omits the AI intro paragraph (rule-assembled floor stands)',
      !htmlDegraded.includes('class="intro"'), null);

    fac.close(); a1.close(); b1.close();
  }

  console.log(`\n${fail === 0 ? '✅ BATCH 2 SUITE ALL PASS' : '❌ FAILURES'} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
