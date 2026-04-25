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
