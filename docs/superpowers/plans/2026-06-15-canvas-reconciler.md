# Canvas Keyed Reconciler (Slice A0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the canvas's wipe-and-rebuild of block nodes with a **keyed replace-on-change reconciler**, so unchanged blocks keep their DOM identity (no churn, focus/animation preserved) and only new/changed blocks re-render — the foundation the AI-led interview (Slice A) needs to update the map live without thrashing.

**Architecture:** Pure refactor of `draw()` inside `makeCanvas` in `public/index.html`. Each block node carries a `data-sig` signature of its render-affecting fields; on draw, nodes with an unchanged signature are left untouched, changed ones are recreated in place (`replaceWith`), new ones are appended (with the existing entrance animation), and removed ones are deleted. A node whose label is being edited is never recreated. Arrows, overlays, the inspector, and the challenge button keep their current rebuild behavior (cheap, no focus/animation state). No server, wire, or persistence change.

**Tech Stack:** Vanilla JS single-file client (`public/index.html`), Playwright for the multi-actor reconciler test. No framework / no morphdom (project invariant).

---

## Pre-flight

- This is a refactor of the **most depended-on UI path** (every suite that touches the canvas exercises `draw()`). The safety net is the full regression sweep in Task 3 — it MUST stay green.
- Repo is on `main`, git identity configured. End commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Do not stage `data/`/`node_modules/`.
- Anchors (as of 2026-06-15): `draw()` at `public/index.html:2011`; the node wipe at `:2015`; block append at `:2052`/`:2054`; `renderBlock` at `:2122`. Search the quoted strings if lines drift.
- Start the server for browser tests with a free port, e.g. `PORT=3300 node server.js &`.

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `public/index.html` | `blockSig()` helper + keyed reconcile inside `draw()` | Modify (`makeCanvas`) |
| `qa-reconciler.js` | Multi-actor Playwright proof: node identity preserved, focus/uncommitted-text survives a broadcast, removed nodes go | Create |

---

## Task 1: The failing reconciler test

**Files:**
- Create: `qa-reconciler.js`

- [ ] **Step 1: Write the test**

Create `qa-reconciler.js`:

