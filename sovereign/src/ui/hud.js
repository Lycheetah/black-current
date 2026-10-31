// Flight and combat HUD. Reads the world and the camera projection; never writes game state.
// Clicks and taps become actions handed back to main.js, which turns them into sim orders.
import { getPlayer } from '../sim/world.js';
import { angularVelocity, findEntity, GROUPS } from '../sim/combat.js';
import { hitChance } from '../sim/combat-model.js';
import { dist3, len3 } from '../core/math.js';
import { anatomyMarkup, bindAnatomy, systemsMarkup, bindSystems } from './anatomy.js';

const fmtDist = (m) => (m >= 10000 ? (m / 1000).toFixed(0) + ' km' : m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m');
const ZONE_NAMES = { fore: 'FORE', aft: 'AFT', port: 'PORT', starboard: 'STBD' };
const SYS_NAMES = { engines: 'ENGINES', sensors: 'SENSORS', reactor: 'REACTOR', weapons_fore: 'FORE BATTERY', weapons_mid: 'MID BATTERY', weapons_aft: 'AFT BATTERY' };

export function createHud(root, world, view, act) {
  const el = (sel) => root.querySelector(sel);
  const shipName = el('[data-ship-name]'), shipLine = el('[data-ship-line]'), shipRole = el('[data-ship-role]');
  const speedNum = el('[data-speed]'), speedArc = el('[data-speed-arc]'), orderArc = el('[data-order-arc]'), orderTxt = el('[data-order]');
  const overview = el('[data-overview]'), brackets = el('[data-brackets]'), help = el('[data-help]'), toast = el('[data-toast]');
  const camMode = el('[data-cam-mode]'), navMode = el('[data-nav-mode]');
  const tPanel = el('[data-target]'), selfPanel = el('[data-self]'), groupsEl = el('[data-groups]');
  const opEl = el('[data-op]'), logEl = el('[data-log]'), floats = el('[data-floats]'), deathEl = el('[data-death]');
  const capBar = el('[data-cap]');

  tPanel.querySelector('[data-t-anatomy]').innerHTML = anatomyMarkup(true) + systemsMarkup();
  selfPanel.querySelector('[data-self-anatomy]').innerHTML = anatomyMarkup(false) + systemsMarkup();
  const drawTarget = bindAnatomy(tPanel), drawTargetSys = bindSystems(tPanel);
  const drawSelf = bindAnatomy(selfPanel), drawSelfSys = bindSystems(selfPanel);

  groupsEl.innerHTML = GROUPS.map((g, i) =>
    `<button class="grp" data-grp="${g}"><b>${i + 1}</b><span class="g-name">${g.toUpperCase()}</span><span class="g-guns"></span><span class="g-state"></span><i class="g-cd"></i></button>`).join('');
  for (const b of groupsEl.querySelectorAll('[data-grp]')) {
    b.addEventListener('click', (e) => act(e.shiftKey ? { type: 'groupAuto', group: b.dataset.grp } : { type: 'group', group: b.dataset.grp }));
    b.addEventListener('contextmenu', (e) => { e.preventDefault(); act({ type: 'groupAuto', group: b.dataset.grp }); });
  }
  for (const b of tPanel.querySelectorAll('[data-nav]')) b.addEventListener('click', () => act({ type: 'navTarget', mode: b.dataset.nav }));
  tPanel.querySelector('[data-unlock]').addEventListener('click', () => act({ type: 'unlock' }));
  overview.addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-id]');
    if (!row) return;
    act(row.dataset.ship ? { type: 'lock', targetId: Number(row.dataset.id) } : { type: 'navLandmark', id: row.dataset.id });
  });

  // Landmark brackets.
  const marks = new Map();
  const landmarks = Object.entries(world.sector.landmarks).map(([id, lm]) => ({ id, ...lm }));
  landmarks.push({ id: 'sun', name: world.sector.blackSun.name, kind: 'anomaly', pos: world.sector.blackSun.pos });
  const mkBracket = (cls, label) => {
    const b = document.createElement('div');
    b.className = 'bracket ' + cls;
    b.innerHTML = `<i></i><span>${label}</span><em></em><u class="hp"><s></s></u>`;
    brackets.appendChild(b);
    return { b, dist: b.querySelector('em'), hp: b.querySelector('.hp s') };
  };
  for (const lm of landmarks) marks.set('lm:' + lm.id, mkBracket('bracket-' + lm.kind, lm.name.toUpperCase()));

  const log = [];
  function pushLog(text, cls = '') {
    log.unshift({ text, cls });
    log.length = Math.min(log.length, 7);
    logEl.innerHTML = log.map((l) => `<div class="${l.cls}">${l.text}</div>`).join('');
  }
  function floatText(pos, text, cls) {
    const s = view.project(pos);
    if (!s) return;
    const d = document.createElement('div');
    d.className = 'float ' + cls;
    d.textContent = text;
    d.style.left = s.x + (Math.random() - 0.5) * 30 + 'px';
    d.style.top = s.y - 10 + 'px';
    floats.appendChild(d);
    setTimeout(() => d.remove(), 1100);
  }

  let toastTimer = 0, lastHull = null, lastSeq = 0, lastOv = 0;
  const shipLabel = (e) => `${e.hull.raceName} ${e.enemyClass ? e.enemyClass : e.hull.className}`.toUpperCase();

  function readEvents(p) {
    for (const ev of world.events) {
      if (ev.seq <= lastSeq) continue;
      lastSeq = ev.seq;
      const mine = ev.ownerId === world.playerId, onMe = ev.shipId === world.playerId;
      switch (ev.type) {
        case 'hit': {
          if (!mine && !onMe) break;
          const parts = [];
          if (ev.shield) parts.push(`<b class="c-sh">−${Math.round(ev.shield)} SH</b>`);
          if (ev.armour) parts.push(`<b class="c-ar">−${Math.round(ev.armour)} AR ${ZONE_NAMES[ev.zone]}</b>`);
          if (ev.structure) parts.push(`<b class="c-st">−${Math.round(ev.structure)} ST</b>`);
          if (ev.penetrated && ev.structure) parts.push('<b class="c-pen">PENETRATED</b>');
          if (ev.systemLoss > 0.04) parts.push(`<b class="c-sys">${SYS_NAMES[ev.system]} −${Math.round(ev.systemLoss * 100)}%</b>`);
          pushLog(`${mine ? '▶' : '◀'} ${parts.join(' ')}`, onMe ? 'incoming' : '');
          if (mine) {
            const total = ev.shield + ev.armour + ev.structure;
            floatText(ev.pos, Math.round(total), ev.structure ? 'f-st' : ev.armour ? 'f-ar' : 'f-sh');
          }
          break;
        }
        case 'locked': if (ev.shipId === world.playerId) pushLog('TARGET LOCKED', 'sys'); break;
        case 'destroyed':
          pushLog(ev.faction === 'hostile' ? `${ev.hullName.toUpperCase()} DESTROYED` : 'HULL LOST', ev.faction === 'hostile' ? 'kill' : 'incoming');
          break;
        case 'opStart': toast_(`OPERATION · ${ev.name.toUpperCase()}`); break;
        case 'opWave': toast_(`WAVE ${ev.wave} / ${ev.of} · ${ev.count} HOSTILES`); pushLog(`WAVE ${ev.wave} INBOUND`, 'incoming'); break;
        case 'opComplete': toast_(`OPERATION COMPLETE · +${ev.reward} SALVAGE`); pushLog(`+${ev.reward} SALVAGE`, 'kill'); break;
        case 'recovered': toast_('RECOVERED AT ASTERION FORGE'); break;
        case 'navManual': pushLog('MANUAL HELM', 'sys'); break;
      }
    }
  }
  function toast_(msg) { toast.textContent = msg; toast.classList.add('show'); toastTimer = 3; }

  return {
    toggleHelp() { help.classList.toggle('open'); },
    toast: toast_,
    update(dt, rig) {
      const p = getPlayer(world);
      readEvents(p);
      if (p.hullId !== lastHull) {
        lastHull = p.hullId;
        shipName.textContent = p.hull.name.toUpperCase();
        shipLine.textContent = `${p.hull.raceName} · ${p.hull.className}`;
        shipRole.textContent = p.hull.familyRole;
      }
      deathEl.classList.toggle('show', !!p.dead);
      if (p.dead) deathEl.querySelector('b').textContent = Math.ceil(world.respawnIn);

      const frac = Math.min(1, p.speed / p.flight.maxSpeed);
      speedNum.textContent = Math.round(p.speed);
      speedArc.style.strokeDashoffset = String(251.3 * (1 - frac));
      orderArc.style.strokeDashoffset = String(251.3 * (1 - p.throttle));
      orderTxt.textContent = Math.round(p.throttle * 100) + '%';
      camMode.textContent = rig.chase ? 'CHASE CAM' : 'ORBIT CAM';
      navMode.textContent = p.nav.mode === 'manual' ? 'MANUAL HELM' : `${p.nav.mode.toUpperCase()} ${p.nav.range ? fmtDist(p.nav.range) : ''}`;

      drawSelf(p.combat);
      drawSelfSys(p.combat.systems);
      capBar.style.width = Math.round((p.combat.cap.cur / p.combat.cap.max) * 100) + '%';

      // Target panel.
      const lockT = p.lock.targetId != null ? findEntity(world, p.lock.targetId) : null;
      tPanel.classList.toggle('show', !!lockT);
      if (lockT) {
        tPanel.querySelector('[data-t-name]').textContent = lockT.hull.name.toUpperCase();
        tPanel.querySelector('[data-t-line]').textContent = shipLabel(lockT);
        const d = dist3(p.pos, lockT.pos), ang = angularVelocity(p, lockT);
        tPanel.querySelector('[data-t-dist]').textContent = fmtDist(d);
        tPanel.querySelector('[data-t-vel]').textContent = Math.round(len3(lockT.vel)) + ' m/s';
        tPanel.querySelector('[data-t-ang]').textContent = ang.toFixed(3) + ' rad/s';
        const lk = tPanel.querySelector('[data-t-lock]');
        lk.style.width = Math.round(p.lock.progress * 100) + '%';
        tPanel.classList.toggle('locking', p.lock.progress < 1);
        drawTarget(lockT.combat);
        drawTargetSys(lockT.combat.systems);
        tPanel.querySelector('[data-t-hit]').innerHTML = p.weapons.map((w) =>
          `<span>${w.w.name.split(' ').slice(-1)[0].toUpperCase()} <b>${Math.round(hitChance(w.w, d, ang, lockT.flight.radius) * 100)}%</b></span>`).join('');
      }

      // Weapon groups.
      for (const b of groupsEl.querySelectorAll('[data-grp]')) {
        const g = b.dataset.grp, st = p.groups[g];
        const guns = p.weapons.filter((w) => w.group === g);
        b.classList.toggle('empty', guns.length === 0);
        b.classList.toggle('on', st.active && guns.length > 0);
        b.classList.toggle('auto', st.auto && guns.length > 0);
        b.querySelector('.g-guns').textContent = guns.length ? guns.map((w) => w.w.name.split(' ').slice(-1)[0]).join(' · ') : 'NO GUNS';
        b.querySelector('.g-state').textContent = !guns.length ? '' : st.auto ? 'AUTO' : st.active ? 'FIRING' : 'READY';
        const cd = guns.length ? Math.max(0, Math.min(1, guns[0].cooldown / guns[0].w.cycle)) : 0;
        b.querySelector('.g-cd').style.width = Math.round((1 - cd) * 100) + '%';
      }

      // Operation tracker.
      const op = world.op;
      const site = world.sector.landmarks[op.target];
      const opLine = op.stage === 'travel' ? `Fly to the ${site.name} · ${fmtDist(dist3(p.pos, site.pos))}`
        : op.stage === 'wave' ? `Wave ${op.wave + 1} / ${op.waves.length} · ${op.alive.length} hostile${op.alive.length === 1 ? '' : 's'} remain`
          : op.stage === 'interval' ? `Wave ${op.wave + 2} / ${op.waves.length} inbound…`
            : `Complete · +${op.reward} salvage`;
      opEl.innerHTML = `<div class="tag">${op.type.toUpperCase()}</div><h2>${op.name.toUpperCase()}</h2><div class="op-line">${opLine}</div><div class="op-sal">SALVAGE <b>${world.salvage}</b></div>`;
      opEl.classList.toggle('done', op.stage === 'complete');

      // Overview: ships first (hostiles), then landmarks; refreshed at 5 Hz.
      if ((lastOv -= dt) <= 0) {
        lastOv = 0.2;
        const ships = world.entities.filter((e) => e.kind === 'ship' && !e.dead && e.id !== world.playerId)
          .map((e) => ({ e, d: dist3(p.pos, e.pos) })).sort((a, b) => a.d - b.d);
        const lms = landmarks.map((lm) => ({ lm, d: dist3(p.pos, lm.pos) })).sort((a, b) => a.d - b.d);
        overview.innerHTML = ships.map(({ e, d }) =>
          `<tr data-id="${e.id}" data-ship="1" class="ov-ship ov-${e.faction}${p.lock.targetId === e.id ? ' ov-locked' : ''}"><td class="ov-icon"></td><td>${e.hull.name}</td><td>${e.enemyClass || e.hull.className}</td><td class="ov-d">${fmtDist(d)}</td></tr>`).join('')
          + lms.map(({ lm, d }) =>
            `<tr data-id="${lm.id}" class="ov-${lm.kind}${p.nav.targetId === lm.id ? ' ov-nav' : ''}"><td class="ov-icon"></td><td>${lm.name}</td><td>${lm.kind}</td><td class="ov-d">${fmtDist(d)}</td></tr>`).join('');
      }

      // Brackets: landmarks and ships.
      const seen = new Set();
      for (const lm of landmarks) {
        const m = marks.get('lm:' + lm.id);
        place(m, lm.pos, dist3(p.pos, lm.pos));
        seen.add('lm:' + lm.id);
      }
      for (const e of world.entities) {
        if (e.kind !== 'ship' || e.dead || e.id === world.playerId) continue;
        const key = 'sh:' + e.id;
        let m = marks.get(key);
        if (!m) {
          m = mkBracket('bracket-ship bracket-' + e.faction, (e.enemyClass || e.hull.className).toUpperCase());
          m.b.addEventListener('click', () => act({ type: 'lock', targetId: e.id }));
          marks.set(key, m);
        }
        seen.add(key);
        m.b.classList.toggle('locked', p.lock.targetId === e.id && p.lock.progress >= 1);
        m.b.classList.toggle('locking', p.lock.targetId === e.id && p.lock.progress < 1);
        const c = e.combat;
        m.hp.style.width = Math.round(((c.shield.cur + c.structure.cur) / (c.shield.max + c.structure.max)) * 100) + '%';
        place(m, e.pos, dist3(p.pos, e.pos));
      }
      for (const [k, m] of marks) if (!seen.has(k)) { m.b.remove(); marks.delete(k); }

      if (toastTimer > 0 && (toastTimer -= dt) <= 0) toast.classList.remove('show');
    },
  };

  function place(m, pos, d) {
    const s = view.project(pos);
    if (!s || s.x < -50 || s.y < -50 || s.x > innerWidth + 50 || s.y > innerHeight + 50) { m.b.style.display = 'none'; return; }
    m.b.style.display = '';
    m.b.style.transform = `translate(${s.x}px, ${s.y}px)`;
    m.dist.textContent = fmtDist(d);
  }
}
