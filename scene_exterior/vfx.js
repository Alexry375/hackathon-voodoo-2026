// Scene-wide VFX overlay for the exterior view.
// Owns: explosions, smoke trails, low-HP castle damage chunks.
// Procedural Canvas2D — no image assets, no deps.
// All state lives in module-local pools to avoid per-frame allocations.

const MAX_PARTICLES = 340;

/** @typedef {{x:number,y:number,vx:number,vy:number,life_ms:number,age_ms:number,kind:number,size:number,hue:number,alive:boolean,smokeColor?:string,rot?:number,rotV?:number}} Particle */

// kind enum: 0=spark, 1=smoke, 2=dust, 3=ring, 4=flash, 5=feather
const KIND_SPARK = 0;
const KIND_SMOKE = 1;
const KIND_DUST = 2;
const KIND_RING = 3;
const KIND_FLASH = 4;
const KIND_FEATHER = 5;

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

// palette presets — source game explosions are fiery yellow/orange.
const PALETTES = {
  player: { hueBase: 38,  hueRange: 22, flashHue: 50 }, // gold → orange fireball
  enemy:  { hueBase: 15,  hueRange: 18, flashHue: 28 }, // orange-red impact
};

/**
 * @param {number} x
 * @param {number} y
 * @param {{ size: 'small' | 'big', palette?: 'player' | 'enemy' }} opts
 */
export function triggerExplosion(x, y, { size, palette = 'player' }) {
  const big = size === 'big';
  const pal = PALETTES[palette] || PALETTES.player;

  // Central flash: white-hot at center, fades to transparent.
  const flash = spawn();
  flash.x = x; flash.y = y;
  flash.vx = 0; flash.vy = 0;
  flash.life_ms = big ? 320 : 180;
  flash.age_ms = 0;
  flash.kind = KIND_FLASH;
  flash.size = big ? 140 : 70;
  flash.hue = pal.flashHue;
  flash.alive = true;

  // Hot bright sparks — fast upward bias, yellow-orange core color.
  const sparkCount = big ? 40 : 20;
  for (let i = 0; i < sparkCount; i++) {
    const p = spawn();
    const ang = Math.random() * Math.PI * 2;
    const spd = (big ? 280 : 170) * (0.3 + Math.random() * 0.9);
    p.x = x + (Math.random() - 0.5) * (big ? 16 : 8);
    p.y = y + (Math.random() - 0.5) * (big ? 16 : 8);
    p.vx = Math.cos(ang) * spd;
    p.vy = Math.sin(ang) * spd - (big ? 90 : 50);
    p.life_ms = 350 + Math.random() * (big ? 400 : 200);
    p.age_ms = 0;
    p.kind = KIND_SPARK;
    p.size = (big ? 6 : 3.5) + Math.random() * 3.5;
    p.hue = pal.hueBase + Math.random() * pal.hueRange;
    p.alive = true;
  }

  // Black smoke puffs rising from impact — gives the fire a base.
  const dustCount = big ? 10 : 5;
  for (let i = 0; i < dustCount; i++) {
    const p = spawn();
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
    const spd = (big ? 55 : 32) * (0.4 + Math.random() * 0.7);
    p.x = x + (Math.random() - 0.5) * 30;
    p.y = y + (Math.random() - 0.5) * 20;
    p.vx = Math.cos(ang) * spd;
    p.vy = Math.sin(ang) * spd;
    p.life_ms = 800 + Math.random() * 600;
    p.age_ms = 0;
    p.kind = KIND_DUST;
    p.size = (big ? 28 : 16) + Math.random() * 14;
    p.hue = 0;
    p.alive = true;
  }

  // Outer shock ring — bright warm color instead of plain white.
  const ring = spawn();
  ring.x = x; ring.y = y;
  ring.vx = 0; ring.vy = 0;
  ring.life_ms = big ? 200 : 130;
  ring.age_ms = 0;
  ring.kind = KIND_RING;
  ring.size = big ? 120 : 60;
  ring.hue = pal.flashHue;
  ring.alive = true;
}

/**
 * Crow-specific impact: dark explosion flash + floating feathers.
 * Feathers drift down slowly with rocking rotation, matching source footage.
 * @param {number} x @param {number} y
 */
