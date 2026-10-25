/* Raster work has its own budget. Simulation, aiming and collision keep their
 * original cadence. Caches are bounded to one backdrop and the existing skin LRU. */
(() => {
  'use strict';
  let enabled=true,ready=false,quality='high',lastQuality='',backgroundKey='',backgroundAt=-Infinity,lightKey='',lightAt=-Infinity;
  const canvas=document.createElement('canvas'),g=canvas.getContext('2d');
  const stats={backgroundPaints:0,backgroundBlits:0,compactHulls:0,lightingPaints:0,lightingReuses:0};
  function install(){
    if(!sprites.ready||!fluidShader._spritesInstalled||!window.modularShips?.ready){setTimeout(install,40);return;}
    const render=engine.render;engine.render=function(...args){quality=saveState.doc.settings?.gfxQuality||'high';if(quality!==lastQuality){document.documentElement.classList.toggle('render-fast',enabled&&quality!=='ultra');lastQuality=quality;backgroundKey='';lightKey='';}return render.apply(this,args);};
    const ocean=fluidShader.drawParallaxOcean;fluidShader.drawParallaxOcean=function(ctx,camera){
      if(!enabled||ctx!==engine.ctx||!camera.zoom||typeof packRenderer!=='undefined'&&packRenderer.active)return ocean.apply(this,arguments);
      const W=ctx.canvas.width,H=ctx.canvas.height,z=camera.zoom,now=performance.now(),hz=quality==='ultra'?30:quality==='high'?24:quality==='low'?10:15;
      const key=[W,H,z.toFixed(3),quality,worldMap.getCurrentChamber()?.key,window.atmosphere?.here,look.cfg.backdrop,look.cfg.nebula,look.cfg.dust,look.cfg.atmosphere].join('|');
      if(key!==backgroundKey||now-backgroundAt>=1000/hz){if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);g.save();g.scale(z,z);ocean.call(this,g,camera);g.restore();backgroundKey=key;backgroundAt=now;stats.backgroundPaints++;}
      ctx.drawImage(canvas,0,0,W/z,H/z);stats.backgroundBlits++;
    };
    const membrane=fluidShader.drawOrganismMembrane;fluidShader.drawOrganismMembrane=function(ctx,x,y,a,r,nodes,color,state){
      const modular=nodes===engine.player.nodes&&(saveState.doc.design?.modular||saveState.doc.design?.identity);
      if(!enabled||ctx!==engine.ctx||quality==='ultra'||!sprites.enabled||!nodes?.length||modular||typeof packRenderer!=='undefined'&&packRenderer.active)return membrane.apply(this,arguments);
      const transform=ctx.getTransform(),skin=hullSkin(nodes,r,color,Math.hypot(transform.a,transform.b));ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.drawImage(skin.canvas,skin.x,skin.y,skin.w,skin.h);ctx.restore();
      const under=sprites.underlay,chassis=sprites.chassis,glow=look.cfg.shipGlow;
      try{sprites.underlay=false;sprites.chassis=false;look.cfg.shipGlow=false;stats.compactHulls++;return membrane.call(this,ctx,x,y,a,r,nodes.slice(),color,state);}finally{sprites.underlay=under;sprites.chassis=chassis;look.cfg.shipGlow=glow;}
    };
    const light=fluidShader.drawLightingShader;fluidShader.drawLightingShader=function(ctx,x,y,r,scale){if(!enabled)return light.apply(this,arguments);const now=performance.now(),key=[ctx.canvas.width,ctx.canvas.height,Math.round(x/4),Math.round(y/4),Math.round(r/2),scale].join('|');if(key===lightKey&&now-lightAt<250){stats.lightingReuses++;return;}lightKey=key;lightAt=now;stats.lightingPaints++;return light.apply(this,arguments);};
    ready=true;
  }
  window.renderBudget={stats,get enabled(){return enabled;},set enabled(value){enabled=!!value;lastQuality='';backgroundKey='';lightKey='';},get ready(){return ready;},invalidate(){backgroundKey='';lightKey='';}};
  window.addEventListener('load',()=>setTimeout(install,0));
})();
