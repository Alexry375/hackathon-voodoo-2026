// Smoke test: load playable-bundle.html and verify draw functions + assets are reachable.
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, hasTouch:true, isMobile:true });
const page = await ctx.newPage();
page.on('console', m => console.log(`[browser] ${m.text()}`));
page.on('pageerror', e => console.log(`[error] ${e.message}`));
await page.goto('file://' + resolve(__dirname, 'playable-bundle.html'));
await page.waitForFunction(() => window.__game && window.drawCastle, { timeout: 5000 });
await page.waitForTimeout(300);
await page.screenshot({ path: resolve(__dirname, 'shots/bundle-test.png') });
const ok = await page.evaluate(() => ({
  T: window.__game.T|0,
  phase: window.__game.phase,
  CASTLE_IMG_blue: !!(window.CASTLE_IMG && window.CASTLE_IMG.blue && window.CASTLE_IMG.blue.complete),
  PORTRAITS_orc: !!(window.PORTRAITS && window.PORTRAITS.orc && window.PORTRAITS.orc.complete),
  drawFunctionsLoaded: ['drawExplosion','drawChunk','drawProjectile','drawDamage','drawCard','drawHud','drawCastle','drawParallaxGreen','drawTracks','drawEndCard'].every(n => typeof window[n] === 'function'),
}));
console.log('  bundle state:', ok);
await browser.close();
