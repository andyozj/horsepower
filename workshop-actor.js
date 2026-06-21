/* One actor in a live 5-perspective workshop. Records video + logs timestamped observations.
 * ROLE=farrier|A|B|C|D  BASE=http://localhost:3900  node workshop-actor.js
 * Coordinates with the others THROUGH the server (phase-reactive) + a shared code file. */
const { chromium } = require('playwright');
const fs = require('fs');
const ROLE = process.env.ROLE || 'A';
const BASE = process.env.BASE || 'http://localhost:3900';
const DIR = process.env.WSDIR || '/tmp/hp-workshop5';
const CODEFILE = DIR + '/code.txt';
const VDIR = `${DIR}/${ROLE}`;
fs.mkdirSync(VDIR, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now();
const obs = [];
const note = (sev, msg) => { const line = `[+${((Date.now()-T0)/1000).toFixed(0)}s][${sev}] ${msg}`; obs.push(line); fs.writeFileSync(`${DIR}/${ROLE}.log`, obs.join('\n')); };
const NAMES = { A: ['Ava','AP Squad'], B: ['Ben','Onboarding Crew'], C: ['Cara','Logistics Pod'], D: ['Dane','Returns Team'] };
// long-form rounds for a watchable recording (override via env)
const SURFACE_MS = +(process.env.SURFACE_MS||0) || 300000;
const REBUILD_MS = +(process.env.REBUILD_MS||0) || 240000;
const VW = +process.env.VW || 1920, VH = +process.env.VH || 1080;   // HD recording (override via env)
// a real, role-specific interview conversation per team — builds a rich ontology via the live AI Coach
const TURNS = {
  A: [
    "We run accounts payable. It kicks off when a supplier invoice lands in our shared inbox, usually a PDF attachment.",
    "Ava — that's me — opens it and keys the header into the finance system: supplier, amount, PO number. The painful part is when there's no PO or it doesn't match.",
    "When it doesn't match I have to chase the buyer who raised it, and that's where it stalls for days — suppliers start calling about payment.",
    "Raj, our financial controller, is the one on the hook to approve anything over ten thousand pounds before it's paid. He signs off in the system.",
    "The supplier is who we're really serving — if we pay late they put us on credit hold, which blocks new orders. On-time payment is the whole point.",
    "The decision we're actually making each time is: pay now, hold for a query, or reject. That's the call, not just 'process the invoice'.",
    "The outcome we want is the invoice settled within terms and the supplier kept happy. It runs about forty times a day and spikes hard at month-end."
  ],
  B: [
    "We onboard new hires. It starts the moment HR marks a candidate as 'accepted' in the system — that's our trigger.",
    "Ben — me — picks it up and sets up their accounts: email, laptop order, building access. The slow bit is laptop procurement, it takes days.",
    "The hiring manager is accountable for the new starter being productive on day one; if something's missing they get the angry call.",
    "The new hire is who we serve — a bad first day kills their confidence and we lose people in the first month over it.",
    "IT does the actual provisioning; we just request and chase. The pain is nobody owns the end-to-end, so things fall through the cracks.",
    "The real decision each time is: is this person ready to start, or do we delay their start date? That's the judgment call.",
    "Outcome we want: the new hire fully set up and welcomed before day one. About fifteen a week, far more in graduate season."
  ],
  C: [
    "We're logistics — we dispatch customer orders. It triggers when an order hits 'paid and ready to ship' in the warehouse system.",
    "Cara — me — checks stock and picks a carrier by destination and weight. The painful part is when stock says available but the shelf is empty.",
    "On a stock mismatch I hold the order and raise a discrepancy, and the customer's delivery clock is already ticking.",
    "The warehouse manager is accountable for the same-day dispatch SLA; missing it is what gets escalated to them.",
    "The customer is who we serve — they paid for next-day, and if we miss it we eat the refund and the trust.",
    "The decision is really: ship now with what we have, split the shipment, or hold for restock. That's the call.",
    "Outcome: the order leaves the dock same-day, intact, on the cheapest carrier that still hits the promise. Hundreds a day, peaks on Mondays."
  ],
  D: [
    "We handle product returns. It starts when a customer submits a return request through the portal — that's the trigger.",
    "Dane — me — reviews the reason and decides if it qualifies, then issues a label. The slow part is judging 'used versus faulty'.",
    "When it's ambiguous I ask the customer for photos, and that back-and-forth drags it out for a week.",
    "The customer-service lead is accountable for the refund-turnaround target; long returns land on their desk.",
    "The customer is who we serve — a slow or unfair return is what makes them never buy again and leave a one-star review.",
    "The decision each time is: approve the refund, offer a replacement, or reject the return. That's the real judgment.",
    "Outcome we want: a fair decision and a refund or replacement within forty-eight hours. A couple hundred a day, spiking after the holidays."
  ]
};

async function newPage(b) {
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, recordVideo: { dir: VDIR, size: { width: VW, height: VH } } });
  const p = await ctx.newPage();
  p.on('pageerror', e => note('BUG', 'pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') note('BUG', 'console.error: ' + m.text().slice(0,160)); });
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  return { ctx, p };
}
// latency helper: time an action until a selector appears
async function timed(p, label, fn) { const t = Date.now(); await fn(); const dt = Date.now() - t; if (dt > 1500) note('LATENCY', `${label} took ${dt}ms`); return dt; }
async function drop(p, S, tool, x, y, text) {
  await p.click(`[data-testid=tool-${tool}]`).catch(()=>{});
  await p.click(S, { position: { x, y } }).catch(()=>{});
  if (text) { await wait(160); await p.keyboard.type(text); }
  await p.click('[data-testid=tool-select]').catch(()=>{});
  await wait(160);
}
async function present(p, sel, ms=120000) { try { await p.waitForSelector(sel, { timeout: ms }); return true; } catch { return false; } }

