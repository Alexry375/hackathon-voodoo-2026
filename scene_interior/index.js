// Scene: INTERIOR (cross-section aim phase). Owner: Alexis.
// Visible only when scene_manager state is 'INTERIOR_AIM'.
// Composes: castle_section, units, arrow, aim, hud_cards.

import { subscribe } from '../shared/scene_manager.js';
import { drawCastleSection } from './castle_section.js';
import { drawUnits } from './units.js';
import { drawArrow } from './arrow.js';
import { installAim, drawAimOverlay } from './aim.js';
import { drawHudCards } from './hud_cards.js';

/** @type {HTMLCanvasElement | null} */
let canvas = null;
/** @type {CanvasRenderingContext2D | null} */
let ctx = null;
let visible = false;
let rafId = 0;

// Per-turn active floor — placeholder until turn-based selection lands.
// `aim.js` currently hardcodes floor=1 (cyclop) too; keep these in sync.
const ACTIVE_FLOOR = 1;

/** @param {HTMLCanvasElement} c */
export function mount(c) {
  canvas = c;
  ctx = c.getContext('2d');
  installAim(c);
  subscribe((s) => {
    visible = (s === 'INTERIOR_AIM');
    if (visible && !rafId) loop();
  });
}

function loop() {
  if (!visible) { rafId = 0; return; }
  rafId = requestAnimationFrame(loop);
  if (!ctx || !canvas) return;

  const t = performance.now() / 1000;

  ctx.fillStyle = '#88CCAA';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawCastleSection(ctx, { tilt_deg: 0, damage_level: 0 });
  drawUnits(ctx, t);
  drawArrow(ctx, t, ACTIVE_FLOOR);
  drawAimOverlay(ctx);
  drawHudCards(ctx);
}
