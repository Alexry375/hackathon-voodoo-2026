// Subtle additive glow + sparkle trail behind every projectile.
//
// Why: Projectile_1 (skeleton) had no companion trail module, so the rafale
// flew across the screen with zero VFX-feedback during the 1.5s flight. Bomb
// trail was a thin smoke string. This module gives every projectile a soft
// pulsing aura + occasional spark drops, so eye never rests on a static frame
// during the 600-1700ms flight windows.
//
// Pure draw helpers + a tiny sparkle pool. No persistent state outside the
// pool so this can be safely called from the render loop.

const _sparks = [];
const SPARK_LIFE = 360;
const MAX_SPARKS = 80;

/**
 * Drop a sparkle at a projectile's current position. Called every few frames
 * by the host renderer (throttled to keep particle count bounded).
 * @param {number} x @param {number} y @param {string} [color]
 */
export function dropSpark(x, y, color = '#FFE48A') {
  if (_sparks.length >= MAX_SPARKS) _sparks.shift();
  _sparks.push({
    x, y, t0: performance.now(),
    vx: (Math.random() - 0.5) * 18,
    vy: 30 + Math.random() * 40,  // gentle fall
    color,
    size: 1.4 + Math.random() * 1.6,
  });
}

/**
 * Render the additive glow halo at the projectile head. Cheap radial gradient.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x @param {number} y
 * @param {object} opts {radius, color, alpha}
 */
export function drawGlowHalo(ctx, x, y, opts = {}) {
  const r = opts.radius ?? 26;
  const color = opts.color ?? 'rgba(255,220,140,1)';
  const alpha = opts.alpha ?? 0.55;
  const t = performance.now();
  // 6Hz subtle alpha pulse so the glow breathes (avoids static halo).
  const pulse = 0.85 + 0.15 * Math.sin(t * 0.012);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * pulse;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(0.5, color.replace('1)', '0.5)'));
  g.addColorStop(1, color.replace('1)', '0)'));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Tick + draw all live sparks. Cheap (max 80). */
export function drawSparks(ctx) {
  if (_sparks.length === 0) return;
  const now = performance.now();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = _sparks.length - 1; i >= 0; i--) {
    const s = _sparks[i];
    const dt = (now - s.t0) / 1000;
    const age = (now - s.t0) / SPARK_LIFE;
    if (age >= 1) { _sparks.splice(i, 1); continue; }
    const px = s.x + s.vx * dt;
    const py = s.y + s.vy * dt;
    ctx.globalAlpha = (1 - age) * 0.85;
    ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.arc(px, py, s.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Frame-skip counter so we drop ~1 spark per projectile every ~50ms.
let _frameTick = 0;
export function shouldDropSpark() {
  _frameTick = (_frameTick + 1) % 3;
  return _frameTick === 0;
}
