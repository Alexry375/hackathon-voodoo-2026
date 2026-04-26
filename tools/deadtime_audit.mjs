#!/usr/bin/env node
// deadtime_audit.mjs — record a 30s playthrough, sample frames every 200ms,
// compute per-frame pixel-diff, and report any windows where consecutive
// frames are near-identical for ≥500ms (= dead time).
//
// Usage: `node tools/deadtime_audit.mjs` (assumes dev server on :8765 OR
// uses file:// directly).
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'SANDBOX/deadtime');
const FRAME_DIR = resolve(OUT_DIR, 'frames');
const VIDEO_OUT = resolve(OUT_DIR, 'playthrough.mp4');
const URL = 'file://' + resolve(ROOT, 'dist/playable.html');
const DURATION_S = 30;
const SAMPLE_MS = 200;

if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(FRAME_DIR, { recursive: true });

const browser = await chromium.launch();
const tmpVid = resolve(OUT_DIR, '.video');
mkdirSync(tmpVid, { recursive: true });
const ctx = await browser.newContext({
  viewport: { width: 540, height: 960 },
  recordVideo: { dir: tmpVid, size: { width: 540, height: 960 } },
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle' });

// Also screenshot every SAMPLE_MS for the audit, in parallel with video record.
const startT = Date.now();
const frames = [];
let nextFire = 11000;
let fireIdx = 0;
const FIRE_ANGLES = [55, 60, 50];
const FIRE_POWER = [0.95, 0.98, 0.92];
while (Date.now() - startT < DURATION_S * 1000) {
  const elapsed = Date.now() - startT;
  // Auto-fire at 11s/22s/33s to push past tutorial.
  if (elapsed >= nextFire && fireIdx < FIRE_ANGLES.length) {
    await page.evaluate(([a, p]) => /** @type {any} */ (window).__simulateFire?.(a, p),
                        [FIRE_ANGLES[fireIdx], FIRE_POWER[fireIdx]]);
    // Also tap to advance through tap-await beats.
    await page.mouse.click(270, 480);
    fireIdx++;
    nextFire += 11000;
  }
  // Click occasionally to clear tap-await beats outside fire windows.
  if (elapsed % 2000 < SAMPLE_MS) {
    try { await page.mouse.click(270, 480); } catch {}
  }
  const idx = String(frames.length).padStart(4, '0');
  const path = resolve(FRAME_DIR, `f_${idx}.png`);
  await page.screenshot({ path });
  frames.push({ idx: frames.length, t_ms: elapsed, path });
  await page.waitForTimeout(SAMPLE_MS);
}

await page.close();
await ctx.close();
await browser.close();

// Convert webm → mp4
const webm = readdirSync(tmpVid).find((f) => f.endsWith('.webm'));
if (webm) {
  const r = spawnSync('ffmpeg', ['-y', '-i', resolve(tmpVid, webm),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', '-loglevel', 'error', VIDEO_OUT],
    { stdio: 'inherit' });
  if (r.status === 0) rmSync(tmpVid, { recursive: true, force: true });
}

// Pixel-diff via ffmpeg's "blockdetect"-style approach: use compare via PIL? We
// don't have PIL. Instead, use ffmpeg signature: read PNG file sizes as a quick
// proxy for change (deltas in compressed size correlate with motion). For a
// real pixel diff we use ffmpeg's `tblend=difference` over the stitched video.
// Simpler: cheap-and-effective per-byte hash diff between consecutive PNGs.
import('node:crypto').then(async ({ createHash }) => {
  const hashes = frames.map((f) => {
    const buf = readFileSync(f.path);
    return { ...f, hash: createHash('md5').update(buf).digest('hex'), bytes: buf.length };
  });
  // Identical hash = visually identical (PNG deterministic). Group consecutive
  // identical-hash frames. Any group spanning >= 500ms = dead time.
  let runStart = 0, runHash = hashes[0]?.hash;
  const dead = [];
  for (let i = 1; i <= hashes.length; i++) {
    const cur = hashes[i];
    if (!cur || cur.hash !== runHash) {
      const last = hashes[i - 1];
      const span = last.t_ms - hashes[runStart].t_ms;
      if (span >= 500 && i - runStart > 1) {
        dead.push({ from_ms: hashes[runStart].t_ms, to_ms: last.t_ms, span_ms: span,
                    frames: i - runStart, hash: runHash });
      }
      runStart = i;
      runHash = cur ? cur.hash : null;
    }
  }
  // Also: for non-identical but very low-change frames, we approximate "low
  // motion" via tiny PNG byte-size delta (<0.5%). Group those too.
  let lowStart = 0;
  const SOFT_PCT = 0.005;
  const softDead = [];
  for (let i = 1; i <= hashes.length; i++) {
    const cur = hashes[i], prev = hashes[i - 1];
    const stillSame = cur && Math.abs(cur.bytes - prev.bytes) / prev.bytes < SOFT_PCT;
    if (!stillSame) {
      const span = prev.t_ms - hashes[lowStart].t_ms;
      if (span >= 500 && i - lowStart > 2) {
        softDead.push({ from_ms: hashes[lowStart].t_ms, to_ms: prev.t_ms, span_ms: span,
                       frames: i - lowStart });
      }
      lowStart = i;
    }
  }

  console.log('\n=== DEAD-TIME AUDIT ===');
  console.log(`Sampled ${hashes.length} frames over ${DURATION_S}s @ ${SAMPLE_MS}ms`);
  console.log(`Hard-identical runs ≥500ms: ${dead.length}`);
  for (const d of dead) {
    console.log(`  HARD DEAD ${(d.from_ms/1000).toFixed(2)}s → ${(d.to_ms/1000).toFixed(2)}s (${d.span_ms}ms, ${d.frames} frames)`);
  }
  console.log(`\nSoft low-motion runs ≥500ms (Δsize <${SOFT_PCT*100}%): ${softDead.length}`);
  for (const d of softDead) {
    console.log(`  SOFT DEAD ${(d.from_ms/1000).toFixed(2)}s → ${(d.to_ms/1000).toFixed(2)}s (${d.span_ms}ms, ${d.frames} frames)`);
  }
  if (errs.length) console.log('\npage errors:', errs);
  console.log(`\nVideo: ${VIDEO_OUT}`);
  console.log(`Frames: ${FRAME_DIR}`);
});
