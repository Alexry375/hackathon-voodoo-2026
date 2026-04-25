// Capture each scene state directly via the dev URL (not prod), using the
// scene_manager exposed hooks. We'll manually drive transitions via emit.
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';

const URL = 'http://127.0.0.1:8765/index.html?mode=dev';
const OUT = 'input/B01_castle_clashers/shots/04-impl';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

// Index.html exposes a devbar — but more importantly, we want to
// inspect the exterior scene. Hit dev with no mraid, get the scene
// manager state.
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/scene_a_interior_dev.png` });

// Click EXT_OBS button to force exterior observe state
await page.click('button[data-state="EXTERIOR_OBSERVE"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/scene_b_exterior_observe.png` });

// Now go back to interior, click on the active unit via aim drag
await page.click('button[data-state="INTERIOR_AIM"]');
await page.waitForTimeout(300);

// Drag from cyclop position (active unit, floor 1, mid-right ~370,540) toward bottom-left
// Aim semantics: drag away from unit → arc up-right (toward enemy castle on the right).
const start = { x: 370, y: 540 };
const end   = { x: 200, y: 700 };
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.waitForTimeout(50);
await page.mouse.move(end.x, end.y, { steps: 14 });
await page.waitForTimeout(180);
await page.screenshot({ path: `${OUT}/scene_a_aim_drag.png` });
await page.mouse.up();

// Just released → scene_manager goes to EXTERIOR_RESOLVE → projectile flies
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/scene_b_projectile_flight.png` });
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/scene_b_after_player_impact.png` });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/scene_b_after_enemy_riposte.png` });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/scene_a_back_after_resolve.png` });

// Damage state: hit hp35, force exterior to see damage masks
await page.click('button[data-hp="35"]');
await page.waitForTimeout(80);
await page.click('button[data-state="EXTERIOR_OBSERVE"]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/scene_b_exterior_damaged.png` });

await browser.close();
if (errors.length) {
  console.error('--- console/page errors:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('done. errors=0');
