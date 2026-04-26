// Hand cursor — pulsing pointer for the tutorial phase. The script.js
// state machine calls showHandOn(target) / hideHand() / animateHandDrag(from,to,t)
// to guide the player through the first few aim gestures.
//
// Pure visual, no input. Drawn on top of everything (after hud_top).

import { getImage, isImageReady } from '../shared/assets.js';

const HAND_SIZE = 88;        // drawn px on canvas (source PNG is 256×256).
const HAND_TIP_OFFSET = { x: -10, y: -34 }; // tip of index relative to img centre
const HAND_ROT = -0.18;      // slight tilt so it reads as "pointing into" the target

let _target = null; // {x, y} canvas coords, or null = hidden
let _drag = null;   // {from:{x,y}, to:{x,y}, progress:0..1} or null

/** @param {{x:number,y:number}|null} target */
export function showHandOn(target) { _target = target; _drag = null; }
export function hideHand() { _target = null; _drag = null; }

/**
 * Animate the hand from `from` to `to`, progress in 0..1. Used during the
 * scripted tutorial to demo the drag-aim gesture.
 * @param {{x:number,y:number}} from
 * @param {{x:number,y:number}} to
 * @param {number} progress
 */
export function showHandDrag(from, to, progress) {
  _target = null;
  _drag = { from, to, progress: Math.max(0, Math.min(1, progress)) };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t  performance.now()/1000
 */
export function drawHandCursor(ctx, t) {
  let x, y;
  if (_drag) {
    x = _drag.from.x + (_drag.to.x - _drag.from.x) * _drag.progress;
    y = _drag.from.y + (_drag.to.y - _drag.from.y) * _drag.progress;
    // dotted trail
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 4;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(_drag.from.x, _drag.from.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
  } else if (_target) {
    x = _target.x; y = _target.y;
  } else {
    return;
  }

  // Pulsing ring (1.4 Hz)
  const pulse = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 1.4);
  const ringR = 30 + pulse * 14;
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${0.3 + 0.4 * (1 - pulse)})`;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2); ctx.stroke();

  // Stylish PNG pointer (Kenney CC0). Rotated slightly so the index finger
  // reads as pointing into the target. Anchor the tip on (x, y) by offsetting
  // the draw rect from the image centre.
  const img = getImage('HAND_POINTER');
  if (isImageReady('HAND_POINTER')) {
    ctx.translate(x, y);
    ctx.rotate(HAND_ROT);
    ctx.translate(-HAND_TIP_OFFSET.x, -HAND_TIP_OFFSET.y);
    ctx.drawImage(img, -HAND_SIZE / 2, -HAND_SIZE / 2, HAND_SIZE, HAND_SIZE);
  }
  ctx.restore();
}
