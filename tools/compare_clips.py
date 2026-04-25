#!/usr/bin/env python3
"""
compare_clips.py — Send N video clips + a prompt to Gemini 3.1 Pro Preview via
OpenRouter for pacing/transition/cinematic critique. Built on the same inline
data-URL pattern as analyze_video.py (no Files API needed for OpenRouter).

Each clip is auto-recompressed to 540p / 1fps / no-audio if > 8 MB or if
--ss/--t/--slow-mo are passed (Gemini samples at 1fps internally; higher fps
wastes payload — see Google AI Forum reco).

For fine pacing critique (sub-second transitions), pass --slow-mo N to slow
the clip Nx via ffmpeg setpts before upload. Effective temporal resolution
becomes 1/N seconds (e.g. --slow-mo 4 → 250ms resolution on original timing).

Usage:
    set -a; source .env; set +a
    python3 tools/compare_clips.py \
        --prompt SANDBOX/prompts/critic-clips-pacing.md \
        --clip ours:input/B01_castle_clashers/SANDBOX/extracts/playable_clip.mp4 \
        --clip source:RESSOURCES/B01.mp4 \
        --out input/B01_castle_clashers/SANDBOX/outputs/critique-clips.md

Cost rough estimate: ~0.10–0.15 $ for 2 short clips.
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


DEFAULT_MODEL = "google/gemini-3.1-pro-preview"
ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
LIGHT_THRESHOLD_MB = 8.0


def light_encode(src: Path) -> Path:
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg required")
    tmp = Path(tempfile.gettempdir()) / f"{src.stem}_light.mp4"
    print(f"[ffmpeg] {src.name} → 540p/1fps/no-audio", flush=True)
    subprocess.run([
        "ffmpeg", "-y", "-i", str(src),
        "-vf", "scale=540:-2", "-r", "1", "-an",
        "-c:v", "libx264", "-crf", "30", "-preset", "veryfast",
        str(tmp),
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"[ffmpeg] {src.stat().st_size/1e6:.1f} → {tmp.stat().st_size/1e6:.1f} MB", flush=True)
    return tmp


def parse_clip(spec: str) -> tuple[str, Path]:
    if ":" not in spec:
        sys.exit(f"--clip expects label:path, got {spec!r}")
    label, p = spec.split(":", 1)
    path = Path(p)
    if not path.exists():
        sys.exit(f"clip not found: {path}")
    return label, path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", type=Path, required=True)
    ap.add_argument("--clip", action="append", required=True,
                    help="label:path/to/clip.mp4 (repeatable, ≥2 typical)")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--max-tokens", type=int, default=16000)
    ap.add_argument("--ss", default=None,
                    help="optional ffmpeg seek (e.g. '0') applied to ALL clips")
    ap.add_argument("--t", default=None,
                    help="optional ffmpeg duration cap (e.g. '12') applied to ALL clips")
    ap.add_argument("--slow-mo", type=float, default=1.0,
                    help="slow-motion factor applied to ALL clips before upload "
                         "(e.g. 4 → 4x slower → effective 1/4 s temporal resolution "
                         "given Gemini's 1fps internal sampling). Default 1 (no slow-mo).")
    args = ap.parse_args()

    if not args.prompt.exists():
        sys.exit(f"prompt not found: {args.prompt}")
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        sys.exit("export OPENROUTER_API_KEY (or `set -a; source .env; set +a`)")

    prompt_text = args.prompt.read_text(encoding="utf-8")

    if args.slow_mo and args.slow_mo != 1.0:
        slow_preamble = (
            f"⚠️ NOTE TECHNIQUE — TOUS les clips fournis ci-dessous ont été ralentis "
            f"d'un facteur {args.slow_mo}× via ffmpeg setpts (slow-motion uniforme) "
            f"pour exposer les transitions sub-secondes à ton sampling 1 fps. "
            f"Quand tu rapportes des timestamps ou des durées, **divise par {args.slow_mo}** "
            f"pour retrouver le timing réel. Exemple : un cut observé à t=4s dans le clip "
            f"correspond à t={1/args.slow_mo:.2f}s réels ; un dwell de 2s observé = "
            f"{2/args.slow_mo:.2f}s réels.\n\n"
            f"---\n\n"
        )
        prompt_text = slow_preamble + prompt_text

    content = [{"type": "text", "text": prompt_text}]
    label_lines = []
    for spec in args.clip:
        label, path = parse_clip(spec)
        clip = path
        slow = args.slow_mo if args.slow_mo and args.slow_mo != 1.0 else None
        needs_proc = (args.ss is not None or args.t is not None or slow is not None
                      or path.stat().st_size > LIGHT_THRESHOLD_MB * 1e6)
        if needs_proc:
            tmp = Path(tempfile.gettempdir()) / f"{path.stem}_{label}_light.mp4"
            cmd = ["ffmpeg", "-y"]
            if args.ss is not None:
                cmd += ["-ss", args.ss]
            cmd += ["-i", str(path)]
            if args.t is not None:
                cmd += ["-t", args.t]
            vf = "scale=540:-2"
            if slow is not None:
                # setpts=N*PTS slows playback by factor N (frames stay, duration ×N)
                vf = f"setpts={slow}*PTS,{vf}"
            cmd += [
                "-vf", vf, "-r", "1", "-an",
                "-c:v", "libx264", "-crf", "30", "-preset", "veryfast",
                str(tmp),
            ]
            tag = f" slow×{slow}" if slow else ""
            print(f"[ffmpeg] {path.name} ({label}) → trim/recompress{tag}", flush=True)
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            clip = tmp
        size_mb = clip.stat().st_size / 1e6
        print(f"[encode] [{label}] {clip.name} {size_mb:.2f} MB", flush=True)
        b64 = base64.b64encode(clip.read_bytes()).decode()
        content.append({"type": "text", "text": f"\n=== CLIP: {label} ==="})
        content.append({"type": "video_url", "video_url": {"url": f"data:video/mp4;base64,{b64}"}})
        label_lines.append(f"{label} ({size_mb:.2f} MB)")

    body = {
        "model": args.model,
        "messages": [{"role": "user", "content": content}],
        "max_tokens": args.max_tokens,
    }

    print(f"[send] {args.model} clips=[{', '.join(label_lines)}]", flush=True)
    t0 = time.time()
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=900) as r:
            resp = json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode()[:1500]}")
    elapsed = time.time() - t0

    text = resp["choices"][0]["message"].get("content") or ""
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(text, encoding="utf-8")

    usage = resp.get("usage", {})
    cost = usage.get("cost", 0)
    pt = usage.get("prompt_tokens", 0)
    ct = usage.get("completion_tokens", 0)
    vt = usage.get("prompt_tokens_details", {}).get("video_tokens", 0)
    finish = resp["choices"][0].get("finish_reason")
    print(f"[done] {elapsed:.1f}s — input={pt} (video={vt}) output={ct} cost=${cost:.4f} finish={finish}",
          flush=True)
    print(f"[out] {args.out}", flush=True)


if __name__ == "__main__":
    main()
