/* Build an AP-dump interview map on a live server, print the joinable code + the FULL canvas
 * (blocks with positions + arrows resolved to labels) so we can inspect arrow accuracy as DATA,
 * then open the room in a browser to screenshot the rendered map.
 *   BASE=https://horsepower-q6wf.onrender.com node build-map.js
 */
const WebSocket = require('ws');
const BASE = process.env.BASE || 'https://horsepower-q6wf.onrender.com';
const WSBASE = BASE.replace(/^http/, 'ws');
const wait = ms => new Promise(r => setTimeout(r, ms));
const J = o => JSON.stringify(o);

const TURNS = [
  "So I think it starts when a supplier invoice lands in our shared accounts payable inbox, and the AP clerk keys it in and is first to catch heat if something's wrong, and the financial controller is ultimately on the hook for the numbers at month end. In the middle a procurement officer owns the purchase order and resolves any mismatches, and a cost centre manager codes the invoice to their budget and approves it for that area, and the controller personally signs off anything over ten thousand pounds. The clerk opens SAP, runs a duplicate check, does a three-way match of the purchase order, the goods receipt note and the invoice, and if anything doesn't line up the invoice goes on hold and we email the supplier, which drags on for days and we lose all our early payment discounts, which is really painful. The whole thing drives one decision — do we pay, dispute, or hold — so we capture discounts and never pay a duplicate. At the end the invoice is settled with a clean audit trail for month end. And ultimately this is all for the supplier, they need paying correctly and on time so they keep delivering to us.",
  "Yeah that's right — the clerk drives the chase day to day, procurement only steps in if the PO itself needs fixing.",
  "That's the whole thing.",
];

(async () => {
  const mint = await (await fetch(BASE + '/api/workshop', { method: 'POST' })).json();
  const { code, hostKey } = mint;
  const fac = new WebSocket(WSBASE); await new Promise(r => fac.on('open', r));
  const m = new WebSocket(WSBASE); await new Promise(r => m.on('open', r));
  let teamId = null, st = null;
  m.on('message', d => { const x = JSON.parse(d); if (x.type === 'state') st = x.state; if (x.type === 'seated') teamId = x.teamId; });
  fac.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey }));
  m.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Tester' }));
  await wait(300);
  m.send(J({ type: 'team:create', workshopCode: code, name: 'AP Squad', memberName: 'Tester' }));
  await wait(400);
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'surface' }));
  await wait(400);

  const convo = [];
  for (const a of TURNS) {
    convo.push({ role: 'user', content: a });
    const r = await fetch(BASE + '/api/coach', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: J({ mode: 'surface', interview: true, code, teamId, messages: convo }) }).then(x => x.json());
    convo.push({ role: 'assistant', content: r.reply || '' });
    console.log(`turn${r.degraded ? ' (DEGRADED)' : ''}${r.done ? ' (done)' : ''}: ${(r.reply || '').slice(0, 80)}`);
    await wait(700);
    if (r.done) break;
  }
  await wait(1200);
  const canvas = (st && st.teams.find(t => t.id === teamId) || {}).canvas || { blocks: [], arrows: [] };
  const byId = {}; (canvas.blocks || []).forEach(b => byId[b.id] = b);
  console.log('\n================ BUILT MAP ================');
  console.log('ROOM CODE:', code, ' (join at', BASE + ')');
  console.log('\nBLOCKS (' + (canvas.blocks || []).length + '):');
  (canvas.blocks || []).forEach(b => { const m=b.meta||{}; const extra=[m.capacity&&'cap='+m.capacity, m.forces&&'forces='+m.forces, m.freq&&'freq='+m.freq, m.stakes&&'stakes="'+m.stakes+'"', b.pain&&'PAIN'].filter(Boolean).join(' '); console.log(`  [${b.type}] "${b.text}"  ${extra||'—'}`); });
  console.log('\nARROWS (' + (canvas.arrows || []).length + '):');
  (canvas.arrows || []).forEach(a => {
    const f = byId[a.from], t = byId[a.to];
    console.log(`  ${f ? '"'+f.text+'"' : '??'+a.from}  ->  ${t ? '"'+t.text+'"' : '??'+a.to}`);
  });
  m.close(); fac.close();
  process.exit(0);
})().catch(e => { console.log('build-map threw:', e.message); process.exit(1); });
