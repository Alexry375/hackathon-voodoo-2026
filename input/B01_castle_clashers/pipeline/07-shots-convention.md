# Convention `shots/` — pour que l'humain puisse suivre en direct

> Le développeur humain qui te regarde travailler doit pouvoir **voir l'avancement visuellement** sans lire ton code. Tu produis pour ça un dossier `shots/` qui montre, pour chaque asset/sprite/scène, une comparaison côte à côte **frame de référence vidéo / rendu de ton playable**.

---

## Pourquoi

- Tu vas tourner 1 à 4 heures, autonome
- L'humain ne va pas relire chaque commit ni chaque sub-agent
- Mais il veut **vérifier visuellement** que ton anchor / tes sprites / tes scènes ressemblent au jeu
- → Un dossier `shots/` avec des comparatifs PNG répond exactement à ce besoin

## Emplacement

```
input/<jeu>/shots/
├── _index.md                              # liste de tout, mise à jour à chaque commit
├── 02-anchor/
│   ├── <asset>_iter1.png                  # screenshot Canvas2D, iter 1
│   ├── <asset>_iter2.png                  # iter 2
│   ├── <asset>_iterN_FINAL.png            # iter finale (avant lock DA)
│   ├── <asset>_ref.png                    # frame de référence vidéo
│   └── <asset>_compare_FINAL.png          # composition côte à côte (réf | rendu)
├── 03-fanout/
│   ├── <asset_X>_compare.png
│   ├── <asset_Y>_compare.png
│   └── ... (un par asset L2-L4 produit en sub-agent)
├── 04-impl/
│   ├── scene_a_first_render.png           # premier render scène A
│   ├── scene_b_first_input.png            # scène B après wiring input
│   └── full_loop.png                      # capture pendant la résolution complète
└── 05-playwright/
    ├── phase_intro_compare.png            # composition réf vidéo @ 0:00 | playable phase intro
    ├── phase_tutorial_compare.png         # idem tutoriel
    ├── phase_freeplay_compare.png
    ├── phase_forcewin_compare.png
    └── phase_endcard_compare.png
```

## Format du `_compare.png`

Image **côte à côte** : référence vidéo à gauche, ton rendu à droite. Optionnellement un label (`Reference (00:14)` / `Playable (phase=tutorial)`).

**Comment composer un compare** avec ImageMagick (dispo si Linux) :

```bash
# Côte à côte simple (largeur additionnée)
convert input/<jeu>/shots/02-anchor/castle_blue_ref.png \
        input/<jeu>/shots/02-anchor/castle_blue_iter5_FINAL.png \
        +append \
        input/<jeu>/shots/02-anchor/castle_blue_compare_FINAL.png

# Avec labels (un peu plus joli, ImageMagick montage)
montage \
    -label "Reference (00:14)" input/<jeu>/shots/02-anchor/castle_blue_ref.png \
    -label "Playable (anchor v5)" input/<jeu>/shots/02-anchor/castle_blue_iter5_FINAL.png \
    -tile 2x1 -geometry +10+10 -background '#222' -fill white \
    input/<jeu>/shots/02-anchor/castle_blue_compare_FINAL.png
```

Si ImageMagick absent, tu peux faire le compare via Playwright en chargeant un mini HTML qui affiche les 2 images côte à côte et en prenant un screenshot. Ne te bloque pas dessus, le format simple `+append` suffit.

## `_index.md` — fil de progression lisible par l'humain

```markdown
# Shots — fil chronologique

> Vue rapide pour l'humain. Lis du haut vers le bas.

## 2026-04-25 22:14 — Étape 02 anchor done
- Asset directeur : château bleu cross-section
- ![compare](./02-anchor/castle_blue_compare_FINAL.png)
- 7 itérations. DA verrouillée. Voir `SANDBOX/anchor/DA-LOCKED.md`.

## 2026-04-25 23:01 — Étape 03 fanout — 8 assets produits
| Asset | Difficulté | Itérations | Compare |
|---|---|---|---|
| château rouge | L3 | 4 | ![](./03-fanout/castle_red_compare.png) |
| oiseau kamikaze | L3 | 5 | ![](./03-fanout/crow_compare.png) |
| projectile rocket | L2 | 2 | ![](./03-fanout/rocket_compare.png) |
| ... |

## 2026-04-25 23:42 — Étape 05 — sweep playwright des 5 phases
| Phase | Frame réf | Compare |
|---|---|---|
| intro | 00:00 | ![](./05-playwright/phase_intro_compare.png) |
| tutoriel | 00:13 | ![](./05-playwright/phase_tutorial_compare.png) |
| ... |

## 2026-04-25 23:55 — Étape 06 — bundle done
- Taille : 2.3 MB. Compliance OK.
- Voir `SANDBOX/outputs/RUN-REPORT.md` pour le détail.
```

## Quand alimenter `shots/`

| Étape pipeline | Quoi mettre dans `shots/` |
|---|---|
| 02-anchor | Pour l'asset directeur : toutes tes itérations + frame de réf + compare final |
| 03-fanout | Pour chaque asset L2+ : compare final (1 image par asset) |
| 04-impl | Premier render de chaque scène + un screenshot de la boucle complète |
| 05-playwright | Compare frame réf / playable pour chaque timestamp clé / phase narrative |
| 06-bundle | Optionnel : screenshot du dist/playable.html final ouvert |

**Commit `shots/` à chaque étape** pour que l'humain puisse `git pull` et regarder en direct.

## Règles de propreté

- **PNG uniquement** (pas de JPG dans `shots/` — perte de qualité gênante pour comparer)
- Taille raisonnable : si ton compare fait plus de 2 MB, baisse la résolution avec `convert -resize 1080x` (largeur max)
- Naming cohérent : `<asset>_<state>.png`, `<phase>_compare.png`
- Pas de SANDBOX/ dans shots/ : SANDBOX est ton cuisine, shots est la salle d'expo

## Sortie attendue

À la fin du run :

- `input/<jeu>/shots/_index.md` à jour avec entrées chronologiques
- Un `_compare.png` par asset L2+ et par phase narrative
- Tout est commité (le `.gitignore` racine a une exception pour `shots/`)
- L'humain dev peut `git pull` puis ouvrir n'importe quel `_compare.png` pour juger l'avancement

---

Cette convention est **transverse** aux étapes 02 → 06. Pense à alimenter `shots/` au fil de l'eau, pas en tout à la fin.
