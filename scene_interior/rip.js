/**
 * RIP gravestone module — interior scene.
 * For each dead unit (state.units[i].alive === false), draws a cartoon
 * gravestone standing on that unit's ledge anchor.
 *
 * Pure Canvas2D, no assets, no animation. Replaces the unit sprite at the
 * same anchor (units module is responsible for not drawing dead units).
 */

import { getActiveUnits } from '../shared/state.js';
import { getFloorAnchor } from './castle_section.js';

const STONE_W = 70;
const STONE_H = 90;

/**
 * Draw RIP gravestones for all dead units, on their respective ledges.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} [worldX]
 * @param {number} [worldY]
 * @param {number} [worldScale]
 */
/**
 * @param {import('../shared/state.js').Unit[]} [units]  override unit list (for world view)
 */
export function drawRipStones(ctx, worldX, worldY, worldScale, units) {
  const scale = worldScale ?? 1;
  for (const unit of (units ?? getActiveUnits())) {
    if (unit.alive) continue;
    const a = getFloorAnchor(unit.floor, worldX, worldY, worldScale);
    if (!a) continue;
    _drawStone(ctx, a.x, a.y, scale);
  }
}

function _drawStone(ctx, cx, groundY, scale = 1) {
  const w = STONE_W * scale, h = STONE_H * scale;
  const left = cx - w / 2;
  const top = groundY - h;
  const archR = w / 2;
  const archCenterY = top + archR;

  ctx.save();

  // ─── Earth mound at the base ───────────────────────────────────────────────
  ctx.fillStyle = '#2D4A2D';
  ctx.beginPath();
  ctx.ellipse(cx, groundY, w / 2 + 6, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();

  // ─── Stone body path (rectangle + arched top) ──────────────────────────────
  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(left, groundY);
    ctx.lineTo(left, archCenterY);
    ctx.arc(cx, archCenterY, archR, Math.PI, 0, false);
    ctx.lineTo(left + w, groundY);
    ctx.closePath();
  };

  // Base fill (mid stone tone).
  ctx.fillStyle = '#D8D8D2';
  bodyPath();
  ctx.fill();

  // Lighter top-left highlight (clipped to body shape).
  ctx.save();
  bodyPath();
  ctx.clip();
  ctx.fillStyle = '#E8E8E2';
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + w * 0.55, top);
  ctx.lineTo(left + w * 0.30, groundY);
  ctx.lineTo(left, groundY);
  ctx.closePath();
  ctx.fill();
  // Darker bottom-right shading.
  ctx.fillStyle = '#A8A8A2';
  ctx.beginPath();
  ctx.moveTo(left + w, top + archR * 0.5);
  ctx.lineTo(left + w, groundY);
  ctx.lineTo(left + w * 0.55, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3px black outline.
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  bodyPath();
  ctx.stroke();

  // ─── "RIP" carved text ─────────────────────────────────────────────────────
  const textY = archCenterY + 14;
  // Thin lighter line above text suggests carved depth.
  ctx.strokeStyle = '#EFEFEA';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 16, textY - 12);
  ctx.lineTo(cx + 16, textY - 12);
  ctx.stroke();

  ctx.fillStyle = '#3A3A3A';
  ctx.font = `bold ${Math.round(22 * scale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RIP', cx, textY + 4 * scale);

  ctx.restore();
}
