/* ==========================================================================
   B9 · CONTRACTS. Three standing bounties that give every sector a reason and
   pay in loot you collect with your own hull. Skill contracts (mid-lunge kills,
   killing a sniper while it paints you) teach the B7 tells by rewarding them.
   CONTINUITY, not guilt: progress persists in the one save document and the
   board shows the road walked (contracts done). Nothing expires or decays.
   Reads hunt.js (chain, wings); wraps engine.killEnemy / loseNode like it.
   ========================================================================== */
(() => {
  const KINDS = {
    kills:   { n: [20, 30, 45], w: 1.0, t: n => `Kill ${n} hostiles` },
    outpost: { n: [1, 2],       w: 1.6, t: n => n === 1 ? 'Break a pirate outpost' : `Break ${n} pirate outposts`, parts: 3 },
    elite:   { n: [2, 3],       w: 1.3, t: n => `Kill ${n} elites`, parts: 1 },
    wing:    { n: [2, 3],       w: 1.2, t: n => `Break ${n} hostile wings` },
    chain:   { n: [10, 14, 18], w: 1.2, t: n => `Reach chain x${n}`, best: true },
    lunge:   { n: [3, 5],       w: 1.3, t: n => `Kill ${n} chargers mid-lunge` },
    painter: { n: [3, 5],       w: 1.3, t: n => `Kill ${n} snipers while they paint you` },
    strip:   { n: [12, 20],     w: 1.1, t: n => `Shoot ${n} parts off enemies`, parts: 1 },
    // Stage 5 · the wide dark (js/wide-dark.js bumps these).
    salvage: { n: [1, 2],       w: 1.5, t: n => n === 1 ? 'Salvage a derelict' : `Salvage ${n} derelicts`, parts: 2 },
    anomaly: { n: [1],          w: 1.8, t: () => 'Chart an anomaly', parts: 2 },
  };

  const ct = window.contracts = {
    state() {
      const d = saveState.doc;
      if (!d.contracts || !Array.isArray(d.contracts.active)) d.contracts = { active: [], done: 0 };
      const c = d.contracts;
      c.active = c.active.filter(a => KINDS[a.kind]);
      while (c.active.length < 3) c.active.push(roll(c.active));
      return c;
    },
    bump(kind, by = 1) { advance(kind, a => a.have + by); },
    best(kind, v) { advance(kind, a => Math.max(a.have, v)); },
  };

  /* Mac's playtest list (2026-10-30, item 10): a new pilot was handed "kill snipers while they paint you" and "break
     hostile wings" in home sectors that field neither. Until three contracts are done, the board rolls only jobs a
     rookie meets at home, with smaller counts. */
  const STARTER = { kills: [8, 12], strip: [6, 10], chain: [5, 8] };
  function roll(active) {
    const taken = new Set(active.map(a => a.kind));
    const rookie = (Number(saveState.doc.contracts?.done) || 0) < 3;
    const free = Object.keys(rookie ? STARTER : KINDS).filter(k => !taken.has(k));
    const kind = free[Math.random() * free.length | 0];
    const K = rookie ? { ...KINDS[kind], n: STARTER[kind] } : KINDS[kind], i = Math.random() * K.n.length | 0;
    return { kind, n: K.n[i], have: 0, mass: Math.round((70 + i * 40) * K.w / 10) * 10, parts: (K.parts || 0) + i };
  }

  function advance(kind, f) {
    if (typeof saveState === 'undefined') return;
    const c = ct.state();
    let changed = false;
    c.active.forEach((a, idx) => {
      if (a.kind !== kind || a.have >= a.n) return;
      a.have = Math.min(a.n, f(a));
      changed = true;
      if (a.have >= a.n) complete(c, idx);
      else paint(idx);
    });
    if (changed) { saveSoon(); if (!pending) paint(); }
  }

  /* One localStorage write per burst of kills, not one per kill. Completion
     still writes at once (complete → setTimeout → save). */
  let saveT = 0;
  function saveSoon() { if (!saveT) saveT = setTimeout(() => { saveT = 0; saveState.save(); }, 2000); }

  let pending = 0;
  function complete(c, idx) {
    const a = c.active[idx];
    c.done = (c.done || 0) + 1;
    payout(a);
    if (window.garage) garage.banner(`CONTRACT COMPLETE · ${KINDS[a.kind].t(a.n)} · +${a.mass}`, 'hunt');
    soundEngine.playEvolutionFanfare();
    pending++;
    paint();
    setTimeout(() => {
      const i = c.active.indexOf(a);
      if (i >= 0) c.active.splice(i, 1, roll(c.active.filter(x => x !== a)));
      pending--; saveState.save(); paint();
    }, 1600);
  }

  /* The pay arrives as loot around your hull: you see it, you fly through it. */
  function payout(a) {
    const p = engine.player;
    if (typeof BubbleDrop !== 'undefined') {
      for (let i = 0; i < a.mass / 10; i++) {
        const ang = Math.random() * Math.PI * 2, r = 40 + Math.random() * 60;
        progression.bubbleDrops.push(new BubbleDrop(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r, 10, '#e8c478'));
      }
    }
    for (let i = 0; i < a.parts; i++) {
      const ang = Math.random() * Math.PI * 2;
      progression.spawnSalvage(p.x + Math.cos(ang) * 70, p.y + Math.sin(ang) * 70, { part: { type: 'cannon', radius: i % 2 ? 14 : 12 } });
    }
  }

  /* ── board ────────────────────────────────────────────────────────────── */
  const el = document.createElement('div');
  el.id = 'contracts';
  el.setAttribute('aria-label', 'Contracts');
  function paint(bumped) {
    if (typeof saveState === 'undefined') return;
    const c = ct.state();
    const rows = c.active.map((a, i) => {
      const done = a.have >= a.n;
      return `<div class="ct${done ? ' done' : ''}${i === bumped ? ' bump' : ''}">
        <div class="ct-t"><span>${KINDS[a.kind].t(a.n)}</span><span>${done ? 'DONE' : `${a.have}/${a.n}`}</span></div>
        <div class="ct-r">+${a.mass} mass${a.parts ? ` · ${a.parts} part${a.parts > 1 ? 's' : ''}` : ''}</div>
        <div class="ct-bar"><i style="width:${Math.round(a.have / a.n * 100)}%"></i></div></div>`;
    }).join('');
    el.innerHTML = `<div class="ct-head">CONTRACTS <b>${c.done || 0} DONE</b></div>${rows}`;
  }

  function install() {
    (document.getElementById('hud') || document.body).appendChild(el);
    paint();

    const baseKill = engine.killEnemy.bind(engine);
    engine.killEnemy = (index) => {
      const e = engine.enemies[index];
      const r = baseKill(index);
      if (e) {
        ct.bump('kills');
        if (e.elite) ct.bump('elite');
        if (e.archetype === 'outpost') ct.bump('outpost');
        if (e.archetype === 'charger' && (e.chargeT > 0 || e.actionTimer > 45)) ct.bump('lunge');
        if (e.archetype === 'sniper' && e.aimT > 0) ct.bump('painter');
        if (typeof hunt !== 'undefined') ct.best('chain', hunt.chain);
      }
      return r;
    };

    const baseLose = engine.loseNode.bind(engine);
    engine.loseNode = (ship, node) => {
      const r = baseLose(ship, node);
      if (ship !== engine.player) ct.bump('strip');
      return r;
    };

    if (typeof hunt !== 'undefined') hunt.onWingBroken = () => ct.bump('wing');
  }
  if (typeof engine !== 'undefined' && engine) install(); else window.addEventListener('load', install);
})();
