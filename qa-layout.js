/* Layout & composition audit camera. Drives the full journey and screenshots
 * every screen at 1440x900, 1920x1080, 1280x800 (deviceScaleFactor 2), plus
 * 390x844 for working screens. Also measures real bounding boxes for suspect
 * alignments. Output → qa-design/layout/NN-name-WxH.png + boxes.json
 *   BASE=http://localhost:3200 node qa-layout.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:3200';
const OUT = path.join(__dirname, 'qa-design', 'layout');
fs.mkdirSync(OUT, { recursive: true });

const SIZES = [
  { w: 1440, h: 900, tag: '1440' },
  { w: 1920, h: 1080, tag: '1920' },
  { w: 1280, h: 800, tag: '1280' },
];
const wait = ms => new Promise(r => setTimeout(r, ms));
const boxes = {};
let shotN = 0;
const snap = async (page, name) => {
  shotN++;
  const f = path.join(OUT, String(shotN).padStart(2, '0') + '-' + name + '.png');
  await page.screenshot({ path: f }).catch(e => console.log('  snap fail', name, e.message));
  console.log('  📸', path.basename(f));
};
const step = async (name, fn) => {
  try { await fn(); } catch (e) { console.log('  ⚠ FAIL:', name, '→', e.message.split('\n')[0]); }
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
  await wait(120);
}
const confirmIfModal = async (page) => { await wait(250); if (await page.locator('[data-testid=modal-confirm]').count()) await page.click('[data-testid=modal-confirm]'); };
// measure boxes of selectors on the page
async function measure(page, key, sels) {
  const r = await page.evaluate((sels) => {
    const out = {};
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) { const b = el.getBoundingClientRect(); out[s] = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), bot: Math.round(b.bottom) }; }
      else out[s] = null;
    }
    out.__viewport = { w: window.innerWidth, h: window.innerHeight };
    return out;
  }, sels);
  boxes[key] = r;
  console.log('  📏', key, JSON.stringify(r).slice(0, 300));
}
// resize the page through all 3 desktop sizes and snap each
async function snapAll(page, name, settle = 500) {
  for (const s of SIZES) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await wait(settle);
    shotN++;
    const f = path.join(OUT, String(shotN).padStart(2, '0') + '-' + name + '-' + s.tag + '.png');
    await page.screenshot({ path: f }).catch(e => console.log('  snap fail', name, e.message));
    console.log('  📸', path.basename(f));
  }
  // restore 1440
  await page.setViewportSize({ width: 1440, height: 900 });
  await wait(300);
}

(async () => {
  const browser = await chromium.launch();
  try {
    const F = await actor(browser);

    // ---- landing ----
    await step('landing', async () => { await wait(4500); await snapAll(F, 'landing'); await measure(F, 'landing', ['.landingwrap', '.poster', '.poster h1', '.poster .tag', '.landform', '.landcard', '.heroslot']); });
    await step('cohost open', async () => { await F.click('summary:has-text("Join as co-host")'); await wait(250); await snap(F, 'landing-cohost-open'); await F.click('summary:has-text("Join as co-host")'); });

    // ---- host ----
    let code = '';
    await step('host', async () => {
      await F.click('[data-testid=host-btn]');
      await F.waitForSelector('.codechip', { timeout: 8000 });
      code = (await F.textContent('.codechip')).trim();
      console.log('  workshop:', code);
      await wait(1200);
      await snapAll(F, 'console-lobby-empty');
      await measure(F, 'console-lobby', ['.runbar', '.stepper', '.runcta', '.timerctl', '.dash', '.topbar']);
    });
    await step('room lobby', async () => { await F.click('[data-testid=toggle-room]'); await wait(900); await snapAll(F, 'roomview-lobby'); await F.click('[data-testid=toggle-room]'); });

    // ---- members ----
    const A = await actor(browser);
    await step('A join picker empty', async () => {
      await A.fill('[data-testid=join-name]', 'Maya'); await A.fill('[data-testid=join-code]', code);
      await A.click('[data-testid=join-btn]');
      await A.waitForSelector('[data-testid=create-team-name]', { timeout: 8000 });
      await wait(3500); await snapAll(A, 'picker-empty');
      await measure(A, 'picker', ['.pickwrap', '.pickhead', '.pickhead h2', '.card']);
    });
    await step('A create team', async () => {
      await A.fill('[data-testid=create-team-name]', 'Accounts Payable Process Excellence Squad');
      await A.click('[data-testid=create-team-btn]');
      await A.waitForSelector('[data-testid=stable]', { timeout: 8000 });
      await wait(4000); await snapAll(A, 'lobby-presaddle');
      await measure(A, 'lobby', ['.paddockpanel', '.coachpanel', '[data-testid=stable]', '.paddock']);
    });
    const B = await actor(browser);
    await step('B join picker w team', async () => {
      await B.fill('[data-testid=join-name]', 'Sam'); await B.fill('[data-testid=join-code]', code);
      await B.click('[data-testid=join-btn]');
      await B.waitForSelector('[data-testid=team-pick]', { timeout: 8000 });
      await wait(2500); await snapAll(B, 'picker-with-team');
    });
    await step('B create team 2', async () => {
      await B.fill('[data-testid=create-team-name]', 'ETL Crew');
      await B.click('[data-testid=create-team-btn]');
      await B.waitForSelector('[data-testid=stable]', { timeout: 8000 });
    });
    await step('A lobby', async () => { await wait(800); await snapAll(A, 'lobby-saddled'); });   // A2b: no saddle step
    await step('console 2 teams', async () => { await wait(600); await snapAll(F, 'console-lobby-2teams'); });

    // ---- surface ----
    await step('start surface', async () => { await F.click('[data-testid=phase-surface]'); await confirmIfModal(F); await wait(1200); });
    await step('A surface empty', async () => { await A.waitForSelector('[data-testid=interview-hero]', { timeout: 8000 }); await A.click('[data-testid=interview-skip]'); await wait(400); await A.waitForSelector('[data-testid=surface-canvas]', { timeout: 8000 }); await wait(800); await snapAll(A, 'surface-empty'); await measure(A, 'surface-empty', ['.toolbar', '.scene', '.rail', '.gatebar', '.goalnote', '.viewctl', '.canvaspane']); });
    const S = '[data-testid=surface-canvas]';
    await step('A coach reply', async () => {
      await A.fill('[data-testid=coach-input]', 'an invoice lands in the shared inbox, someone checks it against the PO, then we chase the approver — month-end is chaos');
      await A.click('[data-testid=coach-send]'); await wait(1200); await snap(A, 'surface-coach-reply-1440');
    });
    await step('A build map', async () => {
      await dropBlock(A, S, 'persona', 120, 90, 'OpCo GM');
      await dropBlock(A, S, 'trigger', 120, 200, 'invoice arrives');
      await dropBlock(A, S, 'input', 120, 300, 'supplier invoice');
      await dropBlock(A, S, 'phase', 400, 120, 'Reconcile');
      await dropBlock(A, S, 'moment', 440, 170, 'match to PO');
      await dropBlock(A, S, 'intent', 700, 100, 'suppliers paid on time so credit terms hold');
      await dropBlock(A, S, 'outcome', 700, 230, 'credit terms kept');
      await A.click('[data-testid=tool-arrow]');
      await A.locator(S + ' .node.trigger').click();
      await A.locator(S + ' .node.phase').first().click();
      await A.click('[data-testid=tool-select]');
      await wait(600); await snapAll(A, 'surface-map-built');
      await measure(A, 'surface-built', ['.toolbar', '.gatebar', '.goalnote', '.viewctl', '.rail', '.chips']);
    });
    await step('A coach rail open measure', async () => { await measure(A, 'surface-rail', ['.rail', '.coachhead', '.msgs', '.composer', '.chips']); });
    await step('B minimal map', async () => {
      await B.waitForSelector(S, { timeout: 8000 });
      await dropBlock(B, S, 'persona', 120, 90, 'Finance Analyst');
      await dropBlock(B, S, 'trigger', 120, 200, 'month end');
      await dropBlock(B, S, 'intent', 400, 100, 'cash position is known before payroll');
      await dropBlock(B, S, 'outcome', 400, 230, 'payroll funded on time');
      await wait(400);
    });
    await step('A gate state', async () => { await wait(800); await snap(A, 'surface-gate-rosette-1440'); });
    await step('A surface mobile', async () => { await A.setViewportSize({ width: 390, height: 844 }); await wait(800); await snap(A, 'surface-mobile-390'); await A.setViewportSize({ width: 1440, height: 900 }); await wait(400); });
    await step('F drill mirror', async () => {
      await F.click('[data-testid=team-row]'); await wait(900); await snapAll(F, 'console-drill-mirror');
      await F.click('text=← all teams');
    });
    await step('F timer + room', async () => {
      await F.click('[data-testid=timer-20]'); await F.click('[data-testid=timer-start]'); await wait(700);
      await snapAll(F, 'console-surface-timer');
      await F.click('[data-testid=toggle-room]'); await wait(900); await snapAll(F, 'roomview-timer-throne');
      await measure(F, 'roomview-timer', ['.roomview', '.bigtimer', '.codechip']);
      await F.click('[data-testid=toggle-room]');
      await F.click('[data-testid=timer-pause]').catch(() => {});
    });
    await step('A timer chip', async () => { await wait(400); await snap(A, 'surface-with-timer-1440'); });

    // ---- swap / reveal ----
    await step('swap', async () => {
      await F.click('[data-testid=phase-rebuild]'); await confirmIfModal(F); await wait(900);
      await snap(A, 'reveal-stamp-1440');
      await A.waitForSelector('#reveal-go:visible', { timeout: 8000 });
      await wait(1600); await snap(A, 'reveal-cta-1440');
      await A.click('#reveal-go'); await wait(1400);
      await snapAll(A, 'rebuild-initial');
      await measure(A, 'rebuild', ['.landtray', '.landpill', '.assumefloat', '.viewctl', '.goalnote', '.toolbar', '.gatebar', '[data-testid=rebuild-canvas]', '.railtoggle']);
    });
    await step('A rebuild candidate hover', async () => {
      const cand = A.locator('.ingcard.candidate').first();
      if (await cand.count()) { await cand.hover(); await wait(500); await snap(A, 'rebuild-candidate-why-1440'); }
    });
    await step('A coach open in rebuild', async () => {
      await A.click('[data-testid=rail-toggle]'); await wait(700); await snapAll(A, 'rebuild-coach-open');
      await A.click('[data-testid=rail-toggle]'); await wait(400);
    });
    await step('A people + agent', async () => {
      const R = '[data-testid=rebuild-canvas]';
      await dropBlock(A, R, 'agent', 300, 400, 'continuous reconcile agent');
      const tr = A.locator('[data-testid=land-tray]');
      await tr.locator('textarea').first().fill('moves to exception-judging — approves edge cases the agent cannot');
      await A.locator('[data-testid=land-transforms]').first().click(); await wait(700);
      await snap(A, 'rebuild-people-landed-1440');
    });
    await step('A assumptions open', async () => {
      await A.click('.assumefloat summary');
      await A.fill('[data-testid=assumption-input]', 'presumably the ERP can expose a webhook');
      await A.click('[data-testid=add-assumption]'); await wait(500);
      await snap(A, 'rebuild-assumptions-open-1440');
      await measure(A, 'rebuild-floats-open', ['.landtray', '.landpill', '.assumefloat', '.viewctl']);
      await A.click('.assumefloat summary');
    });
    await step('A rebuild mobile', async () => { await A.setViewportSize({ width: 390, height: 844 }); await wait(800); await snap(A, 'rebuild-mobile-390'); await A.setViewportSize({ width: 1440, height: 900 }); await wait(400); });
    await step('A challenge lock', async () => {
      const lk = A.locator('[data-testid=rebuild-canvas] .node.locked').first();
      await lk.click(); await wait(300);
      if (await A.locator('[data-testid=challenge-lock]').count()) {
        await A.click('[data-testid=challenge-lock]'); await wait(400); await snap(A, 'challenge-modal-1440');
        await A.fill('.modalcard textarea', 'this intent is an artifact — capture missed the decision');
        await A.fill('.modalcard input', 'decide pay vs dispute before month-end');
        await A.click('[data-testid=send-challenge]'); await wait(400);
      }
    });
    await step('F amendment', async () => {
      await wait(700); await snap(F, 'console-rebuild-amendment-1440');
      const apr = F.locator('[data-testid=approve-amend]');
      if (await apr.count()) { await apr.first().click(); await wait(700); }
    });

    // ---- share ----
    await step('share', async () => { await F.click('[data-testid=phase-share]'); await confirmIfModal(F); await wait(2600); });
    await step('A share top', async () => { await snapAll(A, 'share-top'); await measure(A, 'share', ['.share', '.sharehead', '.racecard', '.shareband']); });
    await step('A share full scroll', async () => {
      // full page screenshot of the share for vertical rhythm
      for (const s of SIZES) {
        await A.setViewportSize({ width: s.w, height: s.h }); await wait(600);
        shotN++;
        const f = path.join(OUT, String(shotN).padStart(2, '0') + '-share-full-' + s.tag + '.png');
        await A.evaluate(() => { const sc = document.querySelector('.share'); if (sc) sc.scrollTop = 0; });
        await wait(200);
        // screenshot the scrollable element fully via clip is hard; use fullPage on the share container by expanding
        await A.screenshot({ path: f, fullPage: true }).catch(() => {});
        console.log('  📸', path.basename(f));
      }
      await A.setViewportSize({ width: 1440, height: 900 }); await wait(300);
    });
    await step('A share bottom racecard', async () => {
      await A.evaluate(() => { const s = document.querySelector('.share'); if (s) s.scrollTop = s.scrollHeight; });
      await wait(800); await snap(A, 'share-bottom-racecard-1440');
    });
    await step('F console share + present', async () => {
      await snap(F, 'console-share-1440');
      const pick = F.locator('[data-testid=present-pick]').first();
      if (await pick.count()) await pick.click();
      await wait(400);
      await F.click('[data-testid=toggle-room]'); await wait(1300); await snapAll(F, 'roomview-present');
      await F.click('[data-testid=toggle-room]');
    });

    // ---- modals ----
    const F2 = await actor(browser);
    await step('home confirm modal', async () => {
      await F2.click('[data-testid=host-btn]'); await F2.waitForSelector('.codechip', { timeout: 8000 });
      await F2.click('[data-testid=home]'); await wait(400); await snap(F2, 'home-confirm-modal-1440');
      await measure(F2, 'modal', ['.modalscrim', '.modalcard', '[data-testid=modal-confirm]', '[data-testid=modal-cancel]']);
      await F2.click('[data-testid=modal-cancel]');
    });

    // ---- mobile landing ----
    const M = await actor(browser, { width: 390, height: 844 });
    await step('mobile landing', async () => { await wait(3000); await snap(M, 'mobile-landing-390'); });
  } finally {
    fs.writeFileSync(path.join(OUT, 'boxes.json'), JSON.stringify(boxes, null, 2));
    await browser.close();
  }
  console.log('\nDONE —', shotN, 'shots →', OUT);
})();
