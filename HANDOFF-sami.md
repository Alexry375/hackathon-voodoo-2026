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
