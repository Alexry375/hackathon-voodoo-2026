#!/usr/bin/env node
// Record me actually playing the game: waits for INTERIOR_AIM, then drags
// to aim and releases to fire — 3 shots, one per active unit.
//
// Usage:
//   node tools/record_interactive.mjs
//   node tools/record_interactive.mjs --port=8765 --no-analyze
//
// The drag semantics are Angry-Birds-style (drag AWAY from unit to aim):
//   drag down-left → fires up-right.

import { chromium } from 'playwright';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let port = 8765;
let autoAnalyze = true;
let durationAfterLastShot = 6000; // ms to keep recording after the final shot resolves

for (const a of process.argv.slice(2)) {
  if (a.startsWith('--port='))    port = +a.slice(7);
  else if (a === '--no-analyze')  autoAnalyze = false;
}

const URL = `http://localhost:${port}/`;
const SHOTS_DIR = join(REPO_ROOT, 'shots');
if (!existsSync(SHOTS_DIR)) mkdirSync(SHOTS_DIR, { recursive: true });

// Floor anchors computed from castle_section.js constants (tilt=0):
//   C_LEFT=20 C_RIGHT=520  WALL_W=56  INT_LEFT=76  INT_RIGHT=464
//   INT_WIDTH=388  LEDGE_W=round(388*0.42)=163
//   C_TOP=170  C_BOTTOM=820  C_HEIGHT=650
//   FLOOR_Y[f] = C_TOP + round(C_HEIGHT * ratio)
//   FLOOR_SIDE: L, R, L
//
// ledge cx:
//   floor 0 (L): INT_LEFT + LEDGE_W/2  = 76 + 81  = 157
//   floor 1 (R): INT_RIGHT - LEDGE_W + LEDGE_W/2 = 464 - 81 = 383
//   floor 2 (L): same as floor 0 = 157
// floor y:
//   floor 0: 170 + round(650*0.34) = 170+221 = 391
//   floor 1: 170 + round(650*0.58) = 170+377 = 547
//   floor 2: 170 + round(650*0.82) = 170+533 = 703
// unit origin = anchor.y - ORIGIN_LIFT(40)
const FLOORS = [
  { x: 157, y: 391 - 40 },  // floor 0 top  — cyclop
  { x: 383, y: 547 - 40 },  // floor 1 mid  — skeleton
  { x: 157, y: 703 - 40 },  // floor 2 bot  — orc
];

// Drag vector: pull 130px down-left of unit origin → fires upper-right arc.
// Power ≈ 130/200 = 0.65 (FULL_POWER_PX=200), angle ~45°.
const DRAG_DX = -130, DRAG_DY = 130;
const DRAG_STEPS = 18;   // pointer move events
const DRAG_STEP_MS = 16; // ~60fps pointer speed

async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= DRAG_STEPS; i++) {
    const t = i / DRAG_STEPS;
    await page.mouse.move(
      from.x + (to.x - from.x) * t,
      from.y + (to.y - from.y) * t,
    );
    await page.waitForTimeout(DRAG_STEP_MS);
  }
  await page.mouse.up();
}

/** Wait until `window.__game.phase` equals `phase`, polling every 200ms. */
async function waitForPhase(page, phase, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const cur = await page.evaluate(() => /** @type {any} */ (window).__game?.phase);
    if (cur === phase) return;
    await page.waitForTimeout(200);
  }
  throw new Error(`timed out waiting for phase=${phase}`);
}

/** Wait until scene_manager state equals `state`. */
async function waitForState(page, state, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const cur = await page.evaluate(() => {
      const w = /** @type {any} */ (window);
      return w.__sceneState?.() ?? w.__getState?.();
    });
    if (cur === state) return;
    await page.waitForTimeout(150);
  }
  throw new Error(`timed out waiting for state=${state}`);
}

console.error(`[interactive] launching Chromium → ${URL}`);

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(URL, { waitUntil: 'networkidle' });

// Expose getState on window so waitForState can poll it.
await page.evaluate(() => {
  // scene_manager exports are ES modules — we can't reach them directly from
  // the page context. Expose them via the global __game object instead.
  // script.js already sets window.__game; we piggyback on subscribeScene.
  // As a fallback, we'll just use __game.phase.
});

