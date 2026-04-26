Voici l'analyse factuelle de la vidéo, basée sur vos questions :

**1. Mono ou dual frame**
La vidéo est principalement **mono frame** (un seul château visible à la fois), avec des cuts réguliers entre l'intérieur/extérieur du joueur et l'ennemi. 
Il y a une unique exception **dual frame** à [00:02.000] où la caméra dézoome pour montrer les deux châteaux simultanément.
Principaux cuts de bascule :
- [00:03.000] : Cut vers château bleu (joueur).
- [00:05.000] : Cut vers intérieur bleu.
- [00:09.000] : Cut vers château rouge (ennemi).
- [00:13.000] : Cut vers château bleu.
- [00:15.000] : Cut vers intérieur bleu.
- [00:19.000] : Cut vers château rouge.

**2. Camera state machine (0 - 15 secondes)**
- T+0 `dwell` dur=1500 from=red_castle_ext to=red_castle_ext
- T+1500 `pan_out` dur=1500 from=red_castle_ext to=both_castles_wide (suit le projectile)
- T+3000 `cut` dur=0 from=both_castles_wide to=blue_castle_ext
- T+3000 `dwell` dur=2000 from=blue_castle_ext to=blue_castle_ext (impact)
- T+5000 `cut` dur=0 from=blue_castle_ext to=blue_castle_int
- T+5000 `dwell` dur=4000 from=blue_castle_int to=blue_castle_int (visée)
- T+9000 `cut` dur=0 from=blue_castle_int to=red_castle_ext
- T+9000 `dwell` dur=3000 from=red_castle_ext to=red_castle_ext (impact & pause)
- T+12000 `pan_left` dur=1000 from=red_castle_ext to=red_castle_ext_left (amorce du tir)
- T+13000 `cut` dur=0 from=red_castle_ext_left to=blue_castle_ext
- T+13000 `dwell` dur=2000 from=blue_castle_ext to=blue_castle_ext (impact)

**3. Opening anchor**
- **Frame** : [00:00.000]
- **Caméra** : Fixe, en plan moyen (medium close-up), centrée sur le château de droite (toits rouges).
- **Action/Animations** : Scène statique. La pluie tombe en arrière-plan. Le château et ses chenilles sont immobiles. Une unité est postée sur le rempart central.
- **UI/HP** : Les deux jauges en haut de l'écran affichent "100%".

**4. Projectile speed**
Le temps de vol complet (lorsqu'il n'est pas masqué par un cut) est d'environ 1.5 seconde.
- Occurence 1 (Tir ennemi) : Apparition [00:01.500] -> Impact [00:03.000] (1500 ms).
- Occurence 2 (Tir joueur) : Apparition [00:18.500] -> Impact [00:20.000] (1500 ms).
- **Moyenne** : ~1500 ms.

**5. Cycle ping-pong**
Un cycle complet dure environ **10 000 ms** (mesuré de [00:05.000] à [00:15.000]).
Décomposition :
- **Drag/aim** : ~3500 ms ([00:05.000] à [00:08.500]).
- **Fire & cut (vol masqué)** : ~500 ms ([00:08.500] à [00:09.000]).
- **Impact ennemi & pause** : ~3000 ms ([00:09.000] à [00:12.000]).
- **Enemy fire & flight** : ~1000 ms ([00:12.000] à [00:13.000]).
- **Impact joueur & cut back** : ~2000 ms ([00:13.000] à [00:15.000]).