// ECONOMY PROBE (overnight run step 2). A bot pilot flies each frame class at its danger band.
// It aims at the nearest hostile, fires, closes to range, and hops to a fresh sector of the same danger when
// the one it is in goes quiet (charging TRAVEL_S seconds of travel per hop). It reports metal per minute and
// sets that against every step of the climb. Writes docs/ECONOMY.md and shots/economy/report.json.
//   node scripts/probe-economy.mjs [url]   (MINUTES=3 simulated minutes per band)
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/',MINUTES=+(process.env.MINUTES||3),TRAVEL_S=+(process.env.TRAVEL_S||20),OUTFIT=!!process.env.OUTFIT;
mkdirSync('shots/economy',{recursive:true});
const BANDS=[['frigate','hornet',[1,2]],['cruiser','lancer',[3,4]],['battleship','dreadnought',[5,7]],['capital','leviathan',[8,11]],['supercapital','sovereign',[12,15]],['titan','athanor',[16,20]]];
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url);await page.waitForFunction(()=>window.terrain?.ready&&window.starterJourney?.ready);
await page.locator('#btn-menu-new').click();await page.locator('#title-callsign').fill('ECONOMIST');await page.locator('#btn-title-quick').click();await page.waitForTimeout(600);
await page.evaluate(o=>{window.__OUTFIT=o;garage.closeMission();window.requestAnimationFrame=()=>0;
  // every sector of the galaxy with its danger, found once
},OUTFIT);
const results=[];
for(const [cls,ship,[lo,hi]] of BANDS){
  const r=await page.evaluate(({ship,lo,hi,MINUTES,TRAVEL_S})=>{
    // OUTFIT=1: fill every weapon section with a mid gun of its slot class (how a player who spent on guns flies).
    const M=modularShips,d=M.factory(ship);
    if(window.__OUTFIT){const SLOT={point:'POINT',light:'LIGHT',medium:'MEDIUM',heavy:'HEAVY',capital:'CAPITAL'};const dps=id=>{const w=WEAPON_TYPES[M.GEARS[id].weapon];return w?w.damage*(w.count||1)/w.fireRate:0;};
      for(const f of d.modular.fittings){const g=M.GEARS[f.gear];if(!g?.weapon)continue;const sec=d.modular.sections.find(x=>x.id===f.slot),cls=SLOT[M.SECTIONS[sec.kind]?.slot];if(!cls)continue;
        const pool=Object.entries(M.GEARS).filter(([id,x])=>x.weapon&&x.cls===cls&&!x.salvageOnly&&!x.retired&&!id.startsWith('unique-')&&!id.startsWith('recovered-')).map(([id])=>id).sort((a,b)=>dps(a)-dps(b));if(pool.length)f.gear=pool[Math.floor(pool.length*.6)];}}
    const c=M.compile(d);saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});
    const P=engine.player,frames=MINUTES*3600;let metal0=hubs.metal,mass0=progression.totalMass,travel=0,hops=0,deaths=0,kills=0;const seen=new Set();
    const kill=engine.killEnemy;engine.killEnemy=function(i,...a){const e=this.enemies[i];const r=kill.call(this,i,...a);if(e&&e.hp<=0&&!this.enemies.includes(e))kills++;return r;};
    const candidates=[];for(const s of galaxy.data.systems){if(s.hub&&!s.home)continue;const n=s.home?3:s.size+3;for(let gx=-n;gx<=n;gx++)for(let gy=-n;gy<=n;gy++)candidates.push([s.id,gx,gy]);}
    let ci=0;const hop=()=>{for(let k=0;k<candidates.length;k++){const [id,gx,gy]=candidates[(ci++)%candidates.length];const key=id+':'+gx+','+gy;if(seen.has(key))continue;galaxy.enterSystemById(id);worldMap.currentGridX=gx;worldMap.currentGridY=gy;engine.enterChamber({silent:true});const ch=worldMap.getCurrentChamber();if(ch.isHaven||ch.isBossSector||ch.dangerLevel<lo||ch.dangerLevel>hi){continue;}seen.add(key);P.x=0;P.y=0;P.vx=P.vy=0;P.hp=P.maxHp;hops++;return true;}return false;};
    if(!hop())return{error:'no sector in band'};
    let quiet=0,f=0;const dangers=[];
    for(;f<frames;f++){
      engine.paused=false;engine.mapOpen=false;
      let best=null,bd=Infinity;for(const e of engine.enemies){if(e.hp<=0||e.training)continue;const d=Math.hypot(e.x-P.x,e.y-P.y);if(d<bd){bd=d;best=e;}}
      for(const k of ['KeyW','KeyA','KeyS','KeyD'])engine.keys[k]=false;
      if(best){quiet=0;engine.mouse.x=(best.x-engine.camera.x)*engine.camera.zoom;engine.mouse.y=(best.y-engine.camera.y)*engine.camera.zoom;engine.mouse.down=true;
        const want=Math.max(220,(P.coreRadius||30)*4);if(bd>want*1.6){const dx=best.x-P.x,dy=best.y-P.y;if(Math.abs(dx)>40)engine.keys[dx>0?'KeyD':'KeyA']=true;if(Math.abs(dy)>40)engine.keys[dy>0?'KeyS':'KeyW']=true;}}
      else{engine.mouse.down=false;if(++quiet>180){if(!hop())break;f+=TRAVEL_S*60;travel+=TRAVEL_S;quiet=0;}}
      if(P.dead||P.hp<=0){deaths++;P.dead=false;P.hp=P.maxHp;if(!hop())break;f+=TRAVEL_S*60;travel+=TRAVEL_S;}
      try{engine.update(1/60);}catch(e){return{error:e.message,f};}
      if(f%600===0)dangers.push(worldMap.getCurrentChamber().dangerLevel);
    }
    engine.killEnemy=kill;for(const k of ['KeyW','KeyA','KeyS','KeyD'])engine.keys[k]=false;engine.mouse.down=false;
    const minutes=f/3600,earned=hubs.metal-metal0,bio=progression.totalMass-mass0;
    return{minutes:+minutes.toFixed(2),metal:earned,perMin:Math.round(earned/minutes),biomassPerMin:Math.round(bio/minutes),kills,killsPerMin:+(kills/minutes).toFixed(1),hops,deaths,travelS:travel,meanDanger:+(dangers.reduce((a,b)=>a+b,0)/Math.max(1,dangers.length)).toFixed(1)};
  },{ship,lo,hi,MINUTES,TRAVEL_S});
  console.log(cls.padEnd(13),JSON.stringify(r));results.push({cls,ship,band:[lo,hi],...r});
}
const prices=await page.evaluate(()=>{const PC=tuning.PRICE_CURVE,H=modularShips.HULLS,ladder=['frigate','cruiser','battleship','capital','supercapital','titan'];
  return ladder.map((id,i)=>({id,rank:H[id].rank,frame:H[id].cost,mass:H[id].mass,training:PC.rankMetal.slice(0,H[id].rank).reduce((a,b)=>a+b,0)-(i?PC.rankMetal.slice(0,H[ladder[i-1]].rank).reduce((a,b)=>a+b,0):0),trainingBiomass:PC.rankBiomass[H[id].rank-1]||0}));});