```js
/* Slice A0 — canvas keyed reconciler proof (Playwright, 2 actors on ONE map).
 * Proves unchanged block nodes keep DOM identity across a broadcast (no wipe-and-rebuild),
 * a focused label's uncommitted text survives a teammate's broadcast, and removed blocks go.
 *   PORT=3300 node server.js &   then   BASE=http://localhost:3300 node qa-reconciler.js
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3300';
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + x : ''); } };

// place a typed block on a scene and label it (re-selects the tool per block)
async function drop(page, S, tool, x, y, text) {
  await page.click(`[data-testid=tool-${tool}]`);
  await page.click(S, { position: { x, y } });
  await page.keyboard.type(text);
  await page.click('[data-testid=tool-select]');
  await wait(250);
}

(async () => {
  const b = await chromium.launch();
  // host + start surface so a team map is live
  const host = await (await b.newContext()).newPage();
  host.on('dialog', d => d.accept().catch(()=>{}));
  await host.goto(BASE); await wait(300);
  const { code, hostKey } = await host.evaluate(async () => {
    const r = await fetch('/api/workshop', { method: 'POST' }); return r.json();
  });
  // two members join the SAME team
  const A = await (await b.newContext()).newPage();
  const B = await (await b.newContext()).newPage();
  for (const [p, nm] of [[A,'Alex'],[B,'Bo']]) {
    p.on('dialog', d => d.accept().catch(()=>{}));
    await p.goto(BASE + '#'); await wait(150);
    await p.evaluate(({code,nm})=>{ localStorage.setItem('hp_me', JSON.stringify({role:'member',code,name:nm,steed:{name:'Mare',color:'#7c3aed'}})); }, {code,nm});
  }
  // Farrier drives to surface; A creates the team, B joins it
  await host.evaluate(({code,hostKey})=>{ localStorage.setItem('hp_me', JSON.stringify({role:'farrier',code,hostKey})); }, {code,hostKey});
  await host.reload(); await wait(400);
  await A.reload(); await wait(400);
  // A makes a team
  await A.fill('[data-testid=team-name]', 'AP').catch(()=>{});
  await A.click('[data-testid=make-team]').catch(()=>{});
  await wait(400);
  // Farrier: start surface
  await host.click('[data-testid=run-cta]').catch(()=>{});  // lobby→surface
  await wait(500);
  // B joins the existing team via picker
  await B.reload(); await wait(500);
  await B.click('.teamcard').catch(()=>{});
  await wait(500);

  const S = '[data-testid=scene]';
  // A places two blocks
  await drop(A, S, 'persona', 200, 200, 'Analyst');
  await drop(A, S, 'phase', 460, 200, 'Reconcile');
  await wait(400);

  // mark A's current nodes so we can detect a rebuild
  const before = await A.evaluate(() => {
    const ns = [...document.querySelectorAll('.node')];
    ns.forEach((n,i)=>{ n.__rk = 'rk'+i; });
    return ns.length;
  });
  ok('A shows 2 blocks before broadcast', before === 2, before);

  // B adds a third block → real broadcast to A
  await drop(B, S, 'input', 200, 360, 'invoice');
  await wait(700);

  const idn = await A.evaluate(() => {
    const ns = [...document.querySelectorAll('.node')];
    const marked = ns.filter(n => n.__rk).length;   // survived = NOT rebuilt
    return { total: ns.length, marked };
  });
  ok('broadcast added a 3rd node on A', idn.total === 3, idn);
  ok('A’s 2 original nodes kept DOM identity (reconciled, not rebuilt)', idn.marked === 2, idn);

  // focus survival: A clicks a block (label focuses per the click-to-type fix), types uncommitted text;
  // B adds another block → broadcast must NOT blur A or drop the text.
  await A.click('.node[data-id]'); await wait(200);
  await A.keyboard.type('XEDIT');
  await drop(B, S, 'moment', 460, 360, 'match PO');
  await wait(700);
  const foc = await A.evaluate(() => {
    const a = document.activeElement;
    return { isLabel: !!(a && a.classList && a.classList.contains('label')), txt: a ? a.textContent : '' };
  });
  ok('focused label survived the broadcast (still focused)', foc.isLabel === true, foc);
  ok('uncommitted label text survived the broadcast', /XEDIT/.test(foc.txt), foc);

  await b.close();
  console.log(`\nqa-reconciler: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `PORT=3300 node server.js & sleep 1; BASE=http://localhost:3300 node qa-reconciler.js; kill %1`
Expected: the **identity** check fails — `A's 2 original nodes kept DOM identity` shows `marked: 0` (today every `draw()` removes all `.node`s, so the `__rk` marks are gone after the broadcast). The focus checks likely also fail (the broadcast rebuild blurs the label). This is the RED state proving the wipe-and-rebuild.

> If the harness can't reach the surface scene (team/seat flow timing), fix the test setup until "A shows 2 blocks before broadcast" passes — only then is the RED meaningful. Do NOT proceed to Task 2 until the identity check is the thing failing.

---

## Task 2: Implement the keyed reconciler

**Files:**
- Modify: `public/index.html` — add `blockSig()` in `makeCanvas` (near `draw`); replace the node wipe + re-append in `draw()`.

- [ ] **Step 1: Add the signature helper**

In `public/index.html`, immediately **before** `function draw(){` (line 2011), add:

```js
  // A0 reconciler: a string of every render-affecting field of a block. Two blocks with the same
  // sig render identically, so an existing node with an unchanged sig is left untouched (no rebuild).
  function blockSig(b, selected){
    const m = b.meta || {};
    return [b.x, b.y, b.w, b.h, b.type, b.text || '', b.locked?1:0, b.pain?1:0, b.conflict?1:0,
      m.capacity||'', m.why||'', m.system||'', m.phaseId||'', (m.author&&m.author.c)||'',
      selected?1:0, opts.mode||''].join('│');
  }
```

