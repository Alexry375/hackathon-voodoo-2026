// Bundle pipeline: assets-inline.js (regen if stale) → esbuild ESM bundle →
// inline everything into dist/_template.html → dist/playable.html.
// Run: `npm run build` (or `node tools/build.mjs`).

import { readFileSync, writeFileSync, statSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SIZE_LIMIT_BYTES = 4.8 * 1024 * 1024; // 5 MB AppLovin cap, 200 KB safety margin

// 1. Regen assets-inline.js if any source asset is newer.
const ASSETS_OUT = resolve(ROOT, 'assets-inline.js');
const SOURCE_DIRS = ['RESSOURCES/characters_png', 'RESSOURCES/assets_unpack', 'RESSOURCES/ref_frames'];
const needRegen = !existsSync(ASSETS_OUT)
  || SOURCE_DIRS.some((d) => {
    try {
      const abs = resolve(ROOT, d);
      if (!existsSync(abs)) return false;
      const outMtime = statSync(ASSETS_OUT).mtimeMs;
      return readdirSync(abs).some((f) => statSync(resolve(abs, f)).mtimeMs > outMtime);
    } catch { return false; }
  });
if (needRegen) {
  console.log('· regen assets-inline.js');
  const r = spawnSync('node', ['tools/embed-assets.mjs'], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
} else {
  console.log('· assets-inline.js up to date');
}

// 2. esbuild bundle.
console.log('· esbuild playable/entry.js');
const result = await esbuild.build({
  entryPoints: [resolve(ROOT, 'playable/entry.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  platform: 'browser',
  target: ['es2020'],
  write: false,
  legalComments: 'none',
});
const bundleJs = result.outputFiles[0].text;
console.log(`  bundle: ${(bundleJs.length / 1024).toFixed(1)} KB`);

// 3. Read template + payloads.
const template = readFileSync(resolve(ROOT, 'dist/_template.html'), 'utf8');
const vsdkShim = readFileSync(resolve(ROOT, 'playable/vsdk_shim.js'), 'utf8');
const assetsInline = readFileSync(ASSETS_OUT, 'utf8');

// 4. Inline. Order: VSDK shim (sets window.Voodoo) → assets (sets window.ASSETS) → bundle.
// IMPORTANT: pass replacements as functions, not strings, otherwise `$&` /
// `$'` / `$\`` inside the JS payload (e.g. `t!==$&&(...)` from minified
// esbuild output) get expanded as backreferences and corrupt the bundle.
let html = template
  .replace('<!--VSDK_SHIM-->', () => `<script>\n${vsdkShim}\n</script>`)
  .replace('<!--ASSETS-->', () => `<script>\n${assetsInline}\n</script>`)
  .replace('<!--BUNDLE-->', () => `<script>\n${bundleJs}\n</script>`);

// 5. Naive HTML minify (strip HTML comments + collapse whitespace OUTSIDE script/style).
html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/\n\s*\n/g, '\n');

// 6. Write + size gate.
const outPath = resolve(ROOT, 'dist/playable.html');
writeFileSync(outPath, html);
const sz = statSync(outPath).size;
const mb = (sz / 1024 / 1024).toFixed(2);
console.log(`✓ ${mb} MB → ${outPath}`);
if (sz > SIZE_LIMIT_BYTES) {
  console.error(`✗ size ${mb} MB exceeds AppLovin safety cap ${(SIZE_LIMIT_BYTES / 1024 / 1024).toFixed(2)} MB`);
  process.exit(1);
}
