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

### 5.5.2. Pré-process avant upload Gemini (économie cost)

**Toujours** pré-process à 1 fps + 540p **avant** de faire appeler `compare_clips.py`. Findings techniques : Gemini sample en interne à 1 fps quoi qu'on envoie ; uploader 8 fps coûte ~80 % de tokens vidéo en plus pour zéro gain analytique.

```bash
# Pré-process notre clip
ffmpeg -i SANDBOX/clips/ours.mp4 \
    -r 1 -vf "scale=540:-2" -an -c:v libx264 -crf 28 \
    SANDBOX/clips/ours_1fps.mp4

# Pré-process la source (référence) sur la même fenêtre temporelle
ffmpeg -ss 00:00 -t 12 -i input/<jeu>/input/source.mp4 \
    -r 1 -vf "scale=540:-2" -an -c:v libx264 -crf 28 \
    SANDBOX/clips/source_12s_1fps.mp4
```

### 5.5.3. Hack slow-motion pour révéler le pacing fin

Limite fondamentale d'OpenRouter : sampling figé à 1 fps → **transitions <1 s sont invisibles** à Gemini (vu comme un cut sec). Solution : ralentir le clip avant upload pour que Gemini "voit" plus de frames sur l'événement court.

```bash
# Slow-mo 4× via setpts → 12s deviennent 48s → résolution effective 250ms
ffmpeg -i SANDBOX/clips/ours_1fps.mp4 \
    -filter:v "setpts=4*PTS" -an \
    SANDBOX/clips/ours_slow4x.mp4
```

**Reco usage du slow-mo** :
- `--slow-mo 1` (default) → vue d'ensemble structure + pacing macro (clip 12 s complet)
- `--slow-mo 2` → bon compromis : couvre ~6 s réelles avec résolution 500 ms
- `--slow-mo 4-6` → uniquement sur clips ultra-courts ciblés (ex: 2 s de transition cinématique, ralenti 6× = analyse 333 ms)

⚠️ **Cap interne Gemini** : ~52 frames analysées par appel. À slow-mo 4× sur 12 s → seules les ~3 premières secondes réelles sont vues. Si tu veux scorer un segment précis (ex: drag-fire ou endcard), capture un clip **dédié court** plutôt que de slow-mo le clip complet.

Toujours préciser dans le prompt focal : *"Cette vidéo est ralentie ×N. Divise tous les timestamps observés par N pour les rapporter en temps réel."*

### 5.5.4. Audit segmenté — score par segment

**Outil** : `tools/compare_clips.py` (Gemini File API ou OpenRouter selon l'endpoint, scoring segmenté). Voir [`reference/tools-available.md`](../reference/tools-available.md).

```bash
python tools/compare_clips.py \
    --ours SANDBOX/clips/ours_1fps.mp4 \
    --ref  SANDBOX/clips/source_12s_1fps.mp4 \
    --segments intro,aim,fire_cinematic,impact,endcard \
    --cinematic-spec SANDBOX/outputs/cinematic-spec.md \
    --out SANDBOX/outputs/critique-clipclip-pass<N>.md
```

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
