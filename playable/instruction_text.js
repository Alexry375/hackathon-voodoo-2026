// MarbleSort-style persistent bold instruction overlay. Single line of
// stroked yellow text, gentle pulse, sits below the action area. Caller
// drives it by calling setInstruction(label) on phase changes; pass null
// to hide.

const W = 540;
const Y = 760;          // sits between the action area and the persistent CTA
const PULSE_HZ = 0.8;

let _label = null;
let _t0 = 0;

/** @param {string|null} label */
export function setInstruction(label) {
  if (label === _label) return;
  _label = label;
  _t0 = performance.now();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t  seconds, for the pulse
 */
export function drawInstruction(ctx, t) {
  if (!_label) return;
  const age = (performance.now() - _t0) / 1000;
  const fadeIn = Math.min(1, age / 0.25);
  const pulse = 1 + 0.045 * Math.sin(t * 2 * Math.PI * PULSE_HZ);

  ctx.save();
  ctx.globalAlpha = fadeIn;
  ctx.translate(W / 2, Y);
  ctx.scale(pulse, pulse);
  ctx.font = 'bold 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
  ctx.strokeText(_label, 0, 0);
  ctx.fillStyle = '#FFD23A';
  ctx.fillText(_label, 0, 0);
  ctx.restore();
}
