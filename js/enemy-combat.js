/* Ranged roles hold ground; damage, HP and the existing actor cap are unchanged. */
(() => {
 'use strict';let ready=false;
 const home=()=>galaxy.currentId===(saveState.doc.civHome||'home');
 function profile(e){
  if(!ready||e.training||e.jellyShoalKey||e.swarmBrood||e.isBoss)return null;
  const rookie=home()&&Math.max(Math.abs(worldMap.currentGridX),Math.abs(worldMap.currentGridY))<=3;
  const rows={mote:e.faction&&e.armed('cannon')?{role:'Scout',standOff:rookie?350:450,fireRange:rookie?700:950}:null,stalker:e.factionFamily==='missile'?{role:'Missile boat',standOff:rookie?600:820,fireRange:rookie?1000:1350}:e.tier>=6?{role:'Capital hunter',standOff:850,fireRange:1450}:{role:'Gunship',standOff:rookie?480:650,fireRange:rookie?900:1150},sniper:{role:'Artillery',standOff:rookie?700:1000,fireRange:rookie?1150:1600},hive:{role:'Carrier',standOff:rookie?650:950,fireRange:1200},outpost:{role:'Fortress',standOff:0,fireRange:1450}};
  const p=rows[e.archetype];return p?{...p,aggro:p.fireRange+120,shotSpeed:rookie?6:9}:null;
 }
 function install(){
  if(!window.frontierPve?.ready||!window.jellyShoals?.ready){setTimeout(install,40);return;}
  const update=EnemyOrganism.prototype.update;EnemyOrganism.prototype.update=function(player,shots,...args){const before=shots.length,result=update.call(this,player,shots,...args),p=profile(this);if(p)for(let i=before;i<shots.length;i++){const shot=shots[i];if(shot.isPlayer)continue;if(['mote','stalker','sniper'].includes(this.archetype)){const guns=this.nodes.filter(n=>n.type==='cannon'&&!n.lost),gun=guns[(this._combatMuzzle=(this._combatMuzzle||0)+1)%Math.max(1,guns.length)];if(gun){const ca=Math.cos(this.angle),sa=Math.sin(this.angle),aim=Math.atan2(shot.vy,shot.vx);shot.x=this.x+gun.currentDx*ca-gun.currentDy*sa+Math.cos(aim)*gun.radius;shot.y=this.y+gun.currentDx*sa+gun.currentDy*ca+Math.sin(aim)*gun.radius;shot.prevX=shot.x;shot.prevY=shot.y;}}const speed=Math.hypot(shot.vx,shot.vy);if(speed>0&&speed<p.shotSpeed){shot.vx*=p.shotSpeed/speed;shot.vy*=p.shotSpeed/speed;}shot.life=Math.min(280,Math.max(shot.life,Math.ceil(p.fireRange/Math.max(1,Math.hypot(shot.vx,shot.vy)))+25));}return result;};
  const load=engine.loadChamberEntities;engine.loadChamberEntities=function(...a){const ch=worldMap.getCurrentChamber(),ring=Math.max(Math.abs(ch.gridX),Math.abs(ch.gridY));if(!ch.isHaven&&!ch.isBossSector&&!frontierPve.isRange()&&!(home()&&ring<=3)&&!(typeof graveChoir!=='undefined'&&graveChoir.active))ch.radius=Math.max(ch.radius,Math.round(window.tuning.sectorRadius(ch.dangerLevel)*(window.tuning.SIZE.zone||1)));/* the larger zones (tuning.SIZE.zone) scale the danger size too, not only the base room */return load.apply(this,a);};
  ready=true;
 }
 window.enemyCombat={profile,get ready(){return ready;}};window.addEventListener('load',()=>setTimeout(install,220));
})();
