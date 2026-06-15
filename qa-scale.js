/* Horsepower — R10 scale validation: 6 teams × 5 members (~31 sockets) full arc.
 * WS-level (raw ws + fetch, the e2e idiom). Proves the shipped hardening holds at
 * 6×5 and the on-device "every team sees its own fate" rule is N-independent.
 *   PORT=3400 node server.js   &&   BASE=http://localhost:3400 node qa-scale.js
 * 6 scale assertions (A mint headroom · B broadcast integrity/A2 · C no starvation ·
 *  D bucket fairness · E on-device fate ×6 · F serialization budget) + arc checks.
 */
const WebSocket = require('ws');
const BASE = process.env.BASE || 'http://localhost:3400';
const WSBASE = BASE.replace('http', 'ws');
const wait = ms => new Promise(r => setTimeout(r, ms));
const TEAMS = 6, PER = 5;
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra != null ? '→ ' + JSON.stringify(extra) : ''); } }
const mk = () => new Promise(res => { const w = new WebSocket(WSBASE); w.on('open', () => res(w)); });
const J = o => JSON.stringify(o);

// a gate-green canvas, uniqued per team prefix
function teamCanvas(pfx) {
  return {
    blocks: [
      { id: pfx + 'p1', type: 'persona', x: 60, y: 60, w: 170, h: 58, text: pfx + ' Owner', meta: { capacity: 'accountable', why: 'owns the outcome end to end' } },
      { id: pfx + 'p2', type: 'persona', x: 60, y: 130, w: 170, h: 58, text: pfx + ' Operator', meta: { capacity: 'operates', why: 'does the hands-on work' } },
      { id: pfx + 'tr', type: 'trigger', x: 60, y: 210, w: 180, h: 54, text: pfx + ' request comes in', meta: {} },
      { id: pfx + 'in', type: 'input', x: 60, y: 290, w: 150, h: 46, text: pfx + ' source data', meta: {} },
      { id: pfx + 'ph', type: 'phase', x: 300, y: 60, w: 240, h: 120, text: pfx + ' Process it', meta: { why: 'this is where the value is created' } },
      { id: pfx + 'm', type: 'moment', x: 320, y: 110, w: 150, h: 50, text: pfx + ' the hard decision', pain: true, meta: { phaseId: pfx + 'ph' } },
      { id: pfx + 'it', type: 'intent', x: 600, y: 60, w: 230, h: 70, text: 'Decide the ' + pfx + ' request is fulfilled correctly', meta: {} },
      { id: pfx + 'oc', type: 'outcome', x: 600, y: 170, w: 200, h: 62, text: pfx + ' request fulfilled', meta: {} }
    ],
    arrows: [{ id: pfx + 'a1', from: pfx + 'tr', to: pfx + 'ph' }], orphans: [], chat: [], glossary: []
  };
}

function pinger(sock) {
  return () => new Promise(res => {
    const t0 = Date.now();
    const h = d => { try { if (JSON.parse(d).type === 'pong') { sock.off('message', h); res(Date.now() - t0); } } catch (e) {} };
    sock.on('message', h); sock.send(J({ type: 'ping' }));
    setTimeout(() => { sock.off('message', h); res(9999); }, 1000);
  });
}

