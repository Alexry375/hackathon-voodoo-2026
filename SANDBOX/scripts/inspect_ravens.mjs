// Capture dense opening frames to verify the 2 ravens' trajectories.
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';

const URL = 'http://127.0.0.1:8765/dist/playable.html';
const OUT = 'input/B01_castle_clashers/SANDBOX/frames-prod/ravens';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });

for (let i = 0; i <= 22; i++) {
  await page.waitForTimeout(i === 0 ? 50 : 150);
  await page.screenshot({ path: `${OUT}/raven_${String(i*150).padStart(4,'0')}.png` });
}
await browser.close();
console.log('done — frames in', OUT);
