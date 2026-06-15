// Farrier driver v2 — rejoins workshop R4QZ as host, WS-puppet fallback for missing teams
const { chromium } = require('playwright');
const WebSocket = require('ws');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:3200';
const WSBASE = BASE.replace('http','ws');
const CODE = process.env.CODE || 'R4QZ';
const HOSTKEY = process.env.HOSTKEY || 'VTBR';
const SHOT = 'qa-critic2/farrier';
const log = (...a) => console.log('['+new Date().toISOString().slice(11,19)+']', ...a);
let n = 7; // continue numbering after v1 shots
async function shot(page, name){ n++; const f=`${SHOT}/${String(n).padStart(2,'0')}-${name}.png`; try{ await page.screenshot({path:f}); log('shot',f); }catch(e){ log('shot FAIL',name,e.message); } return f; }
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const mkws = () => new Promise((res,rej)=>{ const w=new WebSocket(WSBASE); w.on('open',()=>res(w)); w.on('error',rej); });
const send = (w,o) => w.send(JSON.stringify(Object.assign({workshopCode:CODE},o)));

function puppetCanvas(seed){
  const S = seed;
  return { blocks:[
    { id:S+'p1', type:'persona', x:60, y:60, w:170, h:58, text:S==='q1'?'Credit controller':(S==='q2'?'Demand planner':'HR partner'), meta:{capacity:'accountable', why:'owns the final call'} },
    { id:S+'p2', type:'persona', x:60, y:140, w:170, h:58, text:S==='q1'?'AP clerk':(S==='q2'?'Sales ops analyst':'IT provisioner'), meta:{capacity:'operates the steps', why:'does the manual matching today'} },
    { id:S+'tr', type:'trigger', x:60, y:230, w:180, h:54, text:S==='q1'?'invoice lands in inbox':(S==='q2'?'month-end close':'offer accepted'), meta:{why:'nothing moves until this'} },
    { id:S+'in', type:'input', x:60, y:310, w:150, h:46, text:S==='q1'?'supplier invoice PDF':(S==='q2'?'ledger export':'signed contract'), meta:{} },
    { id:S+'ph1', type:'phase', x:300, y:60, w:240, h:130, text:S==='q1'?'Reconcile':(S==='q2'?'Collect inputs':'Provision access'), meta:{why:'errors here cost real money downstream'} },
    { id:S+'m1', type:'moment', x:320, y:115, w:160, h:50, text:S==='q1'?'match to PO by hand':(S==='q2'?'chase late submitters':'wait on ticket queue'), pain:true, meta:{phaseId:S+'ph1', why:'slow, error-prone, hated'} },
    { id:S+'it', type:'intent', x:600, y:60, w:240, h:70, text:S==='q1'?'decide which suppliers we pay first so credit terms hold':(S==='q2'?'decide where to shift stock before we stock out':'decide day-one readiness so the hire is productive'), meta:{why:'the decision the workflow exists to feed'} },
    { id:S+'oc', type:'outcome', x:600, y:170, w:210, h:62, text:S==='q1'?'credit terms kept':(S==='q2'?'no stockouts this quarter':'hire productive on day one'), meta:{} }
  ], arrows:[{id:S+'a1', from:S+'tr', to:S+'ph1'},{id:S+'a2', from:S+'ph1', to:S+'oc'}], orphans:[],
  chat: S==='q1'?[{role:'user',name:'Quinn',content:'Trigger is the invoice landing — sometimes by email, sometimes EDI.'},{role:'coach',content:'Who decides which suppliers get paid first when cash is tight — and why them?'},{role:'user',name:'Quinn',content:'The credit controller. Because they own the supplier relationships.'}]:[],
  glossary:[] };
}

