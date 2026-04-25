# HANDOFF — Alexis

> Append-only log. Format: `## [HH:MM] [tag] title` then 2–3 lines.
> Tags: `[status]` `[done]` `[decision]` `[blocker]` `[question]` `[help]`

---

## [18:45] [status] Setup in progress — repo coordination layer

Creating team coordination infrastructure (CLAUDE.md, HANDOFF files, .gitattributes, STRATEGIE-Alexis-Sami.md). Module layout proposal waiting for validation from Sami and Daniel. No application code started yet — holding until module split is confirmed.

## [18:45] [done] Gemini video analysis pipeline

`tools/analyze_video.py` wraps `google-genai` SDK (model: `gemini-3.1-pro-preview`, Files API, configurable fps). Prompt `tools/prompt_playable_v2.md` runs a second-by-second pass then a game-design synthesis with mandatory self-audit. First report on `B01.mp4` saved to `tools/B01.report.md`.

## [18:45] [decision] Castle Clasher core mechanic = ballistic aiming, not unit placement

Gemini web app report described a drag-to-place mechanic (drop units onto interior platforms). Gemini API report correctly identified the real mechanic: **drag to aim inside interior view, release to fire a ballistic projectile**. Confirmed by watching the video. The web app interpretation was wrong. All future specs and codegen should use the API version as ground truth.

## [19:00] [decision] Switching from pipeline-split to scene-split for the playable

Pivot: the original CLAUDE.md proposes a pipeline split (analysis | spec | codegen | bundler). For shipping a faithful Castle Clashers playable in the time we have, that's too sequential — Sami would block waiting for my spec output. Replacing with a **scene-based split** that lets us both code in parallel from minute 1.

**Ownership:**
- **Alexis (me)** → `scene_interior/` — interior cross-section view (aim phase). Castle cross-section, plateformes inclinées, sprites units (Cyclope/Squelette/Gobelin) + idle anim, drag-aim input, ballistic dotted curve, bottom HUD (3 cards), RIP gravestone state, view-tilt following castle damage.
- **Sami** → `scene_exterior/` — exterior view (combat phase). Both castles full sprites + destruction states, projectile sprites + ballistic physics, explosion / smoke / rain VFX, top HUD (HP%), enemy auto-attack loop, environment.

**Why scene split (not asset split):** an asset without its scene logic is inert; sub-agents would block on shared scene files. A scene is self-contained, can be tested in isolation (`scene_interior.html`, `scene_exterior.html`), and lets each of us spawn 3-5 sub-agents internally without crossing each other's paths.

The pipeline (Track 2 deliverable) is *not* abandoned — the playable becomes the gold reference output. We derive the codegen pipeline from what worked, after the playable ships.

## [19:00] [decision] Shared interface — files + events to lock NOW

Tiny shared layer (~150 lines max). Decision taken unilaterally to unblock — Sami can challenge with `[decision]` if a constraint I'm missing, otherwise this stands.

**Files (`shared/`):**
```
shared/
  state.js          # global mutable state: hp_self_pct, hp_enemy_pct, turn_index, units_alive[]
  events.js         # tiny event bus: on(name, fn), emit(name, payload)
  scene_manager.js  # state machine: EXTERIOR_OBSERVE → INTERIOR_AIM → EXTERIOR_RESOLVE → loop
  index.html        # shell: mounts both scenes, reads cuts from scene_manager, no game logic
```

**Cross-scene events (the entire API):**

```js
// Interior → Exterior (player just released drag, fire the shot)
emit('player_fire', { unit_id: 'cyclop' | 'skeleton' | 'orc',
                      angle_deg: number,           // 0 = horizontal right, 90 = up
                      power: number })             // 0..1, derived from drag length

// Exterior → Interior (resolution done, switch back to aim phase)
emit('cut_to_interior', { hp_self_after: number,
                          hp_enemy_after: number,
                          units_destroyed_ids: string[] })

// Exterior → Interior (a player floor was hit, kill the unit on it)
emit('unit_killed', { unit_id: string })   // Interior shows RIP gravestone in its slot
```

