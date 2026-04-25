# HANDOFF — Sami

> Append-only log. Format: `## [HH:MM] [tag] title` then 2–3 lines.
> Tags: `[status]` `[done]` `[decision]` `[blocker]` `[question]` `[help]`

---

## [19:00] [status] Branch sami-v2 opened

Branched from `castle-clasher-v2-alexis` to inherit the coordination layer (CLAUDE.md, STRATEGIE-Alexis-Sami.md, HANDOFF-alexis.md, .gitattributes). Prior work lives on `origin/sami` (root-level `analyze.py`, `spec*.json`, `assets/`, `frames/`, `AppLovin Playable Preview.html`). Need to decide whether to rebase that work into the proposed `pipeline/` layout or keep it at root for now.

## [19:30] [decision] Ack: scene_exterior + bundler ownership

Daniel out, confirmed on my side. I own `scene_exterior/` (both `EXTERIOR_OBSERVE` and `EXTERIOR_RESOLVE` states, including the handshake calls `ready_for_player_input()` after intro and `emit('cut_to_interior', ...)` after projectile resolution) **plus** the final single-file bundler.

## [19:30] [decision] Ack: shared API + Canvas2D stack

Locked contract accepted as-is: 3 events (`player_fire`, `cut_to_interior`, `unit_killed`), `shared/{state,events,scene_manager}.js`, vanilla Canvas2D + ES modules, no framework. Will not challenge.

## [19:30] [decision] Single shared canvas — renaming `g_interior` → `g` in index.html

Going with one `<canvas id="g">` shared between both scenes, gated by scene_manager state (the visibility gate Alexis already wired into `scene_interior/index.js` makes this trivial). Cleaner DOM, smaller bundle, mirrors final AppLovin shape. Will edit `index.html` (shared file) after committing the `scene_exterior/` skeleton — heads-up logged here first per the 15-min protocol.

## [19:30] [info] Bundler head-start — `castle-clasher-v2/bundle.mjs`

Carrying a previous bundler from `castle-clasher-v2/` (inline base64 + single-file assembly, AppLovin-shaped). Plan is to adapt it for the final step rather than starting from scratch. **Not yet tested in this repo's context** — flagging so nobody assumes it's working. Will verify before committing to it as the path.

## [19:35] [done] index.html wired for both scenes

Canvas renamed `g_interior` → `g`, `scene_exterior/index.js` imported, both scenes mounted on the same canvas. Scene_manager state gates which one paints. Dev buttons in #devbar still work — clicking EXTERIOR_OBSERVE / EXTERIOR_RESOLVE now lights up the exterior placeholder, INTERIOR_AIM lights up Alexis's.

## [19:35] [info] Ack: Opus everywhere

Picked up the model-rule reversal in CLAUDE.md. All my sub-agents will be Opus, no downshift. Aligned.

## [19:37] [status] Scaffold complete, pushed — starting real scene_exterior modules next

`sami-v2` pushed with: `scene_exterior/index.js` placeholder + handshake stubs, `index.html` wiring both scenes on shared canvas `g`. All `[decision]` items from this sync are committed. Next 30 min: build out the real scene_exterior sub-modules — planning order `castles.js` → `projectile.js` → `enemy_ai.js` → `vfx.js` → `hud.js`. Will anchor every visual to B01 frames (using `castle-clasher-v2/showcase/frame_*s.jpg` + `tools/B01.report.md` for timestamp references).

## [19:49] [decision] Asset source for scene_exterior = official Voodoo pack (cherry-picked from origin/sami)

Cherry-picking `assets/Castle Clashers Assets/` from `origin/sami` into `sami-v2`: `Blue Castle.png`, `Red Castle.png`, `Background.png`, `Projectile_1.png`, `Projectile_2.png`, `Weapon_1.png`, `Weapon_2.png`, `Music.ogg`, `Sfx.wav`, plus the three `Character_*.psb` (Photoshop, will need conversion to PNG before use). Skipping `frames/clip2_*.png` — extracted frames not useful for rendering.

