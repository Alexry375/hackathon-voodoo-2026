// AI shot computation for the red side. Used by scene_interior to auto-fire
// a player_fire-compatible payload without the old cinematic wave system.

import { WORLD } from '../shared/world.js';

function rand(a, b) { return a + Math.random() * (b - a); }

/**
 * Compute a player_fire-compatible payload for the red side.
 * Uses projectile.js rocket physics (gravity=0.0010, speed=1.05).
 *
 * Derivation (red fires left, dir=-1):
 *   vx = -cos(angle)*speed,  vy = -sin(angle)*speed  (canvas y-down)
 *   → cos(angle)*speed = (lx - tx) / T
 *   → sin(angle)*speed = (ly - ty + 0.5·g·T²) / T
 *
 * @param {number} [spread_deg=20]  ± spread around the ideal angle
 * @returns {{ angle_deg:number, power:number, weapon_type:string, unit_id:string }}
 */
export function computeAiShot(spread_deg = 20) {
  const lx = WORLD.red_castle.x;
  const ly = WORLD.ground_y - WORLD.castle_h * 0.75;
  const tx = WORLD.blue_castle.x;
  const ty = WORLD.ground_y - WORLD.castle_h * 0.55;
  const g        = 0.0010; // WEAPON_TUNING.volley.gravity (adjusted to reach 760 units)
  const spd_tune = 0.95;  // WEAPON_TUNING.volley.speed

  const T = rand(1600, 2000);
  const cos_spd = (lx - tx) / T;
  const sin_spd = (ly - ty + 0.5 * g * T * T) / T;

  const speed       = Math.sqrt(cos_spd * cos_spd + sin_spd * sin_spd);
  const angle_ideal = Math.atan2(sin_spd, cos_spd) * 180 / Math.PI;
  const angle_final = angle_ideal + (Math.random() - 0.5) * spread_deg;

  return {
    angle_deg:   Math.max(0, Math.min(170, angle_final)),
    power:       Math.max(0.1, Math.min(1.0, speed / spd_tune)),
    weapon_type: 'volley',
    unit_id:     'orc',
  };
}
