# Batch 2 — Product-track Design Doc (R1 · R2)

**Status:** for adversarial lead review. **No app file has been edited.**
**Scope:** `server.js` (read in full, current hardened state) + `public/index.html` (client touch-points). Two approved IPO-review items: **R1** post-workshop momentum engine (commitment beat + travelling recap), **R2** exit pulse.
**Hard premise:** the Cluster-A hardening (A1–A16, `docs/ipo-review/solutions/hardening-design.md`) is **shipped and live** (`sanitizeCanvas`/`sanitizeMeta`, `mergeCanvas`, per-role `buildViews`/`teamStub`/`teamOwn`/`capTeam`, the per-socket `ws.bucket`, `coachBuckets`, `isFarrier`, atomic save, TTL sweep 48h-idle/24h-closed, `qa-hostile.js`). **DECISIONS.md keeps the 48h/24h TTL — no extension.** Batch 2 is designed *around* that machinery and must not regress it.
**Concurrent Batch-1 premise (READ-ONLY for me):** another agent is adding `canvas.baseline={frequency,cycleTime}`, `meta.system`, a `farrier:whisper` WS case, and `/api/coach` `synth`/`cluster` branches. **My only dependency on Batch 1 is reading `canvas.baseline` for the recap's value sentence — I assume it exists and degrade cleanly when it is absent/empty.** I add a new WS case and a new `/api/coach` branch in the *same* switch / handler — these are additive and do not collide with Batch 1's cases (`farrier:whisper`, `cluster`, `synth` are distinct names from mine: `pulse:submit`, `commitment:submit`, `recap`).

**Verified line anchors (current tree, post-hardening):**
- `emptyCanvas()` server.js:117 · `sanitizeCanvas` :147 · `mergeCanvas` :204 · `teamPublic()` :489-504 · `baseState` :509-515 · `teamStub` :520-522 · `teamOwn` :523-527 · `capTeam` :528-533 · `buildViews` :535-551 · `broadcast` :561 · `isFarrier` :743
- `ws.on('message')` bucket `takeToken(ws.bucket)` :755-759 · the switch :763 · `assumption:add` (member-authz pattern) :929-934 · `assumption:resolve` :936-948 · `phase:set` :996-1008 · `present:set` :1033-1036 · `ping` :1044
- `/api/coach` :701-739 · `SYSTEMS` :611-630 · `SECRECY` :609 · `bankReply` :649-674 · `callAnthropic`/`callAzure` :677-699 (both carry `AbortSignal.timeout`)
- `buildDiff` :469-486 · `/api/diff/:code/:teamId` :1087-1095 · `judgeLedger` (client) index.html:2572-2586
- Client: `me` init index.html:956 · `ui` init :966 · `viewShare` :2478-2568 · `raceCard` :2590-2621 · `saveRaceCardPng` :2623-2658 · `exportPack` :2683-2715 · `viewClosed` :1584-1595 · `viewConsole` :2888-2990 (share/closed stat branch :2911-2913) · `primaryCTA`/`doAdvance` :2756-2772 · `runBar` :2780-2812 · `RUNSCRIPT` :2848-2854 · `wsSend` :989-993 · `toast` :891 · `confirmModal` (used :2770).

---

## 0. Where pulse + commitment data live (HARD CONSTRAINT #1, answered up front)

**Decision: dedicated per-member fields on the `member` object, written through dedicated WS messages (`pulse:submit`, `commitment:submit`) — NOT through the canvas.** Reasons:

- A pulse / commitment is **personal**, member-scoped, and one-shot — it is not map data. Routing it through `canvas:update` would (a) force it into `sanitizeCanvas` (which is a canvas allowlist — wrong home), (b) make it team-shared map state when it is per-person, and (c) collide with the phase-gate (`canvas:update` only runs in `surface`; pulse/commitment happen at `share`/`closed`).
- The member object already carries per-member identity (`id, name, steed, online, token` — server.js:795/818) and is **already projected with an explicit allowlist** in `teamPublic` (server.js:493: `members.map(m => ({ id, name, steed, online }))`). That allowlist is the single choke point that controls what leaves the server — I extend it deliberately and minimally (see §3 projection).

**The two new fields on `member`:**
```js
m.commitment = { text: '<≤400>', ts }       // R1: "first thing I'll redesign-not-retrofit"
m.pulse = { aha:'<≤400>', didDiff:'<≤400>', confBefore:0..10, confAfter:0..10, ts }   // R2
```
Both are absent until the member submits. Both are server-authoritative (set ONLY by the dedicated case, never by a canvas echo). Tokens/pulse/commitment NEVER ride `sanitizeCanvas`.

The four hardening hooks for each new message are named explicitly in §1.3 and §2.3.

---

## R1 — Post-workshop momentum engine

Three parts: **(a)** the commitment beat (a What/So-What/Now-What "Now-What" line each participant writes), **(b)** the travelling recap (Coach-compiled, degrading to rule-assembled, that leaves the server), **(c)** 30-day resurfacing — **explicitly out of scope** (phase-2; noted, not built).

### R1.0 The phase-machine question (methodology strain — analyzed)

**Does the commitment beat need a new phase / Farrier driver, or is it self-serve inside an existing phase?**

