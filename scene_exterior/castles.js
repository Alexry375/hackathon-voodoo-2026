// Render the exterior battlefield: background + BOTH castles in world coords.
// Castles are drawn via castle_section.js (vector art) rather than PNGs.
// Camera (shared/camera.js) decides which castle is centered/zoomed.

import { state } from '../shared/state.js';
import { WORLD } from '../shared/world.js';
import { getImage, tryGetImage, isImageReady } from '../shared/assets.js';
import { drawEraserBites } from './damage_overlay.js';
import { drawCastleSection, getFloorAnchor, NATIVE_HEIGHT } from '../scene_interior/castle_section.js';
import { drawUnits } from '../scene_interior/units.js';
import { drawRipStones } from '../scene_interior/rip.js';
import { getActiveFloor } from '../scene_interior/turn.js';

export function loadCastleAssets() {
  try { getImage('BACKGROUND'); } catch (e) { console.warn('[castles] asset preload failed:', e); }
  for (const k of ['CASTLE_75', 'CASTLE_50', 'CASTLE_25']) tryGetImage(k);
  return Promise.resolve();
}

export function castleAssetsReady() {
  return isImageReady('BACKGROUND');
}

// ─── Content bounding-box normalisation for damage PNGs ───────────────────────
/** @type {Map<HTMLImageElement, {minY:number, contentH:number}>} */
const _contentBounds = new Map();

function _getContentBounds(img) {
  if (_contentBounds.has(img)) return _contentBounds.get(img);
  let bounds;
  try {
    const tmp = document.createElement('canvas');
    tmp.width = img.naturalWidth; tmp.height = img.naturalHeight;
    tmp.getContext('2d').drawImage(img, 0, 0);
    const data = tmp.getContext('2d').getImageData(0, 0, tmp.width, tmp.height).data;
    let minY = tmp.height, maxY = 0;
    for (let y = 0; y < tmp.height; y++)
      for (let x = 0; x < tmp.width; x++)
        if (data[(y * tmp.width + x) * 4 + 3] > 8) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
    bounds = maxY >= minY ? { minY, contentH: maxY - minY + 1 } : { minY: 0, contentH: img.naturalHeight };
  } catch (_) { bounds = { minY: 0, contentH: img.naturalHeight }; }
  _contentBounds.set(img, bounds);
  return bounds;
}

/** Pick the damage PNG for the current HP tier, or null if none available. */
function _damagePng(hp_pct) {
  let key = null;
  if      (hp_pct <= 25) key = 'CASTLE_25';
  else if (hp_pct <= 50) key = 'CASTLE_50';
  else if (hp_pct <= 75) key = 'CASTLE_75';
  if (!key) return null;
  const img = tryGetImage(key);
  return (img && img.complete && img.naturalWidth > 0) ? img : null;
}

// Scale factor: map interior native coords → world coords.
const WORLD_SCALE = WORLD.castle_h / NATIVE_HEIGHT;

/** HP → damage_level for drawCastleSection. */
function _damageLevel(hp_pct) {
  if (hp_pct >= 70) return 0;
  if (hp_pct >= 50) return 1;
  if (hp_pct >= 30) return 2;
  return 3;
}

/** HP → tilt in degrees (blue tilts left, red right). */
function _tiltDeg(which, hp_pct) {
  const lean = (1 - Math.max(0, Math.min(100, hp_pct)) / 100) * 22;
  return which === 'blue' ? -lean : lean;
}

/**
 * Draw the entire battlefield in world coordinates. Caller must already have
 * applied the camera transform (shared/camera.js applyCameraTransform).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t  seconds (for unit animation bob)
 */
export function drawWorld(ctx, t = 0) {
  if (!castleAssetsReady()) return;
  _drawBackground(ctx);
  _drawCastleVector(ctx, 'blue', WORLD.blue_castle, state.hp_self_pct, t);
  drawEraserBites(ctx, 'blue');
  _drawCastleVector(ctx, 'red',  WORLD.red_castle,  state.hp_enemy_pct, t);
  drawEraserBites(ctx, 'red');
}

function _drawBackground(ctx) {
  const bg = getImage('BACKGROUND');
  const bgW = WORLD.width * 1.3;
  const bgH = bgW * (bg.height / bg.width);
  const bgX = (WORLD.width - bgW) / 2;
  const bgY = WORLD.ground_y - bgH * 0.85;
  ctx.drawImage(bg, bgX, bgY, bgW, bgH);
}

/**
 * Draw one castle + units + gravestones in world space.
 * Blue: full interior cross-section (playable side). Red: simple exterior silhouette.
 * Arrow is drawn before units so it is z-ordered behind characters.
 * @param {'blue'|'red'} which
 * @param {{x:number, y:number}} pivot
 * @param {number} hp_pct
 * @param {number} t  seconds
 */
function _drawCastleVector(ctx, which, pivot, hp_pct, t) {
  const wx = pivot.x, wy = pivot.y;

  if (which === 'red') {
    _drawRedCastle(ctx, wx, wy, hp_pct);
    return;
  }

  // Blue castle — full interior cross-section.
  const tilt_deg     = _tiltDeg('blue', hp_pct);
  const damage_level = _damageLevel(hp_pct);
  drawCastleSection(ctx, { tilt_deg, damage_level }, wx, wy, WORLD_SCALE);
  // Arrow first → z-ordered under the unit sprites.
  _drawFloorArrow(ctx, t, wx, wy, WORLD_SCALE);
  drawUnits(ctx, t, wx, wy, WORLD_SCALE, state.units);
  drawRipStones(ctx, wx, wy, WORLD_SCALE, state.units);
}

