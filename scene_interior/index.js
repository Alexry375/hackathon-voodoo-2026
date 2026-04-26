// Scene: INTERIOR (cross-section aim phase). Owner: Alexis.
// Visible only when scene_manager state is 'INTERIOR_AIM'.
// Composes: castle_section, units, arrow, aim, hud_cards.
// Reactive bits driven by shared/state.js: damage_level + tilt are derived from hp_self_pct
// and eased over time so the castle visibly leans / loses bricks as it takes damage.

import { subscribe } from '../shared/scene_manager.js';
import { state } from '../shared/state.js';
import { drawCastleSection } from './castle_section.js';
import { drawUnits } from './units.js';
import { drawArrow } from './arrow.js';
import { installAim, drawAimOverlay } from './aim.js';
import { drawHudCards } from './hud_cards.js';
import { drawRipStones } from './rip.js';
import { getActiveFloor, getActiveUnitId } from './turn.js';
import { drawTopHud } from '../shared/hud_top.js';
import { drawScriptOverlay } from '../playable/script.js';

/** @type {HTMLCanvasElement | null} */
let canvas = null;
/** @type {CanvasRenderingContext2D | null} */
let ctx = null;
let visible = false;
let rafId = 0;
let currentTilt = 0;

const TILT_EASE = 0.06;

/** @param {number} hp_pct */
function targetTiltFor(hp_pct) {
  // Castle leans further right as it takes damage. Calibrated against frames 13/29/40.
  if (hp_pct >= 95) return 0;
  if (hp_pct >= 65) return 6;
  if (hp_pct >= 45) return 12;
  if (hp_pct >= 25) return 20;
  return 26;
}

/** @param {number} hp_pct */
function damageLevelFor(hp_pct) {
  if (hp_pct >= 70) return 0;
  if (hp_pct >= 50) return 1;
  if (hp_pct >= 30) return 2;
  return 3;
}

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

  const targetTilt = targetTiltFor(state.hp_self_pct);
  currentTilt += (targetTilt - currentTilt) * TILT_EASE;
  const damageLevel = damageLevelFor(state.hp_self_pct);

  // Same sage-green sky as exterior
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
  bgGrad.addColorStop(0, '#8BBFA0');
  bgGrad.addColorStop(1, '#AACBA8');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Dark ground
  ctx.fillStyle = '#7A2A1A';
  ctx.fillRect(0, canvas.height * 0.72, canvas.width, canvas.height * 0.28);

  drawCastleSection(ctx, { tilt_deg: currentTilt, damage_level: damageLevel });
  drawUnits(ctx, t);
  drawRipStones(ctx);
  const activeFloor = getActiveFloor();
  if (activeFloor !== null) drawArrow(ctx, t, activeFloor);
  drawAimOverlay(ctx);
  drawHudCards(ctx, getActiveUnitId());
  drawTopHud(ctx);
  drawScriptOverlay(ctx, t);
}
