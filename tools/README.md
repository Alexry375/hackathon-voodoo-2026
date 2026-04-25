# tools/ — pipeline helpers

CLI utilities for the Voodoo playable ad pipeline (Track 2). All Gemini calls
route through OpenRouter (key in `.env`, var `OPENROUTER_API_KEY`).

## Available tools

| Tool | Purpose |
|---|---|
| `analyze_video.py` | Full source-video → markdown report (one-shot game design analysis) |
| `compare_images.py` | N screenshots + prompt → Gemini critique (frame-static, ~$0.05/run) |
| `compare_clips.py` | N video clips + prompt → Gemini critique (pacing/transitions, ~$0.05/run) |
| `screenshot_phases.mjs` | Playwright sweep of forced narrative phases |
| `embed-assets.mjs` / `build.mjs` | esbuild bundle plumbing |

## Gemini video — known constraints via OpenRouter

Confirmed from official OpenRouter docs + Google AI Forum (April 2026) :

- **Model**: `google/gemini-3.1-pro-preview` (SOTA Google, hardcoded in tools).
- **Sampling**: Gemini samples video at **1 fps internally**. Higher input fps
  is wasted payload — Google's official reco is to **pre-process to 1 fps before
  upload**.
- **Resolution**: 720p max useful. 540p is fine for our portrait playables.
- **Formats**: mp4, mpeg, mov, webm only.
- **Transport**: Vertex AI route (the one OpenRouter uses for Gemini) requires
  **base64-encoded data URL** — public video URLs are NOT supported. Files API
  is not available either.
- **No `videoMetadata` / `fps` / `media_resolution` overrides** are exposed via
  OpenRouter `extra_body`. Sampling is locked to default 1 fps.

## Practical rules of thumb

| Constraint | Implication |
|---|---|
| 1 fps internal sampling | Sub-second transitions invisible. Use `--slow-mo N` to expose them. |
| ~10 MB inline payload limit | At 540p/1fps a clip of ~60 s comfortably fits. |
| Video tokens cost | A 12 s clip ≈ 1700 video tokens ≈ $0.02 input. |
| No FPS knob | Slow-motion preprocessing is the only lever for finer pacing analysis. |

## Slow-motion trick for fine pacing critique

```bash
# 4× slowed → 1 fps Gemini sampling sees the original at 250 ms resolution
python3 tools/compare_clips.py \
    --prompt SANDBOX/prompts/critic-clips-pacing.md \
    --clip ours:input/B01_castle_clashers/SANDBOX/extracts/playable_clip.mp4 \
    --clip source:RESSOURCES/B01.mp4 \
    --t 13 --slow-mo 4 \
    --out input/B01_castle_clashers/SANDBOX/outputs/critique-clips-slow.md
```

Use `--slow-mo 4` when the critique target is **transition smoothness, easing,
sub-second timing**. Use `--slow-mo 1` (default) for general pacing/structure.

## Cost cheat-sheet (Gemini 3.1 Pro Preview via OR, April 2026)

- 1 image (compare_images): ~$0.04–0.06
- 1 short clip 12 s @ 1 fps (compare_clips): ~$0.04–0.05
- 2 clips 12 s @ 1 fps (compare): ~$0.05–0.07
- Full source video 56 s analysis (analyze_video): ~$0.07–0.10

No strict budget cap per `PROMPT.md` — call Gemini freely whenever a structural
question can be settled by the video.
