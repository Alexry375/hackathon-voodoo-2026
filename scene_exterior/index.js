// Scene: EXTERIOR (combat view).
// Owner: Sami.
// Visible when scene_manager state is 'EXTERIOR_OBSERVE' or 'EXTERIOR_RESOLVE'.
// Composes sub-modules: castles, enemy AI, projectile, VFX, top HUD, script overlay.

import { subscribe, getState, ready_for_player_input } from '../shared/scene_manager.js';
import { state } from '../shared/state.js';
import { drawTopHud } from '../shared/hud_top.js';
import { loadCastleAssets, castleAssetsReady, drawCastles } from './castles.js';
import { loadProjectileAssets, updateAndDraw as drawProjectile } from './projectile.js';
import { loadEnemyAssets, startEnemyAttack, updateAndDraw as drawEnemy, isAttacking } from './enemy_ai.js';
import { loadVfxAssets, updateAndDraw as drawVfx } from './vfx.js';

// Script overlay is optional — only present when the prod scripted ad is wired up.
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

/**
 * @param {HTMLCanvasElement} c
 */
export function mount(c) {
  canvas = c;
  ctx = c.getContext('2d');

  Promise.all([
    loadCastleAssets(),
    loadProjectileAssets(),
    loadEnemyAssets(),
    loadVfxAssets(),
  ]).catch(e => console.error('[scene_exterior] asset load failed:', e));

  subscribe((s) => {
    visible = EXTERIOR_STATES.has(s);
    if (visible && !rafId) {
      last_t = performance.now();
      loop();
    }
    // Every entry into EXTERIOR_OBSERVE kicks off an enemy wave. enemy_ai's
    // internal guard no-ops if a wave is already in flight, so dev-button
    // re-clicks during a wave are safe.
    if (s === 'EXTERIOR_OBSERVE' && !isAttacking()) {
      startEnemyAttack({ onComplete: ready_for_player_input });
    }
  });
}

function loop() {
  if (!visible) { rafId = 0; return; }
  rafId = requestAnimationFrame(loop);
  if (!ctx || !canvas) return;

  const now = performance.now();
  const dt_ms = Math.min(50, now - last_t); // clamp big dt (tab refocus)
  last_t = now;

  const viewport = { w: canvas.width, h: canvas.height };

  ctx.fillStyle = '#7fb069';
  ctx.fillRect(0, 0, viewport.w, viewport.h);

  if (castleAssetsReady()) {
    // OBSERVE shows the player castle taking enemy fire; RESOLVE shows the enemy castle taking the player's shot.
    const which = getState() === 'EXTERIOR_RESOLVE' ? 'red' : 'blue';
    const hp_pct = which === 'blue' ? state.hp_self_pct : state.hp_enemy_pct;
    drawCastles(ctx, { which, hp_pct, viewport });
  }

  drawVfx(ctx, viewport, dt_ms, { hp_self_pct: state.hp_self_pct, hp_enemy_pct: state.hp_enemy_pct });
  drawEnemy(ctx, viewport, dt_ms);
  drawProjectile(ctx, viewport, dt_ms);

  // Shared overlays — Alexis's hud_top on top of game, script overlay on top of HUD.
  drawTopHud(ctx);
  if (drawScriptOverlay) drawScriptOverlay(ctx, performance.now() / 1000);
}
