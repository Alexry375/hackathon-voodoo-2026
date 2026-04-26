/**
 * Unit sprites for the interior cross-section view — Cyclop, Skeleton, Orc.
 * Uses official Castle Clashers PNG assets via window.ASSETS (loaded by
 * assets-inline.js). Idle bob, hidden when state.units[i].alive=false.
 */

import { state } from '../shared/state.js';
import { getFloorAnchor } from './castle_section.js';
import { getImage, isImageReady } from '../shared/assets.js';

const SPRITE_SIZE = 110;
const ASSET_BY_ID    = { cyclop: 'CYCLOP', skeleton: 'SKELETON', orc: 'ORC' };
// Weapon sprite drawn to the right of each unit (pointing toward the right/enemy).
const WEAPON_BY_ID   = { cyclop: 'WEAPON_RED', skeleton: 'WEAPON_BLUE' };
const WEAPON_W = 72;
const WEAPON_H = 34;

// Warm the image cache on module load so isImageReady() flips quickly.
try { getImage('WEAPON_RED'); getImage('WEAPON_BLUE'); } catch (_) {}

/**
 * Draw all alive units at their ledge anchors, with idle bob.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t  // performance.now() / 1000, seconds
 */
export function drawUnits(ctx, t) {
  const bob = Math.sin(t * 2 * Math.PI * 0.7) * 3;
  for (const u of state.units) {
    if (!u.alive) continue;
    const a = getFloorAnchor(u.floor);
    if (!a) continue;
    const assetName = ASSET_BY_ID[u.id];
    if (!assetName) continue;
    const img = getImage(assetName);
    // Anchor = feet at ledge surface. Draw box centered on x, bottom on y+bob.
    const x = a.x - SPRITE_SIZE / 2;
    const y = a.y + bob - SPRITE_SIZE;
    ctx.drawImage(img, x, y, SPRITE_SIZE, SPRITE_SIZE);

    // Draw weapon sprite to the right of the unit, at mid-body height.
    const weaponKey = WEAPON_BY_ID[u.id];
    if (weaponKey && isImageReady(weaponKey)) {
      const wx = x + SPRITE_SIZE - 4;
      const wy = y + SPRITE_SIZE * 0.42 - WEAPON_H / 2;
      ctx.drawImage(getImage(weaponKey), wx, wy, WEAPON_W, WEAPON_H);
    }
  }
}
