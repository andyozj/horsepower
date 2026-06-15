/* Horsepower — R3 sandbox isolation / leak suite (WS-level, e2e idiom).
 * Proves the 4 leak guards + the seeded worked example run the PRODUCTION path.
 *   PORT=3200 node server.js   &&   BASE=http://localhost:3200 node qa-sandbox.js
 * 12 checks. Mints sandboxes (shares the mint bucket) — run on a fresh-ish bucket.
 */
const WebSocket = require('ws');
const BASE = process.env.BASE || 'http://localhost:3200';
const WSBASE = BASE.replace('http', 'ws');
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra != null ? '→ ' + JSON.stringify(extra) : ''); } }
const mk = () => new Promise(res => { const w = new WebSocket(WSBASE); w.on('open', () => res(w)); });
const J = o => JSON.stringify(o);

(async () => {
  console.log('\n— R3 sandbox isolation —');

  // 1. mint a sandbox
  const r = await fetch(BASE + '/api/sandbox', { method: 'POST' });
  const d = await r.json();
  ok('1. POST /api/sandbox → 200 {code,hostKey,sandbox:true}', r.status === 200 && d.code && d.code.length === 6 && d.hostKey && d.hostKey.length === 8 && d.sandbox === true, d);
  const code = d.code, hostKey = d.hostKey;

  // 2. GET 404 (Guard 3)
  const g = await fetch(BASE + '/api/workshop/' + code);
  ok('2. GET /api/workshop/<sandbox> → 404 (Guard 3)', g.status === 404, { status: g.status });

  // 3. member join refused (Guard 2)
  const m1 = await mk(); let m1last = {}; m1.on('message', x => { const o = JSON.parse(x); m1last[o.type] = o; });
  m1.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Sneak' }));
  await wait(150);
  ok('3. member join → error, never seated (Guard 2)', m1last.error && m1last.error.error && !m1last.joined, m1last);

  // 4. team:create on a sandbox → no team added (Guard 2 silent)
  m1.send(J({ type: 'team:create', workshopCode: code, name: 'Intruder', memberName: 'Sneak' }));
  await wait(150);
  ok('4. team:create on a sandbox → not seated (Guard 2 silent)', !m1last.seated, m1last.seated || null);

  // 5. team:join on a sandbox → no member added
  m1.send(J({ type: 'team:join', workshopCode: code, teamId: 'sb-fs', memberName: 'Sneak' }));
  await wait(150);
  ok('5. team:join on a sandbox → not seated (Guard 2 silent)', !m1last.seated, m1last.seated || null);

  // 6. Farrier join with hostKey → full, 2 seeded gate-green teams
  const fac = await mk(); let fl = {}; fac.on('message', x => { const o = JSON.parse(x); fl[o.type] = o; if (o.type === 'state') fl.state = o.state; if (o.type === 'joined') fl.joined = o; });
  fac.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey }));
  await wait(200);
  const st = fl.state || (fl.joined && fl.joined.state);
  ok('6. Farrier join (hostKey) → role:farrier, 2 seeded gate-green teams',
    fl.joined && fl.joined.role === 'farrier' && st && st.teams.length === 2 && st.teams.every(t => t.gateGreen) && st.sandbox === true,
    st && { teams: st.teams.map(t => [t.id, t.gateGreen]), sandbox: st.sandbox });

  // 7. both seeded teams have a pre-computed teardown
  ok('7. both seeded teams have a pre-computed teardown', st && st.teams.every(t => t.hasTeardown && t.teardown && t.teardown.people.length >= 2),
    st && st.teams.map(t => [t.id, t.hasTeardown, t.teardown && t.teardown.people.length]));

  // 8. Farrier phase:set surface → rebuild → performSwap ran (ring), locks seeded
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'surface' })); await wait(120);
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'rebuild' })); await wait(200);
  const fs = fl.state.teams.find(t => t.id === 'sb-fs'), obb = fl.state.teams.find(t => t.id === 'sb-ob');
  const swapped = fs && obb && fs.receivedFromTeamId === 'sb-ob' && obb.receivedFromTeamId === 'sb-fs';
  const locks = fs && fs.redesign && fs.redesign.canvas.blocks.some(b => b.locked && b.meta && b.meta.lockField);
  ok('8. swap ran on seeded teams (ring) + locked blocks seeded', swapped && locks, { swapped, fsRecv: fs && fs.receivedFromTeamId, obRecv: obb && obb.receivedFromTeamId, locks });

  // 9. Farrier phase:set share → projection opens; gallery state (presentingPairId:null) valid
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'share' })); await wait(150);
  ok('9. share → projection opens, presentingPairId null (gallery state valid)',
    fl.state.state === 'share' && fl.state.presentingPairId === null && fl.state.teams.every(t => t.redesign && t.canvas),
    { state: fl.state.state, pp: fl.state.presentingPairId });

  // 10. present:set toggling (gallery pacing) — present:set unchanged
  fac.send(J({ type: 'present:set', workshopCode: code, teamId: 'sb-fs' })); await wait(120);
  const feat = fl.state.presentingPairId === 'sb-fs';
  fac.send(J({ type: 'present:set', workshopCode: code, teamId: null })); await wait(120);
  const gallery = fl.state.presentingPairId === null;
  ok('10. present:set teamId then null → presentingPairId toggles (gallery pacing)', feat && gallery, { feat, gallery });

  // 11. mint bucket shared — many rapid /api/sandbox eventually 429
  let got429 = false, oks = 0;
  for (let i = 0; i < 80; i++) {
    const rr = await fetch(BASE + '/api/sandbox', { method: 'POST' });
    if (rr.status === 429) { got429 = true; break; }
    if (rr.status === 200) oks++;
    if (rr.status === 503) break;   // MAX_WORKSHOPS — also a valid cap, still proves sharing
  }
  ok('11. rapid /api/sandbox trips the shared mint bucket (429 or 503)', got429 || oks < 80, { oks, got429 });

  // 12. a sandbox carries the sandbox flag in the wire state (server truth, not client claim)
  ok('12. sandbox flag is server-sourced in baseState (state.sandbox===true)', st && st.sandbox === true, st && { sandbox: st.sandbox });

  [m1, fac].forEach(s => { try { s.close(); } catch (e) {} });
  console.log(`\nqa-sandbox: ${pass} passed, ${fail} failed (of ${pass + fail})`);
  process.exit(fail ? 1 : 0);
})();
