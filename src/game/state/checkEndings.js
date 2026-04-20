import { MAX_DAY_TIME } from '../config.js';
import { getMeter, isMeterFatal } from '../data/meters.js';

// Centralized ending evaluation. Ordered by severity.
// Returning early keeps the worst outcome winning when several would apply.

const FATAL_METER_ORDER = ['heat', 'paperPath', 'memory', 'dignity', 'blame'];

export function checkEndings(state) {
  for (const key of FATAL_METER_ORDER) {
    const meter = getMeter(key);
    if (!meter) continue;
    if (!isMeterFatal(meter, state[key])) continue;
    return {
      ended: true,
      endingId: meter.fatalEndingId ?? 'catastrophic_jam',
      reason: meter.fatalReason ?? 'Threshold exceeded. The office requests a new narrative.'
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
