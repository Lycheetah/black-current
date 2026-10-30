// Master route Stage 2 · the arsenal: curated roster, lanes, curves, scaling shields, retirement.
// Writes shots/arsenal/report.json and shots/arsenal/census.csv (the committed evidence table).
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/arsenal';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data)));};
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/');await p.waitForFunction(()=>window.weaponBalance?.ready&&window.upgradePath?.ready&&window.fleetFormation?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('ARSENAL');await p.locator('#btn-title-quick').click();await p.waitForTimeout(600);await p.evaluate(()=>{garage.closeMission();for(const w of capitalEndgame.warlords())(saveState.doc.capital||(saveState.doc.capital={v:1,citadels:{},warlords:{}})).warlords[w.id]={defeats:0,lastEpoch:capitalEndgame.epoch()};});   // native fleets only: no roaming warlord this epoch
 const census=await p.evaluate(()=>Object.entries(arsenal.GUNS).map(([id,g])=>{const m=modularShips.GEARS['gun-'+id],dps=arsenal.dps(id),L=tuning.ARSENAL.lanes[g.family];return{id,name:WEAPON_TYPES[id].title||id,cls:arsenal.CLS[g.c],family:g.family,arch:g.arch,retired:!!g.retired,special:!!g.special,dps,vsShield:Math.round(dps*L.shield),vsHull:Math.round(dps*L.hull),pierce:WEAPON_TYPES[id].pierce||0,price:m?.cost??null,power:m?.power??null};}));
 report.data.census=census;
 writeFileSync(out+'/census.csv','id,name,class,family,arch,status,dps,vs_shield,vs_hull,pierce,metal,power\n'+census.map(r=>[r.id,JSON.stringify(r.name),r.cls,r.family,r.arch,r.retired?'retired':r.special?'special':'offered',r.dps,r.vsShield,r.vsHull,r.pierce,r.price,r.power].join(',')).join('\n')+'\n');
 const offered=census.filter(r=>!r.retired),ladder=['LIGHT','MEDIUM','HEAVY','SIEGE','CAPITAL'];
 // 1 · roster shape
 const perClass=Object.fromEntries(ladder.map(c=>[c,offered.filter(r=>r.cls===c&&!r.special).map(r=>r.family).sort()]));
 // Mac, 2026-10-30: a second, then a third gun per family per class (tuning.js ARSENAL.roster: "needs more guns")
