/* Deliberate placement over the existing editor; fitted weapons and saves keep
 * their canonical paths. Mirror is an explicit session choice, never a default. */
(() => {
  'use strict';
  shipyard.mirror=false;
  let ready=false;
  function state(){
    const mirror=shipyard.el?.querySelector('#sy-mirror');
    if(mirror){mirror.textContent=shipyard.mirror?'Mirror: on':'Mirror: off';mirror.classList.toggle('hot',shipyard.mirror);mirror.setAttribute('aria-pressed',String(shipyard.mirror));mirror.title='Optional symmetry: place and edit both sides. Off affects only the selected part.';}
    const hint=shipyard.el?.querySelector('#sy-workbench-state');
    if(hint&&shipyard.part)hint.textContent='Place once: '+shipyard.part.title+' · choose a position';
  }
  function nudge(x,y){
    const n=shipyard.design.nodes[shipyard.sel];if(!n||n.type==='core')return;
    const twin=shipyard.mirror?shipyard.design.nodes.find(m=>m!==n&&m.type===n.type&&m.radius===n.radius&&m.dx===n.dx&&m.dy===-n.dy&&Math.abs(n.dy)>=4):null;
    shipyard.edit(()=>{n.dx+=x;n.dy+=y;if(twin){twin.dx=n.dx;twin.dy=-n.dy;}});
  }
  function install(){
    const paint=shipyard.paint;shipyard.paint=function(...args){const r=paint.apply(this,args);state();return r;};
    const place=shipyard.place;shipyard.place=function(...args){const count=this.design.nodes.length,r=place.apply(this,args);if(this.design.nodes.length>count){this.part=null;this.buildParts();this.paint();}return r;};
    const duplicate=shipyard.duplicateSel;shipyard.duplicateSel=function(...args){
      const source=this.design.nodes[this.sel],count=this.design.nodes.length,mirror=this.mirror;
      this.mirror=false;
      try{return this.edit(()=>{duplicate.apply(this,args);for(const n of this.design.nodes.slice(count))for(const key of['weapon','mk','art','quirk','rarity'])if(source?.[key]!==undefined)n[key]=source[key];});}
      finally{this.mirror=mirror;this.paint();}
    };
    const inspector=shipyard.paintInspector;shipyard.paintInspector=function(...args){
      const r=inspector.apply(this,args),host=this.el?.querySelector('#sy-inspector'),n=this.design.nodes[this.sel];if(!host)return r;
      const intro=host.querySelector('.sy-inspector-intro');if(intro){intro.querySelector('h3').textContent='Build one part at a time.';const p=intro.querySelectorAll('p');p[0].textContent='Choose a part, then tap its position. Each selection places once. Select an existing part to move or refine it.';p[1].textContent='Mirror is optional. Duplicate makes one copy. Undo lets you experiment.';}
      if(n&&n.type!=='core'&&!host.querySelector('#sy-position-tools')){
        const tools=document.createElement('div');tools.id='sy-position-tools';tools.setAttribute('role','group');tools.setAttribute('aria-label','Move selected part one grid step');tools.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(44px,1fr));gap:6px;margin:12px 0';
        for(const[id,text,x,y]of[['left','← Left',-4,0],['right','Right →',4,0],['up','↑ Up',0,-4],['down','Down ↓',0,4]]){const b=document.createElement('button');b.type='button';b.id='sy-nudge-'+id;b.textContent=text;b.style.minHeight='44px';b.onclick=()=>nudge(x,y);tools.append(b);}host.querySelector('.sy-part-actions').after(tools);
      }
      return r;
    };
    const fresh=workshopLibrary.newShip;workshopLibrary.newShip=function(...args){shipyard.mirror=false;const r=fresh.apply(this,args);state();return r;};
    ready=true;shipyard.paint();
  }
  window.shipyardPlacement={get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,0));
})();
