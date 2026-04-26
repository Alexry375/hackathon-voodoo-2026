# ==========================================
# DOSSIER : scene_interior
# ==========================================

## Fichier : scene_interior/aim.js
```javascript
/**
 * Drag-aim input + ballistic trajectory overlay for the interior view.
 *
 * Pointer-event driven, dotted-curve preview, emits 'player_fire' on release.
 * Drag-AWAY-from-unit semantics (Angry-Birds-style).
 *
 * Owner: Alexis. Imports `emit` from shared/events.js (LOCKED contract).
 */

import { emit } from '../shared/events.js';
import { playSfx } from '../shared/audio.js';
import { getFloorAnchor } from './castle_section.js';
import { getActiveFloor, getActiveUnitId } from './turn.js';
import { getCurrentSide } from '../shared/state.js';

const HIT_RADIUS = 60;
const ORIGIN_LIFT = 40;
const FULL_POWER_PX = 200;
const SIM_STEPS = 60;
const SIM_GRAVITY = 0.5;
const SIM_V0 = 18;
const DOT_EVERY = 3;
const DOT_RADIUS = 3;
const DOT_COLOR = '#FFFFFF';

let _canvas = null;
let _aiming = false;
let _dragStart = null;   // canvas-space {x,y}
let _dragCurrent = null; // canvas-space {x,y}
/** @type {{ angle_deg: number, power: number } | null} */
let _aiPreview = null;

export function setAiPreview(angle_deg, power) { _aiPreview = { angle_deg, power }; }
export function clearAiPreview() { _aiPreview = null; }

/**
 * Map a pointer event's clientX/Y to intrinsic canvas coordinates.
 * Handles CSS-scaled canvases (viewport != width/height).
 */
function _toCanvas(canvas, ev) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  const rawX = (ev.clientX - rect.left) * sx;
  // Red side renders on a mirrored canvas; flip x back to castle_section space
  // so hit-detection and angle calculation stay consistent with the visual.
  const x = getCurrentSide() === 'red' ? canvas.width - rawX : rawX;
  return { x, y: (ev.clientY - rect.top) * sy };
}

function _unitOrigin() {
  const f = getActiveFloor();
  if (f === null) return null;
  const a = getFloorAnchor(f);
  return { x: a.x, y: a.y - ORIGIN_LIFT };
}

function _onDown(ev) {
  if (getCurrentSide() === 'red') return; // AI's turn — block player input
  const o = _unitOrigin();
  if (!o) return; // all units dead, no aim
  const p = _toCanvas(_canvas, ev);
  const dx = p.x - o.x, dy = p.y - o.y;
  if (Math.hypot(dx, dy) > HIT_RADIUS) return;
  _aiming = true;
  _dragStart = p;
  _dragCurrent = p;
  try { _canvas.setPointerCapture(ev.pointerId); } catch (_) {}
  ev.preventDefault();
}

function _onMove(ev) {
  if (!_aiming) return;
  _dragCurrent = _toCanvas(_canvas, ev);
}

function _onUp(ev) {
  if (!_aiming) return;
  _dragCurrent = _toCanvas(_canvas, ev);
  const { angle_deg, power } = _resolveShot();
  _aiming = false;
  try { _canvas.releasePointerCapture(ev.pointerId); } catch (_) {}
  const unit_id = getActiveUnitId();
  if (unit_id) {
    const weapon_type = WEAPON_BY_UNIT[unit_id] || 'rocket';
    playSfx({ rate: 0.85 + power * 0.4 });
    emit('player_fire', { unit_id, angle_deg, power, weapon_type });
  }
}

// Spec §3 Personnages: cyclop = roquette tendue, skeleton = rafale parabolique,
// orc = rayon continu instantané. weapon_type is additive in the player_fire
// payload — scene_exterior branches on it; scene_interior ignores.
const WEAPON_BY_UNIT = /** @type {const} */ ({
  cyclop:   'rocket',
  skeleton: 'volley',
  orc:      'beam',
});

function _onCancel() {
  _aiming = false;
}

function _resolveShot() {
  // Drag vector reversed: dragging down-left should fire up-right.
  const dx = _dragStart.x - _dragCurrent.x;
  const dy = _dragStart.y - _dragCurrent.y;
  // Canvas Y grows downward; for "up" we want negative dy in canvas terms,
  // which after the negation becomes a positive screen-up component.
  // angle in math frame (y-up): use -dy.
  let angle = Math.atan2(-dy, dx) * 180 / Math.PI;
  if (angle < 0) angle = 0;
  if (angle > 170) angle = 170;
  const len = Math.hypot(dx, dy);
  const power = Math.max(0, Math.min(1, len / FULL_POWER_PX));
  return { angle_deg: angle, power };
}

/**
 * Wire up pointer event listeners on the canvas. Call once at mount.
 * @param {HTMLCanvasElement} canvas
 */
export function installAim(canvas) {
  _canvas = canvas;
  canvas.addEventListener('pointerdown', _onDown);
  canvas.addEventListener('pointermove', _onMove);
  canvas.addEventListener('pointerup', _onUp);
  canvas.addEventListener('pointercancel', _onCancel);
  // Avoid the browser's touch scroll/zoom hijacking the drag.
  canvas.style.touchAction = 'none';
}

function _drawTrajectory(ctx, angle_deg, power) {
  const o = _unitOrigin();
  if (!o) return;
  const rad = angle_deg * Math.PI / 180;
  const cw = ctx.canvas.width;
  let px = o.x, py = o.y;
  let vx = power * SIM_V0 * Math.cos(rad);
  let vy = -power * SIM_V0 * Math.sin(rad);
  ctx.save();
  ctx.fillStyle = DOT_COLOR;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 2;
  for (let i = 0; i < SIM_STEPS; i++) {
    px += vx;
    py += vy;
    vy += SIM_GRAVITY;
    if (py > 960 || px < 0 || px > cw) break;
    if (i < 1) continue;
    if (i % DOT_EVERY !== 0) continue;
    ctx.beginPath();
    ctx.arc(px, py, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Render the dotted ballistic trajectory for the active aim (manual drag or AI preview).
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawAimOverlay(ctx) {
  if (_aiming && _dragStart && _dragCurrent) {
    const { angle_deg, power } = _resolveShot();
    if (power > 0.01) _drawTrajectory(ctx, angle_deg, power);
  } else if (_aiPreview) {
    _drawTrajectory(ctx, _aiPreview.angle_deg, _aiPreview.power);
  }
}

/**
 * Read-only test hook: is the player currently dragging?
 * @returns {boolean}
 */
export function isAiming() { return _aiming; }

```

