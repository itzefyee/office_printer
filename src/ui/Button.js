// Small text button helper used across scenes.
// Supports normal / hover / pressed / primary / muted / disabled states.
// Keeps art minimal: a filled rectangle, a border, and a label.

const STATE_COLORS = {
  normal:   { fill: 0x2a2f36, hover: 0x3a4048, stroke: 0x3a4048, text: '#ffffff', alpha: 1.0 },
  primary:  { fill: 0x2f3d33, hover: 0x3d503f, stroke: 0x4e6b4f, text: '#e6ffe6', alpha: 1.0 },
  muted:    { fill: 0x20252b, hover: 0x2d333a, stroke: 0x2a3038, text: '#7d858f', alpha: 0.85 },
  disabled: { fill: 0x1a1d21, hover: 0x1a1d21, stroke: 0x22262b, text: '#4a4f55', alpha: 0.55 },
  pressed:  { fill: 0x4a5058, hover: 0x4a5058, stroke: 0x5a6068, text: '#ffffff', alpha: 1.0 }
};

export function createButton(scene, opts) {
  const { x, y, width, height, label, onClick } = opts;
  const fontFamily = opts.fontFamily ?? 'monospace';
  const fontSize = opts.fontSize ?? '18px';

  const bg = scene.add.rectangle(x, y, width, height, STATE_COLORS.normal.fill).setOrigin(0, 0);
  bg.setStrokeStyle(1, STATE_COLORS.normal.stroke);

  const text = scene.add.text(x + width / 2, y + height / 2, label, {
    fontFamily,
    fontSize,
    color: STATE_COLORS.normal.text
  }).setOrigin(0.5);

  const state = {
    name: 'normal',
    hovering: false,
    pressed: false
  };

  const applyVisual = () => {
    const effective = state.pressed
      ? STATE_COLORS.pressed
      : (state.hovering && state.name !== 'disabled')
        ? { ...STATE_COLORS[state.name], fill: STATE_COLORS[state.name].hover }
        : STATE_COLORS[state.name];

    bg.setFillStyle(effective.fill);
    bg.setStrokeStyle(1, effective.stroke);
    bg.setAlpha(effective.alpha);
    text.setColor(effective.text);
    text.setAlpha(effective.alpha);
  };

  const setInteractive = (enabled) => {
    if (enabled) {
      bg.setInteractive({ useHandCursor: true });
    } else {
      bg.disableInteractive();
    }
  };

  bg.on('pointerover', () => {
    if (state.name === 'disabled') return;
    state.hovering = true;
    applyVisual();
  });
  bg.on('pointerout', () => {
    state.hovering = false;
    state.pressed = false;
    applyVisual();
  });
  bg.on('pointerdown', () => {
    if (state.name === 'disabled') return;
    state.pressed = true;
    applyVisual();
  });
  bg.on('pointerup', () => {
    if (state.name === 'disabled') return;
    const wasPressed = state.pressed;
    state.pressed = false;
    applyVisual();
    if (wasPressed && state.hovering) onClick?.();
  });

  setInteractive(true);
  applyVisual();

  return {
    setState(nextState) {
      if (!STATE_COLORS[nextState]) return;
      if (state.name === nextState) return;
      state.name = nextState;
      state.pressed = false;
      setInteractive(nextState !== 'disabled');
      applyVisual();
    },
    isDisabled() {
      return state.name === 'disabled';
    },
    bg,
    text
  };
}
