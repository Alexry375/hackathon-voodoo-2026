// Screenshot the playable across the 5 narrative phases via __forcePhase.
// Output: input/B01_castle_clashers/shots/05-playwright/phase_<NAME>.png
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';

const URL = 'http://127.0.0.1:8765/dist/playable.html';
const OUT = 'input/B01_castle_clashers/shots/05-playwright';
const PHASES = ['intro', 'tutorial', 'freeplay', 'forcewin', 'endcard'];

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Initial capture (state of EXTERIOR_OBSERVE before any forcePhase)
await page.screenshot({ path: `${OUT}/phase_initial.png`, fullPage: false });

for (const phase of PHASES) {
  await page.evaluate((p) => /** @type {any} */ (window).__forcePhase(p), phase);
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/phase_${phase}.png`, fullPage: false });
  console.log(`✓ phase ${phase}`);
}

// Capture an EXTERIOR_RESOLVE mid-flight by forcing state then firing
await page.evaluate(() => {
  /** @type {any} */ (window).__forcePhase('freeplay');
});
await page.waitForTimeout(200);
await page.evaluate(() => {
  // emit a player_fire from devtools to trigger exterior resolve
  // We use a synthetic emit on the events bus by reading the bundled IIFE module — not exposed, so we rely on UI.
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/phase_freeplay_after.png` });

await browser.close();
if (errors.length) {
  console.error('--- console/page errors:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('done. errors=0');
