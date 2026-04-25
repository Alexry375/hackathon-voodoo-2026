// Camera: maps world coordinates → screen. State eases toward a target
// preset so panning/zooming feels smooth; snapTo() jumps instantly (used
// for the ping-pong "snap cut" back to the player after an enemy shot).
//
// Spec §6 (Comportement Caméra): player shots pan with the projectile,
// enemy shots snap-cut back. scene_exterior drives the targets; this
// module just owns the eased state and the ctx transform.

import { CAM_PRESETS } from './world.js';

/** @type {{x:number, y:number, zoom:number}} */
const cam    = { ...CAM_PRESETS.overview };
/** @type {{x:number, y:number, zoom:number}} */
const target = { ...CAM_PRESETS.overview };

let easePerMs = 0.006; // ~16% per frame at 60fps; tuned by feel

/** @param {Partial<{x:number, y:number, zoom:number}>} t */
export function setTarget(t, { ease = 0.006 } = {}) {
  if (typeof t.x === 'number') target.x = t.x;
  if (typeof t.y === 'number') target.y = t.y;
  if (typeof t.zoom === 'number') target.zoom = Math.max(0.1, Math.min(3, t.zoom));
  easePerMs = ease;
}

/** Jump instantly — for snap cuts (e.g. enemy shot incoming). */
export function snapTo(t) {
  if (typeof t.x === 'number')    cam.x    = target.x    = t.x;
  if (typeof t.y === 'number')    cam.y    = target.y    = t.y;
  if (typeof t.zoom === 'number') cam.zoom = target.zoom = Math.max(0.1, Math.min(3, t.zoom));
}

/** @param {keyof typeof CAM_PRESETS} name */
export function setPreset(name, opts = {}) {
  const p = CAM_PRESETS[name];
  if (!p) return;
  setTarget(p, opts);
}

/** @param {keyof typeof CAM_PRESETS} name */
export function snapPreset(name) {
  const p = CAM_PRESETS[name];
  if (p) snapTo(p);
}

/** Tick easing. Call once per frame from the scene that uses the camera. */
export function updateCamera(dt_ms) {
  const k = 1 - Math.exp(-easePerMs * dt_ms);
  cam.x    += (target.x    - cam.x)    * k;
  cam.y    += (target.y    - cam.y)    * k;
  cam.zoom += (target.zoom - cam.zoom) * k;
}

/**
 * Wrap world-space drawing in `applyCameraTransform(...)` ... `ctx.restore()`.
 * Camera position == the world point displayed at the SCREEN CENTER.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{w:number, h:number}} viewport
 */
export function applyCameraTransform(ctx, viewport) {
  ctx.save();
  ctx.translate(viewport.w / 2, viewport.h / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
}

export function getCamera() { return { ...cam }; }
export function getTarget() { return { ...target }; }
