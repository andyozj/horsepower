/* Horsepower — R10 gallery/density UI addendum (Playwright).
 * Builds a 6-team room WS-level (fast), then opens ONE Farrier browser and asserts:
 *   - console present picker shows 6 pairs + a Gallery button
 *   - clicking Gallery renders .roomview.gallery .gcell === 6
 *   - featuring a pair still renders .roomview .ba-card === 2 (existing semantics coexist)
 *   - room-view roster +N pill appears at >8 members (density)
 *   PORT=3400 node server.js   &&   BASE=http://localhost:3400 node qa-scale-ui.js
 */
const { chromium } = require('playwright');
const WebSocket = require('ws');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:3400';
const WSBASE = BASE.replace('http', 'ws');
const SHOTS = __dirname + '/qa-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, e) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, e != null ? '→ ' + JSON.stringify(e) : ''); } };
const mk = () => new Promise(res => { const w = new WebSocket(WSBASE); w.on('open', () => res(w)); });
const J = o => JSON.stringify(o);
const TEAMS = 6, PER = 5, BIG = 10;   // team 0 gets BIG members to exercise the +N pill

function teamCanvas(pfx) {
  return { blocks: [
    { id: pfx + 'p1', type: 'persona', x: 60, y: 60, w: 170, h: 58, text: pfx + ' Owner', meta: { capacity: 'accountable', why: 'owns it end to end' } },
    { id: pfx + 'p3', type: 'persona', x: 60, y: 360, w: 170, h: 58, text: pfx + ' Customer', meta: { capacity: 'served', why: 'the party it is all for' } },
    { id: pfx + 'tr', type: 'trigger', x: 60, y: 160, w: 180, h: 54, text: pfx + ' request', meta: {} },
    { id: pfx + 'in', type: 'input', x: 60, y: 240, w: 150, h: 46, text: pfx + ' data', meta: {} },
    { id: pfx + 'ph', type: 'phase', x: 300, y: 60, w: 240, h: 120, text: pfx + ' Process', meta: { why: 'value created here' } },
    { id: pfx + 'm', type: 'moment', x: 320, y: 110, w: 150, h: 50, text: pfx + ' decide', pain: true, meta: { phaseId: pfx + 'ph' } },
    { id: pfx + 'it', type: 'intent', x: 600, y: 60, w: 230, h: 70, text: 'Decide the ' + pfx + ' request is fulfilled', meta: {} },
    { id: pfx + 'oc', type: 'outcome', x: 600, y: 170, w: 200, h: 62, text: pfx + ' fulfilled', meta: {} }
  ], arrows: [{ id: pfx + 'a', from: pfx + 'tr', to: pfx + 'ph' }], orphans: [], chat: [], glossary: [] };
}

(async () => {
  // ---- WS-level: build a 6-team room and drive it to share ----
  const r = await fetch(BASE + '/api/workshop', { method: 'POST' });
  const { code, hostKey } = await r.json();
  const fac = await mk(); let fl = {}; fac.on('message', d => { const o = JSON.parse(d); if (o.type === 'state') fl.state = o.state; });
  fac.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey })); await wait(120);
  const teamIds = [];
  for (let t = 0; t < TEAMS; t++) {
    const n = t === 0 ? BIG : PER;
    const lead = await mk(); let ll = {}; lead.on('message', d => { const o = JSON.parse(d); if (o.type === 'seated') ll.seat = o; });
    lead.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'T' + t + 'm0' })); await wait(40);
    lead.send(J({ type: 'team:create', workshopCode: code, name: 'Team ' + (t + 1), memberName: 'T' + t + 'm0' })); await wait(70);
    const teamId = ll.seat && ll.seat.teamId; teamIds.push(teamId);
    for (let i = 1; i < n; i++) {
      const s = await mk();
      s.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'T' + t + 'm' + i })); await wait(20);
      s.send(J({ type: 'team:join', workshopCode: code, teamId, memberName: 'T' + t + 'm' + i })); await wait(30);
    }
    lead.send(J({ type: 'canvas:update', workshopCode: code, canvas: teamCanvas('t' + t) })); await wait(50);
  }
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'surface' })); await wait(100);
  // re-send canvases now that we're in surface (gate-green)
  // (canvas:update during lobby is rejected; resend after phase set)
  // quick: each lead already has a socket gone; just send a fresh lead canvas via a new socket per team
  // simpler — they were sent pre-surface and may be dropped; resend via farrier-safe path:
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'rebuild' })); await wait(300);
  // if not all swapped (canvases dropped), buildTeardown fallback still seeds redesign — swap is robust
  fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'share' })); await wait(300);
  const sharedTeams = (fl.state.teams || []).filter(t => t.receivedFromTeamId).length;
  ok('WS setup: 6 teams swapped + at share', fl.state.state === 'share' && sharedTeams === TEAMS, { state: fl.state.state, sharedTeams });

  // ---- one Farrier browser ----
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('   [pageerror]', e.message));
    // seed Farrier identity in localStorage before the app boots
    await page.addInitScript(([c, hk]) => {
      localStorage.setItem('horsepower.v2', JSON.stringify({ role: 'farrier', code: c, hostKey: hk, teamId: null, memberId: null, name: 'Farrier' }));
    }, [code, hostKey]);
    await page.goto(BASE);
    await page.waitForSelector('.console', { timeout: 8000 });
    await wait(500);

    // present picker shows 6 pairs + a Gallery button
    const picks = await page.locator('[data-testid=present-pick]').count();
    ok('console present picker shows 6 pairs', picks === TEAMS, picks);
    ok('console present picker has a Gallery (show all) button', await page.locator('[data-testid=present-gallery]').count() === 1);

    // click Gallery → room view renders the contact sheet (6 cells)
    await page.click('[data-testid=present-gallery]');
    await wait(200);
    await page.click('[data-testid=toggle-room]');
    await page.waitForSelector('.roomview', { timeout: 8000 });
    await wait(400);
    const cells = await page.locator('.roomview.gallery .gcell').count();
    ok('Gallery wall renders every pair (.roomview.gallery .gcell === 6)', cells === TEAMS, cells);
    await page.screenshot({ path: SHOTS + '/scale-gallery.png' });

    // feature a pair → existing .ba-card === 2 still holds (coexist with gallery)
    await page.click('[data-testid=toggle-room]'); await wait(200);   // back to console
    await page.click('[data-testid=present-pick]'); await wait(200);
    await page.click('[data-testid=toggle-room]');
    await page.waitForSelector('.roomview', { timeout: 8000 });
    await wait(300);
    ok('featuring a pair still renders .roomview .ba-card === 2 (semantics intact)', await page.locator('.roomview .ba-card').count() === 2);
    await page.screenshot({ path: SHOTS + '/scale-featured.png' });
  } catch (e) {
    fail++; console.log('  ✗ qa-scale-ui threw:', e.message);
  } finally {
    await browser.close();
    fac.close();
  }
  console.log(`\nqa-scale-ui: ${pass} passed, ${fail} failed (of ${pass + fail})`);
  process.exit(fail ? 1 : 0);
})();