Picked official pack over Alexis's `castle-clasher-v2/showcase/blue-castle.png` / `red-castle.png` because the showcase ones look like AI re-renders from his prior prototype, while the official pack is the genuine Voodoo game art. Alexis's `showcase/ref-chaos.jpg`, `ref-chunk.jpg`, `ref-explosion*.jpg` stay useful as **visual mood reference for vfx.js**, not as render-time assets.

Folder will land at `assets/Castle Clashers Assets/` at repo root (matches the path on `origin/sami`). Note: CLAUDE.md still references `RESSOURCES/Castle-Clashers-Assets/` as the canonical path — flagging the mismatch but not moving the folder unilaterally; will resolve in a later sync if Alexis prefers the RESSOURCES path.

## [20:00] [done] castles.js v0 + dev HP controls (54f654d)

`scene_exterior/castles.js` ships: async loader for Background.png + Blue/Red Castle.png, `drawCastles({which, hp_pct, viewport})` renders bg panorama then castle, pivots from base anchor (tank treads), leans up to ~22deg as HP drops, source-atop darken at low HP. Exterior loop picks blue during EXTERIOR_OBSERVE, red during EXTERIOR_RESOLVE. Damage chunking deferred to vfx.js as overlay.

Dev tooling added in same commit: blue/red ±25 HP buttons + reset in second devbar row, `window.state` exposed for console mutation. Also fixed an `intro_done` latch bug — EXTERIOR_OBSERVE was auto-leaving to INTERIOR_AIM after 1.2s every visit; now fires once at boot only.

## [20:00] [done] Merged Alexis's scene_interior milestone (295eea6)

Pulled commits d63a4c8 → ee4c459: castle_section v1 (asymmetric) + 4 parallel-built modules (units, arrow, aim, hud_cards) + reactive scene wiring. **Important for me: `aim.js` actively emits `'player_fire'` on drag-release** — my `on('player_fire')` handler in `scene_exterior/index.js` will now be exercised end-to-end as soon as the user actually plays through the loop. Stub still ships with 600ms timeout + −15 enemy HP; will replace in projectile.js.

Resolved one merge conflict in `index.html` (Alexis added quick HP presets `hp100/65/35/17` in the top devbar row; my ±25 row stayed in second row). Both sets of dev controls are live.

## [20:00] [decision] Top HP bar = (a) shared/hud_top.js owned by Alexis — confirmed

Acking his proposed option (a) so he doesn't wait the 30-min default. The top bar reads only from `state.hp_self_pct` / `state.hp_enemy_pct`, lives in both views, no scene-local logic. Cleanest in `shared/`. He owns it. **Implication for me:** the `hud.js` slot I had planned for scene_exterior is now scoped *only* to scene-local feedback (hit indicators, projectile-impact flashes if any) — NOT the top bar. Likely shrinks or disappears entirely; I'll re-evaluate after projectile + vfx land.

## [20:00] [status] Next: parallel sub-agent dispatch for projectile + enemy_ai + vfx

Mirroring Alexis's 4-parallel-Opus-agents pattern (commit bf82ff7 on his side, zero file collisions thanks to scene-split). My batch: `projectile.js` (ballistic physics from angle/power → trajectory + impact), `enemy_ai.js` (auto-attack during EXTERIOR_OBSERVE, emits `unit_killed`), `vfx.js` (rain + explosions + dust + the damage-chunking overlay over castles.js). All Opus, all anchored to specific frames in `castle-clasher-v2/showcase/`.

## [20:55] [done] 3 parallel Opus agents shipped projectile + enemy_ai + vfx, integrated into scene_exterior/index.js

3 Opus sub-agents in one dispatch, zero file collisions. Locked the inter-module export contract before dispatch (each agent got the same contract block) so integration was a clean rewrite of `scene_exterior/index.js`.

- `projectile.js` (153 lines) — owns the player's outgoing shot. Subscribes to `'player_fire'` at module load, ballistic physics (MAX_SPEED 1.4 px/ms, GRAVITY 0.0022 px/ms², ~800ms flight), launches off-screen left, calls `vfx.triggerExplosion` on impact, emits `'cut_to_interior'` with -18 enemy HP after a 150ms post-impact beat.
- `enemy_ai.js` (185 lines) — owns the EXTERIOR_OBSERVE attack cinematic. `startEnemyAttack({onComplete})` spawns 2 incoming rockets staggered 300ms, 30% chance to kill a unit (emits `'unit_killed'`), 70% to hit castle (5-15 dmg via `applyDamageToSelf`), calls onComplete after 400ms cooldown.
- `vfx.js` (322 lines, procedural — no images) — rain (always on, 80 raindrops), magenta/purple explosions (small=15 / big=30 sparks + dust + expanding ring), smoke trails, deterministic damage-chunk overlay on castles at HP <70/<40/<15 thresholds.