## Fichier : scene_interior/arrow.js
```javascript
/**
 * White down-arrow that bobs above the active unit on a given floor.
 * Pure visual, no input, no events. Canvas2D only.
 */

import { getFloorAnchor } from './castle_section.js';

const BASE_W = 46;     // triangle base width
const TRI_H  = 50;     // triangle height
const CLEAR  = 80;     // unit head clearance above floor anchor
const AMP    = 5;      // bob amplitude in px
const FREQ   = 1.0;    // bob frequency in Hz

/**
 * Draw the bobbing white arrow above the unit on the given floor.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t      // seconds, performance.now()/1000
 * @param {0|1|2} floor   // which ledge to point at
 */
export function drawArrow(ctx, t, floor) {
  const anchor = getFloorAnchor(floor);
  const bob = Math.sin(t * 2 * Math.PI * FREQ) * AMP;
  const cx  = anchor.x;
  const tipY = anchor.y - CLEAR + bob;        // tip (bottom point)
  const topY = tipY - TRI_H;                  // base of triangle
  const halfW = BASE_W / 2;

  ctx.save();

  // Soft drop shadow (offset down-right).
  ctx.translate(2, 2);
  ctx.beginPath();
  ctx.moveTo(cx - halfW, topY);
  ctx.lineTo(cx + halfW, topY);
  ctx.lineTo(cx, tipY);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fill();
  ctx.translate(-2, -2);

  // Triangle path.
  ctx.beginPath();
  ctx.moveTo(cx - halfW, topY);
  ctx.lineTo(cx + halfW, topY);
  ctx.lineTo(cx, tipY);
  ctx.closePath();

  // Black outline (drawn first/wider so it sits behind the white fill edge).
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.stroke();

  // White fill on top.
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.restore();
}

```

## Fichier : scene_interior/turn.js
```javascript
// Turn manager — local to scene_interior. Tracks which floor / unit is currently aimable.
// Advances on every 'cut_to_interior' event. Skips dead units in the rotation.
//
// Why a local module (not shared/state.js): the turn order is an interior-scene concern.
// Sami's exterior doesn't care which player unit is "active" — it only sees `player_fire`
// payloads. Keeping turn state local avoids extending the locked shared/ contract.

import { state, getCurrentSide } from '../shared/state.js';
import { on } from '../shared/events.js';

// Order matches B01.mp4 source: Cyclop (floor 1) → Skeleton (0) → Orc (2) → repeat.
const TURN_ORDER = /** @type {(0|1|2)[]} */ ([1, 0, 2]);
let cursor = 0;

/**
 * Floor of the unit the player should aim with this turn.
 * Skips dead units, preserving the cursor position so the rotation continues from where
 * we left off if a unit dies and revives later (defensive — revive isn't currently a thing).
 * Returns null if all units are dead.
 * @returns {0|1|2|null}
 */
export function getActiveFloor() {
  if (getCurrentSide() === 'red') {
    const u = state.enemy_units.find(x => x.alive);
    return u ? /** @type {0|1|2} */ (u.floor) : null;
  }
  for (let i = 0; i < TURN_ORDER.length; i++) {
    const floor = TURN_ORDER[(cursor + i) % TURN_ORDER.length];
    const u = state.units.find(x => x.floor === floor);
    if (u && u.alive) return floor;
  }
  return null;
}

/**
 * Unit id matching the active floor. Used by aim.js to fill the player_fire payload.
 * @returns {'cyclop' | 'skeleton' | 'orc' | null}
 */
export function getActiveUnitId() {
  if (getCurrentSide() === 'red') {
    const u = state.enemy_units.find(x => x.alive);
    return u ? /** @type {any} */ (u.id) : null;
  }
  const f = getActiveFloor();
  if (f === null) return null;
  const u = state.units.find(x => x.floor === f);
  return /** @type {any} */ (u ? u.id : null);
}

// Advance after every resolution. The handler in scene_manager runs first and applies
// the kills from cut_to_interior payload, so by the time we read state here the dead
// units are already flagged.
on('cut_to_interior', () => {
  cursor = (cursor + 1) % TURN_ORDER.length;
});

```

