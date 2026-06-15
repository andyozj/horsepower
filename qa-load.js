/* qa-load.js — Horsepower LOAD + LATENCY harness.
 *
 * Simulates N concurrent members editing the shared map at the WS protocol level
 * (raw `ws` sockets — no browser) and measures REAL propagation latency under load:
 * sender -> peer-receive, by tagging each edit with a unique marker block id + a
 * local high-res send timestamp, and timing when ANOTHER member's socket receives a
 * broadcast `state` containing that marker.
 *
 * Also measures: event-loop responsiveness (a probe socket pinging every 500ms),
 * accepted-edits throughput, rate-limit drops, and server RSS growth (the harness
 * spawns the server as a child so it can read `ps -o rss=`).
 *
 * Run:  node qa-load.js
 * No new deps — node + the `ws` already in package.json. Server NOT modified.
 */
'use strict';
const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const PORT = Number(process.env.LOAD_PORT || 3502);
const BASE = `http://127.0.0.1:${PORT}`;
const WS_BASE = `ws://127.0.0.1:${PORT}`;
const DATA_DIR = process.env.LOAD_DATA_DIR || '/tmp/hp-load';
const SERVER = path.join(__dirname, 'server.js');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => Number(process.hrtime.bigint() / 1000n) / 1000; // ms, sub-ms resolution

function pct(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
  return s[i];
}
const r1 = v => (v == null ? null : Math.round(v * 10) / 10);

// ---- HTTP helpers ----
function postJSON(p, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } }, res => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve({ status: res.statusCode, json: JSON.parse(b || '{}') }); } catch { resolve({ status: res.statusCode, json: {} }); } });
    });
    req.on('error', reject); req.write(data); req.end();
  });
}
function getJSON(p) {
  return new Promise((resolve, reject) => {
    http.get(BASE + p, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } }); }).on('error', reject);
  });
}

// ---- server lifecycle ----
function startServer() {
  execSync(`rm -rf ${DATA_DIR}`);
  const proc = spawn('node', [SERVER], {
    env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); // keep pipe drained
  proc.stderr.on('data', d => { const s = String(d); if (/error|throw|unhandled/i.test(s)) process.stderr.write('[srv] ' + s); });
  return proc;
}
async function waitHealthy(tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const h = await getJSON('/api/health'); if (h.ok) return true; } catch {}
    await sleep(100);
  }
  throw new Error('server did not become healthy');
}
function rssKB(pid) {
  try { return Number(execSync(`ps -o rss= -p ${pid}`).toString().trim()) || 0; } catch { return 0; }
}
function killServer(proc) {
  return new Promise(res => { try { proc.on('exit', () => res()); process.kill(proc.pid, 'SIGKILL'); } catch { res(); } setTimeout(res, 1500); });
}

// ---- a member socket ----
function makeMember(idx, teamName, teamId /* null => create */, recvRegistry, metrics) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_BASE);
    let seated = false;
    const m = { idx, ws, teamId: null, memberId: null, token: null, seq: 0 };
    const to = setTimeout(() => reject(new Error('member ' + idx + ' join timeout')), 8000);
    ws.on('open', () => { ws.send(JSON.stringify({ type: 'join', workshopCode: CODE, role: 'member' })); });
    ws.on('message', raw => {
      let msg; try { msg = JSON.parse(raw); } catch { return; }
      if (msg.type === 'joined' && !seated) {
        // now create or join a team
        if (teamId === null) ws.send(JSON.stringify({ type: 'team:create', workshopCode: CODE, name: teamName, memberName: 'M' + idx }));
        else ws.send(JSON.stringify({ type: 'team:join', workshopCode: CODE, teamId, memberName: 'M' + idx }));
        return;
      }
      if (msg.type === 'seated' && !seated) {
        seated = true; clearTimeout(to);
        m.teamId = msg.teamId; m.memberId = msg.memberId; m.token = msg.token;
        resolve(m);
        return;
      }
      if (msg.type === 'error') {
        if (/Slow down/i.test(msg.error || '')) metrics.drops++;
        return;
      }
      if (msg.type === 'state') {
        // scan this peer's OWN team canvas for marker blocks we haven't yet timed at this receiver.
        const t = (msg.state.teams || []).find(tt => tt.id === m.teamId);
        if (!t || !t.canvas || !Array.isArray(t.canvas.blocks)) return;
        const rt = now();
        for (const b of t.canvas.blocks) {
          if (typeof b.id !== 'string' || b.id[0] !== 'L') continue; // marker ids start with 'L'
          // record first time THIS receiver saw THIS marker
          const key = m.idx + '|' + b.id;
          if (recvRegistry.seen.has(key)) continue;
          recvRegistry.seen.add(key);
          const sentAt = recvRegistry.sent.get(b.id);
          if (sentAt == null) continue;             // a marker from before we started timing
          if (b.id.startsWith('L' + m.idx + '-')) continue; // skip own edits (sender == receiver)
          metrics.prop.push(rt - sentAt);
        }
      }
    });
    ws.on('error', reject);
  });
}

