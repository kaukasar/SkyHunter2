(function () {
  'use strict';

  SH.U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    chance: (p) => Math.random() < p,
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),

    /* AABB-kollision: objekt har mittpunkt (x, y) och halva mått (hw, hh). */
    overlap(a, b) {
      return Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh;
    },
    overlapBox(ax, ay, ahw, ahh, bx, by, bhw, bhh) {
      return Math.abs(ax - bx) < ahw + bhw && Math.abs(ay - by) < ahh + bhh;
    },

    /* Tar bort element i en array på plats, utan att skapa en ny array. */
    compact(arr, keep) {
      let j = 0;
      for (let i = 0; i < arr.length; i++) {
        if (keep(arr[i])) arr[j++] = arr[i];
      }
      arr.length = j;
    },

    pad: (n, len) => String(Math.floor(n)).padStart(len, '0'),

    /* Deterministisk slumpgenerator för procedurella resurser. */
    seeded(seed) {
      return function () {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    storageGet(key) {
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    },
    storageSet(key, value) {
      try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; }
    },
  };
})();