// Inject MediaRecorder on the canvas.
const recStatus = await page.evaluate(() => {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('g'));
  if (!canvas) return 'no-canvas';
  const stream = canvas.captureStream(60);
  const mime =
    MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' :
    'video/webm';
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3_000_000 });
  /** @type {BlobPart[]} */ const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  /** @type {any} */ (window).__rec = rec;
  /** @type {any} */ (window).__chunks = chunks;
  /** @type {any} */ (window).__recMime = mime;
  rec.start(100);
  return 'ok:' + mime;
});
console.error(`[interactive] recorder: ${recStatus}`);

// Brief pause for first paint, then dismiss the intro.
await page.waitForTimeout(600);
console.error('[interactive] tapping intro...');
await page.mouse.click(270, 480);

// Wait for the opening crow wave to finish and INTERIOR_AIM to appear.
console.error('[interactive] waiting for INTERIOR_AIM...');
await waitForPhase(page, 'tutorial', 20000);
// After phase=tutorial the scene starts in EXTERIOR_OBSERVE (crow wave).
// Wait a moment then poll for interior.
await page.waitForTimeout(200);

// We need to detect when we're in INTERIOR_AIM. scene_manager state isn't on
// window, but aim.js is active when pointerdown lands on the unit — just wait
// a fixed period for the exterior wave to finish (~3-5s) then try to aim.
console.error('[interactive] waiting for crow wave to finish (~5s)...');
await page.waitForTimeout(5500);

// Fire 3 shots, one per turn.
for (let shot = 0; shot < 3; shot++) {
  const floorIdx = shot % FLOORS.length;
  const origin = FLOORS[floorIdx];

  console.error(`[interactive] shot ${shot + 1}/3 — floor ${floorIdx} origin (${origin.x}, ${origin.y})`);

  // Aim: drag from unit origin down-left (fires up-right arc toward enemy castle).
  await drag(page, origin, { x: origin.x + DRAG_DX, y: origin.y + DRAG_DY });
  console.error(`[interactive] shot ${shot + 1} fired`);

  // Wait for the exterior scene to play out (projectile flight + impact + enemy
  // attack wave) before the next INTERIOR_AIM. ~4s is generous.
  await page.waitForTimeout(5000);
}

console.error(`[interactive] shots done — recording ${durationAfterLastShot}ms more...`);
await page.waitForTimeout(durationAfterLastShot);

// Extract recording.
const videoB64 = await page.evaluate(() => {
  return new Promise((resolve) => {
    const w = /** @type {any} */ (window);
    w.__rec.onstop = () => {
      const blob = new Blob(w.__chunks, { type: w.__recMime });
      const reader = new FileReader();
      reader.onloadend = () => resolve(/** @type {string} */ (reader.result).split(',')[1]);
      reader.readAsDataURL(blob);
    };
    w.__rec.stop();
  });
});

await browser.close();

if (!videoB64 || videoB64.length < 2000) {
  console.error('[interactive] recording too short/empty');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outWebm = join(SHOTS_DIR, `interactive_${timestamp}.webm`);
writeFileSync(outWebm, Buffer.from(videoB64, 'base64'));
const sizeMb = (Buffer.byteLength(videoB64, 'base64') / 1024 / 1024).toFixed(2);
console.error(`[interactive] saved → ${outWebm} (${sizeMb} MB)`);

if (errors.length) {
  console.error('[interactive] page errors:');
  errors.forEach(e => console.error('  ', e));
}

if (!autoAnalyze) { console.log(outWebm); process.exit(0); }

const question = 'This is a recording of me playing the game. Describe what you see second by second: the opening crow attack, the aim gesture, the projectile flight, the impact. Does the mechanic feel responsive? Are any visual elements broken or missing?';
const outMd = outWebm.replace('.webm', '_analysis.md');

console.error('[interactive] piping to ask_video.mjs...');
const r = spawnSync(
  'node',
  [join(REPO_ROOT, 'tools/ask_video.mjs'), question, `--video=${outWebm}`, `--out=${outMd}`],
  { stdio: ['ignore', 'inherit', 'inherit'], cwd: REPO_ROOT },
);

console.error(`[interactive] analysis → ${outMd}`);
console.log(outWebm);
process.exit(r.status ?? 0);
