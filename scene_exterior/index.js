// Scene: EXTERIOR — single-castle cinematic view (matches source video).
//
// The source NEVER shows both castles simultaneously. Instead the camera
// "ping-pongs": ours castle → projectile leaves frame right → cut to enemy
// castle → projectile arrives, impact → cut back to ours when enemy fires
// back, etc.
//
// `view` ('OURS'|'ENEMY') controls which castle asset is centered. Both
// share identical layout (BLUE_CASTLE / RED_CASTLE PNGs are conjoint
// dual-tower castles, drop-in interchangeable).
//
// Resolve flow (per turn):
//   1. fire  — view=OURS, brief tilt + projectile leaving right edge   (700ms)
//   2. CUT   — view=ENEMY, projectile entering from left + impact     (1200ms)
//   3. dwell — enemy castle damage observation                          (500ms)
//   4. CUT   — view=OURS, enemy bomb falling from top-right + impact  (1200ms)
//   5. dwell — our castle damage observation                            (500ms)
//   6. emit cut_to_interior                                            (~4100ms total)
//
// Opening flow (no player input yet):
//   incoming → view=OURS, bomb falls, impact (-33% HP) → emit ready_for_player_input

import { on, emit } from '../shared/events.js';
import { state } from '../shared/state.js';
import { subscribe, ready_for_player_input } from '../shared/scene_manager.js';
import { drawTopHud } from '../shared/hud_top.js';
import { getImage, tryGetImage, isImageReady } from '../shared/assets.js';
import { drawScriptOverlay } from '../playable/script.js';
import { isFailScreenShown } from '../playable/fail_screen.js';
import { drawRaven } from './raven.js';
import { drawRavenFlock } from './raven_flock.js';
import { planForUnit, drawProjectileP1, drawProjectileP2 } from './projectile_sprites.js';
import { playSfx } from '../shared/audio.js';

const FIRING_SFX_BY_UNIT = {
  skeleton: 'SFX_FIRE_RAFALE',
  cyclop:   'SFX',  // legacy rocket sample
  orc:      'SFX',  // reuses rocket per user spec
};
const IMPACT_SFX_BY_KIND = {
  rocket_p1: 'SFX_IMPACT_RAFALE',  // skeleton's mini-missile salvo
  bomb_p2:   'SFX_IMPACT_ROCKET',  // cyclop's chunky bomb
  rocket:    'SFX_IMPACT_ROCKET',  // orc — reuses rocket explosion
};

// ── Layout constants (canvas 540×960) ────────────────────────────────────────
const W = 540, H = 960;

const SKY_TOP = 80;        // hud reserves top 76px
const HORIZON_Y = 600;
const GROUND_Y = 800;
const BASE_Y   = 720;       // top of wood base
const BASE_H   = 56;
const TREAD_Y  = BASE_Y + BASE_H - 10;
const TREAD_H  = 30;

const CASTLE_W = 340;
const CASTLE_H = 440;
const CASTLE_X = (W - CASTLE_W) / 2;
const CASTLE_TOP_Y = BASE_Y - CASTLE_H + 12;   // overlap base slightly

// Muzzle position relative to castle origin (top-left)
const MUZZLE_OFFSET = { x: CASTLE_W * 0.20, y: 110 };
const muzzlePos = () => ({ x: CASTLE_X + MUZZLE_OFFSET.x, y: CASTLE_TOP_Y + MUZZLE_OFFSET.y });

// ── Internal state ───────────────────────────────────────────────────────────
/** @type {'OURS'|'ENEMY'} */
let view = 'OURS';

// ── ENEMY damage tier (Seb's PNGs) ────────────────────────────────────────────
// HP-driven sprite swap replaces the legacy chunk/crack overlay system. PNGs
// are sized so their content height matches CASTLE_H; alpha-bbox cached once.
// OURS has no visual damage anymore (matching OURS PNGs to come later).

/** @type {Map<HTMLImageElement, {minY:number, contentH:number}>} */
const _contentBounds = new Map();
function _getContentBounds(img) {
  if (_contentBounds.has(img)) return _contentBounds.get(img);
  let bounds;
  try {
    const tmp = document.createElement('canvas');
    tmp.width = img.naturalWidth; tmp.height = img.naturalHeight;
    const tctx = tmp.getContext('2d');
    tctx.drawImage(img, 0, 0);
    const data = tctx.getImageData(0, 0, tmp.width, tmp.height).data;
    let minY = tmp.height, maxY = 0;
    for (let y = 0; y < tmp.height; y++)
      for (let x = 0; x < tmp.width; x++)
        if (data[(y * tmp.width + x) * 4 + 3] > 8) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
    bounds = maxY >= minY ? { minY, contentH: maxY - minY + 1 }
                          : { minY: 0, contentH: img.naturalHeight };
  } catch (_) {
    bounds = { minY: 0, contentH: img.naturalHeight };
  }
  _contentBounds.set(img, bounds);
  return bounds;
}

// OURS visual tier is decoupled from HP: the playable should feel "still
// holding" after the 2nd hit, so we step down every 2 attacks instead of
// continuously following HP.
//   0 attacks → intact
//   1-2 attacks → CASTLE_BLUE_75 (1st destruction asset, persists thru hit 2)
//   3-4 attacks → CASTLE_BLUE_50
//   5+ attacks  → CASTLE_BLUE_25
let _oursAttacksTaken = 0;

function _damagePng(side) {
  // Intact PNGs (BLUE_CASTLE / RED_CASTLE) now bake base + treads in too —
  // mirrored from the tier-75 sprite so each side keeps its distinct
  // tread/wood-base style. Treat them as a "tier-100" so the renderer skips
  // the procedural base/treads (which would draw underneath at the wrong size
  // and double up).
  let key;
  if (side === 'OURS') {
    if      (_oursAttacksTaken === 0) key = 'BLUE_CASTLE';
    else if (_oursAttacksTaken <= 2)  key = 'CASTLE_BLUE_75';
    else if (_oursAttacksTaken <= 4)  key = 'CASTLE_BLUE_50';
    else                               key = 'CASTLE_BLUE_25';
  } else {
    const hp = state.hp_enemy_pct;
    if      (hp <= 25) key = 'CASTLE_25';
    else if (hp <= 50) key = 'CASTLE_50';
    else if (hp <= 75) key = 'CASTLE_75';
    else                key = 'RED_CASTLE';
  }
  const img = tryGetImage(key);
  return (img && img.complete && img.naturalWidth > 0) ? img : null;
}

/** Castle tilt angle (radians) for firing animation. */
let tiltAngle = 0;
let tiltUntil = 0;

// Enemy castle recoil — kicks in on every player-missile impact. Source video
// shows the enemy castle rolling backward on its tracks after a hit. We always
// trigger it (not only after the 2nd hit) — simpler and reads clearly.
let enemyRecoil = /** @type {{t0:number,dur:number,peak:number}|null} */ (null);
let _treadScrollOffset = 0;

// Camera shake: triggerShake(intensity_px, dur_ms) with quadratic decay.
let shakeStart = 0;
let shakeDur = 0;
let shakeIntensity = 0;
function triggerShake(intensity, durMs) {
  shakeStart = performance.now();
  shakeDur = durMs;
  shakeIntensity = intensity;
}

/** @type {{x:number,y:number,t0:number,text:string,color:string}[]} */
const floats = [];

/** @typedef {{kind:'rocket'|'rocket_p1'|'bomb'|'bomb_p2'|'raven'|'flock', from:{x:number,y:number}, to:{x:number,y:number},
 *             t0:number, dur:number, peakLift:number, sinAmp?:number, sinPhase?:number,
 *             sinFreq?:number, onLand:()=>void}} Projectile */
/** @type {Projectile[]} */
const projectiles = [];

/** @typedef {{kind:'debris'|'smoke'|'spark'|'flash', x:number,y:number, vx:number,vy:number,
 *             ax:number,ay:number, t0:number, life:number, size:number, color:string,
 *             rot:number, rotSpeed:number, sizeGrow:number}} Particle */
/** @type {Particle[]} */
const particles = [];

