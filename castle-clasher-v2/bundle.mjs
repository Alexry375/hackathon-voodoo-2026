// Inlines assets-inline.js + draws-inline.js into playable.html → playable-bundle.html (single file).
// Run: `node bundle.mjs`. Re-run after any change to playable.html or its scripts.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, 'playable.html');
const DST = resolve(__dirname, 'playable-bundle.html');

let html = readFileSync(SRC, 'utf8');
const inlineScript = (relPath) => {
  const code = readFileSync(resolve(__dirname, relPath), 'utf8');
  // Replace `<script src="X"></script>` with `<script>...code...</script>`
  const pattern = new RegExp(`<script src="${relPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"></script>`, 'g');
  if (!pattern.test(html)) console.warn(`  WARN: pattern not found for ${relPath}`);
  html = html.replace(pattern, `<script>\n${code}\n</script>`);
};

inlineScript('assets-inline.js');
inlineScript('draws-inline.js');

writeFileSync(DST, html);
const sz = statSync(DST).size;
console.log(`  ${(sz / 1024 / 1024).toFixed(2)} MB → ${DST}`);
