/**
 * Unit sprites for the interior cross-section view — Cyclop, Skeleton, Orc.
 * Uses official Castle Clashers PNG assets via window.ASSETS (loaded by
 * assets-inline.js). Idle bob, hidden when state.units[i].alive=false.
 */

import { state } from '../shared/state.js';
import { getFloorAnchor } from './castle_section.js';
import { getImage } from '../shared/assets.js';

const SPRITE_SIZE = 110; // px, square draw box. Source PNGs are 512×512 with transparent padding.
const ASSET_BY_ID = { cyclop: 'CYCLOP', skeleton: 'SKELETON', orc: 'ORC' };

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
  }
}
