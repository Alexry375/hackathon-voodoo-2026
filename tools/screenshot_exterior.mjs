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

// Drop enemy HP below 70% so the (now disabled) chunk overlay would have triggered.
await p.evaluate(() => {
  /** @type {any} */ (window).state.hp_enemy_pct = 50;
  /** @type {any} */ (window).state.hp_self_pct = 35;
});
await p.click('button[data-state="EXTERIOR_RESOLVE"]');
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/exterior_resolve_damaged.png' });
console.log('  shot EXTERIOR_RESOLVE with damaged castles');

// Simulate a player shot to verify camera follow + no ghost castles.
await p.evaluate(() => {
  /** @type {any} */ (window).dispatchEvent(new Event('focus'));
});
// Use the events bus directly via a script inject
await p.evaluate(() => {
  const Voodoo = /** @type {any} */ (window);
  // Dynamically import events via a script element since modules aren't on window.
  const s = document.createElement('script');
  s.type = 'module';
  s.text = `import { emit } from './shared/events.js'; emit('player_fire', { unit_id: 'cyclop', angle_deg: 35, power: 0.8, weapon_type: 'rocket' });`;
  document.body.appendChild(s);
});
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/exterior_shot_inflight.png' });
console.log('  shot with projectile in flight');
await p.waitForTimeout(900);
await p.screenshot({ path: '/tmp/exterior_shot_post_impact.png' });
console.log('  shot post-impact');

console.log('errors:', errs.length ? errs : 'none');
await b.close();
