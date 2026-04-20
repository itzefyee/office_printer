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
import { Hud } from '../ui/Hud.js';
import { JobPanel } from '../ui/JobPanel.js';
import { LogPanel } from '../ui/LogPanel.js';
import { ActionButtons } from '../ui/ActionButtons.js';

const MANAGER_CHANCE = { earlyShift: 0, midShift: 0.12, lateShift: 0.22 };
const OVERHEAT_THRESHOLD = 75;
const OVERHEAT_CHANCE = 0.35;

const MAX_LOG_LINES = 6;

const LOG_DEFAULT  = '#b7bec6';
const LOG_SYSTEM   = '#5a9fd4';
const LOG_INCIDENT = '#d4a34a';
const LOG_WARNING  = '#e06c5a';
const LOG_GOOD     = '#8ad07a';
const LOG_PHASE    = '#9b8fca';
const LOG_OFFICE   = '#6e7379';
const LOG_ACTION   = '#c9d1d9';

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

    // Ensure the ambient hum is running whenever the main dashboard is active.
    // If audio is still locked by the browser, this will no-op until unlocked.
    startHum(this);

    const modifier = pickModifier();
    this.state.modifier = modifier;
    applyEffects(this.state, modifier.startEffects);
    this.log(`Shift begins. Machine initialized. No one greeted it.`, LOG_SYSTEM);
    this.log(`[CONDITION] ${modifier.label} — ${modifier.description}`, LOG_SYSTEM);

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
    this.hud = new Hud(this);
    this.jobPanel = new JobPanel(this);
    this.logPanel = new LogPanel(this);
    this.actionButtons = new ActionButtons(this, { onAction: (key) => this.resolveChoice(key) });
  }

  // =========================================================================
  // Core resolver. All meter changes route through applyEffects.
  // =========================================================================
  resolveChoice(actionKey) {
    if (this.state.gameOver) return;

    if (this.actionButtons?.isDisabled(actionKey)) return;

    this.playActionSfx(actionKey);

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
    this.hud?.update(this.state);
    this.jobPanel?.update(this.state.currentJob);
    this.logPanel?.update(this.state.log);
    this.actionButtons?.update(this.state, this.state.currentJob);
  }
}