## Fichier : scene_interior/rip.js
```javascript
/**
 * RIP gravestone module — interior scene.
 * For each dead unit (state.units[i].alive === false), draws a cartoon
 * gravestone standing on that unit's ledge anchor.
 *
 * Pure Canvas2D, no assets, no animation. Replaces the unit sprite at the
 * same anchor (units module is responsible for not drawing dead units).
 */

import { getActiveUnits } from '../shared/state.js';
import { getFloorAnchor } from './castle_section.js';

const STONE_W = 70;
const STONE_H = 90;

/**
 * Draw RIP gravestones for all dead units, on their respective ledges.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawRipStones(ctx) {
  for (const unit of getActiveUnits()) {
    if (unit.alive) continue;
    const a = getFloorAnchor(unit.floor);
    if (!a) continue;
    _drawStone(ctx, a.x, a.y);
  }
}

function _drawStone(ctx, cx, groundY) {
  const w = STONE_W, h = STONE_H;
  const left = cx - w / 2;
  const top = groundY - h;
  const archR = w / 2;
  const archCenterY = top + archR;

  ctx.save();

  // ─── Earth mound at the base ───────────────────────────────────────────────
  ctx.fillStyle = '#2D4A2D';
  ctx.beginPath();
  ctx.ellipse(cx, groundY, w / 2 + 6, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();

  // ─── Stone body path (rectangle + arched top) ──────────────────────────────
  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(left, groundY);
    ctx.lineTo(left, archCenterY);
    ctx.arc(cx, archCenterY, archR, Math.PI, 0, false);
    ctx.lineTo(left + w, groundY);
    ctx.closePath();
  };

  // Base fill (mid stone tone).
  ctx.fillStyle = '#D8D8D2';
  bodyPath();
  ctx.fill();

  // Lighter top-left highlight (clipped to body shape).
  ctx.save();
  bodyPath();
  ctx.clip();
  ctx.fillStyle = '#E8E8E2';
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + w * 0.55, top);
  ctx.lineTo(left + w * 0.30, groundY);
  ctx.lineTo(left, groundY);
  ctx.closePath();
  ctx.fill();
  // Darker bottom-right shading.
  ctx.fillStyle = '#A8A8A2';
  ctx.beginPath();
  ctx.moveTo(left + w, top + archR * 0.5);
  ctx.lineTo(left + w, groundY);
  ctx.lineTo(left + w * 0.55, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3px black outline.
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  bodyPath();
  ctx.stroke();

  // ─── "RIP" carved text ─────────────────────────────────────────────────────
  const textY = archCenterY + 14;
  // Thin lighter line above text suggests carved depth.
  ctx.strokeStyle = '#EFEFEA';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 16, textY - 12);
  ctx.lineTo(cx + 16, textY - 12);
  ctx.stroke();

  ctx.fillStyle = '#3A3A3A';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RIP', cx, textY + 4);

  ctx.restore();
}

```

