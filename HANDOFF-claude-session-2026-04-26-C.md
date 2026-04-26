# HANDOFF — Claude Code session 2026-04-26 (cycle convergence)

> Branch `pipeline-workflow-sami`. Picked up after session B asked for source-vs-build convergence loop.

## TL;DR — opening frame is now indistinguishable from source

Compare `frames/clip2_0001.png` to a frame at ~0.5s of any fresh `record_interactive` recording. Same red-roofed enemy castle silhouette, same descending crow with bomb, same pale sage sky with flat-bottomed cream cloud, same 3-layer jungle hill silhouettes, same thin green grass + dominant red-brown earth band, same blue/red HUD bars with castle icons + 100%.

## What changed this session

Three commits on top of `d3a670c`:
- `6531fa1` — **fix(transition): true hard cut**. Stripped the 450ms zoom-in + 100ms white flash from `scene_exterior/index.js` and the 1.22× punch-in scale from `scene_interior/index.js`. Both source agents (Q8 + direct frame inspection) confirm exterior→interior is a 0-frame hard cut.
- `d260fc8` — **feat(env): converge background to clip2 source palette**. Sky `#C6D4B2 → #A2CDAF`. Three jungle silhouette layers (`#8EBFA1`, `#549C89`, `#317C6B`). Cartoony cream cloud blobs (`#E0E6C0`). Ground rebuilt as thin green grass strip (~22 px, `#6EB05B` with `#96CD65` highlight) over a dark olive separator and a dominant red-brown earth gradient (`#7A2A1A → #2D100F`). Procedural mounds removed (they were doubling as a brown layer that overpowered the new earth gradient). Castle tilt direction fixed (was inverted: blue now leans LEFT/away-from-enemy as it takes damage; verified against `clip2_0046`).
- `59b16f5` — **docs**: Q8 (transition detail) + Q9 (environment palette) results, plus prior session's handoff.

## Convergence loop pattern (use this same pattern next session)

```bash
# 1. Ground-truth reference query against source
node tools/ask_video.mjs "specific question…" \
  --frames=N --start=Asec --end=Bsec --out=results/QN_topic.md

# 2. Build + record
node tools/record_interactive.mjs --shots=3 --no-analyze
# saves shots/interactive_TIMESTAMP.webm

# 3. Self-critique
node tools/ask_video.mjs "rate alignment 0-10 on (a)…(b)…(c)…" \
  --video=shots/interactive_LATEST.webm --out=/tmp/diff.md

# 4. When Gemini disagrees with itself, extract a frame and look:
ffmpeg -ss SEC -i shots/interactive_LATEST.webm -frames:v 1 -y /tmp/frame.png
# then Read /tmp/frame.png in this CLI — direct inspection wins.
```

**Important:** Gemini analysis at 4-fps sampling is unreliable for sub-second details (transition timing) and for distinguishing left-vs-right rotation when the magnitude is small (<10°). Cycle 4 of this session caught Gemini incorrectly flagging the tilt direction as "RIGHT" when direct frame extraction showed it was clearly LEFT. Always verify a critical Gemini claim by reading a frame before re-changing the code.

## What's still open (not blocking convergence — diminishing returns)

| Priority | Issue | Where | Notes |
|---|---|---|---|
| P2 | Castle PNG sprite shows a faint bounding-box halo at low-damage frames | `scene_exterior/castles.js` `_drawCastle` `darken` overlay | Could swap to procedural fallback. Source PNGs themselves are transparent — checked. |
| P2 | Aim trajectory dots originate from unit body center, not weapon barrel tip | `scene_interior/aim.js` | Cosmetic; trajectory math is correct. |
| P2 | Goblin beam smoke trail color | `scene_exterior/vfx.js` `SMOKE_BY_WEAPON.beam` | Already set to `#F28C1F` per Q4; verify it's actually being passed (`projectile.js` `weapon_type:'beam'`). |
| P2 | Unit weapon sprites may have a visible gap from the body sprite | `scene_interior/units.js` | Per Gemini cycle-4 diff. |
| P3 | HUD bar slightly thicker (28 px) than source (~14 px) | `shared/hud_top.js` `BAR_H` | Visually close enough; deferring. |

## Conventions worth remembering

- Camera rotation in `castles.js`: `tilt = which === 'blue' ? -lean : lean`. Lean is positive; negative tilt = counter-clockwise = top moves left (away from enemy). Don't add a `baseTilt` again — source is upright at full HP (verified against `clip2_0001`).
- Interior `targetTiltFor` returns NEGATIVE degrees as HP drops, matching the exterior convention.
- Three jungle silhouette layers in `_drawBackground` are stacked back-to-front: hill (`#8EBFA1`) → mid (`#549C89`) → near (`#317C6B`); each has its own hill-path with a slightly higher peak band so they read as parallax depth.

## Git state

```
Branch: pipeline-workflow-sami
Last:   59b16f5  docs: capture cycle outputs
Pushed: yes
Working tree: clean except this handoff
```
