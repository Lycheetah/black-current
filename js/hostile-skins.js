/* Authored whole-ship silhouettes over the existing destroyable module nodes. */
(() => {
 'use strict';let ready=false,kit,atlas;const models=new WeakMap();
 function skin(e){
  if(!ready||!e.faction||e.training||e.isBoss||e.jellyShoalKey||e.swarmBrood||models.has(e.nodes))return;
  const id=e.tier>=6&&e.archetype==='stalker'?'hunter':e.archetype,s=kit.ships[id];if(!s)return;
  if(e.archetype==='mote'&&!e.nodes.some(n=>n.type==='cannon')){const deck=e.nodes.find(n=>n.type==='hull');if(deck){deck.type='cannon';deck.radius=8;deck.weapon='spitter';}}
  const W=s.width*(.8+Math.min(7,e.tier)*.1),H=W*s.frame[3]/s.frame[2],ax=s.anchor[0],ay=s.anchor[1],extent=Math.max(48,...e.nodes.map(n=>Math.abs(n.currentDx||0)),...e.nodes.map(n=>Math.abs(n.currentDy||0))),used=new Set();
  for(const n of e.nodes){if(n.type==='core')continue;const desired=[ax+(n.currentDx||0)/extent*.42,ay+(n.currentDy||0)/extent*.42];let best=null,d=Infinity;
   for(let i=0;i<s.points.length;i++){const p=s.points[i],score=(p[0]-desired[0])**2+(p[1]-desired[1])**2+(used.has(i)?.5:0);if(score<d){d=score;best={p,i};}}
   if(best){used.add(best.i);n.dx=n.currentDx=n.targetDx=(best.p[0]-ax)*W;n.dy=n.currentDy=n.targetDy=(best.p[1]-ay)*H;}
  }
  models.set(e.nodes,{e,id,s,W,H,canvas:document.createElement('canvas'),signature:null});
 }
 function paint(m){const signature=m.e.nodes.map(n=>n.lost?'1':'0').join('');if(signature===m.signature)return;m.signature=signature;const c=m.canvas;c.width=Math.ceil(m.W);c.height=Math.ceil(m.H);const ctx=c.getContext('2d'),[x,y,w,h]=m.s.frame;ctx.drawImage(atlas,x,y,w,h,0,0,c.width,c.height);
  // Lost physical modules expose missing hull, rather than leaving an invincible skin.
  ctx.globalCompositeOperation='destination-out';for(const n of m.e.nodes)if(n.lost){ctx.beginPath();ctx.arc(n.currentDx+m.s.anchor[0]*m.W,n.currentDy+m.s.anchor[1]*m.H,Math.max(8,n.radius*1.1),0,Math.PI*2);ctx.fill();}
 }
 async function install(){
  if(!window.enemyCombat?.ready||!window.factionFleets?.ready){setTimeout(install,40);return;}
  try{kit=window.__HOSTILE_KIT||await fetch('art/hostile-kit.json').then(r=>{if(!r.ok)throw Error('hostile kit');return r.json();});atlas=new Image();atlas.src=window.__ART?.[kit.assets[0].path]||kit.assets[0].path;await atlas.decode();}
  catch(error){console.warn('Hostile skins unavailable:',error.message);return;}
  ready=true;
  const update=EnemyOrganism.prototype.update;EnemyOrganism.prototype.update=function(...a){const result=update.apply(this,a);skin(this);return result;};
  const load=engine.loadChamberEntities;engine.loadChamberEntities=function(...a){const result=load.apply(this,a);for(const e of this.enemies)skin(e);return result;};
  const membrane=fluidShader.drawOrganismMembrane;fluidShader.drawOrganismMembrane=function(ctx,x,y,angle,r,nodes,color,...a){const m=models.get(nodes);if(!m)return membrane.call(this,ctx,x,y,angle,r,nodes,color,...a);paint(m);ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(m.canvas,-m.s.anchor[0]*m.W,-m.s.anchor[1]*m.H,m.W,m.H);ctx.restore();};
  for(const e of engine.enemies)skin(e);
 }
 window.hostileSkins={skin,get ready(){return ready;},model:e=>models.get(e.nodes)};window.addEventListener('load',()=>setTimeout(install,280));
})();
