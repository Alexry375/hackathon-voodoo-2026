// Scene-wide VFX overlay for the exterior view.
// Owns: rain, explosions, smoke trails, low-HP castle damage chunks.
// Procedural Canvas2D — no image assets, no deps.
// All state lives in module-local pools to avoid per-frame allocations.

const MAX_PARTICLES = 200;
const RAIN_COUNT = 80;

/** @typedef {{x:number,y:number,vx:number,vy:number,life_ms:number,age_ms:number,kind:number,size:number,hue:number,alive:boolean}} Particle */

// kind enum: 0=explosion spark, 1=smoke puff, 2=dust, 3=ring (single per explosion)
const KIND_SPARK = 0;
const KIND_SMOKE = 1;
const KIND_DUST = 2;
const KIND_RING = 3;

/** @type {Particle[]} */
const particles = [];
for (let i = 0; i < MAX_PARTICLES; i++) {
  particles.push({ x:0, y:0, vx:0, vy:0, life_ms:0, age_ms:0, kind:0, size:0, hue:0, alive:false });
}

/** @type {{x:number,y:number,len:number,speed:number}[]} */
const rain = [];
let rain_inited = false;

function initRain(w, h) {
  rain.length = 0;
  for (let i = 0; i < RAIN_COUNT; i++) {
    rain.push({
      x: Math.random() * w,
      y: Math.random() * h,
      len: 10 + Math.random() * 14,
      speed: 600 + Math.random() * 400, // px/s
    });
  }
  rain_inited = true;
}

function spawn() {
  // Reuse a dead slot; if none free, overwrite the oldest spark (cheapest visual loss).
  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (!particles[i].alive) return particles[i];
  }
  let oldest = particles[0], oldest_age = -1;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (particles[i].kind === KIND_SPARK && particles[i].age_ms > oldest_age) {
      oldest = particles[i]; oldest_age = particles[i].age_ms;
    }
  }
  return oldest;
}

/**
 * No-op loader; exported to honor the pipeline contract (other modules await all loadXxx()).
 * @returns {Promise<void>}
 */
export function loadVfxAssets() {
  return Promise.resolve();
}

// palette presets — player shots burn warm (yellow/orange), enemy shots
// burn cold/dark (violet/black) per spec §VFX.
const PALETTES = {
  player: { hueBase: 30,  hueRange: 30,  dustColor: '#5a4a3a' }, // amber → orange
  enemy:  { hueBase: 270, hueRange: 30,  dustColor: '#1a1020' }, // violet → near-black
};

/**
 * @param {number} x
 * @param {number} y
 * @param {{ size: 'small' | 'big', palette?: 'player' | 'enemy' }} opts
 */
export function triggerExplosion(x, y, { size, palette = 'player' }) {
  const big = size === 'big';
  const sparkCount = big ? 30 : 15;
  const dustCount = big ? 8 : 4;
  const pal = PALETTES[palette] || PALETTES.player;

  for (let i = 0; i < sparkCount; i++) {
    const p = spawn();
    const ang = Math.random() * Math.PI * 2;
    const spd = (big ? 220 : 140) * (0.4 + Math.random() * 0.8);
    p.x = x; p.y = y;
    p.vx = Math.cos(ang) * spd;
    p.vy = Math.sin(ang) * spd - (big ? 60 : 30);
    p.life_ms = 450 + Math.random() * (big ? 350 : 200);
    p.age_ms = 0;
    p.kind = KIND_SPARK;
    p.size = (big ? 5 : 3) + Math.random() * 3;
    p.hue = pal.hueBase + Math.random() * pal.hueRange;
    p.alive = true;
  }

  for (let i = 0; i < dustCount; i++) {
    const p = spawn();
    const ang = Math.random() * Math.PI * 2;
    const spd = (big ? 60 : 35) * (0.3 + Math.random() * 0.8);
    p.x = x + (Math.random() - 0.5) * 20;
    p.y = y + (Math.random() - 0.5) * 20;
    p.vx = Math.cos(ang) * spd;
    p.vy = Math.sin(ang) * spd - 20;
    p.life_ms = 700 + Math.random() * 500;
    p.age_ms = 0;
    p.kind = KIND_DUST;
    p.size = (big ? 22 : 14) + Math.random() * 10;
    p.hue = 0;
    p.alive = true;
  }

  // Single expanding ring; size encodes target radius in `size`, lifetime is what fades it.
  const ring = spawn();
  ring.x = x; ring.y = y;
  ring.vx = 0; ring.vy = 0;
  ring.life_ms = 150;
  ring.age_ms = 0;
  ring.kind = KIND_RING;
  ring.size = big ? 90 : 50;
  ring.hue = 0;
  ring.alive = true;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} vx
 * @param {number} vy
 */
export function triggerSmokeTrail(x, y, vx, vy) {
  const p = spawn();
  p.x = x; p.y = y;
  // Drift opposite to projectile motion + slight upward buoyancy.
  p.vx = -vx * 0.15 + (Math.random() - 0.5) * 20;
  p.vy = -vy * 0.15 - 15 - Math.random() * 15;
  p.life_ms = 500 + Math.random() * 300;
  p.age_ms = 0;
  p.kind = KIND_SMOKE;
  p.size = 6 + Math.random() * 5;
  p.hue = 0;
  p.alive = true;
}

