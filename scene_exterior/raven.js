/**
 * Procedural raven for Castle Clashers playable.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x  body center x
 * @param {number} y  body center y
 * @param {number} t  time in seconds
 * @param {{size?:number, mirror?:boolean, flapSpeed?:number}} [opts]
 */
export function drawRaven(ctx, x, y, t, opts = {}) {
  const size = opts.size ?? 60;
  const mirror = !!opts.mirror;
  const flapSpeed = opts.flapSpeed ?? 5;

  const s = size / 60;
  const phase = Math.sin(t * 2 * Math.PI * flapSpeed);

  ctx.save();
  ctx.translate(x, y);
  if (mirror) ctx.scale(-1, 1);
  ctx.scale(s, s);

  const black = '#0d0d10';
  const sheen = '#23232b';
  const beak = '#0a0a0c';

  // tail (behind body)
  ctx.fillStyle = black;
  ctx.beginPath();
  ctx.moveTo(-18, -2);
  ctx.lineTo(-26, -6);
  ctx.lineTo(-28, 0);
  ctx.lineTo(-26, 5);
  ctx.lineTo(-18, 4);
  ctx.closePath();
  ctx.fill();

  // body: horizontal oval
  ctx.beginPath();
  ctx.ellipse(-4, 2, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // head: round, forward
  ctx.beginPath();
  ctx.arc(11, -3, 7, 0, Math.PI * 2);
  ctx.fill();

  // beak: short pointed triangle
  ctx.fillStyle = beak;
  ctx.beginPath();
  ctx.moveTo(17, -3);
  ctx.lineTo(24, -2);
  ctx.lineTo(17, 0);
  ctx.closePath();
  ctx.fill();

  // eye: tiny white dot
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(13, -5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // far wing (behind body): smaller, slightly out of phase, lighter for depth
  ctx.fillStyle = sheen;
  drawWing(ctx, phase * 0.85, true);

  // near wing (in front): main animated wing
  ctx.fillStyle = black;
  drawWing(ctx, phase, false);

  // outline around body for crisp silhouette over busy backgrounds
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.6;

  // belly sheen line
  ctx.strokeStyle = sheen;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-12, 6);
  ctx.quadraticCurveTo(-2, 9, 8, 5);
  ctx.stroke();

  ctx.restore();
}

// phase in [-1, +1]. -1 = wing fully down, +1 = wing fully up.
function drawWing(ctx, phase, far) {
  // wing roots from shoulder, sweeps from +75deg (up) to -75deg (down)
  // base wing in "horizontal" pose extends backward and slightly down with feathers
  const angle = phase * (75 * Math.PI / 180);
  ctx.save();
  // shoulder pivot: above the body so wing dips & rises clearly
  ctx.translate(far ? 0 : -1, far ? -4 : -6);
  ctx.rotate(-angle); // canvas y down: -angle so phase>0 rotates wing upward

  const len = far ? 16 : 24;
  const chord = far ? 8 : 12;

  // wing pointing along -x with feather tips fanning out along the trailing edge.
  // leading edge: smooth curve from shoulder out to tip.
  // trailing edge: zig-zag of 4 feather tips returning to shoulder.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-len * 0.5, -chord * 0.4, -len, -chord * 0.1);
  // feather tips along trailing edge (curving back, also extending downward like primaries)
  ctx.lineTo(-len * 0.85, chord * 0.55);
  ctx.lineTo(-len * 0.7, chord * 0.25);
  ctx.lineTo(-len * 0.55, chord * 0.85);
  ctx.lineTo(-len * 0.42, chord * 0.4);
  ctx.lineTo(-len * 0.28, chord * 1.0);
  ctx.lineTo(-len * 0.15, chord * 0.45);
  ctx.lineTo(-len * 0.02, chord * 0.7);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
