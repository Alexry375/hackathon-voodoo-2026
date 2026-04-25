// Drive 2 player turns via the events bus, log state transitions to verify
// the new player→enemy alternation in scene_manager.
import { chromium } from 'playwright';

const URL = 'http://localhost:8765/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 540, height: 960 } });

const log = [];
p.on('console', (m) => log.push(`[${m.type()}] ${m.text()}`));
p.on('pageerror', (e) => log.push(`[pageerror] ${String(e)}`));

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(400);

// Hook scene_manager state to console.
await p.evaluate(async () => {
  const sm = await import('./shared/scene_manager.js');
  sm.subscribe((s) => console.log('STATE=' + s));
});

// Wait for intro enemy attack to finish (~3s) and reach INTERIOR_AIM.
await p.waitForTimeout(3500);

async function fire(weapon_type) {
  await p.evaluate(async (wt) => {
    const ev = await import('./shared/events.js');
    ev.emit('player_fire', { unit_id: 'cyclop', angle_deg: 35, power: 0.7, weapon_type: wt });
  }, weapon_type);
}

await fire('rocket');
await p.waitForTimeout(4500); // resolve + enemy reply
await fire('volley');
await p.waitForTimeout(5000);

console.log('--- transcript ---');
for (const l of log) console.log(l);
await b.close();
