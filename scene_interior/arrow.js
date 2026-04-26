/**
 * White down-arrow that bobs above the active unit on a given floor.
 * Pure visual, no input, no events. Canvas2D only.
 */

import { getFloorAnchor, NATIVE_HEIGHT } from './castle_section.js';
import { getCamera } from '../shared/camera.js';
import { WORLD } from '../shared/world.js';

const _WORLD_SCALE = WORLD.castle_h / NATIVE_HEIGHT;

function _worldToScreen(worldX, worldY, canvas) {
  const cam = getCamera();
  const w = canvas ? canvas.width  : 540;
  const h = canvas ? canvas.height : 960;
  return {
    x: (worldX - cam.x) * cam.zoom + w / 2,
    y: (worldY - cam.y) * cam.zoom + h / 2,
  };
}

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
  const wx = WORLD.blue_castle.x, wy = WORLD.blue_castle.y;
  const anchor = getFloorAnchor(floor, wx, wy, _WORLD_SCALE);
  const screen = _worldToScreen(anchor.x, anchor.y, ctx.canvas);
  // Scale bob and clearance by current camera zoom for consistent visual size.
  const cam = getCamera();
  const zs = cam.zoom;
  const bob = Math.sin(t * 2 * Math.PI * FREQ) * AMP * zs;
  const cx  = screen.x;
  const tipY = screen.y - CLEAR * zs + bob;        // tip (bottom point)
  const topY = tipY - TRI_H * zs;             // base of triangle
  const halfW = BASE_W * zs / 2;

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
