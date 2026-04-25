# Outils disponibles

> Outils pré-installés ou à copier au démarrage. Utilise-les avant de réinventer la roue.

---

## tools/analyze_video.py — appel Gemini sur vidéo

**Source** : copié depuis le repo parent (`/home/alexis/Global/Claude_Projects/hackathon_voodoo/tools/analyze_video.py`).

**Dépendance Python** : `google-genai` (`pip install --user google-genai`)

**Variable d'env** : `GEMINI_API_KEY` (ou `GOOGLE_API_KEY`)

**Usage** :

```bash
# Analyse complète, prompt par défaut (synthèse game design 2 passes)
python tools/analyze_video.py input/<jeu>/input/source.mp4 \
    --out SANDBOX/outputs/full.report.md \
    --fps 2

# Avec prompt custom focal — RECOMMANDÉ pour les checks ciblés
python tools/analyze_video.py SANDBOX/extracts/seg.mp4 \
    --prompt SANDBOX/prompts/check-mecanique-X.md \
    --out SANDBOX/outputs/check-mecanique-X.report.md \
    --fps 4 \
    --model gemini-3.1-pro-preview
```

**Note** : le upload vidéo prend ~10-30s + génération ~30-60s. Économise les appels en faisant des extraits courts.

## tools/prompt_playable_v2.md — prompt Gemini par défaut

**Source** : copié depuis le repo parent.

C'est le prompt à 2 passes (chronologique seconde-par-seconde + synthèse game design 14 sections). Utilisé par défaut par `analyze_video.py`. Tu peux écrire des prompts focaux plus courts pour des checks ciblés.

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
