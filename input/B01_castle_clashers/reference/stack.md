# Stack imposée

> Pas de débat. Voici la stack figée pour tous les playable ads de la pipeline.

---

## Runtime

- **HTML5** unique fichier
- **Canvas 2D** uniquement (pas de WebGL, pas de Three.js, pas de Pixi.js, pas de Phaser, pas de SVG inline pour le rendu — l'overhead bundle ne le justifie pas pour les jeux 2D side-scroller cibles)
- **Vanilla ES modules** en source
- Portrait **540×960** par défaut. Le canvas se redimensionne en CSS pour fit le viewport, mais les coordonnées internes restent en 540×960.

## Build

- **esbuild** comme bundler unique. Pas de Vite, pas de Webpack, pas de Rollup, pas de Parcel.
- Format **IIFE minifié**, target **es2020**
- Commande type :
  ```js
  await esbuild.build({
    entryPoints: ['playable/entry.js'],
    bundle: true,
    format: 'iife',
    minify: true,
    target: 'es2020',
    write: false,  // on récupère le résultat en string pour l'inliner
  });
  ```

## Embedding

- Tous les assets binaires (PNG, JPG, OGG, WAV) sont **inlinés en base64** dans `assets-inline.js` (généré par `tools/embed-assets.mjs`)
- Format : `window.ASSETS = { ASSET_NAME: 'data:image/png;base64,...' }`
- Lazy-loading via `shared/assets.js` (cache `Image()`, `getImage(name)` + `isImageReady(name)`)

## Pas de framework, pas de libs externes

Aucun npm install d'autre que `esbuild` + `playwright` (pour les tests visuels). Si tu te dis "j'aurais besoin de lodash / d3 / gsap" — non. Tu codes la fonction utilitaire en 5 lignes.

Exception possible : tween/easing functions. Tu en codes 4 (linear, easeIn, easeOut, easeInOut) en 20 lignes, fin du débat.

## Polyfills

Aucun. Les target browsers AppLovin = WebKit récent + V8 récent. Tout es2020 passe.

## Linting / formatting

Aucun obligatoire. Code propre lisible suffit. Pas de prettier config à set up, c'est du temps perdu pour un livrable hackathon.

## Structure de package.json

```json
{
  "name": "playable-<nom-jeu>",
  "type": "module",
  "scripts": {
    "embed": "node tools/embed-assets.mjs",
    "build": "node tools/build.mjs",
    "dev": "python3 -m http.server 8765"
  },
  "devDependencies": {
    "esbuild": "^0.24.0",
    "playwright": "^1.47.0"
  }
}
```

`type: "module"` est important pour que les `.mjs` et `import` natifs marchent côté Node tools.

## Variables d'env

- `GEMINI_API_KEY` : pour `tools/analyze_video.py`. Si absente au démarrage de la pipeline → tu demandes au user.
- Aucune autre.

---

Conventions de naming dans le code :

- Variables : `snake_case` pour le state public (`hp_self_pct`), `camelCase` pour les locals
- Fonctions exportées : `camelCase` (`drawCastle`, `applyDamageToSelf`)
- Fonctions privées : préfixe `_` (`_unitOrigin`)
- Constantes : `SCREAMING_SNAKE_CASE` (`PHASE_INTRO_END`)
- Modules : `kebab-case.js` ou `snake_case.js` au choix, sois cohérent dans le projet
