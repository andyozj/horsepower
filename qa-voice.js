/* Slice B Mode 1 (Listen) — server STT/TTS proxy. Phase A: NO Azure config → everything degrades
 * (voice caps false, /api/stt degraded, /api/tts 204). Phase B: a MOCK Azure speech upstream → caps
 * true, /api/stt returns the transcript, /api/tts returns audio. Self-spawns; no real key needed.
 *   node qa-voice.js
 */
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const PORT = 3280, BASE = `http://localhost:${PORT}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + JSON.stringify(x) : ''); } };

function startMock() {
  return new Promise(res => {
    const s = http.createServer((rq, rs) => {
      if (/audio\/transcriptions/.test(rq.url)) { rs.writeHead(200, { 'content-type': 'application/json' }); rs.end(JSON.stringify({ text: 'mock transcript of the workflow' })); return; }
      if (/audio\/speech/.test(rq.url)) { rs.writeHead(200, { 'content-type': 'audio/mpeg' }); rs.end(Buffer.from([0xff, 0xfb, 0x10, 0x00, 1, 2, 3, 4])); return; }
      rs.writeHead(404); rs.end('{}');
    });
    s.listen(0, () => res(s));
  });
}
async function spawnServer(env) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-voice-'));
  const srv = spawn('node', ['server.js'], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: dir }, env), stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stderr.on('data', d => process.env.DEBUG && console.error(String(d)));
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/api/health')).ok) return { srv, dir }; } catch {} await wait(120); }
  throw new Error('server did not start');
}
async function kill(h) { h.srv.kill('SIGKILL'); await wait(400); try { fs.rmSync(h.dir, { recursive: true, force: true }); } catch {} }

async function main() {
  const mock = await startMock();
  const mockBase = `http://localhost:${mock.address().port}`;

  // ---- Phase A: NO Azure speech config → degrade everywhere ----
  let h = await spawnServer({});
  try {
    let health = await (await fetch(BASE + '/api/health')).json();
    ok('A: health voice caps all false with no Azure config', health.voice && !health.voice.listen && !health.voice.speak && !health.voice.converse, health.voice);
    const stt = await (await fetch(BASE + '/api/stt', { method: 'POST', headers: { 'content-type': 'audio/webm' }, body: Buffer.from([1, 2, 3, 4, 5]) })).json();
    ok('A: /api/stt degrades (no 500) with no config', stt.degraded === true && stt.text === '', stt);
    const tts = await fetch(BASE + '/api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'hi' }) });
    ok('A: /api/tts returns 204 with no config', tts.status === 204);
  } finally { await kill(h); }

  // ---- Phase B: mock Azure speech upstream → caps true + real round-trips ----
  h = await spawnServer({
    AZURE_SPEECH_ENDPOINT: mockBase, AZURE_SPEECH_KEY: 'k',
    AZURE_STT_DEPLOYMENT: 'gpt-4o-mini-transcribe', AZURE_TTS_DEPLOYMENT: 'gpt-4o-mini-tts'
  });
  try {
    let health = await (await fetch(BASE + '/api/health')).json();
    ok('B: health voice.listen + voice.speak true when configured', health.voice.listen === true && health.voice.speak === true, health.voice);
    // /api/stt needs a live room (gate). Mint one.
    const mint = await (await fetch(BASE + '/api/workshop', { method: 'POST' })).json();
    const stt = await (await fetch(BASE + '/api/stt?code=' + mint.code, { method: 'POST', headers: { 'content-type': 'audio/webm' }, body: Buffer.from(new Uint8Array(2000)) })).json();
    ok('B: /api/stt returns the transcript from Azure (server-proxied)', stt.text === 'mock transcript of the workflow', stt);
    const noRoom = await (await fetch(BASE + '/api/stt?code=ZZZZZZ', { method: 'POST', headers: { 'content-type': 'audio/webm' }, body: Buffer.from(new Uint8Array(2000)) })).json();
    ok('B: /api/stt degrades for an unknown room (gated)', noRoom.degraded === true, noRoom);
    const tts = await fetch(BASE + '/api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'good question', code: mint.code }) });
    ok('B: /api/tts returns audio when configured', tts.status === 200 && /audio\/mpeg/.test(tts.headers.get('content-type') || ''), tts.status);
  } finally { await kill(h); }

  mock.close();
  console.log(`\nqa-voice: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.log('qa-voice threw:', e.message.slice(0, 300)); process.exit(1); });
