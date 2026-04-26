import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PHASE_LABELS } from '../game/config.js';
import { endings, pickFrom } from '../game/data/flavor.js';
import { METERS, getMeter } from '../game/data/meters.js';
import { createButton } from '../ui/Button.js';
import { playSfx, stopBgm } from '../game/audio/sfx.js';
import { COLORS, HEX, FONTS, drawGlassPanel, drawPanelHeader } from '../ui/theme.js';

export default class ResultsScene extends Phaser.Scene {
  constructor() {
    super('ResultsScene');
  }

  init(data) {
    this.endingId = data?.endingId ?? 'catastrophic_jam';
    this.reason = data?.reason ?? 'Shift concluded without comment.';
    this.stats = data?.finalStats ?? null;
    this.fatalMeterKey = data?.fatalMeterKey ?? null;
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const ending = endings[this.endingId] ?? {
      title: 'END OF SHIFT',
      summary: this.reason,
      memos: ['The office has nothing further to add.']
    };

    stopBgm(this);
    if (this.endingId === 'shift_complete') {
      playSfx(this, 'endingWin', { cooldownMs: 0 });
    } else {
      playSfx(this, 'endingFail', { cooldownMs: 0 });
    }
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.surface).setOrigin(0, 0);

    // Backdrop grid.
    const grid = this.add.graphics();
    grid.fillStyle(COLORS.outlineVar, 0.35);
    for (let gx = 24; gx < GAME_WIDTH; gx += 24) {
      for (let gy = 24; gy < GAME_HEIGHT; gy += 24) {
        grid.fillRect(gx, gy, 1, 1);
      }
    }

    // Top strip.
    this.add.rectangle(0, 0, GAME_WIDTH, 52, COLORS.surfaceDim, 0.92).setOrigin(0, 0);
    this.add.rectangle(0, 52, GAME_WIDTH, 1, COLORS.outlineVar, 0.5).setOrigin(0, 0);
    this.add
      .text(22, 15, 'PC LOAD LETTER // SHIFT CONCLUDED', {
        fontFamily: FONTS.titleLcd,
        fontSize: '24px',
        color: HEX.lcdCyan,
        letterSpacing: 2
      })
      .setShadow(0, 0, 'rgba(70, 200, 190, 0.5)', 6, true, true);
    this.add.circle(14, 26, 3, COLORS.error);

    // Headline block.
    this.add.text(cx, 110, 'DIAGNOSTIC_MODE // ENDED', {
      fontFamily: FONTS.headline,
      fontSize: '10px',
      fontStyle: '700',
      color: HEX.primaryDim,
      letterSpacing: 3
    }).setOrigin(0.5, 0.5);

    this.add.text(cx, 152, ending.title.toUpperCase(), {
      fontFamily: FONTS.headline,
      fontSize: '44px',
      fontStyle: '800',
      color: HEX.error,
      letterSpacing: 4
    }).setOrigin(0.5, 0.5);

    this.add.text(cx, 188, `ENDING_ID: ${this.endingId.toUpperCase()}`, {
      fontFamily: FONTS.mono,
      fontSize: '11px',
      color: HEX.outline
    }).setOrigin(0.5, 0.5);

    if (this.fatalMeterKey) {
      const meter = getMeter(this.fatalMeterKey);
      const label = meter?.label ?? this.fatalMeterKey;
      this.add.text(cx, 206, `CAUSE: ${label.toUpperCase()}`, {
        fontFamily: FONTS.headline,
        fontSize: '10px',
        fontStyle: '700',
        color: HEX.outline,
        letterSpacing: 2
      }).setOrigin(0.5, 0.5);
    }

    this.addLine(cx, 220, ending.summary, '15px', HEX.onSurface, FONTS.body, 960);
    this.addLine(cx, 258, this.reason, '12px', HEX.onSurfaceVar, FONTS.body, 960, 'italic');

    this.drawStats(cx, 300);

    // Final memo panel.
    const memo = pickFrom(ending.memos);
    const memoW = 780;
    const memoH = 80;
    const memoX = cx - memoW / 2;
    const memoY = 538;
    drawGlassPanel(this, memoX, memoY, memoW, memoH);
    drawPanelHeader(this, memoX, memoY, memoW, 'FINAL_OFFICE_MEMO');
    this.add.text(cx, memoY + 58, memo, {
      fontFamily: FONTS.body,
      fontSize: '13px',
      color: HEX.onSurface,
      wordWrap: { width: memoW - 32 },
      align: 'center'
    }).setOrigin(0.5, 0.5);

    const btnW = 280;
    const btnH = 48;
    createButton(this, {
      x: cx - btnW / 2,
      y: GAME_HEIGHT - 76,
      width: btnW,
      height: btnH,
      label: 'Clock In Again',
      initial: 'primary',
      glyph: '\u21BB',
      fontSize: '12px',
      onClick: () => this.scene.start('TitleScene')
    });
  }

  addLine(x, y, text, size, color, font, wrap = null, style = '400') {
    const cfg = {
      fontFamily: font,
      fontSize: size,
      fontStyle: style,
      color,
      align: 'center'
    };
    if (wrap) cfg.wordWrap = { width: wrap };
    return this.add.text(x, y, text, cfg).setOrigin(0.5, 0);
  }

  drawStats(cx, y) {
    if (!this.stats) return;

    const panelW = 780;
    const panelH = 210;
    const px = cx - panelW / 2;

    drawGlassPanel(this, px, y, panelW, panelH);
    drawPanelHeader(this, px, y, panelW, 'FINAL_STATS', { sub: 'END_OF_SHIFT_LOG' });

    const left = [
      ['Phase reached',  PHASE_LABELS[this.stats.phase] ?? this.stats.phase],
      ['Time elapsed',   `T+${this.stats.dayTime}`],
      ['Jobs handled',   this.stats.jobsHandled],
      ['Queues purged',  this.stats.queuesPurged],
      ['Reboots',        this.stats.reboots],
      ['Queue at end',   this.stats.queueAtEnd]
    ];

    const right = METERS.map(m => [m.label, this.stats[m.key]]);

    this.drawStatColumn(px + 28,             y + 64, left);
    this.drawStatColumn(px + panelW / 2 + 12, y + 64, right);
  }

  drawStatColumn(x, y, rows) {
    rows.forEach((row, i) => {
      const ry = y + i * 22;
      this.add.text(x, ry, row[0].toUpperCase(), {
        fontFamily: FONTS.headline,
        fontSize: '10px',
        fontStyle: '700',
        color: HEX.outline,
        letterSpacing: 2
      });
      this.add.text(x + 320, ry, String(row[1]).toUpperCase(), {
        fontFamily: FONTS.mono,
        fontSize: '12px',
        color: HEX.primary
      }).setOrigin(1, 0);
    });
  }
}
