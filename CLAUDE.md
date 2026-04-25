# CLAUDE.md — Playable Ad Pipeline: Tools & Workflow

> **Branch:** `pipeline-workflow-sami`
> **Primary reader:** A fresh Claude Code instance picking up this project cold.
> **Purpose:** Document the iterative development workflow that was built during the Castle Clashers playable ad session. Read this before touching any file. Every tool described here exists and is tested.

---

## What this project is

**Hackathon Voodoo × Unaite × Anthropic — April 2026, Track 2.**

The deliverable is a **reproducible pipeline**, not just a single polished playable. The pipeline takes a gameplay video and produces a working HTML5 playable ad that faithfully reproduces the source game's look and feel.

```
source gameplay video (mp4)
  → Gemini video analysis       → results/*.md      (structured observations)
  → Claude Code implementation  → scene_*/ playable/ (Canvas2D game)
  → record current build        → shots/*.webm       (live recording)
  → Gemini critique             → shots/critique_*.md (ranked fix list)
  → iterate
```

Demo target: **Castle Clashers** (`frames/clip2.mp4`, 225 frames at 4fps in `frames/`).

---

## Repository layout

```
hackathon-voodoo-2026/
├── CLAUDE.md                        # this file
├── HANDOFF-sami.md                  # append-only session log (Sami)
├── HANDOFF-alexis.md                # append-only session log (Alexis)
│
├── index.html                       # dev entry point (:8765)
├── shared/                          # locked contracts — edit with care
│   ├── scene_manager.js             # state machine: INTRO→EXT_OBS→INT_AIM→EXT_RES→END
│   ├── state.js                     # hp_self_pct, hp_enemy_pct, units[]
│   ├── events.js                    # on() / emit() — the 3-event contract
│   ├── world.js                     # WORLD constants (castle positions, ground_y)
│   ├── camera.js                    # preset-based camera with ease
│   └── assets.js                    # image loader
│
├── scene_exterior/                  # battlefield view [owner: Sami]
│   ├── index.js                     # mounts exterior, drives camera
│   ├── enemy_ai.js                  # crow wave system (intensity: opening|normal)
│   ├── projectile.js                # player shots: rocket/volley/beam
│   ├── vfx.js                       # rain, explosions, smoke trails, damage chunks
│   └── damage_overlay.js            # bite marks on castle walls
│
├── scene_interior/                  # aim/fire view [owner: Sami]
│   ├── aim.js                       # drag-aim input + dotted trajectory overlay
│   ├── turn.js                      # which unit is active this turn
│   └── castle_section.js            # castle cross-section renderer + floor anchors
│
├── playable/                        # ad script layer [owner: Sami]
│   ├── script.js                    # phase state machine: intro→tutorial→freeplay→forcewin→endcard
│   ├── endcard.js                   # win/lose end screen + CTA button
│   ├── hand_cursor.js               # tutorial drag-hint cursor
│   └── entry.js                     # prod bundle entry point
│
├── tools/                           # pipeline tools (all Node.js ESM)
│   ├── ask_video.mjs                # query Gemini on a video or frames
│   ├── record_gameplay.mjs          # scripted full-timeline recording (no interaction)
│   ├── record_interactive.mjs       # Playwright actually plays the game (drag-aims, fires)
│   ├── critique.mjs                 # record + compare vs source frames → ranked fix list
│   ├── screenshot_phases.mjs        # phase-by-phase static screenshots (Alexis)
│   ├── build.mjs                    # esbuild bundle
│   └── embed-assets.mjs             # inline assets as base64
│
├── results/                         # Gemini video analysis outputs (committed)
│   ├── Q1_crow_spawn.md             # crow entry point, direction, smoke color
│   ├── Q2_intro_idle.md             # first 3s: motion, particles, camera
│   ├── Q3_cam_resolve.md            # camera tracking during projectile flight
│   ├── Q4_smoke_color.md            # smoke trail colors per weapon type
│   ├── Q5_scene_cut.md              # exterior↔interior transition style
│   ├── Q6_aim_line.md               # aim overlay dot size and style
│   └── Q7_aim_detail.md             # aim overlay dot count and pitch
│
├── shots/                           # recorded gameplay (gitignored — large)
│   ├── gameplay_*.webm              # scripted recording
│   ├── interactive_*.webm           # Playwright-played recording
│   ├── critique_*.md                # Gemini critique output
│   └── *_analysis.md               # ask_video output on a recording
│
└── frames/                          # source video frames (4fps PNGs, committed)
    ├── clip2.mp4                    # source video (69 MB)
    └── clip2_NNNN.png               # 225 frames, 1-indexed, 4fps
```

---

