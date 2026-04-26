// Scripted ad state machine — calque B01 timeline ~45s.
// Phases: intro → tutorial → freeplay → forcewin → endcard.
//
// Architecture: runScript() starts a clock, subscribes to player_fire (to
// advance tutorial as the player completes each guided shot), drives the
// scene_manager state, and updates window.__game.phase for Playwright
// scrubbing. drawScriptOverlay(ctx, t) is called by both scenes' loops AS
// THE LAST DRAW so the intro overlay / hand cursor / forcewin flash /
// endcard sit on top of everything.

import { on } from '../shared/events.js';
import { state } from '../shared/state.js';
import { getState, subscribe as subscribeScene, start as sceneStart } from '../shared/scene_manager.js';
import { getFloorAnchor } from '../scene_interior/castle_section.js';
import { getActiveFloor } from '../scene_interior/turn.js';
import { showHandOn, showHandDrag, hideHand, drawHandCursor } from './hand_cursor.js';
import { drawEndcard, setEndcardOpacity, installEndcardTap, isEndcardShown } from './endcard.js';

const PHASE_INTRO_END     = 1500;   // ms
const PHASE_TUTORIAL_MAX  = 8000;   // ms — bail to freeplay if player hasn't fired 3 shots
const PHASE_FREEPLAY_END  = 16000;  // ms — forcewin after ~16s (target: 15-30s total)
const PHASE_FORCEWIN_END  = 19000;  // ms — 3s forcewin flash then endcard
const ENDCARD_FADE_MS     = 350;

const game = {
  phase: /** @type {'intro'|'tutorial'|'freeplay'|'forcewin'|'endcard'} */ ('intro'),
  t0: 0,
  shotsFired: 0,
  introDismissed: false,
  introHandedOff: false, // set once we've called sceneStart() — guards re-entry
};
/** @type {any} */ (window).__game = game;

/** @param {HTMLCanvasElement} canvas */
export function runScript(canvas) {
  game.t0 = performance.now();
  // Do NOT force INTERIOR_AIM here — we need the scene_manager's natural
  // start() flow (EXTERIOR_OBSERVE opening wave → ready_for_player_input →
  // INTERIOR_AIM) to fire so the crisis hook drops blue HP first.
  installEndcardTap(canvas);

  // tap-to-dismiss the intro overlay (skip the wait if the player taps early)
  const onIntroTap = () => {
    if (game.phase === 'intro') game.introDismissed = true;
  };
  canvas.addEventListener('pointerdown', onIntroTap, { once: false });

  // every player shot during tutorial counts toward the 3 guided shots
  on('player_fire', () => {
    game.shotsFired += 1;
  });

  // Lose path is reachable: if the player keeps missing, crow chip damage can
  // drive blue HP to 0 → END_DEFEAT → endcard with endResult='lose'. The
  // freeplay HP-floor we used to clamp here is intentionally removed.

  // If the scene_manager hits END_VICTORY / END_DEFEAT naturally (player won
  // mid-tutorial, or got killed before the freeplay HP-lock kicks in), jump
  // straight to the endcard so the ad always shows a closing screen.
  subscribeScene((s) => {
    if (s === 'END_VICTORY' || s === 'END_DEFEAT') {
      game.phase = 'endcard';
      game.endResult = s === 'END_VICTORY' ? 'win' : 'lose';
      setEndcardOpacity(1);
      try { /** @type {any} */ (window).Voodoo?.playable?.win(); } catch {}
    }
  });
}

/**
 * Called by both scenes at the end of their render order. Updates the phase
 * clock and paints overlay layers (intro / hand cursor / forcewin flash /
 * endcard) ON TOP of the scene.
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
      // Intro is a hard pause: only a player tap dismisses it (no time-based
      // auto-advance). scene_manager stays in INTRO so no enemy wave fires
      // and no turn timers tick — the player has time to read the screen.
      if (game.introDismissed && !game.introHandedOff) {
        game.introHandedOff = true;
        game.phase = 'tutorial';
        // Reset the phase clock so 'tutorial' starts at elapsed=0 — otherwise
        // the long pause counts against tutorial bail-out and freeplay timers.
        game.t0 = performance.now();
        sceneStart(); // INTRO → EXTERIOR_OBSERVE → opening crow wave
      }
      break;
    case 'tutorial':
      if (game.shotsFired >= 3 || elapsed > PHASE_TUTORIAL_MAX) {
        game.phase = 'freeplay';
        hideHand();
      }
      break;
    case 'freeplay':
      if (elapsed > PHASE_FREEPLAY_END || state.hp_enemy_pct <= 0) {
        game.phase = 'forcewin';
        // force the enemy castle into death state for the cinematic
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

  if (game.phase === 'intro') {
    // dim the scene + pulsing "TAP TO START"
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    const pulse = 0.7 + 0.3 * Math.sin(t * 2 * Math.PI * 1.6);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('TAP TO START', W / 2, H / 2);
    ctx.fillText('TAP TO START', W / 2, H / 2);
    ctx.restore();
    return;
  }

  if (game.phase === 'tutorial') {
    // Only show the drag-aim hint when the player is actually allowed to aim.
    // During EXTERIOR_OBSERVE / EXTERIOR_RESOLVE the camera is on the
    // battlefield and a "drag here" cursor over an off-screen unit reads as
    // a glitch.
    if (getState() !== 'INTERIOR_AIM') {
      hideHand();
      drawHandCursor(ctx, t);
      return;
    }
    // animate the hand cursor on the active unit, demoing the drag-aim gesture
    const f = getActiveFloor();
    if (f !== null) {
      const a = getFloorAnchor(f);
      const handX = a.x, handY = a.y - 40; // matches ORIGIN_LIFT in aim.js
      const cycleMs = 1800;
      const c = (elapsed % cycleMs) / cycleMs;
      if (c < 0.18) {
        showHandOn({ x: handX, y: handY });
      } else if (c < 0.92) {
        const p = (c - 0.18) / 0.74;
        // drag toward bottom-left = arc up-right shot in aim.js (drag-AWAY semantics)
        showHandDrag({ x: handX, y: handY }, { x: handX - 160, y: handY + 160 }, p);
      } else {
        hideHand();
      }
    }
    drawHandCursor(ctx, t);
    return;
  }

  if (game.phase === 'forcewin') {
    // white flash that ramps and falls during the 3s forcewin window
    const since = elapsed - PHASE_FREEPLAY_END;
    const alpha = since < 600 ? since / 600 * 0.85 : Math.max(0, 0.85 - (since - 600) / 2400 * 0.85);
    ctx.save();
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }

  if (game.phase === 'endcard') {
    drawEndcard(ctx, t, game.endResult ?? 'win');
    return;
  }
}

/** Test/dev helper: jump straight to a given phase. Used by Playwright sweeps. */
export function _devForcePhase(phase) {
  game.phase = phase;
  // Park t0 so _updatePhase doesn't immediately advance us out of `phase`.
  // Use the start of the requested phase's window so the overlay anims look right.
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

