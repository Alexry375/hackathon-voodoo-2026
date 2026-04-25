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

  // Wooden base + tank treads ("chenille") sit AT pivotY (ground line). Castle
  // PNG is shifted up by the chenille height so it sits ON TOP of the cradle,
  // not floating above it. Ported from Alexis's interior castle_section.js.
  const baseH   = Math.max(34, castleW * 0.10);
  const treadR  = Math.max(16, castleW * 0.06);
  const chenilleH = baseH + treadR * 1.1;

  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(tilt);

  // chenille: base from y = -chenilleH to y = -treadR*1.1, then treads down to ~0
  drawChenille(ctx, castleW, -chenilleH, baseH, treadR);

  // castle stones sit on top of the wooden base
  ctx.drawImage(castle, -castleW / 2, -castleH - chenilleH + 4, castleW, castleH);

  if (darken > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(0,0,0,${darken.toFixed(3)})`;
    ctx.fillRect(-castleW / 2, -castleH - chenilleH + 4, castleW, castleH);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

const C_BASE_WOOD  = '#8B5E3C';
const C_BASE_LIGHT = '#A07040';
const C_ARCH       = '#3a2410';
const C_TREAD      = '#2A2A2A';
const C_GEAR       = '#7C7368';
const C_OUTLINE    = '#1a1208';

// Draws the wooden cradle + tank treads. Caller is at (pivotX, pivotY) with
// pivotY = ground line (treads bottom). Base top sits at y = baseY (negative).
function drawChenille(ctx, castleW, baseY, baseH, r) {
  const baseW = castleW * 1.05;
  const baseX = -baseW / 2;

  // wooden plank
  ctx.fillStyle = C_BASE_WOOD;  ctx.fillRect(baseX, baseY, baseW, baseH);
  ctx.fillStyle = C_BASE_LIGHT; ctx.fillRect(baseX + 3, baseY + 3, baseW - 6, Math.max(8, baseH * 0.25));

  // 2 dark archways (game has them)
  ctx.fillStyle = C_ARCH;
  for (let i = 0; i < 2; i++) {
    const ax = baseX + baseW * (0.18 + i * 0.46);
    const aw = baseW * 0.18;
    ctx.beginPath();
    ctx.moveTo(ax, baseY + baseH);
    ctx.lineTo(ax, baseY + baseH * 0.45);
    ctx.arc(ax + aw / 2, baseY + baseH * 0.45, aw / 2, Math.PI, 0, false);
    ctx.lineTo(ax + aw, baseY + baseH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = C_OUTLINE; ctx.lineWidth = 3;
  ctx.strokeRect(baseX, baseY, baseW, baseH);

  // tank treads — connector strip + 2 gear wheels
  const treadY = baseY + baseH;
  ctx.fillStyle = C_TREAD;
  ctx.fillRect(baseX + 18, treadY - 4, baseW - 36, r * 0.7);
  for (const cx of [baseX + baseW * 0.18, baseX + baseW * 0.82]) {
    ctx.fillStyle = C_TREAD;
    ctx.beginPath(); ctx.arc(cx, treadY + r * 0.2, r,        0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C_GEAR;
    ctx.beginPath(); ctx.arc(cx, treadY + r * 0.2, r - 7,    0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C_TREAD;
    ctx.beginPath(); ctx.arc(cx, treadY + r * 0.2, r - 14,   0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C_OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, treadY + r * 0.2, r,        0, Math.PI * 2); ctx.stroke();
  }
}
