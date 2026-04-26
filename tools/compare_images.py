#!/usr/bin/env python3
"""
compare_images.py — Envoie N images + un prompt à Gemini via la SDK directe
(google-genai) pour critique image-vs-image. Utilisé en step 5.3 / 5.4 pour
itérer rapidement sur les écarts macro entre frames de référence et screenshots
du playable.

Usage:
    set -a; source .env; set +a   # charge GEMINI_API_KEY
    python tools/compare_images.py \\
        --prompt SANDBOX/prompts/critic-pair.md \\
        --image source:input/<jeu>/SANDBOX/frames-ref/ref_00_00.png \\
        --image ours:input/<jeu>/SANDBOX/frames-prod/phase_intro.png \\
        --out SANDBOX/outputs/critique-intro-pass1.md

Limite : insensible au pacing / transitions / camera state machine. Sert à
itérer le code sur des P0 macro (layout, palette, mono/dual frame). Pour la
gate finale step 5.5 → utilise compare_clips.py (clip-vs-clip).

Sources :
    - https://ai.google.dev/gemini-api/docs/vision
    - https://ai.google.dev/gemini-api/docs/media-resolution
"""

import argparse
import mimetypes
import os
import sys
import time
from pathlib import Path

try:
    from google import genai
    from google.genai import types
except ImportError:
    sys.exit("Installe le SDK: pip install --user google-genai")


DEFAULT_MODEL = "gemini-3.1-pro-preview"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--prompt", type=Path, required=True)
    p.add_argument("--image", action="append", required=True,
                   help="label:path/to/image.png (répétable, ordre conservé)")
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--media-resolution", default=None,
                   choices=["LOW", "MEDIUM", "HIGH"])
    p.add_argument("--max-tokens", type=int, default=8000)
    args = p.parse_args()

    if not args.prompt.exists():
        sys.exit(f"prompt introuvable: {args.prompt}")

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        sys.exit("export GEMINI_API_KEY (ou GOOGLE_API_KEY) — voir .env")

    client = genai.Client(api_key=api_key)

    prompt_text = args.prompt.read_text(encoding="utf-8")
    parts = [types.Part.from_text(text=prompt_text)]

    for spec in args.image:
        if ":" not in spec:
            sys.exit(f"--image attend label:path, reçu {spec!r}")
        label, path_s = spec.split(":", 1)
        path = Path(path_s)
        if not path.exists():
            sys.exit(f"image introuvable: {path}")
        mime, _ = mimetypes.guess_type(str(path))
        if not mime:
            mime = "image/png"
        parts.append(types.Part.from_text(text=f"\n[image: {label}] ({path.name})"))
        parts.append(types.Part.from_bytes(data=path.read_bytes(), mime_type=mime))
        print(f"[image] [{label}] {path.name} ({path.stat().st_size/1024:.0f} KB)", flush=True)

    config_kwargs = {"max_output_tokens": args.max_tokens}
    if args.media_resolution is not None:
        res_map = {
            "LOW": types.MediaResolution.MEDIA_RESOLUTION_LOW,
            "MEDIUM": types.MediaResolution.MEDIA_RESOLUTION_MEDIUM,
            "HIGH": types.MediaResolution.MEDIA_RESOLUTION_HIGH,
        }
        config_kwargs["media_resolution"] = res_map[args.media_resolution]
    config = types.GenerateContentConfig(**config_kwargs)

    print(f"[send] {args.model} res={args.media_resolution or 'default'}", flush=True)
    t0 = time.time()
    resp = client.models.generate_content(
        model=args.model,
        contents=[types.Content(role="user", parts=parts)],
        config=config,
    )
    elapsed = time.time() - t0

    text = resp.text or ""
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(text, encoding="utf-8")

    usage = resp.usage_metadata
    pt = getattr(usage, "prompt_token_count", 0)
    ct = getattr(usage, "candidates_token_count", 0)
    print(f"[done] {elapsed:.1f}s — input={pt} output={ct} tokens", flush=True)
    print(f"[out] {args.out}", flush=True)


if __name__ == "__main__":
    main()
