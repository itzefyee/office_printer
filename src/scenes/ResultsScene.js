import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PHASE_LABELS } from '../game/config.js';
import { endings, pickFrom } from '../game/data/flavor.js';
import { METERS, getMeter } from '../game/data/meters.js';
import { createButton } from '../ui/Button.js';

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

    this.add.rectangle(0, 0, GAME_WIDTH, 56, 0x14181d).setOrigin(0, 0);
    this.add.text(24, 16, 'OFFICE PRINTER 9K // SHIFT CONCLUDED', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#e6e6e6'
    });

    this.addLine(cx, 120, ending.title, '48px', '#d45a4a', true);
    this.addLine(cx, 172, `Ending ID: ${this.endingId}`, '14px', '#7d858f', true);
    if (this.fatalMeterKey) {
      const meter = getMeter(this.fatalMeterKey);
      const label = meter?.label ?? this.fatalMeterKey;
      this.addLine(cx, 190, `Cause: ${label}`, '14px', '#7d858f', true);
    }

    this.addLine(cx, 220, ending.summary, '18px', '#d0d7de', true, 960);
    this.addLine(cx, 268, this.reason, '14px', '#9aa0a6', true, 960);

    this.drawStats(cx, 320);

    const memo = pickFrom(ending.memos);
    this.add.rectangle(cx, 560, 960, 60, 0x151a1f).setOrigin(0.5);
    this.addLine(cx, 544, 'FINAL OFFICE MEMO', '12px', '#7d858f', true);
    this.addLine(cx, 566, memo, '16px', '#e6e6e6', true, 920);

    const btnW = 280;
    const btnH = 52;
    createButton(this, {
      x: cx - btnW / 2,
      y: GAME_HEIGHT - 80,
      width: btnW,
      height: btnH,
      label: 'CLOCK IN AGAIN',
      onClick: () => this.scene.start('TitleScene')
    });
  }

  addLine(x, y, text, size, color, centered = false, wrap = null) {
    const style = {
      fontFamily: 'monospace',
      fontSize: size,
      color,
      align: centered ? 'center' : 'left'
    };
    if (wrap) style.wordWrap = { width: wrap };
    const t = this.add.text(x, y, text, style);
    t.setOrigin(centered ? 0.5 : 0, 0);
    return t;
  }

  drawStats(cx, y) {
    if (!this.stats) return;

    const panelW = 720;
    const panelH = 180;
    const px = cx - panelW / 2;

    this.add.rectangle(px, y, panelW, panelH, 0x151a1f).setOrigin(0, 0);
    this.add.rectangle(px, y, panelW, 28, 0x1f2630).setOrigin(0, 0);
    this.add.text(px + 12, y + 6, 'FINAL STATS', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#c9d1d9'
    });

    const left = [
      ['Phase reached',  PHASE_LABELS[this.stats.phase] ?? this.stats.phase],
      ['Time elapsed',   `T+${this.stats.dayTime}`],
      ['Jobs handled',   this.stats.jobsHandled],
      ['Queues purged',  this.stats.queuesPurged],
      ['Reboots',        this.stats.reboots],
      ['Queue at end',   this.stats.queueAtEnd]
    ];

    const right = METERS.map(m => [m.label, this.stats[m.key]]);

    this.drawStatColumn(px + 24,       y + 44, left);
    this.drawStatColumn(px + panelW/2 + 12, y + 44, right);
  }

  drawStatColumn(x, y, rows) {
    rows.forEach((row, i) => {
      const ry = y + i * 20;
      this.add.text(x, ry, row[0].toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#7d858f'
      });
      this.add.text(x + 220, ry, String(row[1]), {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e6e6e6'
      }).setOrigin(1, 0);
    });
  }
}
