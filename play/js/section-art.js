/* Accepted review kit: its alpha art paints inside the existing structural
 * footprints. Connectors, slots and collision geometry remain authoritative. */
(() => {
  'use strict';
  const images=new Map(),cache=new Map(),names=['bridge','spine','plate','deck','drive','utility','heavy','hangar','spinal'];let drawn=0;
  const loaded=Promise.all(names.map(id=>new Promise(resolve=>{const img=new Image(),path='art/keyed/sections/'+id+'-v1.png';img.onload=()=>{images.set(id,img);resolve(true);};img.onerror=()=>resolve(false);img.src=window.__ART?.[path]||path;}))).then(()=>{if(window.noviceFleet?.ready)noviceFleet.refresh();if(window.modularYard?.ready)modularYard.refresh();});
  function tinted(id,img,color){if(!/^#[0-9a-f]{6}$/i.test(color||''))return img;const key=id+color;if(cache.has(key))return cache.get(key);const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);x.globalCompositeOperation='source-atop';x.globalAlpha=.20;x.fillStyle=color;x.fillRect(0,0,c.width,c.height);cache.set(key,c);if(cache.size>96)cache.delete(cache.keys().next().value);return c;}
  window.sectionArt={loaded,get count(){return images.size;},get drawn(){return drawn;},
    // art drops (js/art-drop.js) replace a kind's image; a kind of its own (battery, novice) wins over its alias
    use(id,img){images.set(id,img);for(const k of[...cache.keys()])if(k.startsWith(id))cache.delete(k);},
    draw(ctx,c,body,livery){const id=images.has(c.kind)?c.kind:c.kind==='battery'?'heavy':c.kind==='novice'?'deck':c.kind,img=images.get(id);if(!img)return false;let[hx,hy]=body;if(c.kind==='spine'&&(c.rotation||0)%180)[hx,hy]=[hy,hx];ctx.save();ctx.translate(c.px,c.py);ctx.rotate(Math.PI/2);ctx.drawImage(tinted(id,img,livery?.body),-hy,-hx,hy*2,hx*2);ctx.restore();drawn++;return true;}
  };
})();
