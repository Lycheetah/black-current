/* Tactical wings reuse ordinary actors, native damageable parts/projectiles and
 * faction commissions. No new wallet, drop table or enemy-count multiplier. */
(() => {
  'use strict';
  const WINGS={
    recovery:{name:'Mender convoy',counter:'Break the green mender; then clear its escorts',roles:['tender','escort','charger']},
    torpedo:{name:'Torpedo picket',counter:'Sidestep the launch; close on the torpedo ship',roles:['bomber','escort','artillery']},
    cordon:{name:'Flak cordon',counter:'Stay outside the fan; flank its gunship',roles:['flak','charger','scout']}
  };
  const ROLES={tender:{name:'Repair tender',base:'stalker'},bomber:{name:'Torpedo ship',base:'stalker'},flak:{name:'Flak ship',base:'stalker'},escort:{name:'Wing escort',base:'stalker'},charger:{name:'Breach escort',base:'charger'},artillery:{name:'Picket artillery',base:'sniper'},scout:{name:'Screen scout',base:'mote'}};
  const seen=new WeakSet();let ready=false,serial=0;
  const hash=s=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
  const excluded=()=>window.holoTest?.active||window.bossScenes?.rehearsing||window.frontierPve?.isRange()||(typeof graveChoir!=='undefined'&&graveChoir.active);
  function plan(ch=worldMap.getCurrentChamber()){
    if(!ready||excluded()||factionFleets.protectedSector(ch)||(ch.dangerLevel||1)<3)return null;
    const key=galaxy.currentId+':'+ch.gridX+','+ch.gridY,id=Object.keys(WINGS)[hash(key)%3];
    return{id,key,...WINGS[id]};
  }
  function compose(enemies,ch){
    const p=plan(ch);if(!p)return 0;
    const members=enemies.filter(e=>e.fleetEncounter&&!e.faction&&!e.name&&!e.training&&!e.isBoss&&!e.elite&&!e.swarmBrood&&!Number.isInteger(e.firstExpeditionGuard)&&!e.jellyShoalKey).slice(0,3);
    if(members.length!==3)return 0;
    const group=p.key+':wing:'+(++serial);
    for(let i=0;i<3;i++){const e=members[i];e.wingKey=group;e.wingType=p.id;e.wingRole=p.roles[i];e.wingSkin={tender:'hive',bomber:'sniper',flak:'charger'}[e.wingRole];/* Mac, 2026-10-30: wings were flattening every faction into stalkers. Overlay roles (tender, bomber, flak, escort) keep the
      doctrine hull and AI (js/faction-fleets.js); only roles that need a specific body (charger, artillery, scout) take it */
      const base=ROLES[e.wingRole].base;if(base!=='stalker'||!e.fleetEncounter)e.archetype=base;e.nodes=[];e.setupNodes();e.fleetEncounter=p.name;}
    return 3;
  }
  function prepare(e){
    if(!e.wingRole||seen.has(e)||!e.faction)return;seen.add(e);
    e.fleetRole=ROLES[e.wingRole].name;e.wingClock=0;e.wingCooldown=35;e.wingWindup=0;
    if(e.wingRole==='tender'){
      const part=e.nodes.find(n=>n.type==='hull');if(part)part.type='mender';
    }
    for(const n of e.nodes)if(n.type==='cannon'&&['bomber','flak'].includes(e.wingRole))n.weapon=e.wingRole==='bomber'?'torpedo-point':'flak';
    factionFleets.mark(e);
  }
  const specialist=e=>e.wingRole==='bomber'||e.wingRole==='flak';
  function profile(e,base){
    if(!e.wingRole||!base)return base;
    const range=e.wingRole==='flak'?820:e.wingRole==='bomber'?1250:base.fireRange;
    return{...base,role:ROLES[e.wingRole].name,fireRange:range,aggro:range+160,standOff:e.wingRole==='tender'?800:e.wingRole==='bomber'?900:e.wingRole==='flak'?500:base.standOff};
  }
  function pulse(e,enemies){
    if(e.wingRole!=='tender'||!e._aggro||!e.armed('mender')||e.wingClock%120)return;
    const ally=enemies.filter(a=>a!==e&&a.wingKey===e.wingKey&&a.hp>0&&a.hp<a.maxHp&&performance.now()-(a._hullHitAt??-Infinity)>=3000&&Math.hypot(a.x-e.x,a.y-e.y)<=650).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    if(!ally)return;const amount=Math.min(10,ally.maxHp*.02,ally.maxHp-ally.hp);ally.hp+=amount;e.wingHeal={target:ally,until:e.wingClock+18,amount};
  }
  function attack(e,player,shots){
    if(!specialist(e))return;
    if(!e._aggro||e.hp<=0||!e.armed('cannon')){e.wingWindup=0;return;}
    const p=enemyCombat.profile(e),distance=Math.hypot(player.x-e.x,player.y-e.y);
    if(e.wingCooldown>0)e.wingCooldown--;
    if(e.wingWindup>0){
      e.wingWindup--;if(e.wingWindup)return;
      if(distance>p.fireRange+160)return;
      const gun=e.nodes.find(n=>n.type==='cannon'&&!n.lost),ca=Math.cos(e.angle),sa=Math.sin(e.angle),x=e.x+gun.currentDx*ca-gun.currentDy*sa,y=e.y+gun.currentDx*sa+gun.currentDy*ca;
      const scale=1+Math.min(.5,Math.max(0,e.tier-3)*.1),bomber=e.wingRole==='bomber';
      for(const off of bomber?[0]:[-.28,0,.28]){
        const a=e.wingAim+off,speed=bomber?4:8,shot=new Projectile(x,y,Math.cos(a)*speed,Math.sin(a)*speed,{type:bomber?'torpedo':'flak',target:bomber?player:null,isPlayer:false,damage:(bomber?14:5)*scale,radius:bomber?7:5,color:bomber?'#ffbe79':'#d7a9ff',life:bomber?190:110});
        if(bomber)shot.cap=8.5;shot.wingShot=true;shots.push(shot);
      }
      e.wingCooldown=e.wingRole==='bomber'?120:110;
    }else if(e.wingCooldown===0&&distance<p.fireRange){e.wingWindup=e.wingRole==='bomber'?50:40;e.wingAim=Math.atan2(player.y-e.y,player.x-e.x);}
  }
  function contact(e){
    if(!e.wingRole)return null;
    const warning=e.wingWindup>0,detail=warning?(e.wingRole==='bomber'?'TORPEDO · SIDESTEP':'FAN · KEEP DISTANCE'):e.wingRole==='tender'?(e.armed('mender')?'REPAIR · BREAK MENDER':'MENDER DISABLED'):WINGS[e.wingType].name.toUpperCase();
    return{role:ROLES[e.wingRole].name,detail,warning};
  }
  function draw(e,ctx,camera){
    if(!e.wingRole||e.hp<=0)return;
    const z=camera.zoom||1,x=e.x-camera.x,y=e.y-camera.y;
    if(x< -500||y< -500||x>ctx.canvas.width/z+500||y>ctx.canvas.height/z+500)return;
    ctx.save();ctx.translate(x,y);ctx.lineWidth=1.5/z;
    if(e.wingWindup>0){
      ctx.strokeStyle=e.wingRole==='bomber'?'#ffbe79':'#d7a9ff';ctx.globalAlpha=.5;ctx.setLineDash([10/z,7/z]);
      const offsets=e.wingRole==='bomber'?[0]:[-.28,0,.28];for(const off of offsets){const a=e.wingAim+off;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*600,Math.sin(a)*600);ctx.stroke();}
      ctx.setLineDash([]);ctx.globalAlpha=1;ctx.beginPath();ctx.arc(0,0,42,0,Math.PI*2*(e.wingWindup/(e.wingRole==='bomber'?50:40)));ctx.stroke();
    }
    if(e.wingRole==='tender'&&e.armed('mender')){
      const n=e.nodes.find(n=>n.type==='mender'&&!n.lost),ca=Math.cos(e.angle),sa=Math.sin(e.angle),mx=n.currentDx*ca-n.currentDy*sa,my=n.currentDx*sa+n.currentDy*ca;
      ctx.strokeStyle='#8ce9bd';ctx.beginPath();ctx.arc(mx,my,17,0,Math.PI*2);ctx.moveTo(mx-9,my);ctx.lineTo(mx+9,my);ctx.moveTo(mx,my-9);ctx.lineTo(mx,my+9);ctx.stroke();
      const heal=e.wingHeal;if(heal&&heal.until>e.wingClock&&heal.target.hp>0){ctx.globalAlpha=.7;ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(heal.target.x-e.x,heal.target.y-e.y);ctx.stroke();}
    }
    ctx.restore();
  }
  function install(){
    if(!window.hostileSkins?.ready||!window.quartermaster?.ready){setTimeout(install,40);return;}
    ready=true;
    const baseProfile=enemyCombat.profile;enemyCombat.profile=e=>profile(e,baseProfile(e));
    const nativeCompose=factionFleets.compose;factionFleets.compose=function(enemies,ch){const count=nativeCompose.apply(this,arguments);if(count>=3)compose(enemies,ch);return count;};
    const load=engine.loadChamberEntities;engine.loadChamberEntities=function(...args){const result=load.apply(this,args);for(const e of this.enemies)prepare(e);return result;};
    const spawn=contactDirector.spawn;contactDirector.spawn=function(...args){const p=plan();if(p&&engine.enemies.length+3>12)return false;const before=engine.enemies.length,result=spawn.apply(this,args);if(result&&p){const added=engine.enemies.slice(before);factionFleets.compose(added,worldMap.getCurrentChamber());for(const e of added){frontierPve.decorate(e);prepare(e);hostileSkins.skin(e);}garage.banner(p.name+' · '+p.counter,'hunt');}return result;};
    const update=EnemyOrganism.prototype.update;EnemyOrganism.prototype.update=function(player,shots,enemies,...args){
      prepare(this);const active=!!this.wingRole&&!excluded();if(active&&specialist(this))this.shootTimer=Math.max(2,this.shootTimer);
      const before=shots.length,result=update.call(this,player,shots,enemies,...args);
      if(active&&this.hp>0){this.wingClock++;if(this.wingRole==='tender')for(let i=before;i<shots.length;i++)if(!shots[i].isPlayer)shots[i].damage*=.5;pulse(this,enemies);attack(this,player,shots);}return result;
    };
    const nativeDraw=EnemyOrganism.prototype.draw;EnemyOrganism.prototype.draw=function(ctx,camera,...args){const result=nativeDraw.call(this,ctx,camera,...args);draw(this,ctx,camera);return result;};
  }
  window.enemyWings={WINGS,ROLES,plan,compose,prepare,contact,get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,300));
})();
