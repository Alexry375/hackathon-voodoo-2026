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

## [21:55] [done] MVP steps 1-3: audio + power-scaled damage + 3 weapon types

Three contained additions, bundle still clean (2.09 MB):

**1. `shared/audio.js`** — `startMusic()` (looping, vol .35), `playSfx({volume,rate})` (clones Audio per call so concurrent shots don't truncate), `installAudioOnFirstTap(canvas)` (one-shot pointerdown handler to satisfy autoplay policy). Wired in:
- `aim.js` on shot release (rate scales with power)
- `projectile.js` on rocket/volley impact (slow rate = boom)
- `projectile.js` on beam launch (high rate = laser zap)
- `enemy_ai.js` on enemy impact (slow + slightly higher pitch to differentiate)
- `playable/entry.js` + `index.html` install on canvas

**2. Power-scaled damage** — `projectile.js` replaces hardcoded `DAMAGE=18` with `lerp(8, 28, power)` per shot, threaded through to `cut_to_interior` payload.

**3. 3 weapon types** — extends `player_fire` payload with `weapon_type: 'rocket'|'volley'|'beam'` (additive, doesn't break the locked event contract):
- **rocket** (cyclop): single shot, low gravity (.001), bigger sprite, tendu trajectory
- **volley** (skeleton): 3-shot burst staggered 90ms, higher gravity (.0028) → cloche, smaller sprite, ±1° angle jitter, damage split 0.45× per shot but **batched** so all 3 sub-shots resolve as a single `cut_to_interior` (turn rotation only advances once)
- **beam** (orc): no ballistic flight — instant yellow gradient line from origin to enemy castle, 400ms render with fade, immediate explosion at target, 1.1× damage

Batch tracker (`Map<batchId, {remaining, totalDamage}>`) ensures volley sub-shots accumulate damage and only the LAST impact emits the resolution. Beams are batch-of-1 implicit.

`weapon_type` derivation lives in `aim.js` (`WEAPON_BY_UNIT` map). Spec §3 fidelity confirmed: cyclop=roquette, skeleton=rafale, orc=rayon (the spec calls it "Gobelin" but the official asset is `Character_Orc.psb` per Alexis's audit note — kept as `orc` in code).

## [21:55] [info] Next up: camera ping-pong + brick destruction + enemy AI loop + damage numbers

Steps 1-3 are independent of the camera architecture. Items 4-7 from my attack plan need the camera system landed first. About to start `shared/camera.js` + scene_manager sub-state rewrite.


## [22:15] [done] MVP step 4: camera ping-pong + 2-castle world rendering

Big architectural shift: scene_exterior now renders in WORLD coordinates with a `shared/camera.js` mapping world → screen. Both castles always rendered at fixed world positions; the camera decides what's framed.

**New modules:**
- `shared/world.js` — battlefield constants. blue castle at world (320, 760), red at (1080, 760), ground line y=760, castle render height 560 world units. Battlefield 1400×960 wide.
- `shared/camera.js` — `{x, y, zoom}` eased state. `setTarget(t, {ease})` for smooth pans, `snapTo(t)` for snap-cuts (spec §6 enemy shot ping-pong), `setPreset/snapPreset('overview'|'blue'|'red')`, `applyCameraTransform(ctx, viewport)` wraps world-space draws.

**Refactored:**
- `castles.js` — `drawCastles(ctx, {which, hp_pct})` is gone. New `drawWorld(ctx)` draws background + BOTH castles in world coords, reading hp from `state` directly. Tilt direction corrected (blue tilts left under fire, red tilts right).
- `projectile.js` — launch and target now world coords (`WORLD.blue_castle.x`, `WORLD.red_castle.x`). Speed/gravity retuned for the longer world distance (rocket 1.9, volley 1.6 wu/ms). Exposed `getLeadProjectilePos()` (camera follow) + `getRecentImpact(maxAgeMs)` (impact focus).
- `enemy_ai.js` — projectiles spawn from above the red castle, target the blue castle. World coords.
- `scene_exterior/index.js` — full rewrite of the loop. Per frame: clear → `_driveCamera()` → `updateCamera(dt)` → `applyCameraTransform()` → world draws (castles + vfx + enemy + projectile) → `ctx.restore()` → screen-space overlays (hud_top, scriptOverlay).

**Camera behavior (matches spec §6):**
- Default idle = focus on enemy castle (the ad's natural exterior shot)
- Player fires → preempt camera to blue castle (`on('player_fire')` handler)
- Projectile in flight → follow horizontally, zoom out to 0.55 so both castles roughly visible during the arc
- Recent impact (≤700ms old) → focus on impact point, zoom 0.95
- Enemy shot incoming → SNAP-cut to blue castle, no follow (spec §6 explicit: enemy shots don't follow)

**Validated visually** via Playwright screenshots:
- `/tmp/exterior_observe.png` — camera correctly snapped to blue castle for intro enemy attack
- `/tmp/exterior_post_intro.png` — after intro completes, transitioned to INTERIOR_AIM as expected (interior renders, RIP gravestone visible because enemy killed a unit during intro — confirms enemy_ai still wired correctly post-refactor)
- `/tmp/exterior_resolve_start.png` — EXTERIOR_RESOLVE shows red castle framed (idle preset, no projectile yet), ready for player's shot to land

Bundle still clean: 2.09 MB.

**Known limitations** (non-blocking, will polish if time):
- VFX rain renders inside the camera transform → follows the world; looks slightly off when camera is zoomed wide. Acceptable for MVP; can split rain into a screen-space pass later.
- `_driveCamera()` overrides `EXTERIOR_RESOLVE`'s setPreset('blue') the next frame because the idle target is `red`. Functionally correct (enemy castle is where the shot lands) but means the manual force-resolve via devbar doesn't visually pan from blue first. Real player shots work because `on('player_fire')` preempts before resolve.
- Projectile speeds tuned by feel, not matched to spec exactly. Will probably feel slightly slow.

## [22:15] [info] Steps 5-7 remaining

Out of the original 7-step plan: 5 (brick destruction), 6 (enemy AI freeplay loop, currently fires only at intro), 7 (damage numbers floating). All independent of the camera architecture — the keystone is in place. Will tackle next round.

## [22:35] [done] Fixed bg coverage + ghost-castle blobs at zoom-out

User-reported visual bugs after step 4:
1. Background didn't cover when camera zoomed out → green grass voids visible above/below.
2. "Multiple blurry enemy castles" appeared after a shot.

Root causes:
1. BG image was rendered at exactly `WORLD.width = 1400` and the screen-fill was solid green grass — anything beyond bg bounds showed empty.
2. `vfx.drawChunks()` (damage overlay) used hardcoded SCREEN coords (`cx = w/2`). Now that the exterior renders inside a camera transform, those screen coords got re-transformed and stretched into dark castle-shaped blobs at zoom-out.

Fixes:
- `vfx.js`: split the export. `updateAndDraw(ctx, _, dt_ms)` now does only world-space particles. New `drawRainOverlay(ctx, viewport, dt_ms)` does rain in screen space. **`drawChunks()` disabled** — the screen-space approximation is fundamentally incompatible with the camera transform; will be replaced in step 5 (proper world-space brick destruction).
- `scene_exterior/index.js`: screen-space sky gradient (matches bg's blue-grey palette) before the camera transform; world-space dark-earth ground fill (`#2a2f33`) extending far beyond the bg below `WORLD.ground_y`. Rain drawn after `ctx.restore()` so it stays viewport-locked.
- `castles.js`: bg image stretched 30% wider than `WORLD.width` so camera follow doesn't reveal bg edges.
- Tighter zoom: follow zoom 0.55 → 0.78 (kept tight on action), overview preset 0.40 → 0.55.

Validated via Playwright (`tools/screenshot_exterior.mjs`):
- `/tmp/exterior_resolve_damaged.png` — red castle at 50% HP, full bg coverage, no ghost blobs.
- `/tmp/exterior_shot_inflight.png` — projectile follow shows BOTH castles + sky + bg + ground earth, all clean.
- `/tmp/exterior_shot_post_impact.png` — impact focus shows world-space VFX explosion, no overlay artifacts.

Bundle still 2.09 MB.


## [HH:MM] [done] step 6 — enemy reply on every player turn + volley crash fix

Fixed a stray-arg crash in `scene_exterior/projectile.js` where volley sub-shots
called `_spawnRocketLike(payload, viewport, ...)` — `viewport` was undefined and
`weapon_type` ended up bound to it, throwing on every skeleton turn. The throw
happened mid-frame, between `applyCameraTransform` and `ctx.restore()`, so the
saved camera state stayed on the stack and accumulated across frames — that was
the "everything looks glitched after turn 2" the user reported. Wrapped the
world-space draw block in try/finally so a future throw can never strand the
camera again.

Step 6 itself: in `shared/scene_manager.js`, `cut_to_interior` now routes back
through `EXTERIOR_OBSERVE` (the existing intro-attack state) instead of jumping
to `INTERIOR_AIM`. `scene_exterior` already starts an enemy wave on
`EXTERIOR_OBSERVE` and calls `ready_for_player_input()` on completion, so the
alternation comes for free. Added end-state checks in `ready_for_player_input`
so a fatal enemy hit transitions to `END_DEFEAT` instead of looping back to aim.

Verified via `tools/trace_turns.mjs` — 2 player shots produce the cycle
`AIM → RESOLVE → OBSERVE → AIM → RESOLVE → OBSERVE → AIM` with no errors.

## [HH:MM] [done] playthrough fixes — slow shots, real hitbox, end screens

User played through the full playable; three real issues + one clarification:

- **Projectiles too fast**: rocket speed was 1.9 world-units/ms, beam-like
  visually. Halved across the board (rocket 1.05, volley 0.95). Player can
  now actually see the arc fly.
- **Red castle taking damage on misses**: there was no spatial collision —
  any projectile hitting the target Y line damaged the enemy regardless of
  X. Added `_hitsRedCastle(x)` (half-width = WORLD.castle_h * 0.22) gating
  both `addBite` and the damage value passed to `cut_to_interior`. Misses
  still emit `cut_to_interior` (turn must advance) but with damage=0; their
  explosion is downgraded to 'small' and the SFX volume drops.
- **No win/lose screen**: END_VICTORY / END_DEFEAT existed in the state
  machine but no scene rendered them. Hooked `subscribeScene()` in
  `script.js` to jump phase to `endcard` (full opacity) the moment either
  fires, so the ad always closes on something. Stored `game.endResult`
  ('win' | 'lose') for future end-screen labelling.

**Clarification on the "VS thing"**: VS = small VS badge between the two
HP bars at the top of the screen (pure HUD ornament). Win/lose screen is
a separate concern — that's the `endcard` overlay (now wired). VS badge
is in `hud_top.js` which is Alexis's owned file — flagging for him.

**For Alexis when you next sync this branch:**
1. `hud_top.js` — add the VS badge between the two HP bars per spec.
2. `endcard.js` — currently a single-state install screen. Could optionally
   branch on `window.__game?.endResult === 'lose'` to show a "TRY AGAIN"
   label instead of "PLAY", but for an ad the install CTA is fine in both.

Bites still don't follow castle tilt — left as-is per user.

## [23:24] [decision] gap analysis — current playable vs Gemini-distilled spec

Reviewed the new `results/` folder (Alexis's Gemini analysis output: 21
markdowns + 8 JSON iter plans, ~417 lines total). Most leaf files repeat
their parent doc; the 4 top-level reports + `B01_game_spec.md` carry ~95%
of the signal. Plan: distill into one `results/DISTILLED_GAMELOOP.md`
(~80 lines) and archive the raw Gemini output under `results/raw/` so
codegen has a single, clean contract instead of 30 files.

**User-confirmed scope rules going forward:**
- 1 character only (volley / Squelette). Drop the bottom selection menu.
- Basic flat-color shapes are a *fallback* when an asset is missing — not
  a wholesale replacement of the existing PNG castle render.
- Keep castle bites as-is (no rigid-body collapse / tilt physics).

**Game-loop gaps vs spec (asset fidelity excluded), ranked by
impact-per-effort:**

1. **Crisis hook missing.** Spec opens at ~30% HP under attack with hand
   cursor. We open at full HP + intro enemy salvo. Mechanically the same
   damage path; the urgency *read* isn't there. Fix: set
   `state.hp_self_pct = 30` at boot + show hand immediately.
2. **Pacing too long.** Spec target 15s. Current `script.js` has
   `PHASE_FREEPLAY_END = 40000` + 3s forcewin → ~43s. Retune phase
   constants. Open question whether 15s fits hook + 1–2 shots + win.
3. **Win/lose endcard not differentiated.** `endResult` is stored but
   `endcard.js` likely renders the same screen for both. Branch text/CTA
   on `window.__game.endResult`.
4. **Damage numbers (`-XX` floating, fading).** Spec calls these out as
   core feedback. Still parked. Small module.
5. **Kamikaze crows.** Spec antagonist = autonomous suicide units with
   smoke trails arcing in from the left. Currently `enemy_ai.js` shoots
   off-screen rockets. Same HP outcome, biggest visual swap for the
   smallest gameplay change → do last.

**Things to verify with a playthrough, not assume:**
- Trajectory dotted-line preview in `aim.js` matches spec (white,
  dotted, pivots in real time during drag).
- HP % updates snap-to-value (no animated jauge).
- `endcard.js` actually wires a tappable CTA into
  `Voodoo.playable.install()` — we call `.win()` but `.install()` is the
  conversion event.

**Acknowledged scope cuts (not gaps, just flag in distilled spec so they
read as deliberate):**
- 3 characters → 1. No selection menu.
- Tutorial hand should slide *from* a portrait per spec; with no menu it
  just appears on the active unit. Fine.
- Castle structural collapse / tilt → bites only.
- 3D end-card with running characters → flat CTA.

User confirmed plan: distill spec first, then close gaps in the order
above. Will start with #1 (hook) after writing the distilled spec.

## [23:55] [decision] enemy turn = crow waves, not red-castle volleys

Re-watched B01.mp4 + cross-referenced `results/`. Confirmed: the red
castle / red units never fire anything. The ONLY damage source on the
blue castle across the whole video is kamikaze crows from the screen-
left edge. Our current `enemy_ai.js` "off-screen rockets from upper-
left" is a divergence — the threat should be a visible flying entity
with a gray smoke trail that self-destructs on impact.

**Architectural good news:** the alternation in `scene_manager.js` is
structurally correct as-is. Crows are NOT periodic background pressure
— they fire only after the player's shot resolves, except for the very
first wave which is the opening hook before the player gets input.
That's exactly our INTRO → EXTERIOR_OBSERVE → INTERIOR_AIM flow today.
So the change is a reskin of `enemy_ai.js` projectile behavior, not a
rewrite of the state machine.

**User decisions on the crow-wave tuning:**

1. **Wave size = 2–3 crows always.** No oversized opening swarm. The
   opening "hook" reaches blue ≈30% HP by firing **several small waves
   back-to-back during the no-input window** — not one giant wave.
   (Reasoning: 5–6 crows in one volley is too much for a single hit
   read; spec also says "petites vagues de deux ou trois.")
2. **Lose path reachable.** The freeplay HP-floor (`hp_self_pct >= 30`)
   we currently lock during freeplay should be removed. If the player
   keeps missing, crows can drive HP to 0 → END_DEFEAT → endcard with
   `endResult = 'lose'`. Source video has no actual lose ending (it cuts
   abruptly), but `B01_game_spec.md:24` explicitly recommends a fail
   path: *"Scénario Fail : Le joueur rate, les corbeaux détruisent son
   château -> Écran 'Try Again' menant au store."*
3. **Lose CTA = "Play Again" → app store** (no in-ad replay). Aligns
   with the spec line above. No other file in `results/` contradicts.
4. **Crow visual fallback** if no sprite in assets dir: small black
   triangle/silhouette with a gray smoke trail behind it.
5. **Player input locked during enemy wave.** Player can't aim or fire
   while crows are still in flight or impacting — only on their own
   turn. Matches source video and current behavior.

**Implications for `enemy_ai.js`:**
- Replace rocket projectile struct with a crow entity: position, target,
  flat-ish flight (slight arc, not parabolic), gray smoke trail.
- Spawn from `x = -50, y = WORLD.ground_y - 200..400` (left edge,
  varying altitude), target = blue castle hitbox.
- On impact: same explosion VFX call we already have, same damage path
  via `applyDamageToSelf`, just remove the HP-floor clamp.
- Opening sequence (`INTRO` / first `EXTERIOR_OBSERVE`): fire ~3 waves
  back-to-back with short gaps until blue ≈ 30%. Subsequent waves
  (post-player-shot) = single 2–3 crow wave doing chip damage (~5–8%
  per wave) so the lose path is reachable but not certain in 2–3 turns.

**Implications for `endcard.js` (Alexis-owned):**
- Branch on `window.__game.endResult`: 'win' → "PLAY" / install CTA;
  'lose' → "PLAY AGAIN" / install CTA. Both go to store.

Will start coding the crow reskin + HP-floor removal once we close out
the rest of the gap-list (#1 hook, #4 pacing, #5 endcard branching, #3
damage numbers come first per the prior priority order — the crow swap
is #2 last because it's the largest visual change).

## [00:25] [done] gap #1 — crisis hook + intro pause + dev-prod parity

**Boot flow rewritten.** scene_manager now stays in `INTRO` until the
player taps; the "TAP TO START" overlay is a hard pause (no enemy wave,
no timers ticking). On tap, `script.js` calls `scene_manager.start()`
which fans out: INTRO → EXTERIOR_OBSERVE → opening crow wave (7 spawns,
~70% blue HP drop) → ready_for_player_input → INTERIOR_AIM.

Camera during intro = red castle (existing `mount()` does
`snapPreset('red')`). On EXTERIOR_OBSERVE the existing handler
`snapPreset('blue')` snap-cuts to blue for the wave.

**Dev = Prod parity.** `index.html` now imports `runScript()` and runs
the full scripted-ad timeline (intro overlay, tutorial hand, forcewin
flash, endcard). Devbar hidden by default; add `?devbar=1` to the URL
to bring it back. Removed the `_devForceState('INTERIOR_AIM')` calls
from both `index.html:119` and `script.js:36` that were short-circuiting
the opening EXTERIOR_OBSERVE state.

**Files changed:**
- `scene_exterior/enemy_ai.js` — `startEnemyAttack` accepts `intensity:
  'opening' | 'normal'`; opening = 7 spawns, normal = 2.
- `scene_exterior/index.js` — added `_firstWaveFired` flag;
  `EXTERIOR_STATES` now includes `'INTRO'` so the exterior renders
  during the tap-to-start pause.
- `playable/script.js` — intro phase only advances on tap (no
  time-based auto-advance); on dismiss, resets phase clock and calls
  `sceneStart()`; removed dev-force INTERIOR_AIM and
  `_devForceState` import; freeplay HP-floor lock removed (lose path
  reachable per prior decision).
- `index.html` — runScript() wired in dev; devbar hidden unless
  `?devbar=1`; no longer calls `start()` directly.

**Open issues for next iteration:**
- Camera transition red → blue is currently a hard snap-cut (existing
  `snapPreset('blue')` on EXTERIOR_OBSERVE). Source video doesn't
  describe a camera transition at all — Gemini analysis in `results/`
  has zero mentions of pan/zoom/cut during gameplay. The source uses a
  single wide framing showing both castles; our two-preset architecture
  (red OR blue) is our own divergence. Decision needed: ease the cut,
  add a wide preset showing both, or keep snap.
- Intro overlay still says "TAP TO START" in plain white text. May want
  to swap to something more on-brand once we have a logo.


## [00:38] [done] camera red→blue smooth ease (option 2)

Replaced the EXTERIOR_OBSERVE snap-cut with `setPreset('blue', {
ease: 0.02 })`. Camera now glides from red preset (held during INTRO)
to blue preset (~500ms transition) when the player taps to dismiss
"TAP TO START" and the opening crow wave kicks off.

Source video shows neither — it uses one static wide framing showing
both castles. But our architecture has two tight presets (red OR blue),
so a transition between them is unavoidable. Eased pan reads better
than a hard cut for this UX. `snapPreset('red')` in `mount()` still
sets the initial framing.

Files changed: `scene_exterior/index.js` (one-line swap, snapPreset →
setPreset on EXTERIOR_OBSERVE branch).

Next from gap-list: #4 pacing (current ~43s timeline → spec target 15s)
or #5 endcard win/lose branching. Holding for user direction.

## [01:20] [done] Gemini video analysis — 7 queries, 4 fixes applied

Ran 7 targeted ask_video.mjs queries against clip2.mp4 (Gemini 3.1 Pro
Preview) to verify current implementation against source video.
Results saved to results/Q1–Q7_*.md.

**Fix 1 — Crow spawn direction (enemy_ai.js)**
Q1 confirmed: crows enter from the right edge flying right→left with
downward tilt. Spawn point moved from `red_castle.x + rand(-80,40)`
to `red_castle.x + rand(60,140)` (clearly off-screen right). Velocity
is already computed as `(target-origin)/flightMs` so direction auto-
corrects. Q1 also revealed crows fly in intertwined pairs with
alternating sine-wave offsets — not yet implemented (nice-to-have).

**Fix 2 — Smoke trail color per weapon type (vfx.js + projectile.js)**
Q4: rocket (cyclop) = pinkish-red #D95B5B, thick ~35px dia, short
lifespan ~200ms. Volley (skeleton) = grey #8D8D8D, thin ~12px,
long lifespan ~1200ms (traces the full arc). `triggerSmokeTrail` now
accepts weapon_type param; SMOKE_BY_WEAPON lookup drives color/size/
lifespan. projectile.js passes p.weapon_type when emitting smoke.

**Fix 3 — Aim line dot sizing (aim.js)**
Q6+Q7: dots are solid white circles ~12px diameter, center-to-center
pitch ~40px, max ~9 dots along the full line. Was: radius=3, every 3
sim steps, no max. Now: radius=6, every 5 sim steps, hard cap at 9
dots. Trajectory remains straight (Q6: "strictly linear").

**Findings that need NO change (already correct):**
- Rain overlay: already implemented and called in scene_exterior ✓
- Scene transition: hard cut confirmed (Q5) — our instant switch ✓
- Camera follows projectile right: confirmed (Q3) — existing behavior ✓
- Aim line uses individual arc() circles: already correct in aim.js ✓

**Findings that identified new gaps (not yet coded):**
- Q2: Video starts mid-action at t=0 — explosion already happening.
  Our opening is more reserved. Acceptable for the playable version.
- Q2: "Single crow sprite tumbling downward at 00:00" suggests crows
  were already present before the video started — confirms they're a
  persistent background threat, not a scripted intro event.
- Q1: Paired intertwined crow flight (double-helix sine offset) —
  not yet implemented. Cosmetic nice-to-have.
- Q4: Goblin beam trail is orange #F28C1F — our beam is yellow/white
  gradient. May want to tune later.


## [01:12] [done] pacing + endcard branching + crow smoke color

**Pacing (gap #4):** Compressed timeline to ~19s post-tap:
- `PHASE_TUTORIAL_MAX`: 18000 → 8000ms (8s to fire 3 shots before freeplay)
- `PHASE_FREEPLAY_END`: 40000 → 16000ms (forcewin at 16s)
- `PHASE_FORCEWIN_END`: 43000 → 19000ms (endcard at 19s — squarely in 15-30s target)
Total playable session from tap: ~19s. Forcewin flash: 3s (unchanged).

**Endcard branching (gap #5):** `drawEndcard(ctx, t, result)` now takes
a `result` param ('win'|'lose'). Script.js passes `game.endResult ?? 'win'`.
- Win: title "VICTORY!" yellow, body "Build your castle / Crush your enemies", CTA "PLAY NOW"
- Lose: title "DEFEAT!" red, body "Try again in the full game / Avenge your castle", CTA "PLAY AGAIN"

**Crow smoke color (Q1):** Added `crow` weapon type to `SMOKE_BY_WEAPON` in vfx.js:
`{ color: '#4A4A4A', size: 17, life_ms: 1200 }` — dark charcoal, moderate trail matching Q1 spec.
`enemy_ai.js` now passes `'crow'` to `triggerSmokeTrail` instead of default.

**Still pending:**
- Crow sprite reskin (bomb → black bird silhouette)
- Goblin beam trail orange (#F28C1F) — minor tuning
- Paired intertwined crow flight — cosmetic nice-to-have