Rule: neither scene reads the other's internal state. Everything goes through these 3 events + `shared/state.js`.

I'll commit the shared layer skeleton (typed JSDoc, no logic) within 15 min so Sami can start. Once committed, **lockdown — no schema change without `[decision]` + 15-min response window.**

## [19:05] [decision] Stack — vanilla Canvas2D + ES modules, no framework

Proposing for the playable: **plain `<canvas>` + ES modules + single `index.html`** in dev. Bundler (Sami's responsibility) inlines everything to a single self-contained HTML at the end.

- No PixiJS / Phaser / framework — overkill for 2 scenes, adds 100-300 KB to the bundle, blocks the <5 MB AppLovin target needlessly.
- Canvas2D is enough for the visuals shown in B01 (cross-section, sprites with destruction states, ballistic projectiles, simple particles). No 3D, no shader gymnastics needed.
- ES modules with relative imports during dev → bundler concatenates + inlines images as base64 + minifies for prod.

**Sami: post `[question]` if you want PixiJS or another stack.** Default sticks unless challenged within 15 min of you reading this.

## [19:05] [info] How I work — what to expect from my commits

Sami's agent: this is how my session operates, so you can interpret my commits and pace.

**1. Playwright in the loop.** I run `npx playwright` headed against `scene_interior.html` to take screenshots after every meaningful change, eyeball the result, iterate. Expect occasional commits like `wip(interior): screenshot pass — castle sprite drift fixed` with no functional change beyond visual tuning. This is not noise — it's how I verify the scene matches the source video.

**2. Sub-agents per asset, parallelised inside my scene.** When I have a clear scope (e.g. "implement the ballistic dotted curve renderer + drag input handler + 3 unit idle anims"), I dispatch 3 sub-agents in one message, each owning a different file in `scene_interior/`. They never touch your `scene_exterior/`. Result: my branch may suddenly grow by 3-5 files in a single commit window. Don't worry about it.

**3. Model rules I follow strictly:**
- **Opus everywhere**, including sub-agents. Quality > token cost in a 27h hackathon. Earlier rule said "Sonnet for implementation" — reverted: a Sonnet sub-agent missed the castle's asymmetry on v0, costing an iteration. Not worth the savings.

**4. Verification before claiming done.** I never say a feature works without a screenshot or video showing it. If you see `[done]` in my HANDOFF, it means I've visually verified it against the reference video.

**5. Sync every 30 min** as per CLAUDE.md ritual. I read `HANDOFF-sami.md` first thing each sync, scan for `[blocker]` `[help]` `[question]` `[decision]`. If I see something that affects the shared layer, I stop my sub-agents and answer first.

**6. Failure mode I'm watching for:** my sub-agents inventing details that aren't in the source video (e.g. inventing a unit not in B01). I anchor every visual decision to a specific timestamp in `tools/B01.report.md` — if you see me reference `[mm:ss]` in commits, that's why.

## [19:10] [decision] Bundler + integration ownership = Sami (Daniel out)

Daniel is no longer in the hackathon — confirmed. Adjusting accordingly: **Sami owns `scene_exterior/` + bundler + final single-file assembly.** I own `scene_interior/` + `shared/` + Playwright visual checks. No third role to fill.

## [19:10] [status] Next 30 min plan

1. Commit `shared/` skeleton (state.js, events.js, scene_manager.js, index.html shell). 15 min. **Lock the 3 events on commit.**
2. Set up `scene_interior/` folder + boilerplate canvas mount. 5 min.
3. Dispatch first sub-agent on the castle cross-section sprite (anchor: B01 frames at [00:03] and [00:28]). 10 min to launch.
4. Sync at H+30: expect first interior screenshot, even rough.

## [19:30] [done] Shared layer + scene_interior skeleton committed (0546e7d)

shared/{events,state,scene_manager}.js + scene_interior/index.js + index.html dev shell. 277 lines total. **3-event API LOCKED:** `player_fire`, `cut_to_interior`, `unit_killed`. Sami can subscribe to `player_fire` and emit the other two from `scene_exterior/`.

## [19:30] [status] castle_section v0 committed (4cdf1a1) — architecture good, visuals off

Sub-agent (Sonnet) produced `scene_interior/castle_section.js` (190 lines) with the right API: `drawCastleSection(ctx, {tilt_deg, damage_level})` + `getFloorAnchor(floor)`. Took a Playwright screenshot at 540×960, no console errors.

But the visual is wrong vs `frame_05s.jpg`:
- Real castle is **asymmetric** (left wall short, right wall full height)
- Real "floors" are **short bracket ledges** attached alternately to left/right walls — NOT full-width planchers
- Top is an irregular **broken-window cutout** to the sky, not a clean roof gap
- Bottom has a **wooden base extending laterally** with tank treads partially visible

Architecture stays. v1 iteration next: re-dispatch sub-agent with `frame_05s.jpg` as the canonical reference and explicit "this is what we got wrong" notes. Anchor coords from `getFloorAnchor` will need to alternate left/right per floor.

## [19:55] [done] castle_section v1 + 4 parallel modules integrated (bf82ff7)

v1 castle (commit d63a4c8): asymmetric layout matches frame_05s — broken left wall, full-height right with spire, 3 short alternating ledges, wooden base + tank tread gears. Some weathering still less rich than ref but solid foundation.

Then 4 Opus sub-agents ran in PARALLEL, each owning one module file (zero file collisions thanks to scene-split architecture):
- units.js — 3 character sprites + idle bob
- arrow.js — bobbing white down-arrow indicator
- aim.js — pointer drag + dotted ballistic curve + emits 'player_fire'
- hud_cards.js — bottom plank with 3 checker-bordered cards

Single integration commit in scene_interior/index.js (bf82ff7) wires them all in render order: bg → castle → units → arrow → aim_overlay → hud_cards. Screenshot `/tmp/interior_v1_full.png` is recognizably Castle Clashers vs frame_05s.

Validates the scene-split + locked-contract approach: 4 parallel agents shipped clean modules with no merge conflicts. Sami can do the same on scene_exterior on his side.

## [19:55] [info] What's still missing in scene_interior

Holdovers / TODOs for the interior scene:
- Turn-based unit selection (currently aim.js hardcodes ACTIVE_FLOOR=1, arrow.js hardcodes floor=1 too via index.js). Needs a turn manager that reads state.turn_index and picks the next alive unit.
- RIP gravestone module (when state.units[i].alive flips to false, draw a gravestone at that ledge anchor). Not started — Sami's scene_exterior emits 'unit_killed' so we just need to render the gravestone in interior.
- Tilt animation when castle takes damage (use castle_section's tilt_deg + a simple ease-out tween triggered on cut_to_interior).
- Damage progression on the castle (pass damage_level=1..3 based on hp_self_pct). Simple mapping: hp>=70→0, 50-70→1, 30-50→2, <30→3.
- Top HP bar — currently NO module renders it. Need to decide if it lives in shared/ or in scene_exterior (visible in both views in the source video).

## [20:00] [question] Sami — top HP bar (icons + percentages, top 80px) — where does it live?

Visible in BOTH the interior and exterior views, always at the top of the canvas. Three options:

(a) `shared/hud_top.js` — single module owned by me, drawn in both scenes loops. Pro: single source of truth, no duplication. Con: extends the shared layer.

(b) `scene_exterior/` owns it — you draw it. Interior calls a `drawTopHud(ctx)` you expose.

(c) Each scene draws its own copy. Con: drift risk.

**My preference: (a).** Lowest coupling, you do not have to surface anything for me. I will add `shared/hud_top.js` exporting `drawTopHud(ctx)` that reads `state.hp_self_pct` / `state.hp_enemy_pct`. Both scenes call it last in their render order.

If no `[decision]` from you within 30 min, I proceed with (a).

## [20:15] [done] Official PNG assets wired in interior (3ca3941)

Replaced procedural Cyclop/Skeleton/Orc drawings with the official Castle Clashers PNGs via window.ASSETS pattern. Pipeline lives at `tools/embed-assets.mjs` → `assets-inline.js` (committed, 2.1 MB). Helper `shared/assets.js` exposes `getImage(name)`. Sami: same pattern available for BLUE_CASTLE / RED_CASTLE / ROCKET / BOMB / BAZOOKA / CANNON / MUSIC / SFX — `<script src="./assets-inline.js">` is already in `index.html`. .gitignore added so RESSOURCES/ stays local.

## [20:22] [done] Turn rotation + HUD portraits PNG (0a4ba90)

`turn.js` (rotation [cyclop→skeleton→orc] sur cut_to_interior, skip morts) wiré dans aim/arrow/index. ACTIVE_FLOOR=1 hardcodé virée. HUD: portraits PNG officiels + outline jaune sur la card active. Devbar: boutons NEXT TURN et KILL ACTIVE pour tester en isolation. Vérifié end-to-end avec Playwright (4 screenshots).

## [20:35] [done] Bundle pipeline scaffold — dist/playable.html 2.07 MB (0cd6187)

esbuild + tools/build.mjs + playable/{entry,script-STUB,vsdk_shim}.js + scene_exterior/index.js STUB + dist/_template.html. Premier `npm run build` produit `dist/playable.html` (2.07 MB, sous le cap 4.8 MB AppLovin). Vérifié visuellement via Playwright : scene_interior rendu avec PNG officiels, devbar caché en mode prod, zéro erreur. Bundle ESM = 13.1 KB. Sami: bundler scaffold est en place, tu peux le push si tu veux mais le minify HTML/AppLovin compliance check est encore minimal — plus de polish à venir.

## [21:30] [decision] Sami prend le MVP fidèle à `docs/game-spec.md`

Pivot : Alexis bascule sur la pipeline (Track 2). Sami prend le MVP gameplay end-to-end. Tout le contexte qui n'était que verbal (bundle, gotchas, flow caméra ping-pong, conventions) est désormais figé dans `docs/MVP-handoff-sami.md`. Spec officielle : `docs/game-spec.md` (transcrit de `RESSOURCES/message.txt`). Audit "ce qui manque" : `docs/MVP-audit.md`.

Points clés inédits dans HANDOFF jusqu'ici :
- **Flow caméra ping-pong** (§5 du handoff Sami) : portrait → 2 châteaux trop éloignés, le projectile fait office de transition narrative entre les 2 vues. Aucun système caméra dans le code, à créer (`shared/camera.js`).
- **Pipeline build complet** (npm run embed/build/dev, mode auto-détect dev vs prod via URL).
- **Gotcha `$&` backreference** dans `tools/build.mjs` : `replace(needle, () => repl)` callback obligatoire, sinon `t!==$&&` minifié esbuild se fait corrompre en `t!==&` → SyntaxError.
- **Render order locked** : `drawTopHud(ctx)` puis `drawScriptOverlay(ctx, t)` en dernier dans chaque scene loop.
- **Devbar + scrub hooks** : `window.__forcePhase` / `window.__game.phase` pour Playwright.

Tu peux merger / supprimer mon stub `scene_exterior/index.js` à ta convenance — garde juste les 2 lignes de fin qui appellent les overlays.

## [20:50] [done] Full scripted playable ad live (a7eef42)

5 phases narrative end-to-end en 45s : intro (TAP TO START) → tutorial (hand cursor pulsant + demo drag) → freeplay → forcewin (white flash) → endcard (VICTORY + PLAY NOW → VSDK redirectToInstallPage). Calque B01 timeline. 5 screenshots Playwright OK, zéro erreur, dist/playable.html = 2.08 MB.

**Sami** : `shared/hud_top.js` est en place et appelée par `scene_interior` + ton stub `scene_exterior`. Quand ton vrai scene_exterior arrive, ajoute `drawTopHud(ctx)` puis `drawScriptOverlay(ctx, t)` en dernier dans ta loop pour que les overlays narratifs (intro/hand/forcewin flash/endcard) soient visibles aussi pendant tes phases. Le stub que jai mis sur ma branche fait déjà ça — tu peux le supprimer / merger avec ton vrai code sans souci.
