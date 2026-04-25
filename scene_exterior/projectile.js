// Player projectile: ballistic arc from off-screen player castle to visible enemy castle.
// Owner: Sami (scene_exterior). Listens to 'player_fire', emits 'cut_to_interior' after impact.

import { on, emit } from '../shared/events.js';
import { state } from '../shared/state.js';

const ASSET_BASE = 'assets/Castle Clashers Assets/';

/** @type {HTMLImageElement | null} */
let projectileImg = null;
/** @type {Promise<void> | null} */
let loadPromise = null;

// Tuned so a mid-power shot lands near the enemy castle center in ~800ms.
const MAX_SPEED = 1.4;          // px/ms at power=1
const GRAVITY = 0.0022;         // px/ms^2
const SPRITE_SIZE = 32;
const POST_IMPACT_MS = 150;
const SMOKE_EVERY_MS = 40;
const DAMAGE = 18;

/**
 * @typedef {Object} Projectile
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} t_ms          age since launch
 * @property {number} smoke_acc_ms
 * @property {boolean} impacted
 * @property {number} post_impact_ms
 * @property {number} impactX
 * @property {number} impactY
 */

/** @type {Projectile[]} */
const active = [];

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`failed to load ${src}`));
    im.src = src;
  });
}

export function loadProjectileAssets() {
  if (loadPromise) return loadPromise;
  loadPromise = loadImg(ASSET_BASE + 'Projectile_1.png').then(im => { projectileImg = im; });
  return loadPromise;
}

// Subscribe at module load so we never miss a 'player_fire' even if the loop hasn't started.
on('player_fire', (payload) => {
  // Defer actual launch coords until next updateAndDraw — we need viewport.
  pending.push(payload);
});

/** @type {{ unit_id?: string, angle_deg: number, power: number }[]} */
const pending = [];

function spawnProjectile(payload, viewport) {
  const { w, h } = viewport;
  // Player castle is conceptually off-screen left; the camera shows the enemy castle on the right.
  const x0 = -40;
  const y0 = h * 0.62;

  const angle = (payload.angle_deg ?? 45) * Math.PI / 180;
  const power = Math.max(0.1, Math.min(1, payload.power ?? 0.7));
  const speed = power * MAX_SPEED;

  // Canvas Y points down; angle 90deg = "straight up" so vy must be negative there.
  const vx = Math.cos(angle) * speed;
  const vy = -Math.sin(angle) * speed;

  active.push({
    x: x0, y: y0, vx, vy, t_ms: 0,
    smoke_acc_ms: 0, impacted: false, post_impact_ms: 0,
    impactX: 0, impactY: 0,
  });
}

function targetY(viewport) { return viewport.h * 0.42; }

async function safeVfx(method, ...args) {
  try {
    const mod = await import('./vfx.js');
    if (typeof mod[method] === 'function') mod[method](...args);
  } catch (_) { /* vfx not ready yet — silent */ }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ w: number, h: number }} viewport
 * @param {number} dt_ms
 */
export function updateAndDraw(ctx, viewport, dt_ms) {
  while (pending.length) spawnProjectile(pending.shift(), viewport);

  const dt = Math.min(dt_ms, 50); // clamp huge frames so a tab-resume can't teleport the shot
  const tY = targetY(viewport);

  for (let i = active.length - 1; i >= 0; i--) {
    const p = active[i];

    if (!p.impacted) {
      p.x += p.vx * dt;
      p.y += p.vy * dt + 0.5 * GRAVITY * dt * dt;
      p.vy += GRAVITY * dt;
      p.t_ms += dt;

      p.smoke_acc_ms += dt;
      if (p.smoke_acc_ms >= SMOKE_EVERY_MS) {
        p.smoke_acc_ms = 0;
        safeVfx('triggerSmokeTrail', p.x, p.y, -p.vx * 0.3, -p.vy * 0.3);
      }

      // Impact when descending past the enemy castle's vertical band, or off-screen safety net.
      const descending = p.vy > 0;
      if ((descending && p.y >= tY) || p.x > viewport.w + 80 || p.t_ms > 3000) {
        p.impacted = true;
        p.impactX = p.x;
        p.impactY = Math.min(p.y, tY);
        safeVfx('triggerExplosion', p.impactX, p.impactY, { size: 'big' });
      }
    } else {
      p.post_impact_ms += dt;
      if (p.post_impact_ms >= POST_IMPACT_MS) {
        active.splice(i, 1);
        emit('cut_to_interior', {
          hp_self_after: state.hp_self_pct,
          hp_enemy_after: Math.max(0, state.hp_enemy_pct - DAMAGE),
          units_destroyed_ids: [],
        });
        continue;
      }
    }

    if (!p.impacted && projectileImg) {
      const rot = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(rot);
      ctx.drawImage(projectileImg, -SPRITE_SIZE / 2, -SPRITE_SIZE / 2, SPRITE_SIZE, SPRITE_SIZE);
      ctx.restore();
    }
  }
}

export function isFiring() {
  return active.length > 0 || pending.length > 0;
}
