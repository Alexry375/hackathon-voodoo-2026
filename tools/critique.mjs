#!/usr/bin/env node
// Self-critique loop: record current gameplay → compare to source frames → structured diff.
//
// Intended for use DURING development: run after every batch of changes to verify
// the playable stays true to the source video. Output is a ranked list of fixes.
//
// What it does:
//   1. Starts the dev server on --port (kills any existing process on that port first)
//   2. Records a full gameplay session via record_gameplay.mjs (reuses existing .webm if --webm=)
//   3. Loads N sampled frames from frames/clip2_*.png as reference
//   4. Sends BOTH to Gemini in one call: "compare these and list what's wrong"
//   5. Saves the critique to shots/critique_TIMESTAMP.md
//   6. Kills the dev server it started (leaves pre-existing servers alone)
//   7. Exits non-zero if Gemini finds P0/P1 issues (for CI gating if needed)
//
// Usage:
//   node tools/critique.mjs                    # start server, record, compare, stop server
//   node tools/critique.mjs --no-server        # skip server start/stop (server already running)
//   node tools/critique.mjs --webm=shots/x.webm  # skip recording, use existing webm
//   node tools/critique.mjs --frames=12        # more source reference frames (default 10)
//   node tools/critique.mjs --model=google/gemini-3.1-pro-preview
//
// env: OPENROUTER_API_KEY (from process.env or .env)

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// --- CLI args ---
let port        = 8765;
let manageServer = true;
let existingWebm = null;
let frameCount  = 10;
let model       = 'google/gemini-3.1-pro-preview';

for (const a of process.argv.slice(2)) {
  if (a.startsWith('--port='))    port = +a.slice(7);
  else if (a === '--no-server')   manageServer = false;
  else if (a.startsWith('--webm=')) existingWebm = resolve(a.slice(7));
  else if (a.startsWith('--frames=')) frameCount = +a.slice(9);
  else if (a.startsWith('--model=')) model = a.slice(8);
}

// Load API key
let apiKey = process.env.OPENROUTER_API_KEY;
const envFile = join(REPO_ROOT, '.env');
if (!apiKey && existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?OPENROUTER_API_KEY\s*=\s*"?([^"\n]+)"?\s*$/);
    if (m) { apiKey = m[1].trim(); break; }
  }
}
if (!apiKey) { console.error('OPENROUTER_API_KEY not set'); process.exit(1); }

// --- Start dev server if needed ---
let serverProc = null;
if (manageServer && !existingWebm) {
  // Kill anything already holding the port (best-effort).
  spawnSync('fuser', ['-k', `${port}/tcp`], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 300));

  serverProc = spawn('python3', ['-m', 'http.server', String(port)], {
    cwd: REPO_ROOT,
    stdio: 'ignore',
    detached: true,
  });
  serverProc.unref();
  console.error(`[critique] dev server started (pid ${serverProc.pid}) on :${port}`);
  // Give the server a moment to bind.
  await new Promise(r => setTimeout(r, 600));
}

// --- Record gameplay (or reuse existing webm) ---
let webmPath = existingWebm;

if (!webmPath) {
  console.error('[critique] recording gameplay…');
  const recResult = spawnSync(
    'node',
    [join(REPO_ROOT, 'tools/record_gameplay.mjs'), '--no-analyze', `--port=${port}`],
    { stdio: ['ignore', 'pipe', 'inherit'], cwd: REPO_ROOT }
  );
  if (recResult.status !== 0) {
    console.error('[critique] recording failed');
    cleanup();
    process.exit(1);
  }
  webmPath = recResult.stdout.toString().trim();
  if (!webmPath || !existsSync(webmPath)) {
    console.error('[critique] no webm path returned from recorder:', webmPath);
    cleanup();
    process.exit(1);
  }
}

console.error(`[critique] webm: ${webmPath} (${(readFileSync(webmPath).length / 1024 / 1024).toFixed(1)} MB)`);

// --- Stop dev server ---
cleanup();

// --- Sample source frames ---
const FRAMES_DIR = join(REPO_ROOT, 'frames');
const FRAMES_FPS = 4;
const allFrames = readdirSync(FRAMES_DIR)
  .filter(f => /^clip2_\d+\.png$/.test(f))
  .sort();

