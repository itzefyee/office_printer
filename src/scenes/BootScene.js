import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // No assets yet. Art and audio arrive later passes.
  }

  create() {
    this.scene.start('TitleScene');
  }
}
