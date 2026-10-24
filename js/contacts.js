/* Small, telegraphed patrols bring contact to quiet travel without crowding home. */
(() => {
  'use strict';
  const CFG={quietTicks:900,minimumGap:1200,maxLocal:6,maxTotal:30};let quiet=0,since=0,lastKey='';
  const contacts=window.contactDirector={CFG,spawned:0,ready:false,
    spawn(){
      const ch=worldMap.getCurrentChamber(),p=engine.player;
      if(!ch||ch.isHaven||ch.isBossSector||p.dead||engine.paused||engine.mapOpen||(typeof graveChoir!=='undefined'&&graveChoir.active))return false;
      if(engine.enemies.length+3>CFG.maxTotal||engine.enemies.filter(e=>Math.hypot(e.x-p.x,e.y-p.y)<1000).length>=CFG.maxLocal)return false;
      if(engine.enemies.some(e=>e.fromContactDirector&&Math.hypot(e.x-p.x,e.y-p.y)<2200))return false;
      const distance=Math.max(700,Math.hypot(engine.viewportWidth,engine.viewportHeight)/(2*engine.camera.zoom)+130);let point=null;
      for(let i=0;i<16;i++){const a=Math.random()*Math.PI*2,x=p.x+Math.cos(a)*distance,y=p.y+Math.sin(a)*distance;if(Math.hypot(x,y)<(ch.radius||2600)*.92){point={x,y};break;}}
      if(!point)return false;
      const tier=Math.max(1,ch.dangerLevel||1),pool=tier<=1?['mote','stalker','mote']:tier===2?['stalker','charger','mote']:tier<4?['sniper','charger','stalker']:['hive','charger','sniper'];
      for(let i=0;i<3;i++){const e=new EnemyOrganism(point.x+(i-1)*65,point.y+(i%2)*65,{tier,archetype:pool[i]});e.hunting=true;e.fromContactDirector=true;engine.enemies.push(e);}
      contacts.spawned+=3;garage.banner('PATROL CONTACT · three hulls closing on your bearing','hunt');if(typeof soundEngine!=='undefined')soundEngine.voice('patrol',point);return true;
    },
  };
  window.addEventListener('load',()=>setTimeout(()=>{
    if(typeof atmosphere!=='undefined')for(const p of Object.values(atmosphere.PLACES)){p.level=Math.min(.12,p.level*1.35);if(p.calls)p.swell*=1.1;}
    if(typeof soundEngine!=='undefined'){soundEngine.extraVoices=soundEngine.extraVoices||{};soundEngine.extraVoices.patrol=[210,75,.45,.08,'triangle',.08];}
    const update=engine.update.bind(engine);engine.update=dt=>{const active=!engine.paused&&!engine.mapOpen&&!document.hidden&&!engine.player.dead;const result=update(dt);if(!active)return result;const ch=worldMap.getCurrentChamber(),key=`${typeof galaxy!=='undefined'?galaxy.currentId:'home'}:${ch.gridX},${ch.gridY}`;if(key!==lastKey){quiet=since=0;lastKey=key;}if(ch.isHaven){quiet=0;return result;}since++;const close=engine.enemies.some(e=>Math.hypot(e.x-engine.player.x,e.y-engine.player.y)<900);quiet=close?0:quiet+1;if(quiet>=CFG.quietTicks&&since>=CFG.minimumGap&&contacts.spawn())quiet=since=0;return result;};contacts.ready=true;
  },0));
})();
