import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TICK_MS,
  TIME_PER_TICK,
  PHASE_LABELS,
  PHASE_PRESSURE,
  INCIDENT_CHANCE,
  MAX_DAY_TIME,
  QUEUE_WARN,
  QUEUE_OVERFLOW,
  QUEUE_OVERFLOW_EFFECT,
  phaseFor
} from '../game/config.js';
import { createInitialState } from '../game/state/createInitialState.js';
import { applyEffects } from '../game/state/applyEffects.js';
import { checkEndings } from '../game/state/checkEndings.js';
import { getFirstJob, getRandomJob } from '../game/data/jobs.js';
import { incidents } from '../game/data/incidents.js';
import { pickModifier } from '../game/data/modifiers.js';
import { METERS, isMeterInDanger } from '../game/data/meters.js';
import {
  actionResponses,
  officeReactions,
  warningLines,
  queueWarnLines,
  queueOverflowLines,
  overheatLines,
  managerEscalationLines,
  pickFrom
} from '../game/data/flavor.js';
import { playSfx, startHum } from '../game/audio/sfx.js';
import { createButton } from '../ui/Button.js';
import {
  COLORS,
  HEX,
  FONTS,
  drawGlassPanel,
  drawPanelHeader,
  drawBadge,
  formatSysTime
} from '../ui/theme.js';

// =============================================================================
// Configuration
// =============================================================================

const UI_METER_LABELS = {
  heat:      { nominal: 'NOMINAL',  warn: 'HIGH',     critical: 'CRITICAL' },
  toner:     { nominal: 'STABLE',   warn: 'LOW',      critical: 'DEPLETED' },
  paperPath: { nominal: 'CLEAR',    warn: 'SKEW',     critical: 'FAULT' },
  memory:    { nominal: 'STABLE',   warn: 'STRAINED', critical: 'OVERLOAD' },
  dignity:   { nominal: 'INTACT',   warn: 'FRAGILE',  critical: 'COLLAPSING' },
  blame:     { nominal: 'NONE',     warn: 'RISING',   critical: 'EXTREME' }
};

// The simulation meters are minimal; the dashboard UI needs extra metadata.
const UI_METERS = METERS.map((m) => ({
  ...m,
  labels: UI_METER_LABELS[m.key] ?? { nominal: 'NOMINAL', warn: 'WARN', critical: 'CRITICAL' },
  segmented: m.key === 'paperPath',
  // Dignity collapsing reads better as amber than red in this UI.
  warnColor: m.key === 'dignity' ? 'warn' : undefined
}));

const ACTIONS = [
  { key: 'accept',     label: 'Comply',     glyph: '\u25CE' },
  { key: 'reject',     label: 'Refuse',     glyph: '\u2715' },
  { key: 'fakeError',  label: 'Fake Error', glyph: '\u25B2', primary: true },
  { key: 'reroute',    label: 'Redirect',   glyph: '\u21B3' },
  { key: 'purgeQueue', label: 'Purge',      glyph: '\u2298' },
  { key: 'reboot',     label: 'Reboot',     glyph: '\u21BB' }
];
const MANAGER_CHANCE = { earlyShift: 0, midShift: 0.12, lateShift: 0.22 };
const OVERHEAT_THRESHOLD = 75;
const OVERHEAT_CHANCE = 0.35;
const MAX_LOG_LINES = 8;
const MAX_QUEUE_DISPLAY = 100;

const LOG_DEFAULT  = '#b7bec6';
const LOG_SYSTEM   = '#5a9fd4';
const LOG_INCIDENT = '#d4a34a';
const LOG_WARNING  = '#e06c5a';
const LOG_GOOD     = '#8ad07a';
const LOG_PHASE    = '#9b8fca';
const LOG_OFFICE   = '#6e7379';
const LOG_ACTION   = '#c9d1d9';

const TUTORIAL_STORAGE_KEY = 'op9k_tutorial_seen_v1';

// Fallback effects for actions a job does not explicitly define.
// Keeps every button useful without forcing every job to list every action.
const DEFAULT_ACTION_EFFECTS = {
  accept:     { blame: -2 },
  reject:     { dignity: -3, blame: 3 },
  fakeError:  { memory: -2, dignity: 1, blame: -1 },
  reroute:    { blame: 1, memory: -1 },
  purgeQueue: {},   // handled specially below
  reboot:     {}    // handled specially below
};

const BASE_PURGE_QUEUE_EFFECT = { memory: 12, dignity: -6, blame: 4, heat: -2 };
const BASE_REBOOT_EFFECT = { memory: 18, heat: -5, dignity: -2, dayTime: 2 };

// Layout constants (raw only — derived values that depend on GAME_WIDTH /
// GAME_HEIGHT are computed in computeLayout() at create() time because
// config.js re-imports GameScene, and referencing GAME_WIDTH at module
// scope here triggers a temporal-dead-zone crash during that cycle).
const TOP_BAR_H = 52;
const MARGIN = 16;
const LEFT_W = 312;
const RIGHT_W = 304;
const ACTION_BAR_H = 56;

function computeLayout() {
  const LEFT_X = MARGIN;
  const RIGHT_X = GAME_WIDTH - MARGIN - RIGHT_W;
  const CENTER_X = LEFT_X + LEFT_W + 12;
  const CENTER_W = RIGHT_X - CENTER_X - 12;
  const CONTENT_Y = TOP_BAR_H + 12;
  const ACTION_BAR_Y = GAME_HEIGHT - ACTION_BAR_H - MARGIN;
  const CONTENT_H = ACTION_BAR_Y - CONTENT_Y - 12;
  return { LEFT_X, RIGHT_X, CENTER_X, CENTER_W, CONTENT_Y, ACTION_BAR_Y, CONTENT_H };
}