## The 3-event contract (do not break)

All cross-scene communication goes through exactly 3 events. Never add more.

| Event | Direction | Payload |
|---|---|---|
| `player_fire` | interior → exterior | `{ unit_id, angle_deg, power, weapon_type }` |
| `cut_to_interior` | exterior → shared | `{ hp_self_after, hp_enemy_after, units_destroyed_ids[] }` |
| `unit_killed` | enemy_ai → shared | `{ unit_id }` |

`scene_manager.js` listens to all three and drives the state machine. Never call `killUnit()` or `applyDamage*()` directly from a scene — always go through events.

---

## Scene state machine

```
INTRO
  └─(sceneStart() called by script.js on tap)─→ EXTERIOR_OBSERVE
       └─(enemy wave done, ready_for_player_input())─→ INTERIOR_AIM
            └─(player_fire emitted)─→ EXTERIOR_RESOLVE
                 └─(cut_to_interior emitted)─→ EXTERIOR_OBSERVE  ← loops
                                            └─(hp_enemy ≤ 30)─→ END_VICTORY
                                            └─(hp_self  ≤  0)─→ END_DEFEAT
```

**Key invariant:** `INTERIOR_AIM` is the only state where `aim.js` accepts pointer events. Drags during any other state are silently dropped.

---

## Ad timeline (script.js phases)

After the player taps the intro overlay, `game.t0` resets and this clock starts:

| Phase | Duration | What happens |
|---|---|---|
| `intro` | until tap | TAP TO START overlay. Full pause — no game ticks. |
| `tutorial` | 0–8s (or 3 shots) | Hand cursor tutorial. Bails to freeplay at 8s even if player hasn't shot. |
| `freeplay` | 8–16s | Player plays freely. Forcewin triggers at 16s or if enemy HP ≤ 5. |
| `forcewin` | 16–19s | White flash, enemy HP forced to 0. |
| `endcard` | 19s+ | Win/lose end screen with CTA button. |

Total: ~19s from tap. Within AppLovin 15–30s target.

---

## Tools — how to use each one

### Prerequisites

```bash
npm install          # installs esbuild + playwright
npm run dev          # starts python3 -m http.server 8765
# OPENROUTER_API_KEY must be in .env or environment
```

---

### `tools/ask_video.mjs` — query Gemini on a video

The first tool built. Answers a question about a video file by sending it to Gemini 3.1 Pro Preview via OpenRouter. Used to build the `results/` reference library.

```bash
# Send the source mp4 directly (best temporal understanding — Gemini sees the full video)
node tools/ask_video.mjs "your question" --out=results/Q8_something.md

# Send a specific video (e.g., a recorded gameplay session)
node tools/ask_video.mjs "describe the aim gesture" --video=shots/interactive_*.webm

# Frame mode: sample N PNGs instead of the full video (cheaper, narrower)
node tools/ask_video.mjs "question" --frames=8 --start=5 --end=15

# Flags
--video=FILE      mp4 or webm to send (default: frames/clip2.mp4)
--frames=N        use sampled PNGs instead of video
--start=SEC       frame window start
--end=SEC         frame window end
--model=MODEL     OpenRouter model (default: google/gemini-3.1-pro-preview)
--out=FILE        save markdown response to file
```

**When to use:** Any time you have a specific question about the source game that isn't answered in `results/`. Always save with `--out=results/QN_topic.md` so the answer is available in future sessions without re-querying.

**Cost:** ~$0.05–0.15 per query at full video. Re-read existing `results/` files before querying.

---

### `tools/record_gameplay.mjs` — record the scripted timeline

Launches Playwright, taps the intro, then lets the scripted 19s timeline play out automatically (no interaction). Records via `canvas.captureStream()` + `MediaRecorder`.

```bash
node tools/record_gameplay.mjs
node tools/record_gameplay.mjs --no-analyze          # skip Gemini pipe
node tools/record_gameplay.mjs --duration=30000      # longer recording
node tools/record_gameplay.mjs --question="custom"   # custom Gemini question

# Or via npm
npm run record
```

Output: `shots/gameplay_TIMESTAMP.webm` + `shots/gameplay_TIMESTAMP_analysis.md` (unless `--no-analyze`).

**When to use:** Quick visual check of a specific phase (forcewin flash, endcard appearance). Faster than `record_interactive` because there's no wait for game state.

---

### `tools/record_interactive.mjs` — Playwright actually plays the game

The most important recording tool. Polls `window.__sceneState()` for `INTERIOR_AIM`, reads `window.__getActiveFloor()` at shot time, then performs a real `pointerdown → pointermove → pointerup` drag gesture on the correct floor anchor. Confirms each shot by waiting for `EXTERIOR_RESOLVE`.

