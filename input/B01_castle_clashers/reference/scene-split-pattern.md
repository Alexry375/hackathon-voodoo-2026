# Pattern d'architecture — scene-split + 3 events lockés

> Pattern validé sur Castle Clashers v1. À suivre par défaut pour tous les jeux 2 vues / 2 phases. Adapte les noms aux mécaniques de ton jeu.

---

## Pourquoi ce pattern

- Si tu as 2 vues / 2 contextes / 2 caméras / 2 phases distinctes (ex: vue intérieure pour viser, vue extérieure pour observer), **tu en fais 2 modules indépendants** qui ne se parlent qu'à travers un contrat events
- Permet de coder en parallèle (sub-agents, ou collègue humain) sans collisions
- Permet de tester chaque scène en isolation
- Permet de ship un MVP avec une scène en stub et l'autre complète

## Structure

```
shared/
  events.js          # bus minimal : on(name, fn), emit(name, payload), off(name, fn)
  state.js           # state mutable central : hp, scores, units alive, turn_index, ...
  scene_manager.js   # state machine : SCENE_A → SCENE_B → SCENE_A → ...
  assets.js          # lazy Image cache pour window.ASSETS
  hud_top.js         # HUD persistant rendu au-dessus des 2 scènes

scene_a/
  index.js           # mount(canvas), loop, draw entities propres à la scène A

scene_b/
  index.js           # idem scène B
```

## Le contrat 3-events (LOCKÉ après commit initial)

```js
// shared/events.js
const _listeners = {};
export function on(name, fn) {
  (_listeners[name] = _listeners[name] || []).push(fn);
  return () => off(name, fn);
}
export function off(name, fn) {
  _listeners[name] = (_listeners[name] || []).filter(f => f !== fn);
}
export function emit(name, payload) {
  (_listeners[name] || []).forEach(fn => fn(payload));
}
```

Les 3 events typiques (adapte les noms à ton jeu) :

```js
// Scène B (input phase) → Scène A (résolution phase)
emit('player_action', {
  /* tout ce qu'il faut pour résoudre l'action */
  unit_id, angle_deg, power, weapon_type
});

// Scène A → Scène B (résolution finie, retour input)
emit('cut_to_input', {
  /* delta de state à appliquer après résolution */
  hp_self_after, hp_enemy_after, units_destroyed_ids
});

// Scène A → Scène B (un événement précis dans la résolution déclenche un effet en B)
emit('unit_killed', { unit_id });   // ex: scène B affiche un RIP gravestone
```

**Règle d'or** : aucune scène ne lit l'état interne de l'autre. Tout passe par les events + `shared/state.js`.

**Règle pour étendre** : tu peux **ajouter** des champs dans le payload (ex: `weapon_type` après coup). Tu ne **supprimes** jamais. Tu ne **renommes** jamais sans bump version + grep tous les listeners.

## State central

```js
// shared/state.js
export const state = {
  hp_self_pct: 100,
  hp_enemy_pct: 100,
  turn_index: 0,
  units: [
    { id: 'A', alive: true, slot: 0 },
    { id: 'B', alive: true, slot: 1 },
    /* ... */
  ],
};

export function applyDamageToSelf(delta) {
  state.hp_self_pct = Math.max(0, Math.min(100, state.hp_self_pct + delta));
}
// idem applyDamageToEnemy, killUnit, etc.
```

Aucune scène ne mute `state` directement. Toujours via les helpers exportés.

## Scene manager

```js
// shared/scene_manager.js
const SCENES = ['SCENE_A_OBSERVE', 'SCENE_B_INPUT', 'SCENE_A_RESOLVE'];
let _current = SCENES[0];
const _subs = [];

export function subscribe(fn) { _subs.push(fn); fn(_current); return () => {}; }
export function start() { _notify(); }
export function transitionTo(s) { _current = s; _notify(); }
export function _devForceState(s) { _current = s; _notify(); }
function _notify() { _subs.forEach(fn => fn(_current)); }
```

Chaque scène souscrit à `subscribe()` et set `visible = (s === SCENE_X)`. Sa loop ne tourne que si visible.

## Render order

Dans **chaque** scene loop, en dernier :

```js
function loop() {
  if (!visible) { rafId = 0; return; }
  rafId = requestAnimationFrame(loop);
  
  // 1. Clear + bg
  ctx.fillStyle = '#xxxxxx';
  ctx.fillRect(0, 0, w, h);
  
  // 2. Entités scène
  drawEntities(ctx);
  
  // 3. Overlays scène
  drawSceneOverlays(ctx);
  
  // 4. HUD partagé top + narrative overlays — TOUJOURS EN DERNIER
  drawTopHud(ctx);
  drawScriptOverlay(ctx, performance.now() / 1000);
}
```

`drawScriptOverlay` est défini dans `playable/script.js` et gère intro / hand cursor tutoriel / forcewin flash / endcard.

## Entry point bundle

```js
// playable/entry.js
import { mount as mountA } from '../scene_a/index.js';
import { mount as mountB } from '../scene_b/index.js';
import { start, _devForceState } from '../shared/scene_manager.js';
import { runScript } from './script.js';
import './vsdk_shim.js';

const canvas = document.getElementById('g');
mountA(canvas);
mountB(canvas);

start();   // CRITIQUE : start avant override mode

const isProd = location.pathname.includes('/dist/') 
            || new URLSearchParams(location.search).get('mode') === 'prod';

if (isProd) {
  document.getElementById('devbar')?.style.setProperty('display', 'none');
  runScript(canvas);
} else {
  _devForceState('SCENE_B_INPUT');  // démarre en input phase pour dev
  // wire devbar buttons
}
```

## Narrative state machine (`playable/script.js`)

Pour le mode prod, scripted ad ~30-50s :

```js
const PHASE_INTRO_END    = 1500;
const PHASE_TUTORIAL_MAX = 18000;
const PHASE_FREEPLAY_END = 40000;
const PHASE_FORCEWIN_END = 43000;
const ENDCARD_FADE_MS    = 350;

const game = { phase: 'intro', t0: 0, shotsFired: 0, introDismissed: false };
window.__game = game;

export function runScript(canvas) {
  game.t0 = performance.now();
  _devForceState('SCENE_B_INPUT');
  installEndcardTap(canvas);
  // tap → introDismissed
  // on('player_action', () => game.shotsFired++)
  // on('cut_to_input', () => lock HP self >= 30 in freeplay)
}

export function drawScriptOverlay(ctx, t) {
  if (!game.t0) return;
  const elapsed = performance.now() - game.t0;
  _updatePhase(elapsed);
  _paintOverlay(ctx, t, elapsed);
}

// _updatePhase = state machine sur elapsed et état du jeu (HP enemy <= 5 → forcewin)
// _paintOverlay = dessin par phase (intro overlay / hand cursor / white flash / endcard)

window.__forcePhase = (phase) => { /* park t0 + force phase pour scrubbing Playwright */ };
```

## Scrub hooks pour Playwright

Toujours exposer en mode prod :

```js
window.__game = { phase, t0, shotsFired, /* etc */ };
window.__forcePhase = phase => { /* saute */ };
window.__setEndcardOpacity = v => { /* directement */ };
```

Permet aux tests de capturer chaque phase en quelques ms au lieu d'attendre 45s.

---

Si ton jeu a **plus de 2 scènes** (rare), respecte le même pattern : un module par scène, un contrat events explicite, un seul `scene_manager` qui orchestre. Évite à tout prix les imports cross-scènes.
