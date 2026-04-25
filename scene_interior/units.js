/**
 * Unit sprites for the interior cross-section view — Cyclop, Skeleton, Orc.
 * Procedural Canvas2D, idle bob animation, hidden when state.units[i].alive=false.
 *
 * Helper test page (delete after review): /home/alexis/Global/Claude_Projects/hackathon_voodoo/test_units.html
 */

import { state } from '../shared/state.js';
import { getFloorAnchor } from './castle_section.js';

const OUTLINE = '#000';
const STAND_H = 80; // approximate standing height in px

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
    const fx = a.x;          // feet x (ledge center)
    const fy = a.y + bob;    // feet y (top of ledge surface) + bob

    if (u.id === 'cyclop')        _drawCyclop(ctx, fx, fy);
    else if (u.id === 'skeleton') _drawSkeleton(ctx, fx, fy);
    else if (u.id === 'orc')      _drawOrc(ctx, fx, fy);
  }
}

// ─── Cyclop (red round body, single big eye) ─────────────────────────────────
function _drawCyclop(ctx, fx, fy) {
  const bodyW = 48, bodyH = 60;
  const bx = fx - bodyW / 2;
  const by = fy - bodyH;            // top of body
  const cx = fx;
  const cy = by + bodyH / 2;

  // Body — rounded rect
  _roundedRect(ctx, bx, by, bodyW, bodyH, 18, '#D14444');
  // Shading: lighter on upper-left
  ctx.save();
  _roundedRectPath(ctx, bx, by, bodyW, bodyH, 18);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.ellipse(bx + 14, by + 14, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(bx + bodyW - 10, by + bodyH - 12, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Outline
  _roundedRectPath(ctx, bx, by, bodyW, bodyH, 18);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();

  // Tiny stub arms
  ctx.fillStyle = '#D14444';
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(bx - 2, cy + 6, 6, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(bx + bodyW + 2, cy + 6, 6, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Big single eye
  const eyeR = 11;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(cx, by + 22, eyeR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
  // Pupil
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(cx + 1, by + 22, 4.5, 0, Math.PI * 2); ctx.fill();

  // Smile
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, by + 42, 6, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

// ─── Skeleton (white skull, dark body, holding a cannon) ─────────────────────
function _drawSkeleton(ctx, fx, fy) {
  const bodyW = 36, bodyH = 30;
  const headR = 18;
  const bx = fx - bodyW / 2;
  const by = fy - bodyH;            // body top
  const hx = fx;
  const hy = by - headR + 2;        // head center

  // Body (cloth) — trapezoid-ish
  ctx.fillStyle = '#3A3A3A';
  ctx.beginPath();
  ctx.moveTo(bx + 4, by);
  ctx.lineTo(bx + bodyW - 4, by);
  ctx.lineTo(bx + bodyW + 2, by + bodyH);
  ctx.lineTo(bx - 2, by + bodyH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
  // Body shading
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(bx + 2, by + 2, 8, bodyH - 6);

  // Head (skull)
  ctx.fillStyle = '#E8E8E8';
  ctx.beginPath(); ctx.arc(hx, hy, headR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
  // Skull shading upper-left
  ctx.save();
  ctx.beginPath(); ctx.arc(hx, hy, headR, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.beginPath(); ctx.ellipse(hx + 6, hy + 6, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Eye sockets (hollow black with yellow glow)
  for (const dx of [-6, 6]) {
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(hx + dx, hy - 2, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F5C842';
    ctx.beginPath(); ctx.arc(hx + dx, hy - 2, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  // Teeth area (yellow tinted)
  ctx.fillStyle = '#E8DA8A';
  ctx.fillRect(hx - 7, hy + 7, 14, 5);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
  ctx.strokeRect(hx - 7, hy + 7, 14, 5);
  // Tooth seams
  ctx.beginPath();
  ctx.moveTo(hx - 3, hy + 7); ctx.lineTo(hx - 3, hy + 12);
  ctx.moveTo(hx,     hy + 7); ctx.lineTo(hx,     hy + 12);
  ctx.moveTo(hx + 3, hy + 7); ctx.lineTo(hx + 3, hy + 12);
  ctx.stroke();

  // Cannon — pointing slightly right and up. Anchored at the right hand.
  const handX = bx + bodyW - 2;
  const handY = by + 14;
  const angle = -0.25; // slight up
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(angle);
  // Base / cap
  ctx.fillStyle = '#5C6068';
  ctx.fillRect(-8, -10, 10, 20);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
  ctx.strokeRect(-8, -10, 10, 20);
  // Barrel
  ctx.fillStyle = '#888B92';
  ctx.fillRect(0, -7, 30, 14);
  ctx.strokeRect(0, -7, 30, 14);
  // Muzzle ring
  ctx.fillStyle = '#3A3D44';
  ctx.fillRect(28, -8, 4, 16);
  ctx.strokeRect(28, -8, 4, 16);
  // Barrel highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(2, -5, 24, 3);
  ctx.restore();
}

// ─── Orc (green stocky, red headband, tusks) ─────────────────────────────────
function _drawOrc(ctx, fx, fy) {
  const bodyW = 50, bodyH = 62;
  const bx = fx - bodyW / 2;
  const by = fy - bodyH;
  const cx = fx;

  // Body
  _roundedRect(ctx, bx, by, bodyW, bodyH, 16, '#5B9C3A');
  // Shading
  ctx.save();
  _roundedRectPath(ctx, bx, by, bodyW, bodyH, 16); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.ellipse(bx + 14, by + 16, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.20)';
  ctx.beginPath(); ctx.ellipse(bx + bodyW - 10, by + bodyH - 12, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  _roundedRectPath(ctx, bx, by, bodyW, bodyH, 16);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();

  // Stub arms
  ctx.fillStyle = '#5B9C3A';
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(bx - 2, by + 32, 6, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(bx + bodyW + 2, by + 32, 6, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Red headband across forehead
  ctx.fillStyle = '#C8242A';
  ctx.fillRect(bx + 4, by + 8, bodyW - 8, 7);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
  ctx.strokeRect(bx + 4, by + 8, bodyW - 8, 7);
  // Headband knot tail
  ctx.fillStyle = '#C8242A';
  ctx.beginPath();
  ctx.moveTo(bx + 4, by + 11);
  ctx.lineTo(bx - 6, by + 6);
  ctx.lineTo(bx - 4, by + 16);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Angry eyebrows
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cx - 14, by + 22); ctx.lineTo(cx - 4, by + 26);
  ctx.moveTo(cx + 14, by + 22); ctx.lineTo(cx + 4, by + 26);
  ctx.stroke();

  // Eyes
  for (const dx of [-8, 8]) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(cx + dx, by + 30, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(cx + dx, by + 30, 2, 0, Math.PI * 2); ctx.fill();
  }

  // Mouth (frown) + tusks
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - 7, by + 46); ctx.lineTo(cx + 7, by + 46);
  ctx.stroke();
  // Tusks
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 5, by + 46); ctx.lineTo(cx - 7, by + 52); ctx.lineTo(cx - 3, by + 50); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 5, by + 46); ctx.lineTo(cx + 7, by + 52); ctx.lineTo(cx + 3, by + 50); ctx.closePath();
  ctx.fill(); ctx.stroke();
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function _roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function _roundedRect(ctx, x, y, w, h, r, fill) {
  _roundedRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill; ctx.fill();
}
