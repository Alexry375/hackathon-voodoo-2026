// Validate endcard polish: take 200ms + 1500ms screenshots, then verify
// tap-anywhere triggers redirectToInstallPage.
import pw from '/home/samiennedoui/hackathon-voodoo-2026/node_modules/playwright/index.js';
const { chromium } = pw;
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const HTML = pathToFileURL(resolve(ROOT, 'dist/playable.html')).href;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 540, height: 960 } });
const page = await ctx.newPage();

const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));

await page.goto(HTML);
// Wait for the canvas + script hooks.
await page.waitForFunction(() => typeof window.__forcePhase === 'function', { timeout: 5000 });
await page.evaluate(() => window.__forcePhase('endcard'));

await page.waitForTimeout(200);
await page.screenshot({ path: resolve(ROOT, 'shots/endcard_200ms.png') });

await page.waitForTimeout(1300); // total ~1500ms
await page.screenshot({ path: resolve(ROOT, 'shots/endcard_1500ms.png') });

// Tap a far corner of the canvas (NOT on the CTA button rect 90..450 / 720..816).
const corner = { x: 30, y: 60 };
await page.mouse.click(corner.x, corner.y);
await page.waitForTimeout(200);

const sawRedirect = logs.some((l) => l.includes('redirectToInstallPage'));
console.log('--- console ---');
for (const l of logs) console.log(l);
console.log('--- summary ---');
console.log('redirect_triggered:', sawRedirect);

await browser.close();
process.exit(sawRedirect ? 0 : 2);
