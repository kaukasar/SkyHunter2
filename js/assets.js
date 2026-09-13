(function () {
  'use strict';

  /*
   * All grafik genereras procedurellt till offscreen-canvasar vid förladdningen
   * och verifieras (storlek + faktiskt ritat innehåll) innan startskärmen visas.
   */
  const C = SH.CONFIG;
  const TAU = Math.PI * 2;
  const RES = 2;     // supersampling för skarpa sprites
  const BG_RES = 1.5;

  const sprites = {};

  function makeSprite(w, h, draw, res) {
    const r = res || RES;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * r);
    canvas.height = Math.ceil(h * r);
    const g = canvas.getContext('2d');
    g.scale(r, r);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    draw(g, w, h);
    return { img: canvas, w, h };
  }

  /* Vit siluett av en sprite, används som träff-blink. */
  function flashOf(spr, color) {
    return makeSprite(spr.w, spr.h, (g) => {
      g.drawImage(spr.img, 0, 0, spr.w, spr.h);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color || '#ffffff';
      g.fillRect(0, 0, spr.w, spr.h);
    });
  }

  function poly(g, pts) {
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
  }

  function mirrorPoly(pts, w) {
    const out = [];
    for (let i = 0; i < pts.length; i += 2) out.push(w - pts[i], pts[i + 1]);
    return out;
  }

  function vGrad(g, y0, y1, stops) {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
    return gr;
  }

  function hGrad(g, x0, x1, stops) {
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
    return gr;
  }

  // ---------------------------------------------------------------- Skepp

  function drawPlayer(g) {
    g.strokeStyle = '#162230';
    g.lineWidth = 1.2;

    // Vingar
    poly(g, [16, 15, 2, 30, 2, 35, 16, 31, 24, 31, 38, 35, 38, 30, 24, 15]);
    g.fillStyle = vGrad(g, 15, 35, ['#c9d7e3', '#8196aa']);
    g.fill();
    g.stroke();

    // Vingränder
    g.fillStyle = '#35c6ff';
    poly(g, [4, 31.5, 15, 22, 15, 25, 4, 33.5]);
    g.fill();
    poly(g, mirrorPoly([4, 31.5, 15, 22, 15, 25, 4, 33.5], 40));
    g.fill();

    // Stjärtfenor
    poly(g, [16, 33, 9, 42, 31, 42, 24, 33]);
    g.fillStyle = '#8aa0b4';
    g.fill();
    g.stroke();

    // Flygkropp
    g.beginPath();
    g.moveTo(20, 1);
    g.bezierCurveTo(25.5, 8, 25, 22, 24, 40);
    g.lineTo(16, 40);
    g.bezierCurveTo(15, 22, 14.5, 8, 20, 1);
    g.closePath();
    g.fillStyle = hGrad(g, 14, 26, ['#6f8499', '#f2f8fd', '#6f8499']);
    g.fill();
    g.stroke();

    // Cockpit
    const glass = g.createLinearGradient(18, 9, 22, 20);
    glass.addColorStop(0, '#9fe6ff');
    glass.addColorStop(0.4, '#1f6fb0');
    glass.addColorStop(1, '#082a4d');
    g.beginPath();
    g.ellipse(20, 14, 2.7, 5.6, 0, 0, TAU);
    g.fillStyle = glass;
    g.fill();
    g.lineWidth = 0.8;
    g.stroke();

    // Motormunstycke
    g.fillStyle = '#2a3440';
    g.fillRect(17.5, 38.5, 5, 3);
  }

  function drawFlame(g, w, h) {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(120,220,255,0.95)');
    gr.addColorStop(0.7, 'rgba(40,110,255,0.5)');
    gr.addColorStop(1, 'rgba(40,80,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(w / 2, h * 1.4, w, 0);
    g.closePath();
    g.fill();
  }

  function drawSmallFighter(g, main, dark, glow) {
    g.strokeStyle = '#1e0707';
    g.lineWidth = 1.1;
    poly(g, [17, 29, 21, 19, 33, 9, 31, 3, 21, 9, 17, 2, 13, 9, 3, 3, 1, 9, 13, 19]);
    g.fillStyle = vGrad(g, 2, 29, [main, dark]);
    g.fill();
    g.stroke();

    g.fillStyle = dark;
    poly(g, [17, 6, 19.5, 17, 17, 25, 14.5, 17]);
    g.fill();

    g.fillStyle = 'rgba(255,255,255,0.35)';
    poly(g, [4, 5, 13, 10, 12, 12]);
    g.fill();
    poly(g, mirrorPoly([4, 5, 13, 10, 12, 12], 34));
    g.fill();

    g.shadowColor = glow;
    g.shadowBlur = 6;
    g.fillStyle = glow;
    g.beginPath();
    g.arc(17, 15.5, 2.7, 0, TAU);
    g.fill();
    g.shadowBlur = 0;
  }

  function drawHeavy(g) {
    g.strokeStyle = '#161b0f';
    g.lineWidth = 1.3;

    // Vingar
    poly(g, [6, 16, 58, 16, 63, 30, 1, 30]);
    g.fillStyle = vGrad(g, 16, 30, ['#6b7a4a', '#3d4829']);
    g.fill();
    g.stroke();

    // Motorgondoler
    [[3, 6], [49, 6]].forEach(([x, y]) => {
      g.beginPath();
      g.roundRect(x, y, 12, 38, 4);
      g.fillStyle = hGrad(g, x, x + 12, ['#3b4527', '#7f8f5c', '#3b4527']);
      g.fill();
      g.stroke();
      g.fillStyle = '#e0b020';
      for (let i = 0; i < 3; i++) g.fillRect(x + 2, y + 26 + i * 4, 8, 2);
      g.fillStyle = '#ff6a2a';
      g.fillRect(x + 3, y + 1, 6, 2);
    });

    // Skrov
    poly(g, [22, 2, 42, 2, 48, 14, 46, 44, 36, 54, 28, 54, 18, 44, 16, 14]);
    g.fillStyle = hGrad(g, 16, 48, ['#48552f', '#9aad6c', '#48552f']);
    g.fill();
    g.stroke();

    // Pansarplåtar
    g.strokeStyle = 'rgba(20,28,12,0.7)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(18, 20); g.lineTo(46, 20);
    g.moveTo(19, 34); g.lineTo(45, 34);
    g.moveTo(32, 36); g.lineTo(32, 52);
    g.stroke();

    // Kanonpipor
    g.fillStyle = '#20251a';
    g.fillRect(23, 46, 4, 9);
    g.fillRect(37, 46, 4, 9);

    // Sensor
    g.shadowColor = '#ff3020';
    g.shadowBlur = 8;
    g.fillStyle = '#ff5a3a';
    g.beginPath();
    g.ellipse(32, 26, 5, 3.5, 0, 0, TAU);
    g.fill();
    g.shadowBlur = 0;
  }

  // ---------------------------------------------------------------- Bossar

  function drawBossBody(g, w, h, def) {
    const cx = w / 2;
    const cy = h / 2;
    g.strokeStyle = '#0c0f16';
    g.lineWidth = 2;

    if (def.shape === 'fortress') {
      poly(g, [cx - 44, 4, cx + 44, 4, w - 8, h * 0.32, w - 2, h * 0.62, cx + 64, h - 20,
        cx + 26, h - 2, cx - 26, h - 2, cx - 64, h - 20, 2, h * 0.62, 8, h * 0.32]);
      g.fillStyle = vGrad(g, 0, h, ['#5d6b80', '#39424f', '#20262f']);
      g.fill();
      g.stroke();

      // Inre däck
      poly(g, [cx - 30, 14, cx + 30, 14, w - 40, h * 0.4, cx + 44, h - 26, cx - 44, h - 26, 40, h * 0.4]);
      g.fillStyle = vGrad(g, 14, h - 26, ['#73839a', '#48525f']);
      g.fill();
      g.lineWidth = 1.2;
      g.stroke();
    } else {
      // Moderskepp: bred kropp med sidoarmar
      poly(g, [cx - 60, 6, cx + 60, 6, cx + 96, 30, w - 4, 44, w - 10, 92, cx + 110, 108,
        cx + 70, 130, cx + 30, h - 4, cx - 30, h - 4, cx - 70, 130, cx - 110, 108, 10, 92, 4, 44, cx - 96, 30]);
      g.fillStyle = vGrad(g, 0, h, ['#6a4d86', '#3e2c55', '#1f1630']);
      g.fill();
      g.stroke();

      poly(g, [cx - 44, 18, cx + 44, 18, cx + 84, 46, cx + 74, 110, cx + 24, h - 16,
        cx - 24, h - 16, cx - 74, 110, cx - 84, 46]);
      g.fillStyle = vGrad(g, 18, h - 16, ['#8a6aa8', '#4b3666']);
      g.fill();
      g.lineWidth = 1.2;
      g.stroke();

      // Ljuslister
      g.fillStyle = '#ff5ad0';
      g.shadowColor = '#ff5ad0';
      g.shadowBlur = 6;
      for (let i = 0; i < 5; i++) {
        g.fillRect(14 + i * 9, 60, 5, 3);
        g.fillRect(w - 19 - i * 9, 60, 5, 3);
      }
      g.shadowBlur = 0;
    }

    // Paneldetaljer
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 1; i < 6; i++) {
      const x = (w / 6) * i;
      g.moveTo(x, h * 0.2);
      g.lineTo(x, h * 0.8);
    }
    g.stroke();

    // Motorer baktill (överkanten)
    g.shadowColor = '#5ad7ff';
    g.shadowBlur = 10;
    g.fillStyle = '#9ff0ff';
    [-0.28, 0, 0.28].forEach((f) => {
      g.fillRect(cx + f * w - 7, 2, 14, 4);
    });
    g.shadowBlur = 0;

    // Fästen för svaga punkter
    def.parts.forEach((p) => {
      g.beginPath();
      g.arc(cx + p.ox, cy + p.oy, p.r + 6, 0, TAU);
      g.fillStyle = '#15191f';
      g.fill();
      g.strokeStyle = '#8b98a8';
      g.lineWidth = 1.5;
      g.stroke();
    });
  }

  // ---------------------------------------------------------------- Projektiler & effekter

  function drawPlayerBullet(g, w, h) {
    g.shadowColor = '#7ff4ff';
    g.shadowBlur = 6;
    g.fillStyle = '#5fe6ff';
    g.beginPath();
    g.roundRect(0.5, 0.5, w - 1, h - 1, w / 2);
    g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.roundRect(w / 2 - 1.2, 2, 2.4, h - 5, 1.2);
    g.fill();
  }

  function radialSprite(color, core) {
    return (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, core || '#ffffff');
      gr.addColorStop(0.35, color);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    };
  }

  function orbBullet(color) {
    return (g, w, h) => {
      const r = w / 2;
      const gr = g.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.3, '#ffffff');
      gr.addColorStop(0.45, color);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    };
  }

  function drawPowerUp(fill, ring) {
    return (g, w, h) => {
      const r = w / 2;
      g.shadowColor = ring;
      g.shadowBlur = 8;
      g.beginPath();
      g.arc(r, r, r - 3, 0, TAU);
      const gr = g.createRadialGradient(r - 3, r - 4, 1, r, r, r);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.35, fill);
      gr.addColorStop(1, '#0a1640');
      g.fillStyle = gr;
      g.fill();
      g.shadowBlur = 0;
      g.lineWidth = 2;
      g.strokeStyle = ring;
      g.stroke();
      g.font = 'bold 15px ' + C.FONT_DISPLAY;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 3;
      g.strokeStyle = '#0a1640';
      g.strokeText('P', r, r + 1);
      g.fillStyle = '#ffffff';
      g.fillText('P', r, r + 1);
    };
  }

  function drawSmoke(g, w, h) {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(70,64,60,0.8)');
    gr.addColorStop(1, 'rgba(40,36,34,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  }

  function drawCloud(seed) {
    return (g, w, h) => {
      const rnd = SH.U.seeded(seed);
      g.filter = 'blur(5px)';
      for (let i = 0; i < 14; i++) {
        const x = w * 0.2 + rnd() * w * 0.6;
        const y = h * 0.35 + rnd() * h * 0.3;
        const r = 14 + rnd() * 22;
        g.beginPath();
        g.arc(x, y, r, 0, TAU);
        g.fillStyle = 'rgba(255,255,255,' + (0.35 + rnd() * 0.3) + ')';
        g.fill();
      }
      g.filter = 'none';
    };
  }

  // ---------------------------------------------------------------- Bakgrunder

  const BG_W = C.WIDTH;
  const BG_H = 960;

  /* Ritar ett objekt även på andra sidan skarven så att tile:n loopar sömlöst. */
  function wrapDraw(y, extent, fn) {
    fn(y);
    if (y - extent < 0) fn(y + BG_H);
    if (y + extent > BG_H) fn(y - BG_H);
  }

  function blobPoints(rnd, r, n, jitter) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const rr = r * (1 - jitter / 2 + rnd() * jitter);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    return pts;
  }

  function blobPath(g, cx, cy, pts, s) {
    const n = pts.length;
    const P = (i) => pts[(i + n) % n];
    g.beginPath();
    g.moveTo(cx + ((P(-1)[0] + P(0)[0]) / 2) * s, cy + ((P(-1)[1] + P(0)[1]) / 2) * s);
    for (let i = 0; i < n; i++) {
      const p = P(i);
      const q = P(i + 1);
      g.quadraticCurveTo(cx + p[0] * s, cy + p[1] * s, cx + ((p[0] + q[0]) / 2) * s, cy + ((p[1] + q[1]) / 2) * s);
    }
    g.closePath();
  }

  function drawOcean(g, w, h) {
    const rnd = SH.U.seeded(1337);
    g.fillStyle = hGrad(g, 0, w, ['#093a66', '#0f5690', '#093a66']);
    g.fillRect(0, 0, w, h);

    // Djupare partier
    for (let i = 0; i < 8; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 80 + rnd() * 120;
      wrapDraw(y, r, (yy) => {
        const gr = g.createRadialGradient(x, yy, 0, x, yy, r);
        gr.addColorStop(0, 'rgba(3,25,55,0.45)');
        gr.addColorStop(1, 'rgba(3,25,55,0)');
        g.fillStyle = gr;
        g.fillRect(x - r, yy - r, r * 2, r * 2);
      });
    }

    // Vågkammar
    for (let i = 0; i < 900; i++) {
      g.fillStyle = 'rgba(210,240,255,' + (0.04 + rnd() * 0.12) + ')';
      g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 7, 1);
    }

    // Öar
    const islands = 6;
    for (let i = 0; i < islands; i++) {
      const r = 26 + rnd() * 50;
      const x = r + rnd() * (w - r * 2);
      const y = ((i + rnd() * 0.6) / islands) * h;
      const pts = blobPoints(rnd, r, 14, 0.45);
      const trees = [];
      for (let t = 0; t < r * 0.9; t++) {
        const a = rnd() * TAU;
        const d = rnd() * r * 0.65;
        trees.push([Math.cos(a) * d, Math.sin(a) * d, 2 + rnd() * 3.5]);
      }
      wrapDraw(y, r * 1.6, (yy) => {
        blobPath(g, x, yy, pts, 1.5);
        g.fillStyle = 'rgba(90,200,220,0.35)';
        g.fill();
        blobPath(g, x, yy, pts, 1.15);
        g.fillStyle = '#dac68d';
        g.fill();
        blobPath(g, x, yy, pts, 1.0);
        const gr = g.createRadialGradient(x - r * 0.3, yy - r * 0.3, 2, x, yy, r);
        gr.addColorStop(0, '#5fae4a');
        gr.addColorStop(1, '#2e6f35');
        g.fillStyle = gr;
        g.fill();
        trees.forEach(([tx, ty, tr]) => {
          g.beginPath();
          g.arc(x + tx, yy + ty, tr, 0, TAU);
          g.fillStyle = '#1f5427';
          g.fill();
        });
      });
    }
  }

  function drawDesert(g, w, h) {
    const rnd = SH.U.seeded(4242);
    g.fillStyle = hGrad(g, 0, w, ['#9a7443', '#b88d55', '#9a7443']);
    g.fillRect(0, 0, w, h);

    for (let i = 0; i < 2200; i++) {
      const light = rnd() < 0.5;
      g.fillStyle = light
        ? 'rgba(235,205,150,' + rnd() * 0.25 + ')'
        : 'rgba(80,55,30,' + rnd() * 0.25 + ')';
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2);
    }

    // Uttorkad flodfåra (periodisk över tile-höjden)
    const riverX = (y) => w / 2 + Math.sin((y / h) * TAU) * 120 + Math.sin((y / h) * TAU * 2) * 40;
    g.lineWidth = 26;
    g.strokeStyle = 'rgba(95,68,40,0.55)';
    g.beginPath();
    for (let y = 0; y <= h; y += 8) (y ? g.lineTo(riverX(y), y) : g.moveTo(riverX(y), y));
    g.stroke();
    g.lineWidth = 10;
    g.strokeStyle = 'rgba(70,50,30,0.5)';
    g.stroke();

    // Sanddyner
    g.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const len = 40 + rnd() * 80;
      wrapDraw(y, 20, (yy) => {
        g.strokeStyle = 'rgba(120,85,45,0.45)';
        g.beginPath();
        g.moveTo(x - len / 2, yy);
        g.quadraticCurveTo(x, yy - 14, x + len / 2, yy);
        g.stroke();
      });
    }

    // Klippor / platåer
    for (let i = 0; i < 9; i++) {
      const r = 18 + rnd() * 40;
      const x = rnd() * w;
      const y = rnd() * h;
      const pts = blobPoints(rnd, r, 9, 0.6);
      wrapDraw(y, r * 1.4, (yy) => {
        blobPath(g, x + 8, yy + 8, pts, 1.05);
        g.fillStyle = 'rgba(50,34,18,0.45)';
        g.fill();
        blobPath(g, x, yy, pts, 1);
        g.fillStyle = '#7d5a34';
        g.fill();
        blobPath(g, x - 3, yy - 3, pts, 0.72);
        g.fillStyle = '#a57b49';
        g.fill();
      });
    }

    // Kratrar
    for (let i = 0; i < 14; i++) {
      const r = 6 + rnd() * 16;
      const x = rnd() * w;
      const y = rnd() * h;
      wrapDraw(y, r + 4, (yy) => {
        g.beginPath();
        g.arc(x, yy, r + 3, 0, TAU);
        g.fillStyle = 'rgba(210,175,120,0.4)';
        g.fill();
        g.beginPath();
        g.arc(x, yy, r, 0, TAU);
        g.fillStyle = 'rgba(70,48,26,0.6)';
        g.fill();
      });
    }
  }

  function drawSpace(g, w, h) {
    const rnd = SH.U.seeded(9001);
    g.fillStyle = '#04030c';
    g.fillRect(0, 0, w, h);

    const nebula = ['rgba(110,50,170,', 'rgba(40,80,180,', 'rgba(20,140,150,', 'rgba(170,40,110,'];
    for (let i = 0; i < 12; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 90 + rnd() * 180;
      const col = nebula[i % nebula.length];
      const a = 0.12 + rnd() * 0.16;
      wrapDraw(y, r, (yy) => {
        const gr = g.createRadialGradient(x, yy, 0, x, yy, r);
        gr.addColorStop(0, col + a + ')');
        gr.addColorStop(1, col + '0)');
        g.fillStyle = gr;
        g.fillRect(x - r, yy - r, r * 2, r * 2);
      });
    }

    for (let i = 0; i < 900; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (0.15 + rnd() * 0.6) + ')';
      const s = rnd() < 0.9 ? 1 : 2;
      g.fillRect(rnd() * w, rnd() * h, s, s);
    }

    // Avlägsen planet
    const px = w * 0.78;
    const py = h * 0.3;
    const pr = 46;
    const pg = g.createRadialGradient(px - 16, py - 16, 4, px, py, pr);
    pg.addColorStop(0, '#f3b27a');
    pg.addColorStop(0.6, '#a2533a');
    pg.addColorStop(1, '#2a1018');
    g.beginPath();
    g.arc(px, py, pr, 0, TAU);
    g.fillStyle = pg;
    g.fill();
    g.strokeStyle = 'rgba(255,210,170,0.35)';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(px, py, pr * 1.6, pr * 0.35, -0.35, 0, TAU);
    g.stroke();
  }

  // ---------------------------------------------------------------- Manifest & förladdning

  function manifest() {
    const tasks = [];
    const add = (name, fn) => tasks.push({ name, kind: 'sprite', run: () => { sprites[name] = fn(); return sprites[name]; } });

    add('player', () => makeSprite(40, 44, drawPlayer));
    add('playerFlame', () => makeSprite(8, 18, drawFlame));
    add('enemyBasic', () => makeSprite(34, 30, (g) => drawSmallFighter(g, '#ec4d42', '#7a1712', '#ffd34d')));
    add('enemyBasicFlash', () => flashOf(sprites.enemyBasic));
    add('enemyLeaderA', () => makeSprite(34, 30, (g) => drawSmallFighter(g, '#ffd23a', '#a86400', '#ffffff')));
    add('enemyLeaderB', () => makeSprite(34, 30, (g) => drawSmallFighter(g, '#ffffff', '#ffc93a', '#ff5a00')));
    add('enemyHeavy', () => makeSprite(64, 56, drawHeavy));
    add('enemyHeavyFlash', () => flashOf(sprites.enemyHeavy));
    Object.keys(SH.BOSS_DEFS).forEach((key) => {
      const def = SH.BOSS_DEFS[key];
      add(def.sprite, () => makeSprite(def.w, def.h, (g, w, h) => drawBossBody(g, w, h, def)));
      add(def.sprite + 'Flash', () => flashOf(sprites[def.sprite], '#ffe0e0'));
    });
    add('bulletPlayer', () => makeSprite(6, 20, drawPlayerBullet));
    add('bulletEnemy', () => makeSprite(14, 14, orbBullet('#ff3f9e')));
    add('bulletEnemyBig', () => makeSprite(20, 20, orbBullet('#ff8a1e')));
    add('powerA', () => makeSprite(28, 28, drawPowerUp('#2f7bff', '#bfe3ff')));
    add('powerB', () => makeSprite(28, 28, drawPowerUp('#39a6ff', '#ffffff')));
    add('glowFire', () => makeSprite(32, 32, radialSprite('rgba(255,140,40,0.9)', '#fff2b0')));
    add('glowHot', () => makeSprite(32, 32, radialSprite('rgba(255,230,120,0.9)')));
    add('glowRed', () => makeSprite(32, 32, radialSprite('rgba(255,60,40,0.85)', '#ffb090')));
    add('glowCyan', () => makeSprite(32, 32, radialSprite('rgba(90,220,255,0.9)')));
    add('glowPink', () => makeSprite(32, 32, radialSprite('rgba(255,70,190,0.9)')));
    add('glowWhite', () => makeSprite(32, 32, radialSprite('rgba(255,255,255,0.8)')));
    add('smoke', () => makeSprite(32, 32, drawSmoke));
    add('cloud0', () => makeSprite(170, 100, drawCloud(11), 1));
    add('cloud1', () => makeSprite(200, 110, drawCloud(23), 1));
    add('cloud2', () => makeSprite(150, 90, drawCloud(37), 1));
    add('bgOcean', () => makeSprite(BG_W, BG_H, drawOcean, BG_RES));
    add('bgDesert', () => makeSprite(BG_W, BG_H, drawDesert, BG_RES));
    add('bgSpace', () => makeSprite(BG_W, BG_H, drawSpace, BG_RES));

    SH.Audio.names.forEach((name) => {
      tasks.push({ name: 'ljud: ' + name, kind: 'audio', run: () => SH.Audio.load(name) });
    });
    return tasks;
  }

  /* Kontrollerar att en sprite har rätt storlek och faktiskt innehåller pixlar. */
  function verifySprite(name, spr) {
    if (!spr || !spr.img || spr.img.width === 0 || spr.img.height === 0) {
      throw new Error('Grafikresurs saknas: ' + name);
    }
    const g = spr.img.getContext('2d');
    const d = g.getImageData(0, 0, spr.img.width, spr.img.height).data;
    for (let i = 3; i < d.length; i += 4 * 13) {
      if (d[i] > 0) return;
    }
    throw new Error('Grafikresurs är tom: ' + name);
  }

  // Ger webbläsaren chans att rita förloppet; timeout om fliken ligger i bakgrunden
  const nextFrame = () => new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
    setTimeout(resolve, 50);
  });

  SH.Assets = {
    sprites,

    async preload(onProgress) {
      const tasks = manifest();
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        onProgress(i / tasks.length, task.name);
        if (i % 3 === 0) await nextFrame();
        const result = task.run();
        if (task.kind === 'sprite') verifySprite(task.name, result);
      }
      onProgress(1, 'klart');
      await nextFrame();
      return tasks.length;
    },

    /* Ritar en sprite centrerad kring (x, y). */
    draw(ctx, name, x, y, rot, scale, alpha) {
      const spr = sprites[name];
      const s = scale || 1;
      const w = spr.w * s;
      const h = spr.h * s;
      if (!rot && alpha === undefined) {
        ctx.drawImage(spr.img, x - w / 2, y - h / 2, w, h);
        return;
      }
      ctx.save();
      if (alpha !== undefined) ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      ctx.drawImage(spr.img, -w / 2, -h / 2, w, h);
      ctx.restore();
    },
  };
})();
