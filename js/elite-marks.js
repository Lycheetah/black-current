/* ELITE MARKS (overnight run step 6). Mac, 2026-10-29: "10 ranks to each gun with 3 like elite tiers … an elite cruiser
 * with 3 Mk 3 cannons and still defend itself". A rank-10 gun type (js/gun-ranks.js) refits to Elite Mk I, II and III
 * for metal plus ELITE CORES, a scarce currency. Cores come from full derelict holds and rift seals (+1 each),
 * citadel cores and warlords (+3), and an occasional elite kill. Mk I/II/III add +25/+55/+90% damage on top of the
 * rank, so a Mk III rank-10 gun hits ~2.9× stock, about one gun class up. Marked mounts wear gilded rings.
 * Threat stays fixed by place (tuning.ROWS) and marks cap at III, so this is depth, not creep. */
(() => {
  'use strict';
  const MARKS = [null, { name: 'Elite Mk I', dmg: 1.25, cores: 2, metal: 6 }, { name: 'Elite Mk II', dmg: 1.55, cores: 4, metal: 9 }, { name: 'Elite Mk III', dmg: 1.9, cores: 6, metal: 12 }];
  const CORES = { hold: 1, rift: 1, citadel: 3, warlord: 3, eliteChance: 0.04 };
  const GOLD = '#f0c860';
  let ready = false, notice = '';
  const $ = id => document.getElementById(id);
  const G = () => window.gunRanks;
  function doc() { const d = G().doc(); if (typeof d.marks !== 'object' || !d.marks || Array.isArray(d.marks)) d.marks = {}; if (!Number.isFinite(d.cores) || d.cores < 0) d.cores = 0; return d; }
  const mark = w => Math.max(0, Math.min(3, Math.floor(Number(doc().marks[w]) || 0)));
  const mult = w => MARKS[mark(w)]?.dmg || 1;
  const cores = () => doc().cores;
  function price(w) { const next = MARKS[mark(w) + 1]; if (!next || G().rank(w) < G().CFG.max) return null; return { cores: next.cores, metal: Math.round(G().CFG.base[G().classOf(w)] * next.metal), name: next.name }; }
  function grant(n, why) { if (!n) return; doc().cores += n; saveState.save(); garage.banner(`ELITE CORE${n > 1 ? 'S' : ''} +${n} · ${why} · ${doc().cores} held`, 'good'); }
  function refit(w) {
    const p = price(w);
    if (!p) { notice = mark(w) >= 3 ? 'Already Elite Mk III.' : 'Rank this gun to 10 first.'; return false; }
    if (!hubs.docked) { notice = 'Dock at a station to refit a gun.'; return false; }
    if (cores() < p.cores || hubs.metal < p.metal) { notice = `Needs ${p.cores} elite cores and ${p.metal.toLocaleString()} metal.`; return false; }
    const before = { metal: saveState.doc.metal, cores: doc().cores, marks: JSON.stringify(doc().marks) };
    saveState.doc.metal = hubs.metal - p.metal; doc().cores -= p.cores; doc().marks[w] = mark(w) + 1;
    if (!saveState.save()) { saveState.doc.metal = before.metal; doc().cores = before.cores; doc().marks = JSON.parse(before.marks); notice = 'Save failed. Nothing was spent.'; return false; }
    notice = `${WEAPON_TYPES[w].title} refitted to ${p.name} (+${Math.round((mult(w) - 1) * 100)}% on top of rank 10).`;
    window.walletHUD?.paint?.(); garage.banner(notice, 'good'); return true;
  }
  const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
  function section() {
    const host = el('section', null, 'elite-marks'); host.id = 'elite-marks';
    host.append(el('h3', `Elite marks · ${cores()} elite core${cores() === 1 ? '' : 's'} held`), el('p', 'A rank-10 gun refits to Mk I, II and III (+25 / +55 / +90% damage). Cores come from derelict holds, rift seals, citadels, warlords and rare elite kills.', 'path-note'));
    if (notice) host.append(el('p', notice, 'qm-notice'));
    for (const w of G().fitted()) {
      const m = mark(w), p = price(w), row = el('div', null, 'elite-row'); row.dataset.eliteRow = w; row.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:6px 0';
      const label = el('strong', `${WEAPON_TYPES[w].title} · ${m ? MARKS[m].name : 'no mark'}`); if (m) label.style.color = GOLD;
      const b = el('button', p ? `Refit to ${p.name} · ${p.cores} cores + ${p.metal.toLocaleString()} metal` : m >= 3 ? 'Elite Mk III · complete' : `Needs rank 10 (now ${G().rank(w)})`); b.type = 'button'; b.dataset.eliteMark = w;
      b.disabled = !p || !hubs.docked || cores() < p.cores || hubs.metal < p.metal; b.onclick = () => { refit(w); refresh(); };
      row.append(label, b); host.append(row);
    }
    return host;
  }
  function refresh() { const old = $('elite-marks'); if (old) old.replaceWith(section()); }
  // Gilded rings on marked mounts: one ring per mark, in the hull's own frame like quirk emblems.
  function trim(ctx, x, y, angle, nodes) {
    const now = performance.now() / 1000; let any = false;
    for (const n of nodes) { if (n.type !== 'cannon' || n.lost) continue; const w = n.weapon || window.fleet?.weaponFor?.(n), m = w && mark(w); if (!m) continue;
      if (!any) { ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.strokeStyle = GOLD; any = true; }
      const cx = Number.isFinite(n.currentDx) ? n.currentDx : n.dx, cy = Number.isFinite(n.currentDy) ? n.currentDy : n.dy;
      for (let k = 0; k < m; k++) { ctx.globalAlpha = 0.75 - k * 0.15 + 0.15 * Math.sin(now * 2 + k); ctx.lineWidth = Math.max(1.2, n.radius * 0.18); ctx.beginPath(); ctx.arc(cx, cy, n.radius * (1.35 + k * 0.32), 0, Math.PI * 2); ctx.stroke(); } }
    if (any) ctx.restore();
  }
  function install() {
    if (!G()?.ready || !window.upgradePath?.render || typeof engine === 'undefined') { setTimeout(install, 60); return; }
    const render = upgradePath.render; upgradePath.render = function (...a) { const root = render.apply(this, a); try { notice = ''; root.append(section()); } catch (e) { console.warn('elite marks:', e.message); } return root; };
    const fire = engine.fireMountGroup; engine.fireMountGroup = function (w, mounts, dmg, ...a) { return fire.call(this, w, mounts, (dmg ?? 1) * mult(w), ...a); };
    const kill = engine.killEnemy; engine.killEnemy = function (i, ...a) {
      const e = this.enemies[i], r = kill.call(this, i, ...a);
      try { if (e && e.hp <= 0 && !this.enemies.includes(e) && !e._eliteCorePaid) { e._eliteCorePaid = true;
        if (e.capital?.role === 'core') grant(CORES.citadel, 'citadel core'); else if (e.capital?.role === 'warlord') grant(CORES.warlord, 'warlord'); else if (e.elite && !e.training && Math.random() < CORES.eliteChance) grant(1, 'elite wreck'); } } catch (err) { console.warn('elite cores:', err.message); }
      return r; };
    if (window.derelictLoot?.award) { const award = derelictLoot.award; derelictLoot.award = function (d, setId, ...a) { const r = award.call(this, d, setId, ...a); try { grant(setId === 'riftwalker' ? CORES.rift : CORES.hold, setId === 'riftwalker' ? 'rift sealed' : 'derelict hold'); } catch (e) { } return r; }; }
    const membrane = fluidShader.drawOrganismMembrane; fluidShader.drawOrganismMembrane = function (ctx, x, y, angle, cr, nodes, ...a) { const r = membrane.call(this, ctx, x, y, angle, cr, nodes, ...a); if (nodes === engine.player.nodes) try { trim(ctx, x, y, angle, nodes); } catch (e) { } return r; };
    window.addEventListener('black-current-wallet', refresh);
    ready = true;
  }
  window.eliteMarks = { MARKS, CORES, mark, mult, cores, price, refit, grant, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 120));
})();
