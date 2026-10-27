/* Give the local radar landmarks, a clear heading and a direct chart door. */
(() => {
  'use strict';let ready=false;
  function beacon(){
    const t=travelHelper.target();if(!t||t.arrived)return null;
    const ch=worldMap.getCurrentChamber(),same=t.gx===ch.gridX&&t.gy===ch.gridY;
    if(same)return{x:t.x,y:t.y,label:t.label|| (t.station?'REFIT STATION':t.name.startsWith('Training grounds')?'TRAINING GROUNDS':'JUMP GATE'),gx:t.gx,gy:t.gy,local:true};
    const dx=t.gx-ch.gridX,dy=t.gy-ch.gridY,horizontal=Math.abs(dx)>=Math.abs(dy),sx=horizontal?Math.sign(dx):0,sy=horizontal?0:Math.sign(dy);
    return{x:sx*ch.radius,y:sy*ch.radius,label:'EXIT '+(sx>0?'EAST':sx<0?'WEST':sy>0?'SOUTH':'NORTH'),gx:ch.gridX+sx,gy:ch.gridY+sy,local:false};
  }
  function drawBeacon(){
    if(!saveState.doc.launched||engine.mapOpen||engine.player.dead)return;
    const b=beacon();if(!b)return;const W=engine.viewportWidth,H=engine.viewportHeight,phone=W<700,z=engine.camera.zoom,ctx=engine.ctx;
    const sx=(b.x-engine.camera.x)*z,sy=(b.y-engine.camera.y)*z,px=(engine.player.x-engine.camera.x)*z,py=(engine.player.y-engine.camera.y)*z;
    const left=30,right=W-30,top=phone?230:155,bottom=H-(phone?230:125);
    // Intersect the bearing ray with the safe viewport, preserving its direction.
    const dx=sx-px,dy=sy-py;let k=1;
    if(dx>0)k=Math.min(k,(right-px)/dx);else if(dx<0)k=Math.min(k,(left-px)/dx);
    if(dy>0)k=Math.min(k,(bottom-py)/dy);else if(dy<0)k=Math.min(k,(top-py)/dy);
    k=Math.max(0,Math.min(1,k));const x=Math.max(left,Math.min(right,px+dx*k)),y=Math.max(top,Math.min(bottom,py+dy*k)),a=Math.atan2(dy,dx);
    ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(-6,-7);ctx.lineTo(-2,0);ctx.lineTo(-6,7);ctx.closePath();ctx.fillStyle='#ffe6a2';ctx.fill();ctx.restore();
    const w=176,h=33,lx=Math.max(w/2+8,Math.min(W-w/2-8,x)),ly=y+(y>H/2?-28:29),distance=Math.round(Math.hypot(b.x-engine.player.x,b.y-engine.player.y));
    ctx.save();ctx.fillStyle='rgba(5,19,28,.92)';ctx.fillRect(lx-w/2,ly-h/2,w,h);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 10px system-ui';ctx.fillStyle='#ffe6a2';ctx.fillText(b.label,lx,ly-6);ctx.font='9px system-ui';ctx.fillStyle='#b3c8cd';ctx.fillText(`Sector ${b.gx},${b.gy} · ${distance} m${b.local?'':' to edge'}`,lx,ly+7);ctx.restore();
  }
  function install(){
    if(!window.travelHelper?.ready||!window.galaxy?.data){setTimeout(install,40);return;}
    const host=document.querySelector('.radar-box');if(!host)return;host.tabIndex=0;host.setAttribute('role','button');host.setAttribute('aria-label','Open sector chart and navigation routes');
    const caption=document.createElement('span');caption.id='radar-location';host.append(caption);
    const open=e=>{e.preventDefault();e.stopPropagation();if(!engine.mapOpen)engine.toggleMapModal();document.getElementById('travel-controls').open=true;};host.addEventListener('click',open);host.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')open(e);});
    const legend=document.createElement('p');legend.id='navigation-legend';legend.textContent='▲ You / heading · ◆ Jump gate · ■ Refit station · purple: hostile · gold: salvage. Sector coordinates locate you inside the current system. Plot a route to follow the bearing.';document.getElementById('travel-controls').append(legend);
    const radar=engine.drawMiniRadar;engine.drawMiniRadar=function(...a){const result=radar.apply(this,a),ctx=this.radarCtx;if(!ctx)return result;
      const w=this.radarCanvas.width,c=w/2,r=c-7,ch=worldMap.getCurrentChamber(),scale=(r-3)/ch.radius;
      const mark=(x,y,kind,color)=>{const dx=x*scale,dy=y*scale,d=Math.hypot(dx,dy),k=d>r?r/d:1;ctx.save();ctx.translate(c+dx*k,c+dy*k);ctx.fillStyle=color;ctx.strokeStyle='#061018';ctx.lineWidth=1.5;ctx.beginPath();if(kind==='gate'){ctx.moveTo(0,-5);ctx.lineTo(5,0);ctx.lineTo(0,5);ctx.lineTo(-5,0);ctx.closePath();}else ctx.rect(-4,-4,8,8);ctx.fill();ctx.stroke();ctx.restore();};
      ctx.save();ctx.font='bold 10px system-ui';ctx.fillStyle='#b9d8de';ctx.textAlign='center';ctx.fillText('N',c,12);ctx.fillText('E',w-8,c+3);
      for(const gate of galaxy.portalsOf(galaxy.current))if(gate.gx===ch.gridX&&gate.gy===ch.gridY)mark(gate.x,gate.y,'gate','#5ce5ff');
      if(ch.isHaven)mark(0,0,'station','#7ff0ba');for(const s of hubs.here())if(s.kind==='dock'&&s.gx===ch.gridX&&s.gy===ch.gridY)mark(s.x,s.y,'station','#7ff0ba');
      const p=this.player,px=c+p.x*scale,py=c+p.y*scale,t=travelHelper.target();let direction='';
      if(t&&!t.arrived){const b=beacon(),angle=Math.atan2(b.y-p.y,b.x-p.x);direction=['E','SE','S','SW','W','NW','N','NE'][(Math.round(angle/(Math.PI/4))+8)%8];ctx.strokeStyle='#ffe39c';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(c+Math.cos(angle)*(r-5),c+Math.sin(angle)*(r-5));ctx.stroke();ctx.setLineDash([]);}
      ctx.translate(px,py);ctx.rotate(p.angle);ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-5,-4);ctx.lineTo(-2,0);ctx.lineTo(-5,4);ctx.closePath();ctx.fillStyle='#fff2b3';ctx.fill();ctx.strokeStyle='#08202c';ctx.stroke();ctx.restore();
      const label=galaxy.current.name+' · '+ch.gridX+','+ch.gridY+'\n'+(direction?'Route '+direction+' · ':'')+'Tap for chart';if(caption.textContent!==label)caption.textContent=label;return result;
    };
    const render=engine.render;engine.render=function(...a){const result=render.apply(this,a);drawBeacon();return result;};
    ready=true;engine.drawMiniRadar();
  }
  window.navigationHud={beacon,get ready(){return ready;}};window.addEventListener('load',()=>setTimeout(install,100));
})();
