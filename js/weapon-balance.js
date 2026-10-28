/* Comparable weapon budgets; physical fitting remains the native authority. */
(() => {
 'use strict';let ready=false;
 const round=n=>Math.round(n*10)/10;
 function stats(id){const w=WEAPON_TYPES[id],g=arsenal.GUNS[id];if(!w||!g)return null;const rounds=g.shots||1,fragments=id==='cluster'?8:w.fragments||0,share=id==='cluster'?.4:.5;return{hit:round(w.damage),cycle:w.fireRate/60,rounds,dps:arsenal.dps(id),volley:round(w.damage*rounds),fragments,fragmentHit:round(w.damage*share),fragmentDps:fragments?Math.round(w.damage*share*fragments*60/w.fireRate):0};}
 function summary(id){const s=stats(id),g=arsenal.GUNS[id],o=g?.gen,spread=o?.fan&&o.shots>1?Math.round((o.shots-1)*o.fan*180/Math.PI):0;return s?s.dps+' direct DPS · '+s.hit+' / round · '+s.cycle.toFixed(2)+'s cycle'+(s.rounds>1?' · '+s.rounds+(g?.arch==='scatter'?' pellets/cycle':' rounds/cycle'):'')+(spread?' · '+spread+'° spread':'')+(s.fragments?' · '+s.fragments+' fragments × '+s.fragmentHit:''):'';}
 function install(){
  if(!window.modularShips?.ready||!window.arsenal?.ready){setTimeout(install,40);return;}
  // A novice slow shell must not dwarf its own class's faster guns on impact.
  // Keep the two-gun starter's spitter/repeater budget and every price intact.
  for(const [id,cycle]of Object.entries({'rifle-point':36,'torpedo-point':54,'shell-point':42})){
   WEAPON_TYPES[id].fireRate=cycle;WEAPON_TYPES[id].damage=Math.round(50*cycle/60);arsenal.GUNS[id].role=1;if(armory.NEW[id])Object.assign(armory.NEW[id],{fireRate:cycle,damage:WEAPON_TYPES[id].damage});
  }
  // Quantising a 20-round/s weapon to whole HP inflated its class budget by20%.
  for(const[id,g]of Object.entries(arsenal.GUNS)){const w=WEAPON_TYPES[id];if(g.c===0&&w.damage<10)w.damage=round(arsenal.CLASS_DPS[0]*g.role*w.fireRate/60/(g.shots||1));}
  for(const g of Object.values(modularShips.GEARS))if(g.weapon){const w=WEAPON_TYPES[g.weapon],trait=g.quirk?loot.QUIRKS[g.quirk]?.line:'';g.description=arsenal.familyName(g.weapon)+' · '+summary(g.weapon)+'. '+(w.blurb||'')+(trait?' '+trait:'');}
  ready=true;
 }
 window.weaponBalance={stats,summary,get ready(){return ready;}};window.addEventListener('load',()=>setTimeout(install,180));
})();
