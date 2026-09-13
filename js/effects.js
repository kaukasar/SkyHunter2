(function () {
  'use strict';

  const U = SH.U;
  const TAU = Math.PI * 2;

  /* Partiklar, explosioner, poängtexter och skärmskakning. */
  class Effects {
    constructor() {
      this.parts = [];
      this.rings = [];
      this.popups = [];
      this.shake = 0;
    }

    clear() {
      this.parts.length = 0;
      this.rings.length = 0;
      this.popups.length = 0;
      this.shake = 0;
    }

    explosion(x, y, size) {
      const s = size || 1;
      this.rings.push({ x, y, t: 0, life: 0.35 + 0.1 * s, maxR: 34 * s });
      const n = Math.floor(10 + 12 * s);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const sp = U.rand(30, 210) * Math.sqrt(s);
        this.parts.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          t: 0,
          life: U.rand(0.3, 0.75),
          size: U.rand(10, 26) * Math.pow(s, 0.6),
          spr: U.pick(['glowFire', 'glowFire', 'glowHot', 'glowRed']),
          drag: 2.8,
          add: true,
          grow: -0.4,
        });
      }
      for (let i = 0; i < Math.floor(n / 3); i++) {
        const a = Math.random() * TAU;
        const sp = U.rand(10, 60) * Math.sqrt(s);
        this.parts.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp + 30,
          t: 0,
          life: U.rand(0.6, 1.1),
          size: U.rand(18, 34) * Math.pow(s, 0.6),
          spr: 'smoke',
          drag: 1.5,
          add: false,
          grow: 0.9,
        });
      }
      for (let i = 0; i < Math.floor(4 * s); i++) {
        const a = Math.random() * TAU;
        const sp = U.rand(120, 320);
        this.parts.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          t: 0,
          life: U.rand(0.25, 0.5),
          size: 6,
          spr: 'glowWhite',
          drag: 1,
          add: true,
          grow: 0,
        });
      }
    }

    sparks(x, y, color, count) {
      const spr = color === 'cyan' ? 'glowCyan' : color === 'pink' ? 'glowPink' : 'glowHot';
      for (let i = 0; i < (count || 5); i++) {
        const a = Math.random() * TAU;
        const sp = U.rand(60, 200);
        this.parts.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          t: 0,
          life: U.rand(0.12, 0.3),
          size: U.rand(5, 10),
          spr,
          drag: 3,
          add: true,
          grow: -0.5,
        });
      }
    }

    popup(x, y, text, color, big) {
      this.popups.push({ x, y, text, color: color || '#ffffff', big: !!big, t: 0, life: big ? 1.6 : 0.9 });
    }

    addShake(amount) {
      this.shake = Math.max(this.shake, amount);
    }

    update(dt) {
      for (const p of this.parts) {
        p.t += dt;
        const damp = Math.max(0, 1 - p.drag * dt);
        p.vx *= damp;
        p.vy *= damp;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      U.compact(this.parts, (p) => p.t < p.life);

      for (const r of this.rings) r.t += dt;
      U.compact(this.rings, (r) => r.t < r.life);

      for (const p of this.popups) {
        p.t += dt;
        p.y -= (p.big ? 22 : 40) * dt;
      }
      U.compact(this.popups, (p) => p.t < p.life);

      this.shake = Math.max(0, this.shake - dt * 30);
    }

    draw(ctx) {
      const sprites = SH.Assets.sprites;

      for (const p of this.parts) {
        if (p.add) continue;
        const k = p.t / p.life;
        const size = p.size * (1 + p.grow * k);
        ctx.globalAlpha = 1 - k;
        ctx.drawImage(sprites[p.spr].img, p.x - size / 2, p.y - size / 2, size, size);
      }

      ctx.globalCompositeOperation = 'lighter';
      for (const r of this.rings) {
        const k = r.t / r.life;
        ctx.globalAlpha = (1 - k) * 0.9;
        ctx.strokeStyle = '#ffe2a0';
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 4 + r.maxR * U.easeOutCubic(k), 0, TAU);
        ctx.stroke();
      }
      for (const p of this.parts) {
        if (!p.add) continue;
        const k = p.t / p.life;
        const size = Math.max(0.5, p.size * (1 + p.grow * k));
        ctx.globalAlpha = 1 - k * k;
        ctx.drawImage(sprites[p.spr].img, p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    drawPopups(ctx) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      for (const p of this.popups) {
        const k = p.t / p.life;
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        ctx.font = 'bold ' + (p.big ? 16 : 12) + 'px ' + SH.CONFIG.FONT_MONO;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.globalAlpha = 1;
    }
  }

  SH.Effects = Effects;
})();
