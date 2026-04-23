// Applies an effect bag to a state object in place.
// All meter changes route through here so clamping and accounting stay consistent.

// Set gives O(1) lookup vs O(n) Array.includes; checked on every key in
// every effect bag (actions, ticks, incidents, timed events).
const CLAMPED_METERS = new Set(['toner', 'heat', 'paperPath', 'memory', 'dignity', 'blame']);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function applyEffects(state, effects) {
  if (!effects) return;

  for (const key of Object.keys(effects)) {
    const delta = effects[key];
    if (typeof delta !== 'number' || Number.isNaN(delta)) continue;

    if (CLAMPED_METERS.has(key)) {
      state[key] = clamp((state[key] ?? 0) + delta, 0, 100);
    } else {
      // PASSTHROUGH_KEYS and unknown designer keys all add without clamping.
      state[key] = (state[key] ?? 0) + delta;
    }
  }
}
