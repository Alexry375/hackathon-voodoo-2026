# Outils disponibles

> Outils pré-installés ou à copier au démarrage. Utilise-les avant de réinventer la roue.

---

## tools/analyze_video.py — appel Gemini via Files API directe

**Source** : copié depuis le repo parent (`tools/analyze_video.py`).

**Dépendance** : `pip install --user google-genai` (SDK officiel Google).

**Variable d'env** : `GEMINI_API_KEY` (ou `GOOGLE_API_KEY` en fallback). Déjà set dans `.env` à la racine du repo (gitignored). Charge avec : `set -a; source .env; set +a` avant de lancer le script.

**Coût indicatif** : ~0.05–0.10 $ par appel (vidéo ~1 min, sortie ~5 K tokens). Pas de cap budgétaire strict, et **plus de rate limit gênant** (clé hackathon Gemini direct, vs OpenRouter qui en avait).

**Modèle par défaut** : `gemini-3.1-pro-preview` (SOTA Google avril 2026, accès direct Google AI Studio).

**Usage** :

```bash
# Analyse complète, prompt par défaut (synthèse game design 2 passes)
python tools/analyze_video.py input/<jeu>/input/source.mp4 \
    --out SANDBOX/outputs/full.report.md

# Avec prompt custom focal — RECOMMANDÉ pour les checks ciblés
python tools/analyze_video.py SANDBOX/extracts/seg.mp4 \
    --prompt SANDBOX/prompts/check-mecanique-X.md \
    --out SANDBOX/outputs/check-mecanique-X.report.md \
    --max-tokens 16000

# Override modèle (ex: flash pour gagner ~10x sur le coût quand la qualité tient)
python tools/analyze_video.py source.mp4 --model google/gemini-3-flash-preview
```

### Bonnes pratiques Gemini Files API pour les vidéos

La Files API directe (vs OpenRouter) débloque 3 leviers officiels qu'on n'avait pas :

1. **Override du sampling fps via `videoMetadata.fps`** (officiel Google). Par défaut Gemini sample à **1 fps**. Citation doc : *"By default 1 frame per second (FPS) is sampled from the video. You might want to set low FPS for long videos. Use a higher FPS for videos requiring granular temporal analysis, such as fast-action understanding or high-speed motion tracking."* — passe `--fps 4` à `compare_clips.py` pour critique de transitions sub-seconde, plus besoin du hack `setpts=4*PTS` qu'on faisait sur OpenRouter.

2. **Override de la résolution via `media_resolution`** (officiel Google) : LOW / MEDIUM / HIGH. **Ce n'est PAS une résolution pixel** — c'est un budget tokens par frame :
   - `LOW` + `MEDIUM` : 70 tokens/frame (fast, cheap)
   - `HIGH` : 280 tokens/frame (détail visuel fin)
   - Reco officielle : *"MEDIA_RESOLUTION_HIGH provides the optimal performance for most use cases"* — mais MEDIUM suffit largement pour notre usage portrait playable.

