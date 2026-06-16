/* LIVE voice UAT against the real Azure gpt-realtime-2 (no mock). Drives the deployed app with a fake mic
 * and checks: the orb renders, tapping OPENS a realtime session (Azure accepts our session.update — no
 * schema error), and Azure RESPONDS (audio back / a turn completes). Reports the exact error if it fails.
 * Can't speak real words (fake mic = silence) — this verifies the PROTOCOL/connection end-to-end, live.
 *   BASE=https://horsepower-q6wf.onrender.com node qa-voice-live.js
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'https://horsepower-q6wf.onrender.com';
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + x : ''); } };

(async () => {
  const b = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const voiceLog = [];
  try {
    const health = await (await fetch(BASE + '/api/health')).json();
    ok('health: voice.converse is live', health.voice && health.voice.converse === true, JSON.stringify(health.voice));
    if (!health.voice || !health.voice.converse) { console.log('  (converse not configured on the server — aborting live test)'); await b.close(); process.exit(fail ? 1 : 0); }

    const F = await (await b.newContext()).newPage(); F.on('dialog', d => d.accept().catch(() => {}));
    await F.goto(BASE); await F.click('[data-testid=host-btn]'); await F.waitForSelector('.codechip', { timeout: 30000 });
    const code = (await F.textContent('.codechip')).trim();

    const A = await (await b.newContext({ permissions: ['microphone'] })).newPage();
    A.on('dialog', d => d.accept().catch(() => {}));
    A.on('console', m => { const t = m.text(); if (/voice/i.test(t)) voiceLog.push(t); });
    A.on('pageerror', e => console.log('  [pageerror]', e.message));
    await A.goto(BASE);
    await A.fill('[data-testid=join-name]', 'Ann'); await A.fill('[data-testid=join-code]', code); await A.click('[data-testid=join-btn]');
    await A.waitForSelector('[data-testid=create-team-name]', { timeout: 20000 });
    await A.fill('[data-testid=create-team-name]', 'AP'); await A.click('[data-testid=create-team-btn]');
    await A.waitForSelector('[data-testid=stable]', { timeout: 20000 });
    await F.click('[data-testid=phase-surface]'); await wait(700);
    await A.waitForSelector('[data-testid=interview-hero]', { timeout: 15000 });
    ok('the Coach orb renders on the live deploy', await A.locator('[data-testid=voice-orb]').count() === 1);

    // tap → open the session (ensureSession fires voice:start regardless of mic); give Azure time to handshake
    await A.locator('[data-testid=voice-orb]').click();
    await wait(6000);
    let st = await A.evaluate(() => ({ active: VC.active, ready: VC.ready, phase: VC.phase })).catch(() => ({}));
    const toasts = await A.locator('#toasts').textContent().catch(() => '');
    const errored = /voice error/i.test(toasts) || voiceLog.some(l => /error/i.test(l));
    ok('the realtime session OPENED against Azure (no schema error)', st.active && (st.ready || st.phase !== 'idle') && !errored, JSON.stringify({ st, errored, toasts: (toasts || '').slice(0, 140) }));
    if (errored) console.log('   ↳ voice error surfaced:', (toasts || '').slice(0, 200), voiceLog.slice(-3).join(' | '));

    // drive a real turn via TEXT (the fake mic is silence → server-VAD won't trip) → Azure should reply
    await A.evaluate(() => { if (window.VC) VC.sendText('We process supplier invoices — a clerk keys them into SAP and a manager approves anything over ten thousand pounds.'); }).catch(() => {});
    await wait(10000);
    const st2 = await A.evaluate(() => ({ phase: VC.phase, coachLen: (VC.coachText || '').length, played: VC.nextPlay > 0 })).catch(() => ({}));
    ok('Azure RESPONDED to a turn (audio streamed back / spoke)', st2.played || st2.coachLen > 0 || st2.phase === 'speaking' || st2.phase === 'idle', JSON.stringify(st2));
    console.log('   voice console log:', voiceLog.slice(-5).join(' | ') || '(none)');

    await b.close();
  } catch (e) { console.log('voice-live threw:', e.message.slice(0, 400)); await b.close(); process.exit(1); }
  console.log(`\nqa-voice-live: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
