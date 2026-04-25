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
import { loadVfxAssets, updateAndDraw as drawVfx } from './vfx.js';

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

  // Player projectile in flight → follow it horizontally with a wider zoom
  // so both castles stay roughly visible during the arc.
  const lead = getLeadProjectilePos();
  if (lead) {
    setTarget({
      x: Math.max(CAM_PRESETS.blue.x, Math.min(CAM_PRESETS.red.x, lead.x)),
      y: lead.y - 100,
      zoom: 0.55,
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

function loop() {
  if (!visible) { rafId = 0; return; }
  rafId = requestAnimationFrame(loop);
  if (!ctx || !canvas) return;

  const now = performance.now();
  const dt_ms = Math.min(50, now - last_t);
  last_t = now;

  const viewport = { w: canvas.width, h: canvas.height };

  // Sky background fill (extends beyond world if camera pans wider than bg).
  ctx.fillStyle = '#7fb069';
  ctx.fillRect(0, 0, viewport.w, viewport.h);

  _driveCamera();
  updateCamera(dt_ms);

  // === World-space draws ===
  applyCameraTransform(ctx, viewport);
  if (castleAssetsReady()) drawWorld(ctx);
  drawVfx(ctx, viewport, dt_ms, { hp_self_pct: state.hp_self_pct, hp_enemy_pct: state.hp_enemy_pct });
  drawEnemy(ctx, viewport, dt_ms);
  drawProjectile(ctx, viewport, dt_ms);
  ctx.restore();
  // === End world-space ===

  // Screen-space overlays.
  drawTopHud(ctx);
  if (drawScriptOverlay) drawScriptOverlay(ctx, performance.now() / 1000);
}
