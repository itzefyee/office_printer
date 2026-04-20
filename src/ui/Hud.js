import { GAME_WIDTH, MAX_DAY_TIME, PHASE_LABELS, QUEUE_OVERFLOW, QUEUE_WARN } from '../game/config.js';
import { METERS, isMeterInDanger, isMeterNearDanger } from '../game/data/meters.js';
import { drawPanel } from './panel.js';

const METER_PANEL_WIDTH = 544;
const METER_BAR_INNER = METER_PANEL_WIDTH - 32;

const COLOR_OK = 0x4f8cc9;
const COLOR_WARN = 0xd4a34a;
const COLOR_DANGER = 0xd45a4a;
const COLOR_LAMP_DIM = 0x2a2f36;

const STYLE = {
  panelFill: 0x151a1f,
  panelHeaderFill: 0x1f2630,
  panelStroke: 0x2a3038
};

export class Hud {
  constructor(scene) {
    this.scene = scene;

    this.meterLamps = {};
    this.meterTexts = {};
    this.meterBars = {};

    this.buildTopStrip();
    this.buildMeterPanel();
  }

  buildTopStrip() {
    const strip = this.scene.add.rectangle(0, 0, GAME_WIDTH, 56, 0x14181d).setOrigin(0, 0);
    strip.setStrokeStyle(1, STYLE.panelStroke);

    this.scene.add.circle(24, 28, 5, 0x8ad07a);
    this.scene.add.text(40, 16, 'OFFICE PRINTER 9K', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#e6e6e6'
    });

    this.scene.add.text(288, 16, '//', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#3a4048'
    });

    this.phaseText = this.scene.add.text(314, 16, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9aa0a6'
    });

    this.scene.add.text(560, 16, '//', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#3a4048'
    });

    this.queueText = this.scene.add.text(586, 16, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9aa0a6'
    });

    this.modifierText = this.scene.add.text(760, 16, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#6e7379'
    });

    this.topStatus = this.scene.add.text(GAME_WIDTH - 24, 16, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9aa0a6'
    }).setOrigin(1, 0);

    this.scene.add.rectangle(0, 53, GAME_WIDTH, 3, 0x1a2028).setOrigin(0, 0);
    this.shiftBar = this.scene.add.rectangle(0, 53, 4, 3, 0x8ad07a).setOrigin(0, 0);
  }

  buildMeterPanel() {
    const x = 704;
    const y = 80;
    const w = METER_PANEL_WIDTH;
    const h = 400;

    drawPanel(this.scene, x, y, w, h, '// 02  MACHINE STATUS', STYLE);

    METERS.forEach((meter, i) => {
      const row = y + 52 + i * 54;

      this.meterLamps[meter.key] = this.scene.add.circle(x + 16 + 4, row + 7, 5, COLOR_LAMP_DIM);

      this.scene.add.text(x + 34, row, meter.label.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#9aa0a6'
      });

      this.meterTexts[meter.key] = this.scene.add.text(x + w - 16, row, '0', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e6e6e6'
      }).setOrigin(1, 0);

      this.scene.add.rectangle(x + 16, row + 22, METER_BAR_INNER, 10, 0x222830).setOrigin(0, 0);
      this.meterBars[meter.key] = this.scene.add.rectangle(x + 16, row + 22, 0, 10, COLOR_OK).setOrigin(0, 0);
    });
  }

  update(state) {
    this.phaseText.setText(`PHASE: ${PHASE_LABELS[state.phase].toUpperCase()}`);

    const q = state.queue.length;
    this.queueText.setText(`QUEUE: ${q}`);
    if (q >= QUEUE_OVERFLOW) {
      this.queueText.setColor('#d45a4a');
    } else if (q >= QUEUE_WARN) {
      this.queueText.setColor('#d4a34a');
    } else {
      this.queueText.setColor('#9aa0a6');
    }

    if (state.modifier) {
      this.modifierText.setText(`// ${state.modifier.label.toUpperCase()}`);
    }

    this.topStatus.setText(`DAY 1  //  T+${state.dayTime}`);

    const shiftProgress = Math.min(1, state.dayTime / MAX_DAY_TIME);
    this.shiftBar.width = Math.max(4, GAME_WIDTH * shiftProgress);
    this.shiftBar.fillColor = shiftProgress >= 0.85 ? 0xd45a4a
      : shiftProgress >= 0.6 ? 0xd4a34a
      : 0x8ad07a;

    METERS.forEach(meter => {
      const value = state[meter.key] ?? 0;
      this.meterTexts[meter.key].setText(String(Math.round(value)));

      const fill = Math.max(0, Math.min(100, value)) / 100;
      this.meterBars[meter.key].width = METER_BAR_INNER * fill;

      const color = meterColor(meter, value);
      this.meterBars[meter.key].fillColor = color;
      this.meterLamps[meter.key].fillColor = color === COLOR_OK ? COLOR_LAMP_DIM : color;
      this.meterTexts[meter.key].setColor(color === COLOR_DANGER ? '#d45a4a'
        : color === COLOR_WARN ? '#d4a34a'
        : '#e6e6e6');
    });
  }
}

function meterColor(meter, value) {
  if (isMeterInDanger(meter, value)) return COLOR_DANGER;
  if (isMeterNearDanger(meter, value, 15)) return COLOR_WARN;
  return COLOR_OK;
}

