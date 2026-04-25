# Hackathon Voodoo × Unaite × Anthropic — Avril 2026

Repo de travail de notre équipe pour le hackathon Voodoo (samedi 25 — dimanche 26 avril 2026, Paris).

## Contexte

Hackathon orienté **AI for mobile game production**. Trois tracks proposés par Voodoo, à choisir collégialement avant le blocage en début d'aprèm.

- **Track 1 — Mobile Game Production** : recréer un jeu précis (**Marble Sort**, puzzle de tri de billes colorées dans des tubes). Le jury regarde le core gameplay, la génération de niveaux par IA, et le pipeline assembly. Pas de publication possible (IP Voodoo).
- **Track 2 — Playable Ad Pipeline** : construire un **pipeline reproductible** qui transforme une vidéo gameplay en playable ad (single HTML file ~30s). Le livrable n'est pas un beau playable mais l'outil derrière.
- **Track 3 — Market Intelligence + Génération créa** : scraper le marché mobile gaming, analyser la concurrence, puis générer des créatifs publicitaires avec Scenario MCP.

Détails complets dans [`RESSOURCES/voodoo-kickoff-live-insights.md`](RESSOURCES/voodoo-kickoff-live-insights.md).

## Team

GitHub handles : @Alexry375, @AnMaLeNo, @Sebbo34, @kseniakatz, @sami-ennedoui.

## Planning

| Quand | Quoi |
|---|---|
| Samedi 25/04 ~11:00 | Kickoff terminé → idéation, formation team, choix track |
| Samedi journée | Idéation, mentors dispos pour valider le track |
| Samedi 13:00 / 19:30 | Lunch / dinner |
| Samedi nuit | Venue ouvert 24/7, on peut dormir sur place |
| Dimanche matin | Coding (mentors dispos) |
| Dimanche 14:30 | Fin du dev → prépa démo |
| Dimanche 14:30 → 15:00 | Démos (~à reconfirmer sur place) |
| Dimanche 16:00 → 17:00 | Closing + remise des prix |

Timebox réelle de dev = **~27h depuis le kickoff**, dont une nuit de sommeil minimale.

## Stack & ressources

- **Claude Code** (token fourni par l'orga) — budget LLM principal.
  - Plan / specs / archi → Opus 4.7.
  - Implémentation → Sonnet 4.6 (volontairement, plus efficient que Opus pour du code pur).
  - À poser dans le `CLAUDE.md` projet une fois le track choisi.
- **Gemini API** (clé fournie par l'orga) — analyse vidéo (best-in-class son + image).
- **Scenario** (MCP installable) — génération d'assets visuels par IA.
- **itch.io** — hosting des démos.
- Frameworks libres : Phaser, PIXI, Three.js, plain canvas, Godot.

Pages externes :
- Notion track page : https://voodoo.notion.site/Voodoo-Hack-Tracks-34ca0b481db4803ab1f7e035e5b4b094

## Mantras à garder en tête

> *"Il faut sentir le love quand on joue."*

> *"Le but est d'aller le plus vite possible, mais la qualité est très importante."*

> **Pipeline > produit unique** (vrai surtout pour Tracks 2 & 3).

> **Aller voir les mentors AVANT d'être bloqué.**

## Structure du repo

```
hackathon_voodoo/
├── README.md
└── RESSOURCES/
    └── voodoo-kickoff-live-insights.md   # transcription kickoff samedi matin
```

Le reste s'ajoutera dès qu'on a verrouillé un track.

## Statut actuel

🟡 **Track non encore choisi.** Décision à prendre rapidement avec un mentor avant de partir sur du code.
