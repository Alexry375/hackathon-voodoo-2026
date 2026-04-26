# Castle Clashers — Playable Ad MVP

> **Hackathon Voodoo × Unaite × Anthropic — Avril 2026 — Track 2 (Playable Ad Pipeline)**
> Ce dépôt contient un **MVP fonctionnel** d'un playable ad single-file pour *Castle Clashers*, et le pipeline reproductible qui l'a produit. C'est la base de travail de l'équipe — tout le monde itère depuis là.

---

## ▶️ Voir le playable

```bash
# Build
node tools/build.mjs

# Lance un serveur local (n'importe lequel — Python en exemple)
python3 -m http.server 8765
```

Puis ouvrir **<http://localhost:8765/dist/playable.html>**.

Format AppLovin/MRAID compliant : un seul fichier HTML, ~2.5 MB, portrait 540×960, ~25 s de gameplay (intro corbeaux → tir au drag → riposte → end card).

---

## 🚀 Quickstart pour contribuer

1. `git pull origin main`
2. Crée une branche : `git checkout -b feat/<ton-nom>/<scope>`
3. Modifie un module (voir [Architecture](#architecture--ownership))
4. `node tools/build.mjs` → recharge `dist/playable.html` dans le navigateur
5. PR vers `main`. **Pas de push direct sur `main`.**

> ⚠️ **Toujours rebuild avec `node tools/build.mjs`** — pas `npx esbuild`. La pipeline inline les assets base64 dans `dist/playable.html` ; un esbuild brut écrit un fichier orphelin que le navigateur ne charge jamais. Voir [`docs/pipeline-v0.4-proposals.md`](docs/pipeline-v0.4-proposals.md) §5.3.

---

## 🏗️ Architecture & ownership

Le code suit un pattern **scene-split + 3 events lockés**. Chaque dossier = un domaine de responsabilité, idéal pour que plusieurs personnes itèrent sans conflit.

```
scene_interior/   ← vue cross-section du château (phase de visée)
  ├ index.js          composition + boucle de rendu
  ├ aim.js            drag pointeur → angle/power → emit('player_fire')
  ├ units.js          mobs Cyclop / Skeleton / Orc + armes rotatives
  ├ castle_section.js silhouette intérieure + bricks + dégâts
  ├ arrow.js, rip.js, turn.js, hud_cards.js

scene_exterior/   ← vue cinématique château vs château
  ├ index.js          state machine intro/fire/impact/end + cycles d'impact
  ├ projectile_sprites.js  plan de tir par mob (rafale skeleton, bombe cyclop, etc.)
  ├ raven.js, raven_flock.js  projectiles corbeaux ennemis

shared/           ← contrats cross-scene (LOCKED)
  ├ events.js         player_fire / cut_to_interior / unit_killed
  ├ scene_manager.js  state machine globale (INTRO_INCOMING → INTERIOR_AIM → …)
  ├ state.js          HP, mobs alive, etc.
  ├ assets.js         lazy <img> cache sur window.ASSETS
  ├ audio.js          SFX overlapping + music loop + autoplay-unlock
  ├ hud_top.js        HUD HP top

playable/         ← orchestration playable + scénario tutoriel
  ├ entry.js          mount + boot audio + dev/prod mode
  ├ script.js         tutoriel scripté (hand cursor + force-win après N tirs)
  ├ hand_cursor.js, endcard.js, vsdk_shim.js

tools/            ← build pipeline
  ├ build.mjs         ⭐ esbuild + inline assets dans dist/_template.html
  ├ embed-assets.mjs  base64 tous les assets → assets-inline.js

dist/             ← sortie finale (versionnée pour preview directe)
  └ playable.html   ⭐ le livrable

RESSOURCES/       ← assets sources
  ├ assets_unpack/    sprites originaux Castle Clashers
  ├ characters_png/   mobs détourés (Cyclop / Skeleton / Orc)
  ├ weapon_assets/    armes CC0 (Snoops "Bows and Guns")
  ├ treads/           chenilles détourées via rembg
  ├ audio_assets/     musique CC0 + SFX (Kenney / OGA / extracts source)
  ├ hand_assets/      curseur Kenney CC0
  └ ref_frames/       frames de référence vidéo

input/B01_castle_clashers/  ← genèse pipeline (PROMPT.md + steps 00-07)
SANDBOX/                    ← extracts ad-hoc, gitignored partiellement
docs/                       ← pipeline proposals + decisions
```

### Contrat events (LOCKÉ — modifier = `[decision]` dans HANDOFF + 15min response)

```js
emit('player_fire',    { unit_id, angle_deg, power });
emit('cut_to_interior',{ hp_self_after, hp_enemy_after, units_destroyed_ids });
emit('unit_killed',    { unit_id });
```

---

## 🎯 État actuel (MVP fonctionnel)

- ✅ Intro cinématique (caméra ENEMY → corbeaux → impact OURS → cut interior)
- ✅ Phase de visée drag avec preview balistique + arme qui suit l'angle
- ✅ 3 mobs jouables (Cyclop, Skeleton rafale 4× missiles, Orc)
- ✅ Cinématique tir : pan caméra, projectile, impact, recul château ennemi
- ✅ Cycles d'impact déterministes (jamais 2 tirs au même endroit)
- ✅ Audio : musique loop CC0 + SFX firing/impact par arme + corbeaux
- ✅ Hand cursor stylisé pour le tutoriel
- ✅ End card

### Pistes ouvertes

- [ ] Améliorer extraction du caw corbeau (extraction depuis source vidéo en cours)
- [ ] Brancher l'angle/power du drag sur la cible réelle (actuellement cosmétique, l'impact est pioché dans un cycle)
- [ ] Sound mix : équilibrer musique vs SFX
- [ ] End card polish + CTA optimisé
- [ ] Score Gemini ≥ 9/10 sur clip-vs-clip ([`pipeline/05-playwright-loop.md`](input/B01_castle_clashers/pipeline/05-playwright-loop.md))

---

## 🔁 Pipeline qui a produit ce MVP

Track 2 (livrable = l'outil, pas le playable). Le pipeline complet est documenté dans [`input/B01_castle_clashers/PROMPT.md`](input/B01_castle_clashers/PROMPT.md) et ses 8 étapes [`pipeline/00..07.md`](input/B01_castle_clashers/pipeline/) :

```
vidéo gameplay → analyse Gemini → spec cinématique →
asset anchor → asset fanout → impl scene-split →
boucle Playwright (gate ≥ 9/10) → bundle single-file
```

Ce dépôt en est l'**instance Castle Clashers** : on a appliqué le pipeline à `RESSOURCES/B01.mp4` et obtenu `dist/playable.html`.

---

## 🛠️ Stack

- **Canvas2D + ESM**, zéro dépendance runtime, esbuild pour le bundle.
- **Claude Code Opus 4.7** pour code + plans.
- **Gemini 3.1 Pro Preview** (via OpenRouter) pour analyse vidéo + scoring.
- **demucs** pour extraction SFX depuis la source vidéo.
- **rembg** (U²-Net) pour détourage assets.

Conventions et règles complètes : voir [`CLAUDE.md`](CLAUDE.md).

---

## 👥 Team

@Alexry375 · @AnMaLeNo · @Sebbo34 · @kseniakatz · @sami-ennedoui

Logs append-only par personne : `HANDOFF-<prénom>.md`.

---

## 📅 Échéance

Dev freeze **dimanche 14:30**. Scope freeze **samedi 19:00** (toute idée post-freeze va dans `BACKLOG-postdemo.md`).
