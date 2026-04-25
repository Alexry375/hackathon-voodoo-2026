/**
 * Castle cross-section sprite renderer — 540×960 Canvas2D, no assets.
 *
 * v1 layout — anchored to RESSOURCES/ref_frames/frame_05s.jpg:
 *   - LEFT wall is pre-broken at the top (jagged rip showing mint sky).
 *   - RIGHT wall is full height, capped with a dark pointed spire.
 *   - 3 SHORT ledges (~42% interior width) attached to alternating walls.
 *     Pattern: LEFT (top) → RIGHT (mid) → LEFT (bottom).
 *     Note: in-game appears LEFT/LEFT/LEFT, but alternation reads better as
 *     a platformer; documented choice, can be flipped via FLOOR_SIDE.
 */

const C_LEFT   = 20,  C_RIGHT  = 520;
const C_TOP    = 170, C_BOTTOM = 820;
const C_WIDTH  = C_RIGHT - C_LEFT;
const C_HEIGHT = C_BOTTOM - C_TOP;
const WALL_W   = 56;
const INT_LEFT  = C_LEFT  + WALL_W;
const INT_RIGHT = C_RIGHT - WALL_W;
const INT_WIDTH = INT_RIGHT - INT_LEFT;

const FLOOR_H   = 16;
const LEDGE_W   = Math.round(INT_WIDTH * 0.42);
// 0 = top, 1 = mid, 2 = bottom. 'L' = attached to left wall, 'R' = right wall.
const FLOOR_SIDE = ['L', 'R', 'L'];
const FLOOR_Y   = [
  C_TOP + Math.round(C_HEIGHT * 0.34),
  C_TOP + Math.round(C_HEIGHT * 0.58),
  C_TOP + Math.round(C_HEIGHT * 0.82),
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
 * Returns the SHORT ledge anchor (post-rotation), centered horizontally
 * on the ledge surface. width = usable ledge width (LEDGE_W).
 * @param {0|1|2} floor
 * @returns {{x: number, y: number, width: number}}
 */
export function getFloorAnchor(floor) {
  if (_anchors[floor]) return _anchors[floor];
  const rad = ((_lastTilt ?? 0) * Math.PI) / 180;
  const { cx } = _ledgeRect(floor);
  const dx = cx - PIVOT_X;
  const dy = FLOOR_Y[floor] - PIVOT_Y;
  _anchors[floor] = {
    x: PIVOT_X + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: PIVOT_Y + dx * Math.sin(rad) + dy * Math.cos(rad),
    width: LEDGE_W,
  };
  return _anchors[floor];
}

function _ledgeRect(f) {
  const side = FLOOR_SIDE[f];
  const x = side === 'L' ? INT_LEFT : INT_RIGHT - LEDGE_W;
  return { x, y: FLOOR_Y[f], w: LEDGE_W, cx: x + LEDGE_W / 2 };
}

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  dark: '#1A1C20', mid: '#28292E', light: '#35383F',
  outline: '#000', platBrown: '#7A4520', platLight: '#A06230',
  platDark: '#502E12', baseWood: '#8B5E3C', baseLight: '#A07040',
  spire: '#1A1C20', sky: '#88CCAA',
  tread: '#2A2A2A', gear: '#7C7368',
};

