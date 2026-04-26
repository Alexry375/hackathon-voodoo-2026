// Render the exterior battlefield: background + BOTH castles in world coords.
// Camera (shared/camera.js) decides which castle is centered/zoomed.
// HP-driven tilt + low-HP darkening per castle. Damage chunking lives in vfx.js.
// Background is drawn procedurally (no image asset) — overcast jungle/forest scene.

import { state } from '../shared/state.js';
import { WORLD } from '../shared/world.js';
import { getImage, isImageReady } from '../shared/assets.js';
import { drawBites } from './damage_overlay.js';

// Sourced from window.ASSETS data URIs (assets-inline.js) so the bundled
// single-file playable works without an http server.
// BACKGROUND is no longer an asset — the background is drawn procedurally.
export function loadCastleAssets() {
  // getImage is synchronous; warm the cache so isImageReady flips on quickly.
  try { getImage('BLUE_CASTLE'); getImage('RED_CASTLE'); getImage('CHENILLE'); }
  catch (e) { console.warn('[castles] castle asset preload failed:', e); }
  return Promise.resolve();
}

// Only the castle sprites are required; background is always procedural.
export function castleAssetsReady() {
  return isImageReady('BLUE_CASTLE') && isImageReady('RED_CASTLE');
}

/**
 * Draw the entire battlefield in world coordinates. Caller must already have
 * applied the camera transform (shared/camera.js applyCameraTransform).
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawWorld(ctx) {
  _drawBackground(ctx);
  _drawCastle(ctx, 'blue', WORLD.blue_castle, state.hp_self_pct);
  drawBites(ctx, 'blue');
  _drawCastle(ctx, 'red',  WORLD.red_castle,  state.hp_enemy_pct);
  drawBites(ctx, 'red');
}

// ---------------------------------------------------------------------------
// Procedural sunny jungle background — no image asset required.
//
// Colour palette (matching source game reference frames):
//   Sky top    #9EC8E8   Sky mid  #B8D8F0   Sky horizon  #D4EEC0
//   Back hill  #7EB87A   Treeline #5A9E62   Front tree   #3E7A48
//   Grass      #72B855   Ground   #7A2A1A → #5A1A0A (red-brown clay)
//
// All proportions are driven by WORLD constants.
// Extends slightly outside world bounds (±150px) so camera pans never expose
// a blank edge.
// ---------------------------------------------------------------------------

/**
 * Draw a smooth hill silhouette as a series of bezier humps from x0 to x1.
 * Caller must call ctx.beginPath() + ctx.moveTo(x0, GY) before, lineTo+closePath+fill after.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x0 @param {number} x1
 * @param {number} peakMin @param {number} peakMax  Y range for hill tops (smaller Y = higher)
 * @param {number} humps   number of hills across the width
 * @param {number} seed    deterministic offset for variety
 */
function _jungleHillPath(ctx, x0, x1, peakMin, peakMax, humps, seed) {
  const step = (x1 - x0) / humps;
  let px = x0;
  for (let i = 0; i < humps; i++) {
    const nx = px + step;
    const midX = px + step / 2;
    // pseudo-random but deterministic peak height
    const t = (Math.sin(seed + i * 2.3) * 0.5 + 0.5);
    const peakY = peakMin + t * (peakMax - peakMin);
    ctx.quadraticCurveTo(midX, peakY, nx, peakMax + (Math.sin(seed + i * 1.7) * 0.3 + 0.5) * (peakMin - peakMax) * 0.4);
    px = nx;
  }
}

/**
 * Draw a row of rounded tropical tree crown blobs along the treeline.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} groundY
 * @param {number} x0 @param {number} x1
 * @param {number} heightFrac  0–1: how far up the tree canopy sits (higher = further down)
 */