## Fichier : scene_interior/castle_section.js
```javascript
/**
 * Castle cross-section sprite renderer — 540×960 Canvas2D, no assets.
 *
 * v1 layout — anchored to RESSOURCES/ref_frames/frame_05s.jpg:
 *   - LEFT wall is pre-broken at the top (jagged rip showing mint sky).
 *   - RIGHT wall is full height, capped with a dark pointed spire.
 *   - 3 SHORT ledges (~42% interior width) attached to alternating walls.
 *     Pattern: LEFT (top) → RIGHT (mid) → LEFT (bottom).
 *     Note: in-game appears LEFT/LEFT/LEFT, but alternation reads better as
 *     a platformer; documented choice, can be flipped via FLOOR_SIDE.
 */

const C_LEFT   = 20,  C_RIGHT  = 520;
const C_TOP    = 170, C_BOTTOM = 820;
const C_WIDTH  = C_RIGHT - C_LEFT;
const C_HEIGHT = C_BOTTOM - C_TOP;
const WALL_W   = 56;
const INT_LEFT  = C_LEFT  + WALL_W;
const INT_RIGHT = C_RIGHT - WALL_W;
const INT_WIDTH = INT_RIGHT - INT_LEFT;

const FLOOR_H   = 16;
const LEDGE_W   = Math.round(INT_WIDTH * 0.42);
// 0 = top, 1 = mid, 2 = bottom. 'L' = attached to left wall, 'R' = right wall.
const FLOOR_SIDE = ['L', 'R', 'L'];
const FLOOR_Y   = [
  C_TOP + Math.round(C_HEIGHT * 0.34),
  C_TOP + Math.round(C_HEIGHT * 0.58),
  C_TOP + Math.round(C_HEIGHT * 0.82),
];

const PIVOT_X = (C_LEFT + C_RIGHT) / 2;
const PIVOT_Y = C_BOTTOM;

let _anchors  = [null, null, null];
let _lastTilt = null;

/**
 * Draw the player castle cross-section.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{tilt_deg?: number, damage_level?: number}} [opts]
 */
export function drawCastleSection(ctx, opts = {}) {
  const tilt = opts.tilt_deg     ?? 0;
  const dmg  = opts.damage_level ?? 0;
  const rad  = (tilt * Math.PI) / 180;
  if (tilt !== _lastTilt) { _anchors = [null, null, null]; _lastTilt = tilt; }
  ctx.save();
  ctx.translate(PIVOT_X, PIVOT_Y);
  ctx.rotate(rad);
  ctx.translate(-PIVOT_X, -PIVOT_Y);
  _drawBody(ctx, dmg);
  ctx.restore();
}

/**
 * Returns the SHORT ledge anchor (post-rotation), centered horizontally
 * on the ledge surface. width = usable ledge width (LEDGE_W).
 * @param {0|1|2} floor
 * @returns {{x: number, y: number, width: number}}
 */
export function getFloorAnchor(floor) {
  if (_anchors[floor]) return _anchors[floor];
  const rad = ((_lastTilt ?? 0) * Math.PI) / 180;
  const { cx } = _ledgeRect(floor);
  const dx = cx - PIVOT_X;
  const dy = FLOOR_Y[floor] - PIVOT_Y;
  _anchors[floor] = {
    x: PIVOT_X + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: PIVOT_Y + dx * Math.sin(rad) + dy * Math.cos(rad),
    width: LEDGE_W,
  };
  return _anchors[floor];
}

function _ledgeRect(f) {
  const side = FLOOR_SIDE[f];
  const x = side === 'L' ? INT_LEFT : INT_RIGHT - LEDGE_W;
  return { x, y: FLOOR_Y[f], w: LEDGE_W, cx: x + LEDGE_W / 2 };
}

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  dark: '#1A1C20', mid: '#28292E', light: '#35383F',
  outline: '#000', platBrown: '#7A4520', platLight: '#A06230',
  platDark: '#502E12', baseWood: '#8B5E3C', baseLight: '#A07040',
  spire: '#1A1C20', sky: '#88CCAA',
  tread: '#2A2A2A', gear: '#7C7368',
};

// ─── Main body ───────────────────────────────────────────────────────────────
function _drawBody(ctx, dmg) {
  // Sky band visible through the U-shape top (always).
  ctx.fillStyle = C.sky;
  ctx.fillRect(C_LEFT - 30, 30, C_WIDTH + 60, C_TOP - 30 + 30);

  // Right wall (full height) — drawn first.
  _slab(ctx, INT_RIGHT, C_TOP, WALL_W, C_HEIGHT);

  // Left wall: shorter at dmg=0 (top already broken). Cut grows with damage.
  const leftWallTopCut = C_TOP + Math.round(C_HEIGHT * (0.10 + dmg * 0.18));
  _slab(ctx, C_LEFT, leftWallTopCut, WALL_W, C_BOTTOM - leftWallTopCut);

  // Interior back wall — only fills below the U-cutout depth on the right side
  // (the U dips into the interior). We draw a full back, then carve sky on top.
  ctx.fillStyle = C.dark;
  ctx.fillRect(INT_LEFT, C_TOP, INT_WIDTH, C_HEIGHT);
  _bricks(ctx, INT_LEFT, C_TOP, INT_WIDTH, C_HEIGHT);

  // U-shape sky cutout in the back wall (mint green) with jagged brick teeth.
  _topCutout(ctx, dmg);

  // Ledges (3 SHORT alternating). Top ledge gone at dmg≥2.
  for (let f = 0; f < 3; f++) {
    if (f === 0 && dmg >= 2) continue;
    const r = _ledgeRect(f);
    _ledge(ctx, r.x, r.y, r.w, FLOOR_H, FLOOR_SIDE[f]);
  }

  // Right-wall spire on top (full height wall only — gone at dmg≥3).
  if (dmg < 3) _spire(ctx, INT_RIGHT, C_TOP, WALL_W);
  // Left-wall jagged top (broken brick teeth) — at the cut line.
  _wallBrokenTop(ctx, C_LEFT, leftWallTopCut, WALL_W);

  // Wall outlines.
  ctx.strokeStyle = C.outline; ctx.lineWidth = 3;
  ctx.strokeRect(INT_RIGHT, C_TOP, WALL_W, C_HEIGHT);
  ctx.strokeRect(C_LEFT, leftWallTopCut, WALL_W, C_BOTTOM - leftWallTopCut);

  // Wooden base + arches + treads (extend laterally past walls).
  _base(ctx, C_LEFT - 14, C_BOTTOM, C_WIDTH + 28, 50);
  _treads(ctx, C_LEFT - 14, C_BOTTOM + 50, C_WIDTH + 28);
}

// ─── Top U-shape sky cutout ──────────────────────────────────────────────────
function _topCutout(ctx, dmg) {
  // U-shape sky cutout. Shoulders sit ABOVE the top ledge.
  const yShoulder = C_TOP + Math.round(C_HEIGHT * 0.10) + dmg * 30;
  const yDip = yShoulder + Math.round(C_HEIGHT * 0.05);
  const xL = INT_LEFT - 10, xR = INT_RIGHT + 10, yTop = C_TOP - 60;
  const path = (close) => {
    ctx.beginPath();
    if (close) { ctx.moveTo(xL, yTop); ctx.lineTo(xL, yShoulder); }
    else ctx.moveTo(xL, yShoulder);
    _jaggedH(ctx, xL, yShoulder, xL + INT_WIDTH * 0.30, yShoulder, 4, 5);
    _jaggedV(ctx, xL + INT_WIDTH * 0.30, yShoulder, xL + INT_WIDTH * 0.32, yDip, 2, 3);
    _jaggedH(ctx, xL + INT_WIDTH * 0.32, yDip, xR - INT_WIDTH * 0.32, yDip, 6, 5);
    _jaggedV(ctx, xR - INT_WIDTH * 0.32, yDip, xR - INT_WIDTH * 0.30, yShoulder, 2, 3);
    _jaggedH(ctx, xR - INT_WIDTH * 0.30, yShoulder, xR, yShoulder, 4, 5);
    if (close) { ctx.lineTo(xR, yTop); ctx.closePath(); }
  };
  ctx.save();
  ctx.fillStyle = C.sky;   path(true);  ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2.5;
  path(false); ctx.stroke();
  ctx.restore();
}

function _jaggedV(ctx, x1, y1, x2, y2, steps, jit) {
  const dx = (x2 - x1) / steps, dy = (y2 - y1) / steps;
  for (let i = 1; i <= steps; i++) {
    const px = x1 + dx * i + (i < steps ? (Math.sin(i * 7.3) * jit) : 0);
    const py = y1 + dy * i;
    ctx.lineTo(px, py);
  }
}
function _jaggedH(ctx, x1, y1, x2, y2, steps, jit) {
  const dx = (x2 - x1) / steps, dy = (y2 - y1) / steps;
  for (let i = 1; i <= steps; i++) {
    const px = x1 + dx * i;
    const py = y1 + dy * i + (i < steps ? (Math.cos(i * 5.1) * jit) : 0);
    ctx.lineTo(px, py);
  }
}

// ─── Drawing primitives ──────────────────────────────────────────────────────
function _slab(ctx, x, y, w, h) {
  ctx.fillStyle = C.dark;
  ctx.fillRect(x, y, w, h);
  _bricks(ctx, x, y, w, h);
}

function _bricks(ctx, x, y, w, h) {
  const BW = 30, BH = 20;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let r = 0; r <= Math.ceil(h / BH) + 1; r++) {
    const ry = y + r * BH;
    const shift = (r % 2) ? BW / 2 : 0;
    for (let col = -1; col <= Math.ceil(w / BW) + 2; col++) {
      const rx = x + col * BW - shift;
      const t = (r * 3 + col * 2) % 5;
      ctx.fillStyle = t > 3 ? C.light : t > 1 ? C.mid : C.dark;
      ctx.fillRect(rx + 1, ry + 1, BW - 2, BH - 2);
    }
  }
  ctx.restore();
}

function _ledge(ctx, x, y, w, h, side) {
  // Wooden plank ledge: lighter top stripe, darker underside.
  ctx.fillStyle = C.platBrown; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.platLight; ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = C.platDark;  ctx.fillRect(x, y + h - 3, w, 3);
  // plank seams
  ctx.strokeStyle = C.platDark; ctx.lineWidth = 1;
  for (let px = x + 28; px < x + w - 4; px += 28) {
    ctx.beginPath(); ctx.moveTo(px, y + 1); ctx.lineTo(px, y + h - 1); ctx.stroke();
  }
  // outline
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  // tiny iron bracket where it meets the wall
  ctx.fillStyle = C.outline;
  if (side === 'L') {
    ctx.fillRect(x + 1, y + h - 1, 4, 4);
    ctx.fillRect(x + 1, y + h + 3, 3, 3);
  } else {
    ctx.fillRect(x + w - 5, y + h - 1, 4, 4);
    ctx.fillRect(x + w - 4, y + h + 3, 3, 3);
  }
}

function _spire(ctx, wx, wallTop, wallW) {
  // Tall dark pointed cone above the wall (matches frame_05s right-wall icon).
  const baseY = wallTop;
  const tipY  = wallTop - 110;
  const cx    = wx + wallW / 2;
  ctx.fillStyle = C.spire;
  ctx.beginPath();
  ctx.moveTo(cx, tipY);
  ctx.lineTo(wx - 8, baseY);
  ctx.lineTo(wx + wallW + 8, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 3; ctx.stroke();
  // small crenellation ridge under the spire base
  ctx.fillStyle = C.mid;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(wx + 4 + i * 18, baseY - 8, 12, 8);
  }
}

function _wallBrokenTop(ctx, wx, cutY, wallW) {
  // Jagged brick teeth at the broken top of the left wall.
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.moveTo(wx, cutY);
  const teeth = 5;
  for (let i = 0; i <= teeth; i++) {
    const tx = wx + (i / teeth) * wallW;
    const ty = cutY - (i % 2 === 0 ? 4 : 14);
    ctx.lineTo(tx, ty);
  }
  ctx.lineTo(wx + wallW, cutY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2.5; ctx.stroke();
}

function _base(ctx, x, y, w, h) {
  ctx.fillStyle = C.baseWood;  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.baseLight; ctx.fillRect(x + 3, y + 3, w - 6, 10);
  // archway hints (2 dark arches)
  ctx.fillStyle = '#3a2410';
  for (let i = 0; i < 2; i++) {
    const ax = x + 30 + i * (w - 110);
    ctx.beginPath();
    ctx.moveTo(ax, y + h);
    ctx.lineTo(ax, y + 18);
    ctx.arc(ax + 25, y + 18, 25, Math.PI, 0, false);
    ctx.lineTo(ax + 50, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = C.outline; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
}

function _treads(ctx, x, y, w) {
  // Hint of tank treads peeking under the base — 2 gear chunks.
  const r = 22;
  ctx.fillStyle = C.tread;
  ctx.fillRect(x + 18, y - 6, w - 36, 16);
  for (const cx of [x + 60, x + w - 60]) {
    ctx.fillStyle = C.tread;
    ctx.beginPath(); ctx.arc(cx, y + 4, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.gear;
    ctx.beginPath(); ctx.arc(cx, y + 4, r - 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.tread;
    ctx.beginPath(); ctx.arc(cx, y + 4, r - 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, y + 4, r, 0, Math.PI * 2); ctx.stroke();
  }
}

```

