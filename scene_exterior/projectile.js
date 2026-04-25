// Player projectiles. Branches on player_fire payload's weapon_type:
//   rocket  (cyclop)   — single shot, low gravity, tendu trajectory
//   volley  (skeleton) — 3 staggered shots, higher gravity, parabolic cloche
//   beam    (orc)      — instant yellow beam, no ballistic flight
// Owner: Sami (scene_exterior). Listens to 'player_fire', emits 'cut_to_interior'
// once the LAST sub-shot of a wave has resolved.

import { on, emit } from '../shared/events.js';
import { state } from '../shared/state.js';
import { playSfx } from '../shared/audio.js';
import { WORLD } from '../shared/world.js';

const ASSET_BASE = 'assets/Castle Clashers Assets/';

/** @type {HTMLImageElement | null} */
let projectileImg = null;
/** @type {Promise<void> | null} */
let loadPromise = null;

const POST_IMPACT_MS = 150;
const SMOKE_EVERY_MS = 40;
const DAMAGE_MIN = 8;
const DAMAGE_MAX = 28;

// Weapon-specific tuning. Speed in WORLD units / ms; world battlefield is
// ~760 units wide between castle pivots so a power=0.7 rocket lands in ~600ms.
const WEAPON_TUNING = {
  rocket: { speed: 1.9, gravity: 0.0012, sprite: 44, splits: 1, angleJitter: 0,    damageMul: 1.0 },
  volley: { speed: 1.6, gravity: 0.0030, sprite: 26, splits: 3, angleJitter: 0.12, damageMul: 0.45 },
  beam:   { speed: 0,   gravity: 0,      sprite: 0,  splits: 0, angleJitter: 0,    damageMul: 1.1 },
};
const VOLLEY_STAGGER_MS = 90;
const BEAM_DURATION_MS  = 400;

/**
 * @typedef {Object} Projectile
 * @property {number} x @property {number} y
 * @property {number} vx @property {number} vy
 * @property {number} gravity
 * @property {number} t_ms
 * @property {number} smoke_acc_ms
 * @property {boolean} impacted
 * @property {number} post_impact_ms
 * @property {number} damage
 * @property {string} weapon_type
 * @property {boolean} damageEmitted
 * @property {number} sprite_size
 * @property {number} batchId           // shots sharing a batchId resolve as one cut_to_interior
 */

/**
 * @typedef {Object} Beam
 * @property {number} x0 @property {number} y0
 * @property {number} x1 @property {number} y1
 * @property {number} t_ms
 * @property {number} damage
 * @property {boolean} damageEmitted
 */

/** @type {Projectile[]} */
const active = [];
/** @type {Beam[]} */
const beams = [];
/** @type {{ payload:any, t_ms:number, remaining:number, batchId:number }[]} */
const volleyQueues = [];
/** @type {any[]} */
const pending = [];

// Batch tracker: each player_fire creates a new batch. cut_to_interior is
// emitted once, when the last shot of the batch impacts. Damage accumulates
// from each sub-shot's `damage` field.
let _nextBatchId = 1;
/** @type {Map<number, { remaining:number, totalDamage:number }>} */
const batches = new Map();
function _newBatch(splits) {
  const id = _nextBatchId++;
  batches.set(id, { remaining: splits, totalDamage: 0 });
  return id;
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`failed to load ${src}`));
    im.src = src;
  });
}

export function loadProjectileAssets() {
  if (loadPromise) return loadPromise;
  loadPromise = loadImg(ASSET_BASE + 'Projectile_1.png').then(im => { projectileImg = im; });
  return loadPromise;
}

on('player_fire', (payload) => { pending.push(payload); });

async function safeVfx(method, ...args) {
  try {
    const mod = await import('./vfx.js');
    if (typeof mod[method] === 'function') mod[method](...args);
  } catch (_) {}
}

function _baseDamage(power) {
  return Math.round(DAMAGE_MIN + (DAMAGE_MAX - DAMAGE_MIN) * Math.max(0.1, Math.min(1, power)));
}

