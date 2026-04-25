# Hackathon Voodoo × Unaite × Anthropic — Avril 2026

**Track 2 — Playable Ad Pipeline** (orientation actuelle, pas encore verrouillé).
On envisage de construire un **pipeline reproductible** qui transforme une vidéo de gameplay en *playable ad* (single HTML file ~30s). Le livrable, c'est l'outil — pas un seul beau playable.

## Exemple de pipeline

```
vidéo gameplay → analyse Gemini → génération HTML/JS (Claude Code) → assets via Scenario → single HTML file
```

## Stack

- **Claude Code** — plan/specs en Opus 4.7, implémentation en Sonnet 4.6.
- **Gemini API** — analyse vidéo + son.
- **Scenario MCP** — assets visuels.
- **itch.io** — hosting démo.

## Team

@Alexry375 · @AnMaLeNo · @Sebbo34 · @kseniakatz · @sami-ennedoui

## Échéance

Fin du dev **dimanche 14:30** (~27h depuis le kickoff).

## Ressource

[`RESSOURCES/voodoo-kickoff-live-insights.md`](RESSOURCES/voodoo-kickoff-live-insights.md) — transcription du kickoff.
