/* Seeded, short encounters in the existing galaxy. Discovery is saved in the one run document. */
(() => {
  const TAU=Math.PI*2;
  let key='',event=null,ticks=0,echoUntil=0,lastPing=-999,scan=0;
  const done=()=>saveState.doc.discoveries||(saveState.doc.discoveries={});
  function sectorKey(){const ch=worldMap.getCurrentChamber();return galaxy.currentId+':'+ch.gridX+','+ch.gridY;}
  function setup(){
    key=sectorKey();event=null;scan=0;const ch=worldMap.getCurrentChamber();
    if(ch.isHaven||done()[key])return;
    let hash=galaxy.doc().seed;for(const c of key)hash=Math.imul(hash^c.charCodeAt(0),16777619);hash>>>=0;
    const kind=galaxy.rule()==='blacksun'?'relic':['distress','wreck','convoy'][hash%3];
    const a=(hash%360)*Math.PI/180;
    event={kind,x:Math.cos(a)*420,y:Math.sin(a)*420,originX:Math.cos(a)*420,originY:Math.sin(a)*420};
    garage.banner(kind==='relic'?'BLACK SUN · Sonar reveals the wreck. Approach to scan.':'FAINT SIGNAL · Follow the small diamond bearing.','good');
  }
  function ping(){
    if(ticks-lastPing<180||engine.paused||engine.player.dead)return false;
    lastPing=ticks;echoUntil=ticks+180;
    for(const e of engine.enemies)if(Math.hypot(e.x-engine.player.x,e.y-engine.player.y)<1100)e._ping=1;
    particleSystem.particles.push(new Particle(engine.player.x,engine.player.y,{vx:.0001,vy:.0001,type:'ring',radius:30,maxRadius:1100,color:'#9cafff',decay:.016}));
    soundEngine.voice?.('sonar');return true;
  }
  const expeditions=window.expeditions={ping,setup,get event(){return event;},get scan(){return scan;},lights(){return event&&ticks<echoUntil?[event,...pylons()]:[];},interact(){
    if(!event||engine.paused||Math.hypot(event.x-engine.player.x,event.y-engine.player.y)>160)return false;
    if(event.kind==='relic'&&scan<120)return false;
    const kind=event.kind;
    if(kind==='distress'){
      progression.spawnSalvage(event.x,event.y,{part:{type:'bay',radius:12}});hubs.metal+=18;
      garage.banner('RESCUE COMPLETE · Drone-bay blueprint recovered.','good');
    }else if(kind==='wreck'){
      const design=JSON.parse(JSON.stringify(fleet.starterChassis()));design.id='recovered-'+key.replace(/[^a-z0-9]/gi,'-');design.frame='Recovered hull';
      const hulls=saveState.doc.recoveredHulls||(saveState.doc.recoveredHulls=[]);if(hulls.length<12)hulls.push(design);
      garage.banner('ABANDONED HULL RECOVERED · Open Hold to refit it.','good');
      progression.spawnSalvage(event.x,event.y,{part:loot.roll('rare')});
    }else if(kind==='convoy'){
      progression.spawnSalvage(event.x,event.y,{part:loot.roll('rare')});garage.banner('CONVOY RECOVERED · A fitting is yours.','good');
      const enemy=new EnemyOrganism(event.x+550,event.y,{tier:Math.max(1,worldMap.getCurrentChamber().dangerLevel),archetype:'stalker'});engine.enemies.push(enemy);
    }else{
      progression.spawnSalvage(event.x,event.y,{part:loot.roll('exotic')});hubs.metal+=24;
      garage.banner('BLACK BOX RECOVERED · “Keep to the light between the pylons.”','good');
    }
    done()[key]=kind;saveState.save();event=null;document.getElementById('expedition-action').hidden=true;return true;
  }};
  function pylons(){if(!event||galaxy.rule()!=='blacksun')return[];return[-1,1].map(side=>({x:event.x+side*230,y:event.y-80}));}
  function tick(){
    ticks++;if(sectorKey()!==key)setup();const button=document.getElementById('expedition-action');
    if(!event){button.hidden=true;return;}
    if(event.kind==='convoy'){event.x=event.originX+Math.sin(ticks/220)*160;event.y=event.originY+Math.cos(ticks/220)*80;}
    const near=Math.hypot(event.x-engine.player.x,event.y-engine.player.y)<160;
    if(event.kind==='relic'&&near&&ticks<echoUntil)scan=Math.min(120,scan+1);
    button.hidden=!near;button.disabled=event.kind==='relic'&&scan<120;
    button.textContent=event.kind==='relic'?(scan<120?`Scanning black box · ${Math.floor(scan/1.2)}%`:'Recover black box'):event.kind==='distress'?'Answer distress beacon':event.kind==='wreck'?'Recover abandoned hull':'Recover convoy fitting';
    if(galaxy.rule()==='blacksun'&&ticks%300===0)ping();
    for(const p of pylons()){
      const distance=Math.hypot(p.x-engine.player.x,p.y-engine.player.y);
      if(distance<75&&ticks%45===0)engine.playerTakeDamage(9,'contact');
    }
  }
  function draw(ctx,camera){
    if(!event)return;const dark=galaxy.rule()==='blacksun',revealed=!dark||ticks<echoUntil;
    const x=event.x-camera.x,y=event.y-camera.y,z=engine.camera.zoom;
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=dark?'#aaaeed':'#b6c690';ctx.fillStyle='#122631';ctx.lineWidth=2/z;
    if(revealed){
      // A single silhouette, with exposed mounts, reads as an abandoned ship from a distance.
      ctx.beginPath();ctx.moveTo(110,0);ctx.lineTo(35,-34);ctx.lineTo(-85,-42);ctx.lineTo(-120,0);ctx.lineTo(-85,42);ctx.lineTo(35,34);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeRect(-40,-58,22,19);ctx.strokeRect(-40,39,22,19);
      ctx.fillStyle='#d5d8bf';ctx.font=`${11/z}px system-ui`;ctx.textAlign='center';ctx.fillText(event.kind==='relic'?'BLACK BOX SIGNAL':event.kind.toUpperCase()+' SIGNAL',0,-76);
    }
    ctx.restore();
    if(revealed)for(const p of pylons()){
      ctx.save();ctx.translate(p.x-camera.x,p.y-camera.y);ctx.strokeStyle='#a3a9e4';ctx.fillStyle='#101322';ctx.lineWidth=2/z;ctx.beginPath();ctx.moveTo(0,-100);ctx.lineTo(28,60);ctx.lineTo(-28,60);ctx.closePath();ctx.fill();ctx.stroke();ctx.setLineDash([8,12]);ctx.strokeStyle='rgba(255,104,136,.45)';ctx.beginPath();ctx.arc(0,0,75,0,TAU);ctx.stroke();ctx.restore();
    }
    // An inexpensive bearing diamond; discovery remains possible outside the current camera.
    const sx=(event.x-camera.x)*z,sy=(event.y-camera.y)*z,margin=140;
    if(sx<0||sy<0||sx>innerWidth||sy>innerHeight){const bx=Math.max(margin,Math.min(innerWidth-margin,sx))/z,by=Math.max(140,Math.min(innerHeight-250,sy))/z;ctx.save();ctx.fillStyle='#d5ca8f';ctx.beginPath();ctx.moveTo(bx,by-8/z);ctx.lineTo(bx+6/z,by);ctx.lineTo(bx,by+8/z);ctx.lineTo(bx-6/z,by);ctx.fill();ctx.restore();}
  }
  window.addEventListener('load',()=>{
    const button=document.createElement('button');button.id='expedition-action';button.type='button';button.hidden=true;button.onclick=e=>{e.stopPropagation();expeditions.interact();};button.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});document.body.append(button);
    const sonar=document.createElement('button');sonar.type='button';sonar.id='btn-phone-sonar';sonar.textContent='Sonar';sonar.onclick=e=>{e.stopPropagation();ping();};document.getElementById('phone-zoom').append(sonar);
    const update=engine.update.bind(engine);engine.update=dt=>{const result=update(dt);if(!engine.paused&&!engine.mapOpen&&!document.hidden&&!engine.player.dead)tick();button.style.visibility=engine.paused||engine.mapOpen?'hidden':'';return result;};
    const render=particleSystem.draw.bind(particleSystem);particleSystem.draw=(ctx,camera)=>{draw(ctx,camera);render(ctx,camera);};
    document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if(e.code==='KeyQ')ping();if(e.code==='KeyE'&&!hubs.docked)expeditions.interact();});
    setup();
  });
})();
