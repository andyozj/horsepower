// Retrofit-trap interactive mini-app — standalone, self-contained.
// Presenter drives the deck; phones join a code and submit live answers per active prompt.
// Reuses only express + ws (already in this repo). Does NOT touch server.js / the Horsepower app.
//
//   node trap-server.js            # default port 3400
//   PORT=4000 node trap-server.js
//
const express = require('express');
const http = require('http');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 3400);
const CODE = (process.env.CODE || randCode()).toUpperCase();
const HOSTKEY = process.env.HOSTKEY || crypto.randomBytes(4).toString('hex');
const MAX_ANSWERS = 300, MAX_LEN = 280;

function randCode(){ const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<4;i++) s+=a[crypto.randomInt(a.length)]; return s; }
function lanIp(){
  const ifs = os.networkInterfaces();
  for(const name of Object.keys(ifs)){
    for(const ni of ifs[name]||[]){
      if(ni.family==='IPv4' && !ni.internal) return ni.address;
    }
  }
  return 'localhost';
}

// single live session
const session = { code: CODE, activePrompt: null, answers: {} /* promptId -> [{id,name,text,tag}] */,
  timer: null /* {endsAt, durationMs} */ };

// durable participant records keyed by a token the phone keeps in localStorage —
// so a refresh/reconnect restores the same steed + score + found list (no ghost lanes).
const players = new Map(); // token -> {token, pid, steed, name, score, found:{stepId:[..]}, foundNorm:Set}

// ── Assumption Race (Interlude 2) — the 4 steps + the assumptions each is built on ──
// Players race to surface as many genuine assumptions as they can before the buzzer.
// (The dead/alive judgement is delivered by the facilitator on the synthesis slide, not graded here.)
const STEPS = [
  { id:'deck', title:'Build the deck',
    blurb:'pull the numbers together and package them into slides to send up',
    today:'Export from every system, then assemble the slides by hand.',
    pain:'A full day of swivel-chair, every cycle.',
    assumptions:['the people above can’t see your numbers themselves','raw numbers need a human to package them into a story','reporting has to happen on a fixed monthly cycle','the audience can’t pull the detail they want on demand'] },
  { id:'review', title:'The question loop',
    blurb:'they read the pack, spot gaps, send questions back, and you resend',
    today:'You read the pack, spot gaps, write clarifying questions, and wait for a new version.',
    pain:'Rounds of back-and-forth before it’s right.',
    assumptions:['the reviewer can’t drill into the data themselves','every answer has to round-trip back through you','questions can only be asked against a static pack','you can’t see what they’re looking at'] },
  { id:'rollup', title:'Roll it up',
    blurb:'merge everyone’s packs into one combined view to pass upward',
    today:'Take everyone’s packs and merge them into a single view to pass upward.',
    pain:'Slow, manual, and stale by the time it’s done.',
    assumptions:['the numbers can’t combine themselves across teams','a human is needed to reconcile mismatches','each team reports in its own format','consolidation can only happen after everyone submits'] },
  { id:'meeting', title:'The decision in the room',
    blurb:'everyone meets, walks the pack, and a call gets made',
    today:'Get everyone in a room; someone scribbles the actions and owners.',
    pain:'Decisions get lost; the follow-up slips.',
    assumptions:['you need everyone physically in a room to decide','someone must be accountable for a consequential call','the decision can only be made once a month','people won’t engage unless it’s a scheduled meeting'] },
];
const AI_ON = !!process.env.ANTHROPIC_API_KEY;
const MAX_PER_STEP = 4;        // offline cap so nobody spams one step to win
const MAX_FOUND_LEN = 160;

// horse identities, assigned at join ("account creation") — uses the repo's hand-drawn steed skins
const STEED_NAMES = ['Bramble','Comet','Dusty','Ember','Flint','Biscuit','Hazel','Indigo','Juno','Koda','Lumen','Maple','Nimbus','Onyx','Pepper','Quill','Rusty','Sable'];
const STEED_SKINS = [
  {color:'purple',hex:'#7c3aed'},{color:'green',hex:'#2e7d52'},{color:'navy',hex:'#21314f'},{color:'gold',hex:'#b8860b'},
  {color:'chestnut',hex:'#9a5b2e'},{color:'blue',hex:'#3b6fe2'},{color:'plum',hex:'#7d3a5e'},{color:'teal',hex:'#1f7a72'} ];
let steedSeq = 0;
function nextSteed(){ const i = steedSeq++; const sk = STEED_SKINS[i % STEED_SKINS.length]; return { name: STEED_NAMES[i % STEED_NAMES.length], color: sk.color, hex: sk.hex }; }

const norm = s => String(s||'').toLowerCase().replace(/[^a-z0-9 ]+/g,'').replace(/\s+/g,' ').trim();

async function callAI(system, user){
  const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/,'');
  const model = process.env.AI_MODEL || 'claude-opus-4-8';
  const ctrl = new AbortController(); const to = setTimeout(()=>ctrl.abort(), 15000);
  try{
    const r = await fetch(base+'/v1/messages', {
      method:'POST', signal: ctrl.signal,
      headers:{ 'content-type':'application/json', 'x-api-key':process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model, max_tokens:160, system, messages:[{role:'user',content:user}] })
    });
    if(!r.ok) throw new Error('AI '+r.status);
    const j = await r.json();
    return (j.content||[]).map(c=>c.text||'').join('').trim();
  } finally { clearTimeout(to); }
}