if (!allFrames.length) {
  console.error('[critique] no frames/clip2_*.png found — run ffmpeg extraction first');
  process.exit(1);
}

// Spread frames evenly across the clip for broad coverage.
const step = allFrames.length / Math.min(frameCount, allFrames.length);
const picked = [];
for (let i = 0; i < frameCount && i < allFrames.length; i++)
  picked.push(allFrames[Math.floor(i * step)]);

const frameSec = (f) => ((parseInt(f.match(/\d+/)[0], 10) - 1) / FRAMES_FPS).toFixed(2);
console.error(`[critique] source frames: ${picked.map(f => `${f}(${frameSec(f)}s)`).join(' ')}`);

// --- Build Gemini prompt ---
const SYSTEM_PROMPT = `You are a senior mobile game QA engineer reviewing a playable ad against its source game footage.

You will receive:
  A) A recording of the CURRENT PLAYABLE AD implementation (video).
  B) ${picked.length} reference frames from the ORIGINAL GAME VIDEO sampled at ~${(allFrames.length / FRAMES_FPS).toFixed(0)}s total duration.

Your job: compare them rigorously and produce a structured critique.

Format your response as markdown with these exact sections:

## ✅ Matches well
Bullet list of things the playable gets right compared to the source (visuals, timing, mechanics).

## ❌ Discrepancies
Ranked list (P0 = wrong mechanic/missing feature, P1 = visible visual mismatch, P2 = minor cosmetic diff).
Each item: **[P0/P1/P2] what's wrong** — cite timestamp in the recording AND source frame.

## 🔧 Fix list (ordered by impact)
Concrete, actionable items a Canvas2D/JS developer should fix next.
Be specific: colors as hex, sizes in px, timing in ms.

## 🚫 Cannot assess
Things you couldn't compare due to missing context.

Answer ONLY from what is visible. Do not hallucinate game mechanics.`;

const recordingB64 = readFileSync(webmPath).toString('base64');

const content = [
  { type: 'text', text: SYSTEM_PROMPT },
  { type: 'text', text: `\n\n### A) Current playable recording (${(recordingB64.length * 0.75 / 1024 / 1024).toFixed(1)} MB webm):` },
  { type: 'image_url', image_url: { url: `data:video/webm;base64,${recordingB64}` } },
  { type: 'text', text: `\n\n### B) Source game reference frames (${FRAMES_FPS}fps, ${picked.length} sampled frames):` },
];

for (const f of picked) {
  const b64 = readFileSync(join(FRAMES_DIR, f)).toString('base64');
  content.push({ type: 'text', text: `Frame ${f} (~${frameSec(f)}s):` });
  content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${b64}`, detail: 'high' } });
}

console.error(`[critique] calling ${model}…`);

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type':  'application/json',
    'HTTP-Referer':  'https://github.com/Alexry375/hackathon-voodoo-2026',
    'X-Title':       'Castle Clashers Playable - critique',
  },
  body: JSON.stringify({ model, messages: [{ role: 'user', content }] }),
});

if (!res.ok) {
  console.error(`[critique] HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const data = await res.json();
const critique = data?.choices?.[0]?.message?.content;
if (!critique) {
  console.error('[critique] no content:', JSON.stringify(data, null, 2));
  process.exit(1);
}

// --- Save critique ---
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outMd = join(REPO_ROOT, 'shots', `critique_${timestamp}.md`);
const header = `<!-- critique.mjs — model: ${model} — ${new Date().toISOString()} -->\n` +
  `<!-- webm: ${webmPath} -->\n\n`;
writeFileSync(outMd, header + critique);
console.error(`[critique] saved → ${outMd}`);

// Print to stdout so Claude Code can read it inline.
console.log('\n' + critique);

// Exit non-zero if any P0 issues found (useful for CI).
const hasP0 = critique.includes('[P0]') || critique.includes('**P0');
process.exit(hasP0 ? 2 : 0);

function cleanup() {
  if (serverProc) {
    try { process.kill(-serverProc.pid, 'SIGTERM'); } catch (_) {}
    try { spawnSync('fuser', ['-k', `${port}/tcp`], { stdio: 'ignore' }); } catch (_) {}
    serverProc = null;
    console.error('[critique] dev server stopped');
  }
}
