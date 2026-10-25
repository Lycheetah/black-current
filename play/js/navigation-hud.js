/* Give the local radar landmarks, a clear heading and a direct chart door. */
(() => {
  'use strict';let ready=false;
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
      if(t&&!t.arrived){const same=t.gx===ch.gridX&&t.gy===ch.gridY,dx=same?t.x-p.x:t.gx-ch.gridX,dy=same?t.y-p.y:t.gy-ch.gridY,angle=Math.atan2(dy,dx);direction=['E','SE','S','SW','W','NW','N','NE'][(Math.round(angle/(Math.PI/4))+8)%8];ctx.strokeStyle='#ffe39c';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(c+Math.cos(angle)*(r-5),c+Math.sin(angle)*(r-5));ctx.stroke();ctx.setLineDash([]);}
      ctx.translate(px,py);ctx.rotate(p.angle);ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-5,-4);ctx.lineTo(-2,0);ctx.lineTo(-5,4);ctx.closePath();ctx.fillStyle='#fff2b3';ctx.fill();ctx.strokeStyle='#08202c';ctx.stroke();ctx.restore();
      const label=galaxy.current.name+' · '+ch.gridX+','+ch.gridY+'\n'+(direction?'Route '+direction+' · ':'')+'Tap for chart';if(caption.textContent!==label)caption.textContent=label;return result;
    };
    ready=true;engine.drawMiniRadar();
  }
  window.navigationHud={get ready(){return ready;}};window.addEventListener('load',()=>setTimeout(install,100));
})();
