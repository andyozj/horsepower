/* Horsepower — record the FARRIER's-eye-view journey to video.
 * Records the host console; two members (with steeds) run in the background to
 * give the Farrier something to monitor. Visible cursor + demo pacing.
 * Run with the server up:  BASE=http://localhost:3200 node record-farrier.js
 * Output: ./uat-shots/farrier.webm (+ .mp4 via ffmpeg afterwards)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:3200';
const OUT = __dirname + '/uat-shots';
const VW = 1280, VH = 800;
fs.mkdirSync(OUT, { recursive: true });
const beat = (ms = 900) => new Promise(r => setTimeout(r, ms));

const CURSOR = () => {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;width:20px;height:20px;border:2.5px solid #e02d2d;border-radius:50%;background:rgba(224,45,45,.22);z-index:99999;pointer-events:none;transform:translate(-50%,-50%);left:-80px;top:-80px;transition:transform .08s ease';
  const add = () => document.body && document.body.appendChild(d);
  if (document.body) add(); else addEventListener('DOMContentLoaded', add);
  addEventListener('mousemove', e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', () => { d.style.transform = 'translate(-50%,-50%) scale(.6)'; }, true);
  addEventListener('mouseup', () => { d.style.transform = 'translate(-50%,-50%) scale(1)'; }, true);
};

// a background team member: join, (optionally) author a small canvas when Surface starts
async function member(browser, code, teamName, blocks) {
  const ctx = await browser.newContext({ viewport: { width: 1140, height: 760 } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept().catch(() => {}));
  await p.goto(BASE);
  await p.fill('[data-testid=join-name]', teamName.split(' ')[0]);
  await p.fill('[data-testid=join-code]', code);
  await p.click('[data-testid=join-btn]');
  await p.waitForSelector('[data-testid=create-team-name]');
  await p.fill('[data-testid=create-team-name]', teamName);
  await p.click('[data-testid=create-team-btn]');
  await p.waitForSelector('[data-testid=stable]');
  return { ctx, p, blocks };
}
async function authel(p, tool, x, y, text) {
  await p.click(`[data-testid=tool-${tool}]`);
  await p.click('[data-testid=surface-canvas]', { position: { x, y } });
  await beat(110); if (text) await p.keyboard.type(text);
  await p.click('[data-testid=tool-select]'); await beat(110);
}

(async () => {
  const browser = await chromium.launch({ slowMo: 240 });

  // --- the Farrier we RECORD ---
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, recordVideo: { dir: OUT, size: { width: VW, height: VH } } });
  await ctx.addInitScript(CURSOR);
  const F = await ctx.newPage();
  F.on('dialog', d => d.accept().catch(() => {}));

  // 1) Host a workshop → the lobby "set up your room" screen
  await F.goto(BASE);
  await beat(1400);
  await F.click('[data-testid=host-btn]');
  await F.waitForSelector('[data-testid=stepper]');
  const code = (await F.textContent('.codechip')).trim();
  await beat(2600);                                   // dwell on the setup screen (code, stepper, Start greyed)

  // 2) Teams assemble (background)
  const ap = await member(browser, code, 'AP Squad', [
    ['persona', 150, 110, 'OpCo GM'], ['trigger', 150, 230, 'invoice arrives'], ['input', 150, 320, 'supplier invoice'],
    ['phase', 420, 130, 'Reconcile'], ['moment', 460, 185, 'match to PO'],
    ['intent', 760, 120, 'suppliers paid on time so credit terms hold'], ['outcome', 760, 250, 'credit terms kept']
  ]);
  await beat(800);
  const etl = await member(browser, code, 'ETL Crew', [
    ['persona', 150, 110, 'Finance Analyst'], ['trigger', 150, 230, 'month end'],
    ['intent', 440, 130, 'cash position known before payroll'], ['outcome', 440, 250, 'payroll funded on time']
  ]);
  await beat(2600);                                   // both stables now show on the setup screen, Start enables

  // 3) And they're off — Start Surface
  await F.click('[data-testid=phase-surface]');
  await beat(1600);                                   // dashboard: stepper advances, team rows + steeds + whispers

  // teams author their maps (background, quick) — collapse their Coach rail first so canvas clicks land clean
  for (const t of [ap, etl]) {
    await t.p.waitForSelector('[data-testid=surface-canvas]');
    if (await t.p.locator('[data-testid=coach-rail]:not(.collapsed)').count()) { await t.p.click('[data-testid=rail-toggle]'); await beat(150); }
    for (const b of t.blocks) await authel(t.p, ...b);
  }
  await beat(1500);                                   // whispers/status update to "ready"

  // 4) The timer — load → Start → it runs → Pause
  await F.click('[data-testid=timer-10]'); await beat(700);
  await F.click('[data-testid=timer-start]'); await beat(2600);   // watch it count down
  await F.click('[data-testid=timer-pause]'); await beat(1400);

  // 5) Drill into a team's live board (read-only mirror with their real labels + steeds)
  await F.click('[data-testid=team-row]');
  await F.waitForSelector('.mirror');
  await beat(3200);
  await F.click('text=← all teams'); await beat(1200);

  // 6) Swap → Rebuild
  await F.click('[data-testid=phase-rebuild]'); await beat(2600);

  // 7) Approve a lock-amendment request (raised by a team in the background)
  await ap.p.waitForSelector('[data-testid=rebuild-canvas]');
  if (await ap.p.locator('#reveal.on').count()) { await ap.p.click('#reveal-go'); await beat(300); } // dismiss the member's reveal overlay
  await ap.p.locator('[data-testid=rebuild-canvas] .node.locked').first().click();
  await ap.p.waitForSelector('[data-testid=challenge-lock]');
  await ap.p.click('[data-testid=challenge-lock]');
  await ap.p.waitForSelector('[data-testid=send-challenge]');
  await ap.p.locator('.modalcard textarea').fill('this intent is an artifact — the capture missed the decision');
  await ap.p.locator('.modalcard input').fill('the real decision behind it');
  await ap.p.click('[data-testid=send-challenge]');
  await beat(2000);                                   // the request lands on the console
  const approve = F.locator('[data-testid=approve-amend]').first();
  if (await approve.count()) { await approve.click(); await beat(1800); }

  // 8) Move to Share, then project the Before/After present view
  await F.click('[data-testid=phase-share]'); await beat(1800);
  const pick = F.locator('[data-testid=present-pick]').first();
  if (await pick.count()) { await pick.click(); await beat(800); }
  await F.click('[data-testid=toggle-room]');         // onto the projector
  await F.waitForSelector('.roomview');
  await beat(4200);                                   // dwell on the projected double reveal

  const video = F.video();
  await ctx.close();
  await ap.ctx.close(); await etl.ctx.close();
  await browser.close();
  if (video) { const p = await video.path(); const final = OUT + '/farrier.webm'; try { fs.renameSync(p, final); } catch (e) { fs.copyFileSync(p, final); } console.log('🎬 recorded →', final); }
  else console.log('no video produced');
})().catch(e => { console.error('record failed:', e.message); process.exit(1); });
