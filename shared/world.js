// World-space constants. The exterior scene renders into a fixed world
// coordinate system; the camera (shared/camera.js) maps world → screen.
//
// Conventions: world y points DOWN (matches canvas). Origin at top-left of
// the playable battlefield. Ground line is the y where the bottom of the
// chenille (tank treads) sits.

export const WORLD = /** @type {const} */ ({
  // Battlefield horizontal extents — wide enough to fit both castles + a margin.
  width:  1400,
  height: 960,

  // Ground line (where chenille treads sit). Castle pivots anchor here.
  ground_y: 760,

  // Castle pivot (base center) world positions.
  // y raised 60px (760→700) to sit on top of terrain mounds added by the terrain agent.
  blue_castle: { x: 320,  y: 710 },
  red_castle:  { x: 1080, y: 710 },

  // Castle render height in world units (controls scale for the PNG).
  castle_h: 560,
});

/** Convenience for camera presets. */
export const CAM_PRESETS = /** @type {const} */ ({
  // Wide view used only during projectile flight arc.
  overview: { x: WORLD.width / 2,      y: WORLD.ground_y - 280, zoom: 0.72 },
  // Tight on the player's (blue) castle — default exterior view during crow attack.
  blue:     { x: WORLD.blue_castle.x,  y: WORLD.ground_y - 280, zoom: 0.92 },
  // Tight on the enemy (red) castle — hold after player projectile impact.
  red:      { x: WORLD.red_castle.x,   y: WORLD.ground_y - 280, zoom: 0.92 },
});
