/* ==========================================================================
   BUBBLE TANKS: BLACK CURRENT — Title, Garage, Mission Card, Reward Card
   ==========================================================================

   ⚠ THIS FILE LOADS LAST, AFTER `engine.js`, AND THAT IS DELIBERATE.
     `engine.js` ends with `const engine = new EngineCore(); engine.start();` at
     parse time — the loop is already running before this file is read. The
     engine therefore constructs itself PAUSED, and the garage is what un-pauses
     it. Moving this script above `engine.js` would make `window.engine` undefined
     at boot and the launch button would do nothing.

   ⚠ EVERY PIECE OF PLAYER TEXT REACHES THE DOM VIA `textContent`.
     The callsign is already stripped by `sanitizeCallsign`, but defence in depth
     is the point: there is no `innerHTML` anywhere in this file that carries a
     value the player typed.

   ⚠ WEB AUDIO NEEDS A GESTURE. `soundEngine.init()` is called from the first
     real button press in here. Without that the whole soundtrack is silent until
     the player happens to click the canvas, which reads as "the music is broken".
   ========================================================================== */

class Garage {
  constructor() {
    this.el = {};
    this.bannerTimer = null;
    this.pendingCard = null;
    this.bind();
    this.boot();
  }

  bind() {
    const id = n => document.getElementById(n);
    this.el = {
      title: id('title-overlay'),
      titleCallsign: id('title-callsign'),
      titleCrews: id('title-crews'),
      titleHulls: id('title-hulls'),
      titleSkins: id('title-skins'),
      titleLaunch: id('btn-title-launch'),
      titleContinue: id('btn-title-continue'),
      titleReturning: id('title-returning'),
      titleError: id('title-error'),
      mission: id('mission-card'),
      missionBeat: id('mission-beat'),
      missionName: id('mission-name'),
      missionPromise: id('mission-promise'),
      missionHazard: id('mission-hazard'),
      missionReward: id('mission-reward'),
      missionGo: id('btn-mission-go'),
      reward: id('reward-card'),
      rewardKicker: id('reward-kicker'),
      rewardTitle: id('reward-title'),
      rewardLines: id('reward-lines'),
      rewardGo: id('btn-reward-go'),
      banner: id('event-banner'),
      hudCallsign: id('hud-callsign'),
      hudCrew: id('hud-crew'),
      hudTitleRank: id('hud-rank')
    };
  }

