(function () {
  'use strict';

  const C = SH.CONFIG;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function fitCanvas() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let cw = vw;
    let ch = (vw * C.HEIGHT) / C.WIDTH;
    if (ch > vh) {
      ch = vh;
      cw = (vh * C.WIDTH) / C.HEIGHT;
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = Math.floor(cw) + 'px';
    canvas.style.height = Math.floor(ch) + 'px';
    canvas.width = Math.round(Math.floor(cw) * dpr);
    canvas.height = Math.round(Math.floor(ch) * dpr);
    ctx.setTransform(canvas.width / C.WIDTH, 0, 0, canvas.width / C.WIDTH, 0, 0);
  }

  async function boot() {
    fitCanvas();
    let progress = 0;
    let label = '';
    const onResize = () => {
      fitCanvas();
      SH.HUD.drawLoading(ctx, progress, label);
    };
    window.addEventListener('resize', onResize);

    try {
      // Samtliga grafik- och ljudresurser laddas och verifieras innan startskärmen
      await SH.Assets.preload((p, name) => {
        progress = p;
        label = name;
        SH.HUD.drawLoading(ctx, progress, label);
      });
    } catch (err) {
      console.error(err);
      SH.HUD.drawLoading(ctx, progress, label, String(err.message || err));
      return;
    } finally {
      window.removeEventListener('resize', onResize);
    }

    const game = new SH.Game(canvas);
    window.game = game; // för felsökning i konsolen
    game.start();
    canvas.focus();
  }

  boot();
})();
