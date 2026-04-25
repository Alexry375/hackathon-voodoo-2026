// Render the castle compound (player or enemy) for the exterior view.
// Stateless: caller passes hp + which side; we draw background + castle with HP-driven tilt.
// Damage chunking / cracks live in vfx.js (overlay), not here.

const ASSET_BASE = 'assets/Castle Clashers Assets/';

/** @type {{ bg: HTMLImageElement, blue: HTMLImageElement, red: HTMLImageElement } | null} */
let imgs = null;
/** @type {Promise<void> | null} */
let loadPromise = null;

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`failed to load ${src}`));
    im.src = src;
  });
}

export function loadCastleAssets() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([
    loadImg(ASSET_BASE + 'Background.png'),
    loadImg(ASSET_BASE + 'Blue Castle.png'),
    loadImg(ASSET_BASE + 'Red Castle.png'),
  ]).then(([bg, blue, red]) => { imgs = { bg, blue, red }; });
  return loadPromise;
}

export function castleAssetsReady() { return imgs !== null; }

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ which: 'blue' | 'red',
 *           hp_pct: number,                 // 0..100
 *           viewport: { w: number, h: number } }} opts
 */
export function drawCastles(ctx, { which, hp_pct, viewport }) {
  if (!imgs) return;

  const { w, h } = viewport;

  // Background: 5084x1830 panorama → cover the canvas, anchor ground line ~75% from top.
  const bg = imgs.bg;
  const bgScale = Math.max(w / bg.width, h / bg.height);
  const bgW = bg.width * bgScale;
  const bgH = bg.height * bgScale;
  const bgX = (w - bgW) / 2;
  const bgY = h * 0.78 - bgH * 0.65;
  ctx.drawImage(bg, bgX, bgY, bgW, bgH);

  // Castle: 731x958 → scale so castle height ≈ 60% of canvas.
  const castle = which === 'blue' ? imgs.blue : imgs.red;
  const castleH = h * 0.60;
  const castleScale = castleH / castle.height;
  const castleW = castle.width * castleScale;

  // Pivot at the base center (tank-tread anchor) so tilt rotates from the ground.
  const pivotX = w / 2;
  const pivotY = h * 0.78;

  // HP → tilt: full HP = upright; 0% = ~22° lean (lean direction = which side you're on).
  const hpClamped = Math.max(0, Math.min(100, hp_pct));
  const lean = (1 - hpClamped / 100) * (Math.PI / 180) * 22;
  const tilt = which === 'blue' ? lean : -lean;

  // Low-HP darkening (not a damage texture — that lives in vfx.js eventually).
  const darken = (1 - hpClamped / 100) * 0.35;

  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(tilt);
  ctx.drawImage(castle, -castleW / 2, -castleH, castleW, castleH);

  if (darken > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(0,0,0,${darken.toFixed(3)})`;
    ctx.fillRect(-castleW / 2, -castleH, castleW, castleH);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}
