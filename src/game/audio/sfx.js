import { AUDIO } from './audioKeys.js';

const lastPlayedAt = new Map();
let humSound = null;

function nowMs(scene) {
  if (scene?.time?.now !== undefined) return scene.time.now;
  return Date.now();
}

function requestAudioUnlock(scene) {
  const manager = scene?.sound;
  if (!manager) return;

  // Phaser typically unlocks on first input, but in practice it can remain locked
  // until we explicitly ask and the browser resumes the AudioContext.
  try {
    if (typeof manager.unlock === 'function') manager.unlock();
  } catch {}

  try {
    const ctx = manager.context;
    if (ctx && typeof ctx.resume === 'function' && ctx.state === 'suspended') {
      // Fire-and-forget; the click gesture should allow it.
      ctx.resume();
    }
  } catch {}
}

function canPlay(scene) {
  const manager = scene?.sound;
  if (!manager) return false;
  if (manager.mute) return false;

  if (manager.locked) {
    requestAudioUnlock(scene);
    if (manager.locked) return false;
  }
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

  // The SoundManager is shared across scenes. Keep a single hum instance alive
  // to avoid stacking loops during rapid restarts.
  if (humSound && humSound.isPlaying) return humSound;

  try {
    // If a previous instance exists but isn't playing, destroy it before recreating.
    if (humSound) {
      try { humSound.stop(); } catch {}
      try { humSound.destroy(); } catch {}
      humSound = null;
    }

    humSound = scene.sound.add(def.key, { loop: true, volume: def.volume ?? 0.2 });
    humSound.play();
    return humSound;
  } catch {
    return null;
  }
}

export function stopHum(scene) {
  const def = AUDIO.hum;
  if (!def) return;
  try {
    // Stop/destroy our tracked instance…
    if (humSound) {
      try { humSound.stop(); } catch {}
      try { humSound.destroy(); } catch {}
      humSound = null;
    }

    // …and also defensively stop any other hum instances that might have been created.
    const manager = scene?.sound;
    const list = manager?.sounds ?? [];
    list.forEach(s => {
      if (s?.key === def.key) {
        try { s.stop(); } catch {}
        try { s.destroy(); } catch {}
      }
    });
  } catch {
    // ignore
  }
}

