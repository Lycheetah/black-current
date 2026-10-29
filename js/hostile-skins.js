/* Authored whole-ship silhouettes over the existing destroyable module nodes. */
(() => {
 'use strict';let ready=false,kit,atlas;const models=new WeakMap();
 function skin(e){
  if(!ready||!e.faction||e.training||e.isBoss||e.jellyShoalKey||e.swarmBrood||models.has(e.nodes))return;
  const id=e.wingSkin||(e.tier>=6&&e.archetype==='stalker'?'hunter':e.archetype),s=kit.ships[id];if(!s)return;
  if(e.archetype==='mote'&&!e.nodes.some(n=>n.type==='cannon')){const deck=e.nodes.find(n=>n.type==='hull');if(deck){deck.type='cannon';deck.radius=8;deck.weapon='spitter';}}
  // Physical hardpoints and silhouette grow together. Tier tint alone made a
  // capital look scarcely larger than the same scout in a rookie sector.
  // One scale (Stage 1): an enemy of a class is as long as the player's frame of that class, varied by role.
  const S=window.tuning.SIZE,cls=S.playerLength[e.fleetClass]?e.fleetClass:'frigate';
  const W=S.playerLength[cls]*(S.hullScale[cls]||1)*(S.role[id]||1)*(.96+Math.min(2,Math.max(0,e.tier-1))*.02),H=W*s.frame[3]/s.frame[2],ax=s.anchor[0],ay=s.anchor[1],extent=Math.max(48,...e.nodes.map(n=>Math.abs(n.currentDx||0)),...e.nodes.map(n=>Math.abs(n.currentDy||0))),used=new Set();
  for(const n of e.nodes){if(n.type==='core')continue;const desired=[ax+(n.currentDx||0)/extent*.42,ay+(n.currentDy||0)/extent*.42];let best=null,d=Infinity;
   for(let i=0;i<s.points.length;i++){const p=s.points[i],score=(p[0]-desired[0])**2+(p[1]-desired[1])**2+(used.has(i)?.5:0);if(score<d){d=score;best={p,i};}}
   if(best){used.add(best.i);n.dx=n.currentDx=n.targetDx=(best.p[0]-ax)*W;n.dy=n.currentDy=n.targetDy=(best.p[1]-ay)*H;}
  }
  models.set(e.nodes,{e,id,s,W,H,canvas:document.createElement('canvas'),signature:null});
 }
 // The skin is cached at the pixels it is drawn at (night list item 1): a 768 px canvas rotated down to ~200 px,
 // twenty times a frame, was the top enemy cost in software. Zoom steps of more than ~20% repaint it.
 function paint(m,px=1){const fit=Math.min(1,768/Math.max(m.W,m.H),Math.max(.05,px*1.25)),step=Math.pow(1.2,Math.round(Math.log(fit)/Math.log(1.2)));const signature=m.e.nodes.map(n=>n.lost?'1':'0').join('')+'@'+step.toFixed(3);if(signature===m.signature)return;m.signature=signature;const c=m.canvas,scale=Math.min(1,768/Math.max(m.W,m.H),step);c.width=Math.ceil(m.W*scale);c.height=Math.ceil(m.H*scale);const ctx=c.getContext('2d'),[x,y,w,h]=m.s.frame;ctx.setTransform(scale,0,0,scale,0,0);ctx.drawImage(atlas,x,y,w,h,0,0,m.W,m.H);
  // Lost physical modules expose missing hull, rather than leaving an invincible skin.
  ctx.globalCompositeOperation='destination-out';for(const n of m.e.nodes)if(n.lost){ctx.beginPath();ctx.arc(n.currentDx+m.s.anchor[0]*m.W,n.currentDy+m.s.anchor[1]*m.H,Math.max(8,n.radius*1.1),0,Math.PI*2);ctx.fill();}
 }
 // Pre-rotated skins (night list item 1). A rotated blit is ~12x the cost of an axis-aligned one in a
 // software canvas (Firefox on Linux), and every hostile hull rotates every frame. Each skin is rotated once
 // into one of ROT.buckets angles (7.5 degrees apart) and blitted axis-aligned; a shared LRU caps the memory.
 const ROT={buckets:48,maxBytes:64e6,bytes:0,lru:new Map(),uid:0,hits:0,paints:0};
 function rotated(m,angle){
  if(!m.canvas.width)return null;const TAU=Math.PI*2,b=((Math.round(angle/(TAU/ROT.buckets))%ROT.buckets)+ROT.buckets)%ROT.buckets;
  m.uid??=++ROT.uid;const key=m.uid+'|'+m.signature+'|'+b;let r=ROT.lru.get(key);
  if(r){ROT.lru.delete(key);ROT.lru.set(key,r);ROT.hits++;return r;}
  const k=m.canvas.width/m.W,[ax,ay]=m.s.anchor,R=Math.hypot(Math.max(ax,1-ax)*m.W,Math.max(ay,1-ay)*m.H),D=Math.max(2,Math.ceil(2*R*k));
  const c=document.createElement('canvas');c.width=c.height=D;const g=c.getContext('2d');g.translate(D/2,D/2);g.rotate(b*TAU/ROT.buckets);g.drawImage(m.canvas,-ax*m.W*k,-ay*m.H*k,m.W*k,m.H*k);
  r={canvas:c,R,bytes:D*D*4};ROT.lru.set(key,r);ROT.bytes+=r.bytes;ROT.paints++;
  for(const [k2,v] of ROT.lru){if(ROT.bytes<=ROT.maxBytes)break;ROT.lru.delete(k2);ROT.bytes-=v.bytes;v.canvas.width=v.canvas.height=0;}
  return r;
 }
 async function install(){
  if(!window.enemyCombat?.ready||!window.factionFleets?.ready){setTimeout(install,40);return;}
  try{kit=window.__HOSTILE_KIT||await fetch('art/hostile-kit.json').then(r=>{if(!r.ok)throw Error('hostile kit');return r.json();});atlas=new Image();atlas.src=window.__ART?.[kit.assets[0].path]||kit.assets[0].path;await atlas.decode();}
  catch(error){console.warn('Hostile skins unavailable:',error.message);return;}
  ready=true;
  const update=EnemyOrganism.prototype.update;EnemyOrganism.prototype.update=function(...a){const result=update.apply(this,a);skin(this);return result;};
  const load=engine.loadChamberEntities;engine.loadChamberEntities=function(...a){const result=load.apply(this,a);for(const e of this.enemies)skin(e);return result;};
  const membrane=fluidShader.drawOrganismMembrane;fluidShader.drawOrganismMembrane=function(ctx,x,y,angle,r,nodes,color,...a){const m=models.get(nodes);if(!m)return membrane.call(this,ctx,x,y,angle,r,nodes,color,...a);const T=ctx.getTransform();paint(m,Math.hypot(T.a,T.b));const pre=Math.abs(T.b)<1e-6&&Math.abs(T.c)<1e-6&&rotated(m,angle);if(pre){ctx.drawImage(pre.canvas,x-pre.R,y-pre.R,2*pre.R,2*pre.R);return;}ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(m.canvas,-m.s.anchor[0]*m.W,-m.s.anchor[1]*m.H,m.W,m.H);ctx.restore();};
  for(const e of engine.enemies)skin(e);
 }
 window.hostileSkins={skin,ROT,get ready(){return ready;},model:e=>models.get(e.nodes)};window.addEventListener('load',()=>setTimeout(install,280));
})();
