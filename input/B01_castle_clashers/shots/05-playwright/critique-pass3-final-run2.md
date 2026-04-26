## Segment intro
- **Timing** : 2/10 — L'impact a lieu trop tôt (~2s), ignorant complètement la phase de dwell (1500ms) attendue.
- **Pacing** : 1/10 — Aucun mouvement de caméra (pan_out manquant), le plan reste figé de manière anormale.
- **Fidélité visuelle** : 1/10 — Absence de la pluie et de l'unité ennemie ; le projectile n'a aucune traînée et suit une ligne droite.
- **Camera state** : 1/10 — Violation majeure de l'opening anchor : démarre sur OURS_BLUE au lieu de THEM_RED_ext.
- **Score global** : 1/10
- **Top fix P0** : Forcer la caméra sur le château ennemi rouge à T=0 (opening anchor) et ajouter le pan_out à T+1500.

## Segment aim
- **Timing** : 4/10 — Le tutoriel démarre trop tôt et la durée d'interaction est expédiée par rapport aux 3.5s prévues.
- **Pacing** : 2/10 — Le plan est totalement statique, sans l'animation de tirage qui doit rythmer la séquence.
- **Fidélité visuelle** : 2/10 — Manque critique du curseur "main" et de la ligne pointillée (remplacés par une simple flèche).
- **Camera state** : 5/10 — Le cut en intérieur est fonctionnel, mais le cadrage est trop large par rapport à la référence.
- **Score global** : 2/10
- **Top fix P0** : Implémenter les assets et l'animation du tutoriel (main qui "drag" + ligne balistique pointillée).

## Segment fire_cinematic
- **Timing** : 3/10 — Désynchronisé du fait des erreurs précédentes, le tir est lâché hors du timing (8.5s).
- **Pacing** : 2/10 — La transition est molle et ne retranscrit pas l'impact du tir.
- **Fidélité visuelle** : 2/10 — La trajectoire est plate (aucune cloche balistique haute) et manque de feedback visuel.
- **Camera state** : 1/10 — Affiche les deux châteaux en plan large, ce qui brise la règle stricte de visibilité mono-frame.
- **Score global** : 1/10
- **Top fix P0** : Appliquer la règle mono-frame en effectuant un cut direct sur le château cible au moment du tir.

## Segment impact
- **Timing** : 5/10 — L'instant d'impact est lisible mais déphasé par rapport à la boucle de 10s exigée.
- **Pacing** : 4/10 — Le dwell de 3s sur la destruction est parasité par des cuts erratiques et prématurés.
- **Fidélité visuelle** : 3/10 — Destruction trop basique (polygones noirs au lieu de chunks détaillés) et absence de recul (recoil) sur le bâtiment.
- **Camera state** : 3/10 — Ne maintient pas le state THEM_RED_ext, la caméra saute vers le château bleu sans raison valable.
- **Score global** : 3/10
- **Top fix P0** : Améliorer les VFX de l'impact (explosion volumétrique, débris texturés) et ajouter le recul du château.

## Segment endcard
- **Timing** : 3/10 — Apparaît de façon asynchrone par rapport au timestamp ciblé (T+26s+).
- **Pacing** : 4/10 — L'écran de fin coupe brutalement l'action sans clore proprement le cycle de ping-pong.
- **Fidélité visuelle** : 6/10 — L'UI est approximative mais les éléments clés de l'endcard sont présents et reconnaissables.
- **Camera state** : 6/10 — L'affichage plein écran de l'UI finale s'exécute correctement en superposition.
- **Score global** : 3/10
- **Top fix P0** : Bloquer l'apparition de l'endcard jusqu'à la complétion exacte du dernier cycle à T+26s.

## Synthèse
- Segment le plus faible : intro (1/10)
- 3 P0 globaux (par ordre d'impact attendu) :
  1. Refondre le système de caméra : forcer l'anchor sur THEM_RED à T=0 et imposer les cuts mono-frame stricts dictés par la spec.
  2. Implémenter l'UI/UX du tutoriel : remplacer la flèche statique par la main animée et la ligne pointillée balistique.
  3. Corriger la physique et les VFX des projectiles : vitesse à 1500ms, trajectoire en cloche haute et traînée sombre.
- Score moyen : 2.0/10