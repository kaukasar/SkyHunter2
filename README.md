# Sky Hunter

Vertikalt skrollande arkadshooter för PC-webbläsare. Byggd med HTML5 Canvas och ren JavaScript, utan beroenden och utan byggsteg.

## Starta

Öppna `index.html` direkt i webbläsaren, eller kör den medföljande webbservern:

```
pwsh -NoProfile -ExecutionPolicy Bypass -File serve.ps1
```

Gå sedan till http://localhost:8123/

## Styrning

| Tangent | Funktion |
|---|---|
| Pilar / W A S D | Flyg (8 riktningar) |
| Mellanslag / Z / K | Skjut |
| P / Esc | Paus / meny |
| M | Ljud av/på |

## Struktur

| Fil | Innehåll |
|---|---|
| `js/config.js` | Alla justerbara parametrar (liv, hastigheter, poäng, svårighetsgrad) |
| `js/game.js` | Speltillstånd, fast 60 Hz-loop, kollisioner, poäng |
| `js/stages.js` | Banornas vågsekvenser |
| `js/enemies.js` | Fiendetyper, rörelsebanor (sinus, dykning, looping) och formationer |
| `js/boss.js` | Slutbossar med svaga punkter |
| `js/entities.js` | Spelare, projektiler, power-ups |
| `js/assets.js` | Procedurell grafik, förladdning och verifiering |
| `js/audio.js` | Syntetiserade ljudeffekter (Web Audio) |
| `js/hud.js` | HUD och alla skärmar |
| `js/highscore.js` | Topplista i Local Storage |

## Felsökningsparametrar (URL)

- `?debug`: visar kollisionsboxar, FPS/UPS och antal objekt
- `?god`: gör spelaren osårbar
- `?stage=2`: startar på bana 2 (1–3)
- `?loop=1`: startar på varv 2 (högre svårighetsgrad)
- `?boss`: hoppar direkt till banans slutsekvens

Parametrarna kan kombineras, t.ex. `?stage=3&boss&debug`. Spelobjektet finns som `window.game` i konsolen.
