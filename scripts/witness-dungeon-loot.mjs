// Route 2 Stage 2 · dungeon loot: named uniques and the Warden's Bulwark set, paid only by derelict holds.
// Writes shots/dungeon-loot/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/dungeon-loot';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.derelictLoot?.ready&&window.hangarUI?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('LOOTER');await p.locator('#btn-title-quick').click();await p.waitForTimeout(400);
 // 1 · the catalogue, never in shops
 report.data.catalogue=await p.evaluate(()=>{garage.closeMission();const G=modularShips.GEARS,u=Object.keys(G).filter(k=>k.startsWith('unique-')),s=Object.keys(G).filter(k=>k.startsWith('set-'));
  bay.show();hangarUI.open('gear',true);const listed=[...document.querySelectorAll('[data-hangar-item]')].map(b=>b.dataset.hangarItem);hangarUI.close?.();bay.close?.();
  return{uniques:u.length,set:s.length,families:new Set(u.map(k=>arsenal.GUNS[G[k].weapon].family)).size,allTraits:u.every(k=>G[k].quirk&&G[k].rarity==='unique'),inShop:listed.filter(id=>id.startsWith('unique-')||id.startsWith('set-')).length,shopSize:listed.length};});
 check('five named uniques at five classes (25) and three set pieces exist, each unique with a trait',report.data.catalogue.uniques===25&&report.data.catalogue.set===3&&report.data.catalogue.families===5&&report.data.catalogue.allTraits,report.data.catalogue);
 check('no unique or set piece is sold in the equipment shop',report.data.catalogue.shopSize>0&&report.data.catalogue.inShop===0,report.data.catalogue);
 // 2 · hauls alternate: a missing set piece, then a unique of the derelict's class
 report.data.hauls=await p.evaluate(()=>{saveState.doc.dives={v:1,looted:{},cleared:0};const got=[];for(let i=0;i<6;i++)got.push(derelictLoot.award({key:'home:2,-2',danger:9}));return{got,classes:got.filter(id=>id.startsWith('unique-')).map(id=>modularShips.GEARS[id].cls)};});
 const H=report.data.hauls.got;
 check('hauls alternate set piece, unique, set piece… until the set is complete, then uniques',H[0]==='set-warden-plate'&&H[1].startsWith('unique-')&&H[2]==='set-warden-heart'&&H[3].startsWith('unique-')&&H[4]==='set-warden-drive'&&H[5].startsWith('unique-'),H);
 check('uniques arrive at the derelict\'s class (danger 9 → its gun class)',report.data.hauls.classes.every(c=>c===report.data.hauls.classes[0])&&report.data.hauls.classes[0]!=='LIGHT',report.data.hauls.classes);
 // 3 · a unique hits 25% harder than the same gun with the same trait
 report.data.damage=await p.evaluate(()=>{const G=modularShips.GEARS,id=Object.keys(G).find(k=>k.startsWith('unique-')&&G[k].cls==='LIGHT'),g=G[id];engine.paused=false;engine.enemies=[];
  const fire=rarity=>{engine.projectiles=[];const node={type:'cannon',radius:g.radius,weapon:g.weapon,quirk:g.quirk,rarity};const P=engine.player;engine.fireMountGroup(g.weapon,[{x:P.x,y:P.y,angle:0,radius:g.radius,turret:{node,weapon:g.weapon}}],1);
   const d=engine.projectiles.map(q=>q.damage).filter(Number.isFinite);return d.length?Math.max(...d):null;};
  const twin=fire('rare'),uniq=fire('unique');return{id,twin,uniq,ratio:twin?uniq/twin:null};});
 check('a unique deals 25% more than the same gun and trait',report.data.damage.ratio&&Math.abs(report.data.damage.ratio-1.25)<0.02,report.data.damage);
 // 4 · the set bonus
 report.data.set=await p.evaluate(()=>{const G=modularShips.GEARS,ok=d=>d.modular.fittings.filter(f=>G[f.gear].kind==='utility').length>=2&&d.modular.fittings.some(f=>G[f.gear].kind==='engine');
  const base=['warden','aegis','lancer','dreadnought','leviathan','sovereign','athanor','hornet','kestrel'].map(id=>modularShips.compile(modularShips.factory(id)).design).find(ok);
  const fit=(plate,heart,drive)=>{const d=JSON.parse(JSON.stringify(base)),F=d.modular.fittings,u=F.filter(f=>G[f.gear].kind==='utility'),e=F.find(f=>G[f.gear].kind==='engine');if(u.length<2||!e)return{why:'slots',u:u.length,e:!!e};u[0].gear=plate;u[1].gear=heart;e.gear=drive;
   let c;try{c=modularShips.compile(d).design;}catch(err){return{why:err.message};}saveState.doc.design=c;engine.applyDesign(c,{restore:true});engine.recalculatePlayerStats();return{hp:engine.player.maxHp,shield:engine.player.maxShield,bonus:engine.player.setBonus};};
  const plain=fit('armour','shield','engine'),two=fit('set-warden-plate','set-warden-heart','engine'),full=fit('set-warden-plate','set-warden-heart','set-warden-drive');return{plain,full,two};});
 const S=report.data.set;
 check("the Warden's Bulwark gives +15% hull and +25% shield pool only with all three pieces fitted",S.plain?.hp&&S.full?.hp&&S.two?.hp&&S.full.bonus==='warden'&&!S.two.bonus&&Math.abs(S.full.hp/S.plain.hp-1.15)<0.02&&(!S.plain.shield||Math.abs(S.full.shield/S.plain.shield-1.25)<0.03),S);
 // 5 · persistence
 await p.evaluate(()=>{saveState.save();});await p.reload();await p.waitForFunction(()=>window.derelictLoot?.ready);await p.locator('#btn-title-continue').click();await p.waitForTimeout(500);
 report.data.reload=await p.evaluate(()=>({owned:Object.keys(modularShips.hangar().owned).filter(k=>/gear:(unique|set)-/.test(k)).length,setBonus:engine.player.setBonus,fitted:saveState.doc.design.modular.fittings.filter(f=>f.gear.startsWith('set-')).length}));
 check('after a reload the hardware is still owned and the fitted set still pays its bonus',report.data.reload.owned>=6&&report.data.reload.fitted===2&&report.data.reload.setBonus===null||report.data.reload.owned>=6&&report.data.reload.fitted===3&&report.data.reload.setBonus==='warden',report.data.reload);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('dungeon loot witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
