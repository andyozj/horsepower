/* LIVE interview-extraction probe — drives a REAL multi-turn interview against a server with a live AI
 * key (e.g. the Render genai gateway) and asserts the 2026-06-16 extraction fix: a persona PER named
 * person, capacities INFERRED (not waited for), and a distinct intent (decision) + outcome.
 * Degrades honestly: if the coach is capped/keyless the turns come back degraded → reported, not asserted.
 *   BASE=https://horsepower-q6wf.onrender.com node qa-interview-live.js
 */
const WebSocket = require('ws');
const BASE = process.env.BASE || 'http://localhost:3940';
const WSBASE = BASE.replace(/^http/, 'ws');
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + JSON.stringify(x) : ''); } };
const J = o => JSON.stringify(o);

// A real team talking through AP invoice processing — names FOUR people with clear capacity cues.
const SCRIPT = [
  "It kicks off when a supplier invoice lands in our shared AP inbox. The AP clerk keys it in and is first to catch heat; the Financial Controller is ultimately on the hook for the numbers at month-end.",
  "In the middle a Procurement Officer owns the PO and resolves mismatches, and a Cost-Centre Manager codes it to the budget and approves within their area. The Controller signs anything over £10k.",
  "The clerk opens SAP MIRO, runs a duplicate check, then a 3-way match of the PO, the goods-receipt note, and the invoice.",
  "If they don't line up it goes on hold and we chase the supplier by email — that drags for days and we lose early-payment discounts.",
  "The real decision this drives is pay, dispute, or hold — so we capture discounts and never pay a duplicate.",
  "At the end the invoice is settled correctly with a clean audit trail for month-end.",
  "Ultimately this whole process is FOR the supplier — they need paying correctly and on time so they keep delivering to us.",
  "That's the whole thing.",
];

async function main() {
  const mint = await (await fetch(BASE + '/api/workshop', { method: 'POST' })).json();
  const { code, hostKey } = mint;
  const fac = new WebSocket(WSBASE); await new Promise(r => fac.on('open', r));
  const m = new WebSocket(WSBASE); await new Promise(r => m.on('open', r));
  let teamId = null, st = null;
  m.on('message', d => { const x = JSON.parse(d); if (x.type === 'state') st = x.state; if (x.type === 'seated') teamId = x.teamId; });
  fac.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey }));
  m.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Ann' }));
  await wait(200);
  m.send(J({ type: 'team:create', workshopCode: code, name: 'AP Squad', memberName: 'Ann' }));
  await wait(300);
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'surface' }));
  await wait(300);

  const convo = [], replies = [];
  let degraded = 0, done = false, turns = 0;
  for (const answer of SCRIPT) {
    convo.push({ role: 'user', content: answer });
    const r = await fetch(BASE + '/api/coach', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: J({ mode: 'surface', interview: true, code, teamId, messages: convo }) }).then(x => x.json());
    turns++;
    if (r.degraded) degraded++;
    if (!r.degraded && r.reply) replies.push(r.reply);
    convo.push({ role: 'assistant', content: r.reply || '' });
    console.log(`  turn ${turns}${r.degraded ? ' (DEGRADED)' : ''}: ${(r.reply || '').slice(0, 90)}`);
    await wait(500);
    if (r.done) { done = true; break; }
  }
  await wait(600);

  const canvas = (st.teams.find(t => t.id === teamId) || {}).canvas || { blocks: [] };
  const of = ty => (canvas.blocks || []).filter(b => b.type === ty);
  const personas = of('persona');
  const withCap = personas.filter(p => p.meta && p.meta.capacity && !/^unspecified$/i.test(p.meta.capacity));
  const accountable = personas.filter(p => /accountable/i.test((p.meta || {}).capacity || ''));
  const served = personas.filter(p => /served/i.test((p.meta || {}).capacity || ''));
  const intent = of('intent')[0], outcome = of('outcome')[0];
  // plain-prose: the 2026-06-17 fix says surface/interview replies carry no markdown markers.
  const mdRe = /\*\*|`|(^|\n)\s{0,3}#{1,6}\s|(^|\n)\s{0,3}[-*+]\s/;
  const mdLeaks = replies.filter(r => mdRe.test(r));

  console.log('\n  --- extracted map ---');
  console.log('  personas:', personas.map(p => p.text + (p.meta && p.meta.capacity ? '/' + p.meta.capacity : '/—')).join(' · '));
  console.log('  intent :', intent ? intent.text : '(none)');
  console.log('  outcome:', outcome ? outcome.text : '(none)');
  console.log('');

  if (degraded === turns) {
    console.log('  ⚠ every turn DEGRADED (no live AI / coach capped) — extraction quality not assertable this run.');
  } else {
    ok('≥3 named people became persona blocks (no one folded into a step)', personas.length >= 3, personas.length);
    ok('most personas have an INFERRED capacity (not left unspecified)', withCap.length >= 3, withCap.map(p => p.text + ':' + p.meta.capacity));
    ok('the on-the-hook person is marked accountable', accountable.length >= 1, accountable.map(p => p.text));
    ok('the SERVED party (the supplier) was captured as a served persona', served.length >= 1, personas.map(p => p.text + '/' + ((p.meta || {}).capacity || '—')));
    ok('coach replies are plain prose (no markdown leak)', mdLeaks.length === 0, mdLeaks.map(r => r.slice(0, 80)));
    ok('a distinct intent AND outcome both exist', !!intent && !!outcome, { intent: !!intent, outcome: !!outcome });
    ok('intent is not a restatement of the outcome', intent && outcome && intent.text.trim().toLowerCase() !== outcome.text.trim().toLowerCase(), { i: intent && intent.text, o: outcome && outcome.text });
    ok('the interview reached a hand-off (done)', done, { done, turns });
  }
  m.close(); fac.close();
  console.log(`\nqa-interview-live: ${pass} passed, ${fail} failed (degraded turns: ${degraded}/${turns})`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.log('interview-live threw:', e.message.slice(0, 300)); process.exit(1); });
