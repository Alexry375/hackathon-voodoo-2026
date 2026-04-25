// Tiny event bus — the only cross-scene communication channel.
// Owned by Alexis. LOCKED contract — change requires [decision] in HANDOFF + 15-min response window.

/** @typedef {'player_fire' | 'cut_to_interior' | 'unit_killed'} EventName */

const subs = /** @type {Map<EventName, Set<Function>>} */ (new Map());

/**
 * @param {EventName} name
 * @param {(payload: any) => void} fn
 * @returns {() => void} unsubscribe
 */
export function on(name, fn) {
  if (!subs.has(name)) subs.set(name, new Set());
  subs.get(name).add(fn);
  return () => subs.get(name)?.delete(fn);
}

/**
 * @param {EventName} name
 * @param {object} payload
 */
export function emit(name, payload) {
  const set = subs.get(name);
  if (!set) return;
  for (const fn of set) {
    try { fn(payload); }
    catch (e) { console.error(`[events] handler for "${name}" threw:`, e); }
  }
}

// Cross-scene event payload shapes (typedefs only — runtime is duck-typed):
//
// 'player_fire' (Interior → Exterior):
//   { unit_id: 'cyclop' | 'skeleton' | 'orc',
//     angle_deg: number,   // 0 = horizontal right, 90 = up
//     power: number }      // 0..1, derived from drag length
//
// 'cut_to_interior' (Exterior → Interior):
//   { hp_self_after: number,        // 0..100
//     hp_enemy_after: number,
//     units_destroyed_ids: string[] }
//
// 'unit_killed' (Exterior → Interior):
//   { unit_id: string }
