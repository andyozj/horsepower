/* THEO — the LATE ARRIVAL. Critic lens: ORIENTATION & RECOVERY.
 * Joins after Surface starts, onto "Credit Desk". Tests catch-up, device-death
 * reclaim, refresh-resume, rebuild-from-cold, share comprehension.
 *   BASE=http://localhost:3200 node qa-critic-theo.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:3200';
const OUT = path.join(__dirname, 'qa-critic', 'theo');
fs.mkdirSync(OUT, { recursive: true });

const wait = ms => new Promise(r => setTimeout(r, ms));
let shotN = 0;
const log = (...a) => console.log('[theo]', ...a);
const snap = async (page, name) => {
  shotN++;
  const f = String(shotN).padStart(2, '0') + '-' + name + '.png';
  await page.screenshot({ path: path.join(OUT, f) }).catch(e => log('snap fail', name, e.message));
  log('shot', f);
};
const TEAM = 'Credit Desk';

async function actor(browser, vp) {
  const ctx = await browser.newContext({ viewport: vp || { width: 1440, height: 900 }, hasTouch: !!vp });
  const page = await ctx.newPage();
  page.on('pageerror', e => log('[pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error') log('[console.error]', m.text().slice(0, 200)); });
  return { ctx, page };
}
async function landing(page) {
  await page.goto(BASE);
  await page.waitForSelector('[data-testid=join-name]', { timeout: 15000 });
}
async function joinNamed(page, name, code) {
  await page.fill('[data-testid=join-name]', name);
  await page.fill('[data-testid=join-code]', code);
  await page.click('[data-testid=join-btn]');
  await page.waitForSelector('[data-testid=team-pick], [data-testid=create-team-name]', { timeout: 12000 });
}
// click the team-pick button whose row mentions TEAM
async function pickTeam(page, team) {
  const picks = page.locator('[data-testid=team-pick]');
  const n = await picks.count();
  for (let i = 0; i < n; i++) {
    const row = picks.nth(i);
    const txt = await row.evaluate(el => (el.closest('.teamrow,.teamcard,li,div') || el).textContent || '').catch(() => '');
    if (txt.includes(team)) { await row.click(); return true; }
  }
  // fallback: any pick that contains the team text directly
  const direct = page.locator(`[data-testid=team-pick]:has-text("${team}")`);
  if (await direct.count()) { await direct.first().click(); return true; }
  return false;
}

(async () => {
  const code = fs.readFileSync('/tmp/hp-critic/code.txt', 'utf8').trim();
  log('CODE =', code);
  const browser = await chromium.launch();
  let theoId = null;
  try {
    // ===== 1. JOIN LATE =====
    let { ctx, page } = await actor(browser);
    await landing(page);
    await joinNamed(page, 'Theo', code);
    await wait(800);
    await snap(page, 'picker-as-latecomer');
    // does the picker have create-team only, or existing teams? capture team list text
    const pickerTxt = await page.locator('body').innerText().catch(() => '');
    log('PICKER TEXT >>>', pickerTxt.replace(/\n+/g, ' | ').slice(0, 500));

    let picked = await pickTeam(page, TEAM);
    log('picked existing Credit Desk?', picked);
    if (!picked) {
      // Credit Desk may not exist (other agents may not have created it). Create it.
      const createName = page.locator('[data-testid=create-team-name]');
      if (await createName.count()) {
        log('FINDING: no existing "Credit Desk" to join — latecomer forced to CREATE the team cold');
        await createName.fill(TEAM);
        await page.click('[data-testid=create-team-btn]').catch(() => {});
        picked = true;
      } else {
        await wait(2000);
        picked = await pickTeam(page, TEAM);
      }
    }
    await wait(900);
    // reclaim modal? we're genuinely new → join-fresh
    const freshBtn = page.locator('[data-testid=join-fresh]');
    if (await freshBtn.count()) {
      await snap(page, 'reclaim-modal-but-new');
      log('reclaim modal shown on FIRST join (new human) — clicking join-fresh');
      await freshBtn.click();
    }
    await wait(1800);

    // ===== 2. CATCH-UP CARD =====
    await snap(page, 'catchup-card-before-dismiss');
    const catchTxt = await page.locator('body').innerText().catch(() => '');
    log('CATCHUP TEXT >>>', catchTxt.replace(/\n+/g, ' | ').slice(0, 600));
    const jump = page.locator('button:has-text("Jump in")');
    if (await jump.count()) { await jump.first().click(); log('clicked Jump in'); }
    else log('NO "Jump in" button found — catch-up card may be absent');
    await wait(1500);
    await page.waitForSelector('[data-testid=surface-canvas]', { timeout: 8000 }).catch(() => log('no surface-canvas after jump'));
    await snap(page, 'landed-on-surface');

    // capture what was already on the team's canvas (can a latecomer tell what's decided?)
    const existingNodes = await page.locator('[data-testid=surface-canvas] .node').count().catch(() => 0);
    log('existing nodes on Credit Desk canvas:', existingNodes);

    // grab theo's member id from localStorage for later verification
    theoId = await page.evaluate(() => {
      try { const m = JSON.parse(localStorage.getItem('hp_me') || localStorage.getItem('me') || '{}'); return m.id || m.memberId || null; } catch { return null; }
    });
    log('theoId from storage:', theoId);

    // ===== 3. CONTRIBUTE ONE BLOCK + WHY =====
    try {
      await page.click('[data-testid=tool-phase]');
      await page.click('[data-testid=surface-canvas]', { position: { x: 520, y: 360 } });
      await wait(140);
    } catch (e) { log('place block FAILED:', e.message.split('\n')[0]); }
    await page.click('[data-testid=tool-select]').catch(() => {});
    await wait(500);
    await snap(page, 'block-added');
    // select it and write a why
    try {
      const myNode = page.locator('[data-testid=surface-canvas] .node:has-text("callback nobody owns")');
      if (await myNode.count()) await myNode.first().click();
      await page.waitForSelector('[data-testid=inspector-why]', { timeout: 4000 });
      await page.fill('[data-testid=inspector-why]', 'a customer chases us twice before anyone calls back');
      await page.click('[data-testid=tool-select]').catch(() => {});
      await wait(400);
      await snap(page, 'block-why-inspector');
      log('wrote why via inspector');
    } catch (e) { log('inspector why FAILED:', e.message.split('\n')[0]); await snap(page, 'block-why-FAILED'); }

    // ===== 4. DEVICE-DEATH TEST =====
    log('--- device death: closing context ---');
    await ctx.close();
    await wait(10000);
    let a2 = await actor(browser);
    await landing(a2.page);
    await joinNamed(a2.page, 'Theo', code);
    await wait(800);
    await pickTeam(a2.page, TEAM);
    await wait(1200);
    await snap(a2.page, 'reclaim-modal');
    const reclaimTxt = await a2.page.locator('body').innerText().catch(() => '');
    log('RECLAIM TEXT >>>', reclaimTxt.replace(/\n+/g, ' | ').slice(0, 500));
    // reclaim the old Theo: prefer a row mentioning Theo, else first teamrow in modal
    let reclaimed = false;
    const theoRow = a2.page.locator('.modalcard .teamrow:has-text("Theo"), .modalcard button:has-text("Theo")');
    if (await theoRow.count()) { await theoRow.first().click(); reclaimed = true; log('clicked Theo reclaim row'); }
    else {
      const anyRow = a2.page.locator('.modalcard .teamrow').first();
      if (await anyRow.count()) { await anyRow.click(); reclaimed = true; log('clicked first reclaim row'); }
    }
    if (!reclaimed) {
      const fresh = a2.page.locator('[data-testid=join-fresh]');
      log('NO reclaim row found — fresh exists?', await fresh.count());
    }
    await wait(1500);
    // get to surface
    const jump2 = a2.page.locator('button:has-text("Jump in")');
    if (await jump2.count()) await jump2.first().click();
    await a2.page.waitForSelector('[data-testid=surface-canvas]', { timeout: 8000 }).catch(() => {});
    await wait(1000);
    await snap(a2.page, 'after-reclaim-surface');
    // EVIDENCE: how many Theo avatars in topbar? ghost check
    const avTitles = await a2.page.locator('.topbar .avatars .av').evaluateAll(els =>
      els.map(e => e.getAttribute('title') || e.getAttribute('aria-label') || e.textContent || '')).catch(() => []);
    log('TOPBAR AVATARS >>>', JSON.stringify(avTitles));
    const theoCount = avTitles.filter(t => /theo/i.test(t)).length;
    log('THEO AVATAR COUNT:', theoCount, theoCount > 1 ? '<<< GHOST DUPLICATE — BLOCKER' : '(ok)');
    await snap(a2.page, 'topbar-avatars-ghost-check');
    // my block still there?
    const blockStill = await a2.page.locator('[data-testid=surface-canvas] .node:has-text("callback nobody owns")').count().catch(() => 0);
    log('my block survived device death?', blockStill > 0);

    // ===== wait for Rebuild, watching phase on Theo's page =====
    log('--- waiting for Rebuild phase (watching this page) ---');
    let phase = 'surface';
    for (let i = 0; i < 90; i++) { // up to ~6 min
      const rb = await a2.page.locator('[data-testid=rebuild-canvas]').count().catch(() => 0);
      const rev = await a2.page.locator('#reveal.on, #reveal-go:visible').count().catch(() => 0);
      const shareV = await a2.page.locator('.share').count().catch(() => 0);
      const closed = (await a2.page.locator('body').innerText().catch(() => '')).includes('Workshop closed');
      if (rev) {
        await snap(a2.page, 'swap-reveal');
        const go = a2.page.locator('#reveal-go');
        if (await go.count()) { await go.first().click().catch(() => {}); log('clicked reveal-go'); }
        await wait(1500);
      }
      if (rb) { phase = 'rebuild'; break; }
      if (shareV) { phase = 'share'; break; }
      if (closed) { phase = 'closed'; break; }
      await wait(4000);
    }
    log('reached phase:', phase);

    // ===== 5. REFRESH TEST mid-Rebuild =====
    if (phase === 'rebuild') {
      await wait(1500);
      await snap(a2.page, 'rebuild-landed-cold');
      // rebuild catch-up variant?
      const rbTxt = await a2.page.locator('body').innerText().catch(() => '');
      log('REBUILD TEXT >>>', rbTxt.replace(/\n+/g, ' | ').slice(0, 700));
      // refresh
      log('--- refresh mid-rebuild ---');
      await a2.page.reload();
      await wait(3000);
      const stGo = a2.page.locator('#reveal-go');
      if (await stGo.count() && await stGo.isVisible().catch(() => false)) await stGo.click().catch(() => {});
      await wait(2000);
      await snap(a2.page, 'after-refresh-rebuild');
      const backOnRebuild = await a2.page.locator('[data-testid=rebuild-canvas]').count().catch(() => 0);
      log('came back on rebuild after refresh?', backOnRebuild > 0);

      // ===== 6. READ teardown cards + people tray + assumptions COLD =====
      const teardownCards = await a2.page.locator('[data-testid=rebuild-canvas] .ingcard, [data-testid=rebuild-canvas] .node.locked').count().catch(() => 0);
      log('teardown artifacts visible to cold latecomer:', teardownCards);
      // hover a candidate to see WHY
      const cand = a2.page.locator('[data-testid=rebuild-canvas] .ingcard.candidate, [data-testid=rebuild-canvas] .ingcard').first();
      if (await cand.count()) { await cand.hover().catch(() => {}); await wait(600); await snap(a2.page, 'teardown-card-hover-why'); }
      // people tray
      const peopleTray = a2.page.locator('.toland, [data-testid=people-tray], .peoplepill, :text("to land")').first();
      if (await peopleTray.count()) { await peopleTray.scrollIntoViewIfNeeded().catch(() => {}); await snap(a2.page, 'people-tray'); }
      // assumptions strip
      const assume = a2.page.locator('.assumefloat summary');
      if (await assume.count()) { await assume.first().click().catch(() => {}); await wait(500); await snap(a2.page, 'assumptions-explainer'); }
    } else {
      await snap(a2.page, 'rebuild-skipped-phase-' + phase);
    }

    // ===== wait for Share =====
    log('--- waiting for Share ---');
    for (let i = 0; i < 60; i++) {
      const shareV = await a2.page.locator('.share').count().catch(() => 0);
      const closed = (await a2.page.locator('body').innerText().catch(() => '')).includes('Workshop closed');
      // dismiss any stranded reveal overlay
      const go = a2.page.locator('#reveal-go:visible');
      if (await go.count()) await go.click().catch(() => {});
      if (shareV) { phase = 'share'; break; }
      if (closed) { phase = 'closed'; break; }
      await wait(4000);
    }
    if (phase === 'share') {
      await wait(2500);
      await snap(a2.page, 'share-as-latecomer');
      const shareTxt = await a2.page.locator('body').innerText().catch(() => '');
      log('SHARE TEXT >>>', shareTxt.replace(/\n+/g, ' | ').slice(0, 800));
    }

    // ===== 7. CLOSED =====
    log('--- waiting for Closed ---');
    for (let i = 0; i < 40; i++) {
      const closed = (await a2.page.locator('body').innerText().catch(() => '')).includes('Workshop closed');
      if (closed) { phase = 'closed'; break; }
      await wait(4000);
    }
    await snap(a2.page, 'final-' + phase);
    if (phase === 'closed') { await snap(a2.page, 'closed-screen'); }
    log('DONE. final phase:', phase, '| theo avatar count was logged above');
  } catch (e) {
    log('FATAL', e.message);
  } finally {
    await browser.close();
  }
  log('TOTAL SHOTS', shotN);
})();