```bash
node tools/record_interactive.mjs
node tools/record_interactive.mjs --shots=5 --no-analyze
npm run play
```

Output: `shots/interactive_TIMESTAMP.webm`.

**How it aims:** Drags 130px down-left from the unit origin. The aim mechanic in `aim.js` uses drag-AWAY-from-unit (Angry Birds style): dragging down-left fires an up-right arc toward the red castle. Power ≈ 0.65 (130/200 FULL_POWER_PX). Angle ≈ 45°.

**Floor anchors** (from `castle_section.js`, tilt=0):
```
floor 0 (top, Left):  origin (157, 351)  — cyclop
floor 1 (mid, Right): origin (383, 507)  — skeleton
floor 2 (bot, Left):  origin (157, 663)  — orc
```

**Turn order** (from `turn.js`): floor 1 → floor 0 → floor 2 → repeat (cyclop → skeleton → orc). Dead units are skipped automatically.

**Window hooks required** (already in production code, dev-only):
- `window.__sceneState` — set in `shared/scene_manager.js`
- `window.__getActiveFloor` — set in `scene_interior/turn.js`
- `window.__game` — set in `playable/script.js`
- `window.__forcePhase` — set in `playable/script.js`

**When to use:** Whenever you want to verify that the full interaction loop works — aim registers, dotted line appears, projectile fires, damage resolves. After any change to `aim.js`, `projectile.js`, `enemy_ai.js`, or `script.js` turn logic.

---

### `tools/critique.mjs` — self-critique loop

**This is the mandatory step after every batch of visual changes.**

Starts the dev server, records gameplay, sends the recording + 10 sampled source frames to Gemini in one call, returns a ranked diff.

```bash
node tools/critique.mjs
node tools/critique.mjs --no-server      # if dev server already running
node tools/critique.mjs --webm=shots/x.webm  # skip recording, reuse existing
node tools/critique.mjs --frames=15     # more source reference frames
npm run critique
```

Output format (Gemini returns structured markdown):
```
## ✅ Matches well       — things the playable gets right
## ❌ Discrepancies      — ranked P0 / P1 / P2 issues with timestamps
## 🔧 Fix list           — concrete Canvas2D fixes ordered by impact
## 🚫 Cannot assess      — things Gemini couldn't evaluate
```

Exit codes: `0` = no P0 issues, `2` = P0 issues found (usable as CI gate).

**Rule:** Do NOT report a task done to the user without running `critique.mjs` at least once since the last push. Skip only for: pure tooling changes, pure refactors with no visual output, or if critique was already run on identical state.

---

## How the workflow was built (session trace)

This is the exact sequence of steps taken to go from nothing to the current state. Use it to understand *why* decisions were made, not just what they are.

### Step 1 — Understand the source video

The `results/` directory was created first. Seven targeted questions were sent to Gemini via `ask_video.mjs` to build a structured reference library before touching a line of code:

| File | Question | Key finding used in code |
|---|---|---|
| `Q1_crow_spawn.md` | Crow entry point and smoke | Origin off-screen right, dark grey `#4A4A4A` smoke |
| `Q2_intro_idle.md` | First 3s motion | Video starts mid-action; camera static |
| `Q3_cam_resolve.md` | Camera after fire | Follows projectile right; both castles never in frame |
| `Q4_smoke_color.md` | Smoke per weapon type | Rocket `#D95B5B` thick, volley `#8D8D8D` thin/long |
| `Q5_scene_cut.md` | Exterior↔interior cut | Hard cut confirmed (no fade) |
| `Q6_aim_line.md` | Aim overlay style | White filled circles, straight line, no arrowhead |
| `Q7_aim_detail.md` | Aim dot count/pitch | Max 9 dots, 30–50px pitch, 10–15px diameter |

**Rule going forward:** Before guessing at a visual detail, check `results/` first. Only send a new query if the question isn't already answered.

### Step 2 — Gap analysis

After reading the results, a systematic gap analysis was done comparing the implementation to the spec. Gaps were ranked by impact and logged in `HANDOFF-sami.md`. The ranking:

1. **Opening crisis hook** — game started on `INTERIOR_AIM` directly; source starts with enemy crow attack first
2. **Crow visual** — bomb sprite used; source shows black bird silhouette
3. **Damage numbers** — parked (user decision)
4. **Pacing** — 40s timeline vs 15–30s target
5. **Endcard win/lose branch** — hardcoded "VICTORY!" regardless of result

### Step 3 — Fix gaps in order

Each gap was fixed as a coherent batch then logged in HANDOFF:

