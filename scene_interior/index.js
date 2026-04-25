// Scene: INTERIOR (cross-section aim phase).
// Owner: Alexis.
// Visible only when scene_manager state is 'INTERIOR_AIM'.
// Composes sub-modules: castle cross-section sprite, units, drag-aim input, HUD cards, RIP gravestones.

import { subscribe } from '../shared/scene_manager.js';
import { state } from '../shared/state.js';

/** @type {HTMLCanvasElement | null} */
let canvas = null;
/** @type {CanvasRenderingContext2D | null} */
let ctx = null;
let visible = false;
let rafId = 0;

/**
 * @param {HTMLCanvasElement} c
 */
export function mount(c) {
  canvas = c;
  ctx = c.getContext('2d');
  subscribe((s) => {
    visible = (s === 'INTERIOR_AIM');
    if (visible && !rafId) loop();
  });
}

function loop() {
  if (!visible) { rafId = 0; return; }
  rafId = requestAnimationFrame(loop);
  if (!ctx || !canvas) return;
  // Clear with a debug-friendly color so we can verify the scene is mounted before sub-agents land.
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('INTERIOR — placeholder', canvas.width / 2, 80);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#ccc';
  ctx.fillText(`hp_self ${state.hp_self_pct}%   hp_enemy ${state.hp_enemy_pct}%   turn ${state.turn_index}`, canvas.width / 2, 110);
  // TODO sub-agents will render here:
  //   - castle cross-section + tilted platforms (anchor: B01 [00:03], [00:28], [00:40])
  //   - 3 units with idle anim
  //   - drag-aim input + dotted ballistic curve
  //   - bottom HUD (3 cards)
  //   - RIP gravestones for dead units
}
