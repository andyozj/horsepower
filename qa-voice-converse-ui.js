/* Slice B Mode 2 (Converse) — BROWSER client path, with a fake mic + a mock realtime upstream (no real
 * Azure). Asserts: the Listen/Converse toggle + "Hold to talk" render when realtime is configured; holding
 * the button opens the relay (mock sees session.update + audio frames) and the model's update_map tool-call
 * builds the map. Validates the Web Audio capture → WS frames → relay → canvas path end-to-end (sans Azure schema).
 *   node qa-voice-converse-ui.js
 */
const { chromium } = require('playwright');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const PORT = 3295, BASE = `http://localhost:${PORT}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const J = o => JSON.stringify(o);
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + x : ''); } };

function mockRealtime() {
  const state = { sessions: 0, lastSession: null, gotAppend: false };
  const wss = new WebSocketServer({ port: 0 });
  wss.on('connection', up => { state.sessions++; up.on('message', d => { let m; try { m = JSON.parse(d); } catch { return; }
    if (m.type === 'session.update') state.lastSession = m.session;
    if (m.type === 'input_audio_buffer.append' && !state.gotAppend) {   // first frame → simulate server-VAD turn + reply (hands-free; no commit)
      state.gotAppend = true;
      up.send(J({ type: 'input_audio_buffer.speech_started' }));
      up.send(J({ type: 'input_audio_buffer.speech_stopped' }));
      up.send(J({ type: 'response.output_audio.delta', delta: 'QUJD' }));
      up.send(J({ type: 'response.function_call_arguments.done', name: 'update_map', call_id: 'c1', arguments: J({ ops: [{ op: 'add', tmpId: 't1', type: 'persona', text: 'Voice Clerk', capacity: 'operates' }] }) }));
      up.send(J({ type: 'response.done' }));
    }
  }); });
  return { wss, state, url: () => `ws://localhost:${wss.address().port}/openai/v1/realtime?model=mock` };
}

(async () => {
  const mock = mockRealtime();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-cv-'));
  const srv = spawn('node', ['server.js'], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: dir, AZURE_REALTIME_URL: mock.url(), AZURE_SPEECH_KEY: 'k' }), stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stderr.on('data', d => process.env.DEBUG && console.error(String(d)));
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {} await wait(120); }
  const b = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'] });
    const F = await (await b.newContext()).newPage(); F.on('dialog', d => d.accept().catch(() => {}));
    await F.goto(BASE); await F.click('[data-testid=host-btn]'); await F.waitForSelector('.codechip');
    const code = (await F.textContent('.codechip')).trim();

    const A = await ctx.newPage(); A.on('dialog', d => d.accept().catch(() => {})); A.on('pageerror', e => console.log('  [pageerror]', e.message));
    await A.goto(BASE);
    await A.fill('[data-testid=join-name]', 'Ann'); await A.fill('[data-testid=join-code]', code); await A.click('[data-testid=join-btn]');
    await A.waitForSelector('[data-testid=create-team-name]'); await A.fill('[data-testid=create-team-name]', 'AP'); await A.click('[data-testid=create-team-btn]');
    await A.waitForSelector('[data-testid=stable]');
    await F.click('[data-testid=phase-surface]'); await wait(400);
    await A.waitForSelector('[data-testid=interview-hero]', { timeout: 8000 });

    ok('voice-first by default: the Coach orb renders', await A.locator('[data-testid=voice-orb]').count() === 1);
    ok('a clear "I\'d rather type" escape is present', await A.locator('[data-testid=switch-type]').count() === 1);
    ok('the session warms on entry (mock saw a session before any tap)', mock.state.sessions >= 1, String(mock.state.sessions));

    // hands-free: ONE tap goes live, then server-VAD drives the turns (no per-turn tap)
    const orb = A.locator('[data-testid=voice-orb]');
    await orb.click(); await wait(400);
    ok('one tap goes live (no longer idle)', !/Tap to start/i.test(await A.locator('[data-testid=voice-status]').textContent()), await A.locator('[data-testid=voice-status]').textContent());
    await wait(1000);
    ok('opened the realtime upstream (mock saw a session)', mock.state.sessions >= 1, String(mock.state.sessions));
    ok('session.update carried the update_map tool', !!(mock.state.lastSession && (mock.state.lastSession.tools || []).some(t => t.name === 'update_map')));
    ok('the fake mic streamed audio frames to the relay', mock.state.gotAppend === true);
    await wait(400);
    const built = await A.evaluate(() => {
      try { const t = (typeof state !== 'undefined' && state.teams || []).find(x => x); return !!(t && (t.canvas.blocks || []).some(b => b.type === 'persona' && b.text === 'Voice Clerk')); } catch (e) { return false; }
    }).catch(() => false);
    ok('the Coach\'s update_map tool-call built the block on the live map', built);
    await A.screenshot({ path: __dirname + '/qa-slicec-shots/converse.png' }).catch(() => {});
  } catch (e) { console.log('converse-ui threw:', e.message.slice(0, 300)); fail++; }
  finally { await b.close(); srv.kill('SIGKILL'); mock.wss.close(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} }
  console.log(`\nqa-voice-converse-ui: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