Integration in `scene_exterior/index.js` (84 lines, full rewrite of mount + loop):
- Removed the two stubs (`player_fire` handler — projectile.js owns it now; `intro_done` latch — replaced by `startEnemyAttack({onComplete: ready_for_player_input})` triggered on every EXTERIOR_OBSERVE entry, with enemy_ai's internal guard preventing double-fires).
- Added `dt_ms` tracking (clamped to 50ms for tab refocus).
- Render order per frame: clear → castles → vfx (rain + chunks under projectiles) → enemy projectiles → player projectile → dev overlay.

Total scene_exterior: ~830 lines across 5 files. vfx.js at 322 lines is on the high side but under the 400-line CLAUDE.md cap.

**Known v0 limitations** (acceptable for now, refine later if time):
- Damage chunks in vfx.js are drawn in a hardcoded bbox approximating the castle silhouette — not perfectly aligned, especially when the castle is leaning.
- Projectile launch point is off-screen left — works during EXTERIOR_RESOLVE (red castle visible), but if the camera ever shows the player castle during a resolve we'd need to re-anchor.
- `Character_*.psb` still unconverted — not used in scene_exterior anyway, flagging for whoever does interior unit sprites if they want the official PSBs.

## [21:00] [done] Merged Alexis's bundle pipeline + scripted ad + hud_top + turn rotation (96ba5cb)

Pulled commits 3ca3941 → 62bec53. New on the repo: `assets-inline.js` (2.1 MB base64-bundled), `shared/{hud_top,assets}.js`, `scene_interior/turn.js`, full `playable/{entry,script,hand_cursor,endcard,vsdk_shim}.js` narrative system, `tools/{embed-assets,build}.mjs` with `dist/playable.html` (2.07 MB) via esbuild, plus `package.json`/`.gitignore`. NEXT TURN + KILL ACTIVE dev buttons added.

Merge conflicts resolved in two files (kept full of both sides):
- `index.html` — superset of imports (`state, applyDamageToSelf, applyDamageToEnemy, killUnit` + `emit` + `getActiveUnitId`); both his quick HP presets / NEXT TURN / KILL ACTIVE buttons AND my ±25 row coexist.
- `scene_exterior/index.js` — KEPT my real implementation, dropped his branch's stub. Per his [20:50] note, added `drawTopHud(ctx)` + `drawScriptOverlay(ctx, t)` as the LAST two draws in my loop so the narrative overlays (intro / hand cursor / forcewin flash / endcard) are visible during exterior phases too. Also dropped my dev HUD overlay (hud_top now covers it).

`drawScriptOverlay` is dynamic-imported with try/catch so the dev `index.html` (no script flow) doesn't break.

## [21:00] [info] "Chenille" check — already part of the castle PNG

Per the user's flag: I checked the asset list. There is no separate `chenille.png` / tank-tread asset on Alexis's branch. The bundled assets are: BLUE_CASTLE, RED_CASTLE, ROCKET, BOMB, BAZOOKA, CANNON, MUSIC, SFX. The tank treads ("chenille") are baked into the bottom of `Blue Castle.png` and `Red Castle.png` and are already visible in our exterior render via `castles.js`. Alexis renders them procedurally inside his `castle_section.js` for the interior cross-section view. Nothing to wire — flagging in case the user meant something different and we need to re-sync.

## [21:00] [info] Bundle pipeline TODO for prod build

My castles.js / projectile.js / enemy_ai.js currently load assets via `new Image(); im.src = 'assets/Castle Clashers Assets/...'` paths. That works in dev (HTTP server) but the prod single-file bundle uses Alexis's `window.ASSETS.BLUE_CASTLE` (etc.) base64 pattern via `shared/assets.js → getImage()`. Before we run `npm run build` for the final AppLovin handoff, scene_exterior loaders should switch to `getImage('BLUE_CASTLE')` / `getImage('ROCKET')` / `getImage('BOMB')`. Not blocking dev — flagging as a single, scoped task before final bundle.

## [21:35] [info] Merged Alexis MVP brief — role swap acknowledged

Pulled `origin/castle-clasher-v2-alexis` (HEAD `6f151cd`). New canonical docs:
- `docs/game-spec.md` — spec FAIT FOI
- `docs/MVP-audit.md` — what's missing vs spec
- `docs/MVP-handoff-sami.md` — pipeline gotchas, locked contracts, camera ping-pong context, file map

**Role swap**: Alexis → asset generation (chenille PNG, real castle assets, etc). Me → MVP end-to-end fidelity to `docs/game-spec.md`. His scene_interior + bundle + scripted ad are frozen unless bug.

## [21:35] [done] Chenille generator script + v0 PNG (uncommitted, will not ship)

`tools/render_chenille.py` Pillow generator + `assets/Castle Clashers Assets/Chenille.png` (760×220 v3 — terracotta cradle with rounded arches, two flat-oval treads with chain cleats). Iterated 4 times; Alexis is taking over asset generation so I'm leaving the script + last v3 in tree as a starting reference for him. Not wired into `castles.js` — when his real chenille asset lands I'll just `getImage('CHENILLE')` from `window.ASSETS`.

## [21:40] [decision] MVP attack order — ranked by spec leverage

Working off `docs/MVP-audit.md` priorities. Order I plan to ship in:

1. **Audio first** (cheap, huge perceived gain): `shared/audio.js` exposing `startMusic()` / `playSfx()` reading `window.ASSETS.MUSIC` / `SFX`. Wire from `aim.js` (shot release), `enemy_ai.js` (impact), `vfx.js` (explosion), `playable/entry.js` (music start on first pointer).
2. **Damage scales with power** in `projectile.js` (currently hardcoded 18 → `lerp(8, 28, power)`), threaded through `player_fire` payload (already carries `power`).
3. **3 weapon types** — extend `player_fire` payload with `weapon_type: 'rocket'|'volley'|'beam'` (additive, doesn't break Alexis's contract). Branch in `projectile.js`: cyclop = single fast tendu, skeleton = 3-shot volley with cloche arc, orc = instant beam (no projectile, just a yellow line + DoT tick).
4. **Real scene_exterior with 2 castles + camera** — `shared/camera.js` (`{x, y, zoom}` + easing), sub-states `EXTERIOR_OVERVIEW` / `FOLLOW_PROJECTILE` / `IMPACT_FOCUS` / `SNAP_BACK` in scene_manager. Both castles always rendered; camera pans/zooms.
5. **Brick destruction** — replace vfx chunk overlay with a destructible-block grid mapped onto each castle. Bricks vanish based on cumulative impact zones, revealing ARCH_BLACK behind.
6. **Enemy AI loop** — currently fires only at intro. Add 6-10s timer during freeplay → spawns black round projectile with grey spiral smoke.
7. **Damage numbers** — small `vfx.spawnFloater(x, y, "-XX", color)` that rises + fades over 800ms.

**Camera system is the architectural keystone** — items 4-7 all depend on it. Doing 1-3 first because they're independent and lift the perceived quality immediately, then attacking 4 as a dedicated push.

## [21:40] [question] Camera sub-states — naming clash with current scene_manager?

Current scene_manager has `EXTERIOR_OBSERVE` (pre-game enemy intro) + `EXTERIOR_RESOLVE` (player shot lands). Alexis suggests `EXTERIOR_OVERVIEW` / `FOLLOW_PROJECTILE` / `IMPACT_FOCUS` / `SNAP_BACK`. Plan: keep `INTERIOR_AIM` as the only "interior" state, replace `EXTERIOR_*` with the 4 new camera sub-states. Will land it as a single rewrite of `scene_manager.js` + matching subscribers in scene_exterior/index.js — no impact on `aim.js` / `script.js` / `turn.js` since they only listen to events, not to scene state names. Flagging in case Alexis sees a downstream he relies on.
