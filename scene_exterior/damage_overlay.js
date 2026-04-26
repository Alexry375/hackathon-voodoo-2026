// Per-impact persistent damage gouges. addBite() accumulates impacts;
// drawEraserBites() renders them as destination-out filled polygons so the
// caller can punch transparent holes through a castle sprite.

import { WORLD } from '../shared/world.js';

const MAX_BITES_PER_SIDE = 18;
const MARGIN = 80;

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
 * Fill bite polygons in world coords using the currently active fill style.
 * Intended to be called with globalCompositeOperation = 'destination-out' on
 * an offscreen canvas, with a transform already mapping world → offscreen space.
 * Colour is irrelevant in destination-out mode; any opaque fill punches a hole.
 *
 * @param {CanvasRenderingContext2D} ctx  world→offscreen transform must be set
 * @param {'blue'|'red'} side
 */
export function drawEraserBites(ctx, side) {
  const list = bites[side];
  if (list.length === 0) return;
  ctx.save();
  ctx.fillStyle = '#000';
  for (const b of list) {
    ctx.beginPath();
    for (let i = 0; i < b.verts.length; i++) {
      const v = b.verts[i];
      if (i === 0) ctx.moveTo(b.x + v.x, b.y + v.y);
      else         ctx.lineTo(b.x + v.x, b.y + v.y);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function clearBites() {
  bites.blue.length = 0;
  bites.red.length = 0;
}
