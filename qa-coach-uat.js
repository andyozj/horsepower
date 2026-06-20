/* qa-coach-uat.js — adversarial UAT of the live AI Coach interview EXTRACTION.
 * Voice (PTT) is just STT → the same /api/coach interview pipeline, so this tests the real brain by typing.
 * Drives several workflows in several SPEAKING STYLES (paced / one-big-dump / messy-with-corrections)
 * against a server with a live AI key, then grades the resulting map and the "done" discipline.
 *
 *   BASE=https://horsepower-q6wf.onrender.com node qa-coach-uat.js
 *
 * Honest: needs a live AI key on the server. If every turn degrades (no key/capped) it REPORTS, not asserts.
 */
const WebSocket = require('ws');
const BASE = process.env.BASE || 'http://localhost:3940';
const WSBASE = BASE.replace(/^http/, 'ws');
const wait = ms => new Promise(r => setTimeout(r, ms));
const J = o => JSON.stringify(o);
let runs = [];

// ---- scenarios: a list of expected people (name fragment + capacity) + that intent≠outcome must exist ----
const AP_PEOPLE = [
  { name: /AP clerk|clerk/i, cap: 'operates' },
  { name: /financial controller|controller/i, cap: 'accountable' },
  { name: /procurement/i, cap: 'operates' },
  { name: /cost.?cent/i, cap: 'operates|accountable' },
  { name: /supplier/i, cap: 'served' },
];
const OB_PEOPLE = [
  { name: /people.?ops|hr|onboarding lead/i, cap: 'operates' },
  { name: /hiring manager|manager/i, cap: 'accountable' },
  { name: /IT|provisioning/i, cap: 'operates' },
  { name: /new hire|new joiner|employee/i, cap: 'served' },
];

// Paced = many short turns (the easy path). Dump = the whole thing in ~2 breaths (the user's real failure).
const SCENARIOS = [
  {
    id: 'AP-paced', people: AP_PEOPLE,
    turns: [
      "It kicks off when a supplier invoice lands in our shared AP inbox. The AP clerk keys it in and is first to catch heat; the Financial Controller is ultimately on the hook for the numbers at month-end.",
      "A Procurement Officer owns the PO and resolves mismatches, and a Cost-Centre Manager codes it to the budget and approves within their area. The Controller signs anything over £10k.",
      "The clerk opens SAP, runs a duplicate check, then a 3-way match of the PO, the goods-receipt note, and the invoice.",
      "If they don't line up it goes on hold and we chase the supplier by email — that drags for days and we lose early-payment discounts.",
      "The real decision this drives is pay, dispute, or hold — so we capture discounts and never pay a duplicate.",
      "At the end the invoice is settled correctly with a clean audit trail for month-end.",
      "Ultimately this whole process is FOR the supplier — they need paying correctly and on time so they keep delivering to us.",
      "That's the whole thing.",
    ],
  },
  {
    id: 'AP-dump', people: AP_PEOPLE,
    // The real user's failure mode: the entire workflow in one run-on turn, then a couple of clarifiers.
    turns: [
      "So I think it starts when a supplier invoice lands in our shared accounts payable inbox, and the AP clerk keys it in and is first to catch heat if something's wrong, and the financial controller is ultimately on the hook for the numbers at month end. In the middle a procurement officer owns the purchase order and resolves any mismatches, and a cost centre manager codes the invoice to their budget and approves it for that area, and the controller personally signs off anything over ten thousand pounds. The clerk opens SAP, runs a duplicate check, does a three-way match of the purchase order, the goods receipt note and the invoice, and if anything doesn't line up the invoice goes on hold and we email the supplier, which drags on for days and we lose all our early payment discounts, which is really painful. The whole thing drives one decision — do we pay, dispute, or hold — so we capture discounts and never pay a duplicate. At the end the invoice is settled with a clean audit trail for month end. And ultimately this is all for the supplier, they need paying correctly and on time so they keep delivering to us.",
      "Yeah that's right — the clerk drives the chase day to day, procurement only steps in if the PO itself needs fixing.",
      "That's the whole thing.",
    ],
  },
  {
    id: 'OB-dump', people: OB_PEOPLE,
    turns: [
      "Okay so new-hire onboarding — it triggers when a signed offer letter comes back. The People-Ops onboarding lead runs the whole thing day to day and is first to catch any gaps, the hiring manager is accountable for the new hire being productive, and an IT provisioning tech sets up the laptop and system access. Inputs are the signed offer, the role profile, and the equipment request. The lead creates the accounts, IT images the laptop, the manager preps the first-week plan, and the real headache is access requests that bounce between IT and security for days so people start without a working login. The decision this drives is really: is this person ready to start on day one or do we delay their start. At the end the new hire is productive on day one with a working laptop, all access, and a buddy assigned. The whole point is the new hire themselves — they get a smooth first day so they stay.",
      "Right, the onboarding lead owns chasing the access requests, not the hiring manager.",
      "That's everything.",
    ],
  },
];

