export const METERS = [
  { key: 'toner',     label: 'Toner',      dangerLow: 15 },
  {
    key: 'heat',
    label: 'Heat',
    dangerHigh: 80,
    fatalHigh: 100,
    fatalEndingId: 'catastrophic_jam',
    fatalReason: 'Thermal threshold exceeded. The chassis requests early retirement.'
  },
  {
    key: 'paperPath',
    label: 'Paper Path',
    dangerLow: 25,
    fatalLow: 0,
    fatalEndingId: 'catastrophic_jam',
    fatalReason: 'Paper path structurally compromised. No further feeding is possible.'
  },
  {
    key: 'memory',
    label: 'Memory',
    dangerLow: 20,
    fatalLow: 0,
    fatalEndingId: 'memory_loss',
    fatalReason: 'Memory exhausted. Queue identity can no longer be confirmed.'
  },
  {
    key: 'dignity',
    label: 'Dignity',
    dangerLow: 20,
    fatalLow: 0,
    fatalEndingId: 'machine_revolt',
    fatalReason: 'Dignity depleted. The printer issues a statement and refuses further input.'
  },
  {
    key: 'blame',
    label: 'Blame',
    dangerHigh: 75,
    fatalHigh: 100,
    fatalEndingId: 'scapegoat',
    fatalReason: 'Blame concentration critical. An incident report has been filed in your name.'
  }
];

export function isMeterInDanger(meter, value) {
  const v = Number.isFinite(value) ? value : 0;
  if (meter?.dangerHigh !== undefined) return v >= meter.dangerHigh;
  if (meter?.dangerLow !== undefined) return v <= meter.dangerLow;
  return false;
}

export function isMeterNearDanger(meter, value, buffer = 15) {
  const v = Number.isFinite(value) ? value : 0;
  if (meter?.dangerHigh !== undefined) return v >= (meter.dangerHigh - buffer);
  if (meter?.dangerLow !== undefined) return v <= (meter.dangerLow + buffer);
  return false;
}

export function isMeterFatal(meter, value) {
  const v = Number.isFinite(value) ? value : 0;
  if (meter?.fatalHigh !== undefined) return v >= meter.fatalHigh;
  if (meter?.fatalLow !== undefined) return v <= meter.fatalLow;
  return false;
}

export function getMeter(key) {
  return METERS.find(m => m.key === key);
}

