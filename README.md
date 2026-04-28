# Hackathon Voodoo × Anthropic — Track 2

**Avril 2026** — Notre soumission pour la track *Playable Ad Pipeline* du hackathon Voodoo × Unaite × Anthropic.

> Le livrable de la track est **l'outil**, pas le playable lui-même. Notre outil est un pipeline reproductible qui (1) génère un playable jouable depuis une vidéo de gameplay, et (2) le fait itérer en variantes créatives.

| | |
|---|---|
| 📊 Slides | <https://alexry375.github.io/hackathon-voodoo-2026/docs/slides/> |
| 🎮 Playable MVP — *Castle Clashers* | <https://alexry375.github.io/hackathon-voodoo-2026/dist/playable.html> |

---

## Deux architectures

### Archi 1 — Vidéo → Playable

Vidéo `mp4` ⟶ playable `html` jouable, single-file, conforme MRAID/AppLovin.

```
gameplay.mp4 → Gemini (analyse) → spec → Claude Code (HTML/JS) → Scenario MCP (assets) → bundle.html  (<5 MB)
```

### Archi 2 — Itérations automatiques

Playable baseline ⟶ N variantes créatives parallèles (sub-agents mono-axe + reviewer Playwright).

```
playable.html → brainstorm → fanout (1 sub-agent par axe) → review → galerie
```

Détails et démo dans les **[slides](https://alexry375.github.io/hackathon-voodoo-2026/docs/slides/)**.

---

## Essayer le pipeline

1. **[Use this template](https://github.com/Alexry375/hackathon-voodoo-2026/generate)** sur GitHub → tu obtiens ton propre repo.
2. Clone-le, ouvre-le dans **[Claude Code](https://claude.com/claude-code)**.
3. Lance une slash command :
   - `/playable-from-video <chemin/video.mp4>` — exécute l'**Archi 1**
   - `/playable-iterate <chemin/playable.html>` — exécute l'**Archi 2**

Les deux commands orchestrent le pipeline complet (analyse, codegen, assets, bundle, review). Voir [`.claude/commands/`](.claude/commands/) pour les prompts.

### Prérequis locaux

- Python 3.11+ (`google-genai`)
- Node.js 18+ (`esbuild`, `playwright`)
- `ffmpeg`, `rembg`
- Une clé Gemini (ou OpenRouter) dans `.env` — voir `CLAUDE.md`

---

## Stack

- **LLMs** : Claude Opus 4.7 (codegen, sub-agents), Gemini 3.1 Pro (analyse vidéo)
- **Assets** : Scenario MCP
- **Build** : esbuild + Playwright (QA + thumbnails)
- **Cible** : single-file HTML, MRAID 2.0, portrait 540×960, 15–30 s

## Repo

- [`CLAUDE.md`](CLAUDE.md) — conventions, règles de modèle, pitfalls connus
- [`.claude/commands/`](.claude/commands/) — slash commands des deux archis
- `tools/` — scripts d'analyse, build, QA
- `iterations/` — variantes générées + orchestration HANDOFF

## Équipe

Alexis, Sami, Antoine, Seb — Hackathon Voodoo, Avril 2026.