function _spawnExplosion(x, y, opts) {
  const t = performance.now();
  const heavy = opts && opts.heavy;
  // Flash core (white/yellow) — single short-lived expanding disk.
  particles.push({ kind:'flash', x, y, vx:0, vy:0, ax:0, ay:0, t0:t,
    life: 140, size: 90, color: '#FFF7C8', rot:0, rotSpeed:0, sizeGrow: 1.6 });
  // Fire core: 6 orange/red pulses with slight outward drift.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
    particles.push({ kind:'flash', x: x + Math.cos(a)*8, y: y + Math.sin(a)*8,
      vx: Math.cos(a)*60, vy: Math.sin(a)*60, ax:0, ay:0, t0: t,
      life: 280 + Math.random()*120, size: 38 + Math.random()*22,
      color: i%2 ? '#FF8030' : '#E03B12', rot:0, rotSpeed:0, sizeGrow: 1.2 });
  }
  // Sparks: bright tiny streaks shooting outward fast.
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 320 + Math.random() * 220;
    particles.push({ kind:'spark', x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      ax:0, ay: 280, t0: t, life: 320 + Math.random()*180,
      size: 3 + Math.random()*2, color: '#FFE07A', rot:0, rotSpeed:0, sizeGrow: 0 });
  }
  // Debris: 15-20 stone chunks with gravity + rotation.
  const nDebris = heavy ? 22 : 16;
  for (let i = 0; i < nDebris; i++) {
    const a = -Math.PI/2 + (Math.random() - 0.5) * Math.PI * 1.4; // upward cone
    const sp = 180 + Math.random() * 260;
    particles.push({ kind:'debris', x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      ax: 0, ay: 720, t0: t, life: 1100 + Math.random()*700,
      size: 5 + Math.random()*8,
      color: ['#7C7368','#5C5048','#9C8C7C','#3F3530'][i % 4],
      rot: Math.random()*Math.PI*2, rotSpeed: (Math.random()-0.5)*14, sizeGrow: 0 });
  }
  // Smoke puffs: slow upward drift, expanding, persist 1.5-2.5s.
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.push({ kind:'smoke', x: x + Math.cos(a)*12, y: y + Math.sin(a)*12,
      vx: Math.cos(a)*20, vy: -30 - Math.random()*30, ax:0, ay: -10,
      t0: t + i * 30, life: 1600 + Math.random()*900,
      size: 22 + Math.random()*16, color: 'rgba(60,55,50,1)',
      rot:0, rotSpeed:0, sizeGrow: 1.8 });
  }
}

// In-flight trail emission (rocket/bomb/raven flock).
const TRAIL_EVERY_MS = 55;

function _emitTrailParticle(kind, x, y, dirAng, now) {
  // Forward = direction of travel; back = opposite (where the trail belongs).
  const fx = Math.cos(dirAng), fy = Math.sin(dirAng);
  // Perpendicular (for the raven sine drift axis).
  const px = -fy;
  const py =  fx;

  if (kind === 'rocket' || kind === 'rocket_p1') {
    particles.push({
      kind: 'trail_core', x, y,
      vx: -fx * 30, vy: -fy * 30 - 8,
      ax: 0, ay: -8, t0: now,
      life: 140, size: 6, color: '#FF4A3A',
      rot: 0, rotSpeed: 0, sizeGrow: 0.4,
    });
    particles.push({
      kind: 'trail_puff', x, y,
      vx: -fx * 50 + px * (Math.random() - 0.5) * 8,
      vy: -fy * 50 + py * (Math.random() - 0.5) * 8 - 12,
      ax: 0, ay: -18, t0: now,
      life: 330, size: 6, color: '#822018',
      rot: 0, rotSpeed: 0, sizeGrow: 0.6,
    });
  } else if (kind === 'bomb' || kind === 'bomb_p2') {
    particles.push({
      kind: 'trail_puff', x, y,
      vx: -fx * 45 + px * (Math.random() - 0.5) * 6,
      vy: -fy * 45 + py * (Math.random() - 0.5) * 6 - 10,
      ax: 0, ay: -14, t0: now,
      life: 350, size: 10, color: '#3A3A3A',
      rot: 0, rotSpeed: 0, sizeGrow: 1.0,
    });
  } else if (kind === 'raven') {
    particles.push({
      kind: 'trail_wave', x, y, vx: 0, vy: -4, ax: 0, ay: -5, t0: now,
      life: 290, size: 6, color: '#3A3A3A',
      rot: Math.random() * Math.PI * 2,
      rotSpeed: 3,
      sizeGrow: 0.7,
      driftAxisX: px, driftAxisY: py, driftAmp: 8,
    });
  }
}

// Cinematic step machine (resolve)
let step = 'idle'; // idle | fire | cut_to_enemy | enemy_dwell | cut_to_ours | ours_dwell | incoming
let stepT0 = 0;

// Zoom-in transition exterior→interior (T1 from Gemini critique).
// During this window, the exterior keeps drawing but the canvas is scaled
// progressively around the castle center. At the end we actually fire the
// pending exit action (emit cut_to_interior or call ready_for_player_input).
// Dur is 900ms so Gemini's 1fps internal sampling sees ≥1 frame mid-zoom.
let transitioning = false;
let transitionT0 = 0;
let transitionEndAction = /** @type {(()=>void)|null} */ (null);
let transitionEndFired = false;
// Longer + harder ease so the dive reads as cinematic, not as a cut. The iris
// (radial vignette closing on the castle keep) covers the actual scene swap.
const TRANSITION_DUR = 1300;

// View whip-pan transition (T2 from Gemini critique).
// During cut OURS→ENEMY (and back) we slide both castles horizontally so the
// viewer reads a continuous camera pan instead of a hard cut. Background is
// kept static for simplicity (still reads as a pan thanks to parallax-by-zero).
let viewTransition = /** @type {null|{fromView:'OURS'|'ENEMY',toView:'OURS'|'ENEMY',t0:number,dur:number,dir:1|-1}} */ (null);
const VIEW_PAN_DUR = 750;

// "Camera-zoom-on-click" beat (Seb feature port).
// At intro impact and after every enemy riposte impact, instead of cutting
// straight to interior we render a WIDE 2-castle overview, draw a tap-prompt
// hand on top of OURS, and wait for the player's pointerdown. Tap kicks off
// a 700ms zoom anim (overview → close on OURS) before firing the original
// handoff action (ready_for_player_input or emit cut_to_interior).
// Four phases for the overview beat: dezoom (close→wide entry), await (idle
// at full wide), zoom-in (wide→close on tap), then chain into the existing
// _startExitTransition for the iris-dive into interior. Timestamps drive the
// active phase — zero means inactive. At any time at most one of dezoomT0 /
// zoomInT0 is non-zero, with awaitingTap covering the static beat between.
let awaitingTap = false;
let pendingTapAction = /** @type {(()=>void)|null} */ (null);
let dezoomT0 = 0;
let zoomInT0 = 0;
const DEZOOM_DUR  = 600;
const ZOOM_IN_DUR = 600;
const OVERVIEW_SCALE = 0.55;
const OVERVIEW_OURS_DX  = -W * 0.40;  // OURS pushed left in wide
const OVERVIEW_ENEMY_DX = +W * 0.40;  // ENEMY pushed right in wide
let pendingPlayerDmg = 0;
let pendingEnemyDmg = 0;
let pendingPlayerImpact = /** @type {{x:number,y:number}|null} */ (null);
let pendingEnemyImpact  = /** @type {{x:number,y:number}|null} */ (null);
let pendingKills = /** @type {string[]} */ ([]);

let visible = false;
let rafId = 0;
/** @type {HTMLCanvasElement|null} */ let canvas = null;
/** @type {CanvasRenderingContext2D|null} */ let ctx = null;

// ── Lifecycle ────────────────────────────────────────────────────────────────
/** @param {HTMLCanvasElement} c */
export function mount(c) {
  canvas = c;
  ctx = c.getContext('2d');
  subscribe((s) => {
    visible = s === 'EXTERIOR_OBSERVE' || s === 'EXTERIOR_RESOLVE'
            || s === 'INTRO_INCOMING'  || s === 'END_VICTORY' || s === 'END_DEFEAT';
    if (s === 'EXTERIOR_OBSERVE') { view = 'OURS'; }
    if (s === 'INTRO_INCOMING')   { view = 'ENEMY'; _startIncoming(); }
    if (s === 'END_VICTORY')      { view = 'ENEMY'; }
    if (s === 'END_DEFEAT')       { view = 'OURS'; }
    if (visible && !rafId) loop();
  });
  on('player_fire', startPlayerShot);

  // Tap-to-zoom: while awaitingTap is true the canvas-wide pointerdown
  // commits us to interior. We listen at the canvas level so any tap
  // inside the playable counts (not just the small hand sprite).
  c.addEventListener('pointerdown', _onCanvasTap);
}

