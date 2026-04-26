# ==========================================
# DOSSIER : shared
# ==========================================

## Fichier : shared/events.js
```javascript
// Tiny event bus — the only cross-scene communication channel.
// Owned by Alexis. LOCKED contract — change requires [decision] in HANDOFF + 15-min response window.

/** @typedef {'player_fire' | 'cut_to_interior' | 'unit_killed'} EventName */

const subs = /** @type {Map<EventName, Set<Function>>} */ (new Map());

/**
 * @param {EventName} name
 * @param {(payload: any) => void} fn
 * @returns {() => void} unsubscribe
 */
export function on(name, fn) {
  if (!subs.has(name)) subs.set(name, new Set());
  subs.get(name).add(fn);
  return () => subs.get(name)?.delete(fn);
}

/**
 * @param {EventName} name
 * @param {object} payload
 */
export function emit(name, payload) {
  const set = subs.get(name);
  if (!set) return;
  for (const fn of set) {
    try { fn(payload); }
    catch (e) { console.error(`[events] handler for "${name}" threw:`, e); }
  }
}

// Cross-scene event payload shapes (typedefs only — runtime is duck-typed):
//
// 'player_fire' (Interior → Exterior):
//   { unit_id: 'cyclop' | 'skeleton' | 'orc',
//     angle_deg: number,   // 0 = horizontal right, 90 = up
//     power: number }      // 0..1, derived from drag length
//
// 'cut_to_interior' (Exterior → Interior):
//   { hp_self_after: number,        // 0..100
//     hp_enemy_after: number,
//     units_destroyed_ids: string[] }
//
// 'unit_killed' (Exterior → Interior):
//   { unit_id: string }

```

## Fichier : shared/hud_top.js
```javascript
// Top HP bar — visible in both scenes. Owned by Alexis (confirmed by Sami
// in HANDOFF [20:00] decision (a)). Reads state.hp_self_pct / hp_enemy_pct.
// Both scenes call drawTopHud(ctx) last in their render order.
//
// Layout (from B01 ref): top 80 px, 2 horizontal bars side-by-side. Player
// (blue castle icon) on the LEFT, enemy (red castle icon) on the RIGHT.

import { state } from './state.js';
import { getImage, isImageReady } from './assets.js';

const H = 76;
const PAD = 10;
const BAR_H = 18;
const ICON_SIZE = 56;

/** @param {CanvasRenderingContext2D} ctx */
export function drawTopHud(ctx) {
  const W = ctx.canvas.width;
  // semi-transparent dark band so the bars are readable on any background
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, W, H);

  const halfW = W / 2;
  drawSide(ctx, PAD, 0, halfW - PAD * 1.5, 'BLUE_CASTLE', state.hp_self_pct, '#3DA0FF', false);
  drawSide(ctx, halfW + PAD * 0.5, 0, halfW - PAD * 1.5, 'RED_CASTLE', state.hp_enemy_pct, '#FF4848', true);
}

function drawSide(ctx, x, y, w, assetName, hpPct, fillColor, mirror) {
  // Icon
  const iconX = mirror ? x + w - ICON_SIZE - 4 : x + 4;
  const iconY = y + (H - ICON_SIZE) / 2 - 2;
  if (isImageReady(assetName)) {
    ctx.save();
    if (mirror) {
      // flip horizontally so the enemy castle faces the player
      ctx.translate(iconX + ICON_SIZE, iconY);
      ctx.scale(-1, 1);
      ctx.drawImage(getImage(assetName), 0, 0, ICON_SIZE, ICON_SIZE);
    } else {
      ctx.drawImage(getImage(assetName), iconX, iconY, ICON_SIZE, ICON_SIZE);
    }
    ctx.restore();
  } else {
    // Asset still decoding — kick the load and draw a placeholder this frame.
    getImage(assetName);
    ctx.fillStyle = fillColor;
    ctx.fillRect(iconX, iconY, ICON_SIZE, ICON_SIZE);
  }

  // Bar
  const barX = mirror ? x : x + ICON_SIZE + 8;
  const barW = w - ICON_SIZE - 8;
  const barY = y + (H - BAR_H) / 2 + 8;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(barX, barY, barW, BAR_H);
  const pct = Math.max(0, Math.min(100, hpPct)) / 100;
  const fillW = mirror ? barW * pct : barW * pct;
  const fillX = mirror ? barX + barW - fillW : barX;
  ctx.fillStyle = fillColor;
  ctx.fillRect(fillX, barY, fillW, BAR_H);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barW, BAR_H);

  // Percentage text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = mirror ? 'right' : 'left';
  const txtX = mirror ? barX + barW - 6 : barX + 6;
  ctx.fillText(`${Math.round(hpPct)}%`, txtX, barY + BAR_H / 2);
}

```