// globals set per run
let CODE = null, HOSTKEY = null;

async function runLevel({ users, teams, cadenceMin, cadenceMax, durationMs, label }) {
  const proc = startServer();
  await waitHealthy();
  const rssStart = rssKB(proc.pid);

  // mint
  const mint = await postJSON('/api/workshop');
  CODE = mint.json.code; HOSTKEY = mint.json.hostKey;
  if (!CODE) throw new Error('mint failed: ' + JSON.stringify(mint));

  // farrier
  const far = new WebSocket(WS_BASE);
  await new Promise((res, rej) => {
    far.on('open', () => far.send(JSON.stringify({ type: 'join', workshopCode: CODE, role: 'farrier', hostKey: HOSTKEY })));
    far.on('message', raw => { const m = JSON.parse(raw); if (m.type === 'joined' && m.role === 'farrier') res(); });
    far.on('error', rej);
    setTimeout(() => rej(new Error('farrier join timeout')), 8000);
  });

  const metrics = { prop: [], pingRtt: [], drops: 0, attempted: 0, accepted: 0 };
  const recvRegistry = { sent: new Map(), seen: new Set() };

  // join members across T teams. First member of each team creates it; rest join by id.
  const teamIds = new Array(teams).fill(null);
  const members = [];
  // create first member of each team sequentially so team ids exist before joiners reference them.
  const perTeam = Math.ceil(users / teams);
  let created = 0;
  for (let ti = 0; ti < teams; ti++) {
    const first = await makeMember(created, 'Team' + (ti + 1), null, recvRegistry, metrics);
    teamIds[ti] = first.teamId; members.push(first); created++;
  }
  // remaining members fan out, joining existing teams (parallel within a small batch to avoid mint/bucket weirdness — these are WS joins, no per-IP mint cap)
  const joiners = [];
  let mi = created;
  for (; mi < users; mi++) {
    const ti = mi % teams;
    joiners.push(makeMember(mi, 'Team' + (ti + 1), teamIds[ti], recvRegistry, metrics));
    if (joiners.length >= 25) { members.push(...await Promise.all(joiners.splice(0))); }
  }
  if (joiners.length) members.push(...await Promise.all(joiners));

  // advance to surface so canvas:update is accepted
  far.send(JSON.stringify({ type: 'phase:set', workshopCode: CODE, phase: 'surface' }));
  await sleep(300);

  // probe socket: a farrier-less member-less plain socket pinging every 500ms for event-loop RTT
  const probe = new WebSocket(WS_BASE);
  await new Promise((res, rej) => { probe.on('open', res); probe.on('error', rej); setTimeout(res, 3000); });
  const pingSent = new Map(); let pingSeq = 0;
  probe.on('message', raw => { let m; try { m = JSON.parse(raw); } catch { return; } if (m.type === 'pong') { /* match latest */ } });
  // ping path returns a bare pong with no id; measure RTT by round-trip of a fresh ping each tick.
  let probeBusy = false;
  const probeTimer = setInterval(() => {
    if (probe.readyState !== 1 || probeBusy) return;
    probeBusy = true; const t0 = now();
    const onPong = raw => { let m; try { m = JSON.parse(raw); } catch { return; } if (m.type === 'pong') { metrics.pingRtt.push(now() - t0); probe.off('message', onPong); probeBusy = false; } };
    probe.on('message', onPong);
    probe.send(JSON.stringify({ type: 'ping', workshopCode: CODE }));
    setTimeout(() => { probe.off('message', onPong); probeBusy = false; }, 2000); // give up if no pong (still records nothing)
  }, 500);

  // RSS sampler
  const rssSamples = [rssStart];
  const rssTimer = setInterval(() => rssSamples.push(rssKB(proc.pid)), 1000);

  // editing loop per member — each member periodically sends a canvas:update adding a marker block.
  // We keep each member's blocks small (the server merges by knownIds; we send the full block set we own).
  function startEditor(m) {
    const myBlocks = [];
    const tick = () => {
      if (m.ws.readyState !== 1 || stopped) return;
      m.seq++;
      const id = 'L' + m.idx + '-' + m.seq;
      // realistic: mostly move an existing block, sometimes add one. Either way emit a fresh marker id so
      // every edit is independently timeable (a move re-stamps a new marker block so propagation is measured per edit).
      const b = { id, type: 'phase', x: 60 + (m.seq % 12) * 30, y: 60 + (m.idx % 8) * 70, w: 170, h: 56, text: 'edit ' + m.idx + '-' + m.seq, meta: {} };
      // knownIds = the ids THIS sender already saw acknowledged by the server (so the merge can tell a
      // brand-new insert from a peer-deleted item). The fresh block id must NOT be in knownIds, or
      // mergeColl treats it as a stale echo of a peer-deleted item and drops it (server.js mergeColl).
      const knownIds = { blocks: myBlocks.map(x => x.id), arrows: [], orphans: [] };
      myBlocks.push(b);
      if (myBlocks.length > 8) myBlocks.shift(); // cap our own footprint so we never near MAX_BLOCKS at high N
      recvRegistry.sent.set(id, now());
      metrics.attempted++;
      try { m.ws.send(JSON.stringify({ type: 'canvas:update', workshopCode: CODE, canvas: { blocks: myBlocks, arrows: [], orphans: [] }, knownIds })); metrics.accepted++; } catch {}
      const next = cadenceMin + Math.random() * (cadenceMax - cadenceMin);
      m.timer = setTimeout(tick, next);
    };
    // jittered start so all members don't fire in lockstep
    m.timer = setTimeout(tick, Math.random() * cadenceMax);
  }
  let stopped = false;
  members.forEach(startEditor);

  await sleep(durationMs);
  stopped = true;
  members.forEach(m => clearTimeout(m.timer));
  clearInterval(probeTimer); clearInterval(rssTimer);
  await sleep(500); // drain in-flight broadcasts

  const rssEnd = rssKB(proc.pid);
  const peakRss = Math.max(...rssSamples, rssEnd);
  const health = await getJSON('/api/health').catch(() => ({}));

  // teardown sockets
  members.forEach(m => { try { m.ws.close(); } catch {} });
  try { far.close(); } catch {} try { probe.close(); } catch {}
  await sleep(200);

  const secs = durationMs / 1000;
  const result = {
    label, users, teams,
    cadence: `${cadenceMin}-${cadenceMax}ms`,
    prop_p50: r1(pct(metrics.prop, 50)), prop_p95: r1(pct(metrics.prop, 95)), prop_p99: r1(pct(metrics.prop, 99)), prop_max: r1(Math.max(0, ...metrics.prop)),
    prop_samples: metrics.prop.length,
    ping_p95: r1(pct(metrics.pingRtt, 95)), ping_max: r1(Math.max(0, ...metrics.pingRtt)), ping_samples: metrics.pingRtt.length,
    attempted: metrics.attempted, accepted: metrics.accepted, drops: metrics.drops,
    throughput_eps: r1(metrics.accepted / secs),
    rss_start_mb: r1(rssStart / 1024), rss_peak_mb: r1(peakRss / 1024), rss_end_mb: r1(rssEnd / 1024),
    uptime: health.uptime
  };
  await killServer(proc);
  await sleep(300);
  return result;
}

