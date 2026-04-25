// Per-impact persistent damage gouges painted on top of each castle.
// Each impact pushes a dark irregular polygon at its WORLD position; the
// silhouette accumulates across the playable to read as "brick-by-brick
// destruction" (spec §4). Drawn in world coords by castles.drawWorld().

import { WORLD } from '../shared/world.js';

const MAX_BITES_PER_SIDE = 18;
const MARGIN = 80; // ignore impacts that landed far from any castle (ground hits etc.)

/** @typedef {{x:number, y:number, r:number, verts:{x:number,y:number}[]}} Bite */

/** @type {{blue: Bite[], red: Bite[]}} */
const bites = { blue: [], red: [] };

let _seedCtr = 1;

function _seededRand(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function _verts(seed, r) {
  const rnd = _seededRand(seed);
  const n = 7 + ((rnd() * 4) | 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.4;
    const rr = r * (0.6 + rnd() * 0.55);
    out.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr });
  }
  return out;
}

/** Snap impact x to the nearest castle if close enough; otherwise drop. */
function _sideFor(x) {
  const dBlue = Math.abs(x - WORLD.blue_castle.x);
  const dRed  = Math.abs(x - WORLD.red_castle.x);
  if (dBlue <= dRed && dBlue < WORLD.castle_h * 0.55 + MARGIN) return 'blue';
  if (dRed  <  dBlue && dRed  < WORLD.castle_h * 0.55 + MARGIN) return 'red';
  return null;
}

/**
 * @param {number} world_x
 * @param {number} world_y
 * @param {{ size?: 'small' | 'big' }} [opts]
 */
export function addBite(world_x, world_y, opts = {}) {
  const side = _sideFor(world_x);
  if (!side) return;
  const r = (opts.size === 'big' ? 26 : 16) + Math.random() * 10;
  const list = bites[side];
  list.push({ x: world_x, y: world_y, r, verts: _verts(_seedCtr++, r) });
  if (list.length > MAX_BITES_PER_SIDE) list.shift();
}

/**
 * Draw all accumulated gouges for one side, in world coords. Caller MUST
 * already have applied the camera transform.
 * @param {CanvasRenderingContext2D} ctx
 * @param {'blue' | 'red'} side
 */
export function drawBites(ctx, side) {
  const list = bites[side];
  if (list.length === 0) return;
  ctx.save();
  // Dark fill = "missing chunk" silhouette.
  ctx.fillStyle = 'rgba(18,12,22,0.92)';
  for (const b of list) {
    ctx.beginPath();
    for (let i = 0; i < b.verts.length; i++) {
      const v = b.verts[i];
      const x = b.x + v.x;
      const y = b.y + v.y;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  // Warm rim = freshly broken stone catching light.
  ctx.strokeStyle = 'rgba(255,200,130,0.55)';
  ctx.lineWidth = 1.6;
  for (const b of list) {
    ctx.beginPath();
    for (let i = 0; i < b.verts.length; i++) {
      const v = b.verts[i];
      const x = b.x + v.x;
      const y = b.y + v.y;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

export function clearBites() {
  bites.blue.length = 0;
  bites.red.length = 0;
}
