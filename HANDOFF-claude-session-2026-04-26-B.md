# HANDOFF — Claude Code session 2026-04-26 (afternoon/evening)

> Written for the next Claude Code instance picking up on branch `pipeline-workflow-sami`.
> We are deep in the **refinement phase** — core game loop works, focus is visual fidelity vs source.

---

## State of the branch right now

**Branch:** `pipeline-workflow-sami`
**Last commit:** `d3a670c` — fix(transition): hard cut matching source
**Dev server:** `npm run dev` → `http://localhost:8765/`

Everything compiles. The full interactive loop works:
- Opening crow attack (7 crows, opening intensity) → player fires 3 units → forcewin at 16s → endcard

---

## What was done this session (in order)

### 1. Crow sprite overhaul (`scene_exterior/enemy_ai.js`)
Crows are now proper black bird silhouettes with a hanging bomb. Key details:

- **Scale:** `ctx.scale(2.0, 2.0)` — wingspan ~80wu, at camera zoom 0.6 = ~48 screen px = ~13% castle height. Verified by Gemini as correct.
- **Color:** `#1A1A1A` body fill (not pure black, not grey — warm near-black)
- **Wing flap:** `flapPhase = flightElapsed * 9`, alternating phase: `wingL = sin(phase)*18`, `wingR = sin(phase+π)*18` — opposite phase left/right
- **Bomb block is drawn in a SEPARATE unrotated save/restore** — bomb always hangs world-downward regardless of flight angle. The crow body block uses `ctx.rotate(angle)`, the bomb block does not.
- **Bomb:** short cord (`moveTo(0,7) lineTo(0,14)`), flat matte black sphere `arc(0,21,7)`, white skull `☠` centered on it. No yellow fuse spark (not in source).
- **Bomb scale matches crow:** `ctx.scale(2.0, 2.0)` in bomb block too.

### 2. Crow flight trajectory — sine wave (`scene_exterior/enemy_ai.js`)
Source analysis: crows fly sine-wave paths. Two consecutive crows are π out of phase — their crossing smoke trails create the figure-8 / helix the user noticed.

- **`sineAmp: 55` world units, `sineFreq: 0.0054` rad/ms** (reduced 50% from initial 0.010 per user request)
- `baseY` tracks straight-line Y; `y = baseY + sin(elapsed * sineFreq + sinePhase) * sineAmp`
- `_spawnCount % 2 * π` alternates phase per crow
- `_spawnCount` reset at each `startEnemyAttack()` call
- Intro crow also gets the sine treatment

### 3. VFX improvements (`scene_exterior/vfx.js`)
- **`spawnCrowImpact(x, y)`** — dark flash (KIND_FLASH, size=65, hue=28) + 7 charcoal dust puffs + 10-15 feathers
- **KIND_FEATHER = 5** — teardrop bezier shape, `#1A1A1A` fill, `rgba(90,90,90,0.5)` edge stroke, weak gravity + drag + sine lateral drift. Size: 5-11px.
- **KIND_FLASH = 4** — radial gradient white→warm hue→transparent
- **Two-pass render:** pass 1 non-sparks, pass 2 sparks with `ctx.shadowBlur=18`
- **PALETTES map:** `player: {hueBase:38}`, `enemy: {hueBase:15}` for orange/red explosion hues
- **`SMOKE_BY_WEAPON.crow`:** `{ color:'#383838', size:22, life_ms:1400 }` — dark puffier trail
- MAX_PARTICLES: 340

### 4. Screen shake on crow impact (`scene_exterior/index.js` + `enemy_ai.js`)
- `triggerShake()` exported from `scene_exterior/index.js`
- Lazy-imported in `enemy_ai.js` via `import('./index.js').then(...)` to avoid circular dep
- 7wu random translate offset, decays over 320ms, applied inside the camera transform block
- Called in `resolveImpact()` alongside `spawnCrowImpact()`

### 5. Exterior→interior transition (`scene_exterior/index.js` + `scene_interior/index.js`)

**Current state (last commit):** Brief white flash on cut (~80ms), then hard cut to interior.

**History of attempts (important context):**
1. First tried slide-from-below — user rejected ("not right")
2. Then tried zoom-punch (scale 1→6×) — user said "too brutal"
3. User said "small peek inside, just a small zoom in" — implemented 1.22× scale with fade-to-black
4. Dual Gemini agent comparison confirmed: **source uses a hard cut** (0 frames). The "entering" feel comes from wall destruction debris, not a camera effect.
5. Current: white flash on the cut frame, hard cut. RAF loop kept alive during zoom via `(visible || _zoomActive)` guard — this was critical to fix a bug where the second shot would timeout.

**The user is NOT satisfied with the transition yet.** Their last message before handoff: *"nope not right"*. This is an open issue.

**What the source actually does (confirmed by two parallel Gemini agents):**
- Hard cut, 0 transition frames
- The "entering castle" feel comes from: crow attack blows wall apart with debris, THEN hard cut to interior
- The HUD stays anchored and doesn't move
- Interior appears fully rendered at normal scale immediately

**Suggested next approach to try:** The interior should just appear — but you could make the interior **briefly show a bright frame then darken into its normal dark state** (inward flash) which feels like eyes adjusting when entering a dark room. Or simply accept the hard cut is correct and move on to other P1 fixes.

