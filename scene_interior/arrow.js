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