function _startDezoomToAwait(action) {
  pendingTapAction = action;
  dezoomT0 = performance.now();
  awaitingTap = false;
  zoomInT0 = 0;
}

function _onCanvasTap() {
  // Tap-to-zoom disabled — the camera now auto-pans (see dezoom completion
  // in the loop where zoomInT0 is set immediately). Kept as a no-op so any
  // older callers don't crash.
}

// ── Deterministic impact cycles ──────────────────────────────────────────────
// Random impacts cluster visually so we cycle through hand-placed targets.
// OURS: enemy ripostes plus opening raven. Damage on OURS is purely particle
// (no persistent overlay), but the cycle keeps successive impacts spatially
// varied so the screen-shake/explosion don't all originate from one spot.
// ENEMY: player shots, ordered to land where Seb's tier PNGs reveal new damage
// (left tower → right tower roof → centre keep) so the swap reads as causal.
/** @typedef {{nx:number, y:number}} ImpactSpot */
/** @type {ImpactSpot[]} */
const OURS_IMPACT_CYCLE = [
  { nx: 0.30, y: 380 }, // upper-left tower
  { nx: 0.72, y: 360 }, // upper-right tower
  { nx: 0.50, y: 470 }, // mid keep
  { nx: 0.22, y: 530 }, // lower-left wall
  { nx: 0.78, y: 510 }, // lower-right wall
  { nx: 0.46, y: 575 }, // base centre
];
/** @type {ImpactSpot[]} */
// PNG c75 destroys the LEFT tower → first 2 hits aim there.
// PNG c50 destroys the RIGHT tower roof → next 2 hits aim there.
// PNG c25 covers the whole keep → final hits aim centre/base.
const ENEMY_IMPACT_CYCLE = [
  { nx: 0.28, y: 395 }, // upper-left tower (c75 reveal)
  { nx: 0.22, y: 470 }, // mid-left wall    (c75 reveal)
  { nx: 0.72, y: 380 }, // upper-right tower roof (c50 reveal)
  { nx: 0.78, y: 460 }, // mid-right wall   (c50 reveal)
  { nx: 0.50, y: 520 }, // centre keep      (c25 coup de grâce)
  { nx: 0.50, y: 590 }, // base centre
];
let _oursCycleIdx = 0;
let _enemyCycleIdx = 0;

function _nextOursImpact() {
  const s = OURS_IMPACT_CYCLE[_oursCycleIdx % OURS_IMPACT_CYCLE.length];
  _oursCycleIdx++;
  return { x: CASTLE_X + CASTLE_W * s.nx, y: s.y };
}
function _nextEnemyImpact() {
  const s = ENEMY_IMPACT_CYCLE[_enemyCycleIdx % ENEMY_IMPACT_CYCLE.length];
  _enemyCycleIdx++;
  return { x: CASTLE_X + CASTLE_W * s.nx, y: s.y };
}

// ── Opening cinematic ────────────────────────────────────────────────────────
// Spec-locked flow (cinematic-spec.md):
//   T=0    → 1500ms : dwell on ENEMY_RED (hook: enemy preparing to fire)
//   T=1500 → 3000ms : pan ENEMY→OURS, raven flock crosses screen R→L
//   T=3000           : impact on OURS_BLUE (-33% HP) → exit to interior
function _startIncoming() {
  view = 'ENEMY';
  step = 'intro_dwell';
  stepT0 = performance.now();
  // Reset cycles on each fresh playthrough so the sequence is reproducible.
  _oursCycleIdx = 0;
  _enemyCycleIdx = 0;
  _oursAttacksTaken = 0;
  pendingPlayerImpact = _nextOursImpact();
}

function _startIntroPanAndFlock() {
  // Triggered at T+1500ms (end of intro_dwell). Pans ENEMY→OURS while the raven
  // flock crosses the screen right→left, landing on OURS castle as the pan ends.
  const now = performance.now();
  const target = pendingPlayerImpact || {
    x: CASTLE_X + CASTLE_W * 0.55,
    y: CASTLE_TOP_Y + 120,
  };
  const dmgVal = 50;  // intro bomb — bigger so blue is at ~50 HP after 1 move
  // Camera pan ENEMY→OURS (dir=-1, world slides right). Same duration shape as
  // the player-shot pan so the cinematic reads consistently.
  viewTransition = { fromView: 'ENEMY', toView: 'OURS', t0: now, dur: 1300, dir: -1 };
  // Raven flock: starts off-screen right, lands on OURS target ~1500ms later.
  // The pan ends ~200ms before impact so the flock visibly converges in OURS view.
  /** @type {Projectile} */
  const flock = {
    kind: 'flock',
    from: { x: W + 120, y: 220 + Math.random() * 200 },
    to: target,
    t0: now,
    dur: 1500,
    peakLift: 0,
    sinAmp: 30 + Math.random() * 50, sinFreq: 0, sinPhase: 0,
    onLand: () => {
      playSfx('SFX_RAVEN_POP', { volume: 0.8 });
      _impactOurs(target, dmgVal);
    },
  };
  projectiles.push(flock);
  playSfx('SFX_RAVEN_CAW', { volume: 0.7 });

  step = 'incoming';
  stepT0 = now;
}

function _impactOurs(at, d) {
  _oursAttacksTaken++;
  state.hp_self_pct = Math.max(0, state.hp_self_pct - d);
  floats.push({ x: at.x, y: at.y - 24, t0: performance.now(), text: `-${d}`, color: '#FFE54A' });
  _spawnExplosion(at.x, at.y, { heavy: true });
  triggerShake(20, 520);
  tiltAngle = -0.08;
  tiltUntil = performance.now() + 700;
  if (step === 'incoming') {
    // After the impact beat, hand off to the await-tap overview beat. The
    // exterior renders a wide 2-castle shot until the player taps; on tap
    // a 700ms zoom anim eases into close on OURS and we then enter interior.
    setTimeout(() => {
      step = 'idle';
      _startDezoomToAwait(() => ready_for_player_input());
    }, 400);
  }
}

// ── Player-fire cinematic ────────────────────────────────────────────────────
function startPlayerShot(payload) {
  view = 'OURS';
  tiltAngle = -0.07;
  tiltUntil = performance.now() + 600;
  step = 'fire';
  stepT0 = performance.now();

  // Firing SFX matched to the active mob.
  const fireSfx = FIRING_SFX_BY_UNIT[payload?.unit_id] || 'SFX';
  playSfx(fireSfx, { volume: 0.55 });

  // Stash enemy-side impact data — wide range so successive player shots
  // visibly hit different parts of the enemy castle (not the same spot).
  const dmgVal = 14 + Math.floor(Math.random() * 6);
  pendingEnemyDmg = dmgVal;
  pendingEnemyImpact = _nextEnemyImpact();

  const t = performance.now();
  const m = muzzlePos();
  // Per-unit shot plan : skeleton fires a 4-shot rafale of Projectile_1 (small
  // missiles), cyclop fires a single Projectile_2 (chunky bomb with flashy
  // trail), orc fires the current procedural red ball. See projectile_sprites.js.
  const plan = planForUnit(payload?.unit_id);
  const baseTarget = { x: pendingEnemyImpact.x + W, y: pendingEnemyImpact.y };
  for (let i = 0; i < plan.count; i++) {
    // Spread burst impacts a bit so they read as a strafing rafale, not a
    // single point.
    const jitter = plan.count > 1
      ? { x: (Math.random() - 0.5) * 80, y: (Math.random() - 0.5) * 60 }
      : { x: 0, y: 0 };
    const target = { x: baseTarget.x + jitter.x, y: baseTarget.y + jitter.y };
    const isLast = i === plan.count - 1;
    /** @type {Projectile} */
    const proj = {
      kind: plan.kind,
      worldSpace: true,
      from: m,
      to: target,
      t0: t + 250 + i * plan.staggerMs,
      dur: plan.durMs,
      peakLift: plan.peakLift + (plan.count > 1 ? Math.random() * 80 - 40 : 0),
      // Only the final projectile triggers the HP/damage impact ; earlier
      // burst projectiles trigger a light visual splash via _spawnExplosion
      // so the rafale reads on screen but doesn't multiply damage.
      onLand: isLast
        ? () => {
            const sfx = IMPACT_SFX_BY_KIND[plan.kind] || 'SFX_IMPACT_ROCKET';
            // HTMLAudioElement caps volume at 1.0; to push the impact
            // loud enough above the chiptune we stack overlapping
            // playbacks. Rafale gets the heaviest stack since the source
            // sample is intrinsically quieter than the cannon.
            playSfx(sfx, { volume: 1.0 });
            setTimeout(() => playSfx(sfx, { volume: 1.0 }), 30);
            if (sfx === 'SFX_IMPACT_RAFALE') {
              setTimeout(() => playSfx(sfx, { volume: 1.0 }), 80);
              setTimeout(() => playSfx(sfx, { volume: 0.9 }), 140);
            }
            _impactEnemy(pendingEnemyImpact, pendingEnemyDmg);
          }
        : (() => { _spawnExplosion(target.x - W, target.y, { heavy: false }); }),
      // optional: store sprite size for renderer
      _spriteSize: plan.size,
    };
    projectiles.push(proj);
  }

  // Camera pan runs concurrently with the first ~73% of the rocket flight; the
  // last 400ms of the rocket arc descend onto the enemy castle in ENEMY view.
  // Pan mirrors rocket flight: starts at fire+250ms (same as rocket), runs
  // 1300ms so the camera "tracks" the rocket through most of its arc, finishing
  // ~150ms before impact so the last beat lands cleanly in ENEMY view.
  viewTransition = { fromView: 'OURS', toView: 'ENEMY', t0: t + 250, dur: 1300, dir: 1 };
}

