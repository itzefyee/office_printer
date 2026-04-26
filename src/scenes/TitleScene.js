import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../game/config.js';
import { createButton } from '../ui/Button.js';
import { playSfx, startBgm } from '../game/audio/sfx.js';
import { COLORS, HEX, FONTS, drawGlassPanel } from '../ui/theme.js';

/** Faux HP LaserJet–style LCD: plastic bezel, black glass, cyan dot-matrix text + VFD-style glow. */
function addPrinterLcdTitle(scene, cx, yCenter) {
  const lcdW = 1160;
  const lcdH = 128;
  const border = 3;
  const x0 = cx - lcdW / 2;
  const y0 = yCenter - lcdH / 2;
  const bezel = scene.add
    .rectangle(x0, y0, lcdW, lcdH, COLORS.lcdBezel, 1)
    .setOrigin(0, 0);
  const panel = scene.add
    .rectangle(
      x0 + border,
      y0 + border,
      lcdW - border * 2,
      lcdH - border * 2,
      COLORS.lcdPanel,
      1
    )
    .setOrigin(0, 0);
  panel.setStrokeStyle(1, 0x0c0a08, 0.85);

  const lineStyle = {
    fontFamily: FONTS.titleLcd,
    fontSize: '110px',
    color: HEX.lcdCyan,
    letterSpacing: 4
  };
  const halation = scene.add
    .text(cx, yCenter, 'PC LOAD LETTER', { ...lineStyle })
    .setOrigin(0.5, 0.5);
  halation.setAlpha(0.3);
  halation.setScale(1.03);
  halation.setShadow(0, 0, 'rgba(50, 200, 185, 0.95)', 32, true, true);

  const main = scene.add
    .text(cx, yCenter, 'PC LOAD LETTER', lineStyle)
    .setOrigin(0.5, 0.5);
  main.setShadow(0, 0, 'rgba(100, 255, 240, 0.85)', 22, true, true);

  [bezel, panel, halation, main].forEach((o, i) => o.setDepth(5 + i));
  return { bezel, panel, main };
}

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const cx = GAME_WIDTH / 2;
    this.helpOverlay = null;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.surface).setOrigin(0, 0);

    // Blueprint grid dots — baked to a RenderTexture so the display list holds
    // one textured quad instead of ~1 590 individual fillRect path commands.
    const gridGfx = this.add.graphics();
    gridGfx.fillStyle(COLORS.outlineVar, 0.4);
    for (let gx = 24; gx < GAME_WIDTH; gx += 24) {
      for (let gy = 24; gy < GAME_HEIGHT; gy += 24) {
        gridGfx.fillRect(gx, gy, 1, 1);
      }
    }
    const gridRT = this.add.renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0, 0);
    gridRT.draw(gridGfx);
    gridGfx.destroy();

    // Top strip to mirror the game.
    this.add.rectangle(0, 0, GAME_WIDTH, 52, COLORS.surfaceDim, 0.92).setOrigin(0, 0);
    this.add.rectangle(0, 52, GAME_WIDTH, 1, COLORS.outlineVar, 0.5).setOrigin(0, 0);
    this.add
      .text(24, 15, 'PC LOAD LETTER // STANDBY', {
        fontFamily: FONTS.titleLcd,
        fontSize: '22px',
        color: HEX.lcdCyan,
        letterSpacing: 2
      })
      .setShadow(0, 0, 'rgba(70, 200, 190, 0.5)', 5, true, true);
    this.add.circle(14, 26, 3, COLORS.secondary);

    // Main readout: printer-style LCD (dot-matrix font, cyan on black glass).
    addPrinterLcdTitle(this, cx, 208);

    // Framed tagline panel.
    const panelW = 560;
    const panelH = 110;
    drawGlassPanel(this, cx - panelW / 2, 320, panelW, panelH);

    this.add.text(cx, 350, 'DIAGNOSTIC_MODE', {
      fontFamily: FONTS.headline,
      fontSize: '9px',
      fontStyle: '700',
      color: HEX.primaryDim,
      letterSpacing: 3
    }).setOrigin(0.5, 0.5);

    this.add.text(cx, 374, 'A management simulation of quiet corporate despair.', {
      fontFamily: FONTS.body,
      fontSize: '12px',
      fontStyle: '400',
      color: HEX.onSurface
    }).setOrigin(0.5, 0.5);

    this.add.text(cx, 400, 'The printer has been informed it will be evaluated.', {
      fontFamily: FONTS.body,
      fontSize: '10px',
      fontStyle: 'italic',
      color: HEX.onSurfaceVar
    }).setOrigin(0.5, 0.5);

    // Begin shift button.
    const btnW = 260;
    const btnH = 52;

    createButton(this, {
      x: cx - btnW / 2,
      y: 450,
      width: btnW,
      height: 48,
      label: 'How to Play',
      initial: 'muted',
      glyph: '?',
      fontSize: '11px',
      onClick: () => this.showHowToPlay()
    });

    createButton(this, {
      x: cx - btnW / 2,
      y: 520,
      width: btnW,
      height: btnH,
      label: 'Begin Shift',
      initial: 'primary',
      glyph: '\u25B6',
      fontSize: '12px',
      onClick: () => {
        playSfx(this, 'uiConfirm', { cooldownMs: 0 });
        startBgm(this);
        this.scene.start('GameScene');
      }
    });

    // Footer line with S/N feel.
    this.add.text(cx, GAME_HEIGHT - 40, 'S/N: 0092-B-PR9K   //   v0.1 PROTOTYPE', {
      fontFamily: FONTS.mono,
      fontSize: '11px',
      color: HEX.outline
    }).setOrigin(0.5, 0.5);
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
