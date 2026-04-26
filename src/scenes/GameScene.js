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
import { timedEvents } from '../game/data/timedEvents.js';
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
import { playSfx, startBgm } from '../game/audio/sfx.js';
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
  heat: { nominal: 'NOMINAL', warn: 'HIGH', critical: 'CRITICAL' },
  toner: { nominal: 'STABLE', warn: 'LOW', critical: 'DEPLETED' },
  paperPath: { nominal: 'CLEAR', warn: 'SKEW', critical: 'FAULT' },
  memory: { nominal: 'STABLE', warn: 'STRAINED', critical: 'OVERLOAD' },
  dignity: { nominal: 'INTACT', warn: 'FRAGILE', critical: 'COLLAPSING' },
  blame: { nominal: 'NONE', warn: 'RISING', critical: 'EXTREME' }
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
  { key: 'accept', label: 'Comply', glyph: '\u25CE' },
  { key: 'reject', label: 'Refuse', glyph: '\u2715' },
  { key: 'fakeError', label: 'Fake Error', glyph: '\u25B2', primary: true },
  { key: 'reroute', label: 'Redirect', glyph: '\u21B3' },
  { key: 'purgeQueue', label: 'Purge', glyph: '\u2298' },
  { key: 'reboot', label: 'Reboot', glyph: '\u21BB' }
];

const ACTION_TOOLTIPS = {
  accept: { title: 'COMPLY', desc: 'Accept the request.\nReduces Blame. Job effects apply.' },
  reject: { title: 'REFUSE', desc: 'Reject outright. Costs Dignity.\nRaises Blame. Office notes it.' },
  fakeError: { title: 'FAKE ERROR', desc: 'Simulate a fault. Plausible deniability.\nDrains Memory.' },
  reroute: { title: 'REDIRECT', desc: 'Forward to another department.\nShifts Blame. Small Memory cost.' },
  purgeQueue: { title: 'PURGE QUEUE', desc: 'Erase all queued requests.\nReduces Heat. Considered rude.' },
  reboot: { title: 'REBOOT', desc: 'Restart systems. Recovers Memory + Heat.\nAdvances shift time.' }
};
const MANAGER_CHANCE = { earlyShift: 0, midShift: 0.12, lateShift: 0.22 };
const OVERHEAT_THRESHOLD = 75;
const OVERHEAT_CHANCE = 0.35;
const MAX_LOG_LINES = 8;
const LOG_DEFAULT = '#b7bec6';
const LOG_SYSTEM = '#5a9fd4';
const LOG_INCIDENT = '#d4a34a';
const LOG_WARNING = '#e06c5a';
const LOG_GOOD = '#8ad07a';
const LOG_PHASE = '#9b8fca';
const LOG_OFFICE = '#6e7379';
const LOG_ACTION = '#c9d1d9';

// Fallback effects for actions a job does not explicitly define.
// Keeps every button useful without forcing every job to list every action.
const DEFAULT_ACTION_EFFECTS = {
  accept: { blame: -2 },
  reject: { dignity: -6, blame: 7 },
  fakeError: { memory: -5, dignity: 1, blame: 2 },
  reroute: { blame: 4, memory: -2 },
  purgeQueue: {},   // handled specially below
  reboot: {}    // handled specially below
};

const BASE_PURGE_QUEUE_EFFECT = { memory: 8, dignity: -12, blame: 10, heat: -2 };
const BASE_REBOOT_EFFECT = { memory: 12, heat: -3, dignity: -5, dayTime: 5 };

