// Captures the castle-damaged showcase. Run: node showcase/screenshot-castle-damaged.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = 'file://' + resolve(__dirname, 'castle-damaged.html');
const OUT  = resolve(__dirname, '..', 'shots');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('console', m => console.log(`[browser] ${m.text()}`));
page.on('pageerror', e => console.log(`[pageerror] ${e.message}`));
await page.goto(HTML);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/castle-damaged.png`, fullPage: true });
console.log(`done → ${OUT}/castle-damaged.png`);
await browser.close();
