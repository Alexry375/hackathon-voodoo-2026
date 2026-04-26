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

// Single cinematic crow for the opening pan — no damage, just camera bait.
/** @type {Projectile | null} */
let _introCrow = null;
/** @type {(() => void) | null} */
let _introCrowOnArrived = null;

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
 * Spawn the opening cinematic crow: flies red castle → blue castle, no damage.
 * @param {() => void} [onArrived]  called once crow reaches blue castle
 */
export function startIntroCrow(onArrived) {
  _introCrow = _makeIntroCrow();
  _introCrowOnArrived = onArrived || null;
}

function _makeIntroCrow() {
  const x = WORLD.red_castle.x + rand(20, 60);
  const y = WORLD.ground_y - WORLD.castle_h * rand(0.55, 0.80);
  const tx = WORLD.blue_castle.x + rand(-60, 60);
  const ty = WORLD.ground_y - WORLD.castle_h * 0.6 + rand(-30, 30);
  // ~3s to cross — slow enough to be a smooth cinematic pan.
  const flightMs = rand(2800, 3400);
  return { x, y, vx: (tx - x) / flightMs, vy: (ty - y) / flightMs,
           tx, ty, ttlMs: flightMs, totalMs: flightMs, smokeAccumMs: 0, resolved: false };
}

/** Returns the current intro crow world position (or null if not active). */
export function getIntroCrowPos() {
  if (!_introCrow || _introCrow.resolved) return null;
  return { x: _introCrow.x, y: _introCrow.y };
}

/** Stop the intro crow early (e.g. if EXTERIOR_OBSERVE fires before pan completes). */
export function stopIntroCrow() { _introCrow = null; _introCrowOnArrived = null; }

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
  try { vfx.spawnCrowImpact(p.x, p.y); } catch (_) {}
  playSfx({ volume: 0.9, rate: 0.65 });
  addBite(p.x, p.y, { size });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{w:number,h:number}} viewport
 * @param {number} dt_ms
 */
export function updateAndDraw(ctx, viewport, dt_ms) {
  // Update + draw intro crow independently of the wave system.
  if (_introCrow) {
    const dt = Math.min(dt_ms, 64);
    _introCrow.x += _introCrow.vx * dt;
    _introCrow.y += _introCrow.vy * dt;
    _introCrow.ttlMs -= dt;
    _introCrow.smokeAccumMs += dt;
    if (_introCrow.smokeAccumMs > 55) {
      _introCrow.smokeAccumMs = 0;
      try { vfx.triggerSmokeTrail(_introCrow.x, _introCrow.y, -_introCrow.vx * 0.3, -_introCrow.vy * 0.3, 'crow'); } catch (_) {}
    }
    if (_introCrow.ttlMs <= 0) {
      const cb = _introCrowOnArrived;
      _introCrow = null;
      _introCrowOnArrived = null;
      if (cb) try { cb(); } catch (e) { console.error('[enemy_ai] introCrowOnArrived threw:', e); }
    }
    if (_introCrow) _drawCrow(ctx, _introCrow);
  }

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
    if (p.smokeAccumMs > 50) {
      p.smokeAccumMs = 0;
      try { vfx.triggerSmokeTrail(p.x, p.y, -p.vx * 0.3, -p.vy * 0.3, 'crow'); } catch (_) {}
    }
    if (p.ttlMs <= 0) resolveImpact(p);
  }

  // Render crows — black bird silhouette matching source clip2.mp4.
  for (const p of wave.projectiles) {
    if (p.resolved) continue;
    _drawCrow(ctx, p);
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

function _drawCrow(ctx, p) {
  const flightElapsed = (p.totalMs - p.ttlMs) / 1000;
  // Alternating wing phase: left flaps up when right flaps down (natural bird motion).
  const flapPhase = flightElapsed * 9;
  const wingL = Math.sin(flapPhase) * 18;       // left wing Y offset (up = negative)
  const wingR = Math.sin(flapPhase + Math.PI) * 18; // right wing opposite phase
  const angle = Math.atan2(p.vy, p.vx);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // Scale: source crow wingspan ≈ 12-15% of castle height (~300wu). ws=20 → total span ~40wu.
  // Camera zoom ~0.6 means world units shrink on screen. At scale 2.0 → 80wu wingspan,
  // rendered at 0.6 zoom = 48 screen px. Castle viewport height ~360px → 48/360 ≈ 13%. Correct.
  ctx.scale(2.0, 2.0);

  ctx.fillStyle = '#1A1A1A';

  // Tail fan — drawn first (behind everything).
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-17, -5); ctx.lineTo(-15, 0); ctx.lineTo(-17, 5);
  ctx.closePath(); ctx.fill();

  // Body — elongated ellipse, slight upward angle.
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2); ctx.fill();

  // Wings — asymmetric flap; each is a filled bezier lobe.
  const ws = 20;
  // Left wing
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath(); ctx.moveTo(-2, -1);
  ctx.bezierCurveTo(-6, wingL * 0.55, -ws * 0.75, wingL, -ws, wingL);
  ctx.bezierCurveTo(-ws * 0.5, wingL * 0.2, -4, 5, -2, -1);
  ctx.closePath(); ctx.fill();
  // Wing highlight strip along leading edge (top face catches light).
  ctx.strokeStyle = 'rgba(80,80,80,0.40)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-2, -1);
  ctx.bezierCurveTo(-6, wingL * 0.55, -ws * 0.75, wingL, -ws, wingL);
  ctx.stroke();
  // Right wing
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath(); ctx.moveTo(-2, 1);
  ctx.bezierCurveTo(-6, wingR * 0.55, -ws * 0.75, wingR, -ws, wingR);
  ctx.bezierCurveTo(-ws * 0.5, wingR * 0.2, -4, -5, -2, 1);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(80,80,80,0.40)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-2, 1);
  ctx.bezierCurveTo(-6, wingR * 0.55, -ws * 0.75, wingR, -ws, wingR);
  ctx.stroke();

  // Head
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath(); ctx.arc(12, -2, 5, 0, Math.PI * 2); ctx.fill();
  // Eye — small white dot.
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(14, -3, 1.2, 0, Math.PI * 2); ctx.fill();
  // Beak
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath(); ctx.moveTo(16, -3); ctx.lineTo(22, -1); ctx.lineTo(16, 1); ctx.closePath(); ctx.fill();

  // Bomb hangs below the crow in WORLD space (world-down), not local-down.
  // Undo the flight rotation, draw in unrotated world frame so bomb always hangs down.
  ctx.restore();
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(2.0, 2.0);
  // Short cord — source shows bomb close to talons.
  ctx.strokeStyle = '#2A2A2A'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(0, 14); ctx.stroke();
  // Bomb body — flat matte black sphere. Radius ~7 ≈ 60% of body half-length (11), matches source.
  ctx.fillStyle = '#111111';
  ctx.beginPath(); ctx.arc(0, 21, 7, 0, Math.PI * 2); ctx.fill();
  // Skull emblem — white, flat, centered.
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 6px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('☠', 0, 21);

  ctx.restore();
}