3. **Files API** (jusqu'à ~2 GB/fichier, TTL 48 h, reuse possible) vs inline base64 OpenRouter (~10 MB cap). Permet d'uploader des vidéos plus longues sans recompression destructive et de ré-utiliser un upload pour plusieurs prompts focaux.

### Pré-process pixel (notre choix pragmatique, PAS une reco Google)

Indépendamment des leviers officiels ci-dessus, on pré-process en **540p + 1 fps + no-audio** avant upload. Pourquoi :
- 540p = viewport natif AppLovin portrait (540×960). Pas d'upscale gaspillé.
- 1 fps en input = même base qu'en interne Gemini, sauf override `--fps`. Économie bandwidth + uniformise.
- No-audio = on n'analyse pas le son, autant l'enlever.

**Ce n'est pas Google qui demande 540p** — c'est notre pragma. Si tu veux full-res, passe `--no-preprocess`.

```bash
# Référence ffmpeg (ce que les scripts font automatiquement)
ffmpeg -i clip.mp4 -r 1 -vf "scale=-2:540" -an -c:v libx264 -crf 28 clip_pre.mp4
```

### Cap interne ~52 frames par appel — savoir quand segmenter

Le modèle a un cap pratique sur le nombre de frames analysées par appel. À 1 fps tu peux donc couvrir ~52 secondes ; à 4 fps tu couvres ~13 secondes. Pour des clips plus longs : segmente avec `--start-offset` / `--end-offset` ou découpe en plusieurs appels.

### Sources officielles

- [Video understanding — Gemini API doc](https://ai.google.dev/gemini-api/docs/video-understanding)
- [Media resolution — Gemini API doc](https://ai.google.dev/gemini-api/docs/media-resolution)

### Comment écrire un prompt focal

Plus le prompt est ciblé, plus la réponse est précise. Format minimal dans `SANDBOX/prompts/<nom>.md` :

```markdown
Analyse cette vidéo. Concentre-toi exclusivement sur :

[QUESTION PRÉCISE — ex: "le rythme du jeu : tour-par-tour strict, temps-réel, 
ou hybride ? Justifie avec des timestamps précis"]

Réponds en moins de 200 mots, avec timestamps [mm:ss] pour chaque observation.
Si tu n'es pas sûr d'un point, dis-le.
```

## tools/compare_images.py — critique image-vs-image (boucle rapide)

**Usage** : audit macro et itération rapide en step 04 / step 5.3. Envoie N images (réf source + screenshots playable) à Gemini via SDK directe (`google-genai`). Sortie : critique structurée écarts acceptables / bloquants.

**Cost indicatif** : ~0.01–0.02 $ par appel (image-only, MEDIUM resolution).

```bash
python tools/compare_images.py \
    --prompt SANDBOX/prompts/critic-pair.md \
    --image source:SANDBOX/frames-ref/ref_00_00.png \
    --image ours:SANDBOX/frames-prod/phase_intro.png \
    --media-resolution MEDIUM \
    --out SANDBOX/outputs/critique-intro-pass1.md
```

**Limite connue** : insensible au pacing, transitions, camera state machine. **Ne sert qu'à itérer**, jamais comme gate de livraison. Pour la gate finale, utiliser `compare_clips.py`.

## tools/compare_clips.py — critique clip-vs-clip (gate finale step 5.5)

**Usage** : la **gate** de step 5.5. Envoie 2 clips MP4 (notre playable + extrait source) à Gemini Files API avec un prompt qui demande un scoring segmenté (intro / aim / fire_cinematic / impact / endcard) sur 4 axes (timing, pacing, fidélité visuelle, camera state).

**Cost indicatif** : ~0.05–0.10 $ par appel selon longueur clip et `--media-resolution`.

```bash
python tools/compare_clips.py \
    --prompt SANDBOX/prompts/critic-clips-pacing.md \
    --clip ours:SANDBOX/clips/ours.mp4 \
    --clip source:input/<jeu>/input/source.mp4 \
    --fps 1 \
    --media-resolution MEDIUM \
    --out SANDBOX/outputs/critique-clipclip-pass1.md

# Pour critique de transitions sub-seconde sur clip court (via fps officiel) :
python tools/compare_clips.py \
    --prompt SANDBOX/prompts/critic-transitions.md \
    --clip ours:SANDBOX/clips/transition.mp4 \
    --clip source:SANDBOX/clips/source-transition.mp4 \
    --fps 4 \
    --start-offset 0 --end-offset 3 \
    --out SANDBOX/outputs/critique-transitions.md
```

**Sortie attendue** : un score /10 par segment + détail des écarts par axe. Le rapport sert directement de gate : tous segments ≥ 9/10 = passe à 06 ; sinon itère.

**Reco** : laisse `--no-preprocess` désactivé (le script re-encode auto en 540p/1fps pour économiser bandwidth). Pour critique haute fidélité visuelle, passe `--media-resolution HIGH`.

**Note** : le hack `setpts=4*PTS` (slow-motion ffmpeg) qu'on utilisait sur OpenRouter n'est plus nécessaire avec la Files API directe — passe simplement `--fps 4` pour que Gemini sample à 4 fps côté serveur (officiel, propre).

## tools/record_clip.mjs — capture vidéo du playable

**Usage** : enregistre un clip MP4 du playable mode prod, pour le passer ensuite à `compare_clips.py`.

```bash
# Lance le serveur dev en arrière-plan d'abord
python3 -m http.server 8765 &

# Enregistre 12s de prod
node tools/record_clip.mjs \
    --url http://localhost:8765/dist/playable.html \
    --duration 12 \
    --viewport 540x960 \
    --out SANDBOX/clips/ours.mp4
```

Implémentation type : Playwright avec `recordVideo` activé sur le context, navigation vers l'URL, attente de la durée, fermeture → conversion WebM → MP4 via ffmpeg si nécessaire. **Ce script n'est pas encore committé sur la parent** — la première run-3 doit le créer (template ci-dessus).

## tools/prompt_playable_v2.md — prompt Gemini par défaut

**Source** : copié depuis le repo parent.

C'est le prompt à 2 passes (chronologique seconde-par-seconde + synthèse game design 14 sections). Utilisé par défaut par `analyze_video.py`. Tu peux écrire des prompts focaux plus courts pour des checks ciblés.

## ImageMagick (convert / montage)

Pour les compares côte-à-côte de `shots/`. Voir [`pipeline/07-shots-convention.md`](../pipeline/07-shots-convention.md). Commandes types :

```bash
# Côte à côte simple
convert ref.png rendu.png +append compare.png

# Empilé verticalement
convert ref.png rendu.png -append compare_vertical.png

# Avec labels (joli)
montage -label "Ref" ref.png -label "Playable" rendu.png \
    -tile 2x1 -geometry +10+10 -background '#222' -fill white compare.png
```

## ffmpeg

Disponible dans le shell. Commandes les plus utiles :

```bash
# Extraire un segment court
ffmpeg -ss 00:13 -t 3 -i source.mp4 -c copy SANDBOX/extracts/seg.mp4

# Extraire UNE frame à un timestamp précis
ffmpeg -ss 00:14 -frames:v 1 source.mp4 SANDBOX/frames/foo.png

# Extraire toutes les frames à 1fps sur une plage
ffmpeg -ss 00:00 -t 5 -vf fps=1 source.mp4 SANDBOX/frames/intro_%02d.png

# Convertir audio à un bitrate plus bas (réduire taille bundle)
ffmpeg -i music.ogg -c:a libvorbis -q:a 2 music_low.ogg

# Convertir PNG en JPG qualité 70 (réduction massive pour les bg photos)
ffmpeg -i bg.png -q:v 6 bg.jpg
```

## Playwright

Devdep installée via `npm install`. Usage typique :

```js
import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 540, height: 960 } });

p.on('pageerror', e => console.error('pageerror:', e));
p.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });

await p.goto('http://localhost:8765/dist/playable.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);

// Scrubber via les hooks exposés
await p.evaluate(() => window.__forcePhase('endcard'));
await p.waitForTimeout(500);
await p.screenshot({ path: 'SANDBOX/frames-prod/endcard.png' });

await b.close();
```

Lance toujours le serveur dev en arrière-plan : `python3 -m http.server 8765 &`.

## tools/embed-assets.mjs

À adapter au démarrage. Format type :

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const ASSETS = {
  // [chemin relatif depuis ROOT, mime]
  CYCLOP:     ['input/<jeu>/assets-officiels/cyclop.png',     'image/png'],
  CASTLE_BLUE:['input/<jeu>/assets-officiels/blue_castle.png','image/png'],
  // ...
};

const out = {};
for (const [name, [path, mime]] of Object.entries(ASSETS)) {
  const buf = readFileSync(resolve(ROOT, path));
  out[name] = `data:${mime};base64,${buf.toString('base64')}`;
}

writeFileSync(resolve(ROOT, 'assets-inline.js'),
  `window.ASSETS = ${JSON.stringify(out, null, 2)};\n`);
```

## tools/build.mjs

Gabarit (à copier-adapter) :

```js
import { build } from 'esbuild';
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// 1. Régénère assets-inline.js si nécessaire (si une source binaire est plus récente)
//    [implémentation : compare mtime de assets-inline.js avec mtime des fichiers du dossier source]
//    sinon : execSync('node tools/embed-assets.mjs', { cwd: ROOT });

// 2. esbuild
const result = await build({
  entryPoints: [resolve(ROOT, 'playable/entry.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2020',
  write: false,
});
const bundleJs = result.outputFiles[0].text;

// 3. Lis template + assets-inline + vsdk_shim
const template     = readFileSync(resolve(ROOT, 'dist/_template.html'), 'utf8');
const assetsInline = readFileSync(resolve(ROOT, 'assets-inline.js'),    'utf8');
const vsdkShim     = readFileSync(resolve(ROOT, 'playable/vsdk_shim.js'),'utf8');

// 4. Inline — CRITIQUE : callback function pour éviter $& backreference
let html = template
  .replace('<!--VSDK_SHIM-->', () => `<script>\n${vsdkShim}\n</script>`)
  .replace('<!--ASSETS-->',    () => `<script>\n${assetsInline}\n</script>`)
  .replace('<!--BUNDLE-->',    () => `<script>\n${bundleJs}\n</script>`);

// 5. Minify HTML naïf
html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');

// 6. Écris + check size
const outPath = resolve(ROOT, 'dist/playable.html');
writeFileSync(outPath, html);
const sizeMb = statSync(outPath).size / 1e6;
console.log(`built dist/playable.html (${sizeMb.toFixed(2)} MB)`);
if (sizeMb > 4.8) {
  console.error('FAIL: > 4.8 MB');
  process.exit(1);
}
```

## tools/screenshot_phases.mjs

Voir [`pipeline/05-playwright-loop.md`](../pipeline/05-playwright-loop.md) section 5.2 pour le template Playwright complet.

## Sub-agents Claude Code

Tu peux utiliser le tool `Agent` avec ces subagent_types :

- `general-purpose` : agent libre pour la majorité des tâches d'asset / sub-implementation
- `Explore` : pour de la recherche dans le codebase ou de la R&D visuelle (lecture de frames, etc.)
- `Plan` : si tu veux un sub-architect sur une refonte (rare dans ce contexte)

**Règle parallélisme** : tu lances plusieurs sub-agents en émettant **plusieurs `Agent` tool calls dans UN SEUL message**. Sinon ils se séquencent.

Voir [`pipeline/03-asset-fanout.md`](../pipeline/03-asset-fanout.md) section 3.3 pour le template de brief sub-agent.

## Bash, Read, Write, Edit, Grep, Glob

Tools standard Claude Code disponibles. Préfère `Edit` à `Bash sed` pour modifier du code.
