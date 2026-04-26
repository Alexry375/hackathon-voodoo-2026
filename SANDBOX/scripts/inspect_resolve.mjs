// Capture the full resolve cycle: fire → pan-fwd → impact → dwell → pan-back → interior.
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';

const URL = 'http://127.0.0.1:8775/dist/playable.html';
const OUT = 'input/B01_castle_clashers/SANDBOX/frames-prod/resolve';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });

// Wait through opening + intro→interior transition (~5s).
await page.waitForTimeout(5500);

// Fire
await page.mouse.move(410, 530);
await page.waitForTimeout(220);
await page.mouse.down();
await page.mouse.move(240, 700, { steps: 30 });
await page.waitForTimeout(420);
await page.mouse.up();

// Capture every 200ms across the full resolve+riposte cycle (~8s).
for (let i = 0; i <= 40; i++) {
  await page.waitForTimeout(i === 0 ? 50 : 200);
  await page.screenshot({ path: `${OUT}/r_${String(i*200).padStart(4,'0')}.png` });
}

await browser.close();
console.log('done — frames in', OUT);
