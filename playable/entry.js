// Bundle entry point: imported by tools/build.mjs via esbuild --bundle.
// Mounts both scenes on the shared canvas, then either runs the prod
// scripted ad (45s narrative) or leaves the dev devbar wired up.

import { mount as mountInterior } from '../scene_interior/index.js';
import { mount as mountExterior } from '../scene_exterior/index.js';
import { start, _devForceState } from '../shared/scene_manager.js';
import { state, killUnit } from '../shared/state.js';
import { emit } from '../shared/events.js';
import { getActiveUnitId } from '../scene_interior/turn.js';
import { runScript } from './script.js';
import { installAudioOnFirstTap } from '../shared/audio.js';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('g'));
mountInterior(canvas);
mountExterior(canvas);

const params = new URLSearchParams(location.search);
const mode = params.get('mode') || (location.pathname.includes('/dist/') ? 'prod' : 'dev');

// scene_manager.start() transitions to EXTERIOR_OBSERVE first, so we run it
// BEFORE the mode-specific overrides that may force a different state.
start();

// Music kicks in on the player's first pointer (autoplay policy).
installAudioOnFirstTap(canvas);

if (mode === 'prod') {
  // Hide the dev affordances if the bundle was opened in a dev shell.
  const devbar = document.getElementById('devbar');
  if (devbar) devbar.style.display = 'none';
  runScript(canvas);
} else {
  // Dev mode: rely on the index.html devbar. Wire its buttons here so the
  // bundle build still works — when the bundle runs in dist/ there's no
  // devbar at all (the wiring just no-ops).
  const $ = (id) => document.getElementById(id);
  document.querySelectorAll('#devbar button[data-state]').forEach((btn) => {
    btn.addEventListener('click', () => _devForceState(/** @type {any} */ (btn).dataset.state));
  });
  document.querySelectorAll('#devbar button[data-hp]').forEach((btn) => {
    btn.addEventListener('click', () => { state.hp_self_pct = +(/** @type {any} */ (btn)).dataset.hp; });
  });
  $('btn-next-turn')?.addEventListener('click', () => {
    emit('cut_to_interior', {
      hp_self_after: state.hp_self_pct,
      hp_enemy_after: state.hp_enemy_pct,
      units_destroyed_ids: [],
    });
  });
  $('btn-kill-active')?.addEventListener('click', () => {
    const id = getActiveUnitId();
    if (id) killUnit(id);
  });
  _devForceState('INTERIOR_AIM');
}
