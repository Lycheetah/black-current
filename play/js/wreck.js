// wreck.js — B13 YOUR WRECK: death is relocation, never deletion (plan §5)
/* Dying used to delete 20% of your mass outright. Now the same 20% stays where
   you fell, inside your wreck: drawn in the world, pointed at from the screen
   edge, kept in the save, and handed back the moment you fly through it.
   The test from Mac's continuity ruling: it gives the work back, it never
   charges for the gap. A second death before recovery folds the old cargo into
   the new wreck, so nothing is ever lost twice.

   Self-owning seam, like hunt.js / look.js:
     wraps engine.playerDeath  (records what the penalty took)
     wraps engine.update       (recovery on contact)
     wraps particleSystem.draw (wreck in the world + edge bearing) */
(function () {
  const TOUCH = 80;           // world px from wreck centre that recovers it
  const TINT = '#e8c478';     // the gold of salvage, not a reserved colour

  const wreck = window.wreck = {
    get() { return (typeof saveState !== 'undefined' && saveState.doc && saveState.doc.wreck) || null; },
    here(w) {
      const ch = worldMap.getCurrentChamber();
      return !!(w && ch && ch.gridX === w.gx && ch.gridY === w.gy);
    }
  };

  function install() {
    const baseDeath = engine.playerDeath.bind(engine);
    engine.playerDeath = (...a) => {
      const before = progression.totalMass, x = engine.player.x, y = engine.player.y;
      const r = baseDeath(...a);
      const lost = before - progression.totalMass;
      const ch = worldMap.getCurrentChamber();
      if (lost > 0 && ch) {
        const old = wreck.get();
        saveState.doc.wreck = { gx: ch.gridX, gy: ch.gridY, x, y, mass: lost + (old ? old.mass : 0) };
        saveState.save();
      }
      return r;
    };

    const baseUpdate = engine.update.bind(engine);
    engine.update = (...a) => {
      const r = baseUpdate(...a);
      const w = wreck.get(), P = engine.player;
      if (w && P && !P.dead && wreck.here(w) && Math.hypot(P.x - w.x, P.y - w.y) < TOUCH) {
        progression.totalMass += w.mass;
        delete saveState.doc.wreck;
        progression.saveProgress();
        saveState.save();
        particleSystem.spawnBubbleBurst(w.x, w.y, TINT, 26);
        soundEngine.playEvolutionFanfare && soundEngine.playEvolutionFanfare();
        if (window.garage) garage.banner(`WRECK RECOVERED · +${w.mass} MASS`, 'good');
      }
      return r;
    };

    const baseDraw = particleSystem.draw.bind(particleSystem);
    particleSystem.draw = (ctx, camera) => { baseDraw(ctx, camera); draw(ctx, camera); };
  }

  function draw(ctx, camera) {
    const w = wreck.get();
    if (!w || !wreck.here(w) || !engine.player) return;
    const z = camera.zoom || 1, t = performance.now() / 1000;
    const halfW = engine.viewportWidth / 2 / z, halfH = engine.viewportHeight / 2 / z;
    const cx = camera.x + halfW, cy = camera.y + halfH;   // camera.x is the LEFT edge
    const ring = Math.min(halfW, halfH) * 0.86;
    const dx = w.x - cx, dy = w.y - cy, d = Math.hypot(dx, dy);
    ctx.save();
    if (d < ring + 60) {
      // the hull you lost: a cracked membrane, slowly turning shards, a gold heart beating
      const sx = w.x - camera.x, sy = w.y - camera.y, pulse = 0.5 + 0.5 * Math.sin(t * 3);
      if (typeof look !== 'undefined' && look.glow) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + pulse * 0.2;
        const R = 70 + pulse * 10; ctx.drawImage(look.glow(TINT), sx - R, sy - R, R * 2, R * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 0.55; ctx.strokeStyle = '#8FA6C4'; ctx.lineWidth = 2.5;
      ctx.setLineDash([18, 10]); ctx.beginPath(); ctx.arc(sx, sy, 34, t * 0.2, t * 0.2 + Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 6; i++) {
        const a = t * 0.35 + i * 1.047, rr = 46 + Math.sin(t + i) * 5;
        ctx.save(); ctx.translate(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); ctx.rotate(a * 2);
        ctx.fillStyle = '#5b6f86'; ctx.globalAlpha = 0.8; ctx.fillRect(-5, -2.5, 10, 5); ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = TINT;
      ctx.beginPath(); ctx.arc(sx, sy, 7 + pulse * 3, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      ctx.font = `800 ${Math.round(13 / z)}px "Outfit", system-ui, sans-serif`;
      ctx.lineWidth = 3 / z; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      const txt = `YOUR WRECK · ${w.mass} MASS`;
      ctx.strokeText(txt, sx, sy - 58); ctx.fillText(txt, sx, sy - 58);
    } else {
      // off screen: a gold bearing on the same ring the sector landmarks use
      const a = Math.atan2(dy, dx);
      const ex = cx + Math.cos(a) * ring - camera.x, ey = cy + Math.sin(a) * ring - camera.y;
      const metres = Math.round(Math.hypot(w.x - engine.player.x, w.y - engine.player.y));
      ctx.translate(ex, ey); ctx.rotate(a);
      ctx.fillStyle = TINT; ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, 7); ctx.lineTo(-8, -7); ctx.closePath(); ctx.fill();
      ctx.rotate(-a); ctx.textAlign = 'center';
      ctx.font = `700 ${Math.round(11 / z)}px "Courier New", monospace`;
      ctx.fillText(`YOUR WRECK ${metres}`, 0, 22);
    }
    ctx.restore();
  }

  if (typeof engine !== 'undefined' && engine) install(); else window.addEventListener('load', install);
})();
