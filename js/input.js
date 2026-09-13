(function () {
  'use strict';

  const ACTIONS = {
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    fire: ['Space', 'KeyZ', 'KeyK'],
    pause: ['KeyP', 'Escape'],
    confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyZ', 'KeyK'],
    menuUp: ['ArrowUp', 'KeyW'],
    menuDown: ['ArrowDown', 'KeyS'],
    mute: ['KeyM'],
  };

  const PREVENT_DEFAULT = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Escape', 'Backspace',
  ]);

  const down = new Set();
  const pressed = new Set();  // nedtryckt sedan senaste uppdateringssteget
  const typed = [];           // tecken för initialinmatning

  window.addEventListener('keydown', (e) => {
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    if (SH.Audio) SH.Audio.unlock();
    if (!e.repeat) {
      pressed.add(e.code);
      if (/^[a-zA-Z0-9]$/.test(e.key)) typed.push(e.key.toUpperCase());
    }
    down.add(e.code);
  });

  window.addEventListener('keyup', (e) => {
    down.delete(e.code);
  });

  // Undvik "fastnade" tangenter när fönstret tappar fokus.
  window.addEventListener('blur', () => down.clear());

  SH.Input = {
    isDown(action) {
      const codes = ACTIONS[action];
      for (let i = 0; i < codes.length; i++) if (down.has(codes[i])) return true;
      return false;
    },
    wasPressed(action) {
      const codes = ACTIONS[action];
      for (let i = 0; i < codes.length; i++) if (pressed.has(codes[i])) return true;
      return false;
    },
    codePressed: (code) => pressed.has(code),
    typedChars: () => typed.slice(),
    /* Anropas efter varje fast uppdateringssteg. */
    endStep() {
      pressed.clear();
      typed.length = 0;
    },
  };
})();
