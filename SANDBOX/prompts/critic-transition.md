Tu reçois 2 clips courts (~4s) :
- `source` : la transition exterior→interior dans la vidéo originale Castle Clashers.
- `ours` : la transition équivalente dans notre playable.

Évalue uniquement la **transition exterior→interior** (passage du château extérieur vers l'intérieur du donjon où le tir/aim a lieu). Donne un score `/10` détaillé sur 4 axes :

- **Continuité spatiale** : la caméra donne-t-elle l'impression de plonger dans le château, ou est-ce un cut sec / déguisé ?
- **Pacing** : durée et courbe d'accélération de la transition (ease, motion blur, momentum).
- **Effet visuel** : iris, fade, radial blur, vignette, dive-in zoom — y a-t-il un dispositif lisible ?
- **Cohérence interior** : l'arrivée dans la vue intérieure est-elle smooth (sans pop brusque) ?

Format de sortie :

```
## Transition exterior→interior
- **Continuité spatiale** : <X>/10 — <commentaire>
- **Pacing** : <X>/10 — ...
- **Effet visuel** : <X>/10 — ...
- **Cohérence interior** : <X>/10 — ...
- **Score global** : <min des 4>/10
- **Top fix P0** : <le 1 changement code qui aurait le plus d'impact>
```

Sois factuel. 9-10 = transition cinématique très lisible. <5 = "cut déguisé" sans dispositif visible.
