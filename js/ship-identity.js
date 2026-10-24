/* Ship identity is blueprint data. Geometry remains the editor's real nodes;
 * finishes only change pixels. No enemy renderer or combat calculation changes. */
(() => {
  'use strict';
  const PAINTS = {
    glacier: ['Glacier', '#243e50', '#6de7e5', '#b5cad4'],
    ivory: ['Ceramic ivory', '#5c6265', '#edc778', '#ece8d8'],
    cobalt: ['Fleet cobalt', '#1c304f', '#78b8ff', '#647b9c'],
    ember: ['Salvage rust', '#50342b', '#ffad66', '#aa7252'],
    orchid: ['Void orchid', '#382a4e', '#d8a0ff', '#8e719f'],
    verdant: ['Deep jade', '#203e39', '#82e6ad', '#729a83'],
    crimson: ['Crimson steel', '#47262d', '#ff8593', '#aa626d'],
    graphite: ['Graphite', '#252b35', '#e2e8ef', '#697684'],
  };
  const SKINS = {faceted:'Armoured plates', swept:'Swept alloy', industrial:'Industrial frame', organic:'Living carapace', ribbed:'Ribbed steel'};
  const LAYOUTS = {needle:'Needle', delta:'Delta wings', broadside:'Broadside', crescent:'Crescent', trident:'Trident', orbital:'Orbital'};
  const MARKS = {none:'Unmarked', stripes:'Twin stripes', chevron:'Chevron', cross:'Rescue cross', bars:'Hazard bars'};
  const copy = x => JSON.parse(JSON.stringify(x));
  const geometry = new WeakMap();
  const envelopes = new WeakMap();
  let panel, preview, ready = false;
  function style(d) {
    const s = d?.identity;
    if (!s || s.v !== 1) return null;
    return {v:1,skin:Object.hasOwn(SKINS,s.skin)?s.skin:'faceted',paint:Object.hasOwn(PAINTS,s.paint)?s.paint:'glacier',mark:Object.hasOwn(MARKS,s.mark)?s.mark:'stripes',layout:Object.hasOwn(LAYOUTS,s.layout)?s.layout:'needle'};
  }
  function current() { return style(shipyard.design) || {v:1,skin:'faceted',paint:'glacier',mark:'stripes',layout:'needle'}; }
  function links(nodes) {
    let hit = geometry.get(nodes); if (hit) return hit;
    const core = Math.max(0, nodes.findIndex(n=>n.type==='core'));
    hit = nodes.map((n,i)=>{
      if (i===core) return -1;
      const x=n.targetDx??n.dx??0,y=n.targetDy??n.dy??0,d=Math.hypot(x,y);
      let best=core,dist=Math.hypot(x-(nodes[core].dx||0),y-(nodes[core].dy||0));
      nodes.forEach((q,j)=>{const qx=q.targetDx??q.dx??0,qy=q.targetDy??q.dy??0,span=Math.hypot(x-qx,y-qy);if(j!==i&&Math.hypot(qx,qy)<d-1&&span<dist){best=j;dist=span;}});
      return best;
    });
    geometry.set(nodes,hit);return hit;
  }
  const position = n => [n.currentDx??n.dx??0,n.currentDy??n.dy??0];
  function polygon(ctx, points) {ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();}
  function envelope(nodes) {
    const mask=nodes.map(n=>n.lost?1:0).join(''),cached=envelopes.get(nodes);if(cached?.mask===mask)return cached.points;
    const pts=[];for(const n of nodes){if(n.lost)continue;const x=n.targetDx??n.dx??0,y=n.targetDy??n.dy??0,r=n.radius*.75;for(const [a,b]of[[1,0],[-1,0],[0,1],[0,-1]])pts.push([x+a*r,y+b*r]);}
    pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
    const lower=[],upper=[];for(const p of pts){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(const p of [...pts].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}lower.pop();upper.pop();const points=lower.concat(upper);envelopes.set(nodes,{mask,points});return points;
  }
  function plating(ctx, nodes, identity, light) {
    const [name,base,,plate] = PAINTS[identity.paint], accent=light||PAINTS[identity.paint][2], chain=links(nodes);
    ctx.lineCap='round';ctx.lineJoin='round';
    if(identity.skin==='faceted'||identity.skin==='swept'){
      const points=envelope(nodes);if(points.length>2){polygon(ctx,points);ctx.fillStyle=base;ctx.fill();ctx.strokeStyle=plate;ctx.lineWidth=1.6;ctx.stroke();ctx.save();ctx.clip();ctx.fillStyle='rgba(185,216,232,.06)';ctx.fillRect(-2000,-2000,4000,2000);ctx.restore();}
    }
    for(let i=0;i<nodes.length;i++) {
      const n=nodes[i],q=nodes[chain[i]];if(!q||n.lost||q.lost)continue;
      const [x,y]=position(n),[a,b]=position(q),width=Math.max(7,Math.min(n.radius,q.radius)*1.3);
      ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(x,y);ctx.strokeStyle=base;ctx.lineWidth=width+5;ctx.stroke();
      ctx.strokeStyle=plate;ctx.lineWidth=width;ctx.stroke();ctx.strokeStyle=base;ctx.lineWidth=Math.max(2,width-4);ctx.stroke();
    }
    for(const n of nodes) {
      if(n.lost)continue;const [x,y]=position(n),r=n.radius*(n.type==='core'?1.55:1.1);
      ctx.save();ctx.translate(x,y);
      if(identity.skin==='organic'){ctx.beginPath();ctx.ellipse(0,0,r*1.2,r,0,0,Math.PI*2);}
      else if(identity.skin==='swept')polygon(ctx,[[r*1.65,0],[-r*.6,-r],[-r*1.05,-r*.55],[-r*.8,r*.55],[-r*.6,r]]);
      else if(identity.skin==='industrial')polygon(ctx,[[-r,-r*.75],[r*.65,-r*.75],[r,r*.75],[-r,r*.75]]);
      else polygon(ctx,[[-r*.9,-r*.55],[-r*.5,-r],[r*.6,-r],[r*1.2,-r*.35],[r*1.2,r*.35],[r*.6,r],[-r*.5,r],[-r*.9,r*.55]]);
      ctx.fillStyle=base;ctx.fill();ctx.strokeStyle=plate;ctx.lineWidth=1.3;ctx.stroke();
      ctx.save();ctx.clip();ctx.fillStyle='rgba(230,247,255,.10)';ctx.fillRect(-r*1.2,-r*1.2,r*3,r*1.2);
      ctx.fillStyle='rgba(0,4,13,.22)';ctx.fillRect(-r*1.2,0,r*3,r*1.2);ctx.restore();
      if(identity.skin!=='organic'){ctx.beginPath();ctx.moveTo(-r*.5,-r*.55);ctx.lineTo(r*.15,0);ctx.lineTo(-r*.5,r*.55);ctx.strokeStyle='rgba(170,200,215,.22)';ctx.lineWidth=.8;ctx.stroke();}
      ctx.beginPath();ctx.moveTo(-r*.5,-r*.65);ctx.lineTo(r*.55,-r*.65);ctx.strokeStyle=accent;ctx.lineWidth=1.6;ctx.stroke();
      if(identity.skin==='ribbed'||identity.skin==='industrial')for(let j=-2;j<=2;j++){ctx.beginPath();ctx.moveTo(j*r*.3,-r*.55);ctx.lineTo(j*r*.3,r*.55);ctx.strokeStyle=plate;ctx.lineWidth=1;ctx.stroke();}
      ctx.restore();
    }
  }
  function markings(ctx,nodes,identity,light) {
    const core=nodes.find(n=>n.type==='core'&&!n.lost);if(!core||identity.mark==='none')return;
    const [x,y]=position(core),r=core.radius;
    ctx.save();ctx.translate(x,y);ctx.fillStyle=light||PAINTS[identity.paint][2];ctx.strokeStyle=light||PAINTS[identity.paint][2];ctx.lineWidth=Math.max(1.6,r*.12);ctx.globalAlpha=.9;
    if(identity.mark==='stripes'){for(const a of[-.6,.6])ctx.fillRect(-r*.65,r*a-r*.07,r*1.45,r*.14);}
    else if(identity.mark==='chevron'){ctx.beginPath();ctx.moveTo(-r*.45,-r*.6);ctx.lineTo(r*.35,0);ctx.lineTo(-r*.45,r*.6);ctx.stroke();}
    else if(identity.mark==='cross'){ctx.fillRect(-r*.12,-r*.65,r*.24,r*1.3);ctx.fillRect(-r*.65,-r*.12,r*1.3,r*.24);}
    else {ctx.save();ctx.rotate(-.55);for(let j=-1;j<=1;j++)ctx.fillRect(j*r*.4-r*.1,-r*.6,r*.2,r*1.2);ctx.restore();}
    ctx.restore();
  }
  function weaponDetails(ctx,nodes,light) {
    for(const n of nodes){
      if(n.type!=='cannon'||n.lost)continue;
      const weapon=typeof fleet!=='undefined'?fleet.weaponFor(n):n.weapon||'spitter',r=n.radius,[x,y]=position(n);
      ctx.save();ctx.translate(x,y);ctx.rotate(sprites._angleFor(n,0));ctx.fillStyle='#182431';ctx.strokeStyle=light;ctx.lineWidth=Math.max(.8,r*.07);
      const rail=/rail|lance|beam/.test(weapon),rack=/torpedo|homing|mortar|cluster|howitzer/.test(weapon),multi=/twin|burst|flak|shrapnel|flechette/.test(weapon);
      if(rack){for(let j=-1;j<=1;j++){ctx.fillRect(-r*.3,j*r*.35-r*.12,r*.9,r*.24);ctx.strokeRect(-r*.3,j*r*.35-r*.12,r*.9,r*.24);}}
      else if(rail){for(const side of[-1,1]){ctx.fillRect(0,side*r*.22-r*.06,r*1.6,r*.12);ctx.strokeRect(0,side*r*.22-r*.06,r*1.6,r*.12);}}
      else if(weapon==='wave'){ctx.beginPath();ctx.arc(r*.3,0,r*.65,-1.1,1.1);ctx.stroke();}
      else {const count=multi?(/flak|shrapnel/.test(weapon)?3:2):1;for(let j=0;j<count;j++){const offset=(j-(count-1)/2)*r*.33;ctx.fillRect(0,offset-r*.1,r*1.25,r*.2);ctx.strokeRect(0,offset-r*.1,r*1.25,r*.2);}}
      ctx.restore();
    }
  }
  function update(patch) {
    shipyard.edit(()=>{shipyard.design.identity=style({identity:{...current(),...patch,v:1}});shipyard.design.color=PAINTS[shipyard.design.identity.paint][2];shipyard.syncFields();});
    shipyard.saveDraft();paint();
  }
  function arrange(key) {
    if(!Object.hasOwn(LAYOUTS,key))return false;
    shipyard.edit(()=>{
      const nodes=shipyard.design.nodes,parts=nodes.filter(n=>n.type!=='core');
      const gap=Math.max(30,...nodes.map(n=>n.radius*2+6));
      parts.forEach((n,i)=>{
        const pair=Math.floor(i/2),side=i%2?-1:1,rows=Math.ceil(parts.length/2);
        let x=0,y=0;
        if(key==='needle'){x=((rows-1)/2-pair)*gap;y=side*gap*.8;}
        if(key==='delta'){x=(.8-pair*.65)*gap;y=side*(pair+1)*gap*.7;}
        if(key==='broadside'){x=((rows-1)/2-pair)*gap;y=side*gap;}
        if(key==='crescent'){const a=parts.length<2||pair===rows-1&&parts.length%2?0:side*Math.PI*.75*(1-pair/rows);x=(.2-Math.cos(a))*gap*(rows*.45+1);y=Math.sin(a)*gap*(rows*.45+1);}
        if(key==='trident'){const lane=(i%3)-1;x=(Math.ceil(parts.length/3)-Math.floor(i/3))*gap;y=lane*gap;}
        if(key==='orbital'){const a=i/Math.max(1,parts.length)*Math.PI*2;x=Math.cos(a)*gap*Math.max(1,parts.length/5);y=Math.sin(a)*gap*Math.max(1,parts.length/5);}
        n.dx=Math.round(x);n.dy=Math.round(y);
      });
      shipyard.design.identity={...current(),layout:key};shipyard.design.color=PAINTS[current().paint][2];shipyard.zoom=0;shipyard.sel=-1;shipyard.syncFields();
    });
    shipyard.saveDraft();shipyard.toast(LAYOUTS[key]+': existing fittings rearranged. Undo restores your layout.');paint();return true;
  }
  function paint() {
    if(!panel||panel.hidden)return;
    const s=current();for(const field of['skin','paint','mark','layout'])panel.querySelector('#identity-'+field).value=s[field];
    panel.querySelector('#identity-accent').value=/^#[0-9a-f]{6}$/i.test(shipyard.design.color)?shipyard.design.color:PAINTS[s.paint][2];
    const nodes=shipyard.renderNodes(),reach=shipyard.reach(),ctx=preview.getContext('2d'),w=preview.width,h=preview.height;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#09121d';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#183044';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w/2,15);ctx.lineTo(w/2,h-15);ctx.moveTo(15,h/2);ctx.lineTo(w-15,h/2);ctx.stroke();
    ctx.save();ctx.translate(w/2,h/2);const zoom=Math.min(3.5,(Math.min(w,h)-65)/(2*Math.max(30,reach)));ctx.scale(zoom,zoom);
    fluidShader.drawOrganismMembrane(ctx,0,0,0,nodes.find(n=>n.type==='core')?.radius||18,nodes,shipyard.design.color,{});ctx.restore();
    panel.querySelector('#identity-summary').textContent=`${nodes.length} existing parts · ${PAINTS[s.paint][0]} · nose →`;
  }
  function close(){panel.hidden=true;document.body.classList.remove('identity-open');shipyard.paint();}
  function open(){update({});panel.hidden=false;document.body.classList.add('identity-open');paint();panel.querySelector('#identity-close').focus();}
  function button(text,fn,id){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;if(id)b.id=id;return b;}
  function install(){
    const original=fluidShader.drawOrganismMembrane;
    fluidShader.drawOrganismMembrane=function(ctx,x,y,a,r,nodes,color,state){
      const d=nodes===shipyard._previewNodes?shipyard.design:(typeof engine!=='undefined'&&nodes===engine.player.nodes?saveState.doc.design:null),identity=style(d);
      if(!identity)return original.apply(this,arguments);
      const light=typeof color==='string'&&/^#[0-9a-f]{3,8}$/i.test(color)?color:PAINTS[identity.paint][2];
      ctx.save();ctx.translate(x,y);ctx.rotate(a);plating(ctx,nodes,identity,light);ctx.restore();
      const underlay=sprites.underlay,chassis=sprites.chassis;
      try{sprites.underlay=false;sprites.chassis=false;original.call(this,ctx,x,y,a,r,nodes,light,state);}finally{sprites.underlay=underlay;sprites.chassis=chassis;}
      ctx.save();ctx.translate(x,y);ctx.rotate(a);markings(ctx,nodes,identity,light);weaponDetails(ctx,nodes,light);ctx.restore();
    };
    panel=document.createElement('div');panel.id='ship-identity';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','identity-title');
    panel.innerHTML='<section class="identity-sheet"><header><div><small>SHIP IDENTITY</small><h2 id="identity-title">Make it yours</h2></div></header><canvas id="identity-preview" width="620" height="380" aria-label="Live ship appearance preview"></canvas><p id="identity-summary"></p><div class="identity-controls"></div><p class="identity-note">Finishes are cosmetic. Layouts move your current fittings and change the real hull shape. Save build keeps these choices; Fly applies the normal fitting checks.</p><footer></footer></section>';
    const controls=panel.querySelector('.identity-controls');
    for(const [field,title,values]of[['skin','Hull finish',SKINS],['paint','Paint scheme',Object.fromEntries(Object.entries(PAINTS).map(([k,v])=>[k,v[0]]))],['mark','Hull marking',MARKS],['layout','Rearrange fittings',LAYOUTS]]){
      const label=document.createElement('label');label.textContent=title;const select=document.createElement('select');select.id='identity-'+field;for(const [key,text]of Object.entries(values))select.add(new Option(text,key));label.append(select);controls.append(label);
      if(field!=='layout')select.onchange=()=>update({[field]:select.value});
    }
    controls.append(button('Apply layout',()=>arrange(panel.querySelector('#identity-layout').value),'identity-arrange'));
    const accentLabel=document.createElement('label');accentLabel.textContent='Custom accent';const accent=document.createElement('input');accent.type='color';accent.id='identity-accent';accent.oninput=()=>{shipyard.edit(()=>{shipyard.design.color=accent.value;shipyard.syncFields();});shipyard.saveDraft();paint();};accentLabel.append(accent);controls.append(accentLabel);
    panel.querySelector('header').append(button('Back',close,'identity-close'));
    panel.querySelector('footer').append(button('Undo',()=>{shipyard.history('undo');paint();},'identity-undo'),button('Save build',()=>workshopLibrary.save(),'identity-save'),button('Back to workbench',close));
    panel.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});document.body.append(panel);preview=panel.querySelector('canvas');
    function wire(){if(shipyard.el&&!document.getElementById('sy-style'))shipyard.el.querySelector('#sy-primary-actions').prepend(button('Style ship',open,'sy-style'));}
    for(const key of['build','show']){const previous=shipyard[key];shipyard[key]=function(...args){const result=previous.apply(this,args);wire();return result;};}wire();
    const hide=shipyard.hide;shipyard.hide=function(...args){close();return hide.apply(this,args);};
    ready=true;
  }
  // Register before the workshop's capture listener. Its shortcuts must yield
  // to this dialog, including native select, colour and keyboard navigation.
  window.addEventListener('keydown',e=>{
    if(!panel||panel.hidden)return;
    e.stopImmediatePropagation();
    if(e.code==='Escape'){e.preventDefault();close();document.getElementById('sy-style')?.focus();}
    if(e.code==='Tab'){
      const items=[...panel.querySelectorAll('button,input,select')].filter(el=>!el.disabled&&el.getClientRects().length),first=items[0],last=items.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  },true);
  window.shipIdentity={get ready(){return ready;},open,close,update,arrange,style,PAINTS,SKINS,LAYOUTS,MARKS};
  window.addEventListener('load',()=>setTimeout(install,0));
})();
