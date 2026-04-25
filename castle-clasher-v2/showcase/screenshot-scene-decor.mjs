// Captures the scene-decor showcase. Run: node showcase/screenshot-scene-decor.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = 'file://' + resolve(__dirname, 'scene-decor.html');
const OUT  = resolve(__dirname, '..', 'shots');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('console', m => console.log(`[browser] ${m.text()}`));
await page.goto(HTML);
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/scene-decor.png`, fullPage: true });
console.log(`done -> ${OUT}/scene-decor.png`);
await browser.close();
