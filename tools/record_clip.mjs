#!/usr/bin/env node
// record_clip.mjs — capture a Playwright video of the playable for compare_clips.py.
// Usage:
//   node tools/record_clip.mjs --url http://localhost:8765/dist/playable.html \
//        --duration 12 --viewport 540x960 --out SANDBOX/clips/ours.mp4
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, renameSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : d;
};
const url = arg('--url', 'http://localhost:8765/dist/playable.html');
const duration = parseFloat(arg('--duration', '12'));
const [vw, vh] = arg('--viewport', '540x960').split('x').map(Number);
const out = resolve(arg('--out', 'SANDBOX/clips/ours.mp4'));

mkdirSync(dirname(out), { recursive: true });
const tmpDir = resolve('SANDBOX/.video_tmp');
if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: vw, height: vh },
  recordVideo: { dir: tmpDir, size: { width: vw, height: vh } },
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e));
page.on('console', (m) => {
  if (m.type() === 'error') errs.push('console: ' + m.text());
});

await page.goto(url, { waitUntil: 'networkidle' });

// Simulate a user drag-release on the canvas to advance the scripted ad past
// the tutorial gate (which waits for shotsFired >= 2 or 22 s timeout).
async function dragFire(startX, startY, endX, endY) {
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(startX + (endX - startX) * t, startY + (endY - startY) * t);
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(150);
  await page.mouse.up();
}

const skipTaps = argv.includes('--no-taps');
if (!skipTaps) {
  // tutorial window starts ~T+4500ms. Use exposed __simulateFire to advance
  // the scripted ad past the tutorial gate (shotsFired >= 2).
  await page.waitForTimeout(6000);
  await page.evaluate(() => /** @type {any} */ (window).__simulateFire?.(55, 0.95));
  await page.waitForTimeout(5500); // wait for cinematic ping-pong + cut_to_interior
  await page.evaluate(() => /** @type {any} */ (window).__simulateFire?.(60, 0.98));
  const remainingMs = Math.max(0, duration * 1000 - 11500);
  await page.waitForTimeout(remainingMs);
} else {
  await page.waitForTimeout(duration * 1000);
}
await page.close();
await ctx.close();
await browser.close();

const webm = readdirSync(tmpDir).find((f) => f.endsWith('.webm'));
if (!webm) {
  console.error('no webm produced');
  process.exit(1);
}
const webmPath = resolve(tmpDir, webm);

if (out.endsWith('.mp4')) {
  const r = spawnSync('ffmpeg', [
    '-y', '-i', webmPath,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an',
    '-loglevel', 'error', out,
  ], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
  rmSync(webmPath);
} else {
  renameSync(webmPath, out);
}
rmSync(tmpDir, { recursive: true, force: true });
console.log(`[record] ${out}`);
if (errs.length) console.log('errors:', errs);
