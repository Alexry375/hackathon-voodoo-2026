# Étape 5 — Boucle visuelle clip-vs-clip + gate score Gemini ≥ 9/10

> Le jeu compile et tourne. Maintenant tu vérifies systématiquement que **chaque moment clé** du playable correspond visuellement à la source. Cette étape contient deux boucles imbriquées : une boucle rapide image-vs-image pour itérer le code, et une **gate finale clip-vs-clip avec score Gemini ≥ 9/10 par segment**, bloquante avant 06.

---

## 5.1. Préparer les frames de référence (boucle rapide)

Tu as une liste de timestamps clés dans `SANDBOX/outputs/timestamps-key.md` (issue de l'étape 1).

Extrais une frame PNG pour chacun :

```bash
mkdir -p SANDBOX/frames-ref/

for ts in 00:00 00:03 00:08 00:13 00:18 00:25 00:32 00:40 00:48 00:53; do
    safe_ts=$(echo $ts | tr ':' '_')
    ffmpeg -ss $ts -frames:v 1 -y \
        input/<jeu>/input/source.mp4 \
        SANDBOX/frames-ref/ref_${safe_ts}.png
done
```

## 5.2. Préparer les screenshots du playable (boucle rapide)

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

## 5.3. Boucle rapide image-vs-image (audit macro)

**Outil** : `tools/compare_images.py` (Gemini Pro Vision via OpenRouter, base64 inline). Voir [`reference/tools-available.md`](../reference/tools-available.md).

Cette boucle te permet d'**itérer rapidement** sur des P0 macro (mauvais layout, palette, mono vs dual frame, opening anchor) sans payer le coût d'un upload vidéo.

```bash
# Audit segmenté : chaque pair frame-réf vs phase-prod
python tools/compare_images.py \
    --ref SANDBOX/frames-ref/ref_00_00.png \
    --ours SANDBOX/frames-prod/phase_intro.png \
    --prompt SANDBOX/prompts/critique-intro.md \
    --out SANDBOX/outputs/critique-intro-pass1.md
```

Pour chaque écart, décide :
- **Bloquant** : à corriger absolument (la mécanique en dépend, fidélité plombée)
- **Important** : à corriger si tu as le temps
- **Acceptable** : différence inhérente au procédural Canvas2D vs jeu original

Documente le diff dans `SANDBOX/frames-prod/diff-<phase>.md`.

**Limite connue** : l'image-vs-image ne capte ni le pacing, ni les transitions <1 s, ni la cohérence de la camera state machine. C'est pour ça qu'elle ne sert **qu'à itérer**, pas à valider.

## 5.4. Corriger les écarts bloquants (boucle rapide)

Pour chaque écart bloquant identifié en §5.3 :

1. Identifie le fichier responsable (asset dans `scene_*/`, `playable/`, ou `shared/`)
2. Si c'est un asset visuel → re-dispatch un sub-agent ciblé (étape 3 mode "fix")
3. Si c'est un layout/timing/transition → corrige toi-même
4. Re-build (`npm run build`) → re-screenshot → re-compare

Continue jusqu'à : **0 écart bloquant macro** sur les 5 phases. Tu **n'es pas encore prêt à livrer** — l'image-only ne valide pas le pacing. Passe au §5.5.

## 5.5. Gate finale — clip-vs-clip avec score Gemini ≥ 9/10 (BLOQUANT)

C'est la **gate** de cette étape. Aucune livraison sans 9/10 minimum sur les 5 segments. Vise le 10.

### 5.5.1. Capture un clip vidéo de ton playable

**Outil** : `tools/record_clip.mjs` (Playwright `page.video()` → MP4). Voir [`reference/tools-available.md`](../reference/tools-available.md).

```bash
# Enregistre un clip de 12s du playable en mode prod
node tools/record_clip.mjs \
    --url http://localhost:8765/dist/playable.html \
    --duration 12 \
    --out SANDBOX/clips/ours.mp4
```

Le clip doit couvrir : opening (intro) → 1 cycle ping-pong complet → début endcard. 12 s suffisent en général.

### 5.5.2. Pré-process (optionnel — auto par défaut)

`compare_clips.py` re-encode automatiquement chaque clip en **540p / 1 fps / no-audio** avant upload (économie bandwidth, uniformise la base d'analyse). Tu peux désactiver avec `--no-preprocess` si tu veux full-res. Note : le 540p n'est PAS une reco Google — c'est le viewport natif AppLovin portrait, donc pas d'upscale gaspillé. Côté Google, le levier officiel de qualité est `--media-resolution` (LOW/MEDIUM/HIGH = 70/70/280 tokens par frame). Voir [`reference/tools-available.md`](../reference/tools-available.md).

### 5.5.3. Sampling fin via `--fps` (officiel, Files API directe)

Pour critique de transitions sub-seconde (ease, fade, motion blur, micro-dwell), Gemini sample par défaut à **1 fps**, ce qui rend invisibles les events <1 s. La Files API directe expose `videoMetadata.fps` officiellement → passe simplement `--fps 4` à `compare_clips.py` pour que Gemini sample à 4 fps côté serveur. **Plus besoin du hack `setpts=4*PTS` qu'on faisait sur OpenRouter.**

**Reco usage** :
- `--fps 1` (default Gemini) → vue d'ensemble structure + pacing macro
- `--fps 2` → bon compromis sur clips ~25 s
- `--fps 4` → critique fine de transitions sub-seconde, **sur clips courts**

⚠️ **Cap interne Gemini** : ~52 frames analysées par appel. À 4 fps tu couvres ~13 s max. Si tu veux scorer un segment précis (ex: drag-fire ou endcard), capture un clip **dédié court** + `--start-offset` / `--end-offset` plutôt que d'analyser le clip complet.

### 5.5.4. Audit segmenté — score par segment

**Outil** : `tools/compare_clips.py` (Gemini File API ou OpenRouter selon l'endpoint, scoring segmenté). Voir [`reference/tools-available.md`](../reference/tools-available.md).

```bash
python tools/compare_clips.py \
    --prompt SANDBOX/prompts/critic-clips-segments.md \
    --clip ours:SANDBOX/clips/ours.mp4 \
    --clip source:input/<jeu>/input/source.mp4 \
    --fps 1 \
    --media-resolution MEDIUM \
    --out SANDBOX/outputs/critique-clipclip-pass<N>.md
```

Le prompt `critic-clips-segments.md` doit demander explicitement à Gemini un score `/10` par segment (intro / aim / fire_cinematic / impact / endcard) avec critères timing / pacing / fidélité visuelle / camera state, en s'appuyant sur `SANDBOX/outputs/cinematic-spec.md` comme oracle.

Le tool doit produire un rapport avec **un score /10 par segment** + critères explicites :
- **Timing** : durée du segment vs source (±15 % accepté)
- **Pacing** : transitions présentes (cuts, eases, dwells) vs source
- **Fidélité visuelle** : layout, palette, animations
- **Camera state** : conforme à `cinematic-spec.md` ?
- **Score global du segment** : moyenne ou min des 4 axes

### 5.5.5. Gate

**Tu ne passes à 06 que si tous les segments scorent ≥ 9/10.** Sinon :

1. Identifie le segment le plus faible
2. Lis la critique Gemini en détail
3. Corrige le code (caméra, timing, asset, transition)
4. Re-bundle, re-record, re-pré-process, re-score
5. Boucle jusqu'à atteindre 9/10 sur tous les segments. Vise 10.

**Garde-fou anti-boucle infinie** : si après **5 itérations** tu stagnes sous 9/10 sur un segment, marque `[blocker-cinematic]` dans un commit body et passe à 06 quand même — le user reprendra. Mais documente précisément ce qui bloque.

### 5.5.6. Versionner les passes

À chaque pass, archive le rapport :

```
SANDBOX/outputs/critique-clipclip-pass1.md   # baseline
SANDBOX/outputs/critique-clipclip-pass2.md   # après correction P0 segment X
SANDBOX/outputs/critique-clipclip-pass3.md   # ...
SANDBOX/outputs/critique-clipclip-final.md   # gate verte 9/10+
```

Et pousse une copie de chaque pass dans `shots/05-playwright/critique-passN.md` pour suivi humain.

## 5.6. Suivi visuel pour l'humain (`shots/`)

Pour chaque timestamp clé / phase narrative + chaque pass de critique, copie :

- `phase_intro_compare.png` (frame réf @ 0:00 | playable phase intro)
- `phase_tutorial_compare.png`, `phase_freeplay_compare.png`, `phase_forcewin_compare.png`, `phase_endcard_compare.png`
- + un par timestamp clé non-narratif (ex: `cycle1_aim_compare.png`, `cycle1_fire_cinematic_compare.png`)
- Les rapports `critique-passN.md` (de §5.5.6)
- Un fichier `score-evolution.md` qui trace l'évolution du score par segment au fil des passes

Mets à jour `shots/_index.md` avec le tableau récap (phase / frame réf / compare / score final par segment).

## 5.7. Sortie attendue

- `SANDBOX/frames-ref/*.png` : N frames extraites de la vidéo
- `SANDBOX/frames-prod/*.png` : N screenshots du playable
- `SANDBOX/clips/{ours,source_12s}_1fps.mp4` : clips pré-processés 1 fps / 540p
- `SANDBOX/outputs/critique-clipclip-final.md` avec **tous segments ≥ 9/10**
- `shots/05-playwright/*` peuplé avec compares + critiques
- `shots/_index.md` mis à jour avec scores finaux
- 0 écart bloquant résiduel sur l'ensemble
- **Commit jalon** : `pipeline(05): visual loop done — N segments validés, score min X/10`

---

Étape suivante : [`06-bundle-and-deliver.md`](06-bundle-and-deliver.md).
