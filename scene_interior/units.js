/**
 * Unit sprites for the interior cross-section view — Cyclop, Skeleton, Orc.
 * Uses official Castle Clashers PNG assets via window.ASSETS (loaded by
 * assets-inline.js). Idle bob, hidden when state.units[i].alive=false.
 *
 * Each mob also holds a weapon (CC0 sprite) that:
 *   - Is always visible (rest pose) for ambient mobs.
 *   - Rotates live with the aim drag for the active mob.
 *   - Pivots around the grip point (per-mob calibration).
 */

import { state } from '../shared/state.js';
import { getFloorAnchor } from './castle_section.js';
import { getImage } from '../shared/assets.js';
import { getActiveUnitId } from './turn.js';
import { getCurrentAim } from './aim.js';

const SPRITE_SIZE = 110; // px, square draw box. Source PNGs are 512×512 with transparent padding.
const ASSET_BY_ID = { cyclop: 'CYCLOP', skeleton: 'SKELETON', orc: 'ORC' };

/**
 * Per-mob weapon config.
 *  - asset:     window.ASSETS key (loaded via getImage).
 *  - width:     drawn width on canvas (height auto from natural aspect).
 *  - anchor:    {x,y} offset from mob centre (mob centre = a.x, a.y - SPRITE_SIZE/2).
 *               Positive x = to the mob's right (towards enemy castle).
 *  - pivot:     {x,y} normalised pivot inside the weapon sprite (0..1).
 *               This is where the mob "holds" it — rotation centre.
 *  - restAngle: degrees, applied when the mob isn't actively aiming.
 *               Convention: 0° = horizontal pointing right; positive = downward.
 */
const WEAPON_BY_ID = {
  skeleton: { asset: 'WEAPON_SKELETON', width: 72, anchor: { x:  18, y: -10 }, pivot: { x: 0.20, y: 0.55 }, restAngle: -25 },
  cyclop:   { asset: 'WEAPON_CYCLOP',   width: 46, anchor: { x:  22, y:   4 }, pivot: { x: 0.25, y: 0.65 }, restAngle: -20 },
  orc:      { asset: 'WEAPON_ORC',      width: 46, anchor: { x:  20, y:   6 }, pivot: { x: 0.25, y: 0.65 }, restAngle: -20 },
};

/**
 * Draw all alive units at their ledge anchors, with idle bob.
 * Each mob is rendered first, then its weapon on top so the weapon
 * reads in front of the body.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t  // performance.now() / 1000, seconds
 */
export function drawUnits(ctx, t) {
  const bob = Math.sin(t * 2 * Math.PI * 0.7) * 3;
  const activeId = getActiveUnitId();
  const liveAim = getCurrentAim();

  for (const u of state.units) {
    if (!u.alive) continue;
    const a = getFloorAnchor(u.floor);
    if (!a) continue;
    const assetName = ASSET_BY_ID[u.id];
    if (!assetName) continue;
    const img = getImage(assetName);
    const x = a.x - SPRITE_SIZE / 2;
    const y = a.y + bob - SPRITE_SIZE;
    ctx.drawImage(img, x, y, SPRITE_SIZE, SPRITE_SIZE);

    _drawWeapon(ctx, u, a, bob, u.id === activeId ? liveAim : null);
  }
}

/**
 * Render a mob's held weapon, rotated either to the live aim angle (active
 * mob during drag) or to its rest angle.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{id: string}} u
 * @param {{x: number, y: number}} a   // floor anchor
 * @param {number} bob
 * @param {{angle_deg: number}|null} aim
 */
function _drawWeapon(ctx, u, a, bob, aim) {
  const cfg = WEAPON_BY_ID[u.id];
  if (!cfg) return;
  const img = getImage(cfg.asset);
  if (!img || !img.width) return;

  // Mob centre in canvas coords (matches the 110×110 draw box used above).
  const mobCx = a.x;
  const mobCy = a.y + bob - SPRITE_SIZE / 2;

  // Weapon native aspect → drawn height.
  const w = cfg.width;
  const h = w * (img.height / img.width);

  // Aim drag emits angle_deg in projectile-launch convention (0° = right,
  // positive = upward). The weapon visual convention is: 0° = horizontal,
  // positive = downward (Canvas2D rotate sign). So flip the sign.
  const angleDeg = aim ? -aim.angle_deg : cfg.restAngle;

  ctx.save();
  ctx.imageSmoothingEnabled = false;     // keep pixel art crisp on upscale
  ctx.translate(mobCx + cfg.anchor.x, mobCy + cfg.anchor.y);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.drawImage(img, -cfg.pivot.x * w, -cfg.pivot.y * h, w, h);
  ctx.restore();
}
