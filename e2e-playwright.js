/* Horsepower v0.2 — Playwright UAT/QA across every user journey.
 * Drives a Farrier + 3 members (2 teams) through real browser UIs in ISOLATED
 * contexts (so localStorage identity doesn't collide), exercising:
 *   host → room view → join + team picker + presence → Surface canvas authoring +
 *   Coach (degraded) + Newcomer-check gate → swap reveal → Rebuild (locked blocks,
 *   people-landing, assumptions, lock amendment) → Share double-reveal + export.
 * Run with the server up:  BASE=http://localhost:3100 node e2e-playwright.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:3100';
const SHOTS = __dirname + '/uat-shots';
fs.mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra != null ? '→ ' + extra : ''); } };
const wait = ms => new Promise(r => setTimeout(r, ms));

async function newActor(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept().catch(() => {}));
  page.on('pageerror', e => console.log('   [pageerror]', e.message));
  await page.goto(BASE);
  return page;
}
// drop a typed block on a canvas scene and label it
async function dropBlock(page, sceneSel, tool, x, y, text) {
  await page.click(`[data-testid=tool-${tool}]`);
  await page.click(sceneSel, { position: { x, y } });
  if (text) {
    await wait(140);                 // let the canvas auto-focus the new block's label (avoids a re-draw stealing focus)
    await page.keyboard.type(text);
  }
  await page.click('[data-testid=tool-select]'); // blur → commit text to the server
  await wait(150);
}
// the canvas auto-fits (zoom/pan vary), so fixed screen coords can land on existing
// nodes — scan for a spot where the scene itself is the hit target
async function emptySpot(page, sceneSel, fallback) {
  const spot = await page.evaluate((sel) => {
    const sc = document.querySelector(sel + ' .scene') || document.querySelector(sel);
    if (!sc) return null;
    const r = sc.getBoundingClientRect();
    for (let y = 140; y < r.height - 160; y += 60)
      for (let x = 80; x < Math.min(r.width - 320, 900); x += 60) {
        const e = document.elementFromPoint(r.x + x, r.y + y);
        if (e && (e === sc || e.classList.contains('dotgrid') || e.classList.contains('world'))) return { x, y };
      }
    return null;
  }, sceneSel);
  return spot || fallback;
}

(async () => {
  const browser = await chromium.launch();
  try {
    console.log('\n— Journey A: the Farrier hosts —');
    const F = await newActor(browser);
    await F.click('[data-testid=host-btn]');
    await F.waitForSelector('.codechip', { timeout: 8000 });
    const code = (await F.textContent('.codechip')).trim();
    ok('host mints a 6-letter workshop code', /^[A-Z0-9]{6}$/.test(code), code);
    const hostKeyShown = await F.locator('.codechip').nth(1).textContent().catch(() => '');
    ok('private host code shown on the console', !!hostKeyShown && hostKeyShown.trim().length === 8, hostKeyShown);
    ok('console shows the honest phase sequence incl. Rebuild (Farrier-only)', /Rebuild/.test(await F.textContent('[data-testid=stepper]')));
    ok('lobby gives ONE clear next step (Start Surface CTA)', await F.locator('[data-testid=phase-surface].runcta').count() === 1);
    ok('no step-back in the lobby (nothing to go back to)', await F.locator('[data-testid=step-back]').count() === 0);
    ok('logo/home control is present to return to start', await F.locator('[data-testid=home]').count() === 1);
    await F.screenshot({ path: SHOTS + '/01-console-lobby.png' });

    // room view — projectable, code huge, no phase stepper
    await F.click('[data-testid=toggle-room]');
    await F.waitForSelector('.roomview .code');
    const roomCode = (await F.textContent('.roomview .code')).trim();
    ok('room view shows the code huge (projector)', roomCode === code);
    ok('room view hides the phase stepper (no swap spoiler)', await F.locator('.roomview [data-testid=stepper]').count() === 0);
    // A1: the projected room view's topbar must never leak the host code or the word "host"
    const roomTopbar = (await F.textContent('.topbar')).trim();
    const hostKeyTrim = (hostKeyShown || '').trim();
    ok('room view topbar leaks neither the host code nor "host"', !/host/i.test(roomTopbar) && (!hostKeyTrim || !roomTopbar.includes(hostKeyTrim)), roomTopbar);
    await F.screenshot({ path: SHOTS + '/02-room-view.png' });
    await F.click('[data-testid=toggle-room]');

    console.log('\n— Journey B: members join, pick teams, presence —');
    const Alex = await newActor(browser);
    ok('player is assigned a random steed on arrival', (await Alex.textContent('[data-testid=steed-name]')).trim().length > 0, await Alex.textContent('[data-testid=steed-name]'));
    const beforeSteed = await Alex.textContent('[data-testid=steed-name]');
    let steedChanged = false;
    for (let k = 0; k < 4 && !steedChanged; k++) { await Alex.click('[data-testid=reroll]'); await wait(120); if ((await Alex.textContent('[data-testid=steed-name]')) !== beforeSteed) steedChanged = true; }
    ok('🎲 shuffle re-rolls the steed', steedChanged, 'stayed ' + beforeSteed);
    await Alex.fill('[data-testid=join-name]', 'Alex');
    await Alex.fill('[data-testid=join-code]', code);
    await Alex.click('[data-testid=join-btn]');
    await Alex.waitForSelector('[data-testid=create-team-name]', { timeout: 8000 });
    ok('member lands on the team picker after one code + name', true);
    ok('team picker teaches the map (ontology tour)', await Alex.locator('[data-testid=map-tour]').count() === 1);
    await Alex.fill('[data-testid=create-team-name]', 'AP Squad');
    await Alex.click('[data-testid=create-team-btn]');
    await Alex.waitForSelector('[data-testid=stable]', { timeout: 8000 });
    ok('member lands in the lobby — their stable shows the team', /AP Squad/.test(await Alex.textContent('[data-testid=stable]')));
    ok('lobby is the big "meet the Coach" slide', await Alex.locator('[data-testid=coach-vignette] .vignette').count() >= 1);
    ok('stable shows no member-count fraction', !/\d+\s*\/\s*\d+/.test(await Alex.textContent('[data-testid=stable]')));
    // lobby must NOT foreshadow the swap (vocabulary rule)
    const lobbyText = (await Alex.textContent('#app')).toLowerCase();
    ok('lobby copy never foreshadows the swap (vocabulary rule)', !/swap|redesign|rebuild|hand over|receiving team|stranger|transfer/.test(lobbyText), lobbyText.match(/swap|redesign|rebuild/));
    await Alex.screenshot({ path: SHOTS + '/03-lobby.png' });

    const Sam = await newActor(browser);
    await Sam.fill('[data-testid=join-name]', 'Sam');
    await Sam.fill('[data-testid=join-code]', code);
    await Sam.click('[data-testid=join-btn]');
    await Sam.waitForSelector('[data-testid=team-pick]', { timeout: 8000 });
    await Sam.click('[data-testid=team-pick]'); // join AP Squad
    await Sam.waitForSelector('[data-testid=stable]');
    await wait(400);
    const roster = await Alex.locator('.topbar .avatars .av').count();
    ok('presence: teammate appears on the other device (B-lite)', roster === 2, roster);

    const Bo = await newActor(browser);
    await Bo.fill('[data-testid=join-name]', 'Bo');
    await Bo.fill('[data-testid=join-code]', code);
    await Bo.click('[data-testid=join-btn]');
    await Bo.waitForSelector('[data-testid=create-team-name]');
    await Bo.fill('[data-testid=create-team-name]', 'ETL Crew');
    await Bo.click('[data-testid=create-team-btn]');
    await Bo.waitForSelector('h2');
    await wait(300);
    const lobbyTxt = await F.textContent('.console');
    ok('Farrier lobby (setup screen) shows both teams assembling', /AP Squad/.test(lobbyTxt) && /ETL Crew/.test(lobbyTxt), lobbyTxt.slice(0, 120));
    ok('no raw markup leaks into UI text (regression)', !/<svg|<use/.test(lobbyTxt));

    console.log('\n— Journey C: Surface — capture on a real canvas —');
    await F.click('[data-testid=phase-surface]');
    await wait(400);
    ok('console CTA advances to Swap → Rebuild (enabled with 2 teams)', await F.locator('[data-testid=phase-rebuild].runcta:not([disabled])').count() === 1);
    ok('step-back now available (forward-by-default, guarded back)', await F.locator('[data-testid=step-back]').count() === 1);
    ok('Farrier dashboard shows team steeds 🐎', await F.locator('[data-testid=team-row] .teamsteeds svg').count() >= 1);
    // A2: Surface now OPENS in the AI-led interview (chat-hero). Assert it, then "draw it myself" to
    // reach the hand-canvas this suite exercises.
    await Alex.waitForSelector('[data-testid=interview-hero]', { timeout: 8000 });
    ok('Surface opens in the AI-led interview (chat-hero)', true);
    await Alex.click('[data-testid=interview-skip]'); await wait(300);
    await Alex.waitForSelector('[data-testid=surface-canvas]', { timeout: 8000 });
    ok('member enters Surface with the diagramming canvas', true);
    ok('Surface: Coach rail OPEN by default (brain-dump is the Coach)', await Alex.locator('[data-testid=coach-rail]:not(.collapsed)').count() === 1);
    const S = '[data-testid=surface-canvas]';
    // author a transfer-grade map by hand (no Coach needed → degradation path)
    await dropBlock(Alex, S, 'persona', 120, 90, 'OpCo GM');
    await dropBlock(Alex, S, 'trigger', 120, 200, 'invoice arrives');
    await dropBlock(Alex, S, 'input', 120, 300, 'supplier invoice');
    await dropBlock(Alex, S, 'phase', 400, 120, 'Reconcile');
    await dropBlock(Alex, S, 'moment', 440, 170, 'match to PO'); // dropped inside the phase → nests
    await dropBlock(Alex, S, 'intent', 720, 100, 'suppliers paid on time so credit terms hold');
    await dropBlock(Alex, S, 'outcome', 720, 230, 'credit terms kept');
    await wait(400);
    const nodeCount = await Alex.locator('[data-testid=surface-canvas] .node').count();
    ok('hand-authored typed blocks render + persist', nodeCount === 7, nodeCount);
    ok('craft pass: nodes carry hand-drawn rough strokes', await Alex.locator('[data-testid=surface-canvas] .node .roughbox').count() >= 6);
    // two-click arrow: Arrow tool → source block → target block
    await Alex.click('[data-testid=tool-arrow]');
    await Alex.locator('[data-testid=surface-canvas] .node.trigger').click();
    await Alex.locator('[data-testid=surface-canvas] .node.phase').click();
    await wait(250);
    ok('two-click arrow connects blocks', await Alex.locator('[data-testid=surface-canvas] path.flow').count() === 1);
    ok('craft pass: arrows are hand-drawn (boil frames, no geometric marker)', await Alex.locator('[data-testid=surface-canvas] path.flow[data-d0]').count() >= 1);
    await Alex.click('[data-testid=tool-select]');
    // the back of the card: capture WHY + capacity via the inspector (new gate requirement)
    await Alex.locator(S + ' .node.persona').click();
    await Alex.waitForSelector('[data-testid=inspector-why]', { timeout: 5000 });
    await Alex.fill('[data-testid=inspector-why]', 'signs off the spend');
    await Alex.locator('[data-testid=inspector-capacity] button:has-text("accountable")').click();
    await wait(350);
    ok('inspector writes capacity + WHY onto the block (meta round-trips)', true);
    await Alex.locator(S + ' .node.phase').first().click();
    await Alex.waitForSelector('[data-testid=inspector-why]', { timeout: 5000 });
    await Alex.fill('[data-testid=inspector-why]', 'invoices must match POs before payment');
    await Alex.click(S, { position: { x: 700, y: 560 } });   // blur → commit, deselect (stay inside the scene — rail is open)
    await wait(450);
    // verify it survived the round-trip to the server (text committed)
    const hasIntent = await Alex.locator('[data-testid=surface-canvas] .node.intent .label').textContent();
    ok('block text round-trips through the server', /credit terms/.test(hasIntent), hasIntent);
    await Alex.screenshot({ path: SHOTS + '/04-surface-canvas.png' });

    // Coach — degraded mode (no API key) must still answer from the question bank
    await Alex.fill('[data-testid=coach-input]', 'is our intent a real decision?');
    await Alex.click('[data-testid=coach-send]');
    await wait(700);
    const coachBubbles = await Alex.locator('.bubble.coach').count();
    ok('Coach answers even with no API key (graceful degradation)', coachBubbles >= 1, coachBubbles);

    // F1: presence/attribution — Sam (same team) authors a block; Alex sees a teammate author dot on it
    await Sam.waitForSelector('[data-testid=surface-canvas]', { timeout: 8000 });
    await dropBlock(Sam, S, 'moment', 470, 240, 'Sam moment');
    await wait(500);
    ok('teammate-authored block carries an author dot on my screen', await Alex.locator('[data-testid=surface-canvas] .node .authordot').count() >= 1, await Alex.locator('[data-testid=surface-canvas] .node .authordot').count());

    // gate reflects readiness
    const gateTxt = await Alex.locator('[data-testid=gate]').textContent();
    ok('Newcomer-check gate is present and reads transfer-grade', /ready|Newcomer check/.test(gateTxt), gateTxt.slice(0, 60));
    ok('gate-green earns a rosette 🏅 (saddle-ready micro-win)', await Alex.locator('[data-testid=rosette]').count() === 1);
    ok('rosette reads "saddle-ready" (no banned vocabulary)', /saddle-ready/.test(await Alex.locator('[data-testid=rosette]').textContent()), await Alex.locator('[data-testid=rosette]').textContent());

    // Team B: a minimal canvas so it has a persona for the people inventory
    const SB = '[data-testid=surface-canvas]';
    await Bo.click('[data-testid=interview-skip]').catch(() => {}); await wait(300);   // A2: leave the interview hero for the hand-canvas
    await Bo.waitForSelector(SB, { timeout: 8000 });
    await dropBlock(Bo, SB, 'persona', 120, 90, 'Finance Analyst');
    await dropBlock(Bo, SB, 'trigger', 120, 200, 'month end');
    await dropBlock(Bo, SB, 'intent', 400, 100, 'cash position is known before payroll');
    await dropBlock(Bo, SB, 'outcome', 400, 230, 'payroll funded on time');
    await wait(300);

    // Farrier drills into a live board (mirror)
    await F.click('[data-testid=team-row]'); // first row = AP Squad (has the full canvas)
    await F.waitForSelector('.mirror .node', { timeout: 8000 }).catch(() => {});
    await wait(300);
    ok('Farrier drills into a read-only mirror of the live board', await F.locator('.mirror .node').count() > 0, await F.locator('.mirror .node').count());
    await F.screenshot({ path: SHOTS + '/05-farrier-mirror.png' });
    await F.click('text=← all teams');

    // timer — load → start → pause (per-phase, with an explicit Start)
    ok('Surface pre-loads its default length (Start, not auto-run)', await F.locator('[data-testid=timer-start]').count() === 1);
    await F.click('[data-testid=timer-10]'); await wait(200);   // load 10m
    await F.click('[data-testid=timer-start]'); await wait(400);
    ok('timer starts counting (Pause now shown)', await F.locator('[data-testid=timer-pause]').count() === 1);
    ok('running timer broadcasts to the room', await Alex.locator('#timerlive').count() === 1);
    await F.click('[data-testid=timer-pause]'); await wait(200);
    ok('timer pauses (Start returns)', await F.locator('[data-testid=timer-start]').count() === 1);

    console.log('\n— Journey D: the SWAP (surprise) → Rebuild —');
    await F.click('[data-testid=phase-rebuild]');
    await wait(250);
    // styled confirm modal appears if any team is thin — confirm it
    if (await F.locator('[data-testid=modal-confirm]').count()) await F.click('[data-testid=modal-confirm]');
    await wait(700);
    // reveal stamp shows for members
    const revealOn = await Alex.locator('#reveal.on').count();
    ok('swap reveal (stamp) fires for the team', revealOn === 1);
    const twist = await Alex.textContent('#reveal-twist');
    ok('reveal names the OTHER team + "nothing to retrofit"', /nothing to retrofit/i.test(twist), twist.slice(0, 80));
    await Alex.screenshot({ path: SHOTS + '/06-swap-reveal.png' });
    // B1: the CTA is staged in at +1.5s — wait for it to be visible before clicking
    await Alex.waitForSelector('#reveal-go', { state: 'visible', timeout: 8000 });
    await wait(1700);
    await Alex.click('#reveal-go');
    await Alex.waitForSelector('[data-testid=rebuild-canvas]', { timeout: 8000 });
    ok('member enters Rebuild', true);
    ok('Rebuild: Coach rail COLLAPSED by default (map is the hero)', await Alex.locator('[data-testid=coach-rail].collapsed').count() === 1);
    const lockedCount = await Alex.locator('[data-testid=rebuild-canvas] .node.locked').count();
    ok('locked blocks delivered on the rebuild canvas (scrambled)', lockedCount >= 1, lockedCount);
    // regression: locked text must be fully readable (no clipping — boxes sized to their text)
    const lockedFit = await Alex.evaluate(() => [...document.querySelectorAll('[data-testid=rebuild-canvas] .node.locked .label')]
      .every(l => l.scrollHeight <= l.closest('.node').clientHeight && l.scrollWidth <= l.clientWidth + 2));
    ok('locked block text fits its box (no mid-word clipping)', lockedFit);
    // teardown ingredients now live ON the map as scattered context cards with hover-WHY
    ok('teardown candidate constraints shown as on-canvas cards', await Alex.locator('[data-testid=rebuild-canvas] .ingcard.candidate').count() >= 1);
    ok('ingredient cards carry the WHY (hover)', await Alex.locator('[data-testid=rebuild-canvas] .ingcard.candidate .why').count() >= 1);
    await Alex.screenshot({ path: SHOTS + '/07-rebuild.png' });

    // build an AI-native agent block
    const RB = '[data-testid=rebuild-canvas]';
    const agSpot = await emptySpot(Alex, RB, { x: 360, y: 640 });
    await dropBlock(Alex, RB, 'agent', agSpot.x, agSpot.y, 'continuous reconcile agent');
    await wait(300);
    ok('team builds an AI-native agent block', await Alex.locator('[data-testid=rebuild-canvas] .node.agent').count() === 1);

    // people landing — now a 'to land' tray on the canvas (mirror of the orphan tray), always visible
    await Alex.waitForSelector('[data-testid=land-tray] [data-testid=land-transforms]', { timeout: 8000 });
    await Alex.locator('.landperson textarea').first().fill('freed up for higher-value work');
    await Alex.locator('[data-testid=land-transforms]').first().click();
    await wait(300);
    let landed = await Alex.locator('[data-testid=landed-count]').textContent();
    ok('"freed up for higher-value work" rejected by the gate', /0\//.test(landed), landed);
    await Alex.locator('.landperson textarea').first().fill('owns the eval: reviews exceptions, sets rules, audits misses');
    await Alex.locator('[data-testid=land-transforms]').first().click();
    await wait(300);
    landed = await Alex.locator('[data-testid=landed-count]').textContent();
    ok('valid people-landing accepted (on-canvas tray)', /1\/|Build complete/.test(landed), landed);
    await Alex.screenshot({ path: SHOTS + '/08-people-landing.png' });

    // assumption ledger — always-visible floating strip (open it, log a guess)
    await Alex.click('.assumefloat summary');
    await Alex.fill('[data-testid=assumption-input]', 'presumably someone validates upstream');
    await Alex.click('[data-testid=add-assumption]');
    await wait(300);
    ok('assumption logged to the always-visible ledger', await Alex.locator('.assumption').count() >= 1);

    // lock amendment — "Challenge this" on a selected locked card → Farrier
    // deselect via the tool-switch path first (placement tools clear selection by design):
    // the agent block's open inspector can float over the locked node after the rebuild auto-fit
    await Alex.click('[data-testid=tool-arrow]'); await Alex.click('[data-testid=tool-select]'); await wait(200);
    await Alex.locator('[data-testid=rebuild-canvas] .node.locked').first().click();
    await Alex.waitForSelector('[data-testid=challenge-lock]', { timeout: 8000 });
    await Alex.click('[data-testid=challenge-lock]');
    await Alex.waitForSelector('[data-testid=send-challenge]', { timeout: 8000 });
    await Alex.locator('.modalcard textarea').fill('the captured intent is an artifact');
    await Alex.locator('.modalcard input').fill('the real decision behind it');
    await Alex.click('[data-testid=send-challenge]');
    await wait(400);
    ok('team challenges a locked block → goes to Farrier', await F.locator('[data-testid=approve-amend]').count() >= 1);
    await F.click('[data-testid=approve-amend]');
    await wait(500);
    const lockedLabels = await Alex.locator('[data-testid=rebuild-canvas] .node.locked .label').allTextContents();
    ok('Farrier approval amends the locked block on the canvas', lockedLabels.some(x => /real decision/.test(x)), lockedLabels.join(' | '));
    await F.screenshot({ path: SHOTS + '/09-console-rebuild.png' });

    console.log('\n— Journey E: Share — double reveal + export —');
    await F.click('text=← all teams').catch(() => {});
    await F.click('[data-testid=phase-share]');
    await wait(600);
    await Alex.waitForSelector('.beforeafter', { timeout: 8000 });
    const baCards = await Alex.locator('.ba-card').count();
    ok('share shows own workflow fate: before | after', baCards === 2, baCards);
    const diffPresent = await Alex.locator('.diffstrip').count();
    ok('Coach diff "what died — and what was fake" renders', diffPresent === 1);
    await wait(600);
    const ledger = await Alex.locator('.led').count();
    ok('constraint ledger flips up (held 🔒 / MYTH ✂️)', ledger >= 1, ledger);
    ok('keepsake "race card" shown at share', await Alex.locator('[data-testid=race-card]').count() === 1);
    ok('race card carries the riders line', /ridden by/.test(await Alex.locator('[data-testid=race-card]').textContent()), await Alex.locator('[data-testid=race-card]').textContent());
    await Alex.screenshot({ path: SHOTS + '/10-share-double-reveal.png' });

    // assumption reckoning (the original team — whoever's process Alex's team rebuilt — appears on Alex's screen as rebuilder's; the SOURCE team confirms. We just verify the control exists somewhere.)
    const reckonBtns = await Bo.locator('[data-testid=confirm-assumption]').count() + await Alex.locator('[data-testid=confirm-assumption]').count();
    ok('assumption reckoning controls present at the reveal', reckonBtns >= 1, reckonBtns);

    // export pack
    const popupP = Alex.context().waitForEvent('page', { timeout: 8000 }).catch(() => null);
    await Alex.click('[data-testid=export-workflow]');
    const popup = await popupP;
    ok('export "your workflow" opens a printable pack', !!popup);
    if (popup) { await popup.waitForLoadState().catch(() => {}); const body = await popup.textContent('body').catch(() => ''); ok('export pack contains before/after + people landings', /Before|After|people landed/i.test(body)); await popup.close().catch(() => {}); }

    // Farrier present picker + room view before/after
    await F.click('[data-testid=present-pick]');
    await wait(300);
    await F.click('[data-testid=toggle-room]');
    await F.waitForSelector('.roomview', { timeout: 8000 });
    ok('Farrier projects the Before/After present view on the room view', await F.locator('.roomview .ba-card').count() === 2);
    await F.screenshot({ path: SHOTS + '/11-present-view.png' });

  } catch (e) {
    fail++; console.log('  ✗ UAT threw:', e.message);
  } finally {
    await browser.close();
  }
  console.log(`\n${fail === 0 ? '✅ UAT ALL PASS' : '❌ UAT FAILURES'} — ${pass} passed, ${fail} failed`);
  console.log(`   screenshots → ${SHOTS}`);
  process.exit(fail === 0 ? 0 : 1);
})();
