Analyse cette vidéo de playable ad (Castle Clashers). Pour chaque question, donne une réponse courte et factuelle, avec timestamps précis [mm:ss.ms] :

1. **Mono ou dual frame** : la source montre-t-elle simultanément les 2 châteaux (le nôtre + l'ennemi) à l'écran, ou jamais ? Si jamais, liste les cuts qui basculent de l'un à l'autre avec leurs timestamps.

2. **Camera state machine** : sur les premières 15 secondes, liste dans l'ordre chaque mouvement caméra observé (zoom in / cut / pan / dwell / dezoom / follow projectile) avec sa durée approximative en ms. Format :
   `T+<ms> <move_name> dur=<ms> from=<state> to=<state>`.

3. **Opening anchor** : décris en détail la 1ère frame de la vidéo (qui agit, où est la caméra, zoom level, état HP visible, animations en cours). C'est l'état initial exact que doit reproduire le playable.

4. **Projectile speed** : mesure la durée bout-en-bout d'un tir (depuis apparition du projectile jusqu'à impact) sur 2-3 occurrences. Donne la moyenne en ms.

5. **Cycle ping-pong** : durée d'un cycle complet "tour joueur + tour ennemi" en ms. Décompose en sous-phases (drag/aim → fire → projectile flight → cut to enemy → enemy fire → impact → cut back) si tu peux.

Réponds en moins de 400 mots, structure ferme, factuel uniquement.
