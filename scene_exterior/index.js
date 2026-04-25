// Scene: EXTERIOR (combat view).
// Owner: Sami.
// Visible when scene_manager state is 'EXTERIOR_OBSERVE' or 'EXTERIOR_RESOLVE'.
// Composes sub-modules: castles, projectile physics, enemy AI, VFX, top HUD.

import { subscribe, getState, ready_for_player_input } from '../shared/scene_manager.js';
import { emit, on } from '../shared/events.js';
import { state } from '../shared/state.js';

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

  ctx.fillStyle = '#0d1b2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#90e0ef';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXTERIOR — placeholder', canvas.width / 2, 80);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#ccc';
  ctx.fillText(`state ${getState()}   hp_self ${state.hp_self_pct}%   hp_enemy ${state.hp_enemy_pct}%   turn ${state.turn_index}`,
               canvas.width / 2, 110);

  // TODO sub-modules will render here:
  //   - castles.js       blue + red sprites + destruction-state swap
  //   - projectile.js    ballistic physics + impact
  //   - enemy_ai.js      auto-attack during EXTERIOR_OBSERVE → emit 'unit_killed' on hit
  //   - vfx.js           explosion / smoke / rain particles
  //   - hud.js           top HP% bars
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
