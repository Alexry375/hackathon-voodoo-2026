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
import { loadEnemyAssets, startEnemyAttack, updateAndDraw as drawEnemy, isAttacking } from './enemy_ai.js';
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

// INTRO is included so the exterior scene renders during the "TAP TO START"
// pause — camera stays on the red castle (set by mount's snapPreset('red'))
// until the player taps and scene_manager.start() advances to EXTERIOR_OBSERVE.
const EXTERIOR_STATES = new Set(['INTRO', 'EXTERIOR_OBSERVE', 'EXTERIOR_RESOLVE']);

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

  // Default camera = focus on enemy castle (this is the "ad-style" exterior view).
  snapPreset('red');

  subscribe((s) => {
    visible = EXTERIOR_STATES.has(s);
    if (visible && !rafId) {
      last_t = performance.now();
      loop();
    }
    if (s === 'EXTERIOR_OBSERVE' && !isAttacking()) {
      // Smooth ease from red preset → blue preset (~500ms). Source video has
      // no transition (single wide framing both castles), but our two-preset
      // architecture needs SOMETHING — easing reads better than a hard cut.
      _enemyShotIncoming = true;
      setPreset('blue', { ease: 0.02 });
      pulseEnemyTint();
      const intensity = _firstWaveFired ? 'normal' : 'opening';
      _firstWaveFired = true;
      startEnemyAttack({ intensity, onComplete: () => {
        _enemyShotIncoming = false;
        ready_for_player_input();
      }});
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

  // Player projectile in flight → follow it horizontally. Zoom kept tight
  // (0.78) so the bg image always covers and we don't reveal void edges.
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
    drawEnemy(ctx, viewport, dt_ms);
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