---

## Open issues (P1/P2 priority order)

### P1 — Transition still not satisfying to user
See above. User wants something that "feels like peeking inside the castle." 
Options to try:
- Accept hard cut is source-accurate and move on
- Try a 1-frame white flash then instant interior (what we have, just needs tuning)
- Try a very brief (150ms) zoom into the castle wall on the EXTERIOR before the hard cut, with no interior animation

### P1 — Environment: jungle still reads as flat vs source
Source has multi-layer depth with rain. We removed rain (correct — source is sunny). But the jungle background `_jungleHillPath` + `_drawRoundedTreeCanopy` in `scene_exterior/castles.js` may still look simpler than source. Last critique flagged this.

### P1 — HUD: missing castle icon art assets
`hud_top.js` calls `getImage('BLUE_CASTLE')` and `getImage('RED_CASTLE')`. These image assets may not exist, so icons fall back to nothing. Check `shared/assets.js` for what's registered.

### P2 — Goblin beam smoke trail
`SMOKE_BY_WEAPON.beam` is `{ color: '#F28C1F', size:10, life_ms:500 }`. Confirmed correct per Q4. Verify it's actually being passed — check `scene_exterior/projectile.js` passes `weapon_type:'beam'` for goblin shots.

### P2 — Interior unit sprites
Units are drawn in `scene_interior/units.js`. Source shows cyclop (red, one eye), skeleton (white), orc/goblin (green). Verify sprites look right.

---

## How to run the critique loop

```bash
npm run dev          # python3 -m http.server 8765 (keep running)

# Quick interactive verification (Playwright plays the game):
node tools/record_interactive.mjs --shots=2 --no-analyze
# Output: shots/interactive_TIMESTAMP.webm

# Ask Gemini a targeted question about the recording:
node tools/ask_video.mjs "your question" --video=shots/interactive_LATEST.webm

# Full critique vs source (MANDATORY before marking done):
node tools/critique.mjs --no-server
# Output: shots/critique_TIMESTAMP.md — P0/P1/P2 ranked diff
```

**Note on critique false positives:** `critique.mjs` uses `record_gameplay.mjs` (scripted, no drag gestures), so Gemini always flags "missing interactive mechanic" as P0. This is always a false positive — the interactive loop works fine, verified by `record_interactive.mjs`.

**Parallel Gemini agents pattern (user explicitly likes this):**
```bash
node tools/ask_video.mjs "question A" --video=shots/interactive_LATEST.webm 2>&1 | tail -30 &
node tools/ask_video.mjs "question B" --video=frames/clip2.mp4 --frames=12 --start=3 --end=7 2>&1 | tail -30 &
wait
```

---

## Key file map (refinement phase — only files likely to change)

| File | What it owns | Last changed |
|---|---|---|
| `scene_exterior/enemy_ai.js` | Crow sprite, sine flight, wave spawning | This session |
| `scene_exterior/vfx.js` | All particles: sparks, smoke, feathers, flash, dust | This session |
| `scene_exterior/index.js` | Exterior RAF loop, camera, screen shake, transition | This session |
| `scene_interior/index.js` | Interior RAF loop, tilt easing, transition | This session |
| `scene_exterior/castles.js` | Background art: jungle hills, sky gradient | Previous session |
| `shared/hud_top.js` | HP bars, VS badge, castle icons | Previous session |
| `scene_interior/castle_section.js` | Castle cross-section renderer | Previous session |

---

## Key constants to know

**Crow (`enemy_ai.js`):**
- Scale: `2.0` (both crow body block and bomb block)
- SineAmp: `55` wu, SineFreq: `0.0054` rad/ms
- Opening wave: 7 crows, normal wave: 2 crows
- Spawn stagger: 300ms between crows

**Camera zooms (`shared/world.js` CAM_PRESETS):**
- `blue`: zoom 0.92, centered on blue castle
- `red`: zoom 0.92, centered on red castle
- `wide`: both castles visible

**Castle geometry (`shared/world.js`):**
- `blue_castle.x = 180`, `red_castle.x = 820`
- `ground_y = 710`, `castle_h = 300`
- World is ~1000wu wide

**Ad timeline (`playable/script.js`):**
- `PHASE_TUTORIAL_MAX = 8000ms`
- `PHASE_FREEPLAY_END = 16000ms` (forcewin triggers)
- `PHASE_FORCEWIN_END = 19000ms` (endcard)

---

## What the user cares about most right now

The user is in **refinement mode** — they want visual fidelity to the source game. They are watching the recording closely and giving specific feedback. They've been very engaged with:
1. Crow visual accuracy (size, color, trajectory shape)
2. Impact particles
3. Scene transition feel

They explicitly like using parallel Gemini agents to compare source vs implementation. Always run the dual-agent pattern when checking visual quality.

The user pushes back immediately when things look wrong and gives short, direct instructions. Trust their eye — when they say "too brutal" or "not right," iterate quickly without over-explaining.

---

## Git state

```
Branch: pipeline-workflow-sami
Remote: https://github.com/Alexry375/hackathon-voodoo-2026
All commits pushed. Nothing staged.
```
