# Outils disponibles

> Outils pré-installés ou à copier au démarrage. Utilise-les avant de réinventer la roue.

---

## tools/analyze_video.py — appel Gemini via OpenRouter

**Source** : copié depuis le repo parent (`/home/alexis/Global/Claude_Projects/hackathon_voodoo/tools/analyze_video.py`).

**Dépendance** : Python 3.9+ standard library uniquement (urllib + base64). Aucun SDK à installer.

**Variable d'env** : `OPENROUTER_API_KEY`. Déjà set dans `.env` à la racine du repo (gitignored). Charge avec : `set -a; source .env; set +a` avant de lancer le script.

**Coût indicatif** : ~0.07 $ par appel (vidéo ~1 min, sortie ~5 K tokens). Pas de cap budgétaire strict — utilise Gemini librement quand tu as un doute structurant, c'est plus fiable que ton œil sur un GIF.

**Modèle par défaut** : `google/gemini-3.1-pro-preview` (SOTA Google avril 2026, routé via OpenRouter → Google AI Studio).

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

### Bonnes pratiques OpenRouter pour les vidéos

OpenRouter ne propose **pas** de Files API à la Gemini : la vidéo part inline en base64 dans le payload HTTP. Conséquences pratiques :

1. **Pré-process à 1 fps + 540p AVANT upload — toujours**. Citation Google officielle : *"no hidden benefit to uploading videos with higher frame rates (e.g., 30/60 FPS)"*. Gemini sample en interne à 1 fps quoi qu'on envoie. Uploader en 8 fps coûte ~80 % de tokens vidéo en plus pour zéro gain analytique. Commande type :
   ```bash
   ffmpeg -i clip.mp4 -r 1 -vf "scale=540:-2" -an -c:v libx264 -crf 28 clip_1fps.mp4
   ```
2. **Taille du payload** : la base64 gonfle de ~33 %. Au-delà de ~10 Mo de source, le script recompresse automatiquement en 540p / 1 fps / sans audio. Une vidéo de 60 s passe de ~70 Mo → ~500 Ko. Désactivable avec `--no-light` si tu veux la full-res.
3. **Pas de réutilisation d'upload** : chaque appel repaye les `video_tokens`. Pour itérer sur plusieurs prompts focaux sur la même vidéo, prépare des extraits courts via `ffmpeg -ss MM:SS -t N -c copy SANDBOX/extracts/seg.mp4` puis réutilise-les.
4. **Reasoning obligatoire** sur `gemini-3.1-pro-preview` : OpenRouter renvoie HTTP 400 si tu passes `"reasoning": {"enabled": false}`. Le script garde reasoning activé et dimensionne `max_tokens` à 16000 (ajustable via `--max-tokens`). Si le `finish_reason` revient à `"length"`, monte ce param.
5. **MIME acceptés** : `video/mp4`, `video/mpeg`, `video/mov`, `video/webm`. YouTube URLs aussi acceptées via le provider Google AI Studio (pas Vertex).
6. **Format payload** :
   ```json
   {"type": "video_url", "video_url": {"url": "data:video/mp4;base64,..."}}
   ```
7. **Cap interne ~52 frames analysées par appel**. À 1 fps + clip 60 s → tu touches le cap. Pour clips longs, segmente.

### Hack slow-motion pour révéler les transitions <1 s

À 1 fps, Gemini ne voit pas une transition de 600 ms (elle apparaît comme un cut sec). Pour critiquer du pacing fin (ease, fade, motion blur, micro-dwell), ralentis le clip avant upload :

```bash
# Slow-mo 4× via setpts → 12s deviennent 48s → résolution effective 250 ms
ffmpeg -i clip_1fps.mp4 -filter:v "setpts=4*PTS" -an clip_slow4x.mp4
```

**Quand utiliser quel facteur** :
- `slow-mo 1` (défaut) → vue d'ensemble structure + pacing macro
- `slow-mo 2` → bon compromis : couvre ~6 s réelles avec résolution 500 ms
- `slow-mo 4-6` → uniquement sur clips ultra-courts ciblés (ex: 2 s de transition cinématique, ralenti 6× = analyse 333 ms)

⚠️ Plus tu ralentis, plus tu manges le cap des 52 frames internes Gemini → tu vois moins de durée réelle. À slow-mo 4× sur clip 12 s → seules les ~3 premières secondes réelles sont analysées. Choisis : couverture macro (slow-mo 1) **ou** granularité fine sur segment court (slow-mo 4-6 + clip de 2-3 s).

**Toujours** préciser dans le prompt focal : *"Cette vidéo est ralentie ×N. Divise tous les timestamps observés par N pour les rapporter en temps réel."*

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

**Usage** : audit macro et itération rapide en step 04 / step 5.3. Envoie 2 PNG (référence source + screenshot playable) à `gemini-3.1-pro-preview` via OpenRouter, base64 inline. Sortie : critique structurée écrits / acceptables / bloquants.

**Cost indicatif** : ~0.005 $ par appel (image-only).

```bash
python tools/compare_images.py \
    --ref SANDBOX/frames-ref/ref_00_00.png \
    --ours SANDBOX/frames-prod/phase_intro.png \
    --prompt SANDBOX/prompts/critique-intro.md \
    --out SANDBOX/outputs/critique-intro-pass1.md
```

**Limite connue** : insensible au pacing, transitions, camera state machine. **Ne sert qu'à itérer**, jamais comme gate de livraison. Pour la gate finale, utiliser `compare_clips.py` (voir ci-dessous).

## tools/compare_clips.py — critique clip-vs-clip (gate finale step 5.5)

**Usage** : la **gate** de step 5.5. Envoie 2 clips MP4 (notre playable + extrait source) à Gemini avec un prompt qui demande un scoring segmenté (intro / aim / fire_cinematic / impact / endcard) sur 4 axes (timing, pacing, fidélité visuelle, camera state).

**Cost indicatif** : ~0.05-0.10 $ par appel selon longueur clip. Pas de cap.

```bash
python tools/compare_clips.py \
    --ours SANDBOX/clips/ours_1fps.mp4 \
    --ref  SANDBOX/clips/source_12s_1fps.mp4 \
    --segments intro,aim,fire_cinematic,impact,endcard \
    --cinematic-spec SANDBOX/outputs/cinematic-spec.md \
    --slow-mo 1 \
    --out SANDBOX/outputs/critique-clipclip-passN.md
```

**Sortie attendue** : un score /10 par segment + détail des écarts par axe. Le rapport sert directement de gate : tous segments ≥ 9/10 = passe à 06 ; sinon itère.

**Reco** : pré-process les 2 clips à 1 fps + 540p **avant** appel (voir bloc "Bonnes pratiques OpenRouter pour les vidéos" ci-dessus). Le tool peut le faire en interne via `--auto-preprocess`.

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

Implémentation type : Playwright avec `recordVideo` activé sur le context, navigation vers l'URL, attente de la durée, fermeture → conversion WebM → MP4 via ffmpeg si nécessaire.

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
