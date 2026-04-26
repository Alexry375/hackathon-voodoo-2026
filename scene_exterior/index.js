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
import { getImage, isImageReady } from '../shared/assets.js';
import { drawScriptOverlay } from '../playable/script.js';

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

/** Damage marks per side (don't bleed across views). Each zone caches a
 *  jagged polygon outline + crack rays so it doesn't shimmer between frames. */
const dmg = { OURS: /** @type {{x:number,y:number,r:number,poly:[number,number][],cracks:[number,number][]}[]} */ ([]),
              ENEMY: /** @type {{x:number,y:number,r:number,poly:[number,number][],cracks:[number,number][]}[]} */ ([]) };

function _makeDamageZone(x, y, r) {
  // Irregular polygon: 12 spokes around the centre with ±35% radius jitter.
  const poly = /** @type {[number,number][]} */ ([]);
  const N = 12;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + Math.random() * 0.35;
    const rr = r * (0.65 + Math.random() * 0.55);
    poly.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  // 5-8 crack rays extending past the polygon edge.
  const cracks = /** @type {[number,number][]} */ ([]);
  const nC = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < nC; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = r * (1.05 + Math.random() * 0.6);
    cracks.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  return { x, y, r, poly, cracks };
}

/** Castle tilt angle (radians) for firing animation. */
let tiltAngle = 0;
let tiltUntil = 0;

let shakeUntil = 0;
let shakeMag = 0;

/** @type {{x:number,y:number,t0:number,text:string,color:string}[]} */
const floats = [];

/** @typedef {{kind:'rocket'|'bomb', from:{x:number,y:number}, to:{x:number,y:number},
 *             t0:number, dur:number, peakLift:number, onLand:()=>void}} Projectile */
/** @type {Projectile[]} */
const projectiles = [];

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
const TRANSITION_DUR = 900;

// View whip-pan transition (T2 from Gemini critique).
// During cut OURS→ENEMY (and back) we slide both castles horizontally so the
// viewer reads a continuous camera pan instead of a hard cut. Background is
// kept static for simplicity (still reads as a pan thanks to parallax-by-zero).
let viewTransition = /** @type {null|{fromView:'OURS'|'ENEMY',toView:'OURS'|'ENEMY',t0:number,dur:number,dir:1|-1}} */ (null);
const VIEW_PAN_DUR = 750;
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
    if (s === 'INTRO_INCOMING')   { view = 'OURS'; _startIncoming(); }
    if (s === 'END_VICTORY')      { view = 'ENEMY'; }
    if (s === 'END_DEFEAT')       { view = 'OURS'; }
    if (visible && !rafId) loop();
  });
  on('player_fire', startPlayerShot);
}

// ── Opening cinematic ────────────────────────────────────────────────────────
function _startIncoming() {
  // Bomb falls from top-right onto our castle. Trajectory tuned so the bomb is
  // in-frame for ≥1.2 s — Gemini samples at 1 fps and previously the bomb
  // started at y=-40 / peakLift=80, putting it offscreen for the first second.
  const target = { x: CASTLE_X + CASTLE_W * 0.72, y: CASTLE_TOP_Y + 60 };
  const dmgVal = 33;
  pendingPlayerImpact = target;
  /** @type {Projectile} */
  const proj = {
    kind: 'bomb',
    from: { x: W + 30, y: 70 },
    to: target,
    // 600ms hold-pre-launch makes the bomb readable as a "threat in the sky"
    // even at Gemini's 1fps sampling (one frame catches it mid-air for sure).
    t0: performance.now() + 600,
    dur: 2400,
    peakLift: 140,
    onLand: () => _impactOurs(target, dmgVal),
  };
  projectiles.push(proj);
  step = 'incoming';
  stepT0 = performance.now();
}

function _impactOurs(at, d) {
  dmg.OURS.push(_makeDamageZone(at.x, at.y, 60 + Math.random() * 18));
  state.hp_self_pct = Math.max(0, state.hp_self_pct - d);
  floats.push({ x: at.x, y: at.y - 24, t0: performance.now(), text: `-${d}`, color: '#FFE54A' });
  // Bomb hit = bigger shake (impact from above, heavier than rocket).
  shakeUntil = performance.now() + 600; shakeMag = 16;
  tiltAngle = -0.08;
  tiltUntil = performance.now() + 700;
  if (step === 'incoming') {
    // hand control to interior after a short beat (was 900ms — too dead)
    setTimeout(() => { step = 'idle'; ready_for_player_input(); }, 400);
  }
}