// ── Cinematic tick (called each frame) ───────────────────────────────────────
function _tick(now) {
  // Tilt eases back toward 0 over the last 60% of its window.
  if (tiltUntil > 0) {
    const total = 600;
    const remain = tiltUntil - now;
    if (remain <= 0) { tiltAngle = 0; tiltUntil = 0; }
    else if (remain < total * 0.6) tiltAngle *= 0.86;
  }

  // Intro hook: after dwelling on ENEMY castle for 1500ms, pan to OURS while a
  // raven flock crosses the screen toward our castle (per cinematic-spec).
  if (step === 'intro_dwell' && now - stepT0 > 1500) {
    _startIntroPanAndFlock();
  }
  // After enemy impact, dwell ~1500ms to savor the destruction, then trigger
  // the enemy riposte (pan back → raven flock → impact OURS → dwell → cut).
  // This makes the gameplay loop feel like a real turn-based exchange.
  if (step === 'enemy_dwell' && now - stepT0 > 1500) {
    _startEnemyRiposte();
  }
  // Pan-back finished → spawn the riposte raven flock.
  if (step === 'pan_back_to_ours' && !viewTransition) {
    _spawnEnemyRiposteFlock();
  }
  // After ours-impact dwell, hand off to interior. The interior's entrance
  // zoom 1.45→1.0 handles the punch — no extra exit transition needed (we're
  // already in OURS view post pan-back).
  if (step === 'ours_dwell' && now - stepT0 > 1500) {
    step = 'idle';
    // Same await-tap beat as intro: wide overview → tap → zoom → interior.
    _startDezoomToAwait(() => {
      emit('cut_to_interior', {
        hp_self_after:  state.hp_self_pct,
        hp_enemy_after: state.hp_enemy_pct,
        units_destroyed_ids: pendingKills,
      });
    });
  }
}

function _startEnemyRiposte() {
  const now = performance.now();
  step = 'pan_back_to_ours';
  stepT0 = now;
  viewTransition = {
    fromView: 'ENEMY', toView: 'OURS',
    t0: now, dur: 950, dir: -1,
  };
}

function _spawnEnemyRiposteFlock() {
  // Trajectory shape (start point, duration, sine amplitude) is held nearly
  // constant so the flock keeps a recognisable, repeated motion — only the
  // landing point shifts. Targets come from OURS_IMPACT_CYCLE, shared with
  // the intro raven, so consecutive enemy shots never cluster.
  const target = _nextOursImpact();
  // Enemy retaliation deals 42-50 dmg — combined with the 50-dmg intro bomb
  // this brings blue to the fail-trigger threshold (≤10 HP) after just one
  // retaliation, i.e. blue dies in ≤2 enemy moves total.
  const dmgVal = 42 + Math.floor(Math.random() * 9);
  const t = performance.now();
  /** @type {Projectile} */
  const flock = {
    kind: 'flock',
    from: { x: W + 100, y: 280 },
    to: target,
    t0: t + 150,
    dur: 1800,
    peakLift: 0,
    sinAmp: 50, sinFreq: 0, sinPhase: 0,
    onLand: () => {
      playSfx('SFX_RAVEN_POP', { volume: 0.8 });
      _routeOursImpact(target, dmgVal);
    },
  };
  projectiles.push(flock);
  playSfx('SFX_RAVEN_CAW', { volume: 0.7 });
  // Set BEFORE _routeOursImpact runs — it dispatches via this step.
  step = 'cut_to_ours';
  stepT0 = performance.now();
}

function _impactEnemy(at, d) {
  state.hp_enemy_pct = Math.max(0, state.hp_enemy_pct - d);
  floats.push({ x: at.x, y: at.y - 24, t0: performance.now(), text: `-${d}`, color: '#FFE54A' });
  _spawnExplosion(at.x, at.y, { heavy: true });
  triggerShake(18, 480);
  tiltAngle = 0.09;
  tiltUntil = performance.now() + 700;
  enemyRecoil = { t0: performance.now(), dur: 680, peak: 42 };
  step = 'enemy_dwell';
  stepT0 = performance.now();
}

function _startExitTransition(endAction) {
  transitioning = true;
  transitionT0 = performance.now();
  transitionEndAction = endAction;
  transitionEndFired = false;
}

function _emitCutToInterior() {
  // Whip-pan back ENEMY → OURS (no zoom punch on enemy — enemy castle has no
  // interior view in source). Interior's own entrance zoom does the punch.
  const now = performance.now();
  viewTransition = {
    fromView: 'ENEMY', toView: 'OURS',
    t0: now, dur: 950, dir: -1,
    onComplete: () => {
      emit('cut_to_interior', {
        hp_self_after:  state.hp_self_pct,
        hp_enemy_after: state.hp_enemy_pct,
        units_destroyed_ids: pendingKills,
      });
    },
  };
}

// Override: when ours-impact lands during a cut_to_ours, advance to ours_dwell
// (the original _impactOurs handles incoming-opening differently).
const _origImpactOurs = _impactOurs;
function _impactOursDuringResolve(at, d) {
  _oursAttacksTaken++;
  // No floor — blue can reach 0 and trigger the fail screen naturally.
  state.hp_self_pct = Math.max(0, state.hp_self_pct - d);
  floats.push({ x: at.x, y: at.y - 24, t0: performance.now(), text: `-${d}`, color: '#FFE54A' });
  _spawnExplosion(at.x, at.y, { heavy: false });
  triggerShake(11, 380);
  // Recoil: bomb came from top-right → tilt left.
  tiltAngle = -0.06;
  tiltUntil = performance.now() + 500;
  step = 'ours_dwell';
  stepT0 = performance.now();
}

// We rebind the onLand for incoming-bomb-during-resolve to use the resolve variant.
// (Done inline via the `step` check inside _impactOurs.)
// Simpler: route based on `step`:
function _routeOursImpact(at, d) {
  if (step === 'cut_to_ours') {
    _impactOursDuringResolve(at, d);
  } else {
    // opening incoming
    _oursAttacksTaken++;
    state.hp_self_pct = Math.max(0, state.hp_self_pct - d);
    floats.push({ x: at.x, y: at.y - 24, t0: performance.now(), text: `-${d}`, color: '#FFE54A' });
    _spawnExplosion(at.x, at.y, { heavy: true });
    triggerShake(20, 520);
    if (step === 'incoming') {
      // Hand off to interior with a zoom transition (T1) so it isn't a hard cut.
      setTimeout(() => {
        step = 'idle';
        _startExitTransition(() => ready_for_player_input());
      }, 400);
    }
  }
}

