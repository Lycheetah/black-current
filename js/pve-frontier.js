/* A tiny-reward practice range and faction fleets, using the existing five AI
 * behaviours. No new crowding, no inflation of rewards or boss health. */
(() => {
  'use strict';
  const ROSTER={mote:{name:'Scout',hp:.8},stalker:{name:'Pursuer',hp:1},charger:{name:'Armoured charger',hp:1.2},sniper:{name:'Artillery',hp:.9},hive:{name:'Drone tender',hp:1}};
  let ready=false,cue,step=0;const seen=new WeakSet();
  const home=()=>galaxy.currentId===(saveState.doc.civHome||'home');
  const isRange=()=>home()&&worldMap.currentGridX===1&&worldMap.currentGridY===0;
  const power=()=>Math.max(12,engine.player.nodes.filter(n=>n.type==='cannon'&&!n.lost).reduce((s,n)=>s+(arsenal.dps(fleet.weaponFor(n))||12),0)*hardpoints.damageScale(engine.player));
  function faction(){let h=0;for(const c of galaxy.currentId)h=(h*31+c.charCodeAt(0))>>>0;return canon.civilisations[h%canon.civilisations.length].id;}
  function decorate(e){
    if(seen.has(e)||e.training||e.isBoss||e.name||e.archetype==='outpost'||!ROSTER[e.archetype])return;seen.add(e);
    const id=faction(),c=canon.civilisations.find(c=>c.id===id),d=noviceFleet.create(id),r=ROSTER[e.archetype];
    if(e.archetype==='charger'&&e.tier>=3){d.modular.hull='cruiser';d.modular.sections.push({id:'armour-a',kind:'plate',x:-3,y:0},{id:'link-a',kind:'spine',x:-2,y:0});modularShips.prune(d.modular);try{modularShips.inspect(d);}catch{d.modular.sections=d.modular.sections.slice(0,6);}}
    const nodes=modularShips.compile(d).design.nodes;for(const n of nodes){n.currentDx=n.targetDx=n.dx;n.currentDy=n.targetDy=n.dy;}
    e.nodes=nodes;e.coreRadius=18;e.color=d.color;e.faction=id;e.fleetRole=r.name;e.factionFamily=arsenal.familyOf(d.primaryWeapon);e.name=c.name+' · '+r.name;
    const ratio=e.hp/e.maxHp;e.maxHp=Math.round(e.maxHp*r.hp);e.hp=e.maxHp*ratio;
  }
  function trainingTarget(index=0){
    const a=index*Math.PI*2/3,e=new EnemyOrganism(Math.cos(a)*750,Math.sin(a)*750,{tier:1,archetype:'mote',name:'Training drone'});
    e.training=true;e.color='#86dac0';e.maxHp=e.hp=Math.round(Math.max(12,Math.min(6000,power()*.75)));e.shield=e.maxShield=0;e.practiceTick=index*40;return e;
  }
  function populate(){engine.enemies=[0,1,2].map(trainingTarget);engine.projectiles=[];engine.bioMines=[];const ch=worldMap.getCurrentChamber();ch.isCleared=false;document.getElementById('hud-chamber-title').textContent='Training grounds · sector 1,0';document.getElementById('hud-danger-lvl').textContent='Practice · 1 metal / 10 targets';paint();}
  function paint(){if(!cue)return;cue.hidden=!saveState.doc.launched||!isRange()||engine.paused;const k=Number(saveState.doc.trainingKills)||0;cue.textContent=`TRAINING · targets scale to fitted guns · ${k%10}/10 credits · 1 metal per 10 · no loot or mastery`;}
  function install(){
    if(!window.noviceFleet?.ready||!window.contactDirector?.ready||!window.modularShips?.ready){setTimeout(install,50);return;}
    cue=document.createElement('div');cue.className='training-cue';cue.hidden=true;document.body.append(cue);
    const load=engine.loadChamberEntities;engine.loadChamberEntities=function(...a){
      const ch=worldMap.getCurrentChamber();if(home()&&Math.max(Math.abs(ch.gridX),Math.abs(ch.gridY))<=1&&!ch.isBossSector)ch.dangerLevel=1;
      const result=load.apply(this,a);if(isRange())populate();else for(const e of this.enemies)decorate(e);paint();return result;
    };
    const update=EnemyOrganism.prototype.update;EnemyOrganism.prototype.update=function(player,shots,enemies,...rest){
      if(this.training){
        this.practiceTick++;this.angle=Math.atan2(player.y-this.y,player.x-this.x);this.vx=Math.cos(this.practiceTick/100)*.35;this.vy=Math.sin(this.practiceTick/100)*.35;this.x+=this.vx;this.y+=this.vy;
        if(this.practiceTick%180===0&&Math.hypot(player.x-this.x,player.y-this.y)<650)shots.push(new Projectile(this.x,this.y,Math.cos(this.angle)*2,Math.sin(this.angle)*2,{damage:1,radius:3,color:'#86dac0',isPlayer:false,type:'practice',life:150}));return;
      }
      decorate(this);const before=shots.length,result=update.call(this,player,shots,enemies,...rest);
      if(this.faction){for(let i=before;i<shots.length;i++){const p=shots[i];if(p.isPlayer)continue;p.color=this.color;
        if(this.factionFamily==='missile'){p.type='homing';p.target=player;p.vx*=.65;p.vy*=.65;}
        else if(this.factionFamily==='beam'){p.type='laser';p.vx*=1.1;p.vy*=1.1;}
        else if(this.factionFamily==='rail'){p.type='railgun';p.vx*=1.25;p.vy*=1.25;}
      }if(this.archetype==='charger'){this.vx*=.94;this.vy*=.94;}}
      return result;
    };
    // Practice targets bypass normal kill hooks so they cannot farm mastery,
    // quests, salvage, mass, AI cores, kill chains or sector-clear rewards.
    const kill=engine.killEnemy;engine.killEnemy=function(index,...a){
      const e=this.enemies[index];if(!e?.training){if(e?.faction)for(const n of e.nodes)if(n.type==='hull')n.lost=true;return kill.call(this,index,...a);}
      const old=Number(saveState.doc.trainingKills)||0,cash=hubs.metal;saveState.doc.trainingKills=old+1;if((old+1)%10===0)saveState.doc.metal=cash+1;
      if(!saveState.save()){saveState.doc.trainingKills=old;saveState.doc.metal=cash;}
      particleSystem.spawnBubbleBurst(e.x,e.y,e.color,5);this.enemies.splice(index,1,trainingTarget((old+1)%3));window.walletHUD?.paint();paint();
    };
    const spawn=contactDirector.spawn;contactDirector.spawn=function(...a){return isRange()?false:spawn.apply(this,a);};
    const lose=engine.loseNode;engine.loseNode=function(ship,node,...a){if(ship?.faction&&node?.type==='hull'){node.lost=true;node.partHp=0;return;}return lose.call(this,ship,node,...a);};
    for(const host of document.querySelectorAll('#dock-panel .dock-doors')){const b=document.createElement('button');b.className='tm-door';b.textContent='Training grounds · sector 1,0';b.onclick=()=>{travelHelper.training();hubs.closeDock();garage.banner('Training grounds · sector 1,0 · follow the bearing. Tiny practice rewards only.','good');};host.append(b);}
    const tick=engine.update;engine.update=function(...a){const r=tick.apply(this,a);if(++step%20===0)paint();return r;};
    ready=true;if(isRange())populate();
  }
  window.frontierPve={ROSTER,decorate,isRange,populate,power,faction,get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,150));
})();
