(function () {
  'use strict';

  const C = SH.CONFIG;
  const U = SH.U;
  const W = C.WIDTH;
  const H = C.HEIGHT;

  const TYPES = {
    basic: { hp: C.ENEMY_HP.basic, hw: 13, hh: 11, sprite: 'enemyBasic', flash: 'enemyBasicFlash', rotates: true },
    leader: { hp: C.ENEMY_HP.leader, hw: 13, hh: 11, sprite: 'enemyLeaderA', flash: 'enemyBasicFlash', rotates: true },
    heavy: { hp: 4, hw: 26, hh: 22, sprite: 'enemyHeavy', flash: 'enemyHeavyFlash', rotates: false },
  };

  /*
   * Fördefinierade rörelsebanor. Varje bana uppdaterar fiendens ankarpunkt
   * (ax, ay); formationsoffset läggs på efteråt. k = hastighetsmultiplikator.
   */
  const PATHS = {
    straight(e, dt, k) {
      e.ax += (e.p.vx || 0) * k * dt;
      e.ay += e.p.speed * k * dt;
    },

    // Sinusvåg nedåt
    sine(e, dt, k) {
      const p = e.p;
      e.ay += p.speed * k * dt;
      e.ax = p.x + p.amp * Math.sin(e.t * p.freq * k + (p.phase || 0));
    },

    // In från ovan, stanna, dyk mot spelarens position
    dive(e, dt, k, game) {
      const p = e.p;
      const s = e.ps;
      if (!s.phase) {
        s.phase = 'enter';
        s.t = 0;
        s.sx = e.ax;
        s.sy = e.ay;
      }
      s.t += dt;
      if (s.phase === 'enter') {
        const u = Math.min(1, s.t / (p.enterTime / k));
        const eu = U.easeOutCubic(u);
        e.ax = U.lerp(s.sx, p.tx, eu);
        e.ay = U.lerp(s.sy, p.ty, eu);
        if (u >= 1) {
          s.phase = 'hold';
          s.t = 0;
        }
      } else if (s.phase === 'hold') {
        e.ax = p.tx + Math.sin(s.t * 7) * 3;
        e.ay = p.ty + Math.sin(s.t * 3) * 2;
        if (s.t >= p.hold / k) {
          s.phase = 'dive';
          const pl = game.player;
          const tx = pl.alive ? pl.x : W / 2;
          const ty = pl.alive ? pl.y : H;
          let dx = tx - e.ax;
          let dy = Math.max(60, ty - e.ay);
          const len = Math.hypot(dx, dy) || 1;
          s.vx = (dx / len) * p.diveSpeed * k;
          s.vy = (dy / len) * p.diveSpeed * k;
        }
      } else {
        e.ax += s.vx * dt;
        e.ay += s.vy * dt;
      }
    },

    // In från ovan, en hel cirkulär sväng, sedan ut ur bild
    loop(e, dt, k) {
      const p = e.p;
      const s = e.ps;
      const v = p.speed * k;
      if (!s.phase) s.phase = 'in';
      if (s.phase === 'in') {
        e.ay += v * dt;
        if (e.ay >= p.loopY) {
          s.phase = 'circle';
          s.cx = e.ax + p.dir * p.r;
          s.cy = p.loopY;
          s.th = p.dir === 1 ? Math.PI : 0;
          s.travelled = 0;
          e.ay = p.loopY;
        }
      } else if (s.phase === 'circle') {
        const w = v / p.r;
        s.th -= p.dir * w * dt;
        s.travelled += w * dt;
        e.ax = s.cx + Math.cos(s.th) * p.r;
        e.ay = s.cy + Math.sin(s.th) * p.r;
        if (s.travelled >= Math.PI * 2) s.phase = 'out';
      } else {
        e.ay += v * dt;
      }
    },

    // Tung fiende: långsam inflygning, sidledsförflyttning, långsam utflygning
    hover(e, dt, k) {
      const p = e.p;
      const s = e.ps;
      if (!s.phase) {
        s.phase = 'in';
        s.t = 0;
      }
      s.t += dt;
      const strafe = () => { e.ax = p.x + Math.sin(s.t * 0.7 * k) * p.amp; };
      if (s.phase === 'in') {
        e.ay += p.speed * k * dt;
        if (e.ay >= p.ty) {
          s.phase = 'stay';
          s.t = 0;
        }
      } else if (s.phase === 'stay') {
        strafe();
        if (s.t >= p.stay) s.phase = 'out';
      } else {
        strafe();
        e.ay += p.speed * 2.5 * k * dt;
      }
    },
  };

  const PATH_DEFAULTS = {
    straight: { speed: 120 },
    sine: { speed: 90, amp: 60, freq: 1.5 },
    dive: { enterTime: 1.0, hold: 0.8, diveSpeed: 330 },
    loop: { speed: 150, loopY: 220, r: 70, dir: 1 },
    hover: { speed: 45, ty: 140, amp: 70, stay: 9 },
  };

  class Enemy {
    constructor(game, opts) {
      const type = TYPES[opts.type];
      this.game = game;
      this.type = opts.type;
      this.def = type;
      if (opts.type === 'heavy') {
        // Banans grundvärde (3-5) styr poängen; tåligheten multipliceras
        this.armor = opts.hp || type.hp;
        this.hp = this.armor * C.ENEMY_HP.heavyMultiplier;
      } else {
        this.hp = type.hp;
      }
      // Global svårighetsgrad och ev. slutvågssekvens; avrundas en gång på produkten
      let hpMul = C.DIFFICULTIES[game.difficulty].enemyHp;
      if (game.finalWaveActive) hpMul *= C.FINAL_WAVE_HP_MULTIPLIER;
      this.hp = Math.round(this.hp * hpMul);
      this.maxHp = this.hp;
      this.hw = type.hw;
      this.hh = type.hh;
      this.pathName = opts.path;
      this.path = PATHS[opts.path];
      this.p = Object.assign({}, PATH_DEFAULTS[opts.path], opts.params);
      this.ps = {};
      this.ax = opts.x;
      this.ay = opts.y;
      this.offX = opts.offX || 0;
      this.offY = opts.offY || 0;
      this.x = this.ax + this.offX;
      this.y = this.ay + this.offY;
      this.rot = 0;
      this.t = 0;
      this.flash = 0;
      this.wave = opts.wave || null;
      this.entered = false;
      this.dead = false;
      this.escaped = false;

      if (this.type === 'heavy') {
        this.points = C.SCORE.heavyBase + (this.armor - 3) * C.SCORE.heavyPerArmor;
        this.fireT = U.rand(0.8, 1.6);
      } else if (this.type === 'leader') {
        this.points = C.SCORE.leader;
        this.fireT = Infinity; // vågledare skjuter inte
      } else {
        this.points = C.SCORE.basicByPath[opts.path] || 100;
        // Basfiender skjuter sällan, och bara vissa av dem
        this.fireT = U.chance(0.55) ? U.rand(1.5, 6) : Infinity;
      }
    }

    update(dt) {
      const game = this.game;
      const k = game.diff.speed;
      this.t += dt;
      const px = this.x;
      const py = this.y;
      this.path(this, dt, k, game);
      this.x = this.ax + this.offX;
      this.y = this.ay + this.offY;

      if (this.def.rotates) {
        const vx = this.x - px;
        const vy = this.y - py;
        if (vx * vx + vy * vy > 0.0001) {
          const target = Math.atan2(-vx, vy);
          let diff = target - this.rot;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.rot += diff * Math.min(1, dt * 10);
        }
      }

      if (this.flash > 0) this.flash -= dt;

      if (!this.entered && this.y > -this.hh && this.y < H && this.x > -this.hw && this.x < W + this.hw) {
        this.entered = true;
      }
      const out = this.y > H + 60 || this.y < -140 || this.x < -90 || this.x > W + 90;
      if ((this.entered && out) || this.t > 30) {
        this.escaped = true;
        return;
      }

      this.updateFire(dt);
    }

    updateFire(dt) {
      if (this.fireT === Infinity) return;
      const game = this.game;
      this.fireT -= dt * game.diff.fire;
      if (this.fireT > 0) return;

      const pl = game.player;
      const canFire = pl.alive && this.y > 20 && this.y < H * 0.72 && this.y < pl.y - 90;
      const bs = game.diff.bulletSpeed;
      const base = Math.atan2(pl.y - this.y, pl.x - this.x);

      if (this.type === 'heavy') {
        this.fireT = U.rand(1.5, 2.2);
        if (!canFire) return;
        [-0.26, 0, 0.26].forEach((off) => {
          const a = base + off;
          game.enemyBullets.push(new SH.EnemyBullet(this.x, this.y + 18, Math.cos(a) * 150 * bs, Math.sin(a) * 150 * bs, true));
        });
      } else {
        this.fireT = U.rand(3.5, 7);
        if (!canFire) return;
        game.enemyBullets.push(new SH.EnemyBullet(this.x, this.y + 10, Math.cos(base) * 165 * bs, Math.sin(base) * 165 * bs));
      }
      SH.Audio.play('enemyShoot', 0.6);
    }

    /* Returnerar true om fienden förstördes. */
    damage(amount) {
      this.hp -= amount;
      this.flash = 0.06;
      return this.hp <= 0;
    }

    draw(ctx) {
      let name = this.def.sprite;
      if (this.flash > 0) {
        name = this.def.flash;
      } else if (this.type === 'leader') {
        // Vågledaren blinkar
        name = Math.floor(this.t * 8) % 2 === 0 ? 'enemyLeaderA' : 'enemyLeaderB';
      }
      SH.Assets.draw(ctx, name, this.x, this.y, this.rot);

      if (this.type === 'leader') {
        ctx.globalCompositeOperation = 'lighter';
        const a = 0.35 + Math.sin(this.t * 16) * 0.25;
        SH.Assets.draw(ctx, 'glowHot', this.x, this.y, 0, 1.8, a);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }

  // ---------------------------------------------------------------- Formationer

  /*
   * Bygger enskilda fiendeinstanser ur en vågdefinition.
   * Returnerar [{ delay, opts }].
   */
  function buildWave(def) {
    const n = def.count || 1;
    const x = def.x !== undefined ? def.x : W / 2;
    const startY = def.startY !== undefined ? def.startY : -30;
    const formation = def.formation || 'single';
    let leaderIndex = -1;
    if (def.leader) {
      if (typeof def.leader === 'number') leaderIndex = def.leader;
      else if (formation === 'train') leaderIndex = n - 1;
      else if (formation === 'line') leaderIndex = Math.floor(n / 2);
      else leaderIndex = 0;
    }

    const out = [];
    for (let i = 0; i < n; i++) {
      const type = i === leaderIndex ? 'leader' : def.enemy;
      const params = Object.assign({}, def.params, { x });
      const opts = { type, path: def.path, x, y: startY, hp: def.hp, params, offX: 0, offY: 0 };
      let delay = 0;

      if (formation === 'v') {
        const kx = Math.ceil(i / 2);
        const side = i % 2 === 1 ? -1 : 1;
        opts.offX = side * kx * (def.spacing || 32);
        opts.offY = -kx * 26;
      } else if (formation === 'line') {
        opts.offX = (i - (n - 1) / 2) * (def.spacing || 48);
      } else if (formation === 'train') {
        delay = i * (def.delay || 0.3);
      } else if (formation === 'row') {
        // Dykare: sprids ut på rad och dyker i tur och ordning
        const spacing = def.spacing || 80;
        params.tx = x + (i - (n - 1) / 2) * spacing;
        params.ty = def.y || 110;
        params.hold = (def.params && def.params.hold !== undefined ? def.params.hold : 0.8) + i * (def.stagger || 0.35);
        opts.x = params.tx;
        params.x = params.tx;
        delay = i * 0.12;
      }
      out.push({ delay, opts });
    }
    return out;
  }

  SH.Enemy = Enemy;
  SH.buildWave = buildWave;
})();
