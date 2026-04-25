# Étape 0 — Mission, livrable, critères de succès

## Livrable unique

`input/<nom-du-jeu>/dist/playable.html` — un seul fichier HTML self-contained, qui :

- **< 5 MB** total (cap dur AppLovin)
- Démarre sans aucune requête réseau (zéro `fetch`/`XHR`/`<link href>`/`<img src>` non-data-URI)
- Tourne sans erreur console dans Chromium headless
- Implémente une boucle de gameplay **playable du premier au dernier tap** (pas de cinématique non-interactive >2s en début)
- Se termine sur un endcard avec un bouton CTA qui appelle `window.Voodoo?.playable?.redirectToInstallPage()` (avec fallback `mraid.open()` si dispo, sinon `window.open`)

## Format technique imposé

- HTML portrait 540×960
- Canvas 2D (pas de WebGL/three.js/PixiJS)
- ESM en source, bundle final IIFE minifié inline dans le HTML
- esbuild comme bundler (`--bundle --format=iife --minify --target=es2020`)
- Voir [`reference/stack.md`](../reference/stack.md) pour les détails

## Mode dev / mode prod

Le jeu doit tourner **en deux modes** :

- **Mode dev** : `index.html` à la racine du projet, free-play complet, devbar visible avec boutons de test (changer phase, tuer unité, ajuster HP, etc.). Sert le développement local via `python3 -m http.server 8765`.
- **Mode prod** : `dist/playable.html` (le livrable), free-play remplacé par un **scripted ad** d'environ 30-50 secondes : intro tap-to-start → tutoriel guidé → freeplay court → forcewin → endcard. Devbar caché.

Détection du mode : URL contient `/dist/` → prod, sinon dev. Override manuel possible via `?mode=prod` ou `?mode=dev`.

## Compliance VSDK

`window.Voodoo.playable` doit exposer (shim minimal autorisé) :

```js
window.Voodoo = {
  playable: {
    win: () => {},
    lose: () => {},
    redirectToInstallPage: () => { /* mraid.open ou window.open */ },
    on: (event, cb) => { /* 'pause' | 'resume' via mraid.viewableChange */ },
  }
};
```

## Critères de succès du run

Le run pipeline est considéré réussi si **TOUS** les critères ci-dessous sont vrais :

1. `dist/playable.html` existe et fait < 5 MB
2. Ouvert dans Chromium → 0 erreur console, 0 requête réseau
3. La boucle de gameplay reflète la mécanique principale décrite dans `input/B01_game_spec.md` (validée par toi via Gemini sur la vidéo)
4. Au moins 80% des moments clés de la **passe chronologique** (`input/B01_phase1_description.txt` ou équivalent) sont reproductibles à l'œil dans le playable, vérifié par screenshot Playwright vs frames extraites de la vidéo
5. Le endcard tap → `redirectToInstallPage()` appelé (vérifié via spy console)
6. Aucune feature inventée hors sources

## Hors scope

- Audio non-bloquant : tu peux le wirer si tu as le temps mais c'est secondaire
- Performance fine : pas d'optimisation prématurée tant que ça tourne à 30+ FPS
- Internationalisation : le jeu peut rester en français/anglais selon les sources
- Tests unitaires : aucun. La validation est visuelle.

---

Étape suivante : [`01-skim-and-validate.md`](01-skim-and-validate.md).
