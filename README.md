# Office Printer 9K

A one-screen dark comedy browser management game built with Phaser 3 and Vite.
You are a sentient office printer. Your coworkers are the hazard.

## Requirements

- Node.js 18 or newer
- npm

## Install

```
npm install
```

## Run locally

```
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Build

```
npm run build
npm run preview
```

## Project layout

```
src/
  main.js                 Phaser boot entrypoint
  game/
    config.js             Phaser game config and scene registration
    state/
      createInitialState.js
      applyEffects.js
      checkEndings.js
    data/
      jobs.js             Job definitions
  scenes/
    BootScene.js
    TitleScene.js
    GameScene.js          Main dashboard
    ResultsScene.js
```

## Design notes

See `.cursor/docs/` for the full design docs:
- `game-overview.md`
- `core-mechanics.md`
- `ui.md`
- `audio-n-art.md`