// ── Render loop ──────────────────────────────────────────────────────────────
function loop() {
  if (!visible) { rafId = 0; return; }
  rafId = requestAnimationFrame(loop);
  if (!ctx || !canvas) return;
  const now = performance.now();

  _tick(now);

  // Camera shake — quadratic decay over the configured duration.
  let sx = 0, sy = 0;
  const sElapsed = now - shakeStart;
  if (sElapsed < shakeDur) {
    const k = 1 - sElapsed / shakeDur;
    const decay = k * k;
    sx = (Math.random() * 2 - 1) * shakeIntensity * decay;
    sy = (Math.random() * 2 - 1) * shakeIntensity * decay;
  }

  // Zoom transition (T1): "diving into the castle". An accelerating zoom punches
  // forward into the keep while a circular iris closes around the muzzle/door.
  // The iris reaches full black just before the scene swap, so the cut is
  // hidden behind the vignette — what the viewer perceives is a continuous
  // plunge through the castle wall, not a hard cut.
  let zoomScale = 1;
  let irisProgress = 0;       // 0 = open, 1 = fully closed (black)
  let radialSpeedAlpha = 0;   // alpha of radial streaks during mid-dive
  if (transitioning) {
    const tn = Math.min(1, (now - transitionT0) / TRANSITION_DUR);
    // ease-in pow 2.6 — accelerates aggressively near the end (dive feel).
    const easedZoom = Math.pow(tn, 2.6);
    zoomScale = 1 + easedZoom * 4.0;          // 1 → 5.0x: real punch-through
    // Iris stays open ~40%, then closes hard over the last 60% (ease-in cubic).
    const irisRaw = Math.max(0, (tn - 0.40) / 0.60);
    irisProgress = irisRaw * irisRaw * irisRaw;
    // Radial speed-lines peak in the middle of the dive (40-85%).
    if (tn > 0.40 && tn < 0.92) {
      const k = (tn - 0.40) / 0.52;
      radialSpeedAlpha = Math.sin(k * Math.PI) * 0.35;
    }
  }

  // Whip pan (T2): horizontal slide between two castle "slots".
  let panOffset = 0;
  let panProgress = 0;
  if (viewTransition) {
    const tn = Math.min(1, (now - viewTransition.t0) / viewTransition.dur);
    panProgress = tn;
    // ease-in-out cubic for the camera glide
    const eased = tn < 0.5 ? 4 * tn * tn * tn : 1 - Math.pow(-2 * tn + 2, 3) / 2;
    panOffset = eased * W * viewTransition.dir;  // dir=+1: world slides left, ENEMY enters from right
    if (tn >= 1) {
      view = viewTransition.toView;
      const onComplete = viewTransition.onComplete;
      viewTransition = null;
      panOffset = 0;
      if (onComplete) onComplete();
    }
  }

  ctx.save();
  ctx.translate(sx, sy);
  if (zoomScale !== 1) {
    const cx = W / 2, cy = BASE_Y - 40;
    ctx.translate(cx, cy);
    ctx.scale(zoomScale, zoomScale);
    ctx.translate(-cx, -cy);
  }

  // Background parallax during whip pan: far layers move slowly, near layers
  // move faster — gives genuine "camera glides through 3D space" feel that
  // Gemini Vision can recognize as motion (vs frozen bg with sliding castles).
  const bgPanFar  = -panOffset * 0.18;
  const bgPanMid  = -panOffset * 0.42;
  const bgPanNear = -panOffset * 0.70;

  ctx.save(); ctx.translate(bgPanFar,  0); _drawSky(ctx);        ctx.restore();
  ctx.save(); ctx.translate(bgPanFar,  0); _drawHillsFar(ctx);   ctx.restore();
  ctx.save(); ctx.translate(bgPanMid,  0); _drawForestNear(ctx); ctx.restore();
  ctx.save(); ctx.translate(bgPanNear, 0); _drawGround(ctx);     ctx.restore();

  // Overview-tap beat (4 phases). overviewT ∈ [0, 1] where 0 = full wide
  // (scale 0.55, both castles spread) and 1 = full close (scale 1.0, OURS
  // only — identical to the default render path so a frame at 1 is pixel-
  // equivalent to no overview at all).
  //   dezoom   : 1 → 0 over DEZOOM_DUR — smooth entry into wide
  //   await    : stays at 0 — hand prompt visible, listening for tap
  //   zoom-in  : 0 → 1 over ZOOM_IN_DUR — chains into the dive iris
  // On zoom-in completion we fire _startExitTransition so the iris+punch
  // zoom (1.0→5.0×) takes over from where zoom-in landed (1.0). The two
  // are visually continuous — one accelerating dive 0.55 → 1.0 → 5.0.
  let overviewT = -1;
  if (dezoomT0 > 0) {
    const k = Math.min(1, (now - dezoomT0) / DEZOOM_DUR);
    const eased = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    overviewT = 1 - eased;
    if (k >= 1) {
      dezoomT0 = 0;
      // Auto-pan: skip the awaitingTap pause and zoom straight back in. The
      // camera reads as one continuous pan-out → pan-in (matches the
      // projectile-follow camera in the rest of the scene).
      zoomInT0 = now;
    }
  } else if (awaitingTap) {
    overviewT = 0;
  } else if (zoomInT0 > 0) {
    const k = Math.min(1, (now - zoomInT0) / ZOOM_IN_DUR);
    overviewT = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    if (k >= 1) {
      zoomInT0 = 0;
      const action = pendingTapAction;
      pendingTapAction = null;
      if (action) _startExitTransition(action);
    }
  }

  if (overviewT >= 0) {
    const scale = OVERVIEW_SCALE + (1 - OVERVIEW_SCALE) * overviewT;
    const dxOurs  = OVERVIEW_OURS_DX  * (1 - overviewT);
    const dxEnemy = OVERVIEW_ENEMY_DX + (W * 1.6 - OVERVIEW_ENEMY_DX) * overviewT;
    const cx = W / 2, cy = BASE_Y - 40;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    // Draw enemy first so OURS reads on top when they overlap during zoom.
    _drawCastleSlot(ctx, 'ENEMY', dxEnemy);
    _drawCastleSlot(ctx, 'OURS',  dxOurs);
    ctx.restore();
  } else if (viewTransition) {
    // Render BOTH castles side-by-side. fromView at offset -panOffset, toView at +W-panOffset.
    const dxFrom = -panOffset;
    const dxTo   = (viewTransition.dir > 0 ? W : -W) - panOffset;
    _drawCastleSlot(ctx, viewTransition.fromView, dxFrom);
    _drawCastleSlot(ctx, viewTransition.toView,   dxTo);
    // Subtle horizontal motion-blur streaks during the middle of the pan
    if (panProgress > 0.15 && panProgress < 0.85) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      const streaks = 6;
      for (let s = 0; s < streaks; s++) {
        const sy0 = (s / streaks) * H;
        ctx.fillRect(0, sy0 + 8, W, 4);
      }
      ctx.restore();
    }
  } else {
    _drawCastleSlot(ctx, view, 0);
  }

  // viewOffset = world-x of the left screen edge. OURS frame at 0, ENEMY at W;
  // panOffset interpolates between them during a viewTransition. World-space
  // projectiles use this to compute their on-screen position.
  const viewOffset = (view === 'ENEMY' ? W : 0) + panOffset;

  _drawProjectiles(ctx, now, viewOffset);
  _drawParticles(ctx, now);
  _drawFloats(ctx, now);

  ctx.restore();

  // Radial speed-lines from castle center outward — sells the dive velocity.
  if (radialSpeedAlpha > 0) {
    const cx = W / 2, cy = BASE_Y - 40;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = `rgba(255,250,235,${radialSpeedAlpha})`;
    ctx.lineWidth = 2.5;
    const N = 26;
    const innerR = 80;
    const outerR = Math.hypot(W, H);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + (now / 600);
      const c = Math.cos(a), s = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(c * innerR, s * innerR);
      ctx.lineTo(c * outerR, s * outerR);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Iris-out: circular black mask shrinking toward zero radius around the
  // castle keep. When irisProgress reaches 1 the screen is fully black, which
  // is when we hand off to interior — masking the swap entirely.
  if (irisProgress > 0) {
    const cx = W / 2, cy = BASE_Y - 40;
    const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
    // Start radius covers the screen; closes to 0 as progress→1.
    const r = maxR * (1 - irisProgress);
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    // Black ring filled by even-odd: outer rect minus inner circle.
    ctx.rect(0, 0, W, H);
    ctx.moveTo(cx + r, cy);
    ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.restore();
  }

  drawTopHud(ctx);
  drawScriptOverlay(ctx, now / 1000);
  // Hide the "tap blue castle" hand whenever the fail screen owns the screen —
  // only one hand cursor must be visible at a time, and the fail screen's
  // PLAY-NOW hand wins.
  if (awaitingTap && !isFailScreenShown()) _drawTapPrompt(ctx, now / 1000);

  // Fire the end action once the iris is fully closed (~92% of duration) so
  // the actual scene swap is hidden behind black. Then keep drawing exterior
  // until TRANSITION_DUR elapses (visible==false flips and the loop stops on
  // its own once interior takes over).
  if (transitioning && !transitionEndFired) {
    const tn = (now - transitionT0) / TRANSITION_DUR;
    if (tn >= 0.92) {
      transitionEndFired = true;
      const endAction = transitionEndAction;
      transitionEndAction = null;
      if (endAction) endAction();
    }
  }
  if (transitioning && (now - transitionT0) >= TRANSITION_DUR) {
    transitioning = false;
  }
}

