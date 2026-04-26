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
  blue_castle: { x: 200,  y: 760 },
  red_castle:  { x: 1200, y: 760 },

  // Castle render height in world units (controls scale for the PNG).
  castle_h: 560,
});

/** Convenience for camera presets.
 *  y = WORLD.ground_y - castle_h/2 = 760 - 280 = 480 centers the castle
 *  vertically on the 960-px canvas for both zoom levels:
 *    zoom 0.70 → castle 392 px tall, 284 px margin top & bottom
 *    zoom 0.45 → castle 252 px tall, 354 px margin top & bottom
 */
export const CAM_PRESETS = /** @type {const} */ ({
  // Both castles visible — used for intro overview + post-impact wide.
  overview: { x: WORLD.width / 2,      y: WORLD.ground_y - 280, zoom: 0.34 },
  // Medium on the player's castle — used at player launch.
  blue:     { x: WORLD.blue_castle.x,  y: WORLD.ground_y - 280, zoom: 0.70 },
  // Medium on the enemy castle — default exterior view.
  red:      { x: WORLD.red_castle.x,   y: WORLD.ground_y - 280, zoom: 0.70 },
});
