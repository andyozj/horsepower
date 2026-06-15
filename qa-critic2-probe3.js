// Probe 3: targeted retest of the "← all teams" drill back-control (iter1 problem 4)
const { chromium } = require('playwright');
const WebSocket = require('ws');
const BASE = process.env.BASE || 'http://localhost:3200';
const WSBASE = BASE.replace('http','ws');
const wait = ms => new Promise(r=>setTimeout(r,ms));
const mk = () => new Promise(res=>{ const w=new WebSocket(WSBASE); w.on('open',()=>res(w)); });

(async()=>{
  const r = await fetch(BASE+'/api/workshop',{method:'POST'});
  const {code, hostKey} = await r.json();
  console.log('throwaway workshop', code);
  const a=await mk();
  a.send(JSON.stringify({type:'join',role:'member',workshopCode:code,name:'A'}));
  await wait(150);
  a.send(JSON.stringify({type:'team:create',workshopCode:code,name:'Probe Crew',memberName:'A'}));
  await wait(250);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport:{width:1440,height:900}});
  await ctx.addInitScript(([c,hk])=>{ localStorage.setItem('horsepower.v2', JSON.stringify({role:'farrier', code:c, hostKey:hk})); }, [code,hostKey]);
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.waitForTimeout(1200);
  // start surface so the dashboard table renders
  await page.click('[data-testid=phase-surface]');
  await page.waitForTimeout(1000);
  // drill in
  await page.click('[data-testid=team-row]');
  await page.waitForTimeout(900);
  const drilled = await page.evaluate(()=>!!document.querySelector('.drill'));
  console.log('drilled in:', drilled);
  await page.screenshot({path:'qa-critic2/farrier/90-probe-drill.png'});
  // click the actual back button several times across broadcasts
  let backOk=false;
  for(let i=0;i<3;i++){
    try{
      await page.click('button:has-text("← all teams")',{timeout:4000});
      await page.waitForTimeout(700);
      backOk = await page.evaluate(()=>!document.querySelector('.drill') && !!document.querySelector('.teamtable'));
      console.log('attempt',i+1,'back to dashboard:',backOk);
      if(backOk) break;
      // re-drill for retry
      await page.click('[data-testid=team-row]'); await page.waitForTimeout(700);
    }catch(e){ console.log('attempt',i+1,'CLICK FAIL:',e.message.split('\n')[0]); try{await page.click('[data-testid=team-row]',{timeout:2000}); await page.waitForTimeout(500);}catch(_){} }
  }
  // also test with a broadcast storm: member spams canvas updates while we click
  await page.click('[data-testid=team-row]'); await page.waitForTimeout(600);
  const storm = setInterval(()=>{ a.send(JSON.stringify({type:'canvas:update',workshopCode:code,canvas:{blocks:[{id:'b'+Math.random().toString(36).slice(2,7),type:'phase',x:Math.random()*500,y:Math.random()*300,w:160,h:60,text:'storm',meta:{}}],arrows:[],orphans:[],chat:[],glossary:[]}})); }, 150);
  let stormOk=false;
  try{
    await page.click('button:has-text("← all teams")',{timeout:5000});
    await page.waitForTimeout(700);
    stormOk = await page.evaluate(()=>!document.querySelector('.drill'));
  }catch(e){ console.log('STORM CLICK FAIL:', e.message.split('\n')[0]); }
  clearInterval(storm);
  console.log('back-click under broadcast storm (150ms re-renders):', stormOk);
  await page.screenshot({path:'qa-critic2/farrier/91-probe-back.png'});
  console.log('page errors:', errs.length?errs:'(none)');
  a.close(); await browser.close();
  console.log('PROBE3 DONE — calm:', backOk, 'storm:', stormOk);
  process.exit(0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