**Gap #1 (opening hook):** `script.js` now holds `scene_manager` in `INTRO` state until the player taps. On tap, `sceneStart()` triggers `EXTERIOR_OBSERVE` with `intensity: 'opening'` (7 crows). The `_firstWaveFired` flag in `scene_exterior/index.js` ensures subsequent waves use `intensity: 'normal'` (2 crows).

**Gap #4 (pacing):** Phase constants compressed: `PHASE_TUTORIAL_MAX 18000→8000`, `PHASE_FREEPLAY_END 40000→16000`, `PHASE_FORCEWIN_END 43000→19000`.

**Gap #5 (endcard):** `drawEndcard(ctx, t, result)` now takes a `result` param. Win: "VICTORY!" yellow + "PLAY NOW". Lose: "DEFEAT!" red + "PLAY AGAIN".

**Visual fixes from Gemini results:**
- `aim.js`: dot radius 3→6, spacing every 5 sim steps, cap at 9 dots (`DOT_MAX`)
- `vfx.js`: `SMOKE_BY_WEAPON` map with per-weapon color/size/lifespan. Added `crow` type: `#4A4A4A` charcoal
- `projectile.js`: passes `p.weapon_type` to `triggerSmokeTrail`
- `enemy_ai.js`: crow spawn X moved off-screen right (`red_castle.x + rand(60,140)`)

**Bug fix (opening wave kills all units):** With 7 crows and 30% unit-targeting probability, `E[kills] = 2.1` before the player's first shot. Fixed by adding `castleOnly: intensity === 'opening'` to the wave object, passed to `spawnProjectile`.

### Step 4 — Build the recording loop

The user asked to integrate gameplay recording into the workflow. Three tools were built in sequence:

**`record_gameplay.mjs`** (first): Playwright + `canvas.captureStream()` + `MediaRecorder`. Taps intro, waits for scripted timeline. Limitation: player doesn't interact.

**`record_interactive.mjs`** (second): Added `window.__sceneState` and `window.__getActiveFloor` hooks to production code. Playwright polls these to know when to fire. Bug found and fixed: first version used hardcoded `setTimeout(5500)` — shots landed during `EXTERIOR_OBSERVE` and aim.js silently dropped them. Fixed by polling `__sceneState() === 'INTERIOR_AIM'` before each drag.

**`critique.mjs`** (third): Chains `record_gameplay` + `ask_video` in one call. Sends the recording + source frames to Gemini asking for a structured P0/P1/P2 diff. Made mandatory in this CLAUDE.md.

### Step 5 — Known open issues (from last critique run)

From `shots/critique_2026-04-25T23-30-45.md` and `interactive_*_analysis.md`:

| Priority | Issue | File to change |
|---|---|---|
| P0 | Player projectile visually hits blue castle instead of red | `scene_exterior/index.js` camera preset during EXTERIOR_RESOLVE |
| P1 | HUD uses plain horizontal bars; source has angled VS-badge bars | `hud_top.js` (Alexis's file — coordinate first) |
| P1 | Environment is snowy rain; source is sunny green jungle | background asset / scene_exterior render |
| P1 | Castle base uses simple circles; source has tank treads | `castle_section.js` (treads already drawn, may just be a sizing issue) |
| P2 | Crow sprite is still a bomb/rocket; should be black bird | `enemy_ai.js` drawing code |
| P2 | Goblin beam trail is yellow/white; source orange `#F28C1F` | `vfx.js` SMOKE_BY_WEAPON beam entry |

---

## How to pick up a session cold

1. Read `HANDOFF-sami.md` tail — last `[status]` tells you where work stopped.
2. Check `shots/` for the most recent `critique_*.md` — it has the ranked fix list.
3. Read the relevant `results/Q*.md` files for any domain questions before querying Gemini again.
4. Make changes → run `npm run critique` → fix P0s → push.

**Do not:** Guess at visual details. Check `results/` first. Query Gemini only if the answer isn't there. Never mark a task done without a critique run.

---

## Environment

```bash
# API key (required for ask_video / critique)
OPENROUTER_API_KEY=sk-or-v1-...   # in .env at repo root

# Dev server
npm run dev     # python3 -m http.server 8765

# Build
npm run build   # esbuild bundle → dist/playable.html

# Tools
npm run record  # scripted recording
npm run play    # interactive recording (Playwright plays)
npm run critique  # full critique loop
```

Auth for Claude Code itself is OAuth (`claude auth status` → `authMethod: oauth_token, apiProvider: firstParty`) — Max subscription, not API billing. OpenRouter charges are separate (Gemini queries only).

---

*Last updated: 2026-04-26 — pipeline-workflow-sami branch.*