function fmtRow(r) {
  return `| ${r.users} | ${r.teams} | ${r.cadence} | ${r.prop_p50} | ${r.prop_p95} | ${r.prop_p99} | ${r.prop_max} | ${r.ping_p95} | ${r.throughput_eps} | ${r.drops} | ${r.rss_peak_mb} |`;
}

(async () => {
  const results = [];
  console.log('=== Horsepower LOAD + LATENCY harness ===');
  console.log('server:', SERVER, 'port:', PORT, 'data:', DATA_DIR, '\n');

  // ---- Escalation: realistic human cadence (2-5s w/ jitter) ----
  const levels = [
    { users: 30, teams: 6, cadenceMin: 2000, cadenceMax: 5000, durationMs: 35000, label: 'PRD ceiling 30 (6x5)' },
    { users: 60, teams: 8, cadenceMin: 2000, cadenceMax: 5000, durationMs: 35000, label: '60' },
    { users: 100, teams: 10, cadenceMin: 2000, cadenceMax: 5000, durationMs: 40000, label: '100' },
    { users: 150, teams: 12, cadenceMin: 2000, cadenceMax: 5000, durationMs: 40000, label: '150' }
  ];
  for (const lv of levels) {
    console.log(`\n--- running ${lv.label}: ${lv.users} users / ${lv.teams} teams / cadence ${lv.cadenceMin}-${lv.cadenceMax}ms / ${lv.durationMs / 1000}s ---`);
    const r = await runLevel(lv); results.push(r);
    console.log(JSON.stringify(r));
  }

  // ---- Stress: hammer cadence up until it breaks ----
  const stress = [
    { users: 100, teams: 10, cadenceMin: 400, cadenceMax: 800, durationMs: 30000, label: 'STRESS 100 @400-800ms' },
    { users: 150, teams: 12, cadenceMin: 300, cadenceMax: 600, durationMs: 30000, label: 'STRESS 150 @300-600ms' },
    { users: 200, teams: 12, cadenceMin: 250, cadenceMax: 500, durationMs: 30000, label: 'STRESS 200 @250-500ms' }
  ];
  for (const lv of stress) {
    console.log(`\n--- STRESS ${lv.label} ---`);
    const r = await runLevel(lv); results.push(r);
    console.log(JSON.stringify(r));
  }

  // ---- emit table ----
  console.log('\n\n=== RESULTS TABLE ===');
  console.log('| users | teams | cadence | p50 | p95 | p99 | max | ping p95 | edits/s | drops | peak RSS(MB) |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  results.forEach(r => console.log(fmtRow(r)));

  require('fs').writeFileSync('/tmp/hp-load-results.json', JSON.stringify(results, null, 2));
  console.log('\nraw results -> /tmp/hp-load-results.json');
  process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
