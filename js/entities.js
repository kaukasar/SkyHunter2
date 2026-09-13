(function () {
  'use strict';

  const C = SH.CONFIG;
  const U = SH.U;
  const W = C.WIDTH;
  const H = C.HEIGHT;
  const Input = SH.Input;

  // ---------------------------------------------------------------- Spelare

  class Player {
    constructor(game) {
      this.game = game;
      this.hw = C.PLAYER_HITBOX.hw;
      this.hh = C.PLAYER_HITBOX.hh;
      this.reset();
    }

    reset() {
      this.x = W / 2;
      this.y = H - C.PLAYER_SPAWN_OFFSET;
      this.alive = true;
      this.invuln = 0;
      this.resetWeapon();
      this.fireCd = 0;
      this.bank = 0;
      this.flameT = 0;
      this.entering = false;
      this.autopilot = false;
      this.autoT = 0;
      this.vy = 0;
    }

    /* Inflygning underifrån vid start av en ny bana. */
    enterFromBottom() {
      this.x = W / 2;
      this.y = H + 40;
      this.alive = true;
      this.entering = true;
      this.autopilot = false;
      this.vy = 0;
      this.bank = 0;
      this.invuln = 0;
    }

    respawn() {
      this.x = W / 2;
      this.y = H - C.PLAYER_SPAWN_OFFSET;
      this.alive = true;
      this.invuln = C.INVULN_TIME;
      this.resetWeapon();
      this.fireCd = 0.25;
      this.bank = 0;
    }

    startAutopilot() {
      this.autopilot = true;
      this.autoT = 0;
      this.vy = 0;
    }

    get controllable() {
      return this.alive && !this.entering && !this.autopilot;
    }

    get vulnerable() {
      return this.controllable && this.invuln <= 0;
    }

    update(dt, controls) {
      if (!this.alive) return;
      this.flameT += dt;
      if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);

      if (this.autopilot) {
        this.autoT += dt;
        this.bank *= 0.9;
        if (this.autoT < 1.0) {
          this.x = U.lerp(this.x, W / 2, Math.min(1, dt * 2.5));
          this.y = U.lerp(this.y, H - 120, Math.min(1, dt * 2));
        } else {
          this.vy -= 1300 * dt;
          this.y += this.vy * dt;
        }
        return;
      }

      if (this.entering) {
        this.y -= 200 * dt;
        const target = H - C.PLAYER_SPAWN_OFFSET;
        if (this.y <= target) {
          this.y = target;
          this.entering = false;
        }
        return;
      }

      if (!controls) return;

      let dx = (Input.isDown('right') ? 1 : 0) - (Input.isDown('left') ? 1 : 0);
      let dy = (Input.isDown('down') ? 1 : 0) - (Input.isDown('up') ? 1 : 0);
      if (dx !== 0 && dy !== 0) {
        // Konstant hastighet även diagonalt
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
      }
      const hw = C.PLAYER_SIZE.w / 2;
      const hh = C.PLAYER_SIZE.h / 2;
      this.x = U.clamp(this.x + dx * C.PLAYER_SPEED * dt, hw, W - hw);
      this.y = U.clamp(this.y + dy * C.PLAYER_SPEED * dt, hh, H - hh);
      this.bank = U.lerp(this.bank, dx, Math.min(1, dt * 10));

      this.fireCd -= dt;
      if (Input.isDown('fire') && this.fireCd <= 0) this.fire();
    }

    fire() {
      const game = this.game;
      const volley = this.weapon;
      if (game.playerBullets.length + volley > C.MAX_PLAYER_BULLETS) return;

      const v = C.PLAYER_BULLET_SPEED;
      const y = this.y - 20;
      if (this.weapon === 1) {
        game.playerBullets.push(new PlayerBullet(this.x, y, 0, -v));
      } else if (this.weapon === 2) {
        game.playerBullets.push(new PlayerBullet(this.x - 9, y + 6, 0, -v));
        game.playerBullets.push(new PlayerBullet(this.x + 9, y + 6, 0, -v));
      } else {
        const a = (C.TRIPLE_SPREAD_DEG * Math.PI) / 180;
        game.playerBullets.push(new PlayerBullet(this.x, y, 0, -v));
        game.playerBullets.push(new PlayerBullet(this.x - 7, y + 6, -Math.sin(a) * v, -Math.cos(a) * v));
        game.playerBullets.push(new PlayerBullet(this.x + 7, y + 6, Math.sin(a) * v, -Math.cos(a) * v));
      }
      this.fireCd = C.FIRE_COOLDOWN;
      SH.Audio.play('shoot');
    }

    resetWeapon() {
      this.weapon = 1;
      this.upgradeProgress = 0; // insamlade P mot nästa nivå
    }

    /* Antal P som krävs för att nå nästa vapennivå. */
    get upgradeCost() {
      return C.WEAPON_UPGRADE_COST[this.weapon - 1] || 1;
    }

    /* Registrerar en insamlad power-up. Returnerar 'upgraded', 'progress' eller 'max'. */
    upgradeWeapon() {
      if (this.weapon >= C.WEAPON_MAX_LEVEL) return 'max';
      this.upgradeProgress++;
      if (this.upgradeProgress < this.upgradeCost) return 'progress';
      this.weapon++;
      this.upgradeProgress = 0;
      return 'upgraded';
    }

    draw(ctx) {
      if (!this.alive) return;
      if (this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 1) return;

      const A = SH.Assets;
      const flicker = 0.75 + Math.sin(this.flameT * 50) * 0.15 + Math.random() * 0.1;
      const boost = this.autopilot && this.autoT > 1 ? 2.2 : 1;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.globalCompositeOperation = 'lighter';
      const fl = A.sprites.playerFlame;
      ctx.drawImage(fl.img, -fl.w / 2, 19, fl.w, fl.h * flicker * boost);
      ctx.globalCompositeOperation = 'source-over';
      ctx.scale(1 - Math.abs(this.bank) * 0.18, 1);
      A.draw(ctx, 'player', 0, 0);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- Projektiler

  class PlayerBullet {
    constructor(x, y, vx, vy) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.hw = 3;
      this.hh = 9;
      this.rot = Math.atan2(vx, -vy);
      this.dead = false;
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.y < -20 || this.x < -20 || this.x > W + 20) this.dead = true;
    }

    draw(ctx) {
      SH.Assets.draw(ctx, 'bulletPlayer', this.x, this.y, this.rot);
    }
  }

  class EnemyBullet {
    constructor(x, y, vx, vy, big) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.big = !!big;
      this.hw = big ? 5 : 3.5;
      this.hh = this.hw;
      this.dead = false;
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.y < -30 || this.y > H + 30 || this.x < -30 || this.x > W + 30) this.dead = true;
    }

    draw(ctx) {
      SH.Assets.draw(ctx, this.big ? 'bulletEnemyBig' : 'bulletEnemy', this.x, this.y);
    }
  }

  // ---------------------------------------------------------------- Power-up

  class PowerUp {
    constructor(x, y) {
      this.x = U.clamp(x, 16, W - 16);
      this.y = y;
      this.hw = 13;
      this.hh = 13;
      this.t = 0;
      this.dead = false;
    }

    update(dt) {
      this.t += dt;
      this.y += C.POWERUP_FALL_SPEED * dt; // faller vertikalt
      if (this.y > H + 20) this.dead = true;
    }

    draw(ctx) {
      const name = Math.floor(this.t * 8) % 2 === 0 ? 'powerA' : 'powerB';
      const pulse = 1 + Math.sin(this.t * 10) * 0.06;
      SH.Assets.draw(ctx, name, this.x, this.y, 0, pulse);
    }
  }

  SH.Player = Player;
  SH.PlayerBullet = PlayerBullet;
  SH.EnemyBullet = EnemyBullet;
  SH.PowerUp = PowerUp;
})();
