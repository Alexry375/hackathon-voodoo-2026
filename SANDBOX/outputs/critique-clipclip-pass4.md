Voici l'évaluation stricte de notre rendu (clip `ours`) par rapport à la spécification cinématique de référence (clip `source`).

## Segment intro
- **Timing** : 4/10 — L'impact a lieu beaucoup trop tôt (T+2000 au lieu de T+3000), ignorant le dwell initial de 1.5s.
- **Pacing** : 2/10 — Transition abrupte, absence totale du mouvement de caméra (pan_out) pour suivre le projectile.
- **Fidélité visuelle** : 3/10 — Absence de pluie, design du château non respecté, VFX d'impact remplacé par des blocs noirs génériques.
- **Camera state** : 1/10 — Divergence majeure : la caméra démarre sur le mauvais château (Bleu au lieu de Rouge) et ne respecte pas la règle mono-frame.
- **Score global** : 1/10
- **Top fix P0** : Implémenter la machine à états de la caméra à T=0 : démarrer en plan serré fixe sur le château ennemi (Rouge), puis pan_out vers la vue large.

## Segment aim
- **Timing** : 4/10 — La durée de la phase en intérieur est approximativement respectée, mais l'action est absente.
- **Pacing** : 2/10 — Le rythme est mort car aucune action de drag n'est jouée pendant les 3.5s prévues.
- **Fidélité visuelle** : 2/10 — Divergence majeure : absence totale de la main du tutoriel et de la ligne de trajectoire en pointillés. Textures intérieures incorrectes.
- **Camera state** : 5/10 — Le cut vers l'intérieur (OURS_BLUE_int) est présent, mais le cadrage est différent de la source.
- **Score global** : 2/10
- **Top fix P0** : Ajouter l'animation UI du tutoriel (main animée + ligne de visée en pointillés) pour guider le tir.

## Segment fire_cinematic
- **Timing** : 2/10 — La vitesse du projectile est beaucoup trop rapide, quasi instantanée, ignorant la durée balistique de 1500 ms.
- **Pacing** : 2/10 — Le tir s'enchaîne de manière illogique sans l'input (release) du tutoriel.
- **Fidélité visuelle** : 2/10 — Le projectile est un simple point rouge sans traînée balistique visible (trail).
- **Camera state** : 2/10 — La caméra passe en vue large (BOTH_wide) au lieu de faire un "cut+dwell" direct sur l'extérieur ennemi (THEM_RED_ext).
- **Score global** : 2/10
- **Top fix P0** : Corriger l'état de la caméra au moment du tir en forçant un "cut" direct sur le château ennemi (THEM_RED_ext).

## Segment impact
- **Timing** : 5/10 — Le moment de l'impact est identifiable, mais la durée de la réaction physique est raccourcie.
- **Pacing** : 4/10 — Sensation de rigidité, l'enchaînement impact/recul manque de fluidité et de poids.
- **Fidélité visuelle** : 3/10 — Écart visible : manque l'explosion (VFX jaune/orange), les débris sont de simples polygones noirs, et le château n'a pas de "tilt" (recul physique).
- **Camera state** : 4/10 — Reste sur un cadrage trop large au lieu du plan mono-frame centré sur le château ennemi.
- **Score global** : 3/10
- **Top fix P0** : Remplacer les débris noirs par le VFX d'explosion correct et ajouter l'animation de recul (tilt) sur le château.

## Segment endcard
- **Timing** : 7/10 — Le déclenchement de l'endcard se fait correctement en fin de boucle.
- **Pacing** : 7/10 — L'apparition des éléments se fait de manière standard.
- **Fidélité visuelle** : 4/10 — Divergence stylistique majeure : les personnages de l'endcard ressemblent à des assets 3D génériques, en rupture totale avec la 2D flat du gameplay.
- **Camera state** : 8/10 — L'overlay UI s'affiche bien par-dessus un fond flouté, comme attendu pour une endcard.
- **Score global** : 4/10
- **Top fix P0** : Remplacer les personnages 3D de l'endcard par des assets 2D cohérents avec la direction artistique du reste du playable.

---

## Synthèse
- Segment le plus faible : intro (1/10)
- 3 P0 globaux (par ordre d'impact attendu) :
  1. Réécriture de la "Camera state machine" : forcer le système mono-frame, le ciblage initial sur l'ennemi (Rouge) et respecter les cuts stricts de la spec.
  2. Implémenter la surcouche Tutoriel complète (main animée + trajectoire) dans la phase "aim".
  3. Mettre à niveau le système de particules/VFX (traînée du projectile, explosion colorée au lieu de blocs noirs, tilt physique des châteaux).
- Score moyen : 2.4/10