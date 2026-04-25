// Captures the ui-deck-hud showcase. Run: node showcase/screenshot-ui-deck-hud.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = 'file://' + resolve(__dirname, 'ui-deck-hud.html');
const OUT  = resolve(__dirname, '..', 'shots');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 900, height: 1400 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('console', m => console.log(`[browser] ${m.text()}`));
page.on('pageerror', e => console.log(`[pageerror] ${e.message}`));
await page.goto(HTML);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/ui-deck-hud.png`, fullPage: true });
console.log(`done → ${OUT}/ui-deck-hud.png`);
await browser.close();
