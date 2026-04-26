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
import { unlockAudio, playMusic } from '../shared/audio.js';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('g'));
mountInterior(canvas);
mountExterior(canvas);

// Browsers block autoplay until a user gesture. First pointerdown anywhere on
// the page unlocks the audio context, primes SFX caches, and starts the
// looping background music. One-shot — subsequent gestures no-op.
let _audioStarted = false;
function _bootAudio() {
  if (_audioStarted) return;
  _audioStarted = true;
  unlockAudio();
  // Hold the music for 5s so the intro raven beat isn't drowned by the
  // chiptune loop — gameplay is the focus during the first turn.
  setTimeout(() => playMusic('MUSIC_LOOP', { volume: 0.32 }), 5000);
}
window.addEventListener('pointerdown', _bootAudio, { once: false, passive: true });
window.addEventListener('keydown', _bootAudio, { once: false });

const params = new URLSearchParams(location.search);
const mode = params.get('mode') || (location.pathname.includes('/dist/') ? 'prod' : 'dev');

// In prod we let scene_manager.start() drive the cinematic from INTRO_INCOMING
// (enemy bomb falls on us, then transitions to INTERIOR_AIM). In dev we jump
// straight to INTERIOR_AIM for fast iteration.

if (mode === 'prod') {
  const devbar = document.getElementById('devbar');
  if (devbar) devbar.style.display = 'none';
  start();              // → INTRO_INCOMING
  runScript(canvas);
} else {
  start();
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
