/* Horsepower — record a participant's-eye-view journey to video.
 * Drives a Farrier + a 2nd team in the background to advance phases; records ONLY
 * the participant (Alex) screen, with a visible cursor and demo pacing.
 * Run with the server up:  BASE=http://localhost:3100 node record-journey.js
 * Output: ./uat-shots/journey.webm
 */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:3100';
const OUT = __dirname + '/uat-shots';
const VW = 1280, VH = 800;
fs.mkdirSync(OUT, { recursive: true });
const beat = (ms = 900) => new Promise(r => setTimeout(r, ms));

// a visible cursor dot that follows the (Playwright-driven) mouse — for the recording
const CURSOR = () => {
  const d = document.createElement('div');
  d.id = '__cur';
  d.style.cssText = 'position:fixed;width:20px;height:20px;border:2.5px solid #e02d2d;border-radius:50%;background:rgba(224,45,45,.22);z-index:99999;pointer-events:none;transform:translate(-50%,-50%);left:-80px;top:-80px;transition:transform .08s ease';
  const add = () => document.body && document.body.appendChild(d);
  if (document.body) add(); else addEventListener('DOMContentLoaded', add);
  addEventListener('mousemove', e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', () => { d.style.transform = 'translate(-50%,-50%) scale(.6)'; }, true);
  addEventListener('mouseup', () => { d.style.transform = 'translate(-50%,-50%) scale(1)'; }, true);
};

(async () => {
  const browser = await chromium.launch({ slowMo: 240 });

  // --- background actors (no recording) — each in its OWN context (isolated localStorage) ---
  const fctx = await browser.newContext({ viewport: { width: 1100, height: 760 } });
  const F = await fctx.newPage(); F.on('dialog', d => d.accept().catch(() => {}));
  const boctx = await browser.newContext({ viewport: { width: 1000, height: 720 } });
  const Bo = await boctx.newPage();

  await F.goto(BASE);
  await F.click('[data-testid=host-btn]');
  await F.waitForSelector('.codechip');
  const code = (await F.textContent('.codechip')).trim();

  // second team so the swap can fire
  await Bo.goto(BASE);
  await Bo.fill('[data-testid=join-name]', 'Bo'); await Bo.fill('[data-testid=join-code]', code);
  await Bo.click('[data-testid=join-btn]');
  await Bo.waitForSelector('[data-testid=create-team-name]');
  await Bo.fill('[data-testid=create-team-name]', 'ETL Crew'); await Bo.click('[data-testid=create-team-btn]');
  await Bo.waitForSelector('[data-testid=stable]');

  // --- the participant we RECORD ---
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, recordVideo: { dir: OUT, size: { width: VW, height: VH } } });
  await ctx.addInitScript(CURSOR);
  const A = await ctx.newPage();
  A.on('dialog', d => d.accept().catch(() => {}));

  // 1) Landing — meet your randomised steed, give it a shuffle
  await A.goto(BASE);
  await beat(1700);                                   // brand sketches in
  await A.waitForSelector('[data-testid=steed-name]');
  await beat(900);
  await A.click('[data-testid=reroll]'); await beat(900);   // 🎲 shuffle
  await A.click('[data-testid=reroll]'); await beat(1100);
  await A.fill('[data-testid=join-name]', 'Alex'); await beat(500);
  await A.fill('[data-testid=join-code]', code); await beat(500);
  await A.click('[data-testid=join-btn]');

  // 2) Team picker → watch the "meet the map" tour, then start a stable
  await A.waitForSelector('[data-testid=create-team-name]');
  await beat(5000);                                   // let the ontology tour build a couple of times
  await A.fill('[data-testid=create-team-name]', 'AP Squad'); await beat(500);
  await A.click('[data-testid=create-team-btn]');

  // 3) Lobby — big "Meet the Coach" slide + your stable cantering in
  await A.waitForSelector('[data-testid=stable]');
  await beat(8500);

  // 4) Farrier starts Surface
  await F.click('[data-testid=phase-surface]');
  await A.waitForSelector('[data-testid=surface-canvas]');
  await beat(1400);

  // background: give the OTHER team a small canvas so its teardown has a people inventory + brief
  await Bo.waitForSelector('[data-testid=surface-canvas]');
  const dropB = async (tool, x, y, text) => {
    await Bo.click(`[data-testid=tool-${tool}]`); await Bo.click('[data-testid=surface-canvas]', { position: { x, y } });
    await beat(120); if (text) await Bo.keyboard.type(text); await Bo.click('[data-testid=tool-select]'); await beat(120);
  };
  await dropB('persona', 150, 110, 'Finance Analyst');
  await dropB('trigger', 150, 230, 'month end');
  await dropB('intent', 430, 130, 'cash position known before payroll');
  await dropB('outcome', 430, 250, 'payroll funded on time');

  // 5) Author the map by hand
  const S = '[data-testid=surface-canvas]';
  const drop = async (tool, x, y, text) => {
    await A.click(`[data-testid=tool-${tool}]`); await beat(350);
    await A.click(S, { position: { x, y } }); await beat(300);
    if (text) { await beat(140); await A.keyboard.type(text); }
    await A.click('[data-testid=tool-select]'); await beat(450);
  };
  await drop('persona', 150, 110, 'OpCo GM');
  await drop('trigger', 150, 230, 'invoice arrives');
  await drop('phase', 430, 130, 'Reconcile');
  await drop('moment', 470, 185, 'match to PO');
  await drop('intent', 760, 120, 'suppliers paid on time so credit terms hold');
  await drop('outcome', 760, 250, 'credit terms kept');
  await beat(900);

  // talk to the Coach
  await A.fill('[data-testid=coach-input]', 'is “credit terms kept” a real decision or just a restatement?');
  await beat(500);
  await A.click('[data-testid=coach-send]');
  await beat(2600);

  // 6) Farrier triggers the swap
  await F.click('[data-testid=phase-rebuild]');

  // 7) The reveal
  await A.waitForSelector('#reveal.on');
  await beat(4200);                                   // dwell on the stamp + plot twist
  await A.click('#reveal-go');

  // 8) Rebuild — the teardown is on the map
  await A.waitForSelector('[data-testid=rebuild-canvas]');
  await beat(1600);
  const cand = A.locator('[data-testid=rebuild-canvas] .ingcard.candidate').first();
  if (await cand.count()) { await cand.hover(); await beat(2400); }   // reveal the WHY on a candidate card
  // build an AI-native agent block
  const RB = '[data-testid=rebuild-canvas]';
  await A.click('[data-testid=tool-agent]'); await beat(350);
  await A.click(RB, { position: { x: 380, y: 300 } }); await beat(300);
  await beat(140); await A.keyboard.type('continuous reconcile agent');
  await A.click('[data-testid=tool-select]'); await beat(900);
  // land a person
  await A.locator('.landperson textarea').first().fill('owns the eval: reviews exceptions, sets the rules');
  await beat(500);
  await A.locator('[data-testid=land-transforms]').first().click();
  await beat(1200);
  // log an assumption
  await A.click('.assumefloat summary'); await beat(500);
  await A.fill('[data-testid=assumption-input]', 'presumably someone validates upstream'); await beat(400);
  await A.click('[data-testid=add-assumption]');
  await beat(1600);

  // 9) Share — the double reveal + the ledger flip + the keepsake race card
  await F.click('[data-testid=phase-share]');
  await A.waitForSelector('.beforeafter');
  await beat(3500);                                   // ledger cards flip up
  await A.locator('[data-testid=race-card]').scrollIntoViewIfNeeded().catch(() => {});
  await beat(3500);                                   // dwell on the keepsake race card

  // finalize the video
  const video = A.video();
  await ctx.close();
  await fctx.close();
  await boctx.close();
  await browser.close();
  if (video) {
    const p = await video.path();
    const final = OUT + '/journey.webm';
    try { fs.renameSync(p, final); } catch (e) { fs.copyFileSync(p, final); }
    console.log('🎬 recorded →', final);
  } else {
    console.log('no video produced');
  }
})().catch(e => { console.error('record failed:', e.message); process.exit(1); });
