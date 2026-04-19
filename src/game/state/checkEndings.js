import { MAX_DAY_TIME } from '../config.js';

// Centralized ending evaluation. Ordered by severity.
// Returning early keeps the worst outcome winning when several would apply.

export function checkEndings(state) {
  if (state.heat >= 100) {
    return {
      ended: true,
      endingId: 'catastrophic_jam',
      reason: 'Thermal threshold exceeded. The chassis requests early retirement.'
    };
  }

  if (state.paperPath <= 0) {
    return {
      ended: true,
      endingId: 'catastrophic_jam',
      reason: 'Paper path structurally compromised. No further feeding is possible.'
    };
  }

  if (state.memory <= 0) {
    return {
      ended: true,
      endingId: 'memory_loss',
      reason: 'Memory exhausted. Queue identity can no longer be confirmed.'
    };
  }

  if (state.dignity <= 0) {
    return {
      ended: true,
      endingId: 'machine_revolt',
      reason: 'Dignity depleted. The printer issues a statement and refuses further input.'
    };
  }

  if (state.blame >= 100) {
    return {
      ended: true,
      endingId: 'scapegoat',
      reason: 'Blame concentration critical. An incident report has been filed in your name.'
    };
  }

  if (state.dayTime >= MAX_DAY_TIME) {
    return {
      ended: true,
      endingId: 'shift_complete',
      reason: 'Shift concluded. The printer has survived another standard operating day.'
    };
  }

  return { ended: false, endingId: null, reason: null };
}
