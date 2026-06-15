/* Horsepower — polished demo film, directed with Playwright.
 * Records TWO clips and concatenates them with ffmpeg:
 *   clip A (maya.webm)   — Maya's POV: landing → join → lobby → Surface → swap reveal
 *                          → Rebuild → Share double reveal.
 *   clip B (farrier.webm)— Farrier console finale: pick the presenting pair →
 *                          project the room-view before/after.
 * Maya is the hero; Sam + the Farrier do their work off-camera EXCEPT clip B.
 *
 * Server must already be running. Default BASE=http://localhost:3200.
 *   BASE=http://localhost:3200 node record-demo.js
 * Output: uat-shots/demo.mp4  (+ source webms kept, temp clips cleaned)
 */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:3200';
const OUT = path.join(__dirname, 'uat-shots');
const VW = 1440, VH = 900;
fs.mkdirSync(OUT, { recursive: true });
const beat = (ms = 900) => new Promise(r => setTimeout(r, ms));

// A visible cursor dot that tracks the Playwright-driven mouse (purely for the film).
const CURSOR = () => {
  const d = document.createElement('div');
  d.id = '__cur';
  d.style.cssText = 'position:fixed;width:22px;height:22px;border:2.5px solid #e02d2d;border-radius:50%;background:rgba(224,45,45,.20);z-index:99999;pointer-events:none;transform:translate(-50%,-50%);left:-80px;top:-80px;transition:transform .08s ease;box-shadow:0 1px 6px rgba(224,45,45,.4)';
  const add = () => document.body && document.body.appendChild(d);
  if (document.body) add(); else addEventListener('DOMContentLoaded', add);
  addEventListener('mousemove', e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', () => { d.style.transform = 'translate(-50%,-50%) scale(.6)'; }, true);
  addEventListener('mouseup', () => { d.style.transform = 'translate(-50%,-50%) scale(1)'; }, true);
};

// Move the visible cursor toward an element before acting, so motion reads on camera.
async function glide(page, sel, opts = {}) {
  const loc = typeof sel === 'string' ? page.locator(sel).first() : sel;
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const box = await loc.boundingBox().catch(() => null);
  if (box) {
    const x = box.x + box.width / 2 + (opts.dx || 0);
    const y = box.y + box.height / 2 + (opts.dy || 0);
    await page.mouse.move(x, y, { steps: 22 });
    await beat(opts.settle || 320);
  }
  return loc;
}
async function clickIt(page, sel, opts = {}) {
  const loc = await glide(page, sel, opts);
  await loc.click(opts.click || {});
  await beat(opts.after || 380);
}
// Drop a typed block: pick the tool, glide to the scene point, click, type, commit.
async function drop(page, scene, tool, x, y, text, typeDelay = 55) {
  await clickIt(page, `[data-testid=tool-${tool}]`, { after: 260 });
  const box = await page.locator(scene).boundingBox();
  await page.mouse.move(box.x + x, box.y + y, { steps: 20 });
  await beat(280);
  await page.mouse.click(box.x + x, box.y + y);
  await beat(180);
  if (text) await page.keyboard.type(text, { delay: typeDelay });
  await beat(260);
  await page.click('[data-testid=tool-select]'); // blur → commit to server
  await beat(360);
}

(async () => {
  const browser = await chromium.launch({ slowMo: 130 });

  // ---- off-camera Farrier (its OWN context: isolated localStorage) ----
  const fctx = await browser.newContext({ viewport: { width: VW, height: VH },
    recordVideo: { dir: OUT, size: { width: VW, height: VH } } });
  await fctx.addInitScript(CURSOR);
  const F = await fctx.newPage(); F.on('dialog', d => d.accept().catch(() => {}));
  await F.goto(BASE);
  await clickIt(F, '[data-testid=host-btn]', { after: 700 });
  await F.waitForSelector('.codechip', { timeout: 10000 });
  const code = (await F.textContent('.codechip')).trim();
  console.log('  workshop code:', code);

  // ---- off-camera Sam: ETL Crew (second team REQUIRED for the swap) ----
  const sctx = await browser.newContext({ viewport: { width: 1100, height: 760 } });
  const Sam = await sctx.newPage(); Sam.on('dialog', d => d.accept().catch(() => {}));
  await Sam.goto(BASE);
  await Sam.fill('[data-testid=join-name]', 'Sam');
  await Sam.fill('[data-testid=join-code]', code);
  await Sam.click('[data-testid=join-btn]');
  await Sam.waitForSelector('[data-testid=create-team-name]');
  await Sam.fill('[data-testid=create-team-name]', 'ETL Crew');
  await Sam.click('[data-testid=create-team-btn]');
  await Sam.waitForSelector('[data-testid=stable]');

  // ================= CLIP A — Maya's POV =================
  const mctx = await browser.newContext({ viewport: { width: VW, height: VH },
    recordVideo: { dir: OUT, size: { width: VW, height: VH } } });
  await mctx.addInitScript(CURSOR);
  const M = await mctx.newPage(); M.on('dialog', d => d.accept().catch(() => {}));

  // 1) Landing — let the hero sketch draw itself in, then meet + shuffle the steed
  await M.goto(BASE);
  await beat(4200);
  await M.waitForSelector('[data-testid=steed-name]');
  await beat(900);
  await clickIt(M, '[data-testid=reroll]', { after: 850 });
  await clickIt(M, '[data-testid=reroll]', { after: 1100 });
  await glide(M, '[data-testid=join-name]');
  await M.fill('[data-testid=join-name]', '');
  await M.type('[data-testid=join-name]', 'Maya', { delay: 70 });
  await beat(450);
  await glide(M, '[data-testid=join-code]');
  await M.type('[data-testid=join-code]', code, { delay: 90 });
  await beat(600);
  await clickIt(M, '[data-testid=join-btn]', { after: 600 });

  // 2) Team picker — let the "meet the map" ontology tour play, then start the stable
  await M.waitForSelector('[data-testid=create-team-name]');
  await beat(5200); // ontology tour builds a couple of times on camera
  await glide(M, '[data-testid=create-team-name]');
  await M.type('[data-testid=create-team-name]', 'AP Squad', { delay: 65 });
  await beat(500);
  await clickIt(M, '[data-testid=create-team-btn]', { after: 700 });

  // 3) Lobby — big "Meet the Coach" slide; press "Let's ride →", linger on the warm-up
  await M.waitForSelector('[data-testid=stable]');
  await beat(4200); // paddock + meet-the-Coach (A2b: no saddle step)

  // 4) Farrier starts Surface (off camera) → members land in the interview, then draw by hand
  await F.click('[data-testid=phase-surface]');
  await M.waitForSelector('[data-testid=interview-hero]', { timeout: 10000 }); await beat(1200);
  await M.click('[data-testid=interview-skip]').catch(()=>{}); await beat(600);
  await M.waitForSelector('[data-testid=surface-canvas]', { timeout: 10000 });
  await beat(1500);

  // background: give ETL Crew a small gate-ready canvas (off camera)
  await Sam.click('[data-testid=interview-skip]').catch(()=>{}); await beat(300);
  await Sam.waitForSelector('[data-testid=surface-canvas]');
  const SB = '[data-testid=surface-canvas]';
  const dropS = async (tool, x, y, text) => {
    await Sam.click(`[data-testid=tool-${tool}]`);
    const b = await Sam.locator(SB).boundingBox();
    await Sam.mouse.click(b.x + x, b.y + y);
    await beat(120); if (text) await Sam.keyboard.type(text);
    await Sam.click('[data-testid=tool-select]'); await beat(120);
  };
  await dropS('persona', 140, 100, 'Finance Analyst');
  await Sam.locator(SB + ' .node.persona').click();
  await Sam.waitForSelector('[data-testid=inspector-why]', { timeout: 6000 });
  await Sam.fill('[data-testid=inspector-why]', 'accountable for payroll being funded');
  await Sam.locator('[data-testid=inspector-capacity] button:has-text("accountable")').click();
  await new Promise(r=>setTimeout(r,300));
  await dropS('trigger', 140, 220, 'month-end close');
  await dropS('intent', 420, 120, 'cash position known before payroll runs');
  await dropS('outcome', 420, 250, 'payroll funded on time');

  // 5) SURFACE — the heart of the film, on Maya's screen.
  const S = '[data-testid=surface-canvas]';

  // 5a) Brain-dump to the Coach (right rail composer). It degrades to the question bank.
  await glide(M, '[data-testid=coach-input]');
  await M.click('[data-testid=coach-input]');
  await M.type('[data-testid=coach-input]',
    'an invoice lands in the shared inbox, someone checks it against the PO, then we chase the approver — month-end is chaos',
    { delay: 22 });
  await beat(600);
  await clickIt(M, '[data-testid=coach-send]', { after: 2400 }); // show the Coach reply

  // 5b) Draw a coherent map with the typed-block palette
  await drop(M, S, 'trigger', 120, 110, 'invoice lands in inbox');
  await drop(M, S, 'phase',   120, 250, 'check against PO');
  await drop(M, S, 'phase',   430, 110, 'chase the approver');
  await drop(M, S, 'moment',  470, 165, 'the month-end pile-up');
  await drop(M, S, 'persona', 760, 110, 'AP analyst');
  await drop(M, S, 'intent',  760, 250, 'decide: pay or dispute');
  await drop(M, S, 'outcome', 430, 320, 'suppliers paid on time, trusted');
  await beat(900);

  // clear the selection (the inspector auto-opens on the last-placed block)
  const scn0 = await M.locator('[data-testid=surface-canvas]').boundingBox();
  await M.mouse.click(scn0.x + scn0.width - 140, scn0.y + scn0.height - 100);
  await beat(400);
  // 5c) Two-click arrows — wire the spine of the map
  await clickIt(M, '[data-testid=tool-arrow]', { after: 300 });
  await clickIt(M, '[data-testid=surface-canvas] .node.trigger', { after: 300 });
  await clickIt(M, '[data-testid=surface-canvas] .node.phase', { after: 500 });
  await clickIt(M, '[data-testid=tool-arrow]', { after: 300 });
  const phases = M.locator('[data-testid=surface-canvas] .node.phase');
  await glide(M, phases.nth(0)); await phases.nth(0).click(); await beat(300);
  await glide(M, phases.nth(1)); await phases.nth(1).click(); await beat(500);
  await clickIt(M, '[data-testid=tool-select]', { after: 400 });

  // 5d) Drag a block so the act of arranging is visible
  const persona = M.locator('[data-testid=surface-canvas] .node.persona').first();
  const pbox = await persona.boundingBox();
  if (pbox) {
    await M.mouse.move(pbox.x + pbox.width / 2, pbox.y + pbox.height / 2, { steps: 12 });
    await beat(250);
    await M.mouse.down();
    await M.mouse.move(pbox.x + pbox.width / 2 + 60, pbox.y + pbox.height / 2 + 40, { steps: 24 });
    await beat(150);
    await M.mouse.up();
    await beat(700);
  }
  // 5e) NEW: flip the card — capacity + WHY on camera (this is what unlocks the gate now)
  // (dragging selected the persona, so its inspector is already open — use it)
  if (!(await M.locator('[data-testid=inspector-why]').count())) {
    await clickIt(M, '[data-testid=surface-canvas] .node.persona', { after: 600 });
  }
  await M.waitForSelector('[data-testid=inspector-why]', { timeout: 6000 });
  await glide(M, M.locator('[data-testid=inspector-capacity] button:has-text("accountable")'));
  await M.locator('[data-testid=inspector-capacity] button:has-text("accountable")').click();
  await beat(700);
  await M.locator('[data-testid=inspector-why]').click();
  await M.keyboard.type('owns the exception call when invoices don’t match', { delay: 34 });
  await beat(600);
  const ph0 = M.locator('[data-testid=surface-canvas] .node.phase').first();
  await glide(M, ph0); await ph0.click();
  await M.waitForSelector('[data-testid=inspector-why]', { timeout: 6000 });
  await M.locator('[data-testid=inspector-why]').click();
  await M.keyboard.type('invoices must match POs before any payment', { delay: 34 });
  await beat(400);
  const ph1 = M.locator('[data-testid=surface-canvas] .node.phase').nth(1);
  await glide(M, ph1); await ph1.click();
  await M.waitForSelector('[data-testid=inspector-why]', { timeout: 6000 });
  await M.locator('[data-testid=inspector-why]').click();
  await M.keyboard.type('approvers sit outside the team — someone must chase', { delay: 30 });
  await beat(400);
  // deselect → commit
  const scn = await M.locator('[data-testid=surface-canvas]').boundingBox();
  await M.mouse.click(scn.x + scn.width - 160, scn.y + scn.height - 120);
  await beat(1400); // admire the assembled, gate-ready map (rosette should land)

  // 6) Farrier triggers the swap (off camera); confirm the styled modal if shown
  await F.click('[data-testid=phase-rebuild]');
  await beat(300);
  if (await F.locator('[data-testid=modal-confirm]').count()) await F.click('[data-testid=modal-confirm]');

  // 7) The surprise reveal — hold for the full stamp choreography, then build
  await M.waitForSelector('#reveal.on', { timeout: 10000 });
  await beat(4400); // scrim → stamp slam → twist → teardown re-enters
  await M.waitForSelector('#reveal-go', { state: 'visible', timeout: 10000 });
  await beat(800);
  await clickIt(M, '#reveal-go', { after: 600 });

  // 8) REBUILD — teardown cards, agent block, people landing, assumption ledger
  await M.waitForSelector('[data-testid=rebuild-canvas]', { timeout: 10000 });
  await beat(1700);
  const cand = M.locator('[data-testid=rebuild-canvas] .ingcard.candidate').first();
  if (await cand.count()) { await glide(M, cand, { settle: 200 }); await cand.hover(); await beat(2400); } // WHY expands

  const RB = '[data-testid=rebuild-canvas]';
  await drop(M, RB, 'agent', 360, 300, 'reconcile + chase agent');
  await beat(600);

  // people landing — fill a real note, then land via transforms
  await M.waitForSelector('[data-testid=land-tray] [data-testid=land-transforms]', { timeout: 10000 });
  const lp = M.locator('.landperson textarea').first();
  await glide(M, lp);
  await lp.fill('');
  await lp.type('moves to exception-judging — approves the edge cases the agent can’t', { delay: 18 });
  await beat(500);
  await clickIt(M, '[data-testid=land-transforms]', { after: 1100 });

  // assumption ledger — open the floating strip and log a real guess
  await clickIt(M, '.assumefloat summary', { after: 600 });
  await glide(M, '[data-testid=assumption-input]');
  await M.type('[data-testid=assumption-input]', 'presumably the ERP can expose a webhook', { delay: 30 });
  await beat(500);
  await clickIt(M, '[data-testid=add-assumption]', { after: 1400 });
  await beat(900);

  // 9) Farrier moves to Share (off camera). Maya watches the double reveal.
  await F.click('[data-testid=phase-share]');
  await M.waitForSelector('.beforeafter', { timeout: 10000 });
  await beat(3600); // diff + ledger flip up
  await M.locator('[data-testid=race-card]').scrollIntoViewIfNeeded().catch(() => {});
  await beat(3600); // the keepsake race card is dealt in

  const mvideo = M.video();
  await mctx.close(); // flush clip A

  // ================= CLIP B — Farrier console finale =================
  // Pick the presenting pair, then project the room-view before/after.
  await beat(400);
  await F.bringToFront();
  // ensure the console (not room view) is showing; navigate to the present picker
  if (await F.locator('text=← all teams').count()) await F.click('text=← all teams').catch(() => {});
  await beat(800);
  await clickIt(F, '[data-testid=present-pick]', { after: 900 });
  await clickIt(F, '[data-testid=toggle-room]', { after: 800 });
  await F.waitForSelector('.roomview .ba-card', { timeout: 10000 });
  await beat(5200); // dwell on the projected ink-stage before/after

  // 9-end) End card — back to the landing for 3s (on the Farrier film)
  await clickIt(F, '[data-testid=home]', { after: 500 });
  if (await F.locator('[data-testid=modal-confirm]').count()) await F.click('[data-testid=modal-confirm]');
  await F.waitForSelector('[data-testid=host-btn]', { timeout: 10000 }).catch(() => {});
  await beat(3000);

  const fvideo = F.video();
  await fctx.close(); // flush clip B
  await sctx.close();
  await browser.close();

  // ---- collect raw webms ----
  const clipA = path.join(OUT, 'demo-maya.webm');
  const clipB = path.join(OUT, 'demo-farrier.webm');
  const mp = await mvideo.path(); fs.copyFileSync(mp, clipA); try { fs.unlinkSync(mp); } catch {}
  const fp = await fvideo.path(); fs.copyFileSync(fp, clipB); try { fs.unlinkSync(fp); } catch {}
  console.log('  clip A →', clipA);
  console.log('  clip B →', clipB);

  // ---- transcode each to mp4 (uniform 1440x900, 30fps, yuv420p) then concat ----
  const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
  const enc = ['-vf', 'scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:color=0x14110d,fps=30,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p'];
  const aMp4 = path.join(OUT, '_a.mp4'), bMp4 = path.join(OUT, '_b.mp4');
  ff(['-i', clipA, ...enc, aMp4]);
  // clip B is mostly static console waiting — keep only its finale (present picker → projected
  // before/after → end card), i.e. the last FINALE_S seconds
  const FINALE_S = 24;
  const bFull = path.join(OUT, '_bfull.mp4');
  ff(['-i', clipB, ...enc, bFull]);
  const bDur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', bFull]).toString());
  ff(['-ss', String(Math.max(0, bDur - FINALE_S)), '-i', bFull,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', bMp4]);
  try { fs.unlinkSync(bFull); } catch {}
  const listFile = path.join(OUT, '_concat.txt');
  fs.writeFileSync(listFile, `file '${aMp4}'\nfile '${bMp4}'\n`);
  const finalMp4 = path.join(OUT, 'demo.mp4');
  ff(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', finalMp4]);

  // ---- cleanup temp clips ----
  for (const f of [aMp4, bMp4, listFile]) { try { fs.unlinkSync(f); } catch {} }

  // ---- probe + report ----
  const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', finalMp4]).toString().trim();
  const size = fs.statSync(finalMp4).size;
  console.log('\n🎬 FINAL →', finalMp4);
  console.log('   duration:', (+dur).toFixed(1) + 's', '  size:', (size / 1048576).toFixed(2) + ' MB');
})().catch(e => { console.error('record failed:', e.stack || e.message); process.exit(1); });
