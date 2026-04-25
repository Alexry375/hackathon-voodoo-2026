// Enemy attack cinematic during EXTERIOR_OBSERVE.
// Spawns a wave of incoming rockets from off-screen upper-left toward the player (blue) castle.
// Owner: this module. Other modules read only the locked exports below.

import { state, applyDamageToSelf, aliveUnits } from '../shared/state.js';
import { emit } from '../shared/events.js';
import { playSfx } from '../shared/audio.js';
import * as vfx from './vfx.js';

const ASSET_BASE = 'assets/Castle Clashers Assets/';

/** @type {HTMLImageElement | null} */
let rocketImg = null;
/** @type {Promise<void> | null} */
let loadPromise = null;

// Active wave state. Null when idle.
/** @type {null | {
 *   projectiles: Projectile[],
 *   pendingSpawns: number,
 *   spawnTimerMs: number,
 *   onComplete: () => void,
 *   completed: boolean,
 *   cooldownMs: number,
 * }} */
let wave = null;

/**
 * @typedef {Object} Projectile
 * @property {number} x @property {number} y
 * @property {number} vx @property {number} vy        // px/ms
 * @property {number} tx @property {number} ty        // target
 * @property {number} ttlMs                            // remaining flight time
 * @property {number} totalMs                          // for trail cadence
 * @property {'castle' | 'unit'} kind
 * @property {string | null} unitId                    // when kind === 'unit'
 * @property {number} smokeAccumMs
 * @property {boolean} resolved
 */

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`failed to load ${src}`));
    im.src = src;
  });
}

/** @returns {Promise<void>} */
export function loadEnemyAssets() {
  if (loadPromise) return loadPromise;
  loadPromise = loadImg(ASSET_BASE + 'Projectile_2.png').then(im => { rocketImg = im; });
  return loadPromise;
}

/** @returns {boolean} */
export function isAttacking() { return wave !== null; }

/**
 * @param {{ onComplete: () => void }} opts
 */
export function startEnemyAttack({ onComplete }) {
  // Guard against re-entry — caller bug, but don't double-fire onComplete.
  if (wave) return;
  wave = {
    projectiles: [],
    pendingSpawns: 2,
    spawnTimerMs: 0,
    onComplete,
    completed: false,
    cooldownMs: 400,
  };
}

function rand(a, b) { return a + Math.random() * (b - a); }

/**
 * @param {{w:number,h:number}} viewport
 * @returns {Projectile}
 */
function spawnProjectile(viewport) {
  const { w, h } = viewport;
  const x = rand(-40, w * 0.2);
  const y = rand(-80, h * 0.1);

  // Target the upper portion of the blue castle (drawCastles pivots at h*0.78,
  // castle height ~0.6h, so castle top ~h*0.18). Add jitter for variety.
  const tx = w * 0.5 + rand(-w * 0.08, w * 0.08);
  const ty = h * 0.5 + rand(-h * 0.05, h * 0.05);

  const flightMs = rand(700, 1000);
  const vx = (tx - x) / flightMs;
  const vy = (ty - y) / flightMs;

  // 30% of impacts target a unit floor — but only if a unit is alive. Otherwise wall.
  const alive = aliveUnits();
  let kind = /** @type {'castle' | 'unit'} */ ('castle');
  let unitId = null;
  if (alive.length > 0 && Math.random() < 0.3) {
    kind = 'unit';
    unitId = alive[Math.floor(Math.random() * alive.length)].id;
  }

  return { x, y, vx, vy, tx, ty, ttlMs: flightMs, totalMs: flightMs,
           kind, unitId, smokeAccumMs: 0, resolved: false };
}

/**
 * @param {Projectile} p
 */
function resolveImpact(p) {
  if (p.resolved) return;
  p.resolved = true;

  const dmg = Math.round(rand(5, 15));

  if (p.kind === 'unit' && p.unitId) {
    // scene_manager listens to 'unit_killed' and calls killUnit itself — do not call directly.
    emit('unit_killed', { unit_id: p.unitId });
    try { vfx.triggerExplosion(p.x, p.y, { size: 'small' }); } catch (_) {}
    playSfx({ volume: 0.8, rate: 1.1 });
  } else {
    applyDamageToSelf(-dmg);
    const size = dmg >= 11 ? 'big' : 'small';
    try { vfx.triggerExplosion(p.x, p.y, { size }); } catch (_) {}
    playSfx({ volume: 0.9, rate: 0.65 });
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{w:number,h:number}} viewport
 * @param {number} dt_ms
 */
export function updateAndDraw(ctx, viewport, dt_ms) {
  if (!wave) return;
  const dt = Math.min(dt_ms, 64); // clamp to avoid huge jumps on tab refocus

  // Stagger spawns by ~300ms.
  if (wave.pendingSpawns > 0) {
    wave.spawnTimerMs -= dt;
    if (wave.spawnTimerMs <= 0) {
      wave.projectiles.push(spawnProjectile(viewport));
      wave.pendingSpawns -= 1;
      wave.spawnTimerMs = 300;
    }
  }

  for (const p of wave.projectiles) {
    if (p.resolved) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.ttlMs -= dt;
    p.smokeAccumMs += dt;
    if (p.smokeAccumMs > 60) {
      p.smokeAccumMs = 0;
      try { vfx.triggerSmokeTrail(p.x, p.y, -p.vx * 0.3, -p.vy * 0.3); } catch (_) {}
    }
    if (p.ttlMs <= 0) resolveImpact(p);
  }

  // Render rockets — rotated to velocity. Skip resolved ones (their explosion is owned by vfx).
  if (rocketImg) {
    const size = 36;
    for (const p of wave.projectiles) {
      if (p.resolved) continue;
      const angle = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.drawImage(rocketImg, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  // Cinematic complete? All spawned, all resolved, then cooldown.
  const allDone = wave.pendingSpawns === 0 && wave.projectiles.every(p => p.resolved);
  if (allDone) {
    wave.cooldownMs -= dt;
    if (wave.cooldownMs <= 0 && !wave.completed) {
      wave.completed = true;
      const cb = wave.onComplete;
      wave = null;
      try { cb(); } catch (e) { console.error('[enemy_ai] onComplete threw:', e); }
    }
  }
}
