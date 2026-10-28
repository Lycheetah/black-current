/* Contact labels describe the existing five behaviours. No targeting, damage,
 * spawning or rewards are changed by this presentation layer. */
(() => {
  'use strict';
  const ROLE={mote:['Scout','CONTACT'],stalker:['Pursuer','GUNSHIP'],charger:['Charger','RAM'],sniper:['Artillery','LONG RANGE'],hive:['Drone tender','DRONES']};
  let ready=false,contacts=[],obstacles=[],obstaclesAt=-Infinity;
  function hudBounds(){
    const now=performance.now();if(now-obstaclesAt<200)return obstacles;
    obstaclesAt=now;obstacles=[];
    for(const el of document.querySelectorAll('#contracts,#story-contract,#system-strip,.event-banner.show,#travel-cue:not([hidden])')){
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);if(r.width&&r.height&&s.visibility!=='hidden'&&Number(s.opacity)!==0)obstacles.push({left:r.left-5,right:r.right+5,top:r.top-5,bottom:r.bottom+5});
    }
    return obstacles;
  }
  function bounds(e,camera){
    const z=camera.zoom||1,ca=Math.cos(e.angle||0),sa=Math.sin(e.angle||0),x=(e.x-camera.x)*z,y=(e.y-camera.y)*z;
    let left=x,right=x,top=y,bottom=y;
    for(const n of e.nodes||[]){if(n.lost)continue;const dx=n.currentDx??n.dx??0,dy=n.currentDy??n.dy??0,r=(n.type==='cannon'?60:30)*z,nx=x+(dx*ca-dy*sa)*z,ny=y+(dx*sa+dy*ca)*z;left=Math.min(left,nx-r);right=Math.max(right,nx+r);top=Math.min(top,ny-r);bottom=Math.max(bottom,ny+r);}
    return{left,right,top,bottom,x,y};
  }
  function label(e){
    const role=ROLE[e.archetype];if(!role||e.training||e.isBoss)return null;
    const combat=window.enemyCombat?.profile(e);
    const warning=e.aimT>0?(e.aimT<=12?'LOCKED · EVADE':'AIMING · KEEP MOVING'):e.chargeT>0?'RAM · SIDESTEP':combat?.role==='Missile boat'?'MISSILES':combat?.role==='Scout'?'SKIRMISHER':e.swarmBrood?'SWARM':role[1];
    return{title:e.jellyShoalKey?(e.name||'Jelly guard'):(e.fleetClass||'frigate').toUpperCase()+' · '+(combat?.role||role[0]),detail:warning+' · '+Math.ceil(Math.max(0,e.hp))+' HP',warning:!!(e.aimT||e.chargeT)};
  }
  function draw(){
    contacts=[];if(!saveState.doc.launched||engine.mapOpen||engine.player.dead||document.body.classList.contains('capture-view'))return;
    const W=engine.viewportWidth,H=engine.viewportHeight,phone=W<700,ctx=engine.ctx,used=[],p=engine.player,blocked=hudBounds();
    const candidates=engine.enemies.map(e=>({e,b:bounds(e,engine.camera),text:label(e)})).filter(c=>c.text&&c.b.right>=0&&c.b.left<=W&&c.b.bottom>=0&&c.b.top<=H);
    candidates.sort((a,b)=>Number(b.text.warning)-Number(a.text.warning)||Math.hypot(a.e.x-p.x,a.e.y-p.y)-Math.hypot(b.e.x-p.x,b.e.y-p.y));
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    for(const c of candidates){
      if(contacts.length>=(phone?3:4))break;
      const w=phone?150:168,h=31,x=Math.max(w/2+8,Math.min(W-w/2-8,c.b.x)),y=c.b.top-22;
      if(y<(phone?205:140)||y>H-(phone?200:105)||used.some(r=>Math.abs(r.x-x)<w+6&&Math.abs(r.y-y)<h+5))continue;
      if(blocked.some(r=>x+w/2>r.left&&x-w/2<r.right&&y+h/2>r.top&&y-h/2<r.bottom))continue;
      const color=c.text.warning?'#ffb990':c.e.tier>=5?'#e8c783':'#a6cbd4';
      ctx.fillStyle='rgba(4,15,24,.88)';ctx.fillRect(x-w/2,y-h/2,w,h);ctx.fillStyle=color;ctx.fillRect(x-w/2,y-h/2,2,h);
      ctx.font='600 10px system-ui';ctx.fillText(c.text.title,x,y-6,w-10);ctx.font='9px system-ui';ctx.fillStyle=c.text.warning?'#ffb990':'#91a5b3';ctx.fillText(c.text.detail,x,y+7,w-10);
      used.push({x,y});contacts.push({title:c.text.title,detail:c.text.detail,x,y,w,h});
    }
    ctx.restore();
  }
  function install(){
    if(!window.frontierPve?.ready){setTimeout(install,40);return;}
    const render=engine.render;engine.render=function(...a){const r=render.apply(this,a);draw();return r;};ready=true;
  }
  window.encounterHUD={bounds,label,get contacts(){return contacts;},get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,100));
})();
