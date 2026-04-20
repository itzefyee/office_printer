export const METERS = [
  { key: 'toner',     label: 'Toner',      dangerLow: 15 },
  { key: 'heat',      label: 'Heat',       dangerHigh: 80 },
  { key: 'paperPath', label: 'Paper Path', dangerLow: 25 },
  { key: 'memory',    label: 'Memory',     dangerLow: 20 },
  { key: 'dignity',   label: 'Dignity',    dangerLow: 20 },
  { key: 'blame',     label: 'Blame',      dangerHigh: 75 }
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

