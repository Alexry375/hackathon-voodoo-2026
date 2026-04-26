// Capture dense frames around the ext→int transition.
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';

const URL = 'http://127.0.0.1:8765/dist/playable.html';
const OUT = 'input/B01_castle_clashers/SANDBOX/frames-prod/transition';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });

// Capture every 100ms across the whole intro→ext-zoom→interior window (~6s).
for (let i = 0; i <= 60; i++) {
  await page.waitForTimeout(i === 0 ? 50 : 100);
  await page.screenshot({ path: `${OUT}/t_${String(i*100).padStart(4,'0')}.png` });
}
await browser.close();
console.log('done — frames in', OUT);
