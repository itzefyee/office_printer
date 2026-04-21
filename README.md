# Office Printer 9K

A one-screen dark comedy browser management game built with Phaser 3 and Vite.
You are a sentient office printer. Your coworkers are the hazard.

## About

Requests arrive. The queue grows. The office becomes more confident.
Your job is to survive long enough for the day to end—without overheating, jamming,
forgetting who you are, or becoming the official cause of everything.

## How to play

- Read the incoming request on the left panel
- Choose an action from the bottom control panel:
  - Comply / Refuse / Fake Error / Redirect / Purge / Reboot
- Watch your meters (right panel): Toner, Heat, Paper Path, Memory, Dignity, Blame
- Survive the shift
  - If a meter hits its fatal limit, the office concludes your story

### Tips

- Fake Error is a tool, not a confession
- Reboot can save you, but it also burns time
- Purge is effective. The office will remember anyway

## Credits

- Engine: Phaser 3
- Build tool: Vite

### Audio attribution

Audio files live in `public/audio/`.
The attribution template is in `public/audio/ATTRIBUTION.md` (fill it in with the exact
source + license for each sound used before jam submission).

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
