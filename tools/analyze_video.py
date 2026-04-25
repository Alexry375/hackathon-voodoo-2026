#!/usr/bin/env python3
"""
analyze_video.py — Envoie une vidéo de creative publicitaire à Gemini pour
produire un rapport markdown structuré (passe seconde-par-seconde + synthèse
game design).

Usage:
    export GEMINI_API_KEY=...
    python analyze_video.py <video.mp4> [--prompt prompt.md] [--out report.md] [--fps 2] [--model gemini-3.1-pro-preview]

Defaults:
    - prompt : games-skill/tools/prompt_playable_v2.md (à côté du script)
    - out    : <video_basename>.report.md dans le cwd
    - fps    : 2 (sur-échantillonné pour analyse fine seconde-par-seconde)
    - model  : gemini-3.1-pro-preview (SOTA Google avril 2026)
"""

import argparse
import os
import sys
import time
from pathlib import Path

try:
    from google import genai
    from google.genai import types
except ImportError:
    sys.exit("Installe le SDK: pip install --user google-genai")


HERE = Path(__file__).resolve().parent
DEFAULT_PROMPT = HERE / "prompt_playable_v2.md"
DEFAULT_MODEL = "gemini-3.1-pro-preview"


def upload_and_wait(client, video_path: Path):
    print(f"[upload] {video_path} ({video_path.stat().st_size / 1e6:.1f} Mo)...", flush=True)
    f = client.files.upload(file=str(video_path))
    while f.state.name == "PROCESSING":
        time.sleep(2)
        f = client.files.get(name=f.name)
    if f.state.name != "ACTIVE":
        sys.exit(f"upload failed: state={f.state.name}")
    print(f"[upload] ok — uri={f.uri}", flush=True)
    return f


def main():
    p = argparse.ArgumentParser()
    p.add_argument("video", type=Path)
    p.add_argument("--prompt", type=Path, default=DEFAULT_PROMPT)
    p.add_argument("--out", type=Path, default=None)
    p.add_argument("--fps", type=float, default=2.0)
    p.add_argument("--model", default=DEFAULT_MODEL)
    args = p.parse_args()

    if not args.video.exists():
        sys.exit(f"video introuvable: {args.video}")
    if not args.prompt.exists():
        sys.exit(f"prompt introuvable: {args.prompt}")

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        sys.exit("export GEMINI_API_KEY=...")

    out = args.out or Path.cwd() / f"{args.video.stem}.report.md"
    prompt_text = args.prompt.read_text(encoding="utf-8")

    client = genai.Client(api_key=api_key)
    video_file = upload_and_wait(client, args.video)

    print(f"[generate] model={args.model} fps={args.fps}...", flush=True)
    t0 = time.time()
    response = client.models.generate_content(
        model=args.model,
        contents=[
            types.Part(
                file_data=types.FileData(file_uri=video_file.uri, mime_type="video/mp4"),
                video_metadata=types.VideoMetadata(fps=args.fps),
            ),
            prompt_text,
        ],
    )
    elapsed = time.time() - t0

    text = response.text or ""
    out.write_text(text, encoding="utf-8")

    usage = getattr(response, "usage_metadata", None)
    if usage:
        print(f"[done] {elapsed:.1f}s — input={usage.prompt_token_count} output={usage.candidates_token_count} tokens", flush=True)
    else:
        print(f"[done] {elapsed:.1f}s", flush=True)
    print(f"[out] {out}", flush=True)


if __name__ == "__main__":
    main()
