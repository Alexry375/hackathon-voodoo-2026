# Hackathon Voodoo × Unaite × Anthropic — repo de travail

## Contexte

Track 2 — **Playable Ad Pipeline**. Le livrable est l'**outil de pipeline**, pas un seul playable.
Pipeline : `vidéo gameplay → analyse Gemini → génération HTML/JS (Claude Code) → assets Scenario → single HTML file`.

## Repo / branches

- Remote : `Alexry375/hackathon-voodoo-2026` (≠ `Alexry375/games`, ne pas confondre)
- Branches actives :
  - `main` — base
  - `castle-clasher-v1-alexis` — première itération (POC)
  - `castle-clasher-v2-alexis` — itération courante (default lors du dev)
- **Toujours commit/push sur `castle-clasher-v2-alexis` sauf instruction contraire.**

## Layout

- `castle-clasher-v1/` · `castle-clasher-v2/` — playables en cours (HTML single-file)
- `tools/` — pipeline générique (analyse vidéo Gemini, prompts, journaux)
- `RESSOURCES/` — vidéos sources (B01.mp4 = creative Castle Clashers Voodoo), assets unzip, frames extraites, kickoff notes
- `RESSOURCES/voodoo-kickoff-live-insights.md` — transcription du kickoff (lire si doute sur le scope)

## Pipeline d'analyse vidéo

`tools/analyze_video.py` — wrapper SDK `google-genai`, modèle par défaut `gemini-3.1-pro-preview`, Files API, fps configurable. Prompt par défaut : `tools/prompt_playable_v2.md` (passe seconde-par-seconde + synthèse game design + auto-vérification).

Pour relancer une analyse :
```bash
cd tools && export GEMINI_API_KEY=<clé>
.venv/bin/python analyze_video.py <video.mp4> --out <video>.report.md
```

Le venv `tools/.venv/` est gitignoré, à recréer la première fois :
```bash
cd tools && python3 -m venv .venv && .venv/bin/pip install google-genai
```

## Conventions

- Stack Claude Code : Opus 4.7 pour plan/specs, Sonnet 4.6 pour implémentation.
- **Travail à plusieurs sur le repo** — ne jamais force-push, préférer commits additifs.
- Avant tout `git add` : vérifier qu'on est bien dans `hackathon_voodoo/` (pas `games/`) et sur la bonne branche.

## Échéance

Fin du dev **dimanche 14:30** (kickoff samedi ~11:30).

## Pièges connus

- La clé API Gemini est passée en clair dans une conversation antérieure → considérer comme compromise, à régénérer.
- L'analyse Gemini *web app* a donné une interprétation gameplay différente de l'API (placement vs visée balistique pour Castle Clasher) — vérifier en regardant la vidéo en cas de doute.
- `tools/.venv/` ne doit jamais être commité (62 Mo).