export function spawnCrowImpact(x, y) {
  // Small dark flash — crows carry a bomb but it's not super bright.
  const flash = spawn();
  flash.x = x; flash.y = y; flash.vx = 0; flash.vy = 0;
  flash.life_ms = 220; flash.age_ms = 0; flash.kind = KIND_FLASH;
  flash.size = 65; flash.hue = 28; flash.alive = true; // sombre orange

  // Dark charcoal dust puff (bomb smoke).
  for (let i = 0; i < 7; i++) {
    const p = spawn();
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    const spd = 40 * (0.5 + Math.random() * 0.6);
    p.x = x + (Math.random() - 0.5) * 20; p.y = y + (Math.random() - 0.5) * 14;
    p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd;
    p.life_ms = 700 + Math.random() * 500; p.age_ms = 0;
    p.kind = KIND_DUST; p.size = 20 + Math.random() * 16; p.hue = 0; p.alive = true;
  }

  // Feathers — burst outward then drift down with rocking rotation.
  const featherCount = 10 + Math.round(Math.random() * 5);
  for (let i = 0; i < featherCount; i++) {
    const p = spawn();
    const ang = Math.random() * Math.PI * 2;
    const spd = 80 + Math.random() * 120;
    p.x = x + (Math.random() - 0.5) * 40; p.y = y + (Math.random() - 0.5) * 30;
    p.vx = Math.cos(ang) * spd * 0.7; p.vy = Math.sin(ang) * spd - 80;
    p.life_ms = 1400 + Math.random() * 900; p.age_ms = 0;
    p.kind = KIND_FEATHER;
    p.size = 9 + Math.random() * 10; // bigger = more readable
    p.hue = 0;
    p.rot = Math.random() * Math.PI * 2;
    p.rotV = (Math.random() - 0.5) * 5;
    p.alive = true;
  }
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} vx
 * @param {number} vy
 */
// Per Q4 Gemini analysis:
// rocket (cyclop): pinkish-red #D95B5B, thick ~35px, short lifespan ~200ms
// volley (skeleton): grey #8D8D8D, thin ~12px, long lifespan ~1200ms (traces full arc)
// default: grey, medium
const SMOKE_BY_WEAPON = {
  rocket: { color: '#D95B5B', size: 18, life_ms: 200 },
  volley: { color: '#8D8D8D', size:  6, life_ms: 1200 },
  beam:   { color: '#F28C1F', size: 10, life_ms: 500 },
  crow:   { color: '#383838', size: 22, life_ms: 1400 }, // Q1: dark charcoal, puffier trail
};

