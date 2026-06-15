/* Adversarial a11y+UX+visual driver for the NEW Batch1/2/3 surfaces.
 * Self-hosted server expected on BASE (3403). Writes shots to ./shots, prints findings.
 */
const { chromium } = require('playwright');
const WebSocket = require('ws');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:3403';
const WSBASE = BASE.replace('http', 'ws');
const AXE = 'https://cdn.jsdelivr.net/npm/axe-core@4/axe.min.js';
const SHOTS = __dirname + '/shots';
const J = o => JSON.stringify(o);
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

async function axeSerious(page, ctxSel) {
  await page.addScriptTag({ url: AXE });
  await page.waitForFunction(() => !!window.axe, null, { timeout: 8000 });
  return page.evaluate(async (sel) => {
    const target = sel ? document.querySelector(sel) : document;
    const r = await window.axe.run(target || document, { rules: { 'color-contrast': { enabled: false } } });
    return r.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')
      .map(v => v.id + '(' + v.nodes.length + '):' + (v.nodes[0] && v.nodes[0].target.join(' ')));
  }, ctxSel);
}
async function axeContrast(page) {
  await page.addScriptTag({ url: AXE }).catch(()=>{});
  await page.waitForFunction(() => !!window.axe, null, { timeout: 8000 });
  return page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: ['color-contrast'] });
    return r.violations.flatMap(v => v.nodes.slice(0,6).map(n => (n.any[0] && n.any[0].data ? JSON.stringify(n.any[0].data.contrastRatio)+':'+n.any[0].data.fgColor+'/'+n.any[0].data.bgColor : '') + ' ' + n.target.join(' ')));
  });
}

// WS actor (for fast seeding)
function mk() { return new Promise((res, rej) => { const w = new WebSocket(WSBASE); w.on('open', () => res(w)); w.on('error', rej); }); }
async function actor() {
  const s = await mk(); s.lastState = null; s.seat = null; s.errors = [];
  s.on('message', d => { let m; try { m = JSON.parse(d); } catch { return; } if (m.type==='state') s.lastState=m.state; if (m.type==='seated') s.seat=m; if (m.type==='error') s.errors.push(m.error); });
  s.on('error', () => {}); return s;
}
function fixtureCanvas(p, intentText) {
  return { blocks: [
    { id:p+'p1', type:'persona', x:60, y:60, w:170, h:58, text:p==='a'?'OpCo GM':'Analyst', meta:{capacity:'accountable', why:'owns it'} },
    { id:p+'p2', type:'persona', x:60, y:380, w:170, h:58, text:p==='a'?'AP Clerk':'Ops', meta:{capacity:'operates', why:'does the work'} },
    { id:p+'tr', type:'trigger', x:60, y:160, w:180, h:54, text:'invoice arrives', meta:{} },
    { id:p+'in', type:'input', x:60, y:240, w:150, h:46, text:'supplier invoice', meta:{system:'Salesforce'} },
    { id:p+'ph', type:'phase', x:300, y:60, w:240, h:120, text:'Reconcile', meta:{why:'must match POs'} },
    { id:p+'m1', type:'moment', x:320, y:110, w:150, h:50, text:'match to PO', pain:true, meta:{phaseId:p+'ph'} },
    { id:p+'it', type:'intent', x:600, y:60, w:230, h:70, text:intentText||'suppliers paid on time so credit terms hold', meta:{} },
    { id:p+'oc', type:'outcome', x:600, y:170, w:200, h:62, text:'credit terms kept', meta:{} }
  ], arrows:[{id:p+'ar1', from:p+'tr', to:p+'ph'}], orphans:[], chat:[], glossary:[],
     baseline:{frequency:'40×/mo', cycleTime:'3 days'} };
}

