// Scene state machine — drives the alternation between exterior and interior views.
// Each scene observes the current state via subscribe() and shows/hides itself accordingly.
//
// Flow (matches source video sec_01..sec_15):
//   INTRO_INCOMING    — wide shot of OUR castle, enemy bomb falls (-33% HP)
//   INTERIOR_AIM      — cross-section view, player drags to aim
//   EXTERIOR_RESOLVE  — single-castle ping-pong cinematic (ours fires → enemy
//                       impact → enemy ripostes → ours impact)
//   END_VICTORY/DEFEAT
//
// Cuts are instant (matches source) — the cinematic timing lives inside scene_exterior.

import { emit, on } from './events.js';
import { state, killUnit } from './state.js';

/**
 * @typedef {'INTRO_INCOMING' | 'EXTERIOR_OBSERVE' | 'INTERIOR_AIM' | 'EXTERIOR_RESOLVE' | 'END_VICTORY' | 'END_DEFEAT'} SceneState
 */

/** @type {SceneState} */
let current = 'INTRO_INCOMING';
const subscribers = /** @type {Set<(s: SceneState) => void>} */ (new Set());

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

on('player_fire', () => { transition('EXTERIOR_RESOLVE'); });

on('cut_to_interior', (payload) => {
  state.hp_self_pct = payload.hp_self_after;
  state.hp_enemy_pct = payload.hp_enemy_after;
  for (const id of (payload.units_destroyed_ids || [])) killUnit(id);
  state.turn_index += 1;

  if (state.hp_enemy_pct <= 5) { transition('END_VICTORY'); return; }
  if (state.hp_self_pct <= 0)  { transition('END_DEFEAT');  return; }
  transition('INTERIOR_AIM');
});

on('unit_killed', (payload) => { killUnit(payload.unit_id); });

/** Public starter — call once from index.html after scenes are mounted. */
export function start() {
  transition('INTRO_INCOMING');
}

/** Called by exterior after the opening enemy bomb impact. */
export function ready_for_player_input() {
  transition('INTERIOR_AIM');
}

/** Dev-only: bypass the state machine. */
/** @param {SceneState} s */
export function _devForceState(s) { transition(s); }
