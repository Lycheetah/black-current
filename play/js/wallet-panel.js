/* Read-only resource window. Metal is currency; capacity and growth are labelled
 * separately. All balances come from the existing campaign, never a second wallet. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),fmt=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString();
  const paths={metal:'M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10',mass:'M6 3c12 5 0 13 12 18M18 3C6 8 18 16 6 21M8 6h8M8 18h8M9 11h6',capacity:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',talents:'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z',reactor:'M13 2L4 14h7l-1 8 10-13h-7z'};
  function icon(id){return'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[id]+'"/></svg>';}
  let dialog,button,ready=false,priorPause=false,last='',next=0;
  window.addEventListener('keydown',e=>{if(e.code==='Escape'&&dialog?.open){e.preventDefault();e.stopImmediatePropagation();close();}},true);
  function snapshot(){const raw=Number(saveState.doc.metal??0),r=window.reactorTraining?.ranks()||{};return{valid:Number.isFinite(raw)&&raw>=0,metal:hubs.metal,mass:progression.totalMass,capacity:window.upgradePath?upgradePath.capacity():progression.getTotalGP(),talents:window.captainTalents?.points()||0,reactor:Math.max(0,(window.reactorTraining?.earned()||0)-Object.values(r).reduce((a,b)=>a+b,0))};}
  function paint(force=false){if(!ready||!force&&performance.now()<next)return;next=performance.now()+250;const d=snapshot(),sig=JSON.stringify(d);if(sig===last)return;last=sig;
    $('wallet-metal-value').textContent=d.valid?fmt(d.metal):'Unavailable';$('wallet-mass-value').textContent=fmt(d.mass);
    for(const key of ['metal','mass','capacity','talents','reactor'])$('wallet-balance-'+key).textContent=key==='metal'&&!d.valid?'Unavailable':fmt(d[key]);
    button.setAttribute('aria-label',d.valid?'Open wallet: '+fmt(d.metal)+' metal and '+fmt(d.mass)+' biomass':'Open wallet: balance unavailable');
  }
  function close(){if(!dialog.open)return;dialog.close();document.body.classList.remove('wallet-open');engine.paused=priorPause;}
  function open(){if(dialog.open)return;priorPause=engine.paused;engine.paused=true;engine.mouse.down=false;paint(true);dialog.showModal();document.body.classList.add('wallet-open');}
  function install(){
    if(!window.walletHUD?.ready||!window.captainTalents?.ready||!window.reactorTraining){setTimeout(install,60);return;}
    button=document.createElement('button');button.type='button';button.id='wallet-button';button.innerHTML='<span class="hud-resource hud-metal">'+icon('metal')+'<b id="wallet-metal-value"></b><small>Metal</small></span><span class="hud-resource hud-biomass">'+icon('mass')+'<b id="wallet-mass-value"></b><small>Biomass</small></span>';button.onclick=e=>{e.stopPropagation();open();};
    $('hud-mass-count').after(button);
    dialog=document.createElement('dialog');dialog.id='wallet-panel';dialog.setAttribute('aria-labelledby','wallet-title');
    dialog.innerHTML='<header><div><small>CAPTAIN / RESOURCES</small><h2 id="wallet-title">Wallet</h2></div><button id="wallet-close" type="button" aria-label="Close wallet">× Close</button></header><div id="wallet-resources"></div><p class="wallet-help">Metal pays for equipment and fabrication. Biomass grows your captain. Module slots and reactor power limit your loadout; they are not spendable money.</p>';
    const rows=[['metal','Metal','Spend on parts, technology and fabrication.'],['mass','Biomass','Collected progression. Hulls and training show their required milestones.'],['talents','Talent points','Unspent points for Captain → Talents.'],['reactor','Reactor points','Unspent points for boost specialisation.'],['capacity','Module slots','Equipped modules your current hull can support. Weapon size and reactor power also apply.']];
    for(const[id,name,note]of rows){const row=document.createElement('div');row.className='wallet-resource';row.innerHTML=icon(id)+'<div><strong>'+name+'</strong><small>'+note+'</small></div><b id="wallet-balance-'+id+'"></b>';dialog.querySelector('#wallet-resources').append(row);}
    document.body.append(dialog);$('wallet-close').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
    dialog.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});
    const update=engine.updateHUD;engine.updateHUD=function(...a){const r=update.apply(this,a);paint();return r;};window.addEventListener('black-current-wallet',()=>paint(true));window.addEventListener('resize',()=>paint(true));
    const card=document.querySelector('#hud .organism-card');card.addEventListener('click',()=>{if(document.documentElement.classList.contains('mobile-layout'))open();});
    ready=true;paint(true);
  }
  window.resourceWallet={open,close,paint,get ready(){return ready;}};window.addEventListener('load',()=>setTimeout(install,100));
})();
