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
// Slide-in transition: interior enters from below. slideY starts at canvas.height
// and eases to 0. Matches source footage where the interior pans up from below.
let slideY = 0;
let slideActive = false;

const TILT_EASE = 0.06;
const SLIDE_EASE = 0.13; // fast enough to feel snappy, slow enough to read

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
    const wasVisible = visible;
    visible = (s === 'INTERIOR_AIM');
    if (visible && !wasVisible) {
      // Kick off slide-in from below.
      slideY = canvas ? canvas.height : 960;
      slideActive = true;
    }
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

  // Ease slide-in to zero.
  if (slideActive) {
    slideY += (0 - slideY) * SLIDE_EASE;
    if (Math.abs(slideY) < 1) { slideY = 0; slideActive = false; }
  }

  // Interior: much darker than exterior sky — only a sliver of daylight shows
  // through the castle's broken top cutout. Background gets near-black to
  // make units and platforms read clearly against a dim stone environment.
  ctx.save();
  ctx.translate(0, slideY);

  ctx.fillStyle = '#0A1210';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Subtle sky tint only at very top (where cutout peeks through).
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.25);
  bgGrad.addColorStop(0, '#6A9880');
  bgGrad.addColorStop(1, 'rgba(10,18,16,0)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.25);
  // Dark ground
  ctx.fillStyle = '#3A1408';
  ctx.fillRect(0, canvas.height * 0.72, canvas.width, canvas.height * 0.28);

  drawCastleSection(ctx, { tilt_deg: currentTilt, damage_level: damageLevel });
  drawUnits(ctx, t);
  drawRipStones(ctx);
  const activeFloor = getActiveFloor();
  drawAimOverlay(ctx);
  drawTopHud(ctx);
  drawScriptOverlay(ctx, t);

  ctx.restore();
}
