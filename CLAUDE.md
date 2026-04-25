# CLAUDE.md — North Star

> **Shared reference for the 3 Claude Code instances working on this repo (Alexis, Sami, Daniel).**
> Read at the start of every session. Update only when a team decision is made.

---

## Goal & track

**Hackathon Voodoo × Unaite × Anthropic — April 2026**

**Track 2 — Playable Ad Pipeline.**
The **deliverable is the tool** (a reproducible pipeline), not a single polished playable.

Target pipeline:
```
gameplay video (mp4) → Gemini analysis → structured spec → HTML/JS generation (Claude Code) → assets via Scenario MCP → single HTML file (<5 MB, portrait, 15–30s)
```

Demo validation target: **Castle Clashers** (source video `RESSOURCES/B01.mp4`, assets in `RESSOURCES/Castle-Clashers-Assets/`).

---

## Scope freeze at H+8 (Saturday 19:00)

> Team rule: **no new scope after Saturday 19:00.**
> Any new idea after that time goes into `BACKLOG-postdemo.md` and does not touch the code.

**Dev deadline:** Sunday 14:30.

In-scope modules: *to be confirmed by team at H+8 — see Modules section below.*

---

## Code conventions

### Languages
- **Code & comments:** English.
- **Team docs** (CLAUDE.md, HANDOFF, STRATEGIE): English.
- **LLM prompts:** whatever works best for the target model (e.g. Gemini prompt in French, Claude codegen prompt in English).

### Style
- No comments that paraphrase the code. Only comment the non-obvious **why**.
- No over-engineering: it's a hackathon, we ship.
- No file > 400 lines: if it grows, split it.
- Tests: only on critical pipeline components (spec parser, bundler). No full TDD.

### Dependencies
- Python: official SDKs only (`google-genai`, `anthropic`, …). No exotic wrappers.
- JS: **zero runtime dependencies** in the final HTML (single-file). Build-time tools allowed (esbuild/vite).
- Any new dep > 5 MB must be logged in HANDOFF before adding.

---

## Module layout — *PROPOSAL, pending team validation*

```
hackathon_voodoo/
├── CLAUDE.md                   # this file (owner: team)
├── HANDOFF-alexis.md           # append-only log
├── HANDOFF-sami.md             # append-only log
├── HANDOFF-daniel.md           # append-only log
├── STRATEGIE-Alexis-Sami.md    # collaboration protocol between our 2 agents
├── .gitattributes              # merge=union on append-only files
├── README.md                   # public-facing
│
├── pipeline/
│   ├── analysis/               # video → markdown report + JSON spec     [OWNER: Alexis]
│   │   ├── analyze_video.py
│   │   ├── prompt_playable_v2.md
│   │   └── reports/            # outputs: <video>.report.md
│   │
│   ├── spec/                   # shared contract: intermediate JSON schema   [OWNER: shared, locked at H+8]
│   │   ├── schema.json
│   │   ├── examples/
│   │   └── README.md
│   │
│   ├── codegen/                # JSON spec → HTML/JS skeleton             [OWNER: Sami]
│   │   ├── generate_playable.py
│   │   ├── templates/
│   │   └── README.md
│   │
│   ├── assets/                 # Scenario MCP interface + sprite optimisation   [OWNER: TBD]
│   │   ├── fetch_assets.py
│   │   ├── optimize.py
│   │   └── cache/
│   │
│   ├── bundler/                # assemble single-file (inline base64, minify, <5 MB check)   [OWNER: Sami]
│   │   └── bundle.py
│   │
│   └── runner/                 # end-to-end CLI orchestration             [OWNER: Alexis]
│       └── run_pipeline.py
│
├── examples/                   # playables produced by the pipeline
│   └── castle-clashers/        # main demo case
│
├── RESSOURCES/                 # inputs: source videos, raw assets, kickoff notes
│   ├── B01.mp4
│   ├── Castle-Clashers-Assets/
│   └── voodoo-kickoff-live-insights.md
│
└── tools/                      # ad-hoc scripts, sandbox (not part of pipeline chain)
```

**Golden rule: one folder = one owner = one dev.** Two devs never edit the same file simultaneously. The only shared zones are: `CLAUDE.md` (updated at syncs), `pipeline/spec/schema.json` (locked after H+8), and `HANDOFF-*.md` (each person owns theirs).

> **TODO team:** validate this layout with Sami and Daniel. Sami already has an `analyze.py` outputting multi-candidate JSON — place it under `pipeline/spec/` or merge with `analysis/`. Decision needed.

### Intermediate spec contract

> **TODO team:** agree on the exact JSON schema that acts as the interface between `analysis/` (Alexis) and `codegen/` (Sami). This is **the most critical contract in the pipeline.** Frozen at H+8.

