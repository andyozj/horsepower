/* Slice B Mode 2 (Converse) — realtime relay wiring test. A MOCK realtime WS upstream stands in for
 * Azure; we assert our server: opens the upstream on voice:start + sends session.update WITH the
 * update_map tool, forwards audio frames (voice:audio → input_audio_buffer.append), and on the model's
 * update_map tool-call APPLIES it to the canonical canvas + relays audio-out. Plus the no-config degrade.
 *   node qa-voice-rt.js
 */
const { WebSocketServer, WebSocket } = require('ws');
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const PORT = 3290, BASE = `http://localhost:${PORT}`, WSBASE = `ws://localhost:${PORT}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const J = o => JSON.stringify(o);
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + JSON.stringify(x) : ''); } };

// Mock Azure realtime upstream: records the session.update; on input_audio_buffer.commit it emits a
// canned update_map tool-call (add a persona) + an audio delta + response.done.
function startMockRealtime() {
  const state = { sessions: 0, lastSession: null, gotAppend: false, op: null };   // state.op overrides the canned tool-call op
  const wss = new WebSocketServer({ port: 0 });
  wss.on('connection', up => {
    state.sessions++;
    up.on('message', d => {
      let m; try { m = JSON.parse(d); } catch { return; }
      if (m.type === 'session.update') state.lastSession = m.session;
      if (m.type === 'input_audio_buffer.append') state.gotAppend = true;
      if (m.type === 'input_audio_buffer.commit') {
        up.send(J({ type: 'response.output_audio.delta', delta: 'QUJD' }));   // base64 'ABC'
        const ops = [state.op || { op: 'add', tmpId: 't1', type: 'persona', text: 'AP Clerk', capacity: 'operates' }];
        up.send(J({ type: 'response.function_call_arguments.done', name: 'update_map', call_id: 'c1', arguments: J({ ops }) }));
        up.send(J({ type: 'response.done' }));
      }
    });
  });
  return { wss, state, url: () => `ws://localhost:${wss.address().port}/openai/v1/realtime?model=mock` };
}
async function spawnServer(env) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-rt-'));
  const srv = spawn('node', ['server.js'], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: dir }, env), stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stderr.on('data', d => process.env.DEBUG && console.error(String(d)));
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/api/health')).ok) return { srv, dir }; } catch {} await wait(120); }
  throw new Error('server did not start');
}
async function kill(h) { h.srv.kill('SIGKILL'); await wait(300); try { fs.rmSync(h.dir, { recursive: true, force: true }); } catch {} }
async function seat() {
  const { code } = await (await fetch(BASE + '/api/workshop', { method: 'POST' })).json();
  const m = new WebSocket(WSBASE); await new Promise(r => m.on('open', r));
  let st = null, teamId = null; const evs = [];
  m.on('message', d => { const x = JSON.parse(d); if (x.type === 'state') st = x.state; if (x.type === 'seated') teamId = x.teamId; if (String(x.type || '').startsWith('voice:')) evs.push(x); });
  m.send(J({ type: 'join', role: 'member', workshopCode: code, name: 'Ann' })); await wait(120);
  m.send(J({ type: 'team:create', workshopCode: code, name: 'AP', memberName: 'Ann' })); await wait(250);
  return { code, m, evs, team: () => (st.teams || []).find(t => t.id === teamId) };
}