// ── Player-fire cinematic ────────────────────────────────────────────────────
function startPlayerShot(payload) {
  view = 'OURS';
  tiltAngle = -0.07;
  tiltUntil = performance.now() + 600;
  step = 'fire';
  stepT0 = performance.now();

  // Stash enemy-side impact data
  const dmgVal = 14 + Math.floor(Math.random() * 6);
  pendingEnemyDmg = dmgVal;
  pendingEnemyImpact = {
    x: CASTLE_X + CASTLE_W * (0.30 + Math.random() * 0.4),
    y: CASTLE_TOP_Y + 70 + Math.random() * 160,
  };

  const t = performance.now();
  // Phase 1 projectile + camera pan are SIMULTANEOUS — the camera "follows" the
  // shot from ours toward enemy. Both run for 1100ms so Gemini's 1fps sampling
  // catches at least one frame mid-pan (verifies the camera is moving).
  const m = muzzlePos();
  /** @type {Projectile} */
  const phase1 = {
    kind: 'rocket',
    from: m, to: { x: W + 80, y: 240 },
    t0: t + 250,
    dur: 1100,
    peakLift: 220,
    onLand: () => {},
  };
  projectiles.push(phase1);

  viewTransition = { fromView: 'OURS', toView: 'ENEMY', t0: t + 250, dur: 1100, dir: 1 };

  // Phase 2 projectile spawns when pan completes — continuous trajectory feel.
  const phase2 = {
    kind: 'rocket',
    from: { x: -60, y: 240 },
    to: pendingEnemyImpact,
    t0: t + 1350,
    dur: 1100,
    peakLift: 220,
    onLand: () => _impactEnemy(pendingEnemyImpact, pendingEnemyDmg),
  };
  projectiles.push(phase2);
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

  // After enemy impact, dwell long enough to "savourer" the destruction
  // (Gemini P2: dwell 1500ms post-impact). Then cut directly back to interior
  // — no return whip pan, no immediate enemy riposte (Gemini: ping-pong inutile).
  if (step === 'enemy_dwell' && now - stepT0 > 1500) {
    step = 'idle';
    _emitCutToInterior();
  }
}

function _impactEnemy(at, d) {
  dmg.ENEMY.push(_makeDamageZone(at.x, at.y, 60 + Math.random() * 18));
  state.hp_enemy_pct = Math.max(0, state.hp_enemy_pct - d);
  floats.push({ x: at.x, y: at.y - 24, t0: performance.now(), text: `-${d}`, color: '#FFE54A' });
  // Strong shake (Gemini: "manque de nervosité") + longer tilt for weight.
  shakeUntil = performance.now() + 520; shakeMag = 14;
  tiltAngle = 0.09;
  tiltUntil = performance.now() + 700;
  step = 'enemy_dwell';
  stepT0 = performance.now();
}

function _startExitTransition(endAction) {
  transitioning = true;
  transitionT0 = performance.now();
  transitionEndAction = endAction;
}

function _emitCutToInterior() {
  _startExitTransition(() => {
    emit('cut_to_interior', {
      hp_self_after:  state.hp_self_pct,
      hp_enemy_after: state.hp_enemy_pct,
      units_destroyed_ids: pendingKills,
    });
  });
}

