/* Regression guard for two UAT-found canvas bugs (2026-06-16):
 *   B2 (data-loss): the A0 reconciler kept DOM nodes whose drag/resize handlers closed over a STALE
 *       block from a prior canvas; once _update repointed `c`, a move mutated an orphan and commit()
 *       dropped it — the move reverted on reload. Fix: handlers re-resolve the live block by id.
 *   B1 (clipping): fixed-height nodes clipped long labels (unselected) or spilled them (selected).
 *       Fix: measurement-based auto-grow.
 * Self-contained Playwright run; needs a server up:  BASE=http://localhost:3930 node qa-canvas-sync.js
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3930';
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + JSON.stringify(x) : ''); } };
async function actor(b){ const c=await b.newContext({viewport:{width:1280,height:840}}); const p=await c.newPage(); p.on('dialog',d=>d.accept().catch(()=>{})); p.on('pageerror',e=>console.log('  [pageerror]',e.message)); await p.goto(BASE); return p; }
async function drop(p,sel,tool,x,y,text){ await p.click(`[data-testid=tool-${tool}]`); await p.click(sel,{position:{x,y}}); if(text){ await wait(140); await p.keyboard.type(text);} await p.click('[data-testid=tool-select]'); await wait(150); }

(async()=>{
  const b=await chromium.launch();
  try{
    const F=await actor(b); await F.click('[data-testid=host-btn]'); await F.waitForSelector('.codechip');
    const code=(await F.textContent('.codechip')).trim();
    const conf=async()=>{ await wait(300); if(await F.locator('[data-testid=modal-confirm]').count()) await F.click('[data-testid=modal-confirm]'); };
    const A=await actor(b); await A.fill('[data-testid=join-name]','Alex'); await A.fill('[data-testid=join-code]',code); await A.click('[data-testid=join-btn]');
    await A.waitForSelector('[data-testid=create-team-name]'); await A.fill('[data-testid=create-team-name]','AP'); await A.click('[data-testid=create-team-btn]'); await A.waitForSelector('[data-testid=stable]');
    const B2=await actor(b); await B2.fill('[data-testid=join-name]','Bo'); await B2.fill('[data-testid=join-code]',code); await B2.click('[data-testid=join-btn]');
    await B2.waitForSelector('[data-testid=create-team-name]'); await B2.fill('[data-testid=create-team-name]','ETL'); await B2.click('[data-testid=create-team-btn]'); await B2.waitForSelector('[data-testid=stable]');

    await F.click('[data-testid=phase-surface]'); await conf();
    for(const p of [A,B2]){ await p.waitForSelector('[data-testid=interview-hero]',{timeout:8000}); await p.click('[data-testid=interview-skip]'); await wait(300); await p.waitForSelector('[data-testid=surface-canvas]',{timeout:8000}); }
    const S='[data-testid=surface-canvas]';
    await drop(A,S,'persona',180,140,'AP Clerk');
    await drop(A,S,'phase',180,340,'key it in');

    // B1: a long label must grow the box, not overflow it
    await A.locator(`${S} .node.phase .label`).click(); await wait(100);
    await A.keyboard.press('Control+A');
    await A.keyboard.type('Invoice settled (paid, disputed, or held) with a clean audit trail, no duplicates, and the early-payment discount captured wherever it was possible to do so');
    await A.click('[data-testid=tool-select]'); await wait(500);
    const sz = await A.locator(`${S} .node.phase`).evaluate(n=>{ const l=n.querySelector('.label'); const chrome=n.clientHeight-l.clientHeight; return { over: Math.ceil(l.scrollHeight+chrome) - n.clientHeight }; });
    ok('B1: node box grows to fit a long label (no clip/overflow)', sz.over <= 2, sz);

    // B2: move a block, trigger a foreign-team broadcast, reload → the move must persist server-side
    const posOf = (p)=> p.locator(`${S} .node.phase`).evaluate(n=>({left:n.style.left, top:n.style.top}));
    const before = await posOf(A);
    const box = await A.locator(`${S} .node.phase`).boundingBox();
    await A.mouse.move(box.x+box.width/2, box.y+10); await A.mouse.down();
    await A.mouse.move(box.x+box.width/2+200, box.y+130,{steps:8}); await A.mouse.up(); await wait(250);
    const afterDrag = await posOf(A);
    ok('B2: drag moves the block locally', afterDrag.top!==before.top, {before, afterDrag});
    await drop(B2,S,'persona',200,150,'Someone Else');   // other team edits → broadcast re-render to Alex
    await wait(600);
    await A.reload(); await wait(2500);
    const afterReload = await A.locator(`${S} .node.phase`).evaluate(n=>({left:n.style.left, top:n.style.top})).catch(()=>null);
    ok('B2: the move PERSISTED to the server (survives a broadcast + reload)', afterReload && afterReload.top===afterDrag.top, {afterDrag, afterReload});

    await b.close();
  }catch(e){ console.log('canvas-sync threw:', e.message.slice(0,400)); await b.close(); process.exit(1); }
  console.log(`\nCANVAS-SYNC ${fail?'❌':'✅'} — ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
