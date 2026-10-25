/* HOLO-TEST BAY (docs/PLAN.md, the holo bay). Fly the blueprint on the yard table before paying for it.
   ⚖ ZERO STAKES, BY CONSTRUCTION, NOT BY PROMISE:
   - saveState.save is a no-op for the whole test and the document is restored by value on exit,
     so no metal, design, workshop or pickup survives the sim;
   - holo targets never drop loot, never empty the sector (they respawn), never clear a mission;
   - death resets the hull in place with no mass penalty; portals are shut.
   The modular route uses applyDesign's restore path: no dock, no fabrication bill.
   A patch layer: weapons.js and the other source-hash-gated files are untouched. */
(function () {
  const clone = o => JSON.parse(JSON.stringify(o));
  const TARGETS = [
    { dx: 430, dy: -170, tier: 2, archetype: 'mote', dummy: true },
    { dx: 430, dy: 170, tier: 3, archetype: 'mote', dummy: true },
    { dx: -380, dy: 0, tier: 1, archetype: 'stalker' }
  ];
  let run = null;

  function spawn(t) {
    const e = new EnemyOrganism(run.cx + t.dx, run.cy + t.dy, { tier: t.tier, archetype: t.archetype });
    e.holo = t; e.holoHp = e.hp + (e.shield || 0);
    return e;
  }
  function tally(e) {
    const now = e.dead || e.hp <= 0 ? 0 : e.hp + (e.shield || 0);
    if (now < e.holoHp) run.hits.push([performance.now(), e.holoHp - now]);
    e.holoHp = now;
  }
  function hud() {
    let el = document.getElementById('holo-test-hud');
    if (!el) {
      el = document.createElement('div'); el.id = 'holo-test-hud'; el.setAttribute('role', 'status');
      el.innerHTML = '<strong>HOLO TEST</strong><span id="holo-test-read">Nothing is saved. No metal spent.</span><button type="button" id="holo-test-end">END TEST (Esc)</button>';
      document.body.append(el);
      el.querySelector('#holo-test-end').onclick = () => holoTest.end();
    }
    return el;
  }
  function paintHud() {
    if (!run) return;
    const now = performance.now();
    run.hits = run.hits.filter(h => now - h[0] < 5000);
    const dmg = run.hits.reduce((a, h) => a + h[1], 0), p = engine.player;
    document.getElementById('holo-test-read').textContent =
      `DPS ${Math.round(dmg / 5)} · kills ${run.kills} · hull ${Math.round(p.hp)}/${Math.round(p.maxHp)} · shield ${Math.round(p.shieldHp || 0)}` + (run.resets ? ` · resets ${run.resets}` : '');
  }

  const holoTest = {
    get active() { return !!run; },
    start() {
      if (run || typeof shipyard === 'undefined' || !shipyard.design) return false;
      const say = (m, bad) => shipyard.toast ? shipyard.toast(m, bad) : window.garage?.banner(m, bad ? 'bad' : 'good');
      if (!saveState.doc.launched) { say('Launch your captain first. The test bay runs in the live sector.', true); return false; }
      if (engine.player.dead) { say('Wait for your ship to respawn.', true); return false; }
      try { shipyard.readFields?.(); shipyard.saveDraft?.(); } catch (e) { /* the draft is copied below either way */ }
      const blueprint = clone(shipyard.design), over = window.fitting ? fitting.check(blueprint) : null;
      const p = engine.player, persist = saveState.save;
      run = {
        blueprint, persist, modular: !!blueprint.modular, doc: JSON.stringify(saveState.doc),
        world: { enemies: engine.enemies, projectiles: engine.projectiles, bioMines: engine.bioMines },
        pilot: { x: p.x, y: p.y, vx: p.vx, vy: p.vy, angle: p.angle, hp: p.hp, shieldHp: p.shieldHp },
        cx: p.x, cy: p.y, hits: [], kills: 0, resets: 0
      };
      saveState.save = () => true;
      if (engine.applyDesign(clone(blueprint), { restore: true }) === false) { holoTest.end(true); say('This blueprint cannot be flown yet. Check the fitting notes.', true); return false; }
      engine.enemies = TARGETS.map(spawn); engine.projectiles = []; engine.bioMines = [];
      Object.assign(p, { x: run.cx, y: run.cy, vx: 0, vy: 0, iFrames: 60 });
      if (window.modularYard) modularYard.close();
      if (shipyard.open) shipyard.hide();
      document.body.classList.remove('workshop-open');
      if (typeof menu !== 'undefined' && menu.isPaused?.()) menu.resume();
      engine.paused = false;
      hud(); paintHud(); run.timer = setInterval(paintHud, 250);
      window.garage?.banner(over ? `Holo test · over the limit (${over}). You can fly it, not apply it.` : 'Holo test · 2 dummies and 1 live drone. Nothing is saved.', over ? 'bad' : 'good');
      return true;
    },
    end(quiet) {
      if (!run) return;
      const r = run; run = null; clearInterval(r.timer);
      document.getElementById('holo-test-hud')?.remove();
      Object.assign(engine, r.world);
      const doc = saveState.doc, before = JSON.parse(r.doc);
      for (const k of Object.keys(doc)) delete doc[k];
      Object.assign(doc, before);
      engine.applyDesign(doc.design, { restore: true });
      saveState.save = r.persist;
      Object.assign(engine.player, r.pilot, { dead: false, iFrames: 60 });
      window.walletHUD?.paint(); window.garage?.paintHud?.();
      if (quiet) return;
      shipyard.show();
      shipyard.design = r.blueprint; shipyard.syncFields?.(); shipyard.paint();
      if (r.modular && window.modularYard) modularYard.open();
    }
  };
  window.holoTest = holoTest;

  function button(id, text) {
    const b = document.createElement('button'); b.type = 'button'; b.id = id; b.textContent = text;
    b.title = 'Fly this blueprint against practice targets. Free, nothing is saved.';
    b.onclick = () => holoTest.start(); return b;
  }
  function ensureButtons() {
    const fly = document.getElementById('sy-fly');
    if (fly && !document.getElementById('sy-holo')) fly.parentElement.append(button('sy-holo', 'HOLO TEST · free'));   // last: the phone row shows New / Save / Fly first
    const apply = document.getElementById('modular-apply');
    if (apply && !document.getElementById('modular-holo')) apply.before(button('modular-holo', 'Test flight · free'));
  }

  function install() {
    if (typeof engine === 'undefined' || !engine.player || typeof worldMap === 'undefined' || typeof shipyard === 'undefined' || typeof EnemyOrganism === 'undefined') { setTimeout(install, 60); return; }
    const update = EnemyOrganism.prototype.update;
    EnemyOrganism.prototype.update = function (player, projectiles, list) {
      if (!this.holo) return update.apply(this, arguments);
      if (!this.holo.dummy) { const r = update.apply(this, arguments); tally(this); return r; }
      const r = update.call(this, player, [], list);   // a dummy aims but its shots go nowhere
      this.x = run ? run.cx + this.holo.dx : this.x; this.y = run ? run.cy + this.holo.dy : this.y; this.vx = this.vy = 0;
      tally(this); return r;
    };
    const kill = engine.killEnemy;
    engine.killEnemy = function (index) {
      const e = this.enemies[index];
      if (!e?.holo || !run) return kill.apply(this, arguments);
      tally(e); run.kills++;
      particleSystem.spawnBubbleBurst(e.x, e.y, e.color, 18);
      this.enemies.splice(index, 1, spawn(e.holo));   // never empty: the sector cannot "clear" in a sim
    };
    const death = engine.playerDeath;
    engine.playerDeath = function () {
      if (!run) return death.apply(this, arguments);
      const p = this.player; this.repairNodes?.(p); this.recalculatePlayerStats();
      Object.assign(p, { hp: p.maxHp, dead: false, iFrames: 90 }); run.resets++;
      window.garage?.banner('Holo hull reset. No penalty in the test bay.', 'good');
    };
    const portal = worldMap.checkPortalTransition;
    worldMap.checkPortalTransition = function () { return run ? false : portal.apply(this, arguments); };
    /* Both yards rebuild their panels from scratch on every render, so a button added after
       one paint is gone after the next. Re-add whenever the DOM changes; the check is two lookups. */
    new MutationObserver(ensureButtons).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('keydown', e => { if (run && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); holoTest.end(); } }, true);
    ensureButtons();
  }
  install();
})();
