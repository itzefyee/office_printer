import { AUDIO } from './audioKeys.js';

const lastPlayedAt = new Map();

function nowMs(scene) {
  if (scene?.time?.now !== undefined) return scene.time.now;
  return Date.now();
}

function canPlay(scene) {
  const manager = scene?.sound;
  if (!manager) return false;
  if (manager.locked) return false;
  return true;
}

function hasAudioKey(scene, key) {
  try {
    return !!scene?.cache?.audio?.exists?.(key);
  } catch {
    return false;
  }
}

export function playSfx(scene, audioKey, opts = {}) {
  const def = AUDIO[audioKey];
  if (!def) return null;
  if (!canPlay(scene)) return null;
  if (!hasAudioKey(scene, def.key)) return null;

  const cooldownMs = opts.cooldownMs ?? 250;
  const t = nowMs(scene);
  const last = lastPlayedAt.get(def.key) ?? -Infinity;
  if (t - last < cooldownMs) return null;
  lastPlayedAt.set(def.key, t);

  try {
    return scene.sound.play(def.key, {
      volume: opts.volume ?? def.volume ?? 1,
      loop: opts.loop ?? def.loop ?? false,
      rate: opts.rate ?? 1
    });
  } catch {
    return null;
  }
}

export function startHum(scene) {
  const def = AUDIO.hum;
  if (!def) return null;
  if (!canPlay(scene)) return null;
  if (!hasAudioKey(scene, def.key)) return null;

  const existing = scene.sound.get(def.key);
  if (existing && existing.isPlaying) return existing;

  try {
    const s = scene.sound.add(def.key, { loop: true, volume: def.volume ?? 0.2 });
    s.play();
    return s;
  } catch {
    return null;
  }
}

export function stopHum(scene) {
  const def = AUDIO.hum;
  if (!def) return;
  try {
    const s = scene?.sound?.get?.(def.key);
    if (s) s.stop();
  } catch {
    // ignore
  }
}

