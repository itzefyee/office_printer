import Phaser from 'phaser';
import { AUDIO_LIST } from '../game/audio/audioKeys.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('printerBackdrop', 'img/printer-backdrop-dark.png');
    this.load.image('printerBackdropSad', 'img/printer-backdrop-sad.png');
    this.load.image('printerBackdropAngry', 'img/printer-backdrop-angry.png');

    AUDIO_LIST.forEach(a => {
      this.load.audio(a.key, a.url);
    });

    // Surface any failed asset loads to the console so missing/broken audio
    // is diagnosable, while still keeping the game playable when files are absent.
    this.load.on('loaderror', (file) => {
      console.warn(`[BootScene] asset failed to load: ${file?.key} (${file?.url ?? file?.src ?? 'unknown url'})`);
    });

    this.load.on('filecomplete', (key, type) => {
      if (type === 'audio') console.log(`[BootScene] audio loaded: ${key}`);
    });
  }

  create() {
    const proceed = () => this.scene.start('TitleScene');

    if (document.fonts && document.fonts.ready) {
      // Nudge the browser to load each family before we hand off.
      Promise.all([
        document.fonts.load('700 14px "Space Grotesk"'),
        document.fonts.load('400 14px "Inter"'),
        document.fonts.load('500 14px "JetBrains Mono"'),
        document.fonts.load('400 110px "Micro 5"'),
        document.fonts.load('400 110px "VT323"')
      ]).then(proceed).catch(proceed);
    } else {
      proceed();
    }
  }
}
