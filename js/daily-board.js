/* DAILY BOARD + WEEKLY WARLORD (overnight run step 17). The session goal of the retention loop (docs/PLAN.md): every
 * UTC day posts three goals, one each to fight, roam and work, all counted from systems the game already has:
 *   fight · destroy hostiles, or destroy elite hulls          (engine.killEnemy)
 *   roam  · enter sectors you have not entered today, or open a derelict hold (enterChamber, derelicts' cleared count)
 *   work  · finish a station job, or seal a rift              (saga jobs, rifts' cleared count)
 * Each pays metal scaled to your frame and one elite core; all three together pay two more cores. Every week one of
 * the six roaming warlords is named; bringing it down that week pays elite cores and metal on top of its relic. Days
 * and weeks rotate by the clock, like rift modifiers. The board is a journal section; progress shows as banners. */
(() => {
  'use strict';
  const DAY = 86400000;
  const CFG = { goalCore: 1, allBonus: 2, warlordCores: 4, warlordMetal: 2500, metalBase: 120, killsBase: 20, killsPerClass: 6, elites: 3, sectors: 6 };
  const POOL = {
    fight: [{ kind: 'kills', title: n => `Destroy ${n} hostiles` }, { kind: 'elites', title: n => `Destroy ${n} elite hulls` }],
    roam: [{ kind: 'sectors', title: n => `Enter ${n} sectors you have not entered today` }, { kind: 'hold', title: () => 'Open a derelict hold' }],
    work: [{ kind: 'job', title: () => 'Finish a station job' }, { kind: 'rift', title: () => 'Seal a rift' }]
  };
  let ready = false, notice = '';
  const $ = id => document.getElementById(id);
  const today = (now = Date.now()) => Math.floor(now / DAY);
  const weekOf = day => Math.floor((day + 3) / 7);   // weeks start on Monday (day 0 was a Thursday)
  const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const CLASSES = () => window.tuning?.CLASSES || ['frigate'];
  const classStep = () => Math.max(0, CLASSES().indexOf(window.tuning?.classOf?.(engine.player) || 'frigate'));
  const counters = () => ({ holds: saveState.doc.dives?.cleared || 0, rifts: saveState.doc.rifts?.cleared || 0, jobs: Object.keys(saveState.doc.saga?.jobsDone || {}).length });
  const warlordDefeats = id => saveState.doc.capital?.warlords?.[id]?.defeats || 0;
  function need(kind) { const c = classStep(); return kind === 'kills' ? CFG.killsBase + CFG.killsPerClass * c : kind === 'elites' ? CFG.elites : kind === 'sectors' ? CFG.sectors : 1; }
  function post(day) {
    const goals = ['fight', 'roam', 'work'].map((group, i) => { const list = POOL[group], g = list[hash(day + ':' + group) % list.length], n = need(g.kind);
      return { id: group, kind: g.kind, title: g.title(n), need: n, have: 0, done: false, metal: Math.round(CFG.metalBase * (1 + classStep()) * (i === 0 ? 1 : 1.5)) }; });
    return { day, goals, base: counters(), seen: {}, bonusPaid: false };
  }
  function doc() {
    let d = saveState.doc.daily; const day = today();
    if (!d || d.v !== 1) d = saveState.doc.daily = { v: 1, board: null, week: null };
    if (!d.board || d.board.day !== day) d.board = post(day);
    const wk = weekOf(day);
    if (!d.week || d.week.week !== wk) { const w = weekly(wk); d.week = { week: wk, id: w?.id || null, base: w ? warlordDefeats(w.id) : 0, paid: false }; }
    return d;
  }
  function weekly(wk = weekOf(today())) { const list = window.capitalEndgame?.warlords?.() || []; return list.length ? list[wk % list.length] : null; }
  function pay(goal) {
    goal.done = true; hubs.metal = hubs.metal + goal.metal; const bd = doc().board; bd.paid = (bd.paid || 0) + goal.metal; window.eliteMarks?.grant?.(CFG.goalCore, 'daily goal');
    garage.banner(`DAILY · ${goal.title} · +${goal.metal.toLocaleString()} metal`, 'good');
    const b = doc().board; if (!b.bonusPaid && b.goals.every(g => g.done)) { b.bonusPaid = true; window.eliteMarks?.grant?.(CFG.allBonus, 'all three daily goals'); }
    saveState.save(); refresh();
  }
  function bump(kind, by = 1) {
    const b = doc().board, g = b.goals.find(x => x.kind === kind && !x.done); if (!g) return;
    g.have = Math.min(g.need, g.have + by); if (g.have >= g.need) pay(g); else if (kind !== 'kills' || g.have % 5 === 0) saveState.save();
  }
  // counts that live elsewhere (holds, rifts, jobs, the warlord) are read against the day's or week's baseline
  function check() {
    const d = doc(), b = d.board, c = counters();
    for (const g of b.goals) { if (g.done) continue; const now = g.kind === 'hold' ? c.holds - b.base.holds : g.kind === 'rift' ? c.rifts - b.base.rifts : g.kind === 'job' ? c.jobs - b.base.jobs : null; if (now != null && now > g.have) { g.have = Math.min(g.need, now); if (g.have >= g.need) pay(g); } }
    const w = d.week; if (w.id && !w.paid && warlordDefeats(w.id) > w.base) { w.paid = true; hubs.metal = hubs.metal + CFG.warlordMetal; window.eliteMarks?.grant?.(CFG.warlordCores, 'the warlord of the week'); garage.banner(`WARLORD OF THE WEEK DOWN · +${CFG.warlordMetal.toLocaleString()} metal`, 'good'); saveState.save(); refresh(); }
  }
  function warlordRoute() { const w = weekly(); if (!w) return false; const sys = capitalEndgame.warlordSystem(w); const ok = window.saga?.routeTo?.({ sys: sys.id, kind: 'station' }); notice = ok ? `Route plotted to ${sys.name}. The warlord roams its outer null-band sectors.` : `${sys.name} is not charted yet. Explore toward it.`; refresh(); return ok; }
  const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
  function render() {
    const d = doc(), b = d.board, host = el('section', null, 'daily'); host.id = 'daily-board'; host.style.cssText = 'display:grid;gap:8px;margin-bottom:14px';
    const left = DAY - (Date.now() % DAY), h = Math.floor(left / 3600000), m = Math.floor(left % 3600000 / 60000);
    host.append(el('small', `DAILY BOARD · new goals in ${h} h ${m} min`, 'qm-kicker'));
    if (notice) host.append(el('p', notice, 'qm-notice'));
    for (const g of b.goals) { const row = el('p', `${g.done ? '✓' : '○'} ${g.title} · ${g.have}/${g.need} · ${g.metal.toLocaleString()} metal + ${CFG.goalCore} elite core`); row.dataset.dailyGoal = g.id; if (g.done) row.style.opacity = '.6'; host.append(row); }
    host.append(el('p', b.bonusPaid ? `✓ All three done: +${CFG.allBonus} elite cores paid` : `All three: +${CFG.allBonus} elite cores more`, 'path-note'));
    const w = weekly(), wk = d.week;
    if (w) { const sys = capitalEndgame.warlordSystem(w), head = el('h4', 'Warlord of the week'); const who = w.name.includes(w.civ) ? w.name : `${w.name}, titan of ${w.civ}`; const line = el('p', `${who} roams ${sys.name} for now (warlords move on). ${wk.paid ? '✓ Brought down this week.' : `Bring it down this week: +${CFG.warlordCores} elite cores and ${CFG.warlordMetal.toLocaleString()} metal, on top of its relic.`}`);
      const btn = el('button', 'Plot route'); btn.type = 'button'; btn.id = 'daily-warlord-route'; btn.onclick = warlordRoute; btn.disabled = wk.paid; host.append(head, line, btn); }
    return host;
  }
  function refresh() { try { window.pilotRpg?.refresh?.(); } catch (e) { } }
  function install() {
    if (!window.pilotRpg?.registerJournalSection || !window.capitalEndgame?.ready || !window.eliteMarks?.ready || typeof engine === 'undefined' || !saveState.doc) { setTimeout(install, 80); return; }
    pilotRpg.registerJournalSection(render, { id: 'daily', label: 'Daily board' });
    const kill = engine.killEnemy; engine.killEnemy = function (i, ...a) { const e = this.enemies[i]; try { if (e && !e.training && !e.holoTest && !e.split) { bump('kills'); if (e.elite || e.isBoss || e.capital) bump('elites'); } } catch (er) { } return kill.call(this, i, ...a); };
    const enter = engine.enterChamber; engine.enterChamber = function (...a) { const r = enter.apply(this, a); try { const ch = worldMap.getCurrentChamber(), key = galaxy.currentId + ':' + ch.gridX + ',' + ch.gridY, b = doc().board; if (!ch.isHaven && !b.seen[key]) { b.seen[key] = 1; bump('sectors'); } } catch (e) { } return r; };
    setInterval(() => { try { if (saveState.doc.launched) check(); } catch (e) { } }, 1000);
    doc(); ready = true;
  }
  window.dailyBoard = { CFG, POOL, doc, post, today, weekOf, weekly, check, bump, warlordRoute, render, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 500));
})();
