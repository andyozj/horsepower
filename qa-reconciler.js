/* Slice A0 — canvas keyed reconciler proof (Playwright, 2 members on ONE team).
 * Proves unchanged block nodes keep DOM identity across a teammate's broadcast (no wipe-and-
 * rebuild), and a focused label's uncommitted text survives that broadcast. Modeled on the
 * e2e-playwright harness (UI-driven host/join/team flow).
 *   PORT=3300 node server.js &   then   BASE=http://localhost:3300 node qa-reconciler.js
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3300';
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + JSON.stringify(x) : ''); } };

async function newActor(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept().catch(() => {}));
  page.on('pageerror', e => console.log('   [pageerror]', e.message));
  await page.goto(BASE);
  return page;
}
async function dropBlock(page, S, tool, x, y, text) {
  await page.click(`[data-testid=tool-${tool}]`);
  await page.click(S, { position: { x, y } });
  if (text) { await wait(150); await page.keyboard.type(text); }
  await page.click('[data-testid=tool-select]');
  await wait(150);
}
async function emptySpot(page, S, fallback) {
  const spot = await page.evaluate((sel) => {
    const sc = document.querySelector(sel);
    if (!sc) return null;
    const r = sc.getBoundingClientRect();
    for (let y = 150; y < r.height - 170; y += 50)
      for (let x = 90; x < Math.min(r.width - 340, 900); x += 50) {
        const e = document.elementFromPoint(r.x + x, r.y + y);
        if (e && (e === sc || e.classList.contains('dotgrid') || e.classList.contains('world') || e.classList.contains('scene'))) return { x, y };
      }
    return null;
  }, S);
  return spot || fallback;
}

(async () => {
  const browser = await chromium.launch();
  const S = '[data-testid=surface-canvas]';

  // Farrier hosts
  const F = await newActor(browser);
  await F.click('[data-testid=host-btn]');
  await F.waitForSelector('.codechip', { timeout: 8000 });
  const code = (await F.textContent('.codechip')).trim();

  // Alex joins + creates the team
  const Alex = await newActor(browser);
  await Alex.fill('[data-testid=join-name]', 'Alex');
  await Alex.fill('[data-testid=join-code]', code);
  await Alex.click('[data-testid=join-btn]');
  await Alex.waitForSelector('[data-testid=create-team-name]', { timeout: 8000 });
  await Alex.fill('[data-testid=create-team-name]', 'AP Squad');
  await Alex.click('[data-testid=create-team-btn]');
  await Alex.waitForSelector('[data-testid=stable]', { timeout: 8000 });

  // Sam joins the SAME team
  const Sam = await newActor(browser);
  await Sam.fill('[data-testid=join-name]', 'Sam');
  await Sam.fill('[data-testid=join-code]', code);
  await Sam.click('[data-testid=join-btn]');
  await Sam.waitForSelector('[data-testid=team-pick]', { timeout: 8000 });
  await Sam.click('[data-testid=team-pick]');
  await Sam.waitForSelector('[data-testid=stable]', { timeout: 8000 });
  await wait(400);

  // Farrier starts Surface
  await F.click('[data-testid=phase-surface]');
  // A2: Surface opens in the interview hero — both members "draw it myself" to reach the hand-canvas.
  await Alex.waitForSelector('[data-testid=interview-hero]', { timeout: 8000 });
  await Alex.click('[data-testid=interview-skip]'); await wait(200);
  await Sam.click('[data-testid=interview-skip]').catch(() => {}); await wait(200);
  await Alex.waitForSelector(S, { timeout: 8000 });
  await Sam.waitForSelector(S, { timeout: 8000 });
  await wait(400);

  // Alex authors two blocks
  await dropBlock(Alex, S, 'persona', 180, 200, 'Analyst');
  await dropBlock(Alex, S, 'phase', 470, 200, 'Reconcile');
  await wait(400);

  // mark Alex's current nodes so a rebuild is detectable
  const before = await Alex.evaluate((sel) => {
    const ns = [...document.querySelectorAll(sel + ' .node')];
    ns.forEach((n, i) => { n.__rk = 'rk' + i; });
    return ns.length;
  }, S);
  ok('A shows 2 blocks before the broadcast', before === 2, before);

  // Sam adds a third block → real broadcast to Alex
  const sp = await emptySpot(Sam, S, { x: 180, y: 380 });
  await dropBlock(Sam, S, 'input', sp.x, sp.y, 'invoice');
  await wait(800);

  const idn = await Alex.evaluate((sel) => {
    const ns = [...document.querySelectorAll(sel + ' .node')];
    return { total: ns.length, marked: ns.filter(n => n.__rk).length };
  }, S);
  ok('broadcast added a 3rd node on A', idn.total === 3, idn);
  ok('A’s 2 original nodes kept DOM identity (reconciled, not rebuilt)', idn.marked === 2, idn);

  // focus survival: Alex clicks a block (label focuses via click-to-type), types uncommitted text;
  // Sam adds another block → the broadcast must NOT blur Alex or drop the text.
  await Alex.click(S + ' .node[data-id]');
  await wait(250);
  await Alex.keyboard.type('XEDIT');
  const sp2 = await emptySpot(Sam, S, { x: 470, y: 380 });
  await dropBlock(Sam, S, 'moment', sp2.x, sp2.y, 'match PO');
  await wait(800);
  const foc = await Alex.evaluate(() => {
    const a = document.activeElement;
    return { isLabel: !!(a && a.classList && a.classList.contains('label')), txt: a ? a.textContent : '' };
  });
  ok('focused label survived the broadcast (still focused)', foc.isLabel === true, foc);
  ok('uncommitted label text survived the broadcast', /XEDIT/.test(foc.txt), foc);

  await browser.close();
  console.log(`\nqa-reconciler: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