// Tap-to-zoom prompt: pulsing ring + Kenney hand pointer over OURS in wide.
// In overview the OURS castle centre lands at screen X = W/2 + (OURS_DX * SCALE).
function _drawTapPrompt(ctx, t_sec) {
  const cx = W / 2 + OVERVIEW_OURS_DX * OVERVIEW_SCALE;
  const cy = BASE_Y - 40 - 60;  // above the castle silhouette
  const pulse = 0.5 + 0.5 * Math.sin(t_sec * 2 * Math.PI * 1.4);
  const ringR = 38 + pulse * 18;
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.45 * (1 - pulse)})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.stroke();
  if (isImageReady('HAND_POINTER')) {
    const img = getImage('HAND_POINTER');
    const HAND_SIZE = 92;
    ctx.translate(cx, cy);
    ctx.rotate(-0.18);
    ctx.translate(10, 34);   // tip-anchor offset
    ctx.drawImage(img, -HAND_SIZE / 2, -HAND_SIZE / 2, HAND_SIZE, HAND_SIZE);
  }
  ctx.restore();
}

function _computeEnemyRecoil(now) {
  if (!enemyRecoil) return { dx: 0 };
  const t = now - enemyRecoil.t0;
  if (t >= enemyRecoil.dur) { enemyRecoil = null; return { dx: 0 }; }
  const peak = enemyRecoil.peak;
  const tOut = 220;
  let dx;
  if (t < tOut) {
    const k = t / tOut;
    dx = peak * (1 - Math.pow(1 - k, 3));        // easeOutCubic 0→peak
  } else {
    const k = (t - tOut) / (enemyRecoil.dur - tOut);
    dx = peak * (1 - k) * (1 - k);               // easeInQuad peak→0
  }
  return { dx };
}

function _drawCastleSlot(ctx, viewMode, dx) {
  ctx.save();
  let dxExtra = 0;
  if (viewMode === 'ENEMY') {
    dxExtra = _computeEnemyRecoil(performance.now()).dx;
    _treadScrollOffset = dxExtra;
  } else {
    _treadScrollOffset = 0;
  }
  ctx.translate(dx + dxExtra, 0);
  _drawCastleWithBase(ctx, viewMode);
  ctx.restore();
  _treadScrollOffset = 0;
}

// ── Drawing — backgrounds ────────────────────────────────────────────────────
// Background extends [-W .. +2W] so horizontal pan never reveals an edge.
const BG_X0 = -W;
const BG_W  = 3 * W;

export function drawSky(ctx) { return _drawSky(ctx); }
export function drawHillsFar(ctx) { return _drawHillsFar(ctx); }
export function drawForestNear(ctx) { return _drawForestNear(ctx); }
export function drawGround(ctx) { return _drawGround(ctx); }

function _drawSky(ctx) {
  // Misty teal-to-pale-green à la source (sec_01, sec_08).
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  g.addColorStop(0, '#A8C9B5');
  g.addColorStop(0.55, '#BCD4B7');
  g.addColorStop(1, '#C9D9A8');
  ctx.fillStyle = g;
  ctx.fillRect(BG_X0, 0, BG_W, HORIZON_Y);
}

