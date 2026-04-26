// Scripted ad — calque la timeline source ~30s.
//
// Phases:
//   intro     — exterior: enemy bomb falls on our castle (-33% HP). No overlay.
//   tutorial  — interior: hand cursor + drag demo on active unit
//   freeplay  — player drags freely; enemy ripostes scripted in scene_exterior
//   forcewin  — caméra reste sur enemy castle, gros impact final, flash
//   endcard   — logo + PLAY

import { on } from '../shared/events.js';
import { state } from '../shared/state.js';
import { getState as getSceneState } from '../shared/scene_manager.js';
import { getFloorAnchor } from '../scene_interior/castle_section.js';
import { getActiveFloor } from '../scene_interior/turn.js';
import { showHandOn, showHandDrag, hideHand, drawHandCursor } from './hand_cursor.js';
import { drawEndcard, setEndcardOpacity, installEndcardTap } from './endcard.js';

// Phase timings (ms since boot)
const PHASE_INTRO_END     = 4500;   // bomb impact ~3s + buffer + zoom 900ms + guard
const PHASE_TUTORIAL_MAX  = 22000;
const PHASE_FREEPLAY_END  = 38000;
const PHASE_FORCEWIN_END  = 42500;
const ENDCARD_FADE_MS     = 400;

const game = {
  phase: /** @type {'intro'|'tutorial'|'freeplay'|'forcewin'|'endcard'} */ ('intro'),
  t0: 0,
  shotsFired: 0,
};
/** @type {any} */ (window).__game = game;

/** @param {HTMLCanvasElement} canvas */
export function runScript(canvas) {
  game.t0 = performance.now();
  installEndcardTap(canvas);

  on('player_fire', () => { game.shotsFired += 1; });

  // Lock player HP at >= 30 during freeplay so the ad never enters lose state.
  on('cut_to_interior', (payload) => {
    if (game.phase === 'freeplay' && state.hp_self_pct < 30) {
      state.hp_self_pct = 30;
    }
  });
}

/**
 * Called by both scenes at the end of their render order. Updates the phase
 * clock and paints overlay layers (hand cursor / forcewin flash / endcard).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t  performance.now()/1000
 */
export function drawScriptOverlay(ctx, t) {
  if (!game.t0) return; // runScript not called → dev mode, no-op
  const elapsed = performance.now() - game.t0;
  _updatePhase(elapsed);
  _paintOverlay(ctx, t, elapsed);
}

function _updatePhase(elapsed) {
  switch (game.phase) {
    case 'intro':
      if (elapsed > PHASE_INTRO_END) game.phase = 'tutorial';
      break;
    case 'tutorial':
      if (game.shotsFired >= 2 || elapsed > PHASE_TUTORIAL_MAX) {
        game.phase = 'freeplay';
        hideHand();
      }
      break;
    case 'freeplay':
      if (elapsed > PHASE_FREEPLAY_END || state.hp_enemy_pct <= 5) {
        game.phase = 'forcewin';
        state.hp_enemy_pct = 0;
      }
      break;
    case 'forcewin':
      if (elapsed > PHASE_FORCEWIN_END) {
        game.phase = 'endcard';
        try { /** @type {any} */ (window).Voodoo?.playable?.win(); } catch {}
      }
      break;
    case 'endcard': {
      const fade = Math.max(0, elapsed - PHASE_FORCEWIN_END) / ENDCARD_FADE_MS;
      setEndcardOpacity(Math.min(1, fade));
      break;
    }
  }
}

function _paintOverlay(ctx, t, elapsed) {
  const W = ctx.canvas.width, H = ctx.canvas.height;

  if (game.phase === 'tutorial' && getSceneState() === 'INTERIOR_AIM') {
    const f = getActiveFloor();
    if (f !== null) {
      const a = getFloorAnchor(f);
      const handX = a.x, handY = a.y - 40;
      const cycleMs = 2200;
      const c = (elapsed % cycleMs) / cycleMs;
      if (c < 0.18) {
        showHandOn({ x: handX, y: handY });
      } else if (c < 0.92) {
        const p = (c - 0.18) / 0.74;
        showHandDrag({ x: handX, y: handY }, { x: handX - 160, y: handY + 160 }, p);
      } else {
        hideHand();
      }
    }
    drawHandCursor(ctx, t);
    return;
  }

  if (game.phase === 'forcewin') {
    const since = elapsed - PHASE_FREEPLAY_END;
    const alpha = since < 700 ? since / 700 * 0.85 : Math.max(0, 0.85 - (since - 700) / 3500 * 0.85);
    ctx.save();
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }

  if (game.phase === 'endcard') {
    drawEndcard(ctx, t);
    return;
  }
}

/** Test/dev helper: jump straight to a given phase. */
export function _devForcePhase(phase) {
  game.phase = phase;
  const PHASE_T0_MS = {
    intro: 0,
    tutorial: PHASE_INTRO_END + 100,
    freeplay: PHASE_TUTORIAL_MAX + 100,
    forcewin: PHASE_FREEPLAY_END + 100,
    endcard: PHASE_FORCEWIN_END + 100,
  };
  game.t0 = performance.now() - (PHASE_T0_MS[phase] ?? 0);
  if (phase === 'endcard') setEndcardOpacity(1);
  if (phase === 'forcewin') state.hp_enemy_pct = 0;
}
/** @type {any} */ (window).__forcePhase = _devForcePhase;
