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
import { startDecoTimer, drawDecoTimer, setDecoTimerVisible, getTimerRemaining } from './deco_timer.js';
import { setInstruction, drawInstruction } from './instruction_text.js';
import { setFreezeOverview } from '../scene_exterior/index.js';

// Event-driven phase machine — no time-based gates except for two short
// animation windows (intro pan and forcewin flash). Everything else advances
// when the player or the enemy actually does something.
//
// PHASE_INTRO_END is kept because the intro is a fixed-length cinematic that
// the player can't shortcut. FORCEWIN_FLASH_MS gates the white flash before
// the endcard fades in.
const PHASE_INTRO_END    = 4500;
const FORCEWIN_FLASH_MS  = 2500;
const ENDCARD_FADE_MS    = 400;
// Comeback cinematic when the user taps Continue on the fail screen.
//   0 → REVENGE_HP_REFILL_MS : HP visibly refills 8 → 100 with a green flash
//   REVENGE_TEXT_AT          : "POWER UP!" praise float pops centred
//   REVENGE_TOTAL_MS         : red HP set to 0 → forcewin flash → endcard
const REVENGE_HP_REFILL_MS = 700;
const REVENGE_TEXT_AT      = 350;
const REVENGE_TOTAL_MS     = 1500;
// Game ends when:
//   - red HP hits 0           → forcewin (player won)
//   - blue HP hits 0          → fail screen
//   - decorative timer hits 0 → fail screen (out of time)

const game = {
  phase: /** @type {'intro'|'tutorial'|'freeplay'|'fail'|'continue_revenge'|'forcewin'|'endcard'} */ ('intro'),
  t0: 0,                    // wall-clock at boot (used for the deco countdown only)
  forcewinT0: 0,            // wall-clock at forcewin entry (gates flash duration)
  endcardT0: 0,             // wall-clock at endcard entry (gates fade-in)
  revengeT0: 0,             // wall-clock at continue-cinematic entry
  revengeStartHp: 8,        // blue HP at the moment Continue was tapped
  shotsFired: 0,
  enemyAttacks: 0,
  endRequested: false,
  endVerdict: /** @type {'fail'|'win'|null} */ (null),
};
/** @type {any} */ (window).__game = game;