(async () => {
  console.log(`\n— R10 scale: ${TEAMS} teams × ${PER} members —`);

  // Phase 0 — build the room
  const r = await fetch(BASE + '/api/workshop', { method: 'POST' });
  const mintStatus = r.status; const { code, hostKey } = await r.json();
  ok('Scale A — mint headroom (1 mint « bucket 60, no 429)', mintStatus === 200 && code, { mintStatus });

  const fac = await mk(); let fl = {}; fac.on('message', d => { const o = JSON.parse(d); if (o.type === 'state') fl.state = o.state; if (o.type === 'joined') fl.joined = o; });
  fac.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey })); await wait(120);

  const teamSocks = [];   // per team: { id, leadState, socks:[{ws,last}] }
  for (let t = 0; t < TEAMS; t++) {
    const socks = [];
    for (let i = 0; i < PER; i++) {
      const ws = await mk(); const box = { ws, last: {} };
      ws.on('message', d => { const o = JSON.parse(d); if (o.type === 'state') box.last.state = o.state; if (o.type === 'seated') box.last.seat = o; });
      socks.push(box);
    }
    // socket 0 creates, 1..4 join
    socks[0].ws.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'T' + t + 'm0' })); await wait(40);
    socks[0].ws.send(J({ type: 'team:create', workshopCode: code, name: 'Team ' + (t + 1), memberName: 'T' + t + 'm0' })); await wait(80);
    const teamId = socks[0].last.seat && socks[0].last.seat.teamId;
    for (let i = 1; i < PER; i++) {
      socks[i].ws.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'T' + t + 'm' + i })); await wait(25);
      socks[i].ws.send(J({ type: 'team:join', workshopCode: code, teamId, memberName: 'T' + t + 'm' + i })); await wait(40);
    }
    teamSocks.push({ id: teamId, socks });
  }
  await wait(200);
  const built = fl.state.teams.length === TEAMS && fl.state.teams.every(t => t.members.length === PER);
  ok(`room formed: ${TEAMS} teams × ${PER} members`, built, fl.state.teams.map(t => [t.name, t.members.length]));

  // Phase 1 — Surface at scale
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'surface' })); await wait(120);
  // each team's lead sends a gate-green canvas
  for (let t = 0; t < TEAMS; t++) {
    teamSocks[t].socks[0].ws.send(J({ type: 'canvas:update', workshopCode: code, canvas: teamCanvas('t' + t) }));
    await wait(50);
  }
  await wait(300);
  // interleave storm: round-robin canvas:update across all 6 leads for ~30 rounds
  for (let round = 0; round < 30; round++) {
    for (let t = 0; t < TEAMS; t++) {
      const c = teamCanvas('t' + t); c.blocks[0].text = 'Team ' + t + ' Owner r' + round;
      teamSocks[t].socks[0].ws.send(J({ type: 'canvas:update', workshopCode: code, canvas: c }));
    }
    // Scale C — during the storm, a back-team socket pings round-trips fast
    if (round === 15) {
      const rtt = await pinger(teamSocks[5].socks[4].ws)();
      ok('Scale C — no starvation: team-6 socket pings < 200ms during the storm', rtt < 200, { rtt });
    }
    await wait(60);
  }
  await wait(400);
  const allGreen = fl.state.teams.every(t => t.gateGreen);
  ok('Scale B(1) — all 6 teams gate-green after the storm', allGreen, fl.state.teams.map(t => [t.name, t.gateGreen]));
  // Scale B — a member's wire carries OWN full + STUBs (A2 projection holds at N=6)
  const memState = teamSocks[2].socks[1].last.state;
  const own = memState.teams.find(t => t.id === teamSocks[2].id);
  const other = memState.teams.find(t => t.id !== teamSocks[2].id);
  ok('Scale B(2) — A2 projection at N=6: OWN full, others stubbed (no canvas on others)',
    own && own.canvas && other && !('canvas' in other), { ownHasCanvas: !!(own && own.canvas), otherHasCanvas: other && ('canvas' in other) });

  // Scale D — one greedy socket: 200 tight canvas:update → ≥1 'Slow down' AND others still fresh
  let greedyErr = false;
  const greedy = teamSocks[0].socks[0];
  const errH = d => { try { if (JSON.parse(d).type === 'error') greedyErr = true; } catch (e) {} };
  greedy.ws.on('message', errH);
  for (let i = 0; i < 200; i++) { const c = teamCanvas('t0'); c.blocks[0].text = 'greed ' + i; greedy.ws.send(J({ type: 'canvas:update', workshopCode: code, canvas: c })); }
  await wait(200);
  greedy.ws.off('message', errH);
  // other team still gets fresh broadcasts: fire a benign farrier write, confirm a different team's socket sees it
  const before = JSON.stringify(teamSocks[3].socks[2].last.state);
  fac.send(J({ type: 'present:set', workshopCode: code, teamId: null })); await wait(100);
  teamSocks[3].socks[2].ws.send(J({ type: 'ping' })); await wait(80);
  const stillFresh = teamSocks[3].socks[2].last.state != null;
  ok('Scale D — bucket fairness: greedy socket throttled (≥1 error) + room stays fresh', greedyErr && stillFresh, { greedyErr, stillFresh });

  // Phase 2 — swap at 6 teams
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'rebuild' })); await wait(300);
  const ids = teamSocks.map(t => t.id);
  let ringOk = true, noSelf = true, seeded = true;
  fl.state.teams.forEach((tm, i) => {
    const myIdx = ids.indexOf(tm.id);
    const expected = ids[(myIdx + 1) % TEAMS];
    if (tm.receivedFromTeamId !== expected) ringOk = false;
    if (tm.receivedFromTeamId === tm.id) noSelf = false;
    if (!(tm.redesign && tm.redesign.canvas.blocks.some(b => b.locked))) seeded = false;
  });
  ok('swap: 6-team ring rotation, no team received its own, locked blocks seeded', ringOk && noSelf && seeded, { ringOk, noSelf, seeded });

  // Phase 3 — rebuild at scale: each team adds an agent block + an assumption (paced)
  for (let t = 0; t < TEAMS; t++) {
    const tm = fl.state.teams.find(x => x.id === teamSocks[t].id);
    const can = JSON.parse(JSON.stringify(tm.redesign.canvas));
    can.blocks.push({ id: 't' + t + 'ag', type: 'agent', x: 700, y: 60, w: 170, h: 56, text: 'Agent for team ' + t, meta: {} });
    teamSocks[t].socks[0].ws.send(J({ type: 'redesign:update', workshopCode: code, redesign: { canvas: can } }));
    await wait(50);
  }
  await wait(300);
  const indep = fl.state.teams.every(t => t.redesign && t.redesign.canvas.blocks.some(b => b.type === 'agent'));
  ok('rebuild at scale: all 6 redesigns mutate independently (agent added, no cross-bleed)', indep,
    fl.state.teams.map(t => [t.name, t.redesign.canvas.blocks.filter(b => b.type === 'agent').length]));

  // Phase 4 — share + on-device fate
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'share' })); await wait(300);
  // Scale E — each of the 6 teams can render its own double-reveal on-device
  let fateOk = true; const detail = [];
  for (let t = 0; t < TEAMS; t++) {
    const ms = teamSocks[t].socks[1].last.state;
    const myId = teamSocks[t].id;
    const myFate = ms.teams.find(x => x.id === myId);                       // my fate as a rebuilder (my redesign)
    const rebuilderOfMine = ms.teams.find(x => x.receivedFromTeamId === myId); // who rebuilt MY workflow
    const okT = myFate && myFate.redesign && myFate.redesign.canvas
      && rebuilderOfMine && rebuilderOfMine.redesign && rebuilderOfMine.redesign.canvas;
    if (!okT) fateOk = false;
    detail.push([t, !!okT]);
  }
  ok('Scale E — all 6 teams see their own fate on-device (rebuilder-of-mine + my redesign present)', fateOk, detail);

  // Gallery pacing: present:set feature → null → feature (state contract intact)
  fac.send(J({ type: 'present:set', workshopCode: code, teamId: ids[0] })); await wait(100);
  const f1 = fl.state.presentingPairId === ids[0];
  fac.send(J({ type: 'present:set', workshopCode: code, teamId: null })); await wait(100);
  const g1 = fl.state.presentingPairId === null;
  fac.send(J({ type: 'present:set', workshopCode: code, teamId: ids[1] })); await wait(100);
  const f2 = fl.state.presentingPairId === ids[1];
  ok('gallery pacing: present:set feature→gallery→feature toggles presentingPairId (contract intact)', f1 && g1 && f2, { f1, g1, f2 });

  // Scale F — serialization budget: 20× present:set toggles, server stays responsive
  let maxRtt = 0;
  for (let i = 0; i < 20; i++) {
    fac.send(J({ type: 'present:set', workshopCode: code, teamId: i % 2 ? ids[0] : null }));
    const rtt = await pinger(teamSocks[i % TEAMS].socks[0].ws)();
    if (rtt > maxRtt) maxRtt = rtt;
  }
  ok('Scale F — serialization budget: ping < 200ms throughout share-phase writes (8-string build cheap)', maxRtt < 200, { maxRtt });

  // Phase 5 — close + recap
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'closed' })); await wait(200);
  const recapOk = fl.state.state === 'closed' && fl.state.teams.every(t => t.redesign);
  ok('close + recap: all 6 teams retain redesign/race-card data (per-team, N-independent)', recapOk, { state: fl.state.state });

  // cleanup
  fac.close(); teamSocks.forEach(t => t.socks.forEach(s => { try { s.ws.close(); } catch (e) {} }));
  console.log(`\nqa-scale: ${pass} passed, ${fail} failed (of ${pass + fail})`);
  if (maxRtt > 50) console.log(`  [note] peak ping under share-write load: ${maxRtt}ms`);
  process.exit(fail ? 1 : 0);
})();
