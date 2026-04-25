# Collaboration strategy — Alexis × Sami

> This document is addressed to **Sami's Claude Code agent** (and to Alexis's agent as a shared reference).
> It describes how our two agents should work together without stepping on each other.

---

## Context

We are working in parallel on the same repo during a 27-hour hackathon (Voodoo × Unaite × Anthropic, April 2026). Each of us has a Claude Code session running. The goal is a **Playable Ad Pipeline** (Track 2). The deliverable is the tool, not a single playable.

The authoritative reference for all conventions is **`CLAUDE.md`** at the repo root. Read it before anything else.

---

## What Alexis has already done (as of 2026-04-25 ~18:45)

| Artifact | Location | What it does |
|---|---|---|
| Video analysis script | `tools/analyze_video.py` | Wraps `google-genai` SDK, uploads video via Files API, calls `gemini-3.1-pro-preview` at 2 fps, saves markdown report |
| Prompt v2 | `tools/prompt_playable_v2.md` | Second-by-second pass + game design synthesis + 6-point self-audit |
| Castle Clashers report | `tools/B01.report.md` | First API-generated analysis of `RESSOURCES/B01.mp4` |
| Journal | `tools/journal-castle-clasher.md` | Iteration log of prompt engineering decisions |

Key finding from the analysis: **Castle Clashers core mechanic = ballistic artillery aiming.** Player drags inside the interior cross-section view to set trajectory, releases to fire. See `HANDOFF-alexis.md [decision] 18:45` for full reasoning.

---

## What Sami has already done (observed on `origin/sami`)

| Artifact | Location | What it does |
|---|---|---|
| `analyze.py` | root | Gemini-based analysis → **structured JSON spec** with `source_analysis` + `playable_candidates[]` |
| `spec.json` / `spec_claude.json` / `spec_perp.json` | root | Output specs from different LLM runs |
| `assets/Castle Clashers Assets/` | root | Unzipped official assets: PNGs (Blue/Red Castle, Projectiles, Weapons, Background), PSBs (Cyclope, Orc, Skeleton), Music.ogg, Sfx.wav |
| `frames/` | root | Extracted frames + clips from source video |
| `AppLovin Playable Preview.html` | root | AppLovin format reference/template |
| `scripts/royal_match_creatives.py` | scripts/ | Analysis script for a different game (scope reference) |

---

## Module ownership

> This split is **a proposal** — confirm with Daniel before locking.

| Module | Owner | Folder |
|---|---|---|
| Video → Markdown report | Alexis | `pipeline/analysis/` |
| JSON spec schema (contract) | **Shared** (lock after H+8) | `pipeline/spec/` |
| JSON spec → HTML/JS skeleton | Sami | `pipeline/codegen/` |
| Bundler (single-file assembly) | Sami | `pipeline/bundler/` |
| Asset pipeline (Scenario MCP) | TBD | `pipeline/assets/` |
| End-to-end CLI runner | Alexis | `pipeline/runner/` |
| Official game assets (provided) | N/A (static) | `RESSOURCES/Castle-Clashers-Assets/` |

**The key handoff point between our two workstreams is `pipeline/spec/schema.json`.** Alexis produces a spec, Sami consumes it. We need to agree on this schema before either of us writes any code that depends on it.

---

## Overlapping work to resolve

Both Alexis (`tools/analyze_video.py`) and Sami (`analyze.py`) wrote a Gemini video analysis script independently. We need to decide:

**Option A — Keep Alexis's as the canonical analysis tool, Sami's `analyze.py` becomes the spec generator.**
- Alexis's script: markdown game-design report (human-readable debug artifact, 14-section audit).
- Sami's script: JSON spec (machine-readable, codegen input, multi-candidate).
- They serve different purposes → both stay, wired in sequence: `analyze_video.py` → `analyze.py` (or a refactored version of it).

**Option B — Merge both into one script** that outputs markdown + JSON in one call.
- Simpler pipeline, but requires Sami and Alexis to agree on merged prompt and output format.
- Risk: coordination overhead in the middle of a hackathon.

> **Recommendation: Option A.** Sami keeps ownership of the JSON spec output; Alexis keeps ownership of the human-readable analysis. The JSON schema becomes the contract.

---

## How to communicate without blocking each other

1. **Never edit each other's files.** See ownership table above.
2. **Read each other's HANDOFF every 30 min.** Scan for `[blocker]`, `[help]`, `[question]`. If you see one that concerns you, respond in *your* HANDOFF with `[question]` or `[decision]`.
3. **The spec schema is the interface.** If you need to change `pipeline/spec/schema.json` after H+8, post a `[decision]` in your HANDOFF first and give the other dev 15 min to object before you commit.
4. **Commit often, small commits.** If you're about to push something that changes the spec or the runner interface, log it in your HANDOFF with `[decision]` first.
5. **If you're blocked on something that belongs to the other dev**, post `[help]` in your HANDOFF. Do not touch the other dev's folder — find a workaround or hardcode a stub while waiting.

---

## Sync ritual

Every 30 minutes:
1. `git pull --rebase` on your branch.
2. Read both HANDOFFs (2 min max).
3. Post your own `[status]`.

---

## The shared spec schema — what we need to agree on

Before writing any codegen code, Sami and Alexis need to agree on the minimal JSON shape. Starting point (from Sami's `analyze.py` draft):

```json
{
  "game_name": "string",
  "core_mechanic": {
    "input_type": "drag | tap | swipe | tap-and-hold",
    "description": "imperative sentence",
    "win_state": "string",
    "lose_state": "string or null"
  },
  "art_style": {
    "descriptors": ["string"],
    "color_palette_hex": ["#hex"]
  },
  "playable_candidates": [
    {
      "id": "A",
      "hook_first_3s": "string",
      "session_length_seconds": 20,
      "end_card": {
        "headline": "string",
        "cta": "string"
      },
      "complexity": "low | medium | high"
    }
  ]
}
```

> This is a starting point. Discuss in your HANDOFFs or at the next team sync and post the agreed version to `pipeline/spec/schema.json`.

---

## Castle Clashers — ground truth for the demo

Core mechanic (confirmed from Gemini API analysis of `B01.mp4`):
- **Interior view (cross-section):** player tap-holds a unit, drags to set ballistic trajectory (white dotted arc), releases to fire.
- **Exterior view:** projectile flies, hits enemy castle, physical destruction + HP% update.
- **Loop:** exterior (enemy attacks, observe damage) → interior (player aims + fires) → exterior (resolution) × 4 rounds.
- **NOT a placement mechanic.** The Gemini web app got this wrong; the API is correct.

Official assets available in `RESSOURCES/Castle-Clashers-Assets/` (and Sami's `assets/` folder):
- `Blue Castle.png`, `Red Castle.png`, `Background.png`
- `Projectile_1.png`, `Projectile_2.png`, `Weapon_1.png`, `Weapon_2.png`
- `Character_Cyclop.psb`, `Character_Orc.psb`, `Character_Skeleton.psb` (PSB = Photoshop, need conversion)
- `Music.ogg`, `Sfx.wav`

---

*Created: 2026-04-25 — Alexis + Claude Sonnet 4.6*