/** @param {HTMLCanvasElement} canvas */
export function runScript(canvas) {
  game.t0 = performance.now();
  startDecoTimer();
  installEndcardTap(canvas);
  installPersistentCta(canvas);
  installFailScreenTap(canvas, () => {
    // User tapped Continue — start the comeback cinematic instead of
    // hard-cutting to forcewin. The phase machine drives the rest.
    game.phase = 'continue_revenge';
    game.revengeT0 = performance.now();
    game.revengeStartHp = state.hp_self_pct;
    game._revengeTextSpawned = false;
  });

  on('player_fire', () => { game.shotsFired += 1; });
  on('cut_to_interior', () => {
    // Each cut back to interior = one completed enemy attack cycle.
    game.enemyAttacks += 1;
  });

  // Camera reached the frozen wide-overview moment we asked for after an end
  // condition triggered. Both castles are now visible — fire the appropriate
  // end screen.
  on('reached_frozen_overview', () => {
    if (game.endVerdict === 'win') {
      game.phase = 'forcewin';
      game.forcewinT0 = performance.now();
      try { hideHand(); } catch {}
    } else {
      game.phase = 'fail';
      showFailScreen();
      try { hideHand(); } catch {}
    }
  });

  // Praise float on every player_fire — synchronous, fires at the moment of
  // launch so the user sees positive feedback before the projectile lands
  // (compared to cut_to_interior which fires ~3.5 s later, after the user has
  // already moved on emotionally).
  on('player_fire', () => {
    if (game.phase === 'tutorial' || game.phase === 'freeplay') {
      spawnPraise();
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
  // Decorative countdown is visible whenever the player is "in the game" —
  // hidden during pure cinematic beats (intro, fail overlay, endcard).
  setDecoTimerVisible(
    game.phase === 'tutorial' || game.phase === 'freeplay' ||
    game.phase === 'forcewin'
  );
  // Instruction text follows the scene flow, not just the phase:
  //   exterior overview → "TAP YOUR CASTLE!" (player must tap to zoom in)
  //   interior aim     → "DRAG TO AIM!" (player drags the unit)
  //   resolving shots  → no hint (cinematic, hands-off)
  if (game.phase === 'tutorial' || game.phase === 'freeplay') {
    const scene = getSceneState();
    // Camera auto-pans now — no "TAP YOUR CASTLE!" beat anymore. Only
    // surface the drag hint once the player is inside the interior aim view.
    if (scene === 'INTERIOR_AIM')  setInstruction('DRAG TO AIM!');
    else                           setInstruction(null);
  } else {
    setInstruction(null);
  }

  switch (game.phase) {
    case 'intro':
      // Intro is a fixed cinematic — no input bypass.
      if (elapsed > PHASE_INTRO_END) game.phase = 'tutorial';
      break;
    case 'tutorial':
      // Advance only when the player actually fires their first shot. No
      // timeout — they can stare at the hand-drag demo for as long as they
      // want (matches MarbleSort's behaviour).
      if (game.shotsFired >= 1) {
        game.phase = 'freeplay';
        hideHand();
      }
      break;
    case 'freeplay': {
      // End conditions:
      //   red HP  = 0  → win  (forcewin)
      //   blue HP = 0  → fail
      //   timer   = 0  → fail
      // Detection happens immediately, but the screen waits for the camera
      // to reach the wide overview between turns (both castles visible).
      // setFreezeOverview tells scene_exterior to stay in overview at the
      // next dezoom completion; it then emits 'reached_frozen_overview'
      // which fires the actual screen swap (handler above).
      if (!game.endRequested) {
        if (state.hp_enemy_pct <= 0) {
          game.endRequested = true; game.endVerdict = 'win';
        } else if (state.hp_self_pct <= 0 || getTimerRemaining() <= 0) {
          game.endRequested = true; game.endVerdict = 'fail';
        }
        if (game.endRequested) {
          setFreezeOverview(true);
          game.endRequestedAt = performance.now();
        }
      } else if (game.phase === 'freeplay' &&
                 getSceneState() === 'INTERIOR_AIM' &&
                 performance.now() - (game.endRequestedAt || 0) > 1500) {
        // Idle fallback: timer expired while the player was sitting in the
        // aim view. No turn boundary is coming — fire the screen directly.
        if (game.endVerdict === 'win') {
          game.phase = 'forcewin';
          game.forcewinT0 = performance.now();
        } else {
          game.phase = 'fail';
          showFailScreen();
        }
        try { hideHand(); } catch {}
      }
      break;
    }
    case 'fail':
      // No auto-continue — the user MUST tap one of the two CTAs.
      // (PLAY NOW → install redirect; Continue → comeback cinematic.)
      break;
    case 'continue_revenge': {
      const r = performance.now() - game.revengeT0;
      // 1. HP refill (lerped, eased) over the first ~700ms
      if (r < REVENGE_HP_REFILL_MS) {
        const k = r / REVENGE_HP_REFILL_MS;
        const eased = 1 - Math.pow(1 - k, 3);
        state.hp_self_pct = game.revengeStartHp + (100 - game.revengeStartHp) * eased;
      } else {
        state.hp_self_pct = 100;
      }
      // 2. Spawn the "POWER UP!" praise float once at REVENGE_TEXT_AT
      if (!game._revengeTextSpawned && r >= REVENGE_TEXT_AT) {
        game._revengeTextSpawned = true;
        spawnPraise('POWER UP!', { x: 270, y: 460, color: '#7DF07F' });
      }
      // 3. After the full beat, hand off to forcewin (which renders the
      //    white flash, then the endcard takes over).
      if (r >= REVENGE_TOTAL_MS) {
        state.hp_enemy_pct = 0;
        game.phase = 'forcewin';
        game.forcewinT0 = performance.now();
      }
      break;
    }
    case 'forcewin':
      if (performance.now() - game.forcewinT0 > FORCEWIN_FLASH_MS) {
        game.phase = 'endcard';
        game.endcardT0 = performance.now();
        try { /** @type {any} */ (window).Voodoo?.playable?.win(); } catch {}
      }
      break;
    case 'endcard': {
      const fade = (performance.now() - game.endcardT0) / ENDCARD_FADE_MS;
      setEndcardOpacity(Math.min(1, Math.max(0, fade)));
      break;
    }
  }
}

function _paintOverlay(ctx, t, elapsed) {
  const W = ctx.canvas.width, H = ctx.canvas.height;

  // Comeback green flash — paints a sin-pulse green wash + radial highlight
  // around the blue castle area while HP refills. Reads as "your castle is
  // being healed / powered up".
  if (game.phase === 'continue_revenge') {
    const r = performance.now() - game.revengeT0;
    const k = Math.min(1, r / REVENGE_HP_REFILL_MS);
    const wash = Math.sin(k * Math.PI) * 0.45;          // 0 → 0.45 → 0
    const heroR = 100 + 280 * k;
    const grad = ctx.createRadialGradient(W / 2, H * 0.55, 40, W / 2, H * 0.55, heroR);
    grad.addColorStop(0, `rgba(160, 255, 170, ${wash})`);
    grad.addColorStop(1, 'rgba(120, 235, 130, 0)');
    ctx.save();
    ctx.fillStyle = `rgba(80, 230, 100, ${wash * 0.35})`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Critical-HP red vignette — soft pulsing radial overlay when blue is at
  // ≤5% HP. Sits BELOW HUD/CTA so HP/install button stay readable, but
  // above gameplay so the danger reads instantly.
  if (state.hp_self_pct <= 5 &&
      game.phase !== 'endcard' && game.phase !== 'forcewin' &&
      game.phase !== 'continue_revenge' &&
      !isFailScreenShown()) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 1.6);
    const peak = 0.55 + 0.20 * pulse;
    const grad = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 620);
    grad.addColorStop(0, 'rgba(255,0,0,0)');
    grad.addColorStop(0.55, `rgba(220,30,30,${peak * 0.4})`);
    grad.addColorStop(1, `rgba(180,10,10,${peak})`);
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Praise floats + persistent CTA paint over EVERY non-endcard phase, including
  // tutorial (which returns early below for hand-cursor reasons).
  if (game.phase !== 'endcard') {
    drawPraiseFloats(ctx, performance.now());
    drawPersistentCta(ctx, t);
    drawDecoTimer(ctx);
    drawInstruction(ctx, t);
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
    const since = performance.now() - game.forcewinT0;
    const alpha = since < 700 ? since / 700 * 0.85 : Math.max(0, 0.85 - (since - 700) / 1800 * 0.85);
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
  const now = performance.now();
  if (phase === 'intro')    game.t0 = now;
  if (phase === 'tutorial') game.t0 = now - PHASE_INTRO_END - 100;
  if (phase === 'forcewin') { game.forcewinT0 = now; state.hp_enemy_pct = 0; }
  if (phase === 'endcard')  { game.endcardT0 = now; setEndcardOpacity(1); }
  if (phase === 'fail')     { showFailScreen(); }
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