// ─── Main body ───────────────────────────────────────────────────────────────
function _drawBody(ctx, dmg) {
  // Sky band visible through the U-shape top (always).
  ctx.fillStyle = C.sky;
  ctx.fillRect(C_LEFT - 30, 30, C_WIDTH + 60, C_TOP - 30 + 30);

  // Right wall (full height) — drawn first.
  _slab(ctx, INT_RIGHT, C_TOP, WALL_W, C_HEIGHT);

  // Left wall: shorter at dmg=0 (top already broken). Cut grows with damage.
  const leftWallTopCut = C_TOP + Math.round(C_HEIGHT * (0.10 + dmg * 0.18));
  _slab(ctx, C_LEFT, leftWallTopCut, WALL_W, C_BOTTOM - leftWallTopCut);

  // Interior back wall — only fills below the U-cutout depth on the right side
  // (the U dips into the interior). We draw a full back, then carve sky on top.
  ctx.fillStyle = C.dark;
  ctx.fillRect(INT_LEFT, C_TOP, INT_WIDTH, C_HEIGHT);
  _bricks(ctx, INT_LEFT, C_TOP, INT_WIDTH, C_HEIGHT);

  // U-shape sky cutout in the back wall (mint green) with jagged brick teeth.
  _topCutout(ctx, dmg);

  // Ledges (3 SHORT alternating). Top ledge gone at dmg≥2.
  for (let f = 0; f < 3; f++) {
    if (f === 0 && dmg >= 2) continue;
    const r = _ledgeRect(f);
    _ledge(ctx, r.x, r.y, r.w, FLOOR_H, FLOOR_SIDE[f]);
  }

  // Right-wall spire on top (full height wall only — gone at dmg≥3).
  if (dmg < 3) _spire(ctx, INT_RIGHT, C_TOP, WALL_W);
  // Left-wall jagged top (broken brick teeth) — at the cut line.
  _wallBrokenTop(ctx, C_LEFT, leftWallTopCut, WALL_W);

  // Wall outlines.
  ctx.strokeStyle = C.outline; ctx.lineWidth = 3;
  ctx.strokeRect(INT_RIGHT, C_TOP, WALL_W, C_HEIGHT);
  ctx.strokeRect(C_LEFT, leftWallTopCut, WALL_W, C_BOTTOM - leftWallTopCut);

  // Wooden base + arches + treads (extend laterally past walls).
  _base(ctx, C_LEFT - 14, C_BOTTOM, C_WIDTH + 28, 50);
  _treads(ctx, C_LEFT - 14, C_BOTTOM + 50, C_WIDTH + 28);
}

// ─── Top U-shape sky cutout ──────────────────────────────────────────────────
function _topCutout(ctx, dmg) {
  // U-shape sky cutout. Shoulders sit ABOVE the top ledge.
  const yShoulder = C_TOP + Math.round(C_HEIGHT * 0.10) + dmg * 30;
  const yDip = yShoulder + Math.round(C_HEIGHT * 0.05);
  const xL = INT_LEFT - 10, xR = INT_RIGHT + 10, yTop = C_TOP - 60;
  const path = (close) => {
    ctx.beginPath();
    if (close) { ctx.moveTo(xL, yTop); ctx.lineTo(xL, yShoulder); }
    else ctx.moveTo(xL, yShoulder);
    _jaggedH(ctx, xL, yShoulder, xL + INT_WIDTH * 0.30, yShoulder, 4, 5);
    _jaggedV(ctx, xL + INT_WIDTH * 0.30, yShoulder, xL + INT_WIDTH * 0.32, yDip, 2, 3);
    _jaggedH(ctx, xL + INT_WIDTH * 0.32, yDip, xR - INT_WIDTH * 0.32, yDip, 6, 5);
    _jaggedV(ctx, xR - INT_WIDTH * 0.32, yDip, xR - INT_WIDTH * 0.30, yShoulder, 2, 3);
    _jaggedH(ctx, xR - INT_WIDTH * 0.30, yShoulder, xR, yShoulder, 4, 5);
    if (close) { ctx.lineTo(xR, yTop); ctx.closePath(); }
  };
  ctx.save();
  ctx.fillStyle = C.sky;   path(true);  ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2.5;
  path(false); ctx.stroke();
  ctx.restore();
}

function _jaggedV(ctx, x1, y1, x2, y2, steps, jit) {
  const dx = (x2 - x1) / steps, dy = (y2 - y1) / steps;
  for (let i = 1; i <= steps; i++) {
    const px = x1 + dx * i + (i < steps ? (Math.sin(i * 7.3) * jit) : 0);
    const py = y1 + dy * i;
    ctx.lineTo(px, py);
  }
}
function _jaggedH(ctx, x1, y1, x2, y2, steps, jit) {
  const dx = (x2 - x1) / steps, dy = (y2 - y1) / steps;
  for (let i = 1; i <= steps; i++) {
    const px = x1 + dx * i;
    const py = y1 + dy * i + (i < steps ? (Math.cos(i * 5.1) * jit) : 0);
    ctx.lineTo(px, py);
  }
}

