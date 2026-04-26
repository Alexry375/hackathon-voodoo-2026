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
import { getFloorAnchor, NATIVE_HEIGHT } from './castle_section.js';
import { getActiveFloor, getActiveUnitId } from './turn.js';
import { getCurrentSide } from '../shared/state.js';
import { getCamera } from '../shared/camera.js';
import { WORLD } from '../shared/world.js';

const HIT_RADIUS = 60;
const ORIGIN_LIFT = 40;
const FULL_POWER_PX = 200;

const WORLD_SCALE = WORLD.castle_h / NATIVE_HEIGHT;

/** Convert world coords to canvas screen coords using the current camera state. */
function _worldToScreen(worldX, worldY) {
  const cam = getCamera();
  const w = _canvas ? _canvas.width  : 540;
  const h = _canvas ? _canvas.height : 960;
  return {
    x: (worldX - cam.x) * cam.zoom + w / 2,
    y: (worldY - cam.y) * cam.zoom + h / 2,
  };
}

/** Convert canvas screen coords to world coords (inverse camera transform). */
function _screenToWorld(sx, sy) {
  const cam = getCamera();
  const w = _canvas ? _canvas.width  : 540;
  const h = _canvas ? _canvas.height : 960;
  return {
    x: (sx - w / 2) / cam.zoom + cam.x,
    y: (sy - h / 2) / cam.zoom + cam.y,
  };
}
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
 * Map a pointer event's clientX/Y to canvas screen coords (intrinsic pixels).
 * Handles CSS-scaled canvases.
 */
function _toCanvas(canvas, ev) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (ev.clientX - rect.left) * sx,
    y: (ev.clientY - rect.top)  * sy,
  };
}

/**
 * Returns the active unit's origin in SCREEN coords (for hit-detection + trajectory).
 * The unit lives in world space at the blue castle pivot, scaled by WORLD_SCALE.
 */
function _unitOrigin() {
  const f = getActiveFloor();
  if (f === null) return null;
  // Floor anchor in world space.
  const wx = WORLD.blue_castle.x, wy = WORLD.blue_castle.y;
  const a = getFloorAnchor(f, wx, wy, WORLD_SCALE);
  if (!a) return null;
  // Lift in world units, then project to screen.
  const liftWorld = ORIGIN_LIFT * WORLD_SCALE;
  return _worldToScreen(a.x, a.y - liftWorld);
}

function _onDown(ev) {
  if (getCurrentSide() === 'red') return; // AI's turn — block player input
  const o = _unitOrigin();
  if (!o) return; // all units dead, no aim
  const p = _toCanvas(_canvas, ev);
  const dx = p.x - o.x, dy = p.y - o.y;
  // Scale hit radius by camera zoom so it stays the same visual size.
  const cam = getCamera();
  if (Math.hypot(dx, dy) > HIT_RADIUS * cam.zoom) return;
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
  const cam = getCamera();
  // Simulate in world space, then project each dot to screen.
  // Start world position: inverse-project the unit origin.
  const startW = _screenToWorld(o.x, o.y);
  // World-space velocity: match projectile.js roughly (speed=1.05 for rocket, use 0.9*WORLD.width/600).
  const worldV0 = 1.05 * 0.7; // rough: power=0.7 lands in ~600ms across 760 world units
  let wx = startW.x, wy = startW.y;
  let vx = power * worldV0 * Math.cos(rad) * (640 / SIM_STEPS);
  let vy = -power * worldV0 * Math.sin(rad) * (640 / SIM_STEPS);
  const gravity = 0.001 * (640 / SIM_STEPS) * (640 / SIM_STEPS);
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  ctx.save();
  ctx.fillStyle = DOT_COLOR;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 2;
  for (let i = 0; i < SIM_STEPS; i++) {
    wx += vx;
    wy += vy;
    vy += gravity;
    if (wy > WORLD.ground_y) break;
    if (i < 1) continue;
    if (i % DOT_EVERY !== 0) continue;
    const s = _worldToScreen(wx, wy);
    if (s.x < 0 || s.x > cw || s.y > ch) break;
    ctx.beginPath();
    ctx.arc(s.x, s.y, DOT_RADIUS, 0, Math.PI * 2);
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
