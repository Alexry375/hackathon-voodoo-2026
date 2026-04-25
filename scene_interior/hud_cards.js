/**
 * Bottom HUD card panel — wooden plank with 3 character cards.
 * Visual-only, static. Anchored to RESSOURCES/ref_frames/frame_05s.jpg.
 * Layout: plank y 810..960; cards 140×130 at y 800; tread gears at corners.
 */

const PANEL_Y = 810, PANEL_H = 110;
const CARD_W = 140, CARD_H = 130, CARD_Y = 800;
const CARD_GAP = (540 - CARD_W * 3) / 4; // ≈ 30
const CARDS = [
  { id: 'cyclop',   x: CARD_GAP },
  { id: 'skeleton', x: CARD_GAP * 2 + CARD_W },
  { id: 'orc',      x: CARD_GAP * 3 + CARD_W * 2 },
];

const C = {
  wood:'#8B5E3C', woodLight:'#A07040', woodDark:'#5C3D24', outline:'#000',
  checkerD:'#3A3D44', checkerL:'#C8C8CC', bodyTop:'#9DA0A6', bodyBot:'#5C5F66',
  cyclop:'#D14444', cyclopShade:'#8E2A2A',
  skull:'#E8E8E8', armor:'#3A3A3A',
  orc:'#5B9C3A', orcShade:'#3D6B26', band:'#C13030', tusk:'#FFF8E2',
  tread:'#2A2A2A', gear:'#7C7368',
};

/** @param {CanvasRenderingContext2D} ctx */
export function drawHudCards(ctx) {
  _plank(ctx);
  _gear(ctx, 32, PANEL_Y + PANEL_H - 6);
  _gear(ctx, 508, PANEL_Y + PANEL_H - 6);
  for (const c of CARDS) _card(ctx, c.x, CARD_Y, c.id);
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

function _card(ctx, x, y, id) {
  const r = 12;
  // Body gradient inside rounded rect
  ctx.save();
  _rr(ctx, x, y, CARD_W, CARD_H, r); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + CARD_H);
  g.addColorStop(0, C.bodyTop); g.addColorStop(1, C.bodyBot);
  ctx.fillStyle = g; ctx.fillRect(x, y, CARD_W, CARD_H);
  ctx.restore();
  // Portrait
  const cx = x + CARD_W / 2, cy = y + CARD_H / 2 + 4;
  if (id === 'cyclop')   _cyclop(ctx, cx, cy);
  if (id === 'skeleton') _skeleton(ctx, cx, cy);
  if (id === 'orc')      _orc(ctx, cx, cy);
  // Checker frame
  _checker(ctx, x, y, CARD_W, CARD_H, r);
  // Outer outline
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

function _cyclop(ctx, cx, cy) {
  ctx.fillStyle = C.cyclop;
  ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = C.cyclopShade;
  ctx.beginPath(); ctx.arc(cx, cy + 12, 30, 0.1, Math.PI - 0.1); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx, cy - 6, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(cx, cy - 6, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - 6, cy + 16); ctx.lineTo(cx + 6, cy + 16); ctx.stroke();
}

function _skeleton(ctx, cx, cy) {
  ctx.fillStyle = C.armor;
  _rr(ctx, cx - 26, cy + 4, 52, 32, 6); ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = C.skull;
  ctx.beginPath(); ctx.arc(cx, cy - 8, 26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(cx - 9, cy - 10, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 9, cy - 10, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#F5C542';
  ctx.beginPath(); ctx.arc(cx - 9, cy - 10, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 9, cy - 10, 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(cx + i * 5, cy + 8); ctx.lineTo(cx + i * 5, cy + 13); ctx.stroke();
  }
}

function _orc(ctx, cx, cy) {
  ctx.fillStyle = C.orc;
  ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = C.orcShade;
  ctx.beginPath(); ctx.arc(cx, cy + 10, 30, 0.1, Math.PI - 0.1); ctx.fill();
  ctx.fillStyle = C.band; ctx.fillRect(cx - 34, cy - 22, 68, 9);
  ctx.strokeStyle = C.outline; ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - 34, cy - 22, 68, 9);
  ctx.fillStyle = C.band; ctx.fillRect(cx + 22, cy - 16, 10, 8);
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx - 18, cy - 6); ctx.lineTo(cx - 4, cy - 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 18, cy - 6); ctx.lineTo(cx + 4, cy - 2); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx - 11, cy + 2, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 11, cy + 2, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(cx - 11, cy + 2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 11, cy + 2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.tusk; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy + 12); ctx.lineTo(cx - 4, cy + 20); ctx.lineTo(cx - 10, cy + 18);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 7, cy + 12); ctx.lineTo(cx + 4, cy + 20); ctx.lineTo(cx + 10, cy + 18);
  ctx.closePath(); ctx.fill(); ctx.stroke();
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