check('Light→Capital each offer three guns per family (75 roster guns)',ladder.every(c=>perClass[c].join()==='beam,beam,beam,kinetic,kinetic,kinetic,missile,missile,missile,ordnance,ordnance,ordnance,rail,rail,rail'),perClass);
 check('about 77 guns above Point class are offered (roster + specials)',offered.filter(r=>r.cls!=='POINT').length>=75&&offered.filter(r=>r.cls!=='POINT').length<=80,offered.filter(r=>r.cls!=='POINT').length);
 // 2 · every class has a hull leader and a different shield leader
 report.data.leaders=ladder.map(c=>{const a=offered.filter(r=>r.cls===c&&!r.special),h=a.reduce((x,y)=>y.vsHull>x.vsHull?y:x),s=a.reduce((x,y)=>y.vsShield>x.vsShield?y:x),d=a.reduce((x,y)=>y.dps>x.dps?y:x);return{cls:c,hull:h.id,shield:s.id,raw:d.id};});
 check('no gun leads its class against both shields and hull',report.data.leaders.every(l=>l.hull!==l.shield),report.data.leaders);
 check('signature guns: railgun leads Siege vs hull, lance leads Siege vs shields',report.data.leaders.find(l=>l.cls==='SIEGE').hull==='railgun'&&report.data.leaders.find(l=>l.cls==='SIEGE').shield==='lance',report.data.leaders);
 const pointFlak=census.find(r=>r.id==='flak'),pointMax=Math.max(...census.filter(r=>r.cls==='POINT'&&r.id!=='flak').map(r=>r.dps));
 check('flak no longer tops Point class damage on paper',pointFlak.dps<=pointMax,{flak:pointFlak.dps,others:pointMax});
 // 3 · curves
 const median=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
 report.data.curves=ladder.map(c=>({cls:c,dps:median(offered.filter(r=>r.cls===c&&!r.special).map(r=>r.dps)),price:median(offered.filter(r=>r.cls===c&&!r.special).map(r=>r.price))}));
 const steps=report.data.curves.slice(1).map((r,i)=>({dps:+(r.dps/report.data.curves[i].dps).toFixed(2),price:+(r.price/report.data.curves[i].price).toFixed(2)}));report.data.steps=steps;
 check('damage rises about 1.8× per class (1.6–2.3)',steps.every(s=>s.dps>=1.6&&s.dps<=2.3),steps);
 check('price rises about 3–4× per class',steps.every(s=>s.price>=2.9&&s.price<=4.2),steps);
 // 4 · retirement: hidden from new fits, owned copies still fly, enemies and salvage use roster guns
 /* every archetype is on the roster now, so the retirement path is witnessed on two guns retired for the test */
 report.data.retire=await p.evaluate(()=>{const M=modularShips,G=arsenal.GUNS,g=M.GEARS['gun-flak-capital'];G['flak-capital'].retired=G.homing.retired=g.retired=true;try{const before=M.fits('capital',g),h=M.hangar();h.owned['gear:gun-flak-capital:1']=1;saveState.doc.modularHangar=h;const after=M.fits('capital',g);delete h.owned['gear:gun-flak-capital:1'];saveState.doc.modularHangar=h;return{before,after,successor:arsenal.replacementFor('flak-capital'),homing:arsenal.replacementFor('homing')};}finally{delete G['flak-capital'].retired;delete G.homing.retired;delete g.retired;}});
 check('a retired gun is not offered, but an owned copy still fits',!report.data.retire.before&&report.data.retire.after,report.data.retire);
 check('retired guns map to the roster gun of their class and family',report.data.retire.successor==='shell-capital'&&report.data.retire.homing==='torpedo',report.data.retire);
 report.data.enemyGuns=await p.evaluate(()=>{const sys=[...galaxy.data.systems].filter(s=>s.id!=='home'&&s.id!==saveState.doc.civHome&&!s.rule).sort((a,b)=>b.danger+b.size-a.danger-a.size)[0];galaxy.enterSystemById(sys.id);const ch=Object.values(worldMap.chambers).sort((a,b)=>b.dangerLevel-a.dangerLevel)[0];worldMap.currentGridX=ch.gridX;worldMap.currentGridY=ch.gridY;engine.enterChamber({silent:true});engine.paused=true;
  return engine.enemies.flatMap(e=>e.nodes.filter(n=>n.type==='cannon'&&n.weapon).map(n=>n.weapon)).filter(w=>arsenal.GUNS[w]);});
 const retiredUsed=report.data.enemyGuns.filter(w=>census.find(r=>r.id===w)?.retired&&census.find(r=>r.id===w)?.cls!=='POINT');
 check('deep enemy fleets mount roster guns',report.data.enemyGuns.length>0&&retiredUsed.length===0,{retiredUsed,count:report.data.enemyGuns.length});
 // 5 · lanes are real hits: one shot each into a shielded and a bare enemy
 report.data.lanes=await p.evaluate(()=>{const P=engine.player,dn=engine.damageNode;const shot=(type,shield)=>{engine.enemies=[];const e=new EnemyOrganism(P.x+400,P.y,{tier:3,archetype:'stalker'});engine.enemies.push(e);let got=0;e.update=()=>{};e.takeDamage=a=>{got+=a;};e.shield=shield?5000:0;engine.damageNode=function(ship,node,amount){if(ship===e){got+=amount;return;}return dn.apply(this,arguments);};engine.projectiles=[new Projectile(e.x,e.y,0,0,{damage:100,life:5,radius:40,isPlayer:true,type,color:'#fff'})];engine.paused=false;try{engine.update();}finally{engine.paused=true;engine.damageNode=dn;}return Math.round(got);};
  return{laserShield:shot('laser',true),autoShield:shot('autocannon',true),railHull:shot('railgun',false),autoHull:shot('autocannon',false)};});
 check('a beam hit on a raised shield beats the same kinetic hit',report.data.lanes.laserShield>report.data.lanes.autoShield,report.data.lanes);
 check('a rail hit on bare hull beats the same kinetic hit',report.data.lanes.railHull>report.data.lanes.autoHull,report.data.lanes);
 // 6 · player shields scale with the frame
 report.data.shields=await p.evaluate(async()=>{const fly=async id=>{const c=modularShips.compile(modularShips.factory(id));saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});engine.paused=false;for(let i=0;i<3;i++)engine.update();engine.paused=true;return engine.player.maxShield;};return{kestrel:await fly('warden'),athanor:await fly('athanor')};});
 check('a titan carries a capital shield pool (≥1,500)',report.data.shields.athanor>=1500,report.data.shields);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('arsenal witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,leaders:report.data.leaders,steps:report.data.steps,shields:report.data.shields,lanes:report.data.lanes}));}
if(report.failed)process.exitCode=1;
