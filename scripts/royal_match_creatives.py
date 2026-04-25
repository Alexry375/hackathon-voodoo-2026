#!/usr/bin/env python3
"""
Pull Royal Match ad creatives from SensorTower, split playables vs videos,
print top 20 of each as markdown tables sorted by days running desc.

Endpoints used (per sensortower_api_context.md):
  GET /v1/unified/search_entities   -> resolve "royal match" to unified app_id
  GET /v1/unified/ad_intel/creatives -> creatives for that app
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta

BASE = "https://api.sensortower.com"

PLAYABLE_TYPES = {
    "playable",
    "interactive-playable",
    "interactive-playable-rewarded",
    "interactive-playable-other",
}
VIDEO_TYPES = {
    "video",
    "video-rewarded",
    "video-interstitial",
    "video-other",
}
ALL_AD_TYPES = sorted(PLAYABLE_TYPES | VIDEO_TYPES | {
    "image", "image-banner", "image-interstitial", "image-other",
    "banner", "full_screen",
})

NETWORKS = [
    "Adcolony", "Admob", "Applovin", "BidMachine", "Chartboost",
    "Digital Turbine", "Facebook", "InMobi", "Instagram", "Line",
    "Meta Audience Network", "Mintegral", "Moloco", "Mopub", "Pangle",
    "Pinterest", "Smaato", "Snapchat", "Supersonic", "Tapjoy",
    "TikTok", "Twitter", "Unity", "Verve", "Vungle", "Youtube",
]
COUNTRIES = ["US", "GB", "CA", "AU", "DE", "FR"]


def load_env():
    path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
    token = os.environ.get("SENSORTOWER_API_KEY")
    if not token:
        sys.exit("ERROR: SENSORTOWER_API_KEY not set (checked env and .env)")
    return token


def http_get(path: str, params: dict) -> dict:
    qs = urllib.parse.urlencode(params, doseq=True, safe=":,")
    url = f"{BASE}{path}?{qs}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8")
            return {"status": resp.status, "body": body, "url": url}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"status": e.code, "body": body, "url": url, "error": True}


def fail(msg: str, resp: dict):
    print(f"\n=== FATAL: {msg} ===", file=sys.stderr)
    print(f"URL:    {resp.get('url')}", file=sys.stderr)
    print(f"Status: {resp.get('status')}", file=sys.stderr)
    print(f"Body:   {resp.get('body')[:1500]}", file=sys.stderr)
    if resp.get("status") == 403:
        print("403 = token valid, organization lacks product access for this endpoint/tier.", file=sys.stderr)
    sys.exit(2)


def resolve_unified_app_id(token: str, term: str) -> str:
    resp = http_get("/v1/unified/search_entities", {
        "entity_type": "app",
        "term": term,
        "limit": 5,
        "auth_token": token,
    })
    if resp.get("error"):
        fail(f"search_entities for {term!r} failed", resp)
    data = json.loads(resp["body"])
    # Response is a list; pick the entry whose android_apps include the bundle id, else first.
    if not isinstance(data, list) or not data:
        fail(f"search_entities returned no results for {term!r}", resp)
    target = "com.dreamgames.royalmatch"
    for entry in data:
        android_ids = [a.get("app_id") for a in entry.get("android_apps", []) if isinstance(a, dict)]
        if target in android_ids or entry.get("name", "").lower().startswith("royal match"):
            return entry["app_id"], entry
    return data[0]["app_id"], data[0]


def fetch_creatives(token: str, unified_app_id: str, start: str, end: str) -> dict:
    resp = http_get("/v1/unified/ad_intel/creatives", {
        "app_ids": unified_app_id,
        "start_date": start,
        "end_date": end,
        "countries": ",".join(COUNTRIES),
        "networks": ",".join(NETWORKS),
        "ad_types": ",".join(ALL_AD_TYPES),
        "display_breakdown": "true",
        "limit": 100,
        "auth_token": token,
    })
    if resp.get("error"):
        fail("ad_intel/creatives failed", resp)
    return json.loads(resp["body"]), resp["url"]


def parse_dt(s: str):
    if not s:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def group_ad_units(ad_units: list) -> list:
    """Group ad_units by phashion_group (perceptual-hash group = same creative
    seen across different networks). Falls back to ad_unit id when missing."""
    groups = defaultdict(list)
    for au in ad_units:
        key = au.get("phashion_group") or au.get("id")
        groups[key].append(au)

    rows = []
    for key, units in groups.items():
        first = min((parse_dt(u.get("first_seen_at")) for u in units if parse_dt(u.get("first_seen_at"))), default=None)
        last = max((parse_dt(u.get("last_seen_at")) for u in units if parse_dt(u.get("last_seen_at"))), default=None)
        days = (last - first).days if (first and last) else None
        # ad_type: pick the most specific value present
        ad_types = sorted({u.get("ad_type") for u in units if u.get("ad_type")})
        ad_type = ad_types[0] if ad_types else None
        networks = sorted({u.get("network") for u in units if u.get("network")})
        # creative_url / thumb_url from first creative in any unit
        creative_url, thumb_url = None, None
        for u in units:
            for c in (u.get("creatives") or []):
                creative_url = creative_url or c.get("creative_url")
                thumb_url = thumb_url or c.get("thumb_url")
                if creative_url and thumb_url:
                    break
            if creative_url and thumb_url:
                break
        share = sum((u.get("share") or 0) for u in units)
        rows.append({
            "group_key": key,
            "ad_unit_ids": [u.get("id") for u in units],
            "ad_type": ad_type,
            "ad_types_all": ad_types,
            "first_seen": first,
            "last_seen": last,
            "days_running": days,
            "networks": networks,
            "creative_url": creative_url,
            "thumb_url": thumb_url,
            "share": share,
        })
    return rows


def fmt_dt(dt):
    return dt.strftime("%Y-%m-%d") if dt else "n/a"


def md_table(title: str, rows: list, top_n: int = 20) -> str:
    rows = [r for r in rows if r["days_running"] is not None]
    rows.sort(key=lambda r: (r["days_running"], r["share"]), reverse=True)
    rows = rows[:top_n]
    if not rows:
        return f"### {title}\n\n_no rows_\n"
    out = [f"### {title} (top {len(rows)} by days running)\n"]
    out.append("| # | creative id | format | first seen | last seen | days | impressions | networks | creative_url |")
    out.append("|---|---|---|---|---|---|---|---|---|")
    for i, r in enumerate(rows, 1):
        cid = r["ad_unit_ids"][0] if r["ad_unit_ids"] else r["group_key"]
        cid = str(cid)[:24]
        nets = ", ".join(r["networks"][:6]) + (f" (+{len(r['networks'])-6})" if len(r["networks"]) > 6 else "")
        url = r["creative_url"] or "—"
        if len(url) > 70:
            url = url[:67] + "..."
        out.append(f"| {i} | `{cid}` | {r['ad_type']} | {fmt_dt(r['first_seen'])} | {fmt_dt(r['last_seen'])} | {r['days_running']} | n/a | {nets} | {url} |")
    return "\n".join(out) + "\n"


def main():
    token = load_env()
    print("# Royal Match — SensorTower ad creatives probe\n")

    print("## Step 1: resolve unified app_id\n")
    unified_id, entity = resolve_unified_app_id(token, "royal match")
    print(f"- name: **{entity.get('name')}** by {entity.get('publisher_name')}")
    print(f"- unified_app_id: `{unified_id}`")
    print(f"- android: {[a.get('app_id') for a in entity.get('android_apps', [])]}")
    print(f"- ios:     {[a.get('app_id') for a in entity.get('ios_apps', [])]}\n")

    end = date.today()
    start = end - timedelta(days=90)
    print(f"## Step 2: fetch creatives ({start} → {end}, {len(NETWORKS)} networks, {len(COUNTRIES)} countries)\n")
    data, url = fetch_creatives(token, unified_id, start.isoformat(), end.isoformat())
    ad_units = data.get("ad_units", [])
    print(f"- request: `{url[:200]}{'...' if len(url) > 200 else ''}`")
    print(f"- total ad_units returned: **{len(ad_units)}** (count field: {data.get('count')})")
    print(f"- available_networks: {data.get('available_networks')}\n")

    if not ad_units:
        print("**No ad_units returned.** Try wider date range or more countries.")
        return

    # Per-ad-type histogram
    by_type = defaultdict(int)
    for au in ad_units:
        by_type[au.get("ad_type")] += 1
    print("### ad_type histogram (raw ad_units, before grouping)\n")
    print("| ad_type | count |")
    print("|---|---|")
    for t, n in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"| `{t}` | {n} |")
    print()

    grouped = group_ad_units(ad_units)
    playables = [r for r in grouped if r["ad_type"] in PLAYABLE_TYPES]
    videos = [r for r in grouped if r["ad_type"] in VIDEO_TYPES]
    print(f"After grouping by phashion_group: {len(grouped)} unique creatives "
          f"→ {len(playables)} playable, {len(videos)} video, "
          f"{len(grouped) - len(playables) - len(videos)} other.\n")

    # Save raw response for inspection
    out_dir = os.path.join(os.path.dirname(__file__), "..", "out")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "creatives_raw.json"), "w") as f:
        json.dump(data, f, indent=2)

    print(md_table("Playable creatives", playables))
    print(md_table("Video creatives", videos))

    # Summary
    print("## Summary\n")
    p_types = sorted({r["ad_type"] for r in playables})
    print(f"- API distinguishes playable: **{'YES' if playables else 'NO'}**. "
          f"Playable ad_type values seen: {p_types or 'none'}.")
    print(f"- Counts: {len(playables)} playable creatives vs {len(videos)} video creatives "
          f"(after phashion grouping).")

    # Probe a playable creative_url to see if it's HTML
    sample_url = next((r["creative_url"] for r in playables if r.get("creative_url")), None)
    if sample_url:
        print(f"- Sample playable creative_url: {sample_url}")
        try:
            req = urllib.request.Request(sample_url, method="HEAD")
            with urllib.request.urlopen(req, timeout=15) as resp:
                ct = resp.headers.get("Content-Type")
                cl = resp.headers.get("Content-Length")
                print(f"- HEAD → Content-Type: `{ct}`, Content-Length: {cl}")
                if ct and ("html" in ct or "zip" in ct or "octet-stream" in ct):
                    print("  → looks like the playable bundle itself is downloadable.")
                elif ct and ct.startswith("image/"):
                    print("  → only a screenshot/preview is exposed, not the playable HTML.")
                elif ct and ct.startswith("video/"):
                    print("  → URL points to a video, not the playable HTML.")
                else:
                    print("  → unclear content type; inspect manually.")
        except Exception as e:
            print(f"- HEAD failed: {e}")
    else:
        print("- No playable creative had a creative_url to probe.")

    print("- `/v1/unified/ad_intel/creatives` validated response does NOT include "
          "an `impressions` field — impressions column is `n/a`. SensorTower exposes "
          "`share` (share-of-voice fraction) and `breakdown` instead.")
    print("- This endpoint also does NOT return `preview_url` (only `/creatives/top` does); "
          "what you see in the table is `creative_url` from the validated schema.")


if __name__ == "__main__":
    main()
