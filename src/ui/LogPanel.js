import { drawPanel } from './panel.js';

const LOG_DEFAULT = '#b7bec6';
const MAX_LOG_LINES = 6;

const STYLE = {
  panelFill: 0x151a1f,
  panelHeaderFill: 0x1f2630,
  panelStroke: 0x2a3038
};

export class LogPanel {
  constructor(scene) {
    this.scene = scene;
    this.build();
  }

  build() {
    const x = 32;
    const y = 376;
    const w = 640;
    const h = 196;

    drawPanel(this.scene, x, y, w, h, '// 03  EVENT LOG', STYLE);

    this.logLines = [];
    for (let i = 0; i < MAX_LOG_LINES; i++) {
      this.logLines.push(this.scene.add.text(x + 12, y + 40 + i * 26, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: LOG_DEFAULT,
        wordWrap: { width: w - 24 }
      }));
    }
  }

  update(logEntries) {
    const displayLog = (logEntries ?? []).slice(-MAX_LOG_LINES).slice().reverse();
    this.logLines.forEach((line, i) => {
      const entry = displayLog[i];
      if (entry) {
        line.setText(entry.text);
        line.setColor(entry.color);
      } else {
        line.setText('');
      }
    });
  }
}