async function main() {
  const mock = startMockRealtime();

  // ---- Phase A: no realtime config → degrade ----
  let h = await spawnServer({});
  try {
    const health = await (await fetch(BASE + '/api/health')).json();
    ok('A: voice.converse false with no realtime config', health.voice.converse === false, health.voice);
    const r = await seat();
    r.m.send(J({ type: 'voice:start', workshopCode: r.code }));
    await wait(400);
    ok('A: voice:start → "unavailable" event when not configured', r.evs.some(e => e.event === 'unavailable'), r.evs);
    r.m.close();
  } finally { await kill(h); }

  // ---- Phase B: mock realtime upstream wired ----
  h = await spawnServer({ AZURE_REALTIME_URL: mock.url(), AZURE_SPEECH_KEY: 'k' });
  try {
    const health = await (await fetch(BASE + '/api/health')).json();
    ok('B: voice.converse true when AZURE_REALTIME_URL set', health.voice.converse === true, health.voice);
    const r = await seat();
    r.m.send(J({ type: 'voice:start', workshopCode: r.code }));
    await wait(600);
    ok('B: server opened the realtime upstream', mock.state.sessions >= 1, mock.state.sessions);
    ok('B: session.update carried the update_map tool + instructions', !!(mock.state.lastSession && (mock.state.lastSession.tools || []).some(t => t.name === 'update_map') && mock.state.lastSession.instructions), mock.state.lastSession && (mock.state.lastSession.tools || []).map(t => t.name));
    ok('B: member got the "ready" event', r.evs.some(e => e.event === 'ready'), r.evs);
    r.m.send(J({ type: 'voice:audio', workshopCode: r.code, audio: 'QUJD' }));
    await wait(200);
    ok('B: audio frame forwarded to the upstream (input_audio_buffer.append)', mock.state.gotAppend === true);
    r.m.send(J({ type: 'voice:commit', workshopCode: r.code }));
    await wait(500);
    ok('B: audio-out relayed back to the member', r.evs.some(e => e.type === 'voice:audio-out' && e.audio === 'QUJD'), r.evs.filter(e => e.type === 'voice:audio-out'));
    ok('B: update_map tool-call APPLIED to the canonical canvas (server-side)', (r.team().canvas.blocks || []).some(b => b.type === 'persona' && b.text === 'AP Clerk' && (b.meta || {}).capacity === 'operates'), (r.team().canvas.blocks || []).map(b => b.type + ':' + b.text));
    ok('B: turn-done event relayed', r.evs.some(e => e.event === 'turn-done'), r.evs);
    r.m.close();
  } finally { await kill(h); }

  // ---- Phase C: REBUILD → the spoken redesign-challenger writes to the REDESIGN canvas ----
  h = await spawnServer({ AZURE_REALTIME_URL: mock.url(), AZURE_SPEECH_KEY: 'k' });
  try {
    const mk = await (await fetch(BASE + '/api/workshop', { method: 'POST' })).json();
    const code = mk.code, hostKey = mk.hostKey;
    const fac = new WebSocket(WSBASE); await new Promise(r => fac.on('open', r));
    fac.on('message', () => {});
    fac.send(J({ type: 'join', role: 'farrier', workshopCode: code, hostKey }));
    const seed = name => ({ blocks: [
      { id: 'p' + name, type: 'persona', x: 80, y: 80, w: 160, h: 50, text: name + ' Clerk', meta: { capacity: 'operates' } },
      { id: 'tr' + name, type: 'trigger', x: 80, y: 150, w: 160, h: 50, text: 'Invoice in', meta: {} },
      { id: 'ph' + name, type: 'phase', x: 300, y: 80, w: 160, h: 50, text: 'Key it', meta: {} },
      { id: 'in' + name, type: 'intent', x: 520, y: 80, w: 160, h: 50, text: 'Pay or query', meta: {} },
      { id: 'ou' + name, type: 'outcome', x: 520, y: 150, w: 160, h: 50, text: 'Paid', meta: {} } ], arrows: [], orphans: [], chat: [] });
    const mkMember = async (name, team) => {
      const m = new WebSocket(WSBASE); await new Promise(r => m.on('open', r));
      let st = null, teamId = null; const evs = [];
      m.on('message', d => { const x = JSON.parse(d); if (x.type === 'state') st = x.state; if (x.type === 'seated') teamId = x.teamId; if (String(x.type || '').startsWith('voice:')) evs.push(x); });
      m.send(J({ type: 'join', role: 'member', workshopCode: code, name })); await wait(120);
      m.send(J({ type: 'team:create', workshopCode: code, name: team, memberName: name })); await wait(250);
      return { m, evs, team: () => (st.teams || []).find(t => t.id === teamId) };
    };
    const A = await mkMember('Ann', 'AP'); const B = await mkMember('Bo', 'ETL');
    fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'surface' })); await wait(200);
    A.m.send(J({ type: 'canvas:update', workshopCode: code, canvas: seed('A') })); await wait(120);
    B.m.send(J({ type: 'canvas:update', workshopCode: code, canvas: seed('B') })); await wait(200);
    fac.send(J({ type: 'phase:set', workshopCode: code, phase: 'rebuild' })); await wait(500);
    ok('C: room reached rebuild with a redesign canvas', !!(A.team() && A.team().redesign), A.team() && Object.keys(A.team().redesign || {}));
    mock.state.op = null;
    A.m.send(J({ type: 'voice:start', workshopCode: code })); await wait(500);
    const t0 = (mock.state.lastSession && (mock.state.lastSession.tools || [])[0]) || {};
    const enums = (((((t0.parameters || {}).properties || {}).ops || {}).items || {}).properties || {}).type;
    ok('C: rebuild session offers the agent-capable map tool', !!(enums && Array.isArray(enums.enum) && enums.enum.includes('agent')), enums && enums.enum);
    ok('C: rebuild instructions carry the redesign-challenger brief', /sparring|redesign|retrofit/i.test(mock.state.lastSession.instructions || ''), (mock.state.lastSession.instructions || '').slice(0, 50));
    mock.state.op = { op: 'add', tmpId: 'a1', type: 'agent', text: 'Invoice-matching agent' };
    A.m.send(J({ type: 'voice:audio', workshopCode: code, audio: 'QUJD' })); await wait(120);
    A.m.send(J({ type: 'voice:commit', workshopCode: code })); await wait(500);
    const rc = (A.team().redesign && A.team().redesign.canvas.blocks) || [];
    ok('C: the voice tool-call built an AGENT block on the REDESIGN canvas', rc.some(b => b.type === 'agent' && b.text === 'Invoice-matching agent'), rc.map(b => b.type + ':' + b.text));
    ok('C: it did NOT touch the surface map', !((A.team().canvas.blocks || []).some(b => b.type === 'agent')), (A.team().canvas.blocks || []).map(b => b.type));
    A.m.close(); B.m.close(); fac.close();
  } finally { await kill(h); }

  mock.wss.close();
  console.log(`\nqa-voice-rt: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.log('qa-voice-rt threw:', e.message.slice(0, 300)); process.exit(1); });
