import Phaser from 'phaser';
import {
  GAME_WIDTH,
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
import { createButton } from '../ui/Button.js';

// Fixed action buttons. Positions stay stable for the entire run.
const ACTIONS = [
  { key: 'accept',     label: 'Accept' },
  { key: 'reject',     label: 'Reject' },
  { key: 'fakeError',  label: 'Fake Error' },
  { key: 'reroute',    label: 'Reroute' },
  { key: 'purgeQueue', label: 'Purge Queue' },
  { key: 'reboot',     label: 'Reboot' }
];

const METERS = [
  { key: 'toner',     label: 'Toner',      dangerLow: 15 },
  { key: 'heat',      label: 'Heat',       dangerHigh: 80 },
  { key: 'paperPath', label: 'Paper Path', dangerLow: 25 },
  { key: 'memory',    label: 'Memory',     dangerLow: 20 },
  { key: 'dignity',   label: 'Dignity',    dangerLow: 20 },
  { key: 'blame',     label: 'Blame',      dangerHigh: 75 }
];

const MANAGER_CHANCE = { earlyShift: 0, midShift: 0.12, lateShift: 0.22 };
const OVERHEAT_THRESHOLD = 75;
const OVERHEAT_CHANCE = 0.35;

const MAX_LOG_LINES = 6;
const METER_PANEL_WIDTH = 544;
const METER_BAR_INNER = METER_PANEL_WIDTH - 32;

const COLOR_OK = 0x4f8cc9;
const COLOR_WARN = 0xd4a34a;
const COLOR_DANGER = 0xd45a4a;
const COLOR_LAMP_DIM = 0x2a2f36;

const LOG_DEFAULT  = '#b7bec6';
const LOG_SYSTEM   = '#5a9fd4';
const LOG_INCIDENT = '#d4a34a';
const LOG_WARNING  = '#e06c5a';
const LOG_GOOD     = '#8ad07a';
const LOG_PHASE    = '#9b8fca';
const LOG_OFFICE   = '#6e7379';
const LOG_ACTION   = '#c9d1d9';

const PANEL_FILL = 0x151a1f;
const PANEL_HEADER_FILL = 0x1f2630;
const PANEL_STROKE = 0x2a3038;

// Fallback effects for actions a job does not explicitly define.
// Keeps every button useful without forcing every job to list every action.
const DEFAULT_ACTION_EFFECTS = {
  accept:     { blame: -1 },
  reject:     { dignity: -3, blame: 3 },
  fakeError:  { memory: -2, dignity: 1 },
  reroute:    { blame: 2, memory: -1 },
  purgeQueue: {},   // handled specially below
  reboot:     {}    // handled specially below
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.state = createInitialState();
    this.state.currentJob = getFirstJob();

    const modifier = pickModifier();
    this.state.modifier = modifier;
    applyEffects(this.state, modifier.startEffects);
    this.log(`Shift begins. Machine initialized. No one greeted it.`, LOG_SYSTEM);
    this.log(`[CONDITION] ${modifier.label} — ${modifier.description}`, LOG_SYSTEM);

    this.buttons = {};
    this.meterLamps = {};

    this.buildLayout();
    this.refresh();

    this.tickTimer = this.time.addEvent({
      delay: TICK_MS,
      loop: true,
      callback: () => this.onTick(),
      callbackScope: this
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.teardown, this);
  }

  teardown() {
    if (this.tickTimer) {
      this.tickTimer.remove(false);
      this.tickTimer = null;
    }
  }

  // =========================================================================
  // Layout
  // =========================================================================
  buildLayout() {
    this.drawTopStrip();
    this.drawJobPanel();
    this.drawMeterPanel();
    this.drawLogPanel();
    this.drawActionButtons();
  }

  drawPanel(x, y, w, h, title) {
    const body = this.add.rectangle(x, y, w, h, PANEL_FILL).setOrigin(0, 0);
    body.setStrokeStyle(1, PANEL_STROKE);
    const header = this.add.rectangle(x, y, w, 32, PANEL_HEADER_FILL).setOrigin(0, 0);
    header.setStrokeStyle(1, PANEL_STROKE);
    this.add.text(x + 12, y + 6, title, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#c9d1d9'
    });
  }

  drawTopStrip() {
    const strip = this.add.rectangle(0, 0, GAME_WIDTH, 56, 0x14181d).setOrigin(0, 0);
    strip.setStrokeStyle(1, PANEL_STROKE);

    // Power lamp next to the title gives the strip a console feel.
    this.add.circle(24, 28, 5, 0x8ad07a);
    this.add.text(40, 16, 'OFFICE PRINTER 9K', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#e6e6e6'
    });

    this.add.text(288, 16, '//', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#3a4048'
    });

    this.phaseText = this.add.text(314, 16, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9aa0a6'
    });

    this.add.text(560, 16, '//', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#3a4048'
    });

    this.queueText = this.add.text(586, 16, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9aa0a6'
    });

    this.modifierText = this.add.text(760, 16, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#6e7379'
    });

    this.topStatus = this.add.text(GAME_WIDTH - 24, 16, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9aa0a6'
    }).setOrigin(1, 0);

    this.add.rectangle(0, 53, GAME_WIDTH, 3, 0x1a2028).setOrigin(0, 0);
    this.shiftBar = this.add.rectangle(0, 53, 4, 3, 0x8ad07a).setOrigin(0, 0);
  }

  drawJobPanel() {
    const x = 32;
    const y = 80;
    const w = 640;
    const h = 280;

    this.drawPanel(x, y, w, h, '// 01  INCOMING REQUEST');

    this.urgencyBadge = this.add.text(x + w - 12, y + 6, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#3a4048',
      padding: { left: 8, right: 8, top: 2, bottom: 2 }
    }).setOrigin(1, 0);

    this.jobTitleText = this.add.text(x + 16, y + 52, '', {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: '#ffffff'
    });

    this.jobMetaText = this.add.text(x + 16, y + 94, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#7d858f'
    });

    this.jobDescText = this.add.text(x + 16, y + 128, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#d0d7de',
      wordWrap: { width: w - 32 }
    });

    this.jobRiskLabel = this.add.text(x + 16, y + h - 68, 'PROJECTED IMPACT', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#5a6068'
    });

    this.jobRiskText = this.add.text(x + 16, y + h - 50, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#9aa0a6',
      wordWrap: { width: w - 32 }
    });

    this.jobChoicesText = this.add.text(x + 16, y + h - 24, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#5a6068',
      wordWrap: { width: w - 32 }
    });
  }

  drawMeterPanel() {
    const x = 704;
    const y = 80;
    const w = METER_PANEL_WIDTH;
    const h = 400;

    this.drawPanel(x, y, w, h, '// 02  MACHINE STATUS');

    this.meterTexts = {};
    this.meterBars = {};
    this.meterLampTexts = {};

    METERS.forEach((meter, i) => {
      const row = y + 52 + i * 54;

      this.meterLamps[meter.key] = this.add.circle(x + 16 + 4, row + 7, 5, COLOR_LAMP_DIM);

      this.add.text(x + 34, row, meter.label.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#9aa0a6'
      });

      this.meterTexts[meter.key] = this.add.text(x + w - 16, row, '0', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e6e6e6'
      }).setOrigin(1, 0);

      this.add.rectangle(x + 16, row + 22, METER_BAR_INNER, 10, 0x222830).setOrigin(0, 0);
      this.meterBars[meter.key] = this.add.rectangle(x + 16, row + 22, 0, 10, COLOR_OK)
        .setOrigin(0, 0);
    });
  }

  drawLogPanel() {
    const x = 32;
    const y = 376;
    const w = 640;
    const h = 196;

    this.drawPanel(x, y, w, h, '// 03  EVENT LOG');

    this.logLines = [];
    for (let i = 0; i < MAX_LOG_LINES; i++) {
      this.logLines.push(this.add.text(x + 12, y + 40 + i * 26, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: LOG_DEFAULT,
        wordWrap: { width: w - 24 }
      }));
    }
  }

  drawActionButtons() {
    const totalWidth = GAME_WIDTH - 64;
    const count = ACTIONS.length;
    const gap = 12;
    const btnW = (totalWidth - gap * (count - 1)) / count;
    const y = 596;
    const h = 72;

    this.add.text(32, y - 18, '// 04  RESPONSE PANEL', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#5a6068'
    });

    ACTIONS.forEach((action, i) => {
      const x = 32 + i * (btnW + gap);
      const button = createButton(this, {
        x, y, width: btnW, height: h,
        label: action.label,
        onClick: () => this.resolveChoice(action.key)
      });
      this.buttons[action.key] = button;
    });

    this.add.text(32, y + h + 12, 'Button positions are permanent. The printer has requested they remain permanent.', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#5a6068'
    });
  }

  // =========================================================================
  // Core resolver. All meter changes route through applyEffects.
  // =========================================================================
  resolveChoice(actionKey) {
    if (this.state.gameOver) return;

    const button = this.buttons[actionKey];
    if (button && button.isDisabled()) return;

    const job = this.state.currentJob;
    const choice = job?.choices?.find(c => c.key === actionKey);
    const effect = choice?.effect ?? DEFAULT_ACTION_EFFECTS[actionKey] ?? {};

    if (actionKey === 'purgeQueue') {
      this.runPurgeQueue();
    } else if (actionKey === 'reboot') {
      this.runReboot();
    } else {
      applyEffects(this.state, effect);
    }

    applyEffects(this.state, { dayTime: 1 });
    this.state.phase = phaseFor(this.state.dayTime);

    this.logResolution(job, actionKey);
    this.state.stats.jobsHandled += 1;

    if (this.evaluateEndings()) return;

    this.checkWarnings();
    this.advanceCurrentJob();
    this.refresh();
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

  runPurgeQueue() {
    const purged = this.state.queue.length;
    this.state.queue = [];
    this.state.queueSize = 0;
    applyEffects(this.state, { memory: 12, dignity: -6, blame: 4, heat: -2 });
    this.state.stats.queuesPurged += 1;
    if (purged > 0) {
      this.log(`Queue purged. ${purged} request${purged === 1 ? '' : 's'} erased without record.`, LOG_ACTION);
    } else {
      this.log('Queue purged preemptively. Finance will be notified anyway.', LOG_ACTION);
    }
  }

  runReboot() {
    applyEffects(this.state, { memory: 18, heat: -5, dignity: -2, dayTime: 2 });
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

  // =========================================================================
  // Escalation tick. Fires on a Phaser timer.
  // =========================================================================
  onTick() {
    if (this.state.gameOver) return;

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
      const value = this.state[meter.key] ?? 0;
      const inDanger = meterInDanger(meter, value);
      const wasInDanger = !!this.state.warnings[meter.key];
      if (inDanger && !wasInDanger) {
        this.log(pickFrom(warningLines[meter.key]), LOG_WARNING);
      }
      this.state.warnings[meter.key] = inDanger;
    });
  }

  evaluateEndings() {
    const ending = checkEndings(this.state);
    if (!ending.ended) return false;
    this.state.gameOver = true;
    this.state.endingId = ending.endingId;
    this.state.endingReason = ending.reason;
    this.teardown();
    this.refresh();
    this.time.delayedCall(450, () => {
      this.scene.start('ResultsScene', {
        endingId: ending.endingId,
        reason: ending.reason,
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
  // Logging and rendering
  // =========================================================================
  log(line, color = LOG_DEFAULT) {
    if (!line) return;
    this.state.log.push({ text: line, color });
    if (this.state.log.length > MAX_LOG_LINES) {
      this.state.log.splice(0, this.state.log.length - MAX_LOG_LINES);
    }
  }

  refresh() {
    this.phaseText.setText(`PHASE: ${PHASE_LABELS[this.state.phase].toUpperCase()}`);

    const q = this.state.queue.length;
    this.queueText.setText(`QUEUE: ${q}`);
    if (q >= QUEUE_OVERFLOW) {
      this.queueText.setColor('#d45a4a');
    } else if (q >= QUEUE_WARN) {
      this.queueText.setColor('#d4a34a');
    } else {
      this.queueText.setColor('#9aa0a6');
    }

    if (this.state.modifier) {
      this.modifierText.setText(`// ${this.state.modifier.label.toUpperCase()}`);
    }
    this.topStatus.setText(`DAY 1  //  T+${this.state.dayTime}`);

    const shiftProgress = Math.min(1, this.state.dayTime / MAX_DAY_TIME);
    this.shiftBar.width = Math.max(4, GAME_WIDTH * shiftProgress);
    this.shiftBar.fillColor = shiftProgress >= 0.85 ? 0xd45a4a
      : shiftProgress >= 0.6 ? 0xd4a34a
      : 0x8ad07a;

    const job = this.state.currentJob;
    if (job) {
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

    METERS.forEach(meter => {
      const value = this.state[meter.key] ?? 0;
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

    const displayLog = this.state.log.slice().reverse();
    this.logLines.forEach((line, i) => {
      const entry = displayLog[i];
      if (entry) {
        line.setText(entry.text);
        line.setColor(entry.color);
      } else {
        line.setText('');
      }
    });
    this.refreshButtons();
  }

  refreshButtons() {
    const job = this.state.currentJob;
    const definedKeys = new Set(job?.choices?.map(c => c.key) ?? []);

    ACTIONS.forEach(action => {
      const button = this.buttons[action.key];
      if (!button) return;

      const visualState = this.computeButtonState(action.key, definedKeys);
      button.setState(visualState);
    });
  }

  computeButtonState(actionKey, definedKeys) {
    if (this.state.gameOver) return 'disabled';

    if (actionKey === 'purgeQueue') {
      return this.state.queue.length === 0 ? 'disabled' : 'normal';
    }
    if (actionKey === 'reboot') {
      return this.state.memory >= 95 ? 'muted' : 'normal';
    }
    if (definedKeys.has(actionKey)) return 'primary';
    return 'muted';
  }
}

function meterColor(meter, value) {
  if (meter.dangerHigh !== undefined) {
    if (value >= meter.dangerHigh) return COLOR_DANGER;
    if (value >= meter.dangerHigh - 15) return COLOR_WARN;
  }
  if (meter.dangerLow !== undefined) {
    if (value <= meter.dangerLow) return COLOR_DANGER;
    if (value <= meter.dangerLow + 15) return COLOR_WARN;
  }
  return COLOR_OK;
}

function meterInDanger(meter, value) {
  if (meter.dangerHigh !== undefined && value >= meter.dangerHigh) return true;
  if (meter.dangerLow  !== undefined && value <= meter.dangerLow)  return true;
  return false;
}

// Formats a job's risk bag into a compact preview line.
function formatRisk(risk) {
  if (!risk) return 'Impact profile unspecified.';
  const parts = Object.entries(risk).map(([key, val]) => {
    const sign = val > 0 ? '+' : '';
    return `${key}:${sign}${val}`;
  });
  return parts.join('   ');
}
