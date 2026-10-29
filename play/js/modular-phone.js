/* Phone fitting is one screen at a time. The ship, parts and inspector share
 * the same data; no stacked action pane can cover the construction canvas. */
(() => {
  'use strict';
  const media=matchMedia('(max-width:1000px)'),$=id=>document.getElementById(id);
  let panel,nav,parts,extras,sectionSelect,actions,tools,pane='ship',scheduled=false,ready=false;
  const names={ship:'Ship',parts:'Parts',fit:'Fit',hulls:'Ships',training:'Training'};
  // This panel is observed. Avoid writing the same hidden/text value back into
  // it: those writes would schedule another paint on every animation frame.
  const hide=(el,value)=>{if(el.hidden!==value)el.hidden=value;};
  function choose(next,showFittings=false){
    pane=next;paint();
    if(next==='fit'&&showFittings){const b=[...panel.querySelectorAll('.modular-inspector .forge-tabs button')].find(b=>b.textContent==='Fittings');b?.click();}
    for(const col of panel.querySelectorAll('.modular-columns>*'))col.scrollTop=0;
    if(next==='ship'&&!panel.hidden)requestAnimationFrame(()=>modularYard.refresh());
  }
  function paint(){
    if(!panel)return;panel.classList.toggle('phone-fitting',media.matches);hide(nav,!media.matches);
    const title=$('modular-title'),heading='Shipyard';if(title&&title.textContent!==heading)title.textContent=heading;
    if(!media.matches){if(tools.parentElement===actions)actions.before(tools);hide(actions,true);return;}panel.dataset.phonePane=pane;hide(actions,false);if(tools.parentElement!==actions)actions.append(tools);
    if(panel.hidden)return;
    for(const b of nav.children)b.setAttribute('aria-selected',String(b.dataset.pane===pane));
    const compact=$('modular-phone-budget'),q=(()=>{try{return modularShips.quote(shipyard.design);}catch{return null;}})();
    const text=q?`Hull ${shipyard.design.modular.sections.length}/${q.hull.sections} · Modules ${q.modules}/${q.capacity} · Power ${q.power}/${q.hull.power}${shipyard.design.modular.hull==='frigate'?' · 4 guns max':''}`:'';
    if(compact.textContent!==text)compact.textContent=text;
    hide(parts,pane!=='parts');hide(extras,pane!=='hulls');
    const sections=shipyard.design?.modular?.sections||[],sig=sections.map(s=>s.id+':'+s.kind).join('|');if(sectionSelect.dataset.signature!==sig){sectionSelect.dataset.signature=sig;sectionSelect.replaceChildren(...sections.map(s=>new Option(s.id+' · '+modularShips.SECTIONS[s.kind].name,s.id)));}sectionSelect.value=panel.querySelector('#modular-slots [aria-pressed=true]')?.dataset.selectSection||sections[0]?.id||'';
    if(pane==='parts'){
      const hull=shipyard.design?.modular?.hull,signature=hull+'|'+$('modular-part').value+'|'+sections.length+'|'+!!window.starterJourney?.active;
      if(parts.dataset.signature!==signature){parts.dataset.signature=signature;parts.replaceChildren();
        const hint=document.createElement('p');hint.className='phone-parts-hint';hint.textContent=sections.length>=q?.hull.sections?'Hull full. Remove a section in Fit, or choose a larger ship.':'Choose a part, then tap a + on the ship to attach it.';parts.append(hint);
        for(const[id,s]of Object.entries(modularShips.SECTIONS)){if(id==='bridge')continue;
          const b=document.createElement('button');b.type='button';b.dataset.phonePart=id;b.setAttribute('aria-pressed',String($('modular-part').value===id));
          b.disabled=!hull||s.hulls&&!s.hulls.includes(hull)||id==='battery'&&hull==='frigate'||!!window.starterJourney?.active&&['light','medium','heavy','capital'].includes(s.slot);
          const n=document.createElement('strong');n.textContent=s.name;const price=document.createElement('small');price.textContent=s.cost.toLocaleString()+' metal';
          if(window.topdownKit){const c=topdownKit.thumb({sections:[{id:'part',kind:id,x:0,y:0}],fittings:[]},84,54,shipyard.design.color);c.setAttribute('aria-hidden','true');b.append(c);}
          b.append(n,price);b.onclick=()=>{const select=$('modular-part');select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));choose('ship');};parts.append(b);
        }
      }
    }
  }
  function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;paint();});}
  function install(){
    if(!window.modularYard?.ready||!window.noviceFleet?.ready){setTimeout(install,40);return;}
    panel=$('modular-yard');nav=document.createElement('nav');nav.id='modular-phone-nav';nav.setAttribute('aria-label','Shipyard panels');nav.setAttribute('role','tablist');
    for(const[id,label]of Object.entries(names)){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.pane=id;b.setAttribute('role','tab');b.onclick=()=>choose(id,id==='fit');nav.append(b);}
    panel.querySelector('.modular-top').after(nav);
    const compact=document.createElement('span');compact.id='modular-phone-budget';panel.querySelector('.modular-numbers').append(compact);
    parts=document.createElement('div');parts.id='modular-phone-parts';parts.setAttribute('aria-label','Structural parts');panel.querySelector('.modular-rail').append(parts);
    extras=document.createElement('div');extras.id='modular-phone-extras';panel.querySelector('.modular-rail').append(extras);
    sectionSelect=document.createElement('select');sectionSelect.id='modular-phone-section';sectionSelect.setAttribute('aria-label','Select a hull section to fit');sectionSelect.onchange=()=>{[...panel.querySelectorAll('#modular-slots button')].find(b=>b.dataset.selectSection===sectionSelect.value)?.click();};panel.querySelector('.modular-inspector').prepend(sectionSelect);
    tools=panel.querySelector('.modular-section-tools');actions=document.createElement('details');actions.id='modular-phone-actions';const summary=document.createElement('summary');summary.textContent='Move, rotate or remove this section';actions.append(summary);tools.before(actions);
    for(const[id,label]of[['modular-active','Show flying ship'],['modular-dock','Dock here'],['modular-find-station','Find refit station']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{$(id)?.click();if(id!=='modular-find-station')choose('ship');};extras.append(b);}
    panel.addEventListener('click',e=>{if(!media.matches)return;const section=e.target.closest('#modular-canvas [data-section]'),fit=e.target.closest('[data-fit-gear],.kit-piece,#modular-move,#modular-unfit,#modular-rotate-module,#modular-rotate-section,#modular-remove-section');
      if(section)requestAnimationFrame(()=>choose('fit',true));else if(fit)requestAnimationFrame(()=>{if(!$('modular-message').classList.contains('bad'))choose('ship');});
    },true);
    const open=modularYard.open;modularYard.open=function(...a){const r=open.apply(this,a);choose('ship');return r;};
    new MutationObserver(queue).observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});media.addEventListener('change',queue);
    ready=true;paint();
  }
  window.modularPhone={choose,get pane(){return pane;},get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,100));
})();
