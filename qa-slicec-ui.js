/* Slice C — browser interaction smoke for the native redesign-challenger UI (degraded/no-key path):
 * inline persona challenge on a landed person, the constraint routing panel (real/habit verdict +
 * Ask-the-Coach), the live shape-meter, the Share shape-verdict card, and the console shape-board.
 *   BASE=http://localhost:3911 node qa-slicec-ui.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:3911';
const SHOTS = __dirname + '/qa-slicec-shots'; fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + x : ''); } };
const wait = ms => new Promise(r => setTimeout(r, ms));
async function actor(b) { const ctx = await b.newContext({ viewport: { width: 1280, height: 840 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept().catch(() => {})); p.on('pageerror', e => console.log('   [pageerror]', e.message)); await p.goto(BASE); return p; }
async function drop(p, sel, tool, x, y, text) { await p.click(`[data-testid=tool-${tool}]`); await p.click(sel, { position: { x, y } }); if (text) { await wait(140); await p.keyboard.type(text); } await p.click('[data-testid=tool-select]'); await wait(150); }

(async () => {
  const b = await chromium.launch();
  try {
    const F = await actor(b);
    await F.click('[data-testid=host-btn]');
    await F.waitForSelector('.codechip');
    const code = (await F.textContent('.codechip')).trim();
    const conf = async () => { await wait(300); if (await F.locator('[data-testid=modal-confirm]').count()) await F.click('[data-testid=modal-confirm]'); };

    // two teams
    const A = await actor(b);
    await A.fill('[data-testid=join-name]', 'Alex'); await A.fill('[data-testid=join-code]', code); await A.click('[data-testid=join-btn]');
    await A.waitForSelector('[data-testid=create-team-name]');
    await A.fill('[data-testid=create-team-name]', 'AP Squad'); await A.click('[data-testid=create-team-btn]');
    await A.waitForSelector('[data-testid=stable]');
    const B = await actor(b);
    await B.fill('[data-testid=join-name]', 'Bo'); await B.fill('[data-testid=join-code]', code); await B.click('[data-testid=join-btn]');
    await B.waitForSelector('[data-testid=create-team-name]');
    await B.fill('[data-testid=create-team-name]', 'ETL Crew'); await B.click('[data-testid=create-team-btn]');
    await B.waitForSelector('[data-testid=stable]');

    // surface — seed both teams (AP Squad receives ETL Crew's teardown via the ring)
    await F.click('[data-testid=phase-surface]'); await conf();
    for (const [p, lead] of [[A, 'Clerk'], [B, 'Onboarder']]) {
      await p.waitForSelector('[data-testid=interview-hero]', { timeout: 8000 });
      await p.click('[data-testid=interview-skip]'); await wait(300);
      await p.waitForSelector('[data-testid=surface-canvas]', { timeout: 8000 });
      const S = '[data-testid=surface-canvas]';
      await drop(p, S, 'persona', 120, 90, lead);
      await drop(p, S, 'persona', 120, 200, 'Approver');
      await drop(p, S, 'trigger', 360, 90, 'request arrives');
      await drop(p, S, 'phase', 360, 200, 'process it');
      await drop(p, S, 'intent', 600, 90, 'decide approve or reject');
      await drop(p, S, 'outcome', 600, 200, 'case settled');
    }
    await wait(400);

    // swap → rebuild
    await F.click('[data-testid=phase-rebuild]'); await conf();
    for (const p of [A, B]) { await p.waitForSelector('#reveal-go', { state: 'visible', timeout: 9000 }).catch(() => {}); if (await p.locator('#reveal-go').count()) await p.click('#reveal-go'); }
    await A.waitForSelector('[data-testid=rebuild-canvas]', { timeout: 9000 });
    await wait(500);

    // ---- inline persona challenge ----
    await A.waitForSelector('[data-testid=land-tray] [data-testid=land-transforms]', { timeout: 8000 });
    await A.locator('.landperson textarea').first().fill('reviews'); // a verb, not a role
    await A.locator('[data-testid=land-transforms]').first().click(); await wait(400);
    ok('challenge affordance appears once a person is landed', await A.locator('[data-testid=challenge-landing]').count() >= 1);
    await A.locator('[data-testid=challenge-landing]').first().click();
    await A.waitForFunction(() => { const e = document.querySelector('.landperson .chalreply'); return e && e.textContent.trim() && e.textContent.trim() !== '…'; }, { timeout: 20000 }).catch(() => {});
    const personaReply = (await A.locator('.landperson .chalreply').first().textContent()).trim();
    ok('persona challenge renders a real Coach line (not the pending placeholder)', personaReply.length > 1 && personaReply !== '…');
    console.log('    ↳ live persona challenge:', JSON.stringify(personaReply));
    // the flag/require verdict persists server-side then rides the NEXT broadcast — on live-AI latency
    // that lands a beat after the reply, so wait for it rather than checking immediately.
    await A.locator('.landperson .reqchip').first().waitFor({ timeout: 8000 }).catch(() => {});
    ok('a require-chip surfaces what the team still owes', await A.locator('.landperson .reqchip').count() >= 1, await A.locator('.landperson .reqchip').first().textContent().catch(() => ''));
    await A.screenshot({ path: SHOTS + '/01-persona-challenge.png' });

    // ---- shape meter ----
    ok('live shape-meter renders in the people tray', await A.locator('[data-testid=shape-meter]').count() === 1, await A.locator('[data-testid=shape-meter]').textContent().catch(() => ''));

    // ---- constraint routing panel ----
    await A.waitForSelector('[data-testid=constraint-panel]', { timeout: 8000 });
    await A.click('[data-testid=constraint-panel] > summary'); await wait(250);
    ok('constraint panel lists route options', await A.locator('[data-testid=route-habit]').count() >= 1);
    await A.locator('[data-testid=route-habit]').first().click(); await wait(400);
    ok('routing habit shows the ASSUMED (design-away) verdict', await A.locator('.cverdict.assumed').count() >= 1);
    await A.locator('[data-testid=route-law]').first().click(); await wait(400);
    ok('re-routing to law shows the REAL (survives) verdict', await A.locator('.cverdict.real').count() >= 1);
    await A.locator('[data-testid=challenge-route]').first().click();
    await A.waitForFunction(() => { const e = document.querySelector('.conrow .chalreply'); return e && e.textContent.trim() && e.textContent.trim() !== '…'; }, { timeout: 20000 }).catch(() => {});
    const routeReply = (await A.locator('.conrow .chalreply').first().textContent()).trim();
    ok('Ask-the-Coach renders a real routing challenge', routeReply.length > 1 && routeReply !== '…');
    console.log('    ↳ live route challenge:', JSON.stringify(routeReply));
    await A.screenshot({ path: SHOTS + '/02-constraint-routing.png' });

    // land everyone so we reach share cleanly
    const cards = await A.locator('.landperson').count();
    for (let i = 0; i < cards; i++) {
      const c = A.locator('.landperson').nth(i);
      if (await c.locator('.lb.on').count() === 0) { await c.locator('textarea').fill('Exceptions Steward — owns edge cases'); await c.locator('[data-testid=land-transforms]').click(); await wait(200); }
    }
    // an agent block so the shape can reach REDESIGNED
    await drop(A, '[data-testid=rebuild-canvas]', 'agent', 360, 600, 'auto-resolve agent');
    await wait(300);

    // ---- console shape-board (Farrier, never projected) ----
    ok('console shape-board present during rebuild', await F.locator('[data-testid=shape-board]').count() === 1);
    const boardTxt = await F.locator('[data-testid=shape-board]').textContent();
    ok('shape-board names a band (REDESIGNED/PARTIAL/RETROFIT)', /REDESIGNED|PARTIAL|RETROFIT/.test(boardTxt), boardTxt.slice(0, 80));

    // ---- share shape-verdict ----
    await F.click('[data-testid=phase-share]'); await conf();
    await A.waitForSelector('.share', { timeout: 9000 }); await wait(1500);
    ok('share shows the shape-verdict card', await A.locator('[data-testid=shape-verdict]').count() >= 1, await A.locator('[data-testid=shape-verdict]').textContent().catch(() => ''));
    await A.screenshot({ path: SHOTS + '/03-share-shape-verdict.png' });

    await b.close();
  } catch (e) { console.log('slicec-ui threw:', e.message.slice(0, 500)); await b.close(); process.exit(1); }
  console.log(`\nSLICE-C UI ${fail ? '❌' : '✅'} — ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
