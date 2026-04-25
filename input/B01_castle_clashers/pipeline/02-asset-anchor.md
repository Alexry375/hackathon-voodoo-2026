# Étape 2 — Asset directeur (Direction Artistique verrouillée)

> Avant de produire en parallèle les N assets du jeu, tu choisis **UN seul asset** que tu réalises **toi-même** (pas en sub-agent), à fond. Cet asset fixe la **DA** (palette, style, niveau de détail, proportions) que tous les autres devront respecter.

---

## 2.1. Pourquoi cette étape

Si tu lances 8 sub-agents en parallèle sans DA verrouillée :
- Chacun choisira sa palette → résultat patchwork incohérent
- Chacun choisira son niveau de détail → un mob photoréaliste à côté d'une icône SVG plate
- L'intégration finale est inutilisable

→ La règle : **un seul cerveau fixe la DA, tous les autres l'appliquent**.

## 2.2. Choisir l'asset directeur

Critères de choix, par ordre de priorité :

1. **C'est l'entité héro/joueur du jeu** (le perso principal, le château principal, le véhicule du joueur — selon le jeu)
2. **Sinon, l'asset le plus présent à l'écran** dans la vidéo
3. **Sinon, l'asset le plus structurant pour la silhouette** (bâtiment, terrain principal)

Vérifie si l'asset existe en version officielle dans `input/<jeu>/assets-officiels/` (si ce dossier existe dans ton run). Si oui : pas besoin de le redessiner, mais tu en **extrais quand même la DA** (palette, proportions, niveau de détail) pour briefer les autres.

Si pas d'assets-officiels ou asset directeur absent : tu **dois le produire** procéduralement en Canvas2D (fonction `drawXxx(ctx, x, y, params)`).

## 2.3. Produire l'asset directeur

Tu travailles **toi-même**, pas en sub-agent. Boucle d'itération :

1. Lis 3-5 frames de référence de la vidéo (`ffmpeg -ss MM:SS -frames:v 1` aux moments où l'asset est bien visible)
2. Implémente une v0 dans `SANDBOX/anchor/<asset>.js` (fonction de rendu Canvas2D pure)
3. Crée un `SANDBOX/anchor/<asset>.html` minimal qui dessine ton asset à 540×960 sur fond neutre
4. Lance Playwright → screenshot → compare visuellement à la frame de référence
5. Itère jusqu'à conformité visuelle (5-10 itérations attendues, niveau L4-L5)

Ne te contente pas d'une v1 "ça ressemble à peu près". Cet asset détermine la qualité perçue de tout le projet. **Itère jusqu'à ce que tu sois fier**.

## 2.4. Verrouiller la DA

Une fois l'asset anchor satisfaisant, écris `SANDBOX/anchor/DA-LOCKED.md` qui sera donné en brief à tous les sub-agents de l'étape 3 :

```markdown
# Direction Artistique verrouillée

## Asset directeur
- **Nom** : <ex: château bleu sur chenilles>
- **Fichier** : `SANDBOX/anchor/<asset>.js`, fonction `drawXxx(...)`
- **Frame de référence** : `SANDBOX/frames/<frame>.png`

## Palette (4-8 hex max)
- Primary : `#XXXXXX`
- Secondary : `#XXXXXX`
- Accent : `#XXXXXX`
- Dark / outline : `#XXXXXX`
- Light / highlight : `#XXXXXX`
- (Spécifier UNIQUEMENT les couleurs vraiment utilisées)

## Style
- **Genre** : <ex: cartoon flat 2D / pixel art / low-poly stylisé>
- **Outline** : <oui/non, épaisseur en px>
- **Shading** : <plat / 2-tons / dégradés>
- **Texture** : <oui/non, type>

## Niveau de détail
- Silhouette only / décoration interne / textures / particules
- Choix justifié par : <référence à frame timestamp ou aspect du jeu>

## Proportions de référence
- Asset directeur dessiné à <largeur×hauteur> px sur canvas 540×960
- Échelle relative : <ex: château = 35% largeur canvas, perso = 12% largeur>

## Contraintes pour les autres assets
- Tous les autres assets doivent reprendre la palette ci-dessus (avec variations mineures de teinte autorisées)
- Outline cohérent : si l'anchor a un outline noir 3px, tout doit en avoir un
- Niveau de détail cohérent : pas de mix flat-cartoon avec photoréaliste
- Animations : <règles d'idle, bob, rotation — si applicable>
```

## 2.5. Sortie attendue

- `SANDBOX/anchor/<asset>.js` : code de rendu propre, exportable, réutilisable tel quel dans le code final
- `SANDBOX/anchor/DA-LOCKED.md` : la fiche brief
- `SANDBOX/anchor/<asset>-final.png` : screenshot de validation
- **Commit jalon** : `pipeline(02): asset anchor done — DA locked`

---

Étape suivante : [`03-asset-fanout.md`](03-asset-fanout.md).
