# Cluster B design — accessibility & platform resilience

Solution architect doc, 2026-06-13. Sources: `docs/ipo-review/CONSOLIDATED.md` (Cluster B), `docs/ipo-review/platform.md` (findings A1–A9, P1–P5, E1–E2), and the live code in `public/index.html` (line numbers below are against the current 2,955-line file).

**Invariants honoured throughout:** no framework, no build step (vendored plain files only), trivial deployability, the calm-canvas motion rules (§6/§12), `editingLock` semantics, and — hard constraint — `e2e.js` (34 contract checks) and `e2e-playwright.js` (64 UAT checks) **pass unmodified**. New verification lands in a new file (`qa-a11y.js`), not by editing the shipped suites.

**One new global primitive** used by several items below (defined once, in §2.7): a persistent screen-reader live region `#sr-status` + `announce()` helper, living OUTSIDE `#app` (like `#toasts`) so `render()` never destroys it.

---

## 1. Quick wins B1–B8 (exact edits)

### B1 — `#toasts` becomes a live region; warn toasts become alerts

**Edit 1** — line 851, the static container (outside `#app`, survives every render):

```html
<!-- before -->
<div id="toasts"></div>
<!-- after -->
<div id="toasts" role="status" aria-live="polite"></div>
```

**Edit 2** — `toast()` at line 872. Warn toasts get `role="alert"` on the toast element itself (a child with `role=alert` establishes its own assertive live region inside the polite container — standard, well-supported layering):

```js
// before
function toast(msg, warn){ const t = el('div',{class:'toast'+(warn?' warn':'')},msg); $('#toasts').append(t);
// after
function toast(msg, warn){ const t = el('div',{class:'toast'+(warn?' warn':''), role: warn?'alert':null},msg); $('#toasts').append(t);
```

(`el()` skips null attrs — line 865 `else if (attrs[k] != null)` — so non-warn toasts are unchanged.)

**State edges, not ticks** (per plat A2): the per-second writes to `#timerlive`/`#bigtimer` (line 996) deliberately stay OUTSIDE any live region — no edit there. The edges are already toasts and become announced for free: timer-expired (line 981), final-furlong (line 998), rosette (line 989). One genuinely missing edge — "timer started" — is a member-side toast we do NOT add (the room-facing timer chip appearing is a visual event; announcing it would push a toast to every member screen and change UAT-visible copy). Instead `announce('Timer started — '+timerText())` via the §2.7 channel when `state.timer.running` flips false→true in `afterState()` (~line 979, beside the existing `ui.expiredToasted` logic) — SR-only, zero visual change:

```js
if(state.timer.running && !ui.timerRunWas) announce('Timer started — '+fmtTimer()+' on the clock');
ui.timerRunWas = !!state.timer.running;
```

Phase-change announcement is part of B3 (the sr-only heading) plus one `announce()` in `render()` — see B3.

### B2 — drop the pinch-zoom cap

Line 5:

```html
<!-- before -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=2">
<!-- after -->
<meta name="viewport" content="width=device-width, initial-scale=1">
```

The canvas has its own zoom/pan model and the phone lanes already handle `touch-action`; the cap protects nothing (plat A6). Clears axe `meta-viewport-large` on every view.

### B3 — landmarks + one heading per view

