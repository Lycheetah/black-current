// Mac, 2026-10-30 · sized modules (js/module-sizes.js): Light/Medium/Heavy/Capital engines, shield emitters, armour and
// repair modules, gated by frame, each a measured effect. Writes shots/module-sizes/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/module-sizes';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
const near=(a,b,t=0.01)=>Math.abs(a-b)<t;
try{
 await p.goto(url);await p.waitForFunction(()=>window.moduleSizes?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('SIZES');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 // 1 · four sizes per family, priced up the ladder
 report.data.table=await p.evaluate(()=>{const G=modularShips.GEARS,out={};for(const fam of Object.keys(moduleSizes.FAMILIES))out[fam]=moduleSizes.SIZES.map(s=>G[moduleSizes.id(fam,s.id)]?.cost);return out;});
 const T=report.data.table;
 check('engines, shield emitters, armour and repair modules each come in Light, Medium, Heavy and Capital, priced up the ladder',Object.values(T).length===4&&Object.values(T).every(c=>c.length===4&&c.every(Boolean)&&c.every((v,i)=>!i||v>c[i-1])),T);
 // 2 · the frame gate
 report.data.gate=await p.evaluate(()=>{const M=modularShips,with_=(factory,gear)=>{const d=M.compile(M.factory(factory)).design,f=d.modular.fittings.find(f=>M.GEARS[f.gear].kind===M.GEARS[gear].kind);f.gear=gear;return moduleSizes.sizeReason(d);};
  const frig=M.FACTORY.find(f=>f.hull==='frigate').id,bs=M.FACTORY.find(f=>f.hull==='battleship').id;return{frigLight:with_(frig,'engine-light'),bsHeavy:with_(bs,'engine-heavy'),bsCapital:with_(bs,'engine-capital')};});
 const GA=report.data.gate;
 check('a frigate cannot fit a Light module; a battleship fits a Heavy one but not a Capital one',/destroyer/.test(GA.frigLight||'')&&GA.bsHeavy===null&&/capital/.test(GA.bsCapital||''),GA);
 // 3 · the effects, on a battleship, against the same ship with its entry modules
 report.data.fx=await p.evaluate(()=>{garage.closeMission();const M=modularShips,bs=M.FACTORY.find(f=>f.hull==='battleship').id;
  const fly=d=>{const c=M.compile(d);saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});engine.recalculatePlayerStats();const P=engine.player;return{thrust:engine.coreMod('thrust'),hull:P.maxHp,shield:arsenal.shields.profile(P.nodes).pool,fx:moduleSizes.effects()};};
  const base=M.compile(M.factory(bs)).design,stock=fly(JSON.parse(JSON.stringify(base)));
  const d=JSON.parse(JSON.stringify(base)),eng=d.modular.fittings.find(f=>M.GEARS[f.gear].kind==='engine'),util=d.modular.fittings.filter(f=>M.GEARS[f.gear].kind==='utility');
  if(eng)eng.gear='engine-heavy';const sized=fly(d);
  /* the factory battleship has one utility slot: try each utility family in it, measured on the real ship */
  const one=gear=>{const e=JSON.parse(JSON.stringify(d));e.modular.fittings.find(f=>M.GEARS[f.gear].kind==='utility').gear=gear;return fly(e);};
  const shieldShip=one('shield-heavy'),armourShip=one('armour-heavy'),repairShip=one('repair-heavy');
  /* stacking is the rule in effects(): four armour plates listed, three count */
  const keep=saveState.doc.design;saveState.doc.design={modular:{fittings:[1,2,3,4].map(i=>({slot:'x'+i,gear:'armour-heavy'}))}};const stack=moduleSizes.effects().hull;saveState.doc.design=keep;
  return{stock,sized,utilSlots:util.length,engine:!!eng,shield:shieldShip.shield/stock.shield,armour:armourShip.hull/stock.hull,regen:repairShip.fx.regen,stack};});
 const F=report.data.fx,r=(k)=>F.sized[k]/F.stock[k];console.log('effects',JSON.stringify({utility:F.utilSlots,thrust:r('thrust').toFixed(3),hull:r('hull').toFixed(3),shield:F.stock.shield?r('shield').toFixed(3):'n/a',fx:F.sized.fx}));
 check('a Heavy engine gives the battleship +18% thrust',F.engine&&near(r('thrust'),1.18),{stock:F.stock.thrust,sized:F.sized.thrust});
 check('on the battleship: a Heavy emitter gives +60% shield, Heavy armour +15% hull, Heavy repair 0.3% a second',near(F.shield,1.6)&&near(F.armour,1.15,0.01)&&near(F.regen,0.003,1e-6),{shield:F.shield,armour:F.armour,regen:F.regen});
 check('armour plates stack, up to three (four Heavy plates: +45%)',near(F.stack,1.45,0.001),{stack:F.stack});
 // 4 · in the shop
 await p.evaluate(()=>{hubs.openDock();bay.show();hangarUI.open('gear',true);});await p.locator('#hangar-picker input[type=search]').fill('Heavy engine');await p.waitForTimeout(200);
 report.data.shop=await p.evaluate(()=>[...document.querySelectorAll('#hangar-picker [data-hangar-item]')].map(e=>e.dataset.hangarItem));
 await p.screenshot({path:`${out}/shop.png`});
 check('the equipment shop lists the sized modules',report.data.shop.includes('engine-heavy'),report.data.shop);
 // 5 · persistence
 await p.evaluate(()=>{hangarUI.close?.();bay.close?.();hubs.closeDock();saveState.save();});await p.reload();await p.waitForFunction(()=>window.moduleSizes?.ready);await p.locator('#btn-title-continue').click();await p.waitForTimeout(600);
 report.data.reload=await p.evaluate(()=>({thrust:engine.coreMod('thrust'),fx:moduleSizes.effects()}));
 check('a ship with sized modules flies them after a reload',near(report.data.reload.fx.thrust,1.18),report.data.reload);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('module sizes witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
