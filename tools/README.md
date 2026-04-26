# tools/ — pipeline helpers

CLI utilities for the Voodoo playable ad pipeline (Track 2). All Gemini calls
route through the **Files API directly** via the official `google-genai` SDK
(env var `GEMINI_API_KEY`, loaded from `.env`).

## Available tools

| Tool | Purpose |
|---|---|
| `analyze_video.py` | Full source-video → markdown report (one-shot game design analysis) |
| `compare_images.py` | N screenshots + prompt → Gemini critique (frame-static, ~$0.05/run) |
| `compare_clips.py` | N video clips + prompt → Gemini critique (pacing/transitions, ~$0.05/run) |
| `screenshot_phases.mjs` | Playwright sweep of forced narrative phases |
| `embed-assets.mjs` / `build.mjs` | esbuild bundle plumbing |

## Gemini direct API — official knobs (April 2026)

Source : https://ai.google.dev/gemini-api/docs/video-understanding +
https://ai.google.dev/gemini-api/docs/media-resolution

- **Model** : `gemini-2.5-pro` (or whatever the tool currently hardcodes).
- **Files API** : upload once, reuse the file URI across calls. No 10 MB
  inline cap. Files retained ~48 h server-side (`--cleanup` to force-delete).
- **`fps`** (videoMetadata) : server-side sampling rate. Default 1 fps.
  Pass `--fps 4` for sub-second granular critique on short clips. Internal
  cap ~52 frames/call → at 4 fps, max ~13 s of clip.
- **`media_resolution`** : LOW / MEDIUM / HIGH = 70 / 70 / 280 tokens per
  frame. Default MEDIUM. Use HIGH for fine visual critique (cost ~4×).
- **`--no-preprocess`** : skip our local 540p re-encode (the 540p we apply is
  our AppLovin viewport choice — NOT a Google reco). Keep it ON by default
  for bandwidth ; turn OFF if you need pixel-accurate critique.

## Practical rules of thumb

| Lever | When to bump |
|---|---|
| `--fps 4` | Sub-second transitions, easing, frame-perfect timing |
| `--media-resolution HIGH` | Pixel-level visual critique (palette, outline, detail) |
| `--no-preprocess` | When the local 540p re-encode would mask the issue |
| `--cleanup` | CI / hands-off runs to keep Files API tidy |

## No more slow-motion hack

Previously we re-encoded clips with `setpts=4*PTS` to fake 4× temporal
resolution because OpenRouter locked sampling to 1 fps. **Drop it** — pass
`--fps 4` instead. Sampling now happens server-side cleanly.

## Cost cheat-sheet (Gemini direct, April 2026)

- 1 image (compare_images) : ~$0.04–0.06
- 1 short clip 12 s @ fps=1 / MEDIUM (compare_clips) : ~$0.04–0.05
- 1 short clip 12 s @ fps=4 / HIGH (compare_clips) : ~$0.15–0.20
- Full source video 56 s @ fps=1 / MEDIUM (analyze_video) : ~$0.07–0.10

No strict budget cap per `PROMPT.md` — call Gemini freely whenever a structural
question can be settled by the video.
