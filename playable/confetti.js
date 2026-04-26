// Lightweight one-shot confetti burst, pure canvas.
// Particles fall from the top with horizontal drift + rotation; ~1.2s lifetime.
// Used by endcard.js. No external deps, no images.

const COLORS = ['#FFD23A', '#FF5A5A', '#3FB13F', '#3AAEFF', '#FF8AD8', '#FFFFFF', '#FFA63A'];

/**
 * @typedef {{x:number, y:number, vx:number, vy:number, rot:number, vrot:number,
 *            w:number, h:number, color:string, life:number, ttl:number, shape:number}} Particle
 */

/** @type {Particle[]} */
let _particles = [];
let _started = false;
let _lastT = 0;

/**
 * Trigger the burst. Idempotent (re-calling does nothing while one is alive).
 * @param {number} count
 * @param {number} canvasW
 */
export function fireConfetti(count = 100, canvasW = 540) {
  if (_started) return;
  _started = true;
  _particles = [];
  for (let i = 0; i < count; i++) {
    const ttl = 1.0 + Math.random() * 0.6;
    _particles.push({
      x: Math.random() * canvasW,
      y: -20 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 140,
      vy: 220 + Math.random() * 220,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 8,
      w: 6 + Math.random() * 6,
      h: 10 + Math.random() * 8,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      life: 0,
      ttl,
      shape: Math.random() < 0.4 ? 1 : 0, // 0=rect, 1=circle
    });
  }
  _lastT = 0;
}

export function resetConfetti() {
  _started = false;
  _particles = [];
  _lastT = 0;
}

/**
 * Draw + step. dt derived from t (seconds) so behavior is framerate-independent.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t  seconds (performance.now()/1000)
 */
export function drawConfetti(ctx, t) {
  if (!_particles.length) return;
  const dt = _lastT ? Math.min(0.05, t - _lastT) : 0.016;
  _lastT = t;

  ctx.save();
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.life += dt;
    if (p.life >= p.ttl) { _particles.splice(i, 1); continue; }
    p.vy += 380 * dt;          // gravity
    p.vx *= (1 - 0.6 * dt);    // air drag
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;

    const fade = p.life > p.ttl - 0.3 ? Math.max(0, (p.ttl - p.life) / 0.3) : 1;
    ctx.globalAlpha = fade;
    ctx.fillStyle = p.color;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.shape === 1) {
      ctx.beginPath();
      ctx.arc(0, 0, p.w * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-p.w * 0.5, -p.h * 0.5, p.w, p.h);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.restore();
}
