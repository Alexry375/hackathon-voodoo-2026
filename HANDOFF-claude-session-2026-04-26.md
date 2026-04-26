# HANDOFF — Claude Code Session 2026-04-26 (castle-clasher-v2-alexis / pipeline-workflow-sami)

> Written for the next Claude Code instance picking up this branch.
> Branch at time of writing: `pipeline-workflow-sami`
> All changes committed and pushed in the commit accompanying this file.

---

## What was shipped this session

### 1. Intro flow — cinematic crow pan after tap

**Problem:** The game was jumping straight into INTERIOR_AIM on load. Source video shows: static overview → crown attack → enemy fires → player aim.

**Fix:**
- `mount()` in `scene_exterior/index.js` now does `snapTo(red_castle)` and stops. No crow yet.
- On first `EXTERIOR_OBSERVE` state transition (after player taps), `startIntroCrow(callback)` is called. Crow flies red→blue over ~3s. Camera tracks it via `getIntroCrowPos()`.
- When crow arrives, callback fires: enemy attack starts (`intensity: 'opening'`, 7 crows). After attack completes → `ready_for_player_input()`.
- Subsequent waves skip the crow entirely (`_firstWaveFired` flag).

**Files:** `scene_exterior/enemy_ai.js`, `scene_exterior/index.js`

Key exports added to `enemy_ai.js`:
```js
export function startIntroCrow(onArrived) { ... }
export function getIntroCrowPos() { ... }   // returns {x,y} or null
export function stopIntroCrow() { ... }
```

Null-safety: `if (_introCrow) _drawCrow(ctx, _introCrow)` — must guard after TTL expiry sets `_introCrow = null`.

---

### 2. Castle spacing widened

`shared/world.js`:
```js
blue_castle: { x: 180,  y: 710 },  // was x: 320
red_castle:  { x: 1220, y: 710 },  // was x: 1080
```

`CAM_PRESETS.overview` zoom also loosened to `0.60` (was `0.72`). Same value hardcoded in `_driveCamera` during projectile flight.

---

### 3. Weapon-specific projectile sprites

4 new assets embedded in `assets-inline.js` as base64 data URIs:
- `PROJECTILE_ROCKET` → Projectile_1.png (grey rocket, 256×256)
- `PROJECTILE_BOMB` → Projectile_2.png (dark green bomb, 256×256)
- `WEAPON_BLUE` → Weapon_1.png (blue triple-barrel, 256×118)
- `WEAPON_RED` → Weapon_2.png (red cannon, 256×132)

`scene_exterior/projectile.js`: `WEAPON_SPRITE` map routes `rocket→PROJECTILE_BOMB`, `volley→PROJECTILE_ROCKET`. Sprite sizes bumped: rocket 44→65, volley 26→45.

`scene_interior/units.js`: weapon sprites drawn to the right of each unit. Cyclop gets WEAPON_RED, Skeleton gets WEAPON_BLUE. Orc (beam) has no weapon sprite.

**Gotcha:** `isImageReady(key)` returns false if `getImage(key)` was never called. Both modules warm the cache at load time:
```js
try { getImage('WEAPON_RED'); getImage('WEAPON_BLUE'); } catch (_) {}
```

---

### 4. Interior scene cleanup

`scene_interior/index.js` — two draw calls removed:
- `drawHudCards(...)` — bottom portrait tray, not in source game
- `drawArrow(...)` — bouncing triangle above unit, not in source game

---

### 5. Aim overlay tuning

`scene_interior/aim.js`:
- `BARREL_OFFSET_X = 110` — trajectory and cone now start at barrel tip, not unit center
- `SIM_GRAVITY 0.5 → 0.22`, `SIM_V0 18 → 22`, `SIM_STEPS 60 → 80` — flatter arc, matches source
- Cone opacity `0.12 → 0.18`

---

### 6. HUD sizing

`shared/hud_top.js`:
- `ICON_SZ 44 → 52`, `BAR_H 20 → 28`
- VS text `bold 17px → bold 22px`, HP% `bold 16px → bold 22px`

---

## Last critique results (no P0 issues)

From `shots/critique_2026-04-26T01-56-00.md`:

| Priority | Issue | File |
|----------|-------|------|
| P0 | (none) | — |
| P1 | Destruction mask shows sky instead of dark interior | `damage_overlay.js` / `scene_exterior/index.js` render order |
| P1 | UI uses system fonts, borderless HP bars | `shared/hud_top.js` |
| P1 | Flat pine-tree background vs layered parallax jungle | `scene_exterior/index.js` background draw |
| P1 | Missing fiery explosion + floating damage numbers on hit | `scene_exterior/vfx.js` |
| P1 | Tank treads lack gear/tread detail | `scene_exterior/index.js` / castle assets |
| P2 | No cancel X icon during aiming | `scene_interior/aim.js` |
| P2 | Projectile spawns as white ball then jumps to rocket sprite | `scene_exterior/projectile.js` — likely image load timing |

---

## How to pick up

```bash
git pull
npm install
npm run dev          # http://localhost:8765
# make changes
node tools/critique.mjs   # mandatory before reporting done
```

1. Read `shots/critique_2026-04-26T01-56-00.md` for the ranked fix list.
2. P1 visual issues are the right next target — all cosmetic, no event contract changes needed.
3. Run `node tools/ask_video.mjs` with a targeted question before guessing at any visual detail. Check `results/` first.

---

## Branch notes

- This file is on `pipeline-workflow-sami`. Branch `castle-clasher-v2-alexis` may have diverged — check before merging.
- `shared/` files are locked by contract — coordinate via CLAUDE.md before editing.
- `HANDOFF-sami.md` is the append-only session log; keep that format for ongoing Sami sessions.
- `HANDOFF-alexis.md` is Alexis's equivalent.

---

*Session ended 2026-04-26. Last critique: `shots/critique_2026-04-26T01-56-00.md`. No P0 issues.*