// World-space launch + target. Launch from top of blue castle; target the
// upper-mid of the red castle.
const _LAUNCH_X = WORLD.blue_castle.x;
const _LAUNCH_Y = WORLD.ground_y - WORLD.castle_h * 0.75;
const _TARGET_X = WORLD.red_castle.x;
const _TARGET_Y = WORLD.ground_y - WORLD.castle_h * 0.55;

function _spawnRocketLike(payload, weapon_type, angleOffset, batchId) {
  const tune = WEAPON_TUNING[weapon_type];
  const angle = ((payload.angle_deg ?? 45) + angleOffset) * Math.PI / 180;
  const power = Math.max(0.1, Math.min(1, payload.power ?? 0.7));
  const speed = power * tune.speed;
  const vx = Math.cos(angle) * speed;
  const vy = -Math.sin(angle) * speed;
  const damage = Math.round(_baseDamage(power) * tune.damageMul);
  active.push({
    x: _LAUNCH_X, y: _LAUNCH_Y, vx, vy,
    gravity: tune.gravity,
    t_ms: 0, smoke_acc_ms: 0,
    impacted: false, post_impact_ms: 0,
    damage, weapon_type, damageEmitted: false,
    sprite_size: tune.sprite,
    batchId,
  });
}

function _spawnBeam(payload) {
  const power = Math.max(0.1, Math.min(1, payload.power ?? 0.7));
  const damage = Math.round(_baseDamage(power) * WEAPON_TUNING.beam.damageMul);
  beams.push({
    x0: _LAUNCH_X, y0: _LAUNCH_Y,
    x1: _TARGET_X, y1: _TARGET_Y,
    t_ms: 0, damage, damageEmitted: false,
  });
  safeVfx('triggerExplosion', _TARGET_X, _TARGET_Y, { size: 'big' });
  playSfx({ volume: 0.9, rate: 1.4 });
  _markImpact(_TARGET_X, _TARGET_Y);
}

function spawnFromPayload(payload) {
  const weapon_type = payload.weapon_type || 'rocket';
  if (weapon_type === 'beam') {
    _spawnBeam(payload);
    return;
  }
  const tune = WEAPON_TUNING[weapon_type] || WEAPON_TUNING.rocket;
  const batchId = _newBatch(tune.splits);
  if (tune.splits <= 1) {
    _spawnRocketLike(payload, weapon_type, 0, batchId);
  } else {
    _spawnRocketLike(payload, weapon_type, _jitter(tune.angleJitter), batchId);
    volleyQueues.push({ payload, t_ms: 0, remaining: tune.splits - 1, batchId });
  }
}

function _jitter(j) { return j === 0 ? 0 : (Math.random() * 2 - 1) * j * 8; }

function _resolveDamage(entity) {
  if (entity.damageEmitted) return;
  entity.damageEmitted = true;
  // Beams are batch-of-1 implicit. Rockets use the explicit batch tracker.
  if (entity.batchId == null) {
    emit('cut_to_interior', {
      hp_self_after: state.hp_self_pct,
      hp_enemy_after: Math.max(0, state.hp_enemy_pct - entity.damage),
      units_destroyed_ids: [],
    });
    return;
  }
  const b = batches.get(entity.batchId);
  if (!b) return;
  b.totalDamage += entity.damage;
  b.remaining -= 1;
  if (b.remaining <= 0) {
    batches.delete(entity.batchId);
    emit('cut_to_interior', {
      hp_self_after: state.hp_self_pct,
      hp_enemy_after: Math.max(0, state.hp_enemy_pct - b.totalDamage),
      units_destroyed_ids: [],
    });
  }
}

/**
 * Caller MUST have already applied the camera transform — projectiles draw
 * in world coordinates.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ w:number, h:number }} _viewport (unused; kept for signature parity)
 * @param {number} dt_ms
 */