export function triggerSmokeTrail(x, y, vx, vy, weapon_type = 'rocket') {
  const cfg = SMOKE_BY_WEAPON[weapon_type] || SMOKE_BY_WEAPON.rocket;
  const p = spawn();
  p.x = x; p.y = y;
  p.vx = -vx * 0.15 + (Math.random() - 0.5) * 20;
  p.vy = -vy * 0.15 - 15 - Math.random() * 15;
  p.life_ms = cfg.life_ms * (0.8 + Math.random() * 0.4);
  p.age_ms = 0;
  p.kind = KIND_SMOKE;
  p.size = cfg.size * (0.8 + Math.random() * 0.4);
  p.hue = 0;
  // Store color in an extra field — draw loop reads p.smokeColor.
  p.smokeColor = cfg.color;
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

function _tickParticle(p, dt_s) {
  if (p.kind === KIND_SPARK) p.vy += 480 * dt_s;
  else if (p.kind === KIND_DUST) p.vy += 30 * dt_s;
  else if (p.kind === KIND_FEATHER) {
    // Low gravity, high drag — floats and rocks.
    p.vy += 65 * dt_s;           // weak gravity
    p.vx *= (1 - dt_s * 1.2);   // horizontal drag
    p.vy *= (1 - dt_s * 0.8);   // vertical drag
    p.rot = (p.rot || 0) + (p.rotV || 0) * dt_s;
    // Gentle side-to-side drift using rotation as a sine phase.
    p.vx += Math.sin(p.rot * 2) * 8 * dt_s;
  }
  p.x += p.vx * dt_s;
  p.y += p.vy * dt_s;
}

function _drawSingleParticle(ctx, p) {
  const t = p.age_ms / p.life_ms;
  const fade = 1 - t;

  if (p.kind === KIND_SPARK) {
    const hueShift = p.hue - t * 20;
    ctx.globalAlpha = Math.min(1, fade * 1.2);
    ctx.fillStyle = `hsl(${hueShift}, 100%, ${70 - t * 30}%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.6 + fade * 0.6), 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === KIND_SMOKE) {
    ctx.globalAlpha = fade * 0.55;
    ctx.fillStyle = p.smokeColor || '#9aa0a6';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1 + t * 1.5), 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === KIND_DUST) {
    ctx.globalAlpha = Math.min(0.50, fade * 0.60);
    ctx.fillStyle = '#3A2010';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1 + t * 1.1), 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === KIND_RING) {
    const r = p.size * (0.3 + t * 1.4);
    ctx.globalAlpha = fade * 0.85;
    const h = p.hue || 50;
    ctx.strokeStyle = `hsla(${h}, 90%, 70%, ${fade.toFixed(3)})`;
    ctx.lineWidth = (6 * fade + 1);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
  } else if (p.kind === KIND_FLASH) {
    const r = p.size * (0.5 + t * 0.8);
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    const h = p.hue || 50;
    grad.addColorStop(0,    `rgba(255,255,255,${(fade * 0.95).toFixed(3)})`);
    grad.addColorStop(0.25, `hsla(${h + 15}, 100%, 90%, ${(fade * 0.80).toFixed(3)})`);
    grad.addColorStop(0.6,  `hsla(${h}, 90%, 60%, ${(fade * 0.45).toFixed(3)})`);
    grad.addColorStop(1,    `hsla(${h - 10}, 80%, 40%, 0)`);
    ctx.globalAlpha = fade;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === KIND_FEATHER) {
    // Curved feather: a short tapered arc drawn as two bezier curves.
    const s = p.size;
    ctx.globalAlpha = Math.min(0.92, fade * 1.1);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot || 0);
    ctx.fillStyle = '#1C1C1C';
    ctx.strokeStyle = '#0A0A0A';
    ctx.lineWidth = 0.8;
    // Feather barbs — two overlapping teardrop lobes, dark grey with lighter edge.
    ctx.fillStyle = '#2A2A2A';
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.55, -s * 0.3, s * 0.65, s * 0.4, 0, s);
    ctx.bezierCurveTo(-s * 0.65, s * 0.4, -s * 0.55, -s * 0.3, 0, -s);
    ctx.closePath();
    ctx.fill();
    // Lighter edge outline so it reads against dark background.
    ctx.strokeStyle = 'rgba(140,140,140,0.6)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Central quill — slightly lighter.
    ctx.strokeStyle = 'rgba(160,160,160,0.5)';
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.lineTo(0, s * 0.8); ctx.stroke();
    ctx.restore();
  }
}

function drawParticles(ctx, dt_ms) {
  const dt_s = dt_ms / 1000;
  ctx.save();

  // Tick all particles first.
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particles[i];
    if (!p.alive) continue;
    p.age_ms += dt_ms;
    if (p.age_ms >= p.life_ms) { p.alive = false; continue; }
    _tickParticle(p, dt_s);
  }

  // Draw in layers: flash/dust/smoke/ring/feather (background), then sparks on top.
  // Pass 1: everything except sparks
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particles[i];
    if (!p.alive || p.kind === KIND_SPARK) continue;
    _drawSingleParticle(ctx, p);
  }
  // Pass 2: sparks on top — with additive-style glow via shadowBlur
  ctx.shadowBlur = 18;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particles[i];
    if (!p.alive || p.kind !== KIND_SPARK) continue;
    const t = p.age_ms / p.life_ms;
    const h = p.hue - t * 20;
    ctx.shadowColor = `hsl(${h}, 100%, 60%)`;
    _drawSingleParticle(ctx, p);
  }
  ctx.shadowBlur = 0;

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
  ctx.strokeStyle = 'rgba(80,75,70,0.55)';
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
// ─── Floating damage numbers ─────────────────────────────────────────────────
/** @type {{x:number, y:number, age_ms:number, life_ms:number, text:string, color:string}[]} */
const dmgNums = [];

/**
 * Spawn a floating "-N" number at a world position.
 * @param {number} x @param {number} y @param {number} amount @param {'player'|'enemy'} side
 */
export function spawnDamageNumber(x, y, amount, side = 'player') {
  dmgNums.push({
    x, y: y - 20,
    age_ms: 0,
    life_ms: 900,
    text: `-${amount}`,
    color: side === 'player' ? '#FFD700' : '#FF4040',
  });
}

function drawDamageNumbers(ctx, dt_ms) {
  for (let i = dmgNums.length - 1; i >= 0; i--) {
    const d = dmgNums[i];
    d.age_ms += dt_ms;
    d.y -= dt_ms * 0.045; // float upward
    if (d.age_ms >= d.life_ms) { dmgNums.splice(i, 1); continue; }
    const alpha = d.age_ms < 200 ? 1 : 1 - (d.age_ms - 200) / (d.life_ms - 200);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.strokeText(d.text, d.x, d.y);
    ctx.fillStyle = d.color;
    ctx.fillText(d.text, d.x, d.y);
    ctx.restore();
  }
}

// World-space pass: explosion sparks/smoke/dust/rings (positions are world
// coords from triggerExplosion / triggerSmokeTrail callers). Caller MUST
// have applied the camera transform before this.
export function updateAndDraw(ctx, _viewport, dt_ms, _hp = {}) {
  drawParticles(ctx, dt_ms);
  drawDamageNumbers(ctx, dt_ms);
}

// Source game is sunny — no rain. Kept as a no-op to preserve the call site.
export function drawRainOverlay(_ctx, _viewport, _dt_ms) {}
