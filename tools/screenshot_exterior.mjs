// Capture the exterior scene in a few states to validate the camera ping-pong
// + 2-castle world rendering. Assumes dev server on :8765.
import { chromium } from 'playwright';

const URL = 'http://localhost:8765/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 540, height: 960 } });

const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(600);

// Force EXTERIOR_OBSERVE — should snap to blue castle for enemy intro attack.
await p.click('button[data-state="EXTERIOR_OBSERVE"]');
await p.waitForTimeout(300);
await p.screenshot({ path: '/tmp/exterior_observe.png' });
console.log('  shot EXTERIOR_OBSERVE');

await p.waitForTimeout(2000); // let enemy attack play out
await p.screenshot({ path: '/tmp/exterior_post_intro.png' });
console.log('  shot post-intro (should be back to red castle focus)');

// Force EXTERIOR_RESOLVE — should be on blue castle, then ease to red as projectile flies.
await p.click('button[data-state="EXTERIOR_RESOLVE"]');
await p.waitForTimeout(200);
await p.screenshot({ path: '/tmp/exterior_resolve_start.png' });
console.log('  shot EXTERIOR_RESOLVE start');

console.log('errors:', errs.length ? errs : 'none');
await b.close();
