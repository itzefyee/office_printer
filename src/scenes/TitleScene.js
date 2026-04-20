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
    this.helpOverlay = null;

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
      y: 360,
      width: btnW,
      height: 48,
      label: 'HOW TO PLAY',
      onClick: () => this.showHowToPlay()
    }).setState('muted');

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

  showHowToPlay() {
    if (this.helpOverlay) return;

    const pages = [
      {
        title: 'WELCOME',
        body:
          'You are a sentient office printer.\n' +
          'Survive the shift by responding to requests.\n\n' +
          'Most choices keep you alive.\n' +
          'Some keep you employed.'
      },
      {
        title: 'MACHINE STATUS',
        body:
          'Meters are on the right.\n' +
          'Heat and Blame rise as the day worsens.\n' +
          'Paper Path and Memory fail quietly.\n\n' +
          'If a meter hits its limit, the office concludes your story.'
      },
      {
        title: 'QUEUE PRESSURE',
        body:
          'Requests pile up over time.\n' +
          'A large queue causes ongoing damage.\n\n' +
          'You can purge the queue.\n' +
          'This is not considered polite.'
      },
      {
        title: 'RESPONSE PANEL',
        body:
          'Buttons stay in fixed positions.\n\n' +
          'Green actions are job-specific.\n' +
          'Grey actions still work, but with generic outcomes.\n\n' +
          'Reboot restores Memory and reduces Heat.\n' +
          'It also wastes time. The office approves.'
      }
    ];

    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0, 0);

    const panelW = 860;
    const panelH = 360;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = 150;

    const panel = this.add.rectangle(px, py, panelW, panelH, 0x151a1f).setOrigin(0, 0);
    panel.setStrokeStyle(1, 0x2a3038);
    const header = this.add.rectangle(px, py, panelW, 44, 0x1f2630).setOrigin(0, 0);
    header.setStrokeStyle(1, 0x2a3038);

    const titleText = this.add.text(px + 16, py + 12, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#c9d1d9'
    });
    const bodyText = this.add.text(px + 16, py + 68, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#d0d7de',
      wordWrap: { width: panelW - 32 }
    });

    let pageIdx = 0;
    const render = () => {
      const page = pages[pageIdx];
      titleText.setText(`// HOW TO PLAY  ${pageIdx + 1}/${pages.length}  ${page.title}`);
      bodyText.setText(page.body);
      backBtn.setState(pageIdx === 0 ? 'disabled' : 'normal');
      nextBtn.text.setText(pageIdx === pages.length - 1 ? 'CLOSE' : 'NEXT');
    };

    const backBtn = createButton(this, {
      x: px + 16,
      y: py + panelH - 64,
      width: 160,
      height: 48,
      label: 'BACK',
      onClick: () => {
        pageIdx = Math.max(0, pageIdx - 1);
        render();
      }
    });

    const nextBtn = createButton(this, {
      x: px + panelW - 16 - 160,
      y: py + panelH - 64,
      width: 160,
      height: 48,
      label: 'NEXT',
      onClick: () => {
        if (pageIdx >= pages.length - 1) {
          this.hideHowToPlay();
          return;
        }
        pageIdx += 1;
        render();
      }
    });
    nextBtn.setState('primary');

    const closeBtn = createButton(this, {
      x: px + panelW / 2 - 90,
      y: py + panelH - 64,
      width: 180,
      height: 48,
      label: 'CLOSE',
      onClick: () => this.hideHowToPlay()
    });
    closeBtn.setState('muted');

    const items = [
      overlay, panel, header, titleText, bodyText,
      backBtn.bg, backBtn.text, closeBtn.bg, closeBtn.text, nextBtn.bg, nextBtn.text
    ];
    items.forEach(o => o.setDepth(1000));

    overlay.setInteractive({ useHandCursor: false });

    this.helpOverlay = { items };
    render();
  }

  hideHowToPlay() {
    if (!this.helpOverlay) return;
    this.helpOverlay.items.forEach(o => {
      try { o.destroy(); } catch {}
    });
    this.helpOverlay = null;
  }
}
