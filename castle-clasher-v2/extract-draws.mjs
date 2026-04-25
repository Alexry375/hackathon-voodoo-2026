// Extracts the <script> bodies from each showcase HTML, removes the showcase-only render code at the bottom,
// and concatenates everything into draws-inline.js.
// The showcase scripts each end with a "// ---- render the cells" or composite section — we cut at the
// first `// ===` separator that introduces showcase-rendering, OR keep all globals if the showcase wraps cleanly.
//
// In practice, the showcases were authored to expose their drawX() at the top of their <script> block, then
// followed by a "render the X cells" loop. So we want to keep top-level functions and constants, but strip
// the bottom portion that calls getElementById('cN') (which doesn't exist in playable.html).
//
// Strategy: read full <script> body, split on `// ---- render` (or similar), keep first half. Manual review
// per file because each was authored independently.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOW = resolve(__dirname, 'showcase');

function pullScriptBody(file) {
  const html = readFileSync(resolve(SHOW, file), 'utf8');
  // Take the LAST <script> block (the showcases all have it at the bottom of body, may have an early one for ASSETS)
  const matches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
  if (matches.length === 0) throw new Error(`no <script> in ${file}`);
  return matches[matches.length - 1][1];
}

// Each entry: [filename, headerComment, regexes-or-strings to cut out]
// Cut points are markers AFTER which the rest of the script is showcase-only (calls to getElementById, etc.)
// We split on the first matching marker and keep everything BEFORE it.
// Each section: { file, header, cutBefore, expose:[...] } — `expose` is the array of identifiers to lift onto window
const SOURCES = [
  {
    file: 'fx-explosion.html',
    header: '// ============== fx-explosion ==============',
    cutBefore: [/^\s*\/\/ ---- render/m, /^\s*const lifeFracs/m, /^\s*\/\/ ---- composite/m],
    expose: ['drawExplosion', 'drawExplosionBig', 'drawExplosionSmall', 'rng'],
  },
  {
    file: 'fx-chunks.html',
    header: '// ============== fx-chunks ==============',
    cutBefore: [/^\s*\/\/ ---- render/m, /^\s*const lifeFracs/m, /^\s*\/\/ Render/m, /^\s*function renderShowcase/m],
    expose: ['drawChunk'],
  },
  {
    file: 'fx-projectile.html',
    header: '// ============== fx-projectile ==============',
    cutBefore: [/^\s*\/\/ ---- render/m, /^\s*const lifeFracs/m, /^\s*\/\/ Render/m, /^\s*function renderShowcase/m],
    expose: ['drawProjectile'],
  },
  {
    file: 'fx-damage.html',
    header: '// ============== fx-damage ==============',
    cutBefore: [/^\s*\/\/ ---- render/m, /^\s*\/\/ Render/m, /^\s*function renderShowcase/m, /^\s*const lifeFracs/m, /^\s*function fillCanvas/m],
    expose: ['drawDamage'],
  },
  {
    file: 'castle-damaged.html',
    header: '// ============== castle-damaged ==============',
    cutBefore: [/^\s*\/\/ ---- render/m, /^\s*\/\/ Render/m, /^\s*function renderShowcase/m, /^\s*async function/m],
    expose: ['drawCastle', 'CASTLE_IMG'],
  },
  {
    file: 'scene-decor.html',
    header: '// ============== scene-decor ==============',
    cutBefore: [/^\s*\/\/ ---- render/m, /^\s*\/\/ Render/m, /^\s*function renderShowcase/m, /^\s*async function/m, /^\s*loadBackground/m],
    expose: ['drawParallax', 'drawParallaxGreen', 'drawTracks'],
  },
  {
    file: 'ui-deck-hud.html',
    header: '// ============== ui-deck-hud ==============',
    cutBefore: [/^\s*\/\/ ---- render/m, /^\s*\/\/ Render/m, /^\s*function renderShowcase/m, /^\s*async function/m],
    expose: ['drawCard', 'drawHud', 'PORTRAITS'],
  },
  {
    file: 'end-card.html',
    header: '// ============== end-card ==============',
    cutBefore: [/^\s*\/\/ ---- render/m, /^\s*\/\/ Render/m, /^\s*function renderShowcase/m, /^\/\/ Victory scene/m, /^\/\/ Pulse animation/m],
    expose: ['drawEndCard', 'getCtaRect', 'drawCtaButton'],
  },
];

let out = '// AUTO-EXTRACTED from showcases by extract-draws.mjs — do not edit by hand.\n// Each section is wrapped in an IIFE for scope isolation. Public APIs are lifted onto window.\n\n';

for (const { file, header, cutBefore, expose } of SOURCES) {
  let body = pullScriptBody(file);
  // find the first matching cut marker, take only what's before
  let cutIdx = body.length;
  for (const re of cutBefore) {
    const m = body.match(re);
    if (m && m.index !== undefined && m.index < cutIdx) cutIdx = m.index;
  }
  body = body.slice(0, cutIdx).trimEnd();
  // remove showcase-specific BG_PATH absolute paths that won't work in playable.html context
  body = body.replace(/file:\/\/[^'"`\s]+/g, ''); // neutralize hardcoded file:// paths
  // Wrap in IIFE and expose
  const exposeLines = expose.map(name => `  window.${name} = typeof ${name} !== 'undefined' ? ${name} : window.${name};`).join('\n');
  out += `${header}\n(function(){\n'use strict';\n${body}\n${exposeLines}\n})();\n\n`;
}

writeFileSync(resolve(__dirname, 'draws-inline.js'), out);
const lines = out.split('\n').length;
console.log(`  ${lines} lines → draws-inline.js (${(out.length / 1024).toFixed(1)} KB)`);
