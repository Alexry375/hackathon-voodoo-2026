---
description: Archi 1 — génère un playable HTML jouable à partir d'une vidéo de gameplay
argument-hint: <chemin/vers/gameplay.mp4>
---

Tu vas exécuter l'**Archi 1** du pipeline : transformer une vidéo de gameplay en playable HTML jouable, single-file, conforme MRAID/AppLovin.

**Vidéo source** : `$1`

## Pipeline

```
$1 → Gemini (analyse) → spec → Claude Code (HTML/JS) → Scenario MCP (assets) → bundle.html (<5 MB)
```

## Étapes

1. **Analyse vidéo** — `python tools/analyze_video.py "$1"`. Modèle : Gemini 3.1 Pro Preview. Output → `tools/<nom_video>.report.md` (spec cinématique + game design + assets brief).
2. **Lecture critique du rapport** — extrais : hook (3 premières secondes), mécanique principale, fail-state, end-card. **Méfie-toi des hallucinations** : si le rapport décrit une mécanique qui ne colle pas à la vidéo (ex. "drop units" alors que c'est un tir balistique), re-regarde la vidéo.
3. **Génération HTML/JS** — implémente le playable en respectant l'architecture cible :
   - `scene_interior/`, `scene_exterior/` (split par scène)
   - `shared/events.js` (3 events lockés : `player_fire`, `cut_to_interior`, `unit_killed`)
   - `shared/{state,scene_manager,assets,audio}.js` (contrats cross-scene)
4. **Assets** — utilise Scenario MCP pour les sprites manquants. Détourage via `rembg` si fond non-transparent. Inline en base64 via `tools/embed-assets.mjs`.
5. **Bundle** — `node tools/build.mjs`. Vérifie taille `<5 MB`, format portrait `540×960`, durée `15–30 s`. Output → `dist/playable.html`.
6. **QA Playwright** — lance la golden path en headless, vérifie 0 erreur console, vérifie que le call-to-action s'affiche bien.

## Références dans le repo

- `input/B01_castle_clashers/PROMPT.md` — pipeline détaillé en 8 étapes (cas Castle Clashers)
- `tools/prompt_playable_v2.md` — prompt Gemini de référence
- `CLAUDE.md` — conventions, règles de modèle (Opus partout), pitfalls connus
- `docs/MVP-handoff-sami.md` — contexte bundling + AppLovin

## Modèle

Opus pour codegen et sub-agents (cf. `CLAUDE.md` §Model selection).