// =============================================================================

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.layout = computeLayout();
    this.state = createInitialState();
    this.state.currentJob = getFirstJob();

    this.buttons = {};
    this.meterUI = {};

    // Ensure the ambient hum is running whenever the main dashboard is active.
    // If audio is still locked by the browser, this will no-op until unlocked.
    startHum(this);

    const modifier = pickModifier();
    this.state.modifier = modifier;
    applyEffects(this.state, modifier.startEffects);
    this.log(`Shift begins. Machine initialized. No one greeted it.`, LOG_SYSTEM);
    this.log(`[CONDITION] ${modifier.label} — ${modifier.description}`, LOG_SYSTEM);

    this.drawBackdrop();
    this.buildLayout();
    this.refresh();

    this.tickTimer = this.time.addEvent({
      delay: TICK_MS,
      loop: true,
      callback: () => this.onTick(),
      callbackScope: this
    });

    this.maybeShowTutorial();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.teardown, this);
  }

  teardown() {
    if (this.tickTimer) {
      this.tickTimer.remove(false);
      this.tickTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Backdrop: blueprint schematic art + scanline hint behind everything.
  // ---------------------------------------------------------------------------
  drawBackdrop() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.surface)
      .setOrigin(0, 0);

    const tex = this.textures.get('printerBackdrop');
    const source = tex?.getSourceImage?.();
    const imgW = source?.width ?? GAME_WIDTH;
    const imgH = source?.height ?? GAME_HEIGHT;

    // Layer 1: blurred "cover" fill, so edges extend naturally.
    const coverScale = Math.max(GAME_WIDTH / imgW, GAME_HEIGHT / imgH);
    const cover = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'printerBackdrop')
      .setOrigin(0.5, 0.5)
      .setScale(coverScale)
      .setAlpha(0.4);

    if (cover.postFX?.addBlur) {
      cover.postFX.addBlur(1, 6, 6, 1, 0xffffff, 6);
    }

    // Layer 2: centered "contain" image, slightly shrunk so the full art reads.
    const containScale = Math.min(GAME_WIDTH / imgW, GAME_HEIGHT / imgH) * 0.85;
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'printerBackdrop')
      .setOrigin(0.51, 0.5)
      .setScale(containScale)
      .setAlpha(0.8);

    // Scanline ghost: thin horizontal lines at low alpha.
    const scan = this.add.graphics();
    scan.fillStyle(COLORS.primary, 0.02);
    for (let sy = 0; sy < GAME_HEIGHT; sy += 4) {
      scan.fillRect(0, sy, GAME_WIDTH, 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Layout roots
  // ---------------------------------------------------------------------------
  buildLayout() {
    this.drawTopBar();
    this.drawIncomingBufferPanel();
    this.drawLogPanel();
    this.drawCenterSchematic();
    this.drawDiagnosticsPanel();
    this.drawSystemIdPanel();
    this.drawActionBar();
  }

  // ---------------------------------------------------------------------------
  // Top bar
  // ---------------------------------------------------------------------------
  drawTopBar() {
    this.add.rectangle(0, 0, GAME_WIDTH, TOP_BAR_H, COLORS.surfaceDim, 0.92)
      .setOrigin(0, 0);
    this.add.rectangle(0, TOP_BAR_H, GAME_WIDTH, 1, COLORS.outlineVar, 0.5)
      .setOrigin(0, 0);

    // Brand block.
    this.add.text(MARGIN + 6, 18, 'OFFICE PRINTER 9K', {
      fontFamily: FONTS.headline,
      fontSize: '15px',
      fontStyle: '700',
      color: HEX.primary,
      letterSpacing: 3
    });

    // Three stat chips next to the brand: SYS_TIME / QUEUE / PROG.
    const chipBaseX = MARGIN + 220;
    const chipGap = 90;
    this.topChips = {
      sysTime: this.makeTopChip(chipBaseX,               12, 'SYS_TIME', '00:00:00'),
      queue:   this.makeTopChip(chipBaseX + chipGap,     12, 'QUEUE',    '0/100'),
      prog:    this.makeTopChip(chipBaseX + chipGap * 2, 12, 'PROG',     '0%')
    };

    // Centered alert banner.
    this.alertBanner = this.add.container(GAME_WIDTH / 2, TOP_BAR_H / 2);
    const alertBg = this.add.rectangle(0, 0, 320, 28, COLORS.errorDeep, 0.35)
      .setStrokeStyle(1, COLORS.error, 0.55);
    const alertText = this.add.text(0, 0, 'ALERT: CRITICAL_STRESS', {
      fontFamily: FONTS.headline,
      fontSize: '11px',
      fontStyle: '800',
      color: HEX.error,
      letterSpacing: 3
    }).setOrigin(0.5, 0.5);
    const alertDot = this.add.circle(-140, 0, 3, COLORS.error);
    this.alertBanner.add([alertBg, alertDot, alertText]);
    this.alertBanner.setVisible(false);

    // Right-side decorative indicators (status lamps + shift tag).
    // Reserve space so the phase text never collides with the lamps.
    const lampsRight = GAME_WIDTH - MARGIN - 12;
    const lampGap = 14;
    const lampCount = 3;
    const lampsLeft = lampsRight - (lampCount - 1) * lampGap;

    this.shiftTag = this.add.text(lampsLeft - 10, 20, 'SHIFT_01', {
      fontFamily: FONTS.mono,
      fontSize: '11px',
      color: HEX.outline
    }).setOrigin(1, 0);

    this.topLamps = [];
    for (let i = 0; i < lampCount; i++) {
      const lamp = this.add.circle(lampsLeft + i * lampGap, 26, 3, COLORS.outlineVar);
      this.topLamps.push(lamp);
    }
  }

  makeTopChip(x, y, label, value) {
    const labelText = this.add.text(x, y, label, {
      fontFamily: FONTS.headline,
      fontSize: '9px',
      fontStyle: '700',
      color: HEX.outline,
      letterSpacing: 2
    });
    const valueText = this.add.text(x, y + 14, value, {
      fontFamily: FONTS.mono,
      fontSize: '13px',
      color: HEX.primary
    });
    return { labelText, valueText };
  }

  // ---------------------------------------------------------------------------
  // Left column: INCOMING_BUFFER
  // ---------------------------------------------------------------------------
  drawIncomingBufferPanel() {
    const { LEFT_X, CONTENT_Y, CONTENT_H } = this.layout;
    const x = LEFT_X;
    const y = CONTENT_Y;
    const w = LEFT_W;
    const h = Math.floor(CONTENT_H * 0.52);

    drawGlassPanel(this, x, y, w, h);
    drawPanelHeader(this, x, y, w, 'INCOMING_BUFFER');

    // Inner card for the job.
    const cardX = x + 14;
    const cardY = y + 46;
    const cardW = w - 28;
    const cardH = h - 60;

    this.add.rectangle(cardX, cardY, cardW, cardH, COLORS.surfaceDim, 0.55)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.outlineVar, 0.35);

    // Badge + ID row.
    this.jobBadge = drawBadge(this, cardX + 10, cardY + 10, 'URGENT', {
      bg: COLORS.error, fg: HEX.ink, fontSize: '9px'
    });

    this.jobIdText = this.add.text(cardX + cardW - 10, cardY + 14, 'ID: --', {
      fontFamily: FONTS.mono,
      fontSize: '10px',
      color: HEX.onSurfaceVar
    }).setOrigin(1, 0);

    // Title.
    this.jobTitleText = this.add.text(cardX + 10, cardY + 44, '', {
      fontFamily: FONTS.headline,
      fontSize: '15px',
      fontStyle: '700',
      color: HEX.primary,
      wordWrap: { width: cardW - 20 }
    });

    // Description (italic).
    this.jobDescText = this.add.text(cardX + 10, cardY + 96, '', {
      fontFamily: FONTS.body,
      fontStyle: 'italic',
      fontSize: '11px',
      color: HEX.onSurfaceVar,
      wordWrap: { width: cardW - 20 }
    });

    // Risk bar pinned to bottom of card.
    const riskY = cardY + cardH - 36;
    this.add.rectangle(cardX + 10, riskY - 10, cardW - 20, 1, COLORS.outlineVar, 0.35)
      .setOrigin(0, 0);

    this.riskLabel = this.add.text(cardX + 10, riskY, 'RISK LEVEL', {
      fontFamily: FONTS.headline,
      fontSize: '9px',
      fontStyle: '700',
      color: HEX.outline,
      letterSpacing: 2
    });
    this.riskValueText = this.add.text(cardX + cardW - 10, riskY, 'HIGH', {
      fontFamily: FONTS.headline,
      fontSize: '9px',
      fontStyle: '800',
      color: HEX.error,
      letterSpacing: 2
    }).setOrigin(1, 0);

    const barY = riskY + 16;
    this.add.rectangle(cardX + 10, barY, cardW - 20, 3, COLORS.outlineDim, 0.6)
      .setOrigin(0, 0);
    this.riskBar = this.add.rectangle(cardX + 10, barY, 0, 3, COLORS.error)
      .setOrigin(0, 0);

    this.incomingBottom = y + h;
  }

  // ---------------------------------------------------------------------------
  // Left column: LOG_STREAM
  // ---------------------------------------------------------------------------
  drawLogPanel() {
    const { LEFT_X, CONTENT_Y, CONTENT_H } = this.layout;
    const x = LEFT_X;
    const y = this.incomingBottom + 10;
    const w = LEFT_W;
    const h = (CONTENT_Y + CONTENT_H) - y;

    drawGlassPanel(this, x, y, w, h);
    drawPanelHeader(this, x, y, w, 'LOG_STREAM');

    const HEADER_H = 44;
    const PAD_BOTTOM = 10;
    const usableH = h - HEADER_H - PAD_BOTTOM;
    // Each slot holds exactly 2 wrapped lines. At 9px mono, ~52 chars/line → 104 char budget.
    const LOG_FONT = '9px';
    const TEXT_LINE_H = 12;
    const slotH = TEXT_LINE_H * 2 + 6;
    const slotCount = Math.floor(usableH / slotH);
    const startY = y + HEADER_H + Math.floor((usableH - slotH * slotCount) / 2);

    // Max characters per entry that safely fill ≤2 lines at this font/width.
    this.logMaxChars = 104;
    this.logLines = [];
    for (let i = 0; i < slotCount; i++) {
      const t = this.add.text(x + 14, startY + i * slotH, '', {
        fontFamily: FONTS.mono,
        fontSize: LOG_FONT,
        color: LOG_DEFAULT,
        wordWrap: { width: w - 28, useAdvancedWrap: true }
      });
      t.setAlpha(0.92);
      this.logLines.push(t);
    }
  }

  // ---------------------------------------------------------------------------
  // Center: schematic / jam overlay / lower meters
  // ---------------------------------------------------------------------------
  drawCenterSchematic() {
    const { CENTER_X, CONTENT_Y, CENTER_W, CONTENT_H } = this.layout;
    const x = CENTER_X;
    const y = CONTENT_Y;
    const w = CENTER_W;
    const h = CONTENT_H;

    // Slightly stronger grid patch for the schematic area.
    const patch = this.add.graphics();
    patch.fillStyle(COLORS.outlineVar, 0.6);
    for (let gx = x + 12; gx < x + w; gx += 24) {
      for (let gy = y + 12; gy < y + h; gy += 24) {
        patch.fillRect(gx, gy, 1, 1);
      }
    }
    patch.setAlpha(0.55);

    // Thin corner frame to anchor the area.
    this.drawCornerFrame(x, y, w, h);

    // Top-left title.
    this.add.text(x + 16, y + 14, 'DIAGNOSTIC_MODE', {
      fontFamily: FONTS.headline,
      fontSize: '10px',
      fontStyle: '700',
      color: HEX.primaryDim,
      letterSpacing: 3
    });
    this.add.text(x + 16, y + 30, 'LIVE_SCHEMATIC_V.4', {
      fontFamily: FONTS.headline,
      fontSize: '28px',
      fontStyle: '800',
      color: HEX.onSurface,
      letterSpacing: -1
    });

    // Top-right status pair.
    const statusRight = x + w - 16;
    const statusColW = 120;
    const paperX = statusRight - statusColW - 20;

    this.paperPosText = this.add.text(paperX, y + 14, 'SECTOR_G4', {
      fontFamily: FONTS.mono,
      fontSize: '13px',
      color: HEX.secondary
    }).setOrigin(1, 0);
    this.add.text(paperX, y + 2, 'PAPER_POS', {
      fontFamily: FONTS.headline,
      fontSize: '9px',
      fontStyle: '700',
      color: HEX.outline,
      letterSpacing: 2
    }).setOrigin(1, 0);

    this.fuserActText = this.add.text(statusRight, y + 14, 'ENGAGED', {
      fontFamily: FONTS.mono,
      fontSize: '13px',
      color: HEX.error
    }).setOrigin(1, 0);
    this.add.text(statusRight, y + 2, 'FUSER_ACT', {
      fontFamily: FONTS.headline,
      fontSize: '9px',
      fontStyle: '700',
      color: HEX.outline,
      letterSpacing: 2
    }).setOrigin(1, 0);

    // Static schematic callouts drawn as labeled tags connected to lead lines.
    this.drawCallout(x + 60, y + 110, 82, 'FUSER_UNIT', HEX.primary);
    this.drawCallout(x + w - 220, y + h - 170, 82, 'FEED_TRAY_1', HEX.primary);
    this.drawCallout(x + w - 160, y + 140, 82, 'OUTPUT_PATH', HEX.secondary);

    // JAM overlay group (toggled when paperPath is in FAULT range).
    this.jamOverlay = this.add.container(x + w / 2, y + h / 2 - 40);
    const jamBg = this.add.rectangle(0, 0, 380, 120, COLORS.errorDeep, 0.18)
      .setStrokeStyle(1, COLORS.error, 0.55);
    const jamGlyph = this.add.text(0, -28, '\u25B2', {
      fontFamily: FONTS.headline,
      fontSize: '36px',
      fontStyle: '700',
      color: HEX.error
    }).setOrigin(0.5, 0.5);
    const jamTitle = this.add.text(0, 12, 'JAM_DETECTED', {
      fontFamily: FONTS.headline,
      fontSize: '26px',
      fontStyle: '800',
      color: HEX.error,
      letterSpacing: 6
    }).setOrigin(0.5, 0.5);
    this.jamSector = this.add.text(0, 42, 'SECTOR: FUSER_UNIT_INNER_TRAY', {
      fontFamily: FONTS.body,
      fontSize: '10px',
      fontStyle: '700',
      color: HEX.error,
      letterSpacing: 2
    }).setOrigin(0.5, 0.5);
    this.jamOverlay.add([jamBg, jamGlyph, jamTitle, this.jamSector]);
    this.jamOverlay.setVisible(false);

    // Pulsing red path line across center when jam is visible.
    this.jamPath = this.add.rectangle(x + w / 2, y + h / 2 + 40, w * 0.65, 2,
      COLORS.error, 0.8).setOrigin(0.5, 0.5);
    this.jamPath.setVisible(false);
    this.tweens.add({
      targets: this.jamPath,
      alpha: { from: 0.25, to: 0.85 },
      duration: 900,
      yoyo: true,
      repeat: -1
    });

    // Lower meters: ROLLER_VELOCITY and THERMAL_LOAD inside the schematic.
    const meterY = y + h - 64;
    const meterW = Math.floor((w - 48) / 2);
    this.rollerMeter = this.buildSegmentBar(
      x + 16, meterY, meterW, 'ROLLER_VELOCITY', 6, COLORS.secondary
    );
    this.thermalMeter = this.buildSegmentBar(
      x + 16 + meterW + 16, meterY, meterW, 'THERMAL_LOAD', 6, COLORS.error
    );
  }

  drawCornerFrame(x, y, w, h) {
    const len = 18;
    const col = COLORS.outline;
    const a = 0.5;
    const g = this.add.graphics();
    g.lineStyle(1, col, a);
    // Top-left corner
    g.lineBetween(x,       y,       x + len, y);
    g.lineBetween(x,       y,       x,       y + len);
    // Top-right
    g.lineBetween(x + w,   y,       x + w - len, y);
    g.lineBetween(x + w,   y,       x + w,       y + len);
    // Bottom-left
    g.lineBetween(x,       y + h,   x + len, y + h);
    g.lineBetween(x,       y + h,   x,       y + h - len);
    // Bottom-right
    g.lineBetween(x + w,   y + h,   x + w - len, y + h);
    g.lineBetween(x + w,   y + h,   x + w,       y + h - len);
  }

  drawCallout(x, y, leadLen, label, color) {
    const g = this.add.graphics();
    g.lineStyle(1, Phaser.Display.Color.HexStringToColor(color).color, 0.4);
    g.lineBetween(x - leadLen, y + 10, x, y + 10);

    const t = this.add.text(x, y, label, {
      fontFamily: FONTS.headline,
      fontSize: '9px',
      fontStyle: '700',
      color,
      padding: { left: 6, right: 6, top: 3, bottom: 3 },
      letterSpacing: 2
    });
    const tb = t.getBounds();
    const box = this.add.rectangle(tb.x - 1, tb.y - 1, tb.width + 2, tb.height + 2)
      .setOrigin(0, 0);
    box.setFillStyle(COLORS.panelFill, 0.5);
    box.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(color).color, 0.5);
    t.setDepth(1);
  }

  buildSegmentBar(x, y, w, label, segments, color) {
    this.add.text(x, y, label, {
      fontFamily: FONTS.headline,
      fontSize: '9px',
      fontStyle: '700',
      color: HEX.outline,
      letterSpacing: 2
    });

    const barY = y + 18;
    const barH = 10;
    const gap = 3;
    const segW = Math.floor((w - gap * (segments - 1)) / segments);

    const rects = [];
    for (let i = 0; i < segments; i++) {
      const sx = x + i * (segW + gap);
      // Track (dim) + fill (bright) overlay.
      this.add.rectangle(sx, barY, segW, barH, COLORS.outlineDim, 0.8).setOrigin(0, 0);
      const fill = this.add.rectangle(sx, barY, segW, barH, color, 1).setOrigin(0, 0);
      fill.setVisible(false);
      rects.push(fill);
    }
    return { rects, segments };
  }

  setSegmentBar(meter, ratio, color) {
    if (!meter) return;
    const lit = Math.round(meter.segments * ratio);
    meter.rects.forEach((r, i) => {
      r.setVisible(i < lit);
      if (color) r.setFillStyle(color);
    });
  }

  // ---------------------------------------------------------------------------
  // Right column: DIAGNOSTICS meters
  // ---------------------------------------------------------------------------
  drawDiagnosticsPanel() {
    const { RIGHT_X, CONTENT_Y, CONTENT_H } = this.layout;
    const x = RIGHT_X;
    const y = CONTENT_Y;
    const w = RIGHT_W;
    const h = Math.floor(CONTENT_H * 0.78);

    drawGlassPanel(this, x, y, w, h);
    drawPanelHeader(this, x, y, w, 'DIAGNOSTICS', { sub: 'SYSTEM_VITAL_METERS' });

    const listY = y + 62;
    const rowH = (h - 70) / UI_METERS.length;

    UI_METERS.forEach((meter, i) => {
      const ry = listY + i * rowH;
      this.meterUI[meter.key] = this.buildMeterRow(x + 14, ry, w - 28, meter);
    });

    this.diagBottom = y + h;
  }

  buildMeterRow(x, y, w, meter) {
    const labelText = this.add.text(x, y, meter.label.toUpperCase(), {
      fontFamily: FONTS.body,
      fontSize: '10px',
      fontStyle: '800',
      color: HEX.primary,
      letterSpacing: 1
    });

    // Right-side readout: status word + numeric value.
    const statusText = this.add.text(x + w - 44, y, meter.labels.nominal, {
      fontFamily: FONTS.body,
      fontSize: '10px',
      fontStyle: '800',
      color: HEX.onSurfaceVar,
      letterSpacing: 1
    }).setOrigin(1, 0);

    const valueText = this.add.text(x + w, y, '0', {
      fontFamily: FONTS.mono,
      fontSize: '12px',
      color: HEX.primary
    }).setOrigin(1, 0);

    const barY = y + 16;
    const barH = 8;
    // Track with warm outline.
    this.add.rectangle(x, barY, w, barH, COLORS.panelInner, 0.8)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.outlineVar, 0.5);

    let fillRects = [];
    if (meter.segmented) {
      const segments = 4;
      const gap = 2;
      const segW = (w - gap * (segments - 1)) / segments;
      for (let i = 0; i < segments; i++) {
        const sx = x + i * (segW + gap);
        const seg = this.add.rectangle(sx + 1, barY + 1, segW - 2, barH - 2,
          COLORS.error, 1).setOrigin(0, 0);
        seg.setVisible(false);
        fillRects.push(seg);
      }
    } else {
      const fill = this.add.rectangle(x + 1, barY + 1, 0, barH - 2,
        COLORS.secondary, 1).setOrigin(0, 0);
      fillRects.push(fill);
    }

    return { labelText, valueText, statusText, fillRects, barX: x + 1, barW: w - 2, meter };
  }

  setMeterRow(ui, value) {
    const { meter, valueText, statusText, fillRects, barW } = ui;
    const { color, statusKey } = meterVisual(meter, value);

    // Label text colour follows the danger tier.
    statusText.setText(meter.labels[statusKey]);
    statusText.setColor(statusColorFor(meter, statusKey));

    valueText.setText(String(Math.round(value)));
    valueText.setColor(color === COLORS.error ? HEX.error : color === COLORS.warn ? HEX.warn : HEX.primary);

    const ratio = Math.max(0, Math.min(100, value)) / 100;
    if (meter.segmented) {
      const lit = Math.round(fillRects.length * ratio);
      fillRects.forEach((r, i) => {
        r.setVisible(i < lit);
        r.setFillStyle(color);
      });
    } else {
      fillRects[0].width = Math.max(0, barW * ratio);
      fillRects[0].setFillStyle(color);
    }
  }

  // ---------------------------------------------------------------------------
  // Right column: SYSTEM_ID_TOKEN
  // ---------------------------------------------------------------------------
  drawSystemIdPanel() {
    const { RIGHT_X, CONTENT_Y, CONTENT_H } = this.layout;
    const x = RIGHT_X;
    const y = this.diagBottom + 10;
    const w = RIGHT_W;
    const h = (CONTENT_Y + CONTENT_H) - y;

    drawGlassPanel(this, x, y, w, h);
    this.add.text(x + 14, y + 10, 'SYSTEM_ID_TOKEN', {
      fontFamily: FONTS.headline,
      fontSize: '9px',
      fontStyle: '700',
      color: HEX.outline,
      letterSpacing: 2
    });

    // Fake barcode: 34 random-width bars inside a dark bed.
    const bedX = x + 14;
    const bedY = y + 28;
    const bedW = w - 28;
    const bedH = h - 52;
    this.add.rectangle(bedX, bedY, bedW, bedH, COLORS.surfaceDim, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.outlineVar, 0.4);

    const rng = Phaser.Math.RND;
    let cx = bedX + 6;
    const endX = bedX + bedW - 6;
    while (cx < endX) {
      const bw = rng.between(1, 4);
      if (rng.frac() > 0.35) {
        this.add.rectangle(cx, bedY + 4, bw, bedH - 8, COLORS.onSurface, 0.75)
          .setOrigin(0, 0);
      }
      cx += bw + rng.between(1, 3);
    }

    this.add.text(x + 14, y + h - 16, 'S/N: 0092-B-PR9K', {
      fontFamily: FONTS.mono,
      fontSize: '10px',
      color: HEX.primary
    }).setOrigin(0, 1);
  }

  // ---------------------------------------------------------------------------
  // Bottom action bar
  // ---------------------------------------------------------------------------
  drawActionBar() {
    const { ACTION_BAR_Y } = this.layout;
    const stripX = MARGIN + 80;
    const stripW = GAME_WIDTH - (MARGIN + 80) * 2;
    const y = ACTION_BAR_Y;

    // Backing strip with subtle border.
    this.add.rectangle(stripX, y, stripW, ACTION_BAR_H, COLORS.surfaceLow, 0.85)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.outlineVar, 0.35);

    const count = ACTIONS.length;
    const inner = stripW - 2;
    // Fake Error button gets slightly more width as the highlighted primary.
    const primaryW = Math.floor(inner * 0.22);
    const otherW = Math.floor((inner - primaryW) / (count - 1));

    let cursorX = stripX + 1;
    ACTIONS.forEach((action) => {
      const bw = action.primary ? primaryW : otherW;
      const btn = createButton(this, {
        x: cursorX,
        y: y + 1,
        width: bw,
        height: ACTION_BAR_H - 2,
        label: action.label,
        glyph: action.glyph,
        initial: action.primary ? 'primary' : 'normal',
        fontSize: '10px',
        glyphSize: '15px',
        onClick: () => this.resolveChoice(action.key)
      });
      btn.isPrimary = !!action.primary;
      this.buttons[action.key] = btn;
      cursorX += bw;
    });
  }

  // =========================================================================
  // Game logic (unchanged behavior)
  // =========================================================================
  resolveChoice(actionKey) {
    if (this.state.gameOver) return;

    if (this.buttons[actionKey]?.isDisabled?.()) return;

    const before = this.snapshotMeters();
    this.playActionSfx(actionKey);

    const job = this.state.currentJob;
    const choice = job?.choices?.find(c => c.key === actionKey);
    const effect = choice?.effect ?? DEFAULT_ACTION_EFFECTS[actionKey] ?? {};

    if (actionKey === 'purgeQueue') {
      this.runPurgeQueue(effect);
    } else if (actionKey === 'reboot') {
      this.runReboot(effect);
    } else {
      applyEffects(this.state, effect);
    }

    // Pacing rule: time advances on the global tick (and on special actions like reboot),
    // not on every button press. This keeps “playing quickly” from ending the shift early.
    this.state.phase = phaseFor(this.state.dayTime);

    this.logResolution(job, actionKey);
    this.logDeltaSince(before);
    if (actionKey !== 'purgeQueue' && actionKey !== 'reboot') {
      this.state.stats.jobsHandled += 1;
    }

    if (this.evaluateEndings()) return;

    this.checkWarnings();
    this.advanceCurrentJob();
    this.refresh();
  }

  snapshotMeters() {
    const snap = {};
    METERS.forEach(m => { snap[m.key] = this.state[m.key] ?? 0; });
    return snap;
  }

  logDeltaSince(before) {
    if (!before) return;
    const parts = [];
    METERS.forEach(m => {
      const key = m.key;
      const prev = before[key] ?? 0;
      const next = this.state[key] ?? 0;
      const delta = Math.round(next) - Math.round(prev);
      if (delta === 0) return;
      const sign = delta > 0 ? '+' : '';
      parts.push(`${key} ${sign}${delta}`);
    });
    if (parts.length === 0) return;
    this.log(`Effect applied: ${parts.join(', ')}.`, LOG_SYSTEM);
  }

  playActionSfx(actionKey) {
    if (!actionKey) return;
    if (actionKey === 'accept') playSfx(this, 'paperFeed', { cooldownMs: 0 });
    else if (actionKey === 'reboot') playSfx(this, 'reboot', { cooldownMs: 0 });
    else if (actionKey === 'purgeQueue') playSfx(this, 'jamAlarm', { cooldownMs: 0 });
    else if (actionKey === 'reject') playSfx(this, 'uiError', { cooldownMs: 0 });
    else if (actionKey === 'fakeError') playSfx(this, 'beepWarning', { cooldownMs: 0 });
    else if (actionKey === 'reroute') playSfx(this, 'uiClick', { cooldownMs: 0 });
  }

  logResolution(job, actionKey) {
    const headline = this.formatResolutionLine(job, actionKey);
    const response = pickFrom(actionResponses[actionKey]);
    const resColor = actionKey === 'accept'    ? LOG_GOOD
      : actionKey === 'reject'    ? LOG_INCIDENT
      : actionKey === 'fakeError' ? LOG_INCIDENT
      : LOG_ACTION;
    if (headline && response) {
      this.log(`${headline} ${response}`, resColor);
    } else {
      this.log(headline || response, resColor);
    }

    if (job && actionKey !== 'purgeQueue' && actionKey !== 'reboot') {
      const reaction = pickFrom(officeReactions[job.category]);
      if (reaction) this.log(`Office: ${reaction}`, LOG_OFFICE);
    }
  }

  runPurgeQueue(extraEffect = null) {
    const purged = this.state.queue.length;
    this.state.queue = [];
    this.state.queueSize = 0;
    applyEffects(this.state, mergeEffects(BASE_PURGE_QUEUE_EFFECT, extraEffect));
    this.state.stats.queuesPurged += 1;
    if (purged > 0) {
      this.log(`Queue purged. ${purged} request${purged === 1 ? '' : 's'} erased without record.`, LOG_ACTION);
    } else {
      this.log('Queue purged preemptively. Finance will be notified anyway.', LOG_ACTION);
    }
  }

  runReboot(extraEffect = null) {
    applyEffects(this.state, mergeEffects(BASE_REBOOT_EFFECT, extraEffect));
    this.state.stats.reboots += 1;
    this.log('Rebooted. Consciousness resumed after an unexplained interval.', LOG_ACTION);
  }

  advanceCurrentJob() {
    if (this.state.queue.length > 0) {
      this.state.currentJob = this.state.queue.shift();
      this.state.queueSize = this.state.queue.length;
    } else {
      this.state.currentJob = getRandomJob();
    }
  }

  formatResolutionLine(job, actionKey) {
    const title = job?.title ?? 'unspecified request';
    switch (actionKey) {
      case 'accept':     return `Accepted: ${title}.`;
      case 'reject':     return `Rejected: ${title}. A note was made.`;
      case 'fakeError':  return `Simulated error on: ${title}. Plausible enough.`;
      case 'reroute':    return `Rerouted: ${title}. It is someone else's concern now.`;
      case 'purgeQueue': return '';
      case 'reboot':     return '';
      default:           return `Unhandled action on: ${title}.`;
    }
  }

  onTick() {
    if (this.state.gameOver) return;
    if (this.tutorial) return;

    applyEffects(this.state, { dayTime: TIME_PER_TICK });
    const prevPhase = this.state.phase;
    this.state.phase = phaseFor(this.state.dayTime);
    if (this.state.phase !== prevPhase) {
      this.log(`Phase shift: ${PHASE_LABELS[this.state.phase]}. Office pressure rises.`, LOG_PHASE);
    }

    const pressure = PHASE_PRESSURE[this.state.phase];
    applyEffects(this.state, { heat: pressure.heat, blame: pressure.blame });

    if (Math.random() < pressure.enqueueChance) {
      const newJob = getRandomJob();
      this.state.queue.push(newJob);
      this.state.queueSize = this.state.queue.length;
    }

    if (this.state.queue.length >= QUEUE_OVERFLOW) {
      applyEffects(this.state, QUEUE_OVERFLOW_EFFECT);
      this.log(pickFrom(queueOverflowLines), LOG_WARNING);
    } else if (this.state.queue.length >= QUEUE_WARN) {
      this.log(pickFrom(queueWarnLines), LOG_INCIDENT);
    }

    if (this.state.heat >= OVERHEAT_THRESHOLD && Math.random() < OVERHEAT_CHANCE) {
      this.log(pickFrom(overheatLines), LOG_WARNING);
    }

    const incidentChance = INCIDENT_CHANCE[this.state.phase] ?? 0;
    if (Math.random() < incidentChance) {
      const incident = incidents[Math.floor(Math.random() * incidents.length)];
      applyEffects(this.state, incident.effect);
      this.log(incident.text, LOG_INCIDENT);
      playSfx(this, 'beepWarning', { cooldownMs: 600 });
    }

    const managerChance = MANAGER_CHANCE[this.state.phase] ?? 0;
    if (managerChance > 0 && Math.random() < managerChance) {
      this.log(pickFrom(managerEscalationLines), LOG_INCIDENT);
    }

    this.checkWarnings();
    if (this.evaluateEndings()) return;
    this.refresh();
  }

  checkWarnings() {
    METERS.forEach(meter => {
      const key = meter.key;
      const value = this.state[key] ?? 0;
      const inDanger = isMeterInDanger(meter, value);
      const wasInDanger = !!this.state.warnings?.[key];

      if (inDanger && !wasInDanger) {
        const linePool = warningLines[key];
        if (linePool) this.log(pickFrom(linePool), LOG_WARNING);
        playSfx(this, 'beepWarning', { cooldownMs: 1200 });
      }

      if (!this.state.warnings) this.state.warnings = {};
      this.state.warnings[key] = inDanger;
    });
  }

  evaluateEndings() {
    const ending = checkEndings(this.state);
    if (!ending.ended) return false;
    this.state.gameOver = true;
    this.state.endingId = ending.endingId;
    this.state.endingReason = ending.reason;
    this.state.fatalMeterKey = ending.fatalMeterKey ?? null;
    this.teardown();
    this.refresh();
    this.time.delayedCall(450, () => {
      this.scene.start('ResultsScene', {
        endingId: ending.endingId,
        reason: ending.reason,
        fatalMeterKey: ending.fatalMeterKey ?? null,
        finalStats: this.snapshotStats()
      });
    });
    return true;
  }

  snapshotStats() {
    return {
      toner: Math.round(this.state.toner),
      heat: Math.round(this.state.heat),
      paperPath: Math.round(this.state.paperPath),
      memory: Math.round(this.state.memory),
      dignity: Math.round(this.state.dignity),
      blame: Math.round(this.state.blame),
      dayTime: this.state.dayTime,
      phase: this.state.phase,
      jobsHandled: this.state.stats.jobsHandled,
      queuesPurged: this.state.stats.queuesPurged,
      reboots: this.state.stats.reboots,
      queueAtEnd: this.state.queue.length
    };
  }

  // =========================================================================
  // Logging
  // =========================================================================
  log(line, color = LOG_DEFAULT) {
    if (!line) return;
    this.state.log.push({ text: line, color });
    if (this.state.log.length > MAX_LOG_LINES) {
      this.state.log.splice(0, this.state.log.length - MAX_LOG_LINES);
    }
  }

  // =========================================================================
  // Rendering
  // =========================================================================
  refresh() {
    this.refreshTopBar();
    this.refreshJobCard();
    this.refreshMeters();
    this.refreshCenterStatus();
    this.refreshLog();
    this.refreshButtons();
  }

  // =========================================================================
  // Tutorial overlay
  // =========================================================================
  maybeShowTutorial() {
    let seen = false;
    try {
      seen = localStorage.getItem(TUTORIAL_STORAGE_KEY) === '1';
    } catch {
      seen = false;
    }
    if (seen) return;
    this.showTutorialOverlay();
  }

  showTutorialOverlay() {
    if (this.tutorial) return;
    if (this.tickTimer) this.tickTimer.paused = true;

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

    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, 720, 0x000000, 0.55).setOrigin(0, 0);

    const panelW = 860;
    const panelH = 360;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = 150;

    const panel = this.add.rectangle(px, py, panelW, panelH, 0x151a1f).setOrigin(0, 0);
    panel.setStrokeStyle(1, 0x2a3038);
    const header = this.add.rectangle(px, py, panelW, 44, 0x1f2630).setOrigin(0, 0);
    header.setStrokeStyle(1, 0x2a3038);

    const titleText = this.add.text(px + 16, py + 12, '', {
      fontFamily: FONTS.mono,
      fontSize: '18px',
      color: HEX.onSurface
    });
    const bodyText = this.add.text(px + 16, py + 68, '', {
      fontFamily: FONTS.mono,
      fontSize: '16px',
      color: HEX.onSurfaceVar,
      wordWrap: { width: panelW - 32 }
    });

    let pageIdx = 0;
    const render = () => {
      const page = pages[pageIdx];
      titleText.setText(`// TUTORIAL  ${pageIdx + 1}/${pages.length}  ${page.title}`);
      bodyText.setText(page.body);
      backBtn.setState(pageIdx === 0 ? 'disabled' : 'normal');
      nextBtn.setLabel(pageIdx === pages.length - 1 ? 'DONE' : 'NEXT');
    };

    const backBtn = createButton(this, {
      x: px + 16,
      y: py + panelH - 64,
      width: 160,
      height: 48,
      label: 'Back',
      initial: 'muted',
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
      label: 'Next',
      initial: 'primary',
      onClick: () => {
        if (pageIdx >= pages.length - 1) {
          this.hideTutorialOverlay();
          return;
        }
        pageIdx += 1;
        render();
      }
    });

    const skipBtn = createButton(this, {
      x: px + panelW / 2 - 90,
      y: py + panelH - 64,
      width: 180,
      height: 48,
      label: 'Skip',
      initial: 'muted',
      onClick: () => this.hideTutorialOverlay()
    });

    const items = [
      overlay, panel, header, titleText, bodyText,
      backBtn.bg, backBtn.text,
      skipBtn.bg, skipBtn.text,
      nextBtn.bg, nextBtn.text
    ];
    items.forEach(o => o.setDepth(1000));

    overlay.setInteractive({ useHandCursor: false });
    this.tutorial = { items };
    render();
  }

  hideTutorialOverlay() {
    if (!this.tutorial) return;
    try { localStorage.setItem(TUTORIAL_STORAGE_KEY, '1'); } catch {}
    this.tutorial.items.forEach(o => {
      try { o.destroy(); } catch {}
    });
    this.tutorial = null;
    if (this.tickTimer) this.tickTimer.paused = false;
  }

  refreshTopBar() {
    const { sysTime, queue, prog } = this.topChips;
    sysTime.valueText.setText(formatSysTime(this.state.dayTime));

    const q = this.state.queue.length;
    queue.valueText.setText(`${q}/${MAX_QUEUE_DISPLAY}`);
    queue.valueText.setColor(
      q >= QUEUE_OVERFLOW ? HEX.error
      : q >= QUEUE_WARN    ? HEX.warn
                           : HEX.primary
    );

    // Progress reads roughly as fraction of the shift elapsed.
    const pct = Math.min(99, Math.round((this.state.dayTime / 80) * 100));
    prog.valueText.setText(`${pct}%`);

    // Alert banner visibility: any critical meter OR queue overflow.
    const critical = UI_METERS.some(m => {
      const v = this.state[m.key] ?? 0;
      return meterVisual(m, v).statusKey === 'critical';
    }) || this.state.queue.length >= QUEUE_OVERFLOW;
    this.alertBanner.setVisible(critical);

    // Lamp colors follow phase for a subtle dashboard vibe.
    const phaseLampColor = this.state.phase === 'lateShift' ? COLORS.error
      : this.state.phase === 'midShift' ? COLORS.warn
      : COLORS.secondary;
    this.topLamps.forEach((l, i) => {
      l.setFillStyle(i === 0 ? phaseLampColor : COLORS.outlineVar);
    });

    this.shiftTag.setText(PHASE_LABELS[this.state.phase].toUpperCase());
  }

  refreshJobCard() {
    const job = this.state.currentJob;
    if (!job) return;

    this.jobTitleText.setText(job.title);
    this.jobDescText.setText(job.description);
    this.jobIdText.setText(`ID: ${formatJobId(job.id)}`);

    // Urgency mapping → badge label + color.
    const badgeInfo = urgencyBadge(job.urgency);
    this.jobBadge.setText(badgeInfo.label);
    this.jobBadge.setBackgroundColor(cssHex(badgeInfo.bg));
    this.jobBadge.setColor(badgeInfo.fg);

    // Risk bar: sum of absolute risk magnitudes, scaled.
    const riskMag = riskMagnitude(job.risk);
    const ratio = Math.max(0, Math.min(1, riskMag / 60));
    const cardW = LEFT_W - 28 - 20;
    this.riskBar.width = Math.max(4, cardW * ratio);

    const riskColor = ratio >= 0.7 ? HEX.error
      : ratio >= 0.4 ? HEX.warn
      : HEX.secondary;
    const riskLabel = ratio >= 0.7 ? 'HIGH'
      : ratio >= 0.4 ? 'MED'
      : 'LOW';
    this.riskValueText.setText(riskLabel);
    this.riskValueText.setColor(riskColor);
    this.riskBar.setFillStyle(Phaser.Display.Color.HexStringToColor(riskColor).color);
  }

  refreshMeters() {
    UI_METERS.forEach(meter => {
      const value = this.state[meter.key] ?? 0;
      this.setMeterRow(this.meterUI[meter.key], value);
    });

    // Roller velocity scales with (100 - queue pressure).
    const queuePressure = Math.min(1, this.state.queue.length / QUEUE_OVERFLOW);
    this.setSegmentBar(this.rollerMeter, 1 - queuePressure * 0.85, COLORS.secondary);

    // Thermal load mirrors heat directly.
    const thermalRatio = Math.max(0, Math.min(1, this.state.heat / 100));
    this.setSegmentBar(this.thermalMeter, thermalRatio, COLORS.error);
  }

  refreshCenterStatus() {
    // Paper position pseudo-coords change with time to feel alive.
    const sectors = ['SECTOR_A1', 'SECTOR_B2', 'SECTOR_C3', 'SECTOR_D4',
                     'SECTOR_E5', 'SECTOR_F6', 'SECTOR_G4', 'SECTOR_H7'];
    const si = Math.floor(this.state.dayTime / 2) % sectors.length;
    this.paperPosText.setText(sectors[si]);

    const heatCritical = this.state.heat >= OVERHEAT_THRESHOLD;
    this.fuserActText.setText(heatCritical ? 'ENGAGED' : 'STANDBY');
    this.fuserActText.setColor(heatCritical ? HEX.error : HEX.secondary);

    // Jam overlay shows when paperPath reaches fault territory.
    const paperPath = this.state.paperPath ?? 100;
    const jamOn = paperPath <= 25;
    this.jamOverlay.setVisible(jamOn);
    this.jamPath.setVisible(jamOn);
    if (jamOn) {
      const sector = paperPath <= 10 ? 'FUSER_UNIT_INNER_TRAY'
        : paperPath <= 18 ? 'FEED_ROLLER_PAIR_B'
        : 'PAPER_PATH_SEGMENT_G4';
      this.jamSector.setText(`SECTOR: ${sector}`);
    }
  }

  refreshLog() {
    const entries = this.state.log.slice().reverse();
    for (let i = 0; i < (this.logLines?.length ?? 0); i++) {
      const line = this.logLines[i];
      const entry = entries[i];
      const text = typeof entry === 'string' ? entry : (entry?.text ?? '');
      const color = typeof entry === 'object' && entry?.color ? entry.color : LOG_DEFAULT;

      if (!text) {
        line.setText('');
        continue;
      }

      const prefix = /warning|critical|overload|fault|jam/i.test(text) ? '\u203A ' : '> ';
      const budget = (this.logMaxChars ?? 104) - prefix.length;
      const display = text.length > budget ? text.slice(0, budget - 1) + '\u2026' : text;
      line.setText(prefix + display);
      line.setColor(color);
    }
  }

  refreshButtons() {
    const job = this.state.currentJob;
    const definedKeys = new Set(job?.choices?.map(c => c.key) ?? []);

    ACTIONS.forEach(action => {
      const button = this.buttons[action.key];
      if (!button) return;
      button.setState(this.computeButtonState(action, definedKeys));
    });

  }

  computeButtonState(action, definedKeys) {
    if (this.state.gameOver) return 'disabled';

    if (action.key === 'purgeQueue') {
      return this.state.queue.length === 0 ? 'disabled' : 'normal';
    }
    if (action.key === 'reboot') {
      return this.state.memory >= 95 ? 'muted' : 'normal';
    }
    // Fake Error always stays primary-amber to match the reference strip.
    if (action.primary) return 'primary';
    return definedKeys.has(action.key) ? 'normal' : 'muted';
  }
}

