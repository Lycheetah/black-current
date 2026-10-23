/* ============================================================================
   RETIRED 2026-08-17 — `OrganismDesigner`, the second ship editor.
   ============================================================================
   Mac's ruling: *"we only need one tool bro to do it properly."*

   THE ONE TOOL IS `js/shipyard.js`. This class is kept whole, not deleted,
   because a retirement is only honest if the thing retired can still be read
   back and compared against its replacement.

   ⛔ NOT LOADED. `index.html` does not reference this file. Do not re-add it.

   WHAT MOVED, AND WHERE IT LANDED — every feature of this class, by line:
     · GP budget        (126-140, 394-401) -> shipyard.budget() + the stat block
     · socket cap       (388-392)          -> shipyard.budget().maxSockets
     · HP readout       (475-483)          -> shipyard.budget().hp
     · presets + fleet  (251-290)          -> shipyard.buildPresets()
     · secondary list   (216-236)          -> shipyard.buildSecondaries()
     · primary list     (194-214)          -> shipyard.buildWeapons(), which
                                              reads WEAPON_TYPES directly and so
                                              can never drift from what fires
     · palette swatches (238-249)          -> the colour input; --primary-cyan is
                                              set by engine.applyDesign anyway
     · legacy save key  (452-459)          -> shipyard.commitLegacy()
     · ability HUD      (505-507)          -> shipyard.commitLegacy()
     · load saved ship  (461-473)          -> engine.js:423 (saveState.doc.design)
     · attach / remove  (348-445)          -> pointer events in shipyard.wire()
     · fitScale         (529-538)          -> shipyard.fitScale(), which also
                                              zooms IN; this one was shrink-only

   The DATA it declared did NOT move. `PRESET_DESIGNS`, the two catalogues and
   the cost tables all stay in `js/designer.js`, which is now a pure data file.
   Copying them here would have been the split this repo treats as fatal.
   ========================================================================== */

class OrganismDesigner {
  constructor() {
    this.builderCanvas = document.getElementById('designer-builder-canvas');
    this.builderCtx = this.builderCanvas.getContext('2d');
    
    this.currentDesign = {
      color: '#00f3ff',
      primaryWeapon: 'spitter',
      secAbility: 'shield',
      nodes: JSON.parse(JSON.stringify(PRESET_DESIGNS.balanced.nodes))
    };

    this.selectedOrganelle = ORGANELLE_TYPES[0];
    this.mode = 'attach'; // 'attach' | 'remove'
    this.initUI();
    this.loadSavedDesign();
  }

  calculateUsedGP() {
    let used = 0;
    this.currentDesign.nodes.forEach(node => {
      /* ⭐ COST FOLLOWS RADIUS NOW. A flat per-type price meant a 38px siege
         lance cost the same 20 GP as a 6px needle the moment the mount ladder
         made big guns placeable. Falls back to the flat table if fleet.js is
         absent, so an old save still totals exactly as it used to. */
      if (window.fleet && typeof fleet.costOfNode === 'function') {
        used += fleet.costOfNode(node.type, node.radius);
      } else {
        used += ORGANELLE_COSTS[node.type] || 0;
      }
    });
    return used;
  }