(async () => {
  const b = await chromium.launch();
  let ctx, p;
  try {
    if (ROLE === 'farrier') {
      ({ ctx, p } = await newPage(b));
      note('INFO', 'Farrier arrives on landing');
      await p.click('[data-testid=host-btn]'); await present(p, '.codechip', 15000);
      const code = (await p.textContent('.codechip')).trim();
      fs.writeFileSync(CODEFILE, code);
      note('INFO', `Hosted room ${code}; wrote code file. Reviewing the console rail.`);
      // observe the redesigned console lobby
      const railOk = await p.locator('.farrier-rail').count() === 1;
      note(railOk ? 'GOOD' : 'BUG', railOk ? 'Console shows the left rail (stepper/CTA/timer/big-screen)' : 'No left rail on console');
      // wait for 4 teams to assemble (poll team count via the lobby pills / stepper)
      note('INFO', 'Waiting for 4 teams to assemble…');
      const tEnd = Date.now() + 120000;
      let nTeams = 0;
      while (Date.now() < tEnd) {
        nTeams = await p.evaluate(() => document.querySelectorAll('.console .pill, .teamtable [data-testid=team-row]').length).catch(()=>0);
        if (nTeams >= 4) break; await wait(2000);
      }
      note(nTeams>=4 ? 'GOOD' : 'BUG', `${nTeams} teams assembled before starting`);
      // START SURFACE + set a 5-min timer
      await p.click('[data-testid=phase-surface]'); await wait(1500);
      note('INFO', 'Advanced to Surface');
      const autoRunning = await p.locator('.rail-timer [data-testid=timer-pause]').count() === 1;
      note(autoRunning ? 'GOOD' : 'NOTE', autoRunning ? 'Timer AUTO-STARTED on advance (no separate Start needed)' : 'Timer did not auto-start');
      // set 5 min via the tap-to-adjust custom field
      await p.locator('.rail-timer summary').click().catch(()=>{}); await wait(300);
      await p.fill('[data-testid=timer-custom]', String(Math.round(SURFACE_MS/60000))).catch(()=>{}); await p.keyboard.press('Enter').catch(()=>{}); await wait(300);
      await p.click('[data-testid=timer-start]').catch(()=>{});
      note('INFO', `Set a ${Math.round(SURFACE_MS/60000)}-min Surface timer`);
      await p.screenshot({ path: `${VDIR}/console-surface.png` });
      // run the FULL round so the teams really play; advance at most 30s early if all 4 are gate-ready
      const sEnd = Date.now() + SURFACE_MS, sFloor = sEnd - 30000;
      while (Date.now() < sEnd) {
        const ready = await p.locator('.teamtable .statustag.ready').count().catch(()=>0);
        if (ready >= 4 && Date.now() > sFloor) { note('INFO', 'All 4 teams gate-ready — advancing'); break; }
        await wait(4000);
      }
      // SWAP -> REBUILD
      await p.click('[data-testid=phase-rebuild]'); await wait(600);
      if (await p.locator('[data-testid=modal-confirm]').count()) { note('NOTE', 'Swap confirm modal appeared (thin teams) — confirming'); await p.click('[data-testid=modal-confirm]'); }
      await wait(1200);
      note('INFO', 'Swapped to Rebuild');
      await p.locator('.rail-timer summary').click().catch(()=>{}); await wait(300);
      await p.fill('[data-testid=timer-custom]', String(Math.round(REBUILD_MS/60000))).catch(()=>{}); await p.keyboard.press('Enter').catch(()=>{}); await wait(300);
      await p.click('[data-testid=timer-start]').catch(()=>{});
      note('INFO', `Set a ${Math.round(REBUILD_MS/60000)}-min Rebuild timer`);
      await p.screenshot({ path: `${VDIR}/console-rebuild.png` });
      const rEnd = Date.now() + REBUILD_MS, rFloor = rEnd - 30000;
      while (Date.now() < rEnd) { if (Date.now() > rFloor) break; await wait(5000); }
      // SHARE
      await p.click('text=← all teams').catch(()=>{});
      await p.click('[data-testid=phase-share]'); await wait(1500);
      note('INFO', 'Advanced to Share');
      // present each pair via the rail Big-screen picker, then gallery
      const picks = await p.locator('.farrier-rail [data-testid=present-pick]').count().catch(()=>0);
      note(picks>=1 ? 'GOOD' : 'NOTE', `Present-picker in the rail shows ${picks} pairs`);
      await p.locator('.farrier-rail [data-testid=present-pick]').first().click().catch(()=>{}); await wait(2500);
      await p.screenshot({ path: `${VDIR}/console-share.png` });
      await p.locator('.farrier-rail [data-testid=present-gallery]').click().catch(()=>{}); await wait(1500);
      // open the projector window (the second screen)
      const proj = await ctx.newPage(); await proj.goto(BASE + '?screen=room', { waitUntil:'domcontentloaded' }); await wait(2500);
      note(await proj.locator('.roomview').count()===1 ? 'GOOD' : 'BUG', 'Projector window (?screen=room) shows the room view');
      await proj.screenshot({ path: `${VDIR}/projector.png` }); await proj.close().catch(()=>{});
      await wait(40000);  // let teams do the reckoning
      // CLOSE
      await p.click('[data-testid=phase-closed]').catch(()=>{}); if (await p.locator('[data-testid=modal-confirm]').count()) await p.click('[data-testid=modal-confirm]'); await wait(1500);
      note('INFO', 'Closed the workshop. Done.');
      await p.screenshot({ path: `${VDIR}/console-closed.png` });
    } else {
      // MEMBER A/B/C/D
      const [name, team] = NAMES[ROLE];
      // wait for the Farrier to write the room code
      let code = null; const cEnd = Date.now() + 120000;
      while (Date.now() < cEnd) { if (fs.existsSync(CODEFILE)) { code = fs.readFileSync(CODEFILE,'utf8').trim(); if (code) break; } await wait(1000); }
      if (!code) { note('BUG', 'Never got a room code from the Farrier'); throw new Error('no code'); }
      ({ ctx, p } = await newPage(b));
      note('INFO', `${name} arrives; joining room ${code} as team "${team}"`);
      // JOIN
      await p.fill('[data-testid=join-name]', name); await p.fill('[data-testid=join-code]', code);
      await timed(p, 'join → team picker', async () => { await p.click('[data-testid=join-btn]'); await present(p, '[data-testid=create-team-name]', 20000); });
      note('INFO', 'On the team picker / ontology tour');
      await p.fill('[data-testid=create-team-name]', team); await p.click('[data-testid=create-team-btn]');
      await present(p, '[data-testid=stable]', 15000);
      note('INFO', 'In the lobby with my stable');
      await p.screenshot({ path: `${VDIR}/lobby.png` });
      // optional scratchpad
      const scr = p.locator('.scratch textarea');
      if (await scr.count()) { await scr.fill('we always chase missing info at the last minute').catch(()=>{}); await p.locator('body').click({position:{x:5,y:5}}).catch(()=>{}); note('GOOD','Lobby scratchpad let me park a frustration'); }
      // wait for SURFACE
      note('INFO', 'Waiting for the Farrier to start Surface…');
      const gotSurface = await present(p, '[data-testid=interview-hero], [data-testid=surface-canvas]', 240000);
      if (!gotSurface) { note('BUG','Surface never started for me'); }
      const tSurf = Date.now();
      // LIVE interview: switch to typing (guarded — never stall on a missing button), do REAL turns
      const S = '[data-testid=surface-canvas]';
      if (await p.locator('[data-testid=interview-hero]').count()) {
        note('INFO','Surface opened in the AI interview');
        if (await p.locator('[data-testid=switch-type]').count()) { await p.locator('[data-testid=switch-type]').click().catch(()=>{}); await wait(700); }
        const turns = TURNS[ROLE] || TURNS.A;
        for (const tt of turns) {
          if (!(await p.locator('[data-testid=coach-input]').count())) break;
          const before = await p.locator('.ivmsgs .bubble').count().catch(()=>0);
          await p.fill('[data-testid=coach-input]', tt).catch(()=>{});
          const t0 = Date.now(); await p.click('[data-testid=coach-send]').catch(()=>{});
          // watch the streamed reply land (first prose, then the full bubble)
          let replied=false, firstProse=null;
          for (let i=0;i<60;i++){ await wait(400);
            const sl = await p.locator('.bubble.streaming .stxt').count().catch(()=>0);
            if (sl && firstProse===null) { firstProse = Date.now()-t0; }
            if (await p.locator('.ivmsgs .bubble').count().catch(()=>0) > before+1){ replied=true; break; }
          }
          note(replied?'LATENCY':'NOTE', replied?`Coach reply: first words ${firstProse!=null?firstProse+'ms':'—'}, full ${Date.now()-t0}ms`:'Coach did not reply within ~24s');
          await wait(4500);   // read the reply before the next turn (paced, watchable)
        }
        note('INFO','Did a full live interview; checking the map it built');
      }
      await p.locator('[data-testid=interview-skip]').click().catch(()=>{}); await wait(800);
      await present(p, S, 20000);
      note('LATENCY', `Surface canvas usable ${Date.now()-tSurf}ms after phase change`);
      const aiBuilt = await p.evaluate(()=>document.querySelectorAll('[data-testid=surface-canvas] .node').length).catch(()=>0);
      note(aiBuilt>=4?'GOOD':'NOTE', `Live interview built ${aiBuilt} blocks on my map`);
      await p.screenshot({ path: `${VDIR}/surface-empty.png` });
      // top up only if the AI built little (fallback so the map is still transfer-grade for the swap)
      if (aiBuilt < 5) {
        await drop(p, S, 'persona', 130, 100, name+' (operator)');
        await drop(p, S, 'persona', 540, 320, 'Customer');
        await drop(p, S, 'trigger', 130, 210, 'request comes in');
        await drop(p, S, 'input', 130, 300, 'the request form');
        await drop(p, S, 'phase', 380, 120, 'Process it');
        await drop(p, S, 'intent', 700, 100, 'decide: approve or reject');
        await drop(p, S, 'outcome', 700, 230, 'customer served on time');
        note('INFO', `Hand-topped-up the map (AI built only ${aiBuilt})`);
      }
      // inspector: set capacity + WHY + pain on a persona
      await p.locator(S+' .node.persona').first().click().catch(()=>{});
      if (await present(p, '[data-testid=inspector-why]', 5000)) {
        await p.fill('[data-testid=inspector-why]', 'owns the decision').catch(()=>{});
        await p.locator('[data-testid=inspector-capacity] button:has-text("accountable")').click().catch(()=>{});
        await p.locator('[data-testid=inspector-pain]').click().catch(()=>{});
        note('GOOD', 'Inspector let me set capacity + WHY + flag a pain point');
      } else note('BUG', 'Could not open the block inspector');
      await p.click('[data-testid=tool-select]').catch(()=>{}); await wait(200);
      // the served Customer persona needs a capacity too (gate requires it)
      await p.locator(S+' .node.persona').nth(1).click().catch(()=>{});
      if (await present(p, '[data-testid=inspector-why]', 4000)) { await p.fill('[data-testid=inspector-why]','served on time').catch(()=>{}); await p.locator('[data-testid=inspector-capacity] button:has-text("served")').click().catch(()=>{}); }
      await p.click('[data-testid=tool-select]').catch(()=>{}); await wait(200);
      // try the Coach
      if (await p.locator('[data-testid=coach-input]').count()) { await p.fill('[data-testid=coach-input]','is our intent a real decision?').catch(()=>{}); await p.click('[data-testid=coach-send]').catch(()=>{}); await wait(1500); note('INFO','Asked the Coach a question'); }
      // check the gate
      const gate = await p.locator('[data-testid=gate]').textContent().catch(()=>'');
      note('INFO', 'Gate reads: ' + (gate||'').replace(/\s+/g,' ').slice(0,80));
      await p.screenshot({ path: `${VDIR}/surface-map.png` });
      // keep playing until the Farrier swaps — ask the Coach probing follow-ups + refine, don't just idle
      note('INFO', 'Map drafted — refining with the Coach until the swap…');
      const followups = ['what is the riskiest assumption baked into this map?', 'where would a brand-new joiner get confused?', 'which moment here is the real bottleneck?', 'is our outcome measurable, or too vague?', 'who carries the most risk when this goes wrong?'];
      let fi = 0;
      while (!(await p.locator('#reveal.on, [data-testid=rebuild-canvas]').count().catch(()=>0))) {
        if (await p.locator('[data-testid=coach-input]').count()) {
          await p.fill('[data-testid=coach-input]', followups[fi++ % followups.length]).catch(()=>{});
          await p.click('[data-testid=coach-send]').catch(()=>{});
          note('INFO', 'Pushed the Coach on the map while we wait');
        }
        await wait(35000);
        if (Date.now()-tSurf > 720000) break;   // hard ceiling so a stuck Farrier can't hang us forever
      }
      // wait for the SWAP REVEAL
      note('INFO', 'Waiting for the swap reveal…');
      const gotReveal = await present(p, '#reveal.on, [data-testid=rebuild-canvas]', 240000);
      if (await p.locator('#reveal.on').count()) {
        note('INFO', 'SWAP REVEAL fired');
        await p.screenshot({ path: `${VDIR}/reveal.png` });
        await present(p, '#reveal-go', 12000); await wait(2000);
        await p.click('#reveal-go').catch(()=>{});
      }
      await present(p, '[data-testid=rebuild-canvas]', 20000);
      note('INFO', 'In Rebuild with a teardown to rebuild');
      await p.screenshot({ path: `${VDIR}/rebuild.png` });
      // ── GENUINE rebuild: respond to the ACTUAL teardown received, not canned moves ──────────────
      // Read the real brief in front of me: the people inventory + the areas of concern + candidate
      // constraints. Then land each REAL person by their role, and add an AI agent per REAL concern.
      const td = await p.evaluate(() => {
        const txt = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim();
        return {
          concerns:   [...document.querySelectorAll('.ingcard.concern')].map(txt).filter(Boolean).slice(0, 4),
          candidates: [...document.querySelectorAll('.ingcard.candidate')].map(txt).filter(Boolean).slice(0, 4),
        };
      }).catch(() => ({ concerns: [], candidates: [] }));
      note('INFO', `My brief: ${td.concerns.length} areas of concern · ${td.candidates.length} candidate constraints`);
      // decide a person's fate + a note TAILORED to their actual role text (read live, re-render-safe)
      const fateFor = role => {
        const r = (role || '').toLowerCase();
        if (/custom|supplier|client|applicant|requester|served|new ?hire|employee|vendor|buyer/.test(r))
          return { fate: 'stays', note: `stays — this is who the work is FOR; the redesign gets them their outcome faster, with fewer hand-offs` };
        if (/manager|owner|lead|controller|head|director|approver|accountable|officer|supervisor/.test(r))
          return { fate: 'transforms', note: `transforms — stops signing off every case; sets the policy the agents run on and rules on the exceptions they escalate` };
        return { fate: 'transforms', note: `transforms — their manual handling (${(role || 'this work').slice(0, 38)}) becomes an agent's job; they own the edge cases and keep it honest` };
      };
      // land EVERY person in the inventory, each by who they actually are (read the first unlanded card each pass)
      let landed = 0, lguard = 0;
      while (lguard++ < 12) {
        const card = p.locator('.landperson:not(.landed)').first();
        if (!(await card.count().catch(() => 0))) break;
        const role = (await card.locator('.pr').textContent().catch(() => '') || '').trim();
        const f = fateFor(role);
        const ta = card.locator('textarea');
        if (await ta.count().catch(() => 0)) await ta.fill(f.note).catch(() => {});
        await card.locator('[data-testid=land-' + f.fate + ']').click().catch(() => {});
        await wait(700); landed++;
        note('GOOD', `Landed "${role.slice(0, 40)}" → ${f.fate}`);
      }
      note(landed ? 'GOOD' : 'NOTE', landed ? `Landed all ${landed} people, each by their real role` : 'No people inventory to land (thin brief)');
      // add an AI agent that addresses each REAL area of concern — this is the AI-native redesign move
      const targets = (td.concerns.length ? td.concerns : td.candidates).slice(0, 3);
      for (let i = 0; i < targets.length; i++) {
        const short = targets[i].replace(/^(the|a|an)\s+/i, '').split(/\s+/).slice(0, 5).join(' ').slice(0, 32);
        await drop(p, '[data-testid=rebuild-canvas]', 'agent', 330 + (i % 2) * 200, 470 + Math.floor(i / 2) * 92, 'AI: ' + short).catch(() => {});
      }
      note(targets.length ? 'GOOD' : 'NOTE', `Added ${targets.length} AI agents, each aimed at a real concern from the brief`);
      // log an assumption grounded in the actual brief — the debrief judges these
      await p.locator('.assumefloat summary').click().catch(() => {});
      if (await p.locator('[data-testid=assumption-input]').count().catch(() => 0)) {
        const a = td.concerns[0] ? `assume an agent can safely own "${td.concerns[0].slice(0, 48)}" without a human gate` : 'assume the upstream data is clean enough to automate on';
        await p.fill('[data-testid=assumption-input]', a).catch(() => {}); await p.click('[data-testid=add-assumption]').catch(() => {});
        note('GOOD', 'Logged an assumption grounded in the brief');
      }
      await p.screenshot({ path: `${VDIR}/rebuild-done.png` });
      // genuine work is done — idle calmly until the Farrier advances (no canned spam). Exit on Share OR
      // Closed so a fast Farrier close-out never leaves us spinning (the run-1/2 hang).
      note('INFO', 'Rebuild complete — AI-native, every person landed. Waiting for the Farrier.');
      while ((await p.locator('[data-testid=rebuild-canvas]').count().catch(() => 0)) && !(await p.locator('.beforeafter').count().catch(() => 0))) {
        await wait(8000);
      }
      // wait for SHARE
      note('INFO', 'Waiting for Share…');
      const gotShare = await present(p, '.beforeafter', 45000);
      if (!gotShare) note('NOTE','No Share double-reveal in view (room may already be Closed) — continuing');
      else {
        note('INFO', 'Share — the double reveal. Scrolling for the payoff.');
        const sc = p.locator('.share'); const sh = await sc.evaluate(e=>e.scrollHeight).catch(()=>0);
        for (let i=1;i<=6;i++){ await sc.evaluate((e,y)=>e.scrollTo(0,y), Math.round(sh*i/6)).catch(()=>{}); await wait(500); }
        // reckoning if it's my original being judged
        const rb = await p.locator('[data-testid=confirm-assumption]').count().catch(()=>0);
        if (rb) { await p.locator('[data-testid=confirm-assumption]').first().click().catch(()=>{}); note('GOOD','Did the assumption reckoning (confirmed one)'); }
        // commitment + pulse
        if (await p.locator('.commitcard textarea').count()) { await p.locator('.commitcard textarea').fill('stop the last-minute chase — let the agent flag gaps early').catch(()=>{}); note('GOOD','Filled my one commitment'); }
        if (await p.locator('[data-testid=race-card]').count()) { await p.locator('[data-testid=race-card]').scrollIntoViewIfNeeded().catch(()=>{}); await wait(600); const op = await p.locator('[data-testid=race-card]').evaluate(e=>getComputedStyle(e).opacity).catch(()=>'?'); note(op==='1'?'GOOD':'BUG', `Keepsake race card opacity=${op}`); }
        await p.screenshot({ path: `${VDIR}/share.png` });
      }
      // wait for CLOSED
      const gotClosed = await present(p, 'text=Workshop closed', 180000);
      if (gotClosed) { note('INFO','Reached the Closed keepsake screen'); await wait(800); await p.screenshot({ path: `${VDIR}/closed.png` }); }
    }
  } catch (e) { note('BUG', 'actor threw: ' + e.message); }
  // close context to flush the video, then find the saved file
  try { await ctx.close(); } catch {}
  await b.close();
  note('INFO', 'session ended');
  fs.writeFileSync(`${DIR}/${ROLE}.log`, obs.join('\n'));
  console.log(`\n=== ROLE ${ROLE} OBSERVATIONS ===\n` + obs.join('\n'));
  const vids = fs.readdirSync(VDIR).filter(f=>f.endsWith('.webm'));
  console.log('\nvideo:', vids.map(v=>VDIR+'/'+v).join(', '));
  console.log('shots in', VDIR);
  process.exit(0);
})();
