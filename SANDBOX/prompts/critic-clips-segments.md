Tu reçois 2 clips étiquetés :
- `source` : la vidéo originale du playable Castle Clashers (référence cinématique).
- `ours` : un enregistrement Playwright du playable HTML5 produit (notre rendu).

L'oracle de cinématique attendue est verrouillé dans la spec ci-dessous. **Tu dois noter notre rendu par segment, en t'appuyant sur cette spec et la source comme double référence.**

---

# Cinematic spec lockée — Castle Clashers

**Frame visibility** : mono-frame (1 château à la fois) ; exception unique = pan dual T+1500→T+3000 qui suit la trajectoire d'un projectile inter-château.

**Opening anchor (T=0)** : caméra fixe medium-close sur le **château ennemi rouge** (à droite). Dwell ~1500 ms avant tout tir. HP 100/100. Pluie + 1 unité sur rempart central. Pas d'UI tutoriel encore.

**Camera state machine 0–15 s** :
| T+ms | Move | Durée | View |
|---|---|---|---|
| 0     | dwell    | 1500 | THEM_RED_ext |
| 1500  | pan_out  | 1500 | THEM_RED → BOTH_wide (suit projectile) |
| 3000  | cut+dwell| 2000 | OURS_BLUE_ext (impact sur nous) |
| 5000  | cut+dwell| 4000 | OURS_BLUE_int (drag/aim tutorial) |
| 9000  | cut+dwell| 3000 | THEM_RED_ext (impact ennemi, chunks) |
| 12000 | pan_left | 1000 | THEM_RED_ext (amorce tir ennemi) |
| 13000 | cut+dwell| 2000 | OURS_BLUE_ext (impact sur nous) |

**Projectile speed** : 1500 ms ±20 % bout-en-bout, ballistique haute, traînée visible.

**Ping-pong cycle** : 10 000 ms (drag 3.5 s + fire 0.5 s + impact-them 3 s + enemy-fire 1 s + impact-us 2 s).

---

# Segments à scorer

Pour chaque segment ci-dessous, donne un score `/10` détaillé sur 4 axes (Timing, Pacing/transitions, Fidélité visuelle, Camera state) puis un **score global = min des 4 axes** (volontairement strict).

1. **intro** (T 0 → 3000 ms) — dwell ennemi + pan projectile + cut impact sur nous.
2. **aim** (T 5000 → 8500 ms) — drag tutorial intérieur bleu.
3. **fire_cinematic** (T 8500 → 9500 ms) — release tir + cut sur ennemi.
4. **impact** (T 9000 → 12000 ms) — ennemi se prend l'obus, chunks/débris, recoil.
5. **endcard** (T 26000+ → fin) — CTA visuel, fin de cycle.

# Format de sortie attendu

Markdown rigide, EXACTEMENT cette structure :

```
## Segment <name>
- **Timing** : <X>/10 — <commentaire 1 ligne>
- **Pacing** : <X>/10 — ...
- **Fidélité visuelle** : <X>/10 — ...
- **Camera state** : <X>/10 — ...
- **Score global** : <min des 4>/10
- **Top fix P0** : <le 1 changement code qui aurait le plus d'impact>
```

Termine par une section :

```
## Synthèse
- Segment le plus faible : <name> (<score>/10)
- 3 P0 globaux (par ordre d'impact attendu) :
  1. ...
  2. ...
  3. ...
- Score moyen : <X.X>/10
```

Sois factuel, dur sur le scoring (9-10 = "indiscernable de la source", 7-8 = "proche mais écart visible", 5-6 = "approximation reconnaissable", <5 = "divergence majeure").