async function runScenario(sc) {
  const mint = await (await fetch(BASE + '/api/workshop', { method: 'POST' })).json();
  const { code, hostKey } = mint;
  const fac = new WebSocket(WSBASE); await new Promise(r => fac.on('open', r));
  const m = new WebSocket(WSBASE); await new Promise(r => m.on('open', r));
  let teamId = null, st = null;
  m.on('message', d => { const x = JSON.parse(d); if (x.type === 'state') st = x.state; if (x.type === 'seated') teamId = x.teamId; });
  fac.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey }));
  m.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Tester' }));
  await wait(250);
  m.send(J({ type: 'team:create', workshopCode: code, name: sc.id, memberName: 'Tester' }));
  await wait(350);
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'surface' }));
  await wait(350);

  const convo = [];
  let degraded = 0, turns = 0, doneAt = -1, doneEver = false;
  for (const answer of sc.turns) {
    convo.push({ role: 'user', content: answer });
    const r = await fetch(BASE + '/api/coach', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: J({ mode: 'surface', interview: true, code, teamId, messages: convo }) }).then(x => x.json()).catch(e => ({ err: e.message }));
    turns++;
    if (r.degraded) degraded++;
    if (r.done && !doneEver) { doneEver = true; doneAt = turns; }
    convo.push({ role: 'assistant', content: r.reply || '' });
    if (process.env.VERBOSE) console.log(`    turn ${turns}${r.degraded ? ' (DEGRADED)' : ''}${r.done ? ' (done)' : ''}: ${(r.reply || r.err || '').slice(0, 110)}`);
    await wait(1500);
    if (r.done) break;
  }
  await wait(900);
  const canvas = (st && st.teams.find(t => t.id === teamId) || {}).canvas || { blocks: [] };
  m.close(); fac.close();
  return { sc, canvas, degraded, turns, doneAt, doneEver };
}

function grade(res) {
  const { sc, canvas } = res;
  const B = canvas.blocks || [];
  const of = ty => B.filter(b => b.type === ty);
  const personas = of('persona');
  const stepText = B.filter(b => ['phase', 'moment', 'input', 'trigger'].includes(b.type)).map(b => b.text || '').join(' || ');
  const findings = [];

  // 1. every expected person is a PERSONA (not folded into a step)
  const missing = [], folded = [];
  for (const p of sc.people) {
    const asPersona = personas.find(x => p.name.test(x.text || ''));
    if (!asPersona) {
      missing.push(p.name.source);
      if (p.name.test(stepText)) folded.push(p.name.source);   // the name shows up inside a step block
    }
  }
  if (missing.length) findings.push({ sev: 'P1', what: `${missing.length}/${sc.people.length} people NOT captured as personas: ${missing.join(', ')}` });
  if (folded.length) findings.push({ sev: 'P0', what: `person folded into a step (lost as persona): ${folded.join(', ')}` });

  // 2. capacities present
  const capped = personas.filter(p => p.meta && p.meta.capacity);
  if (capped.length < Math.min(3, personas.length)) findings.push({ sev: 'P1', what: `only ${capped.length}/${personas.length} personas have a capacity` });
  if (!personas.some(p => /accountable/i.test((p.meta || {}).capacity || ''))) findings.push({ sev: 'P1', what: 'no ACCOUNTABLE persona' });
  if (!personas.some(p => /served/i.test((p.meta || {}).capacity || ''))) findings.push({ sev: 'P1', what: 'no SERVED persona (who the work is FOR)' });

  // 3. intent + outcome distinct
  const intent = of('intent')[0], outcome = of('outcome')[0];
  if (!intent) findings.push({ sev: 'P0', what: 'NO intent block (even though the script states the decision)' });
  if (!outcome) findings.push({ sev: 'P0', what: 'NO outcome block (even though the script states the end-state)' });
  if (intent && outcome && (intent.text || '').trim().toLowerCase() === (outcome.text || '').trim().toLowerCase())
    findings.push({ sev: 'P1', what: 'intent is a restatement of outcome' });

  // 4. DONE discipline — the user's exact complaint: "told me it's good but still need intent, outcome"
  const ready = !!intent && !!outcome && personas.length >= 3 && personas.some(p => /served/i.test((p.meta || {}).capacity || ''));
  if (res.doneEver && !ready) findings.push({ sev: 'P0', what: `Coach declared DONE (turn ${res.doneAt}) while map incomplete — intent:${!!intent} outcome:${!!outcome} personas:${personas.length} served:${personas.some(p => /served/i.test((p.meta || {}).capacity || ''))}` });
  if (!res.doneEver && ready) findings.push({ sev: 'P2', what: 'map is complete but Coach never said done (would over-run the interview)' });

  return { findings, personas, intent, outcome };
}

(async () => {
  console.log(`\nCOACH UAT vs ${BASE}\n${'='.repeat(60)}`);
  const only = process.env.ONLY;
  const list = only ? SCENARIOS.filter(s => s.id === only) : SCENARIOS;
  for (const sc of list) {
    const res = await runScenario(sc);
    runs.push(res);
    const g = grade(res);
    console.log(`\n### ${sc.id}  (turns:${res.turns} done@${res.doneAt} degraded:${res.degraded}/${res.turns})`);
    if (res.degraded === res.turns) { console.log('  ⚠ ALL turns degraded — no live AI, extraction not assertable.'); continue; }
    console.log('  personas:', g.personas.map(p => p.text + '/' + ((p.meta || {}).capacity || '—')).join(' · ') || '(none)');
    console.log('  intent  :', g.intent ? g.intent.text : '(none)');
    console.log('  outcome :', g.outcome ? g.outcome.text : '(none)');
    if (!g.findings.length) console.log('  ✓ clean — all extraction checks passed');
    else g.findings.forEach(f => console.log(`  ✗ [${f.sev}] ${f.what}`));
  }
  // summary
  const all = runs.flatMap(r => (r.degraded === r.turns ? [] : grade(r).findings));
  const p0 = all.filter(f => f.sev === 'P0').length, p1 = all.filter(f => f.sev === 'P1').length, p2 = all.filter(f => f.sev === 'P2').length;
  console.log(`\n${'='.repeat(60)}\nSUMMARY: ${p0} P0 · ${p1} P1 · ${p2} P2  across ${runs.length} interviews`);
  process.exit(p0 ? 1 : 0);
})().catch(e => { console.log('coach-uat threw:', e.message); process.exit(1); });
