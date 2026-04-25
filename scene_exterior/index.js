// Scene: EXTERIOR (wide shot — castles + projectiles + impacts). Owner: Alexis (run-2).
//
// Active when scene_manager is in EXTERIOR_OBSERVE or EXTERIOR_RESOLVE.
// On 'player_fire' (Interior → Exterior), animates the projectile, applies
// damage to the enemy castle, then schedules an enemy AI riposte that damages
// the player castle, and finally emits 'cut_to_interior' to hand control back.
//
// Composite layout (matches B01 frames sec_01/sec_20/sec_52): two castle sprites
// side-by-side on a shared wood base + 2 pairs of tank treads. Projectiles arc
// in a short cloche between the two adjacent towers — NOT across a long field.

import { on, emit } from '../shared/events.js';
import { state } from '../shared/state.js';
import { subscribe } from '../shared/scene_manager.js';
import { drawTopHud } from '../shared/hud_top.js';
import { getImage, isImageReady } from '../shared/assets.js';
import { drawScriptOverlay } from '../playable/script.js';

// ── Layout constants (canvas 540×960) ────────────────────────────────────────
const W = 540, H = 960;
const GROUND_Y = 800;
const BASE_Y   = 740;
const BASE_H   = 60;
const TREAD_Y  = 800;
const TREAD_H  = 28;

const CASTLE_W = 230;
const CASTLE_H = 300;
const CASTLE_GAP = 6;
const CENTER_X = W / 2;
const BLUE_X = CENTER_X - CASTLE_W - CASTLE_GAP / 2;
const RED_X  = CENTER_X + CASTLE_GAP / 2;
const CASTLE_TOP_Y = BASE_Y - CASTLE_H;

const BLUE_MUZZLE = { x: BLUE_X + CASTLE_W * 0.55, y: CASTLE_TOP_Y + 70 };
const RED_MUZZLE  = { x: RED_X  + CASTLE_W * 0.45, y: CASTLE_TOP_Y + 70 };

/** @type {{side:'L'|'R',x:number,y:number,r:number}[]} */
const damageZones = [];

/** @typedef {{kind:'rocket'|'bomb'|'fireball'|'volley',
 *             from:{x:number,y:number}, to:{x:number,y:number},
 *             t0:number, dur:number, side:'L'|'R',
 *             onLand:()=>void, sub?:{offset:number}[]}} Projectile */
/** @type {Projectile[]} */
const projectiles = [];

let shakeUntil = 0;
let shakeMag = 0;

/** @type {{x:number,y:number,t0:number,text:string}[]} */
const floats = [];

let resolveStep = 'idle';   // idle | player_flight | enemy_wait | enemy_flight | enemy_impact
let resolveT0 = 0;
let pendingHpEnemy = 0;
let pendingHpSelf = 0;
let pendingKills = /** @type {string[]} */ ([]);

let visible = false;
let rafId = 0;
/** @type {HTMLCanvasElement|null} */
let canvas = null;
/** @type {CanvasRenderingContext2D|null} */
let ctx = null;

/** @param {HTMLCanvasElement} c */
export function mount(c) {
  canvas = c;
  ctx = c.getContext('2d');
  subscribe((s) => {
    visible = s === 'EXTERIOR_OBSERVE' || s === 'EXTERIOR_RESOLVE' || s === 'END_VICTORY' || s === 'END_DEFEAT';
    if (visible && !rafId) loop();
  });
  on('player_fire', startPlayerShot);
}

