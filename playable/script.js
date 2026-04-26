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
import { drawDottedTrajectory } from '../scene_interior/aim.js';
import { drawEndcard, setEndcardOpacity, installEndcardTap } from './endcard.js';
import { emit } from '../shared/events.js';
import { getActiveUnitId } from '../scene_interior/turn.js';
import { installPersistentCta, setPersistentCtaVisible, drawPersistentCta } from './persistent_cta.js';
import {
  showFailScreen, hideFailScreen, isFailScreenShown,
  installFailScreenTap, drawFailScreen,
} from './fail_screen.js';
import { spawnPraise, drawPraiseFloats } from './praise_floats.js';

// Phase timings (ms since boot) — total runtime ≤28s before endcard.
const PHASE_INTRO_END     = 4500;   // enemy bomb impact + zoom-in to interior
const PHASE_TUTORIAL_MAX  = 12000;  // hand-cursor demo + first 1-2 player shots
const PHASE_FAIL_TRIGGER  = 18000;  // fake-fail beat ("ALMOST!") — keeps user engaged
const PHASE_FAIL_TIMEOUT  = 4000;   // auto-continue if user doesn't tap
const PHASE_FREEPLAY_END  = 23000;  // fail dwell ends, snap to forcewin
const PHASE_FORCEWIN_END  = 27000;  // big finish + endcard takeover at 27s
const ENDCARD_FADE_MS     = 400;
// Floor on enemy HP during freeplay so the fail beat always has room to fire.
// Cleared the moment the user taps PLAY NOW or auto-continue triggers forcewin.
const ENEMY_HP_FLOOR_FREEPLAY = 12;

const game = {
  phase: /** @type {'intro'|'tutorial'|'freeplay'|'fail'|'forcewin'|'endcard'} */ ('intro'),
  t0: 0,
  shotsFired: 0,
  failShownAt: 0,
};
/** @type {any} */ (window).__game = game;

/** @param {HTMLCanvasElement} canvas */
export function runScript(canvas) {
  game.t0 = performance.now();
  installEndcardTap(canvas);
  installPersistentCta(canvas);
  installFailScreenTap(canvas, () => {
    // User tapped CONTINUE → refill HP, fast-forward to forcewin.
    state.hp_self_pct = 100;
    game.phase = 'forcewin';
    game.t0 = performance.now() - PHASE_FREEPLAY_END;
    state.hp_enemy_pct = 0;
  });

  on('player_fire', () => { game.shotsFired += 1; });

  // Praise float on every player_fire — synchronous, fires at the moment of
  // launch so the user sees positive feedback before the projectile lands
  // (compared to cut_to_interior which fires ~3.5 s later, after the user has
  // already moved on emotionally).
  on('player_fire', () => {
    if (game.phase === 'tutorial' || game.phase === 'freeplay') {
      spawnPraise();
    }
  });
  on('cut_to_interior', () => {
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
  // Show persistent PLAY NOW from end of intro through forcewin; hidden during
  // the dedicated endcard (which has its own full-screen CTA).
  // Hide the small top-right CTA during the fail screen — the big PLAY NOW
  // button in the fail overlay supersedes it (avoids two competing CTAs).
  setPersistentCtaVisible(
    game.phase === 'tutorial' || game.phase === 'freeplay' ||
    game.phase === 'forcewin'
  );

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
      if (state.hp_enemy_pct < ENEMY_HP_FLOOR_FREEPLAY) {
        state.hp_enemy_pct = ENEMY_HP_FLOOR_FREEPLAY;
      }
      // Only fire the fail beat when we're cleanly between turns
      // (player aim screen, no projectile in flight). Otherwise wait one
      // more frame — the trigger will retry on the next tick.
      if (elapsed > PHASE_FAIL_TRIGGER && getSceneState() === 'INTERIOR_AIM') {
        state.hp_self_pct = 8;
        game.phase = 'fail';
        game.failShownAt = elapsed;
        showFailScreen();
        // Wipe any lingering tutorial/aim hand state — fail screen owns the
        // hand cursor from now on.
        try { hideHand(); } catch {}
      }
      break;
    case 'fail':
      // Auto-continue if user doesn't tap within timeout.
      if (elapsed - game.failShownAt > PHASE_FAIL_TIMEOUT) {
        state.hp_self_pct = 100;
        game.phase = 'forcewin';
        game.t0 = performance.now() - PHASE_FREEPLAY_END;
        state.hp_enemy_pct = 0;
        hideFailScreen();
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

  // Praise floats + persistent CTA paint over EVERY non-endcard phase, including
  // tutorial (which returns early below for hand-cursor reasons).
  if (game.phase !== 'endcard') {
    drawPraiseFloats(ctx, performance.now());
    drawPersistentCta(ctx, t);
  }

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
        // Dotted ballistic preview matching the hand's current drag offset.
        // Drag vec (start - current) = (160*p, -160*p) → up-right ballistic.
        drawDottedTrajectory(ctx, { x: a.x, y: a.y - 40 }, { x: 160 * p, y: -160 * p });
      } else {
        hideHand();
      }
    }
    drawHandCursor(ctx, t);
    return;
  }

  // Fail overlay sits above gameplay but below endcard.
  if (isFailScreenShown()) {
    drawFailScreen(ctx, t);
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

// Test/recording hook: synthesize a player_fire so headless capture can drive
// the scripted ad past the tutorial gate without simulating pointer drags.
/** @type {any} */ (window).__simulateFire = (angle_deg = 55, power = 0.95) => {
  const unit_id = getActiveUnitId();
  if (!unit_id) return false;
  emit('player_fire', { unit_id, angle_deg, power });
  return true;
};
