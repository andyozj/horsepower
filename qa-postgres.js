/* Durable Postgres backend test. Spawns the real server pointed at a Postgres and asserts: file→PG
 * import cutover, a room persists to PG with its edits, the room survives a RESTART (loaded from PG),
 * and the table mirrors the live set. SKIPS cleanly when no DATABASE_URL is set (CI / laptop default).
 *   DATABASE_URL=postgres://postgres:test@localhost:5434/horsepower PG_NO_SSL=1 node qa-postgres.js
 */
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const WebSocket = require('ws');
const PORT = 3270, BASE = `http://localhost:${PORT}`, WSBASE = `ws://localhost:${PORT}`;
const DBURL = process.env.DATABASE_URL;
const NO_SSL = process.env.PG_NO_SSL || '1';
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + JSON.stringify(x) : ''); } };

if (!DBURL) { console.log('qa-postgres: SKIPPED — set DATABASE_URL to run (e.g. a docker postgres + PG_NO_SSL=1)'); process.exit(0); }

async function spawnServer(dataDir) {
  const srv = spawn('node', ['server.js'], { env: Object.assign({}, process.env, {
    PORT: String(PORT), DATA_DIR: dataDir, DATABASE_URL: DBURL, PG_NO_SSL: NO_SSL
  }), stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stderr.on('data', d => process.env.DEBUG && console.error(String(d)));
  for (let i = 0; i < 80; i++) { try { if ((await fetch(BASE + '/api/health')).ok) return srv; } catch {} await wait(150); }
  throw new Error('server did not start');
}
async function killServer(srv) { srv.kill('SIGTERM'); await wait(700); try { srv.kill('SIGKILL'); } catch {} await wait(200); }

// the inspector connects with a sanitized URL (strip ssl/sslmode — pg mishandles them); the SERVER under
// test still gets the RAW DBURL via spawnServer env, so this exercises the server's own strip.
function cleanUrl(u) { try { const x = new URL(u); ['ssl', 'sslmode'].forEach(k => x.searchParams.delete(k)); return x.toString(); } catch { return u; } }
async function main() {
  const { Client } = require('pg');
  const c = new Client({ connectionString: cleanUrl(DBURL), ssl: NO_SSL === '1' ? false : { rejectUnauthorized: false } });
  await c.connect();
  await c.query('DROP TABLE IF EXISTS workshops');                 // clean slate so the import path runs

  // --- A: a file snapshot is imported into Postgres on first boot ---
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-pg-'));
  const seed = { code: 'SEED01', hostKey: 'SEEDHOST', state: 'lobby', teams: [], timer: {}, lastActivity: Date.now() };
  fs.writeFileSync(path.join(dir, 'workshops.json'), JSON.stringify([seed]));
  let srv = await spawnServer(dir);
  let h = await (await fetch(BASE + '/api/health')).json();
  ok('health reports db:postgres', h.db === 'postgres', h);
  let rows = (await c.query('SELECT code FROM workshops')).rows.map(r => r.code);
  ok('A: existing file snapshot imported into Postgres on first boot', rows.includes('SEED01'), rows);

  // --- B: a new room + its edits land in Postgres ---
  const mint = await (await fetch(BASE + '/api/workshop', { method: 'POST' })).json();
  const ws = new WebSocket(WSBASE); await new Promise(r => ws.on('open', r));
  ws.send(JSON.stringify({ type: 'join', role: 'member', workshopCode: mint.code, name: 'Ann' })); await wait(200);
  ws.send(JSON.stringify({ type: 'team:create', workshopCode: mint.code, name: 'AP Squad', memberName: 'Ann' })); await wait(700);
  ws.close();
  let row = (await c.query('SELECT data FROM workshops WHERE code = $1', [mint.code])).rows[0];
  ok('B: new room persisted to PG WITH its team (jsonb round-trips)', row && (row.data.teams || []).some(t => t.name === 'AP Squad'), row && (row.data.teams || []).map(t => t.name));

  // --- C: the room survives a RESTART (loaded back from PG, not the file) ---
  await killServer(srv);
  srv = await spawnServer(dir);                                    // same DB; PG now non-empty → no re-import
  h = await (await fetch(BASE + '/api/health')).json();
  ok('C: rooms restored into memory after restart', h.workshops >= 2, h);
  const got = await fetch(BASE + '/api/workshop/' + mint.code).then(r => r.ok ? r.json() : null).catch(() => null);
  ok('C: the minted room is queryable after restart (durable)', got && (got.code === mint.code || (got.teams || []).some(t => t.name === 'AP Squad')), got);

  // --- D: the table MIRRORS the live set (no orphan rows, both rooms present) ---
  rows = (await c.query('SELECT code FROM workshops')).rows.map(r => r.code);
  ok('D: PG mirrors the live Map (seed + minted room both present)', rows.includes('SEED01') && rows.includes(mint.code), rows);

  await killServer(srv);
  await c.end();
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  console.log(`\nqa-postgres: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.log('qa-postgres threw:', e.message.slice(0, 300)); process.exit(1); });