## Fichier : scene_interior/index.js
```javascript
// Scene: INTERIOR (cross-section aim phase). Owner: Alexis.
// Visible only when scene_manager state is 'INTERIOR_AIM' AND it is the blue player's turn.
// Red (AI) turns skip the interior entirely and fire after a short pause.

import { subscribe } from '../shared/scene_manager.js';
import { state, getCurrentSide } from '../shared/state.js';
import { emit } from '../shared/events.js';
import { drawCastleSection } from './castle_section.js';
import { drawUnits } from './units.js';
import { drawArrow } from './arrow.js';
import { installAim, drawAimOverlay, isAiming } from './aim.js';
import { drawHudCards } from './hud_cards.js';
import { drawRipStones } from './rip.js';
import { getActiveFloor, getActiveUnitId } from './turn.js';
import { drawTopHud } from '../shared/hud_top.js';
import { drawScriptOverlay } from '../playable/script.js';
import { computeAiShot } from '../scene_exterior/enemy_ai.js';
import { pulseEnemyTint } from '../scene_exterior/index.js';
import { getFloorAnchor } from './castle_section.js';

/** @type {HTMLCanvasElement | null} */
let canvas = null;
/** @type {CanvasRenderingContext2D | null} */
let ctx = null;
let visible = false;
let rafId = 0;
let currentTilt = 0;
let _aiTimer = null;
let _zoom = 1.0; // current zoom scale applied to interior scene

const TILT_EASE = 0.06;
const ZOOM_TARGET_IDLE   = 1.0;
const ZOOM_TARGET_AIMING = 1.18;
const ZOOM_EASE = 0.10;

/** @param {number} hp_pct */
function targetTiltFor(hp_pct) {
  if (hp_pct >= 95) return 0;
  if (hp_pct >= 65) return 4;
  if (hp_pct >= 35) return 9;
  if (hp_pct >= 18) return 14;
  return 18;
}

/** @param {number} hp_pct */
function damageLevelFor(hp_pct) {
  if (hp_pct >= 70) return 0;
  if (hp_pct >= 50) return 1;
  if (hp_pct >= 30) return 2;
  return 3;
}

/** @param {HTMLCanvasElement} c */
export function mount(c) {
  canvas = c;
  ctx = c.getContext('2d');
  installAim(c);
  subscribe((s) => {
    if (s !== 'INTERIOR_AIM') {
      if (_aiTimer !== null) { clearTimeout(_aiTimer); _aiTimer = null; }
      _zoom = ZOOM_TARGET_IDLE;
    }
    // Interior is only shown on blue turns.
    visible = (s === 'INTERIOR_AIM') && getCurrentSide() === 'blue';
    if (visible && !rafId) loop();
    if (s === 'INTERIOR_AIM' && getCurrentSide() === 'red') {
      // AI fires without an interior view — short pause so the exterior
      // camera has time to ease to the red castle before the shot.
      const shot = computeAiShot(20);
      _aiTimer = setTimeout(() => {
        _aiTimer = null;
        pulseEnemyTint();
        emit('player_fire', shot);
      }, 600);
    }
  });
}

function loop() {
  if (!visible) { rafId = 0; return; }
  rafId = requestAnimationFrame(loop);
  if (!ctx || !canvas) return;

  const t  = performance.now() / 1000;
  const hp = state.hp_self_pct;

  currentTilt += (targetTiltFor(hp) - currentTilt) * TILT_EASE;
  const damageLevel = damageLevelFor(hp);

  // Ease zoom toward target.
  const targetZoom = isAiming() ? ZOOM_TARGET_AIMING : ZOOM_TARGET_IDLE;
  _zoom += (_zoom - _zoom) + ZOOM_EASE * (targetZoom - _zoom);

  // Find zoom anchor: active unit position, fallback to canvas center.
  const W = canvas.width, H = canvas.height;
  const f = getActiveFloor();
  let anchorX = W / 2, anchorY = H / 2;
  if (f !== null) {
    const a = getFloorAnchor(f);
    anchorX = a.x; anchorY = a.y;
  }

  ctx.fillStyle = '#88CCAA';
  ctx.fillRect(0, 0, W, H);

  // Apply zoom centered on the active unit.
  ctx.save();
  ctx.translate(anchorX, anchorY);
  ctx.scale(_zoom, _zoom);
  ctx.translate(-anchorX, -anchorY);

  drawCastleSection(ctx, { tilt_deg: currentTilt, damage_level: damageLevel });
  drawUnits(ctx, t);
  drawRipStones(ctx);
  if (f !== null) drawArrow(ctx, t, f);
  drawAimOverlay(ctx);

  ctx.restore();

  drawHudCards(ctx, getActiveUnitId());
  drawTopHud(ctx);
  drawScriptOverlay(ctx, t);
}

```

