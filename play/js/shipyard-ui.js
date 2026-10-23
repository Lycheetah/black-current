/* The Shipyard's presentation layer. Reuses its node graph, editing operations,
 * roster, exporter and the game's renderer. No simulation or balance changes. */
(function () {
  'use strict';
  const yard = window.shipyard;
  if (!yard) throw new Error('The workshop requires shipyard.js');
  const copy = value => JSON.parse(JSON.stringify(value));
  const titles = { core: 'Hull core', cannon: 'Weapons', pod: 'Armour', shield: 'Shields', thruster: 'Engines', spike: 'Ramming', bay: 'Oddity · drones', siphon: 'Oddity · siphon', wing: 'Oddity · escorts', mender: 'Oddity · healer' };
  const ODD = ['bay', 'siphon', 'wing', 'mender'];
  const cleanPath = entry => entry.path.replace(/\/([^/]+)$/, '/clean/$1');
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const base = {};
  let artManifest = null, artFiles = new Map();
  for (const key of ['build', 'show', 'hide', 'testFlight', 'saveToRoster', 'duplicateSel']) base[key] = yard[key];
  Object.assign(yard, { category: 'all', search: '', undoStack: [], redoStack: [], _snapshot: null, _editing: false, _gesture: false, guides: false });

  function imageFor(node, index = 0) {
    return window.sprites && sprites.ready ? sprites.pick({ type: node.type, radius: node.radius, art: node.art }, index) : null;
  }
  function picture(entry, label) {
    if (!entry) return null;
    const image = document.createElement('img');
    image.src = cleanPath(entry);
    image.alt = label;
    image.loading = 'lazy';
    image.onerror = () => { image.onerror = null; image.src = entry.path; };
    return image;
  }
  function button(text, action, cls = '') {
    const el = document.createElement('button'); el.type = 'button'; el.textContent = text; el.className = cls; el.onclick = action; return el;
  }
  function labelFor(node) {
    if (node.type !== 'cannon') return titles[node.type] || node.type;
    const band = fleet.mountBand(node.radius);
    return band.cls.charAt(0) + band.cls.slice(1).toLowerCase() + ' mount';
  }
  yard.fitScale = function () {
    if (this.zoom) return this.zoom;
    return Math.max(0.06, Math.min(18, (Math.min(this.canvas.width, this.canvas.height) / 2 - 48) / Math.max(40, this.reach())));
  };
  yard.hitHandle = function (p, node) {
    if (!node || node.type === 'core') return false;
    const offset = node.radius / Math.SQRT2;
    return Math.hypot(p.x - node.dx - offset, p.y - node.dy - offset) <= 9 / this.fitScale();
  };
  yard.mirrorOf = node => ({ ...node, dy: -node.dy });
  yard.place = function (point) {
    if (!this.part) { this.sel = -1; this.paint(); return; }
    const p = this.snapCoords(point);
    const node = { dx: p.x, dy: p.y, radius: this.part.radius, type: this.part.type };
    if (this.part.art) node.art = this.part.art;
    if (this.part.quirk) { node.quirk = this.part.quirk; node.rarity = this.part.rarity; }
    this.sel = this.design.nodes.length;
    this.design.nodes.push(node);
    if (this.mirror && Math.abs(p.y) >= 4) this.design.nodes.push(this.mirrorOf(node));
    this.toast('Part mounted. Drag to position, or choose another part.');
    this.paint();
  };
  yard.edit = function (fn) {
    const previous = this._editing;
    this._editing = true;
    try { fn(); } finally { this._editing = previous; }
    this.paint();
  };
  yard.duplicateSel = function () {
    const art = this.design.nodes[this.sel]?.art;
    const original = this.design.nodes[this.sel];
    const count = this.design.nodes.length;
    this.edit(() => {
      base.duplicateSel.call(this);
      if (art) for (const node of this.design.nodes.slice(count)) node.art = art;
      if (original?.quirk) for (const node of this.design.nodes.slice(count)) { node.quirk = original.quirk; node.rarity = original.rarity; }
    });
  };
  yard.recordEdit = function () {
    if (this._editing || this._gesture) return;
    const next = JSON.stringify(this.design);
    if (this._snapshot && this._snapshot !== next) {
      this.undoStack.push(this._snapshot);
      if (this.undoStack.length > 60) this.undoStack.shift();
      this.redoStack.length = 0;
      this.saveDraft();
    }
    this._snapshot = next;
    for (const [id, enabled] of [['#sy-undo', this.undoStack.length], ['#sy-redo', this.redoStack.length]]) {
      const control = this.el?.querySelector(id); if (control) control.disabled = !enabled;
    }
  };
  yard.history = function (direction) {
    const from = direction === 'undo' ? this.undoStack : this.redoStack;
    const to = direction === 'undo' ? this.redoStack : this.undoStack;
    if (!from.length) return;
    to.push(JSON.stringify(this.design));
    this.design = JSON.parse(from.pop()); this._snapshot = JSON.stringify(this.design);
    this.sel = -1; this.part = null;
    this.syncFields(); this.saveDraft(); this.paint();
    this.toast(direction === 'undo' ? 'Change undone.' : 'Change restored.');
  };
  yard.renderNodes = function () {
    const signature = JSON.stringify(this.design.nodes);
    if (signature !== this._previewSignature) {
      this._previewSignature = signature;
      this._previewNodes = this.design.nodes.map(n => ({ ...n,
        currentDx: n.dx, currentDy: n.dy, targetDx: n.dx, targetDy: n.dy }));
    }
    return this._previewNodes;
  };

  yard.buildParts = function () {
    const host = this.el?.querySelector('#sy-parts'); if (!host) return;
    host.replaceChildren();
    const entries = fleet.equips().filter(p => (this.category === 'all' || p.type === this.category || (this.category === 'odd' && ODD.includes(p.type)))
      && (p.title + ' ' + p.desc).toLowerCase().includes(this.search.toLowerCase()));
    for (const part of entries) {
      const entry = imageFor({ type: part.type, radius: part.radius });
      const card = button('', () => {
        this.part = this.part?.type === part.type && this.part?.radius === part.radius
          ? null : { ...part, art: entry?.file };
        this.buildParts();
        this.toast(this.part ? 'Click an empty place on the ship to mount ' + part.title.replace(/ · .*$/, '') + '.' : 'Placement cancelled.');
        if (this.part && document.documentElement.classList.contains('mobile-layout')) this.phonePane('ship');
      }, 'p part-card');
      card.dataset.type = part.type; card.dataset.radius = part.radius;
      card.setAttribute('aria-pressed', String(this.part?.type === part.type && this.part?.radius === part.radius));
      const image = picture(entry, ''); if (image) card.append(image);
      const name = document.createElement('strong'); name.textContent = part.title.replace(/ · .*$/, '');
      const description = document.createElement('span');
      const band = part.type === 'cannon' ? fleet.mountBand(part.radius) : null;
      description.textContent = band ? (WEAPON_TYPES[band.weapon]?.title || band.weapon) : titles[part.type];
      const cost = document.createElement('small'); cost.textContent = part.cost + ' GP';
      card.title = part.desc.replace(/&deg;/g, '°'); card.append(name, description, cost); host.append(card);
    }
    if (!entries.length) {
      const empty = document.createElement('p'); empty.className = 'sy-empty'; empty.textContent = 'No matching parts. Try another category or search.'; host.append(empty);
    }
    const count = this.el.querySelector('#sy-catalog-count');
    if (count) {
      /* B4: the salvage hold, read from the save. Shapes recovered in the field. */
      const inv = (typeof saveState !== 'undefined' && saveState.doc.inventory) || [];
      const held = inv.reduce((a, p) => a + p.count, 0);
      count.textContent = entries.length + ' parts' + (held ? ` · hold ${held}` : '');
      count.title = held ? 'Salvage hold: ' + inv.map(p => `${p.type} r${p.radius} ×${p.count}`).join(', ') : '';
    }
  };
  yard.selectPartByIndex = function (index) { this.el?.querySelectorAll('#sy-parts .part-card')[index]?.click(); };
  yard.refreshRosterList = function () {
    const host = this.el?.querySelector('#sy-roster'); if (!host) return;
    host.replaceChildren();
    const store = this.savedRoster();
    for (const [id, design] of Object.entries(store)) {
      const row = document.createElement('div'); row.className = 'sy-roster-row';
      const load = button(design.frame || id, () => {
        this.design = copy(design); this.sel = -1; this.part = null; this.zoom = 0;
        this.syncFields(); this.paint(); this.toast('Loaded ' + (design.frame || id) + '.');
      });
      const remove = button('Delete', () => {
        if (row.dataset.confirm === 'yes') { this.deleteFromRoster(id); this.toast('Saved ship removed. Your open draft is unchanged.'); }
        else { row.dataset.confirm = 'yes'; remove.textContent = 'Confirm delete'; }
      }, 'sy-muted');
      row.append(load, remove); host.append(row);
    }
    if (!host.children.length) host.textContent = 'Your saved ships will appear here.';
  };
  yard.saveToRoster = function () {
    this.readFields();
    if (!this.design.frame.trim()) {
      this.el.querySelector('#sy-frame').focus(); this.toast('Give your ship a name before saving.', true); return;
    }
    if (!this.design.id) {
      const slug = this.design.frame.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'ship';
      let id = slug, n = 2;
      const store = this.savedRoster();
      while (store[id]) id = slug + '_' + n++;
      this.design.id = id; this.el.querySelector('#sy-id').value = id;
    }
    base.saveToRoster.call(this); this.saveDraft(); this.paint();
  };
  yard.testFlight = function () {
    this.readFields();
    if (window.fitting) {
      const reason = fitting.check(this.design);
      if (reason) { this.toast(reason, true); return; }
    }
    base.testFlight.call(this);
    if (window.bay) bay._restoreArt();
    document.body.classList.remove('workshop-open');
  };

  function setArt(node, file) {
    yard.edit(() => {
      const twin = yard.design.nodes.find(n => n !== node && n.type === node.type && n.dx === node.dx && n.dy === -node.dy && node.dy !== 0);
      if (file) node.art = file; else delete node.art;
      if (yard.mirror && twin) { if (file) twin.art = file; else delete twin.art; }
    });
  }
  yard.paintInspector = function () {
    const host = this.el.querySelector('#sy-inspector'); if (!host) return;
    const node = this.design.nodes[this.sel];
    const key = this.sel + ':' + (node?.type || 'none');
    if (this._inspectorKey !== key) {
      this._inspectorKey = key; host.replaceChildren();
      if (!node) {
        host.innerHTML = '<div class="sy-inspector-intro"><span class="sy-eyebrow">MAKE IT YOURS</span><h3>Every part has a place.</h3><p>Pick a part on the left, then click the workbench to mount it. Select a fitted part to change its size or appearance.</p><div class="sy-mini-diagram">＋</div><p>Mirror builds both sides together.<br>Undo lets you experiment.</p></div>';
        return;
      }
      host.innerHTML = '<span class="sy-eyebrow">SELECTED PART</span><h3 id="sy-selected-name"></h3><div id="sy-selected-picture"></div><p id="sy-selected-desc"></p><label for="sy-part-size">' + (node.type === 'cannon' ? 'Mount / weapon class' : 'Part size') + '</label><div id="sy-size-control"></div><div id="sy-part-facts"></div><div class="sy-part-actions"></div><h4>Appearance</h4><p class="sy-muted">The same fitting, with a different casting.</p><div id="sy-art-picker"></div>';
      const size = host.querySelector('#sy-size-control');
      if (node.type === 'cannon') {
        const select = document.createElement('select'); select.id = 'sy-part-size';
        for (const part of fleet.equips().filter(p => p.type === 'cannon')) {
          const option = document.createElement('option'); option.value = part.radius;
          option.textContent = part.title.replace(/ · .*$/, '') + ' · ' + (WEAPON_TYPES[fleet.mountBand(part.radius).weapon]?.title || ''); select.append(option);
        }
        select.onchange = () => this.resizeNode(this.sel, Number(select.value) - node.radius); size.append(select);
      } else if (node.type !== 'core') {
        const input = document.createElement('input'); input.type = 'range'; input.id = 'sy-part-size'; input.min = 6; input.max = 40; input.step = 1;
        input.oninput = () => this.resizeNode(this.sel, Number(input.value) - node.radius); size.append(input);
      } else size.textContent = 'The core anchors your ship.';
      if (node.type !== 'core') host.querySelector('.sy-part-actions').append(
        button('Duplicate', () => this.duplicateSel()), button('Remove', () => this.remove(this.sel), 'sy-danger'));
      const picker = host.querySelector('#sy-art-picker');
      picker.append(button('Automatic', () => setArt(node, null), 'sy-auto-art'));
      for (const entry of (sprites.byType[node.type] || [])) {
        const b = button('', () => setArt(node, entry.file), 'sy-art-choice');
        b.dataset.file = entry.file; b.title = entry.file; b.setAttribute('aria-label', 'Use casting ' + entry.file);
        const image = picture(entry, ''); if (image) b.append(image); picker.append(b);
      }
    }
    if (!node) return;
    host.querySelector('#sy-selected-name').textContent = labelFor(node);
    const band = node.type === 'cannon' ? fleet.mountBand(node.radius) : null;
    host.querySelector('#sy-selected-desc').textContent = band
      ? (WEAPON_TYPES[band.weapon]?.title || band.weapon) + ' · Larger mounts turn more slowly.'
      : ({ core: 'The centre that holds your build together.', pod: 'Adds hull protection.', shield: 'Adds shield capacity.', thruster: 'Propulsion fitting.', spike: 'A contact and ramming fitting.' }[node.type] || '');
    const input = host.querySelector('#sy-part-size');
    if (input && document.activeElement !== input) {
      if (input.tagName === 'SELECT' && !Array.from(input.options).some(o => Number(o.value) === node.radius)) {
        input.querySelector('[data-custom]')?.remove();
        const option = new Option('Custom · ' + band.cls.toLowerCase() + ' mount', String(node.radius)); option.dataset.custom = 'true'; input.add(option);
      }
      input.value = node.radius;
    }
    const facts = host.querySelector('#sy-part-facts');
    facts.textContent = fleet.costOfNode(node.type, node.radius) + ' GP' + (band ? ' · ' + Math.round(Math.max(HP_DEFAULTS.arcMin, HP_DEFAULTS.arcA - node.radius * HP_DEFAULTS.arcB) * 360 / Math.PI) + '° firing arc' : '');
    const entry = imageFor(node, this.sel), preview = host.querySelector('#sy-selected-picture');
    if (preview.dataset.file !== (entry?.file || 'none')) {
      preview.dataset.file = entry?.file || 'none'; preview.replaceChildren();
      const image = picture(entry, labelFor(node)); if (image) preview.append(image);
    }
    for (const b of host.querySelectorAll('.sy-art-choice')) b.setAttribute('aria-pressed', String(b.dataset.file === node.art));
    host.querySelector('.sy-auto-art').setAttribute('aria-pressed', String(!node.art));
  };

  yard.paintStats = function () {
    const stats = this.el?.querySelector('#sy-stats'); if (!stats) return;
    const b = this.budget(), guns = this.design.nodes.filter(n => n.type === 'cannon').length;
    const band = fleet.hullBand({ nodes: this.design.nodes });
    stats.innerHTML = '<span class="sy-ship-class">' + escapeHTML(band.cls) + '</span><span>' + guns + (guns === 1 ? ' weapon' : ' weapons') + ' · ' + this.design.nodes.length + ' parts</span>';
    const budget = this.el.querySelector('#sy-budget');
    budget.textContent = b.usedGP + ' / ' + (Number.isFinite(b.totalGP) ? b.totalGP : '∞') + ' GP' + (b.overGP ? ' · ' + (b.usedGP - b.totalGP) + ' over budget' : '');
    budget.classList.toggle('over-budget', b.overGP);
    this.el.querySelector('#sy-sockets').textContent = b.sockets + ' / ' + (Number.isFinite(b.maxSockets) ? b.maxSockets : '∞') + ' sockets';
    this.el.querySelector('#sy-workbench-state').textContent = this.part ? 'Placing ' + this.part.title.replace(/ · .*$/, '') : 'Select a part to refine your ship';
    const mount = this.el.querySelector('#sy-mount-selected'); if (mount) { mount.disabled = !this.part; mount.textContent = this.part ? 'Mount ' + this.part.title.replace(/ · .*$/, '') : 'Choose a part from Parts'; }
    this.paintInspector(); this.recordEdit();
  };
  yard.queuePaint = function () {
    if (this._paintQueued) return;
    this._paintQueued = true;
    requestAnimationFrame(() => { this._paintQueued = false; if (this.open) this.paint(); });
  };
  yard.paint = function () {
    if (!this.ctx || !this.el?.classList.contains('shipyard-workshop')) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const W = Math.round(rect.width), H = Math.round(rect.height);
    if (this.canvas.width !== W || this.canvas.height !== H) { this.canvas.width = W; this.canvas.height = H; }
    const ctx = this.ctx, fit = this.fitScale();
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0b121b'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(fit, fit);
    if (this.guides) {
      ctx.strokeStyle = 'rgba(126,165,190,.10)'; ctx.lineWidth = 1 / fit; ctx.beginPath();
      const step = 20;
      for (let x = -Math.ceil(W / fit / 2 / step) * step; x < W / fit / 2; x += step) { ctx.moveTo(x, -H / fit); ctx.lineTo(x, H / fit); }
      for (let y = -Math.ceil(H / fit / 2 / step) * step; y < H / fit / 2; y += step) { ctx.moveTo(-W / fit, y); ctx.lineTo(W / fit, y); }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(138,168,194,.10)'; ctx.lineWidth = 1 / fit; ctx.beginPath();
    ctx.moveTo(-W / fit, 0); ctx.lineTo(W / fit, 0); ctx.moveTo(0, -H / fit); ctx.lineTo(0, H / fit); ctx.stroke();
    const selected = this.design.nodes[this.sel];
    if (selected?.type === 'cannon') {
      const arc = Math.max(HP_DEFAULTS.arcMin, HP_DEFAULTS.arcA - selected.radius * HP_DEFAULTS.arcB);
      const angle = Math.atan2(selected.dy, selected.dx);
      ctx.beginPath(); ctx.moveTo(selected.dx, selected.dy);
      ctx.arc(selected.dx, selected.dy, 72, angle - arc, angle + arc); ctx.closePath();
      ctx.fillStyle = 'rgba(100,210,209,.06)'; ctx.fill(); ctx.strokeStyle = 'rgba(100,210,209,.18)'; ctx.stroke();
    }
    const nodes = this.renderNodes(), core = nodes.find(n => n.type === 'core');
    if (artManifest !== sprites.manifest) {
      artManifest = sprites.manifest;
      artFiles = new Map(Object.values(sprites.byType).flat().map(entry => [entry.file, entry]));
    }
    const nativeDraw = ctx.drawImage;
    // The same renderer and dimensions, with original-resolution paint in the
    // paused editor. Combat's small cached bitmaps stay unchanged.
    ctx.drawImage = function (bitmap, ...args) {
      if (bitmap?._file && args.length === 2) {
        const entry = artFiles.get(bitmap._file);
        const original = entry && sprites.image(entry);
        if (original) return nativeDraw.call(this, original, ...args, bitmap.width, bitmap.height);
      }
      return nativeDraw.call(this, bitmap, ...args);
    };
    try {
      fluidShader.drawOrganismMembrane(ctx, 0, 0, 0, core?.radius || 18, nodes, this.design.color, {});
    } finally { ctx.drawImage = nativeDraw; }
    for (let i = 0; i < this.design.nodes.length; i++) {
      const n = this.design.nodes[i];
      if (i !== this.sel && i !== this.hovered) continue;
      ctx.beginPath(); ctx.arc(n.dx, n.dy, n.radius + 3 / fit, 0, Math.PI * 2);
      ctx.strokeStyle = i === this.sel ? '#d5f5ef' : '#67d3cc'; ctx.lineWidth = 2 / fit; ctx.stroke();
      if (i === this.sel && n.type !== 'core') {
        ctx.beginPath(); ctx.arc(n.dx + n.radius / Math.SQRT2, n.dy + n.radius / Math.SQRT2, 5 / fit, 0, Math.PI * 2);
        ctx.fillStyle = '#80eadc'; ctx.fill();
      }
    }
    ctx.restore();
    this.el.querySelector('#sy-zoom-label').textContent = Math.round(fit * 100) + '%';
    this.paintStats();
    this._watchedImages = this._watchedImages || new WeakSet();
    for (const image of sprites._img.values()) if (!image.complete && !this._watchedImages.has(image)) {
      this._watchedImages.add(image); image.addEventListener('load', () => this.queuePaint(), { once: true });
    }
  };

  yard.build = function () {
    if (this.el) return;
    base.build.call(this);
    const root = this.el;
    const preserved = new Map(Array.from(root.querySelectorAll('[id]')).map(el => [el.id, el]));
    root.classList.add('shipyard-workshop');
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'sy-title');
    root.innerHTML = `
      <header class="sy-header"><div><span class="sy-eyebrow">BLACK CURRENT / DRYDOCK</span><h2 id="sy-title">The Shipyard<span>Build something that feels like yours.</span></h2></div><div id="sy-stats"></div><button id="sy-close" aria-label="Close the Shipyard">Close <kbd>Esc</kbd></button></header>
      <div class="sy-layout">
        <aside class="sy-library"><div class="sy-pane-heading"><h3>Parts library</h3><span id="sy-catalog-count"></span></div><input id="sy-search" type="search" placeholder="Find a part…" aria-label="Search parts"><div id="sy-categories"></div><div id="sy-parts"></div></aside>
        <main class="sy-workbench"><div class="sy-workbench-top"><span id="sy-workbench-state"></span><span class="sy-nose">NOSE →</span></div><div class="sy-canvas-wrap"></div><div class="sy-tools"><div id="sy-history-tools"></div><div id="sy-shape-tools"></div><div id="sy-zoom-tools"></div></div><p class="sy-workbench-hint">Drag to move · Wheel to zoom · Select a part to resize · Right-click to remove</p></main>
        <aside class="sy-details"><label for="sy-frame">Ship name</label><div id="sy-name-slot"></div><div id="sy-inspector"></div><details class="sy-finish" open><summary>Finish & ability</summary><div id="sy-swatches-slot"></div><div class="sy-finish-row"><div><label for="sy-color">Custom colour</label><div id="sy-color-slot"></div></div><div><label for="sy-sec">Ability</label><div id="sy-sec-slot"></div></div></div></details><details class="sy-fleet"><summary>Blueprints & saved ships</summary><h4>Start from a chassis</h4><div id="sy-archetypes-slot"></div><div id="sy-presets-slot"></div><h4>Your fleet</h4><div id="sy-roster-slot"></div></details><details class="sy-advanced"><summary>Import / export</summary><div id="sy-internal-fields" hidden></div><div id="sy-io-buttons"></div><div id="sy-io-slot"></div></details></aside>
      </div>
      <footer class="sy-footer"><div class="sy-budget-summary"><strong id="sy-budget"></strong><span id="sy-sockets"></span></div><div id="sy-toast" role="status" aria-live="polite"></div><div id="sy-primary-actions"></div></footer>`;
    const move = (id, selector) => { const el = preserved.get(id); if (el) root.querySelector(selector).append(el); return el; };
    move('sy-canvas', '.sy-canvas-wrap');
    for (const [id, destination] of [['sy-frame','#sy-name-slot'], ['sy-swatches','#sy-swatches-slot'], ['sy-color','#sy-color-slot'], ['sy-sec','#sy-sec-slot'], ['sy-archetypes','#sy-archetypes-slot'], ['sy-presets','#sy-presets-slot'], ['sy-roster','#sy-roster-slot'], ['sy-io','#sy-io-slot']]) move(id, destination);
    for (const id of ['sy-id', 'sy-mark', 'sy-weapon']) move(id, '#sy-internal-fields');
    for (const id of ['sy-export','sy-copy','sy-import']) move(id, '#sy-io-buttons');
    for (const [id,text] of [['sy-mirror','Mirror'],['sy-guides','Grid'],['sy-snap','Angle snap']]) { const el = move(id, '#sy-shape-tools'); el.textContent = text; }
    for (const id of ['sy-zout','sy-zin','sy-zfit']) move(id, '#sy-zoom-tools');
    const zoom = document.createElement('span'); zoom.id = 'sy-zoom-label'; root.querySelector('#sy-zoom-tools').prepend(zoom);
    for (const [id,text] of [['sy-clear','New ship'],['sy-save','Save ship'],['sy-fly','Fly this ship']]) { const el = move(id, '#sy-primary-actions'); el.textContent = text; }
    const clear = root.querySelector('#sy-clear').onclick;
    root.querySelector('#sy-clear').onclick = () => this.edit(() => {
      clear(); this.part = null; this.zoom = 0; this.buildParts();
    });
    const compatibility = document.createElement('div'); compatibility.hidden = true;
    for (const id of ['sy-z11','sy-grow','sy-shrink','sy-dup','sy-del']) { const el = preserved.get(id); if (el) compatibility.append(el); }
    root.append(compatibility);
    root.querySelector('#sy-close').onclick = () => this.hide();
    const phoneTabs = document.createElement('nav'); phoneTabs.id = 'sy-phone-tabs'; phoneTabs.setAttribute('aria-label', 'Shipyard views');
    this.phonePane = pane => {
      root.dataset.phonePane = pane; root.classList.remove('show-inspector');
      for (const tab of phoneTabs.children) tab.setAttribute('aria-pressed', String(tab.dataset.pane === pane));
      this.queuePaint();
    };
    for (const [pane, title] of [['parts', 'Parts'], ['ship', 'Ship'], ['details', 'Details']]) {
      const tab = button(title, () => this.phonePane(pane)); tab.dataset.pane = pane; tab.id = 'sy-tab-' + pane; phoneTabs.append(tab);
    }
    root.querySelector('.sy-header').append(phoneTabs); this.phonePane('ship');
    const mount = button('Mount selected part', () => {
      if (!this.part) return;
      const core = this.design.nodes.find(n => n.type === 'core'), r = this.part.radius;
      let point = null;
      for (let ring = (core?.radius || 20) + r; ring < 360 && !point; ring += 12) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
          const p = { x: Math.round(Math.cos(a) * ring), y: Math.round(Math.sin(a) * ring) };
          if (this.design.nodes.every(n => Math.hypot(p.x - n.dx, p.y - n.dy) >= (r + n.radius) * .85)) { point = p; break; }
        }
      }
      if (point) { this.place(point); this.part = null; this.zoom = 0; this.buildParts(); this.paint(); }
    });
    mount.id = 'sy-mount-selected'; root.querySelector('.sy-workbench').append(mount);
    const details = button('Details', () => this.phonePane('details')); details.id = 'sy-detail-toggle';
    root.querySelector('#sy-close').before(details);
    for (const [id,text,direction] of [['sy-undo','Undo','undo'],['sy-redo','Redo','redo']]) {
      const b = button(text, () => this.history(direction)); b.id = id; b.title = direction === 'undo' ? 'Ctrl+Z' : 'Ctrl+Shift+Z'; root.querySelector('#sy-history-tools').append(b);
    }
    for (const [type,name] of [['all','All parts'],['cannon','Weapons'],['pod','Armour'],['shield','Shields'],['thruster','Engines'],['spike','Ramming'],['odd','Oddities ✦']]) {
      const b = button(name, () => { this.category = type; this.buildParts(); for (const c of b.parentElement.children) c.setAttribute('aria-pressed', String(c === b)); });
      b.dataset.category = type; b.setAttribute('aria-pressed', String(type === 'all')); root.querySelector('#sy-categories').append(b);
    }
    root.querySelector('#sy-search').oninput = e => { this.search = e.target.value; this.buildParts(); };
    root.querySelector('#sy-frame').placeholder = 'Name your ship';
    root.querySelector('#sy-guides').classList.remove('hot');
    root.querySelector('#sy-mirror').onclick = e => { this.mirror = !this.mirror; e.currentTarget.classList.toggle('hot', this.mirror); e.currentTarget.setAttribute('aria-pressed', String(this.mirror)); this.paint(); };
    root.querySelector('#sy-guides').onclick = e => { this.guides = !this.guides; e.currentTarget.classList.toggle('hot', this.guides); e.currentTarget.setAttribute('aria-pressed', String(this.guides)); this.paint(); };
    root.querySelector('#sy-snap').onclick = e => { this.angleSnap = !this.angleSnap; e.currentTarget.classList.toggle('hot', this.angleSnap); this.paint(); };
    this.canvas.tabIndex = 0; this.canvas.setAttribute('aria-label', 'Ship workbench. Choose a part, then click to mount it.');
    this.canvas.addEventListener('wheel', e => { e.preventDefault(); e.stopImmediatePropagation(); this.zoom = Math.max(0.06, Math.min(20, this.fitScale() * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); this.paint(); }, { capture: true, passive: false });
    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('pointerdown', e => { e.preventDefault(); this._gesture = true; }, true);
    this.el.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    this.el.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
    const finish = () => { this._gesture = false; this.drag = -1; this.dragHandle = false; this.paint(); };
    for (const event of ['pointerup','pointercancel','lostpointercapture']) this.canvas.addEventListener(event, finish);
    this._resizeObserver = new ResizeObserver(() => this.queuePaint()); this._resizeObserver.observe(this.canvas);
    this._snapshot = JSON.stringify(this.design); this.buildParts(); this.refreshRosterList();
  };
  yard.show = function () {
    if (this.open) return;
    this._wasPaused = engine.paused; this._previousFocus = document.activeElement; this._inspectorKey = null;
    base.show.call(this); document.body.classList.add('workshop-open'); this.queuePaint();
    this.phonePane('ship');
    this.el.querySelector('#sy-close').focus();
    if (!sprites.ready && !this._waitingForArt) {
      this._waitingForArt = true;
      let attempts = 0;
      const wait = () => {
        if (sprites.ready) { this._waitingForArt = false; this.buildParts(); this.queuePaint(); }
        else if (this.open && attempts++ < 40) setTimeout(wait, 100);
        else this._waitingForArt = false;
      };
      wait();
    }
  };
  yard.hide = function () {
    const paused = this._wasPaused;
    base.hide.call(this); engine.paused = paused;
    document.body.classList.remove('workshop-open'); this._previousFocus?.focus?.();
  };
  // B, Y, Tab and the visible button all lead to this same workshop.
  if (window.bay) {
    bay.show = () => {
      if (!yard.open) {
        const saved = saveState.doc.design || {};
        yard.design = { ...copy(saved), color: engine.player.color, primaryWeapon: engine.player.primaryWeapon, secAbility: engine.player.secAbility,
          nodes: engine.player.nodes.map(n => ({ dx: n.targetDx, dy: n.targetDy, radius: n.radius, type: n.type, ...(n.art ? { art: n.art } : {}), ...(n.quirk ? { quirk: n.quirk, rarity: n.rarity } : {}) })) };
      }
      yard.show();
    };
    bay.toggle = () => yard.open ? yard.hide() : bay.show();
    bay.close = () => yard.hide();
  }
  window.addEventListener('keydown', e => {
    const field = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable;
    if (!yard.open) {
      if (!field && (e.code === 'KeyY' || e.code === 'Tab')) { e.preventDefault(); e.stopImmediatePropagation(); yard.show(); }
      return;
    }
    if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); yard.hide(); return; }
    if (e.code === 'Tab') {
      const items = Array.from(yard.el.querySelectorAll('button,input,select,textarea,summary,[tabindex="0"]')).filter(el => !el.disabled && el.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      e.stopImmediatePropagation(); return;
    }
    e.stopImmediatePropagation();
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') { e.preventDefault(); yard.saveToRoster(); return; }
    if (field) return;
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); yard.history(e.shiftKey ? 'redo' : 'undo'); return; }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') { e.preventDefault(); yard.history('redo'); return; }
    const actions = {
      KeyY: () => yard.hide(), KeyM: () => yard.el.querySelector('#sy-mirror').click(), KeyG: () => yard.el.querySelector('#sy-guides').click(),
      KeyS: () => yard.el.querySelector('#sy-snap').click(), KeyD: () => yard.duplicateSel(), Delete: () => yard.remove(yard.sel), Backspace: () => yard.remove(yard.sel),
      ArrowLeft: () => yard.nudgeSel(e.shiftKey ? -8 : -2, 0), ArrowRight: () => yard.nudgeSel(e.shiftKey ? 8 : 2, 0),
      ArrowUp: () => yard.nudgeSel(0, e.shiftKey ? -8 : -2), ArrowDown: () => yard.nudgeSel(0, e.shiftKey ? 8 : 2),
      BracketLeft: () => yard.resizeSel(-2), BracketRight: () => yard.resizeSel(2)
    };
    if (actions[e.code]) { e.preventDefault(); actions[e.code](); }
    else if (/^Digit[1-5]$/.test(e.code)) { e.preventDefault(); yard.selectPartByIndex(Number(e.code.slice(-1)) - 1); }
    else if (e.code === 'Enter' && e.ctrlKey) { e.preventDefault(); yard.testFlight(); }
  }, true);
  window.addEventListener('load', () => {
    if (sprites.ready && yard.el) yard.buildParts();
    document.addEventListener('click', e => {
      if (e.target.closest('#btn-title-launch,#btn-title-continue') && window.bay) bay._restoreArt();
    });
  });
})();
