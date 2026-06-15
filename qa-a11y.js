/* Cluster B accessibility & platform verification (B1–B12 + the canvas keyboard layer).
 * Same harness idiom as qa-fixcheck.js: Farrier + 2 members, ok()/wait().
 * axe-core is injected into the TEST browser only (no-framework invariant — nothing vendored into the app).
 *   BASE=http://localhost:3200 node qa-a11y.js
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3200';
const AXE = 'https://cdn.jsdelivr.net/npm/axe-core@4/axe.min.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + x : ''); } };

// axe scan: inject the CDN script into THIS page, run with color-contrast off (matches the platform probe),
// return critical/serious violation ids.
async function axeSerious(page) {
  await page.addScriptTag({ url: AXE });
  await page.waitForFunction(() => !!window.axe, null, { timeout: 8000 });
  const res = await page.evaluate(async () => {
    const r = await window.axe.run(document, { rules: { 'color-contrast': { enabled: false } } });
    return r.violations.filter(v => v.impact === 'critical' || v.impact === 'serious').map(v => v.id + '(' + v.nodes.length + ')');
  });
  return res;
}

(async () => {
  const b = await chromium.launch();
  const ctx = () => b.newContext({ viewport: { width: 1440, height: 900 } });

  // ---- landing axe (Farrier page, pre-host) ----
  const F = await (await ctx()).newPage();
  F.on('dialog', d => d.accept().catch(() => {}));
  const fontReqs = [];
  F.on('request', r => { const u = r.url(); if (/fonts\.(googleapis|gstatic)\.com/.test(u)) fontReqs.push(u); });
  await F.goto(BASE); await wait(400);

  let v = await axeSerious(F);
  ok('1a: axe — landing has 0 critical/serious', v.length === 0, v.join(','));

  // B13: fonts self-hosted — no requests to Google's font CDNs
  ok('13a: zero requests to fonts.googleapis/gstatic', fontReqs.length === 0, fontReqs.slice(0, 2).join(','));
  const frauncesReady = await F.evaluate(async () => { try { await document.fonts.load('600 44px Fraunces'); } catch (e) {} return document.fonts.check('600 44px Fraunces'); });
  ok('13b: document.fonts.check("600 44px Fraunces") true', frauncesReady === true);

  // B3 landmarks + B2 viewport on landing
  const landM = await F.locator('[role=main]').count();
  ok('4a: landing has exactly one [role=main]', landM === 1, String(landM));
  const h1 = await F.locator('h1.sr-only').first().textContent().catch(() => '');
  ok('4b: landing sr-only h1 matches the view', /host or join/i.test(h1), h1);
  const vp = await F.evaluate(() => document.querySelector('meta[name=viewport]').content);
  ok('3: viewport meta has no maximum-scale', !/maximum-scale/.test(vp), vp);

  // B1 live regions
  const toastsLive = await F.evaluate(() => { const t = document.getElementById('toasts'); return t && t.getAttribute('role') === 'status' && t.getAttribute('aria-live') === 'polite'; });
  ok('2a: #toasts is role=status aria-live=polite', toastsLive);
  const srOutside = await F.evaluate(() => { const s = document.getElementById('sr-status'); return s && !document.getElementById('app').contains(s); });
  ok('2b: #sr-status exists OUTSIDE #app', srOutside);

  // warn toast → role=alert (bad join code path triggers a warn toast on a member page later; here force one)
  await F.evaluate(() => window.toast && window.toast('a11y warn probe', true));
  await wait(150);
  const alertRole = await F.evaluate(() => { const t = document.querySelector('#toasts .toast.warn'); return t && t.getAttribute('role') === 'alert'; });
  ok('2c: warn toast carries role=alert', alertRole);

  // ---- host + two members ----
  await F.click('[data-testid=host-btn]'); await F.waitForSelector('.codechip');
  const code = (await F.textContent('.codechip')).trim();
  const conf = async (p) => { await wait(300); if (await p.locator('[data-testid=modal-confirm]').count()) await p.click('[data-testid=modal-confirm]'); };

  const A = await (await ctx()).newPage(); A.on('dialog', d => d.accept().catch(() => {}));
  await A.goto(BASE);
  await A.fill('[data-testid=join-name]', 'Vera'); await A.fill('[data-testid=join-code]', code); await A.click('[data-testid=join-btn]');
  await A.waitForSelector('[data-testid=create-team-name]');
  await A.fill('[data-testid=create-team-name]', 'A11y Crew'); await A.click('[data-testid=create-team-btn]');
  await A.waitForSelector('[data-testid=stable]'); await A.click('[data-testid=lets-ride]'); await wait(300);

  const B2 = await (await ctx()).newPage(); B2.on('dialog', d => d.accept().catch(() => {}));
  await B2.goto(BASE);
  await B2.fill('[data-testid=join-name]', 'Pat'); await B2.fill('[data-testid=join-code]', code); await B2.click('[data-testid=join-btn]');
  await B2.waitForSelector('[data-testid=create-team-name]');
  await B2.fill('[data-testid=create-team-name]', 'Other Crew'); await B2.click('[data-testid=create-team-btn]');
  await B2.waitForSelector('[data-testid=stable]'); await B2.click('[data-testid=lets-ride]').catch(() => {}); await wait(200);

  // console axe + landmark
  v = await axeSerious(F);
  ok('1b: axe — Farrier console has 0 critical/serious', v.length === 0, v.join(','));
  ok('4c: console [role=banner] present', (await F.locator('[role=banner]').count()) >= 1);

  await F.click('[data-testid=phase-surface]'); await conf(F);
  await A.waitForSelector('[data-testid=surface-canvas]', { timeout: 8000 }); await wait(600);

  // surface axe (with map chrome)
  v = await axeSerious(A);
  ok('1c: axe — Surface has 0 critical/serious', v.length === 0, v.join(','));
  ok('4d: Surface sr-only h1 reads "Surface — map your workflow"',
    /Surface — map your workflow/.test(await A.locator('h1.sr-only').first().textContent().catch(() => '')));

  // ---- B9 keyboard place ----
  await A.click('[data-testid=tool-trigger]');
  await A.locator('.scene[data-testid=surface-canvas]').focus();
  await A.keyboard.press('Enter');             // place at viewport centre
  await wait(250);
  await A.keyboard.type('it begins');
  await A.keyboard.press('Enter');             // commit the label
  await wait(900);
  const placed = await A.locator('[data-testid=surface-canvas] .node.trigger .label').first().textContent().catch(() => '');
  ok('5: keyboard Enter places a Trigger + label commits', /it begins/.test(placed), placed);

  // ---- roving + nudge ----
  await A.click('[data-testid=tool-select]');
  await A.locator('.scene[data-testid=surface-canvas]').focus();
  await A.keyboard.press('Tab');               // scene → first node (roving 0)
  await wait(150);
  const onNode = await A.evaluate(() => document.activeElement && document.activeElement.classList.contains('node'));
  ok('6a: Tab from the scene focuses a .node', onNode === true);
  const x0 = await A.evaluate(() => { const n = document.activeElement; return n && n.classList.contains('node') ? parseInt(n.style.left) : null; });
  await A.keyboard.press('ArrowRight'); await A.keyboard.press('ArrowRight'); await A.keyboard.press('ArrowRight');
  await wait(800);                              // 600ms debounce commit
  const x1 = await A.evaluate(() => { const n = document.querySelector('[data-testid=surface-canvas] .node:focus') || document.activeElement; return n && n.style ? parseInt(n.style.left) : null; });
  ok('6b: ArrowRight ×3 nudges +30px (commit fired)', x1 === x0 + 30, x0 + ' → ' + x1);
  await A.keyboard.press('Shift+ArrowRight'); await wait(50);
  const x2 = await A.evaluate(() => { const n = document.activeElement; return n && n.style ? parseInt(n.style.left) : null; });
  ok('6c: Shift+ArrowRight is a fine ±1 nudge', x2 === x1 + 1, x1 + ' → ' + x2);
  const annNudge = await A.evaluate(() => document.getElementById('sr-status').textContent);
  ok('6d: #sr-status announced the move', /Moved to/.test(annNudge), annNudge);

  // ---- keyboard connect ----
  // place a second node by keyboard, then connect A→B
  await A.click('[data-testid=tool-persona]'); await A.locator('.scene[data-testid=surface-canvas]').focus();
  await A.keyboard.press('Enter'); await wait(250); await A.keyboard.type('owner'); await A.keyboard.press('Enter'); await wait(800);
  const arrowsBefore = await A.evaluate(() => document.querySelectorAll('[data-testid=surface-canvas] path.flow').length);
  await A.click('[data-testid=tool-select]'); await A.locator('.scene[data-testid=surface-canvas]').focus();
  await A.keyboard.press('Tab'); await wait(120);          // focus first node
  await A.keyboard.press('a'); await wait(150);            // arrow from it
  await A.keyboard.press('Tab'); await wait(120);          // tab to the next node
  await A.keyboard.press('Enter'); await wait(700);        // complete
  const arrowsAfter = await A.evaluate(() => document.querySelectorAll('[data-testid=surface-canvas] path.flow').length);
  ok('7a: keyboard A→Tab→Enter adds an arrow', arrowsAfter === arrowsBefore + 1, arrowsBefore + ' → ' + arrowsAfter);
  ok('7b: #sr-status announced the connection', /connected/i.test(await A.evaluate(() => document.getElementById('sr-status').textContent)));

  // ---- Tab exit (no trap): from the LAST node in visual order, Tab leaves .world ----
  await A.evaluate(() => {
    const nodes = [...document.querySelectorAll('[data-testid=surface-canvas] .node')].sort((a, b) => (parseInt(a.style.top) - parseInt(b.style.top)) || (parseInt(a.style.left) - parseInt(b.style.left)));
    nodes[nodes.length - 1].focus();
  });
  await wait(120);
  // WCAG 2.1.2 = focus must be ESCAPABLE, not single-Tab exit: from the last node, Tab
  // first lands in that node's inspector WHY field (a deliberate keyboard affordance —
  // edit the back of the card), then the next Tab leaves .world. Assert no trap within a
  // few tabs rather than a literal one-shot exit (see IMPLEMENTATION-NOTES DEV-B1).
  let escaped = false;
  for (let i = 0; i < 4 && !escaped; i++) {
    await A.keyboard.press('Tab'); await wait(120);
    escaped = await A.evaluate(() => { const a = document.activeElement; const w = document.querySelector('[data-testid=surface-canvas] .world'); return !(w && w.contains(a)); });
  }
  ok('8: focus is never trapped — Tab leaves the canvas within a few stops', escaped === true);

  // ---- keyboard delete + announce ----
  await A.locator('.scene[data-testid=surface-canvas]').focus(); await A.keyboard.press('Tab'); await wait(120);
  const cntBefore = await A.evaluate(() => document.querySelectorAll('[data-testid=surface-canvas] .node').length);
  await A.keyboard.press('Delete'); await wait(600);
  const cntAfter = await A.evaluate(() => document.querySelectorAll('[data-testid=surface-canvas] .node').length);
  ok('9a: Delete removes the focused node', cntAfter === cntBefore - 1, cntBefore + ' → ' + cntAfter);
  ok('9b: #sr-status announced the deletion', /[Dd]eleted/.test(await A.evaluate(() => document.getElementById('sr-status').textContent)));

  // ---- B5 focus restore: Vera typing in coach composer survives Pat's broadcast ----
  // open the rail composer
  if (await A.locator('[data-testid=coach-input]').count() === 0) { await A.click('[data-testid=rail-toggle]').catch(() => {}); await wait(300); }
  await A.locator('[data-testid=coach-input]').focus();
  await A.locator('[data-testid=coach-input]').type('half a thought about ');
  // Pat commits a block → broadcast → Vera re-renders
  await B2.click('[data-testid=tool-input]'); await B2.locator('.scene[data-testid=surface-canvas]').click({ position: { x: 300, y: 300 } }); await wait(150);
  await B2.keyboard.type('a form'); await B2.click('[data-testid=tool-select]'); await wait(800);
  const stillFocused = await A.evaluate(() => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.testid === 'coach-input');
  ok('10a: B5 — Vera keeps coach-input focus through Pat’s broadcast', stillFocused === true);
  const caretEnd = await A.evaluate(() => { const e = document.querySelector('[data-testid=coach-input]'); return e.selectionStart === (e.value || '').length && /half a thought/.test(e.value); });
  ok('10b: B5 — caret + draft text preserved', caretEnd === true);

  // ---- B6 dialog: home → native <dialog>, focus on confirm, Escape resolves false ----
  await A.click('[data-testid=home]'); await wait(300);
  const dlgOpen = await A.evaluate(() => !!document.querySelector('dialog.modaldlg[open]'));
  ok('11a: confirmModal renders a native <dialog open>', dlgOpen);
  const focusOnConfirm = await A.evaluate(() => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.testid === 'modal-confirm');
  ok('11b: focus lands on modal-confirm', focusOnConfirm);
  await A.keyboard.press('Escape'); await wait(300);
  const stayed = await A.evaluate(() => !document.querySelector('dialog.modaldlg[open]') && !!document.querySelector('[data-testid=surface-canvas]'));
  ok('11c: Escape resolves false (dialog closed, still on Surface)', stayed);

  // ---- B6b reveal focus ----
  // give A something so the gate isn't empty, then swap
  await B2.click('[data-testid=tool-persona]'); await B2.locator('.scene[data-testid=surface-canvas]').click({ position: { x: 200, y: 120 } }); await wait(120);
  await B2.keyboard.type('Someone'); await B2.click('[data-testid=tool-select]'); await wait(300);
  await F.click('[data-testid=phase-rebuild]'); await conf(F);
  await A.waitForSelector('#reveal.on', { timeout: 9000 });
  await wait(1900);                             // cta-ready @1.7s + focus move
  const revFocus = await A.evaluate(() => document.activeElement && document.activeElement.id === 'reveal-go');
  ok('12a: reveal CTA (#reveal-go) takes focus at cta-ready', revFocus, await A.evaluate(() => (document.activeElement || {}).id || '(none)'));
  await A.keyboard.press('Escape'); await wait(500);
  ok('12b: Escape dismisses the reveal post-cta-ready', (await A.locator('#reveal.on').count()) === 0);

  // ---- rebuild axe (teardown cards present) ----
  await A.waitForSelector('[data-testid=rebuild-canvas]', { timeout: 8000 }); await wait(700);
  v = await axeSerious(A);
  ok('1d: axe — Rebuild has 0 critical/serious', v.length === 0, v.join(','));

  // ---- B7 race card DPR: stub toDataURL to capture backing-store width ----
  await F.click('[data-testid=phase-share]'); await conf(F);
  await A.waitForSelector('.share', { timeout: 8000 }); await wait(3500);
  await A.evaluate(() => { window.__cw = 0; const orig = HTMLCanvasElement.prototype.toDataURL; HTMLCanvasElement.prototype.toDataURL = function () { window.__cw = Math.max(window.__cw, this.width); return orig.apply(this, arguments); }; });
  if (await A.locator('[data-testid=save-card]').count()) {
    await A.click('[data-testid=save-card]'); await wait(900);
    const cw = await A.evaluate(() => window.__cw);
    ok('15: race-card canvas backing store is ≥2× DPR (width ≥1760)', cw >= 1760, String(cw));
  } else { ok('15: race-card save control present', false, 'no [data-testid=save-card]'); }

  // ---- B10 SW on localhost ----
  if (/^https?:\/\/localhost/.test(BASE)) {
    const swReady = await A.evaluate(() => 'serviceWorker' in navigator ? navigator.serviceWorker.ready.then(() => true).catch(() => false) : false).catch(() => false);
    ok('14: service worker registers on localhost', swReady === true);
  } else { ok('14: SW skipped (non-localhost BASE — secure-context gate)', true); }

  // ---- save a WONK eyeball screenshot of the wordmark ----
  await A.goto('about:blank');
  const W = await (await ctx()).newPage(); await W.goto(BASE); await wait(800);
  await W.locator('.brand, .wordmark, h1').first().screenshot({ path: 'uat-shots/a11y-wonk-wordmark.png' }).catch(() => {});

  await b.close();
  console.log(`\nA11Y ${fail === 0 ? '✅' : '❌'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
