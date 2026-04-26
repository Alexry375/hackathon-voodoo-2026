// Tiny audio layer over window.ASSETS data URIs.
//
// SFX path: clone an HTMLAudioElement on each play() so overlapping shots
// (skeleton rafale × 4) don't truncate each other. Music path: a single
// looping element. Browsers block autoplay until a user gesture, so we
// expose unlockAudio() to be called from the first pointerdown.

const _sfxBase = /** @type {Record<string, HTMLAudioElement>} */ ({});
let _music = /** @type {HTMLAudioElement|null} */ (null);
let _unlocked = false;
let _muted = false;

function _src(name) {
  const s = /** @type {any} */ (window).ASSETS?.[name];
  if (!s) console.warn(`[audio] missing asset: ${name}`);
  return s;
}

function _baseFor(name) {
  if (_sfxBase[name]) return _sfxBase[name];
  const src = _src(name);
  if (!src) return null;
  const a = new Audio(src);
  a.preload = 'auto';
  _sfxBase[name] = a;
  return a;
}

/**
 * Unlock audio playback on first user gesture (required by Chrome / Safari).
 * Pre-loads each SFX so the first shot doesn't drop a buffer underrun.
 */
export function unlockAudio() {
  if (_unlocked) return;
  _unlocked = true;
  // Touch each known SFX once so the data URI is decoded.
  for (const k of ['SFX', 'SFX_FIRE_RAFALE', 'SFX_IMPACT_ROCKET',
                   'SFX_IMPACT_RAFALE', 'SFX_RAVEN_CAW', 'SFX_RAVEN_POP']) {
    _baseFor(k);
  }
}

/**
 * Fire-and-forget SFX. Clones the base Audio so concurrent calls overlap.
 * @param {string} name window.ASSETS key
 * @param {{volume?: number, rate?: number}} [opts]
 */
export function playSfx(name, opts) {
  if (_muted) return;
  const base = _baseFor(name);
  if (!base) return;
  const a = base.cloneNode(/*deep*/ false);
  a.volume = opts?.volume ?? 1;
  if (opts?.rate) a.playbackRate = opts.rate;
  // Some browsers reject .play() if the audio context wasn't unlocked yet.
  const p = a.play();
  if (p && p.catch) p.catch(() => {});
}

/**
 * Start a single looping music track. No-op if a track is already playing.
 * @param {string} name window.ASSETS key
 * @param {{volume?: number}} [opts]
 */
export function playMusic(name, opts) {
  if (_muted) return;
  if (_music && !_music.paused) return;
  const src = _src(name);
  if (!src) return;
  _music = new Audio(src);
  _music.loop = true;
  _music.volume = opts?.volume ?? 0.35;
  const p = _music.play();
  if (p && p.catch) p.catch(() => {
    // Autoplay blocked — caller should retry after first user gesture.
  });
}

export function stopMusic() {
  if (_music) { _music.pause(); _music = null; }
}

/** @param {boolean} m */
export function setMuted(m) {
  _muted = m;
  if (m) stopMusic();
}
export function isMuted() { return _muted; }
