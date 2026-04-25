// STUB — owner: Sami (real implementation lives on branch sami-v2).
// This stub exists on the alexis branch so the bundle pipeline compiles
// without merging Sami's WIP. It resolves player_fire after 600ms by
// emitting cut_to_interior with -15 enemy HP, mirroring his current stub.
// Will be replaced by Sami's real scene_exterior on merge.

import { on, emit } from '../shared/events.js';
import { state } from '../shared/state.js';
import { subscribe } from '../shared/scene_manager.js';
import { drawTopHud } from '../shared/hud_top.js';
import { drawScriptOverlay } from '../playable/script.js';

/** @param {HTMLCanvasElement} canvas */
export function mount(canvas) {
  const ctx = canvas.getContext('2d');
  let visible = false;
  let rafId = 0;
  const EXTERIOR_STATES = new Set(['EXTERIOR_OBSERVE', 'EXTERIOR_RESOLVE']);

  subscribe((s) => {
    visible = EXTERIOR_STATES.has(s);
    if (visible && !rafId) loop();
  });

  on('player_fire', () => {
    setTimeout(() => {
      emit('cut_to_interior', {
        hp_self_after: state.hp_self_pct,
        hp_enemy_after: Math.max(0, state.hp_enemy_pct - 15),
        units_destroyed_ids: [],
      });
    }, 600);
  });

  function loop() {
    if (!visible) { rafId = 0; return; }
    rafId = requestAnimationFrame(loop);
    if (!ctx) return;
    ctx.fillStyle = '#9CC98B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('scene_exterior (stub — Sami)', canvas.width / 2, canvas.height / 2);
    drawTopHud(ctx);
    drawScriptOverlay(ctx, performance.now() / 1000);
  }
}
