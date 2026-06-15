/* qa-presenter.js — the PRESENTER MODE + 2-step swap reveal (new feature).
 *   BASE=http://localhost:3703 node qa-presenter.js   (server must be up)
 *
 * Covers what the other suites don't:
 *   - Surface/Rebuild WAR-ROOM on the projector: every team's live map, heavily blurred (option C)
 *   - the 2-step reveal: Farrier "Hold the room" → CTA flips to "Reveal the swap"
 *   - device "pens down" overlay (#holdscreen) for members during the hold
 *   - the presenter ROTATION spectacle (.swap-rotation) when the held room crosses into Rebuild
 *   - the device stamp (#reveal) still fires (delayed) after the rotation
 * The one-step flow stays covered by e2e-playwright (never presses Hold).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:3703';
const SHOTS = '/tmp/hp-presenter-shots'; fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + x : ''); } };
const wait = ms => new Promise(r => setTimeout(r, ms));

async function actor(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto(BASE);
  return page;
}
async function emptySpot(page, sel, fb) {
  const s = await page.evaluate(sel => {
    const sc = document.querySelector(sel + ' .scene') || document.querySelector(sel); if (!sc) return null;
    const r = sc.getBoundingClientRect();
    for (let y = 130; y < r.height - 150; y += 50) for (let x = 80; x < Math.min(r.width - 340, 820); x += 50) {
      const e = document.elementFromPoint(r.x + x, r.y + y);
      if (e && (e === sc || e.classList.contains('dotgrid') || e.classList.contains('world'))) return { x, y };
    } return null;
  }, sel);
  return s || fb;
}
async function drop(page, tool, text) {
  const sel = '[data-testid=surface-canvas]';
  const pos = await emptySpot(page, sel, { x: 200, y: 200 });
  await page.click(`[data-testid=tool-${tool}]`);
  await page.click(sel, { position: pos });
  await wait(140); await page.keyboard.type(text);
  await page.click('[data-testid=tool-select]'); await wait(160);
}

(async () => {
  const browser = await chromium.launch();
  try {
    // ---- host ----
    const F = await actor(browser);
    await F.click('[data-testid=host-btn]');
    await F.waitForSelector('.codechip', { timeout: 8000 });
    const code = (await F.textContent('.codechip')).trim();
    const hostKey = (await F.locator('.codechip').nth(1).textContent()).trim();
    console.log('  workshop', code);

    // ---- two members, two teams ----
    async function member(name, team) {
      const p = await actor(browser);
      await p.fill('[data-testid=join-name]', name);
      await p.fill('[data-testid=join-code]', code);
      await p.click('[data-testid=join-btn]');
      await p.waitForSelector('[data-testid=create-team-name]', { timeout: 8000 });
      await p.fill('[data-testid=create-team-name]', team);
      await p.click('[data-testid=create-team-btn]');
      await wait(250);
      return p;
    }
    const Mara = await member('Mara', 'Alpha Stable');
    const Nils = await member('Nils', 'Beta Stable');
    await wait(300);

    // ---- start Surface, place a few blocks so the war-room minis have content ----
    await F.click('[data-testid=phase-surface]');
    await F.waitForSelector('[data-testid=stepper]'); await wait(400);
    await Mara.waitForSelector('[data-testid=interview-hero]', { timeout: 8000 });
    await Mara.click('[data-testid=interview-skip]'); await wait(250);
    await Nils.click('[data-testid=interview-skip]').catch(() => {}); await wait(250);
    await Mara.waitForSelector('[data-testid=surface-canvas]', { timeout: 8000 });
    await Nils.waitForSelector('[data-testid=surface-canvas]', { timeout: 8000 });
    await drop(Mara, 'persona', 'AP Clerk'); await drop(Mara, 'phase', 'match PO');
    await drop(Nils, 'persona', 'HR Coord'); await drop(Nils, 'phase', 'provision');
    await wait(400);

    // ===== 1. WAR-ROOM on the projector (Surface) =====
    console.log('\n— 1. war-room (blurred live maps) —');
    await F.click('[data-testid=toggle-room]');
    await F.waitForSelector('.roomview.warroom', { timeout: 6000 });
    ok('Surface room view is the war-room', await F.locator('.roomview.warroom').count() === 1);
    ok('one blurred cell per team (2)', await F.locator('.roomview .wcell').count() === 2, String(await F.locator('.roomview .wcell').count()));
    ok('team maps render (blurred .wmap present)', await F.locator('.roomview .wmap').count() === 2);
    ok('progress label shows per team', (await F.textContent('.roomview .wprog')).length > 0);
    const heavyBlur = await F.evaluate(() => { const m = document.querySelector('.roomview .wmap'); return m && /blur\(\s*[5-9]|blur\(\s*1[0-9]/.test(getComputedStyle(m).filter); });
    ok('maps are HEAVILY blurred (≥5px — content unreadable)', heavyBlur);
    await F.screenshot({ path: SHOTS + '/1-warroom-surface.png' });
    await F.click('[data-testid=toggle-room]'); // back to console

    // ===== 2. HOLD the room (2-step beat 1) =====
    console.log('\n— 2. Hold the room —');
    ok('Hold control present on Surface', await F.locator('[data-testid=hold-room]').count() === 1);
    ok('CTA reads "Swap → Rebuild" before hold', /Swap/.test(await F.textContent('[data-testid=phase-rebuild]')));
    await F.click('[data-testid=hold-room]');
    await wait(400);
    ok('CTA flips to "Reveal the swap" after hold', /Reveal/.test(await F.textContent('[data-testid=phase-rebuild]')), await F.textContent('[data-testid=phase-rebuild]'));
    await Mara.waitForSelector('#holdscreen.on', { timeout: 4000 }).catch(() => {});
    ok('member sees the "pens down" overlay', await Mara.locator('#holdscreen.on').count() === 1);
    ok('"pens down" copy is on the member overlay', /Pens down/i.test(await Mara.textContent('#holdscreen')));

    // ===== 3. presenter (2nd Farrier) shows the projected HOLD =====
    console.log('\n— 3. presenter hold screen —');
    const P = await actor(browser);
    await P.click('details >> text=Join as co-host').catch(async () => { await P.locator('summary', { hasText: 'co-host' }).click(); });
    await wait(200);
    const inputs = P.locator('input');
    await P.locator('input[placeholder="workshop code"]').fill(code);
    await P.locator('input[placeholder="host code"]').fill(hostKey);
    await P.locator('button', { hasText: 'Join' }).last().click().catch(() => {});
    await wait(900);
    await P.locator('[data-testid=toggle-room]').click().catch(() => {});
    await P.waitForSelector('.roomview.hold', { timeout: 5000 }).catch(() => {});
    ok('presenter shows the projected HOLD screen', await P.locator('.roomview.hold').count() === 1);
    ok('projected hold says "Pens down"', /Pens down/i.test(await P.textContent('.roomview').catch(() => '')));
    await P.waitForTimeout(1700);  // let the staged entrance settle before the shot
    await P.screenshot({ path: SHOTS + '/2-hold-pensdown.png' });
    await F.screenshot({ path: SHOTS + '/2b-console-held-cta.png' });

    // ===== 4. REVEAL → rotation spectacle + delayed device stamp =====
    console.log('\n— 4. reveal: rotation + delayed stamp —');
    await F.click('[data-testid=phase-rebuild]');           // fire the reveal
    const mc = F.locator('[data-testid=modal-confirm]'); if (await mc.count()) await mc.click().catch(() => {}); // not-gate-green confirm
    // presenter plays the rotation
    await P.waitForSelector('[data-testid=swap-rotation]', { timeout: 4000 }).catch(() => {});
    ok('presenter plays the swap ROTATION spectacle', await P.locator('[data-testid=swap-rotation]').count() === 1);
    ok('rotation lists both stables', /Alpha Stable[\s\S]*Beta Stable|Beta Stable[\s\S]*Alpha Stable/.test(await P.textContent('[data-testid=swap-rotation]').catch(() => '')));
    await P.waitForTimeout(1500);  // let chips rise + ink arrows draw on before the shot
    await P.screenshot({ path: SHOTS + '/3-rotation.png' });
    // member: pens-down bridges the rotation, THEN the stamp drops (delay ~2.8s)
    ok('member still "pens down" during the rotation', await Mara.locator('#holdscreen.on').count() === 1);
    await Mara.waitForSelector('#reveal.on', { timeout: 6000 }).catch(() => {});
    ok('member device flips to the reveal stamp (after the rotation)', await Mara.locator('#reveal.on').count() === 1);
    await wait(3200);
    ok('rotation overlay clears itself', await P.locator('[data-testid=swap-rotation]').count() === 0);
    ok('presenter settles into the Rebuild war-room', await P.locator('.roomview.warroom').count() === 1);
  } catch (e) {
    console.log('  THREW:', e.message); fail++;
  } finally {
    await browser.close();
  }
  console.log(`\nPRESENTER ${fail ? '❌' : '✅'} — ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