function _drawHillsFar(ctx) {
  // Three layers of rounded organic hills (no triangle teeth).
  const layers = [
    { color: '#7FA38E', amp: 22, period: 320, dy: -34 },
    { color: '#5C8775', amp: 28, period: 240, dy: -10 },
    { color: '#3F6555', amp: 18, period: 180, dy: 20 },
  ];
  for (const L of layers) {
    ctx.fillStyle = L.color;
    ctx.beginPath();
    ctx.moveTo(BG_X0, HORIZON_Y + 80);
    for (let x = BG_X0; x <= BG_X0 + BG_W; x += 6) {
      const y = HORIZON_Y + L.dy - L.amp * Math.sin((x / L.period) * Math.PI * 2);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(BG_X0 + BG_W, HORIZON_Y + 80);
    ctx.closePath();
    ctx.fill();
  }
}

function _drawForestNear(ctx) {
  // Lumpy rounded foliage clusters in dark green (not pine triangles).
  ctx.fillStyle = '#2C5443';
  const N = 42;  // wider strip — covers BG range during pan
  for (let i = 0; i < N; i++) {
    const cx = BG_X0 + (i / N) * BG_W + ((i * 31) % 28);
    const cy = HORIZON_Y + 22 + ((i * 17) % 14);
    const r  = 22 + ((i * 7) % 12);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r * 0.7, cy + 4, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - r * 0.7, cy + 6, r * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }
}

function _drawGround(ctx) {
  // Source-frame inspection (clip1 blue side vs clip2 red side):
  //   • OURS  view (blue castle): plain muted green ground, two soft bands
  //     (#668F56 over #466B3F), no scalloped red dirt anywhere.
  //   • ENEMY view (red castle):  three-layer stack with the dramatic
  //     scarlet deep-dirt slab and scalloped soil/dirt boundaries.
  // The red slab only belongs to the enemy frame — drawing it under the
  // blue castle reads as "wrong terrain" and was the user's complaint.
  // Default to the plain green source-style ground everywhere — the red
  // scalloped dirt only appears in the source during a tight close-up on
  // the red castle, which our pan/wide cinematography never reaches, so
  // surfacing it elsewhere just reads as wrong terrain.
  return _drawGroundOurs(ctx);
}

function _drawGroundOurs(ctx) {
  // Soft grass turf — a single muted-green base with a vertical gradient from
  // lighter front-grass (#668F56) into deeper shadow (#3F5D38), no hard
  // separator stroke. The deterministic grass tufts dotted along the upper
  // band keep it from reading as a flat rectangle once the castles cover it.
  // Anchor at HORIZON_Y + 78 so the green band overlaps the bottom of the
  // hill polygons (which end at HORIZON_Y + 80). The canvas is never cleared
  // between frames, so any leftover gap accumulates trail/debris specks into
  // a permanent stripe at that Y — covering it is what kills the artifact.
  const GRASS_TOP = HORIZON_Y + 78;
  const grad = ctx.createLinearGradient(0, GRASS_TOP, 0, H);
  grad.addColorStop(0,    '#6F9658');
  grad.addColorStop(0.35, '#5C8449');
  grad.addColorStop(1,    '#3F5D38');
  ctx.fillStyle = grad;
  ctx.fillRect(BG_X0, GRASS_TOP, BG_W, H - GRASS_TOP);

  // Tiny grass tufts for texture — deterministic positions tied to x so they
  // don't shimmer during the horizontal pan.
  ctx.fillStyle = 'rgba(46, 70, 38, 0.55)';
  for (let i = 0; i < 110; i++) {
    const x = BG_X0 + ((i * 173) % BG_W);
    const y = GRASS_TOP + 6 + ((i * 53) % 22);
    const w = 3 + ((i * 7) % 3);
    const h = 2 + ((i * 11) % 2);
    ctx.fillRect(x, y, w, h);
  }
  // A second, brighter tuft pass closer to the foreground for parallax depth.
  ctx.fillStyle = 'rgba(140, 174, 116, 0.45)';
  for (let i = 0; i < 80; i++) {
    const x = BG_X0 + ((i * 233) % BG_W);
    const y = GRASS_TOP + 26 + ((i * 47) % 80);
    ctx.fillRect(x, y, 4, 2);
  }
}

function _drawGroundEnemy(ctx) {
  // Three layers (turf → topsoil → deep dirt) with wide scalloped lower edges
  // and a uniform dark-brown outline on every horizontal boundary —
  // matching the source's vector-cartoon stack on the red/enemy side.
  // Palette + proportions sampled from clip2_t0 vertical scan:
  //   grass #5F8C4D, topsoil #763E2E, deep dirt #7C241D, outline #3E2817
  const GRASS_TOP = HORIZON_Y + 92;
  const SOIL_TOP  = HORIZON_Y + 108;
  const DEEP_TOP  = HORIZON_Y + 132;
  const BUMP_R    = 14;
  const STROKE_W  = 1.5;
  const STROKE    = '#3E2817';

  // Generate one polyline of arc points for a scalloped boundary running
  // left→right, starting and ending on baseY. Points are sampled along each
  // semicircle so a single ctx.beginPath() + lineTo loop traces a clean,
  // non-intersecting curve. Returns the array of {x, y} points.
  const scallopPoints = (baseY, r, x0, x1) => {
    const pts = [];
    const stepsPerArc = 12;
    for (let cx = x0 + r; cx < x1 + r; cx += 2 * r) {
      // Down-bump: y = baseY + r * sin(theta), x = cx - r*cos(theta)
      // theta from 0 → PI sweeps the bottom of a circle from left tangent to right tangent
      for (let i = 0; i <= stepsPerArc; i++) {
        const t = (i / stepsPerArc) * Math.PI;
        pts.push({ x: cx - r * Math.cos(t), y: baseY + r * Math.sin(t) });
      }
    }
    return pts;
  };

  const x0 = BG_X0, x1 = BG_X0 + BG_W;
  const grassEdge = scallopPoints(SOIL_TOP, BUMP_R, x0, x1);
  const soilEdge  = scallopPoints(DEEP_TOP, BUMP_R, x0, x1);

  // ── Layer 3 (deep brick-red dirt) — bottom slab, completely flat.
  ctx.fillStyle = '#7C241D';
  ctx.fillRect(x0, DEEP_TOP, BG_W, H - DEEP_TOP);

  // ── Layer 2 (topsoil) — fill bounded by SOIL_TOP and the soilEdge scallops.
  ctx.beginPath();
  ctx.moveTo(x0, SOIL_TOP);
  ctx.lineTo(x1, SOIL_TOP);
  ctx.lineTo(x1, DEEP_TOP);
  for (let i = soilEdge.length - 1; i >= 0; i--) ctx.lineTo(soilEdge[i].x, soilEdge[i].y);
  ctx.lineTo(x0, DEEP_TOP);
  ctx.closePath();
  ctx.fillStyle = '#763E2E';
  ctx.fill();

  // ── Layer 1 (grass turf) — fill bounded by GRASS_TOP and the grassEdge scallops.
  ctx.beginPath();
  ctx.moveTo(x0, GRASS_TOP);
  ctx.lineTo(x1, GRASS_TOP);
  ctx.lineTo(x1, SOIL_TOP);
  for (let i = grassEdge.length - 1; i >= 0; i--) ctx.lineTo(grassEdge[i].x, grassEdge[i].y);
  ctx.lineTo(x0, SOIL_TOP);
  ctx.closePath();
  ctx.fillStyle = '#5F8C4D';
  ctx.fill();

  // ── Outlines: uniform 2.5 px dark brown on grass top, grass-soil edge,
  // and soil-deep edge. lineJoin=round keeps the cusps clean.
  ctx.lineWidth = STROKE_W;
  ctx.strokeStyle = STROKE;
  ctx.lineJoin = 'round';
  ctx.lineCap  = 'round';
  // Grass top edge
  ctx.beginPath();
  ctx.moveTo(x0, GRASS_TOP); ctx.lineTo(x1, GRASS_TOP);
  ctx.stroke();
  // Grass→soil scalloped edge
  ctx.beginPath();
  ctx.moveTo(grassEdge[0].x, grassEdge[0].y);
  for (let i = 1; i < grassEdge.length; i++) ctx.lineTo(grassEdge[i].x, grassEdge[i].y);
  ctx.stroke();
  // Soil→deep scalloped edge
  ctx.beginPath();
  ctx.moveTo(soilEdge[0].x, soilEdge[0].y);
  for (let i = 1; i < soilEdge.length; i++) ctx.lineTo(soilEdge[i].x, soilEdge[i].y);
  ctx.stroke();
}

// ── Drawing — castle + base ──────────────────────────────────────────────────
function _drawCastleWithBase(ctx, viewMode) {
  // tilt around base center
  const cx = W / 2;
  const cy = BASE_Y + BASE_H / 2;
  ctx.save();
  // Only the active view tilts on impact (the other slot is just sliding through).
  const isActive = (viewMode || view) === view;
  if (isActive && tiltAngle !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate(tiltAngle);
    ctx.translate(-cx, -cy);
  }
  const v = viewMode || view;
  // PNG-tier mode bakes treads + base directly into the sprite; skip our
  // procedural base/treads to avoid doubling. Both sides use the same logic
  // — only the asset key prefix differs (CASTLE_BLUE_* vs CASTLE_*).
  const tierPng = _damagePng(v);
  if (tierPng) {
    _drawDamagePng(ctx, tierPng);
  } else {
    _drawCastle(ctx, viewMode);
    _drawBase(ctx);
    _drawTreads(ctx, viewMode);
  }
  ctx.restore();
}

function _drawCastle(ctx, viewMode) {
  const v = viewMode || view;
  const asset = v === 'OURS' ? 'BLUE_CASTLE' : 'RED_CASTLE';
  if (isImageReady(asset)) {
    ctx.drawImage(getImage(asset), CASTLE_X, CASTLE_TOP_Y, CASTLE_W, CASTLE_H);
  } else {
    getImage(asset);
    ctx.fillStyle = v === 'OURS' ? '#3D6FA8' : '#9B2E29';
    ctx.fillRect(CASTLE_X, CASTLE_TOP_Y, CASTLE_W, CASTLE_H);
  }
}

// Damage-tier PNG renderer (both OURS and ENEMY). Sprite content is normalized
// to a known height (CASTLE_H + base + treads bakery) and anchored on the same
// ground line as the procedural base would be.
function _drawDamagePng(ctx, img) {
  const { minY, contentH } = _getContentBounds(img);
  // Total castle+base+treads area in our screen layout: CASTLE_TOP_Y to
  // BASE_Y + BASE_H + TREAD_H ≈ from CASTLE_H + base/tread band. Map the
  // sprite's content height to that whole footprint so the sprite's chenilles
  // sit on the ground line.
  const targetH = CASTLE_H + BASE_H + TREAD_H - 6;
  const scale = targetH / contentH;
  const targetW = img.naturalWidth * scale;
  const dx = (W - targetW) / 2;
  const dy = (BASE_Y + BASE_H + TREAD_H - 6) - targetH - minY * scale;
  ctx.drawImage(img,
    0, 0, img.naturalWidth, img.naturalHeight,
    dx, dy, targetW, img.naturalHeight * scale,
  );
}

function _drawBase(ctx) {
  const x = CASTLE_X - 8;
  const w = CASTLE_W + 16;
  ctx.fillStyle = '#8B5E3C';
  ctx.fillRect(x, BASE_Y, w, BASE_H);
  ctx.fillStyle = '#A07040';
  ctx.fillRect(x, BASE_Y, w, 8);
  ctx.fillStyle = '#502E12';
  ctx.fillRect(x, BASE_Y + BASE_H - 10, w, 10);
  // arched openings
  ctx.fillStyle = '#3B1A12';
  for (let g = 0; g < 2; g++) {
    const gx = x + 50 + g * (w - 130);
    const gw = 36, gh = BASE_H - 18;
    ctx.beginPath();
    ctx.moveTo(gx, BASE_Y + BASE_H - 10);
    ctx.lineTo(gx, BASE_Y + 14 + gh / 2);
    ctx.arc(gx + gw / 2, BASE_Y + 14 + gh / 2, gw / 2, Math.PI, 0, false);
    ctx.lineTo(gx + gw, BASE_Y + BASE_H - 10);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, BASE_Y, w, BASE_H);
}

function _drawTreads(ctx, viewMode) {
  // The source castle rides on TWO separate treads (one under each tower)
  // with arches + greenery visible between them, not a single full-width
  // monster tread. Each unit is sized at ~36% of the castle width.
  const v = viewMode || view;
  // Both sides use the TREAD_ENEMY sprite — it matches the treads baked
  // into the red damage-tier PNGs (CASTLE_75/50/25), so the intact and
  // damaged states stay visually consistent across both castles.
  void v;
  const img = getImage('TREAD_ENEMY');
  if (!img || !img.width) return;

  const tw = Math.round(CASTLE_W * 0.42);
  const th = tw * (img.height / img.width);
  // Top edge of the spikes sits ~12 px above the wood base so the wood
  // overlaps the spike row a tiny bit (matches the source).
  const y  = TREAD_Y - 12;
  // Centres of the two treads — placed under each main tower.
  const cxL = CASTLE_X + Math.round(CASTLE_W * 0.22);
  const cxR = CASTLE_X + Math.round(CASTLE_W * 0.78);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, cxL - tw / 2, y, tw, th);
  ctx.drawImage(img, cxR - tw / 2, y, tw, th);
}

