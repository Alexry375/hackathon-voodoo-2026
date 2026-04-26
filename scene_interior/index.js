// Scene: INTERIOR — screen-space HUD + aim overlay, drawn over the exterior world.
// Uses its own RAF loop (registered after exterior's) so it draws on top each frame.
// Does NOT clear the canvas — exterior already painted the world.

import { subscribe } from '../shared/scene_manager.js';
import { getCurrentSide } from '../shared/state.js';
import { emit } from '../shared/events.js';
import { installAim, drawAimOverlay } from './aim.js';
import { drawHudCards } from './hud_cards.js';
import { getActiveUnitId } from './turn.js';
import { computeAiShot } from '../scene_exterior/enemy_ai.js';
import { pulseEnemyTint } from '../scene_exterior/index.js';

/** @type {CanvasRenderingContext2D | null} */
let ctx = null;
let visible = false;
let rafId = 0;
let _aiTimer = null;

/** @param {HTMLCanvasElement} c */
export function mount(c) {
  ctx = c.getContext('2d');
  installAim(c);
  subscribe((s) => {
    if (s !== 'INTERIOR_AIM') {
      if (_aiTimer !== null) { clearTimeout(_aiTimer); _aiTimer = null; }
    }
    visible = (s === 'INTERIOR_AIM') && getCurrentSide() === 'blue';
    if (visible && !rafId) loop();
    if (s === 'INTERIOR_AIM' && getCurrentSide() === 'red') {
      const shot = computeAiShot(20);
      _aiTimer = setTimeout(() => {
        _aiTimer = null;
        pulseEnemyTint();
        emit('player_fire', shot);
      }, 600);
    }
  });
}

function loop() {
  if (!visible) { rafId = 0; return; }
  rafId = requestAnimationFrame(loop);
  if (!ctx) return;
  // Draw aim overlay + HUD cards in screen space.
  // No canvas clear — exterior already painted the world this frame.
  // Arrow and units are drawn in world space by castles.js (proper z-order).
  drawAimOverlay(ctx);
  drawHudCards(ctx, getActiveUnitId());
}
