// Global mutable state — single source of truth for HP, turn, and unit roster.
// Owned by Alexis. Both scenes read; both scenes can mutate via the helpers below
// (do not mutate the exported `state` object directly from a scene).

/**
 * @typedef {'cyclop' | 'skeleton' | 'orc'} UnitId
 * @typedef {{ id: UnitId, alive: boolean, floor: number }} Unit
 */

/**
 * @typedef {Object} GameState
 * @property {number} hp_self_pct       0..100, player castle (left/blue)
 * @property {number} hp_enemy_pct      0..100, enemy castle (right/red)
 * @property {number} turn_index        0-based, increments after each EXTERIOR_RESOLVE
 * @property {Unit[]} units             blue player units roster, ordered by floor (0 = top)
 * @property {Unit[]} enemy_units       red player units roster
 */

/** @type {GameState} */
export const state = {
  hp_self_pct: 100,
  hp_enemy_pct: 100,
  turn_index: 0,
  units: [
    { id: 'skeleton', alive: true, floor: 0 },
    { id: 'cyclop',   alive: true, floor: 1 },
    { id: 'orc',      alive: true, floor: 2 },
  ],
  enemy_units: [
    { id: 'orc', alive: true, floor: 1 },
  ],
};

/** @param {number} delta — negative = damage to player */
export function applyDamageToSelf(delta) {
  state.hp_self_pct = Math.max(0, Math.min(100, state.hp_self_pct + delta));
}

/** @param {number} delta — negative = damage to enemy */
export function applyDamageToEnemy(delta) {
  state.hp_enemy_pct = Math.max(0, Math.min(100, state.hp_enemy_pct + delta));
}

/** @param {UnitId} id */
export function killUnit(id) {
  const u = state.units.find(u => u.id === id);
  if (u) u.alive = false;
}

/** @returns {Unit[]} */
export function aliveUnits() {
  return state.units.filter(u => u.alive);
}

/** @returns {'blue' | 'red'} */
export function getCurrentTurnSide() {
  return state.turn_index % 2 === 0 ? 'blue' : 'red';
}

/** Alias used by interior/projectile modules. */
export const getCurrentSide = getCurrentTurnSide;

/** @returns {Unit[]} */
export function getActiveUnits() {
  return getCurrentTurnSide() === 'blue' ? state.units : state.enemy_units;
}
