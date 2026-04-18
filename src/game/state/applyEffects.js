// Applies an effect bag to a state object in place.
// All meter changes route through here so clamping and accounting stay consistent.

const CLAMPED_METERS = ['toner', 'heat', 'paperPath', 'memory', 'dignity', 'blame'];
const PASSTHROUGH_KEYS = ['queueSize', 'dayTime'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function applyEffects(state, effects) {
  if (!effects) return;

  for (const key of Object.keys(effects)) {
    const delta = effects[key];
    if (typeof delta !== 'number' || Number.isNaN(delta)) continue;

    if (CLAMPED_METERS.includes(key)) {
      state[key] = clamp((state[key] ?? 0) + delta, 0, 100);
    } else if (PASSTHROUGH_KEYS.includes(key)) {
      state[key] = (state[key] ?? 0) + delta;
    } else {
      // Unknown keys still apply without clamping so designers can experiment,
      // but we keep them numeric.
      state[key] = (state[key] ?? 0) + delta;
    }
  }
}
