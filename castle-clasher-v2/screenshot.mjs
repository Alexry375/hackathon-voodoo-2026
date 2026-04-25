// Captures the playable.html in 5 phases of the scripted ad.
// Usage: node screenshot.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = 'file://' + resolve(__dirname, 'playable.html');
const OUT  = resolve(__dirname, 'shots');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 540, height: 960 },
  deviceScaleFactor: 2,
  hasTouch: true, isMobile: true,
});
const page = await ctx.newPage();
page.on('console', m => console.log(`[browser] ${m.text()}`));
page.on('pageerror', e => console.log(`[browser-error] ${e.message}`));

await page.goto(HTML);
await page.waitForFunction(() => window.__game && window.IMG, { timeout: 5000 }).catch(()=>{});
await page.waitForTimeout(400);

const tap = async (x, y) => page.touchscreen.tap(x, y);
const swipe = async (x1, y1, x2, y2, steps = 14) => {
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x1 + (x2-x1)*i/steps, y1 + (y2-y1)*i/steps);
  }
  await page.mouse.up();
};
const shot = (n) => page.screenshot({ path: `${OUT}/playable-${n}.png`, fullPage: false });

// 1) Intro (tap-to-start visible)
await shot('1-intro');

// Tap to start
await tap(270, 480);
await page.waitForTimeout(2200); // → tutorial step 1 (hand on skeleton card)
await shot('2-tutorial-step1');

// Drag skeleton card → slot 1
await swipe(280, 870, 145, 510);  // CARD_X[1]=200+CARD_W/2=260 ish, slot 1 y=510
await page.waitForTimeout(2500);
await shot('3-mid-tutorial');

// Wait for next hand prompt then drag orc → slot 0
await page.waitForTimeout(5500); // hand on orc card 0 around T=9000 then we waited
await swipe(120, 870, 145, 590);
await page.waitForTimeout(3000);
await shot('4-freeplay');

// Drop cyclop too for chaos
await swipe(440, 870, 145, 430);
await page.waitForTimeout(8000);
await shot('5-mid-chaos');

// Wait for forcewin
await page.waitForFunction(() => window.__game.phase === 'forcewin', { timeout: 30000 }).catch(()=>{});
await page.waitForTimeout(1500);
await shot('6-forcewin');

// Wait for endcard
await page.waitForFunction(() => window.__game.phase === 'endcard', { timeout: 8000 }).catch(()=>{});
await page.waitForTimeout(800);
await shot('7-endcard');

console.log(`done → ${OUT}/`);
await browser.close();
