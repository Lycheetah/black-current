// Deterministic render ablation (night list item 1): drives engine.update+render by hand with a forced flush,
// interleaves layer switches over several rounds, and reports the median cost of each layer in ms.
//   node scripts/profile-render.mjs [url]   (ROUNDS=4)
import {chromium} from 'playwright';
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/',ROUNDS=+(process.env.ROUNDS||4);
const b=await chromium.launch(),p=await b.newPage({viewport:{width:1366,height:768}});await p.goto(url);await p.waitForFunction(()=>window.terrain?.ready&&window.starterJourney?.ready&&window.renderBudget?.ready&&window.hostileSkins?.ready);
await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('PROFILER');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
await p.evaluate(()=>{garage.closeMission();const c=modularShips.compile(modularShips.factory('dreadnought'));saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});galaxy.enterSystemById('home');worldMap.currentGridX=-3;worldMap.currentGridY=3;engine.enterChamber({silent:true});const P=engine.player;P.iFrames=1e9;
 for(let i=0;i<20;i++){const a=i*.31,d=600;const e=new EnemyOrganism(P.x+Math.cos(a)*d,P.y+Math.sin(a)*d,{tier:5,archetype:['stalker','charger','sniper','hive','mote'][i%5]});e._aggro=true;engine.enemies.push(e);}engine.mouse.down=true;engine.paused=false;});
await p.waitForTimeout(1500);
const res=await p.evaluate(rounds=>{window.requestAnimationFrame=()=>0;const P=engine.player;
 const frame=()=>{engine.paused=false;P.hp=P.maxHp;engine.update(1/60);const t0=performance.now();engine.render();engine.ctx.getImageData(0,0,1,1);engine.lightingCtx?.getImageData(0,0,1,1);return performance.now()-t0;};
 const L={background:['fluidShader','drawParallaxOcean'],terrain:['worldMap','drawChamberMembrane'],ambient:['particleSystem','drawAmbient'],particles_overlays:['particleSystem','draw'],enemies:['EnemyOrganism.prototype','draw'],projectiles:['Projectile.prototype','draw'],lighting:['fluidShader','drawLightingShader'],radar:['engine','drawMiniRadar'],drops:['progression','drawDrops'],ship_ring:['engine','drawShipRing'],player_hull:['fluidShader','__player']};
 const all={BASELINE:[]};for(const k of Object.keys(L))all[k]=[];
 const pm=fluidShader.drawOrganismMembrane;
 for(let r=0;r<rounds;r++){for(let i=0;i<8;i++)all.BASELINE.push(frame());
  for(const [k,[o,f]] of Object.entries(L)){if(f==='__player'){fluidShader.drawOrganismMembrane=function(ctx,x,y,a,cr,nodes,...rest){if(nodes===engine.player.nodes)return;return pm.call(this,ctx,x,y,a,cr,nodes,...rest);};for(let i=0;i<8;i++)all[k].push(frame());fluidShader.drawOrganismMembrane=pm;continue;}
   const obj=eval(o),keep=obj[f];obj[f]=function(){};for(let i=0;i<8;i++)all[k].push(frame());obj[f]=keep;}}
 const med=a=>{a=a.slice().sort((x,y)=>x-y);return a[a.length>>1];};const base=med(all.BASELINE);
 return{base:+base.toFixed(1),layers:Object.keys(L).map(k=>[k,+(base-med(all[k])).toFixed(1)]).sort((a,b)=>b[1]-a[1])};},ROUNDS);
console.log('render ms (median):',res.base);for(const [k,v] of res.layers)console.log(String(v).padStart(6)+' ms  '+k);
await b.close();