## Fichier : scene_interior/hud_cards.js
```javascript
/**
 * Bottom HUD card panel — wooden plank with 3 character cards.
 * Portraits use the official Castle Clashers PNGs via window.ASSETS.
 * Layout: plank y 810..960; cards 140×130 at y 800; tread gears at corners.
 */

import { getImage } from '../shared/assets.js';

const PANEL_Y = 810, PANEL_H = 110;
const CARD_W = 140, CARD_H = 130, CARD_Y = 800;
const CARD_GAP = (540 - CARD_W * 3) / 4; // ≈ 30
const CARDS = [
  { id: 'cyclop',   x: CARD_GAP,                    asset: 'CYCLOP'   },
  { id: 'skeleton', x: CARD_GAP * 2 + CARD_W,       asset: 'SKELETON' },
  { id: 'orc',      x: CARD_GAP * 3 + CARD_W * 2,   asset: 'ORC'      },
];

const C = {
  wood:'#8B5E3C', woodLight:'#A07040', woodDark:'#5C3D24', outline:'#000',
  checkerD:'#3A3D44', checkerL:'#C8C8CC', bodyTop:'#9DA0A6', bodyBot:'#5C5F66',
  tread:'#2A2A2A', gear:'#7C7368',
  activeGlow: '#FFD23A',
};

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string|null} [activeId] unit_id of the currently active card (highlighted)
 */
export function drawHudCards(ctx, activeId = null) {
  _plank(ctx);
  _gear(ctx, 32, PANEL_Y + PANEL_H - 6);
  _gear(ctx, 508, PANEL_Y + PANEL_H - 6);
  for (const c of CARDS) _card(ctx, c.x, CARD_Y, c.id, c.asset, c.id === activeId);
}

/**
 * @param {'cyclop'|'skeleton'|'orc'} unit_id
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function getCardBounds(unit_id) {
  const c = CARDS.find(c => c.id === unit_id);
  if (!c) throw new Error(`Unknown unit_id: ${unit_id}`);
  return { x: c.x, y: CARD_Y, w: CARD_W, h: CARD_H };
}

function _plank(ctx) {
  ctx.fillStyle = C.wood; ctx.fillRect(-10, PANEL_Y, 560, PANEL_H);
  ctx.fillStyle = C.woodLight; ctx.fillRect(-10, PANEL_Y, 560, 14);
  ctx.fillStyle = C.woodDark;  ctx.fillRect(-10, PANEL_Y + PANEL_H - 8, 560, 8);
  ctx.strokeStyle = C.woodDark; ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const y = PANEL_Y + 22 + i * 14;
    ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(550, y); ctx.stroke();
  }
  ctx.strokeStyle = C.outline; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-10, PANEL_Y); ctx.lineTo(550, PANEL_Y); ctx.stroke();
}

function _card(ctx, x, y, id, assetName, isActive) {
  const r = 12;
  // Body gradient inside rounded rect
  ctx.save();
  _rr(ctx, x, y, CARD_W, CARD_H, r); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + CARD_H);
  g.addColorStop(0, C.bodyTop); g.addColorStop(1, C.bodyBot);
  ctx.fillStyle = g; ctx.fillRect(x, y, CARD_W, CARD_H);
  // Portrait — official PNG, fit to a centered square inside the card frame
  const portrait = 100; // px box, leaves room for the checker frame (T=10)
  const cx = x + CARD_W / 2, cy = y + CARD_H / 2 + 4;
  const img = getImage(assetName);
  ctx.drawImage(img, cx - portrait / 2, cy - portrait / 2, portrait, portrait);
  ctx.restore();
  // Checker frame
  _checker(ctx, x, y, CARD_W, CARD_H, r);
  // Outer outline (yellow glow if active, black otherwise)
  if (isActive) {
    ctx.strokeStyle = C.activeGlow; ctx.lineWidth = 5;
    _rr(ctx, x, y, CARD_W, CARD_H, r); ctx.stroke();
  }
  ctx.strokeStyle = C.outline; ctx.lineWidth = 3;
  _rr(ctx, x, y, CARD_W, CARD_H, r); ctx.stroke();
}

function _checker(ctx, x, y, w, h, r) {
  const T = 10, S = 10;
  ctx.save();
  // Frame ring = outer rounded rect minus inner rounded rect (even-odd clip)
  ctx.beginPath();
  _rrSub(ctx, x, y, w, h, r);
  _rrSub(ctx, x + T, y + T, w - T * 2, h - T * 2, Math.max(0, r - 4));
  ctx.clip('evenodd');
  for (let py = y; py < y + h; py += S) {
    for (let px = x; px < x + w; px += S) {
      const k = (Math.floor((px - x) / S) + Math.floor((py - y) / S)) % 2;
      ctx.fillStyle = k ? C.checkerL : C.checkerD;
      ctx.fillRect(px, py, S, S);
    }
  }
  ctx.restore();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 1.5;
  _rr(ctx, x + T, y + T, w - T * 2, h - T * 2, Math.max(0, r - 4));
  ctx.stroke();
}

// Subpath form (no beginPath) for use in compound even-odd paths.
function _rrSub(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function _rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}


function _gear(ctx, cx, cy) {
  const r = 18;
  ctx.fillStyle = C.tread;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.gear;
  ctx.beginPath(); ctx.arc(cx, cy, r - 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r + 4, cy); ctx.lineTo(cx + r - 4, cy);
  ctx.moveTo(cx, cy - r + 4); ctx.lineTo(cx, cy + r - 4);
  ctx.stroke();
}

```

