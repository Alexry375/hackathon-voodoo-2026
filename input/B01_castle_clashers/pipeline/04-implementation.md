# Étape 4 — Scaffold + implémentation du jeu

> Tu as la DA verrouillée et tous les assets produits. Tu mets maintenant en place la structure du code, le contrat events, et tu wires tout dans un jeu jouable end-to-end.

---

## 4.1. Structure de fichiers obligatoire

À la racine du dossier projet (`input/<jeu>/`) :

```
input/<jeu>/
├── input/                       # données Antoine — read-only
├── SANDBOX/                     # tes scripts/extracts/anchor/fanout — local
├── pipeline/                    # ce dossier — read-only
├── reference/                   # patterns de référence — read-only
│
├── package.json                 # esbuild + playwright en devDependencies
├── index.html                   # dev shell (mode dev free-play)
├── assets-inline.js             # généré par tools/embed-assets.mjs
│
├── shared/                      # code partagé interior/exterior — locké après step 4.4
│   ├── events.js                # 3-event API
│   ├── state.js                 # mutable state central
│   ├── scene_manager.js         # state machine 2 vues
│   ├── assets.js                # getImage / isImageReady (cache)
│   └── hud_top.js               # HP bars persistant en haut
│
├── scene_<vue_A>/               # nom selon ton jeu — ex: scene_exterior/
│   └── index.js                 # mount(canvas), loop, draw entities
│
├── scene_<vue_B>/               # ex: scene_interior/
│   └── index.js
│
├── playable/                    # narrative et bundle entry
│   ├── entry.js                 # point d'entrée du bundle ESM
│   ├── script.js                # state machine narrative (intro → tut → freeplay → forcewin → endcard)
│   ├── hand_cursor.js           # tutoriel
│   ├── endcard.js               # CTA + redirect
│   └── vsdk_shim.js             # window.Voodoo.playable mock
│
├── tools/
│   ├── analyze_video.py         # copié depuis le repo parent (pour Gemini)
│   ├── embed-assets.mjs         # base64-inline les sources binaires si besoin
│   ├── build.mjs                # pipeline esbuild → dist/playable.html
│   └── prompt_playable_v2.md    # prompt par défaut Gemini (copié)
│
└── dist/
    ├── _template.html           # clone d'index.html avec markers <!--VSDK_SHIM--> <!--ASSETS--> <!--BUNDLE-->
    └── playable.html            # généré
```

Tu peux nommer `scene_<vue_A>` et `scene_<vue_B>` selon ton jeu (`scene_exterior`/`scene_interior`, `scene_world`/`scene_combat`, etc.). **2 scènes max** sauf si la mécanique en exige plus (rare).

## 4.2. Stack et conventions

Tout est figé dans [`reference/stack.md`](../reference/stack.md). Lis-le maintenant.

## 4.3. Contrat events

Le contrat 3-events doit être défini dans `shared/events.js` **avant** d'écrire les scènes.
Voir le pattern complet dans [`reference/scene-split-pattern.md`](../reference/scene-split-pattern.md).

Adapte les noms aux mécaniques de ton jeu, mais **garde la structure 3-events**. Une fois committé, **lockdown : pas de schéma change sans documenter pourquoi**.

## 4.4. Ordre d'implémentation

Travaille dans **cet ordre**, et commit après chaque sous-étape :

1. **Scaffold vide** (`package.json`, dossiers, `tools/build.mjs`, `dist/_template.html`, `index.html` shell)
   - Test : `npm install && npm run build` produit un `dist/playable.html` minimal
   - Commit : `pipeline(04a): scaffold empty + build pipeline works`

2. **`shared/`** complet (events, state, scene_manager, assets, hud_top, **camera**)
   - Le `scene_manager.js` doit respecter `SANDBOX/outputs/cinematic-spec.md` (lockée step 01b) :
     - **Architecture mono vs dual frame** : si la spec dit "mono-frame", chaque scène prend un paramètre `view = OURS|ENEMY` et dessine UNE entité centrée. Pas les 2 simultanées.
     - **Camera state machine** : implémente un module `shared/camera.js` avec `cam = { x, y, zoom, target, ease }` + `tickCamera(dt)` qui interpole. Les transitions sont déclenchées par les events (`player_fire`, `enemy_fire`, etc.) avec des durées issues de `cinematic-spec.md`.
     - **Opening anchor** : `scene_manager.start()` doit démarrer dans l'état décrit en frame 0 de la source (cf. cinematic-spec §"Opening anchor"). **Pas** dans un `state=ready` neutre. Cas vécu run-1 : démarrer en `ready` → impossible de matcher l'opening source → score Gemini plombé.
   - Test : import les modules, vérifie que `state` se mute via les helpers, que `tickCamera` interpole bien
   - Commit : `pipeline(04b): shared layer locked + camera state machine`

