// Overnight run step 18 · wingmen (js/wingmen.js): hire from saved builds or station stock, fly, fight, take orders,
// get lost and rebuilt. Writes shots/wingmen/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/wingmen';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.wingmen?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('WING');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 await p.evaluate(()=>{garage.closeMission();terrain.off=true;
  window.__fly=id=>{const c=modularShips.compile(modularShips.factory(id));saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});};
  window.__home=()=>{galaxy.enterSystemById('home');worldMap.currentGridX=0;worldMap.currentGridY=0;engine.enterChamber({silent:true});engine.enemies=[];engine.player.x=40;engine.player.y=0;engine.paused=false;};
  window.__run=n=>{engine.paused=false;for(let i=0;i<n;i++)engine.update(1/60);};});
 // 1 · what a frigate may hire, and the price
 report.data.frigate=await p.evaluate(()=>{__home();hubs.openDock();hubs.metal=200;const W=wingmen,o=W.offers(),key=o[0]?.key,poor=W.hire(key);hubs.metal=1e6;const m0=hubs.metal,ok=W.hire(key),spent=m0-hubs.metal,full=W.hire(o[1]?.key||key);
  hubs.closeDock();const undocked=W.hire(key);return{slots:W.slots(),classes:[...new Set(o.map(x=>x.cls))],poor,ok,spent,price:o[0]?.price,full,undocked,n:W.doc().list.length};});
 const F=report.data.frigate;
 check('a frigate commands one wingman, frigate-class only; hiring needs a dock and the metal, then spends exactly the price',F.slots===1&&F.classes.join()==='frigate'&&!F.poor&&F.ok&&F.spent===F.price&&!F.full&&!F.undocked&&F.n===1,F);
 // 2 · a battleship commands three, from your saved builds first
 report.data.big=await p.evaluate(()=>{__fly('dreadnought');__home();hubs.openDock();hubs.metal=1e7;const W=wingmen;W.dismiss(W.doc().list[0].id);
  const lancer=modularShips.compile(modularShips.factory('lancer')).design;lancer.name='MY LANCER';saveState.doc.workshop={v:1,builds:{b1:lancer},draft:null};
  const o=W.offers(),first=o[0];for(let i=0;i<3;i++)W.hire(o[i].key);const titan=o.some(x=>x.cls==='titan');hubs.closeDock();
  return{slots:W.slots(),first:{name:first.name,source:first.source},titan,n:W.doc().list.length,live:W.live.length};});
 const G=report.data.big;
 check('a battleship commands three; your saved build heads the list; nothing bigger than your frame is offered',G.slots===3&&G.first.source==='Your build'&&G.first.name==='MY LANCER'&&!G.titan&&G.n===3&&G.live===3,G);
 // 3 · formation and fire
 report.data.fly=await p.evaluate(()=>{const P=engine.player;engine.enemies=[];P.vx=4;P.vy=0;__run(240);const near=wingmen.live.map(w=>Math.round(Math.hypot(w.x-P.x,w.y-P.y)));
  const e=new EnemyOrganism(P.x+700,P.y+100,{tier:4,archetype:'stalker'});e.update=()=>{};engine.enemies.push(e);const hp0=e.hp;let wingShots=0;const push=engine.projectiles.push;engine.projectiles.push=function(...q){for(const s of q)if(s.owner==='wing')wingShots++;return push.apply(this,q);};
  P.vx=P.vy=0;const read=engine.readInput;engine.readInput=function(){return this.input={ax:0,ay:0,aimX:P.x+1,aimY:P.y,fire:false};};__run(240);engine.readInput=read;engine.projectiles.push=push;return{near,wingShots,dealt:Math.round(hp0-Math.max(0,e.hp)),killed:e.hp<=0};});
 const Y=report.data.fly;
 check('wingmen hold formation on your hull and shoot hostiles in range with their own guns',Y.near.every(d=>d<1400)&&Y.wingShots>0&&(Y.dealt>0||Y.killed),Y);
 // 4 · orders on 5–8
 report.data.orders=await p.evaluate(()=>{const P=engine.player,out={};for(const [k,o] of [['Digit6','attack'],['Digit7','hold'],['Digit8','guard'],['Digit5','follow']]){window.dispatchEvent(new KeyboardEvent('keydown',{code:k}));out[o]=wingmen.doc().order===o;}
  wingmen.order('hold');const at=wingmen.live.map(w=>({x:w.x,y:w.y}));P.x+=3000;__run(120);const held=wingmen.live.every((w,i)=>Math.hypot(w.x-at[i].x,w.y-at[i].y)<300);P.x-=3000;wingmen.order('follow');
  const chip=document.getElementById('wing-orders');return{...out,held,chip:!!chip&&!chip.hidden&&chip.textContent};});
 const O=report.data.orders;
 check('keys 6, 7, 8, 5 set attack, hold, guard, follow; HOLD keeps them where they were; the WING chip shows the order',O.attack&&O.hold&&O.guard&&O.follow&&O.held&&/WING ×3 · FOLLOW/.test(O.chip),O);
 await p.screenshot({path:`${out}/wing.png`});
 // 5 · they come with you across sectors
 report.data.jump=await p.evaluate(()=>{worldMap.currentGridX=2;worldMap.currentGridY=1;engine.enterChamber({silent:true});engine.enemies=[];const P=engine.player;return{live:wingmen.live.length,near:wingmen.live.every(w=>Math.hypot(w.x-P.x,w.y-P.y)<1500)};});
 check('crossing into another sector brings the wing with you',report.data.jump.live===3&&report.data.jump.near,report.data.jump);
 // 6 · loss and rebuild
 report.data.loss=await p.evaluate(()=>{const w=wingmen.live[0],id=w.rec.id,P=engine.player;engine.projectiles.push(new Projectile(w.x,w.y,0,0,{damage:1e6,radius:8,isPlayer:false,color:'#f00',life:5}));__run(2);const lost=wingmen.doc().list.find(r=>r.id===id).lost,live=wingmen.live.length;
  const undocked=wingmen.rebuild(id);__home();hubs.openDock();const rec=wingmen.doc().list.find(r=>r.id===id),cost=Math.round(rec.price*wingmen.CFG.rebuildPart),m0=hubs.metal,ok=wingmen.rebuild(id);return{lost,live,undocked,ok,spent:m0-hubs.metal,cost,back:wingmen.live.length};});
 const L=report.data.loss;
 check('a wingman can be lost; it is rebuilt only at a station, for a quarter of its hire price',L.lost&&L.live===2&&!L.undocked&&L.ok&&L.spent===L.cost&&L.back===3,L);
 // 7 · the dock button and the journal tab
 report.data.ui=await p.evaluate(()=>{const b=document.getElementById('dock-wingmen'),vis=!!b&&b.offsetParent!==null,label=b?.textContent;b?.click();return{vis,label};});
 await p.waitForTimeout(300);
 report.data.ui.panel=await p.evaluate(()=>({panel:!!document.getElementById('wingmen-panel'),rows:document.querySelectorAll('#wingmen-panel [data-wingman]').length,orders:document.querySelectorAll('#wingmen-panel [data-wing-order]').length}));
 await p.screenshot({path:`${out}/journal.png`});await p.evaluate(()=>pilotRpg.close());
 const U=report.data.ui;
 check('the dock footer has a Wingmen button that opens the Wingmen journal tab: the wing, its orders, hiring',U.vis&&/Wingmen · 3\/3/.test(U.label)&&U.panel.panel&&U.panel.rows===3&&U.panel.orders===4,U);
 // 8 · cost to draw three battleship-class wingmen
 report.data.cost=await p.evaluate(()=>{hubs.closeDock();engine.paused=false;const round=()=>{const t0=performance.now();for(let i=0;i<20;i++)engine.render();return(performance.now()-t0)/20;};for(let i=0;i<5;i++)engine.render();let on=1e9,off=1e9;const keep=wingmen.live.splice(0);
  for(let r=0;r<3;r++){wingmen.live.push(...keep);on=Math.min(on,round());wingmen.live.splice(0);off=Math.min(off,round());}wingmen.live.push(...keep);return{on:+on.toFixed(2),off:+off.toFixed(2),extra:+(on-off).toFixed(2)};});
 check('three wingmen add under 4 ms a frame to the render',report.data.cost.extra<4,report.data.cost);
 // 9 · persistence
 await p.evaluate(()=>saveState.save());await p.reload();await p.waitForFunction(()=>window.wingmen?.ready);await p.locator('#btn-title-continue').click();await p.waitForTimeout(600);
 report.data.reload=await p.evaluate(()=>({n:wingmen.doc().list.length,live:wingmen.live.length,order:wingmen.doc().order}));
 check('the wing and its order survive a reload',report.data.reload.n===3&&report.data.reload.live===3&&report.data.reload.order==='follow',report.data.reload);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('wingmen witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
