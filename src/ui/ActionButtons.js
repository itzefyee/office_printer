import { GAME_WIDTH } from '../game/config.js';
import { createButton } from './Button.js';

// Fixed action buttons. Positions stay stable for the entire run.
const ACTIONS = [
  { key: 'accept',     label: 'Accept' },
  { key: 'reject',     label: 'Reject' },
  { key: 'fakeError',  label: 'Fake Error' },
  { key: 'reroute',    label: 'Reroute' },
  { key: 'purgeQueue', label: 'Purge Queue' },
  { key: 'reboot',     label: 'Reboot' }
];

export class ActionButtons {
  constructor(scene, { onAction }) {
    this.scene = scene;
    this.onAction = onAction;
    this.buttons = {};
    this.build();
  }

  build() {
    const totalWidth = GAME_WIDTH - 64;
    const count = ACTIONS.length;
    const gap = 12;
    const btnW = (totalWidth - gap * (count - 1)) / count;
    const y = 596;
    const h = 72;

    this.scene.add.text(32, y - 18, '// 04  RESPONSE PANEL', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#5a6068'
    });

    ACTIONS.forEach((action, i) => {
      const x = 32 + i * (btnW + gap);
      const button = createButton(this.scene, {
        x, y, width: btnW, height: h,
        label: action.label,
        onClick: () => this.onAction?.(action.key)
      });
      this.buttons[action.key] = button;
    });

    this.scene.add.text(32, y + h + 12, 'Button positions are permanent. The printer has requested they remain permanent.', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#5a6068'
    });
  }

  update(state, job) {
    const definedKeys = new Set(job?.choices?.map(c => c.key) ?? []);
    ACTIONS.forEach(action => {
      const button = this.buttons[action.key];
      if (!button) return;
      const visualState = computeButtonState(state, action.key, definedKeys);
      button.setState(visualState);
    });
  }

  isDisabled(actionKey) {
    const button = this.buttons[actionKey];
    return button ? button.isDisabled() : false;
  }
}

function computeButtonState(state, actionKey, definedKeys) {
  if (state.gameOver) return 'disabled';

  if (actionKey === 'purgeQueue') {
    return state.queue.length === 0 ? 'disabled' : 'normal';
  }
  if (actionKey === 'reboot') {
    return state.memory >= 95 ? 'muted' : 'normal';
  }
  if (definedKeys.has(actionKey)) return 'primary';
  return 'muted';
}

