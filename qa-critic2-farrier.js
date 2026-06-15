// Farrier driver — iteration 2 live critique
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:3200';
const SHOT = 'qa-critic2/farrier';
const CODE_FILE = '/tmp/hp-critic/code.txt';
const log = (...a) => console.log('[' + new Date().toISOString().slice(11,19) + ']', ...a);
let n = 0;
async function shot(page, name){ n++; const f = `${SHOT}/${String(n).padStart(2,'0')}-${name}.png`; try{ await page.screenshot({path:f}); log('shot', f); }catch(e){ log('shot FAIL', name, e.message); } return f; }
const sleep = ms => new Promise(r=>setTimeout(r,ms));

(async()=>{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1440,height:900} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m=>{ if(m.type()==='error') errors.push('CONSOLE: '+m.text()); });
  page.on('pageerror', e=>errors.push('PAGEERROR: '+e.message));

  log('navigate', BASE);
  await page.goto(BASE, {waitUntil:'networkidle'});
  await shot(page, 'landing');

  // HOST
  await page.click('[data-testid=host-btn]');
  await page.waitForTimeout(1500);
  await shot(page, 'host-created');

  // grab code — host bar shows hostKey chip; the room code is what teams join with
  const code = await page.evaluate(()=>{
    try { const me = JSON.parse(localStorage.getItem('horsepower.v2')||'null'); return me && me.code; } catch(e){ return null; }
  });
  log('CODE =', code);
  if(code){ fs.writeFileSync(CODE_FILE, code); log('wrote code to', CODE_FILE); }
  else { log('!!! NO CODE — trying DOM'); }

  // ===== WAIT for teams =====
  log('waiting up to 4min for >=3 teams & >=5 members');
  const deadline = Date.now() + 4*60*1000;
  let lastTeams=0, lastMembers=0;
  while(Date.now() < deadline){
    const counts = await page.evaluate(()=>{
      const st = state;
      if(!st || !st.teams) return {teams:0, members:0};
      return { teams: st.teams.length, members: st.teams.reduce((s,t)=>s+(t.members?t.members.length:0),0) };
    });
    lastTeams=counts.teams; lastMembers=counts.members;
    if(counts.teams>=3 && counts.members>=5){ log('reached', counts); break; }
    await sleep(4000);
  }
  log('teams/members at proceed:', lastTeams, lastMembers);
  await shot(page, 'lobby-dashboard');

  // ===== START SURFACE =====
  // load 6m timer first then start surface, then start timer
  try {
    await page.click('[data-testid=phase-surface]', {timeout:5000});
    log('clicked Start Surface');
  } catch(e){ log('Start Surface click failed', e.message); await shot(page,'start-surface-fail'); }
  await page.waitForTimeout(1500);
  await shot(page, 'surface-started');

  // timer 6m + start
  try { await page.click('[data-testid=timer-6]'); await page.waitForTimeout(400); await shot(page,'timer-6-loaded-nudge'); } catch(e){ log('timer-6 fail', e.message); }
  try { await page.click('[data-testid=timer-start]'); log('timer started'); } catch(e){ log('timer-start fail', e.message); }
  await page.waitForTimeout(800);
  await shot(page, 'surface-monitoring');

  // ===== MONITOR ~4.5min, drill a team for fix J (roster above mirror) =====
  log('monitoring surface ~4.5min');
  const monEnd = Date.now() + 4.5*60*1000;
  let drilled=false;
  while(Date.now() < monEnd){
    // drill into first team ~30s in
    if(!drilled && Date.now() > monEnd - 4*60*1000){
      try {
        await page.click('[data-testid=team-row]', {timeout:3000});
        await page.waitForTimeout(1200);
        await shot(page, 'drill-team-roster-above-mirror'); // FIX J check
        // capture whether roster section sits above mirror in DOM order
        const layout = await page.evaluate(()=>{
          const all = Array.from(document.querySelectorAll('h3,h2,.card'));
          const txt = all.map(e=>e.textContent.slice(0,40)).join(' | ');
          // find roster + mirror vertical positions
          const find = (re)=>{ const e=Array.from(document.querySelectorAll('*')).find(x=>re.test(x.textContent||'')&&x.children.length<6); return e?Math.round(e.getBoundingClientRect().top):null; };
          return { headings: txt.slice(0,400) };
        });
        log('drill layout headings:', layout.headings);
        drilled=true;
      } catch(e){ log('drill fail', e.message); }
    }
    await sleep(5000);
  }
  await shot(page, 'surface-monitor-end');

  // ===== SWAP =====
  // back out of drill if needed, advance to rebuild (swap)
  log('advancing to rebuild (swap)');
  try {
    // un-drill: clear drillTeamId
    await page.evaluate(()=>{ if(ui) ui.drillTeamId=null; if(typeof render!=="undefined"&&render) typeof render!=="undefined"&&render(); });
    await page.waitForTimeout(800);
    await page.click('[data-testid=phase-rebuild]', {timeout:5000});
    await page.waitForTimeout(900);
    await shot(page, 'swap-confirm-modal');
    await page.click('[data-testid=modal-confirm]', {timeout:5000});
    log('confirmed swap');
  } catch(e){ log('swap fail', e.message); await shot(page,'swap-fail'); }
  await page.waitForTimeout(2500);
  await shot(page, 'rebuild-started');

  // load rebuild timer (don't necessarily start)
  try { await page.click('[data-testid=timer-10]'); await page.waitForTimeout(400); await shot(page,'rebuild-timer-loaded'); } catch(e){}
  try { await page.click('[data-testid=timer-start]'); } catch(e){}

  // ===== MONITOR rebuild ~3.5min, watch for amendment =====
  log('monitoring rebuild ~3.5min, watching for amendment');
  const rbEnd = Date.now() + 3.5*60*1000;
  let amendShot=false, amendApproved=false;
  while(Date.now() < rbEnd){
    const hasAmend = await page.evaluate(()=>{
      const st=state; if(!st||!st.teams) return false;
      return st.teams.some(t=>(t.amendmentRequests||[]).some(r=>r.status==='pending'));
    });
    if(hasAmend && !amendShot){
      await page.waitForTimeout(600);
      await shot(page, 'amendment-card'); // FIX J — reason + locked-now vs proposed
      const card = await page.evaluate(()=>{
        const box=Array.from(document.querySelectorAll('.card')).find(c=>/Lock amendment/.test(c.textContent));
        return box?box.textContent.replace(/\s+/g,' ').slice(0,500):null;
      });
      log('AMENDMENT CARD TEXT:', card);
      amendShot=true;
    }
    if(hasAmend && amendShot && !amendApproved){
      try {
        await page.click('[data-testid=approve-amend]', {timeout:3000});
        log('approved amendment');
        await page.waitForTimeout(900);
        await shot(page, 'amendment-approved');
        amendApproved=true;
      } catch(e){ log('approve fail', e.message); }
    }
    await sleep(4000);
  }
  if(!amendShot){ log('NO amendment arrived during rebuild window'); await shot(page,'rebuild-no-amend'); }
  await shot(page, 'rebuild-monitor-end');

  // ===== SHARE =====
  log('advancing to share');
  try {
    await page.evaluate(()=>{ if(ui) ui.drillTeamId=null; if(typeof render!=="undefined"&&render) typeof render!=="undefined"&&render(); });
    await page.waitForTimeout(600);
    await page.click('[data-testid=phase-share]', {timeout:5000});
    await page.waitForTimeout(900);
    // share may or may not have a confirm modal
    const hasModal = await page.$('[data-testid=modal-confirm]');
    if(hasModal){ await page.click('[data-testid=modal-confirm]'); log('confirmed share'); }
  } catch(e){ log('share fail', e.message); await shot(page,'share-fail'); }
  await page.waitForTimeout(2000);
  await shot(page, 'share-console'); // FIX M — phase-aware stat cards

  // capture stat card labels (fix M)
  const shareStats = await page.evaluate(()=>{
    const stats=Array.from(document.querySelectorAll('.statrow .stat, .statrow > *')).map(e=>e.textContent.replace(/\s+/g,' ').trim()).filter(Boolean);
    return stats;
  });
  log('SHARE STAT CARDS:', JSON.stringify(shareStats));

  // load share timer to check "clock loaded — Start when ready" nudge (fix M)
  try {
    await page.click('[data-testid=timer-10]');
    await page.waitForTimeout(500);
    const nudge = await page.evaluate(()=>{
      const e=Array.from(document.querySelectorAll('*')).find(x=>/clock loaded — Start when ready/.test(x.textContent||'')&&x.children.length===0);
      return !!e;
    });
    log('FIX M nudge "clock loaded — Start when ready" present:', nudge);
    await shot(page, 'share-timer-nudge');
  } catch(e){ log('share timer fail', e.message); }

  // ===== PRESENT PAIRS =====
  log('presenting pairs');
  try {
    const picks = await page.$$('[data-testid=present-pick]');
    log('present-pick buttons:', picks.length);
    if(picks.length){ await picks[0].click(); await page.waitForTimeout(1200); await shot(page,'presenting-first-pair'); }
    // cycle Next pair
    for(let i=0;i<3;i++){
      const next = await page.$('button:has-text("Next pair")');
      if(!next) break;
      await next.click(); await page.waitForTimeout(1000); await shot(page,'presenting-next-'+i);
    }
    // clear projector
    const clear = await page.$('button:has-text("Clear projector")');
    if(clear){ await clear.click(); await page.waitForTimeout(600); await shot(page,'projector-cleared'); }
  } catch(e){ log('present fail', e.message); await shot(page,'present-fail'); }

  await page.waitForTimeout(2000);

  // ===== FINISH & CLOSE =====
  log('finishing & closing');
  try {
    await page.click('[data-testid=phase-closed]', {timeout:5000});
    await page.waitForTimeout(700);
    const hasModal = await page.$('[data-testid=modal-confirm]');
    if(hasModal){ await shot(page,'close-confirm'); await page.click('[data-testid=modal-confirm]'); log('confirmed close'); }
  } catch(e){ log('close fail', e.message); await shot(page,'close-fail'); }
  await page.waitForTimeout(2000);
  await shot(page, 'closed-console'); // FIX M — closed stats sane

  const closedStats = await page.evaluate(()=>{
    const stats=Array.from(document.querySelectorAll('.statrow .stat, .statrow > *')).map(e=>e.textContent.replace(/\s+/g,' ').trim()).filter(Boolean);
    return stats;
  });
  log('CLOSED STAT CARDS:', JSON.stringify(closedStats));

  log('=== ERRORS (', errors.length, ') ===');
  errors.forEach(e=>log(e));
  fs.writeFileSync('/tmp/hp-critic/farrier-errors.txt', errors.join('\n'));
  log('DONE');
  await browser.close();
})().catch(e=>{ console.error('FATAL', e); process.exit(1); });