function startPlayerShot(payload) {
  const unitId = payload.unit_id;
  const power  = Math.max(0.35, Math.min(1, payload.power || 0.7));
  const kind   = unitId === 'skeleton' ? 'volley' : unitId === 'orc' ? 'fireball' : 'rocket';
  const dmg    = unitId === 'skeleton' ? 14 : unitId === 'orc' ? 16 : 12;

  const willMiss = unitId === 'orc' && power < 0.6;

  const target = willMiss
    ? { x: RED_X - 20, y: GROUND_Y + 20 }
    : { x: RED_MUZZLE.x + (Math.random() * 80 - 40), y: CASTLE_TOP_Y + 30 + Math.random() * 80 };

  pendingHpEnemy = Math.max(0, state.hp_enemy_pct - (willMiss ? 0 : dmg));
  pendingHpSelf  = state.hp_self_pct;
  pendingKills   = [];

  const dur = 700 + power * 300;
  /** @type {Projectile} */
  const proj = {
    kind, from: { ...BLUE_MUZZLE }, to: target,
    t0: performance.now(), dur, side: 'R',
    onLand: () => _playerImpact(target, dmg, willMiss),
  };
  if (kind === 'volley') {
    proj.sub = [{ offset: 0 }, { offset: 80 }, { offset: 160 }, { offset: 240 }, { offset: 320 }];
    proj.dur = dur + 320;
  }
  projectiles.push(proj);
  resolveStep = 'player_flight';
  resolveT0 = performance.now();
}

function _playerImpact(at, dmg, willMiss) {
  if (!willMiss) {
    damageZones.push({ side: 'R', x: at.x, y: at.y, r: 50 + Math.random() * 18 });
    floats.push({ x: at.x, y: at.y - 20, t0: performance.now(), text: `-${dmg}` });
    state.hp_enemy_pct = pendingHpEnemy;
    shakeUntil = performance.now() + 320; shakeMag = 8;
  } else {
    floats.push({ x: at.x + 30, y: at.y - 20, t0: performance.now(), text: 'MISS' });
    shakeUntil = performance.now() + 180; shakeMag = 3;
  }
  resolveStep = 'enemy_wait';
  resolveT0 = performance.now();
}

function _startEnemyRiposte() {
  if (state.hp_enemy_pct <= 5) {
    _emitCutToInterior();
    return;
  }
  const dmg = 8 + Math.floor(Math.random() * 6);
  pendingHpSelf = Math.max(0, state.hp_self_pct - dmg);
  const target = {
    x: BLUE_X + CASTLE_W * (0.3 + Math.random() * 0.4),
    y: CASTLE_TOP_Y + 60 + Math.random() * 140,
  };
  /** @type {Projectile} */
  const proj = {
    kind: 'bomb', from: { ...RED_MUZZLE }, to: target,
    t0: performance.now(), dur: 750, side: 'L',
    onLand: () => {
      damageZones.push({ side: 'L', x: target.x, y: target.y, r: 45 + Math.random() * 14 });
      floats.push({ x: target.x, y: target.y - 20, t0: performance.now(), text: `-${dmg}` });
      state.hp_self_pct = pendingHpSelf;
      shakeUntil = performance.now() + 280; shakeMag = 7;
      resolveStep = 'enemy_impact';
      resolveT0 = performance.now();
      setTimeout(_emitCutToInterior, 600);
    },
  };
  projectiles.push(proj);
  resolveStep = 'enemy_flight';
  resolveT0 = performance.now();
}

function _emitCutToInterior() {
  resolveStep = 'idle';
  emit('cut_to_interior', {
    hp_self_after:  state.hp_self_pct,
    hp_enemy_after: state.hp_enemy_pct,
    units_destroyed_ids: pendingKills,
  });
}

function loop() {
  if (!visible) { rafId = 0; return; }
  rafId = requestAnimationFrame(loop);
  if (!ctx || !canvas) return;
  const now = performance.now();

  if (resolveStep === 'enemy_wait' && now - resolveT0 > 700) {
    _startEnemyRiposte();
  }

  let sx = 0, sy = 0;
  if (now < shakeUntil) {
    const k = (shakeUntil - now) / 320;
    sx = (Math.random() * 2 - 1) * shakeMag * k;
    sy = (Math.random() * 2 - 1) * shakeMag * k;
  }
  ctx.save();
  ctx.translate(sx, sy);

  _drawSky(ctx);
  _drawForestSilhouettes(ctx);
  _drawGround(ctx);
  _drawBase(ctx);
  _drawCastle(ctx, 'BLUE_CASTLE', BLUE_X, CASTLE_TOP_Y, CASTLE_W, CASTLE_H);
  _drawCastle(ctx, 'RED_CASTLE',  RED_X,  CASTLE_TOP_Y, CASTLE_W, CASTLE_H);
  _drawTreads(ctx);
  _drawDamageMasks(ctx);
  _drawProjectiles(ctx, now);
  _drawFloats(ctx, now);

  ctx.restore();

  drawTopHud(ctx);
  drawScriptOverlay(ctx, now / 1000);
}

