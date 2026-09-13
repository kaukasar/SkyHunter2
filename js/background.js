(function () {
  'use strict';

  const C = SH.CONFIG;
  const U = SH.U;
  const W = C.WIDTH;
  const H = C.HEIGHT;

  const THEME_TILES = { ocean: 'bgOcean', desert: 'bgDesert', space: 'bgSpace' };

  /* Vertikalt skrollande miljö med parallaxlager (moln eller stjärnor). */
  class Background {
    constructor() {
      this.offset = 0;
      this.stars = [];
      for (let i = 0; i < 70; i++) {
        this.stars.push({ x: Math.random() * W, y: Math.random() * H, z: U.rand(0.3, 1) });
      }
      this.clouds = [];
      this.setTheme('space');
    }

    setTheme(theme) {
      this.theme = theme;
      this.tile = SH.Assets.sprites[THEME_TILES[theme]];
      this.clouds.length = 0;
      if (theme !== 'space') {
        for (let i = 0; i < 4; i++) this.clouds.push(this.makeCloud(U.rand(-100, H)));
      }
    }

    makeCloud(y) {
      const name = U.pick(['cloud0', 'cloud1', 'cloud2']);
      const spr = SH.Assets.sprites[name];
      return {
        name,
        x: U.rand(0, W),
        y,
        h: spr.h,
        speed: U.rand(1.5, 2.1),
        alpha: this.theme === 'desert' ? U.rand(0.18, 0.3) : U.rand(0.3, 0.5),
      };
    }

    update(dt, speed) {
      const th = this.tile.h;
      this.offset = (this.offset + speed * dt) % th;

      if (this.theme === 'space') {
        for (const s of this.stars) {
          s.y += speed * (0.8 + s.z * 2.5) * dt;
          if (s.y > H + 10) {
            s.y -= H + 20;
            s.x = Math.random() * W;
          }
        }
      }

      for (let i = 0; i < this.clouds.length; i++) {
        const c = this.clouds[i];
        c.y += speed * c.speed * dt;
        if (c.y - c.h > H) this.clouds[i] = this.makeCloud(U.rand(-260, -120));
      }
    }

    draw(ctx, speed) {
      const th = this.tile.h;
      const y = Math.floor(this.offset);
      ctx.drawImage(this.tile.img, 0, y - th, W, th + 1);
      ctx.drawImage(this.tile.img, 0, y, W, th);

      if (this.theme === 'space') {
        const streak = Math.min(14, speed * 0.04);
        ctx.fillStyle = '#ffffff';
        for (const s of this.stars) {
          ctx.globalAlpha = 0.3 + s.z * 0.6;
          ctx.fillRect(s.x, s.y, s.z > 0.75 ? 2 : 1, 1 + streak * s.z);
        }
        ctx.globalAlpha = 1;
      }

      for (const c of this.clouds) {
        SH.Assets.draw(ctx, c.name, c.x, c.y, 0, 1.6, c.alpha);
      }
    }
  }

  SH.Background = Background;
})();
