// Loads playable.html in mobile viewport, captures 4 game states.
// usage: node screenshot.mjs
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

await page.goto(HTML);
await page.waitForTimeout(400);

const tap = (x,y) => page.touchscreen.tap(x, y);
const swipe = async (x1,y1,x2,y2,steps=10) => {
  await page.mouse.move(x1,y1);
  await page.mouse.down();
  for (let i=1;i<=steps;i++) await page.mouse.move(x1+(x2-x1)*i/steps, y1+(y2-y1)*i/steps, {steps:1});
  await page.mouse.up();
};

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });

// 1) intro
await shot('1-intro');

// 2) mid-game: trigger start, let enemies spawn, screenshot mid-swipe so trail visible
await page.mouse.move(270, 700); await page.mouse.down(); await page.mouse.up(); // tap to start (away from teaser enemies)
await page.waitForTimeout(2400);
// start a swipe
await page.mouse.move(60, 360);
await page.mouse.down();
const seg = 12;
for (let i = 1; i <= seg; i++) {
  await page.mouse.move(60 + (480-60)*i/seg, 360 + Math.sin(i/2)*30, { steps: 2 });
  if (i === seg - 2) await shot('2-mid');  // capture mid-swipe so trail is alive
}
await page.mouse.up();

// 3) win: force game state via window.__game
await page.evaluate(() => { __game.kills = 12; __game.over = 'win'; });
await page.waitForTimeout(400);
await shot('3-win');

// 4) lose: reset and force lose
await page.evaluate(() => { __game.over = 'lose'; __game.kills = 4; __game.playerHp = 0; });
await page.waitForTimeout(400);
await shot('4-lose');

console.log(`done → ${OUT}`);
await browser.close();
