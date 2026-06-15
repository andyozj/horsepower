# Batch 1 — Product-track Design Doc (R4 · R5 · R7)

**Status:** for adversarial lead review. **No app file has been edited.**
**Scope:** `server.js` (read in full, current hardened state) + `public/index.html` (client touch-points). Three approved IPO-review items: **R4** capture-ontology enrichment (systems + today-baseline), **R5** Coach instant-synthesis (cluster parking lot + end-of-phase synthesis), **R7** Farrier whisper-to-team.
**Hard premise:** the Cluster-A hardening (A1–A16, `docs/ipo-review/solutions/hardening-design.md`) is **shipped and live in the tree** — `sanitizeCanvas`/`sanitizeMeta`, `mergeCanvas`, per-role `buildViews`/`teamStub`/`teamOwn`/`capTeam`, the per-socket `ws.bucket`, `coachBuckets`, `isFarrier`, `LOCK_FIELDS`, atomic save, TTL sweep, `qa-hostile.js` (70 `ok()`s). Every design below is built **around** that machinery and must not regress it.
**Invariants honored:** no framework, no build step, no new runtime deps, trivially deployable. All three features are enrichment/optional and degrade to honest absence or rule-based fallback — the room never stalls (rule #8).

**Verified line anchors (current tree):**
- `sanitizeMeta` server.js:136-146 · `sanitizeCanvas` :147-182 · `BLOCK_TYPES` :128-129
- `governance()` :291-340 · `buildTeardown()` :345-389 · `lockedFromCanvas()` :399-411 · `performSwap()` :421-466
- `teamPublic()` :489-504 · `buildViews()` :535-551 · `teamStub` :520-522 · `teamOwn` :523-527 · `capTeam` :528-533 · `baseState` :509-515
- `/api/coach` :701-739 · `SYSTEMS` :611-630 · `SYSTEMS.structure` :632-634 · `clampProposal` :636-647 · `bankReply` :649-674 · `callAnthropic` :677-687
- `ws.on('message')` bucket :752-759 · `chat:post` :874-887 · `lock:resolve` :959-995 · `isFarrier` :743
- Client: inspector :1804-1829 · proposals shelf :2172-2201 · `buildCoachRail` :2243-2331 · `doSend` :2306-2328 · `buildCoachContext` :2343-2358 · `bubble` :2334-2342 · `rebuildOverlays` :2395-2402 · overlay render :1766-1786 · console table :2919-2938 (`whisper` col is a read-only computed hint, :2992-2997 — **R7 must not collide with it**) · `drillDown` :2998+ · `exportPack` :2683-2715 · `afterState` :1002+

---

## R4 — Capture ontology enrichment (systems + today-baseline)

### R4.0 Locked discipline (DECISIONS.md line 8, product.md R4)
Both halves are **strictly optional, never gate-blocking** — the Newcomer check (`governance()` `gate.checks`) must gain **zero** new `ok` conditions. The Coach asks for them **only** in the already-existing "polish while the room catches up" green-and-idle slot (gateBar `pol` chips, index.html:2218-2230). The baseline is **evidence of today**, never an ROI/feasibility judgment of the rebuild. Both flow into the teardown as raw material and into the export pack.

### R4a — `meta.system` (per-block "which system/data this lives in")

**Where it lives:** a new optional `meta.system` one-liner on **input / phase / agent** blocks, written through the existing inspector → `commit()` → `canvas:update` → server-`sanitizeMeta` path (the Slice-1 plumbing). No new message type.

#### Server (server.js)

**HARD CONSTRAINT #1 — sanitize allowlist (the load-bearing 1-liner).** Without this, `meta.system` is silently stripped on every commit (sanitizeMeta is an allowlist, server.js:136-146). Add inside `sanitizeMeta`, after the `capacity` line (server.js:141):

```js
  if (m.system != null)  out.system = str(m.system, 80);   // R4a: "which system/data this lives in"
```

Clamp 80 chars (same as `capacity`; one-liner). This is the **only** server change strictly required for R4a to persist.

**Teardown raw-material** — `buildTeardown()` already maps personas → `candidateConstraints`. Systems are constraint raw-material (product.md R4: "the agent acts inside Salesforce — who audits that?"). Add a **systems inventory** to the teardown without touching the locked-block seeding. Inside `buildTeardown()` (after the `people` array, server.js:374), add:

```js
  // R4a: systems/data the work lives in — constraint raw-material, NEVER step-attached (zero-leak safe:
  // a system name is an input fact, not a HOW step; mirrors the people-inventory exception, rule #3)
  const systems = canvas.blocks
    .filter(b => b.meta && b.meta.system && (b.type === 'input' || b.type === 'phase' || b.type === 'agent'))
    .map(b => ({ system: b.meta.system, on: b.type }))
    .filter((v, i, a) => a.findIndex(x => x.system.toLowerCase() === v.system.toLowerCase()) === i)  // dedupe
    .slice(0, 30);
```

and include it in the returned object (server.js:376-388) by adding `systems,` to the literal. **Methodology check:** a system name is an input/data fact (the existing `inputs` array already crosses into the brief), not a sequenced HOW step — it does NOT reintroduce the original layout. It is appended as **flat candidate raw-material**, deliberately NOT turned into `contextCards` overlays unless the lead wants them (keeping the teardown's "abstract brief" character, rule #3).

**Optionally** surface systems as candidate-constraint context (decision for the lead — I recommend a light touch): append to `candidateConstraints` a `system`-typed entry so the rebuild's "pressure-test me" cards can include "this ran inside [System] — is that a real constraint or just where it happened to live?" If chosen, add after the persona-derived `candidateConstraints` map (server.js:366):

```js
  systems.forEach(s => candidateConstraints.push({
    id: 'c-sys-' + s.system.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,12),
    text: s.system, capacity: 'system/data', verdict: 'candidate',
    why: 'the work lived in this system — pressure-test whether that constrains the AI-native design or was just where it happened to run'
  }));
```

This is **provoke-not-solve safe**: it organizes a captured fact into a challenge, it does not design.

#### Client (public/index.html)

**Inspector field** — extend the inspector (index.html:1804-1829) to show a `system` one-liner for input/phase/agent blocks, beside the existing WHY textarea. The inspector currently shows capacity (personas only) + WHY (all). Add, after the WHY textarea append (index.html:1826), gated on block type:

```js
        if(sb.type==='input'||sb.type==='phase'||sb.type==='agent'){
          insp.append(el('label',{},'which system / data?'));
          const si=el('input',{class:'sysin','data-testid':'inspector-system', placeholder:'e.g. Salesforce, the shared drive, email', maxlength:'80'});
          si.value=(sb.meta&&sb.meta.system)||'';
          const commitSys=()=>{ const v=si.value.trim().slice(0,80); if(((sb.meta&&sb.meta.system)||'')!==v){ sb.meta=sb.meta||{}; sb.meta.system=v; commit(); } };
          si.addEventListener('blur',commitSys);
          let sysT; si.addEventListener('input',()=>{ clearTimeout(sysT); sysT=setTimeout(commitSys,900); });   // debounced — device-death data-loss guard (critic-loop lesson)
          si.addEventListener('keydown',e=>e.stopPropagation());
          insp.append(si);
        }
```

Mirrors the WHY textarea's exact debounce+blur+stopPropagation idiom (so it inherits the `editingLock` focusin/focusout handling at index.html:970-971 — extend that selector to include `.inspector .sysin`: change `.inspector textarea` → `.inspector textarea, .inspector .sysin` on both lines). New testid: `inspector-system`. The `.sysin` style reuses `.inspector textarea` sizing (one CSS line: `.inspector .sysin{font-size:12px; padding:6px 8px; width:100%}`).

**Coach polish-slot prompt (the ONLY place the Coach asks)** — add ONE chip to the gate-green `pol` strip (index.html:2222-2227), shown only when systems are sparse. Compute beside the existing chips:

```js
    const t0=myTeam(); const bl=(t0&&t0.canvas.blocks)||[];
    const sysGap=bl.some(b=>(b.type==='input'||b.type==='phase'||b.type==='agent')&&!(b.meta&&b.meta.system));
    if(sysGap) pol.append(el('button',{class:'chip', onclick:()=>{ ui.railOpen=true; ui.prefillCoach='Which systems or data does this workflow actually live in? Walk me through it.'; render(); }},'Name the systems it lives in'));
```

This rides the existing `ui.prefillCoach` channel (no new state). It appears **only at gate-green** (the polish slot), satisfying the locked discipline.

**Coach context** — feed systems into the surface context so a live Coach can probe them (enrichment only). In `buildCoachContext` surface branch (index.html:2349), append to `whyGaps` line:

```js
    const sysList=bl.filter(b=>b.meta&&b.meta.system).map(b=>b.meta.system).join('; ')||'none named';
    // ...append `; SYSTEMS: ${sysList}` to the returned context string
```

#### Offline degradation (R4a)
Fully offline. `meta.system` is plain captured data — inspector writes it, sanitize persists it, `buildTeardown` reads it, export renders it. The only AI-touched surface is the optional Coach probe, which degrades to the bank like every other coach call (no new path). **No AI dependency anywhere in R4a.**

---

### R4b — Workflow-level today-baseline (frequency + cycle-time)

**Decision: where it lives.** Two options:
- (i) a **canvas-level field** `canvas.baseline = {frequency, cycleTime}`, or
- (ii) `meta` on the trigger block.

**Choose (i), a canvas-level field.** Rationale: the baseline is a property of the *whole workflow*, not of one block; it must survive even if the team deletes/re-adds the trigger; and putting it on the trigger means it would be **seeded into the rebuild as a locked-block meta and leak HOW-adjacent timing into the rebuild map** (the trigger is one of the locked seeds, server.js:449) — a methodology violation (the baseline is Surface-only evidence; it must NOT travel onto the rebuild canvas, only into the teardown brief). A canvas-level field is teardown-routable without riding the locked seeds.

#### Server (server.js)

**HARD CONSTRAINT #1 (baseline half) — sanitizeCanvas must preserve a NON-block, NON-meta field.** `sanitizeCanvas` (server.js:147-182) is a strict allowlist that returns a fresh `emptyCanvas()` and only copies blocks/arrows/orphans/glossary — **a top-level `baseline` would be silently dropped.** Two coordinated edits:

1. `emptyCanvas()` (server.js:117-125) — add the field so it always exists:
```js
    baseline: { frequency: '', cycleTime: '' },   // R4b: today-baseline (evidence of today, never an ROI verdict)
```

2. `sanitizeCanvas()` — before `return c;` (server.js:181), copy a clamped baseline through:
```js
  if (input.baseline && typeof input.baseline === 'object') {
    c.baseline = { frequency: str(input.baseline.frequency, 80), cycleTime: str(input.baseline.cycleTime, 80) };
  }
```

**HARD CONSTRAINT (chat/baseline preservation across merge).** `mergeCanvas` (server.js:202-213) builds a fresh `emptyCanvas()` `out` and only sets blocks/arrows/orphans/glossary/chat — it would **wipe the baseline** on every merged commit (knownIds path). Add to `mergeCanvas`, before `return out;` (server.js:212):
```js
  out.baseline = clean.baseline || serverCanvas.baseline || out.baseline;   // single-writer; LWW (like glossary)
```
And the `canvas:update` caller already does `clean.chat = team.canvas.chat` (server.js:869) — baseline rides inside `clean` from sanitize, so the legacy (no-knownIds) path is already correct (`mergeCanvas` returns `clean` verbatim when knownIds absent, server.js:203). The redesign canvas does NOT carry a baseline (it is Surface-only) — `redesign:update`'s sanitize will just produce an empty default baseline on the rebuild canvas, harmless and unread.

**Teardown anchor** — `buildTeardown(canvas)` (server.js:345) receives the surface canvas, so `canvas.baseline` is in scope. Add to the returned `brief` (server.js:377-381):
```js
      baseline: canvas.baseline && (canvas.baseline.frequency || canvas.baseline.cycleTime)
        ? { frequency: canvas.baseline.frequency, cycleTime: canvas.baseline.cycleTime } : null,
```
This makes the brief say "today this runs [frequency], taking [cycleTime]" — the "today costs X" anchor (product.md R4). **Methodology guard:** it is phrased and consumed as *the original's today*, never as a target/ROI bar for the rebuild (rule: "the redesign is deliberately unicorn"). The rebuild Coach system prompt is NOT told to compare against it (no `SYSTEMS.rebuild` change) — it is brief context only.

#### Client (public/index.html)

**Where the team enters it.** One unobtrusive line on the Surface canvas, NOT a gate item. Reuse the dismissible `goalNote` pattern slot or add a small "baseline strip". Cleanest: a one-line widget appended in `viewSurface` near the gate bar. Add a `baselineStrip(t)` helper rendered in surface only:

```js
function baselineStrip(t){
  const b=(t.canvas.baseline)||{frequency:'',cycleTime:''};
  const wrap=el('div',{class:'baselinestrip','data-testid':'baseline-strip'});
  wrap.append(el('span',{class:'caveat'},'today (optional): '));
  const mk=(k,ph)=>{ const i=el('input',{placeholder:ph, maxlength:'80', value:b[k]||''});
    const save=()=>{ const c=t.canvas; c.baseline=c.baseline||{frequency:'',cycleTime:''}; if((c.baseline[k]||'')!==i.value.trim()){ c.baseline[k]=i.value.trim().slice(0,80); wsSend({type:'canvas:update',canvas:c}); } };
    i.addEventListener('blur',save); let bt; i.addEventListener('input',()=>{clearTimeout(bt);bt=setTimeout(save,900);}); i.addEventListener('keydown',e=>e.stopPropagation()); return i; };
  wrap.append(el('span',{},'runs '), mk('frequency','e.g. 40×/month'), el('span',{},' · takes '), mk('cycleTime','e.g. 3 days'));
  return wrap;
}
```

Rendered in `viewSurface` beside the goalNote (one append). It is visually a side-note, never a gate chip, so the Newcomer check is untouched. **The baseline input must NOT appear in `viewRebuild`** (the rebuild canvas has no baseline and showing one would suggest a target). Testid `baseline-strip`.

**Coach polish prompt** — extend the same gate-green `pol` strip with one more conditional chip:
```js
    if(!(t0.canvas.baseline&&(t0.canvas.baseline.frequency||t0.canvas.baseline.cycleTime)))
      pol.append(el('button',{class:'chip', onclick:()=>{ ui.railOpen=true; ui.prefillCoach='How often does this run today, and how long does one cycle take? Just today’s numbers — not a target.'; render(); }},'Capture today’s numbers'));
```
The prompt copy itself enforces "today's numbers, not a target."

**Export pack** — `exportPack` (index.html:2683) already pulls from the rebuilder's redesign + original canvas. Add a "Today (baseline)" line to the Before page (index.html:2708). The original team's `canvas.baseline` is on `originalTeam.canvas`:
```js
   ${originalTeam&&originalTeam.canvas.baseline&&(originalTeam.canvas.baseline.frequency||originalTeam.canvas.baseline.cycleTime)
     ? `<p style="color:#66708a"><b>Today:</b> runs ${esc(originalTeam.canvas.baseline.frequency||'—')} · takes ${esc(originalTeam.canvas.baseline.cycleTime||'—')}</p>` : ''}
```
inserted in the Before `.page`. **Export framing guard:** it is on the *Before* page labelled "Today", never on the After page — it reads as evidence of the old world, not a scorecard for the new one.

#### Offline degradation (R4b)
Fully offline. Baseline is plain typed data through the canvas path; teardown and export read it rule-based. The only AI surface is the optional polish prompt (degrades to bank). **No AI dependency.**

---

### HARD CONSTRAINT #2 for R4 — per-role projection (A2)
Both `meta.system` and `canvas.baseline` ride **inside the team's own canvas**. The projection matrix: a member's OWN team view is FULL-minus-own-teardown (`teamOwn`, server.js:523-527 — only nulls `teardown`); the canvas (with its meta + baseline) reaches the owning member correctly. **The teardown consumer** is: (a) the Farrier brief-preview (FULL view, reads `teamPublic.teardown` which now carries `systems` + `brief.baseline`); (b) the rebuilding team's `redesign.teardown` (set at `performSwap`, server.js:455 — snapshotted from `source.teardown`, so it carries the new fields automatically). **Cross-phase check:** systems/baseline are computed into the teardown at `maybePrecomputeTeardown` (gate-green, server.js:414-418) and re-frozen at `performSwap`. The STUB view (`teamStub`, server.js:520-522) carries neither canvas nor teardown — so **a system name or baseline never leaks to another team pre-share** (rule #2/#3). No projection change needed; R4 fields are carried by the existing canvas/teardown plumbing. **`qa-hostile.js` §16.2 leak sweep already asserts the stub shape** — adding fields *inside* canvas/teardown does not widen the stub, so that sweep stays green.

### R4 — offline summary
Both halves are 100% offline-capable, rule-based, no AI dependency. This is the strongest match to rule #8 of the three features.

---

## R5 — Coach instant-synthesis

Two enrichment-only AI moves. **Both must degrade.** Decision per the brief ("rule-based fallback or honest absence — match existing dump→map behavior"):
- **R5a (parking-lot clustering): honest absence offline.** Matches the existing dump→map rule exactly: when the Coach is offline, long dumps do NOT auto-structure (index.html:2324-2325 shows an honest toast, deliberately does NOT auto-park as orphans). Clustering is the same class of generative move — offline shows nothing (no fake clusters), because a rule-based theme-clusterer would either be trivially keyword-bucketing (which mis-organizes and violates "organize what they SAID" by guessing) or would need NLP we don't have. Honest absence is the disciplined choice.
- **R5b (end-of-phase synthesis): rule-based fallback.** A 4-line synthesis CAN be assembled rule-based from the canvas (it already is, half-built: `summarizeCanvas`, `governance`, `judgeLedger`, `buildDiff` all produce structured factual lines offline). So R5b degrades to a **rule-assembled** 4-line synthesis — useful offline, matching `buildDiff`'s rule-based share narration.

### R5a — Cluster the parking lot (≥4 orphans → theme-cluster proposals)

**Reuses the EXISTING proposals shelf and `/api/coach` structure path.** Nothing auto-applies (rule #9).

#### Server (server.js)

A new structure sub-mode on `/api/coach`. The existing structure path (server.js:722-731) is gated on `req.body.structure && m === 'surface'`. Add a sibling **cluster** mode. Add a new system prompt beside `SYSTEMS.structure` (server.js:634):

```js
SYSTEMS.cluster = `You organize a team's parking-lot of unmapped notes about their CURRENT workflow into named theme-clusters. You ORGANIZE what they already said — you never invent, design, or solve.
Output ONLY valid JSON: {"reply":"<one short sentence>","proposal":{"clusters":[{"name":"<2-4 word theme>","items":["<verbatim-ish note>", ...]}]}}
Rules: every item must come from the supplied notes (paraphrase lightly, never add new ones); 2-5 clusters; a note may sit in only one cluster; leave genuinely unrelated notes out. Never reference swapping, redesigning, or any "newcomer/stranger" framing. ${SECRECY}`;
```

A `clampClusters` helper beside `clampProposal` (server.js:647):

```js
function clampClusters(p) {
  if (!p || !Array.isArray(p.clusters)) return null;
  const clusters = p.clusters.filter(c => c && c.name && Array.isArray(c.items) && c.items.length)
    .slice(0, 5).map(c => ({ name: String(c.name).slice(0, 40),
      items: c.items.filter(Boolean).slice(0, 12).map(x => String(x).slice(0, 200)) }))
    .filter(c => c.items.length);
  return clusters.length ? { clusters } : null;
}
```

In `/api/coach`, **inside the existing `try` block**, add a branch that goes through the **SAME gate + bucket + timeout** as the structure path (it is already past the `coachBuckets` gate at server.js:709-710, and `callAnthropic`/`callAzure` already carry `AbortSignal.timeout`, server.js:682/694). Add before the `req.body.structure` branch (server.js:722):

```js
    // R5a: parking-lot clustering — proposals only (rule #9). Same gate/bucket/timeout as every coach call.
    if (req.body.cluster && m === 'surface') {
      const raw = AI_PROVIDER === 'azure' ? await callAzure(SYSTEMS.cluster, chat) : await callAnthropic(SYSTEMS.cluster, chat);
      try {
        const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
        const clusters = clampClusters(j.proposal);
        if (clusters) return res.json({ reply: String(j.reply || 'Here’s how those parked notes group up.').slice(0, 300), clusters });
      } catch (pe) { /* fall through */ }
      return res.json({ reply: 'I couldn’t group those cleanly — they may already be distinct.', degraded: true });
    }
```

**HARD CONSTRAINT #4 — metered + gated + timeout.** This call sits *after* the `if (!AI_PROVIDER) return bank` (server.js:705), *after* the `if (!room) return bank` (server.js:708), and *after* `takeToken(coachBuckets.get(room.code))` (server.js:710) — so a clustering request **spends a coach token** exactly like any other provider call and degrades to the bank/honest-absence when the bucket is empty, no room, or no key. `callAnthropic`/`callAzure` carry `COACH_TIMEOUT_MS`. It is the same provider path (A4) — confirmed metered.

#### Client (public/index.html)

**Trigger:** when the parking lot holds ≥4 orphans, surface a "group these?" affordance in the orphan tray (index.html:2202-area, near the proposals shelf render). It fires a coach call with `cluster:true` and the orphan texts as the dump. Add to the orphan tray, after the proposals-shelf block (index.html:2201):

```js
  if((t.canvas.orphans||[]).length>=4 && !ui.pendingProposals && state.state==='surface'){
    tray.append(el('button',{class:'btn sm subtle','data-testid':'cluster-orphans', onclick:async()=>{
      const notes=(t.canvas.orphans||[]).map(o=>o.text).join('\n');
      const r=await fetch('/api/coach',{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({mode:'surface', cluster:true, code:me.code,
          messages:[{role:'user',content:'Group these parked notes into themes:\n'+notes}]})});
      const d=await r.json();
      if(d.clusters){ ui.pendingClusters={teamId:me.teamId, clusters:d.clusters}; wsSend({type:'chat:post',role:'assistant',content:d.reply}); render(); }
      else toast('Coach is offline — group the parked notes by hand for now.',true);   // honest absence
    }},'Group the parked notes ('+ (t.canvas.orphans||[]).length +')'));
  }
```

**Render clusters as proposals on the EXISTING shelf idiom** — a `ui.pendingClusters` shelf rendered alongside the proposals shelf. Each cluster is a NAMED group of the team's own orphan chips; accepting it creates ONE `phase` block named after the theme and parks the items under it (or, more conservatively, just relabels — **decision for the lead**: I recommend "create a phase block named [theme]" because clustering-toward-a-phase is the methodology's natural move, product.md R5 "these 5 are all about approvals — one phase?"). Accept/dismiss buttons mirror `proposal-place`/`proposal-dismiss` (index.html:2193-2194). The cluster proposal **never auto-applies** — a human clicks accept (rule #9). New testids: `cluster-shelf`, `cluster-accept`, `cluster-dismiss`.

**Provoke-not-solve guard (methodology):** the cluster names organize what the team SAID (their orphan texts); the Coach does not add new content or design the phase internals — it only proposes a grouping + name. The accept action creates an empty phase block the team then fills. This respects rule (product.md R5): "clusters organize what the team said; they don't design."

**Pre-reveal vocab guard:** `SYSTEMS.cluster` carries `${SECRECY}` and forbids newcomer/stranger framing; the client copy ("Group the parked notes") contains no banned words.

#### Offline degradation (R5a)
Honest absence (the brief-sanctioned choice, matching dump→map): no key / no bucket / no room / parse-fail → the button shows a toast and the team groups by hand. No fake clusters. The parking lot and manual placement (already shipped) keep working.

### R5b — End-of-phase synthesis (gate-green + Rebuild ✓-complete)

A 4-line Coach synthesis of the team's map, shown at gate-green (Surface) and at Rebuild ✓-complete (all people landed). **Degrades to rule-based assembly.**

#### Server (server.js)

Add a `synth` mode to `/api/coach` (live path) + a rule-based assembler used both as the offline fallback AND when the AI path degrades. New system prompt beside `SYSTEMS.share` (server.js:630):

```js
SYSTEMS.synth = `You write a tight 4-line synthesis of a team's workflow map, for them to read aloud in prep. Line 1: what this workflow exists to do (its intent, in plain words). Line 2: who it serves / who's accountable. Line 3: where the energy or friction concentrates. Line 4: one honest question to carry forward. Max 4 lines, no preamble, reference their actual content. ${SECRECY}`;
```

Rule-based fallback assembler (used when no AI / degraded — beside `buildDiff`, server.js:486). It reads structured facts already on the canvas:

```js
// R5b: a 4-line synthesis assembled from rule-based facts (offline + degrade fallback). NEVER blocks anything.
function synthLines(canvas, mode) {
  const t = ty => (blocksOfType(canvas, ty)[0] || {}).text || '';
  const personas = blocksOfType(canvas, 'persona');
  const acct = personas.find(p => /accountable|approve|served|decide/i.test((p.meta && p.meta.capacity) || ''));
  const pains = canvas.blocks.filter(b => b.pain).map(b => b.text).filter(Boolean);
  const agents = blocksOfType(canvas, 'agent').length;
  const lines = [];
  lines.push(t('intent') ? `This exists to: ${t('intent')}.` : `Its purpose isn’t spelled out yet — name the decision it drives.`);
  lines.push(acct ? `Accountable: ${acct.text}.` : (personas[0] ? `Owned by ${personas[0].text}.` : `No clear owner yet.`));
  lines.push(pains.length ? `Friction lives in: ${pains.slice(0,2).join('; ')}.` : `No pain points flagged — is it really that smooth?`);
  lines.push(mode === 'rebuild'
    ? (agents ? `${agents} agent block${agents===1?'':'s'} now act where humans used to — does each have a catch?` : `No agents yet — where could the system act, not just assist?`)
    : `Carry forward: what would a newcomer still get wrong?`);
  return lines.join('\n');
}
```

In `/api/coach`, add a branch (inside try, after the cluster branch). It is **already metered/gated** (same place, past the bucket). On any failure the outer catch returns `bankReply` — but for synth we want the **rule-based** fallback, so branch explicitly:

```js
    if (req.body.synth) {
      const room2 = room;   // already resolved above
      const team = room2 && room2.teams.find(t => t.id === req.body.teamId);
      const canvas = team ? (req.body.synthMode === 'rebuild' && team.redesign ? team.redesign.canvas : team.canvas) : null;
      if (!canvas) return res.json({ reply: '', degraded: true });
      try {
        const reply = AI_PROVIDER === 'azure' ? await callAzure(SYSTEMS.synth, chat) : await callAnthropic(SYSTEMS.synth, chat);
        return res.json({ reply: String(reply).slice(0, CONFIG.COACH_REPLY_MAX), synth: true });
      } catch (e) {
        return res.json({ reply: synthLines(canvas, req.body.synthMode === 'rebuild' ? 'rebuild' : 'surface'), degraded: true, synth: true });
      }
    }
```

Note: when `!AI_PROVIDER`, the early return at server.js:705 fires `bankReply` BEFORE this branch — which would give a generic bank line, not a synthesis. To make the **no-key path** also produce the rule-based synthesis, add ONE guard at the top of the handler, before the `if (!AI_PROVIDER)` line (server.js:705):

```js
  if (req.body.synth && (!AI_PROVIDER || !workshops.get(String(req.body.code||'').toUpperCase()))) {
    const room0 = workshops.get(String(req.body.code||'').toUpperCase());
    const team0 = room0 && room0.teams.find(t=>t.id===req.body.teamId);
    const cv0 = team0 ? (req.body.synthMode==='rebuild'&&team0.redesign?team0.redesign.canvas:team0.canvas) : null;
    return res.json({ reply: cv0 ? synthLines(cv0, req.body.synthMode==='rebuild'?'rebuild':'surface') : '', degraded: true, synth: true });
  }
```

**HARD CONSTRAINT #4:** the live synth path is past the same `coachBuckets` gate + uses `callAnthropic`/`callAzure` (timeout-wrapped). The no-key path returns rule-based content (free, deterministic — the degradation path IS the product). Metered + gated + timeout: confirmed.

#### Client (public/index.html)

**Surface gate-green:** add to the `pol` polish strip (index.html:2218) a "Read us back our map" chip that calls `/api/coach` with `synth:true, synthMode:'surface', teamId:me.teamId` and posts the reply as a coach bubble (so it lands in the rail, readable in share prep). It's a pull, not a push — never auto-fires (matching "pull, not gate", product.md R5).

**Rebuild ✓-complete:** the `landPill` flips to "Build complete" when all landed (index.html:2439). Add a one-time synthesis offer there (gated on a `ui.synthOffered` flag so it fires once, mirroring the existing one-time `revealShown`/`furlongShown` idioms). A small "Hear your design back" button beside the done-pill that calls synth with `synthMode:'rebuild'`.

Both render the 4 lines as a normal coach `assistant` bubble (index.html:2338 already splits on `\n` into lead + body — 4 lines render cleanly). No new bubble type.

**Pre-reveal vocab guard:** `SYSTEMS.synth` carries `${SECRECY}`; the rule-based `synthLines` copy contains no banned words (verified: "newcomer" is the *allowed* gate vocabulary; no swap/redesign/stranger/transfer).

#### Offline degradation (R5b)
Rule-based `synthLines` — a genuinely useful 4-line synthesis from canvas facts, no AI needed. Matches `buildDiff`'s offline share narration. Never blocks (it's a pull-button; if it returns empty string the client shows nothing).

### HARD CONSTRAINT #5 for R5 — broadcast/wire-chat impact
R5a posts the cluster `reply` and R5b posts the synthesis as `chat:post role:'assistant'` — these append to `canvas.chat`, which is **already capped to 30 on the wire** by `capChat` (server.js:516-518) and 200 in store (server.js:885). Each feature adds at most ~1 assistant message per invocation. **No new broadcast state** (clusters live in client `ui.pendingClusters`, never on the server — like `ui.pendingProposals`; the synthesis is just a chat line). `buildViews`/`teamPublic` unchanged. Wire-chat cap absorbs the extra lines.

---

## R7 — Farrier whisper-to-team

A one-line message from the console to ONE team's screens, rendered as a distinguished **Farrier note** in their Coach rail. New WS message type. Vocab-linted **client AND server** (rule #4).

**Naming caution (verified):** the console table already has a read-only computed "Coach whisper" column (`whisper(t)`, index.html:2992-2997) — that is a *hint string*, not a send. R7's new feature is **`farrier:whisper`** (a real send) and its UI must be visually distinct from that column to avoid operator confusion. Compose box lives in `drillDown` (the per-team console view, index.html:2998+), beside the roster surgery — NOT in the table column.

### Server (server.js)

**New WS message type `farrier:whisper`.** Add a case in the `ws.on('message')` switch (alongside `present:set`, server.js:1033):

```js
      case 'farrier:whisper': {
        if (!isFarrier(ws)) return;                                  // HARD CONSTRAINT #3a: Farrier-only authz
        const team = findTeam(w, msg.teamId);
        if (!team) return;
        let text = String(msg.text || '').slice(0, 240).trim();      // HARD CONSTRAINT #3d: length clamp (240)
        if (!text) return;
        if (BANNED_VOCAB.test(text)) {                               // HARD CONSTRAINT #3c: server-side vocab lint
          return send(ws, { type: 'error', error: 'That message names the surprise — rephrase (no swap/redesign/rebuild/handoff/stranger/transfer).' });
        }
        const target = (w.state === 'rebuild' && team.redesign) ? team.redesign.canvas : team.canvas;
        target.chat = target.chat || [];
        target.chat.push({ role: 'farrier', ts: Date.now(), content: text });   // distinguished role
        if (target.chat.length > 200) target.chat = target.chat.slice(-200);
        log('whisper', { code: w.code, team: team.id });
        broadcast(w); break;
      }
```

**The banned-vocab regex** (the pre-reveal vocabulary filter, CLAUDE.md rule #2). Define beside `SECRECY` (server.js:609):

```js
// Pre-reveal vocabulary lint (rule #2) — used by R7 server-side AND mirrored client-side.
const BANNED_VOCAB = /\b(swap|swapped|redesign|rebuild|rebuilt|hand[\s-]?over|handoff|hand[\s-]?off|receiving team|stranger|transfer|transferred)\b/i;
```

**HARD CONSTRAINT #3 — all four sub-requirements addressed:**
- **3a Farrier-only authz:** `if (!isFarrier(ws)) return;` (first line, identical idiom to `present:set`/`phase:set`).
- **3b per-socket rate-limit bucket:** `farrier:whisper` arrives through the SAME `ws.on('message')` handler, which takes a token at server.js:756 (`takeToken(ws.bucket)`) **before** the switch — so it is metered exactly like every other WS message, no extra code. Confirmed metered.
- **3c server-side vocab lint:** `BANNED_VOCAB.test(text)` → `error` reply, no broadcast (never trust the client's lint).
- **3d content length clamp:** `.slice(0, 240)` (a one-line note; 240 is generous for one sentence, far under the 4000 chat clamp).

**A new chat role `'farrier'`.** This is distinct from the `'system'` role (which `chat:post` lets only the Farrier mint, server.js:882-883). Note `chat:post`'s role coercion (server.js:882-883) does NOT need to change — whispers come through the dedicated `farrier:whisper` case, not `chat:post`. But for completeness, a member firing `chat:post role:'farrier'` would currently fall through to `'user'` (the ternary at server.js:882 only matches `'assistant'`/`'system'`) — **good, members cannot forge a farrier note via chat:post.** Verify: `let role = msg.role === 'assistant' ? 'assistant' : (msg.role === 'system' ? 'system' : 'user');` — `'farrier'` → `'user'`. Confirmed un-forgeable. (Add a one-comment note there for the maintainer.)

### Client (public/index.html)

**Compose box in `drillDown`** (index.html:3005-area, in the per-team ctrls/roster region). A small input + send, with **client-side vocab lint** (HARD CONSTRAINT #3 client half, rule #4 "lint client-side AND server re-checks"):

```js
function whisperBox(t){
  const box=el('div',{class:'whisperbox card', style:'margin-top:12px'});
  box.append(el('h3',{html: glyph('g-flag')+' Whisper to '+esc(t.name)}));
  const inp=el('input',{placeholder:'one line to their Coach rail — e.g. “your trigger is still empty, 5 min left”', maxlength:'240','data-testid':'whisper-input'});
  const warn=el('div',{class:'meta', style:'color:var(--pain); min-height:16px'});
  const BANNED=/\b(swap|swapped|redesign|rebuild|rebuilt|hand[\s-]?over|handoff|hand[\s-]?off|receiving team|stranger|transfer|transferred)\b/i;
  const send=()=>{ const v=inp.value.trim(); if(!v) return;
    if(BANNED.test(v)){ warn.textContent='That names the surprise — rephrase before it reaches the team.'; return; }
    wsSend({type:'farrier:whisper', teamId:t.id, text:v}); inp.value=''; warn.textContent=''; toast('Whisper sent to '+t.name); };
  inp.addEventListener('input',()=>{ warn.textContent = BANNED.test(inp.value)?'Heads-up: that word names the surprise — it’ll be blocked.':''; });
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); send(); } });
  box.append(inp, el('button',{class:'btn sm primary','data-testid':'whisper-send', onclick:send}, 'Whisper'), warn);
  return box;
}
```

Rendered in `drillDown` (append after the roster card). The console is **never projected** (CLAUDE.md rule #2 — only the room view) so the honest compose box is safe on the Farrier's private screen. Testids: `whisper-input`, `whisper-send`.

**Render the Farrier note in the Coach rail** — `bubble()` (index.html:2334) handles roles. Add a branch for `'farrier'` at the top, distinguished from `sys`:

```js
  if(m.role==='farrier') return el('div',{class:'bubble farriernote','data-testid':'farrier-note', html: glyph('g-flag')+'<b>From the Farrier:</b> '+esc(m.content)});
```

CSS (one rule, distinct from `.bubble.sys`): a lock-purple/ink-edged note so it reads as authoritative-not-coach:
```css
.bubble.farriernote{background:var(--wash-lock); border:1.5px solid var(--lock); color:var(--ink); font-weight:500}
.bubble.farriernote .glyph{width:14px;height:14px;vertical-align:-2px;margin-right:4px}
```

The note flows into the rail's `msgs` and triggers the unread badge (`buildCoachRail` counts unread on `m.role==='assistant'`, index.html:2247 — **extend to count farrier notes too**: change the filter to `m=>m.role==='assistant'||m.role==='farrier'` so a collapsed-rail member sees the unread badge breathe for a whisper). This is the only `buildCoachRail` change.

**Pairs with "Needs you" triage** (product.md R7): the triage queue (`needsYou`, console) already routes the Farrier to `ui.drillTeamId=it.t.id` (index.html:2904) — which now lands them on the whisper box. No code needed; the affordances compose.

### HARD CONSTRAINT #2 for R7 — per-team projection (no cross-team / pre-reveal leak)
The whisper lands in `team.canvas.chat` (or `team.redesign.canvas.chat` in rebuild). Projection routes it correctly **for free**:
- Member of team T: gets `teamOwn(T)` (FULL-minus-own-teardown) → reads `canvas.chat` incl. the farrier note. ✓ reaches T.
- Member of team U: gets `teamStub(T)` — **no canvas, no chat** → the whisper to T is invisible to U. ✓ no cross-team leak.
- Farrier: FULL view, sees all (expected). ✓
- At share/closed: all-FULL (double reveal) — but whispers are a Surface/Rebuild facilitation tool; a stale note in chat history at share is harmless (it was the team's own note). The wire-chat cap (30) means old whispers age out.

**The matrix cannot leak a whisper cross-team or pre-reveal** because the stub carries no chat. No `buildViews`/`teamStub` change required. `qa-hostile.js` §16.2 leak sweep (stub shape) stays valid.

### HARD CONSTRAINT #3 (recap, all four named)
- **Farrier-only authz:** `isFarrier(ws)` guard. ✓
- **Per-socket rate-limit bucket:** rides `ws.bucket` `takeToken` at the top of `ws.on('message')` (server.js:756). ✓ metered.
- **Server-side vocab lint:** `BANNED_VOCAB.test(text)` → error, no broadcast. ✓
- **Content length clamp:** `.slice(0, 240)`. ✓

### HARD CONSTRAINT #5 for R7 — broadcast/wire-chat
A whisper is one `canvas.chat` entry → absorbed by the 30-msg `capChat` wire cap (server.js:516) + 200 store cap. No new top-level broadcast state. `buildViews`/`teamPublic` unchanged. The new `'farrier'` role is just chat content — it serializes inside the existing canvas blob.

### Offline degradation (R7)
**Fully offline.** R7 is pure WS routing + a chat line — zero AI involvement. It works identically with no key. (It is the cleanest of the three on rule #8.)

---

## Suite safety

Current suites (per CLAUDE.md + tree): `e2e.js` (35 `ok()`s), `e2e-playwright.js` (~64 UAT), `qa-fixcheck.js` (20), `qa-a11y.js` (~33), `qa-hostile.js` (70). Goal: **all stay green with zero existing-check edits.**

| Suite | Touched? | Why it stays green |
|---|---|---|
| **e2e.js (35)** | No edit. | New server fields are **additive**: `sanitizeMeta` gains `system` (e2e canvases don't send it → absent → fine); `emptyCanvas` gains `baseline` (e2e never asserts canvas key-completeness — it reads specific fields); `buildTeardown` gains `systems`/`brief.baseline` (e2e asserts teardown *presence* + specific brief fields, not exhaustive shape — verify: e2e teardown checks read `candidateConstraints`/`people`, both unchanged). New `/api/coach` branches are gated on `req.body.cluster`/`synth` — e2e's one coach call (no such flag) hits the unchanged path. New WS case `farrier:whisper` is never sent by e2e. **No `ok()` changes.** |
| **e2e-playwright.js (64)** | No edit. | Drives honest member/Farrier UIs. The inspector gains a `system` input only for input/phase/agent blocks — playwright's inspector interactions (capacity/why) are unaffected (new field is below, separate testid). The baseline strip is a new optional widget (not asserted). The whisper box lives in drillDown (playwright's console flow doesn't exercise it unless a new check is added). Proposals shelf unchanged (cluster shelf is a sibling). |
| **qa-fixcheck.js (20)** | No edit. | Targets specific shipped fixes (debounced commits, keepOpen, etc.) — none of which R4/R5/R7 alter. |
| **qa-a11y.js (~33)** | No edit, BUT new interactive elements (system input, baseline inputs, cluster buttons, whisper box, farrier note) **must inherit a11y patterns**: inputs get placeholders/labels, buttons get text, the farrier note is a live-region chat bubble (already `aria-live:polite` on `.msgs`). New elements follow the existing `:focus-visible` + role idioms — a fresh a11y run should pass, but **this is the one suite to re-run carefully** (risk register R7-A11). |
| **qa-hostile.js (70)** | **No edit to existing 70.** Add NEW checks (below). | The §16.2 leak sweep asserts the **stub shape** (`!('canvas' in other)`) — R4 fields live inside canvas (not in stub), R7 lives in chat (inside canvas, not in stub), R5 clusters are client-only. The stub stays `{id,name,members,gateGreen,hasTeardown}` — **unchanged**. The authz sweep (§16.4) is a fixed message list — `farrier:whisper` is additive (new row, not a changed one). |

**Minimal unavoidable suite edit:** **none.** All three features are additive (new optional fields, new gated branches, new message type). No existing assertion changes. (Contrast the hardening pass, which needed two hostKey-length edits — Batch 1 needs zero.)

### New checks to add (per feature)

**R4 (add to `qa-hostile.js` + a focused functional check, ~6 checks):**
- H-R4a-1: `canvas:update` with a block `meta.system:'Salesforce'` on an `input` → farrier state shows `meta.system==='Salesforce'` (persists through sanitize). **This is the load-bearing regression guard** — if the sanitize allowlist line is forgotten, this fails.
- H-R4a-2: `meta.system:'x'.repeat(9999)` → stored ≤80 chars.
- H-R4a-3: `meta.system` on a `persona` block → absent in teardown `systems` (only input/phase/agent counted) — confirms it's scoped.
- H-R4b-1: `canvas:update` with `baseline:{frequency:'40×/mo',cycleTime:'3d'}` → farrier state `canvas.baseline` round-trips; after a `knownIds` merge commit it survives (the mergeCanvas baseline-preserve line).
- H-R4b-2: `baseline.frequency` 9999 chars → ≤80.
- F-R4-1 (functional): gate-green is reachable with NO system/baseline set (governance gate has zero new conditions) — asserts the locked discipline "never gate-blocking".

**R5 (add ~4 checks; live path needs a key so most are structural/degradation):**
- F-R5a-1: `POST /api/coach {cluster:true, code:<valid>}` with no key → 200, `degraded:true`, no `clusters` (honest absence).
- F-R5a-2: `clampClusters` rejects malformed (>5 clusters, empty items) — unit-style assert on a crafted payload IF a key is present; else structural code-read (flagged untested, like A4's live path).
- F-R5b-1: `POST /api/coach {synth:true, synthMode:'surface', code:<valid>, teamId:<valid>}` no key → 200, `degraded:true`, `reply` is a non-empty 4-line string (rule-based `synthLines` fired).
- F-R5b-2: synth with `synthMode:'rebuild'` on a team with `redesign` → reply mentions agents/landing (rule-based branch).

**R7 (add ~6 checks to `qa-hostile.js` authz + leak sweeps):**
- H-R7-1: `farrier:whisper` from a **member** socket → no broadcast change, `error` or silent (authz). 
- H-R7-2: `farrier:whisper` from a **pre-join** socket → rejected.
- H-R7-3: Farrier whisper containing `'swap'` / `'redesign'` → `error`, team chat unchanged (server vocab lint, never trusts client).
- H-R7-4: Farrier whisper of clean text → lands as `role:'farrier'` in target team's chat.
- H-R7-5 (leak): after a whisper to team A, a **member of team B**'s state has **no** canvas/chat for A (stub) → whisper invisible cross-team.
- H-R7-6: member `chat:post role:'farrier'` → stored role coerced to `'user'` (un-forgeable farrier note).

### Build order (suggested, suites green between)
1. R4a + R4b server (sanitize lines + emptyCanvas + buildTeardown) → run e2e + H-R4 checks.
2. R4 client (inspector field, baseline strip, polish chips, export) → playwright.
3. R7 server (`farrier:whisper` + `BANNED_VOCAB`) + client (whisperBox, bubble branch, badge) → H-R7 checks.
4. R5 server (`SYSTEMS.cluster/synth`, `clampClusters`, `synthLines`, coach branches) → F-R5 checks.
5. R5 client (cluster trigger/shelf, synth chips) → playwright + a11y full re-run.

---

## RISK REGISTER

| # | Risk | Likelihood | Blast | Mitigation |
|---|---|---|---|---|
| **R4-1** | **`meta.system` sanitize line forgotten** → silently stripped on every commit (the #1 hardening trap) | Low (called out as constraint #1) | Feature appears to work in-session then loses data on broadcast | H-R4a-1 is a dedicated regression guard; allowlist is ONE function |
| **R4-2** | **`canvas.baseline` dropped by mergeCanvas** (builds fresh `emptyCanvas`) on every knownIds commit | Medium if the merge-preserve line is missed | Baseline vanishes the moment a second editor commits | Explicit `out.baseline = ...` line + H-R4b-1 asserts post-merge survival |
| **R4-3** | **Baseline read as an ROI/target** by facilitators/teams (methodology violation — practicality is out of scope) | Medium-human | Reintroduces the retrofit mindset the workshop breaks | Copy enforces "today, not a target"; placed on Before/Today page only; rebuild Coach prompt NOT told to compare; **flagged as the one genuine methodology strain (see below)** |
| **R4-4** | Baseline on the trigger block would leak into the rebuild via the locked seed | Designed out | — | Chose canvas-level field precisely to avoid this; documented |
| **R4-5** | Systems-as-candidate-constraints clutter the teardown / read as HOW | Low | Slightly busier rebuild map | Made the candidate-constraint promotion OPTIONAL (lead's call); systems stay flat raw-material by default |
| **R5-1** | **Live cluster/synth path untested** (no key in CI) — same pre-existing gap as A4 (hardening R24) | Certain (no key) | Coach quality on the live path | Structural + degradation checks cover the gated/rule paths; a keyed smoke run is a manual pre-workshop step (carry A4's R24 forward) |
| **R5-2** | Cluster proposal **designs** rather than organizes (invents content) → violates provoke-not-solve | Low | Methodology breach | System prompt forbids invention ("every item from the supplied notes"); accept creates an EMPTY phase the team fills; clamp drops non-supplied items is enforced by prompt not code — **residual: a misbehaving model could paraphrase loosely** (accepted, same class as dump→map) |
| **R5-3** | `synthLines` rule-based output reads as canned/generic in a sparse map | Medium | A flat synthesis | It degrades gracefully (states "not spelled out yet" honestly); it's a pull-button, never forced |
| **R5-4** | Cluster reply / synth posted as chat grows `canvas.chat`; old history past 30 ages off the wire | Certain (by design, = hardening R3) | Cosmetic history loss | Store keeps 200; wire cap is the shipped trade-off |
| **R5-5** | Pre-reveal vocab leak in AI synthesis/cluster copy | Low | Spoils the surprise | `${SECRECY}` in both new prompts; rule-based fallbacks are hand-authored clean; **but AI output isn't server-vocab-linted** (only R7 is) — **flagged: should the synth/cluster replies pass `BANNED_VOCAB` server-side before broadcast?** (see deferred) |
| **R7-1** | Operator confusion: new "Whisper" vs the existing read-only "Coach whisper" table column | Medium-human | Farrier mis-clicks | Whisper box is in drillDown (not the table), distinct `g-flag` heading + copy; recommend renaming the table column to "Coach hint" in a follow-up (out of Batch 1 scope) |
| **R7-2** | Client vocab lint diverges from server regex over time | Low | A blocked-server message surprises the Farrier | Both regexes are identical literals in this doc; lead may extract to a shared constant — but no-build-step means the client copy is hand-synced (documented) |
| **R7-3** | Whisper to a team mid-`team:switch` (member moves) lands on a stale team | Very low | A note in the wrong rail | Whisper targets `team.canvas.chat` (server-resolved `teamId`), not a member; harmless |
| **R7-4** | Farrier note breaks the rail unread-count assumptions / a11y live-region | Low | Missed/over-counted unread | Explicit filter extension to include `'farrier'`; note rides the existing `aria-live` msgs |
| **R7-A11** | New inputs/buttons (system, baseline ×2, cluster, whisper) fail the a11y suite (focus/label) | Low | qa-a11y red | They follow shipped idioms (placeholders, text buttons, `:focus-visible`); **re-run qa-a11y after step 5** (the one suite flagged to watch) |
| **GEN-1** | Five new interactive surfaces expand the click-stability surface (perpetual-animation lesson from the critic loop) | Low | Flaky clicks | None of the new elements animate perpetually; all are static inputs/buttons |

---

## Methodology strain — flagged honestly

1. **R4b baseline ↔ "practicality is out of scope" (the strongest strain).** The "Do NOT do" list (product.md §2.6) bans feasibility/ROI scoring inside Rebuild because it reintroduces the retrofit mindset. The baseline is *adjacent* to that line. The mitigation is structural and disciplined: (a) it is captured in **Surface** (evidence of today), never computed in Rebuild; (b) it is framed and rendered only as "Today" on the Before page; (c) the rebuild Coach is **not** told to measure the redesign against it; (d) the input copy says "not a target." If the lead judges this too close to the line, R4b can ship behind a Farrier toggle or be cut while R4a (systems) — which has no such strain — ships alone. **This is the one place a feature genuinely brushes a locked rule.**

2. **R5a clustering ↔ provoke-not-solve.** Clustering organizes what the team *said* (their orphans) and names a theme — it does not design. The guard is: accept creates an *empty* phase the team fills, and the prompt forbids invented content. This stays on the right side of the rule, but the line is "names a grouping" not "designs the grouping's contents" — kept narrow by design.

3. **R5 AI copy is NOT server-vocab-linted** (only R7 is). The synthesis/cluster replies rely on the `${SECRECY}` prompt instruction, not a server filter. This matches the existing coach path (no coach reply is server-linted today). **Deferred decision for the lead:** run `BANNED_VOCAB.test(reply)` on synth/cluster replies before broadcast and fall back to rule-based if it trips — cheap insurance, ~2 lines, recommended but not in the baseline design to avoid over-gating the Coach.

## Deferred / open decisions for the lead
- Promote systems to `candidateConstraints` (R4a) — recommended light-touch, but optional; default is flat raw-material.
- R4b: canvas-level field (chosen) vs Farrier-toggle-gated vs cut — pending the methodology-strain call above.
- R5a accept action: create a named phase (recommended) vs relabel-only.
- R5/R7 vocab-lint parity: server-lint the AI synthesis/cluster replies too (recommended).
- Rename the console "Coach whisper" read-only column to avoid R7 naming collision (follow-up, out of scope).
