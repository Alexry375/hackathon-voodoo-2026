import os
import sys
import json
import time
from google import genai
from google.genai import types

# Pass video paths as args: python analyze.py vid1.mp4 vid2.mp4 vid3.mp4
VIDEO_PATHS = sys.argv[1:] if len(sys.argv) > 1 else ["gameplay.mp4"]
OUTPUT_PATH = "spec.json"

PROMPT = """You are a senior playable ad designer analyzing gameplay videos for a mobile game publisher. Your task: produce a structured JSON spec from gameplay footage that will be consumed by a code-generation agent (Claude Code) to build a single-file HTML5 playable ad.

CONTEXT YOU NEED TO INTERNALIZE BEFORE ANALYZING:

A playable ad is a 15-30 second interactive HTML preview shown in ad networks. It must:
- Run as a single HTML file under 5MB, no external dependencies at runtime
- Hook the user in the first 3 seconds with a visible action
- Let the user perform ONE core mechanic, not the whole game
- End with a clear call-to-action ("Play Now", "Install", etc.)
- Feel like the source game in art style and core feel, even if mechanically simplified
- Work in portrait mobile viewport (375x667 baseline)

Common failure modes you must avoid in your spec:
- Describing too much of the game (the playable is a slice, not a summary)
- Vague mechanic descriptions ("the player solves puzzles") instead of literal interactions ("the player drags a marble across a grid to align same-colored marbles")
- Missing visual specifics that would force the code agent to invent
- Asset descriptions too generic for an image generation tool to act on

OUTPUT FORMAT — strict JSON, no prose before or after, no markdown fences:

{
  "source_analysis": {
    "game_name_guess": "string",
    "genre_primary": "string",
    "genre_secondary": "string or null",
    "art_style": {
      "descriptors": ["3-5 specific words like 'cartoon', 'isometric', 'low-poly'"],
      "color_palette_hex": ["#hex", "#hex", "#hex", "#hex", "#hex"],
      "reference_games": ["1-3 known games with similar visual feel"]
    },
    "observed_mechanics": [
      {
        "name": "string",
        "frequency_in_video": "primary | secondary | tertiary",
        "description": "literal description of player action and game response",
        "screen_time_estimate_seconds": number
      }
    ],
    "ui_elements_observed": ["specific UI components: buttons, meters, counters, etc."],
    "audio_cues_inferred": ["if audio is present, list 3-5 sound types"]
  },

  "playable_candidates": [
    {
      "candidate_id": "A",
      "concept_one_liner": "what makes this candidate distinct in 1 sentence",
      "featured_mechanic": "must match a name from observed_mechanics",
      "hook_first_3_seconds": "what literally appears on screen at t=0 to t=3",
      "core_interaction": {
        "input_type": "tap | drag | swipe | tap-and-hold | tilt",
        "what_player_does": "imperative sentence: 'Drag the marble onto the matching slot'",
        "win_state": "what triggers success",
        "lose_state": "what triggers failure, or 'none' for endless"
      },
      "session_length_seconds": number,
      "difficulty_curve": "single-shot | escalating | flat",
      "end_card": {
        "headline": "string under 8 words",
        "cta_button_text": "string under 4 words",
        "visual_treatment": "1 sentence"
      },
      "predicted_appeal": {
        "score_out_of_10": number,
        "rationale": "1-2 sentences on why this would or wouldn't perform"
      },
      "implementation_complexity": "low | medium | high",
      "implementation_notes_for_codegen": "1-2 sentences of guidance Claude Code would benefit from"
    }
  ],

  "recommended_candidate": "A | B | C",
  "recommendation_rationale": "2-3 sentences",

  "asset_requirements": {
    "critical": [
      {
        "id": "asset_001",
        "name": "string",
        "type": "sprite | background | ui_element | particle | sound",
        "description_for_image_gen": "detailed prompt-ready description, 1-2 sentences",
        "dimensions_px": "WxH or null",
        "transparency_required": boolean,
        "used_in_candidates": ["A", "B"]
      }
    ],
    "nice_to_have": [
      {
        "id": "asset_nth",
        "name": "string",
        "type": "string",
        "description_for_image_gen": "string",
        "fallback_if_missing": "what placeholder to use (e.g., 'colored rectangle #FF0000')"
      }
    ]
  },

  "technical_constraints": {
    "recommended_render_approach": "canvas-2d | dom | webgl",
    "recommended_framework": "vanilla | phaser | three",
    "framework_rationale": "1 sentence",
    "estimated_loc_for_mvp": number,
    "known_risks": ["1-3 things likely to be hard to implement faithfully"]
  },

  "validation_criteria": {
    "must_pass": [
      "concrete checks like 'tap on marble triggers movement animation within 100ms'",
      "list 4-6 of these"
    ],
    "should_pass": [
      "softer checks like 'visual style is recognizably similar to source'",
      "list 2-3"
    ]
  },

  "_meta": {
    "videos_analyzed_count": number,
    "video_duration_total_seconds": number,
    "confidence_overall": "high | medium | low",
    "fields_with_low_confidence": ["dotted.path.to.field"],
    "things_unobservable_from_videos": ["list things you'd want to know but couldn't tell"],
    "conflicts_between_videos": ["if multiple videos show contradictory info, list here"]
  }
}

GENERATION RULES:

1. Generate exactly 3 playable_candidates labeled A, B, C. Each must feature a DIFFERENT observed mechanic OR a meaningfully different framing of the same mechanic. Do not produce 3 minor variations of the same idea.

2. For asset_requirements.critical: list at most 5. These are assets the playable cannot work without. Be ruthless — most "needed" assets are actually nice-to-haves.

3. For asset descriptions: write them as if you are prompting an image generator. Include style, perspective, lighting, transparency requirements. Bad: "a marble". Good: "A glossy red marble, 3D render style, top-down perspective, soft shadow underneath, transparent background, 256x256."

4. For validation_criteria.must_pass: write checks that can be performed by either an automated test (programmatic) or a human in 5 seconds. Avoid vague criteria like "feels good."

5. If the source videos show multiple distinct game modes or features, prioritize the one with the most screen_time_estimate_seconds. Note other modes in source_analysis but do not build candidates around them.

6. If something is genuinely unobservable from the provided videos (e.g., audio when video is muted, monetization model, full progression), put it in _meta.things_unobservable_from_videos. Do not invent.

7. Use null for missing optional fields, never empty strings.

8. Output ONLY the JSON. No commentary, no markdown fences, no preamble."""

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

uploaded = []
for path in VIDEO_PATHS:
    print(f"Uploading {path}...")
    f = client.files.upload(file=path)
    uploaded.append(f)

print("Waiting for processing...")
for i, f in enumerate(uploaded):
    while f.state.name == "PROCESSING":
        time.sleep(2)
        f = client.files.get(name=f.name)
        print(f"  {VIDEO_PATHS[i]}: {f.state.name}")
    uploaded[i] = f
    if f.state.name == "FAILED":
        raise RuntimeError(f"Video {VIDEO_PATHS[i]} failed processing")

print("Running analysis...")
response = client.models.generate_content(
    model="gemini-3.1-pro-preview",
    contents=uploaded + [PROMPT],
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.3,
    ),
)

with open(OUTPUT_PATH, "w") as f:
    f.write(response.text)

print(f"Saved to {OUTPUT_PATH}")
