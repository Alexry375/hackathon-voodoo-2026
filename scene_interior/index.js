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
let _getZoomT = null;
import('../scene_exterior/index.js').then(m => { _getZoomT = m.getZoomT; }).catch(() => {});

/** @type {HTMLCanvasElement | null} */
let canvas = null;
/** @type {CanvasRenderingContext2D | null} */
let ctx = null;
let visible = false;
let rafId = 0;
let currentTilt = 0;
// Punch-in: interior appears already zoomed in (continuing the exterior zoom-punch),
// then eases back to scale 1. Pivot is the canvas center — "settling into the room".
let _punchScale = 1;
let _punchActive = false;

const TILT_EASE = 0.06;
const PUNCH_EASE = 0.18;

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
      // Start slightly zoomed in (matching where exterior left off), ease to 1.
      _punchScale = 1.22;
      _punchActive = true;
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

  // Ease punch-scale back to 1.
  if (_punchActive) {
    _punchScale += (1 - _punchScale) * PUNCH_EASE;
    if (Math.abs(_punchScale - 1) < 0.01) { _punchScale = 1; _punchActive = false; }
  }

  // Interior: much darker than exterior sky — only a sliver of daylight shows
  // through the castle's broken top cutout. Background gets near-black to
  // make units and platforms read clearly against a dim stone environment.
  ctx.save();

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

  // Fade in from black as the exterior's enter-castle overlay clears.
  if (_getZoomT) {
    const zoomT = _getZoomT();
    if (zoomT > 0) {
      const fadeAlpha = 1 - zoomT; // 1 = solid black, 0 = fully revealed
      ctx.fillStyle = `rgba(0,0,0,${fadeAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  ctx.restore();
}