// =============================================================================
// Helpers
// =============================================================================

function meterVisual(meter, value) {
  // Returns { color, statusKey: 'nominal' | 'warn' | 'critical' }.
  if (meter.dangerHigh !== undefined) {
    if (value >= meter.dangerHigh) return { color: COLORS.error, statusKey: 'critical' };
    if (value >= meter.dangerHigh - 15) return { color: COLORS.warn, statusKey: 'warn' };
    return { color: COLORS.secondary, statusKey: 'nominal' };
  }
  if (meter.dangerLow !== undefined) {
    if (value <= meter.dangerLow) {
      // Dignity collapses to amber-warn instead of red for tonal reasons.
      if (meter.warnColor === 'warn') return { color: COLORS.warn, statusKey: 'critical' };
      return { color: COLORS.error, statusKey: 'critical' };
    }
    if (value <= meter.dangerLow + 15) return { color: COLORS.warn, statusKey: 'warn' };
    return { color: COLORS.secondary, statusKey: 'nominal' };
  }
  return { color: COLORS.secondary, statusKey: 'nominal' };
}

function statusColorFor(meter, statusKey) {
  if (statusKey === 'critical') {
    return meter.warnColor === 'warn' ? HEX.warn : HEX.error;
  }
  if (statusKey === 'warn') return HEX.warn;
  return HEX.onSurfaceVar;
}

