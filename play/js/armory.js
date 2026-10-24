/* Weapon technology, finite fire control and earned purchases. Classic-script adapter.
 * Data registers before engine restore. Installation wraps public seams on load;
 * the engine, hardpoints and Shipyard sources reserved for gun marks stay intact. */
(() => {
  'use strict';
  const NEW = {
    flechette: { title:'Flechette repeater', damage:4, fireRate:3, speed:24, radius:2, life:30, cls:'POINT', cost:240, color:'#a7efe4', blurb:'20 rounds/sec. Short-ranged needle spray.' },
    burst: { title:'Three-round pulse', damage:12, fireRate:36, speed:19, radius:4, burst:3, burstGap:5, cls:'POINT', cost:320, color:'#f3c882', blurb:'Three quick rounds, then a clear reload.' },
    autocannon: { title:'Rotary autocannon', damage:12, fireRate:8, speed:19, radius:5, cls:'LIGHT', cost:480, color:'#ffd393', blurb:'7.5 rounds/sec. Sustained light fire.' },
    shrapnel: { title:'Shrapnel shell', damage:22, fireRate:36, speed:13, radius:8, fragments:6, fuse:26, cls:'LIGHT', cost:600, color:'#f9b68e', blurb:'A timed shell opens into six short-ranged fragments.' },
    heavycannon: { title:'Heavy deck cannon', damage:110, fireRate:60, speed:17, radius:10, cls:'MEDIUM', cost:950, color:'#e8b45f', blurb:'One heavy shell each second. Direct, deliberate fire.' },
    burstbeam: { title:'Pulse-lance battery', damage:30, fireRate:60, speed:29, radius:5, pierce:2, burst:3, burstGap:7, cls:'MEDIUM', cost:1100, color:'#c4abff', blurb:'Three piercing pulses, then a long reset.' },
    howitzer: { title:'Siege howitzer', damage:270, fireRate:135, speed:12, radius:15, life:140, cls:'HEAVY', cost:2400, color:'#ff9e76', blurb:'One enormous shell every 2.25 seconds before hull modifiers.' },
    capitalrail: { title:'Capital spinal rail', damage:420, fireRate:180, speed:32, radius:15, pierce:5, life:140, cls:'CAPITAL', cost:6000, color:'#d1b5ff', blurb:'A huge five-hull rail shot. Long reload; requires a capital-sized mount and hull.' },
  };
  // Medium and heavy families keep distinct cadence. Big batteries pay in fitting load.
  const TUNING = { spitter:{damage:10,fireRate:12}, twin:{damage:8,fireRate:18}, needler:{damage:3,fireRate:3}, flak:{damage:5,fireRate:24}, homing:{damage:200,fireRate:45}, torpedo:{damage:430,fireRate:90}, railgun:{damage:600,fireRate:120}, lance:{damage:185,fireRate:75}, cluster:{damage:210,fireRate:120} };
  for(const[id,values]of Object.entries(TUNING))Object.assign(WEAPON_TYPES[id],values);
  for(const[id,def]of Object.entries(NEW))WEAPON_TYPES[id]={...def};
  if(!MOUNT_LADDER.some(b=>b.cls==='CAPITAL'))MOUNT_LADDER.push({min:43,cls:'CAPITAL',weapon:'capitalrail',alts:[],tint:'#d1b5ff'});
  for(const[id,d]of Object.entries(NEW)){const band=MOUNT_LADDER.find(b=>b.cls===d.cls);if(band.weapon!==id&&!band.alts.includes(id))band.alts.push(id);}
  const LOAD={POINT:2,LIGHT:2,MEDIUM:4,HEAVY:8,SIEGE:12,CAPITAL:22};
  const MIN_RACK={POINT:0,LIGHT:0,MEDIUM:1,HEAVY:2,SIEGE:3,CAPITAL:4};
  const HULL_ROOM={FRIGATE:6,CRUISER:12,BATTLESHIP:20,TITAN:32};
  const RACKS=[
    {name:'Starter fire control',room:4,metal:0,mass:0},
    {name:'Expanded fire control',room:8,metal:320,mass:150},
    {name:'Heavy fire control',room:12,metal:1000,mass:500},
    {name:'Siege fire control',room:20,metal:2600,mass:1400},
    {name:'Capital fire control',room:32,metal:6000,mass:3000},
  ];
  const FREE=['spitter','twin','laser','homing','railgun'];
  const PRICES={needler:180,flak:240,wave:420,mortar:650,boomerang:760,torpedo:1600,lance:3200,cluster:3600,...Object.fromEntries(Object.entries(NEW).map(([id,d])=>[id,d.cost]))};
  const baseCost=fleet.costOfNode.bind(fleet);
  fleet.costOfNode=(type,radius)=>type==='cannon'?Math.max(16,baseCost(type,radius)):baseCost(type,radius);
  const baseEquips=fleet.equips.bind(fleet);
  fleet.equips=()=>[...baseEquips().map(p=>({...p,cost:fleet.costOfNode(p.type,p.radius)})),{type:'cannon',radius:46,title:'Capital spinal mount',desc:'A 46px spinal mount. Requires capital fire control and a Titan hull.',cost:fleet.costOfNode('cannon',46)}];
  let ready=false,queue=[],clock=0,overlay,previousPause=false;
  const $=id=>document.getElementById(id);
  const armory=window.armory={NEW,LOAD,RACKS,PRICES,get ready(){return ready;},
    doc(){
      let d=saveState.doc.armory;
      if(!d||d.v!==1){
        const licenses=[...FREE];
        // Existing fitted weapons remain owned. No wallet or saved ship is deleted.
        for(const n of saveState.doc.design?.nodes||[])if(n.type==='cannon'){const id=fleet.weaponFor(n);if(WEAPON_TYPES[id]&&!licenses.includes(id))licenses.push(id);}
        d=saveState.doc.armory={v:1,rack:0,licenses};saveState.save();
      }
      if(!Array.isArray(d.licenses))d.licenses=[...FREE];
      d.rack=Math.max(0,Math.min(RACKS.length-1,Math.floor(Number(d.rack)||0)));return d;
    },
    owns(id){return FREE.includes(id)||this.doc().licenses.includes(id);},
    fitting(nodes){
      const hull=fleet.hullBand({nodes}),room=Math.min(RACKS[this.doc().rack].room,HULL_ROOM[hull.cls]||4);
      const load=nodes.reduce((sum,n)=>sum+(n.type==='cannon'&&!n.lost?(LOAD[fleet.mountBand(n.radius).cls]||2):0),0);
      return{load,room,hull:hull.cls,over:load>room};
    },
    transact(metal,change){
      if(!Number.isFinite(metal)||metal<0||!hubs.docked||hubs.metal<metal)return false;
      const saved=JSON.parse(JSON.stringify(this.doc())),before=hubs.metal;
      saveState.doc.metal=before-metal;change(this.doc());
      if(!saveState.save()){saveState.doc.metal=before;saveState.doc.armory=saved;return false;}
      paint();return true;
    },
    buyWeapon(id){if(!WEAPON_TYPES[id]||!PRICES[id]||this.owns(id))return false;return this.transact(PRICES[id],d=>d.licenses.push(id));},
    buyRack(){const next=RACKS[this.doc().rack+1];if(!next||progression.totalMass<next.mass)return false;return this.transact(next.metal,d=>d.rack++);},
    open(){previousPause=engine.paused;engine.paused=true;engine.mouse.down=false;document.body.classList.add('armory-open');paint();overlay.style.display='flex';engine._needsRender=true;},
    close(){overlay.style.display='none';document.body.classList.remove('armory-open');engine.paused=previousPause;},
  };
  function item(title,text,button,action,disabled){
    const card=document.createElement('article');card.className='armory-card';
    const h=document.createElement('h3');h.textContent=title;const p=document.createElement('p');p.textContent=text;
    const b=document.createElement('button');b.type='button';b.textContent=button;b.disabled=disabled;b.onclick=action;card.append(h,p,b);return card;
  }
  function paint(){
    if(!overlay)return;
    const d=armory.doc(),fit=armory.fitting(engine.player.nodes);
    $('armory-wallet').textContent=`${hubs.metal} metal · ${RACKS[d.rack].name} · battery load ${fit.load} / ${fit.room}`;
    const rack=$('armory-racks');rack.replaceChildren();const next=RACKS[d.rack+1];
    if(next)rack.append(item(next.name,`Unlock ${next.room} fire-control units. Requires ${next.mass} collected mass. Hull limits: frigate 6, cruiser 12, battleship 20, titan 32.`,`${progression.totalMass<next.mass?'Reach '+next.mass+' mass · ':''}Buy · ${next.metal} metal`,()=>armory.buyRack(),!hubs.docked||hubs.metal<next.metal||progression.totalMass<next.mass));
    else rack.textContent='Capital fire control is installed. Weapon marks remain a separate upgrade path.';
    const list=$('armory-weapons');list.replaceChildren();
    for(const[id,price]of Object.entries(PRICES)){
      const def=WEAPON_TYPES[id],band=MOUNT_LADDER.find(b=>[b.weapon,...b.alts].includes(id));
      const burst=def.burst?`${def.burst}-round burst / `:'';
      list.append(item(def.title,`${band.cls} · ${burst}${(def.fireRate/60).toFixed(2)}s base cycle · ${LOAD[band.cls]} control. Requires ${RACKS[MIN_RACK[band.cls]].name}. ${def.blurb||''}`,armory.owns(id)?'Technology owned':`Research · ${price} metal`,()=>armory.buyWeapon(id),armory.owns(id)||!hubs.docked||hubs.metal<price));
    }
    const note=$('armory-dock-note');if(note)note.textContent=hubs.docked?'Purchases install immediately. Fit owned technology in the Shipyard.':'Dock at a station to purchase. You can browse and plan here.';
  }
  function launchRound(event){
    const p=engine.player;if(p.dead)return;
    const angle=event.angle,source=event.owner===p?{x:p.x+event.dx,y:p.y+event.dy}:{x:event.x,y:event.y};
    const shot=new Projectile(source.x,source.y,Math.cos(angle)*event.speed,Math.sin(angle)*event.speed,{damage:event.damage,color:event.color,radius:event.radius,isPlayer:true,type:event.type,pierce:event.pierce});shot._armoryChild=true;engine.projectiles.push(shot);
    if(typeof soundEngine!=='undefined')soundEngine.playWeaponShot(event.type,source);
  }
  function install(){
    armory.doc();
    overlay=document.createElement('div');overlay.id='armory-panel';overlay.className='menu-overlay';overlay.style.display='none';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','armory-title');
    overlay.innerHTML='<div class="menu-card armory-sheet"><header><div><h2 id="armory-title">Armoury & ship technology</h2><p id="armory-wallet"></p></div><button id="armory-close" type="button">Back</button></header><p id="armory-dock-note"></p><h3>Next ship investment</h3><div id="armory-racks"></div><h3>Weapon technology</h3><div id="armory-weapons"></div></div>';
    overlay.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});document.body.append(overlay);$('armory-close').onclick=()=>armory.close();
    window.addEventListener('black-current-wallet',()=>{if(overlay.style.display==='flex')paint();});
    for(const host of [document.querySelector('#dock-panel .dock-doors'),document.querySelector('#pause-menu .tm-doors')])if(host){const b=document.createElement('button');b.type='button';b.className='tm-door';b.textContent='Armoury / upgrades';b.onclick=()=>armory.open();host.append(b);}
    const check=fitting.check.bind(fitting);fitting.check=design=>{
      const error=check(design);if(error)return error;
      const state=armory.fitting(design.nodes);if(state.over)return `Weapon load ${state.load} / ${state.room}. Fit fewer guns or buy fire control at a dock.`;
      const advanced=design.nodes.find(n=>n.type==='cannon'&&MIN_RACK[fleet.mountBand(n.radius).cls]>armory.doc().rack);
      if(advanced)return `Research ${RACKS[MIN_RACK[fleet.mountBand(advanced.radius).cls]].name} at a dock for this weapon class.`;
      const locked=design.nodes.find(n=>n.type==='cannon'&&!armory.owns(fleet.weaponFor(n)));
      if(locked)return `Research ${WEAPON_TYPES[fleet.weaponFor(locked)].title} at a dock before fitting it.`;
      return !worldMap.getCurrentChamber().isHaven&&!hubs.docked?'Dock to apply a refit. You can still plan and save this blueprint here.':null;
    };
    const damage=hardpoints.damageScale.bind(hardpoints);
    hardpoints.damageScale=player=>{const value=damage(player);if(player!==engine.player)return value;const f=armory.fitting(player.nodes);return value*Math.min(1,f.room/Math.max(1,f.load));};
    const drops=progression.spawnDropsFromEnemy.bind(progression);
    progression.spawnDropsFromEnemy=enemy=>{const start=progression.bubbleDrops.length,result=drops(enemy);if(enemy.isBoss||enemy.tier<=1)return result;const spawned=progression.bubbleDrops.slice(start),budget=enemy.tier*4;for(const d of spawned){d.mass=Math.max(1,Math.floor(budget/Math.max(1,spawned.length)));d.radius=4+d.mass*.8;}return result;};
    const inspector=shipyard.paintInspector;
    shipyard.paintInspector=function(){const result=inspector.call(this);const node=this.design.nodes[this.sel],host=this.el?.querySelector('#sy-part-facts');if(host&&node?.type==='cannon'){const id=fleet.weaponFor(node),f=armory.fitting(this.design.nodes);host.textContent+=` · control ${f.load}/${f.room}`+(armory.owns(id)?'':` · research ${PRICES[id]} metal at dock`);}return result;};
    const updateProjectile=Projectile.prototype.update;
    Projectile.prototype.update=function(targets){
      const d=NEW[this.type];
      if(d&&!this._armorySetup){
        this._armorySetup=true;this.color=d.color;if(d.life)this.life=Math.min(this.life,d.life);
        if(d.pierce){this.pierce=Math.max(this.pierce,d.pierce);this.hitOnce=this.hitOnce||new Set();}
        if(d.burst&&!this._armoryChild){const speed=Math.hypot(this.vx,this.vy),angle=Math.atan2(this.vy,this.vx);for(let i=1;i<d.burst;i++)queue.push({at:clock+i*d.burstGap,owner:engine.player,dx:this.x-engine.player.x,dy:this.y-engine.player.y,x:this.x,y:this.y,angle,speed,damage:this.damage,color:this.color,radius:this.radius,type:this.type,pierce:this.pierce});}
      }
      const result=updateProjectile.call(this,targets);
      if(d?.fragments&&!this._armoryChild&&this.age>=d.fuse&&!this._fragmented){this._fragmented=true;this.life=0;for(let i=0;i<d.fragments;i++){const a=i*Math.PI*2/d.fragments;const p=new Projectile(this.x,this.y,Math.cos(a)*14,Math.sin(a)*14,{damage:this.damage*.5,color:this.color,radius:3,isPlayer:this.isPlayer,type:'spitter',life:24});p._armoryChild=true;engine.projectiles.push(p);}}
      return result;
    };
    const draw=Projectile.prototype.draw;Projectile.prototype.draw=function(ctx,camera){const result=draw.call(this,ctx,camera);const d=NEW[this.type];if(d){ctx.save();ctx.strokeStyle=d.color;ctx.lineWidth=Math.max(1,this.radius*.45);ctx.beginPath();ctx.moveTo(this.x-camera.x,this.y-camera.y);ctx.lineTo(this.x-camera.x-this.vx*1.2,this.y-camera.y-this.vy*1.2);ctx.stroke();ctx.restore();}return result;};
    if(typeof soundEngine!=='undefined'){
      const shot=soundEngine.playWeaponShot.bind(soundEngine);soundEngine.extraVoices=soundEngine.extraVoices||{};
      for(const[id,d]of Object.entries(NEW))soundEngine.extraVoices['w:'+id]=d.cls==='CAPITAL'?[75,22,.6,.16,'triangle',.26]:d.fireRate>=60?[130,35,.3,.12,'triangle',.2]:[650,140,.12,.055,'triangle',.04];
      soundEngine.playWeaponShot=(type,position)=>NEW[type]?soundEngine.voice('w:'+type,position):shot(type,position);
    }
    let wasDead=false,lastWarning='';const update=engine.update.bind(engine);
    engine.update=dt=>{const active=!engine.paused&&!engine.mapOpen&&!document.hidden&&!engine.player.dead;
      if(active){clock++;const due=queue.filter(q=>q.at<=clock);queue=queue.filter(q=>q.at>clock);for(const q of due)launchRound(q);}
      const result=update(dt);
      if(engine.player.dead&&!wasDead)queue=[];wasDead=engine.player.dead;
      if(active&&clock%30===0){const f=armory.fitting(engine.player.nodes),warning=f.over?`${f.load}/${f.room}`:'';if(warning&&warning!==lastWarning)garage.banner(`BATTERY OVERLOADED · ${warning} control. Refit or research a larger rack.`, 'bad');lastWarning=warning;}
      return result;
    };
    const enter=engine.enterChamber.bind(engine);engine.enterChamber=(...args)=>{queue=[];return enter(...args);};
    document.addEventListener('keydown',e=>{if(e.code==='Escape'&&overlay.style.display==='flex'){e.preventDefault();e.stopImmediatePropagation();armory.close();}},true);
    ready=true;
  }
  if(document.readyState==='complete')install();else window.addEventListener('load',()=>setTimeout(install,0));
})();
