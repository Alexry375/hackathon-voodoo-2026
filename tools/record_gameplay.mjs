#!/usr/bin/env node
// Record a full gameplay session of the playable ad as a .webm file.
// Uses Playwright Chromium + canvas.captureStream() + MediaRecorder.
//
// Steps:
//   1. Launch headless Chromium on the dev server (default :8765)
//   2. Inject a MediaRecorder on the canvas before the game ticks
//   3. Simulate the intro tap to start the game
//   4. Wait for the timeline to complete (~DURATION_MS)
//   5. Write shots/gameplay_TIMESTAMP.webm
//   6. Optionally pipe to ask_video.mjs for Gemini analysis
//
// Usage:
//   node tools/record_gameplay.mjs
//   node tools/record_gameplay.mjs --port=8765 --duration=25000
//   node tools/record_gameplay.mjs --no-analyze     (skip the Gemini pipe)
//   node tools/record_gameplay.mjs --question="describe the full game flow"
//
// Requires: playwright (`npm i -D playwright`), dev server running on --port.

import { chromium } from 'playwright';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// --- CLI args ---
let port = 8765;
let durationMs = 26000; // full timeline (~19s) + 7s buffer for endcard anim
let autoAnalyze = true;
let question = 'Walk through the full game flow second by second: intro overlay, opening crow attack, aim mechanic, projectile flight, impact, and endcard. Cite timestamps for each event.';

for (const a of process.argv.slice(2)) {
  if (a.startsWith('--port='))      port = +a.slice(7);
  else if (a.startsWith('--duration=')) durationMs = +a.slice(11);
  else if (a === '--no-analyze')    autoAnalyze = false;
  else if (a.startsWith('--question=')) question = a.slice(11);
}

const URL = `http://localhost:${port}/`;
const SHOTS_DIR = join(REPO_ROOT, 'shots');
if (!existsSync(SHOTS_DIR)) mkdirSync(SHOTS_DIR, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outWebm = join(SHOTS_DIR, `gameplay_${timestamp}.webm`);

console.error(`[record] launching Chromium → ${URL}`);
console.error(`[record] duration: ${durationMs}ms`);

const browser = await chromium.launch({
  // These flags enable canvas capture + fake media in headless.
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--disable-web-security',          // allow captureStream in headless
    '--allow-running-insecure-content',
  ],
});

const page = await browser.newPage({ viewport: { width: 540, height: 960 } });

const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('console.error: ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle' });

// Inject the MediaRecorder BEFORE the game loop has time to settle, so we
// capture from the very first frame.
const recordingStarted = await page.evaluate(() => {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('g'));
  if (!canvas) return 'no canvas';

  const stream = canvas.captureStream(60);
  const supportedType =
    MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' :
    MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' :
    'video/webm';

  const rec = new MediaRecorder(stream, {
    mimeType: supportedType,
    videoBitsPerSecond: 2_500_000,
  });
  /** @type {BlobPart[]} */
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  // Expose chunks + recorder on window for extraction after the run.
  /** @type {any} */ (window).__recorder = rec;
  /** @type {any} */ (window).__recordingChunks = chunks;
  /** @type {any} */ (window).__recordingMime = supportedType;

  rec.start(100); // 100ms timeslice so data accumulates throughout
  return 'ok:' + supportedType;
});

console.error(`[record] MediaRecorder: ${recordingStarted}`);

// Simulate the intro tap after a short delay (let the first paint happen).
await page.waitForTimeout(400);
await page.mouse.click(270, 480); // centre of canvas
console.error('[record] tapped intro → game started');

// Wait for the full scripted timeline to play out.
console.error(`[record] recording for ${durationMs}ms…`);
await page.waitForTimeout(durationMs);

// Stop recording and extract the video data as base64.
const videoBase64 = await page.evaluate(() => {
  return new Promise((resolve) => {
    const w = /** @type {any} */ (window);
    const rec = w.__recorder;
    const chunks = w.__recordingChunks;
    const mime = w.__recordingMime || 'video/webm';

    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = /** @type {string} */ (reader.result);
        resolve(dataUrl.split(',')[1]); // strip "data:video/webm;base64,"
      };
      reader.readAsDataURL(blob);
    };
    rec.stop();
  });
});

await browser.close();

if (!videoBase64 || videoBase64.length < 1000) {
  console.error('[record] ERROR: recording too short or empty');
  process.exit(1);
}

writeFileSync(outWebm, Buffer.from(videoBase64, 'base64'));
const sizeMb = (Buffer.byteLength(videoBase64, 'base64') / 1024 / 1024).toFixed(2);
console.error(`[record] saved → ${outWebm} (${sizeMb} MB)`);

if (consoleErrors.length) {
  console.error('[record] page errors during recording:');
  for (const e of consoleErrors) console.error('  ', e);
}

// --- Auto-analyze with ask_video.mjs ---
if (!autoAnalyze) {
  console.log(outWebm);
  process.exit(0);
}

console.error(`[record] piping to ask_video.mjs — question: "${question}"`);
const outMd = outWebm.replace('.webm', '_analysis.md');

const result = spawnSync(
  'node',
  [
    join(REPO_ROOT, 'tools/ask_video.mjs'),
    question,
    `--video=${outWebm}`,
    `--out=${outMd}`,
  ],
  { stdio: ['ignore', 'inherit', 'inherit'], cwd: REPO_ROOT }
);

if (result.status !== 0) {
  console.error(`[record] ask_video.mjs exited with status ${result.status}`);
  console.error('[record] webm still available at:', outWebm);
  process.exit(result.status ?? 1);
}

console.error(`[record] analysis saved → ${outMd}`);
console.log(outWebm);
