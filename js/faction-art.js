/* A deliberately selected subset of Mac's supplied art. Normalised mount
 * pivots survive the standalone's image resizing. Missing art falls back to
 * the existing painter; there is no per-frame image allocation. */
(() => {
  'use strict';
  const images=new Map(),styles={hunt:{bridge:'hunt-core',spine:'hunt-spine',other:'hunt-hull'},forge:{other:'forge-hull'},lance:{bridge:'lance-core',other:'lance-hull'}};
  const stats={sections:0,turrets:0,used:{}},failures=[];
  const api=window.factionArt={stats,failures,ready:false,get count(){return images.size;},get assets(){return[...images.keys()];},
    section(ctx,c,body,livery){
      const style=styles[livery?.skin];if(!style||c.kind==='drive')return false;
      const id=style[c.kind]||style.other,asset=images.get(id);if(!asset)return false;
      let[hx,hy]=body;if(c.kind==='spine'&&(c.rotation||0)%180)[hx,hy]=[hy,hx];
      ctx.save();ctx.translate(c.px,c.py);ctx.rotate(Math.PI/2);ctx.drawImage(asset.img,-hy,-hx,hy*2,hx*2);ctx.restore();stats.sections++;stats.used[id]=(stats.used[id]||0)+1;return true;
    },
    turret(ctx,weapon,r,firing,skin){
      if(!styles[skin])return false;
      const g=arsenal.GUNS[weapon],heavy=g?.c>=2||r>=18||['mortar','shell','flak'].includes(g?.arch),id=skin+(heavy?'-heavy':'-gun'),asset=images.get(id);if(!asset)return false;
      const w=asset.img.naturalWidth,h=asset.img.naturalHeight,[px,py,base]=asset.spec.pivot,s=r/(w*base);
      ctx.save();ctx.rotate(Math.PI/2);ctx.drawImage(asset.img,-w*px*s,-h*py*s,w*s,h*s);ctx.restore();
      if(firing){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=arsenal.FAMILIES[g?.family]?.tint||'#e6ddaa';ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(r*1.7,0,Math.max(1,r*.18),0,Math.PI*2);ctx.fill();ctx.restore();}
      stats.turrets++;stats.used[id]=(stats.used[id]||0)+1;return true;
    }
  };
  const original=sectionArt.draw;sectionArt.draw=function(ctx,c,body,livery){return api.section(ctx,c,body,livery)||original.apply(this,arguments);};
  api.loaded=(async()=>{
    const manifest=window.__FACTION_KIT||await fetch('art/faction-kit.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('Faction art manifest HTTP '+r.status);return r.json();});
    if(manifest.v!==1||!Array.isArray(manifest.assets))throw new Error('Unknown faction art manifest');
    await Promise.all(manifest.assets.map(spec=>new Promise(resolve=>{const img=new Image();img.onload=()=>{images.set(spec.id,{img,spec});resolve();};img.onerror=()=>{failures.push(spec.path);resolve();};img.src=window.__ART?.[spec.path]||spec.path;})));
    api.ready=true;window.topdownKit?.flightCache.clear();window.modularYard?.refresh();return failures.length===0;
  })().catch(e=>{failures.push(e.message);api.ready=true;return false;});
})();
