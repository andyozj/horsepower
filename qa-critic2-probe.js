// Probe: does approving an amendment with EMPTY proposed blank the locked field?
const WebSocket = require('ws');
const BASE = process.env.BASE || 'http://localhost:3200';
const WSBASE = BASE.replace('http','ws');
const wait = ms => new Promise(r=>setTimeout(r,ms));
const mk = () => new Promise(res=>{ const w=new WebSocket(WSBASE); w.on('open',()=>res(w)); });

(async()=>{
  const r = await fetch(BASE+'/api/workshop',{method:'POST'});
  const {code, hostKey} = await r.json();
  console.log('throwaway workshop', code);
  const fac=await mk(), a=await mk(), b=await mk();
  const last={};
  [['fac',fac],['a',a],['b',b]].forEach(([k,w])=>w.on('message',d=>{const m=JSON.parse(d); if(m.type==='state') last[k]=m.state; if(m.type==='seated') last[k+'_seat']=m;}));
  fac.send(JSON.stringify({type:'join',role:'farrier',workshopCode:code,hostKey}));
  a.send(JSON.stringify({type:'join',role:'member',workshopCode:code,name:'A'}));
  b.send(JSON.stringify({type:'join',role:'member',workshopCode:code,name:'B'}));
  await wait(200);
  a.send(JSON.stringify({type:'team:create',workshopCode:code,name:'T1',memberName:'A'}));
  b.send(JSON.stringify({type:'team:create',workshopCode:code,name:'T2',memberName:'B'}));
  await wait(300);
  fac.send(JSON.stringify({type:'phase:set',workshopCode:code,phase:'surface'}));
  await wait(200);
  const cv = sd => ({blocks:[
    {id:sd+'p1',type:'persona',x:60,y:60,w:170,h:58,text:'GM',meta:{capacity:'accountable',why:'w'}},
    {id:sd+'tr',type:'trigger',x:60,y:160,w:180,h:54,text:'trigger',meta:{}},
    {id:sd+'in',type:'input',x:60,y:240,w:150,h:46,text:'input',meta:{}},
    {id:sd+'ph',type:'phase',x:300,y:60,w:240,h:120,text:'Phase',meta:{why:'w'}},
    {id:sd+'m',type:'moment',x:320,y:110,w:150,h:50,text:'moment',pain:true,meta:{phaseId:sd+'ph'}},
    {id:sd+'it',type:'intent',x:600,y:60,w:230,h:70,text:'decide which suppliers we pay first',meta:{}},
    {id:sd+'oc',type:'outcome',x:600,y:170,w:200,h:62,text:'terms kept',meta:{}}
  ],arrows:[{id:sd+'a1',from:sd+'tr',to:sd+'ph'}],orphans:[],chat:[],glossary:[]});
  a.send(JSON.stringify({type:'canvas:update',workshopCode:code,canvas:cv('x')}));
  b.send(JSON.stringify({type:'canvas:update',workshopCode:code,canvas:cv('y')}));
  await wait(300);
  fac.send(JSON.stringify({type:'phase:set',workshopCode:code,phase:'rebuild'}));
  await wait(400);
  const ta = last.fac.teams[0];
  console.log('locked intent BEFORE:', JSON.stringify(ta.redesign.locked.intent));
  // challenge with EMPTY proposed (client allows this — only reason required)
  a.send(JSON.stringify({type:'lock:challenge',workshopCode:code,field:'intent',reason:'we just disagree',proposed:''}));
  await wait(250);
  const req = last.fac.teams[0].amendmentRequests[0];
  console.log('request:', JSON.stringify(req));
  fac.send(JSON.stringify({type:'lock:resolve',workshopCode:code,teamId:ta.id,id:req.id,approve:true}));
  await wait(250);
  const after = last.fac.teams[0];
  console.log('locked intent AFTER approve:', JSON.stringify(after.redesign.locked.intent));
  const blk = after.redesign.canvas.blocks.find(bk=>bk.locked&&bk.meta&&bk.meta.lockField==='intent');
  console.log('locked block text AFTER:', JSON.stringify(blk&&blk.text));
  console.log(after.redesign.locked.intent===''?'BUG CONFIRMED: locked field blanked by empty-proposal approval':'no bug — server guarded');
  [fac,a,b].forEach(w=>w.close());
  process.exit(0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
