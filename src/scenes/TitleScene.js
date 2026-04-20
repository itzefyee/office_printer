import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../game/config.js';
import { createButton } from '../ui/Button.js';
import { playSfx, startHum } from '../game/audio/sfx.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(0, 0, GAME_WIDTH, 56, 0x14181d).setOrigin(0, 0);
    this.add.circle(24, 28, 5, 0x8ad07a);
    this.add.text(40, 16, 'OFFICE PRINTER 9K // STANDBY', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#e6e6e6'
    });

    this.add.text(cx, 180, 'OFFICE PRINTER 9K', {
      fontFamily: 'monospace',
      fontSize: '56px',
      color: '#e6e6e6'
    }).setOrigin(0.5);

    this.add.text(cx, 250, 'A management simulation of quiet corporate despair.', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#9aa0a6'
    }).setOrigin(0.5);

    this.add.text(cx, 320, 'The printer has been informed it will be evaluated.', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#6e7379'
    }).setOrigin(0.5);

    const btnW = 260;
    const btnH = 56;
    createButton(this, {
      x: cx - btnW / 2,
      y: 430,
      width: btnW,
      height: btnH,
      label: 'BEGIN SHIFT',
      onClick: () => {
        playSfx(this, 'uiConfirm', { cooldownMs: 0 });
        startHum(this);
        this.scene.start('GameScene');
      }
    });

    this.add.text(cx, GAME_HEIGHT - 40, 'v0.1 prototype', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#4a4f55'
    }).setOrigin(0.5);
  }
}
