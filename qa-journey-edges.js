/* Phase-0 edge-state camera — journey states the standard suites never exercise:
 * late joiner mid-Surface · a PHONE driving the canvas · timer expiry · the share
 * two-jobs problem · refresh-resume · ghost duplicate member.
 *   BASE=http://localhost:3200 node qa-journey-edges.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:3200';
const OUT = path.join(__dirname, 'qa-edges');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const wait = ms => new Promise(r => setTimeout(r, ms));
let shotN = 0;
const snap = async (page, name) => {
  shotN++;
  await page.screenshot({ path: path.join(OUT, String(shotN).padStart(2, '0') + '-' + name + '.png') }).catch(e => console.log('snap fail', name, e.message));
  console.log('  📸', name);
};
const step = async (name, fn) => {
  try { await fn(); console.log('  ✓', name); } catch (e) { console.log('  ⚠ FAILED:', name, '→', e.message.split('\n')[0]); }
};
async function actor(browser, vp) {
  const ctx = await browser.newContext({ viewport: vp || { width: 1440, height: 900 }, hasTouch: !!vp });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('   [pageerror]', e.message));
  await page.goto(BASE);
  return page;
}
async function joinAs(page, name, code) {
  await page.fill('[data-testid=join-name]', name);
  await page.fill('[data-testid=join-code]', code);
  await page.click('[data-testid=join-btn]');
  await page.waitForSelector('[data-testid=create-team-name]', { timeout: 8000 });
}
async function dropBlock(page, tool, x, y, text) {
  await page.click(`[data-testid=tool-${tool}]`);
  await page.click('[data-testid=surface-canvas]', { position: { x, y } });
  if (text) { await wait(140); await page.keyboard.type(text); }
  await page.click('[data-testid=tool-select]');
  await wait(150);
}

(async () => {
  const browser = await chromium.launch();
  try {
    // ---- setup: host + one team in Surface ----
    const F = await actor(browser);
    await F.click('[data-testid=host-btn]');
    await F.waitForSelector('.codechip', { timeout: 8000 });
    const code = (await F.textContent('.codechip')).trim();
    console.log('workshop:', code);
    const A = await actor(browser);
    await joinAs(A, 'Maya', code);
    await A.fill('[data-testid=create-team-name]', 'AP Squad');
    await A.click('[data-testid=create-team-btn]');
    await A.waitForSelector('[data-testid=stable]', { timeout: 8000 });
    const B = await actor(browser);
    await joinAs(B, 'Sam', code);
    await B.click('[data-testid=team-pick]'); // joins AP Squad
    await B.waitForSelector('[data-testid=stable]');

    // ---- EDGE 1: device dies → rejoin should RECLAIM the old member, not mint a ghost ----
    await step('ghost prevention via reclaim', async () => {
      const G1 = await actor(browser);
      await joinAs(G1, 'Rae', code);
      await G1.click('[data-testid=team-pick]');
      await G1.waitForSelector('[data-testid=stable]', { timeout: 8000 });
      await G1.context().close();                 // device dies — Rae goes offline
      await wait(800);
      const G2 = await actor(browser);            // new device, same human
      await joinAs(G2, 'Rae', code);
      await G2.click('[data-testid=team-pick]');
      await wait(700);
      await snap(G2, 'reclaim-picker');           // "Picking up where you left off?"
      const rec = G2.locator('.modalcard .teamrow').first();
      if (await rec.count()) await rec.click();
      await G2.waitForSelector('[data-testid=stable]', { timeout: 8000 });
      await wait(1200);
      await snap(G2, 'reclaim-done-lobby');
      await snap(F, 'reclaim-console-roster');    // console should show ONE Rae
      await G2.context().close();
    });

    // ---- start Surface ----
    await F.click('[data-testid=phase-surface]');
    await wait(250);
    if (await F.locator('[data-testid=modal-confirm]').count()) await F.click('[data-testid=modal-confirm]');
    await A.waitForSelector('[data-testid=surface-canvas]', { timeout: 8000 });
    await dropBlock(A, 'persona', 140, 100, 'OpCo GM');
    await dropBlock(A, 'trigger', 140, 220, 'invoice arrives');

    // ---- EDGE 2: late joiner mid-Surface ----
    await step('late joiner mid-Surface', async () => {
      const L = await actor(browser);
      await joinAs(L, 'Lena', code);
      await wait(1200);
      await snap(L, 'late-joiner-picker');        // what a latecomer sees first
      await L.click('[data-testid=team-pick]');
      await wait(600);
      const fresh=L.locator('[data-testid=join-fresh]');
      if(await fresh.count()) await fresh.click();   // reclaim offered → she's new
      await wait(1800);
      await snap(L, 'late-joiner-catchup');       // the 15-second saddle-up card
      const jl=L.locator('button:has-text("Jump in")');
      if(await jl.count()) await jl.click();
      await wait(600);
      await snap(L, 'late-joiner-first-surface');
      await L.context().close();
    });

    // ---- EDGE 3: refresh-resume mid-Surface ----
    await step('refresh-resume', async () => {
      await A.reload();
      await wait(2500);
      await snap(A, 'refresh-resume-surface');
    });

    // ---- EDGE 4: a PHONE driving the canvas ----
    await step('phone drives the canvas', async () => {
      const P = await actor(browser, { width: 390, height: 844 });
      await joinAs(P, 'Pia', code);
      await P.click('[data-testid=team-pick]');
      await wait(1200);
      const jump=P.locator('button:has-text("Jump in")');
      if(await jump.count()){ await snap(P,'phone-catchup-card'); await jump.click(); await wait(400); }
      await snap(P, 'phone-surface-initial');
      // try the real interaction: palette tap → canvas tap → type
      await P.click('[data-testid=tool-phase]').catch(() => {});
      await snap(P, 'phone-palette-tapped');
      await P.click('[data-testid=surface-canvas]', { position: { x: 180, y: 300 } }).catch(() => {});
      await wait(300);
      await P.keyboard.type('phone-typed phase').catch(() => {});
      await wait(300);
      await snap(P, 'phone-block-dropped');
      // the coach rail on a phone
      await P.click('[data-testid=rail-toggle]').catch(() => {});
      await wait(600);
      await snap(P, 'phone-rail-open');
      await P.click('[data-testid=rail-toggle]').catch(() => {});
      await P.context().close();
    });

    // ---- EDGE 5: timer expiry (custom 1 minute, watch it die) ----
    await step('timer expiry', async () => {
      await F.fill('[data-testid=timer-custom]', '1');
      await F.press('[data-testid=timer-custom]', 'Enter').catch(() => {});
      await wait(300);
      await F.click('[data-testid=timer-start]');
      await wait(500);
      await snap(F, 'timer-running-console');
      console.log('   …waiting 65s for expiry…');
      await wait(65000);
      await snap(F, 'timer-expired-console');
      await snap(A, 'timer-expired-member');
      await F.click('[data-testid=toggle-room]'); await wait(900);
      await snap(F, 'timer-expired-roomview');
      await F.click('[data-testid=toggle-room]');
    });

    // ---- EDGE 6: the share two-jobs problem needs 2 teams; make team 2, swap, share ----
    await step('share two-jobs', async () => {
      const C = await actor(browser);
      await joinAs(C, 'Bo', code);
      await C.fill('[data-testid=create-team-name]', 'ETL Crew');
      await C.click('[data-testid=create-team-btn]');
      await C.waitForSelector('[data-testid=surface-canvas]', { timeout: 8000 });
      const jumpC=C.locator('button:has-text("Jump in")');
      if(await jumpC.count()) await jumpC.click();
      await wait(300);
      await dropBlock(C, 'persona', 140, 100, 'Finance Analyst');
      await dropBlock(C, 'trigger', 140, 220, 'month end');
      await dropBlock(C, 'intent', 420, 110, 'cash position known before payroll');
      await dropBlock(C, 'outcome', 420, 240, 'payroll funded on time');
      // swap
      await F.click('[data-testid=phase-rebuild]'); await wait(250);
      if (await F.locator('[data-testid=modal-confirm]').count()) await F.click('[data-testid=modal-confirm]');
      await A.waitForSelector('#reveal-go:visible', { timeout: 9000 });
      await A.click('#reveal-go');
      await C.waitForSelector('#reveal-go:visible', { timeout: 9000 });
      await C.click('#reveal-go');
      await wait(800);
      // A's team logs an assumption (so C's team has a reckoning job at share)
      await A.click('.assumefloat summary');
      await A.fill('[data-testid=assumption-input]', 'presumably the ERP exposes a webhook');
      await A.click('[data-testid=add-assumption]');
      // share + present simultaneously
      await F.click('[data-testid=phase-share]'); await wait(250);
      if (await F.locator('[data-testid=modal-confirm]').count()) await F.click('[data-testid=modal-confirm]');
      await wait(2200);
      const pick = F.locator('[data-testid=present-pick]').first();
      if (await pick.count()) await pick.click();
      await wait(600);
      await snap(C, 'share-source-team-two-jobs');  // Bo's team: own fate + reckoning + a presentation happening
      await snap(A, 'share-rebuilder-during-present');
      await C.context().close();
    });
  } finally { await browser.close(); }
  console.log('\nDONE —', shotN, 'shots →', OUT);
})();
