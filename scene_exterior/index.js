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
import { applyCameraTransform, updateCamera, setPreset, snapPreset, snapTo, setTarget } from '../shared/camera.js';
import { WORLD, CAM_PRESETS } from '../shared/world.js';
import { loadCastleAssets, castleAssetsReady, drawWorld } from './castles.js';
import { loadProjectileAssets, updateAndDraw as drawProjectile, getLeadProjectilePos, getRecentImpact, isFiring } from './projectile.js';
import { loadEnemyAssets, startEnemyAttack, updateAndDraw as drawEnemy, isAttacking, startIntroCrow, getIntroCrowPos, stopIntroCrow } from './enemy_ai.js';
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

// Screen shake state — triggered on crow impact.
let _shakeMs = 0;
const SHAKE_DURATION = 320;
const SHAKE_AMP = 7; // world-space pixels

/** Trigger a screen shake (called from enemy_ai on crow impact). */
export function triggerShake() { _shakeMs = SHAKE_DURATION; }

/** Returns 0–1: how far through the enter-castle transition we are. */
export function getZoomT() { return _zoomT; }

// INTRO is included so the exterior scene renders during the "TAP TO START"
// pause — camera stays on the red castle (set by mount's snapPreset('red'))
// until the player taps and scene_manager.start() advances to EXTERIOR_OBSERVE.
const EXTERIOR_STATES = new Set(['INTRO', 'EXTERIOR_OBSERVE', 'EXTERIOR_RESOLVE']);

// Gentle peek transition: exterior eases to a small zoom in toward the castle,
// then the interior appears. Subtle — just enough to feel like entering.
let _zoomT = 0;       // 0 = normal, 1 = fully transitioned
let _zoomActive = false;
const ZOOM_SPEED = 0.0025; // full peek in ~400ms

// Camera follow is gated by these flags so we don't override scene_exterior's
// idle preset every frame.
let _enemyShotIncoming = false;
// Track whether we've fired the opening crisis-hook wave yet. First entry to
// EXTERIOR_OBSERVE = heavy opening salvo (drop blue ~70%); subsequent entries
// = chip damage between player turns.
let _firstWaveFired = false;

export function mount(c) {
  canvas = c;
  ctx = c.getContext('2d');

  Promise.all([
    loadCastleAssets(),
    loadProjectileAssets(),
    loadEnemyAssets(),
    loadVfxAssets(),
  ]).catch(e => console.error('[scene_exterior] asset load failed:', e));

  // INTRO: hold camera on red castle; crow pan fires after the player taps.
  snapTo({ x: WORLD.red_castle.x, y: WORLD.ground_y - 280, zoom: 0.92 });

  subscribe((s) => {
    const wasVisible = visible;
    visible = EXTERIOR_STATES.has(s);
    if (visible && !wasVisible) {
      // Coming back into view — reset zoom state.
      _zoomT = 0;
      _zoomActive = false;
    }
    if (!visible && wasVisible && s === 'INTERIOR_AIM') {
      // Interior is taking over — gentle zoom into castle, then stop.
      _zoomActive = true;
    }
    if ((visible || _zoomActive) && !rafId) {
      last_t = performance.now();
      loop();
    }
    if (s === 'EXTERIOR_OBSERVE' && !isAttacking()) {
      if (!_firstWaveFired) {
        // Opening: cinematic crow pan (red → blue), then the first enemy wave.
        // Camera snaps to red so the crow emerges from there.
        _firstWaveFired = true;
        snapTo({ x: WORLD.red_castle.x, y: WORLD.ground_y - 280, zoom: 0.92 });
        startIntroCrow(() => {
          // Crow has arrived at blue — now the real battle opens.
          _enemyShotIncoming = true;
          pulseEnemyTint();
          startEnemyAttack({ intensity: 'opening', onComplete: () => {
            _enemyShotIncoming = false;
            ready_for_player_input();
          }});
        });
      } else {
        // Subsequent loops: no pan, just chip-damage wave.
        _enemyShotIncoming = true;
        pulseEnemyTint();
        startEnemyAttack({ intensity: 'normal', onComplete: () => {
          _enemyShotIncoming = false;
          ready_for_player_input();
        }});
      }
    }
    if (s === 'EXTERIOR_RESOLVE') {
      // Start on blue castle; _driveCamera takes over once projectile is in flight.
      setTarget({ x: WORLD.blue_castle.x, y: WORLD.ground_y - 280, zoom: 0.92 }, { ease: 0.012 });
    }
  });

  // Player_fire arrives BEFORE scene_manager flips to EXTERIOR_RESOLVE; preempt
  // the camera so the launch is already framed when the projectile spawns.
  on('player_fire', () => {
    _enemyShotIncoming = false;
    // Widen to show trajectory arc — overview zoom but higher pivot.
    setTarget({ x: WORLD.width / 2, y: WORLD.ground_y - 280, zoom: 0.60 }, { ease: 0.018 });
  });
}

