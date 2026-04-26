import { drawRaven } from './raven.js';

export function drawRavenFlock(ctx, elapsedMs, params) {
  const {
    from, to, durMs,
    sinAmp = 40,
    sinHalfCycles = 3,
    spreadPx = 60,
    ravenSize = 60,
    flapSpeed = 5,
  } = params;

  const u = Math.max(0, Math.min(1, elapsedMs / durMs));
  const done = elapsedMs >= durMs;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const mirror = dx < 0;
  const half = spreadPx / 2;
  const dir = mirror ? -1 : 1;

  const baseX = from.x + dx * u;
  const baseY = from.y + dy * u;

  const wave = Math.sin(u * Math.PI * sinHalfCycles);
  const offset = wave * sinAmp;

  const tSec = elapsedMs / 1000;

  // A leads by spreadPx/2 along travel direction, oscillates +sin
  // B trails by spreadPx/2,                       oscillates -sin (strict opposition)
  const ax = baseX + dir * half;
  const ay = baseY + offset;
  const bx = baseX - dir * half;
  const by = baseY - offset;

  drawRaven(ctx, ax, ay, tSec, { size: ravenSize, mirror, flapSpeed });
  drawRaven(ctx, bx, by, tSec, { size: ravenSize, mirror, flapSpeed });

  return {
    a: { x: ax, y: ay, done },
    b: { x: bx, y: by, done },
  };
}

export function ravenFlockPath(params, samples = 80) {
  const {
    from, to, durMs,
    sinAmp = 40,
    sinHalfCycles = 3,
    spreadPx = 60,
  } = params;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dir = dx < 0 ? -1 : 1;
  const half = spreadPx / 2;
  const a = [], b = [];
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const baseX = from.x + dx * u;
    const baseY = from.y + dy * u;
    const offset = Math.sin(u * Math.PI * sinHalfCycles) * sinAmp;
    a.push([baseX + dir * half, baseY + offset]);
    b.push([baseX - dir * half, baseY - offset]);
  }
  return { a, b };
}
