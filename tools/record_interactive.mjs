#!/usr/bin/env node
// Record me actually playing the game.
//
// Each shot:
//   1. Polls window.__sceneState() until INTERIOR_AIM — guaranteed on the right frame.
//   2. Reads window.__getActiveFloor() to know which unit is active.
//   3. Computes the unit's canvas origin from castle_section constants.
//   4. Performs a real pointer drag gesture (Angry-Birds-style: drag away to aim).
//   5. Releases — triggers aim.js _onUp → emit('player_fire') → full resolution cycle.
//   6. Waits for state to leave INTERIOR_AIM (exterior resolves) then loops.
//
// Usage:
//   node tools/record_interactive.mjs
//   node tools/record_interactive.mjs --port=8765 --shots=3 --no-analyze

import { chromium } from 'playwright';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let port        = 8765;
let totalShots  = 3;
let autoAnalyze = true;

for (const a of process.argv.slice(2)) {
  if (a.startsWith('--port='))   port = +a.slice(7);
  else if (a.startsWith('--shots=')) totalShots = +a.slice(8);
  else if (a === '--no-analyze') autoAnalyze = false;
}

const URL = `http://localhost:${port}/`;
const SHOTS_DIR = join(REPO_ROOT, 'shots');
if (!existsSync(SHOTS_DIR)) mkdirSync(SHOTS_DIR, { recursive: true });

// Static fallback anchors — only used if window.__getFloorAnchor is unavailable.
// Derived from castle_section.js constants at zero tilt:
//   floor 0 (top,  Left):  cx=157, y=351
//   floor 1 (mid,  Right): cx=383, y=507
//   floor 2 (bot,  Left):  cx=157, y=663
const FLOOR_ORIGIN_FALLBACK = {
  0: { x: 157, y: 351 },
  1: { x: 383, y: 507 },
  2: { x: 157, y: 663 },
};

// Drag vector: pull back and down from unit origin.
// Angry-Birds semantics: drag DOWN-LEFT → fires UP-RIGHT arc toward red castle.
// Need power ≈ 0.9 at angle ≈ 60° to clear the 760 world-unit gap to red castle.
// FULL_POWER_PX=200 → magnitude 180px. dx=-90 (cos60°*180), dy=156 (sin60°*180).
const PULL = { dx: -90, dy: 156 };
const DRAG_STEPS    = 20;
const DRAG_STEP_MS  = 14;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TERMINAL_STATES = new Set(['END_VICTORY', 'END_DEFEAT']);

async function pollState(page, target, timeoutMs = 18000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => /** @type {any} */ (window).__sceneState?.());
    if (s === target) return;
    if (TERMINAL_STATES.has(s)) throw Object.assign(new Error(`Game ended: ${s}`), { terminal: true });
    await page.waitForTimeout(120);
  }
  throw new Error(`Timeout waiting for sceneState=${target}`);
}

async function pollStateNot(page, current, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => /** @type {any} */ (window).__sceneState?.());
    if (s !== current) return s;
    await page.waitForTimeout(120);
  }
  throw new Error(`Timeout: state stuck at ${current}`);
}

async function getActiveFloor(page) {
  return page.evaluate(() => /** @type {any} */ (window).__getActiveFloor?.());
}

async function fireShot(page, shotNum) {
  // Wait until the game is ready for player input.
  console.error(`[interactive] shot ${shotNum}: waiting for INTERIOR_AIM…`);
  await pollState(page, 'INTERIOR_AIM');

  // Brief settle so the interior scene finishes its entrance render.
  await page.waitForTimeout(350);

  const floor = await getActiveFloor(page);
  if (floor === null) {
    console.error(`[interactive] shot ${shotNum}: all units dead, skipping`);
    return false;
  }

  // Prefer live tilt-adjusted anchor from the game; fall back to static constants.
  const liveOrigin = await page.evaluate((f) => /** @type {any} */ (window).__getFloorAnchor?.(f) ?? null, floor);
  const origin = liveOrigin ?? FLOOR_ORIGIN_FALLBACK[floor];
  if (!origin) {
    console.error(`[interactive] shot ${shotNum}: unknown floor ${floor}, skipping`);
    return false;
  }
  console.error(`[interactive] shot ${shotNum}: anchor source=${liveOrigin ? 'live' : 'fallback'} origin=(${origin.x.toFixed(1)},${origin.y.toFixed(1)})`);

  const dragTo = { x: origin.x + PULL.dx, y: origin.y + PULL.dy };
  console.error(`[interactive] shot ${shotNum}: floor=${floor} origin=(${origin.x},${origin.y}) → drag to (${dragTo.x},${dragTo.y})`);

  // Perform the pointer drag: down → move (smooth arc) → up.
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  for (let i = 1; i <= DRAG_STEPS; i++) {
    const t = i / DRAG_STEPS;
    await page.mouse.move(
      origin.x + PULL.dx * t,
      origin.y + PULL.dy * t,
    );
    await page.waitForTimeout(DRAG_STEP_MS);
  }
  await page.mouse.up();

  console.error(`[interactive] shot ${shotNum}: released — waiting for EXTERIOR_RESOLVE…`);

  // Confirm the shot registered: state should quickly leave INTERIOR_AIM.
  // Allow up to 5s — the drag fires player_fire which transitions sync to EXTERIOR_RESOLVE.
  const next = await pollStateNot(page, 'INTERIOR_AIM', 5000);
  console.error(`[interactive] shot ${shotNum}: state → ${next}`);
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.error(`[interactive] launching Chromium → ${URL}`);

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });

