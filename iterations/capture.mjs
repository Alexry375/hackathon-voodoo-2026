#!/usr/bin/env node
// Capture thumbnail.png pour chaque iterations/V*/playable.html
// Usage : node iterations/capture.mjs            -> toutes les variations sans thumbnail
//         node iterations/capture.mjs V1 V3      -> ces variations seulement
//         node iterations/capture.mjs --force    -> regen toutes
//
// Requiert un serveur statique sur :8765 (npm run dev) — playable.html chargé via http
// pour que les imports modules fonctionnent.

import { chromium } from 'playwright';
import { readdir, stat, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8765';
const CAPTURE_AT_MS = parseInt(process.env.CAPTURE_AT_MS || '2500', 10);
const VIEWPORT = { width: 540, height: 960 };

async function listVariations() {
  const all = await readdir(HERE);
  const out = [];
  for (const name of all) {
    const s = await stat(join(HERE, name)).catch(() => null);
    if (!s || !s.isDirectory()) continue;
    const hasPlayable = await access(join(HERE, name, 'playable.html')).then(() => true, () => false);
    if (hasPlayable) out.push(name);
  }
  return out;
}

async function capture(browser, name, force) {
  const thumbPath = join(HERE, name, 'thumbnail.png');
  if (!force) {
    const exists = await access(thumbPath).then(() => true, () => false);
    if (exists) { console.log(`skip ${name} (thumbnail exists)`); return; }
  }
  const url = `${BASE_URL}/iterations/${name}/playable.html`;
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  console.log(`capture ${name} <- ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(CAPTURE_AT_MS);
  await page.screenshot({ path: thumbPath, fullPage: false });
  await ctx.close();
  console.log(`  -> ${thumbPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const wanted = args.filter(a => !a.startsWith('--'));
  const variations = wanted.length ? wanted : await listVariations();

  const browser = await chromium.launch();
  try {
    for (const name of variations) await capture(browser, name, force);
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