function drawRain(ctx, w, h, dt_s) {
  ctx.save();
  ctx.strokeStyle = 'rgba(200,220,240,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  // Diagonal wind-blown rain; ~15° lean matches frame_18s reference.
  const dx_per_dy = 0.27;
  for (let i = 0; i < rain.length; i++) {
    const r = rain[i];
    r.y += r.speed * dt_s;
    r.x += r.speed * dt_s * dx_per_dy;
    if (r.y > h + 20 || r.x > w + 20) {
      r.y = -r.len - Math.random() * 40;
      r.x = Math.random() * (w + 100) - 50;
    }
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x + r.len * dx_per_dy, r.y + r.len);
  }
  ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx, dt_ms) {
  const dt_s = dt_ms / 1000;
  ctx.save();
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particles[i];
    if (!p.alive) continue;
    p.age_ms += dt_ms;
    if (p.age_ms >= p.life_ms) { p.alive = false; continue; }

    // Gravity for sparks/dust; smoke and rings get none.
    if (p.kind === KIND_SPARK) p.vy += 480 * dt_s;
    else if (p.kind === KIND_DUST) p.vy += 30 * dt_s;

    p.x += p.vx * dt_s;
    p.y += p.vy * dt_s;

    const t = p.age_ms / p.life_ms;
    const fade = 1 - t;

    if (p.kind === KIND_SPARK) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = `hsl(${p.hue}, 90%, ${55 + (1 - t) * 20}%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + fade * 0.5), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === KIND_SMOKE) {
      ctx.globalAlpha = fade * 0.55;
      ctx.fillStyle = '#9aa0a6';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + t * 1.5), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === KIND_DUST) {
      ctx.globalAlpha = fade * 0.5;
      ctx.fillStyle = '#5a4a3a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + t * 0.8), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === KIND_RING) {
      const r = p.size * (0.3 + t * 1.4);
      ctx.globalAlpha = fade;
      ctx.strokeStyle = `rgba(255, 240, 200, ${fade.toFixed(3)})`;
      ctx.lineWidth = 4 * fade + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Per-side cached chunk geometry. Keyed by side+threshold so we don't re-randomize each frame
// (jittering polygons every frame looks like TV static — bad).
// v0 chunk overlay, will refine.
/** @type {Record<string, {x:number,y:number,r:number,verts:{x:number,y:number}[]}[]>} */
const chunk_cache = {};

function seededRand(seed) {
  // Cheap deterministic PRNG (mulberry32-ish) so chunks are stable per side.
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getChunks(side, count, seedBase) {
  const key = `${side}:${count}`;
  if (chunk_cache[key]) return chunk_cache[key];
  const rnd = seededRand(seedBase + count * 17);
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = 18 + rnd() * 38;
    const verts = [];
    const v = 6 + ((rnd() * 4) | 0);
    for (let j = 0; j < v; j++) {
      const a = (j / v) * Math.PI * 2;
      const rr = r * (0.55 + rnd() * 0.65);
      verts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr });
    }
    out.push({
      x: (rnd() - 0.5) * 0.7,  // normalized within castle bbox; expanded to px in drawChunks
      y: rnd() * 0.85 + 0.05,
      r,
      verts,
    });
  }
  chunk_cache[key] = out;
  return out;
}

// Hardcoded per spec: blue castle at center-bottom, ~h*0.6 tall, ~h*0.46 wide.
// Red castle uses same bbox (the exterior view only shows one castle at a time per scene_manager state).
function drawChunks(ctx, w, h, hp_pct, side) {
  if (hp_pct >= 70) return;
  let count, scale;
  if (hp_pct < 15) { count = 7; scale = 1.6; }
  else if (hp_pct < 40) { count = 5; scale = 1.2; }
  else { count = 3; scale = 0.85; }

  const cx = w / 2;
  const cy_top = h * 0.78 - h * 0.60;
  const bbox_w = h * 0.46;
  const bbox_h = h * 0.60;

  const chunks = getChunks(side, count, side === 'blue' ? 1337 : 7331);

  ctx.save();
  ctx.fillStyle = 'rgba(15,12,18,0.88)';
  for (const c of chunks) {
    const px = cx + c.x * bbox_w;
    const py = cy_top + c.y * bbox_h;
    ctx.beginPath();
    for (let i = 0; i < c.verts.length; i++) {
      const v = c.verts[i];
      const x = px + v.x * scale;
      const y = py + v.y * scale;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  // Subtle inner highlight along chunk edges suggests broken stone.
  ctx.strokeStyle = 'rgba(80,60,90,0.55)';
  ctx.lineWidth = 1.5;
  for (const c of chunks) {
    const px = cx + c.x * bbox_w;
    const py = cy_top + c.y * bbox_h;
    ctx.beginPath();
    for (let i = 0; i < c.verts.length; i++) {
      const v = c.verts[i];
      const x = px + v.x * scale;
      const y = py + v.y * scale;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ w: number, h: number }} viewport
 * @param {number} dt_ms
 * @param {{ hp_self_pct: number, hp_enemy_pct: number }} hp
 */
// World-space pass: explosion sparks/smoke/dust/rings (positions are world
// coords from triggerExplosion / triggerSmokeTrail callers). Caller MUST
// have applied the camera transform before this.
export function updateAndDraw(ctx, _viewport, dt_ms, _hp = {}) {
  drawParticles(ctx, dt_ms);
}

// Screen-space pass: rain only. Caller MUST call this OUTSIDE the camera
// transform so raindrops stay tied to the viewport, not the world.
export function drawRainOverlay(ctx, viewport, dt_ms) {
  const { w, h } = viewport;
  const dt_s = Math.min(dt_ms, 50) / 1000;
  if (!rain_inited) initRain(w, h);
  drawRain(ctx, w, h, dt_s);
}
