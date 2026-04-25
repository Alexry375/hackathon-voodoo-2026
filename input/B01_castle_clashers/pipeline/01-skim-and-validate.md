# Étape 1 — Skim des descriptions + validation Gemini sur la vidéo

> Objectif : comprendre **rapidement** ce que tu construis, et **valider** les éléments structurants en interrogeant directement la vidéo source. Ne lis pas tout le dossier `input/` d'un coup.

---

## 1.1. Repère le terrain

Liste le contenu de `input/<nom-du-jeu>/input/` :

```bash
ls input/<nom-du-jeu>/input/
```

Tu vas trouver :
- **Une vidéo** (`.mp4`, `.mov`, etc.) — c'est la **source de vérité**
- **Un fichier `phase1` ou équivalent** (typiquement `*_phase1_description.txt`) : analyse chronologique seconde par seconde
- **Un fichier `game_spec`** (typiquement `*_game_spec.md`) : résumé exécutif game design + index
- **4 fichiers thématiques principaux** (typiquement `<sujet>.md`) : analyses des grandes catégories (mécaniques de tir, projectiles, destruction, UI, etc.)
- **~12-15 fichiers thématiques détaillés** (typiquement `<sujet>__<sous-sujet>.md`) : sous-analyses fines

Si la vidéo est absente : **stop**, demande au user. Si plus d'une vidéo : prends celle qui matche le préfixe des `.md`.

## 1.2. Skim minimal — dans cet ordre

Lis **dans cet ordre, et seulement ces 3 fichiers en première passe** :

1. `*_game_spec.md` — pour avoir l'overview en 5 minutes
2. `*_phase1_description.txt` — pour la chronologie précise (timestamps, actions, événements)
3. **Un seul** des 4 fichiers thématiques principaux : celui qui couvre la **mécanique principale du jeu** (généralement "shooting", "controls" ou équivalent)

Tu ne lis les sous-analyses détaillées **que si tu as un doute** sur un point précis pendant l'implémentation. Pas avant.

## 1.3. Validation par Gemini (étape critique)

Les descriptions Antoine sont **généralement bonnes mais pas infaillibles**. Tu dois les confronter à la vidéo via un appel Gemini ciblé sur les points structurants.

### Quand lancer Gemini

Lance un appel Gemini si **un de ces signaux** est présent :

- Deux fichiers d'`input/` se contredisent sur un point structurant (mécanique de tir, structure du tour, comportement ennemi)
- Une description te semble bizarre ou imprécise (ex: "depuis le bord gauche" sans indication de quoi est à gauche)
- Tu hésites entre 2 interprétations qui changent l'architecture

### Comment lancer Gemini

Le script `tools/analyze_video.py` est dispo (sera copié dans le scaffold du run). Usage minimal :

```bash
export GEMINI_API_KEY=...    # demande au user si absente

# Analyse complète d'une vidéo (prompt par défaut = synthèse game design)
python tools/analyze_video.py input/<jeu>/input/source.mp4 \
    --out SANDBOX/outputs/full-analysis.report.md \
    --fps 2

# Analyse focalisée — utilise un prompt custom et un extrait court
python tools/analyze_video.py SANDBOX/extracts/visee-perso-A.mp4 \
    --prompt SANDBOX/prompts/check-trajectoire-A.md \
    --out SANDBOX/outputs/check-trajectoire-A.report.md \
    --fps 4
```

### Comment écrire un prompt Gemini focal

Crée `SANDBOX/prompts/<nom>.md`. Format minimal :

```markdown
Analyse cette vidéo. Concentre-toi exclusivement sur :

[QUESTION PRÉCISE — ex: "la trajectoire des oiseaux noirs : d'où ils sortent, où ils frappent, et si c'est lié à un cycle ennemi ou continu"]

Réponds en moins de 200 mots, avec timestamps précis [mm:ss] pour chaque observation. 
Si tu n'es pas sûr, dis-le.
```

Plus le prompt est focal, plus la réponse est précise.

### Comment raccourcir une vidéo

ffmpeg est dispo. Pour extraire un segment court (utile pour focaliser Gemini sans réuploader 1 min de vidéo) :

```bash
# Extrait 3 secondes à partir de 00:13
ffmpeg -ss 00:13 -t 3 -i input/<jeu>/input/source.mp4 \
    -c copy SANDBOX/extracts/visee-skeleton.mp4

# Extrait une seule frame à 00:14 (référence visuelle)
ffmpeg -ss 00:14 -frames:v 1 input/<jeu>/input/source.mp4 \
    SANDBOX/frames/skeleton_aim.png

# Extrait toutes les secondes 0-3 à 1fps (pour skim visuel rapide)
ffmpeg -ss 00:00 -t 4 -i input/<jeu>/input/source.mp4 \
    -vf fps=1 SANDBOX/frames/intro_%02d.png
```

## 1.4. Tranche en autonomie en cas de divergence

Si **Antoine dit X** et **Gemini sur la vidéo dit Y**, **Y gagne**. Tu documentes la divergence dans `SANDBOX/outputs/divergences.md` avec :

```markdown
## Divergence #N — <titre court>

- **Antoine (`<fichier>`)** : <citation>
- **Gemini (vidéo, prompt focal `<chemin>`)** : <citation avec timestamps>
- **Tranchée** : <ce que tu retiens>
- **Impact sur l'implémentation** : <quoi ça change>
```

À la fin de l'étape 1 tu dois pouvoir répondre **avec certitude** aux questions suivantes :

1. Quelle est la mécanique cœur ? (tir balistique, placement, runner, etc.)
2. Quels sont les inputs joueur ? (tap, drag, hold)
3. Quel est le rythme du jeu ? (tour par tour, asynchrone temps réel, etc.)
4. Combien de scènes/vues distinctes ? Comment elles s'enchaînent ?
5. Quels sont les éléments de HUD permanents ?
6. Quels sont les moments clés (intro / tutoriel / climax / endcard) avec timestamps ?

Si tu ne peux pas répondre à un de ces 6 points → re-lance Gemini sur la zone d'ombre, ne passe pas à l'étape suivante.

## 1.5. Sortie attendue à la fin de cette étape

- `SANDBOX/outputs/skim-summary.md` : tes réponses aux 6 questions ci-dessus, en 1 page max
- `SANDBOX/outputs/divergences.md` : 0 ou plusieurs entrées de divergence
- `SANDBOX/outputs/timestamps-key.md` : la liste des timestamps clés que tu vas viser pour la boucle Playwright (étape 5)
- **Commit jalon** : `pipeline(01): skim done + N divergences tranchées`

---

Étape suivante : [`02-asset-anchor.md`](02-asset-anchor.md).
