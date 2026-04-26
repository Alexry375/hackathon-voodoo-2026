// Per-unit projectile rendering. Each player unit fires a different sprite:
//   - skeleton → ROCKET (Projectile_1.png), spawned in a 4-shot burst
//   - cyclop   → BOMB   (Projectile_2.png), single shot with flashy trail
//   - orc      → procedural red ball (current behaviour, no PNG)
//
// This module exports pure draw helpers (no state). Trails are intentionally
// left to dedicated companion modules so the trail iteration loops don't
// collide with the sprite rendering itself.
//
// Expected unit_id values from shared/state.js: 'skeleton' | 'cyclop' | 'orc'.

import { getImage, isImageReady } from '../shared/assets.js';

// Kick the data-URI decode at module load so isImageReady('ROCKET'/'BOMB')
// flips to true on the first frame after mount instead of staying stuck on
// the procedural fallback forever (the lazy cache only populates when
// getImage is called, so without a bare call we'd never load the PNG).
try { getImage('ROCKET'); getImage('BOMB'); } catch (_) {}

/**
 * Plan describing how startPlayerShot should spawn projectiles for a given
 * unit. The `count` field is how many projectiles to push, `staggerMs` the
 * delay between them, and `assetKey` the window.ASSETS key to draw (or null
 * for the current procedural red ball).
 *
 * @typedef {{count:number, staggerMs:number, assetKey:'ROCKET'|'BOMB'|null,
 *            kind:'rocket'|'bomb_p2'|'rocket_p1', size:number, durMs:number,
 *            peakLift:number}} ShotPlan
 */

/** @type {Record<'skeleton'|'cyclop'|'orc', ShotPlan>} */
export const SHOT_BY_UNIT = {
  // 4-shot burst of small Projectile_1 missiles. Stagger 110 ms so they read
  // as a "rafale" without collapsing into one blob.
  skeleton: { count: 4, staggerMs: 110, assetKey: 'ROCKET', kind: 'rocket_p1',
              size: 30, durMs: 1500, peakLift: 360 },
  // Single Projectile_2 bomb, slower and chunkier. Heavy peakLift + slightly
  // slower than rocket so the flashy trail reads.
  cyclop:   { count: 1, staggerMs: 0,   assetKey: 'BOMB',   kind: 'bomb_p2',
              size: 44, durMs: 1700, peakLift: 420 },
  // Goblin keeps the current procedural red ball (kind:'rocket', no sprite
  // → falls back to the existing _drawRocketSprite procedural branch).
  orc:      { count: 1, staggerMs: 0,   assetKey: null,     kind: 'rocket',
              size: 36, durMs: 1500, peakLift: 380 },
};

/**
 * Resolve a shot plan from a unit_id, defaulting to the orc plan.
 * @param {string|undefined} unit_id
 */
export function planForUnit(unit_id) {
  return SHOT_BY_UNIT[/** @type {'skeleton'|'cyclop'|'orc'} */ (unit_id)]
      ?? SHOT_BY_UNIT.orc;
}

/**
 * Draw Projectile_1 (skeleton's small missile) oriented along its velocity.
 * No trail — the dedicated trail module composes that on top.
 */
export function drawProjectileP1(ctx, x, y, ang, size = 30) {
  if (!isImageReady('ROCKET')) {
    getImage('ROCKET'); // kick the lazy load
    // Fallback: small grey-red bullet shape so the playable still renders if
    // the asset failed to decode.
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = '#bcbcc4';
    ctx.fillRect(-size / 2, -size / 4, size, size / 2);
    ctx.fillStyle = '#c93030';
    ctx.fillRect(-size / 6, -size / 4, size / 3, size / 2);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.drawImage(getImage('ROCKET'), -size / 2, -size / 2, size, size);
  ctx.restore();
}

/**
 * Draw Projectile_2 (cyclop's bomb) oriented along its velocity.
 */
export function drawProjectileP2(ctx, x, y, ang, size = 44) {
  if (!isImageReady('BOMB')) {
    getImage('BOMB'); // kick the lazy load
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = '#3a3a22';
    ctx.beginPath(); ctx.ellipse(0, 0, size / 2, size / 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c14a2a';
    ctx.fillRect(size / 4, -size / 6, size / 4, size / 3);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.drawImage(getImage('BOMB'), -size / 2, -size / 2, size, size);
  ctx.restore();
}
