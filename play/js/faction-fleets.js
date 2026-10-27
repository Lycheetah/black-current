/* Three shared tactical styles express the fifteen existing civilisations.
 * Fresh sector composition and patrols use existing AI roles and actor counts.
 * Home rings 1–3, practice, named encounters, elites and bosses retain their
 * existing pressure. Canon and reward ownership stay with their native systems. */
(() => {
  'use strict';
  const STYLES={
    hunt:{label:'Hunting wing',short:'FLANKERS',counter:'Keep moving; split the flankers',roles:['stalker','stalker','charger'],deep:['stalker','hive','stalker']},
    forge:{label:'Breach patrol',short:'BREACH',counter:'Sidestep the ram; break the gun line',roles:['charger','stalker','sniper'],deep:['charger','sniper','stalker']},
    lance:{label:'Lance screen',short:'LANCE SCREEN',counter:'Evade the lock; pressure the tender',roles:['sniper','stalker','hive'],deep:['sniper','hive','sniper']}
  };
  const STYLE={savanah:'hunt','hybrid-fused':'hunt','sol-symbiots':'lance','cosmic-light':'lance','cosmic-darkness':'lance','amethyst-angels':'lance','techno-angels':'lance','ai-gods':'lance','ai-human-gods':'lance'};
  const supported=new Set(['mote','stalker','charger','sniper','hive']);
  const profiles=new Map(canon.civilisations.map(c=>{const skin=Object.hasOwn(STYLE,c.id)?STYLE[c.id]:'forge';return[c.id,{id:c.id,skin,...STYLES[skin]}];}));
  let ready=false;
  function civilisation(sys=galaxy.currentId){let h=0;for(const c of sys)h=(h*31+c.charCodeAt(0))>>>0;return canon.civilisations[h%canon.civilisations.length].id;}
  function profile(id=civilisation()){return profiles.get(id)||profiles.get('human-hunters');}
  function protectedSector(ch=worldMap.getCurrentChamber()){
    return!ch||ch.isHaven||ch.isBossSector||typeof graveChoir!=='undefined'&&graveChoir.active||galaxy.currentId===(saveState.doc.civHome||'home')&&Math.max(Math.abs(ch.gridX),Math.abs(ch.gridY))<=3;
  }
  function plan(ch=worldMap.getCurrentChamber()){
    if(protectedSector(ch)||(ch.dangerLevel||1)<2)return null;
    const p=profile(),roles=ch.dangerLevel<3?['stalker','charger','mote']:ch.dangerLevel>=5?p.deep:p.roles;
    return{...p,roles:[...roles]};
  }
  function compose(enemies,ch){
    const p=plan(ch);if(!p)return 0;let i=0;
    for(const e of enemies){
      if(i>=3)break;
      if(e.training||e.swarmBrood||e.isBoss||e.elite||e.name||Number.isInteger(e.firstExpeditionGuard)||!supported.has(e.archetype))continue;
      e.archetype=p.roles[i];e.nodes=[];e.setupNodes();e._fleetLane=i%2?-1:1;e.fleetEncounter=p.label;i++;
    }
    return i;
  }
  function shape(model,tier,id){
    const p=profile(id);model.livery={...model.livery,skin:p.skin};if(tier<3)return;
    const limit=modularShips.HULLS[model.hull].sections,has=(x,y)=>model.sections.some(s=>s.x===x&&s.y===y);
    const add=(x,y,kind='plate')=>{if(model.sections.length>=limit||has(x,y)||![[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>has(x+a,y+b)))return;model.sections.push({id:'doctrine-'+p.skin+'-'+model.sections.length,kind,x,y});};
    if(p.skin==='hunt')for(const side of[-1,1]){const ys=model.sections.filter(s=>s.x===-1).map(s=>s.y*side);if(ys.length)add(-1,side*(Math.max(...ys)+1));}
    else if(p.skin==='forge'){const x=Math.max(...model.sections.filter(s=>s.y===0).map(s=>s.x));add(x,-1);add(x,1);}
    else{let x=Math.max(...model.sections.filter(s=>s.y===0).map(s=>s.x));add(++x,0,'spine');add(++x,0,'utility');}
  }
  function mark(e){
    if(!e.faction)return;const p=profile(e.faction);e.fleetPattern=p.short;e.fleetCounter=p.counter;
    for(const n of e.nodes)if(n.type==='cannon')n.factionSkin=p.skin;
    const cls={frigate:'Frigate',cruiser:'Cruiser',battleship:'Battleship',capital:'Dreadnought'}[e.fleetClass];
    const hull=canon.hulls[e.faction]?.find(h=>h.cls===cls),civ=canon.civilisations.find(c=>c.id===e.faction);
    if(hull)e.name=civ.name+' · '+hull.name+' · '+e.fleetRole;
  }
  function steer(e,p){
    if(!e.faction||!e._aggro||e.hp<=0||e.training||e.archetype!=='stalker'&&e.archetype!=='hive'||protectedSector())return;
    const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);if(d<1||d>900)return;
    const style=profile(e.faction).skin;
    if(style==='hunt'&&e.archetype==='stalker'&&(e._fleetLane??(Math.round(e.x)%2?-1:1))<0){e.vx+=dy/d*.55;e.vy-=dx/d*.55;}
    else if(style==='forge'&&e.archetype==='stalker'&&d<280){e.vx-=dx/d*.3;e.vy-=dy/d*.3;}
    else if(style==='lance'&&e.archetype==='hive'&&d<380){e.vx-=dx/d*.35;e.vy-=dy/d*.35;}
  }
  function install(){
    if(!window.frontierPve?.ready||!window.upgradePath?.ready){setTimeout(install,50);return;}
    const update=EnemyOrganism.prototype.update;EnemyOrganism.prototype.update=function(p,shots,enemies,...a){const r=update.call(this,p,shots,enemies,...a);window.factionFleets.steer(this,p);return r;};ready=true;
  }
  window.factionFleets={STYLES,profile,civilisation,protectedSector,plan,compose,shape,mark,steer,get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,160));
})();