const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(URL, { waitUntil: 'networkidle' });

// Inject MediaRecorder before any frames render.
const recStatus = await page.evaluate(() => {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('g'));
  if (!canvas) return 'no-canvas';
  const stream = canvas.captureStream(60);
  const mime =
    MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3_000_000 });
  /** @type {BlobPart[]} */ const chunks = [];
  rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  /** @type {any} */ (window).__rec = rec;
  /** @type {any} */ (window).__chunks = chunks;
  /** @type {any} */ (window).__recMime = mime;
  rec.start(100);
  return 'ok:' + mime;
});
console.error(`[interactive] recorder: ${recStatus}`);

// Wait to capture the intro crow pan cinematic before tapping.
await page.waitForTimeout(500);
console.error('[interactive] tapping intro…');
await page.mouse.click(270, 480);

// Fire shots. Between shots we just wait for INTERIOR_AIM again — the game
// handles the EXTERIOR_OBSERVE enemy wave automatically.
// If a terminal state (END_VICTORY / END_DEFEAT) is reached mid-loop, stop gracefully.
let fired = 0;
for (let i = 1; i <= totalShots; i++) {
  try {
    const ok = await fireShot(page, i);
    if (ok) fired++;
  } catch (e) {
    if (e.terminal) {
      console.error(`[interactive] game ended (${e.message}) after ${fired} shots — stopping`);
      break;
    }
    throw e;
  }
}

// Let the last exterior resolution + endcard animate.
console.error(`[interactive] ${fired}/${totalShots} shots fired — recording 6s more…`);
await page.waitForTimeout(6000);

// Extract video.
const videoB64 = await page.evaluate(() => new Promise(resolve => {
  const w = /** @type {any} */ (window);
  w.__rec.onstop = () => {
    const blob = new Blob(w.__chunks, { type: w.__recMime });
    const reader = new FileReader();
    reader.onloadend = () => resolve(/** @type {string} */ (reader.result).split(',')[1]);
    reader.readAsDataURL(blob);
  };
  w.__rec.stop();
}));

await browser.close();

if (!videoB64 || videoB64.length < 2000) {
  console.error('[interactive] recording too short/empty'); process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outWebm   = join(SHOTS_DIR, `interactive_${timestamp}.webm`);
writeFileSync(outWebm, Buffer.from(videoB64, 'base64'));
const sizeMb = (Buffer.byteLength(videoB64, 'base64') / 1024 / 1024).toFixed(2);
console.error(`[interactive] saved → ${outWebm} (${sizeMb} MB)`);

if (errors.length) {
  console.error('[interactive] page errors:');
  errors.forEach(e => console.error('  ', e));
}

if (!autoAnalyze) { console.log(outWebm); process.exit(0); }

const question = 'Walk through the recording second by second. Describe: (1) the opening crow attack and castle damage, (2) the aim drag gesture — does the dotted line appear and track the drag?, (3) the projectile launch and flight arc, (4) the impact on the red castle, (5) any visual issues.';
const outMd = outWebm.replace('.webm', '_analysis.md');

console.error('[interactive] piping to ask_video.mjs…');
const r = spawnSync(
  'node',
  [join(REPO_ROOT, 'tools/ask_video.mjs'), question, `--video=${outWebm}`, `--out=${outMd}`],
  { stdio: ['ignore', 'inherit', 'inherit'], cwd: REPO_ROOT },
);
console.error(`[interactive] analysis → ${outMd}`);
console.log(outWebm);
process.exit(r.status ?? 0);