function _drawRoundedTreeCanopy(ctx, groundY, x0, x1, heightFrac) {
  const baseY = groundY - 60 + heightFrac * 120;
  const spacing = heightFrac < 0.8 ? 70 : 54;
  const offset = heightFrac < 0.8 ? 0 : 27;
  for (let tx = x0 + offset; tx < x1; tx += spacing) {
    const s = Math.sin(tx * 0.031 + heightFrac * 4) * 0.5 + 0.5;
    const crownR  = 44 + s * 38;
    const crownY  = baseY - 40 - s * 80;
    // Elliptical crown — slightly wider than tall for tropical canopy feel.
    ctx.beginPath();
    ctx.ellipse(tx, crownY, crownR * 1.15, crownR * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    // Second overlapping blob for fullness.
    const crownR2 = crownR * 0.72;
    ctx.beginPath();
    ctx.ellipse(tx + crownR * 0.5, crownY + crownR * 0.15, crownR2, crownR2 * 0.8, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function _drawBackground(ctx) {
  const W  = WORLD.width;    // 1400
  const H  = WORLD.height;   // 960
  const GY = WORLD.ground_y; // 760

  const BLEED = 800;

  // --- Sky gradient: pale olive-green → minty teal (source palette Q9) ---
  const sky = ctx.createLinearGradient(0, -BLEED, 0, GY);
  sky.addColorStop(0,    '#C6D4B2');
  sky.addColorStop(1,    '#A2CDAF');
  ctx.fillStyle = sky;
  ctx.fillRect(-BLEED, -BLEED, W + BLEED * 2, GY + BLEED);

  // --- Cartoony cloud blobs near the top ---
  _drawClouds(ctx, -BLEED, W + BLEED);

  // --- Layer 1: distant rolling hills (lightest, grayish-teal) ---
  ctx.fillStyle = '#8EBFA1';
  ctx.beginPath();
  ctx.moveTo(-BLEED, GY);
  _jungleHillPath(ctx, -BLEED, W + BLEED, GY - 290, GY - 200, 7, 0);
  ctx.lineTo(W + BLEED, GY);
  ctx.closePath();
  ctx.fill();

  // --- Layer 2: mid jungle silhouettes (medium teal-green) ---
  ctx.fillStyle = '#549C89';
  ctx.beginPath();
  ctx.moveTo(-BLEED, GY);
  _jungleHillPath(ctx, -BLEED, W + BLEED, GY - 220, GY - 130, 9, 42);
  ctx.lineTo(W + BLEED, GY);
  ctx.closePath();
  ctx.fill();
  // Tree crowns sitting on mid layer.
  _drawRoundedTreeCanopy(ctx, GY, -BLEED, W + BLEED, 0.72);

  // --- Layer 3: foreground darkest teal landmass with bushes ---
  ctx.fillStyle = '#317C6B';
  ctx.beginPath();
  ctx.moveTo(-BLEED, GY);
  _jungleHillPath(ctx, -BLEED, W + BLEED, GY - 150, GY - 70, 11, 17);
  ctx.lineTo(W + BLEED, GY);
  ctx.closePath();
  ctx.fill();
  _drawRoundedTreeCanopy(ctx, GY, -BLEED, W + BLEED, 0.88);

  // --- Grass + earth (source: thin grass strip, dominant red-brown earth below) ---
  // Verified against clip2_0001 / clip2_0046: grass is a thin ~18px band; the
  // visible foreground below it is entirely red-brown maroon earth.
  ctx.fillStyle = '#6EB05B';
  ctx.fillRect(-BLEED, GY - 6, W + BLEED * 2, 22);
  // Lighter highlight along top edge
  ctx.fillStyle = '#96CD65';
  _drawWavyBand(ctx, -BLEED, W + BLEED, GY - 6, 4, 36, 0.04);
  // Dark olive separator line
  ctx.fillStyle = '#334626';
  ctx.fillRect(-BLEED, GY + 16, W + BLEED * 2, 3);
  // Dominant red-brown earth gradient — fills the rest of the screen down.
  const earth = ctx.createLinearGradient(0, GY + 19, 0, H + BLEED);
  earth.addColorStop(0,    '#7A2A1A');
  earth.addColorStop(0.45, '#552219');
  earth.addColorStop(1,    '#2D100F');
  ctx.fillStyle = earth;
  ctx.fillRect(-BLEED, GY + 19, W + BLEED * 2, H - GY - 19 + BLEED);
}

/** Pseudo-random but deterministic puffy clouds along a horizontal band. */
function _drawClouds(ctx, x0, x1) {
  ctx.save();
  ctx.fillStyle = '#E0E6C0';
  const clouds = [
    { x: x0 + 240, y: 90,  r: 32 },
    { x: x0 + 620, y: 60,  r: 26 },
    { x: x0 + 1000, y: 110, r: 36 },
    { x: x0 + 1380, y: 75,  r: 28 },
    { x: x0 + 1780, y: 100, r: 34 },
  ];
  for (const c of clouds) {
    if (c.x < x0 || c.x > x1) continue;
    // Three overlapping circles per cloud.
    ctx.beginPath();
    ctx.arc(c.x - c.r * 0.7, c.y, c.r * 0.7, 0, Math.PI * 2);
    ctx.arc(c.x,             c.y - c.r * 0.2, c.r, 0, Math.PI * 2);
    ctx.arc(c.x + c.r * 0.8, c.y, c.r * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Fill a thin wavy band of `bandH` px tall along [x0..x1] at baseline `y`. */
function _drawWavyBand(ctx, x0, x1, y, bandH, period, amp) {
  ctx.beginPath();
  ctx.moveTo(x0, y);
  for (let x = x0; x <= x1; x += period / 4) {
    const dy = Math.sin(x * amp) * 3;
    ctx.lineTo(x, y + dy);
  }
  ctx.lineTo(x1, y + bandH);
  ctx.lineTo(x0, y + bandH);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw chenille using the CHENILLE sprite. Returns true on success, false if
 * the image is not yet ready (caller should fall back to procedural).
 */
function _drawChenilleSprite(ctx, castleW, baseY, baseH, r) {
  if (!isImageReady('CHENILLE')) { getImage('CHENILLE'); return false; }
  const img = getImage('CHENILLE');
  // The sprite shows the full tread assembly. Scale to match castleW.
  const spriteAspect = img.width / img.height;
  const drawW = castleW * 1.05;
  const drawH = drawW / spriteAspect;
  ctx.drawImage(img, -drawW / 2, baseY - drawH * 0.15, drawW, drawH);
  return true;
}

/**
 * @param {'blue'|'red'} which
 * @param {{x:number, y:number}} pivot      world position of base center
 * @param {number} hp_pct
 */
function _drawCastle(ctx, which, pivot, hp_pct) {
  const imgKey = which === 'blue' ? 'BLUE_CASTLE' : 'RED_CASTLE';
  const castleH = WORLD.castle_h;

  // Compute castleW — from image if ready, else use a sensible default ratio.
  let castleW;
  if (isImageReady(imgKey)) {
    const castle = getImage(imgKey);
    castleW = castle.width * (castleH / castle.height);
  } else {
    castleW = castleH * 0.6; // fallback aspect ratio matches source sprite
  }

  const hpClamped = Math.max(0, Math.min(100, hp_pct));
  // Verified against frames clip2_0001 (upright at full HP) and clip2_0046
  // (blue leans LEFT/away-from-enemy, red leans RIGHT/away-from-enemy).
  const lean = (1 - hpClamped / 100) * (Math.PI / 180) * 25;
  const tilt = which === 'blue' ? -lean : lean;
  const darken = (1 - hpClamped / 100) * 0.35;

  const baseH     = Math.max(34, castleW * 0.10);
  const treadR    = Math.max(16, castleW * 0.06);
  const chenilleH = baseH + treadR * 1.1;

  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(tilt);

  if (!_drawChenilleSprite(ctx, castleW, -chenilleH, baseH, treadR)) {
    _drawChenille(ctx, castleW, -chenilleH, baseH, treadR);
  }

  if (isImageReady(imgKey)) {
    const castle = getImage(imgKey);
    ctx.drawImage(castle, -castleW / 2, -castleH - chenilleH + 4, castleW, castleH);
  } else {
    _drawCastleProc(ctx, which, castleW, castleH, hpClamped, chenilleH);
  }

  if (darken > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(0,0,0,${darken.toFixed(3)})`;
    ctx.fillRect(-castleW / 2, -castleH - chenilleH + 4, castleW, castleH);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Procedural castle renderer — used when sprite assets are not yet loaded.
// Draws a multi-story stone keep with two flanking towers, battlements,
// stone-bond texture, cannon ports, and a gate arch.
// Coordinate origin: caller has already translated to pivot (base center) and
// applied the hp tilt. The top-left of the castle bounding box sits at
// (-castleW/2, -castleH - chenilleH + 4).
// ---------------------------------------------------------------------------

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {'blue'|'red'} which
 * @param {number} castleW
 * @param {number} castleH
 * @param {number} hp_pct   0–100
 * @param {number} chenilleH  height of the tread base below pivot
 */
function _drawCastleProc(ctx, which, castleW, castleH, hp_pct, chenilleH) {
  // Base palette — dark stone.
  const C_STONE    = which === 'blue' ? '#252838' : '#2E2428';
  const C_STONE2   = which === 'blue' ? '#2A2D42' : '#33292C'; // keep body (slightly lighter)
  const C_MORTAR   = which === 'blue' ? '#1A1828' : '#1E1518'; // mortar lines
  const C_BATTLEMENT = which === 'blue' ? '#202035' : '#281820';
  const C_SHADOW   = 'rgba(0,0,0,0.35)';
  const C_GATE     = '#0d0b10';
  const C_PORT     = '#0d0b10';

  // Layout proportions.
  const towerW   = castleW * 0.28;
  const keepW    = castleW * 0.52;
  const towerH   = castleH * 0.80;
  const keepH    = castleH;
  const merlon   = 20;          // battlement notch width
  const crenH    = 18;          // battlement height

  // Anchor: top-left of the whole castle bounding box.
  const ox = -castleW / 2;
  const oy = -castleH - chenilleH + 4;

  // Horizontal positions of each section.
  const leftTowerX  = ox;
  const keepX       = ox + towerW;
  const rightTowerX = ox + towerW + keepW;

  // Vertical base of each section (bottom edge touches chenille top).
  const groundY = oy + castleH;   // == -chenilleH + 4  relative to pivot

  const leftTowerTop  = groundY - towerH;
  const rightTowerTop = groundY - towerH;
  const keepTop       = groundY - keepH;   // == oy

  // --- Helper: fill rounded-top rect ---
  function fillRect(x, y, w, h) {
    ctx.fillRect(x, y, w, h);
  }

  // === LEFT TOWER ===
  ctx.fillStyle = C_STONE;
  fillRect(leftTowerX, leftTowerTop, towerW, towerH);
  _drawStoneTexture(ctx, leftTowerX, leftTowerTop, towerW, towerH, C_MORTAR);
  _drawShadowEdge(ctx, leftTowerX + towerW - 6, leftTowerTop, 6, towerH, C_SHADOW);
  _drawBattlements(ctx, leftTowerX, leftTowerTop - crenH, towerW, crenH, merlon, C_BATTLEMENT, C_MORTAR);
  _drawCannonPort(ctx, leftTowerX + towerW * 0.5, leftTowerTop + towerH * 0.40, C_PORT, which);

  // === RIGHT TOWER ===
  ctx.fillStyle = C_STONE;
  fillRect(rightTowerX, rightTowerTop, towerW, towerH);
  _drawStoneTexture(ctx, rightTowerX, rightTowerTop, towerW, towerH, C_MORTAR);
  _drawShadowEdge(ctx, rightTowerX, rightTowerTop, 6, towerH, C_SHADOW);
  _drawBattlements(ctx, rightTowerX, rightTowerTop - crenH, towerW, crenH, merlon, C_BATTLEMENT, C_MORTAR);
  _drawCannonPort(ctx, rightTowerX + towerW * 0.5, rightTowerTop + towerH * 0.40, C_PORT, which);

  // === MAIN KEEP ===
  ctx.fillStyle = C_STONE2;
  fillRect(keepX, keepTop, keepW, keepH);
  _drawStoneTexture(ctx, keepX, keepTop, keepW, keepH, C_MORTAR);
  _drawBattlements(ctx, keepX, keepTop - crenH, keepW, crenH, merlon, C_BATTLEMENT, C_MORTAR);

  // Keep: a narrow window slit in upper center.
  const slitW = Math.max(6, keepW * 0.07);
  const slitH = keepH * 0.12;
  const slitX = keepX + keepW / 2 - slitW / 2;
  const slitY = keepTop + keepH * 0.18;
  ctx.fillStyle = C_GATE;
  _drawArch(ctx, slitX, slitY, slitW, slitH);

  // Keep: gate arch at the base center.
  const gateW = keepW * 0.42;
  const gateH = keepH * 0.28;
  const gateX = keepX + keepW / 2 - gateW / 2;
  const gateY = groundY - gateH;
  ctx.fillStyle = C_GATE;
  _drawArch(ctx, gateX, gateY, gateW, gateH);

  // Portcullis bars (dark vertical lines inside gate).
  const barCount = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth   = 2;
  for (let i = 1; i < barCount; i++) {
    const bx = gateX + (gateW / barCount) * i;
    ctx.beginPath();
    ctx.moveTo(bx, gateY + gateH * 0.15);
    ctx.lineTo(bx, groundY);
    ctx.stroke();
  }
  // Horizontal crossbar.
  ctx.beginPath();
  ctx.moveTo(gateX, gateY + gateH * 0.5);
  ctx.lineTo(gateX + gateW, gateY + gateH * 0.5);
  ctx.stroke();

  // Outline the whole castle body.
  ctx.strokeStyle = C_MORTAR;
  ctx.lineWidth   = 2;
  ctx.strokeRect(leftTowerX, leftTowerTop, towerW, towerH);
  ctx.strokeRect(keepX, keepTop, keepW, keepH);
  ctx.strokeRect(rightTowerX, rightTowerTop, towerW, towerH);
}

/**
 * Draw alternating merlons (raised) and crenels (gaps) along the top of a wall.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x        left edge of wall
 * @param {number} y        top of battlement row (merlons extend upward from here)
 * @param {number} w        wall width
 * @param {number} h        merlon height
 * @param {number} merlon   width of one merlon (gap = same)
 * @param {string} fill
 * @param {string} outline
 */
function _drawBattlements(ctx, x, y, w, h, merlon, fill, outline) {
  const count = Math.floor(w / (merlon * 2));
  const pitch = w / count;
  const mW    = pitch * 0.55;
  for (let i = 0; i < count; i++) {
    const mx = x + i * pitch + (pitch - mW) / 2;
    ctx.fillStyle = fill;
    ctx.fillRect(mx, y, mW, h);
    ctx.strokeStyle = outline;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(mx, y, mW, h);
  }
}

/**
 * Fill horizontal mortar lines + staggered vertical seams (running bond).
 */
function _drawStoneTexture(ctx, x, y, w, h, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1;
  const courseH = 30;
  const brickW  = 40;

  // Horizontal bed joints.
  for (let cy = y + courseH; cy < y + h; cy += courseH) {
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x + w, cy);
    ctx.stroke();
  }

  // Vertical perpend joints, offset every other course (running bond).
  let row = 0;
  for (let cy = y; cy < y + h; cy += courseH, row++) {
    const offset = (row % 2 === 0) ? 0 : brickW / 2;
    for (let bx = x + offset; bx < x + w; bx += brickW) {
      const jh = Math.min(courseH, y + h - cy);
      ctx.beginPath();
      ctx.moveTo(bx, cy);
      ctx.lineTo(bx, cy + jh);
      ctx.stroke();
    }
  }
}

/**
 * Dark oval cannon port with a subtle tint glow matching the castle team color.
 */
function _drawCannonPort(ctx, cx, cy, fill, which) {
  const rx = 20;
  const ry = 14;

  // Outer stone surround.
  ctx.fillStyle = which === 'blue' ? '#1e2235' : '#251820';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + 5, ry + 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark opening.
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle muzzle glow.
  const glowColor = which === 'blue' ? 'rgba(80,120,220,0.25)' : 'rgba(200,60,60,0.25)';
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.55, ry * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a simple arch shape: rectangular body + semicircular top.
 * Caller sets ctx.fillStyle before calling.
 */
function _drawArch(ctx, x, y, w, h) {
  const r = w / 2;
  const archTopY = y + r;       // center of the semicircle

  ctx.beginPath();
  ctx.arc(x + r, archTopY, r, Math.PI, 0); // top semicircle
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
}

/**
 * Thin shadow strip on the inner vertical edge of each tower where it meets the keep.
 */
function _drawShadowEdge(ctx, x, y, w, h, color) {
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

// ---------------------------------------------------------------------------
// Tank tread / chenille — unchanged from original.
// ---------------------------------------------------------------------------

const C_BASE_WOOD  = '#8B5E3C';
const C_BASE_LIGHT = '#A07040';
const C_ARCH       = '#3a2410';
const C_TREAD      = '#2A2A2A';
const C_GEAR       = '#7C7368';
const C_OUTLINE    = '#1a1208';

function _drawChenille(ctx, castleW, baseY, baseH, r) {
  const baseW = castleW * 1.05;
  const baseX = -baseW / 2;
  const treadY = baseY + baseH;
  const trackH = r * 1.6;
  const trackY = treadY - trackH * 0.15;

  // Continuous track belt — rounded rectangle hugging the drive wheels.
  const sprocketL = baseX + r * 1.1;
  const sprocketR = baseX + baseW - r * 1.1;
  const sprocketCY = trackY + r * 0.5;
  ctx.fillStyle = C_TREAD;
  ctx.beginPath();
  ctx.arc(sprocketL, sprocketCY, r,        0, Math.PI * 2); // left sprocket hull
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sprocketR, sprocketCY, r,        0, Math.PI * 2); // right sprocket hull
  ctx.fill();
  // Track belt connecting both sprockets — top and bottom plates.
  ctx.fillRect(sprocketL, sprocketCY - r, sprocketR - sprocketL, r * 2);

  // Track link texture — dark notches along top and bottom.
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.5;
  const linkW = r * 0.65;
  for (let lx = sprocketL; lx <= sprocketR; lx += linkW) {
    ctx.beginPath(); ctx.moveTo(lx, sprocketCY - r); ctx.lineTo(lx, sprocketCY - r * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, sprocketCY + r * 0.5); ctx.lineTo(lx, sprocketCY + r); ctx.stroke();
  }

  // 4 road wheels between sprockets.
  const numWheels = 4;
  const wheelR = r * 0.52;
  const wheelCY = sprocketCY + r * 0.18;
  for (let i = 0; i < numWheels; i++) {
    const t = (i + 0.5) / numWheels;
    const wcx = sprocketL + (sprocketR - sprocketL) * t;
    ctx.fillStyle = C_GEAR;
    ctx.beginPath(); ctx.arc(wcx, wheelCY, wheelR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C_TREAD;
    ctx.beginPath(); ctx.arc(wcx, wheelCY, wheelR * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C_OUTLINE; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(wcx, wheelCY, wheelR, 0, Math.PI * 2); ctx.stroke();
  }

  // Sprocket detail — bolt ring.
  for (const scx of [sprocketL, sprocketR]) {
    ctx.fillStyle = C_GEAR;
    ctx.beginPath(); ctx.arc(scx, sprocketCY, r * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C_TREAD;
    ctx.beginPath(); ctx.arc(scx, sprocketCY, r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C_OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(scx, sprocketCY, r, 0, Math.PI * 2); ctx.stroke();
  }
}
