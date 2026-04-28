---
description: Archi 2 — génère N variantes créatives d'un playable existant via sub-agents mono-axe
argument-hint: <chemin/vers/playable.html>
---

Tu vas exécuter l'**Archi 2** : faire itérer un playable baseline en N variantes créatives parallèles, chacune drivée par un seul axe créatif.

**Playable baseline** : `$1`

## Pipeline

```
$1 → brainstorm → fanout (sub-agents mono-axe) → review → galerie de variantes
```

## Étapes

1. **Brainstorm** — génère 30+ hypothèses cross-pollinisation (puzzle, runner, idle, narratif, end-card, méta). Reject les variantes qui copient le genre source. Documente dans `iterations/BRAINSTORM.md`.
2. **Triage** — sélectionne 3 à 5 challengers + 1 baseline. Liste les besoins assets par variante dans `iterations/ASSETS-BRIEF.md`.
3. **Fanout parallèle** — pour chaque variante, lance **un sub-agent mono-axe** avec UN seul axe créatif parmi : `hook` | `mechanic` | `palette` | `narrative` | `endcard`. File-split obligatoire pour zéro conflit (chaque agent touche un set de fichiers disjoint, voir `iterations/HANDOFF.md`).
4. **Juicy doctrine** — chaque variante doit stack **≥4 effets composés** (screen-shake, particles, color-shift, scale-punch, glow, slow-mo, trail, chromatic aberration, scan-line) avec layered timing **≥3 events**. Une variante "tiède" est un échec.
5. **Review Playwright** — sub-agent reviewer dédié : vérifie cohérence visuelle, axe respecté (pas de drift multi-axes), pas de régression de la game loop, capture une thumbnail.
6. **Galerie** — assemble `iterations/index.html` avec les variantes côte-à-côte (iframes 9:16). Sert sur GitHub Pages.

## Orchestration multi-sessions

Pour pousser plus loin : 2 sessions Claude Code en parallèle, chacune driver de 2 variantes, via `git worktree`. Détails dans `iterations/HANDOFF.md`.

## Références dans le repo

- `iterations/BRAINSTORM.md` (run-3 et run-4) — exemples concrets d'idéation
- `iterations/HANDOFF.md` — orchestration 2-sessions parallèles
- `iterations/r3-V3-y2k-neon/` — variante winner du run-3 (référence "juice" niveau 8 effets)
- `tools/compare_clips.py`, `tools/compare_images.py` — review visuelle Gemini

## Modèle

Opus pour brainstorm, fanout, et reviewer (cf. `CLAUDE.md` §Model selection).