## Fichier : shared/world.js
```javascript
// World-space constants. The exterior scene renders into a fixed world
// coordinate system; the camera (shared/camera.js) maps world → screen.
//
// Conventions: world y points DOWN (matches canvas). Origin at top-left of
// the playable battlefield. Ground line is the y where the bottom of the
// chenille (tank treads) sits.

export const WORLD = /** @type {const} */ ({
  // Battlefield horizontal extents — wide enough to fit both castles + a margin.
  width:  1400,
  height: 960,

  // Ground line (where chenille treads sit). Castle pivots anchor here.
  ground_y: 760,

  // Castle pivot (base center) world positions.
  blue_castle: { x: 320,  y: 760 },
  red_castle:  { x: 1080, y: 760 },

  // Castle render height in world units (controls scale for the PNG).
  castle_h: 560,
});

/** Convenience for camera presets. */
export const CAM_PRESETS = /** @type {const} */ ({
  // Both castles visible — used for intro overview + post-impact wide.
  overview: { x: WORLD.width / 2, y: WORLD.ground_y - 200, zoom: 0.55 },
  // Tight on the player's castle — used during aim phase if camera ever shows exterior.
  blue:     { x: WORLD.blue_castle.x,  y: WORLD.ground_y - 200, zoom: 0.85 },
  // Tight on the enemy castle — default exterior view.
  red:      { x: WORLD.red_castle.x,   y: WORLD.ground_y - 200, zoom: 0.85 },
});

```

## Fichier : shared/scene_manager.js
```javascript
// Scene state machine — drives the alternation between exterior and interior views.
// Each scene observes the current state via subscribe() and shows/hides itself accordingly.
// Cuts are instant (no fade) — matches B01.mp4 reference.

import { emit, on } from './events.js';
import { state, applyDamageToSelf, applyDamageToEnemy, killUnit } from './state.js';

/**
 * @typedef {'INTRO' | 'EXTERIOR_OBSERVE' | 'INTERIOR_AIM' | 'EXTERIOR_RESOLVE' | 'END_VICTORY' | 'END_DEFEAT'} SceneState
 */

/** @type {SceneState} */
let current = 'INTRO';
const subscribers = /** @type {Set<(s: SceneState) => void>} */ (new Set());

/** @returns {SceneState} */
export function getState() { return current; }

/** @param {(s: SceneState) => void} fn */
export function subscribe(fn) {
  subscribers.add(fn);
  fn(current);
  return () => subscribers.delete(fn);
}

/** @param {SceneState} next */
function transition(next) {
  if (next === current) return;
  current = next;
  for (const fn of subscribers) {
    try { fn(current); } catch (e) { console.error('[scene_manager] subscriber threw:', e); }
  }
}

// Wiring — the manager listens to the cross-scene events and drives transitions.

// Interior fires → resolve in exterior
on('player_fire', (payload) => {
  // Exterior is responsible for animating the projectile and computing damage.
  // It then emits 'cut_to_interior' when resolution is done.
  transition('EXTERIOR_RESOLVE');
});

// Exterior signals end of resolution
on('cut_to_interior', (payload) => {
  state.hp_self_pct = payload.hp_self_after;
  state.hp_enemy_pct = payload.hp_enemy_after;
  for (const id of (payload.units_destroyed_ids || [])) killUnit(id);
  state.turn_index += 1;

  if (state.hp_enemy_pct <= 30) { transition('END_VICTORY'); return; }
  if (state.hp_self_pct <= 0)   { transition('END_DEFEAT');  return; }
  // Hand the turn to the enemy. EXTERIOR_OBSERVE replays the intro-style
  // attack cinematic, then scene_exterior calls ready_for_player_input()
  // which transitions us into INTERIOR_AIM for the next player shot.
  transition('EXTERIOR_OBSERVE');
});

on('unit_killed', (payload) => {
  killUnit(payload.unit_id);
});

// Public starter — call once from index.html after scenes are mounted.
export function start() {
  transition('EXTERIOR_OBSERVE');
}

// Test hook — exterior calls this once it has shown the opening damage cinematic
// (or interior calls it after the intro tap-to-start). Keeps scene_manager dumb.
export function ready_for_player_input() {
  // Enemy attack just finished; bail to defeat screen if it killed us.
  if (state.hp_self_pct <= 0) { transition('END_DEFEAT'); return; }
  if (state.hp_enemy_pct <= 30) { transition('END_VICTORY'); return; }
  transition('INTERIOR_AIM');
}

// Dev-only: bypass the state machine to render a specific scene. NEVER call from production code.
/** @param {SceneState} s */
export function _devForceState(s) { transition(s); }

```