3. **Scène A** (la plus simple ou la plus statique d'abord) avec ses assets `SANDBOX/fanout/*.js` copiés au bon endroit
   - Test : `index.html` en dev → la scène A render à l'écran, sans interaction
   - Commit : `pipeline(04c): scene A renders`

4. **Scène B** avec input handling (drag, tap, etc.)
   - Test : interagir → `emit('player_action', ...)` est appelé
   - Commit : `pipeline(04d): scene B + input handling`

5. **Wiring inter-scènes** (transitions, scene_manager, events)
   - Test : action joueur en B → transition → résolution en A → retour B
   - Commit : `pipeline(04e): scene loop wired end-to-end`

6. **`playable/`** (entry, vsdk_shim, hand_cursor, endcard, script narrative)
   - Test : `?mode=prod` lance la 5-phase narrative (intro → tut → freeplay → forcewin → endcard)
   - Commit : `pipeline(04f): scripted ad live`

## 4.5. Devbar

En mode dev (`index.html` direct), expose une devbar avec **au minimum** :

- Bouton "next phase" / "skip phase" (utile pour itérer sans attendre 30s à chaque test)
- Boutons d'override des HP (test états bas/haut)
- Trigger manuel de l'action ennemie (test transitions)
- Affichage de l'état courant du scene_manager

En mode prod : devbar caché (`display: none`).

## 4.6. Hooks de scrub Playwright

Pour permettre la boucle visuelle de l'étape 5, expose en mode prod :

```js
window.__forcePhase = (phase) => { /* saute à intro|tutorial|freeplay|forcewin|endcard */ };
window.__game = { phase, t0, ... };  // état courant readable
```

Ces hooks sont éxposés **uniquement par `playable/script.js`** (pas dans le jeu free-play).

## 4.7. Gotchas connus (à ne PAS apprendre par toi-même)

### Gotcha 1 — `$&` backreference dans build.mjs

`String.prototype.replace(needle, replacement_string)` interprète `$&` dans `replacement_string` comme backreference regex. Le bundle minifié esbuild contient régulièrement `t!==$&&...` → ces 3 chars se font corrompre en `&` au runtime → SyntaxError.

**Fix obligatoire** : passe la replacement en **callback function** :

```js
html = template
  .replace('<!--VSDK_SHIM-->', () => `<script>\n${vsdkShim}\n</script>`)
  .replace('<!--ASSETS-->',    () => `<script>\n${assetsInline}\n</script>`)
  .replace('<!--BUNDLE-->',    () => `<script>\n${bundleJs}\n</script>`);
```

### Gotcha 2 — `start()` order en entry.js

`start()` du `scene_manager` écrase l'état initial par défaut. Si tu fais `_devForceState(...)` ou `runScript(...)` AVANT `start()`, ton override est annulé.

**Ordre obligatoire** dans `entry.js` :
1. Mount des scènes
2. `start()`
3. Override mode-spécifique (dev devbar wiring OU prod runScript)

### Gotcha 3 — Render order pour les overlays narratifs

Dans **chaque** scene loop, les 2 dernières lignes doivent être :

```js
drawTopHud(ctx);
drawScriptOverlay(ctx, performance.now() / 1000);
```

Sans ça, intro overlay / hand cursor / endcard ne s'affichent pas.

## 4.8. Suivi visuel pour l'humain (`shots/`)

À la fin de chaque sous-étape qui produit du visible (4c, 4d, 4e, 4f), prends 1-2 screenshots Playwright et copie-les dans `input/<jeu>/shots/04-impl/` :

- `04c_scene_a_first_render.png` — scène A toute seule
- `04d_scene_b_first_input.png` — scène B avec input visible
- `04e_full_loop.png` — capture pendant la résolution complète (action joueur en cours)
- `04f_scripted_phase_<X>.png` — capture par phase scripted (intro / tutorial / freeplay / forcewin / endcard)

Mets à jour `shots/_index.md` à chaque sous-étape commit.

## 4.9. Sortie attendue

- Tous les fichiers de la structure §4.1 existent et compilent
- `npm run dev` + `index.html` → free-play jouable
- `npm run dev` + `index.html?mode=prod` → 5-phase narrative joue
- `npm run build` → `dist/playable.html` se génère sans erreur, < 5 MB
- `shots/04-impl/*` peuplé selon §4.8
- **Commits** : 6 commits jalons (un par sous-étape)

---

Étape suivante : [`05-playwright-loop.md`](05-playwright-loop.md).
