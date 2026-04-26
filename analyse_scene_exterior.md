# ==========================================
# DOSSIER : scene_exterior
# ==========================================

## Fichier : scene_exterior/damage_overlay.js
```javascript
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

```

## Fichier : scene_exterior/castles.js
```javascript
// Render the exterior battlefield: background + BOTH castles in world coords.
// Camera (shared/camera.js) decides which castle is centered/zoomed.
// HP-driven tilt + low-HP darkening per castle. Damage chunking lives in vfx.js.

import { state } from '../shared/state.js';
import { WORLD } from '../shared/world.js';
import { getImage, tryGetImage, isImageReady } from '../shared/assets.js';
import { drawEraserBites } from './damage_overlay.js';

export function loadCastleAssets() {
  try { getImage('BACKGROUND'); getImage('BLUE_CASTLE'); getImage('RED_CASTLE'); }
  catch (e) { console.warn('[castles] asset preload failed:', e); }
  for (const k of ['CASTLE_75', 'CASTLE_50', 'CASTLE_25']) tryGetImage(k);
  return Promise.resolve();
}

// ─── Content bounding-box normalisation ──────────────────────────────────────
// The damage PNGs are all 500×500 but the castle artwork sits at different
// vertical positions inside the canvas. We measure the opaque bounding box once
// per image so we can crop to the real content and scale all sprites to the same
// apparent height.

/** @type {Map<HTMLImageElement, {minY:number, contentH:number}>} */
const _contentBounds = new Map();

function _getContentBounds(img) {
  if (_contentBounds.has(img)) return _contentBounds.get(img);
  let bounds;
  try {
    const tmp = document.createElement('canvas');
    tmp.width = img.naturalWidth; tmp.height = img.naturalHeight;
    tmp.getContext('2d').drawImage(img, 0, 0);
    const data = tmp.getContext('2d').getImageData(0, 0, tmp.width, tmp.height).data;
    let minY = tmp.height, maxY = 0;
    for (let y = 0; y < tmp.height; y++)
      for (let x = 0; x < tmp.width; x++)
        if (data[(y * tmp.width + x) * 4 + 3] > 8) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
    bounds = maxY >= minY ? { minY, contentH: maxY - minY + 1 } : { minY: 0, contentH: img.naturalHeight };
  } catch (_) { bounds = { minY: 0, contentH: img.naturalHeight }; }
  _contentBounds.set(img, bounds);
  return bounds;
}

/** Pick the damage sprite matching the current HP tier, falling back to the base sprite. */
function _castleSprite(which, hp_pct) {
  const base = which === 'blue' ? 'BLUE_CASTLE' : 'RED_CASTLE';
  let key = null;
  if      (hp_pct <= 25) key = 'CASTLE_25';
  else if (hp_pct <= 50) key = 'CASTLE_50';
  else if (hp_pct <= 75) key = 'CASTLE_75';
  if (!key) return getImage(base);
  const dmg = tryGetImage(key);
  return (dmg && dmg.complete && dmg.naturalWidth > 0) ? dmg : getImage(base);
}

export function castleAssetsReady() {
  return isImageReady('BACKGROUND') && isImageReady('BLUE_CASTLE') && isImageReady('RED_CASTLE');
}

/**
 * Draw the entire battlefield in world coordinates. Caller must already have
 * applied the camera transform (shared/camera.js applyCameraTransform).
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawWorld(ctx) {
  if (!castleAssetsReady()) return;
  _drawBackground(ctx);
  _drawCastle(ctx, 'blue', WORLD.blue_castle, state.hp_self_pct);
  drawEraserBites(ctx, 'blue');
  _drawCastle(ctx, 'red',  WORLD.red_castle,  state.hp_enemy_pct);
  drawEraserBites(ctx, 'red');
}

function _drawBackground(ctx) {
  const bg = getImage('BACKGROUND');
  // Background extended 30% wider than the battlefield to give the camera
  // breathing room when it follows projectiles past the castle pivots.
  // Anchored centered + ground line at ~85% of the bg's height.
  const bgW = WORLD.width * 1.3;
  const bgH = bgW * (bg.height / bg.width);
  const bgX = (WORLD.width - bgW) / 2;
  const bgY = WORLD.ground_y - bgH * 0.85;
  ctx.drawImage(bg, bgX, bgY, bgW, bgH);
}

/**
 * @param {'blue'|'red'} which
 * @param {{x:number, y:number}} pivot      world position of base center
 * @param {number} hp_pct
 */
function _drawCastle(ctx, which, pivot, hp_pct) {
  const castle = _castleSprite(which, hp_pct);
  const castleH = WORLD.castle_h;
  const { minY: srcMinY, contentH } = _getContentBounds(castle);
  const castleScale = castleH / contentH;
  const castleW = castle.width * castleScale;

  const hpClamped = Math.max(0, Math.min(100, hp_pct));
  // Castles tilt AWAY from the impact direction (blue tilts left as it takes hits, red tilts right).
  const lean = (1 - hpClamped / 100) * (Math.PI / 180) * 22;
  const tilt = which === 'blue' ? -lean : lean;
  const darken = (1 - hpClamped / 100) * 0.35;

  const damaged = hpClamped < 100;

  // When damaged, the PNG already includes the base — no chenille drawn.
  const baseH     = Math.max(34, castleW * 0.10);
  const treadR    = Math.max(16, castleW * 0.06);
  const chenilleH = damaged ? 0 : baseH + treadR * 1.1;

  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(tilt);

  if (!damaged) _drawChenille(ctx, castleW, -chenilleH, baseH, treadR);
  ctx.drawImage(castle, 0, srcMinY, castle.naturalWidth, contentH,
                -castleW / 2, -castleH - chenilleH + 4, castleW, castleH);

  if (darken > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(0,0,0,${darken.toFixed(3)})`;
    ctx.fillRect(-castleW / 2, -castleH - chenilleH + 4, castleW, castleH);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