// ─── Drawing primitives ──────────────────────────────────────────────────────
function _slab(ctx, x, y, w, h) {
  ctx.fillStyle = C.dark;
  ctx.fillRect(x, y, w, h);
  _bricks(ctx, x, y, w, h);
}

function _bricks(ctx, x, y, w, h) {
  const BW = 30, BH = 20;
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

function _ledge(ctx, x, y, w, h, side) {
  // Wooden plank ledge: lighter top stripe, darker underside.
  ctx.fillStyle = C.platBrown; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.platLight; ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = C.platDark;  ctx.fillRect(x, y + h - 3, w, 3);
  // plank seams
  ctx.strokeStyle = C.platDark; ctx.lineWidth = 1;
  for (let px = x + 28; px < x + w - 4; px += 28) {
    ctx.beginPath(); ctx.moveTo(px, y + 1); ctx.lineTo(px, y + h - 1); ctx.stroke();
  }
  // outline
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  // tiny iron bracket where it meets the wall
  ctx.fillStyle = C.outline;
  if (side === 'L') {
    ctx.fillRect(x + 1, y + h - 1, 4, 4);
    ctx.fillRect(x + 1, y + h + 3, 3, 3);
  } else {
    ctx.fillRect(x + w - 5, y + h - 1, 4, 4);
    ctx.fillRect(x + w - 4, y + h + 3, 3, 3);
  }
}

function _spire(ctx, wx, wallTop, wallW) {
  // Tall dark pointed cone above the wall (matches frame_05s right-wall icon).
  const baseY = wallTop;
  const tipY  = wallTop - 110;
  const cx    = wx + wallW / 2;
  ctx.fillStyle = C.spire;
  ctx.beginPath();
  ctx.moveTo(cx, tipY);
  ctx.lineTo(wx - 8, baseY);
  ctx.lineTo(wx + wallW + 8, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 3; ctx.stroke();
  // small crenellation ridge under the spire base
  ctx.fillStyle = C.mid;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(wx + 4 + i * 18, baseY - 8, 12, 8);
  }
}

function _wallBrokenTop(ctx, wx, cutY, wallW) {
  // Jagged brick teeth at the broken top of the left wall.
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.moveTo(wx, cutY);
  const teeth = 5;
  for (let i = 0; i <= teeth; i++) {
    const tx = wx + (i / teeth) * wallW;
    const ty = cutY - (i % 2 === 0 ? 4 : 14);
    ctx.lineTo(tx, ty);
  }
  ctx.lineTo(wx + wallW, cutY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 2.5; ctx.stroke();
}

function _base(ctx, x, y, w, h) {
  ctx.fillStyle = C.baseWood;  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.baseLight; ctx.fillRect(x + 3, y + 3, w - 6, 10);
  // archway hints (2 dark arches)
  ctx.fillStyle = '#3a2410';
  for (let i = 0; i < 2; i++) {
    const ax = x + 30 + i * (w - 110);
    ctx.beginPath();
    ctx.moveTo(ax, y + h);
    ctx.lineTo(ax, y + 18);
    ctx.arc(ax + 25, y + 18, 25, Math.PI, 0, false);
    ctx.lineTo(ax + 50, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = C.outline; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
}

function _treads(ctx, x, y, w) {
  // Hint of tank treads peeking under the base — 2 gear chunks.
  const r = 22;
  ctx.fillStyle = C.tread;
  ctx.fillRect(x + 18, y - 6, w - 36, 16);
  for (const cx of [x + 60, x + w - 60]) {
    ctx.fillStyle = C.tread;
    ctx.beginPath(); ctx.arc(cx, y + 4, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.gear;
    ctx.beginPath(); ctx.arc(cx, y + 4, r - 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.tread;
    ctx.beginPath(); ctx.arc(cx, y + 4, r - 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, y + 4, r, 0, Math.PI * 2); ctx.stroke();
  }
}
