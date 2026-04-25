# Étape 5 — Boucle visuelle Playwright vs frames de référence

> Le jeu compile et tourne. Maintenant tu vérifies systématiquement que **chaque moment clé** du playable correspond visuellement à la frame de référence de la vidéo. C'est la boucle la plus importante pour la fidélité.

---

## 5.1. Préparer les frames de référence

Tu as une liste de timestamps clés dans `SANDBOX/outputs/timestamps-key.md` (issue de l'étape 1).

Extrais une frame PNG pour chacun :

```bash
mkdir -p SANDBOX/frames-ref/

# Exemple : 10 timestamps clés
for ts in 00:00 00:03 00:08 00:13 00:18 00:25 00:32 00:40 00:48 00:53; do
    safe_ts=$(echo $ts | tr ':' '_')
    ffmpeg -ss $ts -frames:v 1 -y \
        input/<jeu>/input/source.mp4 \
        SANDBOX/frames-ref/ref_${safe_ts}.png
done
```

Si la vidéo a des timestamps non-entiers (00:13.5), garde la précision : `ffmpeg -ss 00:13.5 ...`.

## 5.2. Préparer les screenshots du playable

Le mode prod expose `window.__forcePhase` et `window.__game`. Utilise un script Playwright pour scrubber le playable et capturer chaque phase :

```js
// SANDBOX/scripts/screenshot-phases.mjs
import { chromium } from 'playwright';

const PORT = 8765;
const URL = `http://localhost:${PORT}/dist/playable.html`;
const PHASES = ['intro', 'tutorial', 'freeplay', 'forcewin', 'endcard'];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 540, height: 960 } });

const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);

for (const phase of PHASES) {
  await p.evaluate((ph) => window.__forcePhase?.(ph), phase);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `SANDBOX/frames-prod/phase_${phase}.png` });
}

console.log('errors:', errs.length ? errs : 'none');
await b.close();
```

Lance le serveur dev en background : `python3 -m http.server 8765 &` puis `node SANDBOX/scripts/screenshot-phases.mjs`.

## 5.3. Compare visuellement

Pour chaque pair `(SANDBOX/frames-ref/ref_*.png, SANDBOX/frames-prod/phase_*.png)` :

1. Use le tool **Read** sur les 2 PNG (Claude Code peut les visualiser)
2. Identifie les écarts en 4 catégories :
   - **Layout** (positions, tailles, alignements)
   - **Couleurs** (palette, saturation, contraste)
   - **Détails** (texture, ombres, contours)
   - **Timing/animation** (si applicable — comparer à plusieurs timestamps)
3. Pour chaque écart, décide :
   - **Bloquant** : à corriger absolument (la mécanique en dépend, la fidélité est trop éloignée)
   - **Important** : à corriger si tu as le temps (différence visible mais non bloquante)
   - **Acceptable** : différence inhérente au procédural Canvas2D vs jeu original (ne pas chercher à fix)

Documente le diff dans `SANDBOX/frames-prod/diff-<phase>.md`.

## 5.4. Boucler sur les écarts bloquants

Pour chaque écart bloquant :

1. Identifie le fichier responsable (asset dans `scene_*/`, `playable/`, ou `shared/`)
2. Si c'est un asset visuel → re-dispatch un sub-agent ciblé (étape 3 mode "fix") avec :
   - La frame de référence
   - Le screenshot prod actuel
   - La liste des écarts
3. Si c'est un layout/timing/transition → corrige toi-même
4. Re-build (`npm run build`) → re-screenshot → re-diff

Continue jusqu'à : **0 écart bloquant** + **<3 écarts importants** sur tous les timestamps clés.

## 5.5. Validation par re-appel Gemini (optionnel mais recommandé)

Pour des moments narratifs complexes (intro avec dramatique, climax forcewin), tu peux :

1. Enregistrer un MP4 de ton playable via Playwright (`page.video()` ou `screencast`)
2. Lancer `tools/analyze_video.py` sur ton enregistrement avec un prompt focal du genre "Compare cette vidéo de playable ad reproduit à <input/<jeu>/input/source.mp4 si tu peux, sinon décris les mécaniques observées>"
3. Si Gemini identifie une mécanique cassée que tu n'avais pas vue à l'œil → corrige

Cette étape est lourde — utilise-la **uniquement** si la version visuelle n'est pas concluante.

## 5.6. Suivi visuel pour l'humain (`shots/`)

C'est l'étape qui produit les compares les plus importants pour l'humain. Pour chaque timestamp clé / phase narrative, copie un compare côte-à-côte dans `input/<jeu>/shots/05-playwright/` :

- `phase_intro_compare.png` (frame réf @ 0:00 | playable phase intro)
- `phase_tutorial_compare.png`
- `phase_freeplay_compare.png`
- `phase_forcewin_compare.png`
- `phase_endcard_compare.png`
- + un par timestamp clé non-narratif si tu en as identifié (ex: `cycle1_aim_compare.png`, `cycle1_resolve_compare.png`)

Mets à jour `shots/_index.md` avec le tableau récap (phase / frame réf / compare).

## 5.7. Note sur l'appel Gemini optionnel

L'appel Gemini section 5.5 est **encouragé** si tu as un doute sur une mécanique narrative complexe à comparer à l'œil (climax, transition cinématique, séquence rapide). ~0.07 $ par appel via OpenRouter, pas de cap. À privilégier sur un extrait court (`ffmpeg -ss MM:SS -t 5`) avec un prompt focal — voir [`reference/tools-available.md`](../reference/tools-available.md).

## 5.8. Sortie attendue

- `SANDBOX/frames-ref/*.png` : N frames extraites de la vidéo
- `SANDBOX/frames-prod/*.png` : N screenshots du playable
- `SANDBOX/frames-prod/diff-*.md` : pour chaque pair, le diff documenté
- `shots/05-playwright/*` peuplé avec les compares finaux
- `shots/_index.md` mis à jour
- 0 écart bloquant résiduel sur l'ensemble
- **Commit jalon** : `pipeline(05): visual loop done — N pairs validated`

---

Étape suivante : [`06-bundle-and-deliver.md`](06-bundle-and-deliver.md).
