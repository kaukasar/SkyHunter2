(function () {
  'use strict';

  const C = SH.CONFIG;
  const U = SH.U;
  const W = C.WIDTH;
  const TAU = Math.PI * 2;

  /*
   * Slutbossar. Varje boss har svaga punkter (parts): kanontorn som måste
   * förstöras innan kärnan öppnas och kan skadas. Övriga träffar på skrovet
   * studsar av.
   */
  SH.BOSS_DEFS = {
    fortress: {
      name: 'FÄSTNINGEN',
      shape: 'fortress',
      sprite: 'bossFortress',
      w: 240,
      h: 120,
      hw: 108,
      hh: 46,
      targetY: 140,
      sway: 100,
      swaySpeed: 0.5,
      points: 5000,
      parts: [
        { type: 'turret', ox: -78, oy: 4, r: 14, hp: 24 },
        { type: 'turret', ox: 78, oy: 4, r: 14, hp: 24 },
        { type: 'core', ox: 0, oy: 10, r: 20, hp: 56 },
      ],
      turretInterval: 1.5,
      turretSpread: 0,
      noseInterval: 3.2,
      corePattern: 'ring',
      ringCount: 14,
      ringInterval: 2.2,
    },
    mothership: {
      name: 'MODERSKEPPET',
      shape: 'mothership',
      sprite: 'bossMothership',
      w: 300,
      h: 150,
      hw: 138,
      hh: 56,
      targetY: 150,
      sway: 75,
      swaySpeed: 0.4,
      points: 10000,
      parts: [
        { type: 'turret', ox: -112, oy: -6, r: 13, hp: 26 },
        { type: 'turret', ox: 112, oy: -6, r: 13, hp: 26 },
        { type: 'turret', ox: -56, oy: 36, r: 13, hp: 30 },
        { type: 'turret', ox: 56, oy: 36, r: 13, hp: 30 },
        { type: 'core', ox: 0, oy: 2, r: 24, hp: 120 },
      ],
      turretInterval: 2.03,      // 20 % lägre skottfrekvens än tidigare 1.625 s (som i sin tur sänktes från 1.3 s)
      turretSpread: 0.14,
      noseInterval: 2.6,
      corePattern: 'spiral',
      spiralInterval: 0.11,
    },
  };

  class Boss {
    constructor(game, key) {
      const def = SH.BOSS_DEFS[key];
      this.game = game;
      this.key = key;
      this.def = def;
      this.x = W / 2;
      this.y = -def.h / 2 - 10;
      this.hw = def.hw;
      this.hh = def.hh;
      this.t = 0;
      this.phase = 'enter';
      this.dead = false;
      this.bodyFlash = 0;
      this.noseT = def.noseInterval;
      this.patternT = 1.2;
      this.aimT = 1.5;
      this.spin = 0;
      this.dyingT = 0;
      this.boomT = 0;

      const hpMul = game.diff.bossHp * C.BOSS_HP_MULTIPLIER;
      this.parts = def.parts.map((p) => Object.assign({}, p, {
        hp: Math.round(p.hp * hpMul),
        maxHp: Math.round(p.hp * hpMul),
        alive: true,
        flash: 0,
        angle: Math.PI / 2,
        fireT: U.rand(0.8, 1.8),
        open: 0,
      }));
      this.core = this.parts.find((p) => p.type === 'core');
      this.totalHp = this.parts.reduce((s, p) => s + p.maxHp, 0);
    }

    get coreOpen() {
      return this.parts.every((p) => p.type === 'core' || !p.alive);
    }

    get hpFraction() {
      return this.parts.reduce((s, p) => s + Math.max(0, p.hp), 0) / this.totalHp;
    }

    get active() {
      return this.phase === 'enter' || this.phase === 'fight';
    }

    update(dt) {
      const game = this.game;
      const def = this.def;
      this.t += dt;
      if (this.bodyFlash > 0) this.bodyFlash -= dt;
      for (const p of this.parts) if (p.flash > 0) p.flash -= dt;

      if (this.phase === 'enter') {
        this.y += 55 * dt;
        if (this.y >= def.targetY) {
          this.y = def.targetY;
          this.phase = 'fight';
          this.t = 0;
        }
        return;
      }

      if (this.phase === 'dying') {
        this.updateDying(dt);
        return;
      }

      // Rörelse: pendlar i sidled, snabbare när kärnan är exponerad
      const open = this.coreOpen;
      const speed = def.swaySpeed * (open ? 1.5 : 1) * game.diff.speed;
      this.swayPhase = (this.swayPhase || 0) + dt * speed;
      this.x = W / 2 + Math.sin(this.swayPhase) * def.sway;
      this.y = def.targetY + Math.sin(this.t * 0.9) * 12;

      const pl = game.player;
      const fireMul = game.diff.fire;
      const bs = game.diff.bulletSpeed;
      const tx = pl.alive ? pl.x : W / 2;
      const ty = pl.alive ? pl.y : C.HEIGHT;

      // Kanontorn
      for (const p of this.parts) {
        if (p.type !== 'turret' || !p.alive) continue;
        const px = this.x + p.ox;
        const py = this.y + p.oy;
        p.angle = Math.atan2(ty - py, tx - px);
        p.fireT -= dt * fireMul;
        if (p.fireT <= 0) {
          p.fireT = def.turretInterval * U.rand(0.85, 1.15);
          if (pl.alive) {
            const offs = def.turretSpread ? [-def.turretSpread, def.turretSpread] : [0];
            offs.forEach((o) => {
              const a = p.angle + o;
              game.enemyBullets.push(new SH.EnemyBullet(px + Math.cos(a) * (p.r + 6), py + Math.sin(a) * (p.r + 6),
                Math.cos(a) * 175 * bs, Math.sin(a) * 175 * bs));
            });
            SH.Audio.play('enemyShoot', 0.5);
          }
        }
      }

      if (!open) {
        // Noskanon: solfjäder med stora projektiler
        this.noseT -= dt * fireMul;
        if (this.noseT <= 0) {
          this.noseT = def.noseInterval;
          this.fan(this.x, this.y + this.hh, Math.PI / 2, 5, 0.22, 135 * bs, true);
        }
        return;
      }

      // Kärnan öppnas
      if (this.core.open < 1) {
        if (this.core.open === 0) {
          game.fx.popup(this.x, this.y + 60, 'KÄRNAN EXPONERAD!', '#ff7ad9', true);
          SH.Audio.play('warning', 0.5);
        }
        this.core.open = Math.min(1, this.core.open + dt * 1.2);
        return;
      }

      const cx = this.x + this.core.ox;
      const cy = this.y + this.core.oy;
      if (def.corePattern === 'ring') {
        this.patternT -= dt * fireMul;
        if (this.patternT <= 0) {
          this.patternT = def.ringInterval;
          this.spin += 0.2;
          for (let i = 0; i < def.ringCount; i++) {
            const a = this.spin + (i / def.ringCount) * TAU;
            game.enemyBullets.push(new SH.EnemyBullet(cx, cy, Math.cos(a) * 130 * bs, Math.sin(a) * 130 * bs));
          }
          SH.Audio.play('enemyShoot');
        }
      } else {
        this.patternT -= dt * fireMul;
        if (this.patternT <= 0) {
          this.patternT = def.spiralInterval;
          this.spin += 0.31;
          [0, Math.PI].forEach((o) => {
            const a = this.spin + o;
            game.enemyBullets.push(new SH.EnemyBullet(cx, cy, Math.cos(a) * 120 * bs, Math.sin(a) * 120 * bs));
          });
        }
      }

      this.aimT -= dt * fireMul;
      if (this.aimT <= 0) {
        this.aimT = 1.7;
        this.fan(cx, cy, Math.atan2(ty - cy, tx - cx), 3, 0.18, 170 * bs, true);
      }
    }

    fan(x, y, center, count, step, speed, big) {
      if (!this.game.player.alive) return;
      for (let i = 0; i < count; i++) {
        const a = center + (i - (count - 1) / 2) * step;
        this.game.enemyBullets.push(new SH.EnemyBullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, big));
      }
      SH.Audio.play('enemyShoot');
    }

    updateDying(dt) {
      const fx = this.game.fx;
      this.dyingT += dt;
      this.boomT -= dt;
      this.x += Math.sin(this.dyingT * 40) * 0.6;
      this.y += 12 * dt;
      if (this.boomT <= 0) {
        this.boomT = 0.11;
        fx.explosion(this.x + U.rand(-this.hw, this.hw), this.y + U.rand(-this.hh, this.hh), U.rand(0.7, 1.4));
        fx.addShake(4);
        SH.Audio.play('boomSmall');
      }
      if (this.dyingT > 2.6) {
        for (let i = 0; i < 6; i++) {
          fx.explosion(this.x + U.rand(-this.hw * 0.7, this.hw * 0.7), this.y + U.rand(-this.hh, this.hh), 2.2);
        }
        fx.explosion(this.x, this.y, 4);
        fx.addShake(16);
        SH.Audio.play('bigBoom');
        this.dead = true;
      }
    }

    /* Kontroll av spelarprojektil: returnerar träffad svag punkt, 'body' eller null. */
    hitTest(b) {
      let aimedAtWeakPoint = false;
      if (this.phase === 'fight') {
        const open = this.coreOpen && this.core.open >= 1;
        for (const p of this.parts) {
          if (!p.alive) continue;
          if (p.type === 'core' && !open) continue;
          const px = this.x + p.ox;
          const py = this.y + p.oy;
          if (U.overlapBox(b.x, b.y, b.hw, b.hh, px, py, p.r, p.r)) return p;
          // Skott i linje med en sårbar punkt flyger över skrovet fram till punkten
          if (Math.abs(b.x - px) < p.r + b.hw && b.y > py) aimedAtWeakPoint = true;
        }
      }
      if (!aimedAtWeakPoint && this.active && U.overlapBox(b.x, b.y, b.hw, b.hh, this.x, this.y, this.hw, this.hh)) return 'body';
      return null;
    }

    damagePart(part) {
      const game = this.game;
      part.hp -= 1;
      part.flash = 0.05;
      const px = this.x + part.ox;
      const py = this.y + part.oy;
      if (part.hp > 0) {
        SH.Audio.play('hit');
        return;
      }
      part.alive = false;
      part.hp = 0;
      if (part.type === 'turret') {
        game.fx.explosion(px, py, 1.6);
        game.fx.addShake(6);
        SH.Audio.play('boom');
        game.addScore(C.SCORE.bossTurret);
        game.fx.popup(px, py - 20, String(C.SCORE.bossTurret), '#ffe07a');
      } else {
        this.phase = 'dying';
        this.dyingT = 0;
        game.fx.explosion(px, py, 2.5);
        SH.Audio.play('bigBoom');
        game.onBossDefeated(this);
      }
    }

    draw(ctx) {
      const A = SH.Assets;
      const def = this.def;
      const flashing = this.bodyFlash > 0 || (this.phase === 'dying' && Math.floor(this.dyingT * 20) % 2 === 0);
      A.draw(ctx, flashing ? def.sprite + 'Flash' : def.sprite, this.x, this.y);

      for (const p of this.parts) {
        const px = this.x + p.ox;
        const py = this.y + p.oy;
        if (p.type === 'turret') this.drawTurret(ctx, p, px, py);
        else this.drawCore(ctx, p, px, py);
      }
    }

    drawTurret(ctx, p, px, py) {
      if (!p.alive) {
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, TAU);
        ctx.fillStyle = '#0d0b0a';
        ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        SH.Assets.draw(ctx, 'glowFire', px + Math.sin(this.t * 13 + p.ox) * 2, py, 0, 0.8, 0.4 + Math.random() * 0.3);
        ctx.globalCompositeOperation = 'source-over';
        return;
      }
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.flash > 0 ? '#ffffff' : '#20252c';
      ctx.fillRect(0, -3.5, p.r + 10, 7);
      ctx.fillStyle = '#ff9b4a';
      ctx.fillRect(p.r + 7, -2, 3, 4);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, TAU);
      if (p.flash > 0) {
        ctx.fillStyle = '#ffffff';
      } else {
        const g = ctx.createRadialGradient(px - 4, py - 4, 1, px, py, p.r);
        g.addColorStop(0, '#c8d2de');
        g.addColorStop(0.6, '#6a7686');
        g.addColorStop(1, '#2c333d');
        ctx.fillStyle = g;
      }
      ctx.fill();
      ctx.strokeStyle = '#11151a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Skadeindikator
      const k = p.hp / p.maxHp;
      ctx.fillStyle = k > 0.5 ? '#5dff8a' : k > 0.25 ? '#ffd24a' : '#ff4a3a';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, TAU);
      ctx.fill();
    }

    drawCore(ctx, p, px, py) {
      const A = SH.Assets;
      const r = p.r;
      if (p.alive && p.open > 0) {
        const pulse = 1 + Math.sin(this.t * 9) * 0.12;
        ctx.globalCompositeOperation = 'lighter';
        A.draw(ctx, 'glowRed', px, py, 0, (r * 3.2 * pulse) / 32, p.open);
        A.draw(ctx, p.flash > 0 ? 'glowWhite' : 'glowPink', px, py, 0, (r * 1.8) / 32, p.open);
        ctx.globalCompositeOperation = 'source-over';
      }

      if (!p.alive) {
        ctx.beginPath();
        ctx.arc(px, py, r, 0, TAU);
        ctx.fillStyle = '#0d0b0a';
        ctx.fill();
        return;
      }

      // Pansarluckor som glider isär när kärnan öppnas
      const slide = p.open * (r + 4);
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, r + 5, 0, TAU);
        ctx.clip();
        ctx.translate(px + side * slide, py);
        ctx.beginPath();
        ctx.arc(0, 0, r, side < 0 ? Math.PI / 2 : -Math.PI / 2, side < 0 ? Math.PI * 1.5 : Math.PI / 2);
        ctx.closePath();
        const g = ctx.createLinearGradient(-r, -r, r, r);
        g.addColorStop(0, '#aab4c2');
        g.addColorStop(1, '#3c4450');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = '#11151a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      });
      if (p.open === 0 && Math.floor(this.t * 3) % 2 === 0) {
        ctx.fillStyle = '#ff3a3a';
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, TAU);
        ctx.fill();
      }
    }
  }

  SH.Boss = Boss;
})();
