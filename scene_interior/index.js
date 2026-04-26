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
import { drawSky } from '../scene_exterior/index.js';
import { drawAimReadyPulse, drawDustMotes } from '../playable/idle_pulses.js';
import { getFloorAnchor } from './castle_section.js';
import { isAiming } from './aim.js';

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

// Compact horizon band painted between the top HUD (y≈76) and the castle top
// (y≈170). Three layers of organic hills + a forest-lump strip, palette
// matching scene_exterior's _drawHillsFar / _drawForestNear so the interior
// reads as "looking out from the same valley" instead of a flat sky.
/** @param {CanvasRenderingContext2D} ctx @param {number} W */
function _drawInteriorHorizonBand(ctx, W) {
  const HORIZON = 158;
  const layers = [
    { color: '#7FA38E', amp: 8,  period: 220, dy: -38 },
    { color: '#5C8775', amp: 12, period: 160, dy: -22 },
    { color: '#3F6555', amp: 9,  period: 110, dy: -8  },
  ];
  for (const L of layers) {
    ctx.fillStyle = L.color;
    ctx.beginPath();
    ctx.moveTo(0, HORIZON);
    for (let x = 0; x <= W; x += 4) {
      const y = HORIZON + L.dy - L.amp * Math.sin((x / L.period) * Math.PI * 2);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, HORIZON);
    ctx.closePath();
    ctx.fill();
  }
  // Forest lump strip just above the castle line.
  ctx.fillStyle = '#2C5443';
  const N = 18;
  for (let i = 0; i < N; i++) {
    const cx = (i / N) * W + ((i * 31) % 24);
    const cy = HORIZON - 4 + ((i * 17) % 6);
    const r = 9 + ((i * 7) % 5);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.7, cy + 2, r * 0.7, 0, Math.PI * 2); ctx.fill();
  }
}

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
    if (visible && !wasVisible) {
      entranceT0 = performance.now();
      // Snap upright on entry: the cut-in cinematic should land on a
      // straight castle, not mid-tangue. Tilt resumes easing toward its
      // hp-based target after the entrance window.
      currentTilt = 0;
    }
    if (visible && !rafId) loop();
  });
}

function loop() {
  if (!visible) { rafId = 0; return; }
  rafId = requestAnimationFrame(loop);
  if (!ctx || !canvas) return;

  const t = performance.now() / 1000;

  // Interior cross-section stays upright at all times — the lean is a
  // gameplay cue reserved for the exterior view. Damage still reads via
  // damage_level (cracked bricks, missing top ledge, etc.).
  currentTilt = 0;
  const damageLevel = damageLevelFor(state.hp_self_pct);

  // Atmospheric bg coherent with exterior. The castle covers y≈170..820,
  // so the parallax skyline only has ~90px of vertical real estate visible
  // (between HUD bottom y≈70 and castle top y≈170). drawSky fills the full
  // gradient; on top of that we paint a compact horizon band — distant
  // hills (sine), midground hills (taller sine), forest lumps — using the
  // same palette as the exterior so the eye reads "same valley".
  drawSky(ctx);
  _drawInteriorHorizonBand(ctx, canvas.width);
  ctx.fillStyle = 'rgba(15,20,30,0.16)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Entrance zoom-in: scale 1.20 → 1.0 around castle center over ENTRANCE_DUR.
  // Lighter punch-in (was 1.45) so the bg layers stay visible around the
  // castle and the transition reads as "same valley, closer view".
  const eAge = (performance.now() - entranceT0) / ENTRANCE_DUR;
  const eOn = entranceT0 > 0 && eAge < 1;
  let eDimAlpha = 0;
  if (eOn) {
    const k = 1 - Math.min(1, Math.max(0, eAge));
    const easeOut = 1 - Math.pow(k, 3);
    const scale = 1 + (1 - easeOut) * 0.20;     // 1.20 → 1.0
    const cx = canvas.width / 2, cy = canvas.height * 0.62;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    eDimAlpha = (1 - easeOut) * 0.45;            // 0.45 → 0
  }

  drawCastleSection(ctx, { tilt_deg: currentTilt, damage_level: damageLevel });
  // Dust motes drift inside the castle (behind units so they don't obscure
  // weapon detail). Always-on ambient that keeps the interior alive during
  // the long aim-idle windows.
  drawDustMotes(ctx, t, canvas.width, canvas.height);
  drawUnits(ctx, t);
  drawRipStones(ctx);
  const activeFloor = getActiveFloor();
  if (activeFloor !== null) drawArrow(ctx, t, activeFloor);
  // Aim-ready pulse on active unit — only when player isn't dragging and we're
  // past the entrance zoom-in. Hidden during tutorial (script overlay handles
  // hand cursor instead) by deferring to a low alpha during the initial 5s.
  if (activeFloor !== null && !isAiming()) {
    const a = getFloorAnchor(activeFloor);
    if (a) {
      // Fade pulse in after entrance zoom (≥700ms) and skip while tutorial hand
      // cursor is showing — the script's tutorial cycle is 0..0.92 of 2200ms.
      const sinceMount = performance.now() - entranceT0;
      const pulseAlpha = sinceMount < ENTRANCE_DUR ? 0
        : Math.min(1, (sinceMount - ENTRANCE_DUR) / 1200);
      drawAimReadyPulse(ctx, a, t, pulseAlpha);
    }
  }
  drawAimOverlay(ctx);
  drawHudCards(ctx, getActiveUnitId());

  if (eOn) {
    ctx.restore();
    if (eDimAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${eDimAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // Iris-in (matches exterior iris-out): start fully closed, open over the
    // first ~45% of the entrance window so the cut from exterior is masked.
    const irisK = Math.min(1, eAge / 0.45);
    if (irisK < 1) {
      const cx = canvas.width / 2, cy = canvas.height * 0.62;
      const maxR = Math.hypot(Math.max(cx, canvas.width - cx),
                              Math.max(cy, canvas.height - cy));
      const r = maxR * irisK;
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.moveTo(cx + r, cy);
      ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
      ctx.restore();
    }
  }

  drawTopHud(ctx);
  drawScriptOverlay(ctx, t);
}
