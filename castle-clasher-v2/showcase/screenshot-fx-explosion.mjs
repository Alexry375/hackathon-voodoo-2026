// Captures the fx-explosion showcase. Run: node showcase/screenshot-fx-explosion.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = 'file://' + resolve(__dirname, 'fx-explosion.html');
const OUT  = resolve(__dirname, '..', 'shots');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 900, height: 1600 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('console', m => console.log(`[browser] ${m.text()}`));
await page.goto(HTML);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/fx-explosion.png`, fullPage: true });
console.log(`done → ${OUT}/fx-explosion.png`);
await browser.close();
