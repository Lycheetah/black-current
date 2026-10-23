/* Recovered fittings remain ordinary nodes. GP is fitting capacity; metal buys blueprints. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const clone = x => JSON.parse(JSON.stringify(x));
  const QUIRKS = {
    bouncer: { type: 'cannon', name: 'Ricochet cannon', line: 'Bounces to a second enemy. Shots travel 20% slower.' },
    scatter: { type: 'cannon', name: 'Scatter battery', line: 'Two spread shots. Each deals 55% damage and has half the range.' },
    chain: { type: 'siphon', name: 'Chain siphon', line: 'Arcs to a nearby second hull. Each hit deals 75% damage; healing is halved.' },
    overclock: { type: 'thruster', name: 'Overclock drive', line: 'Thrust surges, then stalls. Average output stays the same.' },
    thief: { type: 'bay', name: 'Salvager drone bay', line: 'Drone kills recover a part. Drones fire 35% slower.' },
    bulwark: { type: 'pod', name: 'Anchor plating', line: 'Protects fitted parts by 25%. Costs 18% thrust at full coverage.' },
    seeker: { type: 'cannon', name: 'Seeker cannon', line: 'Shots curve toward the nearest hull. 25% slower, 15% less damage.' },
    lance: { type: 'cannon', name: 'Lance cannon', line: 'Shots pierce two extra hulls. Each hit deals 70% damage.' },
    mirror: { type: 'shield', name: 'Mirror shield', line: 'Turns one enemy shot back every 0.4 s at half damage. The plate takes 40% more damage.' },
    thorn: { type: 'spike', name: 'Thorn ram', line: 'Every hit you take fires a thorn at the nearest enemy. 10 less core hull per thorn.' },
    grave: { type: 'mender', name: 'Grave mender', line: 'Mender pulses wound every enemy inside the ring for 18. You heal half as much.' },
    magnet: { type: 'pod', name: 'Salvage magnet', line: 'Pickups pull from 45% further. The plate takes 30% more damage.' },
    ion: { type: 'thruster', name: 'Ion wake drive', line: 'Leaves a burning trail that hurts anything touching it. 12% less thrust per drive.' },
  };
  const RARITIES = { common: '#b7ccca', rare: '#70bfff', exotic: '#ce91f4', relic: '#edc273' };
  const owns = p => saveState.doc.inventory.some(n => n.type === p.type && n.radius === p.radius && n.quirk === p.quirk && (n.rarity || 'common') === (p.rarity || 'common'));
  const name = p => QUIRKS[p.quirk]?.name || ({ cannon: 'Weapon mount', pod: 'Armour plate', bay: 'Drone bay', thruster: 'Drive', siphon: 'Siphon', wing: 'Escort dock', mender: 'Mender', shield: 'Shield', spike: 'Ram' }[p.type] || p.type);
  const line = p => QUIRKS[p.quirk]?.line || 'A recovered blueprint. Fitting still uses GP and a socket.';
  const catalog = Object.entries(QUIRKS).flatMap(([quirk, q]) => [12, 16].map(radius => ({ type: q.type, radius, quirk, rarity: radius === 12 ? 'rare' : 'exotic' })));
  let ticks = 0, marketVisit = 0, market = [], previousPause = false;
  const loot = window.loot = { QUIRKS, RARITIES, catalog, name, line, owns,
    roll(rarity = 'rare', random = Math.random) {
      const p = clone(catalog[Math.floor(random() * catalog.length) % catalog.length]);
      p.rarity = rarity; return p;
    },
    drop(enemy, rarity) {
      const p = this.roll(rarity || (enemy.isBoss ? 'relic' : 'rare'));
      return progression.spawnSalvage(enemy.x + 20, enemy.y + 20, { part: p });
    },
    steal(enemy) {
      if (enemy.hp > 0 || enemy._stolen) return;
      enemy._stolen = true;
      const p = enemy.nodes?.find(n => n.type !== 'core');
      if (p) progression.spawnSalvage(enemy.x, enemy.y, { part: { type: p.type, radius: p.radius } });
    },
    scale(stat) {
      const nodes = engine.player.nodes || [];
      let drives = 0, clocked = 0, plates = 0, anchors = 0;
      for (const n of nodes) if (!n.lost) {
        if (n.type === 'thruster') { drives++; if (n.quirk === 'overclock') clocked++; }
        if (n.type === 'pod') { plates++; if (n.quirk === 'bulwark') anchors++; }
      }
      if (stat === 'parts') return 1 + .25 * anchors / Math.max(1, plates);
      if (stat !== 'thrust') return 1;
      return (1 + (ticks % 180 < 75 ? .8 : -4 / 7) * clocked / Math.max(1, drives)) * (1 - .18 * anchors / Math.max(1, plates));
    },
    fit(part) {
      if (part.quirk && !owns(part)) return false;
      this.close(); if (window.hubs?.docked) hubs.closeDock();
      if (window.menu?.isPaused()) menu.resume();
      bay.show(); shipyard.part = { ...clone(part), title: name(part) };
      shipyard.phonePane('ship'); shipyard.paint();
      shipyard.toast('Tap Mount, or tap an empty spot on the ship. GP and sockets still apply.'); return true;
    },
    open() {
      previousPause = engine.paused; engine.paused = true; engine.mouse.down = false;
      document.body.classList.add('hold-open'); $('btn-phone-hold')?.classList.remove('new-salvage'); paintHold(); $('salvage-panel').style.display = 'flex'; engine._needsRender = true;
    },
    close() {
      if ($('salvage-panel')?.style.display !== 'flex') return;
      $('salvage-panel').style.display = 'none'; document.body.classList.remove('hold-open'); engine.paused = previousPause;
    },
    buy(part) {
      const price = this.price(part);
      if (!hubs.docked || hubs.metal < price || owns(part)) return false;
      hubs.metal -= price; saveState.addPart(part); saveState.save(); paintMarket(); paintDockExtras();
      garage.banner('Blueprint acquired: ' + name(part), 'good'); return true;
    },
    price: p => (p.rarity === 'exotic' ? 150 : 90) + p.radius * 3,
  };
  // Enforced at the engine choke point as well as the visible Fly action.
  window.fitting = {
    check(design) {
      if (!design?.nodes?.length || design.nodes.filter(n => n.type === 'core').length !== 1) return 'A ship needs exactly one core.';
      let cost = 0;
      for (const n of design.nodes) {
        if (!['core','cannon','pod','shield','thruster','spike','bay','siphon','wing','mender'].includes(n.type)
          || ![n.dx,n.dy,n.radius].every(Number.isFinite) || n.radius < 2 || n.radius > 80) return 'One fitting has invalid geometry.';
        if (n.quirk && (!QUIRKS[n.quirk] || QUIRKS[n.quirk].type !== n.type || !owns(n))) return 'Recover or buy that exotic blueprint before fitting it.';
        cost += fleet.costOfNode(n.type, n.radius);
      }
      const cap = progression.getTotalGP(), sockets = progression.getEvolutionData().maxSockets;
      if (cost > cap) return `Over budget: ${cost} / ${cap} GP. Remove parts or collect more mass.`;
      if (design.nodes.length > sockets) return `Too many parts: ${design.nodes.length} / ${sockets} sockets. Remove a part or evolve.`;
      return null;
    },
  };
  function image(part) {
    const e = window.sprites?.ready && sprites.pick(part);
    if (!e) return null;
    const img = document.createElement('img'); img.src = e.path.replace(/\/([^/]+)$/, '/clean/$1'); img.alt = name(part);
    img.onerror = () => { img.onerror = null; img.src = e.path; }; return img;
  }
  function card(part, action, text = 'Fit blueprint') {
    const el = document.createElement('article'); el.className = 'loot-card'; el.style.setProperty('--rarity', RARITIES[part.rarity] || RARITIES.common);
    const pic = image(part); if (pic) el.append(pic);
    const rarity = document.createElement('small'); rarity.textContent = (part.rarity || 'common').toUpperCase() + ` · ${part.radius}px`;
    const title = document.createElement('strong'); title.textContent = name(part) + (part.count ? ` ×${part.count}` : '');
    const desc = document.createElement('p'); desc.textContent = line(part);
    const facts = document.createElement('small'); facts.textContent = fleet.costOfNode(part.type, part.radius) + ' GP · 1 socket per mounted part';
    el.append(rarity, title, desc, facts);
    if (action) { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = action; el.append(b); }
    return el;
  }
  function paintHold() {
    const list = $('salvage-list'); list.replaceChildren();
    $('salvage-wallet').textContent = `${hubs.metal} metal to spend · ${progression.getTotalGP()} GP fitting capacity · ${saveState.partCount()} recovered parts`;
    for (const p of saveState.doc.inventory) list.append(card(p, () => loot.fit(p)));
    for (const design of saveState.doc.recoveredHulls || []) {
      const el = document.createElement('article'); el.className = 'loot-card';
      const title = document.createElement('strong'); title.textContent = 'Recovered hull · ' + design.nodes.length + ' parts';
      const b = document.createElement('button'); b.type='button';b.textContent='Refit recovered hull';
      b.onclick=()=>{loot.close();shipyard.design=clone(design);shipyard.show();shipyard.syncFields();shipyard.paint();};el.append(title,b);list.append(el);
    }
    if (!list.children.length) { const p = document.createElement('p'); p.textContent = 'Your hold is empty. Recover the shaped brass drops left by destroyed ships. Elites and outposts can leave unusual fittings.'; list.append(p); }
  }
  function paintMarket() {
    const list = $('dock-oddities'); if (!list || !hubs.docked) return; list.replaceChildren();
    for (const p of market) {
      const el = card(p, () => loot.buy(p), owns(p) ? 'Owned blueprint' : `Buy · ${loot.price(p)} metal`);
      el.querySelector('button').disabled = owns(p) || hubs.metal < loot.price(p); list.append(el);
    }
  }
  function paintDockExtras() {
    const host = $('dock-hold'); if (!host || !hubs.docked) return;
    // Replace numeric-only hold rows with the same pictured inventory used in flight.
    host.replaceChildren();
    for (const p of saveState.doc.inventory) {
      const el = card(p, () => loot.fit(p));
      if (p.count > 1) {
        const sell = document.createElement('button'); sell.type = 'button'; sell.textContent = `Sell spare · +${hubs.sellValue(p)} metal`;
        sell.onclick = () => { if (p.count <= 1 || !hubs.docked) return; p.count--; hubs.metal += hubs.sellValue(p); saveState.save(); paintDockExtras(); paintMarket(); };
        el.append(sell);
      }
      host.append(el);
    }
    if (!host.children.length) host.textContent = 'Empty hold. Recover parts in the field.';
    $('dock-metal').textContent = `${hubs.metal} metal · ${saveState.partCount()} recovered parts · ${progression.getTotalGP()} GP capacity`;
  }
  function install() {
    const overlay = document.createElement('div'); overlay.id = 'salvage-panel'; overlay.className = 'menu-overlay'; overlay.style.display = 'none';
    overlay.setAttribute('role','dialog'); overlay.setAttribute('aria-modal','true'); overlay.setAttribute('aria-labelledby','salvage-title');
    overlay.innerHTML = '<div class="menu-card salvage-card"><h2 id="salvage-title">Salvage hold</h2><p id="salvage-wallet"></p><p class="loot-explainer">Metal buys blueprints. Mass unlocks GP capacity. Every fitting still needs space and GP.</p><div id="salvage-list" class="loot-grid"></div><button id="salvage-close" class="tm-door">Back to flight</button></div>';
    overlay.addEventListener('touchstart', e => e.stopPropagation(), { passive: true }); document.body.append(overlay); $('salvage-close').onclick = () => loot.close();
    const holdButton = document.createElement('button'); holdButton.id = 'btn-phone-hold'; holdButton.type = 'button'; holdButton.textContent = 'Hold'; holdButton.onclick = () => loot.open();
    const zoom = $('phone-zoom'); if (zoom) zoom.append(holdButton);
    const pause = $('btn-pause-shipyard'); if (pause) { const b = document.createElement('button'); b.type='button'; b.className='tm-door'; b.textContent='Salvage hold'; b.onclick=()=>{ menu.resume(); loot.open(); }; pause.after(b); }
    const kill = engine.killEnemy.bind(engine);
    engine.killEnemy = i => {
      const e = engine.enemies[i];
      if (e && (e.isBoss || ((e.elite || e.archetype === 'outpost') && Math.random() < .55))) loot.drop(e, e.isBoss ? 'relic' : (galaxy.rule() ? 'exotic' : 'rare'));
      return kill(i);
    };
    const collect = progression.collectDrop.bind(progression);
    progression.collectDrop = drop => {
      const result = collect(drop);
      if (drop.part) {
        garage.banner(`${(drop.part.rarity || 'common').toUpperCase()} · ${name(drop.part)} → Hold`, 'good');
        $('btn-phone-hold')?.classList.add('new-salvage');
      }
      return result;
    };
    const drawDrop = BubbleDrop.prototype.draw;
    BubbleDrop.prototype.draw = function(ctx,camera) {
      if (!this.part) return drawDrop.call(this,ctx,camera);
      ctx.save(); const color = RARITIES[this.part.rarity] || '#c9a25c';
      const x=this.x-camera.x,y=this.y-camera.y; ctx.strokeStyle=color; ctx.fillStyle='#09131c'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x,y-14);ctx.lineTo(x+14,y);ctx.lineTo(x,y+14);ctx.lineTo(x-14,y);ctx.closePath();ctx.fill();ctx.stroke();
      const e=window.sprites?.ready&&sprites.pick(this.part),img=e&&sprites.image(e);
      if(img?.complete&&img.naturalWidth)ctx.drawImage(img,x-10,y-10,20,20);
      ctx.restore();
    };
    const core = engine.coreMod.bind(engine); engine.coreMod = stat => core(stat) * loot.scale(stat);
    const update = engine.update.bind(engine); engine.update = dt => { if (!engine.paused&&!engine.mapOpen&&!document.hidden&&!engine.player.dead) ticks++; return update(dt); };
    const drone = MitosisDrone.prototype.update;
    MitosisDrone.prototype.update = function(projectiles,targets) {
      const before=projectiles.length; drone.call(this,projectiles,targets);
      if (this.thief && projectiles.length>before) { this.shootTimer=Math.ceil(this.shootTimer*1.35); for(let i=before;i<projectiles.length;i++)projectiles[i].thief=true; }
    };
    const openDock = hubs.openDock;
    hubs.openDock = () => { openDock(); if(!hubs.docked)return; marketVisit++; market=[0,1,2].map(i=>clone(catalog[marketVisit === 1 ? [8,0,6][i] : (marketVisit*3+i)%catalog.length])); paintDockExtras(); paintMarket(); };
    const section=document.createElement('section');section.className='dock-loot-section';section.innerHTML='<h3>Recovered technology</h3><p>Rotating blueprints · GP and socket costs still apply.</p><div id="dock-oddities" class="loot-grid"></div>';
    $('dock-panel').querySelector('.dock-card').append(section);
    $('dock-panel').addEventListener('click',()=>queueMicrotask(()=>{paintDockExtras();paintMarket();}),true);
    // Repaint after existing keyboard/touch dock handlers (which retain their original closure).
    new MutationObserver(()=>{if(hubs.docked){if(!market.length){marketVisit++;market=[0,1,2].map(i=>clone(catalog[marketVisit === 1 ? [8,0,6][i] : (marketVisit*3+i)%catalog.length]));}paintDockExtras();paintMarket();}else market=[];}).observe($('dock-panel'),{attributes:true,attributeFilter:['style']});
    const buildParts=shipyard.buildParts;
    shipyard.buildParts=function(){buildParts.call(this);const host=this.el?.querySelector('#sy-parts');if(!host)return;
      for(const p of saveState.doc.inventory.filter(p=>p.quirk)){
        if(this.category!=='all'&&this.category!=='salvage'&&this.category!==p.type&&!(this.category==='odd'&&['bay','siphon','wing','mender'].includes(p.type)))continue;
        if(!(name(p)+' '+line(p)).toLowerCase().includes(this.search.toLowerCase()))continue;
        const el=card(p,()=>{this.part={...clone(p),title:name(p)};this.phonePane('ship');this.paint();},'Choose fitting');el.classList.add('loot-library');host.append(el);
      }
    };
    const inspector=shipyard.paintInspector;shipyard.paintInspector=function(){inspector.call(this);const p=this.design.nodes[this.sel];if(!p?.quirk)return;const desc=this.el.querySelector('#sy-selected-desc');if(desc)desc.textContent=line(p);const control=this.el.querySelector('#sy-part-size');if(control){control.disabled=true;control.title='Recovered fittings keep their original size.';}};
    document.addEventListener('keydown',e=>{if(e.code==='Escape'&&overlay.style.display==='flex'){e.preventDefault();e.stopImmediatePropagation();loot.close();}},true);
  }
  window.addEventListener('load',install);
})();