// time to the next frame = (frame + training for the step) / metal per minute while flying the previous frame
const rows=prices.slice(1).map((p,i)=>{const from=results[i],cost=p.frame+p.training;return{step:`${prices[i].id} → ${p.id}`,cost,perMin:from.perMin,minutes:from.perMin>0?Math.round(cost/from.perMin):null,biomass:p.mass};});
writeFileSync(`shots/economy/report${OUTFIT?'-outfit':''}.json`,JSON.stringify({results,prices,rows,errors},null,1));
const md=['# Economy (measured)','',`Probe: \`scripts/probe-economy.mjs\`. A bot flies each frame's factory ship at its danger band for ${MINUTES} simulated minutes per band. It aims, fires, closes to range, and hops sectors when one goes quiet, charging ${TRAVEL_S} s of travel per hop. ${OUTFIT?'Outfitted: each weapon section carries a mid gun of its slot class.':'Stock factory loadouts; no gun upgrades.'}`,'','## Income by band','','| Frame (ship) | Danger | Metal/min | Biomass/min | Kills/min | Hops | Deaths |','|---|---|---|---|---|---|---|',...results.map(r=>`| ${r.cls} (${r.ship}) | ${r.band.join('–')} (mean ${r.meanDanger}) | ${r.perMin} | ${r.biomassPerMin} | ${r.killsPerMin} | ${r.hops} | ${r.deaths} |`),'','## Time to the next frame (metal only)','','| Step | Frame + training (metal) | Metal/min on the previous frame | Minutes |','|---|---|---|---|',...rows.map(r=>`| ${r.step} | ${r.cost.toLocaleString()} | ${r.perMin} | ${r.minutes ?? '—'} |`),'','Targets (docs/MASTER_PLAN.md §4.4): cruiser 35 min, battleship 3 h cumulative, capital 6 h, carrier 10 h, titan 20 h+. This table is the first-pass measurement; outfitting (decks, guns) costs come on top of it.',''];
if(!process.env.NO_DOC)writeFileSync('docs/ECONOMY.md',md.join('\n'));console.log(md.join('\n'));if(errors.length)console.log('ERRORS',errors.slice(0,4));
await browser.close();