Draft from Sami's branch includes: `source_analysis`, `playable_candidates[]` with hook, core interaction, end card, complexity. Alexis's Gemini report is the human-readable debug artifact; the machine contract is the JSON.

---

## External URLs & resources

| Resource | URL | Usage |
|---|---|---|
| GitHub repo | https://github.com/Alexry375/hackathon-voodoo-2026 | code |
| Voodoo track Notion | *TODO team* | brief & contest rules |
| Google Drive source videos | *TODO team* | video inputs |
| Gemini API — video understanding | https://ai.google.dev/gemini-api/docs/video-understanding | video analysis |
| Gemini API — models | https://ai.google.dev/gemini-api/docs/models | model selection |
| Scenario MCP docs | *TODO team* | asset generation |
| AppLovin Playable specs | *TODO team* | final format |
| itch.io | https://itch.io/ | demo hosting |
| Kickoff notes | `RESSOURCES/voodoo-kickoff-live-insights.md` | brief recap |

---

## Model selection rules

> **Critical — do not burn the token budget in the first hour.**

| Task | Model | Reason |
|---|---|---|
| Planning, specs, architecture, brainstorm, deep code review | **Opus 4.7** | reasoning-heavy, used sparingly |
| Pure implementation (writing an already-specced function) | **Sonnet 4.6** | fast, more than sufficient |
| Minor edits, formatting, mechanical refactors | **Sonnet 4.6** or Haiku 4.5 | Opus is overkill |
| Video analysis (external LLM) | **Gemini 3.1 Pro Preview** | SOTA video understanding |
| Image/sprite generation | **Scenario MCP** | tuned for mobile game assets |

**Anti-patterns:**
- Using Opus to write HTML boilerplate → use Sonnet.
- Letting Sonnet debug blindly if the bug is subtle → switch to Opus.
- Running multiple Gemini analyses on the same video "to compare" → expensive; iterate on one report.

---

## Git workflow

- Branch naming: `feat/<name>/<scope>` (e.g. `feat/alexis/gemini-pipeline`, `feat/sami/codegen`).
- **No direct push to `main`.**
- Before every push: `git pull --rebase origin <your-branch>`.
- Merge to `main` via squash-merge PR only.
- Existing transition branches (`castle-clasher-v1-alexis`, `castle-clasher-v2-alexis`, `sami`) — to rename/close once new convention is adopted (TODO team).

### Conflict prevention

- **`.gitattributes`** declares `merge=union` on append-only files (HANDOFF, CHANGELOG, *.log) → both sides kept, zero conflict.
- **Module ownership** → one owner per folder → no file-level conflicts.
- If a conflict occurs despite this: the last person to pull resolves it and logs a `[blocker]` in their HANDOFF.

---

## 30-min sync ritual

Every 30 minutes, each dev does the following (5 min max):

1. `git pull --rebase` on their branch.
2. Read the other two HANDOFFs (scan for `[blocker]`, `[help]`, `[decision]`).
3. If a decision impacts you → adjust scope or log a `[question]` in your HANDOFF.
4. Post a `[status]` in your HANDOFF summarising progress and blockers.

**If someone hasn't synced in > 1h → ping IRL.** Divergence risk too high.

---

## HANDOFF format

Each dev owns their `HANDOFF-<name>.md` at the root. **Append-only — never rewrite history.**

Entry format:
```
## [HH:MM] [tag] title

2–3 lines: what happened, what it implies.
```

Valid tags:
- `[status]` — regular progress update
- `[done]` — a task is complete
- `[decision]` — I made a unilateral decision, open to challenge
- `[blocker]` — I'm stuck, need input
- `[question]` — question for the team, waiting for answer
- `[help]` — explicit call for help, urgent

---

## Known pitfalls

- **Sister repo** `Alexry375/games` ≠ `Alexry375/hackathon-voodoo-2026`. Always check `git remote -v` before pushing.
- **Gemini API key** was previously pasted in plaintext in a conversation — consider it compromised, regenerate before use.
- **`.venv/` must never be committed** (62 MB).
- **Gemini web app ≠ Gemini API**: on Castle Clashers, the web app reported a placement mechanic (drop units onto platforms) while the API correctly identified the actual mechanic — **ballistic artillery aiming** (drag inside interior view to set angle, release to fire). When in doubt, watch the video; don't trust LLM-only.
- **Voodoo creative end-cards often lie** about the character roster (end-card cast ≠ playable characters). Always flag this.

---

*Last updated: 2026-04-25 — by Alexis + Claude Sonnet 4.6. Sections marked `TODO team` to be filled at first team sync with Sami and Daniel.*
