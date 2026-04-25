# Shots — fil chronologique run-2

> Vue rapide pour l'humain. Lis du haut vers le bas.

## 2026-04-26 — Run 2 (Castle Clashers, branche `pipeline-cc-Alexis-v0--run-2-castle-clashers`)

### Étape 02 — anchor lockée (DA)

Pas d'iter Playwright procédurale : les PNG officiels Voodoo (`Blue Castle.png`, `Red Castle.png` etc.) servent de référence DA directe. Voir `SANDBOX/anchor/DA-LOCKED.md`.

Frame de référence vidéo : `SANDBOX/frames/sec_01.png` (état initial 100/100, conjoint sur chenilles).

### Étape 04 — implementation

`scene_exterior` (stub Sami → réelle implémentation Alexis) : 350 LoC, gère composite castles + projectile ballistique + impact masques + riposte ennemie scriptée + cut_to_interior.

| Cible | Capture |
|---|---|
| INTERIOR_AIM dev (état initial) | ![](./04-impl/scene_a_interior_dev.png) |
| EXTERIOR_OBSERVE (HP 100/100) | ![](./04-impl/scene_b_exterior_observe.png) |
| INTERIOR drag-aim actif | ![](./04-impl/scene_a_aim_drag.png) |
| Projectile en vol | ![](./04-impl/scene_b_projectile_flight.png) |
| Après impact joueur (-12 enemy) | ![](./04-impl/scene_b_after_player_impact.png) |
| Après riposte ennemie (-9 self) | ![](./04-impl/scene_b_after_enemy_riposte.png) |
| Retour intérieur post-resolve | ![](./04-impl/scene_a_back_after_resolve.png) |
| Castle endommagé (HP 35) | ![](./04-impl/scene_b_exterior_damaged.png) |

### Étape 05 — sweep Playwright des 5 phases narratives

Bundle prod `dist/playable.html` (2.08 MB), `__forcePhase` exposé, sweep sans erreur console.

| Phase | Capture | Note |
|---|---|---|
| initial (INTERIOR_AIM) | ![](./05-playwright/phase_initial.png) | tutoriel + TAP TO START overlay |
| intro | ![](./05-playwright/phase_intro.png) | overlay TAP TO START sur dim screen |
| tutorial | ![](./05-playwright/phase_tutorial.png) | hand cursor anim sur unité active |
| freeplay | ![](./05-playwright/phase_freeplay.png) | gameplay libre, pas d'overlay |
| forcewin | ![](./05-playwright/phase_forcewin.png) | flash blanc + HP enemy → 0 |
| endcard | ![](./05-playwright/phase_endcard.png) | logo CASTLE CLASHERS + PLAY |

### Étape 06 — bundle

- `dist/playable.html` : **2.08 MB** (cap 4.8 MB OK)
- 0 fetch / 0 XHR / 0 erreur console (verifiée sur Chromium headless via Playwright)
- IIFE minifié, esbuild target es2020
- VSDK shim chargé en premier, assets-inline ensuite, bundle en dernier
- `window.Voodoo.playable.redirectToInstallPage()` câblé sur tap endcard

### Étape 07 — itération v2 (refonte caméra + critique Gemini)

Découverte audit Gemini Vision : la source ne montre **JAMAIS** les 2 châteaux à l'écran simultanément (run-1 les juxtaposait, faux). Refonte profonde caméra.

| Cible | Capture |
|---|---|
| Intro clean (HP 100/100, bombe ennemie en l'air) | ![](./06-iter-v2/t00-200-intro-clean.png) |
| Bombe ennemie impact + dégât chunky | ![](./06-iter-v2/t01-1100-bomb-falling.png) |
| Cut → ext_enemy (rocket arrive de la gauche) | ![](./06-iter-v2/t08-cut-to-enemy.png) |
| Impact château ennemi + tilt recul | ![](./06-iter-v2/t09-enemy-impact.png) |
| Cut → ext_ours (riposte ennemie) | ![](./06-iter-v2/t11-cut-to-ours-incoming.png) |
| Endcard victory | ![](./06-iter-v2/phase_endcard.png) |

Architecture refonte :
- `scene_exterior` mono-château avec `view = OURS|ENEMY` (single asset centré)
- Nouveau state `INTRO_INCOMING` (ouverture: bombe ennemie tombe sur nous, -33% HP)
- Cinematic ping-pong par tour : fire→cut_enemy→dwell→cut_ours→dwell→cut_to_interior (~4s)
- HUD : barres pleines bleue/rouge se touchant au centre + VS gros + %  contour épais
- BG : sky teal misty, hills organiques, forest clusters lumpy, ground courbe
- Damage masks : trous polygonaux jagged + cracks rays (vs radial-gradient blob)
- Tilt recoil sur impact (axe chenilles, ease back)

Verdict Gemini : pass1 = "placeholder" → pass3 = **4.5/10** (progrès net mono-château + sequencing + HUD layout). Reste P0 : destruction "vrais chunks" + briques internes révélées.

## Divergences clés (ref `SANDBOX/outputs/divergences-v2.md`)
1. Pas de corbeaux autonomes : bombes ennemies tirées au tour-par-tour
2. Cible input : tap unité ET cartes du bas (UX HTML5 friendly)
3. End-card cast ≠ gameplay cast (deux castings distincts conservés)
4. Nuage vert [00:53] ignoré (artefact)
5. (run-1 → corrigé en v2) Châteaux conjoints partagés → mono-château ping-pong
