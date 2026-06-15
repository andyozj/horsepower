/* Salvage pacer: co-Farrier drives room W4AE through the full arc on schedule. */
const { chromium } = require('playwright');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const F = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
  await F.goto('http://localhost:3200');
  await F.evaluate(() => { localStorage.setItem('horsepower.v2', JSON.stringify({role:'farrier', code:'W4AE', hostKey:'XXKQ', teamId:null, memberId:null, name:''})); location.reload(); });
  await F.waitForSelector('[data-testid=stepper]', { timeout: 10000 });
  const conf = async () => { await wait(300); if (await F.locator('[data-testid=modal-confirm]').count()) await F.click('[data-testid=modal-confirm]'); };
  console.log('co-farrier seated in W4AE');
  await wait(20000); // grace for any joiners
  await F.click('[data-testid=phase-surface]'); await conf();
  console.log('surface started');
  await F.click('[data-testid=timer-6]').catch(()=>{}); await F.click('[data-testid=timer-start]').catch(()=>{});
  await wait(270000); // 4.5 min surface
  await F.click('[data-testid=phase-rebuild]'); await conf();
  console.log('swapped to rebuild');
  // approve any amendment that arrives during rebuild
  for (let i = 0; i < 14; i++) { await wait(15000);
    const a = F.locator('[data-testid=approve-amend]').first();
    if (await a.count()) { await a.click(); console.log('amendment approved'); } }
  await F.click('[data-testid=phase-share]'); await conf();
  console.log('share started');
  const pick = F.locator('[data-testid=present-pick]').first();
  if (await pick.count()) await pick.click();
  await wait(100000);
  const cta = F.locator('[data-testid=phase-closed]');
  if (await cta.count()) { await cta.click(); await conf(); }
  console.log('closed. DONE');
  await b.close();
})().catch(e => { console.log('pacer error:', e.message.split('\n')[0]); process.exit(1); });