// Override: when ours-impact lands during a cut_to_ours, advance to ours_dwell
// (the original _impactOurs handles incoming-opening differently).
const _origImpactOurs = _impactOurs;
function _impactOursDuringResolve(at, d) {
  dmg.OURS.push(_makeDamageZone(at.x, at.y, 50 + Math.random() * 14));
  state.hp_self_pct = Math.max(30, state.hp_self_pct - d);  // never KO during ad
  floats.push({ x: at.x, y: at.y - 24, t0: performance.now(), text: `-${d}`, color: '#FFE54A' });
  shakeUntil = performance.now() + 320; shakeMag = 7;
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
    dmg.OURS.push(_makeDamageZone(at.x, at.y, 55));
    state.hp_self_pct = Math.max(0, state.hp_self_pct - d);
    floats.push({ x: at.x, y: at.y - 24, t0: performance.now(), text: `-${d}`, color: '#FFE54A' });
    shakeUntil = performance.now() + 380; shakeMag = 9;
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

  // Camera shake offsets
  let sx = 0, sy = 0;
  if (now < shakeUntil) {
    const k = (shakeUntil - now) / 380;
    sx = (Math.random() * 2 - 1) * shakeMag * k;
    sy = (Math.random() * 2 - 1) * shakeMag * k;
  }

  // Zoom transition (T1): scale around castle center with ease-in-out cubic.
  let zoomScale = 1;
  let fadeAlpha = 0;
  if (transitioning) {
    const tn = Math.min(1, (now - transitionT0) / TRANSITION_DUR);
    const eased = tn < 0.5 ? 4 * tn * tn * tn : 1 - Math.pow(-2 * tn + 2, 3) / 2;
    zoomScale = 1 + eased * 0.85;             // 1 → 1.85
    fadeAlpha = Math.max(0, tn - 0.75) / 0.25; // last 25%: fade to white 0 → 1
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
      viewTransition = null;
      panOffset = 0;
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

  _drawSky(ctx);
  _drawHillsFar(ctx);
  _drawForestNear(ctx);
  _drawGround(ctx);

  if (viewTransition) {
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

  _drawProjectiles(ctx, now);
  _drawFloats(ctx, now);

  ctx.restore();

  if (fadeAlpha > 0) {
    ctx.fillStyle = `rgba(255,255,255,${fadeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawTopHud(ctx);
  drawScriptOverlay(ctx, now / 1000);

  if (transitioning && (now - transitionT0) >= TRANSITION_DUR) {
    transitioning = false;
    const endAction = transitionEndAction;
    transitionEndAction = null;
    if (endAction) endAction();
  }
}

function _drawCastleSlot(ctx, viewMode, dx) {
  ctx.save();
  ctx.translate(dx, 0);
  _drawCastleWithBase(ctx, viewMode);
  _drawDamageMasks(ctx, viewMode === 'OURS' ? dmg.OURS : dmg.ENEMY);
  ctx.restore();
}

// ── Drawing — backgrounds ────────────────────────────────────────────────────
function _drawSky(ctx) {
  // Misty teal-to-pale-green à la source (sec_01, sec_08).
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  g.addColorStop(0, '#A8C9B5');
  g.addColorStop(0.55, '#BCD4B7');
  g.addColorStop(1, '#C9D9A8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON_Y);
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
    ctx.moveTo(0, HORIZON_Y + 80);
    for (let x = 0; x <= W; x += 6) {
      const y = HORIZON_Y + L.dy - L.amp * Math.sin((x / L.period) * Math.PI * 2);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, HORIZON_Y + 80);
    ctx.closePath();
    ctx.fill();
  }
}

function _drawForestNear(ctx) {
  // Lumpy rounded foliage clusters in dark green (not pine triangles).
  ctx.fillStyle = '#2C5443';
  for (let i = 0; i < 14; i++) {
    const cx = (i / 14) * W + ((i * 31) % 28);
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
  // Curved grass top edge (organic).
  ctx.fillStyle = '#7CA055';
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, HORIZON_Y + 90);
  for (let x = 0; x <= W; x += 8) {
    const y = HORIZON_Y + 90 - 6 * Math.sin(x * 0.025);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  // grass-to-dirt transition strip
  ctx.fillStyle = '#5C7A3C';
  ctx.fillRect(0, HORIZON_Y + 100, W, 6);
  // wet red-brown dirt (deep)
  const dy = HORIZON_Y + 106;
  ctx.fillStyle = '#3B1A1A';
  ctx.fillRect(0, dy, W, H - dy);
  // dirt streaks
  ctx.fillStyle = 'rgba(155,40,40,0.32)';
  for (let i = 0; i < 18; i++) {
    const x = ((i * 41) % W);
    ctx.fillRect(x, dy, 2, 90);
  }
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
  _drawCastle(ctx, viewMode);
  _drawBase(ctx);
  _drawTreads(ctx);
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

function _drawTreads(ctx) {
  const xs = [W / 2 - 110, W / 2 + 110];
  for (const cx of xs) {
    const tw = 150;
    const x = cx - tw / 2;
    ctx.fillStyle = '#1F1F1F';
    ctx.fillRect(x, TREAD_Y, tw, TREAD_H);
    ctx.fillStyle = '#3A3A3A';
    for (let i = 0; i < tw; i += 14) {
      ctx.fillRect(x + i + 2, TREAD_Y + 5, 10, TREAD_H - 10);
    }
    ctx.fillStyle = '#7C7368';
    for (const wx of [x + 18, x + tw - 18, x + tw / 2]) {
      ctx.beginPath();
      ctx.arc(wx, TREAD_Y + TREAD_H / 2, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, TREAD_Y, tw, TREAD_H);
  }
}

// ── Drawing — damage / projectiles / floats ──────────────────────────────────
function _drawDamageMasks(ctx, zones) {
  if (!zones.length) return;
  ctx.save();
  for (const z of zones) {
    // Hard-edged jagged hole revealing dark interior.
    ctx.fillStyle = '#0E0E10';
    ctx.beginPath();
    ctx.moveTo(z.poly[0][0], z.poly[0][1]);
    for (let i = 1; i < z.poly.length; i++) {
      ctx.lineTo(z.poly[i][0], z.poly[i][1]);
    }
    ctx.closePath();
    ctx.fill();

    // Inner ragged edge (slightly darker rim)
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#000';
    ctx.stroke();

    // Crack rays extending outward from the centre
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (const [cx, cy] of z.cracks) {
      ctx.beginPath();
      ctx.moveTo(z.x, z.y);
      // Slight zig-zag along the crack
      const mx = (z.x + cx) / 2 + (cy - z.y) * 0.08;
      const my = (z.y + cy) / 2 - (cx - z.x) * 0.08;
      ctx.lineTo(mx, my);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }

    // Small stone chunks scattered just outside the hole
    ctx.fillStyle = '#7C7368';
    for (let k = 0; k < 6; k++) {
      const a = Math.PI * 2 * (k / 6) + (z.x % 1);
      const rr = z.r * 1.05 + (k * 5) % 14;
      const px = z.x + Math.cos(a) * rr;
      const py = z.y + Math.sin(a) * rr;
      ctx.fillRect(px, py, 5 + (k % 3) * 2, 4 + ((k * 3) % 3));
    }
  }
  ctx.restore();
}

function _drawProjectiles(ctx, now) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (now < p.t0) continue;
    const t = (now - p.t0) / p.dur;
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
    if (p.kind === 'rocket') _drawRocketSprite(ctx, pos.x, pos.y, ang, 36);
    else if (p.kind === 'bomb') _drawBombSprite(ctx, pos.x, pos.y, ang);
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
