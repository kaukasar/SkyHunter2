window.SH = window.SH || {};

/* Samtliga justerbara spelparametrar. */
SH.CONFIG = {
  // Logisk spelyta (3:4, vertikal)
  WIDTH: 480,
  HEIGHT: 640,

  // Fast uppdateringssteg (60 uppdateringar/s) med tidsbaserad delta
  STEP: 1 / 60,
  MAX_FRAME_TIME: 0.25,

  // Spelare
  START_LIVES: 3,
  PLAYER_SPEED: 270,          // px per sekund
  PLAYER_SIZE: { w: 40, h: 44 },
  PLAYER_HITBOX: { hw: 5, hh: 6 },
  PLAYER_SPAWN_OFFSET: 70,    // avstånd från nederkanten
  RESPAWN_DELAY: 1.4,
  INVULN_TIME: 3,

  // Vapen
  FIRE_COOLDOWN: 0.11,
  MAX_PLAYER_BULLETS: 15,     // max antal spelarprojektiler på skärmen
  PLAYER_BULLET_SPEED: 720,
  WEAPON_MAX_LEVEL: 3,
  // Antal power-ups (P) som krävs för att gå upp en vapennivå:
  // nivå 1 -> 2 kräver 1 P, nivå 2 -> 3 kräver 3 P
  WEAPON_UPGRADE_COST: [1, 3],
  TRIPLE_SPREAD_DEG: 11,

  // Power-ups
  POWERUP_FALL_SPEED: 85,
  // Endast vart N:e tillfälle (vågledare/utplånad våg) genererar en power-up
  POWERUP_DROP_INTERVAL: 2,
  // Inga power-ups de första N sekunderna av bana 1 när ett nytt spel startas
  POWERUP_START_DELAY: 15,

  // Tålighet: antal träffar innan en fiende sprängs
  ENEMY_HP: {
    basic: 2,
    leader: 2,
    heavyMultiplier: 5,       // banans grundvärde för tung fiende (3-5) x 5 = 15-25 träffar
  },
  BOSS_HP_MULTIPLIER: 1.5,      // gäller alla bossens moduler (kanontorn och kärna)
  // Slutvågssekvensen (bana 2): fiender som dyker upp under sekvensen tål mer
  FINAL_WAVE_HP_MULTIPLIER: 1.5,

  // Poäng
  SCORE: {
    basicByPath: { sine: 100, straight: 100, loop: 150, dive: 200 },
    leader: 200,
    heavyBase: 500,            // grundvärde 3 = 500, 4 = 750, 5 = 1000
    heavyPerArmor: 250,
    waveBonus: 1000,
    powerUpAtMax: 1000,
    bossTurret: 500,
  },
  WAVE_BONUS_MIN_SIZE: 3,

  // Extra liv: först vid 30 000, därefter var 70 000:e poäng (100 000, 170 000 ...)
  EXTEND_FIRST: 30000,
  EXTEND_EVERY: 70000,

  // Stigande svårighetsgrad per bana inom ett varv
  STAGE_SCALING: {
    fireRate: 0.15,
    bulletSpeed: 0.05,
  },

  // Svårighetsökning per genomspelat varv (loop)
  LOOP_SCALING: {
    speed: 0.2,
    fireRate: 0.4,
    bulletSpeed: 0.12,
    bossHp: 0.3,
  },

  // Lagring
  STORAGE_KEY: 'skyhunter.highscores.v1',
  NAME_KEY: 'skyhunter.lastname.v1',
  MUTE_KEY: 'skyhunter.muted.v1',
  HIGHSCORE_ENTRIES: 5,

  FONT_MONO: '"Consolas", "Lucida Console", "Courier New", monospace',
  FONT_DISPLAY: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
};
