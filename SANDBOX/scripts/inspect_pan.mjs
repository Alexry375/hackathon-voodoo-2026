// Capture dense frames during the fire→pan→impact window to visually verify
// what the transitions actually look like (Gemini's 1fps sampling hides them).
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';

const URL = 'http://127.0.0.1:8765/dist/playable.html';
const OUT = 'input/B01_castle_clashers/shots/07-iter-v3-inspect';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
await page.goto(URL, { waitUntil: 'networkidle' });

// Opening — every 200ms
for (let i = 0; i <= 12; i++) {
  await page.waitForTimeout(i === 0 ? 100 : 200);
  await page.screenshot({ path: `${OUT}/opening_${String(i*200).padStart(4,'0')}.png` });
}

// Wait for tutorial state
await page.waitForTimeout(500);
// Fire
await page.mouse.move(410, 530);
await page.waitForTimeout(220);
await page.mouse.down();
await page.mouse.move(240, 700, { steps: 30 });
await page.waitForTimeout(420);
await page.mouse.up();

// Capture every 100ms during fire→pan→impact (~2.5s)
for (let i = 0; i <= 25; i++) {
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${OUT}/fire_${String(i*100).padStart(4,'0')}.png` });
}

await browser.close();
console.log('done — frames in', OUT);