const C_BASE_WOOD  = '#8B5E3C';
const C_BASE_LIGHT = '#A07040';
const C_ARCH       = '#3a2410';
const C_TREAD      = '#2A2A2A';
const C_GEAR       = '#7C7368';
const C_OUTLINE    = '#1a1208';

function _drawChenille(ctx, castleW, baseY, baseH, r) {
  const baseW = castleW * 1.05;
  const baseX = -baseW / 2;

  ctx.fillStyle = C_BASE_WOOD;  ctx.fillRect(baseX, baseY, baseW, baseH);
  ctx.fillStyle = C_BASE_LIGHT; ctx.fillRect(baseX + 3, baseY + 3, baseW - 6, Math.max(8, baseH * 0.25));

  ctx.fillStyle = C_ARCH;
  for (let i = 0; i < 2; i++) {
    const ax = baseX + baseW * (0.18 + i * 0.46);
    const aw = baseW * 0.18;
    ctx.beginPath();
    ctx.moveTo(ax, baseY + baseH);
    ctx.lineTo(ax, baseY + baseH * 0.45);
    ctx.arc(ax + aw / 2, baseY + baseH * 0.45, aw / 2, Math.PI, 0, false);
    ctx.lineTo(ax + aw, baseY + baseH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = C_OUTLINE; ctx.lineWidth = 3;
  ctx.strokeRect(baseX, baseY, baseW, baseH);

  const treadY = baseY + baseH;
  ctx.fillStyle = C_TREAD;
  ctx.fillRect(baseX + 18, treadY - 4, baseW - 36, r * 0.7);
  for (const cx of [baseX + baseW * 0.18, baseX + baseW * 0.82]) {
    ctx.fillStyle = C_TREAD;
    ctx.beginPath(); ctx.arc(cx, treadY + r * 0.2, r,        0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C_GEAR;
    ctx.beginPath(); ctx.arc(cx, treadY + r * 0.2, r - 7,    0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C_TREAD;
    ctx.beginPath(); ctx.arc(cx, treadY + r * 0.2, r - 14,   0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C_OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, treadY + r * 0.2, r,        0, Math.PI * 2); ctx.stroke();
  }
}

```

## Fichier : scene_exterior/castle_video.js
```javascript
// Overlays castle-75.mov on the canvas the first time the red castle takes a hit.
// Positioned in screen-space at the red castle's current camera-projected location.

import { WORLD } from '../shared/world.js';
import { getCamera } from '../shared/camera.js';

/** @type {HTMLVideoElement | null} */
let _video = null;
let _playing = false;
let _triggered = false;

export function initCastleVideo() {
  _video = document.createElement('video');
  _video.src = './castle-75.mov';
  _video.preload = 'auto';
  _video.muted = true;
  _video.playsInline = true;
  _video.addEventListener('ended', () => { _playing = false; });
}

/** Call once when the first player missile hits the red castle. */
export function triggerCastleVideo() {
  if (_triggered || !_video) return;
  _triggered = true;
  _playing = true;
  _video.currentTime = 0;
  _video.play().catch(() => { _playing = false; });
}

/**
 * Draw the video frame overtop the canvas, locked to the red castle screen position.
 * Call in screen-space (after ctx.restore() undoes the camera transform).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{w:number, h:number}} viewport
 */
export function drawCastleVideo(ctx, viewport) {
  if (!_playing || !_video || _video.readyState < 2) return;

  const cam = getCamera();

  // Project red castle world anchor → screen.
  const wx = WORLD.red_castle.x;
  const wy = WORLD.red_castle.y; // ground level (base of castle)
  const sx = (wx - cam.x) * cam.zoom + viewport.w / 2;
  const sy = (wy - cam.y) * cam.zoom + viewport.h / 2;

  // Match the castle's rendered height on screen.
  const vidH = WORLD.castle_h * cam.zoom;
  const aspect = _video.videoWidth > 0 ? _video.videoWidth / _video.videoHeight : 1;
  const vidW = vidH * aspect;

  // Draw anchored at ground center (same convention as _drawCastle).
  ctx.drawImage(_video, sx - vidW / 2, sy - vidH, vidW, vidH);
}

```

## Fichier : scene_exterior/index.js
```javascript
// Scene: EXTERIOR (combat view).
// Owner: Sami. Visible when scene_manager state is 'EXTERIOR_OBSERVE' or 'EXTERIOR_RESOLVE'.
//
// Renders the battlefield in WORLD coordinates via shared/camera.js. Camera
// drives the spec §6 ping-pong: idle = focus enemy, player_fire = follow
// projectile, impact = hold on impact, then ease back. Enemy shots SNAP-cut
// (no follow) per spec.

import { subscribe, getState, ready_for_player_input } from '../shared/scene_manager.js';
import { state } from '../shared/state.js';
import { on } from '../shared/events.js';
import { drawTopHud } from '../shared/hud_top.js';
import { applyCameraTransform, updateCamera, setPreset, snapPreset, setTarget } from '../shared/camera.js';
import { WORLD, CAM_PRESETS } from '../shared/world.js';
import { loadCastleAssets, castleAssetsReady, drawWorld } from './castles.js';
import { loadProjectileAssets, updateAndDraw as drawProjectile, getLeadProjectilePos, getRecentImpact, isFiring } from './projectile.js';
import { loadVfxAssets, updateAndDraw as drawVfx, drawRainOverlay } from './vfx.js';
let drawScriptOverlay = null;
import('../playable/script.js').then(m => { drawScriptOverlay = m.drawScriptOverlay || null; }).catch(() => {});

/** @type {HTMLCanvasElement | null} */
let canvas = null;
/** @type {CanvasRenderingContext2D | null} */
let ctx = null;
let visible = false;
let rafId = 0;
let last_t = 0;

const EXTERIOR_STATES = new Set(['EXTERIOR_OBSERVE', 'EXTERIOR_RESOLVE']);

// Camera follow is gated by these flags so we don't override scene_exterior's
// idle preset every frame.
let _enemyShotIncoming = false;

export function mount(c) {
  canvas = c;
  ctx = c.getContext('2d');

  Promise.all([
    loadCastleAssets(),
    loadProjectileAssets(),
    loadVfxAssets(),
  ]).catch(e => console.error('[scene_exterior] asset load failed:', e));

  // Default camera = focus on enemy castle (this is the "ad-style" exterior view).
  snapPreset('red');

  subscribe((s) => {
    visible = EXTERIOR_STATES.has(s);
    if (visible && !rafId) {
      last_t = performance.now();
      loop();
    }
    if (s === 'EXTERIOR_OBSERVE') {
      _enemyShotIncoming = true;
      snapPreset('blue');
      pulseEnemyTint();
    }
    if (s === 'EXTERIOR_RESOLVE') {
      // Player just fired — start camera at blue castle, projectile-follow code below
      // takes over once a projectile is in flight.
      setPreset('blue', { ease: 0.012 });
    }
  });

  // Player_fire arrives BEFORE scene_manager flips to EXTERIOR_RESOLVE; preempt
  // the camera so the launch is already framed when the projectile spawns.
  on('player_fire', () => {
    _enemyShotIncoming = false;
    setPreset('blue', { ease: 0.018 });
  });
}

function _driveCamera() {

  // Enemy shots snap-cut, no follow. Already snapped in subscribe handler.
  if (_enemyShotIncoming) return;

  // Player projectile in flight → follow it horizontally.
  const lead = getLeadProjectilePos();
  if (lead) {
    setTarget({
      x: Math.max(CAM_PRESETS.blue.x, Math.min(CAM_PRESETS.red.x, lead.x)),
      y: WORLD.ground_y - 200,
      zoom: 0.78,
    }, { ease: 0.02 });
    return;
  }

  // Recent impact → focus on impact for ~600ms.
  const imp = getRecentImpact(700);
  if (imp) {
    setTarget({ x: imp.x, y: imp.y, zoom: 0.95 }, { ease: 0.012 });
    return;
  }

  // Idle → enemy castle (ad default).
  setTarget(CAM_PRESETS.red, { ease: 0.006 });
}

// "Under attack" red flash at the bottom of the screen — kicked to 1 when an
// enemy wave starts, decays exponentially so it bleeds out by the time the
// player gets the turn back. Matches the rising red streaks in B01 ref frames.
let _enemyTintLevel = 0;

export function pulseEnemyTint() { _enemyTintLevel = 1; }

function _drawEnemyTint(ctx, viewport, dt_ms) {
  // Decay ~halves every 700ms.
  _enemyTintLevel *= Math.exp(-dt_ms / 1000); // ~37% after 1s, ~13% after 2s
  if (_enemyTintLevel < 0.02) { _enemyTintLevel = 0; return; }
  const { w, h } = viewport;
  const bandH = h * 0.32;
  const grad = ctx.createLinearGradient(0, h - bandH, 0, h);
  const a = _enemyTintLevel;
  grad.addColorStop(0,    `rgba(190,30,30,0)`);
  grad.addColorStop(0.6,  `rgba(210,40,40,${(a * 0.30).toFixed(3)})`);
  grad.addColorStop(1,    `rgba(230,50,50,${(a * 0.55).toFixed(3)})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - bandH, w, bandH);
  ctx.restore();
}

function loop() {
  if (!visible) { rafId = 0; return; }
  rafId = requestAnimationFrame(loop);
  if (!ctx || !canvas) return;

  const now = performance.now();
  const dt_ms = Math.min(50, now - last_t);
  last_t = now;

  const viewport = { w: canvas.width, h: canvas.height };

  // Sky fill (screen-space) — sampled from the bg's sky band so any camera
  // reveal beyond the bg image still reads as sky, not green grass.
  const sky = ctx.createLinearGradient(0, 0, 0, viewport.h);
  sky.addColorStop(0,    '#9aa9b8');
  sky.addColorStop(0.55, '#b3bdc8');
  sky.addColorStop(1,    '#7c8a99');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewport.w, viewport.h);

  _driveCamera();
  updateCamera(dt_ms);

  // === World-space draws ===
  // try/finally so a throw in any sub-draw (vfx/enemy/projectile) cannot
  // strand the saved camera transform on the ctx state stack — that would
  // accumulate translates/scales every frame and ruin all subsequent renders.
  applyCameraTransform(ctx, viewport);
  try {
    ctx.fillStyle = '#2a2f33';
    ctx.fillRect(-4000, WORLD.ground_y, 12000, 8000);
    if (castleAssetsReady()) drawWorld(ctx);
    drawVfx(ctx, viewport, dt_ms);
    drawProjectile(ctx, viewport, dt_ms);
  } catch (e) {
    console.error('[scene_exterior] world draw threw:', e);
  } finally {
    ctx.restore();
  }
  // === End world-space ===

  // Screen-space overlays — rain stays here so it tiles the viewport, not the world.
  drawRainOverlay(ctx, viewport, dt_ms);
  _drawEnemyTint(ctx, viewport, dt_ms);
  drawTopHud(ctx);
  if (drawScriptOverlay) drawScriptOverlay(ctx, performance.now() / 1000);
}

```

## Fichier : scene_exterior/enemy_ai.js
```javascript
// AI shot computation for the red side. Used by scene_interior to auto-fire
// a player_fire-compatible payload without the old cinematic wave system.

import { WORLD } from '../shared/world.js';

function rand(a, b) { return a + Math.random() * (b - a); }

/**
 * Compute a player_fire-compatible payload for the red side.
 * Uses projectile.js rocket physics (gravity=0.0010, speed=1.05).
 *
 * Derivation (red fires left, dir=-1):
 *   vx = -cos(angle)*speed,  vy = -sin(angle)*speed  (canvas y-down)
 *   → cos(angle)*speed = (lx - tx) / T
 *   → sin(angle)*speed = (ly - ty + 0.5·g·T²) / T
 *
 * @param {number} [spread_deg=20]  ± spread around the ideal angle
 * @returns {{ angle_deg:number, power:number, weapon_type:string, unit_id:string }}
 */
export function computeAiShot(spread_deg = 20) {
  const lx = WORLD.red_castle.x;
  const ly = WORLD.ground_y - WORLD.castle_h * 0.75;
  const tx = WORLD.blue_castle.x;
  const ty = WORLD.ground_y - WORLD.castle_h * 0.55;
  const g        = 0.0010; // WEAPON_TUNING.volley.gravity (adjusted to reach 760 units)
  const spd_tune = 0.95;  // WEAPON_TUNING.volley.speed

  const T = rand(1600, 2000);
  const cos_spd = (lx - tx) / T;
  const sin_spd = (ly - ty + 0.5 * g * T * T) / T;

  const speed       = Math.sqrt(cos_spd * cos_spd + sin_spd * sin_spd);
  const angle_ideal = Math.atan2(sin_spd, cos_spd) * 180 / Math.PI;
  const angle_final = angle_ideal + (Math.random() - 0.5) * spread_deg;

  return {
    angle_deg:   Math.max(0, Math.min(170, angle_final)),
    power:       Math.max(0.1, Math.min(1.0, speed / spd_tune)),
    weapon_type: 'volley',
    unit_id:     'orc',
  };
}

```

## Fichier : scene_exterior/vfx.js
```javascript
// Scene-wide VFX overlay for the exterior view.
// Owns: rain, explosions, smoke trails, low-HP castle damage chunks.
// Procedural Canvas2D — no image assets, no deps.
// All state lives in module-local pools to avoid per-frame allocations.

const MAX_PARTICLES = 200;
const RAIN_COUNT = 80;

/** @typedef {{x:number,y:number,vx:number,vy:number,life_ms:number,age_ms:number,kind:number,size:number,hue:number,alive:boolean}} Particle */

// kind enum: 0=explosion spark, 1=smoke puff, 2=dust, 3=ring (single per explosion)
const KIND_SPARK = 0;
const KIND_SMOKE = 1;
const KIND_DUST = 2;
const KIND_RING = 3;

/** @type {Particle[]} */
const particles = [];
for (let i = 0; i < MAX_PARTICLES; i++) {
  particles.push({ x:0, y:0, vx:0, vy:0, life_ms:0, age_ms:0, kind:0, size:0, hue:0, alive:false });
}

/** @type {{x:number,y:number,len:number,speed:number}[]} */
const rain = [];
let rain_inited = false;

function initRain(w, h) {
  rain.length = 0;
  for (let i = 0; i < RAIN_COUNT; i++) {
    rain.push({
      x: Math.random() * w,
      y: Math.random() * h,
      len: 10 + Math.random() * 14,
      speed: 600 + Math.random() * 400, // px/s
    });
  }
  rain_inited = true;
}

function spawn() {
  // Reuse a dead slot; if none free, overwrite the oldest spark (cheapest visual loss).
  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (!particles[i].alive) return particles[i];
  }
  let oldest = particles[0], oldest_age = -1;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (particles[i].kind === KIND_SPARK && particles[i].age_ms > oldest_age) {
      oldest = particles[i]; oldest_age = particles[i].age_ms;
    }
  }
  return oldest;
}

/**
 * No-op loader; exported to honor the pipeline contract (other modules await all loadXxx()).
 * @returns {Promise<void>}
 */
export function loadVfxAssets() {
  return Promise.resolve();
}

// palette presets — player shots burn warm (yellow/orange), enemy shots
// burn cold/dark (violet/black) per spec §VFX.
const PALETTES = {
  player: { hueBase: 30,  hueRange: 30,  dustColor: '#5a4a3a' }, // amber → orange
  enemy:  { hueBase: 270, hueRange: 30,  dustColor: '#1a1020' }, // violet → near-black
};

/**
 * @param {number} x
 * @param {number} y
 * @param {{ size: 'small' | 'big', palette?: 'player' | 'enemy' }} opts
 */
export function triggerExplosion(x, y, { size, palette = 'player' }) {
  const big = size === 'big';
  const sparkCount = big ? 30 : 15;
  const dustCount = big ? 8 : 4;
  const pal = PALETTES[palette] || PALETTES.player;

  for (let i = 0; i < sparkCount; i++) {
    const p = spawn();
    const ang = Math.random() * Math.PI * 2;
    const spd = (big ? 220 : 140) * (0.4 + Math.random() * 0.8);
    p.x = x; p.y = y;
    p.vx = Math.cos(ang) * spd;
    p.vy = Math.sin(ang) * spd - (big ? 60 : 30);
    p.life_ms = 450 + Math.random() * (big ? 350 : 200);
    p.age_ms = 0;
    p.kind = KIND_SPARK;
    p.size = (big ? 5 : 3) + Math.random() * 3;
    p.hue = pal.hueBase + Math.random() * pal.hueRange;
    p.alive = true;
  }

  for (let i = 0; i < dustCount; i++) {
    const p = spawn();
    const ang = Math.random() * Math.PI * 2;
    const spd = (big ? 60 : 35) * (0.3 + Math.random() * 0.8);
    p.x = x + (Math.random() - 0.5) * 20;
    p.y = y + (Math.random() - 0.5) * 20;
    p.vx = Math.cos(ang) * spd;
    p.vy = Math.sin(ang) * spd - 20;
    p.life_ms = 700 + Math.random() * 500;
    p.age_ms = 0;
    p.kind = KIND_DUST;
    p.size = (big ? 22 : 14) + Math.random() * 10;
    p.hue = 0;
    p.alive = true;
  }

  // Single expanding ring; size encodes target radius in `size`, lifetime is what fades it.
  const ring = spawn();
  ring.x = x; ring.y = y;
  ring.vx = 0; ring.vy = 0;
  ring.life_ms = 150;
  ring.age_ms = 0;
  ring.kind = KIND_RING;
  ring.size = big ? 90 : 50;
  ring.hue = 0;
  ring.alive = true;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} vx
 * @param {number} vy
 */
export function triggerSmokeTrail(x, y, vx, vy) {
  const p = spawn();
  p.x = x; p.y = y;
  // Drift opposite to projectile motion + slight upward buoyancy.
  p.vx = -vx * 0.15 + (Math.random() - 0.5) * 20;
  p.vy = -vy * 0.15 - 15 - Math.random() * 15;
  p.life_ms = 500 + Math.random() * 300;
  p.age_ms = 0;
  p.kind = KIND_SMOKE;
  p.size = 6 + Math.random() * 5;
  p.hue = 0;
  p.alive = true;
}

function drawRain(ctx, w, h, dt_s) {
  ctx.save();
  ctx.strokeStyle = 'rgba(200,220,240,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  // Diagonal wind-blown rain; ~15° lean matches frame_18s reference.
  const dx_per_dy = 0.27;
  for (let i = 0; i < rain.length; i++) {
    const r = rain[i];
    r.y += r.speed * dt_s;
    r.x += r.speed * dt_s * dx_per_dy;
    if (r.y > h + 20 || r.x > w + 20) {
      r.y = -r.len - Math.random() * 40;
      r.x = Math.random() * (w + 100) - 50;
    }
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x + r.len * dx_per_dy, r.y + r.len);
  }
  ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx, dt_ms) {
  const dt_s = dt_ms / 1000;
  ctx.save();
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particles[i];
    if (!p.alive) continue;
    p.age_ms += dt_ms;
    if (p.age_ms >= p.life_ms) { p.alive = false; continue; }

    // Gravity for sparks/dust; smoke and rings get none.
    if (p.kind === KIND_SPARK) p.vy += 480 * dt_s;
    else if (p.kind === KIND_DUST) p.vy += 30 * dt_s;

    p.x += p.vx * dt_s;
    p.y += p.vy * dt_s;

    const t = p.age_ms / p.life_ms;
    const fade = 1 - t;

    if (p.kind === KIND_SPARK) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = `hsl(${p.hue}, 90%, ${55 + (1 - t) * 20}%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + fade * 0.5), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === KIND_SMOKE) {
      ctx.globalAlpha = fade * 0.55;
      ctx.fillStyle = '#9aa0a6';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + t * 1.5), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === KIND_DUST) {
      ctx.globalAlpha = fade * 0.5;
      ctx.fillStyle = '#5a4a3a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + t * 0.8), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === KIND_RING) {
      const r = p.size * (0.3 + t * 1.4);
      ctx.globalAlpha = fade;
      ctx.strokeStyle = `rgba(255, 240, 200, ${fade.toFixed(3)})`;
      ctx.lineWidth = 4 * fade + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Per-side cached chunk geometry. Keyed by side+threshold so we don't re-randomize each frame
// (jittering polygons every frame looks like TV static — bad).
// v0 chunk overlay, will refine.
/** @type {Record<string, {x:number,y:number,r:number,verts:{x:number,y:number}[]}[]>} */
const chunk_cache = {};

function seededRand(seed) {
  // Cheap deterministic PRNG (mulberry32-ish) so chunks are stable per side.
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getChunks(side, count, seedBase) {
  const key = `${side}:${count}`;
  if (chunk_cache[key]) return chunk_cache[key];
  const rnd = seededRand(seedBase + count * 17);
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = 18 + rnd() * 38;
    const verts = [];
    const v = 6 + ((rnd() * 4) | 0);
    for (let j = 0; j < v; j++) {
      const a = (j / v) * Math.PI * 2;
      const rr = r * (0.55 + rnd() * 0.65);
      verts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr });
    }
    out.push({
      x: (rnd() - 0.5) * 0.7,  // normalized within castle bbox; expanded to px in drawChunks
      y: rnd() * 0.85 + 0.05,
      r,
      verts,
    });
  }
  chunk_cache[key] = out;
  return out;
}

// Hardcoded per spec: blue castle at center-bottom, ~h*0.6 tall, ~h*0.46 wide.
// Red castle uses same bbox (the exterior view only shows one castle at a time per scene_manager state).
function drawChunks(ctx, w, h, hp_pct, side) {
  if (hp_pct >= 70) return;
  let count, scale;
  if (hp_pct < 15) { count = 7; scale = 1.6; }
  else if (hp_pct < 40) { count = 5; scale = 1.2; }
  else { count = 3; scale = 0.85; }

  const cx = w / 2;
  const cy_top = h * 0.78 - h * 0.60;
  const bbox_w = h * 0.46;
  const bbox_h = h * 0.60;

  const chunks = getChunks(side, count, side === 'blue' ? 1337 : 7331);

  ctx.save();
  ctx.fillStyle = 'rgba(15,12,18,0.88)';
  for (const c of chunks) {
    const px = cx + c.x * bbox_w;
    const py = cy_top + c.y * bbox_h;
    ctx.beginPath();
    for (let i = 0; i < c.verts.length; i++) {
      const v = c.verts[i];
      const x = px + v.x * scale;
      const y = py + v.y * scale;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  // Subtle inner highlight along chunk edges suggests broken stone.
  ctx.strokeStyle = 'rgba(80,60,90,0.55)';
  ctx.lineWidth = 1.5;
  for (const c of chunks) {
    const px = cx + c.x * bbox_w;
    const py = cy_top + c.y * bbox_h;
    ctx.beginPath();
    for (let i = 0; i < c.verts.length; i++) {
      const v = c.verts[i];
      const x = px + v.x * scale;
      const y = py + v.y * scale;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ w: number, h: number }} viewport
 * @param {number} dt_ms
 * @param {{ hp_self_pct: number, hp_enemy_pct: number }} hp
 */
// World-space pass: explosion sparks/smoke/dust/rings (positions are world
// coords from triggerExplosion / triggerSmokeTrail callers). Caller MUST
// have applied the camera transform before this.
export function updateAndDraw(ctx, _viewport, dt_ms, _hp = {}) {
  drawParticles(ctx, dt_ms);
}

// Screen-space pass: rain only. Caller MUST call this OUTSIDE the camera
// transform so raindrops stay tied to the viewport, not the world.
export function drawRainOverlay(ctx, viewport, dt_ms) {
  const { w, h } = viewport;
  const dt_s = Math.min(dt_ms, 50) / 1000;
  if (!rain_inited) initRain(w, h);
  drawRain(ctx, w, h, dt_s);
}

```

## Fichier : scene_exterior/projectile.js
```javascript
// Player projectiles. Branches on player_fire payload's weapon_type:
//   rocket  (cyclop)   — single shot, low gravity, tendu trajectory
//   volley  (skeleton) — 3 staggered shots, higher gravity, parabolic cloche
//   beam    (orc)      — instant yellow beam, no ballistic flight
// Owner: Sami (scene_exterior). Listens to 'player_fire', emits 'cut_to_interior'
// once the LAST sub-shot of a wave has resolved.

import { on, emit } from '../shared/events.js';
import { state, getCurrentSide } from '../shared/state.js';
import { playSfx } from '../shared/audio.js';
import { WORLD } from '../shared/world.js';
import { getImage, isImageReady } from '../shared/assets.js';
import { addBite } from './damage_overlay.js';

const POST_IMPACT_MS = 150;
const SMOKE_EVERY_MS = 40;
const DAMAGE_MIN = 25;
const DAMAGE_MAX = 25;

// Weapon-specific tuning. Speed in WORLD units / ms; world battlefield is
// ~760 units wide between castle pivots so a power=0.7 rocket lands in ~600ms.
const WEAPON_TUNING = {
  rocket: { speed: 1.05, gravity: 0.0010, sprite: 44, splits: 1, angleJitter: 0,    damageMul: 1.0 },
  volley: { speed: 0.95, gravity: 0.0010, sprite: 26, splits: 3, angleJitter: 0.12, damageMul: 0.45 },
  beam:   { speed: 0,    gravity: 0,      sprite: 0,  splits: 0, angleJitter: 0,    damageMul: 1.1 },
};
const VOLLEY_STAGGER_MS = 90;
const BEAM_DURATION_MS  = 400;

/**
 * @typedef {Object} Projectile
 * @property {number} x @property {number} y
 * @property {number} vx @property {number} vy
 * @property {number} gravity
 * @property {number} t_ms
 * @property {number} smoke_acc_ms
 * @property {boolean} impacted
 * @property {number} post_impact_ms
 * @property {number} damage
 * @property {string} weapon_type
 * @property {boolean} damageEmitted
 * @property {number} sprite_size
 * @property {number} batchId           // shots sharing a batchId resolve as one cut_to_interior
 * @property {'blue'|'red'} side        // which player fired this shot
 */

/**
 * @typedef {Object} Beam
 * @property {number} x0 @property {number} y0
 * @property {number} x1 @property {number} y1
 * @property {number} t_ms
 * @property {number} damage
 * @property {boolean} damageEmitted
 * @property {'blue'|'red'} side
 */

/** @type {Projectile[]} */
const active = [];
/** @type {Beam[]} */
const beams = [];
/** @type {{ payload:any, t_ms:number, remaining:number, batchId:number }[]} */
const volleyQueues = [];
/** @type {any[]} */
const pending = [];

// Batch tracker: each player_fire creates a new batch. cut_to_interior is
// emitted once, when the last shot of the batch impacts. Damage accumulates
// from each sub-shot's `damage` field.
let _nextBatchId = 1;
/** @type {Map<number, { remaining:number, totalDamage:number, side:'blue'|'red' }>} */
const batches = new Map();
function _newBatch(splits, side) {
  const id = _nextBatchId++;
  batches.set(id, { remaining: splits, totalDamage: 0, side });
  return id;
}

export function loadProjectileAssets() {
  try { getImage('ROCKET'); } catch (e) { console.warn('[projectile] preload failed:', e); }
  return Promise.resolve();
}

on('player_fire', (payload) => { pending.push(payload); });

async function safeVfx(method, ...args) {
  try {
    const mod = await import('./vfx.js');
    if (typeof mod[method] === 'function') mod[method](...args);
  } catch (_) {}
}

function _baseDamage(power) {
  return Math.round(DAMAGE_MIN + (DAMAGE_MAX - DAMAGE_MIN) * Math.max(0.1, Math.min(1, power)));
}

// World-space launch + target heights. X positions depend on firing side.
const _LAUNCH_Y = WORLD.ground_y - WORLD.castle_h * 0.75;
const _TARGET_Y = WORLD.ground_y - WORLD.castle_h * 0.55;
// Half-width of a castle silhouette in world units (rough).
const _HIT_HALF_W = WORLD.castle_h * 0.22;

function _launchX(side) { return side === 'red' ? WORLD.red_castle.x : WORLD.blue_castle.x; }
function _targetX(side) { return side === 'red' ? WORLD.blue_castle.x : WORLD.red_castle.x; }
function _hitsTarget(x, side) {
  return Math.abs(x - _targetX(side)) <= _HIT_HALF_W;
}

function _spawnRocketLike(payload, weapon_type, angleOffset, batchId, side) {
  const tune = WEAPON_TUNING[weapon_type];
  const angle = ((payload.angle_deg ?? 45) + angleOffset) * Math.PI / 180;
  const power = Math.max(0.1, Math.min(1, payload.power ?? 0.7));
  const speed = power * tune.speed;
  // Red fires right-to-left, so vx is negated.
  const dir = side === 'red' ? -1 : 1;
  const vx = dir * Math.cos(angle) * speed;
  const vy = -Math.sin(angle) * speed;
  const damage = Math.round(_baseDamage(power) * tune.damageMul);
  active.push({
    x: _launchX(side), y: _LAUNCH_Y, vx, vy,
    gravity: tune.gravity,
    t_ms: 0, smoke_acc_ms: 0,
    impacted: false, post_impact_ms: 0,
    damage, weapon_type, damageEmitted: false,
    sprite_size: tune.sprite,
    batchId, side,
  });
}

function _spawnBeam(payload, side) {
  const power = Math.max(0.1, Math.min(1, payload.power ?? 0.7));
  const damage = Math.round(_baseDamage(power) * WEAPON_TUNING.beam.damageMul);
  const lx = _launchX(side), tx = _targetX(side);
  beams.push({
    x0: lx, y0: _LAUNCH_Y,
    x1: tx, y1: _TARGET_Y,
    t_ms: 0, damage, damageEmitted: false, side,
  });
  safeVfx('triggerExplosion', tx, _TARGET_Y, { size: 'big', palette: 'player' });
  playSfx({ volume: 0.9, rate: 1.4 });
  _markImpact(tx, _TARGET_Y, 'big');
}

function spawnFromPayload(payload) {
  const weapon_type = payload.weapon_type || 'rocket';
  const side = getCurrentSide();
  if (weapon_type === 'beam') {
    _spawnBeam(payload, side);
    return;
  }
  const tune = WEAPON_TUNING[weapon_type] || WEAPON_TUNING.rocket;
  const batchId = _newBatch(tune.splits, side);
  if (tune.splits <= 1) {
    _spawnRocketLike(payload, weapon_type, 0, batchId, side);
  } else {
    _spawnRocketLike(payload, weapon_type, _jitter(tune.angleJitter), batchId, side);
    volleyQueues.push({ payload, t_ms: 0, remaining: tune.splits - 1, batchId, side });
  }
}

function _jitter(j) { return j === 0 ? 0 : (Math.random() * 2 - 1) * j * 8; }

function _resolveDamage(entity) {
  if (entity.damageEmitted) return;
  entity.damageEmitted = true;
  // A miss still advances the turn (cut_to_interior MUST fire) but does no damage.
  const dmg = entity.didHit === false ? 0 : entity.damage;
  const side = entity.side ?? 'blue';
  // Beams are batch-of-1 implicit. Rockets use the explicit batch tracker.
  if (entity.batchId == null) {
    emit('cut_to_interior', {
      hp_self_after:  side === 'red' ? Math.max(0, state.hp_self_pct  - dmg) : state.hp_self_pct,
      hp_enemy_after: side === 'red' ? state.hp_enemy_pct : Math.max(0, state.hp_enemy_pct - dmg),
      units_destroyed_ids: [],
    });
    return;
  }
  const b = batches.get(entity.batchId);
  if (!b) return;
  b.totalDamage += dmg;
  b.remaining -= 1;
  if (b.remaining <= 0) {
    batches.delete(entity.batchId);
    emit('cut_to_interior', {
      hp_self_after:  b.side === 'red' ? Math.max(0, state.hp_self_pct  - b.totalDamage) : state.hp_self_pct,
      hp_enemy_after: b.side === 'red' ? state.hp_enemy_pct : Math.max(0, state.hp_enemy_pct - b.totalDamage),
      units_destroyed_ids: [],
    });
  }
}

/**
 * Caller MUST have already applied the camera transform — projectiles draw
 * in world coordinates.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ w:number, h:number }} _viewport (unused; kept for signature parity)
 * @param {number} dt_ms
 */
export function updateAndDraw(ctx, _viewport, dt_ms) {
  while (pending.length) spawnFromPayload(pending.shift());

  const dt = Math.min(dt_ms, 50);
  const tY = _TARGET_Y;

  // Tick volley queues — fire each pending sub-shot once its stagger elapses.
  for (let i = volleyQueues.length - 1; i >= 0; i--) {
    const q = volleyQueues[i];
    q.t_ms += dt;
    while (q.remaining > 0 && q.t_ms >= VOLLEY_STAGGER_MS) {
      q.t_ms -= VOLLEY_STAGGER_MS;
      const tune = WEAPON_TUNING[q.payload.weapon_type] || WEAPON_TUNING.volley;
      _spawnRocketLike(q.payload, q.payload.weapon_type, _jitter(tune.angleJitter), q.batchId, q.side);
      q.remaining -= 1;
    }
    if (q.remaining === 0) volleyQueues.splice(i, 1);
  }

  // Beams — pure render + resolve once.
  for (let i = beams.length - 1; i >= 0; i--) {
    const b = beams[i];
    b.t_ms += dt;
    const t = Math.min(1, b.t_ms / BEAM_DURATION_MS);
    const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    ctx.save();
    ctx.globalAlpha = alpha;
    const grad = ctx.createLinearGradient(b.x0, b.y0, b.x1, b.y1);
    grad.addColorStop(0,    'rgba(255,236,120,0.9)');
    grad.addColorStop(0.5,  'rgba(255,180,40,1.0)');
    grad.addColorStop(1,    'rgba(255,90,20,0.95)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255,180,40,0.8)';
    ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
    // bright core
    ctx.shadowBlur = 0;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
    ctx.restore();
    if (b.t_ms >= BEAM_DURATION_MS * 0.4 && !b.damageEmitted) _resolveDamage(b);
    if (b.t_ms >= BEAM_DURATION_MS) beams.splice(i, 1);
  }

  // Rocket-likes (rocket, volley sub-shots).
  for (let i = active.length - 1; i >= 0; i--) {
    const p = active[i];

    if (!p.impacted) {
      p.x += p.vx * dt;
      p.y += p.vy * dt + 0.5 * p.gravity * dt * dt;
      p.vy += p.gravity * dt;
      p.t_ms += dt;

      p.smoke_acc_ms += dt;
      if (p.smoke_acc_ms >= SMOKE_EVERY_MS) {
        p.smoke_acc_ms = 0;
        safeVfx('triggerSmokeTrail', p.x, p.y, -p.vx * 0.3, -p.vy * 0.3);
      }

      const descending = p.vy > 0;
      const groundHit = descending && p.y >= WORLD.ground_y;
      const outOfBounds = p.side === 'red' ? p.x < -80 : p.x > WORLD.width + 80;
      if ((descending && p.y >= tY) || groundHit || outOfBounds || p.t_ms > 3000) {
        p.impacted = true;
        const size = p.weapon_type === 'volley' ? 'small' : 'big';
        const hit = _hitsTarget(p.x, p.side) && !groundHit;
        p.didHit = hit;
        safeVfx('triggerExplosion', p.x, p.y, { size: hit ? size : 'small', palette: 'player' });
        playSfx({ volume: hit ? 0.9 : 0.5, rate: p.weapon_type === 'volley' ? 1.1 : 0.7 });
        _markImpact(p.x, p.y, size, hit);
      }
    } else {
      p.post_impact_ms += dt;
      if (p.post_impact_ms >= POST_IMPACT_MS) {
        _resolveDamage(p);
        active.splice(i, 1);
        continue;
      }
    }

    if (!p.impacted && isImageReady('ROCKET')) {
      const rot = Math.atan2(p.vy, p.vx);
      const s = p.sprite_size;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(rot);
      ctx.drawImage(getImage('ROCKET'), -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }
}

export function isFiring() {
  return active.length > 0 || beams.length > 0 || volleyQueues.length > 0 || pending.length > 0;
}

/** Lead projectile world position for camera follow, or null if none in flight. */
export function getLeadProjectilePos() {
  // Prefer the youngest in-flight rocket so camera keeps tracking the head of a volley.
  for (const p of active) if (!p.impacted) return { x: p.x, y: p.y };
  if (beams.length > 0) {
    const b = beams[0];
    const t = Math.min(1, b.t_ms / BEAM_DURATION_MS);
    return { x: b.x0 + (b.x1 - b.x0) * t, y: b.y0 + (b.y1 - b.y0) * t };
  }
  return null;
}

/** Last known impact point for camera focus, or null if no recent impact. */
let _lastImpact = /** @type {null | {x:number, y:number, t_ms:number}} */ (null);
export function getRecentImpact(maxAgeMs = 800) {
  if (!_lastImpact) return null;
  if (performance.now() - _lastImpact.t_ms > maxAgeMs) return null;
  return _lastImpact;
}
function _markImpact(x, y, size = 'big', hit = true) {
  _lastImpact = { x, y, t_ms: performance.now() };
  if (hit) addBite(x, y, { size });
}

```