  initUI() {
    document.getElementById('btn-open-designer').addEventListener('click', () => {
      this.openDesigner();
    });

    document.getElementById('btn-save-designer').addEventListener('click', () => {
      this.saveAndApply();
    });

    const tabs = document.querySelectorAll('.d-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabId = tab.getAttribute('data-tab');
        document.getElementById('tab-organelles').style.display = tabId === 'organelles' ? 'block' : 'none';
        document.getElementById('tab-weapons').style.display = tabId === 'weapons' ? 'block' : 'none';
        document.getElementById('tab-secondaries').style.display = tabId === 'secondaries' ? 'block' : 'none';
        document.getElementById('tab-palette').style.display = tabId === 'palette' ? 'block' : 'none';
        document.getElementById('tab-presets').style.display = tabId === 'presets' ? 'block' : 'none';
      });
    });

    // Populate Organelles Catalog
    const ogCatContainer = document.getElementById('organelle-nodes-catalog');
    if (ogCatContainer) {
      ogCatContainer.innerHTML = '';
      /* ⭐ THE CATALOGUE IS GENERATED FROM THE MOUNT LADDER when fleet.js is
         present, so every card's traverse and arc figures are read from the
         same HP_DEFAULTS the guns actually use. The hand-written five below
         remain the fallback. */
      const catalogue = (window.fleet && typeof fleet.equips === 'function')
        ? fleet.equips() : ORGANELLE_TYPES;
      this.selectedOrganelle = catalogue[0] || this.selectedOrganelle;
      catalogue.forEach(og => {
        const card = document.createElement('div');
        card.className = `organelle-card ${og.id === this.selectedOrganelle.id ? 'selected' : ''}`;
        card.innerHTML = `
          <div class="og-header"><span class="og-icon">${og.icon}</span> <strong class="og-cost">${og.cost} GP</strong></div>
          <div class="og-title">${og.title}</div>
          <div class="og-desc">${og.desc}</div>
        `;
        card.addEventListener('click', () => {
          document.querySelectorAll('#organelle-nodes-catalog .organelle-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.selectedOrganelle = og;
        });
        ogCatContainer.appendChild(card);
      });
    }

    // Populate Primary Weapons
    const ogContainer = document.getElementById('weapons-catalog');
    if (ogContainer) {
      ogContainer.innerHTML = '';
      PRIMARY_WEAPONS_CATALOG.forEach(w => {
        const card = document.createElement('div');
        card.className = `organelle-card ${w.weaponType === this.currentDesign.primaryWeapon ? 'selected' : ''}`;
        card.innerHTML = `
          <span class="og-icon">${w.icon}</span>
          <div class="og-title">${w.title}</div>
          <div class="og-desc">${w.desc}</div>
        `;
        card.addEventListener('click', () => {
          document.querySelectorAll('#weapons-catalog .organelle-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.currentDesign.primaryWeapon = w.weaponType;
          this.renderBuilderCanvas();
        });
        ogContainer.appendChild(card);
      });
    }

    // Populate Secondary Actives
    const secContainer = document.getElementById('secondary-catalog');
    if (secContainer) {
      secContainer.innerHTML = '';
      SECONDARY_ACTIVES_CATALOG.forEach(s => {
        const card = document.createElement('div');
        card.className = `organelle-card ${s.secAbility === this.currentDesign.secAbility ? 'selected' : ''}`;
        card.innerHTML = `
          <span class="og-icon">${s.icon}</span>
          <div class="og-title">${s.title}</div>
          <div class="og-desc">${s.desc}</div>
        `;
        card.addEventListener('click', () => {
          document.querySelectorAll('#secondary-catalog .organelle-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.currentDesign.secAbility = s.secAbility;
          this.renderBuilderCanvas();
        });
        secContainer.appendChild(card);
      });
    }

    // Palette Swatches
    const swatches = document.querySelectorAll('#glow-palette .c-swatch');
    swatches.forEach(sw => {
      sw.addEventListener('click', () => {
        swatches.forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        const color = sw.getAttribute('data-color');
        this.currentDesign.color = color;
        document.documentElement.style.setProperty('--primary-cyan', color);
        this.renderBuilderCanvas();
      });
    });

    // Presets
    /* ⭐ THE FLEET ROSTER IS APPENDED TO THIS TAB, not substituted for it. The
       five hand-written presets stay exactly where players expect them; the
       twenty authored hulls arrive underneath with their class marks. Buttons
       are BUILT from `fleet.order`, so adding a hull to fleet.js puts it in
       this list with no HTML edit — ONE TRUTH, one place to author a ship. */
    const presetList = document.querySelector('.presets-list');
    if (presetList && window.fleet && fleet.order) {
      const hr = document.createElement('div');
      hr.style.cssText = 'margin:10px 0 6px;opacity:.55;font-size:11px;letter-spacing:.08em;';
      hr.textContent = '— THE FLEET —';
      presetList.appendChild(hr);

      fleet.order.forEach(key => {
        const hull = fleet.hulls[key];
        if (!hull) return;
        const btn = document.createElement('button');
        btn.className = 'btn btn-preset';
        btn.setAttribute('data-fleet', key);
        // ⛔ `frame`, never `name` — a hull owns a chassis, not a ship's name.
        btn.textContent = `${hull.mark} ${hull.frame}`;
        btn.title = hull.note;
        btn.addEventListener('click', () => {
          this.currentDesign = JSON.parse(JSON.stringify(hull));
          this.renderBuilderCanvas();
        });
        presetList.appendChild(btn);
      });
    }

    const presetBtns = document.querySelectorAll('.btn-preset[data-preset]');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const presetKey = btn.getAttribute('data-preset');
        if (PRESET_DESIGNS[presetKey]) {
          this.currentDesign = JSON.parse(JSON.stringify(PRESET_DESIGNS[presetKey]));
          this.renderBuilderCanvas();
        }
      });
    });

    // Export / Import .biotank
    document.getElementById('btn-export-code').addEventListener('click', () => {
      const jsonStr = JSON.stringify(this.currentDesign);
      navigator.clipboard.writeText(jsonStr).then(() => {
        alert('Copied .biotank design code string!');
      }).catch(() => {
        prompt('Copy your .biotank design code:', jsonStr);
      });
    });

    document.getElementById('btn-import-code').addEventListener('click', () => {
      const jsonStr = prompt('Paste your .biotank design code:');
      if (jsonStr) {
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed && parsed.nodes) {
            this.currentDesign = parsed;
            this.renderBuilderCanvas();
            alert('Organism design imported!');
          }
        } catch (e) {
          alert('Invalid .biotank design string!');
        }
      }
    });

    // Mode Toggle (Attach vs Remove for Touch / Mouse)
    const modeBtn = document.getElementById('btn-designer-mode');
    if (modeBtn) {
      modeBtn.addEventListener('click', () => {
        this.mode = this.mode === 'attach' ? 'remove' : 'attach';
        modeBtn.textContent = this.mode === 'attach' ? '➕ ATTACH MODE' : '🗑️ REMOVE MODE';
        modeBtn.classList.toggle('remove-mode', this.mode === 'remove');
      });
    }

    // Left Click / Touch Tap: Attach Node or Remove if tapping node/remove mode
    this.builderCanvas.addEventListener('click', e => {
      this.handleCanvasClick(e);
    });

    // Touch Tap handling directly on canvas
    this.builderCanvas.addEventListener('touchstart', e => {
      if (e.touches && e.touches.length > 0) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleCanvasClick(touch);
      }
    }, { passive: false });

    this.builderCanvas.addEventListener('contextmenu', e => {
      e.preventDefault();
      this.handleCanvasRightClick(e);
    });
  }

  handleCanvasClick(e) {
    const rect = this.builderCanvas.getBoundingClientRect();
    /* ⭐⭐ THE CLICK READS THE SAME SCALE THE DRAW USES — see `fitScale()`.
       ⛔ Never let these two drift apart. A tool that paints in one coordinate
       space and hit-tests in another places every socket in the wrong hole and
       gives no sign that it has. */
    const fit = this.fitScale();
    const clickX = (e.clientX - rect.left - this.builderCanvas.width / 2) / fit;
    const clickY = (e.clientY - rect.top - this.builderCanvas.height / 2) / fit;

    // Check if clicked directly on an existing non-core node
    let clickedNodeIndex = -1;
    let minD = 22;
    this.currentDesign.nodes.forEach((n, idx) => {
      if (n.type === 'core') return;
      const d = Math.hypot(n.dx - clickX, n.dy - clickY);
      if (d < minD) {
        minD = d;
        clickedNodeIndex = idx;
      }
    });

    // If in remove mode OR directly clicking an existing node, remove it and refund GP
    if (this.mode === 'remove' || (clickedNodeIndex !== -1 && this.mode === 'remove')) {
      if (clickedNodeIndex !== -1) {
        this.currentDesign.nodes.splice(clickedNodeIndex, 1);
        soundEngine.playBubblePop('small');
        this.renderBuilderCanvas();
      }
      return;
    }

    // If tapped existing node in attach mode, also allow quick removal if tapped directly
    if (clickedNodeIndex !== -1 && minD < 16) {
      this.currentDesign.nodes.splice(clickedNodeIndex, 1);
      soundEngine.playBubblePop('small');
      this.renderBuilderCanvas();
      return;
    }

    const evo = progression.getEvolutionData();
    if (this.currentDesign.nodes.length >= evo.maxSockets) {
      alert(`Max socket limit reached (${evo.maxSockets} Sockets) for ${evo.title} tier! Evolve to attach more.`);
      return;
    }

    const totalGP = progression.getTotalGP();
    const usedGP = this.calculateUsedGP();
    const cost = this.selectedOrganelle.cost;

    if (usedGP + cost > totalGP) {
      alert(`Not enough Gene Points (GP)! Need ${cost} GP (Available: ${totalGP - usedGP} GP). Gather mass to gain GP.`);
      return;
    }

    const angle = Math.atan2(clickY, clickX);
    const dist = 38;

    this.currentDesign.nodes.push({
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      radius: this.selectedOrganelle.radius,
      type: this.selectedOrganelle.type
    });

    soundEngine.playBubblePop('medium');
    this.renderBuilderCanvas();
  }

  handleCanvasRightClick(e) {
    const rect = this.builderCanvas.getBoundingClientRect();
    /* ⭐⭐ THE CLICK READS THE SAME SCALE THE DRAW USES — see `fitScale()`.
       ⛔ Never let these two drift apart. A tool that paints in one coordinate
       space and hit-tests in another places every socket in the wrong hole and
       gives no sign that it has. */
    const fit = this.fitScale();
    const clickX = (e.clientX - rect.left - this.builderCanvas.width / 2) / fit;
    const clickY = (e.clientY - rect.top - this.builderCanvas.height / 2) / fit;

    // Find nearest non-core node to click
    let nearestIndex = -1;
    let minDist = 24;

    this.currentDesign.nodes.forEach((n, idx) => {
      if (n.type === 'core') return;
      const d = Math.hypot(n.dx - clickX, n.dy - clickY);
      if (d < minDist) {
        minDist = d;
        nearestIndex = idx;
      }
    });

    if (nearestIndex !== -1) {
      this.currentDesign.nodes.splice(nearestIndex, 1);
      soundEngine.playBubblePop('small');
      this.renderBuilderCanvas();
    }
  }

  openDesigner() {
    document.getElementById('designer-overlay').style.display = 'flex';
    this.renderBuilderCanvas();
  }

  saveAndApply() {
    document.getElementById('designer-overlay').style.display = 'none';
    localStorage.setItem('biotank_forge_player', JSON.stringify(this.currentDesign));

    if (window.engine) {
      window.engine.applyDesign(this.currentDesign);
    }
  }

  loadSavedDesign() {
    const saved = localStorage.getItem('biotank_forge_player');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.nodes) {
          this.currentDesign = parsed;
        }
      } catch (e) {
        console.warn("Could not load saved design:", e);
      }
    }
  }

  calculatePhysicsReadout() {
    let hp = 100;
    this.currentDesign.nodes.forEach(node => {
      if (node.type === 'pod') hp += 35;
      if (node.type === 'shield') hp += 30;
      if (node.type === 'cannon') hp += 10;
      if (node.type === 'spike') hp += 15;
    });

    const evo = progression.getEvolutionData();
    hp += evo.hpBonus;

    const totalGP = progression.getTotalGP();
    const usedGP = this.calculateUsedGP();
    const availGP = totalGP - usedGP;

    const wTitle = (PRIMARY_WEAPONS_CATALOG.find(w => w.weaponType === this.currentDesign.primaryWeapon) || PRIMARY_WEAPONS_CATALOG[0]).title;
    const sTitle = (SECONDARY_ACTIVES_CATALOG.find(s => s.secAbility === this.currentDesign.secAbility) || SECONDARY_ACTIVES_CATALOG[0]).title;

    document.getElementById('d-val-hp').textContent = `${hp} HP`;
    document.getElementById('d-val-weapon').textContent = wTitle;
    document.getElementById('d-val-sec').textContent = sTitle;
    document.getElementById('d-val-mass').textContent = `${this.currentDesign.nodes.length} / ${evo.maxSockets} Pods`;

    const gpCounter = document.getElementById('d-val-gp');
    if (gpCounter) {
      gpCounter.textContent = `${availGP} GP (Used: ${usedGP}/${totalGP})`;
      gpCounter.style.color = availGP >= 0 ? '#39ff14' : '#ff3366';
    }

    document.getElementById('hud-weapon-name').textContent = wTitle;
    document.getElementById('ability-title').textContent = sTitle;
    document.getElementById('ability-icon').textContent = (SECONDARY_ACTIVES_CATALOG.find(s => s.secAbility === this.currentDesign.secAbility) || SECONDARY_ACTIVES_CATALOG[0]).icon;
  }

  /* ==========================================================================
     ⭐⭐ THE FIT — MAC, 2026-08-17: *"the design tab is munted right now."*
     ==========================================================================
     🔴 MEASURED: this canvas is 340x340 and drew the ship at 1:1 with no fit of
     any kind. That was already wrong for the largest authored hull (346px into
     340px) and the scale ladder in `js/fleet.js` made it wrong for everything
     above a destroyer — a TITAN is 735px across, so the tool showed the middle
     of the core and nothing else.

     ⭐⭐ ONE SCALE, READ BY BOTH THE DRAW AND THE CLICK. This function is the
     single source of the number, and `handleBuilderClick` divides by exactly it.
     Scaling the paint without scaling the hit-test is the defect that costs
     hours every time it is committed: the tool then LOOKS right and places
     sockets somewhere else, which is far worse than a ship that is too big to
     see, because it is wrong silently.

     ⚠ CAPPED AT 1. A small hull is not magnified — the 38px socket ring below
     is authored in these same units, so blowing up a 4-node starter would make
     the ring lie about where a socket can go. Shrink to fit, never grow. */
  fitScale() {
    const nodes = (this.currentDesign && this.currentDesign.nodes) || [];
    let reach = 44;                       // the socket ring, so an empty hull still frames
    for (const n of nodes) {
      const d = Math.hypot(n.dx || 0, n.dy || 0) + (n.radius || 0);
      if (d > reach) reach = d;
    }
    const half = Math.min(this.builderCanvas.width, this.builderCanvas.height) / 2;
    return Math.min(1, (half - 12) / reach);   // 12px breathing room at the rim
  }

  renderBuilderCanvas() {
    const w = this.builderCanvas.width;
    const h = this.builderCanvas.height;
    this.builderCtx.clearRect(0, 0, w, h);

    this.builderCtx.save();
    this.builderCtx.translate(w / 2, h / 2);
    this.builderCtx.scale(this.fitScale(), this.fitScale());

    this.builderCtx.beginPath();
    this.builderCtx.arc(0, 0, 38, 0, Math.PI * 2);
    this.builderCtx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
    this.builderCtx.setLineDash([4, 4]);
    this.builderCtx.lineWidth = 1.5;
    this.builderCtx.stroke();
    this.builderCtx.setLineDash([]);

    const dummySpringNodes = this.currentDesign.nodes.map(n => ({
      currentDx: n.dx,
      currentDy: n.dy,
      radius: n.radius,
      type: n.type
    }));

    fluidShader.drawOrganismMembrane(
      this.builderCtx,
      0, 0, 0, 26,
      dummySpringNodes,
      this.currentDesign.color
    );

    this.builderCtx.restore();
    this.calculatePhysicsReadout();
  }
}

const organismDesigner = new OrganismDesigner();
