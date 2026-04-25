// Capture the 5 phases of the scripted ad via Playwright + the
// __game.phase scrubbing hook exposed by playable/script.js.
// Run: `node tools/screenshot_phases.mjs` (assumes dev server on :8765).
import { chromium } from 'playwright';

const PORT = 8765;
const URL = `http://localhost:${PORT}/dist/playable.html`;
const PHASES = ['intro', 'tutorial', 'freeplay', 'forcewin', 'endcard'];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 540, height: 960 } });

const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);

for (const phase of PHASES) {
  await p.evaluate((ph) => {
    const w = /** @type {any} */ (window);
    if (w.__forcePhase) { w.__forcePhase(ph); return; }
    // fallback: poke __game.phase directly. The script's update tick will see it.
    if (w.__game) {
      w.__game.phase = ph;
      // For endcard we need the opacity ramp pre-set
      if (ph === 'endcard' && w.__setEndcardOpacity) w.__setEndcardOpacity(1);
    }
  }, phase);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `/tmp/phase_${phase}.png` });
  console.log(`  shot phase=${phase}`);
}

console.log('errors:', errs.length ? errs : 'none');
await b.close();
