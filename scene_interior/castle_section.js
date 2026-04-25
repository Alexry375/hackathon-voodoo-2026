/**
 * Castle cross-section sprite renderer — 540×960 Canvas2D, no assets.
 */

const C_LEFT   = 20,  C_RIGHT  = 520;
const C_TOP    = 170, C_BOTTOM = 820;
const C_WIDTH  = C_RIGHT - C_LEFT;
const C_HEIGHT = C_BOTTOM - C_TOP;
const WALL_W   = 60;
const INT_LEFT  = C_LEFT  + WALL_W;
const INT_RIGHT = C_RIGHT - WALL_W;
const INT_WIDTH = INT_RIGHT - INT_LEFT;
const FLOOR_H   = 20;
const FLOOR_Y   = [
  C_TOP + Math.round(C_HEIGHT * 0.26),
  C_TOP + Math.round(C_HEIGHT * 0.54),
  C_TOP + Math.round(C_HEIGHT * 0.81),
];
const PIVOT_X = (C_LEFT + C_RIGHT) / 2;
const PIVOT_Y = C_BOTTOM;

let _anchors  = [null, null, null];
let _lastTilt = null;

/**
 * Draw the player castle cross-section.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{tilt_deg?: number, damage_level?: number}} [opts]
 */
export function drawCastleSection(ctx, opts = {}) {
  const tilt = opts.tilt_deg     ?? 0;
  const dmg  = opts.damage_level ?? 0;
  const rad  = (tilt * Math.PI) / 180;
  if (tilt !== _lastTilt) { _anchors = [null, null, null]; _lastTilt = tilt; }
  ctx.save();
  ctx.translate(PIVOT_X, PIVOT_Y);
  ctx.rotate(rad);
  ctx.translate(-PIVOT_X, -PIVOT_Y);
  _drawBody(ctx, dmg);
  ctx.restore();
}

/**
 * Returns screen-space platform anchor (post-rotation).
 * @param {0|1|2} floor
 * @returns {{x: number, y: number, width: number}}
 */
export function getFloorAnchor(floor) {
  if (_anchors[floor]) return _anchors[floor];
  const rad = ((_lastTilt ?? 0) * Math.PI) / 180;
  const dx = INT_LEFT + INT_WIDTH / 2 - PIVOT_X;
  const dy = FLOOR_Y[floor] - PIVOT_Y;
  _anchors[floor] = {
    x: PIVOT_X + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: PIVOT_Y + dx * Math.sin(rad) + dy * Math.cos(rad),
    width: INT_WIDTH,
  };
  return _anchors[floor];
}

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  dark: '#1A1C20', mid: '#28292E', light: '#35383F',
  outline: '#000', platBrown: '#7A4520', platLight: '#A06230',
  platDark: '#502E12', baseWood: '#8B5E3C', baseLight: '#A07040',
  blue: '#3A86C7', sky: '#88CCAA',
};

// ─── Main body ───────────────────────────────────────────────────────────────
function _drawBody(ctx, dmg) {
  // Sky visible between turrets / through open top
  ctx.fillStyle = C.sky;
  ctx.fillRect(INT_LEFT, 30, INT_WIDTH, C_TOP);

  // Left & right stone walls
  _slab(ctx, C_LEFT,    C_TOP, WALL_W, C_HEIGHT);
  _slab(ctx, INT_RIGHT, C_TOP, WALL_W, C_HEIGHT);

  // Interior back wall
  ctx.fillStyle = C.dark;
  ctx.fillRect(INT_LEFT, C_TOP, INT_WIDTH, C_HEIGHT);
  _bricks(ctx, INT_LEFT, C_TOP, INT_WIDTH, C_HEIGHT);

  // Platforms (floor 0 gone at dmg≥2)
  for (let f = 0; f < 3; f++) {
    if (f === 0 && dmg >= 2) continue;
    _platform(ctx, INT_LEFT, FLOOR_Y[f], INT_WIDTH, FLOOR_H);
  }

  // Battlements
  _battlements(ctx, C_LEFT,    C_TOP, WALL_W, dmg < 3);
  _battlements(ctx, INT_RIGHT, C_TOP, WALL_W, dmg < 2);

  // Turret spires
  if (dmg < 2) _turret(ctx, C_LEFT,    C_TOP, WALL_W);
  if (dmg < 1) _turret(ctx, INT_RIGHT, C_TOP, WALL_W);

  // Damage rip
  if (dmg >= 1) _jaggedRip(ctx, INT_LEFT, C_TOP, INT_WIDTH, dmg);

  // Wall outlines
  ctx.strokeStyle = C.outline; ctx.lineWidth = 4;
  ctx.strokeRect(C_LEFT,    C_TOP, WALL_W, C_HEIGHT);
  ctx.strokeRect(INT_RIGHT, C_TOP, WALL_W, C_HEIGHT);

  // Wooden base
  _base(ctx, C_LEFT, C_BOTTOM, C_WIDTH, 44);
}

