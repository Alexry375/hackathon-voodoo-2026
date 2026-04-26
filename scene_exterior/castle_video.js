// Overlays castle-75.mov on the canvas the first time the red castle takes a hit.
// Positioned in screen-space at the red castle's current camera-projected location.

import { WORLD } from '../shared/world.js';
import { getCamera } from '../shared/camera.js';

/** @type {HTMLVideoElement | null} */
let _video = null;
let _playing = false;
let _triggered = false;

export function initCastleVideo() {
  _video = document.createElement('video');
  _video.src = './castle-75.mov';
  _video.preload = 'auto';
  _video.muted = true;
  _video.playsInline = true;
  _video.addEventListener('ended', () => { _playing = false; });
}

/** Call once when the first player missile hits the red castle. */
export function triggerCastleVideo() {
  if (_triggered || !_video) return;
  _triggered = true;
  _playing = true;
  _video.currentTime = 0;
  _video.play().catch(() => { _playing = false; });
}

/**
 * Draw the video frame overtop the canvas, locked to the red castle screen position.
 * Call in screen-space (after ctx.restore() undoes the camera transform).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{w:number, h:number}} viewport
 */
export function drawCastleVideo(ctx, viewport) {
  if (!_playing || !_video || _video.readyState < 2) return;

  const cam = getCamera();

  // Project red castle world anchor → screen.
  const wx = WORLD.red_castle.x;
  const wy = WORLD.red_castle.y; // ground level (base of castle)
  const sx = (wx - cam.x) * cam.zoom + viewport.w / 2;
  const sy = (wy - cam.y) * cam.zoom + viewport.h / 2;

  // Match the castle's rendered height on screen.
  const vidH = WORLD.castle_h * cam.zoom;
  const aspect = _video.videoWidth > 0 ? _video.videoWidth / _video.videoHeight : 1;
  const vidW = vidH * aspect;

  // Draw anchored at ground center (same convention as _drawCastle).
  ctx.drawImage(_video, sx - vidW / 2, sy - vidH, vidW, vidH);
}
