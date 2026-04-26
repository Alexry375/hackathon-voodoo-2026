// Micro-feedback for INTERIOR_AIM dead-time and exterior dwell windows.
//
// 3 systems:
//   1. drawAimReadyPulse — soft cyan pulse ring around the active unit when
//      no drag is happening (tells the user "tap here").
//   2. drawDustMotes     — drifting dust particles inside the castle interior
//      (the cross-section view tends to feel static between turns).
//   3. drawAmbientHaze   — heat-shimmer / lingering smoke wisps over OURS
//      castle in exterior dwell + tap-await beats so the screen breathes.
//
// All three are deterministic over time (no spawn pool needed) → trivially
// cheap, no GC churn, safe to call every frame.

/**
 * Pulsing aim-ready ring around the active unit. Fades in only after the
 * tutorial hand demo concludes (so it doesn't fight the hand cursor).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number, y:number}} anchor
 * @param {number} t_sec
 * @param {number} alphaScale  // 0..1, host fades this out during transitions
 */
export function drawAimReadyPulse(ctx, anchor, t_sec, alphaScale = 1) {
  const x = anchor.x, y = anchor.y - 40;
  const phase = (t_sec * 0.9) % 1;        // ~1.1s period
  const r = 32 + phase * 56;
  const a = (1 - phase) * 0.35 * alphaScale;
  if (a <= 0.01) return;
  ctx.save();
  ctx.strokeStyle = `rgba(120,200,255,${a})`;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  // inner softer ring
  const r2 = 20 + phase * 28;
  ctx.strokeStyle = `rgba(255,255,255,${a * 0.8})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r2, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/**
 * Drifting interior dust motes — 14 deterministic particles parameterised by
 * time so they loop seamlessly. Each mote drifts up-and-right slowly and
 * twinkles. Costs ~14 fillRects per frame.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t_sec
 * @param {number} W @param {number} H
 */
export function drawDustMotes(ctx, t_sec, W, H) {
  const N = 14;
  ctx.save();
  for (let i = 0; i < N; i++) {
    // Each mote has a fixed phase + base position. We modulate over time so
    // they slowly traverse upward; wrap around H every PERIOD seconds.
    const PERIOD = 9 + (i % 4) * 1.8;
    const u = ((t_sec / PERIOD) + i * 0.137) % 1;
    const baseX = (i * 71) % W;
    const driftX = Math.sin((t_sec * 0.4) + i) * 18;
    const x = (baseX + driftX + W) % W;
    const y = H - 40 - u * (H - 200);  // bottom→top through interior area
    const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t_sec * 2 + i * 1.3));
    const a = (u < 0.1 ? u / 0.1 : (u > 0.9 ? (1 - u) / 0.1 : 1)) * twinkle * 0.35;
    ctx.fillStyle = `rgba(255,240,210,${a})`;
    const s = 1.4 + (i % 3) * 0.6;
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

/**
 * Ambient haze: 6 slow-drifting wisps painted over the OURS castle area in
 * exterior dwell windows. Always-on motion so the post-impact dwell never
 * looks frozen even after smoke particles decay.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t_sec
 * @param {{cx:number, cy:number}} center
 * @param {number} alphaScale
 */
export function drawAmbientHaze(ctx, t_sec, center, alphaScale = 1) {
  if (alphaScale <= 0.02) return;
  const N = 6;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < N; i++) {
    const phase = (t_sec * 0.18 + i * 0.16) % 1;
    const x = center.cx + Math.sin(t_sec * 0.4 + i * 1.7) * 80 + (i - N / 2) * 30;
    const y = center.cy - phase * 90;
    const r = 22 + phase * 36;
    const a = (1 - phase) * 0.06 * alphaScale;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,230,190,${a})`);
    g.addColorStop(1, 'rgba(255,230,190,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
