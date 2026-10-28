/* Optional living encounters over native AI, discoveries and the modular hold. */
(() => {
  'use strict';
  const TAU=Math.PI*2,models=new WeakSet(),copy=x=>JSON.parse(JSON.stringify(x));
  let ready=false;
  const home=()=>saveState.doc.civHome||'home';
  const excluded=()=>window.bossScenes?.rehearsing||window.holoTest?.active||window.frontierPve?.isRange()||(typeof graveChoir!=='undefined'&&graveChoir.active);
  const ordinary=e=>e.fleetRole&&!e.isBoss&&!e.elite&&!e.swarmBrood&&e.archetype!=='outpost';
  function atSector(ch,hash){
    if(!ready||excluded()||ch.isHaven||ch.isBossSector||galaxy.rule()==='blacksun'||engine.enemies.some(e=>e.name&&!e.jellyShoalKey&&!ordinary(e)&&!e.elite&&e.archetype!=='outpost'&&!e.swarmBrood)||engine.enemies.filter(e=>!e.jellyShoalKey&&!ordinary(e)).length>9)return false;
    return galaxy.currentId===home()?ch.gridX===-1&&ch.gridY===1:ch.dangerLevel>=3&&hash%19===6;
  }
  function populate(event,key,hash){
    event.shoalKey=key;event.shoalHash=hash;
    if(engine.enemies.some(e=>e.jellyShoalKey===key))return;
    // Replace ordinary patrol actors only. Authored, elite, boss and brood actors stay.
    engine.enemies=engine.enemies.filter(e=>!ordinary(e));
    const gentle=galaxy.currentId===home(),tier=gentle?1:Math.min(4,worldMap.getCurrentChamber().dangerLevel);
    const names=['Needle Jelly','Lantern Jelly','Bloom Warden'];
    const count=Math.min(3,Math.max(0,12-engine.enemies.length));
    for(let i=0;i<count;i++){
      const a=i*TAU/3,e=new EnemyOrganism(event.x+Math.cos(a)*230,event.y+Math.sin(a)*230,{tier,archetype:i===2?'sniper':'stalker',name:names[i]});
      e.jellyShoalKey=key;e.jellyGentle=gentle;e.color=i===2?'#d2a6ff':'#77e5d9';
      e.maxHp=e.hp=Math.round((gentle?40:50+tier*18)*(i===2?1.4:1));e.shield=e.maxShield=0;e.shootTimer=45+i*30;
      models.add(e.nodes);engine.enemies.push(e);
    }
    worldMap.getCurrentChamber().isCleared=false;
    document.getElementById('hud-chamber-title').textContent='Jelly Shoal · '+worldMap.currentGridX+','+worldMap.currentGridY;
  }
  const remaining=event=>engine.enemies.filter(e=>e.jellyShoalKey===event.shoalKey&&e.hp>0).length;
  function rewardFor(hash){
    const rare=((hash>>>8)%8)===0,mirror=!!(hash&0x4000);
    if(rare)return mirror?{type:'shield',radius:12,quirk:'mirror',rarity:'rare'}:{type:'cannon',radius:12,weapon:'spitter',quirk:'bouncer',rarity:'rare'};
    const weapon=noviceFleet.ROWS[saveState.doc.civ]?.gun||'spitter';
    return hash&1?{type:'cannon',radius:modularShips.GEARS['gun-'+weapon]?.radius||12,weapon}:{type:'shield',radius:12};
  }
  function claim(event,key){
    if(!ready||excluded()||engine.paused||engine.player.dead||event!==expeditions.event||event.kind!=='shoal'||key!==event.shoalKey||Math.hypot(event.x-engine.player.x,event.y-engine.player.y)>160||remaining(event)||saveState.doc.discoveries?.[key+':shoal'])return false;
    const doc=saveState.doc,before=copy(doc),persist=saveState.save,part=rewardFor(event.shoalHash),base=recoveredFittings.gearOf(part),id=part.quirk?'recovered-'+base+'-'+part.quirk:base,owned=modularShips.hangar().owned['gear:'+id+':1']||0;let result;
    try{
      // Native grant plus discovery and money form one durable transaction.
      saveState.save=()=>true;result=recoveredFittings.grant(part);if(!result)throw Error('No fitting space');
      if((modularShips.hangar().owned['gear:'+id+':1']||0)!==owned+1)throw Error('Fitting stack full');
      doc.metal=hubs.metal+(galaxy.currentId===home()?6:12);(doc.discoveries||(doc.discoveries={}))[key+':shoal']='shoal';
      saveState.doc=doc;if(!persist.call(saveState))throw Error('Save refused');
    }catch(error){
      saveState.doc=doc;for(const k of Object.keys(doc))delete doc[k];Object.assign(doc,before);
      garage.banner(error.message==='Fitting stack full'?'This fitting stack is full · cache left intact.':'Cache not claimed · storage could not save. Try again.','bad');return false;
    }finally{saveState.save=persist;}
    document.getElementById('btn-phone-hold')?.classList.add('new-salvage');window.resourceWallet?.paint(true);
    garage.banner('JELLY CACHE · '+result+' · Open Hold to inspect, then fit an owned module in the field.','good');
    soundEngine.voice?.('pickup');loot.open();return true;
  }
  function plot(){
    const id=home(),key=id+':-1,1';
    if(saveState.doc.discoveries?.[key+':shoal']){garage.banner('Your home shoal has been recovered. Rare shoals can be found in outer systems.','good');return false;}
    let hash=galaxy.doc().seed;for(const c of key)hash=Math.imul(hash^c.charCodeAt(0),16777619);hash>>>=0;
    const a=(hash%360)*Math.PI/180;
    if(!travelHelper.sectorInSystem(id,-1,1,'Jelly Shoal',Math.cos(a)*420,Math.sin(a)*420,'JELLY SHOAL'))return false;
    if(engine.mapOpen)engine.toggleMapModal();return true;
  }
  function drawCache(ctx,event,z){
    ctx.strokeStyle='#77e5d9';ctx.fillStyle='rgba(55,143,135,.13)';
    for(let i=0;i<6;i++){const a=i*TAU/6;ctx.beginPath();ctx.arc(Math.cos(a)*65,Math.sin(a)*65,22+Math.sin(performance.now()/600+i)*3,0,TAU);ctx.fill();ctx.stroke();}
    ctx.fillStyle='#c9fff0';ctx.beginPath();ctx.moveTo(0,-25);ctx.lineTo(21,0);ctx.lineTo(0,25);ctx.lineTo(-21,0);ctx.closePath();ctx.fill();
    ctx.font=`${12/z}px system-ui`;ctx.textAlign='center';ctx.fillText(remaining(event)?'JELLY SHOAL · defeat the guards':'JELLY CACHE · approach to recover',0,-112);
  }
  function install(){
    if(!window.recoveredFittings?.ready||!window.travelHelper?.ready||!window.frontierPve?.ready){setTimeout(install,50);return;}
    const update=EnemyOrganism.prototype.update;
    EnemyOrganism.prototype.update=function(player,shots,...args){
      const before=shots.length,result=update.call(this,player,shots,...args);
      if(this.jellyShoalKey)for(let i=before;i<shots.length;i++){const p=shots[i];if(p.isPlayer)continue;p.color=this.color;p.damage*=this.jellyGentle?.35:.65;p.vx*=.85;p.vy*=.85;}
      return result;
    };
    const draw=fluidShader.drawOrganismMembrane;
    fluidShader.drawOrganismMembrane=function(ctx,x,y,a,r,nodes,color,...args){
      if(!models.has(nodes))return draw.call(this,ctx,x,y,a,r,nodes,color,...args);
      ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.strokeStyle=color;ctx.lineWidth=1.6;const t=performance.now()/500;
      for(let i=0;i<6;i++){const py=(i-2.5)*r*.34,sway=Math.sin(t+i)*r*.3;ctx.globalAlpha=.55;ctx.beginPath();ctx.moveTo(-r*.6,py);ctx.bezierCurveTo(-r*1.25,py+sway,-r*1.6,py-sway,-r*2.2,py+sway);ctx.stroke();}
      ctx.globalAlpha=.95;ctx.fillStyle='#173f47';ctx.beginPath();ctx.ellipse(0,0,r*.95,r*1.16,0,0,TAU);ctx.fill();ctx.stroke();
      ctx.fillStyle=color;ctx.globalAlpha=.35;ctx.beginPath();ctx.ellipse(r*.2,0,r*.45,r*.75,0,0,TAU);ctx.fill();ctx.globalAlpha=1;
      for(const n of nodes)if(n.type==='cannon'&&!n.lost){ctx.beginPath();ctx.arc(n.currentDx,n.currentDy,Math.max(4,n.radius*.7),0,TAU);ctx.stroke();}
      ctx.fillStyle='#d7fff4';ctx.beginPath();ctx.arc(r*.35,0,3.5,0,TAU);ctx.fill();ctx.restore();
    };
    const b=document.createElement('button');b.id='travel-jelly';b.type='button';b.textContent='Find Jelly Shoal · novice detour';b.onclick=plot;
    document.querySelector('#travel-controls>div')?.append(b);
    ready=true;expeditions.setup();
  }
  window.jellyShoals={atSector,populate,remaining,rewardFor,claim,plot,drawCache,get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,200));
})();
