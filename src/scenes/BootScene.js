import Phaser from 'phaser';
import { AUDIO_LIST } from '../game/audio/audioKeys.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('printerBackdrop', 'img/printer-backdrop-dark.png');

    AUDIO_LIST.forEach(a => {
      this.load.audio(a.key, a.url);
    });

    // Avoid blocking scene boot on missing audio files.
    // The game should remain playable even when audio assets haven't been dropped in yet.
    this.load.on('loaderror', () => {});
  }

  create() {
    const proceed = () => this.scene.start('TitleScene');

    if (document.fonts && document.fonts.ready) {
      // Nudge the browser to load each family before we hand off.
      Promise.all([
        document.fonts.load('700 14px "Space Grotesk"'),
        document.fonts.load('400 14px "Inter"'),
        document.fonts.load('500 14px "JetBrains Mono"')
      ]).then(proceed).catch(proceed);
    } else {
      proceed();
    }
  }
}