  boot() {
    const p = saveState.profile;
    const returning = !!(saveState.doc.launched && p.callsign);

    if (this.el.titleCallsign) this.el.titleCallsign.value = p.callsign || '';
    this.renderCrewChoices();
    this.renderHullChoices();
    this.renderSkinChoices();

    if (this.el.titleReturning) {
      this.el.titleReturning.style.display = returning ? 'block' : 'none';
      if (returning) {
        this.el.titleReturning.textContent =
          `${p.callsign} · ${(CREWS[p.crew] || CREWS.ironwake).name} · ${p.title}`;
      }
    }
    if (this.el.titleContinue) this.el.titleContinue.style.display = returning ? 'inline-flex' : 'none';

    if (this.el.titleLaunch) this.el.titleLaunch.addEventListener('click', () => this.launch(false));
    if (this.el.titleContinue) this.el.titleContinue.addEventListener('click', () => this.launch(true));
    if (this.el.missionGo) this.el.missionGo.addEventListener('click', () => this.closeMission());
    if (this.el.rewardGo) this.el.rewardGo.addEventListener('click', () => this.closeReward());

    if (this.el.titleCallsign) {
      this.el.titleCallsign.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); this.launch(false); }
      });
    }

    /* ⚠ ESCAPE MUST ALWAYS HAVE SOMEWHERE TO GO. A modal you can only leave with
       the mouse is a trap on a keyboard-first game. */
    window.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (this.el.reward && this.el.reward.style.display === 'flex') { e.preventDefault(); this.closeReward(); }
      else if (this.el.mission && this.el.mission.style.display === 'flex') { e.preventDefault(); this.closeMission(); }
    });

    this.paintHud();
    if (this.el.title) this.el.title.style.display = 'flex';
    if (this.el.titleCallsign) setTimeout(() => this.el.titleCallsign.focus(), 60);

    if (!returning || !saveState.doc.design) {
      const starters = (typeof fleet !== 'undefined' && fleet.starterHulls) ? fleet.starterHulls() : null;
      const chosen = (starters && starters[saveState.profile.hullStyle])
        ? starters[saveState.profile.hullStyle]
        : (typeof fleet !== 'undefined' ? fleet.starterChassis() : null);
      if (chosen && window.engine) {
        saveState.doc.design = JSON.parse(JSON.stringify(chosen));
        engine.applyDesign(saveState.doc.design, { restore: true });
      }
    }
  }


  /* ── identity pickers ──────────────────────────────────────────────────── */

  renderCrewChoices() {
    const box = this.el.titleCrews;
    if (!box) return;
    box.innerHTML = '';
    Object.values(CREWS).forEach(crew => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice-tile' + (saveState.profile.crew === crew.id ? ' active' : '');
      b.dataset.crew = crew.id;
      b.style.setProperty('--tile-accent', crew.trim);
      b.setAttribute('aria-pressed', String(saveState.profile.crew === crew.id));

      const mark = document.createElement('span'); mark.className = 'tile-mark'; mark.textContent = crew.mark;
      const name = document.createElement('strong'); name.textContent = crew.name;
      const feel = document.createElement('span'); feel.className = 'tile-feel'; feel.textContent = crew.feel;
      const edge = document.createElement('span'); edge.className = 'tile-edge'; edge.textContent = crew.edge;
      b.append(mark, name, feel, edge);

      b.addEventListener('click', () => {
        saveState.profile.crew = crew.id;
        soundEngine.init();
        soundEngine.playCrewStinger(crew.id);
        this.renderCrewChoices();
        this.paintHud();
      });
      box.appendChild(b);
    });
  }

  renderHullChoices() {
    const box = this.el.titleHulls;
    if (!box) return;
    box.innerHTML = '';
    Object.values(HULL_STYLES).forEach(hull => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice-tile hull' + (saveState.profile.hullStyle === hull.id ? ' active' : '');
      b.setAttribute('aria-pressed', String(saveState.profile.hullStyle === hull.id));

      const name = document.createElement('strong'); name.textContent = hull.name;
      const desc = document.createElement('span'); desc.className = 'tile-feel'; desc.textContent = hull.desc;
      b.append(name, desc);

      b.addEventListener('click', () => {
        saveState.profile.hullStyle = hull.id;
        const starters = (typeof fleet !== 'undefined' && fleet.starterHulls) ? fleet.starterHulls() : null;
        const chosen = (starters && starters[hull.id])
          ? starters[hull.id]
          : (typeof fleet !== 'undefined' ? fleet.starterChassis() : null);
        if (chosen && window.engine) {
          saveState.doc.design = JSON.parse(JSON.stringify(chosen));
          engine.applyDesign(saveState.doc.design, { restore: true });
        }
        soundEngine.init();
        soundEngine.playBubblePop('medium');
        this.renderHullChoices();
      });

      box.appendChild(b);
    });
  }

  renderSkinChoices() {
    const box = this.el.titleSkins;
    if (!box) return;
    box.innerHTML = '';

    const availablePacks = (typeof packRenderer !== 'undefined' && packRenderer.packs)
      ? Object.values(packRenderer.packs)
      : [];

    /* ⛔ VISUAL PACKS REMOVED (Mac, 2026-08-17). With `js/packs.js` unloaded
       this list is empty, and an empty picker is worse than no picker — it is a
       control that promises a choice and offers none. Hide the whole section,
       including whatever heading sits above it, rather than leaving a blank
       shelf on the title screen. */
    if (!availablePacks.length) {
      const section = box.closest('section, .choice-group, fieldset') || box;
      section.style.display = 'none';
      return;
    }
    box.style.display = '';

    availablePacks.forEach(pack => {
      const b = document.createElement('button');
      b.type = 'button';
      const isActive = packRenderer && packRenderer.activeId === pack.id;
      b.className = 'choice-tile skin' + (isActive ? ' active' : '');
      b.setAttribute('aria-pressed', String(isActive));

      const name = document.createElement('strong');
      name.textContent = pack.name || pack.id;
      const kind = document.createElement('span');
      kind.className = 'tile-feel';
      kind.textContent = `${pack.kind || 'ship'} · ${pack.vernacular ? pack.vernacular.cannon : 'weapon'}`;

      b.append(name, kind);

      b.addEventListener('click', () => {
        if (typeof packRenderer !== 'undefined') {
          packRenderer.use(pack.id);
          packRenderer.save();
        }
        soundEngine.init();
        soundEngine.playBubblePop('small');
        this.renderSkinChoices();
      });
      box.appendChild(b);
    });
  }

  /* ── launch ────────────────────────────────────────────────────────────── */

  launch(isContinue) {
    soundEngine.init();

    if (!isContinue) {
      const typed = sanitizeCallsign(this.el.titleCallsign ? this.el.titleCallsign.value : '');
      if (typed.length < 2) {
        if (this.el.titleError) {
          this.el.titleError.textContent = 'A callsign needs at least 2 characters (A–Z, 0–9, space, - _ .).';
          this.el.titleError.style.display = 'block';
        }
        if (this.el.titleCallsign) this.el.titleCallsign.focus();
        return;
      }
      if (this.el.titleError) this.el.titleError.style.display = 'none';
      saveState.profile.callsign = typed;
      if (!HULL_STYLES[saveState.profile.hullStyle]) saveState.profile.hullStyle = 'ai_hunters';
      const starters = (typeof fleet !== 'undefined' && fleet.starterHulls) ? fleet.starterHulls() : null;
      const chosen = (starters && starters[saveState.profile.hullStyle])
        ? starters[saveState.profile.hullStyle]
        : (typeof fleet !== 'undefined' ? fleet.starterChassis() : null);
      if (chosen) {
        saveState.doc.design = JSON.parse(JSON.stringify(chosen));
      }
    }

    saveState.doc.launched = true;

    if (!saveState.save()) return;   /* ⚠ a failed write is surfaced, not swallowed */

    if (this.el.title) this.el.title.style.display = 'none';
    this.paintHud();

    if (window.engine) {
      engine.applyIdentity();
      engine.paused = false;
      engine.enterChamber({ silent: true });
    }
  }

  /* ── the mission card — the promise made BEFORE the room ───────────────── */

  showMission(mission, chamber) {
    if (!this.el.mission || !mission) return;
    const cleared = saveState.isMissionCleared(mission.id);

    this.el.missionBeat.textContent = mission.beat;
    this.el.missionName.textContent =
      `${(BIOMES[mission.biome] || { name: 'Open Water' }).name} · Sector ${chamber.gridX},${chamber.gridY}`;
    this.el.missionPromise.textContent = mission.promise;
    this.el.missionHazard.textContent = (HAZARDS[mission.hazard] || HAZARDS.none).label;
    this.el.missionReward.textContent = cleared
      ? 'Already paid — reward claimed'
      : (mission.reward ? mission.reward.label : 'No standing reward');
    this.el.mission.style.display = 'flex';
    if (window.engine) engine.paused = true;
    setTimeout(() => this.el.missionGo && this.el.missionGo.focus(), 40);
  }

  closeMission() {
    if (this.el.mission) this.el.mission.style.display = 'none';
    if (window.engine && !this.isRewardOpen()) engine.paused = false;
  }

  isRewardOpen() { return this.el.reward && this.el.reward.style.display === 'flex'; }

  /* ── the reward card — the payment AFTER the room ──────────────────────── */

  showReward(kicker, title, lines) {
    if (!this.el.reward) return;
    this.el.rewardKicker.textContent = kicker;
    this.el.rewardTitle.textContent = title;
    this.el.rewardLines.innerHTML = '';
    (lines && lines.length ? lines : ['No new unlock — the mark was already yours']).forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;            /* never innerHTML: these carry crew + decal names */
      this.el.rewardLines.appendChild(li);
    });
    this.el.reward.style.display = 'flex';
    if (window.engine) engine.paused = true;
    setTimeout(() => this.el.rewardGo && this.el.rewardGo.focus(), 40);
  }

  closeReward() {
    if (this.el.reward) this.el.reward.style.display = 'none';
    if (window.engine) engine.paused = false;
  }

  /* ── the banner — small events that do not deserve a modal ─────────────── */

  banner(text, tone = 'good') {
    if (!this.el.banner) return;
    this.el.banner.textContent = text;
    this.el.banner.className = `event-banner show ${tone}`;
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.el.banner.className = 'event-banner';
    }, 3200);
  }

  paintHud() {
    const p = saveState.profile;
    const crew = CREWS[p.crew] || CREWS.ironwake;
    if (this.el.hudCallsign) this.el.hudCallsign.textContent = p.callsign || 'UNNAMED';
    if (this.el.hudCrew) {
      this.el.hudCrew.textContent = `${crew.mark} ${crew.name}`;
      this.el.hudCrew.style.color = crew.trim;
    }
    if (this.el.hudTitleRank) this.el.hudTitleRank.textContent = p.title;
    document.documentElement.style.setProperty('--crew-trim', crew.trim);
    document.documentElement.style.setProperty('--crew-accent', crew.accent);
  }
}

const garage = new Garage();
window.garage = garage;