export function updateAndDraw(ctx, _viewport, dt_ms) {
  while (pending.length) spawnFromPayload(pending.shift());

  const dt = Math.min(dt_ms, 50);
  const tY = _TARGET_Y;

  // Tick volley queues — fire each pending sub-shot once its stagger elapses.
  for (let i = volleyQueues.length - 1; i >= 0; i--) {
    const q = volleyQueues[i];
    q.t_ms += dt;
    while (q.remaining > 0 && q.t_ms >= VOLLEY_STAGGER_MS) {
      q.t_ms -= VOLLEY_STAGGER_MS;
      const tune = WEAPON_TUNING[q.payload.weapon_type] || WEAPON_TUNING.volley;
      _spawnRocketLike(q.payload, viewport, q.payload.weapon_type, _jitter(tune.angleJitter), q.batchId);
      q.remaining -= 1;
    }
    if (q.remaining === 0) volleyQueues.splice(i, 1);
  }

  // Beams — pure render + resolve once.
  for (let i = beams.length - 1; i >= 0; i--) {
    const b = beams[i];
    b.t_ms += dt;
    const t = Math.min(1, b.t_ms / BEAM_DURATION_MS);
    const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    ctx.save();
    ctx.globalAlpha = alpha;
    const grad = ctx.createLinearGradient(b.x0, b.y0, b.x1, b.y1);
    grad.addColorStop(0,    'rgba(255,236,120,0.9)');
    grad.addColorStop(0.5,  'rgba(255,180,40,1.0)');
    grad.addColorStop(1,    'rgba(255,90,20,0.95)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255,180,40,0.8)';
    ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
    // bright core
    ctx.shadowBlur = 0;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
    ctx.restore();
    if (b.t_ms >= BEAM_DURATION_MS * 0.4 && !b.damageEmitted) _resolveDamage(b);
    if (b.t_ms >= BEAM_DURATION_MS) beams.splice(i, 1);
  }

  // Rocket-likes (rocket, volley sub-shots).
  for (let i = active.length - 1; i >= 0; i--) {
    const p = active[i];

    if (!p.impacted) {
      p.x += p.vx * dt;
      p.y += p.vy * dt + 0.5 * p.gravity * dt * dt;
      p.vy += p.gravity * dt;
      p.t_ms += dt;

      p.smoke_acc_ms += dt;
      if (p.smoke_acc_ms >= SMOKE_EVERY_MS) {
        p.smoke_acc_ms = 0;
        safeVfx('triggerSmokeTrail', p.x, p.y, -p.vx * 0.3, -p.vy * 0.3);
      }

      const descending = p.vy > 0;
      if ((descending && p.y >= tY) || p.x > WORLD.width + 80 || p.t_ms > 3000) {
        p.impacted = true;
        const size = p.weapon_type === 'volley' ? 'small' : 'big';
        safeVfx('triggerExplosion', p.x, p.y, { size });
        playSfx({ volume: 0.9, rate: p.weapon_type === 'volley' ? 1.1 : 0.7 });
        _markImpact(p.x, p.y);
      }
    } else {
      p.post_impact_ms += dt;
      if (p.post_impact_ms >= POST_IMPACT_MS) {
        _resolveDamage(p);
        active.splice(i, 1);
        continue;
      }
    }

    if (!p.impacted && projectileImg) {
      const rot = Math.atan2(p.vy, p.vx);
      const s = p.sprite_size;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(rot);
      ctx.drawImage(projectileImg, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }
}

export function isFiring() {
  return active.length > 0 || beams.length > 0 || volleyQueues.length > 0 || pending.length > 0;
}

/** Lead projectile world position for camera follow, or null if none in flight. */
export function getLeadProjectilePos() {
  // Prefer the youngest in-flight rocket so camera keeps tracking the head of a volley.
  for (const p of active) if (!p.impacted) return { x: p.x, y: p.y };
  if (beams.length > 0) {
    const b = beams[0];
    const t = Math.min(1, b.t_ms / BEAM_DURATION_MS);
    return { x: b.x0 + (b.x1 - b.x0) * t, y: b.y0 + (b.y1 - b.y0) * t };
  }
  return null;
}

/** Last known impact point for camera focus, or null if no recent impact. */
let _lastImpact = /** @type {null | {x:number, y:number, t_ms:number}} */ (null);
export function getRecentImpact(maxAgeMs = 800) {
  if (!_lastImpact) return null;
  if (performance.now() - _lastImpact.t_ms > maxAgeMs) return null;
  return _lastImpact;
}
function _markImpact(x, y) { _lastImpact = { x, y, t_ms: performance.now() }; }
