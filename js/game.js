(function () {
  'use strict';

  const C = SH.CONFIG;
  const U = SH.U;
  const W = C.WIDTH;
  const H = C.HEIGHT;
  const Input = SH.Input;
  const Audio = SH.Audio;
  const HUD = SH.HUD;

  /*
   * Speltillstånd:
   *   title -> playing <-> paused
   *   playing -> stageclear -> playing (nästa bana)
   *   playing -> gameover -> highscore -> title
   */
  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      const params = new URLSearchParams(window.location.search);
      this.debug = params.has('debug');
      this.god = params.has('god');
      this.startStageParam = U.clamp(parseInt(params.get('stage'), 10) || 1, 1, SH.STAGES.length) - 1;
      this.startLoopParam = Math.max(0, parseInt(params.get('loop'), 10) || 0);
      this.skipToBoss = params.has('boss');

      this.bg = new SH.Background();
      this.fx = new SH.Effects();
      SH.HighScores.load();

      this.score = 0;
      this.lives = C.START_LIVES;
      this.loop = 0;
      this.stageIndex = 0;
      this.stageTime = 0;
      this.diff = this.computeDifficulty();
      this.scrollSpeed = 60;
      this.menuIndex = 0;
      this.banner = null;
      this.entry = null;

      this.resetWorld();
      this.setState('title');

      this.fps = 60;
      this.ups = 60;
      this.upsCount = 0;
      this.upsTimer = 0;

      this.resize();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('blur', () => this.pause(true));
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.pause(true);
      });
    }

    // ------------------------------------------------------------ Loop

    start() {
      this.last = performance.now();
      this.acc = 0;
      const frame = (now) => {
        let dt = (now - this.last) / 1000;
        this.last = now;
        if (dt > C.MAX_FRAME_TIME) dt = C.MAX_FRAME_TIME;
        if (dt > 0) this.fps = U.lerp(this.fps, 1 / dt, 0.05);

        // Fast tidssteg: identisk spelhastighet oavsett skärmens Hz
        this.acc += dt;
        while (this.acc >= C.STEP) {
          this.update(C.STEP);
          Input.endStep();
          this.acc -= C.STEP;
          this.upsCount++;
        }
        this.upsTimer += dt;
        if (this.upsTimer >= 1) {
          this.ups = this.upsCount / this.upsTimer;
          this.upsCount = 0;
          this.upsTimer = 0;
        }

        this.render();
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }

    resize() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let cw = vw;
      let ch = (vw * H) / W;
      if (ch > vh) {
        ch = vh;
        cw = (vh * W) / H;
      }
      cw = Math.floor(cw);
      ch = Math.floor(ch);
      const dpr = window.devicePixelRatio || 1;
      this.canvas.style.width = cw + 'px';
      this.canvas.style.height = ch + 'px';
      this.canvas.width = Math.max(1, Math.round(cw * dpr));
      this.canvas.height = Math.max(1, Math.round(ch * dpr));
      this.scale = this.canvas.width / W;
    }

    setState(state) {
      this.state = state;
      this.stateTime = 0;
    }

    // ------------------------------------------------------------ Spelsession

    computeDifficulty() {
      const L = C.LOOP_SCALING;
      const S = C.STAGE_SCALING;
      const n = this.loop;
      const s = this.stageIndex;
      return {
        speed: 1 + L.speed * n,
        fire: (1 + L.fireRate * n) * (1 + S.fireRate * s),
        bulletSpeed: (1 + L.bulletSpeed * n) * (1 + S.bulletSpeed * s),
        bossHp: 1 + L.bossHp * n,
      };
    }

    get stageNumber() {
      return this.loop * SH.STAGES.length + this.stageIndex + 1;
    }

    resetWorld() {
      this.player = new SH.Player(this);
      this.playerBullets = [];
      this.enemyBullets = [];
      this.enemies = [];
      this.powerUps = [];
      this.boss = null;
      this.spawnQueue = [];
      this.fx.clear();
      this.respawnTimer = 0;
      this.gameOverTimer = null;
      this.clearWait = 0;
    }

    newGame() {
      this.score = 0;
      this.lives = C.START_LIVES;
      this.nextExtend = C.EXTEND_FIRST;
      this.powerUpChances = 0;
      this.loop = this.startLoopParam;
      this.stageIndex = this.startStageParam;
      this.newHighScore = false;
      this.entry = null;
      this.resetWorld();
      this.startStage();
      this.setState('playing');
    }

    startStage() {
      this.stage = SH.STAGES[this.stageIndex];
      this.diff = this.computeDifficulty();
      this.stageTime = 0;
      this.waveIndex = 0;
      this.spawnQueue.length = 0;
      this.clearWait = 0;
      this.finalWaveActive = false;
      this.bg.setTheme(this.stage.theme);
      this.player.enterFromBottom();

      const sub = this.loop > 0
        ? this.stage.name + ' · VARV ' + (this.loop + 1) + ' – FIENDERNA ÄR SNABBARE!'
        : this.stage.name;
      this.showBanner('STAGE ' + this.stageNumber, sub, 3);

      if (this.skipToBoss) {
        const waves = this.stage.waves;
        let idx = waves.length - 1;
        for (let i = waves.length - 1; i >= 0; i--) {
          if (waves[i].warning) { idx = i; break; }
        }
        this.waveIndex = idx;
        this.stageTime = waves[idx].at - 2;
      }
    }

    nextStage() {
      this.stageIndex++;
      if (this.stageIndex >= SH.STAGES.length) {
        // Looping: tillbaka till bana 1 med högre svårighetsgrad
        this.stageIndex = 0;
        this.loop++;
      }
      this.playerBullets.length = 0;
      this.enemyBullets.length = 0;
      this.powerUps.length = 0;
      this.enemies.length = 0;
      this.boss = null;
      this.startStage();
      this.setState('playing');
    }

    showBanner(textStr, sub, life, style) {
      this.banner = { text: textStr, sub, life, t: 0, style };
    }

    addScore(n) {
      if (this.state !== 'playing' && this.state !== 'stageclear') return;
      this.score += n;
      while (this.score >= this.nextExtend) {
        this.nextExtend += C.EXTEND_EVERY;
        this.lives++;
        Audio.play('extend');
        this.fx.popup(this.player.x, this.player.y - 40, '1UP! EXTRA LIV', '#7fffb0', true);
      }
    }

    // ------------------------------------------------------------ Uppdatering

    update(dt) {
      this.stateTime += dt;
      if (Input.wasPressed('mute') && !(this.entry && this.entry.active)) Audio.toggleMute();

      switch (this.state) {
        case 'title': this.updateTitle(dt); break;
        case 'playing': this.updatePlaying(dt); break;
        case 'paused': this.updatePaused(); break;
        case 'stageclear': this.updateStageClear(dt); break;
        case 'gameover': this.updateGameOver(dt); break;
        case 'highscore': this.updateHighScore(dt); break;
      }
    }

    updateTitle(dt) {
      this.scrollSpeed = 60;
      if (this.bg.theme !== 'space') this.bg.setTheme('space');
      this.bg.update(dt, this.scrollSpeed);
      if (this.stateTime > 0.3 && Input.wasPressed('confirm')) {
        Audio.play('select');
        this.newGame();
      }
    }

    updatePlaying(dt) {
      if (Input.wasPressed('pause')) {
        this.pause(false);
        return;
      }

      this.stageTime += dt;
      const waves = this.stage.waves;
      while (this.waveIndex < waves.length && this.stageTime >= waves[this.waveIndex].at) {
        this.spawnWave(waves[this.waveIndex++]);
      }
      for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
        if (this.stageTime >= this.spawnQueue[i].at) {
          const item = this.spawnQueue[i];
          this.spawnQueue.splice(i, 1);
          item.fn();
        }
      }

      this.updateWorld(dt, true);

      if (this.gameOverTimer !== null) {
        this.gameOverTimer -= dt;
        if (this.gameOverTimer <= 0) this.enterGameOver();
        return;
      }

      if (this.isStageComplete() && this.player.alive && !this.player.entering) {
        this.clearWait += dt;
        if (this.clearWait > 1.5) this.enterStageClear();
      } else {
        this.clearWait = 0;
      }
    }

    isStageComplete() {
      return this.waveIndex >= this.stage.waves.length &&
        this.spawnQueue.length === 0 &&
        this.enemies.length === 0 &&
        !this.boss;
    }

    updateWorld(dt, controls) {
      // Skrollhastighet varierar per bana och sekvens
      let target = this.stage ? this.stage.scroll : 60;
      if (this.boss) target *= 0.5;
      if (this.state === 'stageclear' && this.stateTime > 1) target *= 5;
      this.scrollSpeed = U.lerp(this.scrollSpeed, target, Math.min(1, dt * 1.5));
      this.bg.update(dt, this.scrollSpeed);

      this.player.update(dt, controls);
      for (const b of this.playerBullets) b.update(dt);
      for (const b of this.enemyBullets) b.update(dt);
      for (const e of this.enemies) e.update(dt);
      for (const p of this.powerUps) p.update(dt);
      if (this.boss) {
        this.boss.update(dt);
        if (this.boss.dead) this.boss = null;
      }

      if (this.state === 'playing' || this.state === 'stageclear') this.handleCollisions();

      for (const e of this.enemies) {
        if (e.escaped && !e.dead) this.onEnemyGone(e, false);
      }
      U.compact(this.enemies, (e) => !e.dead && !e.escaped);
      U.compact(this.playerBullets, (b) => !b.dead);
      U.compact(this.enemyBullets, (b) => !b.dead);
      U.compact(this.powerUps, (p) => !p.dead);

      if (!this.player.alive && this.lives > 0 && this.gameOverTimer === null) {
        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) this.player.respawn();
      }

      this.fx.update(dt);
      if (this.banner) {
        this.banner.t += dt;
        if (this.banner.t >= this.banner.life) this.banner = null;
      }
    }

    handleCollisions() {
      const player = this.player;

      // Spelarprojektil -> fiende / boss
      for (const b of this.playerBullets) {
        if (b.dead) continue;
        for (const e of this.enemies) {
          if (e.dead || e.escaped || !U.overlap(b, e)) continue;
          b.dead = true;
          if (e.damage(1)) {
            this.killEnemy(e);
          } else {
            this.fx.sparks(b.x, b.y - 4, 'cyan', 3);
            Audio.play('hit');
          }
          break;
        }
        if (b.dead || !this.boss) continue;
        const hit = this.boss.hitTest(b);
        if (hit === 'body') {
          b.dead = true;
          this.fx.sparks(b.x, b.y, 'hot', 3);
          Audio.play('clang');
        } else if (hit) {
          b.dead = true;
          this.fx.sparks(b.x, b.y, 'pink', 4);
          this.boss.damagePart(hit);
        }
      }

      if (player.alive) {
        // Power-ups kan samlas även under osårbarhet
        for (const p of this.powerUps) {
          if (!p.dead && U.overlap(p, player)) {
            p.dead = true;
            this.collectPowerUp(p);
          }
        }
      }

      if (!player.vulnerable || this.god) return;

      // Fiendeprojektil -> spelare
      for (const b of this.enemyBullets) {
        if (!b.dead && U.overlap(b, player)) {
          b.dead = true;
          this.killPlayer();
          return;
        }
      }

      // Fiendeskepp -> spelare
      for (const e of this.enemies) {
        if (!e.dead && !e.escaped && U.overlap(e, player)) {
          e.dead = true;
          this.fx.explosion(e.x, e.y, e.type === 'heavy' ? 1.5 : 0.9);
          this.onEnemyGone(e, false);
          this.killPlayer();
          return;
        }
      }

      // Bosskrov -> spelare
      if (this.boss && this.boss.active && U.overlap(this.boss, player)) {
        this.killPlayer();
      }
    }

    killEnemy(e) {
      e.dead = true;
      const big = e.type === 'heavy';
      this.fx.explosion(e.x, e.y, big ? 1.5 : 0.8);
      if (big) this.fx.addShake(5);
      Audio.play(big ? 'boom' : 'boomSmall');
      this.addScore(e.points);
      if (big || e.type === 'leader') this.fx.popup(e.x, e.y - 18, String(e.points), '#ffe07a');
      if (e.type === 'leader') this.spawnPowerUp(e.x, e.y);
      this.onEnemyGone(e, true);
    }

    /* Håller reda på vågor; en helt utplånad våg ger bonus och en power-up. */
    onEnemyGone(e, killed) {
      const w = e.wave;
      if (!w || w.resolved) return;
      if (killed) {
        w.killed++;
        w.lastX = e.x;
        w.lastY = e.y;
      } else {
        w.lost++;
      }
      if (w.killed + w.lost < w.total || w.pending > 0) return;
      w.resolved = true;
      if (w.lost === 0 && w.total >= C.WAVE_BONUS_MIN_SIZE) {
        this.addScore(C.SCORE.waveBonus);
        this.fx.popup(U.clamp(w.lastX, 90, W - 90), w.lastY - 24, 'VÅGBONUS ' + C.SCORE.waveBonus, '#7fffb0', true);
        Audio.play('bonus');
        if (!w.hasLeader) this.spawnPowerUp(w.lastX, w.lastY);
      }
    }

    /* Anropas vid varje power-up-tillfälle; endast vart N:e ger en power-up. */
    spawnPowerUp(x, y) {
      // Spärrtid i början av bana 1 i ett nytt spel; spärrade tillfällen räknas inte
      const firstStage = this.loop === 0 && this.stageIndex === 0;
      if (firstStage && this.stageTime < C.POWERUP_START_DELAY) return;
      const n = this.powerUpChances++;
      if (n % C.POWERUP_DROP_INTERVAL !== 0) return;
      this.powerUps.push(new SH.PowerUp(x, y));
    }

    collectPowerUp(p) {
      const labels = ['', 'ENKELSKOTT', 'DUBBELSKOTT', 'TRIPPELSKOTT'];
      const pl = this.player;
      const result = pl.upgradeWeapon();
      if (result === 'upgraded') {
        Audio.play('powerUp');
        this.fx.popup(p.x, p.y - 20, labels[pl.weapon] + '!', '#8fe6ff', true);
      } else if (result === 'progress') {
        Audio.play('select');
        this.fx.popup(p.x, p.y - 20, labels[pl.weapon + 1] + ' ' + pl.upgradeProgress + '/' + pl.upgradeCost, '#8fe6ff', true);
      } else {
        this.addScore(C.SCORE.powerUpAtMax);
        Audio.play('bonus');
        this.fx.popup(p.x, p.y - 20, 'BONUS ' + C.SCORE.powerUpAtMax, '#ffe07a', true);
      }
      this.fx.sparks(p.x, p.y, 'cyan', 10);
    }

    killPlayer() {
      const p = this.player;
      p.alive = false;
      p.resetWeapon(); // vapennivå och uppgraderingsförlopp återställs vid livförlust
      this.fx.explosion(p.x, p.y, 1.8);
      this.fx.addShake(12);
      Audio.play('playerDie');
      this.lives = Math.max(0, this.lives - 1);
      if (this.lives === 0) {
        this.gameOverTimer = 2.2;
      } else {
        this.respawnTimer = C.RESPAWN_DELAY;
      }
    }

    spawnWave(def) {
      if (def.warning) {
        // Slutvågssekvensen: fiender som skapas härefter får ökad tålighet
        if (def.finalWave) this.finalWaveActive = true;
        this.showBanner(def.warning, def.sub, 3, 'warning');
        Audio.play('warning');
        return;
      }
      if (def.boss) {
        this.boss = new SH.Boss(this, def.boss);
        return;
      }

      const members = SH.buildWave(def);
      const wave = { total: members.length, killed: 0, lost: 0, pending: 0, lastX: W / 2, lastY: H / 2, resolved: false, hasLeader: !!def.leader };
      members.forEach((m) => {
        m.opts.wave = wave;
        const spawn = () => this.enemies.push(new SH.Enemy(this, m.opts));
        if (m.delay > 0) {
          wave.pending++;
          this.spawnQueue.push({
            at: this.stageTime + m.delay,
            fn: () => {
              wave.pending--;
              spawn();
            },
          });
        } else {
          spawn();
        }
      });
    }

    onBossDefeated(boss) {
      this.addScore(Math.round(boss.def.points * (1 + this.loop * 0.5)));
      this.fx.popup(boss.x, boss.y + 70, String(Math.round(boss.def.points * (1 + this.loop * 0.5))), '#ffe07a', true);
      for (const b of this.enemyBullets) this.fx.sparks(b.x, b.y, 'pink', 1);
      this.enemyBullets.length = 0;
    }

    enterStageClear() {
      this.setState('stageclear');
      this.player.startAutopilot();
      this.showBanner('STAGE ' + this.stageNumber + ' KLAR!', 'BRA FLUGET, PILOT!', 3.6);
      Audio.play('stageClear');
      this.enemyBullets.length = 0;
    }

    updateStageClear(dt) {
      if (Input.wasPressed('pause')) {
        this.pause(false);
        return;
      }
      this.updateWorld(dt, false);
      if (this.stateTime > 4.2) this.nextStage();
    }

    enterGameOver() {
      this.gameOverTimer = null;
      const previousBest = SH.HighScores.best();
      this.newHighScore = this.score > previousBest;
      // High score sparas direkt i Local Storage; initialer kan anges i nästa steg
      const name = SH.HighScores.lastName();
      const rank = SH.HighScores.insert(name, this.score);
      this.entry = { rank, active: rank >= 0, chars: name.split(''), cursor: 0 };
      this.playerBullets.length = 0;
      this.setState('gameover');
      Audio.play('gameOver');
    }

    updateGameOver(dt) {
      this.updateWorld(dt, false);
      if ((this.stateTime > 1.5 && Input.wasPressed('confirm')) || this.stateTime > 12) {
        Audio.play('select');
        this.setState('highscore');
      }
    }

    updateHighScore(dt) {
      this.bg.update(dt, 40);
      this.fx.update(dt);
      const e = this.entry;

      if (e && e.active) {
        const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (const ch of Input.typedChars()) {
          e.chars[e.cursor] = ch;
          e.cursor = Math.min(2, e.cursor + 1);
          Audio.play('select');
        }
        const cycle = (d) => {
          const i = CHARS.indexOf(e.chars[e.cursor]);
          e.chars[e.cursor] = CHARS[(i + d + CHARS.length) % CHARS.length];
          Audio.play('select');
        };
        if (Input.codePressed('ArrowUp')) cycle(1);
        if (Input.codePressed('ArrowDown')) cycle(-1);
        if (Input.codePressed('ArrowLeft') || Input.codePressed('Backspace')) e.cursor = Math.max(0, e.cursor - 1);
        if (Input.codePressed('ArrowRight')) e.cursor = Math.min(2, e.cursor + 1);
        if (Input.codePressed('Enter') || Input.codePressed('NumpadEnter')) {
          SH.HighScores.rename(e.rank, e.chars.join(''));
          e.active = false;
          this.stateTime = 0;
          Audio.play('powerUp');
        }
        return;
      }

      if (this.stateTime > 0.4 && Input.wasPressed('confirm')) {
        Audio.play('select');
        this.resetWorld();
        this.banner = null;
        this.setState('title');
      }
    }

    // ------------------------------------------------------------ Paus

    pause(auto) {
      if (this.state !== 'playing' && this.state !== 'stageclear') return;
      this.pausedFrom = this.state;
      this.pausedStateTime = this.stateTime;
      this.pauseAuto = auto;
      this.menuIndex = 0;
      this.setState('paused');
      Audio.play('pause');
    }

    resume() {
      this.state = this.pausedFrom;
      this.stateTime = this.pausedStateTime;
      Audio.play('select');
    }

    updatePaused() {
      if (this.stateTime < 0.1) return;
      if (Input.wasPressed('pause')) {
        this.resume();
        return;
      }
      if (Input.wasPressed('menuUp') || Input.wasPressed('menuDown')) {
        this.menuIndex = 1 - this.menuIndex;
        Audio.play('select');
      }
      if (Input.wasPressed('confirm')) {
        if (this.menuIndex === 0) {
          this.resume();
        } else {
          Audio.play('select');
          this.resetWorld();
          this.banner = null;
          this.setState('title');
        }
      }
    }

    // ------------------------------------------------------------ Rendering

    render() {
      const ctx = this.ctx;
      ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      ctx.imageSmoothingEnabled = true;

      const shake = this.fx.shake;
      ctx.save();
      if (shake > 0 && this.state !== 'paused') {
        ctx.translate(U.rand(-shake, shake) * 0.5, U.rand(-shake, shake) * 0.5);
      }
      this.bg.draw(ctx, this.scrollSpeed);

      const world = this.state !== 'title' && this.state !== 'highscore';
      if (world) this.drawWorld(ctx);
      ctx.restore();

      switch (this.state) {
        case 'title':
          HUD.drawTitle(ctx, this);
          break;
        case 'playing':
        case 'stageclear':
          HUD.drawGameplay(ctx, this);
          HUD.drawBanner(ctx, this.banner);
          break;
        case 'paused':
          HUD.drawGameplay(ctx, this);
          HUD.drawPause(ctx, this);
          break;
        case 'gameover':
          HUD.drawGameplay(ctx, this);
          HUD.drawGameOver(ctx, this);
          break;
        case 'highscore':
          this.fx.draw(ctx);
          HUD.drawHighScore(ctx, this);
          break;
      }

      if (this.debug && world) HUD.drawDebug(ctx, this);
    }

    drawWorld(ctx) {
      for (const p of this.powerUps) p.draw(ctx);
      if (this.boss) this.boss.draw(ctx);
      for (const e of this.enemies) e.draw(ctx);
      for (const b of this.playerBullets) b.draw(ctx);
      this.player.draw(ctx);
      this.fx.draw(ctx);
      for (const b of this.enemyBullets) b.draw(ctx);
      this.fx.drawPopups(ctx);
    }
  }

  SH.Game = Game;
})();
