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

/**
 * Map a pointer event's clientX/Y to intrinsic canvas coordinates.
 * Handles CSS-scaled canvases (viewport != width/height).
 */
function _toCanvas(canvas, ev) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (ev.clientX - rect.left) * sx,
    y: (ev.clientY - rect.top) * sy,
  };
}

function _unitOrigin() {
  const f = getActiveFloor();
  if (f === null) return null;
  const a = getFloorAnchor(f);
  return { x: a.x, y: a.y - ORIGIN_LIFT };
}

function _onDown(ev) {
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

/**
 * Render the dotted ballistic trajectory if the player is currently dragging.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawAimOverlay(ctx) {
  if (!_aiming || !_dragStart || !_dragCurrent) return;
  const o = _unitOrigin();
  if (!o) return;
  const { angle_deg, power } = _resolveShot();
  if (power <= 0.01) return;
  const rad = angle_deg * Math.PI / 180;
  const cw = ctx.canvas.width;

  let px = o.x, py = o.y;
  let vx = power * SIM_V0 * Math.cos(rad);
  let vy = -power * SIM_V0 * Math.sin(rad); // canvas y-down → up = negative

  ctx.save();
  ctx.fillStyle = DOT_COLOR;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 2;
  for (let i = 0; i < SIM_STEPS; i++) {
    px += vx;
    py += vy;
    vy += SIM_GRAVITY;
    if (py > 960 || px < 0 || px > cw) break;
    if (i < 1) continue;            // skip the very first dot near the origin
    if (i % DOT_EVERY !== 0) continue;
    ctx.beginPath();
    ctx.arc(px, py, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Read-only test hook: is the player currently dragging?
 * @returns {boolean}
 */
export function isAiming() { return _aiming; }
