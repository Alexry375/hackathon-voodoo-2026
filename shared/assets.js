// Lazy HTMLImageElement cache around window.ASSETS data URIs.
// assets-inline.js (loaded as a classic <script> in index.html) populates
// window.ASSETS = { CYCLOP: 'data:image/png;base64,...', ... } before this
// module runs, so getImage() is synchronous from the caller's POV — the
// returned <img> may not be `complete` yet on the very first call but
// drawImage() with an incomplete image is a silent no-op, and the next
// frame will paint it. Good enough for our 60fps render loop.

/** @type {Record<string, HTMLImageElement>} */
const _cache = {};

/**
 * @param {string} name e.g. 'CYCLOP', 'SKELETON', 'ORC', 'BLUE_CASTLE'
 * @returns {HTMLImageElement}
 */
export function getImage(name) {
  if (_cache[name]) return _cache[name];
  const src = /** @type {any} */ (window).ASSETS?.[name];
  if (!src) throw new Error(`asset missing: ${name} (window.ASSETS not loaded?)`);
  const img = new Image();
  img.src = src;
  _cache[name] = img;
  return img;
}

/**
 * Same as getImage but returns null when the asset key is missing instead of
 * throwing. Used by optional assets (e.g. damage-tier sprites).
 * @param {string} name
 * @returns {HTMLImageElement | null}
 */
export function tryGetImage(name) {
  if (_cache[name]) return _cache[name];
  const src = /** @type {any} */ (window).ASSETS?.[name];
  if (!src) return null;
  const img = new Image();
  img.src = src;
  _cache[name] = img;
  return img;
}

/** @param {string} name */
export function isImageReady(name) {
  const img = _cache[name];
  return !!img && img.complete && img.naturalWidth > 0;
}
