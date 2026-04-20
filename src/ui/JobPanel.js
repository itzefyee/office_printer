import { drawPanel } from './panel.js';

const STYLE = {
  panelFill: 0x151a1f,
  panelHeaderFill: 0x1f2630,
  panelStroke: 0x2a3038
};

export class JobPanel {
  constructor(scene) {
    this.scene = scene;
    this.build();
  }

  build() {
    const x = 32;
    const y = 80;
    const w = 640;
    const h = 280;

    drawPanel(this.scene, x, y, w, h, '// 01  INCOMING REQUEST', STYLE);

    this.urgencyBadge = this.scene.add.text(x + w - 12, y + 6, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#3a4048',
      padding: { left: 8, right: 8, top: 2, bottom: 2 }
    }).setOrigin(1, 0);

    this.jobTitleText = this.scene.add.text(x + 16, y + 52, '', {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: '#ffffff'
    });

    this.jobMetaText = this.scene.add.text(x + 16, y + 94, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#7d858f'
    });

    this.jobDescText = this.scene.add.text(x + 16, y + 128, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#d0d7de',
      wordWrap: { width: w - 32 }
    });

    this.jobRiskLabel = this.scene.add.text(x + 16, y + h - 68, 'PROJECTED IMPACT', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#5a6068'
    });

    this.jobRiskText = this.scene.add.text(x + 16, y + h - 50, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#9aa0a6',
      wordWrap: { width: w - 32 }
    });

    this.jobChoicesText = this.scene.add.text(x + 16, y + h - 24, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#5a6068',
      wordWrap: { width: w - 32 }
    });
  }

  update(job) {
    if (!job) return;

    this.jobTitleText.setText(job.title);
    this.jobMetaText.setText(`Category: ${job.category}    Urgency: ${job.urgency}`);
    this.jobDescText.setText(job.description);
    this.jobRiskText.setText(formatRisk(job.risk));
    const keys = job.choices?.map(c => c.key).join(', ') ?? '';
    this.jobChoicesText.setText(`Recommended responses: ${keys}`);

    this.urgencyBadge.setText(`URGENCY ${job.urgency}`);
    const urgencyColor = job.urgency >= 3 ? '#d45a4a'
      : job.urgency === 2 ? '#d4a34a'
      : '#3a4048';
    this.urgencyBadge.setBackgroundColor(urgencyColor);
  }
}

function formatRisk(risk) {
  if (!risk) return 'Impact profile unspecified.';
  const parts = Object.entries(risk).map(([key, val]) => {
    const sign = val > 0 ? '+' : '';
    return `${key}:${sign}${val}`;
  });
  return parts.join('   ');
}

