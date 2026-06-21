/* Interview STREAMING — self-spawns a server on PORT 3270 with a MOCK Anthropic upstream that emits an
 * SSE token stream, so the streaming reply path is testable with no real key. Covers: prose streams
 * incrementally (TTFB << total), the null-delimited control frame carries done, ops still apply + broadcast,
 * and a vocab-trip mid-stream falls back WITHOUT the banned word ever reaching the wire (rule #2).
 *   node qa-stream.js
 */
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const PORT = 3270, BASE = `http://localhost:${PORT}`, WSBASE = `ws://localhost:${PORT}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const CTRL = '\u0000\u0000CTRL\u0000\u0000';
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + JSON.stringify(x) : ''); } };
const J = o => JSON.stringify(o);

let nextReply = { reply: 'ok' };
// mock Anthropic: STREAMS SSE content_block_delta events when the request asks for stream:true; JSON otherwise.
function startMock() {
  return new Promise(res => {
    const s = http.createServer((rq, rs) => { let b = ''; rq.on('data', d => b += d); rq.on('end', async () => {
      const streaming = /"stream"\s*:\s*true/.test(b);
      const payload = typeof nextReply === 'string' ? nextReply : JSON.stringify(nextReply);
      if (streaming) {
        rs.writeHead(200, { 'content-type': 'text/event-stream' });
        for (let i = 0; i < payload.length; i += 14) {
          rs.write('event: content_block_delta\n');
          rs.write('data: ' + JSON.stringify({ type: 'content_block_delta', delta: { text: payload.slice(i, i + 14) } }) + '\n\n');
          await wait(8);
        }
        rs.write('event: message_stop\ndata: {}\n\n'); rs.end();
      } else {
        rs.writeHead(200, { 'content-type': 'application/json' });
        rs.end(JSON.stringify({ content: [{ type: 'text', text: payload }] }));
      }
    }); });
    s.listen(0, () => res(s));
  });
}
async function streamCoach(body) {
  const r = await fetch(BASE + '/api/coach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: J(body) });
  const ct = r.headers.get('content-type') || '';
  if (!r.body || ct.indexOf('application/json') >= 0) return { json: await r.json(), ct };
  const dec = new TextDecoder(); const t0 = Date.now(); const chunks = []; let full = '';
  for await (const c of r.body) { const s = dec.decode(c, { stream: true }); full += s; chunks.push({ t: Date.now() - t0, text: s }); }
  return { chunks, full, ct };
}

async function main() {
  const mock = await startMock();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-st-'));
  const srv = spawn('node', ['server.js'], { env: Object.assign({}, process.env, {
    PORT: String(PORT), DATA_DIR: dir, ANTHROPIC_API_KEY: 'k', ANTHROPIC_BASE_URL: `http://localhost:${mock.address().port}/v1/messages`
  }), stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stderr.on('data', d => process.env.DEBUG && console.error(String(d)));
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {} await wait(100); }

  try {
    const { code, hostKey } = await (await fetch(BASE + '/api/workshop', { method: 'POST' })).json();
    const fac = new WebSocket(WSBASE); await new Promise(r => fac.on('open', r));
    const A = new WebSocket(WSBASE); await new Promise(r => A.on('open', r));
    let stA = null, teamA = null;
    A.on('message', d => { const x = JSON.parse(d); if (x.type === 'state') stA = x.state; if (x.type === 'seated') teamA = x.teamId; });
    fac.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey }));
    A.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Ann' }));
    await wait(150);
    A.send(J({ type: 'team:create', workshopCode: code, name: 'AP', memberName: 'Ann' }));
    await wait(200);
    fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'surface' }));
    await wait(200);

    // ---- TEST 1: a normal streaming turn ----
    nextReply = { reply: 'Got it — who signs off when the invoice is wrong?', ops: [{ op: 'add', type: 'persona', text: 'Clerk' }], done: false };
    const r1 = await streamCoach({ mode: 'surface', interview: true, stream: true, code, teamId: teamA, messages: [{ role: 'user', content: 'An invoice arrives and the clerk keys it in.' }] });
    ok('streamed response is NOT json (text stream)', r1.ct.indexOf('application/json') < 0, r1.ct);
    const ci = r1.full.indexOf(CTRL); const prose = ci >= 0 ? r1.full.slice(0, ci) : r1.full;
    ok('prose streamed (reply text precedes the control frame)', prose.includes('who signs off'), prose.slice(0, 60));
    ok('control frame present + parses (degraded:false)', (() => { try { const d = JSON.parse(r1.full.slice(ci + CTRL.length)); return d && d.degraded === false; } catch { return false; } })());
    ok('prose arrived in MULTIPLE chunks (truly streamed, not one blob)', r1.chunks.length >= 3, r1.chunks.length);
    ok('TTFB << total (first chunk well before the last)', r1.chunks.length > 1 && r1.chunks[0].t < r1.chunks[r1.chunks.length - 1].t - 20, r1.chunks.map(c => c.t));
    await wait(250);
    const blocks = ((stA.teams.find(t => t.id === teamA) || {}).canvas || {}).blocks || [];
    ok('ops applied + broadcast (Clerk persona on the canvas)', blocks.some(b => b.type === 'persona' && /clerk/i.test(b.text)), blocks.map(b => b.type + ':' + b.text));

    // ---- TEST 2: vocab trip mid-stream → fallback, banned word NEVER on the wire ----
    nextReply = { reply: 'Now we SWAP your workflow to the other team to redesign it.', ops: [], done: false };
    const r2 = await streamCoach({ mode: 'surface', interview: true, stream: true, code, teamId: teamA, messages: [{ role: 'user', content: 'what next?' }] });
    const ci2 = r2.full.indexOf(CTRL); const prose2 = ci2 >= 0 ? r2.full.slice(0, ci2) : r2.full;
    ok('vocab-trip: banned word never reached the wire', !/swap|redesign/i.test(prose2), prose2.slice(0, 60));
    ok('vocab-trip: control frame says replace + degraded', (() => { try { const d = JSON.parse(r2.full.slice(ci2 + CTRL.length)); return d.replace === true && d.degraded === true; } catch { return false; } })());

    // ---- TEST 3: done rides the control frame ----
    nextReply = { reply: 'You have the shape of it.', ops: [], done: true };
    const r3 = await streamCoach({ mode: 'surface', interview: true, stream: true, code, teamId: teamA, messages: [{ role: 'user', content: 'done?' }] });
    const ci3 = r3.full.indexOf(CTRL);
    ok('done flag carried in the control frame', (() => { try { return typeof JSON.parse(r3.full.slice(ci3 + CTRL.length)).done === 'boolean'; } catch { return false; } })());

    fac.close(); A.close();
  } catch (e) { console.error('THREW', e); fail++; }
  srv.kill(); mock.close();
  console.log(`\nqa-stream: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main();
