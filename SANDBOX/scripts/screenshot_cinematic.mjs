// Capture chronological frames of the new prod cinematic and the dev views,
// for visual diff vs source frames sec_NN.
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';

const URL = 'http://127.0.0.1:8765/dist/playable.html';
const OUT = 'input/B01_castle_clashers/shots/06-iter-v2';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

await page.goto(URL, { waitUntil: 'networkidle' });

// Capture the opening cinematic at key moments
const opens = [
  { ms: 200,   name: 't00-200-intro-clean' },
  { ms: 1100,  name: 't01-1100-bomb-falling' },
  { ms: 1900,  name: 't02-1900-bomb-impact' },
  { ms: 2900,  name: 't03-2900-after-impact' },
  { ms: 3500,  name: 't04-3500-into-interior' },
];
let last = 0;
for (const f of opens) {
  await page.waitForTimeout(f.ms - last);
  last = f.ms;
  await page.screenshot({ path: `${OUT}/${f.name}.png`, fullPage: false });
  console.log(`✓ ${f.name}`);
}

// Tutorial frame (t≈5000)
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/t05-tutorial-hand.png` });

// Simulate a player drag-fire in tutorial
const start = { x: 410, y: 530 };
const end   = { x: 240, y: 700 };
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.mouse.move(end.x, end.y, { steps: 12 });
await page.waitForTimeout(120);
await page.mouse.up();

// Capture cinematic phases
const post = [
  { ms: 250,  name: 't06-fire-tilt' },
  { ms: 800,  name: 't07-projectile-leaving-right' },
  { ms: 1500, name: 't08-cut-to-enemy' },
  { ms: 2300, name: 't09-enemy-impact' },
  { ms: 2900, name: 't10-enemy-dwell' },
  { ms: 3500, name: 't11-cut-to-ours-incoming' },
  { ms: 4500, name: 't12-our-impact-from-enemy' },
];
last = 0;
for (const f of post) {
  await page.waitForTimeout(f.ms - last);
  last = f.ms;
  await page.screenshot({ path: `${OUT}/${f.name}.png` });
  console.log(`✓ ${f.name}`);
}

// Force phases for end-to-end coverage
for (const ph of ['freeplay', 'forcewin', 'endcard']) {
  await page.evaluate((p) => /** @type {any} */ (window).__forcePhase(p), ph);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/phase_${ph}.png` });
  console.log(`✓ phase ${ph}`);
}

await browser.close();
if (errors.length) {
  console.error('--- console/page errors:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('done. errors=0');
