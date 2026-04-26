// HMI-style palette and typography tokens for PC LOAD LETTER.
// Colors come in two flavors because Phaser needs 0xRRGGBB for shapes
// and '#rrggbb' strings for text fills.

export const COLORS = {
  surface:        0x0a0a0a,
  surfaceDim:     0x0e0e0e,
  surfaceLow:     0x131313,
  surfaceHigh:    0x1c1b1b,
  surfaceVar:     0x201f1f,

  panelFill:      0x131313,
  panelInner:     0x0a0a0a,

  outline:        0x9e8e78,
  outlineVar:     0x514532,
  outlineDim:     0x2a251d,

  primary:        0xffd79b,
  primaryStrong:  0xffba38,
  primaryDark:    0x432c00,

  onSurface:      0xe5e2e1,
  onSurfaceVar:   0xd6c4ac,

  error:          0xffb4ab,
  errorDeep:      0x93000a,

  secondary:      0x82db7e,
  secondaryDeep:  0x006619,

  warn:           0xffb300,

  // Title screen: HP-style LCD window (beige frame, black glass).
  lcdBezel:       0x3d3830,
  lcdPanel:       0x020201
};

export const HEX = {
  primary:       '#ffd79b',
  primaryDim:    '#b69268',
  primaryDark:   '#432c00',
  onSurface:     '#e5e2e1',
  onSurfaceVar:  '#d6c4ac',
  outline:       '#9e8e78',
  outlineVar:    '#514532',
  error:         '#ffb4ab',
  errorDim:      '#93000a',
  secondary:     '#82db7e',
  secondaryDim:  '#4a8047',
  warn:          '#ffb300',
  muted:         '#5a5242',
  ink:           '#0a0a0a',
  // Vintage printer LCD: cyan on black (5×7 / dot-matrix feel).
  lcdCyan:       '#5af0e5',
  lcdCyanDim:    '#1a4a45'
};

export const FONTS = {
  headline: 'Space Grotesk, sans-serif',
  body:     'Inter, sans-serif',
  mono:     'JetBrains Mono, ui-monospace, monospace',
  // Micro 5 = dot-grid look; VT323 = readable VFD fallback.
  titleLcd: '"Micro 5", "VT323", ui-monospace, monospace'
};

// Glass panel helper. Adds a translucent dark fill with a warm-tan border
// and a header rule. Returns no handles; panels are drawn into the scene.
export function drawGlassPanel(scene, x, y, w, h, opts = {}) {
  const fill = opts.fill ?? COLORS.panelFill;
  const fillAlpha = opts.fillAlpha ?? 0.72;
  const strokeColor = opts.stroke ?? COLORS.outline;
  const strokeAlpha = opts.strokeAlpha ?? 0.22;

  const bg = scene.add.rectangle(x, y, w, h, fill).setOrigin(0, 0);
  bg.setAlpha(fillAlpha);

  const border = scene.add.rectangle(x, y, w, h).setOrigin(0, 0);
  border.setFillStyle();
  border.setStrokeStyle(1, strokeColor, strokeAlpha);

  return { bg, border };
}

export function drawPanelHeader(scene, x, y, w, label, opts = {}) {
  const color = opts.color ?? HEX.primary;
  const sub   = opts.sub ?? null;
  const align = opts.align ?? 'left';

  const lx = align === 'left' ? x + 14 : x + w - 14;
  const originX = align === 'left' ? 0 : 1;

  const t = scene.add.text(lx, y + 14, label.toUpperCase(), {
    fontFamily: FONTS.headline,
    fontSize: '11px',
    fontStyle: '700',
    color,
    letterSpacing: 2
  }).setOrigin(originX, 0);

  // Hair-line divider under header.
  const rule = scene.add.rectangle(x + 14, y + 34, w - 28, 1, COLORS.outlineVar, 0.5).setOrigin(0, 0);

  let subText = null;
  if (sub) {
    subText = scene.add.text(lx, y + 30, sub.toUpperCase(), {
      fontFamily: FONTS.body,
      fontSize: '9px',
      fontStyle: '700',
      color: HEX.outline
    }).setOrigin(originX, 0);
    rule.y = y + 46;
  }

  return { label: t, sub: subText, rule };
}

// Terminal-style caret label used for small badges.
export function drawBadge(scene, x, y, text, opts = {}) {
  const fg = opts.fg ?? HEX.ink;
  const bg = opts.bg ?? COLORS.error;
  const padX = opts.padX ?? 6;
  const padY = opts.padY ?? 2;
  const fontSize = opts.fontSize ?? '10px';

  const t = scene.add.text(x, y, text.toUpperCase(), {
    fontFamily: FONTS.headline,
    fontSize,
    fontStyle: '800',
    color: fg,
    padding: { left: padX, right: padX, top: padY, bottom: padY }
  }).setOrigin(opts.originX ?? 0, opts.originY ?? 0);

  t.setBackgroundColor(toCssHex(bg));
  return t;
}

export function toCssHex(num) {
  return '#' + num.toString(16).padStart(6, '0');
}

// Formats sim time like the reference's "09:42:11" display.
// dayTime is the internal shift counter (ticks of TIME_PER_TICK).
// We map every dayTime unit to 1 sim-minute starting at 09:00:00.
export function formatSysTime(dayTime) {
  const startMinutes = 9 * 60;
  const total = startMinutes + Math.floor(dayTime);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const s = Math.floor((dayTime * 11) % 60);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function pad(n) { return n.toString().padStart(2, '0'); }