The locked state machine is `lobby → surface → (swap) → rebuild → share → closed` (CLAUDE.md rule #7, server.js:998). **Adding a 6th phase is the wrong move** — it would: change the `allowed` array, the client `steps`/`order` arrays (index.html:2774/2783), `primaryCTA` (:2756), every `RUNSCRIPT` consumer, and the per-role `open` flag in `buildViews` (server.js:538: `state==='share'||state==='closed'`). High blast radius for a 3-minute beat, and it strains rule #7 (the machine is deliberately fixed).

**Decision: the commitment beat is SELF-SERVE, surfaced in BOTH `share` and `closed`, with no new phase and no Farrier gate.** Rationale grounded in the methodology:
- **Rule #6 — "the Farrier's timer always rules the room."** A commitment beat must not be a server-enforced gate that can block `closed`; it is a participant action that the Farrier's clock can run over. So it is *never* blocking — exactly like the pulse.
- It is a **promoted card inside `viewShare`** (so it is captured while the room is still live and warm — the Liberating Structures "Now What" lands best right after the reckoning) AND remains editable in `viewClosed` (so a latecomer or someone the timer ran over can still write it). One field, idempotent submit (last write wins per member).
- The Farrier optionally *cues* it via `RUNSCRIPT.share` copy ("ask each person for their one commitment") — facilitation guidance, not a code gate. No `phase:set` change, no new CTA.

**Methodology verdict: minimal strain.** The beat is phase-*adjacent* (it lives in share+closed) but adds zero state-machine surface and zero new gate. It honors rule #6 (timer rules) and rule #7 (machine untouched). The one honest note: it is a small new "step" in the run-of-show that exists only in copy + a self-serve card, never in the server's phase enum.

### R1a — The commitment beat (`commitment:submit`)

#### Server (server.js) — new WS case

Add a case in the `ws.on('message')` switch, beside `assumption:add` (server.js:935). It mirrors the **member-authz idiom** of `assumption:add` (`findTeam(w, ws.teamId)` — a member writes only into their own team) **plus** a self-only guard (a member writes only their OWN `member.commitment`):

```js
      case 'commitment:submit': {
        // HARD HOOK #3a authz: a seated member writes their OWN commitment, in share/closed only.
        if (ws.role !== 'member' || !ws.memberId) return;
        if (w.state !== 'share' && w.state !== 'closed') return;       // post-reveal only (rule #2 secrecy is over)
        const team = findTeam(w, ws.teamId);
        const m = team && team.members.find(x => x.id === ws.memberId);
        if (!m) return;
        const text = String(msg.text || '').slice(0, CONFIG.MAX_NOTE);  // HARD HOOK #3d clamp (400, = MAX_NOTE)
        m.commitment = text ? { text, ts: Date.now() } : null;         // empty clears it (un-submit)
        broadcast(w); break;
      }
```

- **HARD HOOK #3b (per-socket bucket):** this case rides the SAME `ws.on('message')` handler that takes `takeToken(ws.bucket)` at server.js:755 *before* the switch — so it is metered exactly like every other WS message. **Confirmed: no extra code.** A commitment-spam loop is bounded by the WS_BUCKET (capacity 120, refill 25/s).
- **HARD HOOK #3c (length clamp):** `.slice(0, CONFIG.MAX_NOTE)` (400 chars). No vocab lint needed — the *member authors their own* commitment about *their own desk*, shown only to themselves + the Farrier; there is no pre-reveal exposure path (state is `share`/`closed`, secrecy over — see §4).
- **HARD HOOK #3a (authz):** member-only + own-member + phase-gated. A Farrier socket has no `memberId` → rejected. A pre-join socket has no `role==='member'`/`memberId` → rejected. A member cannot write another member's commitment (it always targets `ws.memberId`).

#### Client (public/index.html)

**A `commitmentCard(t)` helper**, rendered near the end of `viewShare` (after the reckoning, before the race card — the Now-What lands after the reckoning's So-What) AND in `viewClosed`. Self-contained, idempotent, debounced-commit (the device-death data-loss guard the critic loop established):

```js
function myMember(){ const t=myTeam(); return t&&(t.members||[]).find(m=>m.id===me.memberId)||null; }
function commitmentCard(){
  const mm=myMember(); if(!mm) return el('span',{});
  const box=el('div',{class:'commitcard card', 'data-testid':'commit-card'});
  box.append(el('h3',{html: glyph('g-flag')+' Your one commitment'}));
  box.append(el('p',{class:'meta'},'What’s the first thing you’ll redesign — not retrofit — back at your desk? (What → So-What → Now-What: this is your Now-What.)'));
  const ta=el('textarea',{'data-testid':'commit-input', maxlength:'400', placeholder:'e.g. “Stop the Friday approval email — let the system act and ping me only on exceptions.”'});
  ta.value=(mm.commitment&&mm.commitment.text)||'';
  const save=()=>{ const v=ta.value.trim().slice(0,400); if(((mm.commitment&&mm.commitment.text)||'')!==v){ wsSend({type:'commitment:submit', text:v}); if(v && !ui.commitToasted){ ui.commitToasted=true; toast('Commitment saved — it rides in your recap.'); } } };
  ta.addEventListener('blur',save);
  let ct; ta.addEventListener('input',()=>{ clearTimeout(ct); ct=setTimeout(save,900); });   // debounced (device-death guard)
  ta.addEventListener('keydown',e=>e.stopPropagation());
  box.append(ta);
  if(mm.commitment&&mm.commitment.text) box.append(el('div',{class:'meta', style:'color:var(--ok)'}, '✓ captured — edit any time before you leave'));
  return box;
}
```

- `viewShare` (index.html:2562, before the race card append): `wrap.append(sec(commitmentCard()));`
- `viewClosed` (index.html:1592, after the race card): `wrap.append(commitmentCard());` — so the timer-overrun case can still commit.
- **`editingLock` parity:** the textarea must defer re-renders while typing, like the inspector/baseline fields. Extend the existing `editingLock` focusin/focusout selector (the one that already covers `.inspector textarea`) to include `.commitcard textarea`. This is the one shared-CSS-selector edit R1a needs.

#### Offline degradation (R1a)
Fully offline. The commitment is plain typed data through a WS message; no AI. It persists on the member object and rides the projection. **No AI dependency.**

### R1b — The travelling recap (the 48h-TTL survivor)

**HARD CONSTRAINT #2: the recap must survive the 48h TTL — so it must LEAVE the server.** R9's server archive was cut precisely because of the TTL (DECISIONS.md line 13). The recap is therefore a **self-contained artifact generated client-side and delivered off-server**, never a server-hosted page that dies with the room.

#### Delivery mechanism (concrete + honest — no email infra, no build step)

**Decision: a downloaded standalone single-file HTML blob — `recap-<code>.html` — generated exactly like `exportPack` (which already opens a standalone, glyph-inlined HTML doc, index.html:2683-2715), but downloaded as a self-contained file via a Blob URL, PLUS a one-click "copy summary to clipboard" fallback.** Three honest tiers, in order of fidelity:

1. **Primary — "Save my recap" → a downloaded `.html` file.** Build a complete `<!doctype html>` string (inline CSS, inline glyphs, no external refs — the `exportPack` idiom), wrap it in a `Blob([html],{type:'text/html'})`, `URL.createObjectURL`, and trigger a download via the same `<a download>` click pattern `saveRaceCardPng` already uses (index.html:2656). The file lives on the participant's disk — **it cannot die with the room.** They can email it, drop it in Slack, or open it in any browser offline. This is the export-pack pattern, already proven and trivially deployable (no build step, no new dep, no server route).
   - *Honest limitation:* it is a file, not a hosted link. "Travels by link" is satisfied as "travels as a self-contained file the recipient saves/forwards" — the only link-without-server-infra option that survives a 48h TTL. A true short URL would need a persistence service we explicitly do not have (and which the TTL decision rules out).
2. **Secondary — "Copy summary" → clipboard.** A plain-text version (the same facts, ~12 lines) via `navigator.clipboard.writeText` (the copy idiom already at index.html:2340/2808). Pastes straight into an email/Slack/Notion — the lowest-friction "show your boss" path, zero file handling. This is the honest answer to "or a copy-to-clipboard summary."
3. **Tertiary fallback** — if `Blob`/download is blocked (rare sandboxed browsers): `window.open` the HTML into a new tab (the `exportPack` path) with a "⌘S to save this page" note. Same artifact, manual save.

**Why not a server route:** any `/api/recap/:code` page is deleted when the room is swept (24h closed / 48h idle). The whole point of R1b is surviving that sweep. The artifact must be in the participant's hands before the room dies — so it is generated **at share/closed, client-side, from data already on the wire.**

#### What's in the recap (the data — all already on the wire at share/closed)

At `share`/`closed` the per-role projection is FULL for everyone (`buildViews` `open` flag, server.js:538) — so a member's `state` already carries every team's `canvas`, `redesign` (incl. `teardown`, `assumptions`, `peopleLandings`), and now (Batch 2) every member's `commitment` + `pulse`. The recap is assembled **rule-based, client-side, from this state** — the same data `judgeLedger`/`buildDiff`/`exportPack` already consume. Content:

- **Header:** team name, riders (steed names — `riderNames`, index.html:2588), date + code.
- **Both workflows' fates:** the Before (original `t.canvas`) and After (the rebuild of it) intent lines — reuse `intentOf` (:2587) + the `becameTxt` logic from `raceCard` (:2598).
- **The value sentence (Batch-1 dependency):** if `originalTeam.canvas.baseline` exists and has `frequency`/`cycleTime`, render *"Today this ran {frequency}, taking {cycleTime} — the redesign rebuilds it AI-native."* If absent/empty, **omit the sentence entirely** (graceful — recap never says "undefined"). This is my ONE read of Batch-1's `canvas.baseline`; guarded by a truthiness check so it works whether or not Batch 1 has shipped.
- **The myth ledger:** `judgeLedger(rebuilder)` (:2572) → kept 🔒 vs MYTH ✂️ — the same array the share ledger + race card + export use.
- **The commitments:** every member's `m.commitment.text` from the team (the Now-What roll-up) — the marketing/accountability asset.
- **The pulse roll-up (R2 feed):** the team's ahas (free-text quotes) + the confidence-shift summary (avg before→after) — see R2. The aha quotes are the "quote stream" the IPO bar wants.

#### Implementation — `buildRecapHTML(t)` + `saveRecap(t)` (client)

A pure function returning the HTML string (mirrors `exportPack`'s doc-write but returns a string), and a saver. New helper near `exportPack` (index.html:2715):

```js
function recapFacts(t){
  const rebuilder=(state.teams||[]).find(x=>x.receivedFromTeamId===t.id);   // who rebuilt OUR workflow
  const orig=t.receivedFromTeamId ? (state.teams||[]).find(x=>x.id===t.receivedFromTeamId) : null; // whose we rebuilt
  const ledger=judgeLedger(rebuilder);
  const myths=ledger.filter(c=>!c.held);
  const bl=(t.canvas&&t.canvas.baseline)||null;   // BATCH-1 read — guarded
  const commitments=(t.members||[]).map(m=>m.commitment&&m.commitment.text).filter(Boolean);
  const pulses=(t.members||[]).map(m=>m.pulse).filter(Boolean);
  return { t, rebuilder, orig, ledger, myths, bl, commitments, pulses,
           intent: intentOf(t.canvas)||'their real process',
           became: rebuilder&&rebuilder.redesign ? becameLine(rebuilder) : 'no rebuild captured' };
}
function buildRecapHTML(t){
  const f=recapFacts(t);
  const valueSentence = (f.bl && (f.bl.frequency||f.bl.cycleTime))
    ? `<p class="value"><b>Today:</b> this ran ${esc(f.bl.frequency||'—')}, taking ${esc(f.bl.cycleTime||'—')} — the redesign rebuilds it AI-native.</p>` : '';
  const avg=(k)=>{ const v=f.pulses.map(p=>p[k]).filter(x=>typeof x==='number'); return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null; };
  const cb=avg('confBefore'), ca=avg('confAfter');
  // ... full standalone <!doctype html> string: inline CSS (exportPack idiom), inline glyphs,
  //     sections: header · before/after intent + valueSentence · myth ledger (kept/MYTH pills) ·
  //     commitments list · ahas (blockquotes) · confidence cb→ca · footer "ran at <code> · <date>"
  return `<!doctype html><html>…</html>`;   // body omitted here for brevity; structurally identical to exportPack
}
function saveRecap(t){
  const html=buildRecapHTML(t);
  try{
    const blob=new Blob([html],{type:'text/html'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url;
    a.download='horsepower-recap-'+(t.name||'session').replace(/\s+/g,'-').toLowerCase()+'.html';
    document.body.append(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
    toast('Recap saved — it’s yours to keep, email, or send your boss.');
  }catch(e){
    const win=window.open('','_blank');           // tertiary fallback
    if(win){ win.document.write(html); win.document.close(); toast('Recap opened — press ⌘/Ctrl-S to save it.'); }
    else toast('Allow pop-ups (or downloads) to save your recap.', true);
  }
}
function copyRecapText(t){
  const f=recapFacts(t);
  const lines=[ t.name+' — Horsepower recap ('+state.code+', '+new Date().toLocaleDateString()+')',
    'What it was: '+f.intent, 'What it became: '+f.became,
    (f.bl&&(f.bl.frequency||f.bl.cycleTime))?('Today it ran '+(f.bl.frequency||'—')+', taking '+(f.bl.cycleTime||'—')):null,
    'Myths struck: '+(f.myths.length?f.myths.map(m=>m.text).join('; '):'—'),
    'Commitments: '+(f.commitments.length?f.commitments.join(' | '):'—'),
    'Ahas: '+(f.pulses.map(p=>p.aha).filter(Boolean).join(' | ')||'—') ].filter(Boolean);
  try{ navigator.clipboard.writeText(lines.join('\n')); toast('Recap summary copied.'); }
  catch(e){ toast('Copy unavailable — use “Save my recap”.', true); }
}
```

`becameLine(rebuilder)` factors the `becameTxt` computation already inline in `raceCard` (index.html:2598-2600) so the recap and the race card share one source (small DRY refactor — extract, don't duplicate).

**Buttons** — in `viewShare` beside the existing export buttons (index.html:2563-2566) and in `viewClosed`:
```js
exp.append(el('button',{class:'btn', 'data-testid':'save-recap', html: glyph('i-down')+' Save my recap', onclick:()=>saveRecap(t)}));
exp.append(el('button',{class:'btn subtle', 'data-testid':'copy-recap', html:'Copy summary', onclick:()=>copyRecapText(t)}));
```

#### R1b — the AI-compiled tier (degrades to the rule-assembled recap above)

The brief says the recap is "Coach-compiled, degrading to rule-based assembly." The **rule-assembled HTML above is the floor and is always correct.** The AI tier is an *optional enrichment of the prose framing* only — it never gates the recap:

- A new `/api/coach` branch `recap:true` (mode `share`) that takes the rule-assembled facts as context and returns a tight 3-4 sentence **narrative intro** ("Your team took X's tangled approval chain and…") to sit atop the factual recap. It rides the EXACT same gate/bucket/timeout as every other coach call (it sits *after* `if (!AI_PROVIDER) return bank` / `if (!room) return bank` / `takeToken(coachBuckets…)` at server.js:705-710 — **HARD HOOK #3b confirmed metered**).
- New system prompt beside `SYSTEMS.share` (server.js:629), carrying `${SECRECY}` (defensive — though share is post-reveal):
  ```js
  SYSTEMS.recap = `You write a 3-4 sentence warm recap intro for a participant's take-home: name what their team's workflow became and the boldest myth that fell. Reference the supplied facts only; no preamble; no new facts. ${SECRECY}`;
  ```
- **Degradation:** if no key / no room / bucket empty / timeout → the client simply omits the AI intro and ships the rule-assembled recap. The client calls `recap:true`, and **whatever it gets back (or fails to get) does not block `saveRecap`** — the AI intro is an optional `<p>` prepended only on a non-degraded string reply. This matches `buildDiff`'s offline narration discipline: the factual artifact is rule-based; AI only adds prose polish.

**Important:** the AI intro is *requested and inlined client-side before the download* — it is NOT stored on the server (which would die with the room) and NOT posted to chat. The recap artifact is assembled entirely in the browser from (rule-based facts) + (optional one-shot AI sentence).

#### Offline degradation (R1b)
The recap is **100% functional offline** — `buildRecapHTML` is pure rule-based assembly from wire state. The AI intro is the only AI surface and it silently vanishes when degraded. The room never depends on it (rule #8).

### R1c — 30-day resurfacing: OUT OF SCOPE
Explicitly **phase-2, not built** (product.md R1 "optionally… ~30 days later"; DECISIONS.md treats it as deferrable). It would need a scheduler + a contactable address + off-server persistence of the commitment — none of which exist, and the 48h TTL forbids server-side storage anyway. **Noted; no code.** The commitment text *is* captured in the take-home recap (R1b), which is the durable seed a future phase-2 resurfacing could build on.

---

## R2 — Exit pulse (`pulse:submit`)

A 60-second pulse at CLOSED on each participant's own device: **one aha** (free text), **one thing you'll do differently** (free text), a **before/after confidence slider** ("I could redesign a workflow AI-native"). Results land on the Farrier's closed screen and feed the recap (R1b). **Rule-based, zero AI dependency, collaborative-toned (no inter-team scoring).**

### R2.0 Where it lives + when

- **When:** primarily `closed` (the brief says "at CLOSED"), but — like the commitment — also offered in `share` so a participant whom the Farrier's clock runs into `closed` before they finished still gets it, and so the data is warm. Server gate: `share` OR `closed` (same as commitment). The room view / projector never shows the pulse (it is on each member's own device, private).
- **Where (data):** `m.pulse` on the member object (§0). One-shot, idempotent (last write wins), self-only.

### R2.1 Server (server.js) — new WS case

Beside `commitment:submit`:

```js
      case 'pulse:submit': {
        // HARD HOOK #3a authz: seated member writes their OWN pulse, share/closed only.
        if (ws.role !== 'member' || !ws.memberId) return;
        if (w.state !== 'share' && w.state !== 'closed') return;
        const team = findTeam(w, ws.teamId);
        const m = team && team.members.find(x => x.id === ws.memberId);
        if (!m) return;
        const clampN = v => { const n = Number(v); return Number.isFinite(n) ? Math.min(10, Math.max(0, Math.round(n))) : null; };
        m.pulse = {                                                    // HARD HOOK #3d clamps
          aha: String(msg.aha || '').slice(0, CONFIG.MAX_NOTE),
          didDiff: String(msg.didDiff || '').slice(0, CONFIG.MAX_NOTE),
          confBefore: clampN(msg.confBefore), confAfter: clampN(msg.confAfter),
          ts: Date.now()
        };
        broadcast(w); break;
      }
```

- **HARD HOOK #3b (bucket):** rides `ws.bucket` `takeToken` at server.js:755 — metered, no extra code.
- **HARD HOOK #3c/#3d (clamps):** free-text fields `.slice(0, 400)`; slider ints clamped to 0–10 (rejects `NaN`/`Infinity`/`1e9`/strings → null). The whole `m.pulse` is rebuilt each submit (no partial smuggling of extra keys — it is a fresh object literal, allowlist-by-construction).
- **HARD HOOK #3a (authz):** member-only, own-member, phase-gated — identical guard class to `commitment:submit`. Farrier/pre-join sockets bounce. No vocab lint needed (post-reveal, member's own words, not team-broadcast pre-share).

### R2.2 Projection treatment (HARD CONSTRAINT #1 — do members see each other's pulses?)

**Decision:**
- **The Farrier sees ALL** (aggregate + every quote) — needed for the closed-screen results board and to feed the recap narrative. The Farrier view is already FULL (`buildViews` farrier branch, server.js:539-540) — but `teamPublic`'s member map is an **explicit allowlist** that currently drops `pulse`/`commitment` (server.js:493). **So `teamPublic` must opt these fields into the member projection.**
- **Members see only their OWN pulse + commitment** (to edit/confirm), **plus the recap roll-up at share/closed** (where everyone's view is FULL by design — the double reveal). They do NOT get a live per-member feed of teammates' pulses pre-aggregation; the recap presents the team roll-up (quotes + averages), which is the collaborative, non-scoring framing.
- **No inter-team scoring, ever** (the "Do NOT do" list, product.md §2.1). The pulse is presented as quotes + a team confidence shift, never as a ranked number between teams.

**The `teamPublic` member-map edit (the one projection change):**
```js
    members: t.members.map(m => ({ id: m.id, name: m.name, steed: m.steed || null, online: !!m.online,
      commitment: m.commitment || null, pulse: m.pulse || null })),   // R1/R2: per-member take-home + pulse
```

**Leak analysis of this widening (critical — it touches the projection the hardening locked):**
- Pre-share, the per-role projection sends OTHER teams as `teamStub` (server.js:520-522: `{id,name,members,gateGreen,hasTeardown}`). `teamStub` carries `f.members` **verbatim** — so widening the member map means a stub now also carries `commitment`/`pulse` for other teams' members. **Is that a leak?** *No, because pulse/commitment can ONLY be written in `share`/`closed`* (the server gate), and pre-share they are always `null`. A stub member pre-share has `commitment:null, pulse:null` — nothing to leak. At `share`/`closed` everyone's view is FULL anyway (secrecy over). **So the widened member map leaks nothing pre-reveal.** This is the same reasoning that lets `members` ride the stub today (ids/steeds are not secret; seat security is the token, hardening A9).
- The `qa-hostile.js` §16.2 leak sweep asserts the **stub shape** explicitly (`!('canvas' in other) && !('teardown' in other)`). Adding fields *inside* the member objects does **not** add `canvas`/`teardown`/`redesign` to the stub — the sweep stays green. **BUT** if the sweep asserts an exact member-key set, it must be updated; I add a new check (§Suite) rather than assume. Verified intent: the sweep checks canvas/teardown/redesign absence, not member-key exhaustiveness — so it stays green; the new H-checks below lock the new fields' visibility rules.

### R2.3 Client (public/index.html) — the pulse card

A `pulseCard()` helper, rendered in `viewShare` (after the reckoning) and `viewClosed`. 60-second-shaped: two short textareas + two range sliders, one submit. Idempotent (prefills from `m.pulse`), debounced commit:

```js
function pulseCard(){
  const mm=myMember(); if(!mm) return el('span',{});
  const p=mm.pulse||{};
  const box=el('div',{class:'pulsecard card', 'data-testid':'pulse-card'});
  box.append(el('h3',{html: glyph('g-bulb')+' 60-second pulse'}));
  box.append(el('p',{class:'meta'},'No scores, no comparisons — just your read on the day.'));
  const aha=el('textarea',{'data-testid':'pulse-aha', maxlength:'400', placeholder:'One aha you had…'}); aha.value=p.aha||'';
  const diff=el('textarea',{'data-testid':'pulse-diff', maxlength:'400', placeholder:'One thing you’ll do differently…'}); diff.value=p.didDiff||'';
  const mkSlider=(lbl,val)=>{ const w=el('label',{class:'pulseslider'}); w.append(el('span',{},lbl));
    const r=el('input',{type:'range', min:'0', max:'10', step:'1', value:(typeof val==='number'?val:5)}); const out=el('span',{class:'sliderval'}, String(typeof val==='number'?val:5));
    r.addEventListener('input',()=>{ out.textContent=r.value; commit(); }); w.append(r,out); w._input=r; return w; };
  const before=mkSlider('Before today, I could redesign a workflow AI-native', p.confBefore);
  const after =mkSlider('After today',                                       p.confAfter);
  let pt; function commit(){ clearTimeout(pt); pt=setTimeout(()=>{
    wsSend({type:'pulse:submit', aha:aha.value.trim(), didDiff:diff.value.trim(),
            confBefore:Number(before._input.value), confAfter:Number(after._input.value)});
    if(!ui.pulseToasted){ ui.pulseToasted=true; toast('Pulse logged — thank you.'); }
  },700); }
  [aha,diff].forEach(t=>{ t.addEventListener('blur',()=>{clearTimeout(pt); commit();}); t.addEventListener('input',commit); t.addEventListener('keydown',e=>e.stopPropagation()); });
  box.append(aha, diff, before, after);
  return box;
}
```

- `viewShare` + `viewClosed`: `wrap.append(sec(pulseCard()))` / `wrap.append(pulseCard())`.
- **`editingLock` parity:** extend the focusin/focusout selector to include `.pulsecard textarea` (sliders don't need it — range inputs don't capture text). One shared edit, combined with R1a's `.commitcard textarea`.

### R2.4 The Farrier's closed-screen results board

The Farrier console (`viewConsole`) already has a `share||closed` stat branch (index.html:2911-2913). Add a **pulse results card** in `viewConsole` when `state.state==='share'||state.state==='closed'`, reading the now-projected `m.pulse`/`m.commitment` across all teams (the Farrier view is FULL):

```js
function pulseBoard(){
  const teams=state.teams||[];
  const all=[]; teams.forEach(t=>(t.members||[]).forEach(m=>{ if(m.pulse) all.push({team:t.name, ...m.pulse, name:(m.steed&&m.steed.name)||m.name}); }));
  const commits=[]; teams.forEach(t=>(t.members||[]).forEach(m=>{ if(m.commitment) commits.push({team:t.name, text:m.commitment.text, name:(m.steed&&m.steed.name)||m.name}); }));
  const box=el('div',{class:'card', 'data-testid':'pulse-board'});
  box.append(el('h3',{html: glyph('g-bulb')+' Exit pulse · '+all.length+' responses'}));
  if(all.length){
    const cb=all.map(p=>p.confBefore).filter(n=>typeof n==='number'), ca=all.map(p=>p.confAfter).filter(n=>typeof n==='number');
    const avg=a=>a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):'—';
    box.append(el('div',{class:'meta'}, 'Confidence “I could redesign a workflow AI-native”: '+avg(cb)+' → '+avg(ca)+' / 10 (avg shift '+(ca.length&&cb.length?('+'+(avg(ca)-avg(cb)).toFixed(1)):'—')+')'));
    box.append(el('h4',{style:'margin-top:10px'},'Ahas'));
    all.filter(p=>p.aha).forEach(p=> box.append(el('blockquote',{class:'pulsequote'}, '“'+esc(p.aha)+'” ', el('span',{class:'meta'}, '— '+esc(p.name)+', '+esc(p.team)))));
  } else box.append(el('div',{class:'meta'},'No pulses in yet — they trickle in as people fill the 60-second card on their devices.'));
  if(commits.length){ box.append(el('h4',{style:'margin-top:10px'},'Commitments (Now-What)'));
    commits.forEach(c=> box.append(el('div',{class:'meta'}, glyph('g-flag')+' “'+esc(c.text)+'” — '+esc(c.name)+', '+esc(c.team)))); }
  return box;
}
```
Appended to `dash` inside the `share||closed` branch of `viewConsole` (after the stat row, index.html:2917). **Never projected** — it is on the Farrier's private console (CLAUDE.md rule #2; the room view is `viewRoom`, separate). Aggregates only across the Farrier's own room, no inter-team ranking.

### R2.5 Offline degradation (R2)
**Fully offline, zero AI.** The pulse is plain typed data through a WS message; the board is rule-based aggregation; the recap reads it rule-based. Nothing in R2 touches `/api/coach`. This is the cleanest item on rule #8.

---

## Leak filter analysis (HARD CONSTRAINT #4)

**The pre-reveal vocabulary rule (rule #2) governs team-facing surfaces BEFORE the reveal.** Both R1 and R2 fire only at `share`/`closed` — *after* the swap reveal, when secrecy is over (the double reveal IS the product, `buildViews` `open` flag). **Confirmed: there is no pre-reveal exposure path:**

1. **Server gates:** `commitment:submit` and `pulse:submit` both `return` unless `w.state==='share' || w.state==='closed'`. A member cannot write either field during `lobby/surface/rebuild`. So pre-reveal the fields are always `null`.
2. **Projection:** the widened member map carries `commitment`/`pulse` even on the pre-share `teamStub` — but those are `null` pre-share (point 1), so nothing leaks across teams pre-reveal. At share/closed all views are FULL by design.
3. **Recap copy:** the recap is built only at share/closed and downloaded by the participant; it is never a team-facing pre-reveal surface. Its prose ("redesign", "rebuild") is fine because **it post-dates the reveal** — those words are only banned *to the team before the surprise*. The AI `recap` intro still carries `${SECRECY}` defensively, but it is post-reveal so it is moot.

**The bigger leak concern the brief names: a recap generated while ANOTHER run is pending in the same workshop.** Analysis:
- A "pending run in the same workshop" would mean the Farrier *steps the same room back* from `share`/`closed` to `surface`/`rebuild` to run a second cohort, OR reuses the room. The phase machine allows `stepBack` (index.html:2773) and `phase:set` to any allowed phase (server.js:998).
- **Can a stale recap leak the hidden original to a future pre-reveal participant?** The recap is a **client-side download already in a past participant's hands** — it never lives on the server, so it cannot be served to a future participant. A future participant joining the same room gets a *fresh* per-role projection (stub'd other teams) — they never see the prior recap.
- **Can the recap BUTTON be visible to a pre-reveal participant if the room is stepped back?** Yes in principle — if the Farrier steps `share → surface` to re-run, a participant in the new `surface` would NOT see the recap button (it lives in `viewShare`/`viewClosed`, which only render at those phases). And `saveRecap` reads `state` at click time — at `surface` there is no `rebuilder`/`redesign`, so the facts are empty. **No leak: the button isn't rendered pre-reveal, and even if forced, the data it reads is the current (pre-reveal) state, which carries no other team's canvas.**
- **Residual (documented):** if a Farrier genuinely re-runs a cohort in the SAME room (rare, against the run-of-show), the *first* cohort's commitments/pulses persist on member objects until those members are removed or the room is swept. A new member joining a stepped-back room would not see them (they're on the prior members' objects, and pre-share other-member pulse is gated/null-by-time). The honest mitigation is the run-of-show norm "one cohort per room" + the 24/48h sweep. **Not a pre-reveal vocabulary leak; a data-hygiene edge.** (Flagged in the risk register R2-2.)

**Verdict:** no pre-reveal vocabulary leak path exists. Both features are post-Share/CLOSED by server gate; the recap is off-server and post-reveal.

---

## Suite safety

Current suites (per CLAUDE.md + tree): `e2e.js` (35), `e2e-playwright.js` (~64), `qa-fixcheck.js` (20), `qa-a11y.js` (~33), `qa-hostile.js` (~70). Goal: **all stay green with zero existing-check edits.**

| Suite | Touched? | Why it stays green |
|---|---|---|
| **e2e.js (35)** | No edit. | New WS cases (`commitment:submit`/`pulse:submit`) are never sent by e2e. New `/api/coach` `recap` branch is gated on `req.body.recap` — e2e's coach call doesn't set it → unchanged path. The `teamPublic` member-map gains `commitment`/`pulse` keys (both `null` in e2e, which asserts specific member fields `id`/`name`/`steed`/`online`, not key-exhaustiveness — verify: e2e reads member fields by name, never `Object.keys(member).length`). **No `ok()` changes.** |
| **e2e-playwright.js (~64)** | No edit. | Drives honest member/Farrier UIs through share/closed. The commitment/pulse/recap cards are new optional widgets in `viewShare`/`viewClosed` (not asserted by existing checks). The export buttons gain siblings (new testids); existing `export-workflow`/`export-rebuild`/`save-card`/`confirm-assumption` selectors are untouched and in the same place. |
| **qa-fixcheck.js (20)** | No edit. | Targets shipped fixes (debounced commits, keepOpen, etc.) — R1/R2 don't alter them; the new textareas REUSE the debounce idiom they enforce. |
| **qa-a11y.js (~33)** | No edit, but RE-RUN. | New interactive elements (2 commit/pulse textareas, 2 range sliders, recap buttons) must inherit a11y patterns: textareas get placeholders, sliders get `<label>` wrappers + visible value (above), buttons get text. Sliders need an `aria-label` or wrapping label text (provided). **This is the one suite to re-run carefully** (risk R-A11). |
| **qa-hostile.js (~70)** | **No edit to existing.** Add NEW checks (below). | The §16.2 stub-shape sweep asserts canvas/teardown/redesign ABSENCE on stubs — unaffected (I add member-keys, not those). The §16.4 authz matrix is a fixed message list — `commitment:submit`/`pulse:submit` are additive new rows. I add explicit checks for the new fields' phase-gate + self-authz + projection so the leak reasoning is test-locked, not assumed. |

**Minimal unavoidable suite edit: none.** All additive (two new gated WS cases, one gated `/api/coach` branch, two new member fields that are `null` until post-reveal submit, new optional client cards).

### New checks to add

**R1 (commitment) — qa-hostile.js, ~5:**
- H-R1-1: `commitment:submit` from a member during `surface` → `m.commitment` stays null (phase gate).
- H-R1-2: `commitment:submit` from a member during `share` → `m.commitment.text` set; in farrier view that member shows `commitment.text`.
- H-R1-3: `commitment:submit` with `text:'x'.repeat(9999)` → stored ≤400.
- H-R1-4: `commitment:submit` from a **pre-join** socket (no memberId) → no mutation.
- H-R1-5 (leak): during `surface`, member of team B's state has team A's members with `commitment:null` (no pre-reveal commitment exists to leak); during `share` everyone's view is FULL (commitments visible by design).

**R2 (pulse) — qa-hostile.js, ~5:**
- H-R2-1: `pulse:submit` during `rebuild` → no mutation (phase gate).
- H-R2-2: `pulse:submit` during `closed` with `confBefore:'9e9', confAfter:7.6, aha:'x'.repeat(9999)` → `confBefore:null` (NaN-rejected from non-finite-after-Number? `Number('9e9')` is finite → clamped to 10; assert `confBefore===10`), `confAfter:8` (rounded+clamped), `aha` ≤400. *(Clarify the clamp: `9e9`→10; a true non-numeric like `'x'`→null.)*
- H-R2-3: `pulse:submit` with `confBefore:-5, confAfter:42` → both clamped to 0 and 10.
- H-R2-4: member A cannot set member B's pulse (always writes `ws.memberId`) — fire from A's socket with no way to target B; assert B's pulse untouched.
- H-R2-5 (projection): at `share`, farrier view exposes `m.pulse` for all; functional check that `pulseBoard` aggregate counts match submissions.

**R1b (recap) — functional, ~3 (mostly client/structural; AI tier untested without a key, like A4/R24):**
- F-R1b-1: `buildRecapHTML(t)` on a completed share state returns a non-empty self-contained HTML string containing the team name, the myth ledger, and the commitments — no external `src=`/`href=` refs (assert the string has no `http`-scheme asset URLs → truly portable/offline).
- F-R1b-2: with `t.canvas.baseline={frequency:'40×/mo',cycleTime:'3d'}` (Batch-1 shape) → recap contains the value sentence; with baseline absent → no "undefined", sentence omitted.
- F-R1b-3: `POST /api/coach {recap:true, code:<valid>}` no key → 200, `degraded:true` (the recap proceeds rule-assembled). *(AI intro path untested without a key — carry A4/R24 forward.)*

### Build order (suggested, suites green between)
1. Server: `commitment:submit` + `pulse:submit` cases + `teamPublic` member-map widening → run e2e + H-R1/H-R2 checks (the projection + phase gates are the load-bearing part).
2. Client: `commitmentCard`/`pulseCard` + `editingLock` selector extension → playwright + a11y.
3. Client: `buildRecapHTML`/`saveRecap`/`copyRecapText` + `becameLine` extraction + share/closed buttons → F-R1b checks.
4. Farrier `pulseBoard` in `viewConsole` → playwright.
5. Server `SYSTEMS.recap` + `/api/coach` `recap` branch (AI tier, degrades) → F-R1b-3 + a11y full re-run.

---

## RISK REGISTER

| # | Risk | Likelihood | Blast | Mitigation |
|---|---|---|---|---|
| **R1-1** | **Recap "travels by link" expectation vs reality (a downloaded file, not a hosted URL).** | Certain (it's a file) | Stakeholder thinks "link" = URL | Honest in the doc: no email/persistence infra + 48h TTL forbids a server page. File + clipboard are the only TTL-surviving options. Clipboard summary is the lowest-friction "send your boss" path. |
| **R1-2** | Commitment beat read as a NEW phase / blocking gate (methodology rule #6/#7 strain) | Low (designed self-serve) | A gate that the Farrier's clock can't override | Self-serve card in share+closed; NO phase enum change, NO CTA, NO server gate that blocks `closed`; Farrier cues via RUNSCRIPT copy only. The timer always rules (rule #6). |
| **R1-3** | `becameLine` extraction from `raceCard` breaks the race card | Low | Race card text regresses | Pure refactor (extract the existing inline expression); race card + recap call one function; playwright `save-card` check guards it |
| **R1-4** | Blob/download blocked in a locked-down browser | Low | Recap won't save | Tertiary `window.open` fallback (exportPack path) + clipboard summary — three independent delivery tiers |
| **R1-5** | AI `recap` intro leaks pre-reveal vocabulary | Very low (post-reveal) | — | Post-Share by gate; `${SECRECY}` defensively; intro is optional and never blocks the rule-assembled recap |
| **R2-1** | **Projection widening adds `commitment`/`pulse` to the pre-share STUB members** | Designed safe | A field on other-team members pre-reveal | Both are `null` until a `share`/`closed` submit (server-gated) — nothing to leak pre-reveal; H-R1-5/H-R2 lock it; stub still lacks canvas/teardown/redesign (§16.2 sweep green) |
| **R2-2** | **Stale pulse/commitment persists if a room is stepped back & re-run with new members** | Very low (against run-of-show) | Prior cohort's data lingers on prior members | Data-hygiene edge, NOT a pre-reveal vocab leak; new members don't see prior members' post-reveal-only fields pre-reveal; 24/48h sweep + "one cohort per room" norm; Farrier `member:remove` |
| **R2-3** | Pulse drifts toward inter-team scoring (banned, product.md §2.1) | Low | Corrupts psychological safety | Board shows quotes + per-team confidence shift only; NO ranking, NO cross-team number; copy says "no scores, no comparisons" |
| **R2-4** | Confidence slider clamp ambiguity (`9e9` is finite → 10; `'x'` → null) | Low | Inconsistent stored values | Clamp spec'd explicitly: `Number()` then finite-check then 0–10 round/clamp; H-R2-2/H-R2-3 pin both branches |
| **R-A11** | New textareas/sliders/buttons fail a11y (slider labels, focus) | Low | qa-a11y red | Sliders wrapped in `<label>` with text + visible value; textareas have placeholders; buttons have text; **re-run qa-a11y after step 5** |
| **R-BUCKET** | Pulse/commitment spam | Very low | — | Rides the shipped per-socket `ws.bucket` (cap 120, refill 25/s) at server.js:755 — metered for free; idempotent last-write-wins means spam just re-sets the same field |
| **R-CHAT** | (none) — pulse/commitment do NOT touch `canvas.chat` | — | — | Unlike Batch-1's synth/whisper, R1/R2 write member fields, not chat; the wire-chat cap is untouched |
| **R-AI** | AI `recap` intro untested without a key (= A4/R24 gap) | Certain (no key in CI) | Recap intro prose quality | Rule-assembled recap is the always-correct floor; F-R1b-3 covers the gated/degraded path; keyed smoke is a manual pre-workshop step |
| **R-SAVE** | New member fields serialize into `workshops.json` | Certain | Cosmetic disk growth | Plain small strings/ints on members (same trust domain as `token`); clamped; swept with the room |

---

## Methodology strain — flagged honestly

1. **The commitment beat is phase-adjacent (the one strain, and it is mild).** It adds a step to the run-of-show that lives *only* in copy + a self-serve card — never in the server's phase enum, never as a gate. It honors rule #6 (the Farrier's timer always rules — the card is non-blocking) and rule #7 (the `lobby→surface→rebuild→share→closed` machine is untouched). The disciplined choice (self-serve in share+closed, no 6th phase) is what keeps the strain mild; a new phase would have been the wrong, high-blast answer.
2. **R2 confidence framing ↔ "no inter-team scoring" (product.md §2.1).** The slider measures *self* before/after, the board aggregates *within a team* and shows quotes — there is no number ranking teams against each other. The guard is structural (no cross-team comparison rendered anywhere) + copy ("no scores, no comparisons").
3. **Recap-as-file vs "linkable" (product.md R1 language).** Genuinely constrained by no email infra + no build step + the 48h TTL (DECISIONS.md). The honest, deployable answer is a self-contained downloadable HTML + clipboard summary — both survive the TTL because they leave the server. A hosted short-link is impossible without a persistence service the TTL decision forbids.

## Deferred / open decisions for the lead
- Recap AI intro: include the `SYSTEMS.recap`/`/api/coach recap` tier (recommended, degrades cleanly) vs ship rule-assembled-only first.
- Pulse/commitment also in `share` (recommended — captures while warm, covers timer-overrun) vs `closed`-only (literal to the brief).
- Should `copyRecapText` be the *primary* CTA (lowest friction "show your boss") with the `.html` save secondary? Recommend offering both, file first.
- 30-day resurfacing (R1c) remains explicit phase-2 — the take-home recap is its durable seed.