function _drawSky(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, '#B5D6A5');
  g.addColorStop(1, '#9CC98B');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, GROUND_Y);
}
function _drawForestSilhouettes(ctx) {
  const layers = [
    { y0: 540, color: '#4F8270', step: 28, h: 60 },
    { y0: 600, color: '#3D6E5C', step: 36, h: 78 },
    { y0: 660, color: '#2C5A4B', step: 44, h: 92 },
  ];
  for (const L of layers) {
    ctx.fillStyle = L.color;
    for (let x = -20; x < W + 20; x += L.step) {
      ctx.beginPath();
      ctx.moveTo(x - L.step / 2, L.y0 + L.h);
      ctx.lineTo(x, L.y0);
      ctx.lineTo(x + L.step / 2, L.y0 + L.h);
      ctx.closePath();
      ctx.fill();
    }
  }
}
function _drawGround(ctx) {
  ctx.fillStyle = '#7A4828';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = '#3B1A1A';
  ctx.fillRect(0, GROUND_Y + 36, W, H - GROUND_Y - 36);
  ctx.fillStyle = 'rgba(155,40,40,0.35)';
  for (let i = 0; i < 12; i++) {
    const x = (i / 12) * W + ((i * 17) % 16);
    ctx.fillRect(x, GROUND_Y + 30, 2, 60);
  }
}
function _drawBase(ctx) {
  const x = BLUE_X - 10, w = (RED_X + CASTLE_W) - x + 10;
  ctx.fillStyle = '#8B5E3C';
  ctx.fillRect(x, BASE_Y, w, BASE_H);
  ctx.fillStyle = '#A07040';
  ctx.fillRect(x, BASE_Y, w, 8);
  ctx.fillStyle = '#502E12';
  ctx.fillRect(x, BASE_Y + BASE_H - 8, w, 8);
  ctx.fillStyle = '#3B1A12';
  for (let g = 0; g < 2; g++) {
    const gx = x + 60 + g * (w - 120) - 18;
    ctx.beginPath();
    ctx.moveTo(gx, BASE_Y + BASE_H - 6);
    ctx.lineTo(gx, BASE_Y + 18);
    ctx.arc(gx + 18, BASE_Y + 18, 18, Math.PI, 0, false);
    ctx.lineTo(gx + 36, BASE_Y + BASE_H - 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, BASE_Y, w, BASE_H);
}
function _drawTreads(ctx) {
  for (const cx of [BLUE_X + CASTLE_W / 2, RED_X + CASTLE_W / 2]) {
    const tw = 170;
    const x = cx - tw / 2;
    ctx.fillStyle = '#1F1F1F';
    ctx.fillRect(x, TREAD_Y, tw, TREAD_H);
    ctx.fillStyle = '#3A3A3A';
    for (let i = 0; i < tw; i += 14) {
      ctx.fillRect(x + i + 2, TREAD_Y + 5, 10, TREAD_H - 10);
    }
    ctx.fillStyle = '#7C7368';
    for (const wx of [x + 20, x + tw - 20, x + tw / 2]) {
      ctx.beginPath();
      ctx.arc(wx, TREAD_Y + TREAD_H / 2, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, TREAD_Y, tw, TREAD_H);
  }
}

function _drawCastle(ctx, name, x, y, w, h) {
  if (isImageReady(name)) {
    ctx.drawImage(getImage(name), x, y, w, h);
  } else {
    getImage(name);
    ctx.fillStyle = name === 'BLUE_CASTLE' ? '#3D6FA8' : '#9B2E29';
    ctx.fillRect(x, y, w, h);
  }
}

function _drawDamageMasks(ctx) {
  ctx.save();
  for (const z of damageZones) {
    const grad = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r);
    grad.addColorStop(0, '#0A0A0A');
    grad.addColorStop(0.7, '#181818');
    grad.addColorStop(1, 'rgba(24,24,24,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + (z.x % 1);
      ctx.beginPath();
      ctx.moveTo(z.x, z.y);
      ctx.lineTo(z.x + Math.cos(a) * z.r * 0.85, z.y + Math.sin(a) * z.r * 0.85);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function _drawProjectiles(ctx, now) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const t = (now - p.t0) / p.dur;
    if (t >= 1) {
      try { p.onLand(); } catch (e) { console.error(e); }
      projectiles.splice(i, 1);
      continue;
    }

    if (p.kind === 'volley' && p.sub) {
      for (const s of p.sub) {
        const ts = (now - p.t0 - s.offset) / (p.dur - 320);
        if (ts < 0 || ts > 1) continue;
        const pos = _arc(p.from, p.to, ts, 220);
        const ang = _arcAngle(p.from, p.to, ts, 220);
        _drawRocketSprite(ctx, pos.x, pos.y, ang, 26);
      }
      continue;
    }
    const peak = p.kind === 'fireball' ? 90 : p.kind === 'bomb' ? 200 : 180;
    const pos = _arc(p.from, p.to, t, peak);
    const ang = _arcAngle(p.from, p.to, t, peak);
    if (p.kind === 'rocket') _drawRocketSprite(ctx, pos.x, pos.y, ang, 36);
    else if (p.kind === 'bomb') _drawBombSprite(ctx, pos.x, pos.y, ang);
    else if (p.kind === 'fireball') _drawFireball(ctx, pos.x, pos.y, now);
  }
}

function _arc(a, b, t, peakLift) {
  const mx = (a.x + b.x) / 2;
  const my = Math.min(a.y, b.y) - peakLift;
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * mx + t * t * b.x,
    y: u * u * a.y + 2 * u * t * my + t * t * b.y,
  };
}
function _arcAngle(a, b, t, peakLift) {
  const eps = 0.02;
  const t1 = Math.max(0, t - eps), t2 = Math.min(1, t + eps);
  const p1 = _arc(a, b, t1, peakLift), p2 = _arc(a, b, t2, peakLift);
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}
function _drawRocketSprite(ctx, x, y, ang, size) {
  if (isImageReady('ROCKET')) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.drawImage(getImage('ROCKET'), -size / 2, -size / 2, size, size);
    ctx.restore();
  } else {
    ctx.fillStyle = '#C44';
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(80,80,80,0.35)';
  for (let k = 1; k < 6; k++) {
    ctx.beginPath();
    ctx.arc(x - Math.cos(ang) * k * 6, y - Math.sin(ang) * k * 6, 4 + k * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
function _drawBombSprite(ctx, x, y, ang) {
  const size = 40;
  if (isImageReady('BOMB')) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + Math.PI);
    ctx.drawImage(getImage('BOMB'), -size / 2, -size / 2, size, size);
    ctx.restore();
  } else {
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(40,40,40,0.5)';
  for (let k = 1; k < 6; k++) {
    ctx.beginPath();
    ctx.arc(x - Math.cos(ang) * k * 7, y - Math.sin(ang) * k * 7, 5 + k * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}
function _drawFireball(ctx, x, y, now) {
  const flicker = 0.85 + 0.15 * Math.sin(now / 60);
  ctx.save();
  ctx.shadowColor = '#FFA200';
  ctx.shadowBlur = 18 * flicker;
  ctx.fillStyle = '#FFD24C';
  ctx.beginPath(); ctx.arc(x, y, 14 * flicker, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FF7A1A';
  ctx.beginPath(); ctx.arc(x, y, 10 * flicker, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

const FLOAT_LIFE_MS = 900;
function _drawFloats(ctx, now) {
  ctx.save();
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    const age = (now - f.t0) / FLOAT_LIFE_MS;
    if (age >= 1) { floats.splice(i, 1); continue; }
    const lift = age * 40;
    const alpha = 1 - age;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#FFE54A';
    ctx.strokeText(f.text, f.x, f.y - lift);
    ctx.fillText(f.text, f.x, f.y - lift);
  }
  ctx.restore();
}
