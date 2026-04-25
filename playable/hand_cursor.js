// Hand cursor — pulsing pointer for the tutorial phase. The script.js
// state machine calls showHandOn(target) / hideHand() / animateHandDrag(from,to,t)
// to guide the player through the first few aim gestures.
//
// Pure visual, no input. Drawn on top of everything (after hud_top).

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

  // Hand shape — simple stylized index-finger pointer
  // (white silhouette with black outline for legibility on any bg).
  const hx = x + 6, hy = y + 4;
  ctx.translate(hx, hy);
  ctx.rotate(-0.35);
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(8, -22);
  ctx.lineTo(16, -20);
  ctx.lineTo(14, -2);
  ctx.lineTo(20, -2);
  ctx.lineTo(22, 14);
  ctx.lineTo(20, 26);
  ctx.lineTo(2, 28);
  ctx.lineTo(-6, 22);
  ctx.lineTo(-8, 8);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}
