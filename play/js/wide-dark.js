/* THE WIDE DARK (master route Stage 5): places worth the trip.
 * - DERELICTS: seeded wrecks in contested and null space (and most of a GRAVEYARD system). Clear the
 *   guard, hold position beside the hulk and you salvage a roster gun of the sector's band class.
 * - ANOMALIES: rare in deep contested space, common in the null band. Holding inside one yields a
 *   RELIC fitting (otherwise only bosses drop relics) and charts a far system you have not visited.
 * - GRAVEYARD: a sixth system rule, assigned by hash so existing galaxies keep every rolled rule.
 * Sites are pure functions of system + coordinates; only "claimed" is saved. Art: faction-kit blocks. */
(() => {
  'use strict';
  const TAU = Math.PI * 2, HOLD = 180;   // frames of holding position to salvage (3 s)
  const ART = {
    derelict: ['art/keyed/alien_blocks/chitin_carapace-v1.png', 'art/keyed/alien_blocks/rib_cage-v1.png', 'art/keyed/precursor_blocks/obsidian_keel-v1.png', 'art/keyed/armor/citadel_slab-v1.png'],
    anomaly: ['art/keyed/precursor_blocks/solar_citadel-v1.png', 'art/keyed/alien_blocks/pulsing_heart-v1.png']
  };
  const images = new Map();
  for (const path of [...ART.derelict, ...ART.anomaly]) { const img = new Image(); img.onload = () => images.set(path, img); img.src = window.__ART?.[path] || path; }
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const rng = seed => () => ((seed = Math.imul(seed ^ seed >>> 15, 2246822519) + 0x9e3779b9 >>> 0) / 4294967296);
  let ready = false, hold = 0, holdKey = null;
  const doc = () => { const d = saveState.doc; if (!d.wideDark || d.wideDark.v !== 1) d.wideDark = { v: 1, claimed: {}, derelicts: 0, anomalies: 0 }; return d.wideDark; };
  // Graveyards are marked by hash after the seeded rules are rolled, so no existing rule moves.
  let marked = null;
  const candidate = sys => !!sys && !sys.home && !sys.hub && !sys.rule && (sys.hops || 0) >= 3 && hash('graveyard:' + sys.id) % 100 < 12;
  function mark() { const D = window.galaxy?.data; if (!D || D === marked) return; for (const s of D.systems) if (candidate(s)) s.rule = 'graveyard'; marked = D; }
  const isGraveyard = sys => { mark(); return sys?.rule === 'graveyard'; };
  function site(ch) {
    mark();
    if (!ch || ch.isHaven || ch.isBossSector || ch.zoneLayer) return null;
    const ring = Math.max(Math.abs(ch.gridX), Math.abs(ch.gridY)), d = ch.dangerLevel || 1;
    if (!ch.sys && ring <= 3) return null;
    const key = (ch.sysId || 'home') + ':' + ch.gridX + ',' + ch.gridY, r = rng(hash('site:' + key)), a = r(), b = r();
    let kind = null;
    if ((d >= 11 && a < 0.22) || (d >= 8 && a < 0.06)) kind = 'anomaly';
    else if (d >= 4 && b < (isGraveyard(ch.sys) ? 0.65 : 0.2)) kind = 'derelict';
    if (!kind) return null;
    const R = ch.radius || 2600, ang = r() * TAU, dist = R * (0.35 + r() * 0.4), list = ART[kind];
    return { kind, key, x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, r: kind === 'anomaly' ? 260 : 220 + Math.min(10, d) * 18, art: list[Math.floor(r() * list.length)], spin: (r() - 0.5) * 0.00012, danger: d };
  }
  const current = () => site(worldMap.getCurrentChamber());
  const claimed = s => !!doc().claimed[s.key];
  function guarded(s) { return engine.enemies.some(e => e.hp > 0 && !e.training && Math.hypot(e.x - s.x, e.y - s.y) < 1800); }
  function reward(s) {
    const W = doc(); W.claimed[s.key] = Date.now();
    if (s.kind === 'derelict') {
      W.derelicts++;
      const cls = combatScaling.gunClass({ tier: s.danger, archetype: 'stalker' });
      const pool = Object.entries(modularShips.GEARS).filter(([, g]) => g.weapon && g.cls === cls && !g.retired && !g.salvageOnly);
      const pick = pool[hash(s.key) % Math.max(1, pool.length)];
      if (pick) progression.spawnSalvage(s.x, s.y, { promised: true, part: { type: 'cannon', radius: pick[1].radius, weapon: pick[1].weapon } });
      hubs.metal += Math.round((tuning.ROWS[Math.min(20, s.danger)]?.bounty || 10) * 2);
      if (window.contracts) contracts.bump('salvage');
      garage.banner('DERELICT SALVAGED · ' + (pick ? WEAPON_TYPES[pick[1].weapon]?.title + ' recovered' : 'metal recovered'), 'good');
    } else {
      W.anomalies++;
      progression.spawnSalvage(s.x, s.y, { part: loot.roll('relic') });
      const v = galaxy.doc().visited, far = galaxy.data.systems.filter(o => !v.includes(o.id) && !o.home).sort((p, q) => (hash(s.key + p.id) % 997) - (hash(s.key + q.id) % 997))[0];
      if (far) v.push(far.id);
      if (window.contracts) contracts.bump('anomaly');
      garage.banner('ANOMALY CHARTED · a relic surfaces' + (far ? ' · ' + far.name + ' revealed' : ''), 'good');
    }
    saveState.save();
  }
  function update() {
    if (engine.paused || engine.player.dead) return;
    const s = current(); if (!s || claimed(s)) { hold = 0; return; }
    const P = engine.player, near = Math.hypot(P.x - s.x, P.y - s.y) < s.r + fleetFormation.radius(P) + 160;
    if (holdKey !== s.key) { hold = 0; holdKey = s.key; }
    hold = near && !guarded(s) ? hold + 1 : Math.max(0, hold - 2);
    if (hold >= HOLD) { hold = 0; reward(s); }
  }
  function draw(ctx, camera) {
    const s = current(); if (!s) return;
    const img = images.get(s.art), t = performance.now(), done = claimed(s);
    ctx.save(); ctx.translate(s.x - camera.x, s.y - camera.y);
    if (s.kind === 'anomaly' && !done) { const g = ctx.createRadialGradient(0, 0, s.r * 0.2, 0, 0, s.r * 1.6); g.addColorStop(0, 'rgba(255,211,106,.35)'); g.addColorStop(1, 'rgba(188,19,254,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s.r * 1.6, 0, TAU); ctx.fill(); }
    ctx.rotate(t * s.spin); ctx.globalAlpha = done ? 0.35 : 1;
    if (img) { const k = s.r * 2 / Math.max(img.naturalWidth, img.naturalHeight); ctx.drawImage(img, -img.naturalWidth * k / 2, -img.naturalHeight * k / 2, img.naturalWidth * k, img.naturalHeight * k); }
    ctx.restore();
    if (!done && hold > 0) { ctx.save(); ctx.translate(s.x - camera.x, s.y - camera.y); ctx.strokeStyle = s.kind === 'anomaly' ? '#ffd36a' : '#86ded0'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, s.r + 40, -Math.PI / 2, -Math.PI / 2 + TAU * hold / HOLD); ctx.stroke(); ctx.restore(); }
  }
  function label(ctx, camera) {
    const s = current(); if (!s) return;
    const P = engine.player, d = Math.round(Math.hypot(P.x - s.x, P.y - s.y)), done = claimed(s);
    const text = (s.kind === 'anomaly' ? 'ANOMALY' : 'DERELICT') + (done ? ' · salvaged' : guarded(s) ? ' · guarded' : ' · hold position to salvage') + ' · ' + d;
    ctx.save(); ctx.font = '600 ' + Math.round(14 / (engine.camera.zoom || 1)) + 'px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = s.kind === 'anomaly' ? '#ffd36a' : '#86ded0'; ctx.globalAlpha = done ? 0.5 : 0.9;
    ctx.fillText(text, s.x - camera.x, s.y - camera.y - s.r - 30 / (engine.camera.zoom || 1)); ctx.restore();
  }
  function install() {
    if (!window.sectorField?._installed || !window.fleetFormation?.ready || !window.combatScaling?.ready || !window.galaxy?.data) { setTimeout(install, 60); return; }
    const membrane = worldMap.drawChamberMembrane.bind(worldMap);
    worldMap.drawChamberMembrane = (ctx, camera) => { membrane(ctx, camera); try { draw(ctx, camera); } catch { } };
    const parts = particleSystem.draw.bind(particleSystem);
    particleSystem.draw = (ctx, camera) => { parts(ctx, camera); try { label(ctx, camera); } catch { } };
    const tick = engine.update.bind(engine);
    engine.update = (...a) => { const r = tick(...a); try { update(); } catch { } return r; };
    mark();
    // A graveyard is mostly wreckage: about 40% fewer ordinary hunters.
    const load = engine.loadChamberEntities;
    engine.loadChamberEntities = function (...a) { mark(); const r = load.apply(this, a); if (galaxy.rule() === 'graveyard') { const keep = this.enemies.filter(e => e.isBoss || e.name || e.training), rest = this.enemies.filter(e => !keep.includes(e)); this.enemies = [...keep, ...rest.slice(0, Math.ceil(rest.length * 0.6))]; } return r; };
    galaxy.RULES.graveyard = { name: 'GRAVEYARD', tint: '#9fb7c9', line: 'A fleet died here. Derelicts everywhere; fewer hunters.' };
    ready = true;
  }
  window.wideDark = { site, current, claimed, reward, isGraveyard, get hold() { return hold; }, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 460));
})();