/**
 * Red castle: damage PNG sprite when HP <= 75, simple vector fortress otherwise.
 * Drawn mirrored (faces left) in both cases.
 */
function _drawRedCastle(ctx, wx, wy, hp_pct) {
  const png = _damagePng(hp_pct);
  if (png) {
    _drawRedCastlePng(ctx, wx, wy, hp_pct, png);
  } else {
    _drawRedCastleVector(ctx, wx, wy, hp_pct);
  }
}

function _drawRedCastlePng(ctx, wx, wy, hp_pct, img) {
  const castleH = WORLD.castle_h;
  const { minY: srcMinY, contentH } = _getContentBounds(img);
  const scale = castleH / contentH;
  const castleW = img.naturalWidth * scale;
  const hpC = Math.max(0, Math.min(100, hp_pct));
  const lean = (1 - hpC / 100) * (Math.PI / 180) * 22;
  const darken = (1 - hpC / 100) * 0.35;

  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(lean);
  // Mirror so red faces left (PNG is drawn facing right like the blue one).
  ctx.scale(-1, 1);

  ctx.drawImage(img, 0, srcMinY, img.naturalWidth, contentH,
                -castleW / 2, -castleH + 4, castleW, castleH);

  if (darken > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(0,0,0,${darken.toFixed(3)})`;
    ctx.fillRect(-castleW / 2, -castleH + 4, castleW, castleH);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

/** Simple vector fortress — used at full HP before any damage PNG is available. */
function _drawRedCastleVector(ctx, wx, wy, hp_pct) {
  const h   = WORLD.castle_h * 0.82;
  const w   = h * 0.62;
  const hpC = Math.max(0, Math.min(100, hp_pct));
  const lean = (1 - hpC / 100) * (Math.PI / 180) * 22;

  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(lean);
  // Mirror so it faces left.
  ctx.scale(-1, 1);

  const x = -w / 2, top = -h;

  ctx.fillStyle = '#28292E';
  ctx.fillRect(x, top, w, h);

  ctx.fillStyle = '#35383F';
  for (let r = 0; r < 8; r++) {
    const ry = top + r * (h / 8);
    for (let c = 0; c < 3; c++) {
      const bw = w / 3, shift = (r % 2) ? bw / 2 : 0;
      ctx.fillRect(x + c * bw - shift + 2, ry + 2, bw - 4, h / 8 - 4);
    }
  }

  const crenW = w / 7, crenH = h * 0.07;
  ctx.fillStyle = '#1A1C20';
  for (let i = 0; i < 4; i++) ctx.fillRect(x + i * crenW * 1.8, top - crenH, crenW, crenH);

  const spireW = w * 0.18, spireH = h * 0.28;
  ctx.fillStyle = '#1A1C20';
  ctx.beginPath();
  ctx.moveTo(x + spireW / 2, top - spireH);
  ctx.lineTo(x, top); ctx.lineTo(x + spireW, top);
  ctx.closePath(); ctx.fill();

  const gx = x + w * 0.55, gh = h * 0.28, gw = w * 0.22;
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(gx, 0); ctx.lineTo(gx, -gh + gw / 2);
  ctx.arc(gx + gw / 2, -gh + gw / 2, gw / 2, Math.PI, 0, false);
  ctx.lineTo(gx + gw, 0); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#111';
  for (let i = 0; i < 2; i++)
    ctx.fillRect(x + w * (0.18 + i * 0.5), top + h * 0.25, w * 0.10, h * 0.15);

  ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
  ctx.strokeRect(x, top, w, h);
  ctx.restore();
}

const _ARW_BASE_W = 46;
const _ARW_TRI_H  = 50;
const _ARW_CLEAR  = 80;
const _ARW_AMP    = 5;

/**
 * Draw the active-floor arrow in world coords (called before drawUnits so it sits behind sprites).
 */
function _drawFloorArrow(ctx, t, wx, wy, worldScale) {
  const f = getActiveFloor();
  if (f === null) return;
  const a = getFloorAnchor(f, wx, wy, worldScale);
  if (!a) return;
  const bob = Math.sin(t * 2 * Math.PI * 1.0) * _ARW_AMP * worldScale;
  const cx   = a.x;
  const tipY = a.y - _ARW_CLEAR * worldScale + bob;
  const topY = tipY - _ARW_TRI_H * worldScale;
  const hw   = _ARW_BASE_W * worldScale / 2;

  ctx.save();
  // Shadow.
  ctx.beginPath();
  ctx.moveTo(cx - hw + 2, topY + 2);
  ctx.lineTo(cx + hw + 2, topY + 2);
  ctx.lineTo(cx + 2, tipY + 2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fill();
  // Arrow.
  ctx.beginPath();
  ctx.moveTo(cx - hw, topY);
  ctx.lineTo(cx + hw, topY);
  ctx.lineTo(cx, tipY);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * worldScale;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();
}