// Judge one submission: is it a genuine assumption this step is built on?
async function validateAssumption(step, text, priorNorms){
  const clean = String(text||'').trim().slice(0, MAX_FOUND_LEN);
  if(norm(clean).split(' ').filter(Boolean).length < 3) return { accept:false, note:'Give it a bit more — what does the step quietly assume is true?' };
  if(priorNorms.has(norm(clean))) return { accept:false, note:'You’ve already got that one — find a different assumption.' };
  if(AI_ON){
    try{
      const sys = `You judge whether a player's submission names a genuine ASSUMPTION that a workflow step is built on — a belief about what is hard, scarce, or necessary that makes the step exist.
Step: "${step.title}" — ${step.blurb}.
Real assumptions it encodes include: ${step.assumptions.join('; ')}.
ACCEPT if the submission expresses a real, distinct assumption behind the step (it need not match the examples — reward genuine insight).
REJECT if it just restates the step's action, is vague/nonsense, or duplicates a known assumption.
Reply with ONLY compact JSON: {"accept":true|false,"note":"<≤12 word encouraging or redirecting line>"}`;
      const out = await callAI(sys, 'Submission: "'+clean+'"');
      const mt = out.match(/\{[\s\S]*\}/);
      if(mt){ const j = JSON.parse(mt[0]); return { accept: !!j.accept, note: String(j.note||'').slice(0,120) || (j.accept?'Nice one — your horse moves!':'Not quite — try another angle.') }; }
    }catch(e){ console.log('validate AI fell back:', e.message); }
  }
  // offline fallback: accept substantial, non-duplicate guesses, capped per step
  const NUDGES = [
    'Logged. The sharpest ones name something that could be false today.',
    'Logged — keep hunting. What does this step assume can’t be done?',
    'Nice. Now find one that quietly assumes a human is needed.',
    'Logged. Next: what scarcity is this step working around?' ];
  return { accept:true, note: NUDGES[priorNorms.size % NUDGES.length] };
}

