/* Generated overhead sprites, extracted from one alpha atlas. Explicit bearing
 * pivots keep the same mount, aim and scale in cards, construction and flight. */
(() => {
  'use strict';
  const SPEC=[['cannon',230,266],['repeater',207,266],['rail',194,266],['beam',230,255],['arc',207,255],['launcher',194,255],['scatter',230,224],['mortar',207,224],['lance',194,224]];
  const ARCH={cannon:'cannon',repeater:'repeater',scatter:'scatter',stream:'rail',driver:'rail',rifle:'rail',bolt:'beam',pulse:'arc',lance:'lance',seeker:'launcher',rocket:'launcher',torpedo:'launcher',mortar:'mortar',flak:'scatter',shell:'mortar'};
  const images=new Map();let drawn=0;
  const loaded=Promise.all(SPEC.map(([id,x,y])=>new Promise(resolve=>{
    const img=new Image(),path='art/keyed/turrets/'+id+'-v1.png';img.onload=()=>{images.set(id,{img,x,y});resolve(true);window.noviceFleet?.paint();window.modularYard?.refresh();};img.onerror=()=>resolve(false);img.src=window.__ART?.[path]||path;
  })));
  const over=new Map();   // art drops (js/art-drop.js): a gun id or an archetype → {img, x, y, size, radius}
  window.turretArt={loaded,get count(){return images.size;},get drawn(){return drawn;},
    use(key,img,x,y,radius){const size=img.naturalWidth||img.width;over.set(key,{img,x,y,size,radius:radius||size*135/418});},
    draw(ctx,id,r,firing){
      const arch=typeof arsenal!=='undefined'?arsenal.GUNS[id]?.arch:null,drop=over.get(id)||over.get(arch),asset=drop||images.get(ARCH[arch]||'cannon');if(!asset)return false;
      const size=asset.size||418,s=r/(asset.radius||135);ctx.save();ctx.rotate(Math.PI/2);ctx.drawImage(asset.img,-asset.x*s,-asset.y*s,size*s,size*s);ctx.restore();
      if(firing){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.45;ctx.fillStyle='#ffe9b7';ctx.beginPath();ctx.arc(r*1.65,0,Math.max(1,r*.22),0,Math.PI*2);ctx.fill();ctx.restore();}
      drawn++;return true;
    }
  };
})();
