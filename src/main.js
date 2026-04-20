import Phaser from 'phaser';
import { gameConfig } from './game/config.js';

const game = new Phaser.Game(gameConfig);

// Dev convenience: inspect the live game in browser console.
// (Safe in production too; it just exposes a reference.)
window.__OFFICE_PRINTER_GAME__ = game;
