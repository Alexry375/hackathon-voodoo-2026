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
