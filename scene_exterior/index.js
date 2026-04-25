// Scene: EXTERIOR (combat view).
// Owner: Sami.
// Visible when scene_manager state is 'EXTERIOR_OBSERVE' or 'EXTERIOR_RESOLVE'.
// Composes sub-modules: castles, projectile physics, enemy AI, VFX, top HUD.

import { subscribe, getState, ready_for_player_input } from '../shared/scene_manager.js';
import { emit, on } from '../shared/events.js';
import { state } from '../shared/state.js';
import { loadCastleAssets, castleAssetsReady, drawCastles } from './castles.js';

/** @type {HTMLCanvasElement | null} */
let canvas = null;
/** @type {CanvasRenderingContext2D | null} */
let ctx = null;
let visible = false;
let rafId = 0;

const EXTERIOR_STATES = new Set(['EXTERIOR_OBSERVE', 'EXTERIOR_RESOLVE']);

/**
 * @param {HTMLCanvasElement} c
 */
export function mount(c) {
  canvas = c;
  ctx = c.getContext('2d');

  loadCastleAssets().catch(e => console.error('[scene_exterior] asset load failed:', e));

  subscribe((s) => {
    visible = EXTERIOR_STATES.has(s);
    if (visible && !rafId) loop();
  });

  // Interior signals it just fired — exterior owns the resolve animation.
  on('player_fire', (payload) => {
    // TODO projectile.js: animate the shot from interior aim point to enemy castle,
    //                     compute damage, then emit 'cut_to_interior'.
    // Stub: instantly resolve so the loop keeps moving while we build out.
    setTimeout(() => {
      emit('cut_to_interior', {
        hp_self_after: state.hp_self_pct,
        hp_enemy_after: Math.max(0, state.hp_enemy_pct - 15),
        units_destroyed_ids: [],
      });
    }, 600);
  });
}

function loop() {
  if (!visible) { rafId = 0; return; }
  rafId = requestAnimationFrame(loop);
  if (!ctx || !canvas) return;

  ctx.fillStyle = '#7fb069';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (castleAssetsReady()) {
    // OBSERVE shows the player castle taking enemy fire; RESOLVE shows the enemy castle taking the player's shot.
    const which = getState() === 'EXTERIOR_RESOLVE' ? 'red' : 'blue';
    const hp_pct = which === 'blue' ? state.hp_self_pct : state.hp_enemy_pct;
    drawCastles(ctx, { which, hp_pct, viewport: { w: canvas.width, h: canvas.height } });
  }

  // TODO sub-modules will render here:
  //   - projectile.js    ballistic physics + impact
  //   - enemy_ai.js      auto-attack during EXTERIOR_OBSERVE → emit 'unit_killed' on hit
  //   - vfx.js           explosion / smoke / rain particles
  //   - hud.js           top HP% bars

  // Dev overlay (remove once HUD lands).
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, canvas.width, 28);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${getState()}  blue ${state.hp_self_pct}%  red ${state.hp_enemy_pct}%  turn ${state.turn_index}`, 8, 18);
}

// TODO enemy_ai.js will own the EXTERIOR_OBSERVE intro cinematic. When the intro
// is done it should call ready_for_player_input() to cut to INTERIOR_AIM.
// Stub for now: as soon as we enter EXTERIOR_OBSERVE, hand off after a short beat.
subscribe((s) => {
  if (s === 'EXTERIOR_OBSERVE') {
    setTimeout(() => {
      if (getState() === 'EXTERIOR_OBSERVE') ready_for_player_input();
    }, 1200);
  }
});
