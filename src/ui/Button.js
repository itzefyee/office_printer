// HMI-style button used across scenes.
// States: normal / primary / muted / disabled / pressed.
// Visual language follows the LIVE_SCHEMATIC mockup:
// - normal:  translucent black fill, amber label, thin warm-tan border
// - primary: filled amber block, dark text, no border
// - muted:   same frame as normal but faded label and no hover glow
// - disabled: barely-there, non-interactive

import { COLORS, HEX, FONTS } from './theme.js';

const STATE_STYLES = {
  normal: {
    fill: COLORS.panelFill,   fillAlpha: 0.72,
    hover: COLORS.surfaceHigh, hoverAlpha: 0.85,
    stroke: COLORS.outline,    strokeAlpha: 0.25,
    text: HEX.primary,         alpha: 1.0
  },
  primary: {
    fill: COLORS.primary,     fillAlpha: 1.0,
    hover: COLORS.primaryStrong, hoverAlpha: 1.0,
    stroke: COLORS.primary,    strokeAlpha: 1.0,
    text: HEX.primaryDark,     alpha: 1.0
  },
  muted: {
    fill: COLORS.panelFill,   fillAlpha: 0.5,
    hover: COLORS.panelFill,  hoverAlpha: 0.6,
    stroke: COLORS.outlineVar, strokeAlpha: 0.35,
    text: HEX.outline,         alpha: 0.8
  },
  disabled: {
    fill: COLORS.panelFill,   fillAlpha: 0.35,
    hover: COLORS.panelFill,  hoverAlpha: 0.35,
    stroke: COLORS.outlineVar, strokeAlpha: 0.2,
    text: HEX.muted,           alpha: 0.5
  },
  pressed: {
    fill: COLORS.primary,     fillAlpha: 0.25,
    hover: COLORS.primary,    hoverAlpha: 0.3,
    stroke: COLORS.primary,    strokeAlpha: 0.6,
    text: HEX.primary,         alpha: 1.0
  }
};

export function createButton(scene, opts) {
  const {
    x, y, width, height,
    label,
    onClick,
    initial = 'normal',
    glyph = null,
    fontSize = '11px',
    glyphSize = '16px'
  } = opts;

  const bg = scene.add.rectangle(x, y, width, height, STATE_STYLES[initial].fill)
    .setOrigin(0, 0);
  bg.setStrokeStyle(1, STATE_STYLES[initial].stroke, STATE_STYLES[initial].strokeAlpha);

  let glyphText = null;
  if (glyph) {
    glyphText = scene.add.text(x + width / 2, y + height / 2 - 12, glyph, {
      fontFamily: FONTS.headline,
      fontSize: glyphSize,
      fontStyle: '700',
      color: STATE_STYLES[initial].text
    }).setOrigin(0.5, 0.5);
  }

  const text = scene.add.text(
    x + width / 2,
    y + height / 2 + (glyph ? 10 : 0),
    label.toUpperCase(),
    {
      fontFamily: FONTS.headline,
      fontSize,
      fontStyle: '700',
      color: STATE_STYLES[initial].text,
      letterSpacing: 2
    }
  ).setOrigin(0.5, 0.5);

  const state = { name: initial, hovering: false, pressed: false };

  const applyVisual = () => {
    let style = STATE_STYLES[state.name];
    if (state.pressed && state.name !== 'disabled') style = STATE_STYLES.pressed;
    const fill = state.hovering && state.name !== 'disabled' && !state.pressed
      ? { color: style.hover, alpha: style.hoverAlpha }
      : { color: style.fill, alpha: style.fillAlpha };

    bg.setFillStyle(fill.color, fill.alpha);
    bg.setStrokeStyle(1, style.stroke, style.strokeAlpha);
    text.setColor(style.text);
    text.setAlpha(style.alpha);
    if (glyphText) {
      glyphText.setColor(style.text);
      glyphText.setAlpha(style.alpha);
    }
  };

  const setInteractive = (enabled) => {
    if (enabled) bg.setInteractive({ useHandCursor: true });
    else bg.disableInteractive();
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

  setInteractive(initial !== 'disabled');
  applyVisual();

  return {
    setState(next) {
      if (!STATE_STYLES[next] || state.name === next) return;
      state.name = next;
      state.pressed = false;
      setInteractive(next !== 'disabled');
      applyVisual();
    },
    setLabel(nextLabel) { text.setText(nextLabel.toUpperCase()); },
    isDisabled() { return state.name === 'disabled'; },
    bg,
    text,
    glyph: glyphText
  };
}