- [ ] **Step 2: Replace the node wipe-and-rebuild in `draw()`**

In `draw()`, the current code removes all nodes then re-appends them. Replace this block — from line 2015:

```js
    world.querySelectorAll('.node, .ingcard, .challengebtn, .inspector').forEach(n=>n.remove());
```

…through the block-append branches (lines 2048-2055):

```js
    if (editable && seenKey){
      const seen = seenBlocks[seenKey] || (seenBlocks[seenKey] = new Set());
      // B1: stagger entrance left→right on the SHARED cadence (ovOrder covers blocks +
      // overlays sorted together) so the whole teardown assembles as one sweep
      (c.blocks||[]).forEach(b=>{ const isNew=!seen.has(b.id); world.append(renderBlock(b, isNew? ovOrder[b.id] : null)); seen.add(b.id); });
    } else {
      (c.blocks||[]).forEach(b=>{ world.append(renderBlock(b)); });
    }
```

with this — note the overlay (`.ingcard`) loop between them stays exactly as-is; only the **first line** and the **block branches** change:

First, change line 2015 to remove only the derived overlays (NOT the nodes):

```js
    world.querySelectorAll('.ingcard, .challengebtn, .inspector').forEach(n=>n.remove());
```

Then replace the two block-append branches (2048-2055) with the keyed reconcile:

```js
    // A0 keyed reconcile: leave unchanged nodes in place (preserves DOM identity, focus, entrance
    // animations); recreate only changed nodes; append new ones (with entrance stagger); drop removed.
    {
      const seen = (editable && seenKey) ? (seenBlocks[seenKey] || (seenBlocks[seenKey] = new Set())) : null;
      const existing = {}; world.querySelectorAll('.node').forEach(n=>{ existing[n.dataset.id]=n; });
      (c.blocks||[]).forEach(b=>{
        const sig = blockSig(b, sel===b.id);
        const cur = existing[b.id];
        // never recreate a node whose label is being edited — it would drop the in-flight text
        const editingThis = cur && document.activeElement && cur.contains(document.activeElement);
        if (cur){ delete existing[b.id]; if (cur.dataset.sig===sig || editingThis){ return; } }
        const isNew = !cur && (!seen || !seen.has(b.id));
        const node = renderBlock(b, (seen && isNew) ? ovOrder[b.id] : null);
        node.dataset.sig = sig;
        if (cur) cur.replaceWith(node); else world.append(node);
        if (seen) seen.add(b.id);
      });
      // blocks that no longer exist → remove their nodes
      Object.keys(existing).forEach(id=>existing[id].remove());
    }
```

Leave `drawArrows()` (line 2056) and everything after (challenge button, inspector) unchanged — they keep rebuilding as today.

> Note on `hadNodeFocus` (line 2014) + the post-draw refocus at the end of `draw()`: that band-aid restored node focus across the old full wipe. With the reconciler, focused nodes are no longer destroyed, so it becomes a no-op in the common case — leave it in place (harmless safety net for view switches). Do not remove it in this task.

- [ ] **Step 3: Run the test to verify it passes**

Run: `PORT=3300 node server.js & sleep 1; BASE=http://localhost:3300 node qa-reconciler.js; kill %1`
Expected: `qa-reconciler: 6 passed, 0 failed` — original nodes keep `__rk` (identity preserved), the new node appears, and the focused label keeps focus + `XEDIT` text across the broadcast.

- [ ] **Step 4: Commit**