const app = express();
app.use(express.json({ limit:'24kb' }));
app.use(express.static(path.join(__dirname, 'trap')));
app.use('/img', express.static(path.join(__dirname, 'public', 'img')));   // reuse the hand-drawn steeds/trot frames
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'trap', 'join.html')));
app.get('/present', (_req, res) => res.sendFile(path.join(__dirname, 'trap', 'present.html')));
app.get('/api/info', (_req, res) => res.json({ ip: lanIp(), port: PORT, code: CODE }));
app.get('/api/health', (_req, res) => res.json({ ok: true, ai: AI_ON, code: CODE }));
app.get('/api/steps', (_req, res) => res.json({ ai: AI_ON, steps: STEPS.map(s=>({ id:s.id, title:s.title, blurb:s.blurb, today:s.today, pain:s.pain })) }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function send(ws, obj){ if(ws.readyState===1) ws.send(JSON.stringify(obj)); }
function toPresenters(obj){ const s=JSON.stringify(obj); wss.clients.forEach(c=>{ if(c.readyState===1 && c.role==='presenter') c.send(s); }); }
function toAll(obj){ const s=JSON.stringify(obj); wss.clients.forEach(c=>{ if(c.readyState===1) c.send(s); }); }
function pcount(){ let n=0; wss.clients.forEach(c=>{ if(c.readyState===1 && c.role==='participant') n++; }); return n; }
function pushCount(){ toPresenters({ type:'count', count: pcount() }); }
function liveTimer(){ if(!session.timer) return null; const rem = session.timer.endsAt - Date.now(); return rem>0 ? { endsAt: session.timer.endsAt, durationMs: session.timer.durationMs } : null; }
function leaderboard(){
  const racers=[];
  players.forEach(p=>{ racers.push({ id:p.pid, name:p.name||p.steed.name, steed:p.steed, score:p.score||0 }); });
  racers.sort((a,b)=> b.score-a.score || a.id.localeCompare(b.id));
  return racers;
}
function pushBoard(){ toPresenters({ type:'board', board: leaderboard() }); }

wss.on('connection', (ws) => {
  ws.role = 'guest';
  ws.on('error', () => {}); // never crash the process on a socket error
  ws.on('message', async (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if(!m || typeof m!=='object') return;

    if(m.type === 'present'){
      if(m.hostKey === HOSTKEY){
        ws.role = 'presenter';
        send(ws, { type:'state', activePrompt: session.activePrompt, answers: session.answers, count: pcount(),
          board: leaderboard(), timer: liveTimer() });
      } else {
        send(ws, { type:'denied' });
      }
      return;
    }

    if(m.type === 'join'){
      ws.role = 'participant';
      let token = String(m.token||'').slice(0,64);
      let p = token && players.get(token);
      if(!p){
        token = crypto.randomBytes(9).toString('hex');
        p = { token, pid: crypto.randomBytes(4).toString('hex'), steed: nextSteed(), name:'', score:0, found:{}, foundNorm:new Set() };
        players.set(token, p);
      }
      if(m.name) p.name = String(m.name).slice(0,40);
      ws.player = p; ws.token = token;
      send(ws, { type:'you', token: p.token, pid: p.pid, steed: p.steed, name: p.name, score: p.score, found: p.found });
      send(ws, { type:'prompt', activePrompt: session.activePrompt });
      send(ws, { type:'timer', timer: liveTimer() });
      pushCount(); pushBoard();
      return;
    }

    if(m.type === 'setPrompt'){
      if(ws.role !== 'presenter') return;
      session.activePrompt = m.prompt && m.prompt.id ? {
        id: String(m.prompt.id).slice(0,40),
        label: String(m.prompt.label||'').slice(0,200),
        mode: String(m.prompt.mode||'build').slice(0,20)
      } : null;
      toAll({ type:'prompt', activePrompt: session.activePrompt });
      return;
    }

    if(m.type === 'submit'){
      if(ws.role !== 'participant') return;
      const now = Date.now();
      if(ws._last && now - ws._last < 350) return; // gentle throttle
      ws._last = now;
      const promptId = String(m.promptId||'').slice(0,40);
      const text = String(m.text||'').trim().slice(0, MAX_LEN);
      if(!promptId || !text) return;
      const tag = m.tag === 'dead' || m.tag === 'real' ? m.tag : null;
      const ans = { id: crypto.randomBytes(4).toString('hex'), name: ws.name||'', text, tag };
      const arr = (session.answers[promptId] = session.answers[promptId] || []);
      if(arr.length < MAX_ANSWERS) arr.push(ans);
      toPresenters({ type:'answer', promptId, answer: ans });
      send(ws, { type:'ack', promptId });
      return;
    }

    // presenter starts/stops the timeboxed scarcity round
    if(m.type === 'timer'){
      if(ws.role !== 'presenter') return;
      if(m.action === 'stop'){ session.timer = null; toAll({ type:'timer', timer:null }); return; }
      const dur = Math.max(15000, Math.min(20*60000, Number(m.durationMs)||240000));
      session.timer = { endsAt: Date.now()+dur, durationMs: dur };
      toAll({ type:'timer', timer: liveTimer() });
      return;
    }

    // participant submits an assumption → validate → score → advance the horse
    if(m.type === 'assume'){
      const p = ws.player; if(ws.role !== 'participant' || !p) return;
      const now = Date.now();
      if(ws._last && now - ws._last < 500){ send(ws, { type:'assumeResult', accept:false, note:'one sec…' }); return; }
      ws._last = now;
      // round must be live
      if(!liveTimer()){ send(ws, { type:'assumeResult', accept:false, note:'the round isn’t running yet' }); return; }
      const step = STEPS.find(s=>s.id===String(m.step||'').slice(0,20));
      const text = String(m.text||'').trim().slice(0, MAX_FOUND_LEN);
      if(!step || !text) return;
      p.found[step.id] = p.found[step.id] || [];
      if(p.found[step.id].length >= MAX_PER_STEP){ send(ws, { type:'assumeResult', step:step.id, accept:false, note:'You’ve mined this step out — try another step.' }); return; }
      let res;
      try{ res = await validateAssumption(step, text, p.foundNorm); }
      catch(e){ res = { accept:true, note:'Logged — keep hunting!' }; }
      if(res.accept){
        p.found[step.id].push(text); p.foundNorm.add(norm(text)); p.score = (p.score||0)+1;
        send(ws, { type:'assumeResult', step:step.id, accept:true, note:res.note, score:p.score, text });
        pushBoard();
      } else {
        send(ws, { type:'assumeResult', step:step.id, accept:false, note:res.note, score:p.score });
      }
      return;
    }

    // phone asks for its standing at the buzzer (done screen)
    if(m.type === 'rank'){
      const p = ws.player; if(ws.role !== 'participant' || !p) return;
      const board = leaderboard();
      const idx = board.findIndex(r=>r.id===p.pid);
      send(ws, { type:'rank', rank: idx>=0?idx+1:board.length, total: board.length, score: p.score });
      return;
    }

    if(m.type === 'reset'){
      if(ws.role !== 'presenter') return;
      session.answers = {}; session.timer = null;
      players.forEach(p=>{ p.score=0; p.found={}; p.foundNorm=new Set(); });
      toPresenters({ type:'cleared' });
      toAll({ type:'timer', timer:null });
      pushBoard();
      return;
    }
  });
  ws.on('close', () => { if(ws.role==='participant') pushCount(); });
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = lanIp();
  console.log(`\n  ───────────────────────────────────────────────`);
  console.log(`  Retrofit-trap mini-app is live.\n`);
  console.log(`  Participants →  http://${ip}:${PORT}        (code: ${CODE})`);
  console.log(`  Presenter    →  http://${ip}:${PORT}/present?host=${HOSTKEY}`);
  console.log(`\n  Open the presenter link yourself; share the participant link + code with the room.`);
  console.log(`  ───────────────────────────────────────────────\n`);
});
