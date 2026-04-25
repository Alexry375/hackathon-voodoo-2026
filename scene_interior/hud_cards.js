/**
 * Bottom HUD card panel — wooden plank with 3 character cards.
 * Portraits use the official Castle Clashers PNGs via window.ASSETS.
 * Layout: plank y 810..960; cards 140×130 at y 800; tread gears at corners.
 */

import { getImage } from '../shared/assets.js';

const PANEL_Y = 810, PANEL_H = 110;
const CARD_W = 140, CARD_H = 130, CARD_Y = 800;
const CARD_GAP = (540 - CARD_W * 3) / 4; // ≈ 30
const CARDS = [
  { id: 'cyclop',   x: CARD_GAP,                    asset: 'CYCLOP'   },
  { id: 'skeleton', x: CARD_GAP * 2 + CARD_W,       asset: 'SKELETON' },
  { id: 'orc',      x: CARD_GAP * 3 + CARD_W * 2,   asset: 'ORC'      },
];

const C = {
  wood:'#8B5E3C', woodLight:'#A07040', woodDark:'#5C3D24', outline:'#000',
  checkerD:'#3A3D44', checkerL:'#C8C8CC', bodyTop:'#9DA0A6', bodyBot:'#5C5F66',
  tread:'#2A2A2A', gear:'#7C7368',
  activeGlow: '#FFD23A',
};

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string|null} [activeId] unit_id of the currently active card (highlighted)
 */
export function drawHudCards(ctx, activeId = null) {
  _plank(ctx);
  _gear(ctx, 32, PANEL_Y + PANEL_H - 6);
  _gear(ctx, 508, PANEL_Y + PANEL_H - 6);
  for (const c of CARDS) _card(ctx, c.x, CARD_Y, c.id, c.asset, c.id === activeId);
}

/**
 * @param {'cyclop'|'skeleton'|'orc'} unit_id
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function getCardBounds(unit_id) {
  const c = CARDS.find(c => c.id === unit_id);
  if (!c) throw new Error(`Unknown unit_id: ${unit_id}`);
  return { x: c.x, y: CARD_Y, w: CARD_W, h: CARD_H };
}

function _plank(ctx) {
  ctx.fillStyle = C.wood; ctx.fillRect(-10, PANEL_Y, 560, PANEL_H);
  ctx.fillStyle = C.woodLight; ctx.fillRect(-10, PANEL_Y, 560, 14);
  ctx.fillStyle = C.woodDark;  ctx.fillRect(-10, PANEL_Y + PANEL_H - 8, 560, 8);
  ctx.strokeStyle = C.woodDark; ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const y = PANEL_Y + 22 + i * 14;
    ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(550, y); ctx.stroke();
  }
  ctx.strokeStyle = C.outline; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-10, PANEL_Y); ctx.lineTo(550, PANEL_Y); ctx.stroke();
}

function _card(ctx, x, y, id, assetName, isActive) {
  const r = 12;
  // Body gradient inside rounded rect
  ctx.save();
  _rr(ctx, x, y, CARD_W, CARD_H, r); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + CARD_H);
  g.addColorStop(0, C.bodyTop); g.addColorStop(1, C.bodyBot);
  ctx.fillStyle = g; ctx.fillRect(x, y, CARD_W, CARD_H);
  // Portrait — official PNG, fit to a centered square inside the card frame
  const portrait = 100; // px box, leaves room for the checker frame (T=10)
  const cx = x + CARD_W / 2, cy = y + CARD_H / 2 + 4;
  const img = getImage(assetName);
  ctx.drawImage(img, cx - portrait / 2, cy - portrait / 2, portrait, portrait);
  ctx.restore();
  // Checker frame
  _checker(ctx, x, y, CARD_W, CARD_H, r);
  // Outer outline (yellow glow if active, black otherwise)
  if (isActive) {
    ctx.strokeStyle = C.activeGlow; ctx.lineWidth = 5;
    _rr(ctx, x, y, CARD_W, CARD_H, r); ctx.stroke();
  }
  ctx.strokeStyle = C.outline; ctx.lineWidth = 3;
  _rr(ctx, x, y, CARD_W, CARD_H, r); ctx.stroke();
}

function _checker(ctx, x, y, w, h, r) {
  const T = 10, S = 10;
  ctx.save();
  // Frame ring = outer rounded rect minus inner rounded rect (even-odd clip)
  ctx.beginPath();
  _rrSub(ctx, x, y, w, h, r);
  _rrSub(ctx, x + T, y + T, w - T * 2, h - T * 2, Math.max(0, r - 4));
  ctx.clip('evenodd');
  for (let py = y; py < y + h; py += S) {
    for (let px = x; px < x + w; px += S) {
      const k = (Math.floor((px - x) / S) + Math.floor((py - y) / S)) % 2;
      ctx.fillStyle = k ? C.checkerL : C.checkerD;
      ctx.fillRect(px, py, S, S);
    }
  }
  ctx.restore();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 1.5;
  _rr(ctx, x + T, y + T, w - T * 2, h - T * 2, Math.max(0, r - 4));
  ctx.stroke();
}

// Subpath form (no beginPath) for use in compound even-odd paths.
function _rrSub(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function _rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}


function _gear(ctx, cx, cy) {
  const r = 18;
  ctx.fillStyle = C.tread;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.gear;
  ctx.beginPath(); ctx.arc(cx, cy, r - 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r + 4, cy); ctx.lineTo(cx + r - 4, cy);
  ctx.moveTo(cx, cy - r + 4); ctx.lineTo(cx, cy + r - 4);
  ctx.stroke();
}