```bash
git add public/index.html qa-reconciler.js
git commit -m "feat: keyed canvas reconciler — never rebuild unchanged block nodes

$(printf 'Replace draw()’s wipe-and-rebuild of block nodes with a keyed\nreplace-on-change reconciler (data-sig per node). Unchanged blocks keep\nDOM identity (no churn, focus + entrance animations preserved); only\nchanged nodes recreate, new ones append, removed ones drop. Foundation\nfor the live AI-led interview map (Slice A). No server/wire change.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 3: Full regression sweep

**Files:** none (verification only).

- [ ] **Step 1: Run every canvas-touching + contract suite against fresh servers**

The reconciler changes the core render path, so the whole suite must confirm no behavior regressed. Restart the server between suites (shared per-IP mint bucket); run `qa-hostile` last.

```bash
node qa-online.js                                                   # 18 (self-spawns)
node qa-editguard.js                                                # 30 (static)
PORT=3301 node server.js &  sleep 1; BASE=http://localhost:3301 node e2e.js;            kill %1   # 34
PORT=3302 node server.js &  sleep 1; BASE=http://localhost:3302 node qa-a11y.js;        kill %1   # 33 (canvas keyboard)
PORT=3303 node server.js &  sleep 1; BASE=http://localhost:3303 node e2e-playwright.js; kill %1   # 64 (place/select/edit/drag/arrows)
PORT=3304 node server.js &  sleep 1; BASE=http://localhost:3304 node qa-batch1.js;      kill %1   # 18
PORT=3305 node server.js &  sleep 1; BASE=http://localhost:3305 node qa-batch2.js;      kill %1   # 20
PORT=3306 node server.js &  sleep 1; BASE=http://localhost:3306 node qa-sandbox.js;     kill %1   # 12
PORT=3307 node server.js &  sleep 1; BASE=http://localhost:3307 node qa-scale.js;       kill %1   # 12
PORT=3308 node server.js &  sleep 1; BASE=http://localhost:3308 node qa-hostile.js;     kill %1   # 76 (LAST)
```

Expected: every suite reports its full count, 0 failures. The two most likely to surface a reconciler bug are **e2e-playwright** (drag/resize/arrows/inspector/select after the change) and **qa-a11y** (keyboard place/nudge/focus). If either fails, the reconciler missed a render-affecting field in `blockSig` (e.g. selection handles, arrow endpoints) or recreated a focused node — fix `blockSig`/the editing guard, re-run.

- [ ] **Step 2: Verify the bug-3 click-to-type interaction still holds**

The earlier click-to-type fix focuses a label on single-click; the reconciler must not fight it. `qa-reconciler.js` already covers focus survival; confirm `e2e-playwright` (which selects + edits) is green from Step 1.

- [ ] **Step 3: Commit (if any blockSig fixes were needed)**

```bash
git add public/index.html
git commit -m "fix: include <field> in blockSig (reconciler regression from <suite>)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
(Skip if Step 1 was clean on the first pass.)

---

## Self-Review

**Spec coverage (against §6 of the design spec):**
- "diff by id, touch only changed" → Task 2 keyed reconcile ✓
- "create new + entrance animation" → `renderBlock(b, ovOrder[b.id])` for new nodes ✓
- "remove nodes whose id is gone" → `Object.keys(existing).forEach(remove)` ✓
- "label being edited not clobbered" → `editingThis` guard ✓
- "arrows keyed too" → **deliberately deferred** (arrows/overlays keep rebuilding — cheap, no focus/animation state; block nodes carry all the value). Noted as a scope choice, not a gap. If interview arrow-churn proves visible later, key arrows in a follow-up.
- "no framework/morphdom" → hand-rolled signature diff ✓
- "preserves focus/selection/tool" → focus via the editing guard + identity preservation; selection is in `blockSig` so a selection change recreates exactly the two affected nodes ✓

**Placeholder scan:** none — every step has exact code/commands.

**Type/name consistency:** `blockSig(b, selected)` defined in Task 2 Step 1, used in Task 2 Step 2. `data-sig`/`dataset.sig` consistent. `existing`/`seen`/`ovOrder` match the surrounding `draw()` scope. The test's `tool-persona`/`tool-phase`/`tool-input`/`tool-moment`/`tool-select` testids match the palette; `[data-testid=scene]` matches `makeCanvas`.

**Risk:** the test's surface-entry setup (host→team→start→join) is the fragile part; Task 1 Step 2 explicitly gates RED on "2 blocks shown" so a flaky setup can't masquerade as a pass. The reconciler itself is low-risk because unchanged behavior is preserved by leaving nodes in place and the full suite guards every interaction.
