(function () {
  'use strict';

  /*
   * Banstruktur: tidsbaserad sekvens av fiendevågor som avslutas med en
   * bossstrid eller en intensiv slutvåg. `at` = sekunder från banans start.
   *
   * Vågfält:
   *   enemy      'basic' | 'heavy'
   *   path       'sine' | 'dive' | 'loop' | 'hover' | 'straight'
   *   formation  'single' | 'v' | 'line' | 'train' | 'row'
   *   leader     true -> en vågledare (power-up-tillfälle) ingår i formationen
   *   hp         tung fiende: grundvärde 3-5 (styr poäng), tålighet = hp x ENEMY_HP.heavyMultiplier
   *   warning    visar en varningsbanner, boss -> startar bossstrid
   *   finalWave  (på warning) startar slutvågssekvens: fiender tål FINAL_WAVE_HP_MULTIPLIER x mer
   */

  const sineV = (at, x, opts) => Object.assign({
    at, enemy: 'basic', path: 'sine', formation: 'v', count: 5, x,
    params: { speed: 85, amp: 50, freq: 1.3 },
  }, opts);

  const loopTrain = (at, x, dir, opts) => Object.assign({
    at, enemy: 'basic', path: 'loop', formation: 'train', count: 5, delay: 0.32, x,
    params: { dir, loopY: 200, r: 70, speed: 160 },
  }, opts);

  const diveRow = (at, count, opts) => Object.assign({
    at, enemy: 'basic', path: 'dive', formation: 'row', count, x: 240, y: 110, spacing: 90, stagger: 0.45,
  }, opts);

  const sineLine = (at, x, count, opts) => Object.assign({
    at, enemy: 'basic', path: 'sine', formation: 'line', count, x, spacing: 44,
    params: { speed: 100, amp: 30, freq: 2 },
  }, opts);

  const heavy = (at, x, hp, opts) => Object.assign({
    at, enemy: 'heavy', path: 'hover', x, hp, startY: -40,
    params: { ty: 130, amp: 80, stay: 6 },
  }, opts);

  const sweep = (at, fromLeft, opts) => Object.assign({
    at, enemy: 'basic', path: 'straight', formation: 'train', count: 5, delay: 0.28,
    x: fromLeft ? -20 : 500, startY: 70,
    params: { vx: fromLeft ? 170 : -170, speed: 55 },
  }, opts);

  /*
   * Varje bana består av två avsnitt före bossen/slutvågen: det ursprungliga
   * avsnittet följt av ett förlängningsavsnitt med nya kombinationer av samma
   * fiendetyper och rörelsemönster. Tiden fram till bossstrid/slutvåg är
   * ungefär dubbelt så lång som i den ursprungliga banstrukturen.
   */
  SH.STAGES = [
    {
      name: 'KUSTEN',
      theme: 'ocean',
      scroll: 70,
      waves: [
        sineV(2, 240, { leader: true }),
        loopTrain(7.5, 110, 1),
        loopTrain(10.5, 370, -1),
        diveRow(15, 4, { spacing: 95 }),
        heavy(20, 240, 3),
        sineLine(22, 120, 4),
        sineLine(25, 360, 4),
        loopTrain(30, 130, 1, { count: 6, leader: true }),
        diveRow(35, 5),
        heavy(39, 130, 3),
        heavy(40, 350, 3),
        sineV(43, 240, { leader: true }),
        loopTrain(48, 110, 1),
        loopTrain(48.6, 370, -1),

        // Förlängning
        sineLine(54, 120, 4),
        sineLine(55.5, 360, 4),
        diveRow(60, 4, { spacing: 95, y: 130 }),
        loopTrain(64, 370, -1, { count: 6, leader: true }),
        heavy(68, 240, 3),
        sineV(70, 130),
        sineV(73, 350),
        loopTrain(78, 110, 1),
        loopTrain(81, 370, -1),
        diveRow(86, 5, { spacing: 85 }),
        heavy(91, 130, 3),
        heavy(92, 350, 3),
        sineLine(94, 240, 5),
        sineV(99, 240, { leader: true }),
        loopTrain(104, 110, 1),
        loopTrain(104.6, 370, -1),

        { at: 113, warning: 'VARNING!', sub: 'STOR FIENDE NÄRMAR SIG' },
        { at: 116, boss: 'fortress' },
      ],
    },
    {
      name: 'ÖKNEN',
      theme: 'desert',
      scroll: 90,
      waves: [
        sineV(2, 150, { leader: true }),
        sineV(4, 330),
        diveRow(8, 5),
        sweep(12, true),
        heavy(14, 120, 4),
        heavy(16, 360, 4),
        loopTrain(19, 100, 1, { count: 6, leader: true }),
        loopTrain(22, 380, -1, { count: 6 }),
        sineLine(27, 240, 5, { params: { speed: 120, amp: 40, freq: 2.2 } }),
        sweep(30, false),
        diveRow(33, 4, { y: 90 }),
        diveRow(35, 4, { y: 150, x: 200 }),
        heavy(39, 240, 4),
        loopTrain(41, 120, 1),
        loopTrain(41.5, 360, -1),
        sineV(46, 240, { count: 7, leader: true }),

        // Förlängning
        sweep(51, false),
        diveRow(53, 5, { y: 120 }),
        heavy(57, 240, 4),
        loopTrain(59, 100, 1, { count: 6 }),
        loopTrain(61, 380, -1, { count: 6, leader: true }),
        sineLine(66, 130, 4, { params: { speed: 120, amp: 40, freq: 2.2 } }),
        sineLine(67, 350, 4, { params: { speed: 120, amp: 40, freq: 2.2 } }),
        sweep(71, true, { count: 6 }),
        heavy(74, 120, 4),
        heavy(76, 360, 4),
        diveRow(79, 4, { y: 90 }),
        diveRow(81, 4, { y: 150, x: 280 }),
        sineV(86, 150, { leader: true }),
        sineV(88, 330),
        loopTrain(92, 120, 1),
        loopTrain(92.5, 360, -1),
        sweep(96, false, { count: 6 }),

        // Slutvåg (oförändrad, förskjuten i tid)
        { at: 102, warning: 'SLUTVÅG!', sub: 'HÅLL UT, PILOT!', finalWave: true },
        heavy(105, 120, 4, { params: { ty: 120, amp: 60, stay: 7 } }),
        heavy(105, 360, 4, { params: { ty: 120, amp: 60, stay: 7 } }),
        diveRow(106, 6, { spacing: 70, stagger: 0.3 }),
        loopTrain(109, 100, 1, { count: 7, delay: 0.26 }),
        loopTrain(110, 380, -1, { count: 7, delay: 0.26 }),
        sweep(112, true, { count: 6 }),
        sineV(114, 240, { count: 7, leader: true, params: { speed: 110, amp: 60, freq: 1.6 } }),
        diveRow(117, 6, { spacing: 70, y: 150, stagger: 0.25 }),
      ],
    },
    {
      name: 'OMLOPPSBANAN',
      theme: 'space',
      scroll: 110,
      waves: [
        sineV(2, 240, { count: 7, leader: true, params: { speed: 100, amp: 70, freq: 1.4 } }),
        sweep(6, true),
        sweep(7, false),
        heavy(11, 240, 5),
        diveRow(13, 5, { spacing: 80 }),
        loopTrain(18, 90, 1, { count: 7, delay: 0.26, leader: true }),
        loopTrain(20, 390, -1, { count: 7, delay: 0.26 }),
        sineLine(24, 130, 5),
        sineLine(26, 350, 5),
        heavy(30, 120, 5),
        heavy(31, 360, 5),
        diveRow(33, 6, { spacing: 70, stagger: 0.3 }),
        sineV(38, 150, { leader: true }),
        sineV(39, 330),
        sweep(43, true, { count: 7, delay: 0.22 }),
        loopTrain(46, 110, 1, { count: 6 }),
        loopTrain(46.5, 370, -1, { count: 6, leader: true }),
        diveRow(51, 6, { spacing: 70, y: 140 }),

        // Förlängning
        heavy(56, 240, 5),
        sweep(58, true),
        sweep(59, false),
        sineLine(63, 130, 5),
        sineLine(65, 350, 5),
        loopTrain(69, 90, 1, { count: 7, delay: 0.26 }),
        loopTrain(71, 390, -1, { count: 7, delay: 0.26, leader: true }),
        diveRow(76, 6, { spacing: 70, stagger: 0.3 }),
        heavy(80, 120, 5),
        heavy(81, 360, 5),
        sineV(83, 240, { count: 7, params: { speed: 100, amp: 70, freq: 1.4 } }),
        sweep(88, false, { count: 7, delay: 0.22 }),
        loopTrain(92, 110, 1, { count: 6, leader: true }),
        loopTrain(92.5, 370, -1, { count: 6 }),
        diveRow(97, 5, { spacing: 80, y: 140 }),
        sineV(101, 150),
        sineV(102, 330, { leader: true }),
        sweep(106, true, { count: 7, delay: 0.22 }),
        diveRow(110, 6, { spacing: 70, y: 120 }),

        { at: 119, warning: 'VARNING!', sub: 'MODERSKEPPET HAR UPPTÄCKT DIG' },
        { at: 122, boss: 'mothership' },
      ],
    },
  ];
})();
