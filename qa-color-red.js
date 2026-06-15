const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:3200';
const OUT = path.join(__dirname, 'qa-design', 'color');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch();
  const mk = async vp => { const c = await browser.newContext({ viewport: vp||{width:1440,height:900}, deviceScaleFactor:2 }); const p = await c.newPage(); await p.goto(BASE); return p; };
  const F = await mk();
  await F.click('[data-testid=host-btn]'); await F.waitForSelector('.codechip',{timeout:8000});
  const code = (await F.textContent('.codechip')).trim();
  const A = await mk();
  await A.fill('[data-testid=join-name]','Red'); await A.fill('[data-testid=join-code]',code); await A.click('[data-testid=join-btn]');
  await A.waitForSelector('[data-testid=create-team-name]',{timeout:8000});
  await A.fill('[data-testid=create-team-name]','Reds'); await A.click('[data-testid=create-team-btn]');
  await A.waitForSelector('[data-testid=stable]',{timeout:8000});
  await A.click('[data-testid=lets-ride]').catch(()=>{});
  // need 2 teams for runbar but surface only needs whatever; start surface
  const B = await mk();
  await B.fill('[data-testid=join-name]','Blu'); await B.fill('[data-testid=join-code]',code); await B.click('[data-testid=join-btn]');
  await B.waitForSelector('[data-testid=create-team-name]',{timeout:8000});
  await B.fill('[data-testid=create-team-name]','Blues'); await B.click('[data-testid=create-team-btn]');
  await B.waitForSelector('[data-testid=stable]',{timeout:8000});
  await F.click('[data-testid=phase-surface]'); await wait(300);
  if (await F.locator('[data-testid=modal-confirm]').count()) await F.click('[data-testid=modal-confirm]');
  await wait(1000);
  // load a custom short timer if available, else use 20 and fast-forward via server? Just start 20 and override client display
  // Force the red state by injecting elapsed classes for the screenshot
  await F.click('[data-testid=timer-20]').catch(()=>{}); await F.click('[data-testid=timer-start]').catch(()=>{}); await wait(500);
  // roomview, then force-class the bigtimer to elapsed+TIME
  await F.click('[data-testid=toggle-room]'); await wait(900);
  await F.evaluate(()=>{ const bt=document.querySelector('#bigtimer'); if(bt){ bt.classList.add('elapsed'); bt.classList.remove('low'); bt.textContent='TIME'; } const cap=document.querySelector('.roomview .bigcaption, .roomview .cap'); });
  await wait(300);
  await F.screenshot({ path: path.join(OUT,'54-roomview-red-TIME.png') }); console.log('shot 54 roomview red TIME');
  await F.click('[data-testid=toggle-room]').catch(()=>{});
  // member elapsed chip
  await A.evaluate(()=>{ const t=document.querySelector('#timerlive'); if(t){ t.classList.add('elapsed'); t.classList.remove('low'); } });
  await wait(200);
  await A.screenshot({ path: path.join(OUT,'55-member-timer-elapsed.png') }); console.log('shot 55 member elapsed chip');
  // also low (pulse) state member
  await A.evaluate(()=>{ const t=document.querySelector('#timerlive'); if(t){ t.classList.remove('elapsed'); t.classList.add('low'); } });
  await wait(200);
  await A.screenshot({ path: path.join(OUT,'56-member-timer-low.png') }); console.log('shot 56 member low chip');
  // console drill mirror view
  await F.click('[data-testid=team-row]').catch(()=>{}); await wait(800);
  await F.screenshot({ path: path.join(OUT,'57-console-drill.png') }); console.log('shot 57 console drill');
  await browser.close();
  console.log('done');
})();