## Fichier : scene_interior/units.js
```javascript
/**
 * Unit sprites for the interior cross-section view — Cyclop, Skeleton, Orc.
 * Uses official Castle Clashers PNG assets via window.ASSETS (loaded by
 * assets-inline.js). Idle bob, hidden when state.units[i].alive=false.
 */

import { getActiveUnits } from '../shared/state.js';
import { getFloorAnchor } from './castle_section.js';
import { getImage } from '../shared/assets.js';

const SPRITE_SIZE = 110; // px, square draw box. Source PNGs are 512×512 with transparent padding.
const ASSET_BY_ID = { cyclop: 'CYCLOP', skeleton: 'SKELETON', orc: 'ORC' };

/**
 * Draw all alive units at their ledge anchors, with idle bob.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t  // performance.now() / 1000, seconds
 */
export function drawUnits(ctx, t) {
  const bob = Math.sin(t * 2 * Math.PI * 0.7) * 3;
  for (const u of getActiveUnits()) {
    if (!u.alive) continue;
    const a = getFloorAnchor(u.floor);
    if (!a) continue;
    const assetName = ASSET_BY_ID[u.id];
    if (!assetName) continue;
    const img = getImage(assetName);
    // Anchor = feet at ledge surface. Draw box centered on x, bottom on y+bob.
    const x = a.x - SPRITE_SIZE / 2;
    const y = a.y + bob - SPRITE_SIZE;
    ctx.drawImage(img, x, y, SPRITE_SIZE, SPRITE_SIZE);
  }
}

```

