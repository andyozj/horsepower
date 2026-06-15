/* QA walkthrough — drives EVERY journey + edge cases and dumps full-res screenshots
 * to qa-shots/ for human review, plus a console/page-error log per actor.
 * Not an assertion suite (e2e-playwright.js is that) — this is the camera for a
 * hostile visual QA pass. Run with the server up:
 *   BASE=http://localhost:3200 node qa-walkthrough.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:3200';
const OUT = path.join(__dirname, 'qa-shots');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const wait = ms => new Promise(r => setTimeout(r, ms));
const errors = [];
let shotN = 0;
const snap = async (page, name) => {
  shotN++;
  const f = path.join(OUT, String(shotN).padStart(2, '0') + '-' + name + '.png');
  await page.screenshot({ path: f }).catch(e => console.log('  snap fail', name, e.message));
  console.log('  📸', path.basename(f));
};
const step = async (name, fn) => {
  try { await fn(); } catch (e) { console.log('  ⚠ STEP FAILED:', name, '→', e.message.split('\n')[0]); errors.push(`STEP ${name}: ${e.message.split('\n')[0]}`); }
};

async function actor(browser, label, vp) {
  const ctx = await browser.newContext({ viewport: vp || { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errors.push(`[${label}] pageerror: ${e.message}`); console.log(`  ✗ [${label}] pageerror:`, e.message); });
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) { errors.push(`[${label}] console: ${m.text()}`); } });
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

(async () => {
  const browser = await chromium.launch();
  try {
    // ---------- landing + validation ----------
    const F = await actor(browser, 'Farrier');
    await step('landing settle', async () => { await wait(4500); await snap(F, 'landing-settled'); });
    await step('landing validation', async () => {
      await F.click('[data-testid=join-btn]'); await wait(200); await snap(F, 'landing-validation-noname');
      await F.fill('[data-testid=join-name]', 'Ghost'); await F.fill('[data-testid=join-code]', 'XXXX');
      await F.click('[data-testid=join-btn]'); await wait(500); await snap(F, 'landing-validation-badcode');
      await F.fill('[data-testid=join-name]', ''); await F.fill('[data-testid=join-code]', '');
    });
    await step('cohost details open', async () => { await F.click('summary:has-text("Join as co-host")'); await wait(200); await snap(F, 'landing-cohost-open'); await F.click('summary:has-text("Join as co-host")'); });

    // ---------- host ----------
    let code = '';
    await step('host workshop', async () => {
      await F.click('[data-testid=host-btn]');
      await F.waitForSelector('.codechip', { timeout: 8000 });
      code = (await F.textContent('.codechip')).trim();
      console.log('  workshop:', code);
      await wait(1200); await snap(F, 'console-lobby-empty');
    });
    await step('room view lobby', async () => { await F.click('[data-testid=toggle-room]'); await wait(900); await snap(F, 'roomview-lobby-empty'); await F.click('[data-testid=toggle-room]'); });

    // ---------- members join ----------
    const A = await actor(browser, 'Maya');
    await step('A join → empty picker', async () => {
      await A.fill('[data-testid=join-name]', 'Maya'); await A.fill('[data-testid=join-code]', code);
      await A.click('[data-testid=join-btn]');
      await A.waitForSelector('[data-testid=create-team-name]', { timeout: 8000 });
      await wait(3500); await snap(A, 'picker-no-teams');
    });
    await step('A create long-name team', async () => {
      await A.fill('[data-testid=create-team-name]', 'Accounts Payable Process Excellence Squad');
      await A.click('[data-testid=create-team-btn]');
      await A.waitForSelector('[data-testid=stable]', { timeout: 8000 });
      await wait(4000); await snap(A, 'lobby-longname-presaddle');
    });
    const B = await actor(browser, 'Sam');
    await step('B join → picker with team', async () => {
      await B.fill('[data-testid=join-name]', 'Sam'); await B.fill('[data-testid=join-code]', code);
      await B.click('[data-testid=join-btn]');
      await B.waitForSelector('[data-testid=team-pick]', { timeout: 8000 });
      await wait(2500); await snap(B, 'picker-with-team');
    });
    await step('B create team 2', async () => {
      await B.fill('[data-testid=create-team-name]', 'ETL Crew');
      await B.click('[data-testid=create-team-btn]');
      await B.waitForSelector('[data-testid=stable]', { timeout: 8000 });
    });
    await step('A lobby saddle', async () => {
      await A.click('[data-testid=lets-ride]'); await wait(2500); await snap(A, 'lobby-saddled');
    });
    await step('console 2 teams', async () => { await wait(600); await snap(F, 'console-lobby-2teams'); });

    // ---------- surface ----------
    await step('start surface', async () => { await F.click('[data-testid=phase-surface]'); await confirmIfModal(F); await wait(1200); });
    await step('A surface empty', async () => { await A.waitForSelector('[data-testid=surface-canvas]', { timeout: 8000 }); await wait(800); await snap(A, 'surface-empty'); });
    await step('A brain dump', async () => {
      await A.fill('[data-testid=coach-input]', 'an invoice lands in the shared inbox, someone checks it against the PO, then we chase the approver — month-end is chaos');
      await A.click('[data-testid=coach-send]'); await wait(1200); await snap(A, 'surface-coach-reply');
    });
    const S = '[data-testid=surface-canvas]';
    await step('A build map', async () => {
      await dropBlock(A, S, 'persona', 120, 90, 'OpCo GM');
      await dropBlock(A, S, 'trigger', 120, 200, 'invoice arrives');
      await dropBlock(A, S, 'input', 120, 300, 'supplier invoice');
      await dropBlock(A, S, 'phase', 400, 120, 'Reconcile');
      await dropBlock(A, S, 'moment', 440, 170, 'match to PO');
      await dropBlock(A, S, 'intent', 700, 100, 'suppliers paid on time so credit terms hold');
      await dropBlock(A, S, 'outcome', 700, 230, 'credit terms kept');
      await dropBlock(A, S, 'phase', 400, 320, 'a really long phase name that someone typed without thinking about how much space it would take on the canvas');
      await A.click('[data-testid=tool-arrow]');
      await A.locator(S + ' .node.trigger').click();
      await A.locator(S + ' .node.phase').first().click();
      await A.click('[data-testid=tool-select]');
      await wait(600); await snap(A, 'surface-map-built');
    });
    await step('A gate + thin', async () => {
      const chips = A.locator('.chips .chip');
      if (await chips.count()) { await chips.first().click(); await wait(800); }
      await snap(A, 'surface-whats-thin');
    });
    await step('B minimal map', async () => {
      await B.waitForSelector(S, { timeout: 8000 });
      await dropBlock(B, S, 'persona', 120, 90, 'Finance Analyst');
      await dropBlock(B, S, 'trigger', 120, 200, 'month end');
      await dropBlock(B, S, 'intent', 400, 100, 'cash position is known before payroll');
      await dropBlock(B, S, 'outcome', 400, 230, 'payroll funded on time');
      await wait(400);
    });
    await step('A rosette state', async () => { await wait(800); await snap(A, 'surface-gate-state'); });
    await step('F drill mirror', async () => {
      await F.click('[data-testid=team-row]'); await wait(900); await snap(F, 'console-drill-mirror');
      await F.click('text=← all teams');
    });
    await step('F timer + room', async () => {
      await F.click('[data-testid=timer-20]'); await F.click('[data-testid=timer-start]'); await wait(700);
      await snap(F, 'console-surface-timer');
      await F.click('[data-testid=toggle-room]'); await wait(900); await snap(F, 'roomview-timer-throne');
      await F.click('[data-testid=toggle-room]');
      await F.click('[data-testid=timer-pause]').catch(()=>{});
    });
    await step('A timer chip visible', async () => { await wait(400); await snap(A, 'surface-with-timer'); });

    // ---------- swap ----------
    await step('swap', async () => {
      await F.click('[data-testid=phase-rebuild]'); await confirmIfModal(F); await wait(1100);
      await snap(A, 'reveal-stamp');
      await A.waitForSelector('#reveal-go:visible', { timeout: 8000 });
      await wait(1600); await snap(A, 'reveal-cta');
      await A.click('#reveal-go'); await wait(1400); await snap(A, 'rebuild-initial');
    });
    await step('A rebuild hovers', async () => {
      const cand = A.locator('.ingcard.candidate').first();
      if (await cand.count()) { await cand.hover(); await wait(500); await snap(A, 'rebuild-candidate-why'); }
      const lk = A.locator('.node.locked').first();
      if (await lk.count()) { await lk.hover(); await wait(500); await snap(A, 'rebuild-locktip'); }
    });
    await step('A open coach in rebuild', async () => {
      await A.click('[data-testid=rail-toggle]'); await wait(700); await snap(A, 'rebuild-coach-open');
      await A.click('[data-testid=rail-toggle]'); await wait(400);
    });
    await step('A agent + people', async () => {
      const R = '[data-testid=rebuild-canvas]';
      await dropBlock(A, R, 'agent', 300, 400, 'continuous reconcile agent');
      // try the rejected phrase first
      const tr = A.locator('[data-testid=land-tray]');
      await tr.locator('textarea').first().fill('freed up for higher-value work');
      await A.locator('[data-testid=land-removed]').first().click(); await wait(700);
      await snap(A, 'people-freedup-rejected');
      await tr.locator('textarea').first().fill('moves to exception-judging — approves edge cases the agent cannot');
      await A.locator('[data-testid=land-transforms]').first().click(); await wait(700);
      await snap(A, 'people-landed');
    });
    await step('A assumptions', async () => {
      await A.click('.assumefloat summary');
      await A.fill('[data-testid=assumption-input]', 'presumably the ERP can expose a webhook');
      await A.click('[data-testid=add-assumption]'); await wait(500); await snap(A, 'assumptions-open');
      await A.click('.assumefloat summary');
    });
    await step('A challenge lock', async () => {
      const lk = A.locator('[data-testid=rebuild-canvas] .node.locked').first();
      await lk.click(); await wait(300);
      if (await A.locator('[data-testid=challenge-lock]').count()) {
        await A.click('[data-testid=challenge-lock]'); await wait(400); await snap(A, 'challenge-modal');
        await A.fill('.modalcard textarea', 'this intent is an artifact — capture missed the decision');
        await A.fill('.modalcard input', 'decide pay vs dispute before month-end');
        await A.click('[data-testid=send-challenge]'); await wait(400);
      }
    });
    await step('F amendments', async () => {
      await wait(700); await snap(F, 'console-rebuild-amendment');
      const apr = F.locator('[data-testid=approve-amendment]');
      if (await apr.count()) { await apr.first().click(); await wait(700); await snap(A, 'rebuild-amended'); }
    });

    // ---------- share ----------
    await step('move to share', async () => { await F.click('[data-testid=phase-share]'); await confirmIfModal(F); await wait(2500); });
    await step('A share top', async () => { await snap(A, 'share-top'); });
    await step('A share bottom', async () => {
      await A.evaluate(() => { const s = document.querySelector('.share'); if (s) s.scrollTop = s.scrollHeight; });
      await wait(800); await snap(A, 'share-bottom-racecard');
    });
    await step('B share view', async () => { await wait(400); await snap(B, 'share-team-b'); });
    await step('reckoning buttons', async () => {
      const btn = B.locator('[data-testid=confirm-assumption]').first();
      if (await btn.count()) { await btn.click(); await wait(400); }
      const btn2 = A.locator('[data-testid=confirm-assumption]').first();
      if (await btn2.count()) { await snap(A, 'share-reckoning'); }
    });
    await step('export pack', async () => {
      const [pop] = await Promise.all([
        A.context().waitForEvent('page', { timeout: 6000 }),
        A.click('[data-testid=export-workflow]')
      ]);
      await pop.waitForLoadState('domcontentloaded'); await wait(700);
      await pop.screenshot({ path: path.join(OUT, String(++shotN).padStart(2, '0') + '-export-pack.png'), fullPage: true });
      console.log('  📸 export-pack (popup)');
      await pop.close();
    });
    await step('F present picker + room', async () => {
      await snap(F, 'console-share');
      const pick = F.locator('[data-testid=present-pick]').first();
      if (await pick.count()) await pick.click();
      await wait(400);
      await F.click('[data-testid=toggle-room]'); await wait(1300); await snap(F, 'roomview-present');
      await F.click('[data-testid=toggle-room]');
    });

    // ---------- close ----------
    await step('close workshop', async () => {
      await F.click('[data-testid=phase-closed]').catch(async () => { await F.locator('.runcta').click(); });
      await confirmIfModal(F); await wait(900); await snap(A, 'closed-member');
    });

    // ---------- mobile ----------
    const M = await actor(browser, 'Mobile', { width: 390, height: 844 });
    await step('mobile landing', async () => { await wait(2500); await snap(M, 'mobile-landing'); });

    // home-confirm modal on a live session
    const F2 = await actor(browser, 'Farrier2');
    await step('home modal', async () => {
      await F2.click('[data-testid=host-btn]'); await F2.waitForSelector('.codechip', { timeout: 8000 });
      await F2.click('[data-testid=home]'); await wait(400); await snap(F2, 'home-confirm-modal');
      await F2.click('[data-testid=modal-cancel]');
    });
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT, 'errors.txt'), errors.length ? errors.join('\n') : '(no console/page errors captured)');
  console.log('\nDONE —', shotN, 'shots →', OUT);
  console.log(errors.length ? '⚠ errors captured: ' + errors.length + ' (see errors.txt)' : '✓ no console/page errors');
})();
