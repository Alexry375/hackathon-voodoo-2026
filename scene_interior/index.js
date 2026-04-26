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

// Entrance zoom-in: matches the punch-in zoom-out from exterior (lands at 2.4x,
// we start interior at 1.45x and de-zoom to 1.0 with a residual darkening that
// fades out — reads as "we just dropped into the castle's interior".
let entranceT0 = 0;
const ENTRANCE_DUR = 700;

const TILT_EASE = 0.06;

/** @param {number} hp_pct */
function targetTiltFor(hp_pct) {
  // Castle leans further right as it takes damage. Calibrated against frames 13/29/40.
  if (hp_pct >= 95) return 0;
  if (hp_pct >= 65) return 4;
  if (hp_pct >= 35) return 9;
  if (hp_pct >= 18) return 14;
  return 18;
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
    if (visible && !wasVisible) entranceT0 = performance.now();
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

  ctx.fillStyle = '#88CCAA';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Entrance zoom-in: scale 1.45 → 1.0 around castle center over ENTRANCE_DUR.
  // Cubic ease-out so the de-zoom snaps in early then settles.
  const eAge = (performance.now() - entranceT0) / ENTRANCE_DUR;
  const eOn = entranceT0 > 0 && eAge < 1;
  let eDimAlpha = 0;
  if (eOn) {
    const k = 1 - Math.min(1, Math.max(0, eAge));
    const easeOut = 1 - Math.pow(k, 3);
    const scale = 1 + (1 - easeOut) * 0.45;     // 1.45 → 1.0
    const cx = canvas.width / 2, cy = canvas.height * 0.62;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    eDimAlpha = (1 - easeOut) * 0.45;            // 0.45 → 0
  }

  drawCastleSection(ctx, { tilt_deg: currentTilt, damage_level: damageLevel });
  drawUnits(ctx, t);
  drawRipStones(ctx);
  const activeFloor = getActiveFloor();
  if (activeFloor !== null) drawArrow(ctx, t, activeFloor);
  drawAimOverlay(ctx);
  drawHudCards(ctx, getActiveUnitId());

  if (eOn) {
    ctx.restore();
    if (eDimAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${eDimAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  drawTopHud(ctx);
  drawScriptOverlay(ctx, t);
}
