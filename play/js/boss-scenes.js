/* One authored guardian environment and a capture rehearsal over the native
 * Solar Dreadnought fight. Campaign rewards stay native; rehearsal deaths and
 * kills bypass the reward hooks, and the original campaign document is parked
 * by reference while a disposable copy runs inside the existing holo bay. */
(() => {
  'use strict';
  const NAME='SOLAR DREADNOUGHT',copy=x=>JSON.parse(JSON.stringify(x)),$=id=>document.getElementById(id);
  let image=null,run=null,dialog=null,ready=false,assetReady=false,assetError=null;
  const stats={backgrounds:0,guardians:0};
  const solar=e=>!!e?.isBoss&&(e.name===NAME||e.bossType===NAME||e._bk==='solar');
  function active(){return!!run||worldMap.getCurrentChamber()?.bossName===NAME||engine.enemies.some(solar);}
  function capture(on=!document.body.classList.contains('capture-view')){
    if(!saveState.doc.launched)return false;
    document.body.classList.toggle('capture-view',!!on);$('capture-return').hidden=!on;return!!on;
  }
  function prepare(e){
    if(!solar(e)||e._solarHull)return;
    const sections=[];for(let x=-2;x<=2;x++)for(let y=-1;y<=1;y++)sections.push({id:x===0&&y===0?'core':'body-'+(x+2)+'-'+(y+1),kind:x===0&&y===0?'bridge':'plate',x,y});
    const fittings=[];
    for(const y of[-2,2])for(const x of[-1,0,1]){const id='wing-'+(x+1)+'-'+(y+2);sections.push({id,kind:x?'heavy':'plate',x,y});if(x)fittings.push({slot:id,gear:'gun-pulse-heavy',mk:1});}
    sections.push({id:'prow',kind:'spinal',x:3,y:0},{id:'aft',kind:'drive',x:-3,y:0},{id:'port-tip',kind:'plate',x:0,y:-3},{id:'star-tip',kind:'plate',x:0,y:3});fittings.push({slot:'aft',gear:'engine',mk:1});
    const d=modularShips.make('capital');d.frame=NAME;d.color='#e8c478';d.modular={v:1,hull:'capital',sections,fittings,kit:[],livery:{body:'#e9e0c8',edge:'#d4af65',skin:'lance'}};
    e.nodes=modularShips.compile(d).design.nodes;e.nodes[0].radius=e.coreRadius;
    for(const n of e.nodes){n.currentDx=n.targetDx=n.dx;n.currentDy=n.targetDy=n.dy;if(n.type==='cannon')n.factionSkin='lance';}
    e._solarHull=true;stats.guardians++;
  }
  function backdrop(ctx,camera){
    if(!image||!active())return;
    const z=camera.zoom||1,W=engine.viewportWidth/z,H=engine.viewportHeight/z,size=Math.max(W,H)*1.32;
    const centre=run?.centre||{x:0,y:-450},x=W/2+(centre.x-camera.x-W/2)*.12,y=H/2+(centre.y-camera.y-H/2)*.12;
    // Scaled once per screen size and zoom, then blitted at whole pixels: resampling the arena art on every backdrop
    // repaint cost 1.5 screens of filtering in a software canvas (measured 2026-10-30, Mac: "the fps is so so bad").
    const T=ctx.getTransform(),px=Math.round(size*T.a);
    ctx.save();ctx.globalAlpha=.96;
    if(T.a===T.d&&!T.b&&!T.c&&px>0&&px<=4096){
      if(!scaled||scaled.width!==px){scaled=scaled||document.createElement('canvas');scaled.width=scaled.height=px;scaled.getContext('2d').drawImage(image,0,0,px,px);}
      ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(scaled,Math.round((x-size/2)*T.a+T.e),Math.round((y-size/2)*T.d+T.f));
    }else ctx.drawImage(image,x-size/2,y-size/2,size,size);
    ctx.restore();stats.backgrounds++;
  }
  let scaled=null;
  function open(){if(!dialog)return false;$('boss-scene-end').disabled=!run;dialog.showModal();return true;}
  function close(){if(dialog?.open)dialog.close();}
  function end(){
    if(!run)return false;const r=run;run=null;
    document.body.classList.remove('boss-rehearsal','capture-view');$('capture-return').hidden=true;
    progression.totalMass=r.mass;progression.evolutionLevel=r.level;progression.bubbleDrops=r.drops;
    // Native holo restores its actor arrays and pilot. Its persisted document
    // was the temporary copy; the original object and its nested identities live on.
    r.nativeEnd.call(holoTest,true);saveState.doc=r.doc;saveState.save=r.persist;
    engine.effects=r.effects;engine.drones=r.drones;engine.inCombat=r.combat;Object.assign(engine.camera,r.camera);engine.paused=r.paused;engine.mouse.down=false;Object.assign(hunt,r.hunt);hubs.raid=r.raid;hubs.raidT=r.raidT;
    shipyard.design=r.yard;if(shipyard.design&&shipyard.el)shipyard.syncFields();
    const ch=worldMap.getCurrentChamber();if(ch===r.chamber){ch.isCleared=r.cleared;ch.isExplored=r.explored;}
    document.body.classList.toggle('boss-arena',active());if(!active())$('boss-bar').hidden=true;
    soundEngine.setMusicState(ch.isBossSector?'BOSS':ch.musicTheme,ch.isBossSector?{boss:BOSS_KEYS[ch.bossName]}:undefined);menu.applySettings();window.walletHUD?.paint();window.modularYard?.refresh();garage.paintHud?.();engine.updateHUD();return true;
  }
  function rehearse(){
    if(run||holoTest.active||!saveState.doc.launched||engine.player.dead)return false;
    if(hubs.docked)hubs.closeDock();
    const p=engine.player,ch=worldMap.getCurrentChamber(),state={doc:saveState.doc,persist:saveState.save,mass:progression.totalMass,level:progression.evolutionLevel,drops:progression.bubbleDrops,effects:engine.effects,drones:engine.drones,combat:engine.inCombat,camera:{...engine.camera},paused:engine.paused,yard:shipyard.design,chamber:ch,cleared:ch.isCleared,explored:ch.isExplored,nativeEnd:holoTest._bossSceneEnd,centre:{x:p.x,y:p.y-280},boss:null,won:false,hunt:{wing:hunt.wing,wingT:hunt.wingT,chain:hunt.chain,best:hunt.best,lastKill:hunt.lastKill,overdrive:hunt.overdrive},raid:hubs.raid,raidT:hubs.raidT};
    run=state;saveState.doc=copy(state.doc);saveState.save=()=>true;progression.bubbleDrops=[];engine.effects=[];engine.drones=[];hunt.wing=null;hunt.wingT=1e9;hubs.raid=null;hubs.raidT=0;
    try{
      shipyard.design=copy(state.doc.design);if(shipyard.el)shipyard.syncFields();
      if(!holoTest.start()){if(run)end();return false;}
      const sentinel=engine.enemies[0];sentinel.holo={...sentinel.holo,dx:10000,dy:10000,dummy:true};sentinel.x=p.x+10000;sentinel.y=p.y+10000;
      engine.enemies=[];state.boss=bosses.spawn('solar');state.boss._sceneRehearsal=true;state.sentinel=sentinel;prepare(state.boss);engine.enemies.push(sentinel);engine.projectiles=[];
      document.body.classList.add('boss-rehearsal');engine.paused=false;soundEngine.setMusicState('BOSS',{boss:'solar'});garage.banner('Solar Dreadnought rehearsal · no rewards saved · Esc ends','hunt');return true;
    }catch(e){if(run)end();garage.banner('Rehearsal could not start: '+e.message,'bad');return false;}
  }
  function install(){
    if(!window.factionFleets?.ready||!window.holoTest||!window.bosses){setTimeout(install,50);return;}
    const ocean=fluidShader.drawParallaxOcean;fluidShader.drawParallaxOcean=function(ctx,camera){const r=ocean.apply(this,arguments);backdrop(ctx,camera);return r;};
    const sun=fluidShader.drawBlackSun;if(sun)fluidShader.drawBlackSun=function(...a){if(active())return;return sun.apply(this,a);};
    const membrane=worldMap.drawChamberMembrane;worldMap.drawChamberMembrane=function(){if(run)return;return membrane.apply(this,arguments);};
    for(const method of['drawField','drawBearing']){const original=sectorField[method];sectorField[method]=function(...a){if(run)return;return original.apply(this,a);};}
    const update=EnemyOrganism.prototype.update;EnemyOrganism.prototype.update=function(...a){prepare(this);const awake=this._awake,r=update.apply(this,a);if(solar(this)&&!awake&&this._awake)this._sceneArrival=performance.now();return r;};
    const draw=EnemyOrganism.prototype.draw;EnemyOrganism.prototype.draw=function(ctx,camera){const r=draw.apply(this,arguments);if(!solar(this)||!this._sceneArrival)return r;const t=(performance.now()-this._sceneArrival)/1800;if(t<0||t>=1)return r;ctx.save();ctx.strokeStyle='#f2cf75';ctx.globalAlpha=(1-t)*.65;ctx.lineWidth=3/(camera.zoom||1);ctx.beginPath();ctx.arc(this.x-camera.x,this.y-camera.y,80+t*330,0,Math.PI*2);ctx.stroke();ctx.restore();return r;};
    const kill=engine.killEnemy;engine.killEnemy=function(i,...a){const e=this.enemies[i];if(run&&e){if(e===run.sentinel){e.hp=e.maxHp;return;}this.enemies.splice(i,1);if(e===run.boss){this.projectiles=[];run.won=true;garage.banner('Rehearsal complete · no campaign rewards claimed','good');}particleSystem.spawnBubbleBurst(e.x,e.y,'#e8c478',24);return;}return kill.call(this,i,...a);};
    const death=engine.playerDeath;engine.playerDeath=function(...a){if(!run)return death.apply(this,a);this.repairNodes?.(this.player);this.recalculatePlayerStats();Object.assign(this.player,{hp:this.player.maxHp,dead:false,iFrames:90});garage.banner('Rehearsal hull reset · no penalty','good');};
    const salvage=progression.spawnSalvage;progression.spawnSalvage=function(...a){if(run)return null;return salvage.apply(this,a);};
    const dock=hubs.openDock;hubs.openDock=function(...a){if(run)return false;return dock.apply(this,a);};
    const patrol=contactDirector.spawn;contactDirector.spawn=function(...a){return run?false:patrol.apply(this,a);};
    const target=travelHelper.target;travelHelper.target=function(...a){return run?null:target.apply(this,a);};
    const tick=engine.update;engine.update=function(...a){if(run){hunt.wingT=1e9;hubs.raidT=0;}const r=tick.apply(this,a);document.body.classList.toggle('boss-arena',active());if(run?.boss&&document.body.classList.contains('capture-view')){const p=this.player,b=run.boss,zoom=Math.max(.22,Math.min(.5,this.viewportWidth/(Math.abs(p.x-b.x)+900),this.viewportHeight/(Math.abs(p.y-b.y)+900)));this.camera.zoom=this.camera.targetZoom=zoom;this.camera.x=(p.x+b.x)/2-this.viewportWidth/(2*zoom);this.camera.y=(p.y+b.y)/2-this.viewportHeight/(2*zoom);}return r;};
    const nativeEnd=holoTest.end;holoTest._bossSceneEnd=nativeEnd;holoTest.end=function(...a){return run?end():nativeEnd.apply(this,a);};
    window.addEventListener('click',e=>{if(run&&e.target.closest?.('#btn-pause-quit'))end();},true);
    const back=document.createElement('button');back.id='capture-return';back.type='button';back.hidden=true;back.textContent='HUD · H';back.setAttribute('aria-label','Restore game controls');back.onclick=()=>capture(false);document.body.append(back);
    dialog=document.createElement('dialog');dialog.id='boss-scene-menu';dialog.setAttribute('aria-labelledby','boss-scene-title');dialog.innerHTML='<header><h2 id="boss-scene-title">Solar Dreadnought</h2><button type="button" id="boss-scene-close">× Close</button></header><img id="boss-scene-preview" alt="Shattered golden orbital ring around an open battle space"><p>Asterion Forge · sector −3,3. Three phases: spirals, locked flare fans, then sun rings. The campaign reward is the Flare Crown relic.</p><div class="boss-scene-actions"><button type="button" id="boss-scene-route">Plot guardian route</button><button type="button" id="boss-scene-rehearse">Boss rehearsal · free</button><button type="button" id="boss-scene-capture">Cinematic view · H</button><button type="button" id="boss-scene-end">End rehearsal</button></div><small>Rehearsal uses your flying ship. No campaign rewards, costs or progress are saved. In cinematic view, H restores the interface; phones keep a HUD button.</small>';document.body.append(dialog);
    const preview=$('boss-scene-preview');api.loaded.then(()=>{if(image)preview.src=image.src;});
    $('boss-scene-close').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    $('boss-scene-route').onclick=()=>{if(travelHelper.sectorInSystem('home',-3,3,NAME,0,-900,'GUARDIAN')){close();menu.resume();}};
    $('boss-scene-rehearse').onclick=()=>{close();menu.resume();rehearse();};$('boss-scene-capture').onclick=()=>{close();menu.resume();capture(true);};$('boss-scene-end').onclick=()=>{close();if(run)end();};
    const door=document.createElement('button');door.id='btn-boss-scenes';door.type='button';door.className='tm-door';door.textContent='Guardian encounter & capture';door.onclick=open;document.querySelector('#pause-menu .tm-doors').append(door);ready=true;
  }
  // This file precedes holo-test.js so its top-layer dialog consumes Escape first.
  window.addEventListener('keydown',e=>{if(e.code==='Escape'&&dialog?.open){e.preventDefault();e.stopImmediatePropagation();close();}else if(e.code==='Escape'&&document.body.classList.contains('capture-view')){e.preventDefault();e.stopImmediatePropagation();capture(false);}else if(e.code==='KeyH'&&!e.repeat&&!e.target.closest?.('input,textarea,select,[contenteditable=true]')&&saveState.doc.launched&&!dialog?.open){e.preventDefault();e.stopImmediatePropagation();capture();}},true);
  const api=window.bossScenes={open,close,rehearse,end,capture,prepare,stats,get ready(){return ready;},get active(){return active();},get rehearsing(){return!!run;},get won(){return!!run?.won;},get assetReady(){return assetReady;},get assetError(){return assetError;}};
  api.loaded=(async()=>{const kit=window.__WORLD_KIT||await fetch('art/world-kit.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('World art HTTP '+r.status);return r.json();}),asset=kit.assets.find(a=>a.id==='solar-ring');if(!asset)throw new Error('Solar arena asset missing');await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{image=img;resolve();};img.onerror=()=>reject(new Error('Solar arena image missing'));img.src=window.__ART?.[asset.path]||asset.path;});assetReady=true;return true;})().catch(e=>{assetError=e.message;return false;});
  window.addEventListener('load',()=>setTimeout(install,200));
})();