// ─── Drawing primitives ──────────────────────────────────────────────────────
function _slab(ctx, x, y, w, h) {
  ctx.fillStyle = C.dark;
  ctx.fillRect(x, y, w, h);
  _bricks(ctx, x, y, w, h);
}

function _bricks(ctx, x, y, w, h) {
  const BW = 32, BH = 22;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let r = 0; r <= Math.ceil(h / BH) + 1; r++) {
    const ry = y + r * BH;
    const shift = (r % 2) ? BW / 2 : 0;
    for (let col = -1; col <= Math.ceil(w / BW) + 2; col++) {
      const rx = x + col * BW - shift;
      const t = (r * 3 + col * 2) % 5;
      ctx.fillStyle = t > 3 ? C.light : t > 1 ? C.mid : C.dark;
      ctx.fillRect(rx + 1, ry + 1, BW - 2, BH - 2);
    }
  }
  ctx.restore();
}

function _platform(ctx, x, y, w, h) {
  ctx.fillStyle = C.platBrown; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.platLight; ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = C.platDark;  ctx.fillRect(x, y + h - 4, w, 4);
  ctx.strokeStyle = C.platDark; ctx.lineWidth = 1.5;
  for (let px = x + 38; px < x + w; px += 38) {
    ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + h); ctx.stroke();
  }
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function _battlements(ctx, x, top, wallW, show) {
  if (!show) return;
  const mH = 34, mW = 24, gap = 6;
  const n = Math.floor(wallW / (mW + gap));
  const sx = x + (wallW - (n * mW + (n - 1) * gap)) / 2;
  for (let i = 0; i < n; i++) {
    const mx = sx + i * (mW + gap), my = top - mH;
    _slab(ctx, mx, my, mW, mH);
    ctx.strokeStyle = C.outline; ctx.lineWidth = 3;
    ctx.strokeRect(mx, my, mW, mH);
  }
}

function _turret(ctx, wx, wallTop, wallW) {
  const tH = 70, tY = wallTop - 35 - tH;
  _slab(ctx, wx, tY, wallW, tH);
  ctx.strokeStyle = C.outline; ctx.lineWidth = 3;
  ctx.strokeRect(wx, tY, wallW, tH);
  ctx.fillStyle = C.blue;
  ctx.beginPath();
  ctx.moveTo(wx + wallW / 2, tY - 46);
  ctx.lineTo(wx - 4, tY);
  ctx.lineTo(wx + wallW + 4, tY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 3; ctx.stroke();
}

function _jaggedRip(ctx, x, top, w, dmg) {
  const depth = dmg === 1 ? 40 : dmg === 2 ? 90 : 150;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(x, top); ctx.lineTo(x + w, top); ctx.lineTo(x + w, top + depth * 0.6);
  for (let i = 14; i >= 0; i--) {
    ctx.lineTo(x + (i / 14) * w, top + depth * (i % 2 === 0 ? 1 : 0.3));
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 5; ctx.stroke();
}

function _base(ctx, x, y, w, h) {
  ctx.fillStyle = C.baseWood;  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.baseLight; ctx.fillRect(x + 3, y + 3, w - 6, 12);
  ctx.strokeStyle = C.outline; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
}
