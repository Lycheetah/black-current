// Flight HUD. Reads the world and the camera projection; never writes game state.
import { getPlayer } from '../sim/world.js';
import { dist3 } from '../core/math.js';

const fmtDist = (m) => (m >= 10000 ? (m / 1000).toFixed(0) + ' km' : m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m');

export function createHud(root, world, view) {
  const el = (sel) => root.querySelector(sel);
  const shipName = el('[data-ship-name]'), shipLine = el('[data-ship-line]'), shipRole = el('[data-ship-role]');
  const speedNum = el('[data-speed]'), speedArc = el('[data-speed-arc]'), orderArc = el('[data-order-arc]'), orderTxt = el('[data-order]');
  const overview = el('[data-overview]'), brackets = el('[data-brackets]'), help = el('[data-help]'), toast = el('[data-toast]');
  const camMode = el('[data-cam-mode]');

  const ARC = 251.3; // semicircle length for r=80
  const marks = new Map();
  const entries = Object.entries(world.sector.landmarks).map(([id, lm]) => ({ id, ...lm }));
  entries.push({ id: 'sun', name: world.sector.blackSun.name, kind: 'anomaly', pos: world.sector.blackSun.pos });

  for (const lm of entries) {
    const b = document.createElement('div');
    b.className = 'bracket bracket-' + lm.kind;
    b.innerHTML = `<i></i><span>${lm.name.toUpperCase()}</span><em></em>`;
    brackets.appendChild(b);
    marks.set(lm.id, { b, dist: b.querySelector('em') });
  }

  let toastTimer = 0;
  let lastHull = null;
  return {
    toggleHelp() { help.classList.toggle('open'); },
    toast(msg) { toast.textContent = msg; toast.classList.add('show'); toastTimer = 2.5; },
    update(dt, rig) {
      const p = getPlayer(world);
      if (p.hullId !== lastHull) {
        lastHull = p.hullId;
        shipName.textContent = p.hull.name.toUpperCase();
        shipLine.textContent = `${p.hull.raceName} · ${p.hull.className}`;
        shipRole.textContent = p.hull.familyRole;
      }
      const frac = Math.min(1, p.speed / p.flight.maxSpeed);
      speedNum.textContent = Math.round(p.speed);
      speedArc.style.strokeDashoffset = String(ARC * (1 - frac));
      orderArc.style.strokeDashoffset = String(ARC * (1 - p.throttle));
      orderTxt.textContent = Math.round(p.throttle * 100) + '%';
      camMode.textContent = rig.chase ? 'CHASE CAM' : 'ORBIT CAM';

      const rows = entries.map((lm) => ({ lm, d: dist3(p.pos, lm.pos) })).sort((a, b) => a.d - b.d);
      overview.innerHTML = rows.map(({ lm, d }) =>
        `<tr class="ov-${lm.kind}"><td class="ov-icon"></td><td>${lm.name}</td><td>${lm.kind}</td><td class="ov-d">${fmtDist(d)}</td></tr>`).join('');

      for (const { lm, d } of rows) {
        const m = marks.get(lm.id);
        const s = view.project(lm.pos);
        if (!s || s.x < -50 || s.y < -50 || s.x > innerWidth + 50 || s.y > innerHeight + 50) { m.b.style.display = 'none'; continue; }
        m.b.style.display = '';
        m.b.style.transform = `translate(${s.x}px, ${s.y}px)`;
        m.dist.textContent = fmtDist(d);
      }
      if (toastTimer > 0 && (toastTimer -= dt) <= 0) toast.classList.remove('show');
    },
  };
}
