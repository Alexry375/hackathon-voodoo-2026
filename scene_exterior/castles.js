// Render the exterior battlefield: background + BOTH castles in world coords.
// Camera (shared/camera.js) decides which castle is centered/zoomed.
// HP-driven tilt + low-HP darkening per castle. Damage chunking lives in vfx.js.

import { state } from '../shared/state.js';
import { WORLD } from '../shared/world.js';
import { getImage, isImageReady } from '../shared/assets.js';
import { drawBites } from './damage_overlay.js';

// Sourced from window.ASSETS data URIs (assets-inline.js) so the bundled
// single-file playable works without an http server.
export function loadCastleAssets() {
  // getImage is synchronous; warm the cache so isImageReady flips on quickly.
  try { getImage('BACKGROUND'); getImage('BLUE_CASTLE'); getImage('RED_CASTLE'); }
  catch (e) { console.warn('[castles] asset preload failed:', e); }
  return Promise.resolve();
}

export function castleAssetsReady() {
  return isImageReady('BACKGROUND') && isImageReady('BLUE_CASTLE') && isImageReady('RED_CASTLE');
}

/**
 * Draw the entire battlefield in world coordinates. Caller must already have
 * applied the camera transform (shared/camera.js applyCameraTransform).
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawWorld(ctx) {
  if (!castleAssetsReady()) return;
  _drawBackground(ctx);
  _drawCastle(ctx, 'blue', WORLD.blue_castle, state.hp_self_pct);
  drawBites(ctx, 'blue');
  _drawCastle(ctx, 'red',  WORLD.red_castle,  state.hp_enemy_pct);
  drawBites(ctx, 'red');
}

function _drawBackground(ctx) {
  const bg = getImage('BACKGROUND');
  // Background extended 30% wider than the battlefield to give the camera
  // breathing room when it follows projectiles past the castle pivots.
  // Anchored centered + ground line at ~85% of the bg's height.
  const bgW = WORLD.width * 1.3;
  const bgH = bgW * (bg.height / bg.width);
  const bgX = (WORLD.width - bgW) / 2;
  const bgY = WORLD.ground_y - bgH * 0.85;
  ctx.drawImage(bg, bgX, bgY, bgW, bgH);
}

/**
 * @param {'blue'|'red'} which
 * @param {{x:number, y:number}} pivot      world position of base center
 * @param {number} hp_pct
 */
function _drawCastle(ctx, which, pivot, hp_pct) {
  const castle = getImage(which === 'blue' ? 'BLUE_CASTLE' : 'RED_CASTLE');
  const castleH = WORLD.castle_h;
  const castleScale = castleH / castle.height;
  const castleW = castle.width * castleScale;

  const hpClamped = Math.max(0, Math.min(100, hp_pct));
  // Castles tilt AWAY from the impact direction (blue tilts left as it takes hits, red tilts right).
  const lean = (1 - hpClamped / 100) * (Math.PI / 180) * 22;
  const tilt = which === 'blue' ? -lean : lean;
  const darken = (1 - hpClamped / 100) * 0.35;

  const baseH    = Math.max(34, castleW * 0.10);
  const treadR   = Math.max(16, castleW * 0.06);
  const chenilleH = baseH + treadR * 1.1;

  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(tilt);

  _drawChenille(ctx, castleW, -chenilleH, baseH, treadR);
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

function _drawChenille(ctx, castleW, baseY, baseH, r) {
  const baseW = castleW * 1.05;
  const baseX = -baseW / 2;

  ctx.fillStyle = C_BASE_WOOD;  ctx.fillRect(baseX, baseY, baseW, baseH);
  ctx.fillStyle = C_BASE_LIGHT; ctx.fillRect(baseX + 3, baseY + 3, baseW - 6, Math.max(8, baseH * 0.25));

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
