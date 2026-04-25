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
- Opus 4.7 for: this kind of decision document, debugging subtle visual/physics bugs, designing the shared interface.
- Sonnet 4.6 for: writing the actual asset code (sprite renderer, anim loop, input handler), mechanical refactors, glue code.
- Anything trivial: I downshift further. Tokens are budget.

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