## Fichier : shared/audio.js
```javascript
// Audio: looping music + one-shot SFX backed by window.ASSETS data URIs.
// Browser autoplay policy blocks audio until a user gesture, so installAudioOnFirstTap()
// arms a one-time pointerdown handler that calls startMusic() exactly once.
// SFX clones a fresh Audio per call so overlapping shots don't cut each other off.

const MUSIC_VOLUME = 0.35;
const SFX_VOLUME   = 0.55;

/** @type {HTMLAudioElement | null} */
let _music = null;
let _musicStarted = false;
let _audioReady = false;

function _src(name) {
  const src = /** @type {any} */ (window).ASSETS?.[name];
  if (!src) console.warn(`[audio] missing asset: ${name}`);
  return src || null;
}

export function startMusic() {
  if (_musicStarted) return;
  const src = _src('MUSIC');
  if (!src) return;
  _music = new Audio(src);
  _music.loop = true;
  _music.volume = MUSIC_VOLUME;
  const p = _music.play();
  if (p && typeof p.catch === 'function') p.catch(() => { _musicStarted = false; });
  _musicStarted = true;
  _audioReady = true;
}

/**
 * Play a one-shot SFX. Clones a fresh Audio per call so concurrent calls
 * don't truncate each other.
 * @param {{ volume?: number, rate?: number }} [opts]
 */
export function playSfx(opts = {}) {
  const src = _src('SFX');
  if (!src) return;
  const a = new Audio(src);
  a.volume = (opts.volume ?? 1) * SFX_VOLUME;
  if (opts.rate) a.playbackRate = opts.rate;
  const p = a.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
}

/**
 * Wire a one-shot pointerdown handler that starts the music. Call from both
 * dev (index.html) and prod (playable/entry.js) bootstrap so audio kicks in
 * as soon as the player taps anywhere.
 * @param {HTMLElement} target
 */
export function installAudioOnFirstTap(target) {
  const arm = () => {
    startMusic();
    target.removeEventListener('pointerdown', arm);
  };
  target.addEventListener('pointerdown', arm);
}

export function isAudioReady() { return _audioReady; }

```

## Fichier : shared/state.js
```javascript
// Global mutable state — single source of truth for HP, turn, and unit roster.
// Owned by Alexis. Both scenes read; both scenes can mutate via the helpers below
// (do not mutate the exported `state` object directly from a scene).

/**
 * @typedef {'cyclop' | 'skeleton' | 'orc'} UnitId
 * @typedef {{ id: UnitId, alive: boolean, floor: number }} Unit
 */

/**
 * @typedef {Object} GameState
 * @property {number} hp_self_pct       0..100, player castle (left/blue)
 * @property {number} hp_enemy_pct      0..100, enemy castle (right/red)
 * @property {number} turn_index        0-based, increments after each EXTERIOR_RESOLVE
 * @property {Unit[]} units             player units roster, ordered by floor (0 = top)
 */

/** @type {GameState} */
export const state = {
  hp_self_pct: 100,
  hp_enemy_pct: 100,
  turn_index: 0,
  units: [
    { id: 'skeleton', alive: true, floor: 0 },
    { id: 'cyclop',   alive: true, floor: 1 },
    { id: 'orc',      alive: true, floor: 2 },
  ],
};

/** @param {number} delta — negative = damage to player */
export function applyDamageToSelf(delta) {
  state.hp_self_pct = Math.max(0, Math.min(100, state.hp_self_pct + delta));
}

/** @param {number} delta — negative = damage to enemy */
export function applyDamageToEnemy(delta) {
  state.hp_enemy_pct = Math.max(0, Math.min(100, state.hp_enemy_pct + delta));
}

/** @param {UnitId} id */
export function killUnit(id) {
  const u = state.units.find(u => u.id === id);
  if (u) u.alive = false;
}

/** @returns {Unit[]} */
export function aliveUnits() {
  return state.units.filter(u => u.alive);
}

```

