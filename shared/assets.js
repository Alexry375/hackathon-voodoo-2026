// Lazy HTMLImageElement cache around window.ASSETS data URIs.
// assets-inline.js (loaded as a classic <script> in index.html) populates
// window.ASSETS = { CYCLOP: 'data:image/png;base64,...', ... } before this
// module runs. window.ASSET_URLS = { KEY: './path.png', ... } is a secondary
// lookup for loose files not yet embedded (falls back gracefully).

/** @type {Record<string, HTMLImageElement>} */
const _cache = {};

/**
 * @param {string} name e.g. 'CYCLOP', 'SKELETON', 'ORC', 'BLUE_CASTLE'
 * @returns {HTMLImageElement}
 */
export function getImage(name) {
  if (_cache[name]) return _cache[name];
  const w = /** @type {any} */ (window);
  const src = w.ASSETS?.[name] ?? w.ASSET_URLS?.[name];
  if (!src) throw new Error(`asset missing: ${name}`);
  const img = new Image();
  img.src = src;
  _cache[name] = img;
  return img;
}

/**
 * Like getImage but returns null instead of throwing when the asset is absent.
 * @param {string} name
 * @returns {HTMLImageElement | null}
 */
export function tryGetImage(name) {
  try { return getImage(name); } catch (_) { return null; }
}

/** @param {string} name */
export function isImageReady(name) {
  const img = _cache[name];
  return !!img && img.complete && img.naturalWidth > 0;
}
