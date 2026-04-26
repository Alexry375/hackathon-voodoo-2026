#!/usr/bin/env node
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

async function main() {
  const entries = await readdir(HERE);
  const variations = [];

  for (const name of entries) {
    const dir = join(HERE, name);
    const s = await stat(dir).catch(() => null);
    if (!s || !s.isDirectory()) continue;

    const metaPath = join(dir, 'meta.json');
    const meta = await readFile(metaPath, 'utf8').catch(() => null);
    if (!meta) continue;

    const parsed = JSON.parse(meta);
    variations.push({ ...parsed, dir: name });
  }

  variations.sort((a, b) => (a.id || '').localeCompare(b.id || '', undefined, { numeric: true }));

  const manifest = { generated_at: new Date().toISOString(), variations };
  await writeFile(join(HERE, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`manifest.json: ${variations.length} variation(s)`);
}

main().catch(e => { console.error(e); process.exit(1); });
