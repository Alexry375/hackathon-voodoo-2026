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
  blue_castle: { x: 320,  y: 760 },
  red_castle:  { x: 1080, y: 760 },

  // Castle render height in world units (controls scale for the PNG).
  castle_h: 560,
});

/** Convenience for camera presets. */
export const CAM_PRESETS = /** @type {const} */ ({
  // Both castles visible — used for intro overview + post-impact wide.
  overview: { x: WORLD.width / 2, y: WORLD.ground_y - 200, zoom: 0.40 },
  // Tight on the player's castle — used during aim phase if camera ever shows exterior.
  blue:     { x: WORLD.blue_castle.x,  y: WORLD.ground_y - 200, zoom: 0.85 },
  // Tight on the enemy castle — default exterior view.
  red:      { x: WORLD.red_castle.x,   y: WORLD.ground_y - 200, zoom: 0.85 },
});
