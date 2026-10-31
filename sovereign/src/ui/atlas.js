// Scanner Atlas panel: signature list, stage guidance, ping, approach, harmonic tuning and resolve.
// Reads world.atlas; sends orders (ping, atlasSelect, tune, resolve, nav).
import { MATERIAL_CATALOG } from '../data/progression/materials.js';
import { getPlayer } from '../sim/world.js';
import { SCAN_RANGE, DETECT_RANGE } from '../sim/scanner.js';
import { dist3 } from '../core/math.js';

const fmt = (m) => (m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m');
const STAGE_LABEL = { detected: 'DETECTED', triangulated: 'TRIANGULATED', scanned: 'SCANNED', understood: 'UNDERSTOOD', resolved: 'RESOLVED' };
const STEPS = ['detected', 'triangulated', 'scanned', 'understood', 'resolved'];

export function createAtlasPanel(root, world, act) {
  const list = root.querySelector('[data-at-list]'), detail = root.querySelector('[data-at-detail]');
  const pingBtn = root.querySelector('[data-at-ping]'), resEl = root.querySelector('[data-at-research]');
  const wave = document.createElement('canvas');
  wave.width = 300; wave.height = 64; wave.className = 'at-wave';
  let sig_ = '', tuning = 0.5;

  pingBtn.addEventListener('click', () => act({ type: 'ping' }));
  list.addEventListener('click', (e) => { const r = e.target.closest('[data-sig]'); if (r) act({ type: 'atlasSelect', id: r.dataset.sig }); });
  detail.addEventListener('click', (e) => {
    const b = e.target.closest('[data-at-act]');
    if (!b) return;
    const id = world.atlas.activeId;
    if (b.dataset.atAct === 'approach') act({ type: 'nav', mode: 'approach', targetId: 'sig:' + id, range: SCAN_RANGE * 0.5 });
    if (b.dataset.atAct === 'resolve') act({ type: 'resolve', id });
  });
  detail.addEventListener('input', (e) => { if (e.target.matches('[data-at-tune]')) { tuning = Number(e.target.value); act({ type: 'tune', value: tuning }); } });
  addEventListener('keydown', (e) => {
    if (e.code !== 'Minus' && e.code !== 'Equal') return;
    const s = world.atlas.sigs[world.atlas.activeId];
    if (s?.stage !== 'scanned') return;
    tuning = Math.max(0, Math.min(1, tuning + (e.code === 'Equal' ? 0.01 : -0.01)));
    const slider = detail.querySelector('[data-at-tune]'); if (slider) slider.value = tuning;
    act({ type: 'tune', value: tuning });
  });

  function drawWave(sig, t) {
    const c = wave.getContext('2d'), W = wave.width, H = wave.height;
    c.clearRect(0, 0, W, H);
    const draw = (freq, color, width) => {
      c.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const y = H / 2 + Math.sin((x / W) * Math.PI * 2 * (2 + freq * 6) + t * 3) * (H * 0.32) * Math.sin((x / W) * Math.PI);
        x ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.strokeStyle = color; c.lineWidth = width; c.stroke();
    };
    // The signal's own shape is shown faintly; the pilot's tuning is drawn over it.
    draw(sig.tune.target, 'rgba(255,197,107,0.55)', 2);
    const m = sig.tune.match;
    draw(sig.tune.value, `rgba(${Math.round(101 + 154 * m)},${Math.round(245 - 48 * m)},255,0.95)`, 1.5);
  }

  return {
    toggle() { root.classList.toggle('open'); },
    update(t) {
      const p = getPlayer(world);
      const A = world.atlas;
      const sigs = Object.values(A.sigs).filter((s) => s.stage !== 'hidden');
      root.classList.toggle('empty', sigs.length === 0);
      resEl.textContent = world.research;
      const cd = A.pingCooldown;
      pingBtn.textContent = cd > 0 ? `PING ${cd.toFixed(1)}s` : 'PING  [P]';
      pingBtn.disabled = cd > 0;
      list.innerHTML = sigs.map((s) => {
        const d = dist3(p.pos, s.stage === 'detected' ? s.center : s.pos);
        const known = ['scanned', 'understood', 'resolved'].includes(s.stage);
        return `<div class="at-row${s.id === A.activeId ? ' sel' : ''} st-${s.stage}" data-sig="${s.id}">
          <b>${s.def.code}</b><span>${known ? s.def.name : s.def.detectedName}</span>
          <em>${known ? s.def.type : 'UNKNOWN'}</em><i>${s.stage === 'detected' ? '~' + fmt(d) + ' ±' + fmt(s.radius) : fmt(d)}</i></div>`;
      }).join('') || `<div class="at-none">No signatures within ${fmt(DETECT_RANGE)}. Fly out from Asterion to listen.</div>`;

      const s = A.sigs[A.activeId];
      if (!s || s.stage === 'hidden') { detail.innerHTML = ''; sig_ = ''; return; }
      const d = dist3(p.pos, s.pos);
      const key = s.id + ':' + s.stage;
      if (key !== sig_) {
        sig_ = key;
        const known = STEPS.indexOf(s.stage) >= 2;
        const steps = STEPS.map((st, i) => `<i class="${STEPS.indexOf(s.stage) >= i ? 'done' : ''}">${STAGE_LABEL[st]}</i>`).join('');
        let body = '';
        if (s.stage === 'detected') body = `<p>Ping from spread-out positions: each reading from a new angle shrinks the sphere onto the source.</p><div class="at-bar"><u data-at-q></u></div><button data-at-act="approach">FLY TO ESTIMATE</button>`;
        if (s.stage === 'triangulated') body = `<p>Source located. Fly within ${fmt(SCAN_RANGE)} and slow below half speed to scan.</p><div class="at-bar"><u data-at-scan></u></div><button data-at-act="approach">APPROACH SIGNATURE</button>`;
        if (s.stage === 'scanned') { body = `<p>${s.def.desc}</p><p class="at-tip">Tune the harmonic until your trace (blue) lies on the signal (gold), and hold it. Slider or <kbd>-</kbd> <kbd>=</kbd>.</p><div data-at-wavehost></div><input type="range" min="0" max="1" step="0.002" value="${s.tune.value}" data-at-tune><div class="at-bar"><u data-at-hold></u></div>`; tuning = s.tune.value; }
        if (s.stage === 'understood') body = `<p>${s.def.desc}</p><p class="at-tip">The pattern is understood. Resolve it within ${fmt(SCAN_RANGE * 1.5)} to recover what it holds.</p><button class="at-resolve" data-at-act="resolve">RESOLVE</button>`;
        if (s.stage === 'resolved') body = `<p class="at-lore">${s.def.resolved}</p><div class="at-reward">+${s.def.research} RESEARCH · ${Object.entries(s.def.materials).map(([k, v]) => `${v} ${MATERIAL_CATALOG[k]?.name || k}`).join(' · ')}</div>`;
        detail.innerHTML = `<h3>${s.def.code} · ${known ? s.def.name : s.def.detectedName}</h3><div class="at-steps">${steps}</div>${body}`;
        detail.querySelector('[data-at-wavehost]')?.appendChild(wave);
      }
      const q = detail.querySelector('[data-at-q]'); if (q) q.style.width = Math.round(s.quality * 100 / 0.85) + '%';
      const sc = detail.querySelector('[data-at-scan]'); if (sc) { sc.style.width = Math.round(s.scan * 100) + '%'; sc.parentElement.classList.toggle('far', d > SCAN_RANGE); }
      const h = detail.querySelector('[data-at-hold]'); if (h) h.style.width = Math.round((s.tune.hold / 1.5) * 100) + '%';
      if (s.stage === 'scanned') drawWave(s, t);
      const rb = detail.querySelector('.at-resolve'); if (rb) rb.disabled = d > SCAN_RANGE * 1.5;
    },
  };
}
