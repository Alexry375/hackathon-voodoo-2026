// Validate the pre-canvas loading splash by snapshotting at t=50ms and t=2000ms.
// Run: `node tools/validate_splash.mjs`
import { chromium } from 'playwright';
import { statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const HTML = resolve(ROOT, 'dist/playable.html');
const URL = pathToFileURL(HTML).href;

const sz = statSync(HTML).size;
const mb = (sz / 1024 / 1024).toFixed(2);
console.log(`bundle: ${mb} MB at ${HTML}`);
if (sz > 5 * 1024 * 1024) { console.error('FAIL: bundle > 5 MB'); process.exit(1); }

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 540, height: 960 } });
const p = await ctx.newPage();

const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

// Don't wait for load; we want to grab the very first paint.
const nav = p.goto(URL, { waitUntil: 'commit' });
const t0 = Date.now();
await nav;

// Race: capture at ~50ms after navigation commit
const target1 = t0 + 50;
const wait1 = target1 - Date.now();
if (wait1 > 0) await new Promise((r) => setTimeout(r, wait1));
const shot1 = '/tmp/splash_t50.png';
await p.screenshot({ path: shot1 });
console.log(`shot @ t=${Date.now() - t0}ms → ${shot1}`);

// Capture splash visibility info
const info1 = await p.evaluate(() => {
  const s = document.getElementById('splash');
  return s ? { exists: true, hidden: s.classList.contains('hide'), opacity: getComputedStyle(s).opacity } : { exists: false };
});
console.log('splash @ t=50ms:', info1);

// Wait until t=2000ms after nav
const target2 = t0 + 2000;
const wait2 = target2 - Date.now();
if (wait2 > 0) await new Promise((r) => setTimeout(r, wait2));
const shot2 = '/tmp/splash_t2000.png';
await p.screenshot({ path: shot2 });
console.log(`shot @ t=${Date.now() - t0}ms → ${shot2}`);

const info2 = await p.evaluate(() => {
  const s = document.getElementById('splash');
  return s ? { exists: true, hidden: s.classList.contains('hide'), opacity: getComputedStyle(s).opacity } : { exists: false };
});
console.log('splash @ t=2000ms:', info2);

// Sample center pixel of canvas to verify game is painting
const px = await p.evaluate(() => {
  const c = document.getElementById('g');
  if (!c) return null;
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(c.width / 2, c.height / 2, 1, 1).data;
  return [d[0], d[1], d[2], d[3]];
});
console.log('canvas center px:', px);

console.log('errors:', errs.length ? errs : 'none');
await b.close();

// Verdict
const pass1 = info1.exists && !info1.hidden;
const pass2 = !info2.exists || info2.hidden || info2.opacity === '0';
console.log(pass1 ? 'PASS: splash visible at t=50ms' : 'FAIL: splash NOT visible at t=50ms');
console.log(pass2 ? 'PASS: splash gone by t=2000ms' : 'FAIL: splash still visible at t=2000ms');
process.exit(pass1 && pass2 ? 0 : 1);