function _driveCamera() {
  // Opening pan: cinematic crow flies red → blue after first tap.
  // Fires during EXTERIOR_OBSERVE before the enemy wave starts.
  const crow = getIntroCrowPos();
  if (crow) {
    setTarget({ x: crow.x, y: WORLD.ground_y - 280, zoom: 0.82 }, { ease: 0.035 });
    return;
  }

  // Enemy shots snap-cut, no follow. Already snapped in subscribe handler.
  if (_enemyShotIncoming) return;

  // Player projectile in flight → widen to show the arc.
  const lead = getLeadProjectilePos();
  if (lead) {
    setTarget({ x: WORLD.width / 2, y: WORLD.ground_y - 280, zoom: 0.60 }, { ease: 0.018 });
    return;
  }

  // Recent impact → tight zoom on red castle to show the damage.
  const imp = getRecentImpact(700);
  if (imp) {
    setTarget({ x: WORLD.red_castle.x, y: WORLD.ground_y - 280, zoom: 0.95 }, { ease: 0.020 });
    return;
  }

  // Idle fallback → back to blue castle (attacked side).
  setTarget({ x: WORLD.blue_castle.x, y: WORLD.ground_y - 280, zoom: 0.92 }, { ease: 0.006 });
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
  if (!visible && !_zoomActive) { rafId = 0; return; }
  rafId = requestAnimationFrame(loop);
  if (!ctx || !canvas) return;

  const now = performance.now();
  const dt_ms = Math.min(50, now - last_t);
  last_t = now;

  const viewport = { w: canvas.width, h: canvas.height };

  // Zoom-punch: accelerate into the blue castle then hand off to interior.
  if (_zoomActive) {
    _zoomT = Math.min(1, _zoomT + ZOOM_SPEED * dt_ms);
    if (_zoomT >= 1) {
      _zoomActive = false;
      rafId = 0;
      return;
    }
  }

  ctx.save();

  // Warm teal-green sky fill — matches source game palette.
  const sky = ctx.createLinearGradient(0, 0, 0, viewport.h);
  sky.addColorStop(0,    '#A8CCBA');
  sky.addColorStop(0.45, '#BACEB8');
  sky.addColorStop(0.8,  '#C8D8B8');
  sky.addColorStop(1,    '#D0E4B8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewport.w, viewport.h);

  _driveCamera();
  updateCamera(dt_ms);

  // === World-space draws ===
  // try/finally so a throw in any sub-draw (vfx/enemy/projectile) cannot
  // strand the saved camera transform on the ctx state stack — that would
  // accumulate translates/scales every frame and ruin all subsequent renders.
  applyCameraTransform(ctx, viewport);
  // Screen shake — random offset decaying over SHAKE_DURATION.
  if (_shakeMs > 0) {
    _shakeMs -= dt_ms;
    const intensity = Math.max(0, _shakeMs / SHAKE_DURATION);
    ctx.translate(
      (Math.random() * 2 - 1) * SHAKE_AMP * intensity,
      (Math.random() * 2 - 1) * SHAKE_AMP * intensity,
    );
  }
  try {
    ctx.fillStyle = '#3A0E06';
    ctx.fillRect(-4000, WORLD.ground_y, 12000, 8000);
    drawWorld(ctx);
    drawVfx(ctx, viewport, dt_ms);
    drawEnemy(ctx, viewport, dt_ms);
    drawProjectile(ctx, viewport, dt_ms);
  } catch (e) {
    console.error('[scene_exterior] world draw threw:', e);
  } finally {
    ctx.restore();
  }
  // === End world-space ===

  drawRainOverlay(ctx, viewport, dt_ms);
  _drawEnemyTint(ctx, viewport, dt_ms);
  drawTopHud(ctx);
  if (drawScriptOverlay) drawScriptOverlay(ctx, performance.now() / 1000);

  // As we zoom into the castle, darken the exterior — "entering the wall".
  if (_zoomActive && _zoomT > 0) {
    const ease = 1 - (1 - _zoomT) * (1 - _zoomT);
    ctx.fillStyle = `rgba(0,0,0,${(ease * 0.85).toFixed(3)})`;
    ctx.fillRect(0, 0, viewport.w, viewport.h);
  }

  ctx.restore();
}
