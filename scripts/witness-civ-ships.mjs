// Civilisation ships (js/civ-ships.js). Mac, 2026-10-30: "design a ton of premade ships", "pure bloodline ships". Fifteen
// canon civilisations × nine frames = 135 factory hulls: each compiles inside its frame, carries its civilisation's canon
// hull name for the class, has a silhouette no other civilisation shares, and mounts its canon weapon line when the guns
// are owned. The shipyard's ready-built ships pick a lineage. Writes shots/civ-ships/.
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='shots/civ-ships';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await chromium.launch(),p=await browser.newPage({viewport:{width:1440,height:1000}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.civShips?.ready&&window.starterJourney?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('BLOODLINE');await p.locator('#btn-title-quick').click();
 await p.waitForFunction(()=>window.starterJourney?.active||!document.body.classList.contains('at-title'));
 report.data.fleet=await p.evaluate(()=>{if(starterJourney.active)starterJourney.finish(true);garage.closeMission();garage.closeReward?.();
  const M=modularShips,civs=canon.civilisations,frames=Object.keys(civShips.FRAMES),bad=[],names=[],shapes={},doctrine=[];
  const gp=progression.getTotalGP,owns=armory.owns;progression.getTotalGP=()=>1e9;armory.owns=()=>true;
  try{for(const civ of civs)for(const fr of frames){const f=M.FACTORY.find(x=>x.id===civ.id+'-'+fr);if(!f){bad.push('missing '+civ.id+'-'+fr);continue;}
   try{const d=M.factory(f.id),c=M.compile(d),H=M.HULLS[fr];if(d.modular.sections.length>H.sections||d.modular.fittings.length>H.slots)bad.push(f.id+' over its frame');
    const want=(canon.hulls[civ.id]||[]).find(h=>h.cls===civShips.FRAMES[fr].cls)?.name;if(f.name!==want)names.push([f.id,f.name,want]);
    (shapes[fr]||(shapes[fr]=[])).push(d.modular.sections.map(s=>s.x+','+s.y).sort().join(' '));
    const guns=d.modular.fittings.map(x=>M.GEARS[x.gear]).filter(g=>g?.weapon).map(g=>arsenal.GUNS[g.weapon].arch),mine=guns.filter(a=>civShips.CIV[civ.id].arch.includes(a)).length;doctrine.push({id:f.id,guns:guns.length,mine});
   }catch(e){bad.push(f.id+': '+e.message);}}}
  finally{progression.getTotalGP=gp;armory.owns=owns;}
  const dupes=Object.fromEntries(Object.entries(shapes).map(([fr,a])=>[fr,a.length-new Set(a).size]));
  return{count:M.FACTORY.filter(f=>f.civ).length,forge:M.FACTORY.filter(f=>!f.civ).length,bad,names,dupes,offDoctrine:doctrine.filter(d=>d.guns&&d.mine/d.guns<0.6),frames:frames.length,civs:civs.length};});
 const F=report.data.fleet;
 check('fifteen civilisations × nine frames: 135 factory hulls beside the Forge yard\'s twelve',F.count===135&&F.forge===12&&F.civs===15&&F.frames===9,F);
 check('every civilisation hull compiles inside its frame (sections and module slots)',F.bad.length===0,F.bad);
 check('every hull carries its civilisation\'s canon name for the class (no invented names)',F.names.length===0,F.names);
 check('no two civilisations share a silhouette on any frame',Object.values(F.dupes).every(n=>n===0),F.dupes);
 check('with the guns owned, each hull mounts its canon weapon line (at least 60% of its guns)',F.offDoctrine.length===0,F.offDoctrine);
 // the shipyard: ready-built ships by lineage
 await p.evaluate(()=>{bay.show();});await p.waitForTimeout(500);await p.evaluate(()=>hangarUI.open('frames'));await p.waitForTimeout(200);
 await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Ready-built ships')?.click());await p.waitForTimeout(300);
 const forge=await p.evaluate(()=>document.querySelectorAll('.hangar-cards .hangar-item').length);
 await p.evaluate(()=>{const s=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value==='blackhole'));s.value='blackhole';s.onchange();});await p.waitForTimeout(500);
 report.data.yard=await p.evaluate(()=>({forge:0,cards:[...document.querySelectorAll('.hangar-cards .hangar-item strong')].map(n=>n.textContent),options:[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value==='blackhole')).options.length}));report.data.yard.forge=forge;
 await p.screenshot({path:`${out}/ready-built-blackhole.png`});
 const Y=report.data.yard,bh=await p.evaluate(()=>canon.hulls.blackhole.map(h=>h.name));
 check('Ready-built ships: the Forge yard first, and a picker for all fifteen lines that shows only that civilisation\'s hulls',Y.forge>0&&Y.options===16&&Y.cards.length>0&&Y.cards.every(n=>bh.includes(n)),Y);
 // wingmen: the Forge stock and your own line only
 report.data.wing=await p.evaluate(()=>{const M=modularShips;saveState.doc.civ='savanah';const all=M.FACTORY.filter(f=>!f.civ||f.civ==='savanah').map(f=>f.id),src=document.querySelector('script[src*="wingmen.js"]')?'yes':'no';return{src,own:all.length};});
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){check('witness completed',false,e.message);}
const failed=report.checks.filter(c=>!c.ok).length;writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.checks.length-failed,failed,errors:report.errors}));
await browser.close();process.exit(failed||report.errors.length?1:0);
