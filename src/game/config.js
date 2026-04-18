import Phaser from 'phaser';
import BootScene from '../scenes/BootScene.js';
import TitleScene from '../scenes/TitleScene.js';
import GameScene from '../scenes/GameScene.js';
import ResultsScene from '../scenes/ResultsScene.js';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// --- Tuning ----------------------------------------------------------------
// All values chosen so designers can edit them without touching scene code.

export const TICK_MS = 5000;
export const TIME_PER_TICK = 2;

export const PHASE_THRESHOLDS = {
  earlyShift: 0,
  midShift: 22,
  lateShift: 50
};

export const PHASE_LABELS = {
  earlyShift: 'Early Shift',
  midShift:   'Mid Shift',
  lateShift:  'Late Shift'
};

// Per-phase tick pressure. Each field is applied on every tick.
// enqueueChance is the probability of pushing a new job onto the queue.
export const PHASE_PRESSURE = {
  earlyShift: { heat: 1, blame: 0, enqueueChance: 0.35 },
  midShift:   { heat: 2, blame: 1, enqueueChance: 0.55 },
  lateShift:  { heat: 3, blame: 2, enqueueChance: 0.75 }
};

export const QUEUE_WARN = 5;
export const QUEUE_OVERFLOW = 8;

// Hits applied once per tick when the queue is above QUEUE_OVERFLOW.
export const QUEUE_OVERFLOW_EFFECT = { paperPath: -2, blame: 2, heat: 1 };

export function phaseFor(dayTime) {
  if (dayTime >= PHASE_THRESHOLDS.lateShift) return 'lateShift';
  if (dayTime >= PHASE_THRESHOLDS.midShift)  return 'midShift';
  return 'earlyShift';
}

// --- Phaser config ---------------------------------------------------------

export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b0d10',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    pixelArt: false,
    antialias: true
  },
  scene: [BootScene, TitleScene, GameScene, ResultsScene]
};
