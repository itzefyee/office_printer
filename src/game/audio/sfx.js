import { AUDIO } from './audioKeys.js';

const lastPlayedAt = new Map();
let bgmSound = null;

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

export function startBgm(scene) {
  const def = AUDIO.bgm;
  if (!def) {
    console.warn('[startBgm] no AUDIO.bgm definition');
    return null;
  }
  if (!canPlay(scene)) {
    console.warn('[startBgm] cannot play — manager mute or still locked');
    return null;
  }
  if (!hasAudioKey(scene, def.key)) {
    console.warn(`[startBgm] audio key not in cache: ${def.key} (was the file loaded?)`);
    return null;
  }

  // The SoundManager is shared across scenes. Keep a single bgm instance alive
  // to avoid stacking loops during rapid restarts.
  if (bgmSound && bgmSound.isPlaying) return bgmSound;

  try {
    if (bgmSound) {
      try { bgmSound.stop(); } catch {}
      try { bgmSound.destroy(); } catch {}
      bgmSound = null;
    }

    bgmSound = scene.sound.add(def.key, { loop: true, volume: def.volume ?? 0.4 });
    bgmSound.play();
    console.log('[startBgm] playing');
    return bgmSound;
  } catch (err) {
    console.warn('[startBgm] play() threw:', err);
    return null;
  }
}

export function stopBgm(scene) {
  const def = AUDIO.bgm;
  if (!def) return;
  try {
    if (bgmSound) {
      try { bgmSound.stop(); } catch {}
      try { bgmSound.destroy(); } catch {}
      bgmSound = null;
    }

    // Defensively stop any other bgm instances that might have been created.
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

