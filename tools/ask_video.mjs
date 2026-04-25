#!/usr/bin/env node
// Ask a question about the Castle Clashers source video.
// Default: sends the mp4 directly to Gemini (best temporal understanding).
// Fallback: --frames=N sends sampled PNG frames instead (cheaper, narrower window).
//
// usage:
//   node tools/ask_video.mjs "your question" [--out=results/file.md]
//   node tools/ask_video.mjs "your question" --frames=8 --start=0 --end=10
//   node tools/ask_video.mjs "your question" --video=frames/clip1.mp4
//
// flags:
//   --video=FILE      mp4 to send (default: frames/clip2.mp4)
//   --frames=N        use sampled PNGs instead of video (N frames)
//   --start=SEC       frame-mode window start (default 0)
//   --end=SEC         frame-mode window end (default last)
//   --model=MODEL     openrouter model (default google/gemini-3.1-pro-preview)
//   --out=FILE        save markdown response to file
//
// env: OPENROUTER_API_KEY (read from process.env or repo-root .env)

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
let question = '';
let model = 'google/gemini-3.1-pro-preview';
let outFile = null;
let useFrames = false;
let frameCount = 8;
let startSec = null, endSec = null;
let videoFile = join(REPO_ROOT, 'frames/clip2.mp4');

for (const a of args) {
  if (a.startsWith('--frames='))   { useFrames = true; frameCount = +a.slice(9); }
  else if (a === '--frames')        { useFrames = true; }
  else if (a.startsWith('--model='))  model = a.slice(8);
  else if (a.startsWith('--start='))  startSec = +a.slice(8);
  else if (a.startsWith('--end='))    endSec = +a.slice(6);
  else if (a.startsWith('--out='))    outFile = a.slice(6);
  else if (a.startsWith('--video='))  videoFile = a.slice(8).startsWith('/') ? a.slice(8) : join(REPO_ROOT, a.slice(8));
  else question += (question ? ' ' : '') + a;
}
if (!question) {
  console.error('usage: node tools/ask_video.mjs "question" [--out=results/file.md] [--frames=N]');
  process.exit(1);
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
if (!apiKey) {
  console.error('OPENROUTER_API_KEY not set');
  process.exit(1);
}

const SYSTEM_PROMPT =
  `Format your response as a markdown document with:\n` +
  `- A short # heading summarising what was verified\n` +
  `- A ## Findings section with bullet points, each citing the timestamp or frame\n` +
  `- A ## Not visible / uncertain section for anything not clearly seen\n` +
  `- A ## Coding implications section — concrete notes for a Canvas2D developer ` +
  `  (colors as hex where estimable, sizes in px, directions as "left→right" etc.)\n\n` +
  `Answer ONLY from what is visible in the video/frames. Do not guess or use ` +
  `general game knowledge. Be precise about timestamps, positions, colors, sizes, ` +
  `and motion. This output is saved as a reference file for future coding sessions.`;

let content;
let logLabel;

if (!useFrames) {
  // Video mode — send the mp4 as base64 inline
  if (!existsSync(videoFile)) {
    console.error(`video not found: ${videoFile}`);
    process.exit(1);
  }
  const videoB64 = readFileSync(videoFile).toString('base64');
  const mime = 'video/mp4';
  logLabel = `video ${videoFile.split('/').pop()} → ${model}`;
  content = [
    { type: 'text', text: `${SYSTEM_PROMPT}\n\nQuestion: ${question}` },
    { type: 'image_url', image_url: { url: `data:${mime};base64,${videoB64}` } },
  ];
} else {
  // Frame mode — sample PNGs from frames/
  const FRAMES_DIR = join(REPO_ROOT, 'frames');
  const FRAMES_FPS = 4;
  const allFrames = readdirSync(FRAMES_DIR)
    .filter(f => /^clip2_\d+\.png$/.test(f))
    .sort();
  if (!allFrames.length) {
    console.error('no frames/clip2_*.png found');
    process.exit(1);
  }
  const frameSec = (f) => (parseInt(f.match(/\d+/)[0], 10) - 1) / FRAMES_FPS;
  const filtered = allFrames.filter(f => {
    const s = frameSec(f);
    if (startSec !== null && s < startSec) return false;
    if (endSec   !== null && s > endSec)   return false;
    return true;
  });
  const pool = filtered.length ? filtered : allFrames;
  const step = pool.length / Math.min(frameCount, pool.length);
  const picked = [];
  for (let i = 0; i < frameCount && i < pool.length; i++)
    picked.push(pool[Math.floor(i * step)]);

  const labelFrame = (f) => `${f} (~${frameSec(f).toFixed(2)}s)`;
  logLabel = `${picked.length} frames (${picked[0]} → ${picked[picked.length-1]}) → ${model}`;
  content = [{ type: 'text', text:
    `${SYSTEM_PROMPT}\n\n` +
    `Frames at ${FRAMES_FPS}fps, name=clip2_NNNN.png → second=(NNNN-1)/${FRAMES_FPS}.\n` +
    `Frames: ${picked.map(labelFrame).join(', ')}\n\n` +
    `Question: ${question}` }];
  for (const f of picked) {
    const b64 = readFileSync(join(FRAMES_DIR, f)).toString('base64');
    content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${b64}`, detail: 'high' } });
  }
}

console.error(`[ask_video] ${logLabel}`);

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type':  'application/json',
    'HTTP-Referer':  'https://github.com/Alexry375/hackathon-voodoo-2026',
    'X-Title':       'Castle Clashers Playable - ask_video',
  },
  body: JSON.stringify({ model, messages: [{ role: 'user', content }] }),
});

if (!res.ok) {
  console.error(`[ask_video] HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const data = await res.json();
const answer = data?.choices?.[0]?.message?.content;
if (!answer) {
  console.error('[ask_video] no content:', JSON.stringify(data, null, 2));
  process.exit(1);
}

if (outFile) {
  const outPath = outFile.startsWith('/') ? outFile : join(REPO_ROOT, outFile);
  const header = `<!-- generated by ask_video.mjs — model: ${model} -->\n` +
    `<!-- question: ${question} -->\n\n`;
  writeFileSync(outPath, header + answer);
  console.error(`[ask_video] saved → ${outPath}`);
}
console.log(answer);
