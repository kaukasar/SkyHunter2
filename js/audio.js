(function () {
  'use strict';

  /*
   * Ljudeffekter syntetiseras till PCM-data under förladdningen.
   * AudioContext skapas först vid första tangenttryckningen (webbläsarkrav).
   */
  const SR = 22050;
  const TAU = Math.PI * 2;
  const MASTER_GAIN = 0.55;

  const data = {};
  const buffers = {};
  const lastPlayed = {};
  let ctx = null;
  let master = null;
  let muted = SH.U.storageGet(SH.CONFIG.MUTE_KEY) === '1';

  function synth(duration, fn) {
    const len = Math.max(1, Math.floor(SR * duration));
    const out = new Float32Array(len);
    const s = {};
    for (let i = 0; i < len; i++) out[i] = fn(i / SR, i / len, s);
    return out;
  }

  function osc(wave, ph) {
    const p = ph % 1;
    if (wave === 'sq') return p < 0.5 ? 1 : -1;
    if (wave === 'tri') return 4 * Math.abs(p - 0.5) - 1;
    return Math.sin(TAU * p);
  }

  function arpeggio(notes, step, wave, vol) {
    const body = notes.length * step;
    const tail = 0.08;
    return synth(body + tail, (t, p, s) => {
      const idx = Math.min(notes.length - 1, Math.floor(t / step));
      s.ph = (s.ph || 0) + notes[idx] / SR;
      const local = (t - idx * step) / step;
      const env = t > body ? Math.max(0, 1 - (t - body) / tail) : 1 - local * 0.5;
      return osc(wave, s.ph) * vol * env;
    });
  }

  function noiseBurst(duration, cutoff, vol, rumbleHz) {
    return synth(duration, (t, p, s) => {
      const c = cutoff * (1 - p * 0.8);
      s.lp = (s.lp || 0) + c * ((Math.random() * 2 - 1) - (s.lp || 0));
      let v = s.lp * 3;
      if (rumbleHz) {
        s.ph = (s.ph || 0) + (rumbleHz * (1 - p * 0.5)) / SR;
        v += Math.sin(TAU * s.ph) * 0.6;
      }
      return Math.max(-1, Math.min(1, v)) * vol * Math.pow(1 - p, 2);
    });
  }

  const GENERATORS = {
    shoot: () => synth(0.08, (t, p, s) => {
      s.ph = (s.ph || 0) + (1400 - 900 * p) / SR;
      return osc('sq', s.ph) * Math.pow(1 - p, 2) * 0.22;
    }),
    enemyShoot: () => synth(0.12, (t, p, s) => {
      s.ph = (s.ph || 0) + (520 - 260 * p) / SR;
      return osc('tri', s.ph) * Math.pow(1 - p, 2) * 0.3;
    }),
    hit: () => synth(0.05, (t, p) => (Math.random() * 2 - 1) * Math.pow(1 - p, 3) * 0.35),
    clang: () => synth(0.09, (t, p, s) => {
      s.a = (s.a || 0) + 2400 / SR;
      s.b = (s.b || 0) + 3150 / SR;
      return (Math.sin(TAU * s.a) * 0.6 + Math.sin(TAU * s.b) * 0.4) * Math.pow(1 - p, 4) * 0.25;
    }),
    boomSmall: () => noiseBurst(0.35, 0.25, 0.6),
    boom: () => noiseBurst(0.6, 0.14, 0.8, 70),
    bigBoom: () => noiseBurst(1.6, 0.05, 1.0, 45),
    playerDie: () => synth(1.1, (t, p, s) => {
      s.ph = (s.ph || 0) + (600 * Math.pow(1 - p, 2) + 40) / SR;
      s.lp = (s.lp || 0) + 0.1 * ((Math.random() * 2 - 1) - (s.lp || 0));
      return (osc('sq', s.ph) * 0.15 + s.lp * 1.6) * Math.pow(1 - p, 1.5) * 0.7;
    }),
    powerUp: () => arpeggio([523, 659, 784, 1047, 1319], 0.06, 'sq', 0.22),
    bonus: () => arpeggio([784, 988, 1175, 1568], 0.06, 'sin', 0.35),
    extend: () => arpeggio([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.08, 'sq', 0.2),
    stageClear: () => arpeggio([392, 523, 659, 784, 659, 784, 1047, 1047], 0.13, 'sq', 0.18),
    warning: () => synth(2.0, (t, p, s) => {
      const f = Math.floor(t * 3) % 2 === 0 ? 440 : 620;
      s.ph = (s.ph || 0) + f / SR;
      const gate = (t * 3) % 1 < 0.85 ? 1 : 0;
      return osc('sq', s.ph) * 0.13 * gate * (1 - p * 0.4);
    }),
    select: () => arpeggio([880, 1320], 0.04, 'sq', 0.16),
    pause: () => arpeggio([660, 440], 0.06, 'sq', 0.16),
    gameOver: () => arpeggio([523, 466, 415, 349, 262], 0.2, 'tri', 0.35),
  };

  const MIN_GAP = { shoot: 0.06, hit: 0.03, clang: 0.05, enemyShoot: 0.08, boomSmall: 0.04 };

  SH.Audio = {
    names: Object.keys(GENERATORS),

    /* Genererar och verifierar ett ljud. Kastar fel om datan är ogiltig. */
    load(name) {
      const pcm = GENERATORS[name]();
      if (!pcm || pcm.length === 0) throw new Error('Tomt ljud: ' + name);
      for (let i = 0; i < pcm.length; i += 97) {
        if (!Number.isFinite(pcm[i])) throw new Error('Ogiltig ljuddata: ' + name);
      }
      data[name] = pcm;
      return pcm;
    },

    unlock() {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : MASTER_GAIN;
        master.connect(ctx.destination);
        Object.keys(data).forEach((name) => {
          const buf = ctx.createBuffer(1, data[name].length, SR);
          buf.getChannelData(0).set(data[name]);
          buffers[name] = buf;
        });
      } catch (e) {
        ctx = null;
      }
    },

    play(name, volume) {
      if (!ctx || muted || !buffers[name]) return;
      const now = ctx.currentTime;
      const gap = MIN_GAP[name] || 0.02;
      if (lastPlayed[name] !== undefined && now - lastPlayed[name] < gap) return;
      lastPlayed[name] = now;
      const src = ctx.createBufferSource();
      src.buffer = buffers[name];
      if (volume !== undefined && volume !== 1) {
        const g = ctx.createGain();
        g.gain.value = volume;
        src.connect(g);
        g.connect(master);
      } else {
        src.connect(master);
      }
      src.start();
    },

    toggleMute() {
      muted = !muted;
      SH.U.storageSet(SH.CONFIG.MUTE_KEY, muted ? '1' : '0');
      if (master) master.gain.value = muted ? 0 : MASTER_GAIN;
      return muted;
    },

    isMuted: () => muted,
  };
})();
