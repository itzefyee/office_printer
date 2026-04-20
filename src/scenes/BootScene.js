import Phaser from 'phaser';
import { AUDIO_LIST } from '../game/audio/audioKeys.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    AUDIO_LIST.forEach(a => {
      this.load.audio(a.key, a.url);
    });

    // Avoid blocking scene boot on missing audio files.
    // The game should remain playable even when audio assets haven't been dropped in yet.
    this.load.on('loaderror', () => {});
  }

  create() {
    this.scene.start('TitleScene');
  }
}
