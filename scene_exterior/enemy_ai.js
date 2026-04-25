// Enemy attack cinematic during EXTERIOR_OBSERVE.
// Spawns a wave of incoming rockets from off-screen upper-left toward the player (blue) castle.
// Owner: this module. Other modules read only the locked exports below.

import { state, applyDamageToSelf, aliveUnits } from '../shared/state.js';
import { emit } from '../shared/events.js';
import { playSfx } from '../shared/audio.js';
import { WORLD } from '../shared/world.js';
import { getImage, isImageReady } from '../shared/assets.js';
import { addBite } from './damage_overlay.js';
import * as vfx from './vfx.js';

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

/** @returns {Promise<void>} */
export function loadEnemyAssets() {
  try { getImage('BOMB'); } catch (e) { console.warn('[enemy_ai] preload failed:', e); }
  return Promise.resolve();
}

/** @returns {boolean} */
export function isAttacking() { return wave !== null; }

/**
 * @param {{ onComplete: () => void, intensity?: 'opening' | 'normal' }} opts
 */
export function startEnemyAttack({ onComplete, intensity = 'normal' }) {
  // Guard against re-entry — caller bug, but don't double-fire onComplete.
  if (wave) return;
  // 'opening' = the no-input crisis hook, drops blue HP from 100% → ~30%.
  // 'normal' = chip damage between player turns.
  const pendingSpawns = intensity === 'opening' ? 7 : 2;
  wave = {
    projectiles: [],
    pendingSpawns,
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
function spawnProjectile(_viewport) {
  // Q1 (Gemini): crows enter from the right edge of the screen flying right→left
  // with a slight downward tilt. Camera is panned left (blue castle in view) so
  // the red castle is off-screen right — crows emerge from that right edge.
  // Spawn well off the right canvas edge in world coords; target the upper portion
  // of the blue castle.
  const x = WORLD.red_castle.x + rand(60, 140);  // off-screen right
  const y = WORLD.ground_y - WORLD.castle_h * rand(0.6, 0.9) + rand(-40, 40);
  const tx = WORLD.blue_castle.x + rand(-90, 90);
  const ty = WORLD.ground_y - WORLD.castle_h * 0.55 + rand(-30, 30);

  const flightMs = rand(800, 1200);
  const vx = (tx - x) / flightMs; // always negative (right→left)
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
    try { vfx.triggerExplosion(p.x, p.y, { size: 'small', palette: 'enemy' }); } catch (_) {}
    playSfx({ volume: 0.8, rate: 1.1 });
  } else {
    applyDamageToSelf(-dmg);
    const size = dmg >= 11 ? 'big' : 'small';
    try { vfx.triggerExplosion(p.x, p.y, { size, palette: 'enemy' }); } catch (_) {}
    playSfx({ volume: 0.9, rate: 0.65 });
    addBite(p.x, p.y, { size });
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
  if (isImageReady('BOMB')) {
    const img = getImage('BOMB');
    const size = 36;
    for (const p of wave.projectiles) {
      if (p.resolved) continue;
      const angle = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
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
