/**
 * Unit sprites for the interior cross-section view — Cyclop, Skeleton, Orc.
 * Uses official Castle Clashers PNG assets via window.ASSETS (loaded by
 * assets-inline.js). Idle bob, hidden when state.units[i].alive=false.
 */

import { getActiveUnits } from '../shared/state.js';
import { getFloorAnchor } from './castle_section.js';
import { getImage } from '../shared/assets.js';

const SPRITE_SIZE = 110; // px, square draw box. Source PNGs are 512×512 with transparent padding.
const ASSET_BY_ID = { cyclop: 'CYCLOP', skeleton: 'SKELETON', orc: 'ORC' };

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t  seconds
 * @param {number} [worldX]
 * @param {number} [worldY]
 * @param {number} [worldScale]
 * @param {import('../shared/state.js').Unit[]} [units]  override (for world view)
 */
export function drawUnits(ctx, t, worldX, worldY, worldScale, units) {
  const bob = Math.sin(t * 2 * Math.PI * 0.7) * 3;
  const scale = worldScale ?? 1;
  for (const u of (units ?? getActiveUnits())) {
    if (!u.alive) continue;
    const a = getFloorAnchor(u.floor, worldX, worldY, worldScale);
    if (!a) continue;
    const assetName = ASSET_BY_ID[u.id];
    if (!assetName) continue;
    const img = getImage(assetName);
    const sz = SPRITE_SIZE * scale;
    const x = a.x - sz / 2;
    const y = a.y + bob * scale - sz;
    ctx.drawImage(img, x, y, sz, sz);
  }
}