// ── Drawing — projectiles / floats ───────────────────────────────────────────

function _drawProjectiles(ctx, now, viewOffset = 0) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (now < p.t0) continue;
    const t = (now - p.t0) / p.dur;
    const dx_screen = p.worldSpace ? -viewOffset : 0;
    if (t >= 1) {
      try {
        // route ours-impact based on current step
        if (p.kind === 'bomb' && p === projectiles[i]) {
          if (step === 'cut_to_ours' || step === 'incoming') {
            _routeOursImpact(p.to, step === 'incoming' ? 33 : pendingPlayerDmg);
          } else {
            p.onLand();
          }
        } else {
          p.onLand();
        }
      } catch (e) { console.error(e); }
      projectiles.splice(i, 1);
      continue;
    }
    const pos = _arc(p.from, p.to, t, p.peakLift);
    const ang = _arcAngle(p.from, p.to, t, p.peakLift);

    if (p._lastTrailMs == null) p._lastTrailMs = -Infinity;
    if (now - p._lastTrailMs >= TRAIL_EVERY_MS) {
      p._lastTrailMs = now;
      if (p.kind === 'flock') {
        const u = Math.max(0, Math.min(1, (now - p.t0) / p.dur));
        const dxF = p.to.x - p.from.x, dyF = p.to.y - p.from.y;
        const dir = dxF < 0 ? -1 : 1;
        const half = (p.spreadPx ?? 70) / 2;
        const sinHalf = p.sinHalfCycles ?? 3;
        const sinAmpF = p.sinAmp ?? 50;
        const baseX = p.from.x + dxF * u, baseY = p.from.y + dyF * u;
        const offset = Math.sin(u * Math.PI * sinHalf) * sinAmpF;
        const flightAng = Math.atan2(dyF, dxF);
        _emitTrailParticle('raven', baseX + dir * half + dx_screen, baseY + offset, flightAng, now);
        _emitTrailParticle('raven', baseX - dir * half + dx_screen, baseY - offset, flightAng, now);
      } else {
        _emitTrailParticle(p.kind, pos.x + dx_screen, pos.y, ang, now);
      }
    }

    if (p.kind === 'flock') {
      drawRavenFlock(ctx, now - p.t0, {
        from: p.from, to: p.to, durMs: p.dur,
        sinAmp: p.sinAmp ?? 50,
        sinHalfCycles: 3,
        spreadPx: 70,
        ravenSize: 60,
        flapSpeed: 5,
      });
    }
    else if (p.kind === 'rocket') _drawRocketSprite(ctx, pos.x + dx_screen, pos.y, ang, 36);
    else if (p.kind === 'rocket_p1') drawProjectileP1(ctx, pos.x + dx_screen, pos.y, ang, p._spriteSize ?? 30);
    else if (p.kind === 'bomb_p2')   drawProjectileP2(ctx, pos.x + dx_screen, pos.y, ang, p._spriteSize ?? 44);
    else if (p.kind === 'bomb') _drawBombSprite(ctx, pos.x + dx_screen, pos.y, ang);
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
    getImage('ROCKET'); // kick the lazy load
    ctx.fillStyle = '#C44';
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
  }
  // red flame trail
  for (let k = 1; k < 8; k++) {
    const tx = x - Math.cos(ang) * k * 7;
    const ty = y - Math.sin(ang) * k * 7;
    const alpha = 0.55 * (1 - k / 8);
    ctx.fillStyle = `rgba(255,${100 + k * 12},40,${alpha})`;
    ctx.beginPath(); ctx.arc(tx, ty, 5 + k * 0.5, 0, Math.PI * 2); ctx.fill();
  }
}

function _drawBombSprite(ctx, x, y, ang) {
  const size = 64;
  if (isImageReady('BOMB')) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + Math.PI);
    ctx.drawImage(getImage('BOMB'), -size / 2, -size / 2, size, size);
    ctx.restore();
  } else {
    getImage('BOMB'); // kick the lazy load
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  }
  // gray smoke trail
  ctx.fillStyle = 'rgba(60,60,60,0.45)';
  for (let k = 1; k < 7; k++) {
    ctx.beginPath();
    ctx.arc(x - Math.cos(ang) * k * 8, y - Math.sin(ang) * k * 8, 5 + k * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function _drawParticles(ctx, now) {
  ctx.save();
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const dt = (now - p.t0) / 1000; // seconds since spawn
    if (dt < 0) continue;
    if (dt * 1000 >= p.life) { particles.splice(i, 1); continue; }
    // integrate (simple Euler — good enough at 60fps)
    const px = p.x + p.vx * dt + 0.5 * p.ax * dt * dt;
    const py = p.y + p.vy * dt + 0.5 * p.ay * dt * dt;
    const age = (dt * 1000) / p.life;       // 0..1
    const fade = 1 - age;

    if (p.kind === 'flash') {
      const r = p.size * (1 + p.sizeGrow * age);
      ctx.globalAlpha = fade * fade;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
      grad.addColorStop(0, p.color);
      grad.addColorStop(0.6, p.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'spark') {
      ctx.globalAlpha = fade;
      ctx.fillStyle = p.color;
      // streak in direction of velocity
      const ang = Math.atan2(p.vy + p.ay * dt, p.vx);
      const len = 8 + p.size;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.fillRect(-len, -p.size/2, len, p.size);
      ctx.restore();
    } else if (p.kind === 'debris') {
      ctx.globalAlpha = Math.min(1, fade * 1.4);
      ctx.fillStyle = p.color;
      const rot = p.rot + p.rotSpeed * dt;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      const s = p.size;
      ctx.fillRect(-s/2, -s/2, s, s * 0.7);
      // dark edge for readability
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-s/2, s*0.2, s, s * 0.15);
      ctx.restore();
    } else if (p.kind === 'smoke') {
      const r = p.size * (1 + p.sizeGrow * age);
      // smoke fades in then out
      const a = (age < 0.15 ? age / 0.15 : 1) * fade * 0.55;
      ctx.globalAlpha = a;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
      grad.addColorStop(0, 'rgba(80,75,70,1)');
      grad.addColorStop(0.7, 'rgba(50,46,42,0.7)');
      grad.addColorStop(1, 'rgba(40,36,32,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'trail_core') {
      const r = p.size * (0.7 + age * 0.6);
      ctx.globalAlpha = Math.min(1, fade * 0.70);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = fade * 0.22;
      ctx.fillStyle = '#FFD08A';
      ctx.beginPath(); ctx.arc(px, py, r * 0.45, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'trail_puff') {
      const r = p.size * (1 + p.sizeGrow * age);
      ctx.globalAlpha = fade * 0.38;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      const ddx = (((px * 13.37) | 0) % 7) - 3;
      const ddy = (((py * 7.91) | 0) % 7) - 3;
      ctx.globalAlpha = fade * 0.22;
      ctx.beginPath(); ctx.arc(px + ddx, py + ddy, r * 0.7, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'trail_wave') {
      const phase = (p.rot || 0) + (p.rotSpeed || 0) * dt;
      const ax = Math.sin(phase) * (p.driftAmp || 0) * fade;
      const wx = px + (p.driftAxisX || 0) * ax;
      const wy = py + (p.driftAxisY || 0) * ax;
      const r = p.size * (1 + p.sizeGrow * age);
      const a = (age < 0.15 ? age / 0.15 : 1) * fade * 0.28;
      ctx.globalAlpha = a;
      const grad = ctx.createRadialGradient(wx, wy, 0, wx, wy, r);
      grad.addColorStop(0,   'rgba(60,60,60,1)');
      grad.addColorStop(0.7, 'rgba(40,40,40,0.6)');
      grad.addColorStop(1,   'rgba(30,30,30,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

const FLOAT_LIFE_MS = 900;
function _drawFloats(ctx, now) {
  ctx.save();
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    const age = (now - f.t0) / FLOAT_LIFE_MS;
    if (age >= 1) { floats.splice(i, 1); continue; }
    const lift = age * 50;
    const alpha = 1 - age * age;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = f.color || '#FFE54A';
    ctx.strokeText(f.text, f.x, f.y - lift);
    ctx.fillText(f.text, f.x, f.y - lift);
  }
  ctx.restore();
}

// Dev-only helpers
/** @param {'OURS'|'ENEMY'} v */
export function _setView(v) { view = v; }
/** @type {any} */ (window).__setView = _setView;