(async () => {
  const b = await chromium.launch();
  const ctx = (vp) => b.newContext({ viewport: vp||{width:1440,height:900}, deviceScaleFactor:2 });
  const shot = async (page, name, full) => { await page.screenshot({ path: SHOTS+'/'+name+'.png', fullPage: !!full }); log('   shot:', name); };

  // ============ Host a room via UI ============
  const F = await (await ctx()).newPage(); F.on('dialog', d=>d.accept().catch(()=>{}));
  await F.goto(BASE); await wait(400);
  await F.click('[data-testid=host-btn]'); await F.waitForSelector('.codechip');
  const code = (await F.textContent('.codechip')).trim();
  const hostKey = await F.evaluate(()=>JSON.parse(localStorage.getItem('horsepower.v2')||'{}').hostKey);
  log('HOSTED', code, 'hostKey', hostKey);
  const conf = async (p) => { await wait(300); if (await p.locator('[data-testid=modal-confirm]').count()) await p.click('[data-testid=modal-confirm]'); };

  // ============ R3 SANDBOX — landing button + sandbox room ============
  log('\n=== R3 SANDBOX ===');
  // sandbox-btn is on landing host area; go home on a fresh page
  const sbCtx = await ctx(); const SB = await sbCtx.newPage(); SB.on('dialog', d=>d.accept().catch(()=>{}));
  await SB.goto(BASE); await wait(500); // fresh landing — sandbox-btn lives on the landing host card
  const sbExists = await SB.locator('[data-testid=sandbox-btn]').count();
  log('sandbox-btn present on landing:', sbExists);
  await shot(SB, 'r3-landing-host-with-sandbox');
  if (sbExists) {
    await SB.click('[data-testid=sandbox-btn]'); await wait(1500);
    // should land in console with sandbox banner
    await shot(SB, 'r3-sandbox-console');
    const banner = await SB.evaluate(() => document.body.innerText.match(/dry.?run|practice|practise|only you/i) ? true : false);
    log('sandbox dry-run banner text present:', banner);
    let v = await axeSerious(SB);
    log('AXE sandbox console critical/serious:', v.length, v.slice(0,6).join(' | '));
    // drive it: advance to surface, then try to present room view
    const adv = async () => { const cta = SB.locator('[data-testid=run-cta], [data-testid=primary-cta]'); };
    // find the primary CTA testid
    const ctaSel = await SB.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>/start surface|swap|move to share|finish/i.test(x.textContent)); return b ? (b.getAttribute('data-testid')||b.textContent.trim()) : null; });
    log('sandbox CTA:', ctaSel);
    // advance through phases by clicking the hero CTA
    for (let i=0;i<4;i++){
      const btn = await SB.locator('button').filter({ hasText: /Start Surface|Swap → Rebuild|Move to Share|Finish & close/ }).first();
      if (await btn.count()) { await btn.click().catch(()=>{}); await conf(SB); await wait(900); }
    }
    await shot(SB, 'r3-sandbox-advanced');
    // open room view (present) for the sandbox
    const present = await SB.locator('[data-testid=present-btn], button:has-text("Present")').first();
    log('done sandbox drive');
  }

  // ============ Build the real room: 2 members, 2 teams, surface ============
  log('\n=== building real room ===');
  const a1 = await actor(), b1 = await actor(), facWS = await actor();
  facWS.send(J({type:'join', role:'farrier', workshopCode:code, hostKey}));
  a1.send(J({type:'join', role:'member', workshopCode:code, name:'Alex'}));
  b1.send(J({type:'join', role:'member', workshopCode:code, name:'Bo'}));
  await wait(300);
  a1.send(J({type:'team:create', workshopCode:code, name:'AP Squad', memberName:'Alex'})); await wait(200);
  const teamAId = a1.seat.teamId;
  b1.send(J({type:'team:create', workshopCode:code, name:'ETL Crew', memberName:'Bo'})); await wait(200);
  const teamBId = b1.seat.teamId;

  // ============ Join a real member browser (Alex) to see Surface UI ============
  const A = await (await ctx()).newPage(); A.on('dialog', d=>d.accept().catch(()=>{}));
  await A.goto(BASE); await wait(300);
  await A.fill('[data-testid=join-name]','Mara'); await A.fill('[data-testid=join-code]', code); await A.click('[data-testid=join-btn]');
  await A.waitForSelector('[data-testid=create-team-name]');
  await A.fill('[data-testid=create-team-name]','Visual Crew'); await A.click('[data-testid=create-team-btn]');
  await A.waitForSelector('[data-testid=stable]'); await A.click('[data-testid=lets-ride]'); await wait(300);
  const teamMaraId = await A.evaluate(()=> JSON.parse(localStorage.getItem('horsepower.v2')||'{}').teamId);
  log('Mara teamId', teamMaraId);

  await F.click('[data-testid=phase-surface]'); await conf(F);
  await A.waitForSelector('[data-testid=surface-canvas]', { timeout: 9000 }); await wait(700);

  // ============ R4 BASELINE STRIP (Surface) ============
  log('\n=== R4 baseline-strip + inspector-system ===');
  const blStrip = await A.locator('[data-testid=baseline-strip]').count();
  log('baseline-strip present on Surface:', blStrip);
  if (blStrip) {
    await A.locator('[data-testid=baseline-strip]').scrollIntoViewIfNeeded().catch(()=>{});
    await shot(A, 'r4-baseline-strip');
    // keyboard into the freq input — ensure no canvas hijack
    const inputs = A.locator('[data-testid=baseline-strip] input');
    const n = await inputs.count(); log('baseline inputs:', n);
    if (n) {
      await inputs.first().focus(); await inputs.first().type('50/mo'); await wait(200);
      const val = await inputs.first().inputValue();
      log('typed into baseline freq, value=', val, '(no hijack if "50/mo")');
      // axe on the baseline inputs (labels?)
    }
  }
  // inspector-system: place an input block, select it, check inspector-system field
  await A.click('[data-testid=tool-input]');
  await A.locator('.scene[data-testid=surface-canvas]').click({ position: { x: 400, y: 300 } }); await wait(200);
  await A.keyboard.type('CRM record'); await A.click('[data-testid=tool-select]'); await wait(300);
  await A.locator('[data-testid=surface-canvas] .node.input').first().click(); await wait(400);
  const sysField = await A.locator('[data-testid=inspector-system]').count();
  log('inspector-system field present for input block:', sysField);
  await shot(A, 'r4-inspector-system');
  if (sysField) {
    await A.locator('[data-testid=inspector-system]').focus();
    await A.locator('[data-testid=inspector-system]').type('Salesforce'); await wait(300);
    const sysHasLabel = await A.evaluate(()=>{ const e=document.querySelector('[data-testid=inspector-system]'); return { ariaLabel:e.getAttribute('aria-label'), placeholder:e.getAttribute('placeholder'), labelledByText:(function(){let p=e.closest('.inspector'); let lbls=[...(p?p.querySelectorAll('label,.lbl,.fieldlbl'):[])].map(x=>x.textContent.trim()); return lbls;})() }; });
    log('inspector-system labelling:', JSON.stringify(sysHasLabel));
  }
  let v = await axeSerious(A);
  log('AXE Surface (with inspector+baseline):', v.length, v.slice(0,8).join(' | '));

  // ============ R5 CLUSTER (Surface) — need >=4 orphans ============
  log('\n=== R5 cluster + synth ===');
  // seed orphans via WS on Mara's team
  const maraWS = await actor();
  // we can't easily get Mara's WS; instead use the page to park notes. Simpler: send orphans through a1? different team.
  // Use page: type orphans via the parking lot? Park via coach? Easiest: inject orphans on Mara's team via her own socket from page context.
  // park 5 notes through the REAL UI (orphan-input + Enter) so the page's knownIds merge is honoured
  const parkNotes = ['manager signs off the batch','second approver for big sums','finance approves over 10k','exception approval emailed','late invoices chased'];
  for (const note of parkNotes) {
    const inp = A.locator('[data-testid=orphan-input]');
    await inp.scrollIntoViewIfNeeded().catch(()=>{});
    await inp.click(); await inp.fill(note); await A.keyboard.press('Enter'); await wait(450);
  }
  await wait(600);
  const orphCount = await A.locator('[data-testid=surface-canvas] .orphan, .orphantray .orphan').count().catch(()=>0);
  log('orphans rendered in tray:', orphCount);
  const clusterBtn = await A.locator('[data-testid=cluster-orphans]').count();
  log('cluster-orphans button present (>=4 orphans):', clusterBtn);
  if (clusterBtn) {
    await A.locator('[data-testid=cluster-orphans]').scrollIntoViewIfNeeded().catch(()=>{});
    await shot(A, 'r5-cluster-button');
    await A.click('[data-testid=cluster-orphans]'); await wait(1500);
    const shelf = await A.locator('[data-testid=cluster-shelf]').count();
    log('cluster-shelf appeared after click (offline=honest absence, may be toast only):', shelf);
    await shot(A, 'r5-cluster-after-click');
    // record any toast
    const toastTxt = await A.evaluate(()=>{ const t=document.querySelector('#toasts .toast'); return t?t.textContent:null; });
    log('cluster toast:', toastTxt);
  }
  // make the canvas gate-green to surface the synth button — push via a WS actor that RECLAIMS Mara's seat
  const maraId = await A.evaluate(()=>JSON.parse(localStorage.getItem('horsepower.v2')||'{}'));
  const mWS = await actor();
  mWS.send(J({type:'join', role:'member', workshopCode:code, name:'Mara', teamId:maraId.teamId, memberId:maraId.memberId, token:maraId.seatToken})); await wait(300);
  mWS.send(J({type:'canvas:update', workshopCode:code, canvas:{ blocks:[
        {id:'mp1', type:'persona', x:60,y:60,w:170,h:58, text:'Owner', meta:{capacity:'accountable',why:'owns the decision'}},
        {id:'mp2', type:'persona', x:60,y:380,w:170,h:58, text:'Clerk', meta:{capacity:'operates',why:'runs it daily'}},
        {id:'mtr', type:'trigger', x:60,y:160,w:180,h:54, text:'request lands', meta:{why:'kicks it off'}},
        {id:'min', type:'input', x:60,y:240,w:150,h:46, text:'request form', meta:{system:'inbox', why:'the ask'}},
        {id:'mph', type:'phase', x:300,y:60,w:240,h:120, text:'Decide', meta:{why:'speed matters most'}},
        {id:'mm1', type:'moment', x:320,y:110,w:150,h:50, text:'weigh options', pain:true, meta:{phaseId:'mph'}},
        {id:'mit', type:'intent', x:600,y:60,w:240,h:70, text:'decide fast so the customer is not left waiting', meta:{why:'trust erodes with delay'}},
        {id:'moc', type:'outcome', x:600,y:170,w:200,h:62, text:'customer kept', meta:{}}
      ], arrows:[{id:'mar1',from:'mtr',to:'mph'},{id:'mar2',from:'mph',to:'mit'}], glossary:[], chat:[], orphans:[] } }));
  await wait(1000);
  await A.evaluate(()=>window.render&&window.render()); await wait(800);
  const greenNow = await A.locator('[data-testid=rosette]').count();
  log('gate green (rosette) after complete canvas:', greenNow);
  // synth buttons
  const synthSurf = await A.locator('[data-testid=synth-surface]').count();
  log('synth-surface "Read us back our map" present:', synthSurf, '(appears in gate-green polish strip)');
  // gate may not be green; check governance
  const gateGreen = await A.locator('.rosette, [data-testid=gate-green], .gate.ready').count().catch(()=>0);
  log('Mara gate-green indicator count:', gateGreen);
  if (synthSurf) {
    await shot(A, 'r5-synth-surface-btn');
    await A.click('[data-testid=synth-surface]'); await wait(1200);
    // 4-line bubble in rail
    const bubble = await A.evaluate(()=>{ const bs=[...document.querySelectorAll('.bubble')]; const last=bs[bs.length-1]; return last?last.textContent.slice(0,200):null; });
    log('synth bubble text:', bubble);
    await shot(A, 'r5-synth-bubble');
  }

  // ============ R7 WHISPER (Farrier drill-down) ============
  log('\n=== R7 whisper ===');
  // open drill-down for Mara's team on the Farrier console
  await F.evaluate(()=>window.render&&window.render());
  await wait(400);
  // find a drill / team row to click
  const drillSel = await F.evaluate(()=>{ const els=[...document.querySelectorAll('[data-testid^=drill],[onclick],.tr,.teamrow,.trow')]; return null; });
  // The console team rows — click team name to drill. Try testid patterns.
  await shot(F, 'r7-console-before-drill', true);
  const drillBtns = await F.locator('[data-testid^=drill-]').count();
  log('drill testids on console:', drillBtns);
  // try clicking a team row
  let drilled = false;
  const rowCandidates = await F.locator('.tr, .teamrow, .monitor-row, [data-testid=team-row]').count();
  log('candidate team rows:', rowCandidates);
  // attempt: click team name text
  try { await F.locator('text=Visual Crew').first().click({ timeout: 2000 }); await wait(600); drilled = await F.locator('[data-testid=whisper-input]').count()>0; } catch(e){}
  if (!drilled) {
    // try any element with class containing 'drill'
    const any = await F.locator('[class*=drill], [data-testid*=drill]').first();
    if (await any.count()) { await any.click().catch(()=>{}); await wait(500); drilled = await F.locator('[data-testid=whisper-input]').count()>0; }
  }
  log('drilled into team (whisper-input visible):', drilled);
  if (drilled) {
    await shot(F, 'r7-drilldown-whisper');
    await F.locator('[data-testid=whisper-input]').focus();
    await F.locator('[data-testid=whisper-input]').type('your trigger is still empty — 5 min left');
    await F.click('[data-testid=whisper-send]'); await wait(700);
    // farrier-note bubble should appear in Mara's rail — open the rail first
    await A.evaluate(()=>window.render&&window.render()); await wait(400);
    const railOpen0 = await A.locator('[data-testid=coach-input]').count();
    log('Surface rail open by default for Mara (coach-input visible):', railOpen0);
    if (await A.locator('[data-testid=farrier-note]').count()===0) {
      await A.locator('[data-testid=rail-toggle]').click({ force:true }).catch(()=>{});
      await wait(500);
    }
    const note = await A.locator('[data-testid=farrier-note]').count();
    log('farrier-note bubble landed in Mara rail:', note);
    const noteText = await A.locator('[data-testid=farrier-note]').first().textContent().catch(()=>'');
    log('farrier-note text:', (noteText||'').slice(0,120));
    await shot(A, 'r7-farrier-note-bubble');
    // unread badge?
    const unread = await A.evaluate(()=>{ const b=document.querySelector('.railtoggle .badge, .coachbtn .badge, [class*=unread]'); return b?b.textContent:'(none)'; });
    log('unread badge state:', unread);
    // banned vocab lint test from UI — type (fires input listener) then send
    await F.locator('[data-testid=whisper-input]').focus();
    await F.locator('[data-testid=whisper-input]').type('time to redesign this together');
    await wait(300);
    const warnOnType = await F.evaluate(()=>{ const w=document.querySelector('.whisperbox'); return w ? w.innerText : ''; });
    await F.click('[data-testid=whisper-send]'); await wait(500);
    const warnOnSend = await F.evaluate(()=>{ const w=document.querySelector('.whisperbox'); return w ? w.innerText : ''; });
    const chatAfter = await A.evaluate(()=>document.body.innerText.match(/redesign this together/)?true:false);
    log('whisper banned-vocab: warn-on-type=', /names the surprise|blocked/i.test(warnOnType), 'warn-on-send=', /names the surprise|rephrase/i.test(warnOnSend), 'leaked-to-team=', chatAfter);
    await shot(F, 'r7-whisper-banned');
  }

  // ============ Advance to SHARE for R1/R2/R10 ============
  log('\n=== advancing to share ===');
  // seed both WS teams with full canvas so swap works; Mara team also
  a1.send(J({type:'canvas:update', workshopCode:code, canvas:fixtureCanvas('a')})); await wait(150);
  b1.send(J({type:'canvas:update', workshopCode:code, canvas:fixtureCanvas('b','a monthly report')})); await wait(150);
  await A.evaluate(()=>{
    const cv = { blocks:[
        {id:'mp1', type:'persona', x:60,y:60,w:170,h:58, text:'Owner', meta:{capacity:'accountable',why:'owns it'}},
        {id:'mp2', type:'persona', x:60,y:380,w:170,h:58, text:'Clerk', meta:{capacity:'operates',why:'runs it'}},
        {id:'mtr', type:'trigger', x:60,y:160,w:180,h:54, text:'request lands', meta:{}},
        {id:'min', type:'input', x:60,y:240,w:150,h:46, text:'form', meta:{}},
        {id:'mph', type:'phase', x:300,y:60,w:240,h:120, text:'Decide', meta:{why:'must be quick'}},
        {id:'mit', type:'intent', x:600,y:60,w:230,h:70, text:'decisions made fast', meta:{}},
        {id:'moc', type:'outcome', x:600,y:170,w:200,h:62, text:'happy customer', meta:{}}
      ], arrows:[{id:'mar1',from:'mtr',to:'mph'}], glossary:[], chat:[], orphans:[] };
    window.wsSend({type:'canvas:update', canvas:cv});
  }); await wait(300);
  facWS.send(J({type:'phase:set', workshopCode:code, phase:'rebuild'})); await wait(800);
  // dismiss reveal on Mara
  if (await A.locator('#reveal.on').count()) { await wait(1900); await A.locator('#reveal-go').click().catch(()=>{}); await wait(600); }
  // land people quickly via WS to allow share to be meaningful; not required
  facWS.send(J({type:'phase:set', workshopCode:code, phase:'share'})); await wait(1000);
  await A.evaluate(()=>window.render&&window.render()); await wait(600);

  // ============ R1 commitment-card (share) ============
  log('\n=== R1 commitment-card + recap ===');
  const commitCard = await A.locator('[data-testid=commit-card]').count();
  log('commit-card present on share:', commitCard);
  if (commitCard) {
    await A.locator('[data-testid=commit-card]').scrollIntoViewIfNeeded(); await wait(300);
    await shot(A, 'r1-commit-card');
    await A.locator('[data-testid=commit-input]').focus();
    await A.locator('[data-testid=commit-input]').type('Stop the Friday approval email; let the system act.'); await wait(200);
    // B5: broadcast while typing — Bo commits, Mara should keep focus
    b1.send(J({type:'commitment:submit', text:'bo commit'})); await wait(700);
    const stillFocused = await A.evaluate(()=>document.activeElement && document.activeElement.dataset && document.activeElement.dataset.testid==='commit-input');
    log('B5 commit-input keeps focus through broadcast:', stillFocused);
    const caretOk = await A.evaluate(()=>{ const e=document.querySelector('[data-testid=commit-input]'); return e.selectionStart===(e.value||'').length; });
    log('B5 commit caret preserved at end:', caretOk);
    await A.locator('[data-testid=commit-input]').blur(); await wait(500);
  }
  let vShare = await axeSerious(A);
  log('AXE share (member):', vShare.length, vShare.slice(0,8).join(' | '));
  const vSc = await axeContrast(A);
  log('CONTRAST share member (top):', vSc.length, vSc.slice(0,6).join(' | '));

  // recap buttons
  const saveRecap = await A.locator('[data-testid=save-recap]').count();
  const copyRecap = await A.locator('[data-testid=copy-recap]').count();
  log('save-recap present:', saveRecap, 'copy-recap present:', copyRecap);
  if (saveRecap) {
    await A.locator('[data-testid=save-recap]').scrollIntoViewIfNeeded(); await shot(A, 'r1-recap-buttons');
    // capture download
    const [dl] = await Promise.all([
      A.waitForEvent('download', { timeout: 5000 }).catch(()=>null),
      A.click('[data-testid=save-recap]')
    ]);
    if (dl) {
      const p = SHOTS+'/recap-downloaded.html';
      await dl.saveAs(p);
      const html = fs.readFileSync(p,'utf8');
      log('recap downloaded, bytes=', html.length, 'has <h1>=', /<h1>/.test(html), 'external refs=', /https?:\/\//.test(html.replace(/redesign, don/i,'')));
      // render the recap to screenshot it
      const R = await (await ctx({width:760,height:1100})).newPage();
      await R.goto('file://'+p); await wait(500);
      await shot(R, 'r1-recap-rendered', true);
      let rv = await axeSerious(R);
      log('AXE recap.html:', rv.length, rv.slice(0,6).join(' | '));
      await R.close();
    } else log('recap download did NOT fire');
  }

  // ============ R2 pulse-card (share) ============
  log('\n=== R2 pulse-card + sliders ===');
  const pulseCard = await A.locator('[data-testid=pulse-card]').count();
  log('pulse-card present on share:', pulseCard);
  if (pulseCard) {
    await A.locator('[data-testid=pulse-card]').scrollIntoViewIfNeeded(); await wait(300);
    await shot(A, 'r2-pulse-card');
    // textarea no-hijack
    await A.locator('[data-testid=pulse-aha]').focus(); await A.locator('[data-testid=pulse-aha]').type('agents can act, not just advise'); await wait(150);
    const ahaVal = await A.locator('[data-testid=pulse-aha]').inputValue();
    log('pulse-aha typed (no canvas hijack):', ahaVal);
    // SLIDER keyboard ops
    await A.locator('[data-testid=pulse-before]').focus();
    const before0 = await A.locator('[data-testid=pulse-before]').inputValue();
    await A.keyboard.press('ArrowRight'); await A.keyboard.press('ArrowRight'); await wait(300);
    const before1 = await A.locator('[data-testid=pulse-before]').inputValue();
    log('slider arrow-key works:', before0, '->', before1);
    // accessible name + valuetext
    const sliderA11y = await A.evaluate(()=>{ const e=document.querySelector('[data-testid=pulse-before]'); return { ariaLabel:e.getAttribute('aria-label'), valuetext:e.getAttribute('aria-valuetext'), min:e.min,max:e.max, role:e.type }; });
    log('slider a11y:', JSON.stringify(sliderA11y));
    await A.locator('[data-testid=pulse-after]').focus(); await A.keyboard.press('End'); await wait(300);
    await shot(A, 'r2-pulse-filled');
    // B5: broadcast while pulse-aha focused
    await A.locator('[data-testid=pulse-aha]').focus(); await A.locator('[data-testid=pulse-aha]').type(' really');
    b1.send(J({type:'pulse:submit', aha:'bo aha', didDiff:'x', confBefore:3, confAfter:8})); await wait(700);
    const pulseFocus = await A.evaluate(()=>document.activeElement && document.activeElement.dataset && document.activeElement.dataset.testid==='pulse-aha');
    log('B5 pulse-aha keeps focus through broadcast:', pulseFocus);
    await A.locator('[data-testid=pulse-aha]').blur(); await wait(600);
  }

  // ============ R2 pulse-board (Farrier, closed) + R1 commitment on console ============
  log('\n=== advancing to closed for pulse-board ===');
  // clear the Farrier's drill-down so the console shows the dashboard (where pulse-board lives)
  await F.locator('button:has-text("all teams")').first().click().catch(()=>{}); await wait(400);
  facWS.send(J({type:'phase:set', workshopCode:code, phase:'closed'})); await wait(900);
  await F.locator('button:has-text("all teams")').first().click().catch(()=>{}); await wait(300);
  await F.evaluate(()=>window.render&&window.render()); await wait(600);
  const fView = await F.evaluate(()=>{ return { roomview: !!document.querySelector('.roomview'), console: !!document.querySelector('.console, [data-testid=stepper]'), bodyHas: /Exit pulse/.test(document.body.innerText) }; });
  log('F view at closed:', JSON.stringify(fView));
  await shot(F, 'r2-console-closed-full', true);
  const pboard = await F.locator('[data-testid=pulse-board]').count();
  log('pulse-board present on console (closed):', pboard);
  if (pboard) { await F.locator('[data-testid=pulse-board]').scrollIntoViewIfNeeded(); await shot(F, 'r2-pulse-board', true); }
  let vConsoleClosed = await axeSerious(F);
  log('AXE console closed (pulse-board):', vConsoleClosed.length, vConsoleClosed.slice(0,8).join(' | '));

  // R1 commitment card on member CLOSED
  await A.evaluate(()=>window.render&&window.render()); await wait(500);
  const commitClosed = await A.locator('[data-testid=commit-card]').count();
  log('commit-card present on member CLOSED screen:', commitClosed);
  await shot(A, 'r1-member-closed', true);

  // ============ R10 — 6-team Share gallery (projector contact-sheet) ============
  log('\n=== R10 6-team gallery + console density ===');
  const r2 = await fetch(BASE+'/api/workshop',{method:'POST'}); const { code:gcode, hostKey:gkey } = await r2.json();
  const gfac = await actor(); gfac.send(J({type:'join', role:'farrier', workshopCode:gcode, hostKey:gkey})); await wait(150);
  const gmembers = [];
  for (let i=0;i<6;i++){ const m=await actor(); m.send(J({type:'join', role:'member', workshopCode:gcode, name:'M'+i})); await wait(80); gmembers.push(m); }
  await wait(200);
  const gteamIds=[];
  for (let i=0;i<6;i++){ gmembers[i].send(J({type:'team:create', workshopCode:gcode, name:'Team '+(i+1), memberName:'M'+i})); await wait(120); gteamIds.push(gmembers[i].seat.teamId); }
  gfac.send(J({type:'phase:set', workshopCode:gcode, phase:'surface'})); await wait(200);
  for (let i=0;i<6;i++){ gmembers[i].send(J({type:'canvas:update', workshopCode:gcode, canvas:fixtureCanvas(String.fromCharCode(97+i))})); await wait(120); }
  await wait(400);
  gfac.send(J({type:'phase:set', workshopCode:gcode, phase:'rebuild'})); await wait(600);
  // land people minimally is not required for share; go to share
  gfac.send(J({type:'phase:set', workshopCode:gcode, phase:'share'})); await wait(600);

  // open a Farrier browser on the 6-team room
  const G = await (await ctx()).newPage(); G.on('dialog', d=>d.accept().catch(()=>{}));
  await G.goto(BASE); await wait(300);
  // host-join via host code path (co-host): use the details "Join as co-host"
  await G.evaluate(([c,k])=>{ localStorage.setItem('horsepower.v2', JSON.stringify({role:'farrier', code:c, hostKey:k, teamId:null, memberId:null, name:'', steed:null})); }, [gcode, gkey]);
  await G.goto(BASE); await wait(700);
  const consoleRows = await G.locator('.teamtable tr').count();
  log('console team rows (6 teams + header):', consoleRows);
  await shot(G, 'r10-console-6teams', true);
  let vG = await axeSerious(G);
  log('AXE console 6-team:', vG.length, vG.slice(0,8).join(' | '));

  // open room view, click Gallery (present null)
  // find present picker / gallery button
  await shot(G, 'r10-console-present-area', true);
  const galleryBtn = await G.locator('button:has-text("Gallery")').count();
  log('Gallery button present:', galleryBtn);
  // open the projector room view
  await G.locator('button:has-text("Open room view"), [data-testid=roomview-btn]').first().click().catch(()=>{}); await wait(800);
  const isGallery = await G.locator('.roomview.gallery').count();
  const gcells = await G.locator('.roomview .gcell').count();
  log('room view .gallery present:', isGallery, '.gcell count (expect 6):', gcells);
  await shot(G, 'r10-gallery-roomview', true);
  let vGR = await axeSerious(G);
  log('AXE gallery room view:', vGR.length, vGR.slice(0,6).join(' | '));

  gmembers.forEach(m=>m.close()); gfac.close(); await G.close().catch(()=>{});

  await F.close(); A.close && await A.close(); SB.close && await SB.close();
  a1.close(); b1.close(); facWS.close();
  await b.close();
  log('\n=== DRIVE DONE ===');
  process.exit(0);
})().catch(e => { console.error('DRIVE FAIL', e); process.exit(1); });
