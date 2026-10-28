/* Optional aiming assistance. It never enables fire or changes weapon damage. */
(() => {
 'use strict';let ready=false,target=null,button,pauseButton;
 const enabled=()=>!!saveState.doc.settings?.targetLock;
 function range(){const nodes=engine.player.nodes.filter(n=>n.type==='cannon'&&!n.lost),reach=nodes.map(n=>{const id=fleet.weaponFor(n),w=WEAPON_TYPES[id],life=({flak:11,torpedo:60,cluster:24,boomerang:100})[id]||w?.life||110;return Math.min(weaponSpeed(id)*life,[1300,1600,2000,2400,2800,3000][arsenal.GUNS[id]?.c||0]);});return reach.length?Math.min(3000,Math.max(150,...reach)):0;}
 function valid(e){return e&&e.hp>0&&engine.enemies.includes(e)&&Math.hypot(e.x-engine.player.x,e.y-engine.player.y)<=range();}
 function acquire(){const r=range();let best=null,d=r;for(const e of engine.enemies){const dist=Math.hypot(e.x-engine.player.x,e.y-engine.player.y);if(e.hp>0&&dist<=d){best=e;d=dist;}}return best;}
 function paint(){if(!button)return;button.textContent=enabled()?'Lock ON':'Lock OFF';button.setAttribute('aria-pressed',String(enabled()));if(pauseButton)pauseButton.textContent='Target lock · '+(enabled()?'ON':'OFF')+' · L';}
 function toggle(){const d=saveState.doc.settings||(saveState.doc.settings={}),prior=d.targetLock;d.targetLock=!enabled();if(!saveState.save()){if(prior===undefined)delete d.targetLock;else d.targetLock=prior;return false;}target=enabled()?acquire():null;paint();garage.banner(enabled()?'TARGET LOCK · Hold fire to shoot. Push the aim stick fully, or hold Shift, for manual aim.':'Manual aim restored.','good');return true;}
 function install(){
  if(!window.frontierPve?.ready||!window.weaponBalance?.ready){setTimeout(install,40);return;}
  button=document.createElement('button');button.id='btn-target-lock';button.type='button';button.title='Target lock · L · full aim-stick push or Shift overrides';button.onclick=e=>{e.stopPropagation();toggle();};document.getElementById('phone-zoom').append(button);button.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});
  pauseButton=document.createElement('button');pauseButton.id='btn-pause-lock';pauseButton.type='button';pauseButton.className='tm-door';pauseButton.onclick=toggle;document.getElementById('btn-pause-shipyard')?.after(pauseButton);
  const input=engine.readInput;engine.readInput=function(...a){const result=input.apply(this,a);if(!enabled()||this.player.dead)return result;const manual=this.keys.ShiftLeft||this.keys.ShiftRight||(this.touchAiming&&Math.hypot(result.aimX-this.player.x,result.aimY-this.player.y)>810);if(manual)return result;if(!valid(target))target=acquire();if(target){result.aimX=target.x;result.aimY=target.y;}return result;};
  const render=engine.render;engine.render=function(...a){const result=render.apply(this,a);if(!enabled()||!valid(target)||this.paused||this.mapOpen||document.body.classList.contains('capture-view'))return result;const c=this.ctx,z=this.camera.zoom,x=(target.x-this.camera.x)*z,y=(target.y-this.camera.y)*z,r=Math.max(19,target.coreRadius*z+10);c.save();c.strokeStyle='#ffe39a';c.lineWidth=1.5;for(let i=0;i<4;i++){const angle=i*Math.PI/2+.12;c.beginPath();c.arc(x,y,r,angle,angle+.65);c.stroke();}c.restore();return result;};
  document.addEventListener('keydown',e=>{if(e.code==='KeyL'&&!e.repeat&&!e.target.matches('input,textarea,select')){e.preventDefault();toggle();}});
  paint();ready=true;
 }
 window.targetLock={toggle,range,get enabled(){return enabled();},get target(){return target;},get ready(){return ready;}};window.addEventListener('load',()=>setTimeout(install,240));
})();
