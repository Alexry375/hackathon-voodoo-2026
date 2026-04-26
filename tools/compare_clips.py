#!/usr/bin/env python3
"""
compare_clips.py — Envoie N clips vidéo + un prompt à Gemini via la Files API
directe (google-genai SDK) pour critique pacing / transitions / cinématique.
Pensé pour la step 5.5 (gate score ≥ 9/10 par segment).

Usage:
    set -a; source .env; set +a   # charge GEMINI_API_KEY
    python tools/compare_clips.py \\
        --prompt SANDBOX/prompts/critic-clips-pacing.md \\
        --clip ours:SANDBOX/clips/ours.mp4 \\
        --clip source:input/<jeu>/input/source.mp4 \\
        --fps 4 \\
        --media-resolution MEDIUM \\
        --out SANDBOX/outputs/critique-clipclip-pass1.md

Defaults:
    - fps              : non-set → 1 fps (sampling Gemini par défaut). Passe
                          --fps 4 pour temporal granular sur clips courts
                          (transitions sub-seconde). Cap interne ~52 frames /
                          appel : à 4 fps → 13 s max.
    - media-resolution : non-set → MEDIUM (70 tokens/frame). HIGH pour critique
                          visuelle fine (280 tokens/frame, plus cher).
    - preprocess       : ON — re-encode chaque clip en 540p / 1 fps / no-audio
                          avant upload. Économie bandwidth ; ne pas confondre
                          avec un override fps côté Gemini (--fps fait ça).
    - cleanup          : OFF — fichiers gardés 48 h côté Gemini par défaut.

Sources :
    - https://ai.google.dev/gemini-api/docs/video-understanding
    - https://ai.google.dev/gemini-api/docs/media-resolution
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

try:
    from google import genai
    from google.genai import types
except ImportError:
    sys.exit("Installe le SDK: pip install --user google-genai")


DEFAULT_MODEL = "gemini-3.1-pro-preview"


def parse_clip(spec: str) -> tuple[str, Path]:
    if ":" not in spec:
        sys.exit(f"--clip attend label:path, reçu {spec!r}")
    label, p = spec.split(":", 1)
    path = Path(p)
    if not path.exists():
        sys.exit(f"clip introuvable: {path}")
    return label, path


def preprocess_clip(src: Path, fps: float = 1.0, height: int = 540) -> Path:
    if not shutil.which("ffmpeg"):
        print("[warn] ffmpeg manquant — skip preprocess", file=sys.stderr)
        return src
    out = Path(tempfile.mkstemp(suffix=".mp4")[1])
    cmd = [
        "ffmpeg", "-y", "-i", str(src),
        "-r", str(fps), "-vf", f"scale=-2:{height}",
        "-an", "-c:v", "libx264", "-crf", "28",
        "-loglevel", "error", str(out),
    ]
    subprocess.run(cmd, check=True)
    print(f"[preprocess] {src.name} → {out.stat().st_size/1e6:.2f} MB", flush=True)
    return out


def upload_clip(client, label: str, path: Path):
    print(f"[upload] [{label}] {path.name} ({path.stat().st_size/1e6:.2f} MB)…", flush=True)
    t0 = time.time()
    f = client.files.upload(file=str(path))
    while f.state and f.state.name == "PROCESSING":
        time.sleep(1)
        f = client.files.get(name=f.name)
    if not f.state or f.state.name != "ACTIVE":
        sys.exit(f"upload failed [{label}]: state={f.state.name if f.state else 'None'}")
    print(f"[upload] [{label}] active in {time.time()-t0:.1f}s", flush=True)
    return f


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--prompt", type=Path, required=True)
    p.add_argument("--clip", action="append", required=True,
                   help="label:path/to/clip.mp4 (répétable)")
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--fps", type=float, default=None,
                   help="frame sampling rate côté Gemini (omis = 1 fps default)")
    p.add_argument("--media-resolution", default=None,
                   choices=["LOW", "MEDIUM", "HIGH"])
    p.add_argument("--start-offset", default=None,
                   help="start offset en secondes (e.g. '1.5')")
    p.add_argument("--end-offset", default=None,
                   help="end offset en secondes (e.g. '14')")
    p.add_argument("--max-tokens", type=int, default=16000)
    p.add_argument("--no-preprocess", action="store_true")
    p.add_argument("--cleanup", action="store_true")
    args = p.parse_args()

    if not args.prompt.exists():
        sys.exit(f"prompt introuvable: {args.prompt}")

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        sys.exit("export GEMINI_API_KEY (ou GOOGLE_API_KEY) — voir .env")

    client = genai.Client(api_key=api_key)

    parts = [types.Part.from_text(text=args.prompt.read_text(encoding="utf-8"))]
    uploaded = []
    tmps = []

    try:
        for spec in args.clip:
            label, path = parse_clip(spec)
            src = path
            if not args.no_preprocess:
                src = preprocess_clip(path)
                tmps.append(src)
            f = upload_clip(client, label, src)
            uploaded.append(f)

            parts.append(types.Part.from_text(text=f"\n=== CLIP: {label} ==="))
            meta_kwargs = {}
            if args.fps is not None:
                meta_kwargs["fps"] = args.fps
            if args.start_offset is not None:
                meta_kwargs["start_offset"] = f"{args.start_offset}s"
            if args.end_offset is not None:
                meta_kwargs["end_offset"] = f"{args.end_offset}s"
            part_kwargs = {"file_data": types.FileData(file_uri=f.uri, mime_type=f.mime_type)}
            if meta_kwargs:
                part_kwargs["video_metadata"] = types.VideoMetadata(**meta_kwargs)
            parts.append(types.Part(**part_kwargs))

        config_kwargs = {"max_output_tokens": args.max_tokens}
        if args.media_resolution is not None:
            res_map = {
                "LOW": types.MediaResolution.MEDIA_RESOLUTION_LOW,
                "MEDIUM": types.MediaResolution.MEDIA_RESOLUTION_MEDIUM,
                "HIGH": types.MediaResolution.MEDIA_RESOLUTION_HIGH,
            }
            config_kwargs["media_resolution"] = res_map[args.media_resolution]
        config = types.GenerateContentConfig(**config_kwargs)

        print(f"[send] {args.model} fps={args.fps or 'default'} res={args.media_resolution or 'default'}", flush=True)
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

        if args.cleanup:
            for f in uploaded:
                try:
                    client.files.delete(name=f.name)
                except Exception as e:
                    print(f"[cleanup] warn: {e}", flush=True)
            print(f"[cleanup] {len(uploaded)} fichiers supprimés", flush=True)
    finally:
        for t in tmps:
            if t.exists():
                t.unlink()


if __name__ == "__main__":
    main()
