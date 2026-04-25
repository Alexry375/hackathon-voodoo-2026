#!/usr/bin/env python3
"""
compare_images.py — Send N images + a prompt to Gemini 3.1 Pro Preview via OpenRouter
to obtain a structured critique. Used to compare our playable screenshots vs the
source video frames pair-by-pair.

Usage:
    set -a; source .env; set +a
    python3 tools/compare_images.py \
        --prompt SANDBOX/prompts/critic-pair.md \
        --image source:input/B01_castle_clashers/SANDBOX/frames/sec_01.png \
        --image ours:input/B01_castle_clashers/shots/05-playwright/phase_initial.png \
        --out SANDBOX/outputs/critique-pair-01.md

Each --image is `label:path`. Labels are used in the user prompt header so Gemini
can refer to them precisely. Up to 8 images per call (Gemini limit).
"""
import argparse, base64, json, mimetypes, os, sys, time
import urllib.request, urllib.error
from pathlib import Path

ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "google/gemini-3.1-pro-preview"


def encode_image(path: Path):
    mt, _ = mimetypes.guess_type(str(path))
    if not mt: mt = "image/png"
    b64 = base64.b64encode(path.read_bytes()).decode()
    return f"data:{mt};base64,{b64}"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--prompt", type=Path, required=True)
    p.add_argument("--image", action="append", required=True,
                   help="label:path  (repeat). Order matters.")
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--max-tokens", type=int, default=8000)
    args = p.parse_args()

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        sys.exit("OPENROUTER_API_KEY missing (source .env)")
    if not args.prompt.exists():
        sys.exit(f"prompt missing: {args.prompt}")

    prompt_text = args.prompt.read_text(encoding="utf-8")
    parts = [{"type": "text", "text": prompt_text}]
    labels = []
    for spec in args.image:
        if ":" not in spec:
            sys.exit(f"--image expected label:path, got {spec!r}")
        label, path_s = spec.split(":", 1)
        path = Path(path_s)
        if not path.exists():
            sys.exit(f"image missing: {path}")
        labels.append((label, path))
        parts.append({"type": "text", "text": f"\n\n[image: {label}] ({path.name})"})
        parts.append({"type": "image_url", "image_url": {"url": encode_image(path)}})

    body = {
        "model": args.model,
        "messages": [{"role": "user", "content": parts}],
        "max_tokens": args.max_tokens,
    }

    print(f"[send] model={args.model} images={len(labels)}: " +
          ", ".join(f"{l}={p.name}" for l, p in labels), flush=True)
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            resp = json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode()[:1000]}")
    elapsed = time.time() - t0

    text = resp["choices"][0]["message"].get("content") or ""
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(text, encoding="utf-8")

    usage = resp.get("usage", {})
    cost = usage.get("cost", 0)
    pt = usage.get("prompt_tokens", 0)
    ct = usage.get("completion_tokens", 0)
    finish = resp["choices"][0].get("finish_reason")
    print(f"[done] {elapsed:.1f}s — input={pt} output={ct} cost=${cost:.4f} finish={finish}", flush=True)
    print(f"[out] {args.out}", flush=True)


if __name__ == "__main__":
    main()
