// Audio: looping music + one-shot SFX backed by window.ASSETS data URIs.
// Browser autoplay policy blocks audio until a user gesture, so installAudioOnFirstTap()
// arms a one-time pointerdown handler that calls startMusic() exactly once.
// SFX clones a fresh Audio per call so overlapping shots don't cut each other off.

const MUSIC_VOLUME = 0.35;
const SFX_VOLUME   = 0.55;

/** @type {HTMLAudioElement | null} */
let _music = null;
let _musicStarted = false;
let _audioReady = false;

function _src(name) {
  const src = /** @type {any} */ (window).ASSETS?.[name];
  if (!src) console.warn(`[audio] missing asset: ${name}`);
  return src || null;
}

export function startMusic() {
  if (_musicStarted) return;
  const src = _src('MUSIC');
  if (!src) return;
  _music = new Audio(src);
  _music.loop = true;
  _music.volume = MUSIC_VOLUME;
  const p = _music.play();
  if (p && typeof p.catch === 'function') p.catch(() => { _musicStarted = false; });
  _musicStarted = true;
  _audioReady = true;
}

/**
 * Play a one-shot SFX. Clones a fresh Audio per call so concurrent calls
 * don't truncate each other.
 * @param {{ volume?: number, rate?: number }} [opts]
 */
export function playSfx(opts = {}) {
  const src = _src('SFX');
  if (!src) return;
  const a = new Audio(src);
  a.volume = (opts.volume ?? 1) * SFX_VOLUME;
  if (opts.rate) a.playbackRate = opts.rate;
  const p = a.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
}

/**
 * Wire a one-shot pointerdown handler that starts the music. Call from both
 * dev (index.html) and prod (playable/entry.js) bootstrap so audio kicks in
 * as soon as the player taps anywhere.
 * @param {HTMLElement} target
 */
export function installAudioOnFirstTap(target) {
  const arm = () => {
    startMusic();
    target.removeEventListener('pointerdown', arm);
  };
  target.addEventListener('pointerdown', arm);
}

export function isAudioReady() { return _audioReady; }
