/* Small, telegraphed patrols bring contact to quiet travel without crowding home. */
(() => {
  'use strict';
  const CFG={quietTicks:900,minimumGap:1200,maxLocal:6,maxTotal:30};let quiet=0,since=0,lastKey='';
  // pace() can be replaced per place (pve-frontier.js gives the home rings a rookie pace).
  const contacts=window.contactDirector={CFG,spawned:0,ready:false,pace:()=>({quietTicks:CFG.quietTicks,minimumGap:CFG.minimumGap,hulls:3}),
    spawn(){
      const ch=worldMap.getCurrentChamber(),p=engine.player;
      if(!ch||ch.isHaven||ch.isBossSector||p.dead||engine.paused||engine.mapOpen||(typeof graveChoir!=='undefined'&&graveChoir.active))return false;
      if(engine.enemies.length+3>CFG.maxTotal||engine.enemies.filter(e=>Math.hypot(e.x-p.x,e.y-p.y)<1000).length>=CFG.maxLocal)return false;
      if(engine.enemies.some(e=>e.fromContactDirector&&Math.hypot(e.x-p.x,e.y-p.y)<2200))return false;
      const distance=Math.max(700,Math.hypot(engine.viewportWidth,engine.viewportHeight)/(2*engine.camera.zoom)+130);let point=null;
      for(let i=0;i<16;i++){const a=Math.random()*Math.PI*2,x=p.x+Math.cos(a)*distance,y=p.y+Math.sin(a)*distance;if(Math.hypot(x,y)<(ch.radius||2600)*.92){point={x,y};break;}}
      if(!point)return false;
      const tier=Math.max(1,ch.dangerLevel||1),plan=window.factionFleets?.plan(ch),pool=plan?.roles||(tier<=1?['mote','stalker','mote']:tier===2?['stalker','charger','mote']:tier<4?['sniper','charger','stalker']:['hive','charger','sniper']);
      const hulls=contacts.pace().hulls||3;for(let i=0;i<hulls;i++){const e=new EnemyOrganism(point.x+(i-1)*65,point.y+(i%2)*65,{tier,archetype:pool[i]});e.hunting=true;e.fromContactDirector=true;e._fleetLane=i%2?-1:1;engine.enemies.push(e);}
      contacts.spawned+=hulls;garage.banner(plan?canon.civilisations.find(c=>c.id===plan.id).name+' · '+plan.label+' · '+plan.counter:`PATROL CONTACT · ${hulls===2?'two':'three'} hulls closing on your bearing`,'hunt');if(typeof soundEngine!=='undefined')soundEngine.voice('patrol',point);return true;
    },
  };
  window.addEventListener('load',()=>setTimeout(()=>{
    if(typeof atmosphere!=='undefined')for(const p of Object.values(atmosphere.PLACES)){p.level=Math.min(.12,p.level*1.35);if(p.calls)p.swell*=1.1;}
    if(typeof soundEngine!=='undefined'){soundEngine.extraVoices=soundEngine.extraVoices||{};soundEngine.extraVoices.patrol=[210,75,.45,.08,'triangle',.08];}
    const update=engine.update.bind(engine);engine.update=dt=>{const active=!engine.paused&&!engine.mapOpen&&!document.hidden&&!engine.player.dead;const result=update(dt);if(!active)return result;const ch=worldMap.getCurrentChamber(),key=`${typeof galaxy!=='undefined'?galaxy.currentId:'home'}:${ch.gridX},${ch.gridY}`;if(key!==lastKey){quiet=since=0;lastKey=key;}if(ch.isHaven){quiet=0;return result;}since++;const close=engine.enemies.some(e=>Math.hypot(e.x-engine.player.x,e.y-engine.player.y)<900);quiet=close?0:quiet+1;const pace=contacts.pace();if(quiet>=pace.quietTicks&&since>=pace.minimumGap&&contacts.spawn())quiet=since=0;return result;};contacts.ready=true;
  },0));
})();
