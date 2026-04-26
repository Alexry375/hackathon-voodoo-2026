#!/usr/bin/env python3
"""
analyze_video.py — Envoie une vidéo de creative publicitaire à Gemini via la
Files API directe (google-genai SDK) pour produire un rapport markdown structuré
(passe seconde-par-seconde + synthèse game design).

Usage:
    set -a; source .env; set +a   # charge GEMINI_API_KEY
    python tools/analyze_video.py <video.mp4> [--prompt prompt.md] [--out report.md]
                                              [--fps 1] [--media-resolution MEDIUM]
                                              [--no-preprocess] [--cleanup]

Defaults:
    - prompt        : tools/prompt_playable_v2.md (à côté du script)
    - out           : <video_basename>.report.md dans le cwd
    - fps           : non-set → Gemini sample à 1 fps par défaut (doc officielle
                       https://ai.google.dev/gemini-api/docs/video-understanding).
    - preprocess    : ON — re-encode en 540p / 1 fps / no-audio avant upload.
                       Le 540p N'est PAS une reco Google : c'est notre choix
                       pragmatique (matche le viewport playable AppLovin
                       540×960 portrait). Côté Google, le levier officiel est
                       `media_resolution` (LOW/MEDIUM/HIGH = 70/70/280 tokens
                       par frame). Le preprocess sert principalement à
                       économiser bandwidth + uniformiser la base d'analyse.
    - cleanup       : OFF — par défaut on garde les fichiers uploadés (48h TTL
                       côté Gemini de toute façon). Active avec --cleanup pour
                       housekeeping immédiat.
    - model         : gemini-3.1-pro-preview (SOTA Google avril 2026)

Notes Files API directe :
    - Pas de cap inline (~10 MB) comme OpenRouter — limite ~2 GB par fichier.
    - Reuse possible : un upload peut être consommé par plusieurs prompts dans
      les 48h. Pour itérer sur plusieurs prompts focaux sur la même vidéo,
      considère extraire un segment court avec ffmpeg et le ré-uploader.
    - `videoMetadata.fps` permet de demander un sampling > 1 fps côté serveur
      (officiel — utile pour fast-action / motion tracking). Plus besoin du
      hack slow-motion (setpts=4*PTS) qu'on faisait sur OpenRouter : passe
      directement --fps 4. Cap interne ~52 frames / appel : à 4 fps tu couvres
      ~13 s max — segmente si besoin.
    - `media_resolution` (LOW/MEDIUM/HIGH) = budget tokens par frame, pas
      pixels. MEDIUM (default) suffit pour notre usage. HIGH si critique
      visuel détaillé sur petites zones.

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


HERE = Path(__file__).resolve().parent
DEFAULT_PROMPT = HERE / "prompt_playable_v2.md"
DEFAULT_MODEL = "gemini-3.1-pro-preview"


def preprocess(src: Path, fps: float = 1.0, height: int = 540) -> Path:
    """Re-encode src to fps + height-p + no-audio for upload economy.
    Returns path to a tempfile (caller cleans up)."""
    if not shutil.which("ffmpeg"):
        print("[warn] ffmpeg manquant — skip preprocess", file=sys.stderr)
        return src
    out = Path(tempfile.mkstemp(suffix=".mp4")[1])
    cmd = [
        "ffmpeg", "-y", "-i", str(src),
        "-r", str(fps),
        "-vf", f"scale=-2:{height}",
        "-an", "-c:v", "libx264", "-crf", "28",
        "-loglevel", "error",
        str(out),
    ]
    subprocess.run(cmd, check=True)
    src_mb = src.stat().st_size / 1e6
    out_mb = out.stat().st_size / 1e6
    print(f"[preprocess] {src_mb:.1f} → {out_mb:.1f} MB ({fps} fps, {height}p)", flush=True)
    return out


def upload_and_wait(client, video_path: Path):
    print(f"[upload] {video_path.name} ({video_path.stat().st_size/1e6:.1f} MB)…", flush=True)
    f = client.files.upload(file=str(video_path))
    while f.state and f.state.name == "PROCESSING":
        time.sleep(2)
        f = client.files.get(name=f.name)
    if not f.state or f.state.name != "ACTIVE":
        sys.exit(f"upload failed: state={f.state.name if f.state else 'None'}")
    print(f"[upload] active — {f.name}", flush=True)
    return f


def main():
    p = argparse.ArgumentParser()
    p.add_argument("video", type=Path)
    p.add_argument("--prompt", type=Path, default=DEFAULT_PROMPT)
    p.add_argument("--out", type=Path, default=None)
    p.add_argument("--fps", type=float, default=None,
                   help="frame sampling rate côté Gemini (omis = 1 fps default)")
    p.add_argument("--media-resolution", default=None,
                   choices=["LOW", "MEDIUM", "HIGH"],
                   help="omis = défaut Gemini")
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--max-tokens", type=int, default=16000)
    p.add_argument("--no-preprocess", action="store_true",
                   help="skip ffmpeg recompression vers 540p/1fps")
    p.add_argument("--cleanup", action="store_true",
                   help="supprime le fichier uploadé après l'appel")
    args = p.parse_args()

    if not args.video.exists():
        sys.exit(f"video introuvable: {args.video}")
    if not args.prompt.exists():
        sys.exit(f"prompt introuvable: {args.prompt}")

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        sys.exit("export GEMINI_API_KEY (ou GOOGLE_API_KEY) — voir .env")

    out = args.out or Path.cwd() / f"{args.video.stem}.report.md"
    prompt_text = args.prompt.read_text(encoding="utf-8")

    src = args.video
    tmp = None
    try:
        if not args.no_preprocess:
            tmp = preprocess(src, fps=1.0, height=540)
            src = tmp

        client = genai.Client(api_key=api_key)
        f = upload_and_wait(client, src)

        meta_kwargs = {}
        if args.fps is not None:
            meta_kwargs["fps"] = args.fps
        part_kwargs = {"file_data": types.FileData(file_uri=f.uri, mime_type=f.mime_type)}
        if meta_kwargs:
            part_kwargs["video_metadata"] = types.VideoMetadata(**meta_kwargs)

        config_kwargs = {"max_output_tokens": args.max_tokens}
        if args.media_resolution is not None:
            res_map = {
                "LOW": types.MediaResolution.MEDIA_RESOLUTION_LOW,
                "MEDIUM": types.MediaResolution.MEDIA_RESOLUTION_MEDIUM,
                "HIGH": types.MediaResolution.MEDIA_RESOLUTION_HIGH,
            }
            config_kwargs["media_resolution"] = res_map[args.media_resolution]
        config = types.GenerateContentConfig(**config_kwargs)

        print(f"[generate] model={args.model} fps={args.fps or 'default'} res={args.media_resolution or 'default'}", flush=True)
        t0 = time.time()
        resp = client.models.generate_content(
            model=args.model,
            contents=[types.Content(role="user", parts=[
                types.Part(**part_kwargs),
                types.Part.from_text(text=prompt_text),
            ])],
            config=config,
        )
        elapsed = time.time() - t0

        text = resp.text or ""
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text, encoding="utf-8")

        usage = getattr(resp, "usage_metadata", None)
        if usage:
            pt = getattr(usage, "prompt_token_count", 0)
            ct = getattr(usage, "candidates_token_count", 0)
            print(f"[done] {elapsed:.1f}s — input={pt} output={ct} tokens", flush=True)
        else:
            print(f"[done] {elapsed:.1f}s", flush=True)
        print(f"[out] {out}", flush=True)

        if args.cleanup:
            try:
                client.files.delete(name=f.name)
                print(f"[cleanup] {f.name} deleted", flush=True)
            except Exception as e:
                print(f"[cleanup] warn: {e}", flush=True)
    finally:
        if tmp and tmp.exists():
            tmp.unlink()


if __name__ == "__main__":
    main()
