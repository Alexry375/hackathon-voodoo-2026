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
      // Snap-cut to player castle for the enemy intro attack (spec §6: enemy shots snap-cut).
      _enemyShotIncoming = true;
      snapPreset('blue');
      startEnemyAttack({ onComplete: () => {
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

// Pulsing red crosshair on the enemy castle during the tutorial phase, only
// while no player shot is mid-flight (so it doesn't fight the camera follow).
function _drawTutorialReticle(ctx, t_ms) {
  const phase = /** @type {any} */ (window).__game?.phase;
  if (phase !== 'tutorial' && phase !== 'intro') return;
  if (getLeadProjectilePos()) return;

  const cx = WORLD.red_castle.x;
  const cy = WORLD.ground_y - WORLD.castle_h * 0.55;
  const pulse = 0.55 + 0.45 * Math.sin(t_ms / 1000 * Math.PI * 1.6);
  const r = 70 + pulse * 14;
  ctx.save();
  ctx.globalAlpha = 0.55 + pulse * 0.35;
  ctx.strokeStyle = '#FF3030';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Crosshair ticks (4 cardinal)
  ctx.lineWidth = 4;
  for (const a of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
    const x0 = cx + Math.cos(a) * (r - 14);
    const y0 = cy + Math.sin(a) * (r - 14);
    const x1 = cx + Math.cos(a) * (r + 22);
    const y1 = cy + Math.sin(a) * (r + 22);
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    ctx.stroke();
  }
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
    _drawTutorialReticle(ctx, now);
  } catch (e) {
    console.error('[scene_exterior] world draw threw:', e);
  } finally {
    ctx.restore();
  }
  // === End world-space ===

  // Screen-space overlays — rain stays here so it tiles the viewport, not the world.
  drawRainOverlay(ctx, viewport, dt_ms);
  drawTopHud(ctx);
  if (drawScriptOverlay) drawScriptOverlay(ctx, performance.now() / 1000);
}
