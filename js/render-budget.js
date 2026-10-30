/* Raster work has its own budget. Simulation, aiming and collision keep their
 * original cadence. Caches are bounded to one backdrop and the existing skin LRU. */
(() => {
  'use strict';
  let enabled=true,ready=false,quality='high',lastQuality='',backgroundKey='',backgroundAt=-Infinity,lightKey='',lightAt=-Infinity;
  const canvas=document.createElement('canvas'),g=canvas.getContext('2d');
  const BACKDROP_HZ={ultra:30,high:12,medium:8,low:6};
  const stats={backgroundPaints:0,backgroundBlits:0,compactHulls:0,lightingPaints:0,lightingReuses:0};
  function install(){
    if(!sprites.ready||!fluidShader._spritesInstalled||!window.modularShips?.ready){setTimeout(install,40);return;}
    const render=engine.render;engine.render=function(...args){quality=saveState.doc.settings?.gfxQuality||'high';if(quality!==lastQuality){document.documentElement.classList.toggle('render-fast',enabled&&quality!=='ultra');lastQuality=quality;backgroundKey='';lightKey='';}return render.apply(this,args);};
    /* The backdrop cache (night list item 1, measured in a software canvas like Firefox on Linux):
       - It sits at the TOP of the backdrop chain. Modules that wrap drawParallaxOcean later (boss arenas,
         atmosphere) are re-wrapped on the next frame, so their art is cached too instead of drawn live; a stale
         wrapper lower in the chain passes straight through while the cache paints.
       - It is full resolution and blitted 1:1 at identity: an upscaled blit cost ~7x a 1:1 one.
       - Far layers (nebula, wash, shafts, arena art) repaint at BACKDROP_HZ; near layers (dust, flecks,
         motes, embers) move fast in parallax and are drawn live on top every frame. */
    let painting=false,top=null;
    function wrapOcean(inner){return function(ctx,camera){
      if(!painting&&ctx===engine.ctx&&window.glBackdrop?.draw(camera)){window.atmosphere?.paintNear?.(ctx,camera);return;}
      if(painting||!enabled||ctx!==engine.ctx||!camera.zoom||typeof packRenderer!=='undefined'&&packRenderer.active)return inner.apply(this,arguments);
      const W=ctx.canvas.width,H=ctx.canvas.height,z=camera.zoom,now=performance.now(),hz=BACKDROP_HZ[quality]||8;
      const key=[W,H,z.toFixed(3),quality,worldMap.getCurrentChamber()?.key,window.atmosphere?.here,look.cfg.backdrop,look.cfg.nebula,look.cfg.dust,look.cfg.atmosphere].join('|');
      if(key!==backgroundKey||now-backgroundAt>=1000/hz){
        if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
        g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);g.save();g.scale(z,z);painting=true;const far=window.look;if(far)far._farOnly=true;
        try{inner.call(this,g,camera);}finally{painting=false;if(far)far._farOnly=false;g.restore();}
        backgroundKey=key;backgroundAt=now;stats.backgroundPaints++;
      }
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(canvas,0,0);ctx.restore();stats.backgroundBlits++;
      window.look?.drawNear?.(ctx,camera);window.atmosphere?.paintNear?.(ctx,camera);
    };}
    const retop=()=>{if(fluidShader.drawParallaxOcean!==top){top=wrapOcean(fluidShader.drawParallaxOcean);fluidShader.drawParallaxOcean=top;stats.oceanWraps=(stats.oceanWraps||0)+1;}};retop();
    const frame=engine.render;engine.render=function(...args){retop();return frame.apply(this,args);};
    // Enemy hulls (night list item 1): a modular warship is six stacked sprite layers plus its fittings, about
    // 1 ms each in software, so twenty of them cost a frame. Each hull is painted once into its own sprite at
    // angle 0 and blitted rotated; it repaints at most HULL_HZ times a second (turrets keep tracking), at once
    // when it loses a part, and whenever the zoom changes. Ultra keeps the live path.
    const hulls=new WeakMap(),HULL_HZ=8;
    const live=fluidShader.drawOrganismMembrane;fluidShader.drawOrganismMembrane=function(ctx,x,y,a,r,nodes,color,state){
      if(!enabled||quality==='ultra'||!this._lod||ctx!==engine.ctx||!nodes?.length||typeof packRenderer!=='undefined'&&packRenderer.active)return live.apply(this,arguments);
      const t=ctx.getTransform(),k=Math.hypot(t.a,t.b)||1,now=performance.now();let lost=0;for(const n of nodes)if(n.lost)lost++;
      // One sprite per zoom bucket: the phone lens draws the same hulls at its own zoom every frame.
      const bucket=Math.round(Math.log(k)/Math.log(1.04));let set=hulls.get(nodes);if(!set){set=new Map();hulls.set(nodes,set);}let c=set.get(bucket);
      if(!c||c.lost!==lost||c.count!==nodes.length||c.color!==color||now-c.at>=1000/HULL_HZ){
        let E=r*1.6;for(const n of nodes){const d=Math.hypot(n.currentDx??n.dx??0,n.currentDy??n.dy??0)+(n.radius||0)*1.9;if(d>E)E=d;}E=E*1.15+12;
        const px=Math.min(1400,Math.ceil(2*E*k)),q=px/(2*E);
        if(!c){if(set.size>=3)for(const [b2,v] of set){v.canvas.width=v.canvas.height=0;set.delete(b2);break;}const cv=document.createElement('canvas');c={canvas:cv,g:cv.getContext('2d')};set.set(bucket,c);stats.hullSprites=(stats.hullSprites||0)+1;}
        if(c.canvas.width!==px||c.canvas.height!==px){c.canvas.width=px;c.canvas.height=px;}
        c.g.setTransform(1,0,0,1,0,0);c.g.clearRect(0,0,px,px);c.g.setTransform(q,0,0,q,px/2,px/2);
        try{live.call(this,c.g,0,0,0,r,nodes,color,state);}catch(e){set.delete(bucket);return live.apply(this,arguments);}
        Object.assign(c,{k,q,E,lost,count:nodes.length,color,at:now});stats.hullPaints=(stats.hullPaints||0)+1;
      }
      ctx.save();ctx.translate(x,y);ctx.rotate(a);if(!window.glShips?.pushLocal(ctx,nodes,c.canvas,c.at,-c.E,-c.E,2*c.E,2*c.E))ctx.drawImage(c.canvas,-c.E,-c.E,2*c.E,2*c.E);ctx.restore();stats.hullBlits=(stats.hullBlits||0)+1;
    };
    const membrane=fluidShader.drawOrganismMembrane;fluidShader.drawOrganismMembrane=function(ctx,x,y,a,r,nodes,color,state){
      const modular=window.modularShips?.hasModel(nodes)||nodes===engine.player.nodes&&(saveState.doc.design?.modular||saveState.doc.design?.identity);
      if(!enabled||ctx!==engine.ctx||quality==='ultra'||!sprites.enabled||!nodes?.length||modular||typeof packRenderer!=='undefined'&&packRenderer.active)return membrane.apply(this,arguments);
      const transform=ctx.getTransform(),skin=hullSkin(nodes,r,color,Math.hypot(transform.a,transform.b));ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.drawImage(skin.canvas,skin.x,skin.y,skin.w,skin.h);ctx.restore();
      const under=sprites.underlay,chassis=sprites.chassis,glow=look.cfg.shipGlow;
      try{sprites.underlay=false;sprites.chassis=false;look.cfg.shipGlow=false;stats.compactHulls++;return membrane.call(this,ctx,x,y,a,r,nodes.slice(),color,state);}finally{sprites.underlay=under;sprites.chassis=chassis;look.cfg.shipGlow=glow;}
    };
    const light=fluidShader.drawLightingShader;fluidShader.drawLightingShader=function(ctx,x,y,r,scale){if(!enabled)return light.apply(this,arguments);const now=performance.now(),key=[galaxy.currentId,galaxy.rule(),worldMap.getCurrentChamber()?.isHaven,this.sightScale,this.fogDensity,ctx.canvas.width,ctx.canvas.height,Math.round(x/4),Math.round(y/4),Math.round(r/2),scale].join('|');if(key===lightKey&&now-lightAt<250){stats.lightingReuses++;return;}lightKey=key;lightAt=now;stats.lightingPaints++;return light.apply(this,arguments);};
    ready=true;
  }
  window.renderBudget={stats,BACKDROP_HZ,get enabled(){return enabled;},set enabled(value){enabled=!!value;lastQuality='';backgroundKey='';lightKey='';},get ready(){return ready;},invalidate(){backgroundKey='';lightKey='';}};
  window.addEventListener('load',()=>setTimeout(install,0));
})();
