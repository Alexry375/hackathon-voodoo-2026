// Record a video clip of our playable for Gemini pacing critique.
// Outputs webm (Playwright native) → ffmpeg → mp4 540p.
//
// Timeline (≈12s):
//   0-3000   opening cinematic (enemy bomb)
//   3000-5000 tutorial hand
//   5000     scripted drag-fire
//   5000-10000 fire→cut_enemy→impact→cut_ours→incoming
//   10000-12000 forced endcard glance
//
// Usage:
//   node SANDBOX/scripts/record_clip.mjs [out.mp4]

import { chromium } from 'playwright';
import { mkdirSync, existsSync, renameSync, rmSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';

const URL = 'http://127.0.0.1:8765/dist/playable.html';
const OUT_MP4 = process.argv[2] || 'input/B01_castle_clashers/SANDBOX/extracts/playable_clip.mp4';
const TMP_DIR = 'input/B01_castle_clashers/SANDBOX/extracts/_rec_tmp';

mkdirSync(dirname(OUT_MP4), { recursive: true });
if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true });
mkdirSync(TMP_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 540, height: 960 },
  recordVideo: { dir: TMP_DIR, size: { width: 540, height: 960 } },
});
const page = await context.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

await page.goto(URL, { waitUntil: 'networkidle' });

// Opening cinematic + tutorial wait
await page.waitForTimeout(5200);

// Scripted drag-fire (interior aim) — slowed for readability per Gemini P3
await page.mouse.move(410, 530);
await page.waitForTimeout(220);
await page.mouse.down();
await page.mouse.move(240, 700, { steps: 30 });
await page.waitForTimeout(420);
await page.mouse.up();

// Full fire→pan→phase2→impact→dwell→zoom (no riposte)
await page.waitForTimeout(5000);

// Force endcard for last 2s
await page.evaluate(() => /** @type {any} */ (window).__forcePhase('endcard'));
await page.waitForTimeout(2000);

await page.close();
await context.close();
await browser.close();

// Locate the recorded webm
const webms = readdirSync(TMP_DIR).filter((f) => f.endsWith('.webm'));
if (!webms.length) {
  console.error('no webm produced');
  process.exit(1);
}
const webm = join(TMP_DIR, webms[0]);

// Convert to mp4 540p / 1fps / mute — Gemini samples at 1fps internally,
// higher fps wastes payload (Google AI Forum reco).
const ff = spawnSync('ffmpeg', [
  '-y', '-i', webm,
  '-vf', 'scale=540:-2', '-r', '1', '-an',
  '-c:v', 'libx264', '-crf', '28', '-preset', 'veryfast',
  OUT_MP4,
], { stdio: 'inherit' });

rmSync(TMP_DIR, { recursive: true, force: true });

if (ff.status !== 0) process.exit(ff.status || 1);
if (errors.length) {
  console.error('--- console/page errors:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log(`done → ${OUT_MP4}`);