## Fichier : shared/camera.js
```javascript
// Camera: maps world coordinates → screen. State eases toward a target
// preset so panning/zooming feels smooth; snapTo() jumps instantly (used
// for the ping-pong "snap cut" back to the player after an enemy shot).
//
// Spec §6 (Comportement Caméra): player shots pan with the projectile,
// enemy shots snap-cut back. scene_exterior drives the targets; this
// module just owns the eased state and the ctx transform.

import { CAM_PRESETS } from './world.js';

/** @type {{x:number, y:number, zoom:number}} */
const cam    = { ...CAM_PRESETS.overview };
/** @type {{x:number, y:number, zoom:number}} */
const target = { ...CAM_PRESETS.overview };

let easePerMs = 0.006; // ~16% per frame at 60fps; tuned by feel

/** @param {Partial<{x:number, y:number, zoom:number}>} t */
export function setTarget(t, { ease = 0.006 } = {}) {
  if (typeof t.x === 'number') target.x = t.x;
  if (typeof t.y === 'number') target.y = t.y;
  if (typeof t.zoom === 'number') target.zoom = Math.max(0.1, Math.min(3, t.zoom));
  easePerMs = ease;
}

/** Jump instantly — for snap cuts (e.g. enemy shot incoming). */
export function snapTo(t) {
  if (typeof t.x === 'number')    cam.x    = target.x    = t.x;
  if (typeof t.y === 'number')    cam.y    = target.y    = t.y;
  if (typeof t.zoom === 'number') cam.zoom = target.zoom = Math.max(0.1, Math.min(3, t.zoom));
}

/** @param {keyof typeof CAM_PRESETS} name */
export function setPreset(name, opts = {}) {
  const p = CAM_PRESETS[name];
  if (!p) return;
  setTarget(p, opts);
}

/** @param {keyof typeof CAM_PRESETS} name */
export function snapPreset(name) {
  const p = CAM_PRESETS[name];
  if (p) snapTo(p);
}

/** Tick easing. Call once per frame from the scene that uses the camera. */
export function updateCamera(dt_ms) {
  const k = 1 - Math.exp(-easePerMs * dt_ms);
  cam.x    += (target.x    - cam.x)    * k;
  cam.y    += (target.y    - cam.y)    * k;
  cam.zoom += (target.zoom - cam.zoom) * k;
}

/**
 * Wrap world-space drawing in `applyCameraTransform(...)` ... `ctx.restore()`.
 * Camera position == the world point displayed at the SCREEN CENTER.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{w:number, h:number}} viewport
 */
export function applyCameraTransform(ctx, viewport) {
  ctx.save();
  ctx.translate(viewport.w / 2, viewport.h / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
}

export function getCamera() { return { ...cam }; }
export function getTarget() { return { ...target }; }

```

## Fichier : shared/assets.js
```javascript
// Lazy HTMLImageElement cache around window.ASSETS data URIs.
// assets-inline.js (loaded as a classic <script> in index.html) populates
// window.ASSETS = { CYCLOP: 'data:image/png;base64,...', ... } before this
// module runs, so getImage() is synchronous from the caller's POV — the
// returned <img> may not be `complete` yet on the very first call but
// drawImage() with an incomplete image is a silent no-op, and the next
// frame will paint it. Good enough for our 60fps render loop.

/** @type {Record<string, HTMLImageElement>} */
const _cache = {};

/**
 * @param {string} name e.g. 'CYCLOP', 'SKELETON', 'ORC', 'BLUE_CASTLE'
 * @returns {HTMLImageElement}
 */
export function getImage(name) {
  if (_cache[name]) return _cache[name];
  const src = /** @type {any} */ (window).ASSETS?.[name];
  if (!src) throw new Error(`asset missing: ${name} (window.ASSETS not loaded?)`);
  const img = new Image();
  img.src = src;
  _cache[name] = img;
  return img;
}

/** @param {string} name */
export function isImageReady(name) {
  const img = _cache[name];
  return !!img && img.complete && img.naturalWidth > 0;
}

```

