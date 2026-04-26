// Scene state machine — drives the alternation between exterior and interior views.
// Each scene observes the current state via subscribe() and shows/hides itself accordingly.
// Cuts are instant (no fade) — matches B01.mp4 reference.

import { emit, on } from './events.js';
import { state, applyDamageToSelf, applyDamageToEnemy, killUnit } from './state.js';

/**
 * @typedef {'INTRO' | 'EXTERIOR_OBSERVE' | 'INTERIOR_AIM' | 'EXTERIOR_RESOLVE' | 'END_VICTORY' | 'END_DEFEAT'} SceneState
 */

/** @type {SceneState} */
let current = 'INTRO';
const subscribers = /** @type {Set<(s: SceneState) => void>} */ (new Set());

/** @returns {SceneState} */
export function getState() { return current; }

/** @param {(s: SceneState) => void} fn */
export function subscribe(fn) {
  subscribers.add(fn);
  fn(current);
  return () => subscribers.delete(fn);
}

/** @param {SceneState} next */
function transition(next) {
  if (next === current) return;
  current = next;
  for (const fn of subscribers) {
    try { fn(current); } catch (e) { console.error('[scene_manager] subscriber threw:', e); }
  }
}

// Wiring — the manager listens to the cross-scene events and drives transitions.

// Interior fires → resolve in exterior
on('player_fire', (payload) => {
  // Exterior is responsible for animating the projectile and computing damage.
  // It then emits 'cut_to_interior' when resolution is done.
  transition('EXTERIOR_RESOLVE');
});

// Exterior signals end of resolution
on('cut_to_interior', (payload) => {
  state.hp_self_pct = payload.hp_self_after;
  state.hp_enemy_pct = payload.hp_enemy_after;
  for (const id of (payload.units_destroyed_ids || [])) killUnit(id);
  state.turn_index += 1;

  if (state.hp_enemy_pct <= 0) { transition('END_VICTORY'); return; } // blue wins
  if (state.hp_self_pct  <= 0) { transition('END_DEFEAT');  return; } // red wins
  // Hotseat: show the other side's interior so they can aim.
  transition('INTERIOR_AIM');
});

on('unit_killed', (payload) => {
  killUnit(payload.unit_id);
});

// Public starter — call once from index.html after scenes are mounted.
export function start() {
  transition('INTERIOR_AIM');
}

// Test hook — exterior calls this once it has shown the opening damage cinematic
// (or interior calls it after the intro tap-to-start). Keeps scene_manager dumb.
export function ready_for_player_input() {
  // Enemy attack just finished; bail to defeat screen if it killed us.
  if (state.hp_self_pct <= 0) { transition('END_DEFEAT'); return; }
  if (state.hp_enemy_pct <= 0) { transition('END_VICTORY'); return; }
  transition('INTERIOR_AIM');
}

// Dev-only: bypass the state machine to render a specific scene. NEVER call from production code.
/** @param {SceneState} s */
export function _devForceState(s) { transition(s); }
