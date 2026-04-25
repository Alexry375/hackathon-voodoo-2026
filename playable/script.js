// Scripted ad state machine — calque B01 timeline ~45s.
// STUB: scaffolded for the bundle pipeline. Phases will be filled in step 6.
// In stub form, prod mode = identical to dev mode (free-play from INTERIOR_AIM)
// so the bundle is verifiable end-to-end before the narrative is in.

import { _devForceState } from '../shared/scene_manager.js';

/** @type {{phase: 'intro'|'tutorial'|'freeplay'|'forcewin'|'endcard', t0: number}} */
const game = { phase: 'freeplay', t0: performance.now() };
/** @type {any} */ (window).__game = game;

/** @param {HTMLCanvasElement} _canvas */
export function runScript(_canvas) {
  _devForceState('INTERIOR_AIM');
}
