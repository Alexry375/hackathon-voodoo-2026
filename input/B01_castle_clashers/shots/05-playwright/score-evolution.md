# Score evolution — clip-vs-clip Gemini par segment

> Gate step 5.5 : tous segments ≥ 9/10.
> Tool : `tools/compare_clips.py --fps 1 --media-resolution MEDIUM`. Clips 45 s.

| Pass | intro | aim | fire | impact | endcard | moyen | note |
|------|-------|-----|------|--------|---------|-------|------|
| pass1 (run-3 stuck en aim, sans simulateFire) | 1 | 3 | 1 | 1 | 2 | 1.6 | clip 45 s mais playable bloqué tutorial |
| **pass2 (baseline run-3 + run-2 cycle 5 + simulateFire)** | **1** | **2** | **2** | **1** | **4** | **2.0** | **baseline propre — playable déroule jusqu'à endcard** |

## P0 globaux Gemini pass2

1. **Camera state machine** : démarrer sur THEM_RED dwell 1.5 s, pan suivre projectile, cut OURS impact, cut interior aim, cut THEM impact. Aujourd'hui : démarre directement sur OURS, ne montre jamais l'enemy en exterior.
2. **VFX impact** : remplacer les carrés noirs (chunks placeholder) par textures briques/toits + recoil/screen shake.
3. **Tuto drag** : main animée + ligne pointillée balistique manquantes.
4. **VFX projectile** : trail/fumée + arc ballistique 1500 ms (actuellement quasi-instantané linéaire).
5. **Endcard transition** : fade blanc abrupt → overlay alpha smooth.

## Stratégie d'itération

P0 #1 (camera) est **structurel** : refonte du scene_manager + scene_exterior view-state pour gérer THEM_RED en plus de OURS. Coût élevé mais débloque intro + fire_cinematic + impact d'un coup.

P0 #2 (chunks buggés) est ciblé : 1 seul fichier (`scene_exterior` ou `scene_interior`), gain visuel immédiat sur impact.

Ordre proposé : (a) chunks fix → +1-2 pts impact ; (b) camera state machine → +3-5 pts intro/fire/impact ; (c) hand cursor + dotted line → +2 pts aim ; (d) projectile trail + arc → +1-2 pts fire/impact ; (e) endcard transition → +1-2 pts endcard.
