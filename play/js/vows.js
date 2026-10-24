/* Free choices at a dock. A vow always gives up something; gun traverse is unchanged. */
(() => {
  const CHOICES = {
    edge:{name:'EDGE',line:'18% more thrust · 15% less protection for fitted parts',mods:{thrust:1.18,parts:.85}},
    bastion:{name:'BASTION',line:'25% more protection for fitted parts · 18% less thrust',mods:{parts:1.25,thrust:.82}},
    witness:{name:'WITNESS',line:'25% more sight · 12% less core hull',mods:{sight:1.25,hull:.88}},
  };
  let previousPause=false,pending=false;
  const vows=window.vows={CHOICES,
    scale:stat=>CHOICES[saveState.doc.vow]?.mods[stat]||1,
    open(){if(document.getElementById('vow-panel').style.display==='flex')return;previousPause=engine.paused;engine.paused=true;engine.mouse.down=false;pending=false;document.body.classList.add('vows-open');document.getElementById('vow-panel').style.display='flex';paint();engine._needsRender=true;},
    close(){document.getElementById('vow-panel').style.display='none';document.body.classList.remove('vows-open');engine.paused=previousPause;},
    choose(id){
      if(!CHOICES[id])return false;
      const hpRatio=engine.player.hp/engine.player.maxHp,old=vows.scale('parts');saveState.doc.vow=id;
      for(const n of engine.player.nodes)if(n.partMax!==undefined){const ratio=n.partHp/n.partMax;n.partMax*=vows.scale('parts')/old;n.partHp=n.partMax*ratio;}
      engine.recalculatePlayerStats();engine.player.hp=engine.player.maxHp*hpRatio;saveState.save();
      garage.banner('Vow chosen: '+CHOICES[id].name,'good');vows.close();return true;
    },
  };
  function paint(){for(const b of document.querySelectorAll('[data-vow]'))b.setAttribute('aria-pressed',String(saveState.doc.vow===b.dataset.vow));}
  window.addEventListener('load',()=>{
    const overlay=document.createElement('div');overlay.id='vow-panel';overlay.className='menu-overlay';overlay.style.display='none';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','vow-title');
    overlay.innerHTML='<div class="menu-card salvage-card"><h2 id="vow-title">Choose a vow</h2><p class="loot-explainer">A strength with a cost. Change your choice for free at any dock.</p><div class="vow-grid"></div><button id="vow-later" class="tm-door">Keep current choice / Later</button></div>';
    for(const[id,q]of Object.entries(CHOICES)){const b=document.createElement('button');b.type='button';b.dataset.vow=id;const title=document.createElement('strong');title.textContent=q.name;b.append(title,document.createTextNode(q.line));b.onclick=()=>vows.choose(id);overlay.querySelector('.vow-grid').append(b);}
    overlay.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});document.body.append(overlay);document.getElementById('vow-later').onclick=()=>vows.close();
    const b=document.createElement('button');b.type='button';b.className='tm-door';b.id='dock-vow';b.textContent='Choose vow · free';b.onclick=()=>vows.open();document.querySelector('#dock-panel .dock-doors').append(b);
    const core=engine.coreMod.bind(engine);engine.coreMod=stat=>core(stat)*vows.scale(stat);
    const collect=progression.collectDrop.bind(progression);progression.collectDrop=drop=>{const result=collect(drop);if(result&&!saveState.doc.vow)pending=true;return result;};
    const update=engine.update.bind(engine);engine.update=dt=>{const result=update(dt);if(pending&&!engine.paused&&!engine.mapOpen&&!document.hidden&&!engine.player.dead)vows.open();return result;};
    const ratio=engine.player.hp/engine.player.maxHp;engine.recalculatePlayerStats();engine.player.hp=engine.player.maxHp*ratio;
    document.addEventListener('keydown',e=>{if(e.code==='Escape'&&overlay.style.display==='flex'){e.preventDefault();e.stopImmediatePropagation();vows.close();}},true);
  });
})();
