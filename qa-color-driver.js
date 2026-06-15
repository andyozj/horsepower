/* Color & surface audit driver. deviceScaleFactor:2. Drives all phases,
 * shoots every screen + zoomed swatches, and computes REAL WCAG ratios
 * from getComputedStyle. Never edits app files. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:3200';
const OUT = path.join(__dirname, 'qa-design', 'color');
fs.mkdirSync(OUT, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
let n = 0;
const ratios = [];
const snap = async (page, name, opts) => {
  n++;
  const f = path.join(OUT, String(n).padStart(2, '0') + '-' + name + '.png');
  try { await page.screenshot({ path: f, ...(opts || {}) }); console.log('  shot', path.basename(f)); }
  catch (e) { console.log('  SNAP FAIL', name, e.message); }
};
const clip = async (page, name, sel) => {
  const el = page.locator(sel).first();
  if (!(await el.count())) { console.log('  (no el for clip', name, ')'); return; }
  try { const box = await el.boundingBox(); if (!box) return;
    n++; const f = path.join(OUT, String(n).padStart(2,'0')+'-'+name+'.png');
    const pad = 6;
    await page.screenshot({ path: f, clip: { x: Math.max(0,box.x-pad), y: Math.max(0,box.y-pad), width: box.width+pad*2, height: box.height+pad*2 } });
    console.log('  clip', path.basename(f));
  } catch(e){ console.log('  CLIP FAIL', name, e.message); }
};
async function actor(browser, vp) {
  const ctx = await browser.newContext({ viewport: vp || { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE);
  return page;
}
async function dropBlock(page, sceneSel, tool, x, y, text) {
  await page.click(`[data-testid=tool-${tool}]`);
  await page.click(sceneSel, { position: { x, y } });
  if (text) { await wait(140); await page.keyboard.type(text); }
  await page.click('[data-testid=tool-select]');
  await wait(150);
}
const confirmIfModal = async (page) => { await wait(250); if (await page.locator('[data-testid=modal-confirm]').count()) await page.click('[data-testid=modal-confirm]'); };

// In-page WCAG contrast computation
const CONTRAST_FN = () => {
  const lum = (r,g,b) => { const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);}; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const parse = s => { const m=s.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(',').map(x=>parseFloat(x)); return {r:p[0],g:p[1],b:p[2],a:p[3]===undefined?1:p[3]}; };
  // composite over a base (for translucent)
  const over=(fg,bg)=>({r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),b:fg.b*fg.a+bg.b*(1-fg.a),a:1});
  window.__contrast = (selFg, selBg) => {
    const fgEl=document.querySelector(selFg); if(!fgEl) return {err:'no fg '+selFg};
    const bgEl=selBg?document.querySelector(selBg):fgEl;
    const cs=getComputedStyle(fgEl); let fg=parse(cs.color);
    // find an opaque bg by walking up
    let node=bgEl, bg=null;
    while(node){ const b=parse(getComputedStyle(node).backgroundColor); if(b&&b.a>0){ bg = bg? over(bg,b): b; if(b.a>=1) break; } node=node.parentElement; }
    if(!bg) bg={r:244,g:239,b:226,a:1}; // paper fallback
    if(fg.a<1) fg=over(fg,bg);
    const L1=lum(fg.r,fg.g,fg.b),L2=lum(bg.r,bg.g,bg.b);
    const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    return { ratio:Math.round(ratio*100)/100, color:cs.color, bg:`rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`, fontSize:cs.fontSize, fontWeight:cs.fontWeight, text:(fgEl.textContent||'').trim().slice(0,40) };
  };
};
async function measure(page, label, selFg, selBg){
  const r = await page.evaluate(([a,b])=>window.__contrast(a,b),[selFg,selBg||null]);
  ratios.push({ label, ...r });
  console.log('  ratio', label, r.ratio||r.err);
  return r;
}

(async () => {
  const browser = await chromium.launch();
  await browser.contexts(); // noop
  try {
    const F = await actor(browser);
    await F.addInitScript(CONTRAST_FN);
    // re-inject since addInitScript after goto won't apply; eval directly
    await F.evaluate(CONTRAST_FN);

    await wait(4500); await snap(F, 'landing-desktop');
    await measure(F, 'landing tag (muted-strong on paper)', '.poster .tag');
    await measure(F, 'landing hann (Caveat red on paper)', '.hann');
    await measure(F, 'landing label (muted on card)', 'label');
    await clip(F, 'landing-hero-swatch', '.poster');

    // cohost details
    await F.click('summary:has-text("Join as co-host")').catch(()=>{}); await wait(300);
    await snap(F, 'landing-cohost-open');
    await F.click('summary:has-text("Join as co-host")').catch(()=>{});

    // host
    await F.click('[data-testid=host-btn]');
    await F.waitForSelector('.codechip', { timeout: 8000 });
    const code = (await F.textContent('.codechip')).trim();
    console.log('  workshop', code);
    await wait(1200); await snap(F, 'console-lobby-empty');
    await measure(F, 'codechip', '.codechip');
    await measure(F, 'step muted (run bar)', '.step');
    await measure(F, 'ctareason thin', '.ctareason');
    await clip(F, 'runbar-swatch', '.runbar, .runrow');

    await F.click('[data-testid=toggle-room]'); await wait(900); await snap(F, 'roomview-lobby');
    await F.click('[data-testid=toggle-room]');

    // members
    const A = await actor(browser); await A.evaluate(CONTRAST_FN);
    await A.fill('[data-testid=join-name]', 'Maya'); await A.fill('[data-testid=join-code]', code);
    await A.click('[data-testid=join-btn]');
    await A.waitForSelector('[data-testid=create-team-name]', { timeout: 8000 });
    await wait(3500); await snap(A, 'picker-no-teams');
    await measure(A, 'picker pval (muted-strong)', '.pval');

    await A.fill('[data-testid=create-team-name]', 'Accounts Payable Excellence Squad');
    await A.click('[data-testid=create-team-btn]');
    await A.waitForSelector('[data-testid=stable]', { timeout: 8000 });
    await wait(4000); await snap(A, 'lobby-presaddle');
    await measure(A, 'statusline Caveat muted', '.statusline');

    const B = await actor(browser); await B.evaluate(CONTRAST_FN);
    await B.fill('[data-testid=join-name]', 'Sam'); await B.fill('[data-testid=join-code]', code);
    await B.click('[data-testid=join-btn]');
    await B.waitForSelector('[data-testid=team-pick]', { timeout: 8000 });
    await wait(1500); await snap(B, 'picker-with-team');
    await B.fill('[data-testid=create-team-name]', 'ETL Crew');
    await B.click('[data-testid=create-team-btn]');
    await B.waitForSelector('[data-testid=stable]', { timeout: 8000 });

    await A.click('[data-testid=lets-ride]'); await wait(2500); await snap(A, 'lobby-saddled');
    await wait(600); await snap(F, 'console-lobby-2teams');

    // surface
    await F.click('[data-testid=phase-surface]'); await confirmIfModal(F); await wait(1200);
    await A.waitForSelector('[data-testid=surface-canvas]', { timeout: 8000 }); await wait(800);
    await snap(A, 'surface-empty');
    await measure(A, 'emptyhint muted', '.emptyhint');
    const S = '[data-testid=surface-canvas]';
    await A.fill('[data-testid=coach-input]', 'an invoice lands in the shared inbox, someone checks it against the PO, then we chase the approver — month-end is chaos');
    await A.click('[data-testid=coach-send]'); await wait(1400); await snap(A, 'surface-coach-reply');
    await measure(A, 'coach bubble sys muted', '.bubble.sys');
    await measure(A, 'coach bubble nm muted-strong', '.bubble .nm');

    await dropBlock(A, S, 'persona', 120, 90, 'OpCo GM');
    await dropBlock(A, S, 'trigger', 120, 200, 'invoice arrives');
    await dropBlock(A, S, 'input', 120, 300, 'supplier invoice');
    await dropBlock(A, S, 'phase', 400, 120, 'Reconcile');
    await dropBlock(A, S, 'moment', 440, 175, 'match to PO');
    await dropBlock(A, S, 'intent', 700, 100, 'suppliers paid on time so credit terms hold');
    await dropBlock(A, S, 'outcome', 700, 230, 'credit terms kept');
    await A.click('[data-testid=tool-arrow]');
    await A.locator(S + ' .node.trigger').click();
    await A.locator(S + ' .node.phase').first().click();
    await A.click('[data-testid=tool-select]');
    await wait(600); await snap(A, 'surface-map-built');
    // swatch shots of each node type
    for (const t of ['persona','trigger','input','phase','moment','intent','outcome']) {
      await clip(A, 'node-'+t, S+' .node.'+t);
    }
    // node small muted text contrast on wash
    await measure(A, 'node small (muted) on intent wash', S+' .node.intent small', S+' .node.intent');
    await measure(A, 'node label (ink) on outcome wash', S+' .node.outcome', S+' .node.outcome');
    await measure(A, 'node ctxinfo muted on phase wash', S+' .node.phase .ctxinfo', S+' .node.phase');

    // inspector
    await A.locator(S+' .node.phase').first().click(); await wait(500);
    if (await A.locator('[data-testid=inspector]').count()) {
      await snap(A, 'surface-inspector');
      await measure(A, 'inspector ihead red Caveat', '.inspector .ihead');
    }
    // gate bar / chips
    const chips = A.locator('.chips .chip, .gchip');
    if (await chips.count()) { await snap(A, 'surface-gate-chips'); await clip(A, 'gate-chips-swatch', '.chips, .gatebar');
      await measure(A, 'gchip.bad thin on warn-wash', '.gchip.bad');
      await measure(A, 'gchip.miss muted on paper', '.gchip.miss'); }

    // B minimal map to allow swap
    await B.waitForSelector(S, { timeout: 8000 });
    await dropBlock(B, S, 'persona', 120, 90, 'Finance Analyst');
    await dropBlock(B, S, 'trigger', 120, 200, 'month end');
    await dropBlock(B, S, 'intent', 400, 100, 'cash position known before payroll');
    await dropBlock(B, S, 'outcome', 400, 230, 'payroll funded on time');
    await wait(400);
    await snap(A, 'surface-gate-state');

    // drill mirror + timer + room red TIME
    await F.click('[data-testid=team-row]'); await wait(900); await snap(F, 'console-drill-mirror');
    await F.click('text=← all teams').catch(()=>{});
    await F.click('[data-testid=timer-20]'); await F.click('[data-testid=timer-start]'); await wait(700);
    await snap(F, 'console-surface-timer');
    await F.click('[data-testid=toggle-room]'); await wait(900); await snap(F, 'roomview-timer-throne');
    await F.click('[data-testid=toggle-room]');
    // force the red low-time state via evaluate on the timer
    await snap(A, 'surface-with-timer');
    await measure(A, 'member timer chip', '.timer');

    // swap reveal — the navy scrim
    await F.click('[data-testid=phase-rebuild]'); await confirmIfModal(F); await wait(1100);
    await snap(A, 'reveal-stamp-scrim');
    await A.waitForSelector('#reveal-go:visible', { timeout: 8000 });
    await wait(1600); await snap(A, 'reveal-cta');
    await measure(A, 'reveal CTA button', '#reveal-go');
    await A.click('#reveal-go'); await wait(1400); await snap(A, 'rebuild-initial');

    // rebuild cards
    const cand = A.locator('.ingcard.candidate').first();
    if (await cand.count()) { await clip(A, 'card-candidate', '.ingcard.candidate'); await cand.hover(); await wait(500); await snap(A, 'rebuild-candidate-why'); }
    const concern = A.locator('.ingcard.concern').first();
    if (await concern.count()) await clip(A, 'card-concern', '.ingcard.concern');
    const lk = A.locator('[data-testid=rebuild-canvas] .node.locked').first();
    if (await lk.count()) { await clip(A, 'card-locked', '[data-testid=rebuild-canvas] .node.locked'); await lk.hover(); await wait(500); await snap(A, 'rebuild-locktip');
      await measure(A, 'locktip tiphint muted-strong', '.locktip .tiphint'); }
    await measure(A, 'candidate ctag thin', '.candidate .ctag');
    await measure(A, 'briefblock h muted uppercase', '.briefblock .h');

    // agent + people tray
    const R = '[data-testid=rebuild-canvas]';
    await dropBlock(A, R, 'agent', 300, 400, 'continuous reconcile agent');
    await clip(A, 'node-agent', R+' .node.agent');
    const tr = A.locator('[data-testid=land-tray]');
    if (await tr.count()) {
      await clip(A, 'land-tray-swatch', '[data-testid=land-tray]');
      await tr.locator('textarea').first().fill('moves to exception-judging — approves edge cases the agent cannot');
      await A.locator('[data-testid=land-transforms]').first().click(); await wait(700);
      await snap(A, 'people-landed');
      await measure(A, 'land-btn removed strikethrough muted', '.land-btn.removed.on').catch(()=>{});
    }
    await A.click('.assumefloat summary').catch(()=>{});
    await A.fill('[data-testid=assumption-input]', 'presumably the ERP can expose a webhook').catch(()=>{});
    await A.click('[data-testid=add-assumption]').catch(()=>{}); await wait(500); await snap(A, 'assumptions-open');
    await measure(A, 'assumption busted muted strike', '.assumption').catch(()=>{});
    await A.click('.assumefloat summary').catch(()=>{});

    // challenge a lock → amendment
    const lk2 = A.locator('[data-testid=rebuild-canvas] .node.locked').first();
    await lk2.click(); await wait(300);
    if (await A.locator('[data-testid=challenge-lock]').count()) {
      await A.click('[data-testid=challenge-lock]'); await wait(400); await snap(A, 'challenge-modal');
      await A.fill('.modalcard textarea', 'this intent is an artifact — capture missed the decision').catch(()=>{});
      await A.fill('.modalcard input', 'decide pay vs dispute before month-end').catch(()=>{});
      await A.click('[data-testid=send-challenge]'); await wait(400);
    }
    await wait(700); await snap(F, 'console-rebuild-amendment');
    const apr = F.locator('[data-testid=approve-amendment]');
    if (await apr.count()) { await snap(F, 'amendment-card'); await clip(F, 'amendment-swatch', '.amendcard, .needs, .amendment'); await apr.first().click(); await wait(700); }

    // share
    await F.click('[data-testid=phase-share]'); await confirmIfModal(F); await wait(2800);
    await snap(A, 'share-top');
    await A.evaluate(() => { const s = document.querySelector('.share'); if (s) s.scrollTop = s.scrollHeight; });
    await wait(900); await snap(A, 'share-bottom-racecard');
    await clip(A, 'racecard-swatch', '.racecard');
    await measure(A, 'ledger kept text', '.ledger .kept, .ledgerrow').catch(()=>{});
    await snap(B, 'share-team-b');
    // reckoning buttons
    const rb = B.locator('[data-testid=confirm-assumption]').first();
    if (await rb.count()) { await snap(B, 'share-reckoning'); await clip(B, 'reckoning-swatch', '.reckon, .reckoning'); }

    // console share + present room view
    await snap(F, 'console-share');
    const pick = F.locator('[data-testid=present-pick]').first();
    if (await pick.count()) await pick.click();
    await wait(400);
    await F.click('[data-testid=toggle-room]'); await wait(1300); await snap(F, 'roomview-present');
    await F.click('[data-testid=toggle-room]');

    // close
    await F.click('[data-testid=phase-closed]').catch(async () => { await F.locator('.runcta').click(); });
    await confirmIfModal(F); await wait(900); await snap(A, 'closed-member');

    // toasts: trigger one by reloading B (catch-up) — just shoot whatever
    // home confirm modal
    const F2 = await actor(browser);
    await F2.click('[data-testid=host-btn]'); await F2.waitForSelector('.codechip', { timeout: 8000 });
    await F2.click('[data-testid=home]'); await wait(400); await snap(F2, 'home-confirm-modal');
    await clip(F2, 'modal-swatch', '.modalcard, .confirmmodal');
    await F2.click('[data-testid=modal-cancel]').catch(()=>{});

    // mobile landing
    const M = await actor(browser, { width: 390, height: 844 });
    await wait(2500); await snap(M, 'mobile-landing');
  } catch (e) { console.log('FATAL', e.message, e.stack); }
  finally {
    fs.writeFileSync(path.join(OUT, 'ratios.json'), JSON.stringify(ratios, null, 2));
    console.log('\nDONE —', n, 'shots. ratios:', ratios.length);
    await browser.close();
  }
})();