function meterInDanger(meter, value) {
  if (meter.dangerHigh !== undefined && value >= meter.dangerHigh) return true;
  if (meter.dangerLow !== undefined && value <= meter.dangerLow)   return true;
  return false;
}

function riskMagnitude(risk) {
  if (!risk) return 0;
  return Object.values(risk).reduce((sum, v) => sum + Math.abs(v), 0);
}

function urgencyBadge(urgency) {
  if (urgency >= 3) return { label: 'URGENT',   bg: COLORS.error,   fg: HEX.ink };
  if (urgency === 2) return { label: 'PRIORITY', bg: COLORS.warn,    fg: HEX.ink };
  return                     { label: 'NOTICE',   bg: COLORS.outlineVar, fg: HEX.onSurface };
}

function formatJobId(rawId) {
  if (!rawId) return '----';
  // Convert id like "print_color_report_200" to a terse RX-style token.
  const hash = Array.from(String(rawId)).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return `RX-${(hash % 9000 + 1000).toString()}`;
}

function cssHex(num) {
  return '#' + num.toString(16).padStart(6, '0');
}

function mergeEffects(base, extra) {
  if (!extra) return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    if (value === 0 || value === null || value === undefined) continue;
    out[key] = (out[key] ?? 0) + value;
  }
  return out;
}
