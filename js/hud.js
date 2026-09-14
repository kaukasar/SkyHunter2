(function () {
  'use strict';

  const C = SH.CONFIG;
  const U = SH.U;
  const W = C.WIDTH;
  const H = C.HEIGHT;
  const MONO = C.FONT_MONO;
  const DISPLAY = C.FONT_DISPLAY;

  function text(ctx, str, x, y, o) {
    const opts = o || {};
    ctx.font = (opts.weight || 'bold') + ' ' + (opts.size || 12) + 'px ' + (opts.font || MONO);
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = opts.baseline || 'middle';
    ctx.lineJoin = 'round';
    if (opts.glow) {
      ctx.shadowColor = opts.glow;
      ctx.shadowBlur = opts.glowBlur || 12;
    }
    if (opts.stroke) {
      ctx.lineWidth = opts.strokeWidth || 3;
      ctx.strokeStyle = opts.stroke;
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = opts.color || '#ffffff';
    ctx.fillText(str, x, y);
    ctx.shadowBlur = 0;
  }

  function dim(ctx, alpha) {
    ctx.fillStyle = 'rgba(2,4,14,' + alpha + ')';
    ctx.fillRect(0, 0, W, H);
  }

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(6,14,32,0.72)';
    ctx.strokeStyle = 'rgba(110,200,255,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
  }

  const blink = (t, rate) => Math.floor(t * (rate || 2.5)) % 2 === 0;

  function logo(ctx, x, y, size) {
    ctx.save();
    ctx.font = 'italic 900 ' + size + 'px ' + DISPLAY;
    const width = ctx.measureText('SKY HUNTER').width;
    const maxW = W - 40;
    ctx.translate(x, y);
    if (width > maxW) ctx.scale(maxW / width, maxW / width);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#8fe6ff');
    g.addColorStop(0.55, '#2c8cff');
    g.addColorStop(1, '#1440a8');
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#04102a';
    ctx.strokeText('SKY HUNTER', 0, 0);
    ctx.shadowColor = '#3cc8ff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = g;
    ctx.fillText('SKY HUNTER', 0, 0);
    ctx.restore();
  }

  function scoreTable(ctx, list, y, highlight, t) {
    list.forEach((e, i) => {
      const yy = y + i * 26;
      const hl = i === highlight;
      const color = hl ? (blink(t, 4) ? '#ffe45c' : '#ffffff') : i === 0 ? '#8fe6ff' : '#d8e4f0';
      text(ctx, (i + 1) + '.', 120, yy, { align: 'right', size: 16, color });
      text(ctx, e.name, 160, yy, { align: 'left', size: 16, color });
      text(ctx, U.pad(e.score, 7), 360, yy, { align: 'right', size: 16, color });
    });
  }

  SH.HUD = {
    text,

    drawGameplay(ctx, game) {
      // Övre informationslist
      const g = ctx.createLinearGradient(0, 0, 0, 40);
      g.addColorStop(0, 'rgba(0,0,0,0.65)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, 40);

      const high = Math.max(SH.HighScores.best(), game.score);
      text(ctx, 'SCORE', 10, 10, { align: 'left', size: 10, color: '#ff6a6a' });
      text(ctx, U.pad(game.score, 7), 10, 24, { align: 'left', size: 16, stroke: '#000' });
      text(ctx, 'HIGH SCORE', W / 2, 10, { size: 10, color: '#ffd24a' });
      text(ctx, U.pad(high, 7), W / 2, 24, { size: 16, stroke: '#000' });
      text(ctx, 'STAGE', W - 10, 10, { align: 'right', size: 10, color: '#6ad8ff' });
      text(ctx, String(game.stageNumber), W - 10, 24, { align: 'right', size: 16, stroke: '#000' });
      if (game.difficulty === 'hard') {
        text(ctx, C.DIFFICULTIES.hard.label, W - 10, 38, { align: 'right', size: 10, color: '#ff6a6a', stroke: '#000' });
      }

      // Liv (ikoner)
      const lives = game.lives;
      text(ctx, 'LIVES', 10, H - 30, { align: 'left', size: 9, color: '#9fb3c6' });
      const shown = Math.min(lives, 6);
      for (let i = 0; i < shown; i++) {
        SH.Assets.draw(ctx, 'player', 18 + i * 20, H - 14, 0, 0.42);
      }
      if (lives > 6) text(ctx, 'x' + lives, 18 + 6 * 20, H - 14, { align: 'left', size: 12, stroke: '#000' });

      // Vapennivå
      text(ctx, 'VAPEN', W - 10, H - 30, { align: 'right', size: 9, color: '#9fb3c6' });
      for (let i = 0; i < C.WEAPON_MAX_LEVEL; i++) {
        const on = i < game.player.weapon;
        ctx.fillStyle = on ? '#5fe6ff' : 'rgba(255,255,255,0.15)';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(W - 58 + i * 16, H - 20, 12, 10, 2);
        ctx.fill();
        ctx.stroke();
      }
      // Förlopp mot nästa nivå när den kräver flera P
      const pl = game.player;
      if (pl.weapon < C.WEAPON_MAX_LEVEL && pl.upgradeCost > 1) {
        text(ctx, 'P ' + pl.upgradeProgress + '/' + pl.upgradeCost, W - 64, H - 15, { align: 'right', size: 10, color: '#8fe6ff', stroke: '#000' });
      }

      // Bosshälsa
      const boss = game.boss;
      if (boss && boss.phase !== 'enter') {
        const bw = 260;
        const x = (W - bw) / 2;
        const frac = boss.hpFraction;
        text(ctx, boss.def.name, W / 2, 44, { size: 10, color: '#ff9ad9', stroke: '#000' });
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - 2, 52, bw + 4, 8);
        const bg = ctx.createLinearGradient(x, 0, x + bw, 0);
        bg.addColorStop(0, '#ff3a6a');
        bg.addColorStop(1, '#ffb13a');
        ctx.fillStyle = bg;
        ctx.fillRect(x, 54, bw * frac, 4);
      }

      if (SH.Audio.isMuted()) text(ctx, 'LJUD AV (M)', W / 2, H - 12, { size: 9, color: 'rgba(255,255,255,0.5)' });
    },

    drawBanner(ctx, banner) {
      if (!banner) return;
      const k = banner.t / banner.life;
      let a = 1;
      if (banner.t < 0.25) a = banner.t / 0.25;
      else if (k > 0.8) a = (1 - k) / 0.2;
      ctx.globalAlpha = Math.max(0, a);
      const y = banner.y || H * 0.42;

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, y - 34, W, banner.sub ? 76 : 60);

      if (banner.style === 'warning') {
        const on = blink(banner.t, 4);
        ctx.fillStyle = on ? 'rgba(255,40,40,0.25)' : 'rgba(255,40,40,0.08)';
        ctx.fillRect(0, y - 34, W, 76);
        ctx.fillStyle = '#ff3a3a';
        ctx.fillRect(0, y - 34, W, 3);
        ctx.fillRect(0, y + 39, W, 3);
        text(ctx, banner.text, W / 2, y - 6, { size: 34, font: DISPLAY, weight: '900', color: on ? '#ffffff' : '#ff5050', glow: '#ff2020', stroke: '#300' });
      } else {
        text(ctx, banner.text, W / 2, y - 6, { size: 30, font: DISPLAY, weight: '900', color: banner.color || '#ffffff', glow: '#3cc8ff', stroke: '#04102a', strokeWidth: 5 });
      }
      if (banner.sub) text(ctx, banner.sub, W / 2, y + 24, { size: 13, color: '#d8ecff', stroke: '#000' });
      ctx.globalAlpha = 1;
    },

    drawLoading(ctx, progress, label, error) {
      ctx.fillStyle = '#02040e';
      ctx.fillRect(0, 0, W, H);
      logo(ctx, W / 2, H * 0.36, 52);
      if (error) {
        text(ctx, 'FEL VID INLÄSNING AV RESURSER', W / 2, H * 0.55, { size: 14, color: '#ff5a5a' });
        text(ctx, error, W / 2, H * 0.6, { size: 11, color: '#ffb0b0', weight: 'normal' });
        return;
      }
      text(ctx, 'LADDAR RESURSER...', W / 2, H * 0.55, { size: 13, color: '#8fe6ff' });
      const bw = 300;
      ctx.strokeStyle = '#3a6a9a';
      ctx.lineWidth = 2;
      ctx.strokeRect((W - bw) / 2, H * 0.59, bw, 14);
      ctx.fillStyle = '#5fe6ff';
      ctx.fillRect((W - bw) / 2 + 3, H * 0.59 + 3, (bw - 6) * progress, 8);
      text(ctx, Math.round(progress * 100) + '%  ' + label, W / 2, H * 0.65, { size: 10, color: '#6f8aa5', weight: 'normal' });
    },

    drawTitle(ctx, game) {
      const t = game.stateTime;
      dim(ctx, 0.35);
      logo(ctx, W / 2, 92, 62);
      text(ctx, 'ARKADSHOOTER', W / 2, 136, { size: 12, color: '#8fb8d8' });

      // Skepp med motorlåga
      const bob = Math.sin(t * 2) * 5;
      const fl = SH.Assets.sprites.playerFlame;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(fl.img, W / 2 - fl.w, 212 + bob + 38, fl.w * 2, fl.h * 2 * (0.85 + Math.random() * 0.2));
      ctx.globalCompositeOperation = 'source-over';
      SH.Assets.draw(ctx, 'player', W / 2, 212 + bob, 0, 1.8);

      // Växlande infopaneler
      const panelIndex = Math.floor(t / 6) % 3;
      panel(ctx, 40, 280, W - 80, 196);
      if (panelIndex === 0) {
        text(ctx, 'STYRNING', W / 2, 302, { size: 14, color: '#ffd24a' });
        const rows = [
          ['PILAR / W A S D', 'FLYG (8 RIKTNINGAR)'],
          ['MELLANSLAG / Z / K', 'SKJUT'],
          ['P / ESC', 'PAUS / MENY'],
          ['M', 'LJUD AV / PÅ'],
        ];
        rows.forEach(([k, v], i) => {
          text(ctx, k, W / 2 - 8, 338 + i * 30, { align: 'right', size: 13, color: '#8fe6ff' });
          text(ctx, v, W / 2 + 8, 338 + i * 30, { align: 'left', size: 13, color: '#e8f0f8' });
        });
        const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        text(ctx, 'Extra liv vid ' + fmt(C.EXTEND_FIRST) + ' och därefter var ' + fmt(C.EXTEND_EVERY) + ':e poäng', W / 2, 460, { size: 10, color: '#8fa3b8', weight: 'normal' });
      } else if (panelIndex === 1) {
        text(ctx, 'FIENDER & POÄNG', W / 2, 302, { size: 14, color: '#ffd24a' });
        const A = SH.Assets;
        const rows = [
          ['enemyBasic', 'BASFIENDE', '100-200'],
          ['enemyHeavy', 'TUNG FIENDE', '500-1000'],
          [blink(t, 8) ? 'enemyLeaderA' : 'enemyLeaderB', 'VÅGLEDARE', 'POWER-UP'],
          ['powerA', 'P = VAPENUPPGRADERING', ''],
        ];
        rows.forEach(([spr, name, pts], i) => {
          const y = 340 + i * 32;
          A.draw(ctx, spr, 100, y, 0, spr === 'enemyHeavy' ? 0.55 : 0.9);
          text(ctx, name, 130, y, { align: 'left', size: 13, color: '#e8f0f8' });
          text(ctx, pts, W - 60, y, { align: 'right', size: 13, color: '#8fe6ff' });
        });
        text(ctx, 'Utplåna hela vågor för 1 000 i bonus', W / 2, 460, { size: 10, color: '#8fa3b8', weight: 'normal' });
      } else {
        text(ctx, 'TOPPLISTA', W / 2, 302, { size: 14, color: '#ffd24a' });
        scoreTable(ctx, SH.HighScores.list, 336, -1, t);
      }
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === panelIndex ? '#8fe6ff' : 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(W / 2 - 14 + i * 14, 492, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      text(ctx, 'HIGH SCORE', W / 2, 520, { size: 11, color: '#ffd24a' });
      text(ctx, U.pad(SH.HighScores.best(), 7), W / 2, 540, { size: 20, stroke: '#000' });

      if (blink(t, 1.6)) {
        text(ctx, 'MELLANSLAG: STARTA NORMAL', W / 2, 574, { size: 13, color: '#ffffff', glow: '#3cc8ff' });
      }
      if (blink(t + 0.3, 1.6)) {
        text(ctx, 'ENTER: STARTA SVÅR', W / 2, 596, { size: 13, color: '#ff8a8a', glow: '#ff3030' });
      }
      text(ctx, SH.Audio.isMuted() ? 'LJUD: AV' : 'LJUD: PÅ', W / 2, 620, { size: 10, color: '#6f8aa5' });
    },

    drawPause(ctx, game) {
      dim(ctx, 0.62);
      text(ctx, 'PAUS', W / 2, 220, { size: 48, font: DISPLAY, weight: '900', color: '#ffffff', glow: '#3cc8ff', stroke: '#04102a', strokeWidth: 6 });
      if (game.pauseAuto) {
        text(ctx, 'Spelet pausades när fönstret tappade fokus', W / 2, 262, { size: 11, color: '#b8c8d8', weight: 'normal' });
      }
      const items = ['FORTSÄTT', 'AVSLUTA TILL STARTSKÄRMEN'];
      items.forEach((label, i) => {
        const sel = i === game.menuIndex;
        const y = 320 + i * 40;
        if (sel) {
          ctx.fillStyle = 'rgba(60,200,255,0.18)';
          ctx.fillRect(W / 2 - 150, y - 16, 300, 32);
        }
        text(ctx, (sel ? '▶ ' : '  ') + label, W / 2, y, { size: 16, color: sel ? '#ffe45c' : '#c8d8e8' });
      });
      text(ctx, '↑/↓ VÄLJ · ENTER BEKRÄFTA · P/ESC FORTSÄTT', W / 2, 430, { size: 10, color: '#8fa3b8' });
    },

    drawGameOver(ctx, game) {
      const t = game.stateTime;
      dim(ctx, Math.min(0.55, t * 0.6));
      const scale = t < 0.4 ? 1.6 - t * 1.5 : 1;
      ctx.save();
      ctx.translate(W / 2, 230);
      ctx.scale(scale, scale);
      text(ctx, 'GAME OVER', 0, 0, { size: 52, font: DISPLAY, weight: '900', color: '#ff4a4a', glow: '#ff0000', stroke: '#200', strokeWidth: 6 });
      ctx.restore();
      text(ctx, 'SLUTPOÄNG', W / 2, 300, { size: 13, color: '#ffd24a' });
      text(ctx, U.pad(game.score, 7), W / 2, 328, { size: 30, stroke: '#000', strokeWidth: 4 });
      text(ctx, 'NÅDDE STAGE ' + game.stageNumber + ' · ' + C.DIFFICULTIES[game.difficulty].label, W / 2, 360, { size: 12, color: '#9fb3c6' });
      if (game.newHighScore && blink(t, 3)) {
        text(ctx, 'NYTT HIGH SCORE!', W / 2, 400, { size: 22, color: '#ffe45c', glow: '#ffae00' });
      }
      if (t > 1.5 && blink(t, 1.6)) {
        text(ctx, 'TRYCK ENTER FÖR ATT FORTSÄTTA', W / 2, 470, { size: 13 });
      }
    },

    drawHighScore(ctx, game) {
      const t = game.stateTime;
      dim(ctx, 0.78);
      text(ctx, 'HIGH SCORE', W / 2, 80, { size: 40, font: DISPLAY, weight: '900', color: '#ffd24a', glow: '#ff9a00', stroke: '#2a1600', strokeWidth: 5 });
      const e = game.entry;

      if (e && e.active) {
        text(ctx, 'DU TOG PLATS ' + (e.rank + 1) + ' PÅ TOPPLISTAN!', W / 2, 135, { size: 15, color: '#8fe6ff' });
        text(ctx, U.pad(game.score, 7) + ' POÄNG', W / 2, 160, { size: 13, color: '#ffffff' });
        text(ctx, 'ANGE DINA INITIALER', W / 2, 200, { size: 13, color: '#c8d8e8' });
        for (let i = 0; i < 3; i++) {
          const x = W / 2 - 60 + i * 60;
          const sel = i === e.cursor;
          ctx.fillStyle = sel ? 'rgba(255,228,92,0.2)' : 'rgba(255,255,255,0.08)';
          ctx.strokeStyle = sel ? '#ffe45c' : '#5a7a9a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x - 22, 222, 44, 52, 6);
          ctx.fill();
          ctx.stroke();
          text(ctx, e.chars[i], x, 249, { size: 34, font: DISPLAY, weight: '900', color: sel && blink(t, 4) ? '#ffe45c' : '#ffffff' });
        }
        text(ctx, 'A-Z/0-9 SKRIV · ←/→ FLYTTA · ↑/↓ BYT TECKEN', W / 2, 296, { size: 10, color: '#8fa3b8' });
        text(ctx, 'ENTER SPARA', W / 2, 312, { size: 10, color: '#8fa3b8' });
      } else {
        text(ctx, e && e.rank >= 0 ? 'RESULTATET ÄR SPARAT' : 'TOPPLISTA', W / 2, 150, { size: 14, color: '#8fe6ff' });
      }

      const tableY = e && e.active ? 360 : 210;
      panel(ctx, 70, tableY - 26, W - 140, SH.HighScores.list.length * 26 + 26);
      scoreTable(ctx, SH.HighScores.list, tableY, e ? e.rank : -1, t);

      if (!(e && e.active) && t > 0.4 && blink(t, 1.6)) {
        text(ctx, 'TRYCK ENTER FÖR STARTSKÄRMEN', W / 2, 520, { size: 13 });
      }
    },

    drawDebug(ctx, game) {
      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 1;
      const box = (o) => ctx.strokeRect(o.x - o.hw, o.y - o.hh, o.hw * 2, o.hh * 2);
      if (game.player.alive) box(game.player);
      game.enemies.forEach(box);
      game.enemyBullets.forEach(box);
      game.powerUps.forEach(box);
      if (game.boss) {
        box(game.boss);
        ctx.strokeStyle = '#ff00ff';
        game.boss.parts.forEach((p) => ctx.strokeRect(game.boss.x + p.ox - p.r, game.boss.y + p.oy - p.r, p.r * 2, p.r * 2));
      }
      text(ctx, 'FPS ' + game.fps.toFixed(0) + '  UPS ' + game.ups.toFixed(0) + '  E ' + game.enemies.length +
        '  EB ' + game.enemyBullets.length + '  PB ' + game.playerBullets.length + '  T ' + game.stageTime.toFixed(1),
        6, 70, { align: 'left', size: 10, color: '#00ff66', stroke: '#000' });
    },
  };
})();
