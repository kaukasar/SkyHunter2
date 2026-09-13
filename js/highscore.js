(function () {
  'use strict';

  const C = SH.CONFIG;
  const U = SH.U;

  const DEFAULTS = [
    { name: 'ACE', score: 20000 },
    { name: 'SKY', score: 15000 },
    { name: 'JET', score: 10000 },
    { name: 'ZAP', score: 7500 },
    { name: 'NEW', score: 5000 },
  ];

  /* Topplista lagrad i webbläsarens Local Storage. */
  SH.HighScores = {
    list: [],

    load() {
      let list = null;
      const raw = U.storageGet(C.STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            list = parsed
              .filter((e) => e && typeof e.name === 'string' && Number.isFinite(e.score))
              .map((e) => ({ name: e.name.slice(0, 3).toUpperCase(), score: Math.max(0, Math.floor(e.score)) }));
          }
        } catch (e) {
          list = null;
        }
      }
      if (!list || list.length === 0) list = DEFAULTS.map((e) => Object.assign({}, e));
      list.sort((a, b) => b.score - a.score);
      this.list = list.slice(0, C.HIGHSCORE_ENTRIES);
      return this.list;
    },

    save() {
      U.storageSet(C.STORAGE_KEY, JSON.stringify(this.list));
    },

    best() {
      return this.list.length ? this.list[0].score : 0;
    },

    qualifies(score) {
      if (score <= 0) return false;
      return this.list.length < C.HIGHSCORE_ENTRIES || score > this.list[this.list.length - 1].score;
    },

    /* Lägger in och sparar direkt. Returnerar placering (index) eller -1. */
    insert(name, score) {
      if (!this.qualifies(score)) return -1;
      let idx = this.list.findIndex((e) => score > e.score);
      if (idx === -1) idx = this.list.length;
      this.list.splice(idx, 0, { name, score });
      this.list.length = Math.min(this.list.length, C.HIGHSCORE_ENTRIES);
      this.save();
      return idx;
    },

    rename(index, name) {
      if (!this.list[index]) return;
      this.list[index].name = name;
      this.save();
      U.storageSet(C.NAME_KEY, name);
    },

    lastName() {
      const n = U.storageGet(C.NAME_KEY);
      return n && /^[A-Z0-9]{3}$/.test(n) ? n : 'AAA';
    },
  };
})();
