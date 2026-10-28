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
    const scaled=window.combatScaling&&!factionFleets.protectedSector()&&!isRange()&&!e.swarmBrood&&!e.jellyShoalKey,cls=scaled?combatScaling.gunClass(e):null,base=arsenal.GUNS[d.primaryWeapon];
    const choice=cls&&Object.entries(modularShips.GEARS).find(([,g])=>g.weapon&&g.cls===cls&&arsenal.GUNS[g.weapon]?.family===base?.family&&arsenal.GUNS[g.weapon]?.arch===base?.arch);
    if(choice)d.primaryWeapon=choice[1].weapon;const gun=choice?.[0]||'gun-'+d.primaryWeapon;
    const layouts={
      mote:[['core','bridge',0,0],['gun','deck',1,0],['engine','drive',-1,0],['fin','spine',0,1]],
      stalker:[['core','bridge',0,0],['gun','deck',1,-1],['port','deck',1,1],['engine','drive',-1,0],['a','spine',1,0],['b','spine',0,-1],['c','spine',0,1]],
      charger:[['core','bridge',0,0],['prow','plate',1,0],['left','plate',1,-1],['right','plate',1,1],['engine','drive',-1,0]],
      sniper:[['core','bridge',0,0],['a','spine',1,0],['gun','deck',2,0],['b','spine',-1,0],['engine','drive',-2,0]],
      hive:[['core','bridge',0,0],['left','utility',0,-1],['right','utility',0,1],['engine','drive',-1,0],['a','spine',1,0],['b','spine',1,-1],['c','spine',1,1]]
    };
    const shape=layouts[e.archetype],flip=(Math.floor(Math.abs(e.x)+Math.abs(e.y))%2)?-1:1;
    const deck=scaled?({MEDIUM:'battery',HEAVY:'heavy',SIEGE:'spinal',CAPITAL:'spinal'})[cls]||'deck':'deck';
    d.modular.sections=shape.map(([id,kind,x,y])=>({id,kind:kind==='deck'?deck:kind,x,y:y*flip}));d.modular.kit=[];
    d.modular.fittings=[{slot:'engine',gear:'engine',mk:1}];for(const section of d.modular.sections)if(['deck','battery','heavy','spinal'].includes(section.kind)&&e.archetype!=='mote')d.modular.fittings.push({slot:section.id,gear:gun,mk:1});
    if(e.archetype==='hive')for(const slot of ['left','right'])d.modular.fittings.push({slot,gear:'drone-bay',mk:1});
    d.modular.hull=scaled?combatScaling.hullFor(e):e.tier>=7?'capital':e.tier>=5?'battleship':e.tier>=3?'cruiser':'frigate';
    if(e.tier>=3){
      const length=e.tier>=7?4:e.tier>=5?3:2,cells=new Set(d.modular.sections.map(s=>s.x+','+s.y));
      // Full shoulders and tapered bows replace the old cross-shaped struts.
      // Preserve each role's existing gun/engine bays and its original AI.
      const width=x=>{
        if(e.archetype==='sniper')return Math.abs(x)<=1?1:0;
        if(e.archetype==='mote')return Math.abs(x)<length?1:0;
        if(e.archetype==='hive')return Math.abs(x)===length?0:Math.abs(x)<2?(e.tier>=7?3:2):2;
        if(e.archetype==='charger')return x===length?0:x<0?1:e.tier>=5?2:1;
        return Math.abs(x)===length?(e.tier>=5?1:0):e.tier>=5&&Math.abs(x)<length-1?2:1;
      };
      for(let x=-length;x<=length;x++)for(let y=-width(x);y<=width(x);y++){
        const realY=y*flip,key=x+','+realY;if(cells.has(key)||d.modular.sections.length>=modularShips.HULLS[d.modular.hull].sections)continue;
        d.modular.sections.push({id:'body-'+(x+length)+'-'+(y+3),kind:Math.abs(y)===width(x)||x===length?'plate':'spine',x,y:realY});cells.add(key);
      }
    }
    // Every extension has a connected return to the command core.
    const connected=new Set(['0,0']);let more=true;while(more){more=false;for(const s of d.modular.sections){const key=s.x+','+s.y;if(!connected.has(key)&&[[1,0],[-1,0],[0,1],[0,-1]].some(([x,y])=>connected.has((s.x+x)+','+(s.y+y)))){connected.add(key);more=true;}}}d.modular.sections=d.modular.sections.filter(s=>connected.has(s.x+','+s.y));
    window.factionFleets?.shape(d.modular,e.tier,id);
    const nodes=modularShips.compile(d).design.nodes;for(const n of nodes){n.currentDx=n.targetDx=n.dx;n.currentDy=n.targetDy=n.dy;}
    e.nodes=nodes;e.coreRadius=18;e.color=d.color;e.faction=id;e.fleetRole=r.name;e.factionFamily=arsenal.familyOf(d.primaryWeapon);e.fleetClass=d.modular.hull;e.name=c.name+' · '+(e.tier>=5?d.modular.hull+' ':'')+r.name;
    window.factionFleets?.mark(e);
    const ratio=e.hp/e.maxHp;e.maxHp=Math.round(e.maxHp*r.hp*(home()&&Math.max(Math.abs(worldMap.currentGridX),Math.abs(worldMap.currentGridY))<=3?.7:e.tier>=5?1.7:1));e.hp=e.maxHp*ratio;
    if(scaled)combatScaling.enemy(e);
  }
  function trainingTarget(index=0){
    const a=index*Math.PI*2/3,e=new EnemyOrganism(Math.cos(a)*750,Math.sin(a)*750,{tier:1,archetype:'mote',name:'Training drone'});
    e.training=true;e.color='#86dac0';e.maxHp=e.hp=Math.round(Math.max(12,Math.min(6000,power()*.75)));e.shield=e.maxShield=0;e.practiceTick=index*40;return e;
  }
  function populate(){engine.enemies=[0,1,2].map(trainingTarget);engine.projectiles=[];engine.bioMines=[];const ch=worldMap.getCurrentChamber();ch.isCleared=false;document.getElementById('hud-chamber-title').textContent='Training grounds · sector 1,0';document.getElementById('hud-danger-lvl').textContent='Practice · 1 metal / 10 targets';paint();}
  function paint(){if(!cue)return;cue.hidden=!saveState.doc.launched||!isRange()||engine.paused;const k=Number(saveState.doc.trainingKills)||0;cue.textContent=`TRAINING · targets scale to fitted guns · ${k%10}/10 credits · 1 metal per 10 · no loot or mastery`;}
  function install(){
    if(!window.noviceFleet?.ready||!window.contactDirector?.ready||!window.modularShips?.ready){setTimeout(install,50);return;}
    const previousGentle=enemyGentle;enemyGentle=e=>previousGentle(e)*(home()&&Math.max(Math.abs(worldMap.currentGridX),Math.abs(worldMap.currentGridY))<=3&&!e.isBoss?.55:1);
    cue=document.createElement('div');cue.className='training-cue';cue.hidden=true;document.body.append(cue);
    const load=engine.loadChamberEntities;engine.loadChamberEntities=function(...a){
      const ch=worldMap.getCurrentChamber();const ring=Math.max(Math.abs(ch.gridX),Math.abs(ch.gridY));if(home()&&ring<=3&&!ch.isBossSector)ch.dangerLevel=ring<=2?1:2;
      const result=load.apply(this,a);if(isRange())populate();else{if(!ch.isBossSector){const cap=home()&&ring<=3?(ring<=2?4:6):12;const brood=this.enemies.filter(e=>e.swarmBrood);this.enemies=(brood.length?[...brood,...this.enemies.filter(e=>!e.swarmBrood)]:this.enemies).slice(0,cap);}window.factionFleets?.compose(this.enemies,ch);for(const e of this.enemies)decorate(e);}paint();return result;
    };
    const update=EnemyOrganism.prototype.update;EnemyOrganism.prototype.update=function(player,shots,enemies,...rest){
      if(this.training){
        this.practiceTick++;this.angle=Math.atan2(player.y-this.y,player.x-this.x);this.vx=Math.cos(this.practiceTick/100)*.35;this.vy=Math.sin(this.practiceTick/100)*.35;this.x+=this.vx;this.y+=this.vy;
        if(this.practiceTick%180===0&&Math.hypot(player.x-this.x,player.y-this.y)<650)shots.push(new Projectile(this.x,this.y,Math.cos(this.angle)*2,Math.sin(this.angle)*2,{damage:1,radius:3,color:'#86dac0',isPlayer:false,type:'practice',life:150}));return;
      }
      decorate(this);const before=shots.length,result=update.call(this,player,shots,enemies,...rest);
      if(this.faction){for(let i=before;i<shots.length;i++){const p=shots[i];if(p.isPlayer)continue;p.color=this.color;const rookie=home()&&Math.max(Math.abs(worldMap.currentGridX),Math.abs(worldMap.currentGridY))<=3;p.damage*=rookie?.65:1+Math.min(.8,Math.max(0,this.tier-3)*.12);if(rookie){p.vx*=.8;p.vy*=.8;}
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
    const spawn=contactDirector.spawn;contactDirector.spawn=function(...a){const ch=worldMap.getCurrentChamber(),ring=Math.max(Math.abs(ch.gridX),Math.abs(ch.gridY));return isRange()||home()&&ring<=3?false:spawn.apply(this,a);};
    const lose=engine.loseNode;engine.loseNode=function(ship,node,...a){if(ship?.faction&&node?.type==='hull'){node.lost=true;node.partHp=0;return;}return lose.call(this,ship,node,...a);};
    for(const host of document.querySelectorAll('#dock-panel .dock-doors')){const b=document.createElement('button');b.className='tm-door';b.textContent='Training grounds · sector 1,0';b.onclick=()=>{travelHelper.training();hubs.closeDock();garage.banner('Training grounds · sector 1,0 · follow the bearing. Tiny practice rewards only.','good');};host.append(b);}
    const tick=engine.update;engine.update=function(...a){const r=tick.apply(this,a);if(++step%20===0)paint();return r;};
    ready=true;if(isRange())populate();
  }
  window.frontierPve={ROSTER,decorate,isRange,populate,power,faction,get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,150));
})();
