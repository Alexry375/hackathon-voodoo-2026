#!/usr/bin/env python3
"""
analyze_video.py — Envoie une vidéo de creative publicitaire à Gemini via
OpenRouter pour produire un rapport markdown structuré (passe seconde-par-seconde
+ synthèse game design).

Usage:
    set -a; source .env; set +a    # charge OPENROUTER_API_KEY
    python tools/analyze_video.py <video.mp4> [--prompt prompt.md] [--out report.md] [--model google/gemini-3.1-pro-preview]

Defaults:
    - prompt : tools/prompt_playable_v2.md (à côté du script)
    - out    : <video_basename>.report.md dans le cwd
    - model  : google/gemini-3.1-pro-preview (SOTA Google avril 2026, via OpenRouter)

Notes:
    - Pas de Files API côté OpenRouter : la vidéo est inlinée en data URI base64
      dans le payload. Les vidéos lourdes sont auto-recompressées en 540p / 4fps /
      sans audio via ffmpeg avant envoi (option `--no-light` pour skip).
    - Le param `reasoning` n'est pas désactivable sur gemini-3.1-pro-preview ;
      `max_tokens` est dimensionné en conséquence.
    - Coût indicatif : ~0.07 $ pour ~1 min de vidéo + synthèse 14 sections.
"""

import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path


HERE = Path(__file__).resolve().parent
DEFAULT_PROMPT = HERE / "prompt_playable_v2.md"
DEFAULT_MODEL = "google/gemini-3.1-pro-preview"
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
LIGHT_THRESHOLD_MB = 10.0  # au-dessus, recompression auto


def light_encode(src: Path) -> Path:
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg requis pour la recompression — installe-le ou passe --no-light")
    tmp = Path(tempfile.gettempdir()) / f"{src.stem}_light.mp4"
    print(f"[ffmpeg] recompression {src.name} → 540p/4fps/no-audio...", flush=True)
    cmd = [
        "ffmpeg", "-y", "-i", str(src),
        "-vf", "scale=540:-2", "-r", "4", "-an",
        "-c:v", "libx264", "-crf", "30", "-preset", "veryfast",
        str(tmp),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"[ffmpeg] {src.stat().st_size/1e6:.1f} Mo → {tmp.stat().st_size/1e6:.1f} Mo", flush=True)
    return tmp


def main():
    p = argparse.ArgumentParser()
    p.add_argument("video", type=Path)
    p.add_argument("--prompt", type=Path, default=DEFAULT_PROMPT)
    p.add_argument("--out", type=Path, default=None)
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--max-tokens", type=int, default=16000)
    p.add_argument("--no-light", action="store_true",
                   help="Désactive la recompression auto pour vidéo > 10 Mo")
    args = p.parse_args()

    if not args.video.exists():
        sys.exit(f"video introuvable: {args.video}")
    if not args.prompt.exists():
        sys.exit(f"prompt introuvable: {args.prompt}")

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        sys.exit("export OPENROUTER_API_KEY=... (ou `set -a; source .env; set +a`)")

    out = args.out or Path.cwd() / f"{args.video.stem}.report.md"
    prompt_text = args.prompt.read_text(encoding="utf-8")

    video = args.video
    size_mb = video.stat().st_size / 1e6
    if size_mb > LIGHT_THRESHOLD_MB and not args.no_light:
        video = light_encode(video)

    print(f"[encode] base64 {video.stat().st_size/1e6:.1f} Mo...", flush=True)
    b64 = base64.b64encode(video.read_bytes()).decode()
    data_url = f"data:video/mp4;base64,{b64}"

    body = {
        "model": args.model,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": prompt_text},
            {"type": "video_url", "video_url": {"url": data_url}},
        ]}],
        "max_tokens": args.max_tokens,
    }

    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    print(f"[send] model={args.model} payload={len(b64)//1024} KB...", flush=True)
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            resp = json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode()[:1000]}")
    elapsed = time.time() - t0

    text = resp["choices"][0]["message"].get("content") or ""
    out.write_text(text, encoding="utf-8")

    usage = resp.get("usage", {})
    cost = usage.get("cost", 0)
    pt = usage.get("prompt_tokens", 0)
    ct = usage.get("completion_tokens", 0)
    rt = usage.get("completion_tokens_details", {}).get("reasoning_tokens", 0)
    vt = usage.get("prompt_tokens_details", {}).get("video_tokens", 0)
    finish = resp["choices"][0].get("finish_reason")
    print(f"[done] {elapsed:.1f}s — input={pt} (video={vt}) output={ct} (reasoning={rt}) — cost=${cost:.4f} finish={finish}",
          flush=True)
    if finish == "length":
        print("[warn] tronqué par max_tokens — relance avec --max-tokens plus haut", flush=True)
    print(f"[out] {out}", flush=True)


if __name__ == "__main__":
    main()
