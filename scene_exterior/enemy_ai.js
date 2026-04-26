// Enemy attack cinematic during EXTERIOR_OBSERVE.
// Spawns a wave of incoming rockets from off-screen upper-left toward the player (blue) castle.
// Owner: this module. Other modules read only the locked exports below.

import { state, applyDamageToSelf } from '../shared/state.js';
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
 * @property {number} vx @property {number} vy
 * @property {number} tx @property {number} ty
 * @property {number} ttlMs
 * @property {number} totalMs
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
 * @param {boolean} castleOnly  when true, never target units (opening wave)
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

  // Crows always target the castle — units only die when fired as projectiles.
  const kind = /** @type {'castle' | 'unit'} */ ('castle');
  const unitId = null;

  return { x, y, vx, vy, tx, ty, ttlMs: flightMs, totalMs: flightMs,
           smokeAccumMs: 0, resolved: false };
}

/**
 * @param {Projectile} p
 */
function resolveImpact(p) {
  if (p.resolved) return;
  p.resolved = true;

  // Opening wave: 7 crows × ~4.5 avg = ~31% total → player ends at ~69% (matches source ~67%).
  // Normal wave: 2 crows × ~4.5 avg = ~9% total → chip damage between turns.
  const dmg = Math.round(rand(3, 6));

  applyDamageToSelf(-dmg);
  const size = dmg >= 5 ? 'big' : 'small';
  try { vfx.triggerExplosion(p.x, p.y, { size, palette: 'enemy' }); } catch (_) {}
  playSfx({ volume: 0.9, rate: 0.65 });
  addBite(p.x, p.y, { size });
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
      try { vfx.triggerSmokeTrail(p.x, p.y, -p.vx * 0.3, -p.vy * 0.3, 'crow'); } catch (_) {}
    }
    if (p.ttlMs <= 0) resolveImpact(p);
  }

  // Render crows — black bird silhouette matching source clip2.mp4.
  for (const p of wave.projectiles) {
    if (p.resolved) continue;
    // Use elapsed flight time for per-crow phase offset so wings don't all flap in sync.
    const flightElapsed = (p.totalMs - p.ttlMs) / 1000;
    const wingFlap = Math.sin(flightElapsed * 8) * 12;

    const angle = Math.atan2(p.vy, p.vx);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = '#1A1A1A';

    // Body: filled ellipse torso
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head: small circle at the front
    ctx.beginPath();
    ctx.arc(10, -2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Beak: small triangle tip
    ctx.beginPath();
    ctx.moveTo(13, -3); ctx.lineTo(17, -1); ctx.lineTo(13, 1);
    ctx.closePath();
    ctx.fill();

    // Left wing: bezier arc flapping up from body center
    const wingSpan = 12;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-4, -wingFlap * 0.5, -wingSpan * 0.7, -wingFlap, -wingSpan, -wingFlap);
    ctx.bezierCurveTo(-wingSpan * 0.6, -wingFlap * 0.3, -3, 4, 0, 0);
    ctx.closePath();
    ctx.fill();

    // Right wing: mirror of left wing
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-4, wingFlap * 0.5, -wingSpan * 0.7, wingFlap, -wingSpan, wingFlap);
    ctx.bezierCurveTo(-wingSpan * 0.6, wingFlap * 0.3, -3, -4, 0, 0);
    ctx.closePath();
    ctx.fill();

    // Tail feathers: small fan at rear
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(-14, -4); ctx.lineTo(-12, 0); ctx.lineTo(-14, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
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