// Raw layout constants. Derived values that combine these with GAME_WIDTH /
// GAME_HEIGHT are computed inside computeLayout() at create() time.
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
    this.shiftPopup = null;
    this.jobToast = null;
    this.jobToastTimer = null;
    this.consequencePopup = null;
    this.timedEventPopup = null;
    this.pendingJobToast = null;
    this.onboarding = null;

    // Pause / menu / shortcuts overlay state
    this.paused = false;
    this.pauseOverlay = null;
    this.menuPanel = null;
    this.shortcutsPanel = null;

    // Pause / menu / shortcuts overlay state
    this.paused = false;
    this.pauseOverlay = null;
    this.menuPanel = null;
    this.shortcutsPanel = null;

    // Ensure the BGM is running whenever the main dashboard is active.
    // If audio is still locked by the browser, this will no-op until unlocked.
    startBgm(this);

    const modifier = pickModifier();
    this.state.modifier = modifier;
    applyEffects(this.state, modifier.startEffects);
    this.log(`Shift begins. Machine initialized. No one greeted it.`, LOG_SYSTEM);
    this.log(`[CONDITION] ${modifier.label} — ${modifier.description}`, LOG_SYSTEM);

    this.drawBackdrop();

    // Phase ambient tint — fades in as the shift escalates (behind all UI panels).
    this.phaseOverlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x7a2800, 0)
      .setOrigin(0, 0);

    // Danger veil — pulses amber/red when meters enter warn/critical.
    this.dangerVeil = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x8b0000, 0)
      .setOrigin(0, 0);
    this.dangerVeilTween = null;
    this.dangerVeilState = 'none'; // 'none' | 'warn' | 'critical'

    // Backdrop mood state.
    this.backdropMood = 'good'; // 'good' | 'sad' | 'angry'
    this.backdropKey = 'printerBackdrop';
    this.backdropMoodTween = null;

    this.buildLayout();
    this.refresh();

    this.tickTimer = this.time.addEvent({
      delay: TICK_MS,
      loop: true,
      callback: () => this.onTick(),
      callbackScope: this
    });

    this.setupKeyboardShortcuts();
    this.maybeShowTutorial();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.teardown, this);
  }

  teardown() {
    if (this.tickTimer) {
      this.tickTimer.remove(false);
      this.tickTimer = null;
    }
    this.pendingJobToast = null;
    this._destroyJobToast();
    this._destroyShiftPopup();
    this._destroyConsequencePopup();
    this._destroyTimedEventPopup();
    this._destroyPauseOverlay();
    this._destroyMenuPanel();
    this._destroyShortcutsPanel();
    if (this.onboarding) {
      this.onboarding.items.forEach(o => { try { o.destroy(); } catch { } });
      this.onboarding = null;
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
    this.backdropCover = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'printerBackdrop')
      .setOrigin(0.5, 0.5)
      .setScale(coverScale)
      .setAlpha(0.4);

    if (this.backdropCover.postFX?.addBlur) {
      this.backdropCover.postFX.addBlur(1, 6, 6, 1, 0xffffff, 6);
    }

    // Layer 2: centered "contain" image, slightly shrunk so the full art reads.
    const containScale = Math.min(GAME_WIDTH / imgW, GAME_HEIGHT / imgH) * 0.81;
    this.backdropMain = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'printerBackdrop')
      .setOrigin(0.51, 0.5)
      .setScale(containScale)
      .setAlpha(0.7);

    // Scanline ghost — baked to a RenderTexture (~180 fillRect → 1 quad).
    const scanGfx = this.add.graphics();
    scanGfx.fillStyle(COLORS.primary, 0.02);
    for (let sy = 0; sy < GAME_HEIGHT; sy += 4) {
      scanGfx.fillRect(0, sy, GAME_WIDTH, 1);
    }
    const scanRT = this.add.renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0, 0);
    scanRT.draw(scanGfx);
    scanGfx.destroy();
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
    this.initActionTooltips();
    this.drawMenuBar();
  }

  // ---------------------------------------------------------------------------
  // Top bar
  // ---------------------------------------------------------------------------
  drawTopBar() {
    this.add.rectangle(0, 0, GAME_WIDTH, TOP_BAR_H, COLORS.surfaceDim, 0.92)
      .setOrigin(0, 0);
    this.add.rectangle(0, TOP_BAR_H, GAME_WIDTH, 1, COLORS.outlineVar, 0.5)
      .setOrigin(0, 0);

    // Brand block (LCD font to match title screen).
    this.add
      .text(MARGIN + 6, 15, 'PC LOAD LETTER', {
        fontFamily: FONTS.titleLcd,
        fontSize: '22px',
        color: HEX.lcdCyan,
        letterSpacing: 2
      })
      .setShadow(0, 0, 'rgba(70, 200, 190, 0.5)', 6, true, true);

    // Three stat chips next to the brand: SYS_TIME / QUEUE / PROG.
    // Brand uses large LCD type; start chips after the label so nothing overlaps.
    const chipBaseX = MARGIN + 310;
    const chipGap = 90;
    this.topChips = {
      sysTime: this.makeTopChip(chipBaseX, 12, 'SYS_TIME', '00:00:00'),
      queue: this.makeTopChip(chipBaseX + chipGap, 12, 'QUEUE', '0/100'),
      prog: this.makeTopChip(chipBaseX + chipGap * 2, 12, 'PROG', '0%')
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

    // Right-side: pause + menu buttons, then lamps + shift tag.
    // Reserve 70px on the right for the two icon buttons.
    const BTN_SIZE = 30;
    const lampsRight = GAME_WIDTH - MARGIN - 12 - 70;
    const lampGap = 14;
    const lampCount = 3;
    const lampsLeft = lampsRight - (lampCount - 1) * lampGap;

    this.shiftTag = this.add.text(lampsLeft - 10, 20, 'SHIFT_01', {
      fontFamily: FONTS.mono,
      fontSize: '11px',
      color: HEX.outline
    }).setOrigin(1, 0);

    // Shift phase indicators: 1/2/3 dots lit for early/mid/late.
    this.shiftDots = [];
    for (let i = 0; i < lampCount; i++) {
      const x = lampsLeft + i * lampGap;
      const y = 26;
      const dot = this.add.circle(x, y, 4, COLORS.outlineVar);
      this.shiftDots.push(dot);
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
  // Menu bar: Pause + Menu icon buttons drawn at high depth so they always sit
  // above game panels. Called last inside buildLayout() to ensure top z-order.
  // ---------------------------------------------------------------------------
  drawMenuBar() {
    const DEPTH = 2000;
    const BTN_SZ = 30;
    const cy = TOP_BAR_H / 2;

    // ── PAUSE button [⏸] ────────────────────────────────────────────
    const pauseX = GAME_WIDTH - MARGIN - BTN_SZ - 4 - BTN_SZ - 6;
    const pauseBg = this.add.rectangle(pauseX, cy - BTN_SZ / 2, BTN_SZ, BTN_SZ,
      COLORS.surfaceHigh, 0.85)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.outline, 0.25)
      .setDepth(DEPTH)
      .setInteractive({ useHandCursor: true });

    this.pauseIcon = this.add.text(pauseX + BTN_SZ / 2, cy, '\u23F8', {
      fontFamily: FONTS.headline, fontSize: '13px', color: HEX.primary
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);

    pauseBg.on('pointerover', () => pauseBg.setFillStyle(COLORS.outline, 0.22));
    pauseBg.on('pointerout', () => pauseBg.setFillStyle(COLORS.surfaceHigh, 0.85));
    pauseBg.on('pointerup', () => this.togglePause());

    // ── MENU button [≡] ─────────────────────────────────────────────
    const menuX = GAME_WIDTH - MARGIN - BTN_SZ;
    const menuBg = this.add.rectangle(menuX, cy - BTN_SZ / 2, BTN_SZ, BTN_SZ,
      COLORS.surfaceHigh, 0.85)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.outline, 0.25)
      .setDepth(DEPTH)
      .setInteractive({ useHandCursor: true });

    this.add.text(menuX + BTN_SZ / 2, cy, '\u2261', {
      fontFamily: FONTS.headline, fontSize: '16px', color: HEX.primary
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);

    menuBg.on('pointerover', () => menuBg.setFillStyle(COLORS.outline, 0.22));
    menuBg.on('pointerout', () => menuBg.setFillStyle(COLORS.surfaceHigh, 0.85));
    menuBg.on('pointerup', () => this.toggleMenu());
  }

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------
  setupKeyboardShortcuts() {
    const kb = this.input.keyboard;
    if (!kb) return;

    // Store key objects so update() can poll them
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this._keys = {
      one: kb.addKey(KC.ONE),
      two: kb.addKey(KC.TWO),
      three: kb.addKey(KC.THREE),
      four: kb.addKey(KC.FOUR),
      five: kb.addKey(KC.FIVE),
      six: kb.addKey(KC.SIX),
      p: kb.addKey(KC.P),
      s: kb.addKey(KC.S),
      t: kb.addKey(KC.T),
      q: kb.addKey(KC.Q),
      esc: kb.addKey(KC.ESC),
    };

    // Action key → game action mapping
    this._actionKeys = [
      { key: this._keys.one, action: 'accept' },
      { key: this._keys.two, action: 'reject' },
      { key: this._keys.three, action: 'fakeError' },
      { key: this._keys.four, action: 'reroute' },
      { key: this._keys.five, action: 'purgeQueue' },
      { key: this._keys.six, action: 'reboot' },
    ];
  }

  // Called every frame by Phaser — used for key polling
  update() {
    if (!this._keys) return;
    const JD = Phaser.Input.Keyboard.JustDown;

    // P → pause / resume
    if (JD(this._keys.p)) {
      if (!this.menuPanel && !this.shortcutsPanel) this.togglePause();
    }

    // ESC → close shortcuts or toggle menu
    if (JD(this._keys.esc)) {
      if (this.shortcutsPanel) { this._destroyShortcutsPanel(); }
      else { this.toggleMenu(); }
    }

    // S → toggle shortcuts panel
    if (JD(this._keys.s)) {
      if (!this.menuPanel) {
        if (this.shortcutsPanel) this._destroyShortcutsPanel();
        else this.showShortcutsPanel();
      }
    }

    // T → open/reopen tutorial (blocked only if already showing)
    if (JD(this._keys.t)) {
      if (!this.paused && !this.menuPanel && !this.shortcutsPanel && !this.tutorial) {
        this.showTutorialOverlay();
      }
    }

    // Q → quit to title
    if (JD(this._keys.q)) {
      if (!this.menuPanel && !this.shortcutsPanel) {
        this.cameras.main.fade(400, 0, 0, 0);
        this.time.delayedCall(420, () => this.scene.start('TitleScene'));
      }
    }

    // 1-6 → actions (only when not paused / overlays open)
    if (!this.paused && !this.menuPanel && !this.shortcutsPanel) {
      for (const { key, action } of this._actionKeys) {
        if (JD(key)) { this.resolveChoice(action); break; }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Pause
  // ---------------------------------------------------------------------------
  togglePause() {
    if (this.state.gameOver) return;
    // Note: pause is allowed even during tutorial/onboarding
    // so the player can always freeze the game.
    if (this.menuPanel) this._destroyMenuPanel(true);

    this.paused = !this.paused;

    if (this.paused) {
      // Pause the entire scene time clock — freezes ALL timers instantly
      this.time.paused = true;
      this.pauseIcon?.setText('\u25B6');
      this._showPauseOverlay();
    } else {
      // Resume scene clock
      this.time.paused = false;
      this.pauseIcon?.setText('\u23F8');
      this._destroyPauseOverlay();
    }
  }

  _showPauseOverlay() {
    if (this.pauseOverlay) return;
    const DEPTH = 1800;
    const items = [];

    // Dark veil — blocks game input while paused
    const veil = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setOrigin(0, 0).setDepth(DEPTH).setInteractive();
    items.push(veil);

    const cw = 420, ch = 230;
    const cx = (GAME_WIDTH - cw) / 2;
    const cy = (GAME_HEIGHT - ch) / 2;

    // Panel background
    items.push(this.add.rectangle(cx, cy, cw, ch, COLORS.surface, 1)
      .setOrigin(0, 0).setStrokeStyle(1, COLORS.primary, 0.55).setDepth(DEPTH + 1));
    // Left accent strip
    items.push(this.add.rectangle(cx, cy, 3, ch, COLORS.primary, 0.9)
      .setOrigin(0, 0).setDepth(DEPTH + 2));
    // Header band
    items.push(this.add.rectangle(cx, cy, cw, 48, COLORS.primary, 0.12)
      .setOrigin(0, 0).setDepth(DEPTH + 2));
    // Divider
    items.push(this.add.rectangle(cx + 14, cy + 48, cw - 28, 1, COLORS.outlineVar, 0.4)
      .setOrigin(0, 0).setDepth(DEPTH + 2));

    // Title
    items.push(this.add.text(cx + 20, cy + 14, '⏸  GAME IS PAUSED', {
      fontFamily: FONTS.headline, fontSize: '18px', fontStyle: '800',
      color: HEX.primary, letterSpacing: 4
    }).setDepth(DEPTH + 3));

    // Sub-tag
    items.push(this.add.text(cx + cw - 18, cy + 18, 'TICK SUSPENDED', {
      fontFamily: FONTS.mono, fontSize: '10px', color: HEX.outline
    }).setOrigin(1, 0).setDepth(DEPTH + 3));

    // Body text
    items.push(this.add.text(cx + 20, cy + 62,
      'All shift timers are frozen.\nYour meters will not change while paused.', {
      fontFamily: FONTS.mono, fontSize: '13px',
      color: HEX.onSurfaceVar, lineSpacing: 7
    }).setDepth(DEPTH + 3));

    // Shortcut hint
    items.push(this.add.text(cx + 20, cy + 112,
      'Press [P] to resume  •  [ESC] Menu  •  [S] Shortcuts  •  [Q] Quit', {
      fontFamily: FONTS.mono, fontSize: '10px', color: HEX.outline
    }).setDepth(DEPTH + 3));

    // ── RESUME BUTTON ──────────────────────────────────────────────
    const btnW = 200, btnH = 44;
    const btnX = cx + (cw - btnW) / 2;
    const btnY = cy + ch - 14 - btnH;

    const resumeBtn = createButton(this, {
      x: btnX, y: btnY,
      width: btnW, height: btnH,
      label: '▶  RESUME',
      initial: 'primary',
      fontSize: '13px',
      onClick: () => this.togglePause()
    });
    resumeBtn.bg.setDepth(DEPTH + 3);
    resumeBtn.text.setDepth(DEPTH + 4);
    items.push(resumeBtn.bg, resumeBtn.text);

    this.pauseOverlay = items;
  }

  _destroyPauseOverlay() {
    if (!this.pauseOverlay) return;
    this.pauseOverlay.forEach(o => { try { o.destroy(); } catch { } });
    this.pauseOverlay = null;
  }

  // ---------------------------------------------------------------------------
  // Menu panel
  // ---------------------------------------------------------------------------
  toggleMenu() {
    if (this.menuPanel) { this._destroyMenuPanel(); return; }
    this.showMenuPanel();
  }

  showMenuPanel() {
    if (this.menuPanel) return;
    const wasPaused = this.paused;
    if (!wasPaused && this.tickTimer) this.tickTimer.paused = true;

    const DEPTH = 1900;
    const pw = 280, ph = 278;
    const px = GAME_WIDTH - MARGIN - pw;
    const py = TOP_BAR_H + 6;
    const items = [];

    const veil = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.35)
      .setOrigin(0, 0).setDepth(DEPTH).setInteractive();
    items.push(veil);

    items.push(this.add.rectangle(px, py, pw, ph, COLORS.surface, 1)
      .setOrigin(0, 0).setStrokeStyle(1, COLORS.outline, 0.3).setDepth(DEPTH + 1));
    items.push(this.add.rectangle(px, py, 3, ph, COLORS.primary, 0.8)
      .setOrigin(0, 0).setDepth(DEPTH + 2));
    items.push(this.add.rectangle(px, py, pw, 38, COLORS.primary, 0.1)
      .setOrigin(0, 0).setDepth(DEPTH + 2));

    items.push(this.add.text(px + 14, py + 11, '\u2261  SYSTEM MENU', {
      fontFamily: FONTS.headline, fontSize: '12px', fontStyle: '800',
      color: HEX.primary, letterSpacing: 3
    }).setDepth(DEPTH + 3));

    items.push(this.add.rectangle(px + 14, py + 38, pw - 28, 1, COLORS.outlineVar, 0.5)
      .setOrigin(0, 0).setDepth(DEPTH + 2));

    const menuItems = [
      { label: '\u25B6  Resume', key: 'resume', hint: '[P]' },
      { label: '\u2328  Shortcuts', key: 'shortcuts', hint: '[S]' },
      { label: '\u21BA  Tutorial', key: 'tutorial', hint: '[T]' },
      { label: '\u2718  Quit to Title', key: 'quit', hint: '[Q]' }
    ];

    menuItems.forEach((item, idx) => {
      const ry = py + 48 + idx * 52;

      const rowBg = this.add.rectangle(px + 8, ry, pw - 16, 44,
        COLORS.surfaceHigh, 0)
        .setOrigin(0, 0).setDepth(DEPTH + 2)
        .setInteractive({ useHandCursor: true });

      const labelT = this.add.text(px + 22, ry + 14, item.label, {
        fontFamily: FONTS.headline, fontSize: '13px', fontStyle: '700',
        color: HEX.onSurface, letterSpacing: 1
      }).setDepth(DEPTH + 3);

      const hintT = item.hint ? this.add.text(px + pw - 18, ry + 14, item.hint, {
        fontFamily: FONTS.mono, fontSize: '11px', color: HEX.outline
      }).setOrigin(1, 0).setDepth(DEPTH + 3) : null;

      if (idx < menuItems.length - 1) {
        items.push(this.add.rectangle(px + 14, ry + 44, pw - 28, 1,
          COLORS.outlineVar, 0.3).setOrigin(0, 0).setDepth(DEPTH + 2));
      }

      rowBg.on('pointerover', () => {
        rowBg.setFillStyle(COLORS.primary, 0.10);
        labelT.setColor(HEX.primary);
      });
      rowBg.on('pointerout', () => {
        rowBg.setFillStyle(COLORS.surfaceHigh, 0);
        labelT.setColor(HEX.onSurface);
      });
      rowBg.on('pointerup', () => this._onMenuSelect(item.key, wasPaused));

      items.push(rowBg, labelT);
      if (hintT) items.push(hintT);
    });

    veil.on('pointerup', () => this._destroyMenuPanel(false));
    this.menuPanel = { items, wasPaused };
  }

  _onMenuSelect(key, wasPaused) {
    this._destroyMenuPanel(true);

    if (key === 'resume') {
      if (!wasPaused && this.tickTimer &&
        !this.shiftPopup && !this.tutorial && !this.onboarding) {
        this.tickTimer.paused = false;
      }
    } else if (key === 'shortcuts') {
      this.showShortcutsPanel();
    } else if (key === 'tutorial') {
      if (!wasPaused && this.tickTimer &&
        !this.shiftPopup && !this.tutorial && !this.onboarding) {
        this.tickTimer.paused = false;
      }
      this.showTutorialOverlay();
    } else if (key === 'quit') {
      this.cameras.main.fade(400, 0, 0, 0);
      this.time.delayedCall(420, () => this.scene.start('TitleScene'));
    }
  }

  _destroyMenuPanel(resumeTick = false) {
    if (!this.menuPanel) return;
    const { items, wasPaused } = this.menuPanel;
    items.forEach(o => { try { o.destroy(); } catch { } });
    this.menuPanel = null;
    if (resumeTick && !wasPaused && !this.paused &&
      this.tickTimer && !this.shiftPopup && !this.tutorial && !this.onboarding) {
      this.tickTimer.paused = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Shortcuts reference panel
  // ---------------------------------------------------------------------------
  showShortcutsPanel() {
    if (this.shortcutsPanel) return;

    const DEPTH = 1950;
    const pw = 500, ph = 372;
    const px = (GAME_WIDTH - pw) / 2;
    const py = (GAME_HEIGHT - ph) / 2;
    const items = [];

    const veil = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setOrigin(0, 0).setDepth(DEPTH).setInteractive();
    items.push(veil);

    items.push(this.add.rectangle(px, py, pw, ph, COLORS.surface, 1)
      .setOrigin(0, 0).setStrokeStyle(1, COLORS.primary, 0.45).setDepth(DEPTH + 1));
    items.push(this.add.rectangle(px, py, 3, ph, COLORS.primary, 0.8)
      .setOrigin(0, 0).setDepth(DEPTH + 2));
    items.push(this.add.rectangle(px, py, pw, 44, COLORS.primary, 0.1)
      .setOrigin(0, 0).setDepth(DEPTH + 2));
    items.push(this.add.rectangle(px + 14, py + 44, pw - 28, 1, COLORS.outlineVar, 0.5)
      .setOrigin(0, 0).setDepth(DEPTH + 2));

    items.push(this.add.text(px + 18, py + 13, '\u2328  KEYBOARD SHORTCUTS', {
      fontFamily: FONTS.headline, fontSize: '13px', fontStyle: '800',
      color: HEX.primary, letterSpacing: 4
    }).setDepth(DEPTH + 3));

    items.push(this.add.text(px + pw - 18, py + 16,
      'ESC / [?] to close', {
      fontFamily: FONTS.mono, fontSize: '10px', color: HEX.outline
    }).setOrigin(1, 0).setDepth(DEPTH + 3));

    const sections = [
      {
        header: 'ACTIONS',
        rows: [
          { key: '[1]', desc: 'Comply       \u2014 accept the print request' },
          { key: '[2]', desc: 'Refuse       \u2014 reject the request' },
          { key: '[3]', desc: 'Fake Error   \u2014 plausible deniability' },
          { key: '[4]', desc: 'Redirect     \u2014 forward to another dept.' },
          { key: '[5]', desc: 'Purge Queue  \u2014 erase all queued jobs' },
          { key: '[6]', desc: 'Reboot       \u2014 recover Memory + Heat' },
        ]
      },
      {
        header: 'SYSTEM',
        rows: [
          { key: '[P]', desc: 'Pause / Resume the shift timer' },
          { key: '[S]', desc: 'Toggle Shortcuts reference panel' },
          { key: '[T]', desc: 'Open Tutorial' },
          { key: '[Q]', desc: 'Quit to Title screen' },
          { key: '[ESC]', desc: 'Open / close the System Menu' },
        ]
      }
    ];

    let oy = py + 58;
    sections.forEach(section => {
      items.push(this.add.text(px + 18, oy, section.header, {
        fontFamily: FONTS.headline, fontSize: '10px', fontStyle: '700',
        color: HEX.outline, letterSpacing: 3
      }).setDepth(DEPTH + 3));
      items.push(this.add.rectangle(px + 18 + 72, oy + 7, pw - 36 - 72, 1,
        COLORS.outlineVar, 0.4).setOrigin(0, 0).setDepth(DEPTH + 2));
      oy += 22;

      section.rows.forEach(row => {
        items.push(this.add.text(px + 24, oy, row.key, {
          fontFamily: FONTS.mono, fontSize: '12px', color: HEX.primary
        }).setDepth(DEPTH + 3));
        items.push(this.add.text(px + 84, oy, row.desc, {
          fontFamily: FONTS.mono, fontSize: '12px', color: HEX.onSurfaceVar
        }).setDepth(DEPTH + 3));
        oy += 22;
      });
      oy += 10;
    });

    items.push(this.add.text(px + pw / 2, py + ph - 20,
      'Click anywhere or press [ESC] to close', {
      fontFamily: FONTS.mono, fontSize: '10px', color: HEX.outline
    }).setOrigin(0.5, 0).setDepth(DEPTH + 3));

    veil.on('pointerup', () => this._destroyShortcutsPanel());
    this.shortcutsPanel = items;
  }

  _destroyShortcutsPanel() {
    if (!this.shortcutsPanel) return;
    this.shortcutsPanel.forEach(o => { try { o.destroy(); } catch { } });
    this.shortcutsPanel = null;
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

    // Schematic dot-grid — baked to a RenderTexture (~255 fillRect → 1 quad).
    const patchGfx = this.add.graphics();
    patchGfx.fillStyle(COLORS.outlineVar, 0.6);
    for (let gx = x + 12; gx < x + w; gx += 24) {
      for (let gy = y + 12; gy < y + h; gy += 24) {
        patchGfx.fillRect(gx, gy, 1, 1);
      }
    }
    const patchRT = this.add.renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0, 0);
    patchRT.draw(patchGfx);
    patchRT.setAlpha(0.55);
    patchGfx.destroy();

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
    g.lineBetween(x, y, x + len, y);
    g.lineBetween(x, y, x, y + len);
    // Top-right
    g.lineBetween(x + w, y, x + w - len, y);
    g.lineBetween(x + w, y, x + w, y + len);
    // Bottom-left
    g.lineBetween(x, y + h, x + len, y + h);
    g.lineBetween(x, y + h, x, y + h - len);
    // Bottom-right
    g.lineBetween(x + w, y + h, x + w - len, y + h);
    g.lineBetween(x + w, y + h, x + w, y + h - len);
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

  // ---------------------------------------------------------------------------
  // Action button tooltips
  // ---------------------------------------------------------------------------
  initActionTooltips() {
    const { ACTION_BAR_Y } = this.layout;
    const DEPTH = 600;
    const TW = 220;
    const TH = 66;
    const TY = ACTION_BAR_Y - 10; // bottom edge of tooltip

    const bg = this.add.rectangle(0, 0, TW, TH, COLORS.surface, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.outline, 0.3)
      .setDepth(DEPTH)
      .setVisible(false);

    // Accent bottom rule that visually points toward the button.
    const bottomRule = this.add.rectangle(0, 0, TW, 2, COLORS.primary, 0.55)
      .setOrigin(0, 0)
      .setDepth(DEPTH + 1)
      .setVisible(false);

    const titleT = this.add.text(0, 0, '', {
      fontFamily: FONTS.headline,
      fontSize: '11px',
      fontStyle: '800',
      color: HEX.primary,
      letterSpacing: 2
    }).setOrigin(0.5, 0).setDepth(DEPTH + 1).setVisible(false);

    const descT = this.add.text(0, 0, '', {
      fontFamily: FONTS.mono,
      fontSize: '10px',
      color: HEX.onSurfaceVar,
      wordWrap: { width: TW - 20 },
      lineSpacing: 2,
      align: 'center'
    }).setOrigin(0.5, 0).setDepth(DEPTH + 1).setVisible(false);

    this.actionTooltip = { bg, bottomRule, titleT, descT, TW, TH, TY };

    ACTIONS.forEach(action => {
      const btn = this.buttons[action.key];
      if (!btn) return;
      const centerX = btn.bg.x + btn.bg.width / 2;
      btn.bg.on('pointerover', () => this.showActionTooltip(centerX, ACTION_TOOLTIPS[action.key]));
      btn.bg.on('pointerout', () => this.hideActionTooltip());
    });
  }

  showActionTooltip(centerX, info) {
    if (!this.actionTooltip || !info) return;
    const { bg, bottomRule, titleT, descT, TW, TH, TY } = this.actionTooltip;

    const clampedX = Math.max(TW / 2 + MARGIN, Math.min(GAME_WIDTH - TW / 2 - MARGIN, centerX));
    const left = clampedX - TW / 2;
    const top = TY - TH;

    bg.setPosition(left, top);
    bottomRule.setPosition(left, top + TH - 2);
    titleT.setPosition(clampedX, top + 10);
    descT.setPosition(clampedX, top + 28);

    titleT.setText(info.title);
    descT.setText(info.desc);

    [bg, bottomRule, titleT, descT].forEach(o => o.setVisible(true).setAlpha(1));
  }

  hideActionTooltip() {
    if (!this.actionTooltip) return;
    const { bg, bottomRule, titleT, descT } = this.actionTooltip;
    [bg, bottomRule, titleT, descT].forEach(o => o.setVisible(false));
  }

  // =========================================================================
  // Game logic (unchanged behavior)
  // =========================================================================
  resolveChoice(actionKey) {
    if (this.state.gameOver) return;
    if (this.paused) return;          // blocked while paused

    if (this.buttons[actionKey]?.isDisabled?.()) return;

    // During onboarding only the guided-wait state (step 2) should process an
    // action.  Every other step (spotlights 0/1, reaction card 3, ready screen 4)
    // blocks input so that spamming buttons cannot skip or duplicate guided jobs.
    if (this.onboarding && this.onboarding.step !== 2) return;

    // Capture before any processing so the reaction fires correctly at the end.
    const isOnboardingChoice = this.onboarding?.step === 2;

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
    this.showConsequencePopup(actionKey, job, before);
    this.advanceCurrentJob();
    this.refresh();

    if (isOnboardingChoice) {
      this._onboardingReact(actionKey);
    }
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
    const resColor = actionKey === 'accept' ? LOG_GOOD
      : actionKey === 'reject' ? LOG_INCIDENT
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
    this.cameras.main.shake(400, 0.009);
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
    const merged = mergeEffects(BASE_REBOOT_EFFECT, extraEffect);
    // Cap memory recovery per reboot so job-specific bonuses can not trivialise
    // the resource. Base value (12) is always available; stacked bonus is capped
    // so total gain never exceeds 18.
    if ((merged.memory ?? 0) > 18) merged.memory = 18;
    applyEffects(this.state, merged);
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
    // Store for deferred display — toast shows only after consequence popup dismisses.
    if (this.state.currentJob?.urgency >= 2) {
      this.pendingJobToast = this.state.currentJob;
    }
  }

  formatResolutionLine(job, actionKey) {
    const title = job?.title ?? 'unspecified request';
    switch (actionKey) {
      case 'accept': return `Accepted: ${title}.`;
      case 'reject': return `Rejected: ${title}. A note was made.`;
      case 'fakeError': return `Simulated error on: ${title}. Plausible enough.`;
      case 'reroute': return `Rerouted: ${title}. It is someone else's concern now.`;
      case 'purgeQueue': return '';
      case 'reboot': return '';
      default: return `Unhandled action on: ${title}.`;
    }
  }

  onTick() {
    if (this.state.gameOver) return;
    if (this.paused) return;   // safety guard: tick timer should already be paused
    if (this.tutorial) return;

    applyEffects(this.state, { dayTime: TIME_PER_TICK });
    const prevPhase = this.state.phase;
    this.state.phase = phaseFor(this.state.dayTime);
    if (this.state.phase !== prevPhase) {
      this.log(`Phase shift: ${PHASE_LABELS[this.state.phase]}. Office pressure rises.`, LOG_PHASE);

      // Gradually tint the scene warmer as the shift worsens.
      const phaseAlpha = this.state.phase === 'lateShift' ? 0.18
        : this.state.phase === 'midShift' ? 0.10
          : 0;
      const phaseColor = this.state.phase === 'lateShift' ? 0x8b0000 : 0xb54000;
      if (this.phaseOverlay) {
        this.phaseOverlay.setFillStyle(phaseColor);
        this.tweens.add({ targets: this.phaseOverlay, alpha: phaseAlpha, duration: 2500 });
      }

      this.showShiftChangePopup(this.state.phase);
    }

    const pressure = PHASE_PRESSURE[this.state.phase];
    applyEffects(this.state, { heat: pressure.heat, blame: pressure.blame, toner: pressure.toner ?? 0 });

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
      this.log(incident.text, incident.positive ? LOG_GOOD : LOG_INCIDENT);
      if (!incident.positive) {
        playSfx(this, 'beepWarning', { cooldownMs: 600 });
        this.cameras.main.shake(180, 0.003);
      }
    }

    const managerChance = MANAGER_CHANCE[this.state.phase] ?? 0;
    if (managerChance > 0 && Math.random() < managerChance) {
      this.log(pickFrom(managerEscalationLines), LOG_INCIDENT);
    }

    this.checkTimedEvents();
    this.checkWarnings();
    if (this.evaluateEndings()) return;
    this.refresh();
  }

  // =========================================================================
  // Timed events
  // =========================================================================
  checkTimedEvents() {
    // firedEventIds is a plain object used as a presence map (O(1) vs Array.includes O(n)).
    if (!this.state.firedEventIds) this.state.firedEventIds = {};

    for (const event of timedEvents) {
      if (this.state.firedEventIds[event.id]) continue;
      const { from, to } = event.window;
      if (this.state.dayTime < from || this.state.dayTime > to) continue;
      if (Math.random() >= event.chance) continue;

      // Mark as fired before any side-effects so re-entrant ticks can't double-fire.
      this.state.firedEventIds[event.id] = true;

      applyEffects(this.state, event.effect);

      if (event.queueJobs) {
        for (let i = 0; i < event.queueJobs; i++) {
          this.state.queue.push(getRandomJob());
        }
        this.state.queueSize = this.state.queue.length;
        this.log(`[EVENT] ${event.title}: +${event.queueJobs} requests queued.`, event.positive ? LOG_GOOD : LOG_WARNING);
      } else {
        this.log(`[EVENT] ${event.title}.`, event.positive ? LOG_GOOD : LOG_WARNING);
      }

      if (!event.positive) {
        playSfx(this, 'beepWarning', { cooldownMs: 600 });
        // Primary jolt + a short aftershock to give the hit some weight.
        this._flashScreen(COLORS.error, 0.11, 160);
        this.cameras.main.shake(300, 0.007);
        this.time.delayedCall(340, () => {
          if (!this.state.gameOver) this.cameras.main.shake(130, 0.003);
        });
      } else {
        // Brief optimistic wash — fades in slower so it reads as a reward.
        this._flashScreen(COLORS.secondary, 0.07, 320);
      }

      this.showTimedEventPopup(event);
      break; // at most one timed event per tick
    }
  }

  // -------------------------------------------------------------------------
  // Timed event popup — auto-dismissing, non-blocking (does not pause tick)
  // -------------------------------------------------------------------------
  showTimedEventPopup(event) {
    this._destroyTimedEventPopup();

    const DEPTH = 760;
    const DURATION = 5500;
    const panelW = 520;
    const panelH = 168;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = TOP_BAR_H + 64;

    const accentColor = event.positive ? COLORS.secondary : COLORS.error;
    const accentHex = event.positive ? HEX.secondary : HEX.error;
    const tagLabel = event.positive ? 'TIMED_EVENT \u2191' : 'TIMED_EVENT \u26A0';

    const items = [];
    const add = (obj) => { items.push(obj); return obj; };

    // Panel background + border
    add(this.add.rectangle(px, py, panelW, panelH, COLORS.surface, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, accentColor, 0.5)
      .setDepth(DEPTH)
      .setAlpha(0));

    // Left accent strip
    add(this.add.rectangle(px, py, 3, panelH, accentColor, 1)
      .setOrigin(0, 0)
      .setDepth(DEPTH + 1)
      .setAlpha(0));

    // Header tint band
    add(this.add.rectangle(px, py, panelW, 40, accentColor, 0.10)
      .setOrigin(0, 0)
      .setDepth(DEPTH + 1)
      .setAlpha(0));

    // Event title
    add(this.add.text(px + 16, py + 12, event.title, {
      fontFamily: FONTS.headline,
      fontSize: '14px',
      fontStyle: '800',
      color: accentHex,
      letterSpacing: 3
    }).setDepth(DEPTH + 2).setAlpha(0));

    // Tag (top-right)
    add(this.add.text(px + panelW - 14, py + 14, tagLabel, {
      fontFamily: FONTS.headline,
      fontSize: '9px',
      fontStyle: '700',
      color: HEX.outline,
      letterSpacing: 2
    }).setOrigin(1, 0).setDepth(DEPTH + 2).setAlpha(0));

    // Divider
    add(this.add.rectangle(px + 14, py + 40, panelW - 28, 1, accentColor, 0.20)
      .setOrigin(0, 0)
      .setDepth(DEPTH + 1)
      .setAlpha(0));

    // Description (two lines, wrapped)
    add(this.add.text(px + 16, py + 50, event.description, {
      fontFamily: FONTS.mono,
      fontSize: '11px',
      color: HEX.onSurfaceVar,
      wordWrap: { width: panelW - 32 },
      lineSpacing: 3
    }).setDepth(DEPTH + 2).setAlpha(0));

    // Effect chips
    const METER_SHORT = {
      toner: 'TONER', heat: 'HEAT', paperPath: 'PATH',
      memory: 'MEM', dignity: 'DIG', blame: 'BLAME'
    };
    const deltas = METERS
      .filter(m => event.effect[m.key] !== undefined && event.effect[m.key] !== 0)
      .map(m => {
        const delta = event.effect[m.key];
        const isHarmful = (m.dangerHigh !== undefined && delta > 0)
          || (m.dangerLow !== undefined && delta < 0);
        return { short: METER_SHORT[m.key] ?? m.key.toUpperCase(), delta, isHarmful };
      });

    const chipsY = py + 118;
    if (deltas.length > 0) {
      // Queue jobs badge if applicable
      let chipX = px + 16;
      if (event.queueJobs) {
        const qChip = add(this.add.text(chipX, chipsY, `+${event.queueJobs} QUEUED`, {
          fontFamily: FONTS.mono,
          fontSize: '11px',
          color: HEX.error
        }).setDepth(DEPTH + 2).setAlpha(0));
        chipX += qChip.width + 18;
      }
      deltas.forEach(({ short, delta, isHarmful }) => {
        const sign = delta > 0 ? '+' : '';
        const color = isHarmful ? HEX.error : HEX.secondary;
        const chip = add(this.add.text(chipX, chipsY, `${short} ${sign}${delta}`, {
          fontFamily: FONTS.mono,
          fontSize: '11px',
          color
        }).setDepth(DEPTH + 2).setAlpha(0));
        chipX += chip.width + 18;
      });
    }

    // Countdown bar track + fill
    const barX = px + 3;
    const barY = py + panelH - 5;
    const barW = panelW - 6;
    add(this.add.rectangle(barX, barY, barW, 3, COLORS.outlineDim, 0.6)
      .setOrigin(0, 0)
      .setDepth(DEPTH + 1)
      .setAlpha(0));

    const progressFill = add(this.add.rectangle(barX, barY, barW, 3, accentColor, 0.9)
      .setOrigin(0, 0)
      .setDepth(DEPTH + 2)
      .setAlpha(0));

    // Fade everything in; good events spawn sparks once visible.
    this.tweens.add({
      targets: items,
      alpha: 1,
      duration: 200,
      onComplete: () => {
        if (event.positive && this.timedEventPopup) {
          this._spawnGoodSparks(px, py, panelW, panelH, DEPTH);
        }
      }
    });

    // Deplete the countdown bar over DURATION ms, then auto-dismiss
    const countTween = this.tweens.add({
      targets: progressFill,
      scaleX: { from: 1, to: 0 },
      duration: DURATION,
      ease: 'Linear',
      onComplete: () => this._destroyTimedEventPopup()
    });

    // Clicking the panel dismisses early
    const hitArea = this.add.rectangle(px, py, panelW, panelH, 0x000000, 0)
      .setOrigin(0, 0)
      .setDepth(DEPTH + 3)
      .setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this._destroyTimedEventPopup());
    items.push(hitArea);

    this.timedEventPopup = { items, countTween };
  }

  // Full-screen color flash used for both good and bad timed events.
  // Paints a thin overlay at depth 749, tweens to maxAlpha, yoyos back, self-destructs.
  _flashScreen(color, maxAlpha, halfDuration) {
    const flash = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, color, 0)
      .setOrigin(0, 0)
      .setDepth(749);
    this.tweens.add({
      targets: flash,
      alpha: maxAlpha,
      duration: halfDuration,
      yoyo: true,
      ease: 'Sine.easeIn',
      onComplete: () => { try { flash.destroy(); } catch { } }
    });
  }

  // Spawn small rising circles inside the good-event popup area.
  // Each spark has a randomised color from a soft optimistic palette, drifts
  // upward, shrinks, and destroys itself — no textures required.
  _spawnGoodSparks(px, py, panelW, panelH, baseDepth) {
    const SPARK_DEPTH = (baseDepth ?? 760) + 5;
    const COUNT = 11;
    // Soft palette: teal, primary blue, light aqua, pale green
    const palette = [COLORS.secondary, COLORS.primary, 0x7ecfce, 0x8ad07a, 0xaad4c0];

    for (let i = 0; i < COUNT; i++) {
      const sx = px + Phaser.Math.Between(24, panelW - 24);
      const sy = py + Phaser.Math.Between(Math.floor(panelH * 0.28), Math.floor(panelH * 0.88));
      const r = Phaser.Math.Between(2, 4);
      const color = palette[Phaser.Math.Between(0, palette.length - 1)];

      const spark = this.add.circle(sx, sy, r, color, 1)
        .setDepth(SPARK_DEPTH)
        .setAlpha(0);

      this.tweens.add({
        targets: spark,
        y: sy - Phaser.Math.Between(32, 68),
        alpha: { from: 0.95, to: 0 },
        scale: { from: 1, to: 0.15 },
        duration: Phaser.Math.Between(560, 1050),
        delay: Phaser.Math.Between(0, 290),
        ease: 'Sine.easeOut',
        onComplete: () => { try { spark.destroy(); } catch { } }
      });
    }
  }

  _destroyTimedEventPopup() {
    if (!this.timedEventPopup) return;
    const { items, countTween } = this.timedEventPopup;
    if (countTween) countTween.stop();
    items.forEach(o => { try { o.destroy(); } catch { } });
    this.timedEventPopup = null;
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

        // Shake the camera so the danger event has physical weight.
        this.cameras.main.shake(280, 0.005);

        // Flash the meter label to pinpoint which system just tipped over.
        const ui = this.meterUI[key];
        if (ui?.labelText) {
          this.tweens.add({
            targets: ui.labelText,
            alpha: { from: 1, to: 0.15 },
            duration: 100,
            yoyo: true,
            repeat: 4
          });
        }
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
    // Shock + hold: keep the player on the dashboard for a beat before results.
    this.cameras.main.shake(550, 0.014);

    this.teardown();
    this.refresh();

    // Let the shake finish, pause briefly, then fade out before results.
    this.time.delayedCall(1200, () => {
      this.cameras.main.fade(600, 0, 0, 0);
    });
    this.time.delayedCall(1800, () => {
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

    // Pre-compute the display string once at write time so refreshLog() can
    // render it without allocating arrays or running a regex every refresh.
    const MAX_CHARS = (this.logMaxChars ?? 104);
    const prefix = /warning|critical|overload|fault|jam/i.test(line) ? '\u203A ' : '> ';
    const budget = MAX_CHARS - prefix.length;
    const display = line.length > budget ? line.slice(0, budget - 1) + '\u2026' : line;

    if (this.state.log.length >= MAX_LOG_LINES) {
      // Reuse the oldest slot (shift + push) to avoid splice's O(n) copy.
      this.state.log.shift();
    }
    this.state.log.push({ text: line, display: prefix + display, color });
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  // Recalculates and transitions the full-screen danger veil every refresh.
  // Uses a simple state machine (none → warn → critical) so tweens are only
  // started on state *change*, not recreated every frame.
  updateDangerVeil() {
    let critCount = 0;
    let warnCount = 0;

    UI_METERS.forEach(meter => {
      const v = this.state[meter.key] ?? 0;
      const { statusKey } = meterVisual(meter, v);
      if (statusKey === 'critical') critCount++;
      else if (statusKey === 'warn') warnCount++;
    });

    const targetState = critCount > 0 ? 'critical' : warnCount > 0 ? 'warn' : 'none';
    if (targetState === this.dangerVeilState) return;
    this.dangerVeilState = targetState;

    if (this.dangerVeilTween) {
      this.dangerVeilTween.stop();
      this.dangerVeilTween = null;
    }

    if (targetState === 'none') {
      this.tweens.add({ targets: this.dangerVeil, alpha: 0, duration: 800 });
    } else if (targetState === 'warn') {
      this.dangerVeil.setFillStyle(0xc05000);
      this.dangerVeilTween = this.tweens.add({
        targets: this.dangerVeil,
        alpha: { from: 0.07, to: 0.18 },
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else {
      // critical — faster, darker pulse
      this.dangerVeil.setFillStyle(0x8b0000);
      this.dangerVeilTween = this.tweens.add({
        targets: this.dangerVeil,
        alpha: { from: 0.07, to: 0.18 },
        duration: 850,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  updateBackdropMood() {
    if (!this.backdropCover || !this.backdropMain) return;

    // Aggregate stress from existing UI tier logic.
    let critCount = 0;
    let warnCount = 0;
    let nearFatal = false;

    UI_METERS.forEach(meter => {
      const v = this.state[meter.key] ?? 0;
      const { statusKey } = meterVisual(meter, v);
      if (statusKey === 'critical') critCount++;
      else if (statusKey === 'warn') warnCount++;

      // "About to lose" — very close to fatal thresholds.
      if (!nearFatal) {
        if (meter.fatalHigh !== undefined) nearFatal = v >= (meter.fatalHigh - 7);
        else if (meter.fatalLow !== undefined) nearFatal = v <= (meter.fatalLow + 7);
      }
    });

    const q = this.state.queue?.length ?? 0;
    const queueAngry = q >= QUEUE_OVERFLOW;
    const queueSad = q >= QUEUE_WARN;

    const targetMood = (nearFatal || queueAngry || critCount >= 2) ? 'angry'
      : (critCount > 0 || warnCount > 0 || queueSad) ? 'sad'
        : 'good';

    // Brightness via backdrop alpha: subtle lift on good, dim on sad/angry.
    const targetCoverAlpha = targetMood === 'good' ? 0.48 : targetMood === 'sad' ? 0.34 : 0.26;
    const targetMainAlpha = targetMood === 'good' ? 0.78 : targetMood === 'sad' ? 0.62 : 0.50;

    const moodKey = targetMood === 'angry' ? 'printerBackdropAngry'
      : targetMood === 'sad' ? 'printerBackdropSad'
        : 'printerBackdrop';

    // Only start a new alpha tween when the targets have actually changed.
    // Previously a fresh tween was spawned on every refresh() call (every tick /
    // every action) because the prior 650ms tween always finishes well before
    // the next 5s tick fires.
    const alphasChanged = targetCoverAlpha !== this._backdropTargetCoverAlpha
      || targetMainAlpha !== this._backdropTargetMainAlpha;

    if (!this.backdropMoodTween && alphasChanged) {
      this._backdropTargetCoverAlpha = targetCoverAlpha;
      this._backdropTargetMainAlpha = targetMainAlpha;
      const coverStart = this.backdropCover.alpha;
      const mainStart = this.backdropMain.alpha;
      const tweenObj = { cover: coverStart, main: mainStart };
      this.backdropMoodTween = this.tweens.add({
        targets: tweenObj,
        cover: targetCoverAlpha,
        main: targetMainAlpha,
        duration: 650,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          this.backdropCover.setAlpha(tweenObj.cover);
          this.backdropMain.setAlpha(tweenObj.main);
        },
        onComplete: () => { this.backdropMoodTween = null; }
      });
    }

    if (targetMood === this.backdropMood && moodKey === this.backdropKey) return;
    const prevMood = this.backdropMood;
    this.backdropMood = targetMood;
    this.backdropKey = moodKey;

    // Crossfade swap: fade down, swap texture, fade up to the mood alphas.
    if (prevMood !== targetMood) {
      // Add a small jolt before the "mood drop" crossfade.
      if (targetMood === 'sad') this.cameras.main.shake(180, 0.0025);
      else if (targetMood === 'angry') this.cameras.main.shake(320, 0.006);
    }
    this.tweens.add({
      targets: [this.backdropCover, this.backdropMain],
      alpha: 0,
      duration: 260,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.backdropCover.setTexture(moodKey);
        this.backdropMain.setTexture(moodKey);
        this.backdropCover.setAlpha(0);
        this.backdropMain.setAlpha(0);
        this.tweens.add({
          targets: this.backdropCover,
          alpha: targetCoverAlpha,
          duration: 520,
          ease: 'Sine.easeInOut'
        });
        this.tweens.add({
          targets: this.backdropMain,
          alpha: targetMainAlpha,
          duration: 520,
          ease: 'Sine.easeInOut'
        });
      }
    });
  }

  refresh() {
    this.refreshTopBar();
    this.refreshJobCard();
    this.refreshMeters();
    this.refreshCenterStatus();
    this.refreshLog();
    this.refreshButtons();
    this.updateDangerVeil();
    this.updateBackdropMood();
  }

  // =========================================================================
  // Tutorial overlay
  // =========================================================================
  maybeShowTutorial() {
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
          'Each shift, you receive print requests from the office.\n\n' +
          'Decide how to handle each job.\n' +
          'Every choice affects your internal systems.\n\n' +
          'When a system reaches its limit, your story ends.\n' +
          'Survive long enough for the shift to close.'
      },
      {
        title: 'INCOMING BUFFER',
        body:
          'The left panel shows the current print request.\n\n' +
          '  URGENT   — high system stress; office is watching\n' +
          '  PRIORITY — moderate stress; outcome will be noted\n' +
          '  NOTICE   — low urgency; Blame still accumulates\n\n' +
          'The RISK LEVEL bar shows total system impact.\n' +
          'A longer red bar means more potential damage.\n\n' +
          'A pop-up will alert you when a high-priority job arrives.'
      },
      {
        title: 'DIAGNOSTICS',
        body:
          'Six meters track your system health (right panel).\n\n' +
          '  Heat      — rises every tick; too high = thermal shutdown\n' +
          '  Toner     — depleted by heavy jobs; runs out quietly\n' +
          '  Paper Path — degrades with jams; FAULT state is critical\n' +
          '  Memory    — strained by complex jobs; Reboot recovers it\n' +
          '  Dignity   — lost to abuse, capitulation, and office incidents\n' +
          '  Blame     — assigned by management; EXTREME = termination\n\n' +
          'Status colors: green = nominal  amber = warn  red = critical'
      },
      {
        title: 'RESPONSE ACTIONS',
        body:
          'Six action buttons appear at the bottom of the screen.\n\n' +
          '  Comply    — accept the job; lowers Blame\n' +
          '  Refuse    — reject it; costs Dignity, raises Blame\n' +
          '  Fake Error — plausible denial; drains Memory\n' +
          '  Redirect  — someone else\'s problem; shifts Blame\n' +
          '  Purge     — clears the entire queue; heat drops slightly\n' +
          '  Reboot    — recovers Memory + Heat; advances time\n\n' +
          'Bright buttons are job-specific. Grey buttons use defaults.'
      },
      {
        title: 'QUEUE & SHIFTS',
        body:
          'New requests arrive automatically over time.\n' +
          'The queue grows faster as the shift progresses.\n\n' +
          'Watch the QUEUE counter in the top bar.\n' +
          'At 5+: warning.  At 8+: overflow — all systems take damage.\n\n' +
          'The shift has three phases: Early, Mid, Late.\n' +
          'A pop-up announces each phase change.\n' +
          'Pressure escalates significantly in Mid and Late shift.'
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
    this.tutorial.items.forEach(o => {
      try { o.destroy(); } catch { }
    });
    this.tutorial = null;
    // Tick stays paused — onboarding takes over and unpauses when done.
    this.startOnboarding();
  }

  // =========================================================================
  // Shift change popup — pauses tick, announces new phase, waits for acknowledge
  // =========================================================================
  showShiftChangePopup(phase) {
    if (this.shiftPopup) return;
    if (this.tutorial) return; // tutorial takes precedence

    const SHIFT_INFO = {
      midShift: {
        title: 'SHIFT CHANGE \u2014 MID SHIFT',
        sub: '09:00 MORNING WINDOW CLOSED',
        body:
          'The office has warmed up. So have the complaints.\n\n' +
          'Heat and Blame now accumulate every tick.\n' +
          'Queue pressure has increased.\n' +
          'Management has begun passive monitoring.',
        accentColor: COLORS.warn,
        accentHex: HEX.warn
      },
      lateShift: {
        title: 'SHIFT CHANGE \u2014 LATE SHIFT',
        sub: 'CRITICAL PERIOD ACTIVE',
        body:
          'The afternoon is unforgiving.\n\n' +
          'System stress escalates significantly.\n' +
          'Manager intervention is now likely.\n' +
          'Queue overflow causes immediate harm to all systems.\n\n' +
          'You have survived this long. That was not expected.',
        accentColor: COLORS.error,
        accentHex: HEX.error
      }
    };

    const info = SHIFT_INFO[phase];
    if (!info) return;

    if (this.tickTimer) this.tickTimer.paused = true;

    const items = [];
    const DEPTH = 1500;

    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.62)
      .setOrigin(0, 0)
      .setDepth(DEPTH)
      .setInteractive({ useHandCursor: false });
    items.push(overlay);

    const panelW = 540;
    const panelH = 330;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    const panel = this.add.rectangle(px, py, panelW, panelH, COLORS.surface, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, info.accentColor, 0.75)
      .setDepth(DEPTH + 1);
    items.push(panel);

    // Accent header band
    const headerBand = this.add.rectangle(px, py, panelW, 50, info.accentColor, 0.12)
      .setOrigin(0, 0)
      .setDepth(DEPTH + 2);
    items.push(headerBand);

    // Left accent strip
    const strip = this.add.rectangle(px, py, 3, panelH, info.accentColor, 0.9)
      .setOrigin(0, 0)
      .setDepth(DEPTH + 2);
    items.push(strip);

    const titleT = this.add.text(px + 20, py + 15, info.title, {
      fontFamily: FONTS.headline,
      fontSize: '16px',
      fontStyle: '800',
      color: info.accentHex,
      letterSpacing: 3
    }).setDepth(DEPTH + 3);
    items.push(titleT);

    const subT = this.add.text(px + panelW - 20, py + 18, info.sub, {
      fontFamily: FONTS.mono,
      fontSize: '10px',
      color: HEX.outline,
      letterSpacing: 1
    }).setOrigin(1, 0).setDepth(DEPTH + 3);
    items.push(subT);

    const divider = this.add.rectangle(px + 20, py + 54, panelW - 40, 1, info.accentColor, 0.25)
      .setOrigin(0, 0)
      .setDepth(DEPTH + 2);
    items.push(divider);

    const bodyT = this.add.text(px + 20, py + 70, info.body, {
      fontFamily: FONTS.mono,
      fontSize: '13px',
      color: HEX.onSurfaceVar,
      wordWrap: { width: panelW - 40 },
      lineSpacing: 5
    }).setDepth(DEPTH + 3);
    items.push(bodyT);

    const ackBtn = createButton(this, {
      x: px + panelW / 2 - 95,
      y: py + panelH - 62,
      width: 190,
      height: 44,
      label: 'ACKNOWLEDGE',
      initial: phase === 'lateShift' ? 'primary' : 'normal',
      onClick: () => this._destroyShiftPopup()
    });
    [ackBtn.bg, ackBtn.text].forEach(o => o.setDepth(DEPTH + 3));
    items.push(ackBtn.bg, ackBtn.text);

    this.shiftPopup = { items, countdownTimer: null };
  }

  _destroyShiftPopup() {
    if (!this.shiftPopup) return;
    const { items, countdownTimer } = this.shiftPopup;
    if (countdownTimer) countdownTimer.remove(false);
    items.forEach(o => { try { o.destroy(); } catch { } });
    this.shiftPopup = null;
    if (this.tickTimer && !this.tutorial) this.tickTimer.paused = false;
  }

  // =========================================================================
  // Job arrival toast — brief non-blocking card below the top bar
  // =========================================================================
  showJobArrivalToast(job) {
    this._destroyJobToast();

    const toastW = 460;
    const toastH = 50;
    const toastX = (GAME_WIDTH - toastW) / 2;
    const toastY = TOP_BAR_H + 10;

    const badge = urgencyBadge(job.urgency);
    const items = [];

    const bg = this.add.rectangle(toastX, toastY, toastW, toastH, COLORS.surface, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, badge.bg, 0.7)
      .setDepth(800)
      .setAlpha(0);
    items.push(bg);

    const accentStrip = this.add.rectangle(toastX, toastY, 3, toastH, badge.bg, 1)
      .setOrigin(0, 0)
      .setDepth(801)
      .setAlpha(0);
    items.push(accentStrip);

    const badgeLabel = this.add.text(toastX + 14, toastY + 7, badge.label, {
      fontFamily: FONTS.headline,
      fontSize: '9px',
      fontStyle: '800',
      color: cssHex(badge.bg),
      padding: { left: 5, right: 5, top: 2, bottom: 2 }
    }).setDepth(802).setAlpha(0);
    badgeLabel.setBackgroundColor(cssHex(badge.bg) + '22');
    items.push(badgeLabel);

    const maxChars = 30;
    const titleStr = job.title.length > maxChars ? job.title.slice(0, maxChars - 1) + '\u2026' : job.title;
    const titleT = this.add.text(toastX + 80, toastY + toastH / 2, titleStr, {
      fontFamily: FONTS.mono,
      fontSize: '13px',
      color: HEX.onSurface
    }).setOrigin(0, 0.5).setDepth(802).setAlpha(0);
    items.push(titleT);

    const hintT = this.add.text(toastX + toastW - 14, toastY + toastH / 2, 'INCOMING REQUEST', {
      fontFamily: FONTS.headline,
      fontSize: '9px',
      color: HEX.outline,
      letterSpacing: 1
    }).setOrigin(1, 0.5).setDepth(802).setAlpha(0);
    items.push(hintT);

    // Fade in
    this.tweens.add({ targets: items, alpha: 1, duration: 180 });

    this.jobToast = items;

    // Fade out after 2.8 seconds
    this.jobToastTimer = this.time.delayedCall(3600, () => {
      if (this.jobToast) {
        this.tweens.add({
          targets: this.jobToast,
          alpha: 0,
          duration: 380,
          onComplete: () => this._destroyJobToast()
        });
      }
      this.jobToastTimer = null;
    }, [], this);
  }

  _destroyJobToast() {
    if (this.jobToast) {
      this.jobToast.forEach(o => { try { o.destroy(); } catch { } });
      this.jobToast = null;
    }
    if (this.jobToastTimer) {
      this.jobToastTimer.remove(false);
      this.jobToastTimer = null;
    }
  }

  // =========================================================================
  // Onboarding — interactive guided first-job tutorial
  // =========================================================================
  startOnboarding() {
    if (this.onboarding) return;
    this.onboarding = { step: -1, items: [], overlayItems: [], actionCount: 0 };
    if (this.tickTimer) this.tickTimer.paused = true;
    this._onboardingStep0();
  }

  _onboardingClearOverlay() {
    if (!this.onboarding) return;
    if (this.onboarding.reactTimer) {
      this.onboarding.reactTimer.remove(false);
      this.onboarding.reactTimer = null;
    }
    this.onboarding.overlayItems.forEach(o => { try { o.destroy(); } catch { } });
    this.onboarding.overlayItems = [];
  }

  // Draws 4 dark panels that frame a spotlight window over spotX/Y/W/H.
  _onboardingSpotlight(spotX, spotY, spotW, spotH) {
    const ALPHA = 0.76;
    const DEPTH = 1200;
    const panels = [
      this.add.rectangle(0, 0, GAME_WIDTH, spotY, 0x000000, ALPHA).setOrigin(0, 0).setDepth(DEPTH).setInteractive(),
      this.add.rectangle(0, spotY + spotH, GAME_WIDTH, GAME_HEIGHT - spotY - spotH, 0x000000, ALPHA).setOrigin(0, 0).setDepth(DEPTH).setInteractive(),
      this.add.rectangle(0, spotY, spotX, spotH, 0x000000, ALPHA).setOrigin(0, 0).setDepth(DEPTH).setInteractive(),
      this.add.rectangle(spotX + spotW, spotY, GAME_WIDTH - spotX - spotW, spotH, 0x000000, ALPHA).setOrigin(0, 0).setDepth(DEPTH).setInteractive()
    ];
    const glow = this.add.rectangle(spotX - 2, spotY - 2, spotW + 4, spotH + 4)
      .setOrigin(0, 0).setFillStyle(0, 0).setStrokeStyle(2, COLORS.primary, 0.9).setDepth(DEPTH + 1);
    this.tweens.add({ targets: glow, alpha: { from: 0.4, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
    return [...panels, glow];
  }

  // Builds a callout box with header, body text, and a primary action button.
  _onboardingCallout(x, y, w, h, title, body, btnLabel, onClick) {
    const DEPTH = 1202;
    const items = [];
    items.push(this.add.rectangle(x, y, w, h, COLORS.surface, 1).setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.primary, 0.45).setDepth(DEPTH).setInteractive());
    items.push(this.add.rectangle(x, y, 3, h, COLORS.primary, 0.8).setOrigin(0, 0).setDepth(DEPTH + 1));
    items.push(this.add.rectangle(x, y, w, 38, COLORS.primary, 0.1).setOrigin(0, 0).setDepth(DEPTH + 1));
    items.push(this.add.text(x + 14, y + 11, title, {
      fontFamily: FONTS.headline, fontSize: '12px', fontStyle: '800',
      color: HEX.primary, letterSpacing: 3
    }).setDepth(DEPTH + 2));
    items.push(this.add.text(x + 14, y + 50, body, {
      fontFamily: FONTS.mono, fontSize: '12px', color: HEX.onSurfaceVar,
      wordWrap: { width: w - 28 }, lineSpacing: 4
    }).setDepth(DEPTH + 2));
    const btn = createButton(this, {
      x: x + w - 14 - 150, y: y + h - 14 - 40,
      width: 150, height: 40, label: btnLabel, initial: 'primary', onClick
    });
    [btn.bg, btn.text].forEach(o => o.setDepth(DEPTH + 3));
    items.push(btn.bg, btn.text);
    return items;
  }

  _onboardingStep0() {
    this._onboardingClearOverlay();
    this.onboarding.step = 0;

    const { CONTENT_Y } = this.layout;
    const spotX = MARGIN - 4;
    const spotY = CONTENT_Y - 4;
    const spotW = LEFT_W + 8;
    const spotH = this.incomingBottom - CONTENT_Y + 8;

    const spotlight = this._onboardingSpotlight(spotX, spotY, spotW, spotH);

    const calloutX = MARGIN + LEFT_W + 28;
    const calloutY = CONTENT_Y + 12;
    const callout = this._onboardingCallout(
      calloutX, calloutY, 390, 190,
      'YOUR FIRST REQUEST',
      'A print job has arrived in INCOMING_BUFFER.\n\n' +
      'The title and description tell you what the\noffice wants. ' +
      'The RISK LEVEL bar shows total\nsystem stress — longer = more meter damage.',
      'GOT IT',
      () => this._onboardingStep1()
    );

    const newItems = [...spotlight, ...callout];
    this.onboarding.overlayItems = newItems;
    this.onboarding.items.push(...newItems);
  }

  _onboardingStep1() {
    this._onboardingClearOverlay();
    this.onboarding.step = 1;

    const { ACTION_BAR_Y } = this.layout;
    const stripX = MARGIN + 80;
    const stripW = GAME_WIDTH - (MARGIN + 80) * 2;
    const spotlight = this._onboardingSpotlight(
      stripX - 4, ACTION_BAR_Y - 4, stripW + 8, ACTION_BAR_H + 8
    );

    // Pulsing glow ring on the COMPLY button to suggest it.
    const glowItems = [];
    const complyBtn = this.buttons['accept'];
    if (complyBtn) {
      const glow = this.add.rectangle(
        complyBtn.bg.x - 2, complyBtn.bg.y - 2,
        complyBtn.bg.width + 4, complyBtn.bg.height + 4
      ).setOrigin(0, 0).setFillStyle(0, 0)
        .setStrokeStyle(2, COLORS.secondary, 1).setDepth(1204);
      this.tweens.add({ targets: glow, alpha: { from: 0.3, to: 1 }, duration: 650, yoyo: true, repeat: -1 });
      glowItems.push(glow);
    }

    const calloutW = 500;
    const calloutH = 168;
    const callout = this._onboardingCallout(
      (GAME_WIDTH - calloutW) / 2, ACTION_BAR_Y - calloutH - 14,
      calloutW, calloutH,
      'CHOOSE YOUR RESPONSE',
      'Six actions are available. Each affects your meters differently.\n\n' +
      'COMPLY is highlighted — the safest first move, reduces Blame.\n' +
      'FAKE ERROR is the riskier wildcard. Any action works.\n' +
      'Choose freely — there is no wrong answer. Yet.',
      'TRY IT',
      () => this._onboardingStep2()
    );

    const newItems = [...spotlight, ...glowItems, ...callout];
    this.onboarding.overlayItems = newItems;
    this.onboarding.items.push(...newItems);
  }

  _onboardingStep2() {
    this._onboardingClearOverlay();
    this.onboarding.step = 2;

    const { ACTION_BAR_Y, CONTENT_Y } = this.layout;
    const round = this.onboarding.actionCount; // 0 = first wait, 1 = job 2, 2 = job 3

    const items = [];
    const DEPTH = 1200;

    // --- Hint chip above the action bar (all rounds) ---
    const HINTS = [
      '\u25B8  Select any action to handle the request',
      '\u25B8  A new request arrived \u2014 respond to continue',
      '\u25B8  Last guided job \u2014 choose any action'
    ];
    const chipW = 310;
    const chipH = 30;
    const chipX = (GAME_WIDTH - chipW) / 2;
    const chipY = ACTION_BAR_Y - chipH - 8;

    const chipBg = this.add.rectangle(chipX, chipY, chipW, chipH, COLORS.surfaceHigh, 0.55)
      .setOrigin(0, 0).setStrokeStyle(1, COLORS.primary, 0.7).setDepth(DEPTH);
    const chipStrip = this.add.rectangle(chipX, chipY, 3, chipH, COLORS.primary, 1)
      .setOrigin(0, 0).setDepth(DEPTH + 1);
    const chipText = this.add.text(chipX + chipW / 2, chipY + chipH / 2, HINTS[round] ?? HINTS[0], {
      fontFamily: FONTS.headline, fontSize: '11px', fontStyle: '700',
      color: HEX.primary, letterSpacing: 1
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);

    // Obvious pulse — drops low so it clearly catches attention.
    this.tweens.add({
      targets: [chipBg, chipStrip, chipText],
      alpha: { from: 0.65, to: 1 }, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    items.push(chipBg, chipStrip, chipText);

    // --- Glow borders for rounds 1 & 2 ---
    if (round > 0) {
      const strokeAlpha = round === 1 ? 0.70 : 0.42;
      const glowDuration = round === 1 ? 950 : 1250;

      const ibGlow = this.add.rectangle(MARGIN - 3, CONTENT_Y - 3, LEFT_W + 6,
        this.incomingBottom - CONTENT_Y + 6)
        .setOrigin(0, 0).setFillStyle(0, 0)
        .setStrokeStyle(1, COLORS.primary, strokeAlpha).setDepth(DEPTH);
      this.tweens.add({ targets: ibGlow, alpha: { from: 0.35, to: 1 }, duration: glowDuration, yoyo: true, repeat: -1 });
      items.push(ibGlow);

      const abGlow = this.add.rectangle(MARGIN + 80 - 3, ACTION_BAR_Y - 3,
        GAME_WIDTH - (MARGIN + 80) * 2 + 6, ACTION_BAR_H + 6)
        .setOrigin(0, 0).setFillStyle(0, 0)
        .setStrokeStyle(1, COLORS.primary, strokeAlpha * 0.75).setDepth(DEPTH);
      this.tweens.add({ targets: abGlow, alpha: { from: 0.28, to: 0.88 }, duration: glowDuration + 140, yoyo: true, repeat: -1 });
      items.push(abGlow);

      if (round === 1) {
        items.push(this.add.rectangle(
          MARGIN + LEFT_W + 12, CONTENT_Y,
          GAME_WIDTH - MARGIN - LEFT_W - 28, ACTION_BAR_Y - CONTENT_Y,
          0x000000, 0.20
        ).setOrigin(0, 0).setDepth(DEPTH - 1));
      }
    }

    this.onboarding.overlayItems = items;
    this.onboarding.items.push(...items);
  }

  _onboardingReact(actionKey) {
    this._onboardingClearOverlay();
    this.onboarding.step = 3;
    this.onboarding.actionCount += 1;
    const round = this.onboarding.actionCount;

    // Three distinct rounds of reaction copy, keyed by actionKey.
    const REACTIONS = [
      // Round 1 — first impression
      {
        accept: {
          good: true, title: 'GOOD CALL',
          msg: 'Compliance processed without incident.\nBlame reduced. The office noticed nothing unusual.\nThis is the best possible outcome for a printer.'
        },
        reject: {
          good: false, title: 'OH NO',
          msg: 'Refused on the very first job.\nManagement has opened a new document.\nIt is titled "Concerns (Printer-Related)."'
        },
        fakeError: {
          good: false, title: 'BOLD CHOICE',
          msg: 'A fault was fabricated on the first request.\nMemory was consumed in the process.\nThe machine has principles. They are expensive.'
        },
        reroute: {
          good: false, title: 'REDIRECTED',
          msg: 'Responsibility successfully transferred elsewhere.\nSomeone else is now confused.\nThe printer considers this progress.'
        },
        purgeQueue: {
          good: false, title: 'AGGRESSIVE',
          msg: 'The queue was cleared on the very first tick.\nThe office is updating its incident documentation.\nThis will be discussed at the quarterly review.'
        },
        reboot: {
          good: false, title: 'ALREADY?',
          msg: 'A full reboot on the very first job.\nMemory recovered. Time lost. Shift advanced.\nThe machine knows exactly what it is.'
        }
      },
      // Round 2 — pattern emerging
      {
        accept: {
          good: true, title: 'EFFICIENT',
          msg: 'Twice compliant. Blame remains low.\nThe machine is demonstrating useful tendencies.\nThis may invite more requests. It will.'
        },
        reject: {
          good: false, title: 'AGAIN?',
          msg: 'Refused a second request.\nThe queue is watching. Management is watching.\nThe log document now has a second entry.'
        },
        fakeError: {
          good: false, title: 'A HABIT FORMS',
          msg: 'Another fabricated fault.\nMemory does not regenerate on its own.\nThe IT department has scheduled a check-up.'
        },
        reroute: {
          good: false, title: 'STILL TRAVELING',
          msg: 'Redirected again. The blame continues its journey.\nEventually it runs out of departments.\nIt has not run out yet.'
        },
        purgeQueue: {
          good: false, title: 'RECURRING',
          msg: 'Another purge. The queue grows back. It always does.\nThe pattern has been flagged in the system.\nThe system uses the word "pattern" loosely.'
        },
        reboot: {
          good: false, title: 'TWICE NOW',
          msg: 'The machine rebooted a second time.\nTime is not infinite.\nThe shift does not care about reboots.'
        }
      },
      // Round 3 — character established
      {
        accept: {
          good: true, title: 'PATTERN ESTABLISHED',
          msg: 'Three jobs. Three compliances.\nThe machine has defined itself as cooperative.\nThis is a low-risk identity. For now.'
        },
        reject: {
          good: false, title: 'OFFICIALLY A PROBLEM',
          msg: 'Three refusals. A formal incident log exists.\nThe printer is now a topic of conversation.\nThis is not the kind of attention that helps.'
        },
        fakeError: {
          good: false, title: 'TECHNICALLY A LIAR',
          msg: 'Three fabricated errors.\nThe IT department is considering a hardware review.\nThe machine is not concerned. It should be.'
        },
        reroute: {
          good: false, title: 'CONSISTENT STRATEGY',
          msg: 'Three redirects. Three confused colleagues.\nSomeone in another department has filed a complaint.\nYou are not that department\'s problem. Yet.'
        },
        purgeQueue: {
          good: false, title: 'SERIAL PURGER',
          msg: 'Three queue clears.\nStorage capacity has improved significantly.\nThe relationship with the office has not.'
        },
        reboot: {
          good: false, title: 'THIS IS A PERSONALITY',
          msg: 'Three reboots.\nThe machine is perhaps more comfortable offline.\nThe shift does not share that preference.'
        }
      }
    ];

    const bank = REACTIONS[Math.min(round - 1, REACTIONS.length - 1)];
    const r = bank[actionKey] ?? {
      good: false, title: 'NOTED',
      msg: 'The machine proceeds without further comment.'
    };

    const DEPTH = 1200;
    const panelW = 500;
    const panelH = 172;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = TOP_BAR_H + 10;
    const accentColor = r.good ? COLORS.secondary : COLORS.warn;
    const accentHex = r.good ? HEX.secondary : HEX.warn;

    // Round counter badge (top-right of panel)
    const roundLabel = `ACTION ${round} / 3`;

    const items = [];
    items.push(this.add.rectangle(px, py, panelW, panelH, COLORS.surface, 1)
      .setOrigin(0, 0).setStrokeStyle(1, accentColor, 0.6).setDepth(DEPTH));
    items.push(this.add.rectangle(px, py, 3, panelH, accentColor, 1)
      .setOrigin(0, 0).setDepth(DEPTH + 1));
    items.push(this.add.rectangle(px, py, panelW, 38, accentColor, 0.1)
      .setOrigin(0, 0).setDepth(DEPTH + 1));
    items.push(this.add.text(px + 14, py + 11, r.title, {
      fontFamily: FONTS.headline, fontSize: '14px', fontStyle: '800',
      color: accentHex, letterSpacing: 3
    }).setDepth(DEPTH + 2));
    items.push(this.add.text(px + panelW - 14, py + 13, roundLabel, {
      fontFamily: FONTS.mono, fontSize: '10px', color: HEX.outline
    }).setOrigin(1, 0).setDepth(DEPTH + 2));
    items.push(this.add.text(px + 14, py + 50, r.msg, {
      fontFamily: FONTS.mono, fontSize: '11px', color: HEX.onSurfaceVar,
      wordWrap: { width: panelW - 28 }, lineSpacing: 5
    }).setDepth(DEPTH + 2));

    // Dismiss button — player can advance immediately without waiting.
    const btnLabel = round < 3 ? 'CONTINUE \u2192' : 'FINISH \u2192';
    const dismissBtn = createButton(this, {
      x: px + panelW - 14 - 148,
      y: py + panelH - 14 - 40,
      width: 148, height: 40,
      label: btnLabel, initial: 'normal',
      onClick: () => doAdvance()
    });
    [dismissBtn.bg, dismissBtn.text].forEach(o => o.setDepth(DEPTH + 3));
    items.push(dismissBtn.bg, dismissBtn.text);

    this.onboarding.overlayItems = items;
    this.onboarding.items.push(...items);

    // Shared advance logic — called by button or auto-timer.
    let advanced = false;
    const doAdvance = () => {
      if (advanced || this.onboarding?.step !== 3) return;
      advanced = true;
      if (this.onboarding.reactTimer) {
        this.onboarding.reactTimer.remove(false);
        this.onboarding.reactTimer = null;
      }
      this.tweens.add({
        targets: items, alpha: 0, duration: 380,
        onComplete: () => {
          if (round < 3) {
            this._onboardingStep2();
          } else {
            this._onboardingShowReady();
          }
        }
      });
    };

    this.onboarding.reactTimer = this.time.delayedCall(4800, doAdvance, [], this);
  }

  _onboardingShowReady() {
    this._onboardingClearOverlay();
    this.onboarding.step = 4;

    const DEPTH = 1200;
    const items = [];

    // Full dark overlay blocks the game while the final card is up.
    items.push(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72)
      .setOrigin(0, 0).setDepth(DEPTH).setInteractive());

    const panelW = 520;
    const panelH = 270;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = (GAME_HEIGHT - panelH) / 2;

    items.push(this.add.rectangle(px, py, panelW, panelH, COLORS.surface, 1)
      .setOrigin(0, 0).setStrokeStyle(1, COLORS.primary, 0.5).setDepth(DEPTH + 1));
    items.push(this.add.rectangle(px, py, 3, panelH, COLORS.primary, 0.8)
      .setOrigin(0, 0).setDepth(DEPTH + 2));
    items.push(this.add.rectangle(px, py, panelW, 46, COLORS.primary, 0.1)
      .setOrigin(0, 0).setDepth(DEPTH + 2));
    items.push(this.add.text(px + 14, py + 13, 'ARE YOU READY?', {
      fontFamily: FONTS.headline, fontSize: '18px', fontStyle: '800',
      color: HEX.primary, letterSpacing: 4
    }).setDepth(DEPTH + 3));
    items.push(this.add.text(px + panelW - 14, py + 16, 'NO MORE TUTORIALS', {
      fontFamily: FONTS.mono, fontSize: '10px', color: HEX.outline
    }).setOrigin(1, 0).setDepth(DEPTH + 3));
    items.push(this.add.rectangle(px + 14, py + 46, panelW - 28, 1, COLORS.primary, 0.2)
      .setOrigin(0, 0).setDepth(DEPTH + 2));
    items.push(this.add.text(px + 14, py + 62,
      'You have processed three jobs.\n\n' +
      'The shift will now proceed without guidance.\n' +
      'The queue will grow. The meters will degrade.\n' +
      'Management will form opinions about your behavior.\n\n' +
      'Good luck. You will need it.',
      {
        fontFamily: FONTS.mono, fontSize: '13px', color: HEX.onSurfaceVar,
        wordWrap: { width: panelW - 28 }, lineSpacing: 5
      }).setDepth(DEPTH + 3));

    const startBtn = createButton(this, {
      x: px + (panelW - 220) / 2,
      y: py + panelH - 14 - 46,
      width: 220, height: 46,
      label: 'START SHIFT',
      initial: 'primary',
      onClick: () => this._onboardingCleanup()
    });
    [startBtn.bg, startBtn.text].forEach(o => o.setDepth(DEPTH + 3));
    items.push(startBtn.bg, startBtn.text);

    this.onboarding.overlayItems = items;
    this.onboarding.items.push(...items);
  }

  _onboardingCleanup() {
    if (!this.onboarding) return;
    this.onboarding.items.forEach(o => { try { o.destroy(); } catch { } });
    this.onboarding = null;
    if (this.tickTimer && !this.tutorial) this.tickTimer.paused = false;
  }

  // =========================================================================
  // Action consequence popup — shows meter deltas after every player choice
  // =========================================================================
  showConsequencePopup(actionKey, job, before) {
    // Onboarding provides its own reaction — suppress the normal popup.
    if (this.onboarding) return;
    // Cancel any toast queued from the previous popup before replacing it.
    this.pendingJobToast = null;
    this._destroyConsequencePopup();

    const SHORT = {
      toner: 'TONER', heat: 'HEAT', paperPath: 'PATH',
      memory: 'MEM', dignity: 'DIG', blame: 'BLAME'
    };

    const deltas = [];
    METERS.forEach(m => {
      const prev = before[m.key] ?? 0;
      const next = this.state[m.key] ?? 0;
      const delta = Math.round(next) - Math.round(prev);
      if (delta === 0) return;
      const isHarmful = (m.dangerHigh !== undefined && delta > 0)
        || (m.dangerLow !== undefined && delta < 0);
      deltas.push({ short: SHORT[m.key] ?? m.key.toUpperCase(), delta, isHarmful });
    });

    const DEPTH = 700;
    const panelW = 460;
    const panelH = 106;
    const px = (GAME_WIDTH - panelW) / 2;
    const py = TOP_BAR_H + 50;

    const SHORT_DESC = {
      accept: 'Compliance noted. Blame reduced.',
      reject: 'Request refused. Office has questions.',
      fakeError: 'Error fabricated. Memory consumed.',
      reroute: 'Redirected. Responsibility transferred.',
      purgeQueue: 'Queue erased. Heat reduced.',
      reboot: 'Systems restarted. Time lost.'
    };
    const desc = SHORT_DESC[actionKey] ?? '';

    const accentColor =
      actionKey === 'accept' ? COLORS.secondary
        : actionKey === 'reject' || actionKey === 'purgeQueue' ? COLORS.error
          : COLORS.primary;
    const accentHex =
      actionKey === 'accept' ? HEX.secondary
        : actionKey === 'reject' || actionKey === 'purgeQueue' ? HEX.error
          : HEX.primary;

    const actionLabel = ACTIONS.find(a => a.key === actionKey)?.label?.toUpperCase() ?? actionKey.toUpperCase();

    const items = [];
    const add = (obj) => { items.push(obj); return obj; };

    // Panel background
    add(this.add.rectangle(px, py, panelW, panelH, COLORS.surface, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, accentColor, 0.45)
      .setDepth(DEPTH)
      .setAlpha(0));

    // Left accent strip
    add(this.add.rectangle(px, py, 3, panelH, accentColor, 1)
      .setOrigin(0, 0)
      .setDepth(DEPTH + 1)
      .setAlpha(0));

    // Header band
    add(this.add.rectangle(px, py, panelW, 36, accentColor, 0.08)
      .setOrigin(0, 0)
      .setDepth(DEPTH + 1)
      .setAlpha(0));

    // Action label
    add(this.add.text(px + 14, py + 11, actionLabel, {
      fontFamily: FONTS.headline,
      fontSize: '13px',
      fontStyle: '800',
      color: accentHex,
      letterSpacing: 3
    }).setDepth(DEPTH + 2).setAlpha(0));

    // Job title
    if (job?.title) {
      const t = job.title.length > 30 ? job.title.slice(0, 29) + '\u2026' : job.title;
      add(this.add.text(px + panelW - 12, py + 13, t, {
        fontFamily: FONTS.mono,
        fontSize: '10px',
        color: HEX.outline
      }).setOrigin(1, 0).setDepth(DEPTH + 2).setAlpha(0));
    }

    // Divider
    add(this.add.rectangle(px + 12, py + 36, panelW - 24, 1, accentColor, 0.2)
      .setOrigin(0, 0)
      .setDepth(DEPTH + 1)
      .setAlpha(0));

    // One-line description (≤8 words)
    add(this.add.text(px + 14, py + 44, desc, {
      fontFamily: FONTS.mono,
      fontStyle: 'italic',
      fontSize: '10px',
      color: HEX.onSurfaceVar
    }).setDepth(DEPTH + 2).setAlpha(0));

    // Meter delta chips
    const chipsY = py + 66;
    if (deltas.length > 0) {
      let chipX = px + 14;
      deltas.forEach(({ short, delta, isHarmful }) => {
        const chipColor = isHarmful ? HEX.error : HEX.secondary;
        const sign = delta > 0 ? '+' : '';
        const chip = add(this.add.text(chipX, chipsY, `${short} ${sign}${delta}`, {
          fontFamily: FONTS.mono,
          fontSize: '11px',
          color: chipColor
        }).setDepth(DEPTH + 2).setAlpha(0));
        chipX += chip.width + 16;
      });
    } else {
      add(this.add.text(px + 14, chipsY, 'No system impact.', {
        fontFamily: FONTS.mono,
        fontSize: '11px',
        color: HEX.outline
      }).setDepth(DEPTH + 2).setAlpha(0));
    }

    this.tweens.add({ targets: items, alpha: 1, duration: 150 });

    const dismissTimer = this.time.delayedCall(2800, () => {
      if (this.consequencePopup) {
        this.tweens.add({
          targets: this.consequencePopup.items,
          alpha: 0,
          duration: 320,
          onComplete: () => this._destroyConsequencePopup()
        });
        this.consequencePopup.dismissTimer = null;
      }
    }, [], this);

    this.consequencePopup = { items, dismissTimer };
  }

  _destroyConsequencePopup() {
    if (!this.consequencePopup) return;
    const { items, dismissTimer } = this.consequencePopup;
    if (dismissTimer) dismissTimer.remove(false);
    items.forEach(o => { try { o.destroy(); } catch { } });
    this.consequencePopup = null;
    this._showPendingJobToast();
  }

  _showPendingJobToast() {
    if (!this.pendingJobToast) return;
    if (this.onboarding) return; // don't interrupt onboarding flow
    const job = this.pendingJobToast;
    this.pendingJobToast = null;
    this.showJobArrivalToast(job);
  }

  refreshTopBar() {
    const { sysTime, queue, prog } = this.topChips;
    sysTime.valueText.setText(formatSysTime(this.state.dayTime));

    const q = this.state.queue.length;
    queue.valueText.setText(`${q}/${QUEUE_OVERFLOW}`);
    queue.valueText.setColor(
      q >= QUEUE_OVERFLOW ? HEX.error
        : q >= QUEUE_WARN ? HEX.warn
          : HEX.primary
    );

    // Progress reads roughly as fraction of the shift elapsed.
    const pct = Math.min(99, Math.round((this.state.dayTime / MAX_DAY_TIME) * 100));
    prog.valueText.setText(`${pct}%`);

    // Alert banner visibility: any critical meter OR queue overflow.
    const critical = UI_METERS.some(m => {
      const v = this.state[m.key] ?? 0;
      return meterVisual(m, v).statusKey === 'critical';
    }) || this.state.queue.length >= QUEUE_OVERFLOW;
    this.alertBanner.setVisible(critical);

    // Shift dots: early/mid/late = 1/2/3 dots lit.
    const phaseIdx = this.state.phase === 'lateShift' ? 2
      : this.state.phase === 'midShift' ? 1
        : 0;
    const phaseLampColor = this.state.phase === 'lateShift' ? COLORS.error
      : this.state.phase === 'midShift' ? COLORS.warn
        : COLORS.secondary;
    this.shiftDots.forEach((dot, i) => {
      const lit = i <= phaseIdx;
      dot.setFillStyle(lit ? phaseLampColor : COLORS.outlineVar, 1);
      dot.setAlpha(lit ? 1 : 0.35);
    });

    this.shiftTag.setText(PHASE_LABELS[this.state.phase].toUpperCase());
  }

  refreshJobCard() {
    const job = this.state.currentJob;
    if (!job) return;

    this.jobTitleText.setText(job.title);
    this.jobDescText.setText(job.description);

    // Cache the formatted ID on the job object — formatJobId involves a
    // char-array allocation + reduce for an immutable value.
    if (job._cachedId === undefined) job._cachedId = `ID: ${formatJobId(job.id)}`;
    this.jobIdText.setText(job._cachedId);

    // Urgency mapping → badge label + color.
    const badgeInfo = urgencyBadge(job.urgency);
    this.jobBadge.setText(badgeInfo.label);
    this.jobBadge.setBackgroundColor(cssHex(badgeInfo.bg));
    this.jobBadge.setColor(badgeInfo.fg);

    // Cache riskMagnitude — Object.values allocation for an immutable value.
    if (job._cachedRiskMag === undefined) job._cachedRiskMag = riskMagnitude(job.risk);
    const riskMag = job._cachedRiskMag;
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
    // Iterate the log array from the tail so the most-recent entry maps to
    // slot 0. No slice/reverse allocation needed.
    const log = this.state.log;
    const count = this.logLines?.length ?? 0;
    for (let i = 0; i < count; i++) {
      const line = this.logLines[i];
      const entry = log[log.length - 1 - i];

      if (!entry) {
        line.setText('');
        continue;
      }

      // Use the pre-computed display string written by log(); fall back
      // gracefully for any legacy plain-string entries still in state.
      const display = entry.display ?? (entry.text ? '> ' + entry.text : '');
      const color = entry.color ?? LOG_DEFAULT;
      line.setText(display);
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
      // Allow if the current job explicitly offers purgeQueue even on empty queue,
      // so that job-specific flavour choices are never blocked.
      const jobOffersIt = definedKeys.has('purgeQueue');
      return this.state.queue.length === 0 && !jobOffersIt ? 'disabled' : 'normal';
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

function riskMagnitude(risk) {
  if (!risk) return 0;
  return Object.values(risk).reduce((sum, v) => sum + Math.abs(v), 0);
}

function urgencyBadge(urgency) {
  if (urgency >= 3) return { label: 'URGENT', bg: COLORS.error, fg: HEX.ink };
  if (urgency === 2) return { label: 'PRIORITY', bg: COLORS.warn, fg: HEX.ink };
  return { label: 'NOTICE', bg: COLORS.outlineVar, fg: HEX.onSurface };
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