Rendering is centralised in `render()` (line 1013), with five member-view branches, two farrier branches, and the landing/picker branches. Design: **roles, not retagging** — adding `role="banner"`/`role="main"` to the existing divs is audit-equivalent (axe accepts them for `landmark-one-main`/`region`) and guarantees zero CSS/layout fallout (the stylesheet targets `.topbar`, `.work`, etc. by class; wrapping in a real `<main>` would insert a new flex child into `#app` and risk every view's layout).

**Edit 1** — `topbar()` line 1053:

```js
// before
const bar = el('div',{class:'topbar'});
// after
const bar = el('div',{class:'topbar', role:'banner'});
```

**Edit 2** — one helper + apply per branch in `render()` (~8 call sites). Helper, near `el()`:

```js
function asMain(node, title){ node.setAttribute('role','main');
  node.prepend(el('h1',{class:'sr-only'}, title)); return node; }
```

CSS (new utility — none exists today; standard clip pattern):

```css
.sr-only{position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden;
  clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; border:0}
```

Branch edits (quoting line 1029–1033 as representative):

```js
// before
if (st==='lobby') app.append(topbar(), viewRoot=viewLobby());
else if (st==='surface') app.append(topbar(), viewRoot=viewSurface());
// after
if (st==='lobby') app.append(topbar(), viewRoot=asMain(viewLobby(),'Lobby — your stable'));
else if (st==='surface') app.append(topbar(), viewRoot=asMain(viewSurface(),'Surface — map your workflow'));
```

Headings (pre-reveal vocabulary rule respected — no swap/rebuild words before the reveal; "Rebuild" is fine ON the rebuild screen, post-reveal):
landing `'Horsepower — host or join a workshop'` · picker `'Pick your team'` · lobby `'Lobby — your stable'` · surface `'Surface — map your workflow'` · rebuild `'Rebuild — make it AI-native'` · share `'Share — the double reveal'` · closed `'Workshop closed — your race card'` · console `'Farrier console'` · room view `'Room view'` (the room view's h1 must be sr-only — the projector stays letterpress-clean).

`viewLanding()` has no topbar — `asMain` alone suffices (axe's `landmark-one-main` needs main, not banner).

**Phase announcement** — in `render()` where the cross-fade fires (line 1036):

```js
// before
if (viewRoot && !REDUCED && st!==lastPhaseRendered){ viewRoot.classList.add('phasein'); }
// after
if (viewRoot && st!==lastPhaseRendered){ if(!REDUCED) viewRoot.classList.add('phasein');
  if(lastPhaseRendered!==null) announce({surface:'Surface phase — map your workflow', rebuild:'Rebuild phase — you hold another team’s workflow', share:'Share phase — the double reveal', closed:'Workshop closed', lobby:'Back in the lobby'}[st]||''); }
```

(`lastPhaseRendered!==null` guard: no announcement spam on first paint/reload. The rebuild line is post-swap so "another team's workflow" is allowed — the reveal has fired by the time the member sees this phase.)

### B4 — aria-label sweep on title-only controls

All are one-attribute additions in the same `el()` call (the `el()` helper passes unknown attrs through `setAttribute`, so `'aria-label'` already works — the inspector capacity row and nodes use ARIA attrs today):

| Where | Current code (quoted) | Add |
|---|---|---|
| timer custom input, line 2665 | `el('input',{type:'number', … title:'custom minutes', 'data-testid':'timer-custom', …})` | `'aria-label':'custom minutes'` (kills the only **serious** axe hit, `label-title-only`) |
| zoom out, line 1932 | `el('button',{title:'Zoom out', onclick:…},'−')` | `'aria-label':'Zoom out'` |
| zoom in, line 1934 | `el('button',{title:'Zoom in', …},'+')` | `'aria-label':'Zoom in'` |
| fit, line 1935 | `el('button',{title:'Fit', …},'⤢')` | `'aria-label':'Fit the map to the screen'` |
| canvas help, line 1647 | `el('button',{class:'btn sm ghost', title:'Help', onclick:showShortcuts},'?')` | `'aria-label':'Canvas shortcuts help'` |
| timer reset, line 2672 | `el('button',{… 'data-testid':'timer-reset', title:'reset to the loaded duration', …}, '↺')` | `'aria-label':'Reset the timer'` |
| steed re-roll (`[data-testid=reroll]`, dice glyph only) | — | `'aria-label':'Re-roll your steed'` |
| collapsed Coach rail button (`.railtoggle.coachbtn`, face-only) | — | `'aria-label':'Open the Coach'` (+ unread count if present) |

Sweep procedure at implementation time: `grep -n "title:'" public/index.html`, add `'aria-label'` wherever the element has no text child. Visible-text buttons (e.g. timer presets `6m/10m`) need nothing.

### B5 — focus restore across `render()` (extends the toolRestore pattern)

Today only the canvas tool + selection survive a broadcast re-render (`ui.toolRestore`/`ui.selRestore`, lines 1624–1627) and contenteditable labels survive via `editingLock` (line 941). Everything else — coach composer, assumption input, timer custom, join fields — dumps focus to `<body>` (measured, plat A3).

**Focus key.** Priority order, computed from `document.activeElement`:
1. `[data-testid="X"]` — every interactive control the suites touch already carries one; this is the natural stable identity (same philosophy as the testid-keyed `toolRestore`).
2. `.node[data-id="X"]` — canvas nodes (needed by B9; nodes have `n.dataset.id=b.id`, line 1759).
3. `#X` for id-carrying elements (`#reveal-go`, `#coach-input` has a testid already; this catches stragglers).
4. Otherwise: no restore (anonymous buttons don't opt in — restoring "some button" wrongly is worse than the status quo).

**Caret:** captured only for `INPUT`/`TEXTAREA` (`selectionStart != null`), clamped on restore. Contenteditable labels are NOT in scope — `editingLock` already defers the whole render while one is focused, which is strictly stronger.

**Where captured / re-applied.** `render()` (line 1013) has five `app.innerHTML=''` early-return branches — rather than touch each, capture at the top and schedule the restore as a microtask (runs after whichever synchronous branch executed):

```js
function render(){
  if (editingLock){ pendingRender = true; return; }
  // B5: focus survives the wipe — extend the toolRestore idea to the focused element
  const _af = document.activeElement;
  const _fkey = (!_af || _af===document.body) ? null
    : _af.dataset.testid ? `[data-testid="${_af.dataset.testid}"]`
    : (_af.classList.contains('node') && _af.dataset.id) ? `.node[data-id="${_af.dataset.id}"]`
    : _af.id ? '#'+CSS.escape(_af.id) : null;
  const _caret = _fkey && _af.selectionStart!=null ? [_af.selectionStart,_af.selectionEnd] : null;
  if (_fkey) queueMicrotask(()=>{
    if (document.activeElement && document.activeElement!==document.body) return; // something claimed focus on purpose
    const n=document.querySelector(_fkey); if(!n) return;
    n.focus({preventScroll:true});
    if(_caret && n.setSelectionRange){ const L=(n.value||'').length;
      try{ n.setSelectionRange(Math.min(_caret[0],L), Math.min(_caret[1],L)); }catch(e){} }
  });
  …existing body unchanged…
```

~14 lines, one site. Notes for the adversarial reader:
- **The `activeElement!==body` guard** is the safety valve: if any view intentionally focuses something during render (none do today; `createBlockAt`'s label autofocus runs outside `render()`), the restore yields.
- **`preventScroll:true`** — restoring focus to an off-viewport node must not yank the page or the pan.
- **Element gone** (view changed, inspector closed because `selRestore` cleared): `querySelector` misses, silent no-op — focus lands wherever the browser left it, same as today. No worse, usually better.
- **Composer draft text** is already persisted (`ui.coachDraft`, line 2162); B5 adds the caret + focus so a teammate's commit mid-sentence is now invisible.
- **Interaction with B9:** the `.node[data-id]` arm is what lets keyboard canvas focus survive the *full* re-render; within-canvas `draw()` rebuilds are handled inside `makeCanvas` (§2.5). The two mechanisms never fire together for the same wipe (`draw()` doesn't pass through `render()`).

**Opt-in surface (explicit list):** coach composer (`coach-input`), assumption input (`assumption-input`), timer custom (`timer-custom`), join fields (`join-name`/`join-code`), team-name field (`create-team-name`), inspector WHY (`inspector-why` — though `editingLock` covers it, belt-and-braces), canvas nodes (`.node[data-id]`), `#reveal-go`. Everything else falls through by design.

### B6 — `confirmModal` → native `<dialog>` (API + testids byte-compatible)

Current implementation (lines 875–890, quoted in full so the contract is explicit):

```js
function confirmModal(msg, opts={}){
  return new Promise(res=>{
    const done=v=>{ document.removeEventListener('keydown',onKey); ov.remove(); res(v); };
    const onKey=e=>{ if(e.key==='Escape') done(false); };
    const ov=el('div',{class:'modalscrim', onclick:e=>{ if(e.target===ov) done(false); }});
    const card=el('div',{class:'modalcard', role:'alertdialog', 'aria-label':opts.title||'Confirm'});
    card.append(el('h3',{}, opts.title||'Hold your horses'));
    card.append(el('p',{class:'meta', …}, msg));
    const row=el('div',{class:'row', …});
    row.append(el('button',{class:'btn ghost sm', 'data-testid':'modal-cancel', onclick:()=>done(false)}, opts.cancelText||'Cancel'));
    row.append(el('button',{class:'btn sm '+(opts.danger?'danger':'primary'), 'data-testid':'modal-confirm', onclick:()=>done(true)}, opts.confirmText||'Yes, go'));
    card.append(row); ov.append(card); document.body.append(ov);
    document.addEventListener('keydown',onKey);
    setTimeout(()=>row.lastChild.focus(),30);
  });
}
```

**Contract that must survive** (verified against consumers): promise-based `await confirmModal(msg,{title,confirmText,cancelText,danger})`; Escape ⇒ `false`; scrim click ⇒ `false`; `[data-testid=modal-cancel]`/`[data-testid=modal-confirm]` clickable (e2e-playwright line 229 and qa-fixcheck line 17 click `modal-confirm`); confirm button takes focus. Suites' `page.on('dialog')` handlers listen for *native browser* dialogs (`window.confirm`) only — a `<dialog>` element never triggers that event, so no interference.

**Replacement:**

```js
function confirmModal(msg, opts={}){
  return new Promise(res=>{
    const dlg=el('dialog',{class:'modaldlg', 'aria-label':opts.title||'Confirm'});
    const done=v=>{ try{dlg.close();}catch(e){} dlg.remove(); res(v); };
    const card=el('div',{class:'modalcard'});
    card.append(el('h3',{}, opts.title||'Hold your horses'));
    card.append(el('p',{class:'meta', style:'margin:8px 0 0; font-size:14px; line-height:1.5'}, msg));
    const row=el('div',{class:'row', style:'margin-top:16px; justify-content:flex-end'});
    row.append(el('button',{class:'btn ghost sm', 'data-testid':'modal-cancel', onclick:()=>done(false)}, opts.cancelText||'Cancel'));
    row.append(el('button',{class:'btn sm '+(opts.danger?'danger':'primary'), 'data-testid':'modal-confirm', onclick:()=>done(true)}, opts.confirmText||'Yes, go'));
    card.append(row); dlg.append(card);
    dlg.addEventListener('cancel', e=>{ e.preventDefault(); done(false); });          // Escape
    dlg.addEventListener('click', e=>{ if(e.target===dlg) done(false); });            // backdrop
    document.body.append(dlg); dlg.showModal();
    setTimeout(()=>row.lastChild.focus(),30);
  });
}
```

What the native element buys (plat A4): real focus trap (top layer makes the page behind inert to keyboard AND pointer), `aria-modal` semantics for free (dialog in modal state), and **automatic focus-restore to the invoking element on close** — none of which the hand-rolled scrim had.

Design details a reviewer will probe:
- **Backdrop-click vs padding-click:** the dialog element itself is styled paddingless/transparent (`.modaldlg{padding:0;border:none;background:transparent;margin:auto}`); all chrome lives on the inner `.modalcard` div. So `e.target===dlg` is true only for genuine `::backdrop` clicks — clicking the card's padding can't dismiss. (Without the inner wrapper, padding clicks would target the dialog and close it — a real regression.)
- **CSS:** `.modaldlg::backdrop{background:rgba(33,49,79,.45)}` (the current `.modalscrim` wash, ink-tinted per §12). `.modalcard` keeps its existing styles; the old `role:'alertdialog'` attr drops off the card (the dialog carries semantics now). No open/close animation — instant, exactly like today, so suite timing (`wait(250)` then click) is unaffected. `@starting-style` entrance is a B12 deferral.
- **`cancel` + `preventDefault` then `done(false)`:** we close it ourselves so the promise always resolves; an un-prevented native cancel would close without resolving.
- **Other `.modalcard` consumers** (challenge modal, catch-up card, member confirm in `goHome`-adjacent flows) are out of scope and untouched: qa-fixcheck's `.modalcard textarea` (line 127) targets the challenge modal, which keeps its scrim implementation; `confirmModal` contains no textarea/input so the selectors can never cross-match even if both were somehow open.
- **Browser support:** `<dialog>` is Baseline (Safari 15.4+/all evergreen) — the workshop's device floor (modern phones + laptops) is comfortably above it. No fallback shim needed; if the lead wants one, `if(!('showModal' in document.createElement('dialog')))` keep the old function as `confirmModalLegacy` — I recommend NOT shipping dead code.

**B6b — the reveal takes focus** (other half of plat A4). `showReveal` (line 2585) adds `.on` but never moves focus; an SR user misses the swap. Edits inside `showReveal`:

```js
$('#reveal').classList.add('on');
$('#reveal').setAttribute('tabindex','-1'); $('#reveal').focus();          // SR lands on role=alertdialog + label
setTimeout(()=>{ $('#reveal').classList.add('cta-ready'); $('#reveal-go').focus(); }, 1700);
```

(The existing 1700ms timeout already exists for `cta-ready` — we piggyback the same callback; the CTA is visible by then per the staged reveal, and e2e-playwright explicitly waits for `#reveal-go` visible + 1700ms before clicking, so focusing it changes nothing for the suite.) Escape parity with the tap-to-dismiss safety:

```js
$('#reveal').onkeydown = e=>{ if(e.key==='Escape' && $('#reveal').classList.contains('cta-ready')) $('#reveal-go').click(); };
```

`#reveal` markup (line 830) already has `role="alertdialog" aria-label="The reveal"` — upgrade the label to `'aria-label':'The reveal — you hold another team’s workflow now'`? **No** — the label is static HTML parsed before the reveal; keep it generic ("The reveal") to honour the pre-reveal vocabulary rule (the element exists in the DOM from page load, pre-swap). The announced content comes from `#reveal-twist` text, which is populated only at reveal time. *(This is exactly the kind of leak the vocab rule exists for — flagging that I checked it.)*

### B7 — race-card PNG: DPR backing store + fonts ready

`saveRaceCardPng` (line 2484). Current opening + the one call site (line 2479, an `onclick` — async-safe):

```js
function saveRaceCardPng(t, steed, intentTxt, becameTxt, kills, riders, venue){
  const W=880, H=520, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const g=cv.getContext('2d');
```

Replacement opening (5 lines changed; the rest of the draw code is untouched because `g.scale` makes all existing coordinates valid):

```js
async function saveRaceCardPng(t, steed, intentTxt, becameTxt, kills, riders, venue){
  const W=880, H=520, s=Math.max(2, Math.round(window.devicePixelRatio||1));
  const cv=document.createElement('canvas'); cv.width=W*s; cv.height=H*s;
  const g=cv.getContext('2d'); g.scale(s,s);
  try{ await document.fonts.load('600 44px Fraunces'); await document.fonts.load('400 24px Inter'); await document.fonts.ready; }catch(e){}
```

- `Math.max(2,…)` per the platform finding: even on a 1× projector laptop the keepsake renders at 2× (it gets screenshotted/printed; it should be the crispest artifact in the app).
- `document.fonts.load()` with the two faces actually drawn (`44px Fraunces` headline, Inter body) forces the variable-font instances; `fonts.ready` then settles the rest. First-save-after-cold-load no longer renders Georgia. The `try/catch` keeps the save working even if the Font Loading API hiccups (degradation rule #8 in miniature).
- Call site needs no edit (`onclick:()=>saveRaceCardPng(…)` — a floating promise is fine; the toast fires at the end of the async body).
- PNG download size grows ~4× — irrelevant for a local download.

### B8 — reduced-motion `change` listener

`REDUCED` is read once (line 1569) and the boil ticker is *never started* under reduced motion (line 1589) — so an OS-level toggle mid-session either leaves the boil running (off→on) or leaves the canvas dead until reload (on→off).

```js
// before (1569)
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
// after
const _mqRM = matchMedia('(prefers-reduced-motion: reduce)');
let REDUCED = _mqRM.matches;
_mqRM.addEventListener('change', e=>{ REDUCED = e.matches; if(!editingLock) render(); });
```

```js
// before (1589) — ticker never created under reduced motion
if(!REDUCED) setInterval(()=>{
  const now=Date.now();
// after — always created, gated per tick (REDUCED is now mutable)
setInterval(()=>{
  if(REDUCED) return;
  const now=Date.now();
```

`const`→`let` is safe: every other use reads `REDUCED` at call time (render paths, `makeCanvas`, share choreography), so they pick up the new value on the next render — which the `change` listener triggers. The CSS side already self-heals (the `@media (prefers-reduced-motion: reduce)` block at line 751 re-evaluates live). The 100ms ticker now runs a no-op `if` under reduced motion — measured boil cost is 0.1ms when *firing*, so an early-return tick is nanoseconds; not worth the start/stop machinery.

---

## 2. B9 — canvas keyboard layer (the centerpiece, ~120 lines in `makeCanvas`)

### 2.0 Shape of the solution

All logic lives inside `makeCanvas` (line 1617) + ~10 lines of shared helpers, gated on `editable` — read-only minis/mirrors get nothing (they're presentation surfaces; their nodes stay `role=group` images). Three principles:

1. **Delegate to the existing `scene` keydown** (line 1910) rather than per-node handlers — the contenteditable labels already `e.stopPropagation()` on keydown (line 1787) and the inspector textarea does too (line 1743), so by construction **no keyboard-layer key can ever fire while text is being typed**, and `editingLock` is never fought. The existing Delete/Escape branches stay; new branches compose around them.
2. **Selection IS focus state**: focusing a node calls the existing `setSel` (line 1627), which already persists across re-renders via `ui.selRestore` and already drives the inspector, handles, and challenge button. The keyboard layer adds no parallel state beyond `linkSrc` (which it reuses).
3. **Pointer paths are untouched** — no pointer handler is modified; the only changes to pointer-reachable elements are attributes (`tabindex`) that don't alter hit-testing or event flow.

### 2.1 Roving tabindex on `.node`

In `renderBlock` (line 1755), the node creation:

```js
// before
const n = el('div',{class:'node '+…, style:…, role:'group', 'aria-label':`${b.type}: ${b.text||''}`});
// after (editable canvases only; read-only keeps role=group, no tabindex)
const n = el('div',{class:'node '+…, style:…,
  role: editable?'button':'group',
  tabindex: editable ? (b.id===rovingId() ? '0' : '-1') : null,
  'aria-label':`${PALETTE[b.type]?PALETTE[b.type].label:b.type}: ${b.text||'untitled'}${b.locked?' — locked':''}${b.pain?' — pain point':''}`});
```

- **Who gets `0`:** `rovingId()` = `sel` if it's a block id, else the first block in **visual order** (sort by `y` then `x` — reading order, matching how the teardown assembles left→right). One tab stop for the whole flock; Tab from the toolbar lands on `scene` (already `tabindex=0`, line 1653), then one more Tab enters the flock at the selected/top-left node.
- **How it moves:** focusing any node updates `sel` (§2.2) → next `draw()` re-rolls the roving 0. Within a paint, Tab/Shift+Tab are intercepted (§2.3) so the -1 nodes are still reachable.
- **Labels leave the Tab order:** line 1783's label gets `tabindex:'-1'` added. This is the fix for the measured "flat run of 30 contenteditable stops" — labels stay focusable by click/dblclick/Enter/programmatic `.focus()` (the e2e `dropBlock` autofocus at line 1858 is programmatic — unaffected), they just stop polluting the Tab walk.
- `role:'button'` on editable nodes: announces as actionable ("Persona: OpCo GM, button"), which matches Enter-to-edit. `aria-label` upgraded to use the human palette label + locked/pain state (was `${b.type}: ${b.text}` — "persona" vs "Persona" is minor but free).

Helper inside `makeCanvas`:

```js
const visualOrder = () => (c.blocks||[]).slice().sort((a,b)=> (a.y-b.y)||(a.x-b.x));
const rovingId = () => (sel && (c.blocks||[]).some(b=>b.id===sel)) ? sel : (visualOrder()[0]||{}).id;
function focusNode(id){ const n=world.querySelector(`.node[data-id="${id}"]`); if(n) n.focus({preventScroll:true}); }
```

### 2.2 focus → `setSel` wiring (and why it can't fight `selRestore` or the inspector)

Per-node, in `renderBlock` (inside the `if (editable)` block at line 1798):

```js
n.addEventListener('focus', ()=>{ if(sel!==b.id){ setSel(b.id); draw(); } });
```

- **The `sel!==b.id` guard kills every loop:** `draw()` destroys and recreates the focused node; the §2.5 refocus puts focus back on the recreated node; its focus event fires; `sel===b.id` now; no-op. Settled in one bounce.
- **Pointer composes:** `onNodeDown` (line 1872) runs `setSel(b.id); draw()` on pointerdown *before* the browser's click-focus lands on the node (pointerdown → our handler → focus). By focus time `sel===b.id` → guard → no second draw. (Chrome/Safari focus divs with `tabindex` on click; Firefox does too for `tabindex` elements. Where a browser doesn't, nothing changes — pointer selection never depended on focus.)
- **`ui.selRestore`:** `setSel` *writes* `selRestore` (line 1627) — keyboard selection persists across broadcast re-renders exactly like pointer selection, and B5's `.node[data-id]` arm restores *focus* to the same node after the full `render()`. The two stores never disagree because there is only one writer (`setSel`).
- **The inspector opens for keyboard users for free:** the inspector renders when `sel` is a non-locked block and `activeTool==='select'` (line 1722) — keyboard selection satisfies the same condition. Reaching it: §2.3's `i` key.
- **Locked blocks:** selectable by keyboard (parity with pointer — clicking locked blocks selects them and shows "⚑ Challenge this", line 1715). Nudging locked blocks is also allowed (pointer-drag of locked blocks is allowed today — only delete/edit are blocked); keeping parity avoids inventing a new rule.

### 2.3 Keyboard navigation + the full interaction table

New branches in the **existing** scene keydown handler (line 1910) — quoted current handler for anchoring:

```js
scene.addEventListener('keydown', e=>{
    if (!editable) return;
    if ((e.key==='Delete'||e.key==='Backspace') && sel){ … }     // existing — unchanged
    if (e.key==='Escape'){ setSel(null); linkSrc=null; setTool('select'); updateTools(); draw(); }  // existing — see tweak below
});
```

Additions (order matters — they go *before* the existing Escape branch; the Delete branch is untouched):

```js
    const tgtNode = e.target.closest && e.target.closest('.node');
    const b = tgtNode ? (c.blocks||[]).find(x=>x.id===tgtNode.dataset.id) : null;

    // Enter: place (placement tool) · complete arrow (linkSrc) · edit label (select tool on a node)
    if (e.key==='Enter'){
      if (activeTool!=='select' && activeTool!=='arrow'){ e.preventDefault();
        const r=scene.getBoundingClientRect();
        createBlockAt(toWorld(r.left+r.width/2, r.top+r.height/2), activeTool);
        announce(PALETTE[activeTool].label+' placed at the centre — type its name, Enter to finish.'); return; }
      if (b && linkSrc && linkSrc!==b.id){ e.preventDefault(); keyConnect(b); return; }
      if (b && activeTool==='select'){ e.preventDefault();
        if (b.locked){ announce('Locked block — press C to challenge it.'); return; }
        const l=tgtNode.querySelector('.label'); if(l){ l.focus(); document.getSelection().selectAllChildren(l); } return; }
    }
    // Arrow keys: nudge the focused/selected block (Shift = fine)
    if (b && /^Arrow(Left|Right|Up|Down)$/.test(e.key)){ e.preventDefault();
      const d = e.shiftKey?1:10;
      if (e.key==='ArrowLeft') b.x-=d; if (e.key==='ArrowRight') b.x+=d;
      if (e.key==='ArrowUp') b.y-=d; if (e.key==='ArrowDown') b.y+=d;
      tgtNode.style.left=b.x+'px'; tgtNode.style.top=b.y+'px'; drawArrows();   // same fast path as pointer drag (line 1874)
      clearTimeout(nudgeT); nudgeT=setTimeout(()=>{ commit(); announce('Moved to '+b.x+', '+b.y+'.'); }, 600);
      return; }
    // Tab roving between nodes (visual order); falls through to native at the ends
    if (e.key==='Tab' && b){
      const ord=visualOrder(); const i=ord.findIndex(x=>x.id===b.id);
      const nx=e.shiftKey? ord[i-1] : ord[i+1];
      if (nx){ e.preventDefault(); focusNode(nx.id); }
      return; }
    // A: arrow mode from the focused node (reuses the linkSrc state machine, line 1864)
    if (b && (e.key==='a'||e.key==='A') && activeTool==='select'){ e.preventDefault();
      if (!linkSrc){ linkSrc=b.id; draw(); announce('Arrow from '+(b.text||b.type)+'. Tab to the target, then press A or Enter. Escape cancels.'); }
      else if (linkSrc!==b.id) keyConnect(b);
      return; }
    // i: jump into the inspector (the back of the card) for the selected block
    if (b && (e.key==='i'||e.key==='I') && activeTool==='select' && sel===b.id){
      const ta=world.querySelector('.inspector textarea, .inspector .capb'); if(ta){ e.preventDefault(); ta.focus(); }
      return; }
    // C: challenge a focused locked block (keyboard parity with the ⚑ button)
    if (b && (e.key==='c'||e.key==='C') && b.locked && opts.onChallengeLock){ e.preventDefault(); opts.onChallengeLock(b); return; }
```

with the tiny shared completion + state:

```js
  let nudgeT=null;
  function keyConnect(b){
    const from=(c.blocks||[]).find(x=>x.id===linkSrc);
    c.arrows.push({id:'a'+Date.now().toString(36), from:linkSrc, to:b.id}); linkSrc=null; commit(); draw();
    announce('Arrow connected '+((from&&from.text)||'source')+' to '+(b.text||b.type)+'.');
    focusNode(b.id);
  }
```

Existing-branch tweaks (2 lines):
- **Escape** (line 1920) appends `scene.focus({preventScroll:true});` and `announce(linkSrc?'Arrow cancelled.':'Selection cleared.')` *before* clearing — Escape currently re-renders the focused node away and drops focus on `<body>`; refocusing the scene keeps the user in the canvas (and is the documented composite-exit: Escape → scene → Tab leaves the canvas entirely. No keyboard trap: Tab also exits natively past the last/first node).
- **Delete** (line 1916) appends `announce('Deleted '+(deleted.text||deleted.type)+'.'); scene.focus({preventScroll:true});` (capture the block before splice). The existing locked-block toast (`'Locked block — challenge it…'`) is announced for free via B1.

**Keyboard-interaction table** (key × context → action × announcement; "—" = native/none; all contexts assume an editable canvas):

| Key | Scene focused | Node focused | Label/inspector editing | Placement tool active | Arrow pending (`linkSrc`) |
|---|---|---|---|---|---|
| **Tab** | native → first node (roving 0) | next node, visual order; **last node: native exit** | native | same as context | same (roam to target) |
| **Shift+Tab** | native ← toolbar | previous node; **first: native → scene** | native | same | same |
| **Enter** | place block at viewport centre *(placement tool)* — "Trigger placed at the centre — type its name…" | edit label (select tool) / complete arrow (`linkSrc`) — "Arrow connected X to Y." / "Locked block — press C…" | label: existing blur-commit (line 1787) | place at centre | complete arrow on focused node |
| **↑↓←→** | — (no selection) | nudge ±10px (Shift ±1), commit debounced 600ms — "Moved to 320, 140." | caret movement (stopPropagation — never reaches us) | nudge if a node is focused | nudge |
| **A** | — | start arrow from node — "Arrow from X. Tab to the target…" | typed text (never reaches us) | — (select tool only) | complete arrow on focused node |
| **i** | — | focus the inspector (back of the card) for the selected block | — | — | — |
| **C** | — | locked node: open Challenge modal | — | — | — |
| **Delete/⌫** | existing: delete selection | existing (focus returns to scene) — "Deleted X." | existing guard (line 1913: ignored while label focused) | existing | existing |
| **Escape** | existing: clear sel/linkSrc/tool | existing + refocus scene — "Selection cleared." | label: blur (native Esc loses focus) → scene handler next press | reverts to select | "Arrow cancelled." |

Node **focus** itself needs no `announce()` — the node's `aria-label` ("Persona: OpCo GM — locked") is read natively on focus, which is the right division: identity from the accessibility tree, *outcomes* from the live region.

### 2.4 Enter-to-place details

Reuses `createBlockAt` (line 1842) verbatim — it already: clamps the drop into the visible scene viewport (the A3 clamp, lines 1845–1851), stamps author meta, nests moments into phases, sets `editingLock=true`, selects the block, and **focuses the new label** (line 1858) — so the keyboard flow after Enter is: type the name → Enter (label's own handler blurs+commits, line 1787) → focus… falls to body on the echo re-render today, but B5's microtask restores it to the node (`.node[data-id]`, since `sel` is the new block). The viewport-centre world point comes from the existing `toWorld` (line 1664) fed with the scene rect centre — quoted in §2.3. `createBlockAt` also flips the tool back to select (line 1859), same as pointer placement — announced implicitly by the next action.

One deliberate non-feature: no keyboard *tool* shortcuts (P for persona etc.) in this pass — the toolbar buttons are real buttons, already tabbable and labelled; a keyboard user clicks them with Enter/Space natively. Shortcut keys are polish, and every global single-letter shortcut is a fresh conflict surface with future text inputs.

### 2.5 Focus surviving `draw()` and `render()`

Two distinct rebuild scopes, two mechanisms:

- **Within-canvas `draw()`** (every selection change, arrow add, nudge-commit echo): `draw()` (line 1673) wipes `.node` elements. Add at its top: `const hadNodeFocus = document.activeElement && world.contains(document.activeElement) && document.activeElement.classList.contains('node') ? document.activeElement.dataset.id : null;` and at its bottom (after `applyTransform()`): `if (hadNodeFocus) focusNode(sel && (c.blocks||[]).some(x=>x.id===sel) ? sel : hadNodeFocus);`. Scoped to *node* focus only — if the inspector textarea or a label is focused, `draw()` isn't running anyway (`editingLock` / inspector's own commit paths), and we must never steal focus from text entry.
- **Full `render()`** (every broadcast): B5 restores `.node[data-id=sel]`. `ui.selRestore` reconstructs `sel` in the fresh `makeCanvas` (line 1626), `renderBlock` gives that node `tabindex=0` (§2.1), and B5's microtask focuses it. Dependency note for the lead: **B9's cross-render focus story requires B5** — ship B5 first or together.

### 2.6 What B9 explicitly does NOT touch (constraint compliance)

- **No pointer handler modified.** `onNodeDown`, scene `pointerdown`, handles, bend handles: byte-identical. Hit-testing unchanged (`tabindex` is inert for pointers).
- **e2e suites:** they drive tools and canvas by `click()`/`fill()`/programmatic waits — never Tab, never arrow keys on the canvas. The one behavioural delta visible to them: clicking a node now also *focuses* it. Keydowns still bubble from the node to the scene handler (node is inside scene), so the existing Delete-after-click behaviour is preserved — strictly, it becomes *more* reliable (Delete works even when the click-focus lands on the node instead of the scene). Section 6 enumerates every suite assertion anyway.
- **`editingLock`:** label and inspector keydowns `stopPropagation()` at the source (lines 1787, 1743) — the new branches are unreachable during typing. The Delete branch's existing label-guard (line 1913) stays as a second fence.
- **Calm canvas:** zero new motion. Focus visibility comes from the existing global `:focus-visible` outlines (lines 78–91 cover `button`/`[contenteditable]`/inputs) — **one CSS addition needed**: `.node:focus-visible{outline:2px solid var(--ink); outline-offset:3px}` (nodes are divs, not covered by the current selectors). Keyboard-only, invisible to mouse users (`:focus-visible` semantics).
- **`ingcard` keyboard parity** (2 lines, same constraint family): the teardown cards are already `tabindex=0` (line 1689) with click-to-open WHY (line 1700) but no key handler — add `card.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); card.classList.toggle('open'); }});` plus `role:'button'`/`'aria-expanded'` sync. Cheap, closes an obvious "focusable but inoperable" axe-adjacent hole.

### 2.7 Announcements: dedicated `#sr-status` live region (decision + justification)

**Decision: a dedicated visually-hidden `role=status` div, NOT the toast channel.** Justification:
- Canvas announcements are high-frequency, low-ceremony ("Moved to 320, 140") — pushing them through `toast()` would paint a visible toast for every nudge-settle, polluting the calm canvas for sighted users and burying real toasts. The toast channel (B1) is for messages *everyone* should perceive; `announce()` is for messages only AT users need.
- A separate region also avoids the 3.4s toast-removal churn interrupting longer SR readouts.

Implementation (next to `#toasts`, line 851 — outside `#app`, so `render()` never destroys it and the live region's "is in the accessibility tree before content changes" requirement is satisfied):

```html
<div id="sr-status" class="sr-only" role="status" aria-live="polite"></div>
```

```js
let _annT=null;
function announce(msg){ if(!msg) return; const n=$('#sr-status'); if(!n) return;
  clearTimeout(_annT); n.textContent='';                       // clear-then-set re-fires identical messages
  _annT=setTimeout(()=>{ n.textContent=msg; },30); }
```

(The 30ms clear/set gap is the standard re-announce trick for repeated messages like two successive "Moved to…". Polite, never assertive — nothing on the canvas is an emergency.)

**Line budget check:** §2.1 ~10 · §2.2 ~3 · §2.3 ~55 · §2.5 ~8 · §2.6 ingcard ~4 · §2.7 ~10 · helpers ~10 → **~100–120 lines**, on target.

---

## 3. B10 — self-hosted fonts + service worker + manifest

### 3.1 Fonts (the venue-LAN identity fix — this part works on plain http)

**Files to fetch** — the Google Fonts css2 API serves *variable* woff2 slices preserving exactly the axes you request (this is the only safe source for Fraunces' custom **WONK** axis — google-webfonts-helper serves static instances and would silently drop it, breaking every `font-variation-settings:"WONK" 1` wordmark). One-time fetch, with a modern Chrome UA so woff2-variations CSS is returned:

```bash
UA='Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/125 Safari/537.36'
curl -sA "$UA" 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,WONK@9..144,300..900,0..1&display=swap'
curl -sA "$UA" 'https://fonts.googleapis.com/css2?family=Inter:wght@400..600&display=swap'
curl -sA "$UA" 'https://fonts.googleapis.com/css2?family=Caveat:wght@500..600&display=swap'
# → copy each `latin` block's fonts.gstatic.com URL, download to:
public/fonts/fraunces-latin-var.woff2     (~45 KB)
public/fonts/inter-latin-var.woff2        (~40 KB)
public/fonts/caveat-latin-var.woff2       (~25 KB)
```

Scope decisions (each is a deliberate cut, state them in review):
- **Latin subset only** (per the brief). The latin unicode-range covers everything the app's own copy uses — curly quotes U+2019, mid-dot U+00B7, em-dash U+2014 are all in `U+0000-00FF`/`U+2000-206F`. User-entered names in non-latin scripts fall back to system fonts — acceptable, same as today's CDN subsets.
- **Fraunces italic dropped** (the current `<link>` loads it — line 12 — but `grep font-style:italic` shows italics only on Inter-bodied elements like `.tiphint`/`.ctareason`/`.whyhint`, which the browser synthesizes; no `.fraunces` element is italic). Halves the Fraunces payload.
- **Inter as one variable file** `wght 400..600` (today: three static weights); Caveat `500..600`.

**`<link>` replacement** — lines 10–12 deleted:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:…&display=swap" rel="stylesheet">
```

replaced by preloads + `@font-face` at the top of the main `<style>`:

```html
<link rel="preload" href="/fonts/fraunces-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/caveat-latin-var.woff2" as="font" type="font/woff2" crossorigin>
```

```css
@font-face{ font-family:'Fraunces'; src:url('/fonts/fraunces-latin-var.woff2') format('woff2');
  font-weight:300 900; font-style:normal; font-display:swap;
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face{ font-family:'Inter'; src:url('/fonts/inter-latin-var.woff2') format('woff2');
  font-weight:400 600; font-style:normal; font-display:swap; unicode-range:/* same latin range */; }
@font-face{ font-family:'Caveat'; src:url('/fonts/caveat-latin-var.woff2') format('woff2');
  font-weight:500 600; font-style:normal; font-display:swap; unicode-range:/* same latin range */; }
```

Notes: `format('woff2')` is correct for variable fonts in all current engines (`woff2-variations` is the legacy token; not needed at our browser floor). `opsz` is an implicit axis — `font-optical-sizing:auto` (default) + the existing explicit `font-variation-settings:"opsz" …` both keep working; **WONK** keeps working because the axis ships in the file (verify post-fetch: `fc-scan` or simply the wordmark's wonky glyphs — §6 adds a visual check). OFL license: drop `public/fonts/OFL.txt` alongside (one file, three license texts concatenated) — removes the procurement question.

This also deletes a third-party beacon (fonts.googleapis.com) — worth a line in the diligence notes.

### 3.2 Service worker — `public/sw.js` (~30 lines)

**Honest scope flag first (pre-empting the adversarial review):** service workers require a secure context — **https or `localhost` only**. On the stated venue deployment (participants hitting `http://192.168.x.x:3000`), **the SW will not register on participant phones.** The SW's payoff is real but bounded: hosted/https demos (Render/Railway), the facilitator's own localhost laptop, and installability. **The fonts in §3.1 — plain static files — are the actual venue-LAN resilience fix.** Ship both, but don't claim the SW solves the LAN reload case. (If venue-grade offline shell ever matters, the path is mkcert/Caddy local TLS — out of scope.)

`express.static(path.join(__dirname,'public'))` is mounted at `/` (server.js line 38), so `/sw.js` is served from the origin root → **default scope `/` works with zero server changes** (no `Service-Worker-Allowed` header needed).

```js
// public/sw.js — Horsepower app-shell cache. Bump V on every deploy that changes index.html.
const V = 'hp-shell-v1';
const SHELL = ['/', '/fonts/fraunces-latin-var.woff2', '/fonts/inter-latin-var.woff2',
               '/fonts/caveat-latin-var.woff2', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  // network-only for /api (coach, info, health); WebSocket upgrades never hit 'fetch'.
  if (e.request.mode === 'navigate') {
    // stale-while-revalidate for the shell: instant offline reload, fresh on the next one
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match('/');
      const net = fetch('/').then(r => { if (r.ok) c.put('/', r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // cache-first for static (fonts are immutable per-version)
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
```

Design calls: **stale-while-revalidate for navigations** (not pure cache-first) so a deploy propagates on the *second* load even if `V` isn't bumped — pure cache-first + forgotten version bump is the classic SW self-own; the revalidate makes the version bump a freshness optimisation rather than a correctness requirement. `/api/*` and cross-origin are never intercepted (rule #8: never let the cache impersonate the server — a stale coach reply or `/api/info` would be worse than a failure). WS traffic can't be intercepted by `fetch` at all.

**Registration** — one line at the end of the main script (after `connect()`), guarded so the qa-walkthrough console-error log stays clean on http-LAN where registration throws:

```js
if ('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost'))
  navigator.serviceWorker.register('/sw.js').catch(()=>{});
```

### 3.3 `public/manifest.json` + head link

```json
{ "name": "Horsepower — AI-Native Workflow Studio", "short_name": "Horsepower",
  "start_url": "/", "display": "standalone",
  "background_color": "#f4efe2", "theme_color": "#21314f",
  "icons": [ { "src": "/img/icon-512.png", "sizes": "512x512", "type": "image/png" },
             { "src": "/img/icon-192.png", "sizes": "192x192", "type": "image/png" } ] }
```

`<link rel="manifest" href="/manifest.json">` after the theme-color meta (line 8). Icons: two PNGs of the existing horse glyph on the cream paper ground — add to the `docs/image-prompts.md` pipeline (slots already exist for `public/img/`); until they land, ship the manifest with an SVG icon entry (`"src":"/img/icon.svg","sizes":"any","type":"image/svg+xml"` — Chrome accepts it; the PNGs upgrade it later). Manifest 404s are silent, so this can ship ahead of the icons without console noise — but generate at least the SVG day one.

---

## 4. B7 (done in §1) + B11 — export pack print block

`exportPack` (line 2540) writes a standalone popup doc. Two gaps: print drops the washes (no `print-color-adjust`), and `canvasToSvg` truncates labels at 28 chars (line 2578) — long block names are lost in the leave-behind.

**Edit 1** — append to the `<style>` inside `win.document.write` (line 2555ff), keeping the export's deliberate literal-hex palette:

```css
@page{ margin:14mm }
*{ -webkit-print-color-adjust:exact; print-color-adjust:exact }
@media print{ body{ background:#fff; padding:0 } .page{ break-inside:avoid; page-break-inside:avoid } }
```

**Edit 2** — two-line label wrap in `canvasToSvg`. Current (line 2578, the `<text>` tail):

```js
…<text x="${b.x+b.w/2}" y="${b.y+b.h/2+4}" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#21314f">${esc((b.text||'').slice(0,28))}</text>`;
```

Replacement — split once at the nearest space around char 26, render `<tspan>` pair, ellipsize past ~52:

```js
const txt=(b.text||''); let l1=txt, l2='';
if(txt.length>26){ const cut=txt.lastIndexOf(' ',26); l1=txt.slice(0, cut>10?cut:26); l2=txt.slice(l1.length).trim(); if(l2.length>26) l2=l2.slice(0,25)+'…'; }
s+=`<text x="${b.x+b.w/2}" y="${b.y+b.h/2+(l2?-2:4)}" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#21314f">${esc(l1)}${l2?`<tspan x="${b.x+b.w/2}" dy="13">${esc(l2)}</tspan>`:''}</text>`;
```

(e2e-playwright's export check asserts `/Before|After|people landed/i` on body text — both edits are invisible to it.)

---

## 5. B12 — cheap platform fits (SHIP/DEFER calls)

| Item | Call | Design + reasoning |
|---|---|---|
| **View Transitions around phase changes** | **DEFER** | The wrapper is trivial (`if(document.startViewTransition && !REDUCED && phaseChanged){ document.startViewTransition(()=>renderBody()) } else renderBody()`), and it would *replace* `.phasein` (running both = double cross-fade). But: `startViewTransition` makes the DOM swap asynchronous (callback in a microtask after snapshot), which threads through `editingLock`/`pendingRender` and B5's restore-microtask ordering; broadcasts can arrive mid-transition (needs `skipTransition()` plumbing); and the visible payoff over the existing 0.28s `.phasein` cross-fade (line 725) is ~nil — the design system already has its phase choreography. High interaction-risk, near-zero gain → defer; revisit if a designed phase *morph* (e.g. canvas→share minis) is ever wanted, which is what VT is actually good at. |
| **Reduced-motion change listener** | **SHIP** | Is B8 — designed in §1. |
| **Web Locks single-tab guard** | **SHIP (soft, members only)** | `navigator.locks` is secure-context-gated (same http-LAN caveat as the SW) and the Farrier legitimately runs two windows (console + projected room view) — a hard barrier would break a real facilitation pattern. Design: members only, non-blocking: `if(navigator.locks && me.memberId) navigator.locks.request('hp-'+me.memberId, {ifAvailable:true}, lock => lock ? new Promise(()=>{}) : (toast('Horsepower is open in another tab — this tab may fight it for your seat.', true), null));` — one statement after `connect()`. First tab holds the lock forever; later tabs get the warn toast (announced via B1). No barrier UI, no suite impact (suites use isolated contexts — fresh `memberId` each, no lock collision). |
| **gzip for hosted** | **DEFER** | Invisible on LAN (104ms FCP measured); on Render/Railway the 233KB single file costs ~one extra RTT. A no-dep fix exists (pre-gzip `index.html` at boot with `zlib.gzipSync`, serve when `Accept-Encoding` matches, ~10 lines in server.js) but it belongs to Cluster A's server pass if at all — bundling server edits into the a11y cut muddies both reviews. Record as a known, cheap, deferred item. |
| **`@starting-style` for entrance animations** | **DEFER** | Pure refactor sugar for the class-add-next-frame patterns; zero user-visible delta; churns tested motion code. Adopt opportunistically next time a given animation is touched anyway. |

---

## 6. Verification design

### 6.1 Existing suite assumptions audited (what could break, and why it won't)

From a full read of `e2e-playwright.js` (345 lines, 64 checks) — every focus/click-sensitive moment, mapped to the design that preserves it:

| Suite moment (line) | Assumption | Design answer |
|---|---|---|
| `page.on('dialog')` (22) | native `window.confirm` auto-accepted | `<dialog>` element never fires Playwright's `dialog` event — inert change |
| `dropBlock` (28–37): click tool → click scene → `wait(140)` → `keyboard.type` | `createBlockAt` autofocuses the new label | autofocus path untouched (B9 reuses it); label `tabindex=-1` doesn't affect programmatic `.focus()` |
| inspector flow (164–173): click node → `inspector-why` appears → `fill` → click scene to blur | click-select opens inspector; scene click deselects | pointer handlers untouched; node click-focus no-ops via the `sel!==b.id` guard (§2.2). B5 restore can't steal focus from `fill()` (restore only fires on `render()`, and only into a still-existing key) |
| swap confirm (229) + qa-fixcheck `conf()` (17) | `[data-testid=modal-confirm]` clickable | same testid, inside top-layer `<dialog>` — Playwright clicks top-layer content fine; no open-animation added, so the existing `wait(250)` timing holds |
| reveal (232–240): waits `#reveal.on`, `#reveal-go` visible, +1700ms, click | CTA clickable at +1.7s | B6b focuses it at the same 1700ms mark — focus doesn't affect clickability; `revealSeenFor` flow untouched |
| challenge flow (286–293): tool-arrow→tool-select deselect dance, click locked node, `.modalcard textarea` fill | challenge modal keeps `.modalcard`; locked node click → sel → `challenge-lock` | challenge modal not migrated (out of B6 scope); confirmModal contains no textarea so `.modalcard textarea/input` selectors can't mismatch |
| arrow connect (156–160): clicks with tool-arrow | `onNodeDown` arrow branch | untouched; keyboard A-mode is additive on `linkSrc` only |
| Delete-key behaviours (qa suites) | scene keydown handles Delete after click | now works with focus on node OR scene (keydown bubbles) — strictly wider |
| room-view topbar leak check (78–81) | topbar text content | B3 adds `role` attrs only; sr-only h1 for the room view must NOT contain "host" — it doesn't ("Room view") |
| lobby vocabulary check (104–106) | `#app` text has no swap-vocab | B3 headings audited against the banned list (§1 B3); `#sr-status` lives outside `#app` and is empty at lobby |
| export check (323–327) | popup body text | B11 adds CSS + a tspan — text content preserved |
| `qa-walkthrough.js` console-error log | zero console errors | SW registration guarded + `.catch(()=>{})` (§3.2); manifest link 404-silent until icons land (SVG entry ships day one) |
| `e2e.js` (34 WS contract checks) | server behaviour | zero server changes in Cluster B |

Residual watch-item: B5's microtask runs after *every* render — if any suite step depends on focus *leaving* an input after an unrelated broadcast (none found in the read; the suites always blur explicitly via clicks), it would now stay. Verified absent; noted for the implementer to re-grep if a suite is edited later.

### 6.2 New automated checks — `qa-a11y.js` (new file; shipped suites stay byte-identical)

Rationale for a separate file: B6's constraint is provable only if the existing suites are untouched; and axe-core belongs in a test-only context, not the app (no-framework invariant — the CDN script is injected into the *test* browser page, vendored nothing).

Structure (same harness idiom as `qa-fixcheck.js`: ok()/wait(), Farrier + 2 members, ~20 checks):

1. **axe scans** — inject `https://cdn.jsdelivr.net/npm/axe-core@4/axe.min.js` via `page.addScriptTag` on landing, surface (with map), rebuild, console; assert **0 critical/serious** violations (color-contrast rule off, matching the platform probe).
2. **Live regions**: `#toasts[role=status][aria-live=polite]` exists; trigger a warn toast (bad join code) → toast element has `role=alert`; `#sr-status` exists outside `#app`.
3. **Viewport**: meta content lacks `maximum-scale`.
4. **Landmarks**: exactly one `[role=main]` per view; `[role=banner]` present; sr-only h1 text matches the phase.
5. **Keyboard place**: click `tool-trigger`, focus `.scene`, `keyboard.press('Enter')` → `.node.trigger` exists; type a label; Enter; node text committed (round-trip via second actor).
6. **Roving + nudge**: `Tab` from scene → `document.activeElement` is a `.node`; read `b.x` via evaluate; `ArrowRight` ×3 → x+30 after 700ms settle (commit fired — assert via the *other* member's state); `Shift+ArrowRight` → +1.
7. **Keyboard connect**: focus node A, press `a`, `Tab` to node B, `Enter` → `path.flow` count +1; `#sr-status` text matches `/connected/i`.
8. **Tab exit (no trap)**: from the last node in visual order, `Tab` → activeElement is outside `.world`.
9. **Keyboard delete + announce**: select node, `Delete` → count −1, `#sr-status` matches `/deleted/i`.
10. **B5 focus restore**: Alex focuses `coach-input`, types half a sentence; Bo commits a block move; assert Alex's `document.activeElement` still `coach-input` and caret position preserved.
11. **Dialog**: click home → `dialog[open]` present, activeElement is `modal-confirm`; `Escape` closes and resolves false (still on the same view); reopen → click backdrop coordinates → closes; confirm path still navigates.
12. **Reveal focus**: at swap, after 1.8s, activeElement is `#reveal-go`; `Escape` dismisses (post-cta-ready).
13. **Fonts self-host**: assert zero requests to `fonts.googleapis.com|gstatic.com` (page request log) and `document.fonts.check('600 44px Fraunces')` true; evaluate `getComputedStyle` on the wordmark — fontFamily resolves, plus a screenshot for the WONK eyeball-check.
14. **SW (localhost only)**: `navigator.serviceWorker.ready` resolves; second `page.goto` with `context.setOffline(true)` still renders the landing shell (connection banner state is Cluster C's reconnect work — only the shell is asserted).
15. **Race card DPR**: intercept the download… cheaper: evaluate `saveRaceCardPng`'s canvas via a test hook? No hooks in app code — instead assert indirectly: stub `HTMLCanvasElement.prototype.toDataURL` pre-click to capture `this.width` → `>=1760`.

Run line joins the README block: `BASE=http://localhost:3000 node qa-a11y.js`.

### 6.3 Manual screen-reader smoke (VoiceOver, ~10 min, run once per release)

1. Safari/Chrome + VO (⌘F5). Landing: VO reads "Horsepower — host or join a workshop, heading level 1"; rotor → Landmarks lists banner/main.
2. Join as member (VO types name/code — inputs announce labels). Team picker → lobby: phase changes announced ("Back in the lobby" not expected here; first paint silent — correct).
3. Surface: Tab through toolbar (each tool announces its palette def via title→aria-label), to scene, Tab → first node announces "Persona: …, button". Arrow ×2 → "Moved to x, y" after settle. Enter → label edit; type; Enter; VO returns context to the node.
4. Press `a`, Tab, Enter → "Arrow connected … to …".
5. Have a second device commit an edit mid-VO-reading — verify no focus jump (B5) and no unexpected announcement spam.
6. Farrier advances to Rebuild → member hears the reveal alertdialog content; Tab lands on "Let's build". Post-reveal: "Rebuild phase — you hold another team's workflow" announced.
7. Trigger a warn toast (e.g. delete a locked block) → VO interrupts with the alert.
8. Timer: Farrier starts the clock → member hears "Timer started — 20:00 on the clock"; NO per-second chatter (listen 30s); at expiry, the existing toast announces once.
9. Open the leave-confirm dialog: VO announces title, focus on confirm; Escape returns focus to the home button (native dialog restore).

---

## 7. Risk register

| # | Risk | Likelihood / impact | Mitigation (designed in) |
|---|---|---|---|
| R1 | **Node click-focus changes pointer feel** (focus ring after mouse click) | Med / Low | `:focus-visible` (not `:focus`) — mouse clicks draw no ring; only keyboard focus is visible. No layout/hit-test change. |
| R2 | **B5 restore steals focus from intentional focus moves** (e.g. createBlockAt's label autofocus colliding with a broadcast render) | Low / Med | `activeElement!==body` yield-guard; `editingLock` already blocks renders during label focus; restore is a no-op when the key is gone. qa-a11y #10 pins the composer case. |
| R3 | **`draw()` refocus loop** (focus→setSel→draw→refocus→focus…) | Low / High if hit | `sel!==b.id` guard settles in one bounce (§2.2); qa-a11y #6 would hang/timeout if regressed. |
| R4 | **Suite timing around `<dialog>`** (animation or testid drift) | Low / High (suite = ship gate) | No open animation; identical testids; backdrop-click isolated via paddingless dialog + inner card; `page.on('dialog')` proven inert for dialog elements. Run both shipped suites + qa-fixcheck before merge. |
| R5 | **Keyboard nudge vs LWW echo**: commit at 600ms settle → broadcast echo re-renders mid-nudge-burst | Med / Low | Echo render preserves sel (`selRestore`) + focus (B5) + position (server state already has the committed x/y); a mid-burst echo can revert *uncommitted* keystrokes ≤600ms old — same exposure window as the existing label debounce (line 1786), accepted there, accepted here. |
| R6 | **Tab interception perceived as a keyboard trap** by an auditor | Low / Med | Native exit at both ends of the visual order + Escape→scene; documented in the shortcuts help (`showShortcuts`, line 1951 — extend its copy: "Tab walks the blocks · arrows nudge · A draws an arrow · Enter edits"). |
| R7 | **`A`/`i`/`C` collide with future text inputs on the canvas** | Low / Low | All single-letter keys require `e.target.closest('.node')` and select-tool context; labels/inspector stopPropagation at source. Any future canvas text widget must keep that idiom (note added to the keydown comment). |
| R8 | **WONK axis lost in self-hosted Fraunces** (wordmark goes straight-laced) | Med if fetched wrong / High brand impact | Fetch via css2 API with WONK in the axis tuple (never gwfh static instances); qa-a11y #13 screenshot + `document.fonts.check`; manual wordmark eyeball in the PR. |
| R9 | **SW serves a stale shell after deploy** | Med / Med | Stale-while-revalidate on navigations (fresh by second load) + `V` bump convention in the file's header comment; `/api` never cached so data can't go stale. Worst case: one workshop on yesterday's shell — and the server is the source of truth for all state. |
| R10 | **SW/Web-Locks silently absent on http LAN** creates false confidence | High / Low | Explicitly documented (§3.2, §5) — fonts are the LAN fix; registration guarded so no console errors; do not market offline-shell for the LAN deployment. |
| R11 | **Live-region spam** degrading the SR experience (the inverse failure) | Med / Med | Ticks never live (timer text stays non-live); nudge announcements debounced to settle; polite-only `#sr-status`; VO smoke step 8 checks for chatter. |
| R12 | **Calm-canvas motion regression** | Low / Med | Zero new animations anywhere in Cluster B; the one motion-adjacent change (B8) only makes reduced-motion *more* responsive. The boil ticker's reduced-gate moves inside the tick — same paint behaviour, verified by existing craft checks. |
| R13 | **`role=button` on nodes changes AT semantics for the labels inside** (button containing contenteditable is unusual) | Med / Low | Acceptable trade at this tier: the node announces as one actionable unit; entering label-edit moves focus to the contenteditable, which announces as a text field. If an audit objects, fallback is `role=group` + `aria-roledescription:'block'` — one-attribute swap, noted for the implementer. |
| R14 | **`maximum-scale` removal exposes unwanted page-zoom on canvas gestures** | Low / Low | Canvas pinch is handled on `scene` with its own zoom model and `touch-action`; page-level pinch now works as the platform intends (that's the WCAG point). Phone lanes re-checked in qa-a11y axe run at 390px. |

---

## 8. Build order (suggested)

1. B2, B1, B4, B8 + `.sr-only`/`announce()` primitives — one sitting, all one-liners (run shipped suites).
2. B5 focus restore → B6 dialog + reveal focus (suites again — this is the gate the lead cares about).
3. B3 landmarks/headings (vocab-lint the heading strings).
4. B9 keyboard layer (+ `qa-a11y.js` written alongside, checks 5–9 first).
5. B10 fonts (fetch, swap, eyeball WONK) → sw.js + manifest.
6. B7, B11. 7. B12 ships: Web Locks soft guard. 8. Full pass: `e2e.js` + `e2e-playwright.js` + `qa-fixcheck.js` + `qa-walkthrough.js` (console-error log) + `qa-a11y.js` + VO smoke.
