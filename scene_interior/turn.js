// Turn manager — local to scene_interior. Tracks which floor / unit is currently aimable.
// Advances on every 'cut_to_interior' event. Skips dead units in the rotation.
//
// Why a local module (not shared/state.js): the turn order is an interior-scene concern.
// Sami's exterior doesn't care which player unit is "active" — it only sees `player_fire`
// payloads. Keeping turn state local avoids extending the locked shared/ contract.

import { state } from '../shared/state.js';
import { on } from '../shared/events.js';

// Order matches B01.mp4 source: Cyclop (floor 1) → Skeleton (0) → Orc (2) → repeat.
const TURN_ORDER = /** @type {(0|1|2)[]} */ ([1, 0, 2]);
let cursor = 0;

/**
 * Floor of the unit the player should aim with this turn.
 * Skips dead units, preserving the cursor position so the rotation continues from where
 * we left off if a unit dies and revives later (defensive — revive isn't currently a thing).
 * Returns null if all units are dead.
 * @returns {0|1|2|null}
 */
export function getActiveFloor() {
  for (let i = 0; i < TURN_ORDER.length; i++) {
    const floor = TURN_ORDER[(cursor + i) % TURN_ORDER.length];
    const u = state.units.find(x => x.floor === floor);
    if (u && u.alive) return floor;
  }
  return null;
}

/**
 * Unit id matching the active floor. Used by aim.js to fill the player_fire payload.
 * @returns {'cyclop' | 'skeleton' | 'orc' | null}
 */
export function getActiveUnitId() {
  const f = getActiveFloor();
  if (f === null) return null;
  const u = state.units.find(x => x.floor === f);
  return /** @type {any} */ (u ? u.id : null);
}

// Advance after every resolution. The handler in scene_manager runs first and applies
// the kills from cut_to_interior payload, so by the time we read state here the dead
// units are already flagged.
on('cut_to_interior', () => {
  cursor = (cursor + 1) % TURN_ORDER.length;
});

// Tooling hook: Playwright reads active floor to aim at the right unit.
/** @type {any} */ (window).__getActiveFloor = getActiveFloor;