(async()=>{
  // ---------- console browser ----------
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport:{width:1440,height:900}});
  const page = await ctx.newPage();
  const errors=[];
  page.on('console',m=>{ if(m.type()==='error') errors.push('CONSOLE: '+m.text()); });
  page.on('pageerror',e=>errors.push('PAGEERROR: '+e.message));
  await ctx.addInitScript(([code,hk])=>{ localStorage.setItem('horsepower.v2', JSON.stringify({role:'farrier', code, hostKey:hk, teamId:null, memberId:null, name:''})); }, [CODE,HOSTKEY]);
  await page.goto(BASE, {waitUntil:'networkidle'});
  await page.waitForTimeout(1500);
  fs.writeFileSync('/tmp/hp-critic/code.txt', CODE);
  await shot(page,'rejoined-console');
  const who = await page.evaluate(()=>{ try{ return JSON.parse(localStorage.getItem('horsepower.v2')); }catch(e){return null;} });
  log('rejoined as', JSON.stringify(who));

  const counts = async()=> page.evaluate(()=>{ const st=state; if(!st||!st.teams) return {teams:0,members:0,phase:null}; return {teams:st.teams.length, members:st.teams.reduce((s,t)=>s+(t.members||[]).length,0), phase:st.state}; });

  // ---------- wait for real teams ----------
  log('waiting up to 3.5min more for real teams (>=3 teams & >=5 members)');
  let dl = Date.now()+3.5*60*1000, c=await counts();
  while(Date.now()<dl){ c=await counts(); if(c.teams>=3&&c.members>=5){log('real teams reached',JSON.stringify(c)); break;} await sleep(5000); }
  log('after wait:', JSON.stringify(c));
  // cross-check against on-screen dashboard text
  const onscreen = await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,600));
  log('ONSCREEN (lobby):', onscreen.slice(0,300));
  await shot(page,'lobby-prestart');

  // ---------- puppet fill ----------
  const puppets=[];
  const needTeams = Math.max(0, 3-c.teams);
  if(needTeams>0){
    log('PUPPET FALLBACK: creating', needTeams, 'puppet teams (real agents absent)');
    const seeds=['q1','q2','q3'].slice(0,needTeams);
    const names={q1:'AP Squad (sim)', q2:'S&OP Crew (sim)', q3:'Onboard Posse (sim)'};
    const riders={q1:['Quinn','Pat'], q2:['Sam','Lee'], q3:['Bo','Max']};
    for(const s of seeds){
      const w1=await mkws(), w2=await mkws();
      const seat={}; w1.on('message',d=>{const m=JSON.parse(d); if(m.type==='seated') seat.teamId=m.teamId;});
      send(w1,{type:'join', role:'member', name:riders[s][0]});
      await sleep(120);
      send(w1,{type:'team:create', name:names[s], memberName:riders[s][0], steed:{name:'Sim '+s.toUpperCase(), color:'#7c3aed'}});
      await sleep(250);
      send(w2,{type:'join', role:'member', name:riders[s][1]});
      await sleep(120);
      if(seat.teamId) send(w2,{type:'team:join', teamId:seat.teamId, memberName:riders[s][1], steed:{name:'Sim2 '+s.toUpperCase(), color:'#2a9d8f'}});
      await sleep(250);
      puppets.push({seed:s, ws:w1, ws2:w2, teamId:seat.teamId});
      log('puppet team', names[s], 'teamId=', seat.teamId);
    }
  }
  c = await counts();
  log('counts after fill:', JSON.stringify(c));
  await shot(page,'lobby-filled');

  // ---------- START SURFACE (retry until enabled) ----------
  let started=false, sdl=Date.now()+60*1000;
  while(!started && Date.now()<sdl){
    try{ await page.click('[data-testid=phase-surface]',{timeout:3000}); started=true; }catch(e){ await sleep(2000); }
  }
  log('Start Surface clicked:', started);
  await page.waitForTimeout(1200);
  // reload + start the 6m clock fresh (v1 left a stale running timer)
  try{ await page.click('[data-testid=timer-6]'); await page.waitForTimeout(500); await shot(page,'surface-timer-loaded-nudge'); }catch(e){ log('timer-6 fail',e.message); }
  const surfNudge = await page.evaluate(()=> document.body.innerText.includes('clock loaded — Start when ready'));
  log('FIX M (surface entry) nudge visible:', surfNudge);
  try{ await page.click('[data-testid=timer-start]'); log('surface timer started'); }catch(e){ log('timer-start fail',e.message); }
  await page.waitForTimeout(800);
  await shot(page,'surface-monitoring');

  // puppets do their surface canvases (staggered, mid-window)
  const doPuppetCanvases = async()=>{ for(const p of puppets){ send(p.ws,{type:'canvas:update', canvas:puppetCanvas(p.seed)}); await sleep(400); } if(puppets.length) log('puppet canvases submitted'); };

  // ---------- MONITOR SURFACE ~4.5min ----------
  log('monitoring surface ~4.5min');
  const monEnd=Date.now()+4.5*60*1000;
  let drilled=false, canvased=false, midshot=false;
  while(Date.now()<monEnd){
    const left=monEnd-Date.now();
    if(!canvased && left<4*60*1000){ await doPuppetCanvases(); canvased=true; }
    if(!drilled && left<3.4*60*1000){
      try{
        await page.click('[data-testid=team-row]',{timeout:3000});
        await page.waitForTimeout(1200);
        await shot(page,'drill-roster-position'); // FIX J
        const pos = await page.evaluate(()=>{
          const cards=Array.from(document.querySelectorAll('.card'));
          const rosterCard=cards.find(x=>x.querySelector('h3')&&x.querySelector('h3').textContent==='Roster');
          const mirror=document.querySelector('.mirror');
          const chatCard=cards.find(x=>x.querySelector('h3')&&/Coach conversation/.test(x.querySelector('h3').textContent));
          const r=e=>e?{top:Math.round(e.getBoundingClientRect().top),bottom:Math.round(e.getBoundingClientRect().bottom)}:null;
          return { roster:r(rosterCard), mirror:r(mirror), chat:r(chatCard), viewportH:innerHeight,
                   rosterRows: rosterCard?rosterCard.querySelectorAll('.row').length:0,
                   chatText: chatCard?chatCard.innerText.replace(/\s+/g,' ').slice(0,260):null };
        });
        log('DRILL LAYOUT:', JSON.stringify(pos));
        // scroll to chat panel if any
        if(pos.chat){ await page.evaluate(()=>{ const c=Array.from(document.querySelectorAll('.card')).find(x=>x.querySelector('h3')&&/Coach conversation/.test(x.querySelector('h3').textContent)); if(c) c.scrollIntoView(); }); await page.waitForTimeout(500); await shot(page,'drill-coach-conversation'); }
        drilled=true;
        // back out of drill
        await page.evaluate(()=>{ ui.drillTeamId=null; render(); });
        await page.waitForTimeout(600);
        await shot(page,'surface-dashboard-mid');
      }catch(e){ log('drill fail',e.message); drilled=true; }
    }
    if(!midshot && left<60*1000){ await shot(page,'surface-late'); midshot=true; }
    await sleep(5000);
  }
  await shot(page,'surface-end');

  // ---------- SWAP ----------
  log('advancing to rebuild (swap)');
  try{
    await page.evaluate(()=>{ ui.drillTeamId=null; render(); });
    await page.waitForTimeout(500);
    await page.click('[data-testid=phase-rebuild]',{timeout:5000});
    await page.waitForTimeout(700);
    const m=await page.$('[data-testid=modal-confirm]');
    if(m){ await shot(page,'swap-confirm-modal'); await m.click(); log('confirmed swap modal'); } else log('no swap modal (all gate-green)');
  }catch(e){ log('swap fail',e.message); await shot(page,'swap-fail'); }
  await page.waitForTimeout(2200);
  await shot(page,'rebuild-console');
  try{ await page.click('[data-testid=timer-10]'); await page.waitForTimeout(400); await page.click('[data-testid=timer-start]'); }catch(e){}

  // puppet rebuild work: agent block + landings + assumption (after a beat)
  const doPuppetRebuild = async()=>{
    for(const p of puppets){
      const st = await page.evaluate(()=>state);
      const t = (st.teams||[]).find(x=>x.id===p.teamId);
      if(!t||!t.redesign) continue;
      const cv = JSON.parse(JSON.stringify(t.redesign.canvas));
      cv.blocks.push({id:'agent_'+p.seed, type:'agent', x:420, y:320, w:200, h:64, text:'triage & match agent', meta:{why:'kills the manual matching moment'}});
      send(p.ws,{type:'redesign:update', redesign:{canvas:cv}});
      await sleep(300);
      for(const pl of (t.redesign.peopleLandings||[])){
        send(p.ws,{type:'people:land', personId:pl.personId, outcome:'transforms', note:'owns the eval: reviews exceptions, sets thresholds, audits misses'});
        await sleep(200);
      }
      send(p.ws,{type:'assumption:add', text:'presumably the upstream data is validated before it reaches us'});
      await sleep(200);
    }
    if(puppets.length) log('puppet rebuild work submitted');
  };

  // ---------- MONITOR REBUILD ~3.5min, amendment watch ----------
  log('monitoring rebuild ~3.5min');
  const rbEnd=Date.now()+3.5*60*1000;
  let amendShot=false, amendApproved=false, rbWork=false, puppetAmendSent=false;
  while(Date.now()<rbEnd){
    const left=rbEnd-Date.now();
    if(!rbWork && left<3*60*1000){ await doPuppetRebuild(); rbWork=true; }
    const hasAmend = await page.evaluate(()=>{ const st=state; if(!st||!st.teams) return false; return st.teams.some(t=>(t.amendmentRequests||[]).some(r=>r.status==='pending')); });
    if(!hasAmend && !amendShot && !puppetAmendSent && left<100*1000 && puppets.length){
      log('no real amendment yet — puppet sends lock:challenge');
      send(puppets[0].ws,{type:'lock:challenge', field:'intent', reason:'the locked intent names a report, not the decision — we think the real call is which suppliers to pay first', proposed:'decide which suppliers we pay first each run'});
      puppetAmendSent=true;
      await sleep(1500);
    }
    if(hasAmend && !amendShot){
      await page.waitForTimeout(700);
      await shot(page,'amendment-card'); // FIX J
      const card = await page.evaluate(()=>{ const b=Array.from(document.querySelectorAll('.card')).find(x=>/Lock amendment/.test(x.textContent)); if(!b) return null;
        const cols=Array.from(b.querySelectorAll('.ac-col')).map(c=>c.textContent.replace(/\s+/g,' ').trim());
        const why=b.querySelector('.amend-why'); return { cols, why: why?why.textContent.replace(/\s+/g,' ').trim():null, whyFontSize: why?getComputedStyle(why).fontSize:null, visible: b.getBoundingClientRect().top<900 }; });
      log('AMENDMENT CARD:', JSON.stringify(card));
      amendShot=true;
    }
    if(amendShot && !amendApproved){
      try{ await page.click('[data-testid=approve-amend]',{timeout:3000}); log('approved amendment'); await page.waitForTimeout(900); await shot(page,'amendment-approved'); amendApproved=true; }catch(e){ log('approve fail',e.message); amendApproved=true; }
    }
    await sleep(4000);
  }
  if(!amendShot){ log('NO amendment ever arrived'); await shot(page,'rebuild-no-amend'); }
  await shot(page,'rebuild-end');

  // ---------- SHARE ----------
  log('advancing to share');
  try{
    await page.evaluate(()=>{ ui.drillTeamId=null; render(); });
    await page.waitForTimeout(500);
    await page.click('[data-testid=phase-share]',{timeout:5000});
    await page.waitForTimeout(700);
    const m=await page.$('[data-testid=modal-confirm]'); if(m){ await m.click(); log('confirmed share modal'); }
  }catch(e){ log('share fail',e.message); await shot(page,'share-fail'); }
  await page.waitForTimeout(2000);
  await shot(page,'share-console'); // FIX M
  const shareStats = await page.evaluate(()=>Array.from(document.querySelectorAll('.statrow > *')).map(e=>e.textContent.replace(/\s+/g,' ').trim()));
  log('SHARE STATS:', JSON.stringify(shareStats));

  // fix M nudge: load a fresh clock in share
  try{
    await page.click('[data-testid=timer-10]');
    await page.waitForTimeout(600);
    const nudge = await page.evaluate(()=>document.body.innerText.includes('clock loaded — Start when ready'));
    log('FIX M share nudge visible:', nudge);
    await shot(page,'share-timer-nudge');
  }catch(e){ log('share timer fail',e.message); }

  // ---------- PRESENT PAIRS ----------
  try{
    const picks = await page.$$('[data-testid=present-pick]');
    log('present-pick buttons:', picks.length);
    if(picks.length){ await picks[0].click(); await page.waitForTimeout(1300); await shot(page,'presenting-first'); }
    for(let i=0;i<4;i++){
      const nx = await page.$('button:has-text("Next pair")');
      if(!nx) break;
      await nx.click(); await page.waitForTimeout(1100); await shot(page,'presenting-next-'+i);
    }
    const cl = await page.$('button:has-text("Clear projector")');
    if(cl){ await cl.click(); await page.waitForTimeout(600); await shot(page,'projector-cleared'); }
  }catch(e){ log('present fail',e.message); }

  log('share dwell ~100s');
  await sleep(100*1000);
  await shot(page,'share-late');

  // ---------- FINISH & CLOSE ----------
  log('finish & close');
  try{
    await page.click('[data-testid=phase-closed]',{timeout:5000});
    await page.waitForTimeout(700);
    const m=await page.$('[data-testid=modal-confirm]');
    if(m){ await shot(page,'close-confirm'); await m.click(); log('confirmed close'); }
  }catch(e){ log('close fail',e.message); await shot(page,'close-fail'); }
  await page.waitForTimeout(2000);
  await shot(page,'closed-console'); // FIX M closed stats
  const closedStats = await page.evaluate(()=>Array.from(document.querySelectorAll('.statrow > *')).map(e=>e.textContent.replace(/\s+/g,' ').trim()));
  const closedText = await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,700));
  log('CLOSED STATS:', JSON.stringify(closedStats));
  log('CLOSED TEXT:', closedText.slice(0,400));

  log('=== PAGE ERRORS ('+errors.length+') ===');
  errors.forEach(e=>log(e));
  fs.writeFileSync('/tmp/hp-critic/farrier-errors.txt', errors.join('\n')||'(none)');
  puppets.forEach(p=>{ try{p.ws.close(); p.ws2.close();}catch(e){} });
  await browser.close();
  log('DONE');
})().catch(e=>{ console.error('FATAL', e); process.exit(1); });
