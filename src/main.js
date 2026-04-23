import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import ResultsScene from './scenes/ResultsScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from './game/config.js';

// Engine config lives here so config.js stays a pure constants module and
// avoids the circular dependency: config.js → scenes → config.js.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0a0a0a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    pixelArt: false,
    antialias: true
  },
  scene: [BootScene, TitleScene, GameScene, ResultsScene]
});

// Dev convenience: inspect the live game instance in browser console.
window.__OFFICE_PRINTER_GAME__ = game;
