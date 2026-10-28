/* Fixed sector threat and frame durability. Never reads player DPS to buff an
 * enemy. Native spawning, damage, ownership and reward transactions stay owners. */
(() => {
 'use strict';let ready=false;const seen=new WeakSet();
 const ROWS=[null,
  {hp:90,shield:0,damage:1,parts:1,bounty:1},
  {hp:220,shield:0,damage:1,parts:1,bounty:3},
  {hp:650,shield:100,damage:1.4,parts:2,bounty:8},
  {hp:1500,shield:200,damage:2,parts:3,bounty:18},
  {hp:4200,shield:600,damage:3.2,parts:6,bounty:42},
  {hp:9000,shield:1500,damage:4.8,parts:10,bounty:95},
  {hp:22000,shield:4000,damage:7,parts:20,bounty:220},
  {hp:42000,shield:7000,damage:9,parts:32,bounty:450},
  {hp:78000,shield:12000,damage:11,parts:50,bounty:850},
  {hp:125000,shield:22000,damage:14,parts:80,bounty:1500}
 ];
 const FRAMES={frigate:0,cruiser:300,battleship:1200,capital:4000,supercapital:10000,titan:22000};
 const tier=e=>Math.max(1,Math.min(10,Math.floor(Number(e?.tier)||1)));
 const home=()=>galaxy.currentId===(saveState.doc.civHome||'home');
 const protectedHere=()=>factionFleets.protectedSector()||frontierPve.isRange()||window.holoTest?.active||window.bossScenes?.rehearsing;
 function hullFor(e){if(e.archetype==='mote')return e.tier>=7?'cruiser':'frigate';return e.tier>=10?'titan':e.tier>=9?'supercapital':e.tier>=7?'capital':e.tier>=5?'battleship':e.tier>=3?'cruiser':'frigate';}
 function gunClass(e){return e.archetype==='mote'?'LIGHT':e.tier>=8?'CAPITAL':e.tier>=7?'SIEGE':e.tier>=5?'HEAVY':e.tier>=3?'MEDIUM':'LIGHT';}
 function prepare(ch){
  if(!ch||ch.isHaven||ch.isBossSector)return;
  const ring=Math.max(Math.abs(ch.gridX),Math.abs(ch.gridY));
  if(home()){if(ring>3)ch.dangerLevel=Math.min(5,ring-1);return;}
  if(!ch.sys||ch.sys.rule==='swarm')return;
  ch.dangerLevel=Math.min(10,Math.max(ch.dangerLevel,ch.sys.danger+Math.max(0,ring-1)));
  ch.mission=systemMission(ch.sys,ch.gridX,ch.gridY,ch.dangerLevel);
  Object.assign(ch,{biome:ch.mission.biome,missionId:ch.mission.id,objective:ch.mission.objective,hazard:ch.mission.hazard,reward:ch.mission.reward,musicTheme:(BIOMES[ch.mission.biome]||{music:'HAVEN'}).music});
 }
 function enemy(e){
  if(seen.has(e)||protectedHere()||e.training||e.isBoss||e.holo||e.jellyShoalKey||e.swarmBrood||Number.isInteger(e.firstExpeditionGuard)||!e.faction&&e.archetype!=='outpost')return;
  seen.add(e);const t=tier(e),row=ROWS[t],scout=e.archetype==='mote';
  const role=({mote:.18,stalker:1,charger:1.25,sniper:.75,hive:1.15,outpost:2.2})[e.archetype]||1;
  const hpRatio=Math.max(0,Math.min(1,e.hp/e.maxHp)),shieldRatio=e.maxShield?Math.max(0,Math.min(1,e.shield/e.maxShield)):1;
  const hullRow=scout?ROWS[Math.min(t,6)]:row,mult=e.elite?2.4:1;
  e.maxHp=Math.round(hullRow.hp*role*mult);e.hp=e.maxHp*hpRatio;
  e.maxShield=Math.round((scout?0:row.shield)*(e.elite?1.5:1));e.shield=e.maxShield*shieldRatio;
  e.combatScale={tier:t,damage:row.damage,bounty:Math.max(1,Math.round(row.bounty*(scout?.1:1))),parts:row.parts};
  for(const n of e.nodes){if(n.type==='core')continue;const base=n.partMax??Math.max(8,n.radius*JUICE.nodeHpPerRadius),fraction=n.partMax?Math.max(0,n.partHp/n.partMax):1;n.partMax=base*(scout?Math.min(row.parts,3):row.parts);n.partHp=n.partMax*fraction;}
 }
 function install(){
  if(!window.combatFeel?.ready||!window.upgradePath?.ready){setTimeout(install,40);return;}
  const matrix=worldMap.initMatrix;worldMap.initMatrix=function(...args){const r=matrix.apply(this,args);for(const ch of Object.values(this.chambers))prepare(ch);return r;};
  for(const ch of Object.values(worldMap.chambers))prepare(ch);
  const load=engine.loadChamberEntities;engine.loadChamberEntities=function(...args){const ch=worldMap.getCurrentChamber();prepare(ch);ch._majorHullAssigned=false;const r=load.apply(this,args);for(const e of this.enemies)enemy(e);return r;};
  const compose=factionFleets.compose;factionFleets.compose=function(enemies,ch=worldMap.getCurrentChamber()){
   const r=compose.call(this,enemies,ch);if(factionFleets.protectedSector(ch)||(ch.dangerLevel||1)<5)return r;
   let i=0,major=!!ch._majorHullAssigned,band=ch.dangerLevel;
   for(const e of enemies){if(e.faction||e.training||e.isBoss||e.name||e.swarmBrood||e.jellyShoalKey||Number.isInteger(e.firstExpeditionGuard))continue;
    e.tier=!major?band:i<=2?Math.max(2,band-2):Math.max(2,band-4);if(!major){major=true;if(e.archetype==='mote'){e.archetype='stalker';e.nodes=[];e.setupNodes();}}i++;
   }ch._majorHullAssigned=major;return r;
  };
  const update=EnemyOrganism.prototype.update;EnemyOrganism.prototype.update=function(player,shots,enemies,...args){
   frontierPve.decorate(this);enemy(this);const n=shots.length,kids=enemies.length,r=update.call(this,player,shots,enemies,...args);
   if(this.combatScale){for(let i=n;i<shots.length;i++)if(!shots[i].isPlayer)shots[i].damage*=this.combatScale.damage;
    for(let i=kids;i<enemies.length;i++)if(enemies[i].archetype==='mote'&&enemies[i].tier===1){enemies[i].tier=Math.max(1,this.tier-2);frontierPve.decorate(enemies[i]);enemy(enemies[i]);}}
   return r;
  };
  const profile=enemyCombat.profile;enemyCombat.profile=function(e){const p=profile(e);if(!p||!e.combatScale||e.tier<5)return p;
   const range=Math.min(3000,1800+Math.max(0,e.tier-5)*240+(e.archetype==='sniper'?300:0));
   return{...p,fireRange:Math.max(p.fireRange,range),standOff:Math.max(p.standOff,range*.58),aggro:range+180,shotSpeed:Math.max(p.shotSpeed,movementFeel.topSpeed*1.2)};
  };
  const bounty=upgradePath.bountyFor;upgradePath.bountyFor=function(e){if(!e?.combatScale)return bounty(e);const b=e.combatScale.bounty;return Math.round(b*(e.archetype==='outpost'?8:e.elite?3:1));};
  const stats=engine.recalculatePlayerStats;engine.recalculatePlayerStats=function(...args){
   const missing=Math.max(0,(this.player.maxHp||0)-(this.player.hp||0)),r=stats.apply(this,args),id=this._frameContext||saveState.doc.design?.modular?.hull,bonus=FRAMES[id]||0;
   this.player.maxHp+=bonus;this.player.hp=Math.max(0,this.player.maxHp-missing);return r;
  };
  const apply=engine.applyDesign;engine.applyDesign=function(d,options={},...args){
   const previous=this._frameContext,missing=Math.max(0,this.player.maxHp-this.player.hp);this._frameContext=d?.modular?.hull;
   try{const r=apply.call(this,d,options,...args);if(r!==false&&!options.restore&&!hubs.docked&&saveState.doc.launched&&!window.starterJourney?.active)this.player.hp=Math.max(0,this.player.maxHp-missing);return r;}
   finally{this._frameContext=previous;}
  };
  for(const[id,bonus]of Object.entries(FRAMES))modularShips.HULLS[id].hullHp=bonus;
  engine.recalculatePlayerStats();for(const e of engine.enemies)enemy(e);ready=true;
 }
 window.combatScaling={ROWS,FRAMES,tier,hullFor,gunClass,prepare,enemy,get ready(){return ready;}};
 window.addEventListener('load',()=>setTimeout(install,340));
})();
