/* Interview streaming — BROWSER client path. Spawns a server on 3271 with a mock streaming upstream and
 * drives a real member through an interview turn, asserting: the live streaming bubble appears + grows, the
 * streamed reply RECONCILES into one real chat message (no leftover streaming bubble, no dup), the streamed
 * ops build the map (graduating it), and no console errors. Gentle polling so it never starves the page's
 * stream reader. The mock returns a DISTINCT greeting vs the turn reply (keyed on the turn keyword).
 *   node qa-stream-ui.js
 */
const http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const fs = require('fs'); const os = require('os'); const path = require('path');
const PORT = 3271, BASE = `http://localhost:${PORT}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + JSON.stringify(x) : ''); } };

const TURN = { reply: 'Got it — so the invoice lands, the AP clerk keys it against the purchase order, and the moment something does not line up the whole thing stalls. Here is what I want to pin down: when an invoice does not match the PO, who exactly is on the hook to chase it down before it is paid, and what happens if nobody does?', ops: [
  { op: 'add', type: 'persona', text: 'AP Clerk' }, { op: 'add', type: 'trigger', text: 'Invoice arrives' },
  { op: 'add', type: 'phase', text: 'Match to PO' }, { op: 'add', type: 'intent', text: 'decide: pay or chase' },
  { op: 'add', type: 'outcome', text: 'Supplier paid on time' }
], done: false };   // 5 blocks → the map graduates so the canvas shows
const GREET = { reply: 'Walk me through how this workflow really runs today.', ops: [], done: false };
function startMock() {
  return new Promise(res => {
    const s = http.createServer((rq, rs) => { let b = ''; rq.on('data', d => b += d); rq.on('end', async () => {
      const payload = JSON.stringify(/invoice/i.test(b) ? TURN : GREET);   // the TURN message mentions "invoice"
      if (/"stream"\s*:\s*true/.test(b)) {
        rs.writeHead(200, { 'content-type': 'text/event-stream' });
        for (let i = 0; i < payload.length; i += 9) { rs.write('event: content_block_delta\ndata: ' + JSON.stringify({ type: 'content_block_delta', delta: { text: payload.slice(i, i + 9) } }) + '\n\n'); await wait(35); }
        rs.write('event: message_stop\ndata: {}\n\n'); rs.end();
      } else { rs.writeHead(200, { 'content-type': 'application/json' }); rs.end(JSON.stringify({ content: [{ type: 'text', text: payload }] })); }
    }); });
    s.listen(0, () => res(s));
  });
}

async function main() {
  const mock = await startMock();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-stui-'));
  const srv = spawn('node', ['server.js'], { env: Object.assign({}, process.env, {
    PORT: String(PORT), DATA_DIR: dir, ANTHROPIC_API_KEY: 'k', ANTHROPIC_BASE_URL: `http://localhost:${mock.address().port}/v1/messages`
  }), stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stderr.on('data', d => process.env.DEBUG && console.error(String(d)));
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {} await wait(100); }

  const b = await chromium.launch();
  const errs = [];
  try {
    const F = await (await b.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
    await F.goto(BASE); await F.click('[data-testid=host-btn]'); await F.waitForSelector('.codechip');
    const code = (await F.textContent('.codechip')).trim();
    const A = await (await b.newContext({ viewport: { width: 1280, height: 820 } })).newPage();
    A.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
    A.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 160)));
    await A.goto(BASE); await A.fill('[data-testid=join-name]', 'Ann'); await A.fill('[data-testid=join-code]', code);
    await A.click('[data-testid=join-btn]'); await A.waitForSelector('[data-testid=create-team-name]');
    await A.fill('[data-testid=create-team-name]', 'AP Squad'); await A.click('[data-testid=create-team-btn]'); await A.waitForSelector('[data-testid=stable]');
    await F.click('[data-testid=phase-surface]'); await wait(900);
    await A.waitForSelector('[data-testid=coach-input]', { timeout: 8000 }).catch(() => {});
    ok('typed interview composer is present', (await A.locator('[data-testid=coach-input]').count()) >= 1);

    await A.fill('[data-testid=coach-input]', 'An invoice arrives and the AP clerk keys it in against the PO.');
    await A.click('[data-testid=coach-send]');

    // GENTLE observation — one evaluate per ~280ms so we never starve the page's stream reader
    let sawBubble = false, sawPartial = false, reconciled = false;
    for (let i = 0; i < 40; i++) {
      const s = await A.evaluate(() => { const n = document.querySelector('.bubble.streaming .stxt'); const cv = document.querySelector('[data-testid=surface-canvas]');
        return { len: n ? n.textContent.length : -1, clerk: !!cv && /AP Clerk/.test(cv.textContent || '') }; });
      if (s.len >= 0) { sawBubble = true; if (s.len > 5 && s.len < TURN.reply.length - 5) sawPartial = true; }
      if (s.clerk) { reconciled = true; break; }
      await wait(150);
    }
    ok('streaming bubble appeared during the turn', sawBubble);
    ok('streamed prose was partial at some point (grew, not one blob)', sawPartial);
    await wait(700);
    const final = await A.evaluate(() => ({
      canvas: !!document.querySelector('[data-testid=surface-canvas]'),
      clerk: !!document.querySelector('[data-testid=surface-canvas]') && /AP Clerk/.test(document.querySelector('[data-testid=surface-canvas]').textContent || ''),
      streamingLeft: !!document.querySelector('.bubble.streaming'),
      replyCopies: Array.from(document.querySelectorAll('.bubble.coach')).filter(x => /on the hook to chase/.test(x.textContent)).length
    }));
    ok('streamed ops built the map → it graduated (canvas shows)', final.canvas && final.clerk, final);
    ok('reply reconciled to exactly ONE chat bubble (no dup)', final.replyCopies === 1, final.replyCopies);
    ok('no leftover streaming bubble after reconcile', !final.streamingLeft);
    ok('no console / page errors during the streamed turn', errs.length === 0, errs);
  } catch (e) { console.error('THREW', e); fail++; }
  await b.close(); srv.kill(); mock.close();
  console.log(`\nqa-stream-ui: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main();
